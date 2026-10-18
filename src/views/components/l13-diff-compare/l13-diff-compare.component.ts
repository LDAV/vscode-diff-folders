//	Imports ____________________________________________________________________

import { L13Component, L13Element, L13Query } from '../../@l13/core';

import { disableContextMenu, setLabel } from '../../common';

import styles from '../styles';
import templates from '../templates';

import { L13DiffCompareViewModelService } from './l13-diff-compare.service';
import type { L13DiffCompareViewModel } from './l13-diff-compare.viewmodel';

//	Variables __________________________________________________________________



//	Initialize _________________________________________________________________



//	Exports ____________________________________________________________________

@L13Component({
	name: 'l13-diff-compare',
	service: L13DiffCompareViewModelService,
	styles: [styles['l13-diff-compare/l13-diff-compare.css']],
	template: templates['l13-diff-compare/l13-diff-compare.html'],
})
export class L13DiffCompareComponent extends L13Element<L13DiffCompareViewModel> {
	
	@L13Query('#compare')
	private button: HTMLButtonElement;

	@L13Query('#parent')
	private parentButton: HTMLButtonElement;
	
	public constructor () {
		
		super();
		
		setLabel(this.button, 'Compare');
		
		this.button.addEventListener('click', ({ altKey }) => this.dispatchCustomEvent('compare', { altKey }));
		this.parentButton.addEventListener('click', () => this.dispatchCustomEvent('parent'));
		
		disableContextMenu(this);
		
	}
	
}

//	Functions __________________________________________________________________

