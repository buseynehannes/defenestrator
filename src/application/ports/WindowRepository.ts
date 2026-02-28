import type { WindowId } from "../../domain/WindowName";
import type { Window } from "../../domain/Window";

export interface BrowserWindow {
    readonly id: WindowId;
}

/**
 * Port for managing the actual Firefox windows
 * Handles window-level operations (create, focus, close, apply visual properties)
 */
export interface WindowRepository {
    /**
     * Get all browser windows
     */
    getAllWindows(): Promise<Window[]>;

//     /**
//      * Create a new window with a specific tab
//      * @returns The ID of the newly created window
//      */
//     createWindowWithTab(tabId: TabId): Promise<WindowId>;
//
//     /**
//      * Focus/activate a window
//      */
//     focusWindow(windowId: WindowId): Promise<void>;
//
//     /**
//      * Close a window
//      */
//     closeWindow(windowId: WindowId): Promise<void>;
//
//     /**
//      * Apply visual properties (title and theme) to a window based on its definition
//      */
//     applyWindowDefinition(windowId: WindowId, window: Window): Promise<void>;
// }
//
// /**
//  * Port for managing the mapping between Firefox windows and their definitions
//  * Handles persistent storage of which window has which tag/definition
//  */
// export interface WindowDefinitionRepository {
//     /**
//      * Get the window definition for a given window ID
//      * Returns the ClassifiedWindow domain object with its TaggedWindowDefinition
//      * @param windowId The ID of the window
//      * @param windowSet Used to look up the definition by tag
//      * @returns The ClassifiedWindow with its definition, or null if window has no definition stored
//      */
//     getWindowDefinition(windowId: WindowId, windowSet: any): Promise<Window | null>;
//
//     /**
//      * Store the definition for a window (establish the 1:1 mapping)
//      */
//     setWindowDefinition(windowId: WindowId, window: Window): Promise<void>;
//
//     /**
//      * Remove definition data for a window (cleanup)
//      */
//     removeWindowDefinition(windowId: WindowId): Promise<void>;
}





