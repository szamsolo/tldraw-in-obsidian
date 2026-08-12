import { $, browser, expect } from '@wdio/globals'

/**
 * The SDK doesn't fail loudly on a bad license. `LicenseProvider` renders the editor as
 * normal and then, five seconds later, replaces it with an empty `tl-license-expired` div —
 * so a canvas that mounts fine can still be gone once a user has looked at it.
 *
 * Every other spec here finishes inside that window, which is why an expired key shipped in
 * 1.30.0 and passed CI (#219). This one waits it out.
 */
describe('License', () => {
	before(async () => {
		await browser.reloadObsidian({
			plugins: ['tldraw'],
		})

		await browser.executeObsidian(async ({ app }) => {
			const plugin = (app as unknown as { plugins: { plugins: Record<string, any> } }).plugins
				.plugins.tldraw
			plugin.settings.fileDestinations.confirmDestination = false
			const file = await plugin.createUntitledTldrFile({})
			await plugin.openTldrFile(file, 'new-tab')
		})
	})

	it('does not gate the editor once the license timeout has passed', async () => {
		await expect($('.tldraw-view-root')).toBeExisting()

		// LICENSE_TIMEOUT is 5000ms, measured from mount. Wait past it before asserting.
		await browser.pause(8000)

		await expect($('[data-testid="tl-license-expired"]')).not.toBeExisting()
		await expect($('.tldraw-view-root')).toBeExisting()
		await expect($('.tlui-toolbar')).toBeExisting()
	})
})
