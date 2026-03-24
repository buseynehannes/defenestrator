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

interface WindowSpecBase {
    readonly name: WindowName;
    readonly theme?: Theme;
    readonly sticky: boolean;
    shouldAcceptTab(tab: Tab): boolean;
    shouldKeepTab(tab: Tab): boolean;
    isSatisfiedByWindow(window: Window): boolean;
}

/** The fallback specification that matches any window or tab. Always non-sticky. */
export interface DefaultWindowSpec extends WindowSpecBase {
    readonly isDefault: true;
    readonly sticky: false;
}

/** A rule-based specification with at least one tab specification. */
export interface RuleBasedWindowSpec extends WindowSpecBase {
    readonly isDefault: false;
    readonly tabSpecifications: readonly [TabSpecification, ...TabSpecification[]];
}

export type NamedWindowSpecification = DefaultWindowSpec | RuleBasedWindowSpec;

/**
 * Create a copy of a specification with the sticky flag toggled.
 * Default specifications cannot be sticky — returns the spec unchanged in that case.
 */
export function withStickyToggled(spec: NamedWindowSpecification): NamedWindowSpecification {
    if (spec.isDefault) return spec;
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
): RuleBasedWindowSpec {
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

