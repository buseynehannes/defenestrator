/**
 * Window domain model
 * Represents a browser window with its identity and contained tabs
 */

import type { Tab } from "./Tab.js";
import type { WindowId } from "./WindowName.js";

export interface Window {
    readonly id: WindowId;
    readonly tabs: readonly Tab[];

    /**
     * Update a tab in this window
     * If a tab with the same ID exists, updates its URL
     * Otherwise, adds the tab to the window
     * Returns a new Window with the tab added or updated
     */
    updateTab(tab: Tab): Window;

    /**
     * Remove a tab from this window if it exists
     * Returns a new Window without the tab
     * If the tab doesn't exist, returns the window unchanged
     */
    removeTab(tab: Tab): Window;
}

export function createWindow(id: WindowId, tabs: readonly Tab[]): Window {
    return {
        id,
        tabs,

        updateTab(tab: Tab): Window {
            // Check if a tab with this ID already exists
            const existingTabIndex = tabs.findIndex(t => t.id === tab.id);

            if (existingTabIndex !== -1) {
                // Update the existing tab's URL
                const updatedTabs = [...tabs];
                updatedTabs[existingTabIndex] = tab;
                return createWindow(id, updatedTabs);
            } else {
                // Add new tab
                return createWindow(id, [...tabs, tab]);
            }
        },

        removeTab(tab: Tab): Window {
            // Filter out the tab with the matching ID
            const updatedTabs = tabs.filter(t => t.id !== tab.id);

            // Return a new window with the updated tabs
            return createWindow(id, updatedTabs);
        }
    };
}


