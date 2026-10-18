import * as vscode from 'vscode';

export class FolderFavoriteGroupItem extends vscode.TreeItem {

	public readonly contextValue = 'folderFavoriteGroup';
	public readonly iconPath = new vscode.ThemeIcon('folder-library');

	public constructor (public readonly group: string) {

		super(group, vscode.TreeItemCollapsibleState.Collapsed);
		this.tooltip = group;

	}

}
