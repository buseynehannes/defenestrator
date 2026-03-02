/**
 * PrioritizedNamedWindowSpecifications domain model
 * Represents a prioritized ordered set of named window specifications
 * Earlier specifications have higher priority
 *
 * The last specification is always a default that matches any window or tab
 */

import {createNamedWindowSpecification, type NamedWindowSpecification} from "./NamedWindowSpecification";
import { createDefaultNamedWindowSpecification } from "./NamedWindowSpecification";
import { createIgnoredTabSpecification } from "./IgnoredTabSpecification";
import type { WindowName } from "../WindowName";
import {createTabSpecification} from "./TabSpecification";

export interface PrioritizedNamedWindowSpecifications {
    readonly specifications: readonly NamedWindowSpecification[];
}

/**
 * Factory method to create a default PrioritizedNamedWindowSpecifications
 * with sensible default values
 */
export function createDefaultPrioritizedNamedWindowSpecifications(): PrioritizedNamedWindowSpecifications {
    // Create email specification with multiple email providers
    const emailTabSpecs = [
        createTabSpecification("mail.google.com"),
        createTabSpecification("outlook.com"),
        createTabSpecification("mail.outlook.com"),
        createTabSpecification("mail.yahoo.com"),
        createTabSpecification("protonmail.com"),
    ] as readonly [any, ...any[]];

    const emailIgnoredUrls = createIgnoredTabSpecification(['about:', 'moz-extension:']);

    const emailSpec = createNamedWindowSpecification(
        "[EMAIL]" as WindowName,
        emailTabSpecs,
        emailIgnoredUrls,
        {
            accentColor: "#4285f4",      // Google blue
            textColor: "#ffffff",
            frameColor: "#2d579f"
        }
    );

    // Create default specification with ignored Mozilla internal URLs
    const defaultSpec = createDefaultNamedWindowSpecification(
        "[DEFAULT]" as WindowName,
        {
            accentColor: "#95a5a6",
            textColor: "#ffffff",
            frameColor: "#7f8c8d"
        }
    );

    return {
        specifications: [
            emailSpec,
            defaultSpec
        ]
    };
}


