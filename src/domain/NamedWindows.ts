/**
 * NamedWindows aggregate root
 * Maps NamedWindowSpecifications to their WindowIds (UUIDs)
 * Each specification maps to at most one WindowId (the stable identifier for that named window)
 *
 * This aggregate encapsulates the logic for managing window-to-specification assignments
 * and handles tab movement between windows.
 * Tracks domain events internally for later processing.
 */

import type {Window} from "./Window";
import type {Tab} from "./Tab";
import type {WindowId} from "./WindowName";
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
    windowIds: ReadonlyMap<NamedWindowSpecification, WindowId | null> = new Map(),
    emitAssignedEvents: boolean = false
): NamedWindows {
    // Ensure all specifications are in the map
    const windowIdMap = new Map(windowIds);
    for (const spec of prioritizedSpecs.specifications) {
        if (!windowIdMap.has(spec)) {
            windowIdMap.set(spec, null);
        }
    }

    const specs = Array.from(prioritizedSpecs.specifications);

    console.log(`[NAMED_WINDOWS] createNamedWindows: ${specs.length} spec(s):`);
    for (const spec of specs) {
        const windowId = windowIdMap.get(spec);
        console.log(`[NAMED_WINDOWS]   "${spec.name}" => ${windowId ?? 'unassigned'}`);
    }

    // Generate WindowSpecAssignedEvent for each assigned window only when requested
    const pendingEvents: DomainEvent[] = [];
    if (emitAssignedEvents) {
        for (const spec of specs) {
            const windowId = windowIdMap.get(spec);
            if (windowId) {
                pendingEvents.push(createWindowSpecAssignedEvent(windowId, spec));
            }
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
            const wId = windowIdMap.get(spec);
            if (wId === windowId) {
                return spec;
            }
        }
        return null;
    }

    function moveWindowToSpecification(
        toSpec: NamedWindowSpecification,
        windowId: WindowId
    ): Map<NamedWindowSpecification, WindowId | null> {
        const newMap = new Map(windowIdMap);
        // Add to target specification
        if (!newMap.has(toSpec) || newMap.get(toSpec) === null) {
            newMap.set(toSpec, windowId);
        }

        return newMap;
    }

    return {
        getSpecifications(): readonly NamedWindowSpecification[] {
            return specs;
        },

        getWindowId(spec: NamedWindowSpecification): WindowId | null {
            return windowIdMap.get(spec) ?? null;
        },

        hasWindow(spec: NamedWindowSpecification): boolean {
            return windowIdMap.get(spec) !== null && windowIdMap.get(spec) !== undefined;
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
            console.log(`[NAMED_WINDOWS] updateTab: tab=${tab.id} url=${tab.url} windowId=${currentWindowId}`);

            // Ignore globally ignored tabs — leave them wherever they are
            if ((options?.checkGlobalIgnoredUrls ?? true) && prioritizedSpecs.globalIgnoredUrls.isIgnored(tab)) {
                console.log(`[NAMED_WINDOWS] updateTab: tab=${tab.id} is globally ignored, skipping`);
                return this;
            }

            // Find the specification for the current window
            const currentSpec = getSpecificationForWindowId(currentWindowId);
            console.log(`[NAMED_WINDOWS] updateTab: current spec="${currentSpec?.name ?? 'none'}"`);

            // Check if the tab should stay in the current window
            if (currentSpec && currentSpec.shouldKeepTab(tab)) {
                console.log(`[NAMED_WINDOWS] updateTab: tab=${tab.id} kept in "${currentSpec.name}"`);
                return this;
            }

            // Find which specification should accept this tab
            const targetSpec = findSpecificationForTab(tab);

            if (!targetSpec) {
                throw new Error(`No specification accepts tab ${tab.id}`);
            }

            if (currentSpec !== targetSpec) {
                console.log(`[NAMED_WINDOWS] updateTab: moving tab ${tab.id} from "${currentSpec?.name ?? 'none'}" to "${targetSpec.name}"`);
                return this.moveTab(tab, currentWindowId, targetSpec);
            }

            // Move the window to the target specification
            const newMap = moveWindowToSpecification(targetSpec, currentWindowId);

            return createNamedWindows(prioritizedSpecs, newMap);
        },

        moveTab(tab: Tab, fromWindowId: WindowId, targetSpec: NamedWindowSpecification): NamedWindows {
            const fromSpec = getSpecificationForWindowId(fromWindowId);
            console.log(`[NAMED_WINDOWS] moveTab: tab=${tab.id} url=${tab.url} from="${fromSpec?.name ?? 'none'}" to="${targetSpec.name}"`);

            // Check that the target specification has a WindowId assigned
            let targetWindowId = windowIdMap.get(targetSpec);

            if (!targetWindowId) {
                targetWindowId = generateWindowId();
            } else {
                console.log(`[NAMED_WINDOWS] moveTab: target window already exists for "${targetSpec.name}" (${targetWindowId})`);
            }

            // Update the mappings
            const newMap = moveWindowToSpecification(targetSpec, targetWindowId);

            // Create the new aggregate which will generate WindowSpecAssignedEvents automatically
            const updatedAggregate = createNamedWindows(prioritizedSpecs, newMap);

            // Now add the additional events that occurred during this operation
            // Get the auto-generated events and add our custom ones
            const generatedEvents = updatedAggregate.getEvents();
            const allEvents: DomainEvent[] = [...generatedEvents];

            if (!windowIdMap.get(targetSpec)) {
                // A new window was created
                allEvents.push(createNewWindowCreatedEvent(targetWindowId, tab, targetSpec));
            }
            else {
                // Move the tab if not in new window
                allEvents.push(createTabMovedEvent(tab, fromWindowId, targetWindowId));
            }
            // Create a new aggregate and manually set its events
            // We need to create a wrapper that preserves these events
            const result = createNamedWindows(prioritizedSpecs, newMap);

            // Override the events by creating a custom wrapper
            return {
                getSpecifications: () => result.getSpecifications(),
                getWindowId: (spec) => result.getWindowId(spec),
                hasWindow: (spec) => result.hasWindow(spec),
                getEvents: () => allEvents,
                getAndClearEvents: () => {
                    const events = allEvents.splice(0);
                    return events;
                },
                updateTab: (tab, windowId, options) => result.updateTab(tab, windowId, options),
                moveTab: (tab, fromWindowId, targetSpec) => result.moveTab(tab, fromWindowId, targetSpec),
                clearWindow: (windowId) => result.clearWindow(windowId),
            };
        },

        clearWindow(windowId: WindowId): NamedWindows {
            const spec = getSpecificationForWindowId(windowId);
            if (!spec) {
                return this;
            }
            const newMap = new Map(windowIdMap);
            newMap.set(spec, null);
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
    const windowIdMap = new Map<NamedWindowSpecification, WindowId | null>();
    const unclassifiedWindows = new Set(windows);

    // Classify windows by specifications
    for (const spec of prioritizedSpecs.specifications) {
        for (const window of unclassifiedWindows) {
            if (spec.isSatisfiedByWindow(window)) {
                windowIdMap.set(spec, window.id);
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