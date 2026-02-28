/**
 * PrioritizedNamedWindowSpecifications domain model
 * Represents a prioritized ordered set of named window specifications
 * Earlier specifications have higher priority
 *
 * The last specification is always a default that matches any window or tab
 */

import {createDefaultNamedWindowSpecification} from "./DefaultNamedWindowSpecification";
import type {NamedWindowSpecification} from "./NamedWindowSpecification";
import type {WindowName} from "../WindowName";
import type {Window} from "../Window";
import type {Tab} from "../Tab";
import {createNamedWindow} from "../NamedWindow";
import { Option, some, none } from "fp-ts/Option";

export interface PrioritizedNamedWindowSpecifications {
    readonly specifications: readonly NamedWindowSpecification[];
}

export interface ClassificationResult {
    readonly namedWindows: readonly ReturnType<typeof createNamedWindow>[];
    readonly unclassifiedWindows: readonly Window[];
}

/**
 * Create a default specification that matches any window or tab
 * Used as the fallback specification when no other specifications match
 */
function createDefaultSpecification(defaultName: WindowName): NamedWindowSpecification {
    return createDefaultNamedWindowSpecification(defaultName);
}

export function createPrioritizedNamedWindowSpecifications(
    specifications: readonly NamedWindowSpecification[],
    defaultName: WindowName,
): PrioritizedNamedWindowSpecifications {
    // ...existing code...
    const specsWithoutDefault = specifications.length > 0
        ? specifications
        : [];

    const defaultSpec = createDefaultSpecification(defaultName);

    return {
        specifications: [...specsWithoutDefault, defaultSpec]
    };
}

/**
 * Classify windows by matching them against specifications
 * Each specification is matched to at most one window in priority order
 * The default specification (last) always matches remaining windows
 *
 * @param specSet The prioritized set of window specifications
 * @param windows The windows to classify
 * @returns Named windows (matched to specifications) and unclassified windows
 */
export function nameWindows(
    specSet: PrioritizedNamedWindowSpecifications,
    windows: readonly Window[]
): ClassificationResult {
    const namedWindows: ReturnType<typeof createNamedWindow>[] = [];
    const unclassifiedWindows = new Set(windows);

    for (const spec of specSet.specifications) {
        // Find the first unclassified window that satisfies this specification
        for (const window of unclassifiedWindows) {
            if (spec.isSatisfiedByWindow(window)) {
                namedWindows.push(createNamedWindow(window, spec));
                unclassifiedWindows.delete(window);
                break;
            }
        }
    }

    return {
        namedWindows,
        unclassifiedWindows: Array.from(unclassifiedWindows)
    };
}

/**
 * Find the first specification that accepts a tab in priority order
 * Returns the highest priority specification that accepts the tab
 *
 * @param specSet The prioritized set of window specifications
 * @param tab The tab to check
 * @returns Some(specification) if a specification accepts the tab, None otherwise
 */
export function findSpecificationForTab(
    specSet: PrioritizedNamedWindowSpecifications,
    tab: Tab
): Option<NamedWindowSpecification> {
    for (const spec of specSet.specifications) {
        if (spec.shouldAcceptTab(tab)) {
            return some(spec);
        }
    }
    return none;
}

