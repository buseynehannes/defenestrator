export type WindowTag = string;
export type WindowId = number;

export interface TaggedWindow {
    readonly id: WindowId;
    readonly tag: WindowTag;
}

export const DEFAULT_TAG: WindowTag = "[RESEARCH]";

