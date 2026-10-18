import { basename } from 'path';
import * as vscode from 'vscode';

import { lstat } from '../@l13/fse';
import { openFolder } from '../common/dialogs';
import { FolderFavoritesState } from '../states/FolderFavoritesState';

type FolderItem = vscode.QuickPickItem & {
	path?: string,
	group?: string,
	action?: 'add' | 'remove' | 'current' | 'group' | 'back' | 'newGroup' | 'move',
};

export class FolderFavoritesDialog {

	private readonly state: FolderFavoritesState;

	public constructor (context: vscode.ExtensionContext) {

		this.state = new FolderFavoritesState(context);

	}

	public async add (paths: string[], group?: string) {

		const directories: string[] = [];
		for (const path of paths) {
			if (path && (await lstat(path))?.isDirectory()) directories.push(path);
		}
		await this.state.add(directories, group);
		return directories;

	}

	private folderItems (): FolderItem[] {

		return this.state.get().map((pathname) => ({
			label: `$(folder) ${basename(pathname) || pathname}`,
			description: pathname,
			detail: this.state.getGroup(pathname),
			path: pathname,
		}));

	}

	public async createGroup (): Promise<string> {

		const name = await vscode.window.showInputBox({
			prompt: 'Name of the favorite folder group',
			validateInput: (value) => !value.trim() || this.state.getGroups().includes(value.trim()) ? 'Choose a unique, non-empty name.' : null,
		});
		if (!name?.trim()) return undefined;
		await this.state.addGroup(name);
		return name.trim();

	}

	public async renameGroup (group?: string) {

		group = group || await vscode.window.showQuickPick(this.state.getGroups(), { placeHolder: 'Choose a group to rename' });
		if (!group) return;
		const previous = group;
		const name = await vscode.window.showInputBox({
			prompt: 'Rename favorite folder group',
			value: previous,
			validateInput: (value) => {

				const duplicate = value.trim() !== previous && this.state.getGroups().includes(value.trim());
				return !value.trim() || duplicate ? 'Choose a unique, non-empty name.' : null;

			},
		});
		if (name?.trim()) await this.state.renameGroup(previous, name);

	}

	public async removeGroup (group?: string) {

		group = group || await vscode.window.showQuickPick(this.state.getGroups(), { placeHolder: 'Remove a group; its folders will remain ungrouped' });
		if (group) await this.state.removeGroup(group);

	}

	public async move (pathname?: string) {

		if (!pathname) {
			const folder = await vscode.window.showQuickPick(this.folderItems(), { placeHolder: 'Choose a favorite folder to move', matchOnDescription: true });
			if (!folder) return;
			pathname = folder.path;
		}
		const choices: FolderItem[] = [
			{ label: '$(list-flat) Ungrouped' },
			...this.state.getGroups().map((name) => ({ label: `$(folder-library) ${name}`, group: name })),
			{ label: '$(new-folder) New favorite group…', action: 'newGroup' },
		];
		const selected = await vscode.window.showQuickPick(choices, { placeHolder: 'Move favorite folder to group' });
		if (!selected) return;
		const targetGroup = selected.action === 'newGroup' ? await this.createGroup() : selected.group;
		if (selected.action === 'newGroup' && !targetGroup) return;
		await this.state.move(pathname, targetGroup);

	}

	public async pick (currentPath?: string, group?: string): Promise<string> {

		const groups = this.state.getGroups();
		if (!groups.includes(group)) group = undefined;
		const items = this.folderItems().filter((item) => this.state.getGroup(item.path) === group);
		if (group) items.unshift({ label: '$(arrow-left) All favorite groups', action: 'back' });
		else items.unshift(...groups.map((name): FolderItem => ({ label: `$(folder-library) ${name}`, group: name, action: 'group' })));
		items.push({ label: '$(add) Add favorite folder…', action: 'add' });
		if (currentPath) items.push({ label: '$(star) Add current folder to favorites', description: currentPath, action: 'current' });
		items.push({ label: '$(new-folder) New favorite group…', action: 'newGroup' });
		if (this.state.get().length) {
			items.push({ label: '$(move) Move favorite to group…', action: 'move' });
			items.push({ label: '$(trash) Remove favorite folder…', action: 'remove' });
		}

		const selected = await vscode.window.showQuickPick(items, {
			title: group || 'Favorite folders',
			placeHolder: 'Select a favorite folder for this side',
			matchOnDescription: true,
		});
		if (!selected) return null;
		if (selected.action === 'group') return this.pick(currentPath, selected.group);
		if (selected.action === 'back') return this.pick(currentPath);
		if (selected.action === 'newGroup') {
			const created = await this.createGroup();
			return this.pick(currentPath, created || group);
		}
		if (selected.action === 'move') {
			await this.move();
			return this.pick(currentPath, group);
		}
		if (selected.action === 'remove') {
			const removed = await vscode.window.showQuickPick(this.folderItems(), {
				placeHolder: 'Remove a folder from favorites',
				matchOnDescription: true,
			});
			if (removed) await this.state.remove(removed.path);
			return this.pick(currentPath, group);
		}

		const selectedPath = selected.action === 'add' ? await openFolder() : selected.action === 'current' ? currentPath : selected.path;
		if (!selectedPath) return null;
		if (!(await lstat(selectedPath))?.isDirectory()) {
			await vscode.window.showErrorMessage(`Folder is not available: ${selectedPath}`);
			return this.pick(currentPath, group);
		}
		if (selected.action) await this.state.add([selectedPath], group);
		return selectedPath;

	}

}
