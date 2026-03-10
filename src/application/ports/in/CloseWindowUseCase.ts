/**
 * CloseWindowUseCase input port
 * Defines the contract for removing a window from the NamedWindows aggregate when it is closed
 */

import type { WindowId } from "../../../domain/WindowName";

export interface CloseWindowUseCase {
    execute(windowId: WindowId): Promise<void>;
}

