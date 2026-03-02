import type {WindowRepository} from "../application/ports/out/WindowRepository.js";
import type {TabId} from "../domain/Tab.js";
import { createTab } from "../domain/Tab.js";
import type {Logger} from "../application/ports/Logger.js";
import type {WindowId} from "../domain/WindowName";
import { generateWindowId } from "../domain/WindowName";
import type { Window } from "../domain/Window.js";
import { createWindow } from "../domain/Window.js";

declare const browser: typeof import("webextension-polyfill");

/**
 * Firefox adapter for WindowRepository
 * Handles actual Firefox window operations (create, focus, close, visual properties)
 * Maps Firefox numeric window IDs to domain UUIDs internally
 */
export class FirefoxWindowRepository implements WindowRepository {
    // Cache mapping Firefox numeric IDs to our UUID-based WindowIds
    // This is kept in memory for the session - it will be regenerated on extension reload
    private windowIdMap = new Map<number, WindowId>();

    constructor(private readonly logger: Logger) {}

    async getAllWindows(): Promise<Window[]> {
        const windows = await browser.windows.getAll({});
        return Promise.all(
            windows.map(window => this.getWindow(window.id as number))
        );
    }

    async getWindow(firefoxWindowId: number): Promise<Window> {
        // Get or create a stable UUID for this Firefox window
        let windowId = this.windowIdMap.get(firefoxWindowId);
        if (!windowId) {
            windowId = generateWindowId();
            this.windowIdMap.set(firefoxWindowId, windowId);
        }

        this.logger.log(`[WINDOW] Fetching window ${windowId} (Firefox ID: ${firefoxWindowId}) with its tabs...`);
        const tabs = await browser.tabs.query({windowId: firefoxWindowId});
        const tabObjects = tabs.map(tab =>
            createTab(tab.id as TabId, tab.url ?? "")
        );
        return createWindow(windowId, tabObjects);
    }

}



