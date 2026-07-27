import { browser, expect } from '@wdio/globals'

/**
 * The canvas background is meant to match Obsidian's own, so a drawing doesn't sit in a differently
 * coloured rectangle.
 *
 * These specs create their own drawing rather than opening a committed fixture, so they don't
 * depend on the schema version of any file on disk and stay valid across tldraw upgrades.
 */
describe('Canvas background', () => {
	before(async () => {
		await browser.reloadObsidian({
			plugins: ['tldraw'],
		})
	})

	it('matches the Obsidian theme background', async () => {
		const result = await browser.executeObsidian(async ({ app }) => {
			const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
			const plugin = (app as unknown as { plugins: { plugins: Record<string, any> } }).plugins
				.plugins.tldraw

			// Otherwise creating a drawing opens the destination picker and blocks the test.
			plugin.settings.fileDestinations.confirmDestination = false

			const file = await plugin.createUntitledTldrFile({})
			const leaf = await plugin.openTldrFile(file, 'new-tab')

			const deadline = Date.now() + 15_000
			let background: HTMLElement | null = null
			while (Date.now() < deadline) {
				background = leaf.view.containerEl.querySelector('.tl-background')
				if (background) break
				await sleep(100)
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

			const result = {
				canvas: resolve(getComputedStyle(background).backgroundColor),
				obsidian: resolve(
					getComputedStyle(document.body).getPropertyValue('--background-primary').trim()
				),
			}

			leaf.detach()
			await app.vault.delete(file)
			return result
		})

		expect(result.canvas).toBe(result.obsidian)
	})

	it('follows the Obsidian theme when it changes', async () => {
		const result = await browser.executeObsidian(async ({ app }) => {
			const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
			const plugin = (app as unknown as { plugins: { plugins: Record<string, any> } }).plugins
				.plugins.tldraw
			plugin.settings.fileDestinations.confirmDestination = false

			const file = await plugin.createUntitledTldrFile({})
			const leaf = await plugin.openTldrFile(file, 'new-tab')

			const deadline = Date.now() + 15_000
			let background: HTMLElement | null = null
			while (Date.now() < deadline) {
				background = leaf.view.containerEl.querySelector('.tl-background')
				if (background) break
				await sleep(100)
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
			const next = internals.vault.getConfig?.('theme') === 'obsidian' ? 'moonstone' : 'obsidian'
			if (typeof internals.changeTheme === 'function') {
				internals.changeTheme(next)
			} else {
				internals.vault.setConfig?.('theme', next)
				app.workspace.trigger('css-change')
			}

			const settle = Date.now() + 10_000
			while (Date.now() < settle) {
				const now = read()
				if (now.obsidian !== before.obsidian && now.canvas === now.obsidian) break
				await sleep(100)
			}

			const after = read()
			leaf.detach()
			await app.vault.delete(file)
			return { before, after }
		})

		// Guards against the assertion below passing trivially because the theme never actually moved.
		expect(result.after.obsidian).not.toBe(result.before.obsidian)
		expect(result.after.canvas).toBe(result.after.obsidian)
	})
})
