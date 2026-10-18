import * as vscode from 'vscode';

import { lstatSync } from '../@l13/fse';

import { FavoritesState } from './FavoritesState';

const KEY = 'folderFavorites';
const GROUPS_KEY = 'folderFavoriteGroups';

type FolderGroups = { names: string[], memberships: { [path: string]: string } };

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

	public async add (paths: string[], group?: string) {

		await this.context.globalState.update(KEY, [...new Set(this.get().concat(paths))]);
		if (group && this.getGroups().includes(group)) {
			const data = this.getGroupData();
			paths.forEach((pathname) => data.memberships[pathname] = group);
			await this.context.globalState.update(GROUPS_KEY, data);
		}
		FolderFavoritesState.changed.fire();

	}

	public async remove (path: string) {

		await this.context.globalState.update(KEY, this.get().filter((value) => value !== path));
		const data = this.getGroupData();
		delete data.memberships[path];
		await this.context.globalState.update(GROUPS_KEY, data);
		FolderFavoritesState.changed.fire();

	}

	public async clear () {

		await this.context.globalState.update(KEY, []);
		await this.context.globalState.update(GROUPS_KEY, { names: [], memberships: {} });
		FolderFavoritesState.changed.fire();

	}

	private getGroupData (): FolderGroups {

		const saved = this.context.globalState.get<FolderGroups>(GROUPS_KEY, { names: [], memberships: {} });
		return { names: saved.names.slice(), memberships: { ...saved.memberships } };

	}

	public getGroups (): string[] {

		return this.getGroupData().names.sort((a, b) => a.localeCompare(b));

	}

	public getGroup (pathname: string): string {

		const data = this.getGroupData();
		const group = data.memberships[pathname];
		return data.names.includes(group) ? group : undefined;

	}

	public async addGroup (name: string) {

		name = name.trim();
		if (!name || this.getGroups().includes(name)) throw new Error('Choose a unique, non-empty group name.');
		const data = this.getGroupData();
		data.names.push(name);
		await this.context.globalState.update(GROUPS_KEY, data);
		FolderFavoritesState.changed.fire();

	}

	public async renameGroup (previous: string, name: string) {

		name = name.trim();
		if (previous === name) return;
		if (!name || this.getGroups().includes(name)) throw new Error('Choose a unique, non-empty group name.');
		const data = this.getGroupData();
		if (!data.names.includes(previous)) return;
		data.names = data.names.map((value) => value === previous ? name : value);
		Object.keys(data.memberships).forEach((pathname) => {

			if (data.memberships[pathname] === previous) data.memberships[pathname] = name;

		});
		await this.context.globalState.update(GROUPS_KEY, data);
		FolderFavoritesState.changed.fire();

	}

	public async removeGroup (name: string) {

		const data = this.getGroupData();
		data.names = data.names.filter((value) => value !== name);
		Object.keys(data.memberships).forEach((pathname) => {

			if (data.memberships[pathname] === name) delete data.memberships[pathname];

		});
		await this.context.globalState.update(GROUPS_KEY, data);
		FolderFavoritesState.changed.fire();

	}

	public async move (pathname: string, group?: string) {

		if (!this.get().includes(pathname)) return;
		if (group && !this.getGroups().includes(group)) throw new Error('Favorite group is not available.');
		const data = this.getGroupData();
		if (group) data.memberships[pathname] = group;
		else delete data.memberships[pathname];
		await this.context.globalState.update(GROUPS_KEY, data);
		FolderFavoritesState.changed.fire();

	}

}
