/**
 * WindowSpecAssignedEvent domain event
 * Emitted when a NamedWindowSpecification is assigned to a WindowId
 */

import type { WindowId } from "../WindowName";
import type { NamedWindowSpecification } from "../specifications/NamedWindowSpecification";

export interface WindowSpecAssignedEvent {
    readonly type: "WINDOW_SPEC_ASSIGNED";
    readonly windowId: WindowId;
    readonly specification: NamedWindowSpecification;
    readonly timestamp: Date;
}

export function createWindowSpecAssignedEvent(
    windowId: WindowId,
    specification: NamedWindowSpecification
): WindowSpecAssignedEvent {
    return {
        type: "WINDOW_SPEC_ASSIGNED",
        windowId,
        specification,
        timestamp: new Date()
    };
}

