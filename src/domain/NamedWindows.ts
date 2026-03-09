/**
 * NamedWindows aggregate root
 * Maps WindowIds (UUIDs) to their WindowName (specification name)
 * Each specification maps to at most one WindowId (the stable identifier for that named window)
 *
 * This aggregate encapsulates the logic for managing window-to-specification assignments
 * and handles tab movement between windows.
 * Tracks domain events internally for later processing.
 */

import type {Window} from "./windows/Window";
import type {Tab} from "./windows/Tab";
import type {WindowId, WindowName} from "./WindowName";
import {generateWindowId} from "./WindowName";
import type {NamedWindowSpecification} from "./specifications/NamedWindowSpecification";
import type {PrioritizedNamedWindowSpecifications} from "./specifications/PrioritizedNamedWindowSpecifications";
import type {TabMovedEvent} from "./events/TabMovedEvent";
import {createTabMovedEvent} from "./events/TabMovedEvent";
import type {NewWindowCreatedEvent} from "./events/NewWindowCreatedEvent";
import {createNewWindowCreatedEvent} from "./events/NewWindowCreatedEvent";
import type {WindowSpecAssignedEvent} from "./events/WindowSpecAssignedEvent";
import {createWindowSpecAssignedEvent} from "./events/WindowSpecAssignedEvent";

type DomainEvent = TabMovedEvent | NewWindowCreatedEvent | WindowSpecAssignedEvent;

export interface NamedWindows {
    /**
     * Get all specifications in this aggregate
     */
    getSpecifications(): readonly NamedWindowSpecification[];

    /**
     * Get the WindowId for a given specification
     * Returns null if no window is assigned to this specification
     */
    getWindowId(spec: NamedWindowSpecification): WindowId | null;

    /**
     * Check if a specification has an assigned window
     */
    hasWindow(spec: NamedWindowSpecification): boolean;

    /**
     * Get all domain events that have been raised in this aggregate
     * Events are cleared when getAndClearEvents is called
     */
    getEvents(): readonly DomainEvent[];

    /**
     * Get all domain events and clear the event list
     * Call this before persisting the aggregate to ensure events are handled
     */
    getAndClearEvents(): DomainEvent[];

    /**
     * Update a tab's window assignment
     * Note: This method updates the mapping but doesn't access the actual Window object
     * Window mutations are handled by the caller using the WindowRepository
     *
     * @param tab The tab to update
     * @param currentWindowId The WindowId of the window where the tab currently is
     * @param options.checkGlobalIgnoredUrls Whether to skip tabs matched by globalIgnoredUrls (default: true)
     * @throws Error if no specification accepts the tab
     */
    updateTab(tab: Tab, currentWindowId: WindowId, options?: { checkGlobalIgnoredUrls?: boolean }): NamedWindows;

    /**
     * Move a tab from one window to another
     * Emits a TabMovedEvent that can be retrieved with getEvents()
     * If the target specification doesn't have a window, creates one and emits NewWindowCreatedEvent
     *
     * @param tab The tab to move
     * @param fromWindowId The WindowId of the source window
     * @param targetSpec The target specification to move the tab to
     * @returns The updated aggregate with the event(s) tracked internally
     */
    moveTab(tab: Tab, fromWindowId: WindowId, targetSpec: NamedWindowSpecification): NamedWindows;

    /**
     * Clear the window assignment for the given WindowId (e.g. when the browser window is closed).
     * If the windowId is not tracked, returns this unchanged.
     *
     * @param windowId The WindowId of the closed window
     * @returns The updated aggregate with the assignment cleared
     */
    clearWindow(windowId: WindowId): NamedWindows;
}

