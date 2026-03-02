/**
 * HandleTabMovedUseCase input port
 * Defines the contract for reacting to a tab being moved between windows
 */

import type { TabMovedEvent } from "../../../domain/events/TabMovedEvent";

export interface HandleTabMovedUseCase {
    execute(event: TabMovedEvent): Promise<void>;
}

