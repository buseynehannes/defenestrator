/**
 * GlobalIgnoredUrls domain model
 * Represents a set of URL patterns that are globally ignored across all named windows.
 * Tabs matching any of these patterns will not be moved or reassigned.
 */

import type {Tab} from "../Tab";

export interface GlobalIgnoredUrls {
    readonly urlPatterns: readonly string[];

    /**
     * Returns true if the tab's URL matches any of the globally ignored patterns.
     */
    isIgnored(tab: Tab): boolean;
}

/**
 * Factory method to create a GlobalIgnoredUrls instance.
 * @param urlPatterns List of partial URL strings to ignore globally
 */
export function createGlobalIgnoredUrls(urlPatterns: readonly string[]): GlobalIgnoredUrls {
    return {
        urlPatterns,
        isIgnored(tab: Tab): boolean {
            return urlPatterns.some(pattern => tab.url.includes(pattern));
        }
    };
}

