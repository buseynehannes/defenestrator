import type { Url } from "./Tab.js";
import type { WindowTag } from "./WindowTag.js";
import { DEFAULT_TAG } from "./WindowTag.js";
import { isInternalUrl } from "./Tab.js";

export interface Theme {
    readonly accentColor?: string;      // Toolbar background color
    readonly textColor?: string;        // Toolbar text color
    readonly frameColor?: string;       // Window frame color
    readonly tabBackgroundText?: string; // Active tab text color
}

export interface TaggingRule {
    readonly tag: WindowTag;
    readonly match: readonly string[];
    readonly theme?: Theme;
    readonly sticky?: boolean;  // If true, tabs in windows with this tag won't be auto-moved
}

export class TaggingRuleSet {
    constructor(
        private readonly rules: readonly TaggingRule[],
        private readonly ignoredUrlPatterns: readonly string[] = ["about:", "moz-extension:"]
    ) {}

    determineTag(url: Url): WindowTag | null {
        if (!url || isInternalUrl(url, this.ignoredUrlPatterns)) {
            return null;
        }

        for (const rule of this.rules) {
            if (rule.match.some(keyword => url.includes(keyword))) {
                return rule.tag;
            }
        }

        return DEFAULT_TAG;
    }

    /**
     * Get the full rule (including theme) for a given URL
     */
    getRuleForUrl(url: Url): TaggingRule | null {
        if (!url || isInternalUrl(url, this.ignoredUrlPatterns)) {
            return null;
        }

        for (const rule of this.rules) {
            if (rule.match.some(keyword => url.includes(keyword))) {
                return rule;
            }
        }

        return { tag: DEFAULT_TAG, match: [] };
    }

    /**
     * Check if a tag is marked as sticky (prevents auto-moving tabs)
     */
    isTagSticky(tag: WindowTag): boolean {
        const rule = this.rules.find(r => r.tag === tag);
        return rule?.sticky === true;
    }
}
