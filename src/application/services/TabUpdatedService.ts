/**
 * TabUpdatedService application service
 * Handles tab updates by ensuring the tab is in the correct window
 */

import type { Tab } from "../../domain/Tab";
import type { WindowId } from "../../domain/WindowName";
import type { NamedWindowsRepository } from "../ports/NamedWindowsRepository";
import type { PrioritizedNamedWindowSpecificationsRepository } from "../ports/PrioritizedNamedWindowSpecificationsRepository";
import type { Logger } from "../ports/Logger";
import { findSpecificationForTab, nameWindows as nameWindowsAggregate } from "../../domain/NamedWindows";
import { createNamedWindow } from "../../domain/NamedWindow";
import { createWindow } from "../../domain/Window";

export class TabUpdatedService {
    constructor(
        private readonly namedWindowsRepository: NamedWindowsRepository,
        private readonly prioritizedSpecsRepository: PrioritizedNamedWindowSpecificationsRepository,
        private readonly logger: Logger
    ) {}

    async execute(tab: Tab, currentWindowId: WindowId): Promise<void> {
        try {
            // Get the named window that currently contains this tab
            const currentNamedWindow = await this.namedWindowsRepository.getNamedWindow(currentWindowId);

            // Check if the current window should keep this tab
            if (currentNamedWindow && currentNamedWindow.shouldKeep(tab)) {
                this.logger.log(`[TAB] Tab ${tab.id} stays in window ${currentWindowId}`);
                return;
            }

            // Fetch the prioritized specifications
            const prioritizedSpecs = await this.prioritizedSpecsRepository.getPrioritizedSpecifications();

            if (!prioritizedSpecs) {
                this.logger.log(`[TAB] No prioritized specifications available`);
                return;
            }

            // Create a NamedWindows aggregate from existing named windows
            const allNamedWindows = await this.namedWindowsRepository.getAllNamedWindows();
            const windowMap = new Map(
                allNamedWindows.map((nw: typeof allNamedWindows[number]) => [nw.specification, nw.window])
            );
            const namedWindows = nameWindowsAggregate(prioritizedSpecs.specifications, Array.from(windowMap.values()).filter(w => w !== null) as any);

            // Find which specification accepts this tab
            const acceptingSpec = findSpecificationForTab(namedWindows, tab);

            if (!acceptingSpec) {
                this.logger.log(`[TAB] No specification accepts tab ${tab.id}`);
                return;
            }

            // Try to fetch an existing NamedWindow with this specification
            const targetNamedWindow = await this.namedWindowsRepository.findNamedWindowBySpecification(acceptingSpec);

            if (targetNamedWindow) {
                // Move tab to target window
                const updatedTargetWindow = targetNamedWindow.addTab(tab);

                await this.namedWindowsRepository.saveNamedWindow(updatedTargetWindow);
                if (currentNamedWindow) {
                    const updatedCurrentWindow = currentNamedWindow.removeTab(tab);
                    await this.namedWindowsRepository.saveNamedWindow(updatedCurrentWindow);
                }

                this.logger.log(`[TAB] Tab ${tab.id} moved to window ${updatedTargetWindow.window.id} (${acceptingSpec.name})`);
            } else {
                // Create a new window with just this tab
                const newWindow = createWindow(currentWindowId, [tab]);
                const namedWindow = createNamedWindow(newWindow, acceptingSpec);
                await this.namedWindowsRepository.saveNamedWindow(namedWindow);
                this.logger.log(`[TAB] Created new NamedWindow for specification ${acceptingSpec.name}`);
            }
        } catch (e) {
            this.logger.error('[TAB] Error handling tab update:', e);
            throw e;
        }
    }
}



