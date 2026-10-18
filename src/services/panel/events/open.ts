//	Imports ____________________________________________________________________

import { dirname } from 'path';

import type { DiffGoToMessage, DiffInitMessage, DiffOpenMessage, DiffPreviewMessage, DiffUpdatePathsMessage } from '../../../types';

import { lstat } from '../../@l13/fse';

import { DiffOpen } from '../../actions/DiffOpen';

import * as files from '../../common/files';
import * as settings from '../../common/settings';

import type { DiffPanel } from '../DiffPanel';

//	Variables __________________________________________________________________



//	Initialize _________________________________________________________________



//	Exports ____________________________________________________________________

export function init (currentDiffPanel: DiffPanel) {

	currentDiffPanel.msg.on('open:parent', async ({ pathA, pathB }: DiffInitMessage) => {

		if (!pathA || !pathB) return;

		const parentA = dirname(pathA);
		const parentB = dirname(pathB);
		if (parentA === pathA && parentB === pathB) return;

		const [statA, statB] = await Promise.all([lstat(parentA), lstat(parentB)]);
		if (!statA?.isDirectory() || !statB?.isDirectory()) return;

		currentDiffPanel.msg.send<DiffUpdatePathsMessage>('update:paths', {
			uris: [{ fsPath: parentA }, { fsPath: parentB }],
			compare: true,
		});

	});

	currentDiffPanel.msg.on('open:folder', ({ diff }: DiffPreviewMessage) => {

		if (diff.fileA?.type !== 'folder' || diff.fileB?.type !== 'folder') return;

		currentDiffPanel.msg.send<DiffUpdatePathsMessage>('update:paths', {
			uris: [
				{ fsPath: diff.fileA.fsPath },
				{ fsPath: diff.fileB.fsPath },
			],
			compare: true,
		});

	});
	
	currentDiffPanel.msg.on('open:diff', async ({ diffs, openToSide }: DiffOpenMessage) => {
			
		openToSide = settings.get('openToSide', false) || openToSide;
		
		for (let i = 0; i < diffs.length; i++) await DiffOpen.open(diffs[i], i === 0 && openToSide);
		
	});
	
	currentDiffPanel.msg.on('preview:diff', async ({ diff }: DiffPreviewMessage) => {
			
		await DiffOpen.open(diff, true, true);
		
	});
	
	currentDiffPanel.msg.on('goto:file', async ({ files: diffFiles, openToSide }: DiffGoToMessage) => {
		
		openToSide = settings.get('openToSide', false) || openToSide;
		
		for (let i = 0; i < diffFiles.length; i++) await DiffOpen.openFile(diffFiles[i], i === 0 && openToSide, false);
		
	});
	
	currentDiffPanel.msg.on('reveal:file', (fsPath: string) => files.reveal(fsPath));
	
}

//	Functions __________________________________________________________________

