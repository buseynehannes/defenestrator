import type { WindowId } from "../../../domain/WindowName";
import type { Window } from "../../../domain/windows/Window";
import type { Tab } from "../../../domain/windows/Tab";
import type { Theme } from "../../../domain/specifications/NamedWindowSpecification";

export interface BrowserWindow {
    readonly id: WindowId;
}

/**
 * WindowRepository output port
 * Handles interactions with the actual Firefox windows
 * Manages window-level operations (fetch, create, focus, close, apply visual properties)
 */
export interface WindowRepository {
    /**
     * Get all browser windows
     */
    getAllWindows(): Promise<Window[]>;

    /**
     * Get a specific window by its Firefox ID
     */
    getWindow(firefoxWindowId: number): Promise<Window>;

    /**
     * Get a window by its domain WindowId
     */
    getWindowByDomainId(windowId: WindowId): Promise<Window | null>;

    /**
     * Open a new browser window containing the given tab, registered under the given WindowId
     */
    openWindow(windowId: WindowId, tab: Tab): Promise<void>;

    /**
     * Apply a theme (toolbar colors) to a window
     */
    setTheme(windowId: WindowId, theme: Theme): Promise<void>;

    /**
     * Set the title prefix shown in the window title bar
     */
    setTitlePrefix(windowId: WindowId, prefix: string): Promise<void>;

    /**
     * Move a tab to a different window
     */
    moveTab(tab: Tab, toWindowId: WindowId): Promise<void>;

    /**
     * Close a browser window
     */
    closeWindow(windowId: WindowId): Promise<void>;
}

