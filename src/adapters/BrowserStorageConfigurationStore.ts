import type { ConfigurationStore, ConfigurationData } from "../domain/ConfigurationStore.js";
import { DEFAULT_CONFIGURATION_DATA } from "../domain/ConfigurationStore.js";

declare const browser: typeof import("webextension-polyfill");

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
