/**
 * NamedWindowsRepository output port
 * Handles persistence and event dispatching for the NamedWindows aggregate
 */

import type { NamedWindows } from "../../../domain/NamedWindows";

export interface NamedWindowsRepository {
    /**
     * Get the current NamedWindows aggregate.
     * Returns null if not yet initialized.
     */
    get(): NamedWindows | null;

    /**
     * Save the NamedWindows aggregate and dispatch any pending domain events.
     */
    save(namedWindows: NamedWindows): Promise<void>;
}

