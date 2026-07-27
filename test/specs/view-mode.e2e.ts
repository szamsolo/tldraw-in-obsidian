import { browser, expect } from '@wdio/globals'

/**
 * A drawing stored in markdown can be shown either as a canvas or as the note it really is, and the
 * plugin swaps the leaf's view between the two. That swap is the plugin's own machinery rather than
 * anything tldraw provides, so it's worth covering directly.
 */
describe('View mode', () => {
	before(async () => {
		await browser.reloadObsidian({
			plugins: ['tldraw'],
		})
	})

	it('switches a drawing between the canvas and its markdown', async () => {
		const result = await browser.executeObsidian(async ({ app }) => {
			const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
			const plugin = (app as unknown as { plugins: { plugins: Record<string, any> } }).plugins
				.plugins.tldraw

			// Otherwise creating a drawing opens the destination picker and blocks the test.
			plugin.settings.fileDestinations.confirmDestination = false

			const file = await plugin.createUntitledTldrFile({})
			const leaf = await plugin.openTldrFile(file, 'new-tab')

			const waitFor = async (predicate: () => boolean) => {
				const deadline = Date.now() + 15_000
				while (Date.now() < deadline) {
					if (predicate()) return true
					await sleep(100)
				}
				return false
			}

			const canvasFirst = await waitFor(
				() => !!leaf.view.containerEl.querySelector('.tldraw-view-root')
			)
			const typeAsCanvas = leaf.view.getViewType()

			await plugin.updateViewMode('markdown', leaf)
			const becameMarkdown = await waitFor(() => leaf.view.getViewType() === 'markdown')
			// The drawing is stored in a fenced code block, so its data should be on screen as text.
			const markdownText = leaf.view.containerEl.innerText ?? ''

			await plugin.updateViewMode('tldraw-view', leaf)
			const backToCanvas = await waitFor(
				() => !!leaf.view.containerEl.querySelector('.tldraw-view-root')
			)

			const result = {
				typeAsCanvas,
				canvasFirst,
				becameMarkdown,
				markdownShowsData: markdownText.includes('tldraw'),
				backToCanvas,
			}

			leaf.detach()
			await app.vault.delete(file)
			return result
		})

		expect(result).toEqual({
			typeAsCanvas: 'tldraw-view',
			canvasFirst: true,
			becameMarkdown: true,
			markdownShowsData: true,
			backToCanvas: true,
		})
	})
})
