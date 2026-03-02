import type { HandleWindowSpecAssignedUseCase } from "../ports/in/HandleWindowSpecAssignedUseCase";
import type { WindowSpecAssignedEvent } from "../../domain/events/WindowSpecAssignedEvent";
import type { Logger } from "../ports/Logger";

export class HandleWindowSpecAssignedService implements HandleWindowSpecAssignedUseCase {
    constructor(private readonly logger: Logger) {}

    async execute(event: WindowSpecAssignedEvent): Promise<void> {
        this.logger.log(`[EVENT] Window ${event.windowId} assigned to specification "${event.specification.name}"`);
    }
}

