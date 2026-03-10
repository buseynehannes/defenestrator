/**
 * Window tagging/classification types
 * Used to identify and classify windows by user-defined tags
 */

export type WindowId = string & { readonly __brand: "WindowId" };
export type WindowName = string & { readonly __brand: "WindowTag" };

/**
 * Generate a new WindowId using UUID v4
 */
export function generateWindowId(): WindowId {
    return `${crypto.randomUUID()}` as WindowId;
}

