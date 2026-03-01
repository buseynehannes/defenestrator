/**
 * BrowserStorageNamedWindowsRepository adapter
 * Implements NamedWindowsRepository using browser storage
 */

import type { NamedWindowsRepository } from "../application/ports/NamedWindowsRepository";
import type { NamedWindow } from "../domain/NamedWindow";
import type { WindowId } from "../domain/WindowName";
import type { NamedWindowSpecification } from "../domain/specifications/NamedWindowSpecification";
import type { Logger } from "../application/ports/Logger";
import { createNamedWindow } from "../domain/NamedWindow";
import { createWindow } from "../domain/Window";
import { createTab, createTabId } from "../domain/Tab";

declare const browser: typeof import("webextension-polyfill");

interface StoredNamedWindow {
    windowId: WindowId;
    specification: NamedWindowSpecification;
    tabs: Array<{ id: number; url: string }>;
}

export class BrowserStorageNamedWindowsRepository implements NamedWindowsRepository {
    private readonly storageKey = "defenestrator_named_windows";

    constructor(private readonly logger: Logger) {}

    async saveNamedWindow(namedWindow: NamedWindow): Promise<void> {
        try {
            const stored = await this.getAllStored();
            const updated = stored.filter(w => w.windowId !== namedWindow.window.id);
            updated.push({
                windowId: namedWindow.window.id,
                specification: namedWindow.specification,
                tabs: namedWindow.window.tabs.map(tab => ({ id: tab.id, url: tab.url }))
            });
            await browser.storage.local.set({
                [this.storageKey]: updated
            });
            this.logger.log(`[STORAGE] Saved NamedWindow ${namedWindow.window.id} (${namedWindow.specification.name})`);
        } catch (e) {
            this.logger.error('[STORAGE] Error saving NamedWindow:', e);
            throw e;
        }
    }

    async saveNamedWindows(namedWindows: readonly NamedWindow[]): Promise<void> {
        try {
            const stored = await this.getAllStored();
            const windowIds = new Set(namedWindows.map(w => w.window.id));
            const filtered = stored.filter(w => !windowIds.has(w.windowId));

            const toAdd = namedWindows.map(w => ({
                windowId: w.window.id,
                specification: w.specification,
                tabs: w.window.tabs.map(tab => ({ id: tab.id, url: tab.url }))
            }));

            await browser.storage.local.set({
                [this.storageKey]: [...filtered, ...toAdd]
            });
            this.logger.log(`[STORAGE] Saved ${namedWindows.length} NamedWindows`);
        } catch (e) {
            this.logger.error('[STORAGE] Error saving NamedWindows:', e);
            throw e;
        }
    }

    async getNamedWindow(windowId: WindowId): Promise<NamedWindow | null> {
        try {
            const stored = await this.getAllStored();
            const storedWindow = stored.find(w => w.windowId === windowId);

            if (!storedWindow) {
                return null;
            }

            return this.reconstructNamedWindow(storedWindow);
        } catch (e) {
            this.logger.error('[STORAGE] Error getting NamedWindow:', e);
            return null;
        }
    }

    async findNamedWindowBySpecification(specification: NamedWindowSpecification): Promise<NamedWindow | null> {
        try {
            const stored = await this.getAllStored();
            const storedWindow = stored.find(w => w.specification.name === specification.name);

            if (!storedWindow) {
                return null;
            }

            return this.reconstructNamedWindow(storedWindow);
        } catch (e) {
            this.logger.error('[STORAGE] Error finding NamedWindow by specification:', e);
            return null;
        }
    }

    async getAllNamedWindows(): Promise<readonly NamedWindow[]> {
        try {
            const stored = await this.getAllStored();
            return stored.map(storedWindow => this.reconstructNamedWindow(storedWindow));
        } catch (e) {
            this.logger.error('[STORAGE] Error getting all NamedWindows:', e);
            return [];
        }
    }

    async deleteNamedWindow(windowId: WindowId): Promise<void> {
        try {
            const stored = await this.getAllStored();
            const updated = stored.filter(w => w.windowId !== windowId);
            await browser.storage.local.set({
                [this.storageKey]: updated
            });
            this.logger.log(`[STORAGE] Deleted NamedWindow ${windowId}`);
        } catch (e) {
            this.logger.error('[STORAGE] Error deleting NamedWindow:', e);
            throw e;
        }
    }

    private reconstructNamedWindow(storedWindow: StoredNamedWindow): NamedWindow {
        const tabs = storedWindow.tabs.map(t => createTab(createTabId(t.id), t.url));
        const window = createWindow(storedWindow.windowId, tabs);
        return createNamedWindow(window, storedWindow.specification);
    }

    private async getAllStored(): Promise<StoredNamedWindow[]> {
        try {

            const result = await browser.storage.local.get(this.storageKey);
            return (result[this.storageKey] as StoredNamedWindow[]) || [];
        } catch (e) {
            this.logger.error('[STORAGE] Error reading stored NamedWindows:', e);
            return [];
        }
    }
}

