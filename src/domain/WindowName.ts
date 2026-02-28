/**
 * Window tagging/classification types
 * Used to identify and classify windows by user-defined tags
 */

export type WindowId = number & { readonly __brand: "WindowId" };
export type WindowName = string & { readonly __brand: "WindowTag" };

export function createWindowId(id: number): WindowId {
    return id as WindowId;
}

export function createWindowTag(tag: string): WindowName {
    return tag as WindowName;
}

