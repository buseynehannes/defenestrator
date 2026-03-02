import type { HandleNewWindowCreatedUseCase } from "../ports/in/HandleNewWindowCreatedUseCase";
import type { NewWindowCreatedEvent } from "../../domain/events/NewWindowCreatedEvent";
import type { Logger } from "../ports/Logger";

export class HandleNewWindowCreatedService implements HandleNewWindowCreatedUseCase {
    constructor(private readonly logger: Logger) {}

    async execute(event: NewWindowCreatedEvent): Promise<void> {
        this.logger.log(`[EVENT] New window ${event.windowId} created for specification "${event.specification.name}"`);
    }
}

