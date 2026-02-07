import type { Tab, TabId } from "../domain/Tab.js";
import type { WindowId } from "../domain/WindowTag.js";

export interface TabRepository {
    /**
     * Get a specific tab by ID
     */
    getTab(tabId: TabId): Promise<Tab>;

    /**
     * Get all tabs in a specific window
     */
    getTabsInWindow(windowId: WindowId): Promise<Tab[]>;

    /**
     * Move a tab to a different window
     */
    moveTab(tabId: TabId, windowId: WindowId): Promise<void>;

    /**
     * Activate/focus a tab
     */
    activateTab(tabId: TabId): Promise<void>;
}
