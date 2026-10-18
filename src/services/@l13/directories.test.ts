import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

import { replaceDirectory } from './directories';

describe('replaceDirectory', () => {

	let root: string;
	let source: string;
	let destination: string;

	beforeEach(() => {

		root = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'l13-diff-replace-'));
		source = path.join(root, 'source');
		destination = path.join(root, 'destination');
		fs.mkdirSync(source);
		fs.mkdirSync(destination);
		fs.writeFileSync(path.join(source, 'file.txt'), 'source content');
		fs.writeFileSync(path.join(destination, 'old.txt'), 'keep until replacement succeeds');

	});

	afterEach(() => {

		fs.rmdirSync(root, { recursive: true });

	});

	it('replaces the complete tree, including dotfiles, links, empty folders and timestamps', async () => {

		fs.mkdirSync(path.join(source, 'nested'));
		fs.mkdirSync(path.join(source, 'empty'));
		fs.writeFileSync(path.join(source, 'nested', '.hidden'), 'hidden content');
		fs.symlinkSync('file.txt', path.join(source, 'link'));
		fs.utimesSync(path.join(source, 'file.txt'), 1600000000, 1600001234);
		fs.utimesSync(source, 1600000000, 1600001234);
		await replaceDirectory(source, destination);
		assert.deepStrictEqual(fs.readdirSync(destination).sort(), ['empty', 'file.txt', 'link', 'nested']);
		assert.strictEqual(fs.readFileSync(path.join(destination, 'file.txt'), 'utf8'), 'source content');
		assert.strictEqual(fs.readFileSync(path.join(destination, 'nested', '.hidden'), 'utf8'), 'hidden content');
		assert.strictEqual(fs.readlinkSync(path.join(destination, 'link')), 'file.txt');
		assert.strictEqual(fs.statSync(path.join(destination, 'file.txt')).mtimeMs, 1600001234000);
		assert.strictEqual(fs.statSync(destination).mtimeMs, 1600001234000);
		assert.strictEqual(fs.readFileSync(path.join(source, 'file.txt'), 'utf8'), 'source content');
		assert.deepStrictEqual(fs.readdirSync(root).sort(), ['destination', 'source']);

	});

	it('creates a previously missing destination and its parents', async () => {

		const target = path.join(root, 'new-parent', 'new-folder');
		await replaceDirectory(source, target);
		assert.strictEqual(fs.readFileSync(path.join(target, 'file.txt'), 'utf8'), 'source content');

	});

	it('removes all previous contents when the source is empty', async () => {

		fs.unlinkSync(path.join(source, 'file.txt'));
		await replaceDirectory(source, destination);
		assert.deepStrictEqual(fs.readdirSync(destination), []);

	});

	it('rejects identical, nested and symlink-aliased paths without modifying the source', async () => {

		await assert.rejects(replaceDirectory(source, source));
		await assert.rejects(replaceDirectory(source, path.join(source, 'child')));
		await assert.rejects(replaceDirectory(source, root));
		const alias = path.join(root, 'alias');
		fs.symlinkSync(source, alias);
		await assert.rejects(replaceDirectory(source, path.join(alias, 'child')));
		assert.deepStrictEqual(fs.readdirSync(source), ['file.txt']);

	});

	it('leaves the destination untouched if staging fails', async () => {

		const original = fs.promises.copyFile;
		try {
			fs.promises.copyFile = () => Promise.reject(new Error('Simulated write failure'));
			await assert.rejects(replaceDirectory(source, destination), /Simulated write failure/);
		} finally {
			fs.promises.copyFile = original;
		}
		assert.deepStrictEqual(fs.readdirSync(destination), ['old.txt']);
		assert.deepStrictEqual(fs.readdirSync(root).sort(), ['destination', 'source']);

	});

	it('restores the previous destination if installing the staged folder fails', async () => {

		const original = fs.promises.rename;
		try {
			fs.promises.rename = async (from, to) => {

				if (String(from).endsWith(`${path.sep}new`)) throw new Error('Simulated install failure');
				return original(from, to);

			};
			await assert.rejects(replaceDirectory(source, destination), /Simulated install failure/);
		} finally {
			fs.promises.rename = original;
		}
		assert.strictEqual(fs.readFileSync(path.join(destination, 'old.txt'), 'utf8'), 'keep until replacement succeeds');
		assert.deepStrictEqual(fs.readdirSync(root).sort(), ['destination', 'source']);

	});

});
