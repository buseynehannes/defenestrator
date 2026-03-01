/**
 * ConfigurationPrioritizedNamedWindowSpecificationsRepository adapter
 * Implements PrioritizedNamedWindowSpecificationsRepository using the configuration store
 */

import type { PrioritizedNamedWindowSpecificationsRepository } from "../application/ports/PrioritizedNamedWindowSpecificationsRepository";
import type { PrioritizedNamedWindowSpecifications } from "../domain/specifications/PrioritizedNamedWindowSpecifications";
import type { Logger } from "../application/ports/Logger";

export class ConfigurationPrioritizedNamedWindowSpecificationsRepository implements PrioritizedNamedWindowSpecificationsRepository {
    constructor(
        private readonly logger: Logger
    ) {}

    async getPrioritizedSpecifications(): Promise<PrioritizedNamedWindowSpecifications | null> {
        try {
            // TODO: Implement conversion from config to PrioritizedNamedWindowSpecifications
            this.logger.log('[CONFIG] Retrieved prioritized specifications from configuration');
            return null;
        } catch (e) {
            this.logger.error('[CONFIG] Error retrieving prioritized specifications:', e);
            return null;
        }
    }
}

