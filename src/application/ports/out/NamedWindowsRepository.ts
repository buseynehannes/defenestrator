/**
 * NamedWindowsRepository output port
 * Handles persistence and event dispatching for the NamedWindows aggregate
 */

import type { NamedWindows } from "../../../domain/NamedWindows";
import type { TabMovedEvent } from "../../../domain/events/TabMovedEvent";
import type { NewWindowCreatedEvent } from "../../../domain/events/NewWindowCreatedEvent";
import type { WindowSpecAssignedEvent } from "../../../domain/events/WindowSpecAssignedEvent";

export type NamedWindowsDomainEvent = TabMovedEvent | NewWindowCreatedEvent | WindowSpecAssignedEvent;
export type NamedWindowsEventHandler = (event: NamedWindowsDomainEvent) => void | Promise<void>;

export interface NamedWindowsRepository {
    /**
     * Get the current NamedWindows aggregate.
     * Returns null if not yet initialized.
     */
    get(): Promise<NamedWindows | null>;

    /**
     * Save the NamedWindows aggregate and dispatch any pending domain events.
     */
    save(namedWindows: NamedWindows): Promise<void>;

    /**
     * Register a handler to be called when domain events are dispatched on save.
     */
    onEvent(handler: NamedWindowsEventHandler): void;
}

