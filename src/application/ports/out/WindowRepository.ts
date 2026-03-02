import type { WindowId } from "../../../domain/WindowName";
import type { Window } from "../../../domain/Window";

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
}

