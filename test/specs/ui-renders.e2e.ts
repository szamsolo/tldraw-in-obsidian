import { $, browser, expect } from '@wdio/globals'

/**
 * The plugin replaces a good deal of tldraw's UI — its own main menu, zoom menu, quick actions and
 * keyboard shortcuts dialog — and restyles tldraw internals by class name. An SDK upgrade can
 * rename or restructure any of that without breaking a single type, so this checks the pieces are
 * actually on screen.
 */
describe('Plugin UI', () => {
	before(async () => {
		await browser.reloadObsidian({
			plugins: ['tldraw'],
		})

		await browser.executeObsidian(async ({ app }) => {
			const plugin = (app as unknown as { plugins: { plugins: Record<string, any> } }).plugins
				.plugins.tldraw
			// Otherwise creating a drawing opens the destination picker and blocks the test.
			plugin.settings.fileDestinations.confirmDestination = false
			const file = await plugin.createUntitledTldrFile({})
			await plugin.openTldrFile(file, 'new-tab')
		})
	})

	it('renders the canvas chrome', async () => {
		await expect($('.tldraw-view-root')).toBeExisting()
		await expect($('.tlui-toolbar')).toBeExisting()
		await expect($('.tlui-style-panel')).toBeExisting()
	})

	it('renders the plugin main menu', async () => {
		// A real click rather than a synthetic one: the menu opens on pointer events, which an
		// in-page element.click() doesn't produce.
		await $('.tlui-menu-zone button').click()

		const menu = $('.tlui-menu')
		await menu.waitForExist({ timeout: 5000 })

		// The plugin swaps in its own main menu with these submenus. They're what disappears if its
		// component overrides stop applying.
		const text = (await menu.getText()).toLowerCase()
		expect(text).toContain('file')
		expect(text).toContain('edit')
		expect(text).toContain('view')
	})
})
