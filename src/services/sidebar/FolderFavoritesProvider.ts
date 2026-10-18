import * as vscode from 'vscode';

import { FolderFavoritesState } from '../states/FolderFavoritesState';
import { FolderFavoriteItem } from './trees/FolderFavoriteItem';

export class FolderFavoritesProvider implements vscode.TreeDataProvider<FolderFavoriteItem> {

	private readonly changed = new vscode.EventEmitter<void>();
	public readonly onDidChangeTreeData = this.changed.event;

	public constructor (private readonly state: FolderFavoritesState) {}

	public refresh () {

		this.changed.fire();

	}

	public getTreeItem (item: FolderFavoriteItem) {

		return item;

	}

	public getChildren () {

		return this.state.get().map((path) => new FolderFavoriteItem(path));

	}

}
