import type { HandleWindowSpecAssignedUseCase } from "../ports/in/HandleWindowSpecAssignedUseCase";
import type { WindowSpecAssignedEvent } from "../../domain/events/WindowSpecAssignedEvent";
import type { WindowRepository } from "../ports/out/WindowRepository";
import type { Logger } from "../ports/Logger";

export class HandleWindowSpecAssignedService implements HandleWindowSpecAssignedUseCase {
    constructor(
        private readonly windowRepository: WindowRepository,
        private readonly logger: Logger
    ) {}

    async execute(event: WindowSpecAssignedEvent): Promise<void> {
        const { windowId, specification } = event;

        this.logger.log(`[EVENT] Window ${windowId} assigned to specification "${specification.name}"`);

        if (specification.theme) {
            await this.windowRepository.setTheme(windowId, specification.theme);
        }

        await this.windowRepository.setTitlePrefix(windowId, specification.name);
    }
}

