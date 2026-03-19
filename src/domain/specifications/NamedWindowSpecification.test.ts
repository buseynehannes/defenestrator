import { describe, it, expect } from 'vitest';
import { createNamedWindowSpecification, withStickyToggled } from './NamedWindowSpecification';
import { createDefaultNamedWindowSpecification } from './DefaultNamedWindowSpecification';
import { createTabSpecification } from './TabSpecification';
import { createTab, createTabId } from '../windows/Tab';
import { createWindow } from '../windows/Window';
import type { WindowId, WindowName } from '../WindowName';

describe('NamedWindowSpecification', () => {
    const tab = (id: number, url: string) => createTab(createTabId(id), url);
    const windowId = 'test-window-id' as WindowId;
    const name = '[EMAIL]' as WindowName;
    const emailSpec = createTabSpecification('mail.google.com');
    const outlookSpec = createTabSpecification('outlook.com');

    describe('shouldAcceptTab', () => {
        it('returns true when the tab URL matches one of the tab specifications', () => {
            const spec = createNamedWindowSpecification(name, [emailSpec]);
            expect(spec.shouldAcceptTab(tab(1, 'https://mail.google.com/inbox'))).toBe(true);
        });

        it('returns true when the tab URL matches any of multiple tab specifications', () => {
            const spec = createNamedWindowSpecification(name, [emailSpec, outlookSpec]);
            expect(spec.shouldAcceptTab(tab(1, 'https://outlook.com/mail'))).toBe(true);
        });

        it('returns false when the tab URL matches none of the tab specifications', () => {
            const spec = createNamedWindowSpecification(name, [emailSpec, outlookSpec]);
            expect(spec.shouldAcceptTab(tab(1, 'https://example.com'))).toBe(false);
        });
    });

    describe('shouldKeepTab (non-sticky)', () => {
        it('returns true when the tab matches the specification', () => {
            const spec = createNamedWindowSpecification(name, [emailSpec]);
            expect(spec.shouldKeepTab(tab(1, 'https://mail.google.com/inbox'))).toBe(true);
        });

        it('returns false when the tab does not match the specification', () => {
            const spec = createNamedWindowSpecification(name, [emailSpec]);
            expect(spec.shouldKeepTab(tab(1, 'https://example.com'))).toBe(false);
        });
    });

    describe('shouldKeepTab (sticky)', () => {
        it('returns true even when the tab does not match the specification', () => {
            const spec = createNamedWindowSpecification(name, [emailSpec], undefined, true);
            expect(spec.shouldKeepTab(tab(1, 'https://example.com'))).toBe(true);
        });

        it('returns true when the tab matches the specification', () => {
            const spec = createNamedWindowSpecification(name, [emailSpec], undefined, true);
            expect(spec.shouldKeepTab(tab(1, 'https://mail.google.com/inbox'))).toBe(true);
        });
    });

    describe('isSatisfiedByWindow (non-sticky)', () => {
        it('returns true when all tabs match the specification', () => {
            const spec = createNamedWindowSpecification(name, [emailSpec, outlookSpec]);
            const window = createWindow(windowId, [
                tab(1, 'https://mail.google.com/inbox'),
                tab(2, 'https://outlook.com/mail'),
            ]);
            expect(spec.isSatisfiedByWindow(window)).toBe(true);
        });

        it('returns false when any tab does not match the specification', () => {
            const spec = createNamedWindowSpecification(name, [emailSpec]);
            const window = createWindow(windowId, [
                tab(1, 'https://mail.google.com/inbox'),
                tab(2, 'https://example.com'),
            ]);
            expect(spec.isSatisfiedByWindow(window)).toBe(false);
        });

        it('returns true for an empty window', () => {
            const spec = createNamedWindowSpecification(name, [emailSpec]);
            const window = createWindow(windowId, []);
            expect(spec.isSatisfiedByWindow(window)).toBe(true);
        });
    });

    describe('isSatisfiedByWindow (sticky)', () => {
        it('returns true when at least one tab matches the specification', () => {
            const spec = createNamedWindowSpecification(name, [emailSpec], undefined, true);
            const window = createWindow(windowId, [
                tab(1, 'https://mail.google.com/inbox'),
                tab(2, 'https://example.com'),
            ]);
            expect(spec.isSatisfiedByWindow(window)).toBe(true);
        });

        it('returns true when all tabs match the specification', () => {
            const spec = createNamedWindowSpecification(name, [emailSpec], undefined, true);
            const window = createWindow(windowId, [
                tab(1, 'https://mail.google.com/inbox'),
            ]);
            expect(spec.isSatisfiedByWindow(window)).toBe(true);
        });

        it('returns false when no tab matches the specification (sticky needs at least one tab to match)', () => {
            const spec = createNamedWindowSpecification(name, [emailSpec], undefined, true);
            const window = createWindow(windowId, [
                tab(1, 'https://example.com'),
                tab(2, 'https://other.com'),
            ]);
            // sticky means shouldKeepTab is always true, so every() trivially passes
            expect(spec.isSatisfiedByWindow(window)).toBe(false);
        });

        it('returns true when one tab matches the specification (sticky needs at least one tab to match)', () => {
            const spec = createNamedWindowSpecification(name, [emailSpec], undefined, true);
            const window = createWindow(windowId, [
                tab(1, 'https://example.com'),
                tab(2, 'https://other.com'),
                tab(3, 'https://mail.google.com/inbox'),
            ]);
            // sticky means shouldKeepTab is always true, so every() trivially passes
            expect(spec.isSatisfiedByWindow(window)).toBe(true);
        });
    });

    describe('metadata', () => {
        it('exposes the correct name', () => {
            const spec = createNamedWindowSpecification(name, [emailSpec]);
            expect(spec.name).toBe(name);
        });

        it('is not sticky by default', () => {
            const spec = createNamedWindowSpecification(name, [emailSpec]);
            expect(spec.sticky).toBe(false);
        });

        it('is sticky when specified', () => {
            const spec = createNamedWindowSpecification(name, [emailSpec], undefined, true);
            expect(spec.sticky).toBe(true);
        });

        it('exposes all tab specifications', () => {
            const spec = createNamedWindowSpecification(name, [emailSpec, outlookSpec]);
            expect(spec.tabSpecifications).toEqual([emailSpec, outlookSpec]);
        });

        it('applies the provided theme', () => {
            const theme = { accentColor: '#4285f4', textColor: '#ffffff' };
            const spec = createNamedWindowSpecification(name, [emailSpec], theme);
            expect(spec.theme).toEqual(theme);
        });

        it('has no theme when none is provided', () => {
            const spec = createNamedWindowSpecification(name, [emailSpec]);
            expect(spec.theme).toBeUndefined();
        });
    });

    describe('withStickyToggled', () => {
        it('returns a non-sticky copy of a sticky spec', () => {
            const sticky = createNamedWindowSpecification(name, [emailSpec], undefined, true);
            const toggled = withStickyToggled(sticky);
            expect(toggled.sticky).toBe(false);
        });

        it('returns a sticky copy of a non-sticky spec', () => {
            const nonSticky = createNamedWindowSpecification(name, [emailSpec]);
            const toggled = withStickyToggled(nonSticky);
            expect(toggled.sticky).toBe(true);
        });

        it('preserves name, tabSpecifications and theme', () => {
            const theme = { accentColor: '#ff0000' };
            const spec = createNamedWindowSpecification(name, [emailSpec, outlookSpec], theme);
            const toggled = withStickyToggled(spec);
            expect(toggled.name).toBe(name);
            expect(toggled.tabSpecifications).toEqual([emailSpec, outlookSpec]);
            expect(toggled.theme).toEqual(theme);
        });

        it('returns the default spec unchanged (default cannot be sticky)', () => {
            const def = createDefaultNamedWindowSpecification('[DEFAULT]' as WindowName);
            const result = withStickyToggled(def);
            expect(result).toBe(def);
            expect(result.sticky).toBe(false);
        });

        it('does not mutate the original spec', () => {
            const original = createNamedWindowSpecification(name, [emailSpec]);
            withStickyToggled(original);
            expect(original.sticky).toBe(false);
        });
    });
});


