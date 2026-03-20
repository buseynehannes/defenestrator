import { describe, it, beforeAll, beforeEach, afterAll, expect } from 'vitest';
import type { Driver as FirefoxDriver } from 'selenium-webdriver/firefox';
import { launchFirefoxWithExtension, getExtensionBaseUrl, seedConfig, pauseExtension } from './browser';
import { startTestServer } from './testServer';
import type { TestServer } from './testServer';

interface BrowserTab    { url?: string }
interface BrowserWindow { title: string; tabs: BrowserTab[] }

describe('RestoreNamedWindows (integration)', () => {
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

    /**
     * Close all browser windows except the one that currently has the options page,
     * ensuring each test starts with a clean slate.
     */
    async function closeExtraWindows(): Promise<void> {
        await driver.get(`${extensionBaseUrl}/src/options.html`);
        await driver.executeScript(`
            return (async () => {
                const current = await browser.windows.getCurrent();
                const all = await browser.windows.getAll();
                for (const w of all) {
                    if (w.id !== current.id) {
                        await browser.windows.remove(w.id);
                    }
                }
            })()
        `);
        await driver.sleep(500);
    }

    async function getWindows(): Promise<BrowserWindow[]> {
        await driver.get(`${extensionBaseUrl}/src/options.html`);
        return driver.executeScript<BrowserWindow[]>(
            `return browser.windows.getAll({ populate: true })`
        );
    }

    beforeEach(async () => {
        await closeExtraWindows();
        await pauseExtension(driver, extensionBaseUrl);
    });

    it('assigns each window its correct name based on its tabs', async () => {
        // Arrange: open two windows — one with an email tab and one with a work tab
        await driver.get(`${extensionBaseUrl}/src/options.html`);
        await driver.executeScript(
            `return browser.windows.create({ url: arguments[0] })`,
            `http://localhost:${server.port}/restore-email`
        );
        await driver.executeScript(
            `return browser.windows.create({ url: arguments[0] })`,
            `http://localhost:${server.port}/restore-work`
        );
        await driver.sleep(1000);

        // Act: seed config — triggers RestoreNamedWindowsService
        await seedConfig(driver, extensionBaseUrl, [
            { name: '[EMAIL]', matchUrls: [`localhost:${server.port}/restore-email`] },
            { name: '[WORK]',  matchUrls: [`localhost:${server.port}/restore-work`] },
        ]);

        await driver.sleep(1000);

        // Assert: each window should carry the title prefix of its matched spec
        const windows = await getWindows();
        const emailWindow = windows.find(w => w.tabs.some(t => t.url?.includes('/restore-email')));
        const workWindow  = windows.find(w => w.tabs.some(t => t.url?.includes('/restore-work')));

        expect(emailWindow, 'email window not found').toBeDefined();
        expect(workWindow,  'work window not found').toBeDefined();
        expect(emailWindow!.title).toMatch(/^\[EMAIL]/);
        expect(workWindow!.title).toMatch(/^\[WORK]/);
    }, 60_000);

    it('splits a mixed window so its tabs are distributed across named windows', async () => {
        // Arrange: a single window that holds both an email tab and a work tab
        await driver.get(`${extensionBaseUrl}/src/options.html`);
        const mixedWin = await driver.executeScript<{ id: number }>(
            `return browser.windows.create({ url: arguments[0] })`,
            `http://localhost:${server.port}/split-email`
        );
        await driver.executeScript(
            `return browser.tabs.create({ windowId: arguments[0], url: arguments[1] })`,
            mixedWin.id,
            `http://localhost:${server.port}/split-work`
        );
        await driver.sleep(1000);

        // Act: seed config — RestoreNamedWindowsService detects the mixed window and
        // moves each tab to the correct named window
        await seedConfig(driver, extensionBaseUrl, [
            { name: '[EMAIL]', matchUrls: [`localhost:${server.port}/split-email`] },
            { name: '[WORK]',  matchUrls: [`localhost:${server.port}/split-work`] },
        ]);
        await driver.sleep(1500); // extra time for tab-move events to be processed

        // Assert: email and work tabs should now live in separate, correctly named windows
        const windows = await getWindows();
        const emailWindow = windows.find(w => w.tabs.some(t => t.url?.includes('/split-email')));
        const workWindow  = windows.find(w => w.tabs.some(t => t.url?.includes('/split-work')));

        expect(emailWindow, 'email window not found').toBeDefined();
        expect(workWindow,  'work window not found').toBeDefined();
        expect(emailWindow!.title).toMatch(/^\[EMAIL]/);
        expect(workWindow!.title).toMatch(/^\[WORK]/);
        expect(emailWindow!.title).not.toBe(workWindow!.title);
    }, 60_000);

    it('merges two windows that both match the same spec into one named window', async () => {
        // Arrange: two separate windows that both satisfy the [EMAIL] spec
        // (both URLs contain "merge-email", so the pattern "merge-email" matches each)
        await driver.get(`${extensionBaseUrl}/src/options.html`);
        await driver.executeScript(
            `return browser.windows.create({ url: arguments[0] })`,
            `http://localhost:${server.port}/merge-email-a`
        );
        await driver.executeScript(
            `return browser.windows.create({ url: arguments[0] })`,
            `http://localhost:${server.port}/merge-email-b`
        );
        await driver.sleep(1000);

        // Act: seed config — RestoreNamedWindowsService assigns the first window to
        // [EMAIL] and moves the second window's tab into it via a TabMovedEvent
        await seedConfig(driver, extensionBaseUrl, [
            { name: '[EMAIL]', matchUrls: [`localhost:${server.port}/merge-email`] },
        ]);
        await driver.sleep(1500); // extra time for the tab-move event to be processed

        // Assert: both email tabs should have ended up in a single [EMAIL] window
        const windows = await getWindows();
        const emailTabs = windows.flatMap(w => w.tabs.filter(t => t.url?.includes('/merge-email')));
        expect(emailTabs).toHaveLength(2);

        const emailWindows = windows.filter(w =>
            w.tabs.some(t => t.url?.includes('/merge-email')) && /^\[EMAIL]/.test(w.title)
        );
        expect(emailWindows).toHaveLength(1);
        expect(
            emailWindows[0]!.tabs.filter(t => t.url?.includes('/merge-email'))
        ).toHaveLength(2);
    }, 60_000);
});

