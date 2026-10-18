import { basename } from 'path';
import * as vscode from 'vscode';

export class FolderFavoriteItem extends vscode.TreeItem {

	public readonly contextValue = 'folderFavorite';
	public readonly iconPath = new vscode.ThemeIcon('folder');

	public constructor (public readonly fsPath: string) {

		super(basename(fsPath) || fsPath);
		this.description = fsPath;
		this.tooltip = fsPath;
		this.command = {
			command: 'l13Diff.action.folderFavorite.select',
			title: 'Select Folder',
			arguments: [this],
		};

	}

}
