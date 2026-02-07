import type { WindowId, WindowTag } from "../domain/WindowTag.js";
import type { TabId } from "../domain/Tab.js";
import type { Theme } from "../domain/TaggingRule.js";

export interface BrowserWindow {
    readonly id: WindowId;
}

export interface WindowRepository {
    /**
     * Get all browser windows
     */
    getAllWindows(): Promise<BrowserWindow[]>;

    /**
     * Set a tag for a window (both visually and in storage)
     * @param windowId The ID of the window to tag
     * @param tag The tag to apply to the window
     * @param theme Optional theme to apply to the window
     */
    setWindowTag(windowId: WindowId, tag: WindowTag, theme?: Theme): Promise<void>;

    /**
     * Get the tag associated with a window from storage
     */
    getWindowTag(windowId: WindowId): Promise<WindowTag | null>;

    /**
     * Create a new window with a specific tab
     * @returns The ID of the newly created window
     */
    createWindowWithTab(tabId: TabId): Promise<WindowId>;

    /**
     * Focus/activate a window
     */
    focusWindow(windowId: WindowId): Promise<void>;

    /**
     * Close a window
     */
    closeWindow(windowId: WindowId): Promise<void>;

    /**
     * Remove tag data for a window (cleanup)
     */
    removeWindowTag(windowId: WindowId): Promise<void>;
}
