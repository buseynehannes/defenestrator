/**
 * PrioritizedNamedWindowSpecifications domain model
 * Represents a prioritized ordered set of named window specifications
 * Earlier specifications have higher priority
 *
 * The last specification is always a default that matches any window or tab
 */

import type {NamedWindowSpecification} from "./NamedWindowSpecification";

export interface PrioritizedNamedWindowSpecifications {
    readonly specifications: readonly NamedWindowSpecification[];
}


