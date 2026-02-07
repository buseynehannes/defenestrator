import { TaggingRuleSet } from "./domain/TaggingRule.js";
import { TabDispatcher } from "./domain/TabDispatcher.js";
import { FirefoxWindowRepository } from "./adapters/FirefoxWindowRepository.js";
import { FirefoxTabRepository } from "./adapters/FirefoxTabRepository.js";
import { ConsoleLogger } from "./adapters/ConsoleLogger.js";
import { BrowserStorageConfigurationStore } from "./adapters/BrowserStorageConfigurationStore.js";
import type { TabId } from "./domain/Tab.js";
import type { WindowId } from "./domain/WindowTag.js";

declare const browser: typeof import("webextension-polyfill");

// --- DEPENDENCY INJECTION / SETUP ---

const logger = new ConsoleLogger();
const windowRepo = new FirefoxWindowRepository(logger);
const tabRepo = new FirefoxTabRepository();
const configStore = new BrowserStorageConfigurationStore();

// These will be initialized from configuration
let ruleSet: TaggingRuleSet;
let dispatcher: TabDispatcher;

// --- CONFIGURATION INITIALIZATION ---

async function initializeConfiguration() {
    try {
        logger.log('[CONFIG] Loading configuration...');
        const config = await configStore.getConfiguration();
        ruleSet = new TaggingRuleSet(config.rules);
        dispatcher = new TabDispatcher(ruleSet, windowRepo, tabRepo, logger);
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
                const tagCounts = new Map<string, { count: number; rule: any }>();

                for (const tab of tabs) {
                    const rule = ruleSet.getRuleForUrl(tab.url);
                    if (rule && rule.tag) {
                        const current = tagCounts.get(rule.tag) || { count: 0, rule };
                        tagCounts.set(rule.tag, { count: current.count + 1, rule });
                    }
                }

                // Find the most common tag
                let mostCommonTag: string | null = null;
                let mostCommonRule: any = null;
                let maxCount = 0;

                for (const [tag, data] of tagCounts.entries()) {
                    if (data.count > maxCount) {
                        maxCount = data.count;
                        mostCommonTag = tag;
                        mostCommonRule = data.rule;
                    }
                }

                if (mostCommonTag && mostCommonRule) {
                    await windowRepo.setWindowTag(window.id, mostCommonTag, mostCommonRule.theme);
                    const stickyNote = mostCommonRule.sticky ? ' (sticky)' : '';
                    logger.log(`[STARTUP] Tagged window ${window.id} as ${mostCommonTag}${stickyNote} based on ${maxCount}/${tabs.length} tabs`);
                }
            }
        }

        logger.log('[STARTUP] Window tag restoration complete');
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
    void windowRepo.removeWindowTag(windowId as WindowId);
});
