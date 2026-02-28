/**
 * Tab domain model
 * Represents a browser tab with its identity and URL
 */

export type TabId = number & { readonly __brand: "TabId" };

export function createTabId(id: number): TabId {
    return id as TabId;
}

export interface Tab {
    readonly id: TabId;
    readonly url: string;
}

export function createTab(id: TabId, url: string): Tab {
    return {
        id,
        url
    };
}

