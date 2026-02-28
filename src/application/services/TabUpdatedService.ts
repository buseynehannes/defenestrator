/**
 * TabUpdatedService application service
 * Handles tab updates by ensuring the tab is in the correct window
 */

import type { Tab } from "../../domain/Tab";
import type { WindowId } from "../../domain/WindowName";
import type { NamedWindowsRepository } from "../ports/NamedWindowsRepository";
import type { PrioritizedNamedWindowSpecificationsRepository } from "../ports/PrioritizedNamedWindowSpecificationsRepository";
import type { Logger } from "../ports/Logger";
import { findSpecificationForTab } from "../../domain/specifications/PrioritizedNamedWindowSpecifications";
import { createNamedWindow } from "../../domain/NamedWindow";
import { createWindow } from "../../domain/Window";
import type { NamedWindowSpecification } from "../../domain/specifications/NamedWindowSpecification";
import { pipe } from "fp-ts/function";
import { match } from "fp-ts/Option";

export class TabUpdatedService {
    constructor(
        private readonly namedWindowsRepository: NamedWindowsRepository,
        private readonly prioritizedSpecsRepository: PrioritizedNamedWindowSpecificationsRepository,
        private readonly logger: Logger
    ) {}

    async execute(tab: Tab, currentWindowId: WindowId): Promise<void> {
        try {
            // Get the named window that currently contains this tab
            const currentNamedWindowOption = await this.namedWindowsRepository.getNamedWindow(currentWindowId);

            // Check if the current window should keep this tab
            const shouldStay = pipe(
                currentNamedWindowOption,
                match(
                    () => false,
                    (namedWindow) => namedWindow.specification.shouldKeepTab(tab)
                )
            );

            if (shouldStay) {
                this.logger.log(`[TAB] Tab ${tab.id} stays in window ${currentWindowId}`);
                return;
            }

            // Fetch the prioritized specifications
            const prioritizedSpecsOption = await this.prioritizedSpecsRepository.getPrioritizedSpecifications();

            // Find which specification accepts this tab
            const acceptingSpecOption = pipe(
                prioritizedSpecsOption,
                match(
                    () => null,
                    (specs) => findSpecificationForTab(specs, tab)
                )
            );

            if (!acceptingSpecOption) {
                this.logger.log(`[TAB] No specification accepts tab ${tab.id}`);
                return;
            }

            await pipe(
                acceptingSpecOption,
                match(
                    () => Promise.resolve(),
                    async (acceptingSpec) => {
                        // Try to fetch an existing NamedWindow with this specification
                        const targetNamedWindowOption = await this.namedWindowsRepository.findNamedWindowBySpecification(acceptingSpec);

                        const targetNamedWindow = await pipe(
                            targetNamedWindowOption,
                            match(
                                async () => {
                                    // Create a new window with just this tab
                                    const newWindow = createWindow(currentWindowId, [tab]);
                                    const namedWindow = createNamedWindow(newWindow, acceptingSpec);
                                    this.logger.log(`[TAB] Created new NamedWindow for specification ${acceptingSpec.name}`);
                                    return namedWindow;
                                },
                                async (existingWindow) => {
                                    // Add tab to the existing NamedWindow
                                    const updatedWindow = createWindow(
                                        existingWindow.window.id,
                                        [...existingWindow.window.tabs, tab]
                                    );
                                    return createNamedWindow(updatedWindow, acceptingSpec);
                                }
                            )
                        );

                        // Save the updated NamedWindow
                        await this.namedWindowsRepository.saveNamedWindow(targetNamedWindow);

                        this.logger.log(
                            `[TAB] Tab ${tab.id} moved to window ${targetNamedWindow.window.id} (${acceptingSpec.name})`
                        );
                    }
                )
            );
        } catch (e) {
            this.logger.error('[TAB] Error handling tab update:', e);
            throw e;
        }
    }
}



