import type { ConfigurationData, ConfigurationStore } from "../application/ports/ConfigurationStore";

declare const browser: typeof import("webextension-polyfill");

// Default configuration
const DEFAULT_CONFIGURATION_DATA: ConfigurationData = {
    windows: [
        {
            tag: '[WORK]',
            match: ['github.com', 'gitlab.com', 'jira', 'confluence'],
            theme: { accentColor: '#3498db', textColor: '#ffffff' }
        },
        {
            tag: '[RESEARCH]',
            match: ['wikipedia.org', 'stackoverflow.com', 'mdn.org'],
            theme: { accentColor: '#9b59b6', textColor: '#ffffff' }
        },
        {
            tag: '[DEFAULT]',
            match: [],
            theme: { accentColor: '#95a5a6', textColor: '#ffffff' }
        }
    ],
    defaultWindowTag: '[DEFAULT]',
    ignoredUrlPatterns: ['about:', 'moz-extension:']
};

const STORAGE_KEY = "defenestrator_config";


export class BrowserStorageConfigurationStore implements ConfigurationStore {
    async getConfiguration(): Promise<ConfigurationData> {
        try {
            const result = await browser.storage.local.get(STORAGE_KEY);
            if (result[STORAGE_KEY]) {
                return result[STORAGE_KEY] as ConfigurationData;
            }
            return DEFAULT_CONFIGURATION_DATA;
        } catch (error) {
            console.error('[ConfigStore] Error loading configuration:', error);
            return DEFAULT_CONFIGURATION_DATA;
        }
    }

    async saveConfiguration(config: ConfigurationData): Promise<void> {
        try {
            await browser.storage.local.set({ [STORAGE_KEY]: config });
        } catch (error) {
            console.error('[ConfigStore] Error saving configuration:', error);
            throw error;
        }
    }
}
