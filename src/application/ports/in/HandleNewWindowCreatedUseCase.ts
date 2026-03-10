/**
 * HandleNewWindowCreatedUseCase input port
 * Defines the contract for reacting to a new named window being created
 */

import type { NewWindowCreatedEvent } from "../../../domain/events/NewWindowCreatedEvent";

export interface HandleNewWindowCreatedUseCase {
    execute(event: NewWindowCreatedEvent): Promise<void>;
}

