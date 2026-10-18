//	Imports ____________________________________________________________________

import type { DiffPanelSettings } from '../types';

import { msg } from './common';

//	Variables __________________________________________________________________

const l13Settings: DiffPanelSettings = (<any>window).l13Settings;

//	Initialize _________________________________________________________________

msg.on('change:settings', (settings: DiffPanelSettings) => {
	
	if (typeof settings.showFileDate === 'boolean') showFileDate = settings.showFileDate;
	if (typeof settings.showFileTime === 'boolean') showFileTime = settings.showFileTime;
	if (typeof settings.showFileSize === 'boolean') showFileSize = settings.showFileSize;
	if (typeof settings.enablePreview === 'boolean') enablePreview = settings.enablePreview;
	
});

//	Exports ____________________________________________________________________

export let enablePreview = l13Settings.enablePreview;


export let showFileDate = l13Settings.showFileDate;
export let showFileTime = l13Settings.showFileTime;
export let showFileSize = l13Settings.showFileSize;

//	Functions __________________________________________________________________
