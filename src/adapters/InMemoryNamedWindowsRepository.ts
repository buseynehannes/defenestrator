/**
 * InMemoryNamedWindowsRepository adapter
 * Holds the NamedWindows aggregate in memory and dispatches domain events on save
 */

import type { NamedWindows } from "../domain/NamedWindows";
import type { NamedWindowsRepository } from "../application/ports/out/NamedWindowsRepository";
import type { TabMovedEvent } from "../domain/events/TabMovedEvent";
import type { NewWindowCreatedEvent } from "../domain/events/NewWindowCreatedEvent";
import type { WindowSpecAssignedEvent } from "../domain/events/WindowSpecAssignedEvent";
import type { Logger } from "../application/ports/Logger";

type DomainEvent = TabMovedEvent | NewWindowCreatedEvent | WindowSpecAssignedEvent;
type EventHandler = (event: DomainEvent) => void | Promise<void>;

export class InMemoryNamedWindowsRepository implements NamedWindowsRepository {
    private namedWindows: NamedWindows | null = null;
    private readonly handlers: EventHandler[] = [];

    constructor(private readonly logger: Logger) {}

    get(): NamedWindows | null {
        this.logger.log(`[NAMED_WINDOWS] Getting aggregate — ${this.namedWindows ? 'initialized' : 'not yet initialized'}`);
        return this.namedWindows;
    }

    async save(namedWindows: NamedWindows): Promise<void> {
        const events = namedWindows.getAndClearEvents();
        this.namedWindows = namedWindows;

        for (const event of events) {
            this.logger.log(`[NAMED_WINDOWS] Dispatching event: ${event.type}`);
            for (const handler of this.handlers) {
                await Promise.resolve(handler(event));
            }
        }
    }

    /**
     * Register a handler that will be called for every domain event on save
     */
    onEvent(handler: EventHandler): void {
        this.handlers.push(handler);
    }
}

