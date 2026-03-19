import { Builder } from 'selenium-webdriver';
import { Driver as FirefoxDriver, Options, Context } from 'selenium-webdriver/firefox';
import * as path from 'path';

const EXTENSION_DIR = path.resolve(__dirname, '../..');
const EXTENSION_GECKO_ID = 'defenestrator@hannesbuseyne.com';

/**
 * Launches Firefox and loads the extension as a temporary add-on.
 * Requires the extension to be built first (`make build`).
 * Requires `geckodriver` to be on PATH (provided by the `geckodriver` npm package
 * when running via `npm run`).
 */
export async function launchFirefoxWithExtension(): Promise<FirefoxDriver> {
    const options = new Options();
    options.addArguments('-remote-allow-system-access');

    if (process.env['CI']) {
        options.addArguments('--headless');
    }

    const driver = (await new Builder()
        .forBrowser('firefox')
        .setFirefoxOptions(options)
        .build()) as FirefoxDriver;

    await driver.installAddon(EXTENSION_DIR, true);

    // Give the background script time to run its startup sequence
    await driver.sleep(1500);

    return driver;
}

/**
 * Reads the extension's internal moz-extension:// UUID from Firefox preferences.
 * Firefox assigns a random UUID per temporary add-on install; this is the only
 * reliable way to construct extension page URLs in tests.
 */
export async function getExtensionBaseUrl(driver: FirefoxDriver): Promise<string> {
    await driver.setContext(Context.CHROME);
    const uuidsJson = await driver.executeScript<string>(
        `return Services.prefs.getStringPref('extensions.webextensions.uuids', '{}')`
    );
    await driver.setContext(Context.CONTENT);

    const uuids = JSON.parse(uuidsJson) as Record<string, string>;
    const uuid = uuids[EXTENSION_GECKO_ID];

    if (!uuid) {
        throw new Error(
            `UUID not found for extension "${EXTENSION_GECKO_ID}". ` +
            `Available IDs: ${Object.keys(uuids).join(', ')}`
        );
    }

    return `moz-extension://${uuid}`;
}

export interface WindowRule {
    name: string;
    matchUrls: string[];
    sticky?: boolean;
}

/**
 * Seeds a "paused" config that adds 'localhost' to ignoredUrls so the extension
 * silently skips all test tabs during window/tab setup in beforeEach.
 *
 * This prevents the extension from routing test tabs into unexpected windows
 * before the real test config is applied via seedConfig().
 */
export async function pauseExtension(
    driver: FirefoxDriver,
    extensionBaseUrl: string,
): Promise<void> {
    await driver.get(`${extensionBaseUrl}/src/options.html`);
    await driver.executeScript(
        `return browser.storage.local.set({ defenestrator_config: arguments[0] })`,
        {
            version: '1.0',
            defaultWindowName: '[OTHER]',
            ignoredUrls: ['about:', 'moz-extension:', 'localhost'],
            specifications: [
                { name: '[OTHER]', matchUrls: [], sticky: false },
            ],
        }
    );
    // Give the background script time to clear and re-initialise
    await driver.sleep(1000);
}

/**
 * Seeds the extension configuration by writing directly to browser.storage.local
 * from within the options page context (which shares the extension's origin).
 *
 * The background script already listens on storage.onChanged for the config key
 * and will automatically clear and re-initialise the named-windows state, so
 * there is no need to restart the extension or manipulate session storage manually.
 */
export async function seedConfig(
    driver: FirefoxDriver,
    extensionBaseUrl: string,
    rules: WindowRule[],
    defaultWindowName = '[OTHER]'
): Promise<void> {
    await driver.get(`${extensionBaseUrl}/src/options.html`);

    await driver.executeScript(
        `return browser.storage.local.set({ defenestrator_config: arguments[0] })`,
        {
            version: '1.0',
            defaultWindowName,
            ignoredUrls: ['about:', 'moz-extension:'],
            specifications: [
                ...rules.map(r => ({
                    name: r.name,
                    matchUrls: r.matchUrls,
                    sticky: r.sticky ?? false,
                })),
                // The deserializer identifies the default spec by name === defaultWindowName.
                // It must be last; createPrioritizedNamedWindowSpecifications enforces this.
                { name: defaultWindowName, matchUrls: [], sticky: false },
            ],
        }
    );

    // Wait for the background script's storage.onChanged handler to fire and
    // for RestoreNamedWindowsService to finish re-initialising
    await driver.sleep(1500);
}


