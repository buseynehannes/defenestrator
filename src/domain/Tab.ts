export type TabId = number;
export type Url = string;

export interface Tab {
    readonly id: TabId;
    readonly url: Url;
    readonly windowId: number;
}

export function isInternalUrl(url: Url, ignoredPatterns: readonly string[]): boolean {
    return ignoredPatterns.some(pattern => url.startsWith(pattern));
}
