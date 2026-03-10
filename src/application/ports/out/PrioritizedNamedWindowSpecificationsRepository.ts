/**
 * PrioritizedNamedWindowSpecificationsRepository output port
 * Handles persistence of the application's configuration (prioritized window specifications)
 */

import type {
    PrioritizedNamedWindowSpecifications
} from "../../../domain/specifications/PrioritizedNamedWindowSpecifications";

export interface PrioritizedNamedWindowSpecificationsRepository {
    /**
     * Get the prioritized window specifications from persistent storage
     */
    getPrioritizedSpecifications(): Promise<PrioritizedNamedWindowSpecifications | null>;

    /**
     * Save the prioritized window specifications to persistent storage
     */
    savePrioritizedSpecifications(specs: PrioritizedNamedWindowSpecifications): Promise<void>;
}

