/**
 * RestoreWindowTagsService application service
 * Restores window specifications after startup by analyzing window content
 */

import type { WindowRepository } from "../ports/WindowRepository";
import type { NamedWindowsRepository } from "../ports/NamedWindowsRepository";
import type { Logger } from "../ports/Logger";
import type { PrioritizedNamedWindowSpecifications } from "../../domain/specifications/PrioritizedNamedWindowSpecifications";
import { nameWindows } from "../../domain/specifications/PrioritizedNamedWindowSpecifications";

export class RestoreWindowTagsService {
    constructor(
        private readonly windowRepository: WindowRepository,
        private readonly namedWindowsRepository: NamedWindowsRepository,
        private readonly logger: Logger
    ) {}

    async execute(prioritizedSpecs: PrioritizedNamedWindowSpecifications): Promise<void> {
        try {
            this.logger.log('[STARTUP] Restoring window specifications...');

            // Get all windows from the repository
            const windows = await this.windowRepository.getAllWindows();

            // Classify windows using the prioritized specifications
            const classificationResult = nameWindows(prioritizedSpecs, windows);

            // Save all named windows
            await this.namedWindowsRepository.saveNamedWindows(classificationResult.namedWindows);

            this.logger.log(`[STARTUP] Window restoration complete: ${classificationResult.namedWindows.length} windows classified, ${classificationResult.unclassifiedWindows.length} unclassified`);
        } catch (e) {
            this.logger.error('[STARTUP] Error restoring window specifications:', e);
            throw e;
        }
    }
}

