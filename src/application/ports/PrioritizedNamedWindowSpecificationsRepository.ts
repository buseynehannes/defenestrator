/**
 * PrioritizedNamedWindowSpecificationsRepository port
 * Handles persistence and retrieval of the prioritized window specifications configuration
 */

import type { PrioritizedNamedWindowSpecifications } from "../../domain/specifications/PrioritizedNamedWindowSpecifications";

export interface PrioritizedNamedWindowSpecificationsRepository {
    /**
     * Get the current prioritized window specifications
     */
    getPrioritizedSpecifications(): Promise<PrioritizedNamedWindowSpecifications | null>;
}


