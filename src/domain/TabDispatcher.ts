import type { TabId, Url } from "./Tab.js";
import type { WindowId, WindowTag, TaggedWindow } from "./WindowTag.js";
import type { TaggingRuleSet } from "./TaggingRule.js";
import type { WindowRepository } from "../ports/WindowRepository.js";
import type { TabRepository } from "../ports/TabRepository.js";
import type { Logger } from "../ports/Logger.js";

export class TabDispatcher {
    constructor(
        private readonly rules: TaggingRuleSet,
        private readonly windowRepo: WindowRepository,
        private readonly tabRepo: TabRepository,
        private readonly logger: Logger
    ) {}

    async dispatch(tabId: TabId, url: Url): Promise<void> {
        try {
            const rule = this.rules.getRuleForUrl(url);

            // Ignore internal pages or empty URLs
            if (!rule || !rule.tag) {
                return;
            }

            const targetTag = rule.tag;
            const theme = rule.theme;

            this.logger.log(`[DISPATCH] Processing: ${url} -> ${targetTag}`);

            const tab = await this.tabRepo.getTab(tabId);
            const currentWindowId = tab.windowId;

            // 1. Get the current window's tag from storage
            const currentWindowTag = await this.windowRepo.getWindowTag(currentWindowId);

            // FALLBACK: If storage is empty (first run), log it
            if (!currentWindowTag) {
                this.logger.log(`[DISPATCH] Current window ${currentWindowId} has no tag in storage. Assuming default or tagging now.`);
            }

            // 2. CHECK: Is the current window sticky? If so, don't move tabs out of it
            if (currentWindowTag && this.rules.isTagSticky(currentWindowTag)) {
                this.logger.log(`[DISPATCH] ✓ Window ${currentWindowId} is sticky (${currentWindowTag}), not moving tab`);
                return;
            }

            // 3. CHECK: Are we already in the right place?
            if (currentWindowTag === targetTag) {
                this.logger.log(`[DISPATCH] ✓ Tab already in correct window (${targetTag})`);
                return;
            }

            // 3. SEARCH: Find an existing window with this tag
            const targetWindow = await this.findWindowWithTag(targetTag, currentWindowId);

            if (targetWindow) {
                await this.moveTabToExistingWindow(tabId, targetWindow, targetTag);
            } else {
                await this.handleNewWindow(tabId, currentWindowId, currentWindowTag, targetTag, theme);
            }
        } catch (e) {
            this.logger.error("[DISPATCH] Error:", e);
        }
    }

    private async findWindowWithTag(
        targetTag: WindowTag,
        excludeWindowId: WindowId
    ): Promise<TaggedWindow | null> {
        const allWindows = await this.windowRepo.getAllWindows();

        for (const win of allWindows) {
            // Don't move to the window we are already in
            if (win.id === excludeWindowId) {
                continue;
            }

            const winTag = await this.windowRepo.getWindowTag(win.id);
            if (winTag === targetTag) {
                return { id: win.id, tag: targetTag };
            }
        }

        return null;
    }

    private async moveTabToExistingWindow(
        tabId: TabId,
        targetWindow: TaggedWindow,
        targetTag: WindowTag
    ): Promise<void> {
        this.logger.log(`[DISPATCH] >> Moving tab to existing window ${targetWindow.id} [${targetTag}]`);

        // Remember the source window to check if it needs cleanup
        const tab = await this.tabRepo.getTab(tabId);
        const sourceWindowId = tab.windowId;

        await this.tabRepo.moveTab(tabId, targetWindow.id);
        await this.windowRepo.focusWindow(targetWindow.id);
        await this.tabRepo.activateTab(tabId);

        // Cleanup: If the source window is now empty (just blank tabs), close it
        await this.closeWindowIfEmpty(sourceWindowId);
    }

    private async handleNewWindow(
        tabId: TabId,
        currentWindowId: WindowId,
        currentWindowTag: WindowTag | null,
        targetTag: WindowTag,
        theme?: import("./TaggingRule.js").Theme
    ): Promise<void> {
        // SPECIAL CHECK: If the current window has ONLY this new tab (and maybe a blank one),
        // instead of creating a NEW window, we should just RENAME (Retag) the current one.
        const isWindowBasicallyEmpty = await this.isWindowEmpty(currentWindowId);

        if (isWindowBasicallyEmpty && !currentWindowTag) {
            // Just retag this window instead of making a new one!
            this.logger.log(`[DISPATCH] Current window is new/empty. Retagging as ${targetTag} instead of moving.`);
            await this.windowRepo.setWindowTag(currentWindowId, targetTag, theme);
        } else {
            this.logger.log(`[DISPATCH] >> Creating NEW window for ${targetTag}`);
            const newWindowId = await this.windowRepo.createWindowWithTab(tabId);
            await this.windowRepo.setWindowTag(newWindowId, targetTag, theme);
        }
    }

    private async isWindowEmpty(windowId: WindowId): Promise<boolean> {
        const tabs = await this.tabRepo.getTabsInWindow(windowId);
        return tabs.length <= 1 ||
               (tabs.length === 2 && tabs.some(t => t.url === "about:blank"));
    }

    private async closeWindowIfEmpty(windowId: WindowId): Promise<void> {
        try {
            const tabs = await this.tabRepo.getTabsInWindow(windowId);

            // If the window only has blank/new tabs, close it
            const allTabsBlank = tabs.every(t =>
                t.url === "about:blank" ||
                t.url === "about:newtab" ||
                t.url === ""
            );

            if (tabs.length > 0 && allTabsBlank) {
                this.logger.log(`[CLEANUP] Closing empty window ${windowId}`);
                await this.windowRepo.closeWindow(windowId);
            }
        } catch (e) {
            // Window might already be closed or not exist, which is fine
            this.logger.log(`[CLEANUP] Could not check/close window ${windowId}:`, e);
        }
    }
}
