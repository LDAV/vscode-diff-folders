//	Imports ____________________________________________________________________

import type { DiffFavoriteMessage } from '../../../types';

import { FolderFavoritesDialog } from '../../dialogs/FolderFavoritesDialog';

import type { DiffPanel } from '../DiffPanel';

//	Variables __________________________________________________________________



//	Initialize _________________________________________________________________



//	Exports ____________________________________________________________________

export function init (currentDiffPanel: DiffPanel) {
	
	const favoritesDialog = new FolderFavoritesDialog(currentDiffPanel.context);
	
	currentDiffPanel.msg.on('save:favorite', async (data: DiffFavoriteMessage) => {
		
		await favoritesDialog.add([data.pathA, data.pathB]);
		
	});
	
}

//	Functions __________________________________________________________________

