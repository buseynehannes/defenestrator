import type {WindowName} from "../WindowName";
import type {Tab} from "../windows/Tab";
import type {Window} from "../windows/Window";
import type {TabSpecification} from "./TabSpecification";

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
    readonly isDefault: boolean;
    /**
     * The tab specifications for this window. Absent on default specifications.
     */
    readonly tabSpecifications?: readonly [TabSpecification, ...TabSpecification[]];

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
 * Create a copy of a specification with the sticky flag toggled.
 * Default specifications cannot be sticky — returns the spec unchanged in that case.
 */
export function withStickyToggled(spec: NamedWindowSpecification): NamedWindowSpecification {
    if (spec.isDefault || !spec.tabSpecifications) return spec;
    return createNamedWindowSpecification(spec.name, spec.tabSpecifications, spec.theme, !spec.sticky);
}

/**
 * Create a named window specification with tab specifications
 * @param name The name of the window specification
 * @param tabSpecifications At least one tab specification is required (non-empty array)
 * @param theme Optional visual theme properties
 * @param sticky Whether the specification is sticky (matches if any tab matches, not all)
 */
export function createNamedWindowSpecification(
    name: WindowName,
    tabSpecifications: readonly [TabSpecification, ...TabSpecification[]],
    theme?: Theme,
    sticky: boolean = false
): NamedWindowSpecification {
    const frozenTabSpecs = Object.freeze([...tabSpecifications]) as readonly [TabSpecification, ...TabSpecification[]];
    return Object.freeze({
        name,
        sticky,
        isDefault: false,
        tabSpecifications: frozenTabSpecs,
        ...(theme !== undefined && {theme}),

        shouldAcceptTab(tab: Tab): boolean {
            return frozenTabSpecs.some(spec => spec.isSatisfiedBy(tab));
        },

        shouldKeepTab(tab: Tab): boolean {
            return sticky || this.shouldAcceptTab(tab);
        },

        isSatisfiedByWindow(window: Window): boolean {
            return (
                window.tabs.every(tab => this.shouldAcceptTab(tab))
                || (sticky && window.tabs.some(tab => frozenTabSpecs.some(spec => spec.isSatisfiedBy(tab))))
            );
        }
    });
}

