//	Imports ____________________________________________________________________

import * as vscode from 'vscode';

import type { Favorite } from '../../types';

import * as commands from '../common/commands';
import * as settings from '../common/settings';

import { FavoriteGroupsDialog } from '../dialogs/FavoriteGroupsDialog';
import { FavoritesDialog } from '../dialogs/FavoritesDialog';

import { DiffPanel } from '../panel/DiffPanel';

import { FolderFavoritesProvider } from '../sidebar/FolderFavoritesProvider';
import { FolderFavoriteItem } from '../sidebar/trees/FolderFavoriteItem';
import { openFolder } from '../common/dialogs';
import { FolderFavoritesDialog } from '../dialogs/FolderFavoritesDialog';
import { FolderFavoritesState } from '../states/FolderFavoritesState';
import { lstat } from '../@l13/fse';
import { FavoriteGroupTreeItem } from '../sidebar/trees/FavoriteGroupTreeItem';
import { FavoriteTreeItem } from '../sidebar/trees/FavoriteTreeItem';

import { FavoriteGroupsState } from '../states/FavoriteGroupsState';
import { FavoritesState } from '../states/FavoritesState';

//	Variables __________________________________________________________________



//	Initialize _________________________________________________________________



//	Exports ____________________________________________________________________

export function activate (context: vscode.ExtensionContext) {
	
	const subscriptions = context.subscriptions;
	
	const favoritesState = FavoritesState.create(context);
	const favoriteGroupsState = FavoriteGroupsState.create(context);
	const favoritesDialog = FavoritesDialog.create(favoritesState);
	const favoriteGroupsDialog = FavoriteGroupsDialog.create(favoriteGroupsState, favoritesState);
	const folderState = new FolderFavoritesState(context);
	const folderDialog = new FolderFavoritesDialog(context);
	const folderProvider = new FolderFavoritesProvider(folderState);
	subscriptions.push(vscode.window.createTreeView('l13DiffFavorites', { treeDataProvider: folderProvider }));
	subscriptions.push(FolderFavoritesState.onDidChange(() => folderProvider.refresh()));
	subscriptions.push(favoritesState.onDidChangeFavorites(() => folderProvider.refresh()));

	commands.register(context, {

		'l13Diff.action.folderFavorite.add': async () => {

			const path = await openFolder();
			if (path) await folderDialog.add([path]);

		},

		'l13Diff.action.folderFavorite.remove': async (item?: FolderFavoriteItem) => {

			const fsPath = item?.fsPath || await vscode.window.showQuickPick(folderState.get(), { placeHolder: 'Remove a folder from favorites' });
			if (fsPath) await folderState.remove(fsPath);

		},

		'l13Diff.action.folderFavorite.select': async (item?: FolderFavoriteItem) => {

			const fsPath = item?.fsPath || await folderDialog.pick();
			if (!fsPath) return;

			if (!(await lstat(fsPath))?.isDirectory()) {
				await vscode.window.showErrorMessage(`Folder is not available: ${fsPath}`);
				return;
			}
			const side = await vscode.window.showQuickPick(['Left folder', 'Right folder'], { placeHolder: 'Choose the comparison side' });
			if (!side) return;
			if (!DiffPanel.currentPanel) await DiffPanel.create(context);
			else DiffPanel.createOrShow(context);
			DiffPanel.send('favorite:folder', { fsPath, side: side === 'Left folder' ? 'left' : 'right' });

		},
	
		'l13Diff.action.favorite.compare': ({ favorite }: FavoriteTreeItem) => {
			
			openFavorite(context, favorite, settings.openInNewPanel());
			
		},
		
		'l13Diff.action.favorite.compareInCurrentPanel': ({ favorite }: FavoriteTreeItem) => {
			
			openFavorite(context, favorite, false);
			
		},
		
		'l13Diff.action.favorite.compareInNewPanel': ({ favorite }: FavoriteTreeItem) => {
			
			openFavorite(context, favorite, true);
			
		},
		
		'l13Diff.action.favorite.rename': ({ favorite }: FavoriteTreeItem) => favoritesDialog.rename(favorite),
		'l13Diff.action.favorite.remove': ({ favorite }: FavoriteTreeItem) => favoritesDialog.remove(favorite),
		
		'l13Diff.action.favoriteGroups.add': () => favoriteGroupsDialog.add(),
		
		'l13Diff.action.favoriteGroups.compareAll': async ({ favoriteGroup }: FavoriteGroupTreeItem) => {
			
			const favorites = await favoriteGroupsDialog.openMultipleDiffPanels(favoriteGroup);
			
			if (favorites) openFavorites(context, favorites);
			
		},
		
		'l13Diff.action.favoriteGroups.compareAllSideBySide': async ({ favoriteGroup }: FavoriteGroupTreeItem) => {
			
			const favorites = await favoriteGroupsDialog.openMultipleDiffPanels(favoriteGroup);
			
			if (favorites) openFavorites(context, favorites, true);
			
		},
		
		'l13Diff.action.favorite.addToGroup': ({ favorite }: FavoriteTreeItem) => favoriteGroupsDialog.addFavoriteToGroup(favorite),
		'l13Diff.action.favorite.removeFromGroup': ({ favorite }: FavoriteTreeItem) => favoritesState.removeFavoriteFromGroup(favorite),
		
		'l13Diff.action.favorite.copyLeftPath': ({ favorite }: FavoriteTreeItem) => vscode.env.clipboard.writeText(favorite.fileA),
		'l13Diff.action.favorite.copyRightPath': ({ favorite }: FavoriteTreeItem) => vscode.env.clipboard.writeText(favorite.fileB),
		
		'l13Diff.action.favoriteGroups.rename': ({ favoriteGroup }: FavoriteGroupTreeItem) => favoriteGroupsDialog.rename(favoriteGroup),
		'l13Diff.action.favoriteGroups.remove': ({ favoriteGroup }: FavoriteGroupTreeItem) => favoriteGroupsDialog.remove(favoriteGroup),
		
		'l13Diff.action.favorites.export': () => favoriteGroupsDialog.export(),
		'l13Diff.action.favorites.import': () => favoriteGroupsDialog.import(),
		
		'l13Diff.action.favorites.clear': async () => {

			const answer = await vscode.window.showWarningMessage('Remove all favorite folders?', { modal: true }, 'Remove');
			if (answer) await folderState.clear();

		},
		
	});
	
}

//	Functions __________________________________________________________________

function openFavorite (context: vscode.ExtensionContext, favorite: Favorite, openInNewPanel: boolean) {
	
	if (openInNewPanel) DiffPanel.create(context, [{ fsPath: favorite.fileA }, { fsPath: favorite.fileB }], true);
	else DiffPanel.createOrShow(context, [{ fsPath: favorite.fileA }, { fsPath: favorite.fileB }], true);
	
}

async function openFavorites (context: vscode.ExtensionContext, favorites: Favorite[], sideBySide?: boolean) {
	
	for (const favorite of favorites) {
		await DiffPanel.create(context, [{ fsPath: favorite.fileA }, { fsPath: favorite.fileB }], true, sideBySide);
	}
	
}
