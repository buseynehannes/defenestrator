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
    if (specifications.length < 2) {
        throw new Error('PrioritizedNamedWindowSpecifications must have at least 2 specifications');
    }

    const last = specifications[specifications.length - 1]!;
    if (!last.isDefault) {
        throw new Error('The lowest-priority specification must be a default specification');
    }

    const nonLastDefaults = specifications.slice(0, -1).filter(s => s.isDefault);
    if (nonLastDefaults.length > 0) {
        throw new Error(`Only the lowest-priority specification can be a default. Found default specification(s) at higher priority: ${nonLastDefaults.map(s => s.name).join(', ')}`);
    }

    const names = specifications.map(s => s.name);
    const uniqueNames = new Set(names);
    if (uniqueNames.size !== names.length) {
        const duplicates = names.filter((name, i) => names.indexOf(name) !== i);
        throw new Error(`Duplicate window specification names: ${duplicates.join(', ')}`);
    }

    return Object.freeze({
        specifications: Object.freeze([...specifications]) as readonly NamedWindowSpecification[],
        globalIgnoredUrls
    });
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
