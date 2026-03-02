/**
 * UpdateTabService application service
 * Implements UpdateTabUseCase to handle tab updates by ensuring tabs are in the correct window
 */

import type { Tab } from "../../domain/Tab";
import type { WindowId } from "../../domain/WindowName";
import type { WindowRepository } from "../ports/out/WindowRepository";
import type { PrioritizedNamedWindowSpecificationsRepository } from "../ports/out/PrioritizedNamedWindowSpecificationsRepository";
import type { Logger } from "../ports/Logger";
import type { UpdateTabUseCase } from "../ports/in/UpdateTabUseCase";
import { nameWindows } from "../../domain/NamedWindows";

export class UpdateTabService implements UpdateTabUseCase {
    constructor(
        private readonly windowRepository: WindowRepository,
        private readonly prioritizedSpecsRepository: PrioritizedNamedWindowSpecificationsRepository,
        private readonly logger: Logger
    ) {}

    async execute(tab: Tab, currentWindowId: WindowId): Promise<void> {
        try {
            // Fetch the prioritized specifications
            const prioritizedSpecs = await this.prioritizedSpecsRepository.getPrioritizedSpecifications();

            if (!prioritizedSpecs) {
                this.logger.log(`[TAB] No prioritized specifications available`);
                return;
            }

            // Fetch all windows from Firefox to reconstruct the NamedWindows aggregate
            const windows = await this.windowRepository.getAllWindows();

            // Create the NamedWindows aggregate from the windows
            const namedWindows = nameWindows(prioritizedSpecs, windows);

            // Update the tab in the NamedWindows aggregate
            const updatedNamedWindows = namedWindows.updateTab(tab, currentWindowId);


            // Handle any events that were generated
            const events = updatedNamedWindows.getAndClearEvents();
            this.logger.log(`[TAB] Tab ${tab.id} updated: ${events.length} events generated`);
        } catch (e) {
            this.logger.error('[TAB] Error handling tab update:', e);
            throw e;
        }
    }
}

