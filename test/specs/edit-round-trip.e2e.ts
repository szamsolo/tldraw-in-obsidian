import { browser, expect } from '@wdio/globals'

const CURRENT_SCHEMA_FIXTURE = 'current-schema.tldr'

/**
 * Creating and persisting is the part of the plugin the other specs don't touch: they only ever
 * open a file that was already on disk. This draws a shape, waits for the debounced save, and
 * reopens the file from scratch, so a break anywhere between the editor and the vault shows up.
 */
describe('Editing a drawing', () => {
	before(async () => {
		await browser.reloadObsidian({
			plugins: ['tldraw'],
		})
	})

	it('writes an edit to disk and reads it back', async () => {
		const result = await browser.executeObsidian(async ({ app, obsidian }, path) => {
			const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
			const plugin = (app as unknown as { plugins: { plugins: Record<string, any> } }).plugins
				.plugins.tldraw

			const fixture = app.vault.getAbstractFileByPath(path)
			if (!(fixture instanceof obsidian.TFile)) {
				throw new Error(`The fixture "${path}" is missing from the test vault.`)
			}

			// Work on a copy: this test writes, and the fixture is committed to the repo.
			const scratchPath = 'round-trip-scratch.tldr'
			const existing = app.vault.getAbstractFileByPath(scratchPath)
			if (existing instanceof obsidian.TFile) await app.vault.delete(existing)
			const file = await app.vault.copy(fixture, scratchPath)

			const countShapes = (contents: string) =>
				JSON.parse(contents).records.filter((record: any) => record.typeName === 'shape').length

			const shapesOnDiskBefore = countShapes(await app.vault.read(file))

			const leaf = app.workspace.getLeaf('tab')
			await leaf.openFile(file)

			const waitForEditor = async () => {
				const deadline = Date.now() + 15_000
				while (Date.now() < deadline) {
					if (plugin.currTldrawEditor) return plugin.currTldrawEditor
					await sleep(100)
				}
				throw new Error('The tldraw editor never mounted.')
			}

			const editor = await waitForEditor()
			const shapesInEditorBefore = editor.getCurrentPageShapes().length

			editor.createShape({
				type: 'geo',
				x: 100,
				y: 100,
				props: { geo: 'rectangle', w: 120, h: 80 },
			})
			const shapesInEditorAfter = editor.getCurrentPageShapes().length

			// The plugin debounces writes (saveFileDelay, 0.5s by default), so poll the file rather
			// than assuming a fixed delay.
			const saveDeadline = Date.now() + 15_000
			let shapesOnDiskAfter = shapesOnDiskBefore
			while (Date.now() < saveDeadline) {
				shapesOnDiskAfter = countShapes(await app.vault.read(file))
				if (shapesOnDiskAfter !== shapesOnDiskBefore) break
				await sleep(200)
			}

			// Reopen from scratch so the count comes back through a fresh load, not the live store.
			leaf.detach()
			await sleep(500)
			const reopened = app.workspace.getLeaf('tab')
			await reopened.openFile(file)
			const reloadedEditor = await waitForEditor()
			const shapesAfterReopen = reloadedEditor.getCurrentPageShapes().length

			reopened.detach()
			await app.vault.delete(file)

			return {
				shapesAfterReopen,
				shapesInEditorBefore,
				shapesInEditorAfter,
				shapesOnDiskBefore,
				shapesOnDiskAfter,
			}
		}, CURRENT_SCHEMA_FIXTURE)

		expect(result.shapesInEditorAfter).toBe(result.shapesInEditorBefore + 1)
		expect(result.shapesOnDiskAfter).toBe(result.shapesOnDiskBefore + 1)
		expect(result.shapesAfterReopen).toBe(result.shapesInEditorAfter)
	})
})
