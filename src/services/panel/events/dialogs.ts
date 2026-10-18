//	Imports ____________________________________________________________________

import * as dialogs from '../../common/dialogs';
import { FolderFavoritesDialog } from '../../dialogs/FolderFavoritesDialog';

import type { DiffPanel } from '../DiffPanel';

//	Variables __________________________________________________________________



//	Initialize _________________________________________________________________



//	Exports ____________________________________________________________________

export function init (currentDiffPanel: DiffPanel) {

	const folderFavorites = new FolderFavoritesDialog(currentDiffPanel.context);
	
	currentDiffPanel.msg.on('dialog:file', async () => {
		
		const fsPath = await dialogs.openFile();
		
		currentDiffPanel.msg.send('dialog:file', { fsPath });
		
	});
	
	currentDiffPanel.msg.on('dialog:folder', async (data?: { currentPath?: string }) => {
		
		const fsPath = await folderFavorites.pick(data?.currentPath);
		
		currentDiffPanel.msg.send('dialog:folder', { fsPath });
		
	});
	
}

//	Functions __________________________________________________________________

