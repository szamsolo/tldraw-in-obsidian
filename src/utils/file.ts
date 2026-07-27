import { Notice, Platform, TFile } from 'obsidian'
import TldrawPlugin from 'src/main'
import { showSaveFileModal } from 'src/obsidian/modal/save-file-modal'
import {
	Editor,
	TLDRAW_FILE_EXTENSION,
	TLUiActionItem,
	serializeTldrawJsonBlob,
	useDefaultHelpers,
} from 'tldraw'
import {
	TLDRAW_OFFLINE_EXPORT_PROMPT_AFTER,
	TLDRAW_OFFLINE_EXPORT_PROMPT_BEFORE,
	TLDRAW_OFFLINE_EXPORT_PROMPT_LINK,
	TLDRAW_OFFLINE_EXPORT_URL,
	TLDRAW_OFFLINE_FILE_EXTENSION,
	TLDRAW_OFFLINE_UNSUPPORTED_MESSAGE,
	TLDRAW_OFFLINE_UNSUPPORTED_TITLE,
} from './constants'
import { migrateTldrawFileDataIfNecessary } from './migrate/tl-data-to-tlstore'
// import { shouldOverrideDocument } from "src/components/file-menu/shouldOverrideDocument";

export const SAVE_FILE_COPY_ACTION = 'save-file-copy'
export const SAVE_FILE_COPY_IN_VAULT_ACTION = 'save-file-copy-in-vault'
export const OPEN_FILE_ACTION = 'open-file'

// https://github.com/tldraw/tldraw/blob/58890dcfce698802f745253ca42584731d126cc3/packages/tldraw/src/lib/utils/export/exportAs.ts#L57
const downloadFile = (file: File) => {
	const link = document.createElement('a')
	const url = URL.createObjectURL(file)
	link.href = url
	link.download = file.name
	link.click()
	URL.revokeObjectURL(url)
}

export function downloadBlob(
	blob: Blob,
	name: string,
	plugin: TldrawPlugin,
	preferVault: boolean = false
) {
	const file = new File([blob], name, {
		type: blob.type,
	})
	if (Platform.isMobile || preferVault) {
		return showSaveFileModal(plugin, file, {})
	} else {
		return downloadFile(file)
	}
}

// https://github.com/tldraw/tldraw/blob/58890dcfce698802f745253ca42584731d126cc3/apps/dotcom/src/utils/useFileSystem.tsx#L111
export function getSaveFileCopyAction(editor: Editor, defaultDocumentName: string): TLUiActionItem {
	if (Platform.isMobile) {
		throw new Error(`${getSaveFileCopyAction.name} is not allowed on mobile platforms.`)
	}
	return {
		id: SAVE_FILE_COPY_ACTION,
		label: 'action.save-copy',
		readonlyOk: true,
		async onSelect() {
			const defaultName = `${defaultDocumentName}${TLDRAW_FILE_EXTENSION}`

			const blobToSave = await serializeTldrawJsonBlob(editor)

			try {
				const file = new File([blobToSave], defaultName, {
					type: blobToSave.type,
				})
				downloadFile(file)
			} catch (e) {
				// user cancelled
				return
			}
		},
	}
}

export function getSaveFileCopyInVaultAction(
	editor: Editor,
	defaultDocumentName: string,
	plugin: TldrawPlugin
): TLUiActionItem {
	const defaultName = `${defaultDocumentName}${TLDRAW_FILE_EXTENSION}`
	return {
		id: SAVE_FILE_COPY_IN_VAULT_ACTION,
		label: 'Save a copy in vault',
		readonlyOk: true,
		onSelect: async () => {
			const res = await downloadBlob(
				await serializeTldrawJsonBlob(editor),
				defaultName,
				plugin,
				true
			)

			if (typeof res === 'object') {
				res.showResultModal()
			}
		},
	}
}

export function importFileAction(
	plugin: TldrawPlugin,
	addDialog: ReturnType<typeof useDefaultHelpers>['addDialog']
): TLUiActionItem {
	return {
		id: OPEN_FILE_ACTION,
		label: 'action.open-file',
		readonlyOk: true,
		async onSelect(source) {
			const tFile = await importTldrawFile(plugin)
			if (!tFile) return
			await plugin.openTldrFile(tFile, 'new-tab')
		},
	}
}

export async function importTldrawFile(
	plugin: TldrawPlugin,
	attachTo?: TFile
): Promise<TFile | undefined> {
	if ('showOpenFilePicker' in window) {
		const [file] = await window.showOpenFilePicker({
			id: 'tldraw-open-file',
			startIn: 'downloads',
			types: [
				{
					description: 'Tldraw Document',
					accept: {
						// tldraw offline files are selectable so that we can explain why we can't import
						// them yet. Leaving them out would just grey them out with no explanation.
						'text/tldr': ['.tldr', TLDRAW_OFFLINE_FILE_EXTENSION],
					},
				},
			],
			excludeAcceptAllOption: true,
		})

		// Case-insensitive: file dialogs on macOS and Windows match their filters that way, so a
		// `.TLDRAW` file is selectable and would otherwise fall through to the JSON parser.
		if (file.name.toLowerCase().endsWith(TLDRAW_OFFLINE_FILE_EXTENSION)) {
			// A fragment rather than a string so the notice can carry the link to the manual.
			const notice = document.createDocumentFragment()
			notice.createEl('strong', { text: TLDRAW_OFFLINE_UNSUPPORTED_TITLE })
			notice.createEl('br')
			notice.appendText(
				`${TLDRAW_OFFLINE_UNSUPPORTED_MESSAGE} ${TLDRAW_OFFLINE_EXPORT_PROMPT_BEFORE}`
			)
			notice.createEl('a', {
				text: TLDRAW_OFFLINE_EXPORT_PROMPT_LINK,
				href: TLDRAW_OFFLINE_EXPORT_URL,
			})
			notice.appendText(TLDRAW_OFFLINE_EXPORT_PROMPT_AFTER)
			new Notice(notice)
			return undefined
		}

		return plugin.createUntitledTldrFile({
			attachTo,
			tlStore: migrateTldrawFileDataIfNecessary(await (await file.getFile()).text()),
		})
	} else {
		throw new Error('Unable to open file picker.')
	}
}
