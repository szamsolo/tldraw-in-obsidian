import { browser, expect } from '@wdio/globals'

const CURRENT_SCHEMA_FIXTURE = 'current-schema.tldr'

/**
 * The canvas background is meant to match Obsidian's own, so a drawing doesn't sit in a differently
 * coloured rectangle. tldraw 5 moved this from a mutable global palette to per-editor themes, and
 * nothing about that migration is visible to the type checker — if the theme update stopped being
 * applied, the canvas would just quietly render tldraw's default colour instead.
 */
describe('Canvas background', () => {
	before(async () => {
		await browser.reloadObsidian({
			plugins: ['tldraw'],
		})
	})

	it('matches the Obsidian theme background', async () => {
		const result = await browser.executeObsidian(async ({ app, obsidian }, path) => {
			const file = app.vault.getAbstractFileByPath(path)
			if (!(file instanceof obsidian.TFile)) {
				throw new Error(`The fixture "${path}" is missing from the test vault.`)
			}

			const leaf = app.workspace.getLeaf('tab')
			await leaf.openFile(file)

			const deadline = Date.now() + 10_000
			let background: HTMLElement | null = null
			while (Date.now() < deadline) {
				background = leaf.view.containerEl.querySelector('.tl-background')
				if (background && getComputedStyle(background).backgroundColor) break
				await new Promise((resolve) => setTimeout(resolve, 100))
			}
			if (!background) throw new Error('The tldraw canvas never rendered.')

			// Obsidian's variable and tldraw's computed colour are written in different notations, so
			// both are resolved through the browser before comparing.
			const resolve = (color: string) => {
				const probe = document.createElement('div')
				probe.style.color = color
				document.body.appendChild(probe)
				const resolved = getComputedStyle(probe).color
				probe.remove()
				return resolved
			}

			const obsidianBackground = getComputedStyle(document.body)
				.getPropertyValue('--background-primary')
				.trim()

			return {
				canvas: resolve(getComputedStyle(background).backgroundColor),
				obsidian: resolve(obsidianBackground),
			}
		}, CURRENT_SCHEMA_FIXTURE)

		expect(result.canvas).toBe(result.obsidian)
	})
})
