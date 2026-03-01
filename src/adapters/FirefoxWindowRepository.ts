import type {WindowRepository} from "../application/ports/WindowRepository.js";
import type {TabId} from "../domain/Tab.js";
import { createTab } from "../domain/Tab.js";
import type {Logger} from "../application/ports/Logger.js";
import type {WindowId} from "../domain/WindowName";
import type { Window } from "../domain/Window.js";
import { createWindow } from "../domain/Window.js";

declare const browser: typeof import("webextension-polyfill");

/**
 * Firefox adapter for WindowRepository
 * Handles actual Firefox window operations (create, focus, close, visual properties)
 */
export class FirefoxWindowRepository implements WindowRepository {
    constructor(private readonly logger: Logger) {
    }

    async getAllWindows(): Promise<Window[]> {
        const windows = await browser.windows.getAll({});
        return Promise.all(
            windows.flatMap(window => this.getWindow(window.id as WindowId))
        );
    }

    async getWindow(windowId: WindowId): Promise<Window> {
        this.logger.log(`[WINDOW] Fetching window ${windowId} with its tabs...`);
        const tabs = await browser.tabs.query({windowId});
        const tabObjects = tabs.map(tab =>
            createTab(tab.id as TabId, tab.url ?? "")
        );
        return createWindow(windowId, tabObjects);
    }

}



