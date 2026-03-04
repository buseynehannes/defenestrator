/**
 * NewWindowCreatedEvent domain event
 * Emitted when a new window is created
 */

import type { Tab } from "../windows/Tab";
import type { WindowId } from "../WindowName";
import type { NamedWindowSpecification } from "../specifications/NamedWindowSpecification";

export interface NewWindowCreatedEvent {
    readonly type: "NEW_WINDOW_CREATED";
    readonly windowId: WindowId;
    readonly tab: Tab;
    readonly specification: NamedWindowSpecification;
    readonly timestamp: Date;
}

export function createNewWindowCreatedEvent(
    windowId: WindowId,
    tab: Tab,
    specification: NamedWindowSpecification
): NewWindowCreatedEvent {
    return {
        type: "NEW_WINDOW_CREATED",
        windowId,
        tab,
        specification,
        timestamp: new Date()
    };
}

