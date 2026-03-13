import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import type { Driver as FirefoxDriver } from 'selenium-webdriver/firefox';
import { launchFirefoxWithExtension, getExtensionBaseUrl, seedConfig } from './browser';
import { startTestServer } from './testServer';
import type { TestServer } from './testServer';

interface BrowserTab    { url?: string }
interface BrowserWindow { title: string; tabs: BrowserTab[] }

/**
 * Integration tests that spin up a real Firefox instance with the extension
 * loaded as a temporary add-on.
 *
 * Prerequisites:
 *   - Extension must be built first: `make build`
 *   - Firefox must be installed
 *   - `geckodriver` is provided by the npm package (available on PATH via `npm run`)
 *
 * The tests use a local HTTP server so no internet access is required.
 */
describe('Tab routing (integration)', () => {
    let driver: FirefoxDriver;
    let extensionBaseUrl: string;
    let server: TestServer;

    beforeAll(async () => {
        server = await startTestServer();
        driver = await launchFirefoxWithExtension();
        extensionBaseUrl = await getExtensionBaseUrl(driver);

        await seedConfig(driver, extensionBaseUrl, [
            { name: '[EMAIL]', matchUrls: [`localhost:${server.port}/email`] },
            { name: '[WORK]',  matchUrls: [`localhost:${server.port}/work`] },
        ]);
    }, 60_000);

    afterAll(async () => {
        await driver?.quit();
        await server?.close();
    });

    async function getWindows(d: FirefoxDriver): Promise<BrowserWindow[]> {
        // Navigate to the options page so browser.windows is available
        await d.get(`${extensionBaseUrl}/src/options.html`);
        return d.executeScript<BrowserWindow[]>(`return browser.windows.getAll({ populate: true })`);
    }

    it('routes a tab matching a rule to a dedicated named window', async () => {
        await driver.get(`${extensionBaseUrl}/src/options.html`);
        // Open a tab via the extension API to avoid popup-blocker interference
        await driver.executeScript(
            `return browser.tabs.create({ url: arguments[0] })`,
            `http://localhost:${server.port}/email`
        );

        await driver.sleep(2000);

        const windows = await getWindows(driver);
        const emailWindow = windows.find((w: BrowserWindow) =>
            w.tabs.some((t: BrowserTab) => t.url?.includes('/email'))
        );

        expect(emailWindow).toBeDefined();
    }, 30_000);

    it('sets the window title prefix to the spec name', async () => {
        const windows = await getWindows(driver);
        const emailWindow = windows.find((w: BrowserWindow) =>
            w.tabs.some((t: BrowserTab) => t.url?.includes('/email'))
        );

        expect(emailWindow).toBeDefined();
        expect(emailWindow!.title).toMatch(/^\[EMAIL]/);
    }, 30_000);

    it('routes tabs to separate windows per rule', async () => {
        await driver.get(`${extensionBaseUrl}/src/options.html`);
        await driver.executeScript(
            `return browser.tabs.create({ url: arguments[0] })`,
            `http://localhost:${server.port}/work`
        );

        await driver.sleep(2000);

        const windows = await getWindows(driver);
        const emailWindow = windows.find((w: BrowserWindow) => w.tabs.some((t: BrowserTab) => t.url?.includes('/email')));
        const workWindow  = windows.find((w: BrowserWindow) => w.tabs.some((t: BrowserTab) => t.url?.includes('/work')));

        expect(emailWindow).toBeDefined();
        expect(workWindow).toBeDefined();
        expect(emailWindow!.title).toMatch(/^\[EMAIL]/);
        expect(workWindow!.title).toMatch(/^\[WORK]/);
        // Each rule should live in its own window
        expect(emailWindow!.title).not.toBe(workWindow!.title);
    }, 30_000);
});
