import type { TabRepository } from "../application/ports/TabRepository.js";
import type { Tab, TabId } from "../domain/Tab.js";
import type { WindowId } from "../domain/WindowName";

declare const browser: typeof import("webextension-polyfill");

export class FirefoxTabRepository implements TabRepository {
    async getTab(tabId: TabId): Promise<Tab> {
        const tab = await browser.tabs.get(tabId);
        return {
            id: tab.id as TabId,
            url: tab.url ?? "",
            windowId: tab.windowId as number
        };
    }

    async getTabsInWindow(windowId: WindowId): Promise<Tab[]> {
        const tabs = await browser.tabs.query({ windowId });
        return tabs.map(tab => ({
            id: tab.id as TabId,
            url: tab.url ?? "",
            windowId: tab.windowId as number
        }));
    }

    async moveTab(tabId: TabId, windowId: WindowId): Promise<void> {
        await browser.tabs.move(tabId, { windowId, index: -1 });
    }

    async activateTab(tabId: TabId): Promise<void> {
        await browser.tabs.update(tabId, { active: true });
    }
}
