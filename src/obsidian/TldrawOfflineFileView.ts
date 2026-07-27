import { FileView, Menu, WorkspaceLeaf } from 'obsidian'
import {
	TLDRAW_ICON_NAME,
	TLDRAW_OFFLINE_UNSUPPORTED_MESSAGE,
	TLDRAW_OFFLINE_UNSUPPORTED_TITLE,
	VIEW_TYPE_TLDRAW_OFFLINE,
} from 'src/utils/constants'
import { pluginMenuLabel } from './menu'

const OPEN_IN_DEFAULT_APP = 'Open in default app'

/**
 * Shown when a `.tldraw` file is opened. tldraw offline saves documents as an archive holding a
 * SQLite database rather than the JSON a `.tldr` file holds, so we can't render one. We claim the
 * extension anyway so that opening the file explains that, rather than leaving the user on
 * Obsidian's generic "no view for this file type" screen.
 *
 * Claiming the extension takes away Obsidian's own handling, so this offers "open in default app"
 * to keep a route to whatever program can read the file.
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

	override onload() {
		super.onload()
		this.addAction('external-link', OPEN_IN_DEFAULT_APP, () => this.openInDefaultApp())
	}

	override onPaneMenu(menu: Menu, source: 'more-options' | 'tab-header' | string): void {
		super.onPaneMenu(menu, source)
		if (!this.file) return

		menu
			.addItem((item) => pluginMenuLabel(item.setSection('tldraw')))
			.addItem((item) =>
				item
					.setIcon('external-link')
					.setSection('tldraw')
					.setTitle(OPEN_IN_DEFAULT_APP)
					.onClick(() => this.openInDefaultApp())
			)
	}

	override async onOpen() {
		this.contentEl.empty()
		const container = this.contentEl.createDiv({ cls: 'ptl-offline-unsupported' })
		container.createEl('h3', { text: TLDRAW_OFFLINE_UNSUPPORTED_TITLE })
		container.createEl('p', { text: TLDRAW_OFFLINE_UNSUPPORTED_MESSAGE })
	}

	private openInDefaultApp() {
		if (!this.file) return
		this.app.openWithDefaultApp(this.file.path)
	}
}
