import type { WindowDefinitionRepository } from "../application/ports/WindowRepository.js";
import type { WindowId, WindowName } from "../domain/WindowName";
import { Window } from "../domain/Window";
import type { Logger } from "../application/ports/Logger.js";
import type { IPrioritizedWindowConfiguration } from "../domain/IPrioritizedWindowConfiguration.js";

declare const browser: typeof import("webextension-polyfill");

const WINDOW_DEFINITIONS_STORAGE_KEY = 'defenestrator_window_definitions';

/**
 * Firefox adapter for WindowDefinitionRepository
 * Handles persistent storage of the 1:1 mapping between Firefox windows and their definitions
 */
export class FirefoxWindowDefinitionRepository implements WindowDefinitionRepository {
    constructor(private readonly logger: Logger) {}

    async getWindowDefinition(windowId: WindowId, windowSet: IPrioritizedWindowConfiguration): Promise<Window | null> {
        try {
            const storage = await browser.storage.local.get(WINDOW_DEFINITIONS_STORAGE_KEY);
            const definitions = (storage[WINDOW_DEFINITIONS_STORAGE_KEY] as Record<number, string>) || {};
            const tag = definitions[windowId] as WindowName | undefined;

            if (!tag) {
                return null;
            }

            const definition = windowSet.findWindowByTag(tag);
            if (!definition) {
                this.logger.log(`[DEF] Window ${windowId} has tag ${tag} but no corresponding definition found`);
                return null;
            }

            return new Window(windowId, definition);
        } catch (e) {
            this.logger.error(`[DEF] Error getting definition for window ${windowId}:`, e);
            return null;
        }
    }

    async setWindowDefinition(windowId: WindowId, window: Window): Promise<void> {
        try {
            const storage = await browser.storage.local.get(WINDOW_DEFINITIONS_STORAGE_KEY);
            const definitions = (storage[WINDOW_DEFINITIONS_STORAGE_KEY] as Record<number, string>) || {};

            definitions[windowId] = window.getTag();

            await browser.storage.local.set({ [WINDOW_DEFINITIONS_STORAGE_KEY]: definitions });
            this.logger.log(`[DEF] Set definition for window ${windowId}: ${window.getTag()}`);
        } catch (e) {
            this.logger.error(`[DEF] Error setting definition for window ${windowId}:`, e);
            throw e;
        }
    }

    async removeWindowDefinition(windowId: WindowId): Promise<void> {
        try {
            const storage = await browser.storage.local.get(WINDOW_DEFINITIONS_STORAGE_KEY);
            const definitions = (storage[WINDOW_DEFINITIONS_STORAGE_KEY] as Record<number, string>) || {};

            delete definitions[windowId];

            await browser.storage.local.set({ [WINDOW_DEFINITIONS_STORAGE_KEY]: definitions });
            this.logger.log(`[DEF] Removed definition for window ${windowId}`);
        } catch (e) {
            this.logger.error(`[DEF] Error removing definition for window ${windowId}:`, e);
        }
    }
}


