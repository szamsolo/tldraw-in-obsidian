const TLDRAW_OFFLINE_URL = 'https://offline.tldraw.com/'

/** Anchors the "Export as .tldr" section of the tldraw offline user manual. */
const TLDRAW_OFFLINE_EXPORT_URL =
	'https://tldraw.notion.site/User-manual-tldraw-offline-39a3e4c324c080e7b2eacc5afd078e85#3aa3e4c324c080669967e2cc3ae2c789'

/**
 * Appends the explanation for why a `.tldraw` file can't be opened, and the way forward, into
 * {@linkcode parent}.
 *
 * Built as nodes rather than returned as a string so that both the file view and the import notice
 * can carry the links: Obsidian's `Notice` only renders them when given a fragment.
 */
export function appendTldrawOfflineMessage(parent: HTMLElement | DocumentFragment) {
	const explanation = parent.createEl('p')
	explanation.appendText('We’re working on support for files from ')
	explanation.createEl('a', { text: 'tldraw offline', href: TLDRAW_OFFLINE_URL })
	explanation.appendText('.')

	const prompt = parent.createEl('p')
	prompt.appendText('For now, you can ')
	prompt.createEl('a', { text: 'export as a .tldr file', href: TLDRAW_OFFLINE_EXPORT_URL })
	prompt.appendText(' to use it here.')
}
