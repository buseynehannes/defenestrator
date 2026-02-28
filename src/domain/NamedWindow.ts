/**
 * NamedWindow domain model
 * Represents a Window that has been classified with a NamedWindowSpecification
 */

import type {Window} from "./Window";
import type {NamedWindowSpecification} from "./specifications/NamedWindowSpecification";
import type {Tab} from "./Tab";

export interface NamedWindow {
    readonly window: Window;
    readonly specification: NamedWindowSpecification;

    /**
     * Check if a tab should be kept in this named window based on the specification's criteria
     */
    shouldKeep(tab: Tab): boolean;

    /**
     * Check if a tab is accepted by this named window's specification
     */
    accepts(tab: Tab): boolean;
}

export function createNamedWindow(
    window: Window,
    specification: NamedWindowSpecification
): NamedWindow {
    return {
        window,
        specification,

        shouldKeep(tab: Tab): boolean {
            return specification.shouldKeepTab(tab);
        },

        accepts(tab: Tab): boolean {
            return specification.shouldAcceptTab(tab);
        }
    };
}

