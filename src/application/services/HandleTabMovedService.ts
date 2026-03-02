import type { HandleTabMovedUseCase } from "../ports/in/HandleTabMovedUseCase";
import type { TabMovedEvent } from "../../domain/events/TabMovedEvent";
import type { Logger } from "../ports/Logger";

export class HandleTabMovedService implements HandleTabMovedUseCase {
    constructor(private readonly logger: Logger) {}

    async execute(event: TabMovedEvent): Promise<void> {
        this.logger.log(`[EVENT] Tab ${event.tab.id} moved from ${event.fromWindowId} to ${event.toWindowId}`);
    }
}

