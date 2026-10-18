import { basename } from 'path';
import * as vscode from 'vscode';

import { lstat } from '../@l13/fse';
import { openFolder } from '../common/dialogs';
import { FolderFavoritesState } from '../states/FolderFavoritesState';

type FolderItem = vscode.QuickPickItem & { path?: string, action?: 'add' | 'remove' | 'current' };

export class FolderFavoritesDialog {

	private readonly state: FolderFavoritesState;

	public constructor (context: vscode.ExtensionContext) {

		this.state = new FolderFavoritesState(context);

	}

	public async add (paths: string[]) {

		const directories: string[] = [];
		for (const path of paths) {
			if (path && (await lstat(path))?.isDirectory()) directories.push(path);
		}
		await this.state.add(directories);
		return directories;

	}

	public async pick (currentPath?: string): Promise<string> {

		const items: FolderItem[] = this.state.get().map((path) => ({
			label: `$(folder) ${basename(path) || path}`,
			description: path,
			path,
		}));
		items.push({ label: '$(add) Add favorite folder…', action: 'add' });
		if (currentPath) items.push({ label: '$(star) Add current folder to favorites', description: currentPath, action: 'current' });
		if (this.state.get().length) items.push({ label: '$(trash) Remove favorite folder…', action: 'remove' });

		const selected = await vscode.window.showQuickPick(items, {
			placeHolder: 'Select a favorite folder for this side',
			matchOnDescription: true,
		});
		if (!selected) return null;

		if (selected.action === 'remove') {
			const removed = await vscode.window.showQuickPick(items.filter((item) => item.path), {
				placeHolder: 'Remove a folder from favorites',
				matchOnDescription: true,
			});
			if (removed) await this.state.remove(removed.path);
			return this.pick(currentPath);
		}

		const selectedPath = selected.action === 'add' ? await openFolder() : selected.action === 'current' ? currentPath : selected.path;
		if (!selectedPath) return null;
		if (!(await lstat(selectedPath))?.isDirectory()) {
			await vscode.window.showErrorMessage(`Folder is not available: ${selectedPath}`);
			return this.pick(currentPath);
		}
		if (selected.action) await this.state.add([selectedPath]);
		return selectedPath;

	}

}
