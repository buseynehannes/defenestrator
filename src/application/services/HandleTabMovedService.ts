import type { HandleTabMovedUseCase } from "../ports/in/HandleTabMovedUseCase";
import type { TabMovedEvent } from "../../domain/events/TabMovedEvent";
import type { WindowRepository } from "../ports/out/WindowRepository";
import type { Logger } from "../ports/Logger";

export class HandleTabMovedService implements HandleTabMovedUseCase {
    constructor(
        private readonly windowRepository: WindowRepository,
        private readonly logger: Logger
    ) {}

    async execute(event: TabMovedEvent): Promise<void> {
        const { tab, fromWindowId, toWindowId } = event;

        this.logger.log(`[EVENT] Tab ${tab.id} moved from ${fromWindowId} to ${toWindowId}`);

        const fromWindow = await this.windowRepository.getWindowByDomainId(fromWindowId);
        const isOnlyTab = fromWindow !== null && fromWindow.tabs.length === 1;

        await this.windowRepository.moveTab(tab, toWindowId);
        if (isOnlyTab) {
            await this.windowRepository.closeWindow(fromWindowId);
        }
        await this.windowRepository.focusWindow(toWindowId);
        this.logger.log(`[EVENT] Tab ${tab.id} moved and window ${toWindowId} focused`);
    }
}

