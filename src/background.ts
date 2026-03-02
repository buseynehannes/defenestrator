import { FirefoxWindowRepository } from "./adapters/FirefoxWindowRepository.js";
import { ConsoleLogger } from "./adapters/ConsoleLogger.js";
import { ConfigurationPrioritizedNamedWindowSpecificationsRepository } from "./adapters/ConfigurationPrioritizedNamedWindowSpecificationsRepository.js";
import { UpdateTabService } from "./application/services/UpdateTabService.js";
import { RestoreNamedWindowsService } from "./application/services/RestoreNamedWindowsService.js";
import { createTab, createTabId } from "./domain/Tab.js";

declare const browser: typeof import("webextension-polyfill");

// --- DEPENDENCY INJECTION / SETUP ---

const logger = new ConsoleLogger();
const windowRepository = new FirefoxWindowRepository(logger);
const prioritizedSpecsRepository = new ConfigurationPrioritizedNamedWindowSpecificationsRepository(logger);

// These will be initialized from configuration
let updateTabService: UpdateTabService;
let restoreNamedWindowsService: RestoreNamedWindowsService;

// --- CONFIGURATION INITIALIZATION ---

async function initializeConfiguration() {
    try {
        logger.log('[CONFIG] Loading configuration...');

        // Initialize UpdateTabService with repositories
        updateTabService = new UpdateTabService(windowRepository, prioritizedSpecsRepository, logger);

        // Initialize RestoreNamedWindowsService with all dependencies
        restoreNamedWindowsService = new RestoreNamedWindowsService(
            windowRepository,
            prioritizedSpecsRepository,
            logger
        );

        logger.log('[CONFIG] Configuration loaded successfully');
    } catch (e) {
        logger.error('[CONFIG] Error loading configuration:', e);
        throw e;
    }
}

// --- STARTUP ---

async function startup() {
    await initializeConfiguration();

    // Restore named windows after initialization
    if (restoreNamedWindowsService) {
        try {
            await restoreNamedWindowsService.execute();
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

// Handle tab updates - when URL changes
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url && updateTabService && tab.windowId !== undefined) {
        const handleTabUpdate = async () => {
            try {
                const window = await windowRepository.getWindow(tab.windowId!);
                const browserTab = createTab(createTabId(tabId), changeInfo.url!);
                await updateTabService.execute(browserTab, window.id);
            } catch (e) {
                logger.error('[TAB] Error handling tab update:', e);
            }
        };
        void handleTabUpdate();
    }
});

// Handle tab creation - new tabs
browser.tabs.onCreated.addListener((tab) => {
    if (tab.url && tab.url !== "about:blank" && tab.id !== undefined && tab.windowId !== undefined && updateTabService) {
        const handleTabCreation = async () => {
            try {
                const window = await windowRepository.getWindow(tab.windowId!);
                const browserTab = createTab(createTabId(tab.id!), tab.url!);
                await updateTabService.execute(browserTab, window.id);
            } catch (e) {
                logger.error('[TAB] Error handling tab creation:', e);
            }
        };
        void handleTabCreation();
    }
});

