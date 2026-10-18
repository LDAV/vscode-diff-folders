import * as vscode from 'vscode';

import { lstatSync } from '../@l13/fse';

import { FavoritesState } from './FavoritesState';

const KEY = 'folderFavorites';

export class FolderFavoritesState {

	private static readonly changed = new vscode.EventEmitter<void>();
	public static readonly onDidChange = FolderFavoritesState.changed.event;

	public constructor (private readonly context: vscode.ExtensionContext) {}

	public get (): string[] {

		const saved = this.context.globalState.get<string[]>(KEY);
		const paths = saved || FavoritesState.create(this.context).get().reduce<string[]>((all, favorite) => {

			return all.concat([favorite.fileA, favorite.fileB].filter((path) => path && lstatSync(path)?.isDirectory()));

		}, []);

		return [...new Set(paths.filter(Boolean))].sort((a, b) => a.localeCompare(b));

	}

	public async add (paths: string[]) {

		await this.context.globalState.update(KEY, [...new Set(this.get().concat(paths))]);
		FolderFavoritesState.changed.fire();

	}

	public async remove (path: string) {

		await this.context.globalState.update(KEY, this.get().filter((value) => value !== path));
		FolderFavoritesState.changed.fire();

	}

	public async clear () {

		await this.context.globalState.update(KEY, []);
		FolderFavoritesState.changed.fire();

	}

}
