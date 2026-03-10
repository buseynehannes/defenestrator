import {describe, it, expect} from 'vitest';
import {createNamedWindows, nameWindows} from './NamedWindows';
import {createNamedWindowSpecification} from './specifications/NamedWindowSpecification';
import {createDefaultNamedWindowSpecification} from './specifications/DefaultNamedWindowSpecification';
import {createTabSpecification} from './specifications/TabSpecification';
import {createGlobalIgnoredUrls} from './specifications/GlobalIgnoredUrls';
import {createPrioritizedNamedWindowSpecifications} from './specifications/PrioritizedNamedWindowSpecifications';
import {createTab, createTabId} from './windows/Tab';
import {createWindow} from './windows/Window';
import type {WindowId, WindowName} from './WindowName';

// --- Test helpers ---

const emailSpec = createNamedWindowSpecification(
    '[EMAIL]' as WindowName,
    [createTabSpecification('mail.google.com')]
);
const defaultSpec = createDefaultNamedWindowSpecification('[DEFAULT]' as WindowName);
const globalIgnoredUrls = createGlobalIgnoredUrls(['about:', 'moz-extension:']);
const prioritizedSpecs = createPrioritizedNamedWindowSpecifications([emailSpec, defaultSpec], globalIgnoredUrls);

const tab = (id: number, url: string) => createTab(createTabId(id), url);
const windowId = (id: string) => id as WindowId;

const WIN_A = windowId('win-a');
const WIN_B = windowId('win-b');

// --- Tests ---

describe('createNamedWindows', () => {
    describe('constraints', () => {
        it('accepts an empty map', () => {
            expect(() => createNamedWindows(prioritizedSpecs)).not.toThrow();
        });

        it('accepts a valid map with one entry', () => {
            const map = new Map([[WIN_A, '[DEFAULT]' as WindowName]]);
            expect(() => createNamedWindows(prioritizedSpecs, map)).not.toThrow();
        });

        it('throws when a WindowId maps to an unknown specification name', () => {
            const map = new Map([[WIN_A, '[UNKNOWN]' as WindowName]]);
            expect(() => createNamedWindows(prioritizedSpecs, map))
                .toThrow('unknown specification');
        });

        it('throws when two WindowIds map to the same specification', () => {
            const map = new Map<WindowId, WindowName>([
                [WIN_A, '[DEFAULT]' as WindowName],
                [WIN_B, '[DEFAULT]' as WindowName],
            ]);
            expect(() => createNamedWindows(prioritizedSpecs, map))
                .toThrow('more than one window');
        });
    });

    describe('getWindowId / hasWindow', () => {
        it('returns null for a spec that has no assigned window', () => {
            const namedWindows = createNamedWindows(prioritizedSpecs);
            expect(namedWindows.getWindowId(emailSpec)).toBeNull();
            expect(namedWindows.hasWindow(emailSpec)).toBe(false);
        });

        it('returns the WindowId for an assigned spec', () => {
            const map = new Map([[WIN_A, '[EMAIL]' as WindowName]]);
            const namedWindows = createNamedWindows(prioritizedSpecs, map);
            expect(namedWindows.getWindowId(emailSpec)).toBe(WIN_A);
            expect(namedWindows.hasWindow(emailSpec)).toBe(true);
        });
    });

    describe('getSpecifications', () => {
        it('returns all specifications from prioritizedSpecs', () => {
            const namedWindows = createNamedWindows(prioritizedSpecs);
            expect(namedWindows.getSpecifications()).toEqual([emailSpec, defaultSpec]);
        });
    });
});

