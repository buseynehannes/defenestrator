import { describe, it, expect } from 'vitest';
import { createDefaultNamedWindowSpecification } from './DefaultNamedWindowSpecification';
import { createTab, createTabId } from '../windows/Tab';
import { createWindow } from '../windows/Window';
import type { WindowId } from '../WindowName';
import type { WindowName } from '../WindowName';

describe('DefaultNamedWindowSpecification', () => {
    const tab = (url: string) => createTab(createTabId(1), url);
    const windowId = 'test-window-id' as WindowId;
    const name = '[DEFAULT]' as WindowName;

    describe('shouldAcceptTab', () => {
        it('always returns true regardless of the tab URL', () => {
            const spec = createDefaultNamedWindowSpecification(name);
            expect(spec.shouldAcceptTab(tab('https://anything.com'))).toBe(true);
        });

        it('returns true for about: URLs', () => {
            const spec = createDefaultNamedWindowSpecification(name);
            expect(spec.shouldAcceptTab(tab('about:newtab'))).toBe(true);
        });
    });

    describe('shouldKeepTab', () => {
        it('always returns false — the default window does not retain tabs', () => {
            const spec = createDefaultNamedWindowSpecification(name);
            expect(spec.shouldKeepTab(tab('https://anything.com'))).toBe(false);
        });
    });

    describe('isSatisfiedByWindow', () => {
        it('returns true for a window with no tabs', () => {
            const spec = createDefaultNamedWindowSpecification(name);
            const window = createWindow(windowId, []);
            expect(spec.isSatisfiedByWindow(window)).toBe(true);
        });

        it('returns true for a window with any tabs', () => {
            const spec = createDefaultNamedWindowSpecification(name);
            const window = createWindow(windowId, [tab('https://example.com')]);
            expect(spec.isSatisfiedByWindow(window)).toBe(true);
        });
    });

    describe('metadata', () => {
        it('exposes the correct name', () => {
            const spec = createDefaultNamedWindowSpecification(name);
            expect(spec.name).toBe(name);
        });

        it('is not sticky', () => {
            const spec = createDefaultNamedWindowSpecification(name);
            expect(spec.sticky).toBe(false);
        });

        it('has no tabSpecifications', () => {
            const spec = createDefaultNamedWindowSpecification(name);
            expect(spec.tabSpecifications).toBeUndefined();
        });

        it('applies the provided theme', () => {
            const theme = { accentColor: '#ff0000', textColor: '#ffffff' };
            const spec = createDefaultNamedWindowSpecification(name, theme);
            expect(spec.theme).toEqual(theme);
        });

        it('has no theme when none is provided', () => {
            const spec = createDefaultNamedWindowSpecification(name);
            expect(spec.theme).toBeUndefined();
        });
    });
});

