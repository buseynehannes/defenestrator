import type {WindowName} from "../WindowName";
import type {Tab} from "../Tab";
import type {Window} from "../Window";
import type {TabSpecification} from "./TabSpecification";
import type {IgnoredTabSpecification} from "./IgnoredTabSpecification";

export interface Theme {
    readonly accentColor?: string;      // Toolbar background color
    readonly textColor?: string;        // Toolbar text color
    readonly frameColor?: string;       // ClassifiedWindow frame color
    readonly tabBackgroundText?: string; // Active tab text color
}

export interface NamedWindowSpecification {
    readonly name: WindowName;
    readonly theme?: Theme;
    readonly sticky: boolean;

    /**
     * Check if a tab from outside should be accepted/moved into this window
     * Does not consider stickiness - only the tab specification matching
     */
    shouldAcceptTab(tab: Tab): boolean;

    /**
     * Check if a tab already in this window should be kept
     * Considers stickiness - if sticky, tab can stay even if it doesn't match specs
     */
    shouldKeepTab(tab: Tab): boolean;

    isSatisfiedByWindow(window: Window): boolean;
}

/**
 * Create a named window specification with tab specifications
 * @param name The name of the window specification
 * @param tabSpecifications At least one tab specification is required (non-empty array)
 * @param ignoredTabSpecification URLs to ignore (always match any TabSpecification) - required on creation
 * @param theme Optional visual theme properties
 * @param sticky Whether the specification is sticky (matches if any tab matches, not all)
 */
export function createNamedWindowSpecification(
    name: WindowName,
    tabSpecifications: readonly [TabSpecification, ...TabSpecification[]],
    ignoredTabSpecification: IgnoredTabSpecification,
    theme?: Theme,
    sticky: boolean = false
): NamedWindowSpecification {
    // Merge ignored spec with other specs - ignored URLs will be checked first due to order
    const allTabSpecifications = [ignoredTabSpecification, ...tabSpecifications];

    return {
        name,
        sticky,
        ...(theme !== undefined && {theme}),

        shouldAcceptTab(tab: Tab): boolean {
            // Tabs from outside only need to match the specifications, ignore stickiness
            return allTabSpecifications.some(spec => spec.isSatisfiedBy(tab));
        },

        shouldKeepTab(tab: Tab): boolean {
            return sticky || this.shouldAcceptTab(tab)
        },

        isSatisfiedByWindow(window: Window): boolean {
            return (
                // A window satisfies the specification if all of its tabs satisfy at least one of the tab specifications
                window.tabs.every(tab => this.shouldKeepTab(tab))
                // OR if at least one tab satisfies the specification and the specification is sticky
                || (sticky && window.tabs.some(tab => allTabSpecifications.some(spec => spec.isSatisfiedBy(tab))))
            );
        }
    };
}

/**
 * Create a default specification that matches any window or tab
 * Used as the fallback specification when no other specifications match
 */
export function createDefaultNamedWindowSpecification(
    defaultName: WindowName,
    theme?: Theme
): NamedWindowSpecification {
    return {
        name: defaultName,
        sticky: false,
        ...(theme !== undefined && {theme}),

        shouldAcceptTab(_tab: Tab): boolean {
            return true;
        },

        shouldKeepTab(_tab: Tab): boolean {
            return true;
        },

        isSatisfiedByWindow(_window: Window): boolean {
            return true;
        }
    };
}
