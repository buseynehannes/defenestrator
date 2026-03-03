import type {WindowRepository} from "../application/ports/out/WindowRepository.js";
import type {Tab, TabId} from "../domain/Tab.js";
import { createTab } from "../domain/Tab.js";
import type {Logger} from "../application/ports/Logger.js";
import type {WindowId} from "../domain/WindowName";
import { generateWindowId } from "../domain/WindowName";
import type { Window } from "../domain/Window.js";
import { createWindow } from "../domain/Window.js";
import type { Theme } from "../domain/specifications/NamedWindowSpecification.js";

declare const browser: typeof import("webextension-polyfill");

/**
 * Firefox adapter for WindowRepository
 * Handles actual Firefox window operations (create, focus, close, visual properties)
 * Maps Firefox numeric window IDs to domain UUIDs internally
 */
export class FirefoxWindowRepository implements WindowRepository {
    // Cache mapping Firefox numeric IDs to our UUID-based WindowIds
    private windowIdMap = new Map<number, WindowId>();

    constructor(private readonly logger: Logger) {}

    private getFirefoxId(windowId: WindowId): number | undefined {
        for (const [firefoxId, wId] of this.windowIdMap) {
            if (wId === windowId) return firefoxId;
        }
        return undefined;
    }

    async getAllWindows(): Promise<Window[]> {
        const windows = await browser.windows.getAll({});
        return Promise.all(
            windows.map(window => this.getWindow(window.id as number))
        );
    }

    async getWindow(firefoxWindowId: number): Promise<Window> {
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

    async getWindowByDomainId(windowId: WindowId): Promise<Window | null> {
        const firefoxId = this.getFirefoxId(windowId);
        if (firefoxId === undefined) return null;
        return this.getWindow(firefoxId);
    }

    async openWindow(windowId: WindowId, tab: Tab): Promise<void> {
        this.logger.log(`[WINDOW] Opening new window for domain ID ${windowId}, moving tab ${tab.id} into it`);
        const newWindow = await browser.windows.create({});
        const firefoxId = newWindow.id as number;
        this.windowIdMap.set(firefoxId, windowId);
        await browser.tabs.move(tab.id, { windowId: firefoxId, index: -1 });
        // Close the blank tab Firefox opens automatically
        const blankTabs = newWindow.tabs?.filter(t => t.url === 'about:blank') ?? [];
        for (const blankTab of blankTabs) {
            await browser.tabs.remove(blankTab.id as number);
        }
    }

    async setTheme(windowId: WindowId, theme: Theme): Promise<void> {
        const firefoxId = this.getFirefoxId(windowId);
        if (firefoxId === undefined) {
            this.logger.error(`[WINDOW] Cannot set theme: unknown windowId ${windowId}`);
            return;
        }
        this.logger.log(`[WINDOW] Setting theme for window ${windowId} (Firefox ID: ${firefoxId})`);
        const colors: Record<string, string> = {};
        if (theme.accentColor)      colors['toolbar']            = theme.accentColor;
        if (theme.textColor)        colors['toolbar_text']       = theme.textColor;
        if (theme.frameColor)       colors['frame']              = theme.frameColor;
        if (theme.tabBackgroundText) colors['tab_background_text'] = theme.tabBackgroundText;
        await browser.theme.update(firefoxId, { colors });
    }

    async setTitlePrefix(windowId: WindowId, prefix: string): Promise<void> {
        const firefoxId = this.getFirefoxId(windowId);
        if (firefoxId === undefined) {
            this.logger.error(`[WINDOW] Cannot set title prefix: unknown windowId ${windowId}`);
            return;
        }
        this.logger.log(`[WINDOW] Setting title prefix "${prefix}" for window ${windowId} (Firefox ID: ${firefoxId})`);
        await browser.windows.update(firefoxId, { titlePreface: prefix });
    }

    async moveTab(tab: Tab, toWindowId: WindowId): Promise<void> {
        const firefoxId = this.getFirefoxId(toWindowId);
        if (firefoxId === undefined) {
            this.logger.error(`[WINDOW] Cannot move tab: unknown windowId ${toWindowId}`);
            return;
        }
        this.logger.log(`[TAB] Moving tab ${tab.id} to window ${toWindowId} (Firefox ID: ${firefoxId})`);
        await browser.tabs.move(tab.id, { windowId: firefoxId, index: -1 });
    }

    async closeWindow(windowId: WindowId): Promise<void> {
        const firefoxId = this.getFirefoxId(windowId);
        if (firefoxId === undefined) {
            this.logger.error(`[WINDOW] Cannot close window: unknown windowId ${windowId}`);
            return;
        }
        this.logger.log(`[WINDOW] Closing window ${windowId} (Firefox ID: ${firefoxId})`);
        await browser.windows.remove(firefoxId);
    }

    async focusWindow(windowId: WindowId): Promise<void> {
        const firefoxId = this.getFirefoxId(windowId);
        if (firefoxId === undefined) {
            this.logger.error(`[WINDOW] Cannot focus window: unknown windowId ${windowId}`);
            return;
        }
        this.logger.log(`[WINDOW] Focusing window ${windowId} (Firefox ID: ${firefoxId})`);
        await browser.windows.update(firefoxId, { focused: true });
    }

    /**
     * Resolve a Firefox numeric window ID to its cached domain WindowId.
     * Returns null if the window was never seen (not yet tracked).
     */
    resolveWindowId(firefoxWindowId: number): WindowId | null {
        return this.windowIdMap.get(firefoxWindowId) ?? null;
    }

}



