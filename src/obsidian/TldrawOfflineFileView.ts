import { FileView, WorkspaceLeaf } from 'obsidian'
import { TLDRAW_ICON_NAME, VIEW_TYPE_TLDRAW_OFFLINE } from 'src/utils/constants'

export const TLDRAW_OFFLINE_UNSUPPORTED_TITLE = 'Can’t open .tldraw files yet'
export const TLDRAW_OFFLINE_UNSUPPORTED_MESSAGE =
	'We’re still working on support for files from tldraw offline.'

/**
 * Shown when a `.tldraw` file is opened. tldraw offline saves documents as an archive holding a
 * SQLite database rather than the JSON a `.tldr` file holds, so we can't render one. We claim the
 * extension anyway so that opening the file explains that, rather than leaving the user on
 * Obsidian's generic "no view for this file type" screen.
 *
 * This extends `FileView` directly rather than `BaseTldrawFileView`, which reads the file as text
 * and parses it as JSON — on an archive that only produces an opaque parse error.
 */
export class TldrawOfflineFileView extends FileView {
	constructor(leaf: WorkspaceLeaf) {
		super(leaf)
		this.navigation = true
	}

	override getViewType() {
		return VIEW_TYPE_TLDRAW_OFFLINE
	}

	override getIcon() {
		return TLDRAW_ICON_NAME
	}

	override getDisplayText() {
		return this.file ? this.file.basename : 'NO_FILE'
	}

	override async onOpen() {
		this.contentEl.empty()
		const container = this.contentEl.createDiv({ cls: 'ptl-offline-unsupported' })
		container.createEl('h3', { text: TLDRAW_OFFLINE_UNSUPPORTED_TITLE })
		container.createEl('p', { text: TLDRAW_OFFLINE_UNSUPPORTED_MESSAGE })
	}
}
