import {FirefoxWindowRepository} from "./adapters/FirefoxWindowRepository.js";
import {ConsoleLogger} from "./adapters/ConsoleLogger.js";
import {
    ConfigurationPrioritizedNamedWindowSpecificationsRepository
} from "./adapters/ConfigurationPrioritizedNamedWindowSpecificationsRepository.js";
import {SessionStorageNamedWindowsRepository} from "./adapters/SessionStorageNamedWindowsRepository.js";
import {UpdateTabService} from "./application/services/UpdateTabService.js";
import {RestoreNamedWindowsService} from "./application/services/RestoreNamedWindowsService.js";
import {HandleTabMovedService} from "./application/services/HandleTabMovedService.js";
import {HandleNewWindowCreatedService} from "./application/services/HandleNewWindowCreatedService.js";
import {HandleWindowSpecAssignedService} from "./application/services/HandleWindowSpecAssignedService.js";
import {CloseWindowService} from "./application/services/CloseWindowService.js";
import {GetCurrentWindowSpecService} from "./application/services/GetCurrentWindowSpecService.js";
import {ToggleCurrentWindowStickyService} from "./application/services/ToggleCurrentWindowStickyService.js";
import {createTab, createTabId} from "./domain/windows/Tab";

declare const browser: typeof import("webextension-polyfill");

// --- DEPENDENCY INJECTION / SETUP ---

const logger = new ConsoleLogger();
const windowRepository = new FirefoxWindowRepository(logger);
const prioritizedSpecsRepository = new ConfigurationPrioritizedNamedWindowSpecificationsRepository(logger);
const namedWindowsRepository = new SessionStorageNamedWindowsRepository(prioritizedSpecsRepository, logger);

const updateTabService = new UpdateTabService(namedWindowsRepository, logger);
const restoreNamedWindowsService = new RestoreNamedWindowsService(windowRepository, prioritizedSpecsRepository, namedWindowsRepository, logger);

const handleTabMovedService = new HandleTabMovedService(windowRepository, logger);
const handleNewWindowCreatedService = new HandleNewWindowCreatedService(windowRepository, logger);
const handleWindowSpecAssignedService = new HandleWindowSpecAssignedService(windowRepository, logger);
const closeWindowService = new CloseWindowService(namedWindowsRepository, logger);
const getCurrentWindowSpecService = new GetCurrentWindowSpecService(windowRepository, namedWindowsRepository, logger);
const toggleCurrentWindowStickyService = new ToggleCurrentWindowStickyService(windowRepository, namedWindowsRepository, prioritizedSpecsRepository, logger);

namedWindowsRepository.onEvent(event => {
    switch (event.type) {
        case 'TAB_MOVED':
            return handleTabMovedService.execute(event);
        case 'NEW_WINDOW_CREATED':
            return handleNewWindowCreatedService.execute(event);
        case 'WINDOW_SPEC_ASSIGNED':
            return handleWindowSpecAssignedService.execute(event);
    }
});

// --- STARTUP ---

async function retry<T>(fn: () => Promise<T>, attempts = 4, delayMs = 50): Promise<T> {
    for (let i = 0; i < attempts; i++) {
        try {
            return await fn();
        } catch (e) {
            if (i === attempts - 1) throw e;
            await new Promise(resolve => setTimeout(resolve, delayMs * 2 ** i));
        }
    }
    throw new Error('retry exhausted');
}

// Async mutex — ensures browser events are processed one at a time
let processingChain: Promise<unknown> = Promise.resolve();

function enqueue(fn: () => Promise<void>): void {
    processingChain = processingChain.then(fn).catch(() => {});
}

function enqueueAndReturn<T>(fn: () => Promise<T>): Promise<T> {
    const result = processingChain.then(() => fn());
    // Keep the chain moving even if this call rejects
    processingChain = result.catch(() => {});
    return result;
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

// Listen for configuration changes from the options page — clear and re-restore windows
browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.defenestrator_config) {
        logger.log('[CONFIG] Configuration changed, re-restoring windows...');
        enqueue(async () => {
            await namedWindowsRepository.clear();
            await startup();
        });
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


// Handle tab attached to a window (dragged into an existing window or out to a new one)
browser.tabs.onAttached.addListener((tabId, attachInfo) => {
    enqueue(async () => {
        try {
            // Retrying fetching the tab because sometimes this triggers too soon.
            const tab = await retry(() => browser.tabs.get(tabId));
            if (!tab.url || tab.url === "about:blank") return;
            const window = await windowRepository.getWindow(attachInfo.newWindowId);
            const browserTab = createTab(createTabId(tabId), tab.url);
            await updateTabService.execute(browserTab, window.id);
        } catch (e) {
            logger.error('[TAB] Error handling tab attach:', e);
        }
    });
});

// Handle window closes — clear the assignment so the spec can be re-used
browser.windows.onRemoved.addListener((firefoxWindowId) => {
    enqueue(async () => {
        const windowId = await windowRepository.resolveWindowId(firefoxWindowId);
        if (windowId) {
            await closeWindowService.execute(windowId).catch(e => {
                logger.error('[WINDOW] Error handling window close:', e);
            });
        }
    });
});

// --- POPUP MESSAGES ---

browser.runtime.onMessage.addListener((message: unknown) => {
    const msg = message as { type: string; windowId?: number };
    if (msg.type === 'GET_CURRENT_WINDOW_SPEC' && msg.windowId !== undefined) {
        return enqueueAndReturn(() => getCurrentWindowSpecService.execute(msg.windowId!));
    }
    if (msg.type === 'TOGGLE_STICKY' && msg.windowId !== undefined) {
        return enqueueAndReturn(() => toggleCurrentWindowStickyService.execute(msg.windowId!));
    }
    return undefined;
});

// --- KEYBOARD SHORTCUTS ---

browser.commands.onCommand.addListener((command) => {
    if (command === 'toggle-sticky') {
        enqueue(async () => {
            try {
                const win = await browser.windows.getCurrent();
                const spec = await toggleCurrentWindowStickyService.execute(win.id as number);
                if (spec) {
                    const message = spec.sticky
                        ? `"${spec.name}" is now sticky — tabs won't be moved out.`
                        : `"${spec.name}" is no longer sticky.`;
                    await browser.notifications.create({
                        type: 'basic',
                        iconUrl: 'icons/icon.svg',
                        title: 'Defenestrator',
                        message,
                    });
                }
            } catch (e) {
                logger.error('[COMMAND] Error toggling sticky:', e);
            }
        });
    }
});
