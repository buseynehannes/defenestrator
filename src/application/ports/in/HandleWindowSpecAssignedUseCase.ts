/**
 * HandleWindowSpecAssignedUseCase input port
 * Defines the contract for reacting to a window being assigned to a specification
 */

import type { WindowSpecAssignedEvent } from "../../../domain/events/WindowSpecAssignedEvent";

export interface HandleWindowSpecAssignedUseCase {
    execute(event: WindowSpecAssignedEvent): Promise<void>;
}