export function createNamedWindows(
    prioritizedSpecs: PrioritizedNamedWindowSpecifications,
    windowIdMap: ReadonlyMap<WindowId, WindowName> = new Map(),
    emitAssignedEvents: boolean = false,
    additionalEvents: DomainEvent[] = []
): NamedWindows {
    const specs = Array.from(prioritizedSpecs.specifications);

    // Generate WindowSpecAssignedEvents for each assigned window only when requested
    const pendingEvents: DomainEvent[] = [];
    if (emitAssignedEvents) {
        for (const [windowId, windowName] of windowIdMap) {
            const spec = prioritizedSpecs.getSpecificationByName(windowName);
            if (spec) {
                pendingEvents.push(createWindowSpecAssignedEvent(windowId, spec));
            }
        }
    }
    pendingEvents.push(...additionalEvents);

    function getWindowIdForSpec(spec: NamedWindowSpecification): WindowId | null {
        for (const [wId, wName] of windowIdMap) {
            if (wName === spec.name) return wId;
        }
        return null;
    }

    function getSpecForWindowId(windowId: WindowId): NamedWindowSpecification | null {
        const name = windowIdMap.get(windowId);
        if (!name) return null;
        return prioritizedSpecs.getSpecificationByName(name);
    }

    function findSpecificationForTab(tab: Tab): NamedWindowSpecification | null {
        for (const spec of specs) {
            if (spec.shouldAcceptTab(tab)) return spec;
        }
        return null;
    }

    return {
        getSpecifications(): readonly NamedWindowSpecification[] {
            return specs;
        },

        getWindowId(spec: NamedWindowSpecification): WindowId | null {
            return getWindowIdForSpec(spec);
        },

        hasWindow(spec: NamedWindowSpecification): boolean {
            return getWindowIdForSpec(spec) !== null;
        },

        getEvents(): readonly DomainEvent[] {
            return [...pendingEvents];
        },

        getAndClearEvents(): DomainEvent[] {
            const events = [...pendingEvents];
            pendingEvents.length = 0;
            return events;
        },

        updateTab(tab: Tab, currentWindowId: WindowId, options?: { checkGlobalIgnoredUrls?: boolean }): NamedWindows {
            if ((options?.checkGlobalIgnoredUrls ?? true) && prioritizedSpecs.globalIgnoredUrls.isIgnored(tab)) {
                return this;
            }

            const currentSpec = getSpecForWindowId(currentWindowId);

            if (currentSpec && currentSpec.shouldKeepTab(tab)) {
                return this;
            }

            const targetSpec = findSpecificationForTab(tab);
            if (!targetSpec) {
                throw new Error(`No specification accepts tab ${tab.id}`);
            }

            if (currentSpec !== targetSpec) {
                return this.moveTab(tab, currentWindowId, targetSpec);
            }

            // Assign the current window to the target spec
            const newMap = new Map(windowIdMap);
            newMap.set(currentWindowId, targetSpec.name);
            return createNamedWindows(prioritizedSpecs, newMap);
        },

        moveTab(tab: Tab, fromWindowId: WindowId, targetSpec: NamedWindowSpecification): NamedWindows {
            let targetWindowId = getWindowIdForSpec(targetSpec);
            const isNewWindow = !targetWindowId;

            if (!targetWindowId) {
                targetWindowId = generateWindowId();
            }

            const newMap = new Map(windowIdMap);
            newMap.set(targetWindowId, targetSpec.name);

            const additionalEvents: DomainEvent[] = isNewWindow
                ? [createNewWindowCreatedEvent(targetWindowId, tab, targetSpec)]
                : [createTabMovedEvent(tab, fromWindowId, targetWindowId)];

            return createNamedWindows(prioritizedSpecs, newMap, false, additionalEvents);
        },

        clearWindow(windowId: WindowId): NamedWindows {
            if (!windowIdMap.has(windowId)) {
                return this;
            }
            const newMap = new Map(windowIdMap);
            newMap.delete(windowId);
            return createNamedWindows(prioritizedSpecs, newMap);
        }
    };
}

/**
 * Factory method to create a NamedWindows aggregate by classifying windows against specifications
 * Each specification is matched to at most one window in priority order
 * Assigns a WindowId (UUID) early to enable domain events
 * Processes all tabs from unclassified windows to ensure they are assigned to specifications
 *
 * @param prioritizedSpecs The prioritized set of window specifications
 * @param windows The windows to classify
 * @returns A NamedWindows aggregate with windows assigned to their matching specifications
 */
export function nameWindows(
    prioritizedSpecs: PrioritizedNamedWindowSpecifications,
    windows: readonly Window[]
): NamedWindows {
    const windowIdMap = new Map<WindowId, WindowName>();
    const unclassifiedWindows = new Set(windows);

    // Classify windows by specifications
    for (const spec of prioritizedSpecs.specifications) {
        for (const window of unclassifiedWindows) {
            if (spec.isSatisfiedByWindow(window)) {
                windowIdMap.set(window.id, spec.name);
                unclassifiedWindows.delete(window);
                break;
            }
        }
    }

    // Create the initial aggregate with classified windows, emitting WindowSpecAssignedEvents
    let namedWindows = createNamedWindows(prioritizedSpecs, windowIdMap, true);

    // Process all tabs from unclassified windows
    for (const window of unclassifiedWindows) {
        for (const tab of window.tabs) {
            namedWindows = namedWindows.updateTab(tab, window.id, {checkGlobalIgnoredUrls: false});
        }
    }

    return namedWindows;
}