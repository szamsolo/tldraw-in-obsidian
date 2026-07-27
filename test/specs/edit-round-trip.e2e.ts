import { browser, expect } from '@wdio/globals'

/**
 * Creating and persisting is the part of the plugin that opening a file doesn't touch. This draws a
 * shape, waits for the debounced write, and reopens the drawing from scratch, so a break anywhere
 * between the editor and the vault shows up.
 *
 * It compares file contents rather than parsing them, so it holds whether the drawing is stored as
 * markdown or as `.tldr`.
 */
describe('Editing a drawing', () => {
	before(async () => {
		await browser.reloadObsidian({
			plugins: ['tldraw'],
		})
	})

	it('writes an edit to disk and reads it back', async () => {
		const result = await browser.executeObsidian(async ({ app }) => {
			const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
			const plugin = (app as unknown as { plugins: { plugins: Record<string, any> } }).plugins
				.plugins.tldraw

			// Otherwise creating a drawing opens the destination picker and blocks the test.
			plugin.settings.fileDestinations.confirmDestination = false

			const waitForEditor = async () => {
				const deadline = Date.now() + 15_000
				while (Date.now() < deadline) {
					if (plugin.currTldrawEditor) return plugin.currTldrawEditor
					await sleep(100)
				}
				throw new Error('The tldraw editor never mounted.')
			}

			const file = await plugin.createUntitledTldrFile({})
			const leaf = await plugin.openTldrFile(file, 'new-tab')

			const editor = await waitForEditor()
			const shapesBefore = editor.getCurrentPageShapes().length
			const contentsBefore = await app.vault.read(file)

			editor.createShape({
				type: 'geo',
				x: 100,
				y: 100,
				props: { geo: 'rectangle', w: 120, h: 80 },
			})
			const shapesAfterEdit = editor.getCurrentPageShapes().length

			// The plugin debounces writes (saveFileDelay, 0.5s by default), so poll the file rather
			// than assuming a fixed delay.
			const saveDeadline = Date.now() + 15_000
			let contentsAfter = contentsBefore
			while (Date.now() < saveDeadline) {
				contentsAfter = await app.vault.read(file)
				if (contentsAfter !== contentsBefore) break
				await sleep(200)
			}

			// Reopen from scratch so the count comes back through a fresh load, not the live store.
			leaf.detach()
			plugin.currTldrawEditor = undefined
			await sleep(500)
			await plugin.openTldrFile(file, 'new-tab')
			const reloaded = await waitForEditor()
			const shapesAfterReopen = reloaded.getCurrentPageShapes().length

			await app.vault.delete(file)

			return {
				shapesBefore,
				shapesAfterEdit,
				shapesAfterReopen,
				wroteToDisk: contentsAfter !== contentsBefore,
			}
		})

		expect(result.shapesAfterEdit).toBe(result.shapesBefore + 1)
		expect(result.wroteToDisk).toBe(true)
		expect(result.shapesAfterReopen).toBe(result.shapesAfterEdit)
	})
})
