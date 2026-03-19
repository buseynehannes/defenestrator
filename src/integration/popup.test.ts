import { describe, it, beforeAll, beforeEach, afterAll, expect } from 'vitest';
import type { Driver as FirefoxDriver } from 'selenium-webdriver/firefox';
import { launchFirefoxWithExtension, getExtensionBaseUrl, seedConfig, pauseExtension } from './browser';
import { startTestServer } from './testServer';
import type { TestServer } from './testServer';

interface WindowSpecInfo {
    name: string;
    sticky: boolean;
    isDefault: boolean;
    matchUrls: string[];
}

describe('Popup (integration)', () => {
    let driver: FirefoxDriver;
    let extensionBaseUrl: string;
    let server: TestServer;

    beforeAll(async () => {
        server = await startTestServer();
        driver = await launchFirefoxWithExtension();
        extensionBaseUrl = await getExtensionBaseUrl(driver);
    }, 60_000);

    afterAll(async () => {
        await driver?.quit();
        await server?.close();
    });

    async function closeExtraWindows(): Promise<void> {
        await driver.get(`${extensionBaseUrl}/src/options.html`);
        await driver.executeScript(`
            return (async () => {
                const current = await browser.windows.getCurrent();
                const all = await browser.windows.getAll();
                for (const w of all) {
                    if (w.id !== current.id) await browser.windows.remove(w.id);
                }
            })()
        `);
        await driver.sleep(500);
    }

    /**
     * Opens a URL in a new Firefox window and returns both the Firefox window ID
     * (for message-passing) and the Selenium window handle (for driver.switchTo).
     * Must be called while the driver is on an extension page (options.html) so that
     * the browser API is available for `browser.windows.create`.
     */
    async function openWindowAndGetHandle(url: string): Promise<{ firefoxWindowId: number; handle: string }> {
        const handlesBefore = new Set(await driver.getAllWindowHandles());
        const win = await driver.executeScript<{ id: number }>(
            `return browser.windows.create({ url: arguments[0] })`,
            url
        );
        // Poll until the new Selenium handle appears (Firefox opens it asynchronously)
        let handle = '';
        for (let attempt = 0; attempt < 30; attempt++) {
            const current = await driver.getAllWindowHandles();
            const found = current.find(h => !handlesBefore.has(h));
            if (found) { handle = found; break; }
            await driver.sleep(200);
        }
        if (!handle) throw new Error(`Selenium handle for window ${win.id} never appeared`);
        return { firefoxWindowId: win.id, handle };
    }

    beforeEach(async () => {
        await closeExtraWindows();
        await pauseExtension(driver, extensionBaseUrl);
    });

    it('displays the spec name for the current window', async () => {
        // Arrange: open a work window, then activate the extension so it gets tracked
        const { handle } = await openWindowAndGetHandle(
            `http://localhost:${server.port}/popup-spec-name`
        );
        await driver.sleep(500);
        await seedConfig(driver, extensionBaseUrl, [
            { name: '[WORK]', matchUrls: [`localhost:${server.port}/popup-spec-name`] },
        ]);

        // Navigate to popup.html inside the work window.
        // moz-extension: URLs are globally ignored so the window stays tracked as [WORK].
        await driver.switchTo().window(handle);
        await driver.get(`${extensionBaseUrl}/src/popup.html`);
        await driver.sleep(2000);

        const specName = await driver.executeScript<string | null>(
            `return document.querySelector('.spec-name')?.textContent ?? null`
        );
        expect(specName).toBe('[WORK]');
    }, 60_000);

    it('shows the sticky badge when the assigned spec is already sticky', async () => {
        const { handle } = await openWindowAndGetHandle(
            `http://localhost:${server.port}/popup-sticky-badge`
        );
        await driver.sleep(500);
        await seedConfig(driver, extensionBaseUrl, [
            { name: '[WORK]', matchUrls: [`localhost:${server.port}/popup-sticky-badge`], sticky: true },
        ]);

        await driver.switchTo().window(handle);
        await driver.get(`${extensionBaseUrl}/src/popup.html`);
        await driver.sleep(2000);

        const badgeText = await driver.executeScript<string | null>(
            `return document.querySelector('.badge-sticky')?.textContent ?? null`
        );
        expect(badgeText).not.toBeNull();
        expect(badgeText!.toLowerCase()).toContain('sticky');

        // "Remove sticky" button should be present, not "Make sticky"
        const btnText = await driver.executeScript<string | null>(
            `return document.querySelector('.btn-sticky')?.textContent ?? null`
        );
        expect(btnText).toBe('Remove sticky');
    }, 60_000);

    it('makes a window sticky when the Make sticky button is clicked', async () => {
        const { handle } = await openWindowAndGetHandle(
            `http://localhost:${server.port}/popup-make-sticky`
        );
        await driver.sleep(500);
        await seedConfig(driver, extensionBaseUrl, [
            { name: '[WORK]', matchUrls: [`localhost:${server.port}/popup-make-sticky`] },
        ]);

        await driver.switchTo().window(handle);
        await driver.get(`${extensionBaseUrl}/src/popup.html`);
        await driver.sleep(2000);

        // Initially not sticky
        const btnTextBefore = await driver.executeScript<string | null>(
            `return document.querySelector('.btn-sticky')?.textContent ?? null`
        );
        expect(btnTextBefore).toBe('Make sticky');

        // Click "Make sticky"
        await driver.executeScript(`document.querySelector('.btn-sticky').click()`);
        await driver.sleep(2000);

        // Popup re-renders — button should flip to "Remove sticky"
        const btnTextAfter = await driver.executeScript<string | null>(
            `return document.querySelector('.btn-sticky')?.textContent ?? null`
        );
        expect(btnTextAfter).toBe('Remove sticky');

        // And the sticky badge should now be visible
        const badge = await driver.executeScript<string | null>(
            `return document.querySelector('.badge-sticky')?.textContent ?? null`
        );
        expect(badge).not.toBeNull();
    }, 60_000);

    it('toggles sticky via TOGGLE_STICKY message (the keyboard shortcut path)', async () => {
        const { firefoxWindowId } = await openWindowAndGetHandle(
            `http://localhost:${server.port}/popup-shortcut`
        );
        await driver.sleep(500);
        await seedConfig(driver, extensionBaseUrl, [
            { name: '[WORK]', matchUrls: [`localhost:${server.port}/popup-shortcut`] },
        ]);

        // Use the options page to call browser.runtime.sendMessage (it has the browser API)
        await driver.get(`${extensionBaseUrl}/src/options.html`);

        // Verify initial state: not sticky
        const initial = await driver.executeScript<WindowSpecInfo | null>(
            `return browser.runtime.sendMessage({ type: 'GET_CURRENT_WINDOW_SPEC', windowId: arguments[0] })`,
            firefoxWindowId
        );
        expect(initial).not.toBeNull();
        expect(initial!.name).toBe('[WORK]');
        expect(initial!.sticky).toBe(false);

        // First toggle → sticky
        const afterFirst = await driver.executeScript<WindowSpecInfo | null>(
            `return browser.runtime.sendMessage({ type: 'TOGGLE_STICKY', windowId: arguments[0] })`,
            firefoxWindowId
        );
        expect(afterFirst).not.toBeNull();
        expect(afterFirst!.sticky).toBe(true);

        // Second toggle → back to non-sticky
        const afterSecond = await driver.executeScript<WindowSpecInfo | null>(
            `return browser.runtime.sendMessage({ type: 'TOGGLE_STICKY', windowId: arguments[0] })`,
            firefoxWindowId
        );
        expect(afterSecond).not.toBeNull();
        expect(afterSecond!.sticky).toBe(false);
    }, 60_000);
});

