import * as vscode from 'vscode';

import { FolderFavoritesState } from '../states/FolderFavoritesState';
import { FolderFavoriteItem } from './trees/FolderFavoriteItem';
import { FolderFavoriteGroupItem } from './trees/FolderFavoriteGroupItem';

type FolderTreeItem = FolderFavoriteItem | FolderFavoriteGroupItem;

export class FolderFavoritesProvider implements vscode.TreeDataProvider<FolderTreeItem> {

	private readonly changed = new vscode.EventEmitter<void>();
	public readonly onDidChangeTreeData = this.changed.event;

	public constructor (private readonly state: FolderFavoritesState) {}

	public refresh () {

		this.changed.fire();

	}

	public getTreeItem (item: FolderTreeItem) {

		return item;

	}

	public getChildren (element?: FolderTreeItem): FolderTreeItem[] {

		if (element instanceof FolderFavoriteItem) return [];
		const group = element instanceof FolderFavoriteGroupItem ? element.group : undefined;
		const folders = this.state.get().filter((pathname) => this.state.getGroup(pathname) === group)
			.map((pathname) => new FolderFavoriteItem(pathname));
		return element ? folders : [...this.state.getGroups().map((name) => new FolderFavoriteGroupItem(name)), ...folders];

	}

}
