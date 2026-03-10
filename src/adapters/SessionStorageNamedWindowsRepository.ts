/**
 * SessionStorageNamedWindowsRepository adapter
 * Persists the WindowId->WindowName map in browser.session storage so the aggregate
 * survives event-page restarts. Dispatches domain events on save.
 */

import type { NamedWindows } from "../domain/NamedWindows";
import { createNamedWindows } from "../domain/NamedWindows";
import type { NamedWindowsRepository, NamedWindowsEventHandler } from "../application/ports/out/NamedWindowsRepository";
import type { PrioritizedNamedWindowSpecificationsRepository } from "../application/ports/out/PrioritizedNamedWindowSpecificationsRepository";
import type { Logger } from "../application/ports/Logger";
import type { WindowId, WindowName } from "../domain/WindowName";

declare const browser: typeof import("webextension-polyfill");

const STORAGE_KEY = "defenestrator_window_map";

export class SessionStorageNamedWindowsRepository implements NamedWindowsRepository {
    private readonly handlers: NamedWindowsEventHandler[] = [];

    constructor(
        private readonly specsRepository: PrioritizedNamedWindowSpecificationsRepository,
        private readonly logger: Logger
    ) {}

    async get(): Promise<NamedWindows | null> {
        const specs = await this.specsRepository.getPrioritizedSpecifications();
        if (!specs) {
            this.logger.log('[NAMED_WINDOWS] Getting aggregate — no specs available');
            return null;
        }

        const result = await browser.storage.session.get(STORAGE_KEY);
        const raw = result[STORAGE_KEY] as Record<string, string> | undefined;

        if (!raw) {
            this.logger.log('[NAMED_WINDOWS] Getting aggregate — not yet initialized');
            return null;
        }

        const windowIdMap = new Map<WindowId, WindowName>(
            Object.entries(raw).map(([k, v]) => [k as WindowId, v as WindowName])
        );

        this.logger.log('[NAMED_WINDOWS] Getting aggregate — initialized');
        return createNamedWindows(specs, windowIdMap);
    }

    async save(namedWindows: NamedWindows): Promise<void> {
        const events = namedWindows.getAndClearEvents();

        const windowIdMap: Record<string, string> = {};
        for (const spec of namedWindows.getSpecifications()) {
            const windowId = namedWindows.getWindowId(spec);
            if (windowId) {
                windowIdMap[windowId] = spec.name;
            }
        }

        await browser.storage.session.set({ [STORAGE_KEY]: windowIdMap });
        this.logger.log(`[NAMED_WINDOWS] Saved aggregate — ${namedWindows.getSpecifications().length} specification(s), ${events.length} event(s) to dispatch`);

        for (const event of events) {
            this.logger.log(`[NAMED_WINDOWS] Dispatching event: ${event.type}`);
            for (const handler of this.handlers) {
                await Promise.resolve(handler(event));
            }
        }
    }

    async clear(): Promise<void> {
        await browser.storage.session.remove(STORAGE_KEY);
        this.logger.log('[NAMED_WINDOWS] Aggregate cleared');
    }

    onEvent(handler: NamedWindowsEventHandler): void {
        this.handlers.push(handler);
    }
}

