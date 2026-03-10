import { describe, it, expect } from 'vitest';
import { createGlobalIgnoredUrls } from './GlobalIgnoredUrls';
import { createTab, createTabId } from '../windows/Tab';

describe('GlobalIgnoredUrls', () => {
    const tab = (url: string) => createTab(createTabId(1), url);

    describe('isIgnored', () => {
        it('returns true when the tab URL matches an ignored pattern', () => {
            const ignored = createGlobalIgnoredUrls(['about:', 'moz-extension:']);
            expect(ignored.isIgnored(tab('about:newtab'))).toBe(true);
        });

        it('returns true when the tab URL matches the second pattern', () => {
            const ignored = createGlobalIgnoredUrls(['about:', 'moz-extension:']);
            expect(ignored.isIgnored(tab('moz-extension://some-id/options.html'))).toBe(true);
        });

        it('returns false when the tab URL does not match any pattern', () => {
            const ignored = createGlobalIgnoredUrls(['about:', 'moz-extension:']);
            expect(ignored.isIgnored(tab('https://mail.google.com/inbox'))).toBe(false);
        });

        it('returns false when there are no patterns', () => {
            const ignored = createGlobalIgnoredUrls([]);
            expect(ignored.isIgnored(tab('about:newtab'))).toBe(false);
        });

        it('exposes the urlPatterns', () => {
            const patterns = ['about:', 'moz-extension:'];
            const ignored = createGlobalIgnoredUrls(patterns);
            expect(ignored.urlPatterns).toEqual(patterns);
        });
    });
});

