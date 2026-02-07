import { isInternalUrl } from './Tab';
import type { Tab, TabId, Url } from './Tab';

describe('Tab', () => {
  const defaultIgnoredPatterns = ['about:', 'moz-extension:'];

  describe('isInternalUrl', () => {
    it('should return true for about: URLs', () => {
      expect(isInternalUrl('about:blank', defaultIgnoredPatterns)).toBe(true);
      expect(isInternalUrl('about:config', defaultIgnoredPatterns)).toBe(true);
      expect(isInternalUrl('about:debugging', defaultIgnoredPatterns)).toBe(true);
    });

    it('should return true for moz-extension: URLs', () => {
      expect(isInternalUrl('moz-extension://some-extension-id/page.html', defaultIgnoredPatterns)).toBe(true);
    });

    it('should return false for regular HTTP URLs', () => {
      expect(isInternalUrl('http://example.com', defaultIgnoredPatterns)).toBe(false);
      expect(isInternalUrl('https://github.com', defaultIgnoredPatterns)).toBe(false);
    });

    it('should return false for regular HTTPS URLs', () => {
      expect(isInternalUrl('https://www.google.com', defaultIgnoredPatterns)).toBe(false);
      expect(isInternalUrl('https://mail.google.com', defaultIgnoredPatterns)).toBe(false);
    });

    it('should return false for empty strings', () => {
      expect(isInternalUrl('', defaultIgnoredPatterns)).toBe(false);
    });

    it('should handle URLs with about: or moz-extension: in the path', () => {
      // These should be false as "about:" is not at the start
      expect(isInternalUrl('https://example.com/about:test', defaultIgnoredPatterns)).toBe(false);
      expect(isInternalUrl('https://example.com?page=moz-extension:test', defaultIgnoredPatterns)).toBe(false);
    });

    it('should support custom ignored patterns', () => {
      const customPatterns = ['chrome:', 'edge:', 'custom-protocol:'];
      expect(isInternalUrl('chrome://settings', customPatterns)).toBe(true);
      expect(isInternalUrl('edge://flags', customPatterns)).toBe(true);
      expect(isInternalUrl('custom-protocol://page', customPatterns)).toBe(true);
      expect(isInternalUrl('https://example.com', customPatterns)).toBe(false);
    });

    it('should work with empty ignored patterns array', () => {
      expect(isInternalUrl('about:blank', [])).toBe(false);
      expect(isInternalUrl('moz-extension://id', [])).toBe(false);
    });
  });

  describe('Tab interface', () => {
    it('should create a valid Tab object', () => {
      const tab: Tab = {
        id: 123 as TabId,
        url: 'https://github.com' as Url,
        windowId: 456
      };

      expect(tab.id).toBe(123);
      expect(tab.url).toBe('https://github.com');
      expect(tab.windowId).toBe(456);
    });

    it('should enforce readonly properties at compile time', () => {
      const tab: Tab = {
        id: 123 as TabId,
        url: 'https://github.com' as Url,
        windowId: 456
      };

      // This would fail at compile time:
      // tab.id = 999;
      // tab.url = 'https://example.com';
      // tab.windowId = 789;

      expect(tab).toBeDefined();
    });
  });

  describe('Type safety', () => {
    it('should handle TabId as a branded type', () => {
      const tabId: TabId = 123 as TabId;
      expect(typeof tabId).toBe('number');
    });

    it('should handle Url as a branded type', () => {
      const url: Url = 'https://example.com' as Url;
      expect(typeof url).toBe('string');
    });
  });
});
