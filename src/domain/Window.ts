/**
 * Window domain model
 * Represents a browser window with its identity and contained tabs
 */

import type { Tab } from "./Tab.js";
import type { WindowId } from "./WindowName.js";

export interface Window {
    readonly id: WindowId;
    readonly tabs: readonly Tab[];
}

export function createWindow(id: WindowId, tabs: readonly Tab[]): Window {
    return {
        id,
        tabs
    };
}


