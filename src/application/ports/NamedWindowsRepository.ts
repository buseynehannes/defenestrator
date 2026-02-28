/**
 * NamedWindowsRepository port
 * Handles persistence of NamedWindows (windows with their assigned specifications)
 */

import type { NamedWindow } from "../../domain/NamedWindow";
import type { WindowId } from "../../domain/WindowName";
import type { NamedWindowSpecification } from "../../domain/specifications/NamedWindowSpecification";
import type { Option } from "fp-ts/Option";

export interface NamedWindowsRepository {
    /**
     * Save a named window (persist its specification mapping)
     */
    saveNamedWindow(namedWindow: NamedWindow): Promise<void>;

    /**
     * Save multiple named windows
     */
    saveNamedWindows(namedWindows: readonly NamedWindow[]): Promise<void>;

    /**
     * Get a named window by its window ID
     */
    getNamedWindow(windowId: WindowId): Promise<Option<NamedWindow>>;

    /**
     * Find a named window by its specification
     */
    findNamedWindowBySpecification(specification: NamedWindowSpecification): Promise<Option<NamedWindow>>;

    /**
     * Delete a named window's saved specification
     */
    deleteNamedWindow(windowId: WindowId): Promise<void>;
}

