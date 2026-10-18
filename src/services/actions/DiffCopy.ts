//	Imports ____________________________________________________________________

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { formatAmount } from '../../@l13/formats';
import { pluralFiles } from '../../@l13/units/files';
import { replaceDirectory } from '../@l13/directories';
import { copyFile, copySymbolicLink, lstat } from '../@l13/fse';

import type {
	CopyFileEvent,
	CopyFilesEvent,
	Diff,
	DiffCopyMessage,
	DiffFile,
	DiffMultiCopyMessage,
	MultiCopyEvent,
} from '../../types';

import { formatError } from '../@l13/formats';

import * as dialogs from '../common/dialogs';
import * as settings from '../common/settings';

//	Variables __________________________________________________________________



//	Initialize _________________________________________________________________



//	Exports ____________________________________________________________________

export class DiffCopy {
	
	private _onDidCopyFile: vscode.EventEmitter<CopyFileEvent> = new vscode.EventEmitter<CopyFileEvent>();
	public readonly onDidCopyFile: vscode.Event<CopyFileEvent> = this._onDidCopyFile.event;

	private _onDidRemoveDestination: vscode.EventEmitter<DiffFile> = new vscode.EventEmitter<DiffFile>();
	public readonly onDidRemoveDestination: vscode.Event<DiffFile> = this._onDidRemoveDestination.event;
	
	private _onDidCopyFiles: vscode.EventEmitter<CopyFilesEvent> = new vscode.EventEmitter<CopyFilesEvent>();
	public readonly onDidCopyFiles: vscode.Event<CopyFilesEvent> = this._onDidCopyFiles.event;
	
	private _onInitMultiCopy: vscode.EventEmitter<MultiCopyEvent> = new vscode.EventEmitter<MultiCopyEvent>();
	public readonly onInitMultiCopy: vscode.Event<MultiCopyEvent> = this._onInitMultiCopy.event;
	
	private _onDidCancel: vscode.EventEmitter<undefined> = new vscode.EventEmitter<undefined>();
	public readonly onDidCancel: vscode.Event<undefined> = this._onDidCancel.event;
	
	private async copy (file: DiffFile, dest: string): Promise<undefined | Error> {
		
		const stat = await lstat(file.fsPath);
		
		if (!stat) return Promise.reject(new Error(`'${file.fsPath}' doesn't exist!`));
		
		const statDest = await lstat(dest);
		
		if (stat.isDirectory()) {
			if (!statDest || statDest.isDirectory()) {
				await replaceDirectory(file.fsPath, dest);
				return undefined;
			}
			return Promise.reject(new Error(`'${dest}' exists, but is not a folder!`));
		} else if (stat.isFile()) {
			if (!statDest || statDest.isFile()) return await copyFile(file.fsPath, dest);
			return Promise.reject(new Error(`'${dest}' exists, but is not a file!`));
		} else if (stat.isSymbolicLink()) {
			if (!statDest || statDest.isSymbolicLink()) {
				if (statDest) fs.unlinkSync(dest); // Delete existing symlink otherwise an error occurs
				return await copySymbolicLink(file.fsPath, dest);
			}
			return Promise.reject(new Error(`'${dest}' exists, but is not a symbolic link!`));
		}
		
	}
	
	public async showCopyFromToDialog (data: DiffCopyMessage, from: 'A' | 'B', to: 'A' | 'B') {
		
		const confirmCopy = settings.get('confirmCopy', true);
		const length = data.diffs.length;
		
		if (!length) return;
		
		if (confirmCopy && !data.multi) {
			const buttonCopyDontShowAgain = 'Copy, don\'t show again';
			const replacingFolders = data.diffs.some((diff) => (from === 'A' ? diff.fileA : diff.fileB)?.type === 'folder');
			const notice = replacingFolders ? ' Destination folders will be replaced completely, including removal of destination-only files.' : '';
			const deleting = data.diffs.some((diff) => !(from === 'A' ? diff.fileA : diff.fileB));
			const deletionNotice = deleting ? ' Selected entries missing from the source will be deleted from the destination.' : '';
			const text = `Copy ${formatAmount(length, pluralFiles)} to "${(<any>data)[`path${to}`]}"?${notice}${deletionNotice}`;
			const value = await dialogs.confirm(text, 'Copy', buttonCopyDontShowAgain);
				
			if (value) {
				if (value === buttonCopyDontShowAgain) settings.update('confirmCopy', false);
				await this.copyFromTo(data, from, to);
			} else this._onDidCancel.fire(undefined);
		} else await this.copyFromTo(data, from, to);
		
	}
	
	public async showMultiCopyFromToDialog (data: DiffMultiCopyMessage, from: 'left' | 'right') {
		
		const ids: string[] = data.ids;
		const length = ids.length;
		
		if (!length) return;
		
		const folderFrom = from === 'left' ? data.pathA : data.pathB;
		const text = `Copy ${formatAmount(length, pluralFiles)} from "${folderFrom}" across all diff panels?`;
		const value = await dialogs.confirm(text, 'Copy');
		
		if (value) this._onInitMultiCopy.fire({ data, from });
		else this._onDidCancel.fire(undefined);
		
	}
	
