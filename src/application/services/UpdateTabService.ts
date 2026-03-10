/**
 * UpdateTabService application service
 * Implements UpdateTabUseCase to handle tab updates by ensuring tabs are in the correct window
 */

import type {Tab} from "../../domain/windows/Tab";
import type {WindowId} from "../../domain/WindowName";
import type {NamedWindowsRepository} from "../ports/out/NamedWindowsRepository";
import type {Logger} from "../ports/Logger";
import type {UpdateTabUseCase} from "../ports/in/UpdateTabUseCase";

export class UpdateTabService implements UpdateTabUseCase {
    constructor(
        private readonly namedWindowsRepository: NamedWindowsRepository,
        private readonly logger: Logger
    ) {
    }

    async execute(tab: Tab, currentWindowId: WindowId): Promise<void> {
        try {
            this.logger.log(`[TAB] Processing update for tab ${tab.id} (url ${tab.url}) in window ${currentWindowId}`);
            const namedWindows = await this.namedWindowsRepository.get();

            if (!namedWindows) {
                throw new Error('[TAB] NamedWindows not initialized — run RestoreNamedWindowsService first');
            }

            const updatedNamedWindows = namedWindows.updateTab(tab, currentWindowId);
            await this.namedWindowsRepository.save(updatedNamedWindows);

            this.logger.log(`[TAB] Tab ${tab.id} processed`);
        } catch (e) {
            this.logger.error('[TAB] Error handling tab update:', e);
            throw e;
        }
    }
}

