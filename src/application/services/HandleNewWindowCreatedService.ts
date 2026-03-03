import type { HandleNewWindowCreatedUseCase } from "../ports/in/HandleNewWindowCreatedUseCase";
import type { NewWindowCreatedEvent } from "../../domain/events/NewWindowCreatedEvent";
import type { WindowRepository } from "../ports/out/WindowRepository";
import type { Logger } from "../ports/Logger";

export class HandleNewWindowCreatedService implements HandleNewWindowCreatedUseCase {
    constructor(
        private readonly windowRepository: WindowRepository,
        private readonly logger: Logger
    ) {}

    async execute(event: NewWindowCreatedEvent): Promise<void> {
        const { windowId, tab, specification } = event;

        this.logger.log(`[EVENT] New window ${windowId} created for specification "${specification.name}"`);

        await this.windowRepository.openWindow(windowId, tab);

        if (specification.theme) {
            await this.windowRepository.setTheme(windowId, specification.theme);
        }

        await this.windowRepository.setTitlePrefix(windowId, specification.name);
        await this.windowRepository.focusWindow(windowId);
    }
}

