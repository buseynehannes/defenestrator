/**
 * PrioritizedNamedWindowSpecifications domain model
 * Represents a prioritized ordered set of named window specifications
 * Earlier specifications have higher priority
 *
 * The last specification is always a default that matches any window or tab
 */

import {createNamedWindowSpecification, type NamedWindowSpecification} from "./NamedWindowSpecification";
import {createDefaultNamedWindowSpecification} from "./DefaultNamedWindowSpecification";
import {createGlobalIgnoredUrls, type GlobalIgnoredUrls} from "./GlobalIgnoredUrls";
import type {WindowName} from "../WindowName";
import {createTabSpecification} from "./TabSpecification";

export interface PrioritizedNamedWindowSpecifications {
    readonly specifications: readonly NamedWindowSpecification[];
    readonly globalIgnoredUrls: GlobalIgnoredUrls;
}

/**
 * Factory method to create a PrioritizedNamedWindowSpecifications
 * @param specifications Ordered list of named window specifications (earlier = higher priority)
 * @param globalIgnoredUrls URL patterns that are globally ignored across all windows
 */
export function createPrioritizedNamedWindowSpecifications(
    specifications: readonly NamedWindowSpecification[],
    globalIgnoredUrls: GlobalIgnoredUrls
): PrioritizedNamedWindowSpecifications {
    return {
        specifications,
        globalIgnoredUrls
    };
}

/**
 * Factory method to create a default PrioritizedNamedWindowSpecifications
 * with sensible default values
 */
export function createDefaultPrioritizedNamedWindowSpecifications(): PrioritizedNamedWindowSpecifications {
    const globalIgnoredUrls = createGlobalIgnoredUrls(['about:', 'moz-extension:']);

    // Create email specification with multiple email providers
    const emailTabSpecs = [
        createTabSpecification("mail.google.com"),
        createTabSpecification("outlook.com"),
        createTabSpecification("mail.outlook.com"),
        createTabSpecification("mail.yahoo.com"),
        createTabSpecification("protonmail.com"),
    ] as readonly [any, ...any[]];

    const emailSpec = createNamedWindowSpecification(
        "[EMAIL]" as WindowName,
        emailTabSpecs,
        {
            accentColor: "#4285f4",      // Google blue
            textColor: "#ffffff",
            frameColor: "#2d579f"
        }
    );

    const defaultSpec = createDefaultNamedWindowSpecification(
        "[DEFAULT]" as WindowName,
        {
            accentColor: "#95a5a6",
            textColor: "#ffffff",
            frameColor: "#7f8c8d"
        }
    );

    return createPrioritizedNamedWindowSpecifications(
        [emailSpec, defaultSpec],
        globalIgnoredUrls
    );
}
