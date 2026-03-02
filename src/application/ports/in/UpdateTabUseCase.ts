/**
 * UpdateTabUseCase input port
 * Defines the contract for handling tab updates
 */

import type { Tab } from "../../../domain/Tab";
import type { WindowId } from "../../../domain/WindowName";

export interface UpdateTabUseCase {
    /**
     * Execute the use case to update a tab's window assignment
     * @param tab The tab that was updated
     * @param currentWindowId The window ID where the tab currently is
     */
    execute(tab: Tab, currentWindowId: WindowId): Promise<void>;
}