describe('updateTab', () => {
    it('keeps a tab that already satisfies its current spec', () => {
        const map = new Map([[WIN_A, '[EMAIL]' as WindowName]]);
        const namedWindows = createNamedWindows(prioritizedSpecs, map);
        const result = namedWindows.updateTab(tab(1, 'https://mail.google.com/inbox'), WIN_A);
        expect(result.getWindowId(emailSpec)).toBe(WIN_A);
        expect(result.getEvents()).toHaveLength(0);
    });

    it('ignores globally ignored tabs and returns unchanged aggregate', () => {
        const map = new Map([[WIN_A, '[DEFAULT]' as WindowName]]);
        const namedWindows = createNamedWindows(prioritizedSpecs, map);
        const result = namedWindows.updateTab(tab(1, 'about:newtab'), WIN_A);
        expect(result).toBe(namedWindows);
    });

    it('does not ignore globally ignored tabs when checkGlobalIgnoredUrls is false', () => {
        const map = new Map([[WIN_A, '[DEFAULT]' as WindowName]]);
        const namedWindows = createNamedWindows(prioritizedSpecs, map);
        const result = namedWindows.updateTab(tab(1, 'about:newtab'), WIN_A, {checkGlobalIgnoredUrls: false});
        // about:newtab doesn't match email, default keeps it — no move
        expect(result.getEvents()).toHaveLength(0);
    });

    it('moves a tab to a new window when no window exists for the target spec', () => {
        const map = new Map([[WIN_A, '[DEFAULT]' as WindowName]]);
        const namedWindows = createNamedWindows(prioritizedSpecs, map);
        const result = namedWindows.updateTab(tab(1, 'https://mail.google.com/inbox'), WIN_A);
        const events = result.getEvents();
        expect(events).toHaveLength(1);
        expect(events[0]!.type).toBe('NEW_WINDOW_CREATED');
        expect(result.getWindowId(emailSpec)).not.toBeNull();
    });

    it('moves a tab to an existing window when the target spec already has one', () => {
        const map = new Map<WindowId, WindowName>([
            [WIN_A, '[DEFAULT]' as WindowName],
            [WIN_B, '[EMAIL]' as WindowName],
        ]);
        const namedWindows = createNamedWindows(prioritizedSpecs, map);
        const result = namedWindows.updateTab(tab(1, 'https://mail.google.com/inbox'), WIN_A);
        const events = result.getEvents();
        expect(events).toHaveLength(1);
        expect(events[0]!.type).toBe('TAB_MOVED');
        // Target window is still WIN_B
        expect(result.getWindowId(emailSpec)).toBe(WIN_B);
    });

    it('moves a tab from an untracked window to the correct spec via moveTab', () => {
        const namedWindows = createNamedWindows(prioritizedSpecs);
        const result = namedWindows.updateTab(tab(1, 'https://example.com'), WIN_A);
        // No currentSpec for WIN_A, so moveTab is called — a new window is created for default
        const events = result.getEvents();
        expect(events).toHaveLength(1);
        expect(events[0]!.type).toBe('NEW_WINDOW_CREATED');
        expect(result.getWindowId(defaultSpec)).not.toBeNull();
    });
});

describe('moveTab', () => {
    it('creates a new window for the target spec when none exists and emits NewWindowCreatedEvent', () => {
        const map = new Map([[WIN_A, '[DEFAULT]' as WindowName]]);
        const namedWindows = createNamedWindows(prioritizedSpecs, map);
        const result = namedWindows.moveTab(tab(1, 'https://mail.google.com/inbox'), WIN_A, emailSpec);
        const events = result.getEvents();
        expect(events).toHaveLength(1);
        expect(events[0]!.type).toBe('NEW_WINDOW_CREATED');
        expect(result.getWindowId(emailSpec)).not.toBeNull();
    });

    it('reuses the existing window for the target spec and emits TabMovedEvent', () => {
        const map = new Map<WindowId, WindowName>([
            [WIN_A, '[DEFAULT]' as WindowName],
            [WIN_B, '[EMAIL]' as WindowName],
        ]);
        const namedWindows = createNamedWindows(prioritizedSpecs, map);
        const result = namedWindows.moveTab(tab(1, 'https://mail.google.com/inbox'), WIN_A, emailSpec);
        const events = result.getEvents();
        expect(events).toHaveLength(1);
        expect(events[0]!.type).toBe('TAB_MOVED');
        expect(result.getWindowId(emailSpec)).toBe(WIN_B);
    });
});

