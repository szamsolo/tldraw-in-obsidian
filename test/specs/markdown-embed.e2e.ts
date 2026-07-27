import { browser, expect } from '@wdio/globals'

/**
 * Embedding a drawing in a note goes through a different path from opening one: the embed registry
 * and a `TldrawImage` rather than a full editor. It's also the path the `TldrawImage` patch in
 * `patches/` exists for, so it's worth holding still.
 */
describe('Embedding a drawing in a note', () => {
	before(async () => {
		await browser.reloadObsidian({
			plugins: ['tldraw'],
		})
	})

	it('renders the drawing in reading view', async () => {
		const result = await browser.executeObsidian(async ({ app, obsidian }) => {
			const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
			const plugin = (app as unknown as { plugins: { plugins: Record<string, any> } }).plugins
				.plugins.tldraw

			// Otherwise creating a drawing opens the destination picker and blocks the test.
			plugin.settings.fileDestinations.confirmDestination = false

			// Embeds are registered for `.tldr`, so this one isn't stored in markdown.
			const drawing = await plugin.createUntitledTldrFile({ inMarkdown: false })

			// Give it a shape, so the embed has something to draw.
			const editorLeaf = await plugin.openTldrFile(drawing, 'new-tab')
			const editorDeadline = Date.now() + 15_000
			while (Date.now() < editorDeadline && !plugin.currTldrawEditor) await sleep(100)
			if (!plugin.currTldrawEditor) throw new Error('The tldraw editor never mounted.')
			plugin.currTldrawEditor.createShape({
				type: 'geo',
				x: 100,
				y: 100,
				props: { geo: 'rectangle', w: 120, h: 80 },
			})
			await sleep(2000)
			editorLeaf.detach()
			plugin.currTldrawEditor = undefined

			const hostPath = 'embed-host.md'
			const existing = app.vault.getAbstractFileByPath(hostPath)
			if (existing instanceof obsidian.TFile) await app.vault.delete(existing)
			const host = await app.vault.create(hostPath, `![[${drawing.name}]]`)

			const leaf = app.workspace.getLeaf('tab')
			await leaf.setViewState({
				type: 'markdown',
				state: { file: host.path, mode: 'preview' },
			})

			const deadline = Date.now() + 20_000
			let embed: HTMLElement | null = null
			let image: HTMLElement | null = null
			while (Date.now() < deadline) {
				embed = leaf.view.containerEl.querySelector('.ptl-markdown-embed')
				// The embed renders lazily, so make sure it's actually on screen.
				embed?.scrollIntoView()
				image = leaf.view.containerEl.querySelector('.ptl-tldraw-image img[src]')
				if (embed && image) break
				await sleep(200)
			}

			const result = { embedded: !!embed, rendered: !!image }

			leaf.detach()
			await app.vault.delete(host)
			await app.vault.delete(drawing)
			return result
		})

		expect(result).toEqual({ embedded: true, rendered: true })
	})
})
