/**
 * NamedWindows aggregate root
 * Maps NamedWindowSpecifications to their Windows
 * Each specification maps to at most one window (or null if no window exists yet)
 *
 * This aggregate encapsulates the logic for managing windows across specifications
 * and handles tab movement between windows.
 */

import type { Window } from "./Window";
import type { Tab } from "./Tab";
import type { WindowId } from "./WindowName";
import type { NamedWindowSpecification } from "./specifications/NamedWindowSpecification";
import type { PrioritizedNamedWindowSpecifications } from "./specifications/PrioritizedNamedWindowSpecifications";
import { createWindow } from "./Window";

export interface NamedWindows {
    /**
     * Update a tab's window assignment
     * Checks if the tab should stay in its current window, or moves it to the first spec that accepts it
     * Returns a new NamedWindows aggregate with the tab updated
     *
     * @param tab The tab to update
     * @param currentWindowId The window ID where the tab currently is
     * @throws Error if no specification accepts the tab
     */
    updateTab(tab: Tab, currentWindowId: WindowId): NamedWindows;

    /**
     * Move a tab from one window to another
     * Removes the tab from the source window and adds it to the target window
     * Returns a new NamedWindows aggregate with the tab moved
     *
     * @param tab The tab to move
     * @param fromSpec The specification of the window to remove the tab from
     * @param toSpec The specification of the window to add the tab to
     * @throws Error if the source window doesn't exist or doesn't contain the tab
     */
    moveTab(tab: Tab, fromSpec: NamedWindowSpecification, toSpec: NamedWindowSpecification): NamedWindows;
}

export function createNamedWindows(
    prioritizedSpecs: PrioritizedNamedWindowSpecifications,
    windows: ReadonlyMap<NamedWindowSpecification, Window | null> = new Map()
): NamedWindows {
    // Ensure all specifications are in the map
    const windowMap = new Map(windows);
    for (const spec of prioritizedSpecs.specifications) {
        if (!windowMap.has(spec)) {
            windowMap.set(spec, null);
        }
    }

    const specs = Array.from(prioritizedSpecs.specifications);

    function removeTabFromWindow(tab: Tab, spec: NamedWindowSpecification, updatedMap: Map<NamedWindowSpecification, Window | null>): void {
        const currentWindow = updatedMap.get(spec)!;
        const updatedTabs = currentWindow.tabs.filter(t => t.id !== tab.id);

        if (updatedTabs.length === 0) {
            updatedMap.set(spec, null);
        } else {
            updatedMap.set(spec, createWindow(currentWindow.id, updatedTabs));
        }
    }

    function findSpecificationForTab(tab: Tab): NamedWindowSpecification | null {
        for (const spec of specs) {
            if (spec.shouldAcceptTab(tab)) {
                return spec;
            }
        }
        return null;
    }

    function getSpecificationForWindowId(windowId: WindowId): NamedWindowSpecification | null {
        for (const spec of specs) {
            const window = windowMap.get(spec)!;
            if (window && window.id === windowId) {
                return spec;
            }
        }
        return null;
    }

    return {
        updateTab(tab: Tab, currentWindowId: WindowId): NamedWindows {
            // Find the specification for the current window
            const currentSpec = getSpecificationForWindowId(currentWindowId);

            // Check if the tab should stay in the current window
            if (currentSpec) {
                const currentWindow = windowMap.get(currentSpec)!;
                if (currentWindow && currentSpec.shouldKeepTab(tab)) {
                    // Update the tab in the current window
                    const updatedWindow = currentWindow.updateTab(tab);
                    const newMap = new Map(windowMap);
                    newMap.set(currentSpec, updatedWindow);
                    return createNamedWindows(prioritizedSpecs, newMap);
                }
            }

            // Find which specification should accept this tab
            const targetSpec = findSpecificationForTab(tab);

            if (!targetSpec) {
                throw new Error(`No specification accepts tab ${tab.id}`);
            }

            // If moving to a different specification, remove from current first
            let updatedMap = new Map(windowMap);
            if (currentSpec && currentSpec !== targetSpec) {
                removeTabFromWindow(tab, currentSpec, updatedMap);
            }

            // Add to target specification
            const targetWindow = updatedMap.get(targetSpec)!;
            if (targetWindow === null) {
                updatedMap.set(targetSpec, createWindow(tab.id as any, [tab]));
            } else {
                updatedMap.set(targetSpec, createWindow(targetWindow.id, [...targetWindow.tabs, tab]));
            }

            return createNamedWindows(prioritizedSpecs, updatedMap);
        },

        moveTab(tab: Tab, fromSpec: NamedWindowSpecification, toSpec: NamedWindowSpecification): NamedWindows {
            const sourceWindow = windowMap.get(fromSpec)!;
            const targetWindow = windowMap.get(toSpec)!;

            if (!sourceWindow) {
                throw new Error(`No window exists for source specification ${fromSpec.name}`);
            }

            if (!targetWindow) {
                throw new Error(`No window exists for target specification ${toSpec.name}`);
            }

            // Remove the tab from the source window
            const updatedSourceWindow = sourceWindow.removeTab(tab);

            // Add the tab to the target window
            const updatedTargetWindow = targetWindow.updateTab(tab);

            // Create a new map with both updated windows
            const newMap = new Map(windowMap);

            // If source window has no tabs left, set it to null
            if (updatedSourceWindow.tabs.length === 0) {
                newMap.set(fromSpec, null);
            } else {
                newMap.set(fromSpec, updatedSourceWindow);
            }

            newMap.set(toSpec, updatedTargetWindow);

            return createNamedWindows(prioritizedSpecs, newMap);
        }
    };
}

/**
 * Factory method to create a NamedWindows aggregate by classifying windows against specifications
 * Each specification is matched to at most one window in priority order
 *
 * @param prioritizedSpecs The prioritized set of window specifications
 * @param windows The windows to classify
 * @returns A NamedWindows aggregate with windows assigned to their matching specifications
 */
export function nameWindows(
    prioritizedSpecs: PrioritizedNamedWindowSpecifications,
    windows: readonly Window[]
): NamedWindows {
    const windowMap = new Map<NamedWindowSpecification, Window | null>();
    const unclassifiedWindows = new Set(windows);

    for (const spec of prioritizedSpecs.specifications) {
        // Find the first unclassified window that satisfies this specification
        let assignedWindow: Window | null = null;

        for (const window of unclassifiedWindows) {
            if (spec.isSatisfiedByWindow(window)) {
                assignedWindow = window;
                unclassifiedWindows.delete(window);
                break;
            }
        }

        windowMap.set(spec, assignedWindow);
    }

    return createNamedWindows(prioritizedSpecs, windowMap);
}