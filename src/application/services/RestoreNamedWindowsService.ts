/**
 * RestoreNamedWindowsService application service
 * Implements RestoreNamedWindowsUseCase to restore window specifications after startup by analyzing window content
 */

import type { WindowRepository } from "../ports/out/WindowRepository";
import type { PrioritizedNamedWindowSpecificationsRepository } from "../ports/out/PrioritizedNamedWindowSpecificationsRepository";
import type { Logger } from "../ports/Logger";
import type { RestoreNamedWindowsUseCase } from "../ports/in/RestoreNamedWindowsUseCase";
import { nameWindows } from "../../domain/NamedWindows";

export class RestoreNamedWindowsService implements RestoreNamedWindowsUseCase {
    constructor(
        private readonly windowRepository: WindowRepository,
        private readonly prioritizedSpecsRepository: PrioritizedNamedWindowSpecificationsRepository,
        private readonly logger: Logger
    ) {}

    async execute(): Promise<void> {
        try {
            this.logger.log('[STARTUP] Restoring window specifications...');

            // Fetch the prioritized specifications from the repository
            const prioritizedSpecs = await this.prioritizedSpecsRepository.getPrioritizedSpecifications();

            if (!prioritizedSpecs) {
                this.logger.log('[STARTUP] No prioritized specifications found');
                return;
            }

            // Fetch all windows from the repository
            const windows = await this.windowRepository.getAllWindows();

            // Create a NamedWindows aggregate from the windows
            const namedWindows = nameWindows(prioritizedSpecs, windows);


            // Handle any events that were generated
            const events = namedWindows.getAndClearEvents();
            this.logger.log(`[STARTUP] Window restoration complete: ${events.length} events generated`);
        } catch (e) {
            this.logger.error('[STARTUP] Error restoring window specifications:', e);
            throw e;
        }
    }
}

