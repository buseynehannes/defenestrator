import { FirefoxWindowRepository } from "./adapters/FirefoxWindowRepository.js";
import { ConsoleLogger } from "./adapters/ConsoleLogger.js";
import { BrowserStorageNamedWindowsRepository } from "./adapters/BrowserStorageNamedWindowsRepository.js";
import { ConfigurationPrioritizedNamedWindowSpecificationsRepository } from "./adapters/ConfigurationPrioritizedNamedWindowSpecificationsRepository.js";
import { TabUpdatedService } from "./application/services/TabUpdatedService.js";
import { RestoreWindowTagsService } from "./application/services/RestoreWindowTagsService.js";
import type { WindowId } from "./domain/WindowName";
import { createTab, createTabId } from "./domain/Tab.js";

declare const browser: typeof import("webextension-polyfill");

// --- DEPENDENCY INJECTION / SETUP ---

const logger = new ConsoleLogger();
const windowRepository = new FirefoxWindowRepository(logger);
const namedWindowsRepository = new BrowserStorageNamedWindowsRepository(logger);

// These will be initialized from configuration
let tabUpdatedService: TabUpdatedService;
let restoreWindowTagsService: RestoreWindowTagsService;

// --- CONFIGURATION INITIALIZATION ---

async function initializeConfiguration() {
    try {
        logger.log('[CONFIG] Loading configuration...');

        // Initialize TabUpdatedService with the configuration-based repository
        const prioritizedSpecsRepository = new ConfigurationPrioritizedNamedWindowSpecificationsRepository(logger);
        tabUpdatedService = new TabUpdatedService(namedWindowsRepository, prioritizedSpecsRepository, logger);

        // Initialize RestoreWindowTagsService with TabUpdatedService
        restoreWindowTagsService = new RestoreWindowTagsService(windowRepository, namedWindowsRepository, tabUpdatedService, logger);

        logger.log('[CONFIG] Configuration loaded successfully');
    } catch (e) {
        logger.error('[CONFIG] Error loading configuration:', e);
        throw e;
    }
}

// --- STARTUP ---

async function startup() {
    await initializeConfiguration();

    // Restore window tags after initialization
    if (restoreWindowTagsService) {
        try {
            const prioritizedSpecsRepository = new ConfigurationPrioritizedNamedWindowSpecificationsRepository(logger);
            const prioritizedSpecs = await prioritizedSpecsRepository.getPrioritizedSpecifications();

            if (prioritizedSpecs) {
                await restoreWindowTagsService.execute(prioritizedSpecs);
            } else {
                logger.log('[STARTUP] No prioritized specifications available, skipping window restoration');
            }
        } catch (e) {
            logger.error('[STARTUP] Error during window restoration:', e);
        }
    }
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

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url && tabUpdatedService && tab.windowId !== undefined) {
        const browserTab = createTab(createTabId(tabId), changeInfo.url);
        void tabUpdatedService.execute(browserTab, tab.windowId as WindowId);
    }
});

browser.tabs.onCreated.addListener((tab) => {
    if (tab.url && tab.url !== "about:blank" && tab.id !== undefined && tab.windowId !== undefined && tabUpdatedService) {
        const browserTab = createTab(createTabId(tab.id), tab.url);
        void tabUpdatedService.execute(browserTab, tab.windowId as WindowId);
    }
});

