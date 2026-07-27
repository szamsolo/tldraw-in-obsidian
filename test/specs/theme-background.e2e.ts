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

	it('follows the Obsidian theme when it changes', async () => {
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
				if (background) break
				await new Promise((resolve) => setTimeout(resolve, 100))
			}
			if (!background) throw new Error('The tldraw canvas never rendered.')

			const resolve = (color: string) => {
				const probe = document.createElement('div')
				probe.style.color = color
				document.body.appendChild(probe)
				const resolved = getComputedStyle(probe).color
				probe.remove()
				return resolved
			}
			const read = () => ({
				canvas: resolve(getComputedStyle(background!).backgroundColor),
				obsidian: resolve(
					getComputedStyle(document.body).getPropertyValue('--background-primary').trim()
				),
			})

			const before = read()

			// `changeTheme` isn't in Obsidian's public typings, so fall back to writing the config and
			// firing the event the plugin actually listens for.
			const internals = app as unknown as {
				changeTheme?(theme: string): void
				vault: { getConfig?(key: string): unknown; setConfig?(key: string, value: unknown): void }
			}
			const current = internals.vault.getConfig?.('theme')
			const next = current === 'obsidian' ? 'moonstone' : 'obsidian'
			if (typeof internals.changeTheme === 'function') {
				internals.changeTheme(next)
			} else {
				internals.vault.setConfig?.('theme', next)
				app.workspace.trigger('css-change')
			}

			// Wait for Obsidian to repaint and the plugin's reactor to push the new colour through.
			const settle = Date.now() + 10_000
			while (Date.now() < settle) {
				const now = read()
				if (now.obsidian !== before.obsidian && now.canvas === now.obsidian) break
				await new Promise((resolve) => setTimeout(resolve, 100))
			}

			return { before, after: read(), switchedTo: next }
		}, CURRENT_SCHEMA_FIXTURE)

		// Guards against the assertion below passing trivially because the theme never actually moved.
		expect(result.after.obsidian).not.toBe(result.before.obsidian)
		expect(result.after.canvas).toBe(result.after.obsidian)
	})
})
