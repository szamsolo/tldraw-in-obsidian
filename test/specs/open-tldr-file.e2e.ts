import { browser, expect } from '@wdio/globals'

/**
 * A `.tldr` saved by a current version of tldraw. The plugin has to migrate the file's schema
 * forward when it opens it, which it can only do if the tldraw it bundles is at least as new as
 * the one that wrote the file.
 */
const CURRENT_SCHEMA_FIXTURE = 'current-schema.tldr'

describe('Opening a .tldr file', () => {
	before(async () => {
		await browser.reloadObsidian({
			plugins: ['tldraw'],
		})
	})

	it('renders a file saved by a current version of tldraw', async () => {
		const result = await browser.executeObsidian(async ({ app, obsidian }, path) => {
			const file = app.vault.getAbstractFileByPath(path)
			if (!(file instanceof obsidian.TFile)) {
				throw new Error(`The fixture "${path}" is missing from the test vault.`)
			}

			// The store is loaded asynchronously and its failures surface as uncaught errors rather
			// than as a rejection from openFile, so collect them from the window instead.
			const errors: string[] = []
			const onError = (event: ErrorEvent) => errors.push(event.message)
			const onRejection = (event: PromiseRejectionEvent) =>
				errors.push(String(event.reason?.message ?? event.reason))
			window.addEventListener('error', onError)
			window.addEventListener('unhandledrejection', onRejection)

			const leaf = app.workspace.getLeaf('tab')
			try {
				await leaf.openFile(file)

				// Wait for the canvas to mount, or for the load to fail trying.
				const deadline = Date.now() + 10_000
				while (
					Date.now() < deadline &&
					errors.length === 0 &&
					!leaf.view.containerEl.querySelector('.tldraw-view-root')
				) {
					await new Promise((resolve) => setTimeout(resolve, 100))
				}
			} catch (e) {
				errors.push(e instanceof Error ? e.message : String(e))
			} finally {
				window.removeEventListener('error', onError)
				window.removeEventListener('unhandledrejection', onRejection)
			}

			return {
				viewType: leaf.view.getViewType(),
				rendered: !!leaf.view.containerEl.querySelector('.tldraw-view-root'),
				errors,
			}
		}, CURRENT_SCHEMA_FIXTURE)

		// Compared as a whole so a failure reports the view Obsidian settled on and any errors it
		// collected, rather than just the first mismatched field.
		expect(result).toEqual({
			viewType: 'tldraw-view',
			rendered: true,
			errors: [],
		})
	})
})
