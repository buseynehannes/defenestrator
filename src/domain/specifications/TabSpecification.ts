/**
 * TabSpecification domain model
 * Represents a specification that tabs can satisfy based on URL pattern matching
 */

import type { Tab } from "../Tab";

export interface TabSpecification {
    readonly urlPattern: string;

    /**
     * Check if a tab satisfies this specification
     * A tab satisfies the specification if its URL partially matches the pattern
     */
    isSatisfiedBy(tab: Tab): boolean;
}

export function createTabSpecification(urlPattern: string): TabSpecification {
    return {
        urlPattern,
        isSatisfiedBy(tab: Tab): boolean {
            return tab.url.includes(urlPattern);
        }
    };
}

