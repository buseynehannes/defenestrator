import type {WindowRepository} from "../application/ports/WindowRepository.js";
import type {TabId} from "../domain/Tab.js";
import { createTab } from "../domain/Tab.js";
import type {Logger} from "../application/ports/Logger.js";
import type {WindowId} from "../domain/WindowName";
import type { Window } from "../domain/Window.js";
import { createWindow } from "../domain/Window.js";

declare const browser: typeof import("webextension-polyfill");

/**
 * Firefox adapter for WindowRepository
 * Handles actual Firefox window operations (create, focus, close, visual properties)
 */
export class FirefoxWindowRepository implements WindowRepository {
    constructor(private readonly logger: Logger) {
    }

    async getAllWindows(): Promise<Window[]> {
        const windows = await browser.windows.getAll({});
        return Promise.all(
            windows.flatMap(window => this.getWindow(window.id as WindowId))
        );
    }

    async getWindow(windowId: WindowId): Promise<Window> {
        const tabs = await browser.tabs.query({windowId});
        const tabObjects = tabs.map(tab =>
            createTab(tab.id as TabId, tab.url ?? "")
        );
        return createWindow(windowId, tabObjects);
    }

    async createWindowWithTab(tabId: TabId): Promise<WindowId> {
        const newWindow = await browser.windows.create({tabId});
        return newWindow.id as WindowId;
    }

    async focusWindow(windowId: WindowId): Promise<void> {
        await browser.windows.update(windowId, {focused: true});
    }

    async closeWindow(windowId: WindowId): Promise<void> {
        await browser.windows.remove(windowId);
    }

    // async applyWindowDefinition(windowId: WindowId, window: Window): Promise<void> {
    //     try {
    //         const tag = window.getTag();
    //         const theme = window.getTheme();
    //
    //         // Set the visual window title prefix
    //         await browser.windows.update(windowId, {titlePreface: tag});
    //
    //         // Apply theme if defined
    //         if (theme) {
    //             await this.applyTheme(windowId, theme);
    //         }
    //
    //         this.logger.log(`[WINDOW] Applied definition to window ${windowId}: ${tag}${theme ? ' with theme' : ''}`);
    //     } catch (e) {
    //         this.logger.error(`[WINDOW] Error applying definition to window ${windowId}:`, e);
    //         throw e;
    //     }
    // }

    // private async applyTheme(windowId: WindowId, theme: Theme): Promise<void> {
    //     try {
    //         this.logger.log(`[THEME] Applying theme to window ${windowId}:`, theme);
    //
    //         // Build theme object according to Firefox theme manifest format
    //         const themeData: any = {
    //             colors: {}
    //         };
    //
    //         // Required for visibility - set toolbar colors
    //         if (theme.accentColor) {
    //             themeData.colors.toolbar = theme.accentColor;
    //             themeData.colors.toolbar_field = theme.accentColor;
    //         }
    //
    //         if (theme.textColor) {
    //             themeData.colors.toolbar_text = theme.textColor;
    //             themeData.colors.toolbar_field_text = theme.textColor;
    //             themeData.colors.bookmark_text = theme.textColor;
    //         }
    //
    //         // Optional: frame and tab colors
    //         if (theme.frameColor) {
    //             themeData.colors.frame = theme.frameColor;
    //             themeData.colors.tab_background_separator = theme.frameColor;
    //         }
    //
    //         if (theme.tabBackgroundText) {
    //             themeData.colors.tab_background_text = theme.tabBackgroundText;
    //         }
    //
    //         this.logger.log(`[THEME] Theme data prepared:`, themeData);
    //
    //         // Apply theme to specific window
    //         await browser.theme.update(windowId, themeData);
    //         this.logger.log(`[THEME] Theme applied successfully to window ${windowId}`);
    //     } catch (e) {
    //         this.logger.error(`[THEME] Error applying theme to window ${windowId}:`, e);
    //         // Don't throw - theming is not critical
    //     }
    // }
}