describe('clearWindow', () => {
    it('removes the window assignment for the given WindowId', () => {
        const map = new Map([[WIN_A, '[EMAIL]' as WindowName]]);
        const namedWindows = createNamedWindows(prioritizedSpecs, map);
        const result = namedWindows.clearWindow(WIN_A);
        expect(result.getWindowId(emailSpec)).toBeNull();
        expect(result.hasWindow(emailSpec)).toBe(false);
    });

    it('returns the same aggregate when the WindowId is not tracked', () => {
        const namedWindows = createNamedWindows(prioritizedSpecs);
        const result = namedWindows.clearWindow(WIN_A);
        expect(result).toBe(namedWindows);
    });
});

describe('getAndClearEvents', () => {
    it('returns events and clears them so subsequent calls return empty', () => {
        const map = new Map([[WIN_A, '[DEFAULT]' as WindowName]]);
        const namedWindows = createNamedWindows(prioritizedSpecs, map);
        const result = namedWindows.updateTab(tab(1, 'https://mail.google.com/inbox'), WIN_A);
        expect(result.getAndClearEvents()).toHaveLength(1);
        expect(result.getAndClearEvents()).toHaveLength(0);
    });

    it('getEvents does not clear the events', () => {
        const map = new Map([[WIN_A, '[DEFAULT]' as WindowName]]);
        const namedWindows = createNamedWindows(prioritizedSpecs, map);
        const result = namedWindows.updateTab(tab(1, 'https://mail.google.com/inbox'), WIN_A);
        expect(result.getEvents()).toHaveLength(1);
        expect(result.getEvents()).toHaveLength(1);
    });
});

describe('nameWindows', () => {
    it('assigns a window to the matching specification', () => {
        const emailWindow = createWindow(WIN_A, [tab(1, 'https://mail.google.com/inbox')]);
        const result = nameWindows(prioritizedSpecs, [emailWindow]);
        expect(result.getWindowId(emailSpec)).toBe(WIN_A);
    });

    it('assigns a window satisfying the default spec to the default', () => {
        const generalWindow = createWindow(WIN_A, [tab(1, 'https://example.com')]);
        const result = nameWindows(prioritizedSpecs, [generalWindow]);
        expect(result.getWindowId(defaultSpec)).toBe(WIN_A);
    });

    it('assigns each window to at most one spec', () => {
        const emailWindow = createWindow(WIN_A, [tab(1, 'https://mail.google.com/inbox')]);
        const generalWindow = createWindow(WIN_B, [tab(2, 'https://example.com')]);
        const result = nameWindows(prioritizedSpecs, [emailWindow, generalWindow]);
        expect(result.getWindowId(emailSpec)).toBe(WIN_A);
        expect(result.getWindowId(defaultSpec)).toBe(WIN_B);
    });

    it('emits WindowSpecAssignedEvents for each classified window', () => {
        const emailWindow = createWindow(WIN_A, [tab(1, 'https://mail.google.com/inbox')]);
        const result = nameWindows(prioritizedSpecs, [emailWindow]);
        const events = result.getEvents();
        expect(events.some(e => e.type === 'WINDOW_SPEC_ASSIGNED')).toBe(true);
    });

    it('processes tabs from unclassified windows and moves them to the right spec', () => {
        const WIN_C = windowId('win-c');
        // Three windows, two specs — the third is unclassified after both specs are consumed.
        // Its email tab is processed individually: emailSpec already has a window, so TAB_MOVED is emitted.
        const emailWindow = createWindow(WIN_A, [tab(1, 'https://mail.google.com/inbox')]);
        const defaultWindow = createWindow(WIN_B, [tab(2, 'https://example.com')]);
        const extraWindow = createWindow(WIN_C, [tab(3, 'https://mail.google.com/inbox')]);
        const result = nameWindows(prioritizedSpecs, [emailWindow, defaultWindow, extraWindow]);
        const events = result.getEvents();
        const types = events.map(e => e.type);
        expect(types).toContain('TAB_MOVED');
    });

    it('returns an empty mapping when no windows are provided', () => {
        const result = nameWindows(prioritizedSpecs, []);
        expect(result.getWindowId(emailSpec)).toBeNull();
        expect(result.getWindowId(defaultSpec)).toBeNull();
    });
});





