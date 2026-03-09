import { vi } from 'vitest';
import type { NamedWindows } from '../../domain/NamedWindows';
import type { NamedWindowsRepository } from '../ports/out/NamedWindowsRepository';
import type { PrioritizedNamedWindowSpecificationsRepository } from '../ports/out/PrioritizedNamedWindowSpecificationsRepository';
import type { WindowRepository } from '../ports/out/WindowRepository';
import type { Logger } from '../ports/Logger';
import type { WindowId, WindowName } from '../../domain/WindowName';
import { createTab, createTabId } from '../../domain/windows/Tab';
import { createWindow } from '../../domain/windows/Window';
import { createNamedWindowSpecification } from '../../domain/specifications/NamedWindowSpecification';
import { createDefaultNamedWindowSpecification } from '../../domain/specifications/DefaultNamedWindowSpecification';
import { createTabSpecification } from '../../domain/specifications/TabSpecification';
import { createGlobalIgnoredUrls } from '../../domain/specifications/GlobalIgnoredUrls';
import { createPrioritizedNamedWindowSpecifications } from '../../domain/specifications/PrioritizedNamedWindowSpecifications';

// --- Primitive helpers ---

export const windowId = (id: string) => id as WindowId;
export const tab = (id: number, url: string) => createTab(createTabId(id), url);

// --- Shared test fixtures ---

export const emailSpec = createNamedWindowSpecification(
    '[EMAIL]' as WindowName,
    [createTabSpecification('mail.google.com')],
    { accentColor: '#4285f4', textColor: '#fff', frameColor: '#2d579f' }
);
export const defaultSpec = createDefaultNamedWindowSpecification('[DEFAULT]' as WindowName);
export const prioritizedSpecs = createPrioritizedNamedWindowSpecifications(
    [emailSpec, defaultSpec],
    createGlobalIgnoredUrls(['about:'])
);

// --- Mock factories ---

export function makeLogger(): Logger {
    return { log: vi.fn(), error: vi.fn() };
}

export function makeNamedWindows(overrides: Partial<NamedWindows> = {}): NamedWindows {
    return {
        getSpecifications: vi.fn().mockReturnValue([]),
        getWindowId: vi.fn().mockReturnValue(null),
        hasWindow: vi.fn().mockReturnValue(false),
        getEvents: vi.fn().mockReturnValue([]),
        getAndClearEvents: vi.fn().mockReturnValue([]),
        updateTab: vi.fn().mockReturnThis(),
        moveTab: vi.fn().mockReturnThis(),
        clearWindow: vi.fn().mockReturnThis(),
        ...overrides,
    };
}

export function makeNamedWindowsRepository(namedWindows: NamedWindows | null = null): NamedWindowsRepository {
    return {
        get: vi.fn().mockResolvedValue(namedWindows),
        save: vi.fn().mockResolvedValue(undefined),
    };
}

export function makeWindowRepository(overrides: Partial<WindowRepository> = {}): WindowRepository {
    return {
        getAllWindows: vi.fn().mockResolvedValue([]),
        getWindow: vi.fn().mockResolvedValue(createWindow(windowId('win-a'), [])),
        getWindowByDomainId: vi.fn().mockResolvedValue(null),
        openWindow: vi.fn().mockResolvedValue(undefined),
        setTheme: vi.fn().mockResolvedValue(undefined),
        setTitlePrefix: vi.fn().mockResolvedValue(undefined),
        moveTab: vi.fn().mockResolvedValue(undefined),
        closeWindow: vi.fn().mockResolvedValue(undefined),
        ...overrides,
    };
}

export function makeSpecsRepository(
    specs = prioritizedSpecs
): PrioritizedNamedWindowSpecificationsRepository {
    return {
        getPrioritizedSpecifications: vi.fn().mockResolvedValue(specs),
        savePrioritizedSpecifications: vi.fn().mockResolvedValue(undefined),
    };
}

