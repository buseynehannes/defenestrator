/**
 * RestoreWindowTagsService application service
 * Restores window specifications after startup by analyzing window content
 */

import type { WindowRepository } from "../ports/WindowRepository";
import type { NamedWindowsRepository } from "../ports/NamedWindowsRepository";
import type { Logger } from "../ports/Logger";
import type { PrioritizedNamedWindowSpecifications } from "../../domain/specifications/PrioritizedNamedWindowSpecifications";
import { nameWindows } from "../../domain/NamedWindows";
import { createNamedWindow } from "../../domain/NamedWindow";
import type { TabUpdatedService } from "./TabUpdatedService";
import type { TabId } from "../../domain/Tab";

export class RestoreWindowTagsService {
    constructor(
        private readonly windowRepository: WindowRepository,
        private readonly namedWindowsRepository: NamedWindowsRepository,
        private readonly tabUpdatedService: TabUpdatedService,
        private readonly logger: Logger
    ) {}

    async execute(prioritizedSpecs: PrioritizedNamedWindowSpecifications): Promise<void> {
        try {
            this.logger.log('[STARTUP] Restoring window specifications...');

            // Get all windows from the repository
            const windows = await this.windowRepository.getAllWindows();

            // Classify windows using the prioritized specifications
            const namedWindows = nameWindows(prioritizedSpecs, windows);

            // Save all named windows that have windows
            for (const spec of namedWindows.getSpecifications()) {
                const window = namedWindows.getWindow(spec);
                if (window) {
                    // Create a proper NamedWindow object
                    const namedWindow = createNamedWindow(window, spec);
                    await this.namedWindowsRepository.saveNamedWindows([namedWindow]);
                }
            }

            // Collect all tabs from windows that were assigned to specifications
            const assignedTabs = new Set<TabId>();
            for (const spec of namedWindows.getSpecifications()) {
                const window = namedWindows.getWindow(spec);
                if (window) {
                    window.tabs.forEach(tab => assignedTabs.add(tab.id));
                }
            }

            // Process unclassified tabs by assigning them to appropriate named windows
            for (const window of windows) {
                for (const tab of window.tabs) {
                    if (!assignedTabs.has(tab.id)) {
                        await this.tabUpdatedService.execute(tab, window.id);
                    }
                }
            }

            const classifiedCount = Array.from(namedWindows.getSpecifications())
                .filter(spec => namedWindows.hasWindow(spec)).length;
            this.logger.log(`[STARTUP] Window restoration complete: ${classifiedCount} windows classified`);
        } catch (e) {
            this.logger.error('[STARTUP] Error restoring window specifications:', e);
            throw e;
        }
    }
}

