import * as fs from 'fs';
import * as path from 'path';

import { copyFile, copySymbolicLink, lstat } from './fse';

async function resolvePath (pathname: string): Promise<string> {

	const parent = path.dirname(pathname);
	if (await lstat(pathname)) return fs.promises.realpath(pathname);
	if (parent === pathname) throw new Error(`Path is not available: ${pathname}`);
	return path.join(await resolvePath(parent), path.basename(pathname));

}

function contains (parent: string, child: string) {

	const relative = path.relative(parent, child);
	return !relative || relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);

}

async function removeEntry (pathname: string): Promise<void> {

	const stat = await lstat(pathname);
	if (!stat) return;
	if (stat.isDirectory()) {
		for (const name of await fs.promises.readdir(pathname)) await removeEntry(path.join(pathname, name));
		await fs.promises.rmdir(pathname);
	} else await fs.promises.unlink(pathname);

}

async function copyDirectory (source: string, destination: string): Promise<void> {

	const stat = await fs.promises.lstat(source);
	await fs.promises.mkdir(destination);
	for (const name of await fs.promises.readdir(source)) {
		const from = path.join(source, name);
		const to = path.join(destination, name);
		const entry = await fs.promises.lstat(from);
		if (entry.isDirectory()) await copyDirectory(from, to);
		else if (entry.isFile()) await copyFile(from, to);
		else if (entry.isSymbolicLink()) await copySymbolicLink(from, to);
		else throw new Error(`Unsupported file type: ${from}`);
	}
	await fs.promises.utimes(destination, stat.atimeMs / 1000, stat.mtimeMs / 1000);

}

export async function replaceDirectory (sourcePath: string, destinationPath: string): Promise<void> {

	const source = await fs.promises.realpath(sourcePath);
	const destination = await resolvePath(path.resolve(destinationPath));
	if (contains(source, destination) || contains(destination, source)) {
		throw new Error('Source and destination folders must be separate and must not contain each other.');
	}
	const existing = await lstat(destinationPath);
	if (existing && !existing.isDirectory()) throw new Error(`Destination is not a folder: ${destinationPath}`);
	await fs.promises.mkdir(path.dirname(destination), { recursive: true });
	const temporary = await fs.promises.mkdtemp(path.join(path.dirname(destination), '.l13-diff-copy-'));
	const staged = path.join(temporary, 'new');
	const backup = path.join(temporary, 'previous');
	let backupPresent = false;

	try {
		await copyDirectory(source, staged);
		if (existing) {
			await fs.promises.rename(destination, backup);
			backupPresent = true;
		}
		try {
			await fs.promises.rename(staged, destination);
		} catch (error) {
			if (backupPresent) {
				try {
					await fs.promises.rename(backup, destination);
					backupPresent = false;
				} catch {
					throw new Error(`Unable to restore the destination. The previous folder is preserved at ${backup}`);
				}
			}
			throw error;
		}
		if (backupPresent) {
			await removeEntry(backup);
			backupPresent = false;
		}
	} finally {
		if (!backupPresent) await removeEntry(temporary);
	}

}
