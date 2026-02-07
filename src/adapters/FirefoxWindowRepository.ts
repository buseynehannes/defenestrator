import type { WindowRepository, BrowserWindow } from "../ports/WindowRepository.js";
import type { WindowId, WindowTag } from "../domain/WindowTag.js";
import type { TabId } from "../domain/Tab.js";
import type { Logger } from "../ports/Logger.js";
import type { Theme } from "../domain/TaggingRule.js";

declare const browser: typeof import("webextension-polyfill");

const WINDOW_TAGS_STORAGE_KEY = 'defenestrator_window_tags';

export class FirefoxWindowRepository implements WindowRepository {
    constructor(private readonly logger: Logger) {}

    async getAllWindows(): Promise<BrowserWindow[]> {
        const windows = await browser.windows.getAll({});
        return windows.map(win => ({ id: win.id as WindowId }));
    }

    async setWindowTag(windowId: WindowId, tag: WindowTag, theme?: Theme): Promise<void> {
        try {
            // Set the visual window title prefix for AeroSpace
            await browser.windows.update(windowId, { titlePreface: tag });

            // Persist the tag in storage (since titlePreface is not reliably readable)
            const storage = await browser.storage.local.get(WINDOW_TAGS_STORAGE_KEY);
            const windowTags = (storage[WINDOW_TAGS_STORAGE_KEY] as Record<number, string>) || {};
            windowTags[windowId] = tag;
            await browser.storage.local.set({ [WINDOW_TAGS_STORAGE_KEY]: windowTags });

            // Apply theme if provided
            if (theme) {
                await this.applyTheme(windowId, theme);
            }

            this.logger.log(`[TAG] Window ${windowId} tagged as ${tag}${theme ? ' with theme' : ''}`);
        } catch (e) {
            this.logger.error(`[TAG] Error setting tag for ${windowId}:`, e);
            throw e;
        }
    }

    private async applyTheme(windowId: WindowId, theme: Theme): Promise<void> {
        try {
            this.logger.log(`[THEME] Attempting to apply theme to window ${windowId}:`, theme);

            // Build theme object according to Firefox theme manifest format
            const themeData: any = {
                colors: {}
            };

            // Required for visibility - set toolbar colors
            if (theme.accentColor) {
                themeData.colors.toolbar = theme.accentColor;
                themeData.colors.toolbar_field = theme.accentColor;
            }

            if (theme.textColor) {
                themeData.colors.toolbar_text = theme.textColor;
                themeData.colors.toolbar_field_text = theme.textColor;
                themeData.colors.bookmark_text = theme.textColor;
            }

            // Optional: frame and tab colors
            if (theme.frameColor) {
                themeData.colors.frame = theme.frameColor;
                themeData.colors.tab_background_separator = theme.frameColor;
            }

            if (theme.tabBackgroundText) {
                themeData.colors.tab_background_text = theme.tabBackgroundText;
            }

            this.logger.log(`[THEME] Theme data prepared:`, themeData);

            // Apply theme to specific window (per MDN docs, windowId should work as integer)
            await browser.theme.update(windowId, themeData);
            this.logger.log(`[THEME] Theme applied successfully to window ${windowId}`);
        } catch (e) {
            this.logger.error(`[THEME] Error applying theme to window ${windowId}:`, e);
            // Don't throw - theming is not critical, but log the actual error
            this.logger.error(`[THEME] Error details:`, JSON.stringify(e));
        }
    }

    async getWindowTag(windowId: WindowId): Promise<WindowTag | null> {
        try {
            // Read from storage (titlePreface is not reliably readable via Firefox API)
            const storage = await browser.storage.local.get(WINDOW_TAGS_STORAGE_KEY);
            const windowTags = (storage[WINDOW_TAGS_STORAGE_KEY] as Record<number, string>) || {};
            return (windowTags[windowId] as WindowTag) || null;
        } catch (e) {
            this.logger.error(`[TAG] Error getting tag for ${windowId}:`, e);
            return null;
        }
    }

    async createWindowWithTab(tabId: TabId): Promise<WindowId> {
        const newWindow = await browser.windows.create({ tabId });
        return newWindow.id as WindowId;
    }

    async focusWindow(windowId: WindowId): Promise<void> {
        await browser.windows.update(windowId, { focused: true });
    }

    async closeWindow(windowId: WindowId): Promise<void> {
        await browser.windows.remove(windowId);
    }

    async removeWindowTag(windowId: WindowId): Promise<void> {
        try {
            // Remove from storage
            const storage = await browser.storage.local.get(WINDOW_TAGS_STORAGE_KEY);
            const windowTags = (storage[WINDOW_TAGS_STORAGE_KEY] as Record<number, string>) || {};
            delete windowTags[windowId];
            await browser.storage.local.set({ [WINDOW_TAGS_STORAGE_KEY]: windowTags });
            this.logger.log(`[TAG] Removed tag for window ${windowId}`);
        } catch (e) {
            this.logger.error(`[TAG] Error removing tag for ${windowId}:`, e);
        }
    }
}
