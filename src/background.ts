import { TabDispatcher } from "./domain/TabDispatcher.js";
import { Window } from "./domain/Window";
import { FirefoxWindowRepository } from "./adapters/FirefoxWindowRepository.js";
import { FirefoxWindowDefinitionRepository } from "./adapters/FirefoxWindowDefinitionRepository.js";
import { FirefoxTabRepository } from "./adapters/FirefoxTabRepository.js";
import { ConsoleLogger } from "./adapters/ConsoleLogger.js";
import { BrowserStorageConfigurationStore } from "./adapters/BrowserStorageConfigurationStore.js";
import { PrioritizedWindowSetFactory } from "./domain/PrioritizedWindowSet";
import type { TabId } from "./domain/Tab.js";
import type { WindowId } from "./domain/WindowName";

declare const browser: typeof import("webextension-polyfill");

// --- DEPENDENCY INJECTION / SETUP ---

const logger = new ConsoleLogger();
const windowRepo = new FirefoxWindowRepository(logger);
const windowDefRepo = new FirefoxWindowDefinitionRepository(logger);
const tabRepo = new FirefoxTabRepository();
const configStore = new BrowserStorageConfigurationStore();

// These will be initialized from configuration
let dispatcher: TabDispatcher;
let prioritizedWindowSet: ReturnType<typeof PrioritizedWindowSetFactory.create>;

// --- CONFIGURATION INITIALIZATION ---

async function initializeConfiguration() {
    try {
        logger.log('[CONFIG] Loading configuration...');
        const configData = await configStore.getConfiguration();

        // Create the prioritized window set with the domain models
        prioritizedWindowSet = PrioritizedWindowSetFactory.create(
            configData.windows,
            configData.defaultWindowTag,
            configData.defaultWindowTheme,
            configData.ignoredUrlPatterns
        );

        dispatcher = new TabDispatcher(prioritizedWindowSet, windowRepo, windowDefRepo, tabRepo, logger);
        logger.log('[CONFIG] Configuration loaded successfully');
    } catch (e) {
        logger.error('[CONFIG] Error loading configuration:', e);
        throw e;
    }
}

// --- STARTUP: Restore window tags after restart ---

async function restoreWindowTags() {
    try {
        logger.log('[STARTUP] Restoring window tags...');
        const windows = await windowRepo.getAllWindows();

        for (const window of windows) {
            // Analyze the window's tabs and tag it based on content
            const tabs = await tabRepo.getTabsInWindow(window.id);
            if (tabs.length > 0) {
                // Probabilistic detection: count which tags appear most in this window
                const tagCounts = new Map<string, { count: number; windowDef: any }>();

                for (const tab of tabs) {
                    const windowDetails = prioritizedWindowSet.getWindowDetailsForUrl(tab.url);

                    if (windowDetails && windowDetails.tag) {
                        const current = tagCounts.get(windowDetails.tag) || { count: 0, windowDef: windowDetails };
                        tagCounts.set(windowDetails.tag, { count: current.count + 1, windowDef: windowDetails });
                    }
                }

                // Find the most common tag
                let mostCommonTag: string | null = null;
                let mostCommonWindowDef: any = null;
                let maxCount = 0;

                for (const [tag, data] of tagCounts.entries()) {
                    if (data.count > maxCount) {
                        maxCount = data.count;
                        mostCommonTag = tag;
                        mostCommonWindowDef = data.windowDef;
                    }
                }

                if (mostCommonTag && mostCommonWindowDef) {
                    const windowDef = prioritizedWindowSet.findWindowByTag(mostCommonTag);
                    if (windowDef) {
                        const windowObj = new Window(window.id, windowDef);
                        await windowDefRepo.setWindowDefinition(window.id, windowObj);
                        await windowRepo.applyWindowDefinition(window.id, windowObj);
                        const stickyNote = windowDef.isSticky() ? ' (sticky)' : '';
                        logger.log(`[STARTUP] Tagged window ${window.id} as ${mostCommonTag}${stickyNote} based on ${maxCount}/${tabs.length} tabs`);
                    }
                }
            }
        }

        logger.log('[STARTUP] ClassifiedWindow tag restoration complete');
    } catch (e) {
        logger.error('[STARTUP] Error restoring window tags:', e);
    }
}

// Initialize configuration first, then restore tags
async function startup() {
    await initializeConfiguration();
    await restoreWindowTags();
}

// Run on extension startup (Firefox restart or extension reload)
browser.runtime.onStartup.addListener(() => {
    void startup();
});

// Also run immediately when extension loads
void startup();

// --- BROWSER EVENT LISTENERS ---

// Listen for configuration changes from the options page
browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.defenestrator_config) {
        logger.log('[CONFIG] Configuration changed, reloading...');
        void initializeConfiguration();
    }
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, _tab) => {
    if (changeInfo.url && dispatcher) {
        void dispatcher.dispatch(tabId as TabId, changeInfo.url);
    }
});

browser.tabs.onCreated.addListener((tab) => {
    if (tab.url && tab.url !== "about:blank" && tab.id !== undefined && dispatcher) {
        void dispatcher.dispatch(tab.id as TabId, tab.url);
    }
});

// CLEANUP: Remove tags when windows close
browser.windows.onRemoved.addListener((windowId) => {
    void windowDefRepo.removeWindowDefinition(windowId as WindowId);
});
