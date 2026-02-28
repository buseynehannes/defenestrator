/**
 * IgnoredTabSpecification domain model
 * A TabSpecification that matches tabs with URLs that should be ignored
 * If a tab's URL includes any of the ignored URL patterns, it matches this specification
 */

import type { Tab } from "../Tab";
import type { TabSpecification } from "./TabSpecification";

export interface IgnoredTabSpecification extends TabSpecification {
    /**
     * Check if a tab's URL should be ignored
     */
    isSatisfiedBy(tab: Tab): boolean;
}

/**
 * Create a tab specification that matches tabs with ignored URLs
 * @param ignoredUrlPatterns List of partial URL strings to ignore
 * @returns An IgnoredTabSpecification that matches tabs containing any of the ignored patterns
 */
export function createIgnoredTabSpecification(ignoredUrlPatterns: readonly string[]): IgnoredTabSpecification {
    return {
        isSatisfiedBy(tab: Tab): boolean {
            return ignoredUrlPatterns.some(pattern => tab.url.includes(pattern));
        }
    };
}