	private async copyFromTo (data: DiffCopyMessage, from: 'A' | 'B', to: 'A' | 'B') {

		const folderTo = to === 'A' ? data.pathA : data.pathB;
		function sourceOf (diff: Diff) {

			return from === 'A' ? diff.fileA : diff.fileB;

		}
		const folders = data.diffs.map((diff) => sourceOf(diff) || (to === 'A' ? diff.fileA : diff.fileB)).filter((file) => file?.type === 'folder');
		const diffs = data.diffs.filter((diff) => {

			const entry = sourceOf(diff) || (to === 'A' ? diff.fileA : diff.fileB);
			return entry && !folders.some((folder) => entry !== folder && entry.relative.startsWith(folder.relative + path.sep));

		});

		for (const diff of diffs) {
			const fileFrom = sourceOf(diff);
			try {
				let fileTo = to === 'A' ? diff.fileA : diff.fileB;
				if (!fileFrom) {
					const folderFrom = from === 'A' ? data.pathA : data.pathB;
					let sourceExists = false;
					try {
						await fs.promises.lstat(path.join(folderFrom, fileTo.relative));
						sourceExists = true;
					} catch (error) {
						if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') throw error;
					}
					if (sourceExists) {
						throw new Error('The source entry now exists. Refresh the comparison before synchronizing.');
					}
					const target = path.resolve(folderTo, fileTo.relative);
					const targetRelative = path.relative(path.resolve(folderTo), target);
					if (!targetRelative || targetRelative === '..' || targetRelative.startsWith(`..${path.sep}`) || path.isAbsolute(targetRelative)) {
						throw new Error('The synchronization target must be inside the destination folder.');
					}
					const sourceRoot = await fs.promises.realpath(folderFrom);
					const targetPath = await fs.promises.realpath(target);
					const sourceRelative = path.relative(targetPath, sourceRoot);
					if (!sourceRelative || sourceRelative !== '..' && !sourceRelative.startsWith(`..${path.sep}`) && !path.isAbsolute(sourceRelative)) {
						throw new Error('The synchronization target must not contain the source folder.');
					}
					await vscode.workspace.fs.delete(vscode.Uri.file(target), { recursive: true, useTrash: settings.enableTrash() });
					this._onDidRemoveDestination.fire(fileTo);
					continue;
				}
				const relative = fileTo?.relative || fileFrom.relative;
				const dest = path.join(folderTo, relative);
				const copy = !fileTo ? await existsCaseInsensitiveFileAndCopy(fileFrom.fsPath, folderTo, relative, dest) : null;
				if (copy === false) continue;

				await this.copy(fileFrom, dest);
				if (!fileTo) {
					fileTo = copyDiffFile(fileFrom, folderTo, dest);
					if (to === 'A') diff.fileA = fileTo;
					else diff.fileB = fileTo;
				}
				fileTo.stat = await lstat(dest);
				if (copy === null && diff.status !== 'ignored') diff.status = 'unchanged';
				this._onDidCopyFile.fire({ from: fileFrom, to: fileTo });
			} catch (error) {
				vscode.window.showErrorMessage(formatError(error));
			}
		}
		this._onDidCopyFiles.fire({ data, from, to });

	}
	
}

//	Functions __________________________________________________________________

function copyDiffFile (fileFrom: DiffFile, root: string, dest: string): DiffFile {
	
	return {
		root,
		relative: fileFrom.relative,
		fsPath: dest,
		stat: null,
		
		path: dest + (fileFrom.type === 'folder' ? path.sep : ''),
		name: fileFrom.name,
		basename: fileFrom.basename,
		dirname: fileFrom.dirname,
		extname: fileFrom.extname,
		type: fileFrom.type,
		ignore: fileFrom.ignore,
	};
	
}

function getRealRelative (root: string, relative: string) {
	
	const names = relative.split(path.sep);
	let cwd = root;
	
	return path.join(...names.map((name) => {
		
		const cwdNames = fs.readdirSync(cwd);
		let cwdName;
		
		name = name.toUpperCase();
		
		for (cwdName of cwdNames) {
			if (cwdName.toUpperCase() === name) break;
		}
		
		cwd = path.join(cwd, cwdName);
		
		return cwdName;
		
	}));
	
}

async function existsCaseInsensitiveFileAndCopy (fsPath: string, folderTo: string, relative: string, dest: string): Promise<boolean> {
	
	if (!settings.hasCaseSensitiveFileSystem && fs.existsSync(dest)) {
		if (!settings.get('confirmCaseInsensitiveCopy', true)) return true;
		const realRelative = getRealRelative(folderTo, relative);
		if (relative !== realRelative) {
			const buttonCopyDontShowAgain = 'Copy, don\'t show again';
			const text = `Overwrite content of file "${path.join(folderTo, realRelative)}" with file "${fsPath}"?`;
			const copy = await dialogs.confirm(text, 'Copy', buttonCopyDontShowAgain);
			if (copy === buttonCopyDontShowAgain) settings.update('confirmCaseInsensitiveCopy', false);
			return !!copy;
		}
	}
	
	return null;
	
}
