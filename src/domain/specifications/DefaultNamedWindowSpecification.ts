import type {WindowName} from "../WindowName";
import type {Tab} from "../Tab";
import type {Window} from "../Window";
import type {NamedWindowSpecification, Theme} from "./NamedWindowSpecification";

/**
 * Create a default specification that matches any window or tab
 * Used as the fallback specification when no other specifications match
 */
export function createDefaultNamedWindowSpecification(
    defaultName: WindowName,
    theme?: Theme
): NamedWindowSpecification {
    return Object.freeze({
        name: defaultName,
        sticky: false,
        ...(theme !== undefined && {theme}),

        shouldKeepTab(_tab: Tab): boolean {
            return false;
        },

        shouldAcceptTab(_tab: Tab): boolean {
            return true;
        },

        isSatisfiedByWindow(_window: Window): boolean {
            return true;
        }
    });
}

