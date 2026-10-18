import type { Diff } from '../types';

export function getChangedFolders (diffs: Diff[]): Set<string> {

	const folders = new Set<string>();

	diffs.forEach((diff) => {

		if (!['modified', 'deleted', 'untracked', 'conflicting'].includes(diff.status)) return;

		[diff.fileA, diff.fileB].forEach((file) => {

			if (!file || file.type === 'folder') return;

			const segments = file.relative.replace(/\\/g, '/').split('/');
			segments.pop();
			while (segments.length) {
				folders.add(segments.join('/'));
				segments.pop();
			}

		});

	});

	return folders;

}
