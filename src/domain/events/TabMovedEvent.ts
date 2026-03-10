/**
 * TabMovedEvent domain event
 * Emitted when a tab is moved from one window to another
 */

import type { Tab } from "../windows/Tab";
import type { WindowId } from "../WindowName";

export interface TabMovedEvent {
    readonly type: "TAB_MOVED";
    readonly tab: Tab;
    readonly fromWindowId: WindowId;
    readonly toWindowId: WindowId;
    readonly timestamp: Date;
}

export function createTabMovedEvent(
    tab: Tab,
    fromWindowId: WindowId,
    toWindowId: WindowId
): TabMovedEvent {
    return {
        type: "TAB_MOVED",
        tab,
        fromWindowId,
        toWindowId,
        timestamp: new Date()
    };
}



