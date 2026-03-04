import { FirefoxWindowRepository } from "./adapters/FirefoxWindowRepository.js";
import { ConsoleLogger } from "./adapters/ConsoleLogger.js";
import { ConfigurationPrioritizedNamedWindowSpecificationsRepository } from "./adapters/ConfigurationPrioritizedNamedWindowSpecificationsRepository.js";
import { InMemoryNamedWindowsRepository } from "./adapters/InMemoryNamedWindowsRepository.js";
import { UpdateTabService } from "./application/services/UpdateTabService.js";
import { RestoreNamedWindowsService } from "./application/services/RestoreNamedWindowsService.js";
import { HandleTabMovedService } from "./application/services/HandleTabMovedService.js";
import { HandleNewWindowCreatedService } from "./application/services/HandleNewWindowCreatedService.js";
import { HandleWindowSpecAssignedService } from "./application/services/HandleWindowSpecAssignedService.js";
import { CloseWindowService } from "./application/services/CloseWindowService.js";
import { createTab, createTabId } from "./domain/windows/Tab";

declare const browser: typeof import("webextension-polyfill");

// --- DEPENDENCY INJECTION / SETUP ---

const logger = new ConsoleLogger();
const windowRepository = new FirefoxWindowRepository(logger);
const prioritizedSpecsRepository = new ConfigurationPrioritizedNamedWindowSpecificationsRepository(logger);
const namedWindowsRepository = new InMemoryNamedWindowsRepository(logger);

const updateTabService = new UpdateTabService(namedWindowsRepository, logger);
const restoreNamedWindowsService = new RestoreNamedWindowsService(windowRepository, prioritizedSpecsRepository, namedWindowsRepository, logger);

const handleTabMovedService = new HandleTabMovedService(windowRepository, logger);
const handleNewWindowCreatedService = new HandleNewWindowCreatedService(windowRepository, logger);
const handleWindowSpecAssignedService = new HandleWindowSpecAssignedService(windowRepository, logger);
const closeWindowService = new CloseWindowService(namedWindowsRepository, logger);

namedWindowsRepository.onEvent(event => {
    switch (event.type) {
        case 'TAB_MOVED':            return handleTabMovedService.execute(event);
        case 'NEW_WINDOW_CREATED':   return handleNewWindowCreatedService.execute(event);
        case 'WINDOW_SPEC_ASSIGNED': return handleWindowSpecAssignedService.execute(event);
    }
});

// --- STARTUP ---

// Async mutex — ensures browser events are processed one at a time
let processingChain = Promise.resolve();
function enqueue(fn: () => Promise<void>): void {
    processingChain = processingChain.then(fn).catch(() => {});
}

async function startup() {
    try {
        await restoreNamedWindowsService.execute();
    } catch (e) {
        logger.error('[STARTUP] Error during window restoration:', e);
    }
}

// Run on extension startup (Firefox restart or extension reload)
browser.runtime.onStartup.addListener(() => {
    enqueue(startup);
});

// Also run immediately when extension loads
enqueue(startup);

// --- BROWSER EVENT LISTENERS ---

// Listen for configuration changes from the options page — reset the aggregate so next tab event re-bootstraps
browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.defenestrator_config) {
        logger.log('[CONFIG] Configuration changed, re-restoring windows...');
        enqueue(startup);
    }
});

// Handle tab updates - when URL changes
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url && tab.windowId !== undefined) {
        enqueue(async () => {
            try {
                const window = await windowRepository.getWindow(tab.windowId!);
                const browserTab = createTab(createTabId(tabId), changeInfo.url!);
                await updateTabService.execute(browserTab, window.id);
            } catch (e) {
                logger.error('[TAB] Error handling tab update:', e);
            }
        });
    }
});

// Handle tab creation - new tabs
browser.tabs.onCreated.addListener((tab) => {
    if (tab.url && tab.url !== "about:blank" && tab.id !== undefined && tab.windowId !== undefined) {
        enqueue(async () => {
            try {
                const window = await windowRepository.getWindow(tab.windowId!);
                const browserTab = createTab(createTabId(tab.id!), tab.url!);
                await updateTabService.execute(browserTab, window.id);
            } catch (e) {
                logger.error('[TAB] Error handling tab creation:', e);
            }
        });
    }
});

// Handle window closes — clear the assignment so the spec can be re-used
browser.windows.onRemoved.addListener((firefoxWindowId) => {
    const windowId = windowRepository.resolveWindowId(firefoxWindowId);
    if (windowId) {
        enqueue(() => closeWindowService.execute(windowId).catch(e => {
            logger.error('[WINDOW] Error handling window close:', e);
        }));
    }
});

