import { TabDispatcher } from './TabDispatcher';
import { TaggingRuleSet } from './TaggingRule';
import type { TaggingRule, Theme } from './TaggingRule';
import type { WindowRepository, BrowserWindow } from '../ports/WindowRepository';
import type { TabRepository } from '../ports/TabRepository';
import type { Logger } from '../ports/Logger';
import type { Tab, TabId } from './Tab';
import type { WindowId, WindowTag } from './WindowTag';

// Mock implementations
class MockWindowRepository implements WindowRepository {
  private windows: Map<WindowId, WindowTag | null> = new Map();
  private nextWindowId = 1;

  getAllWindows = vi.fn(async (): Promise<BrowserWindow[]> => {
    return Array.from(this.windows.keys()).map(id => ({ id }));
  });

  setWindowTag = vi.fn(async (windowId: WindowId, tag: WindowTag, _theme?: Theme): Promise<void> => {
    this.windows.set(windowId, tag);
  });

  getWindowTag = vi.fn(async (windowId: WindowId): Promise<WindowTag | null> => {
    return this.windows.get(windowId) ?? null;
  });

  createWindowWithTab = vi.fn(async (_tabId: TabId): Promise<WindowId> => {
    const newId = this.nextWindowId++ as WindowId;
    this.windows.set(newId, null);
    return newId;
  });

  focusWindow = vi.fn(async (_windowId: WindowId): Promise<void> => {});

  removeWindowTag = vi.fn(async (windowId: WindowId): Promise<void> => {
    this.windows.delete(windowId);
  });

  // Test helpers
  addWindow(id: WindowId, tag: WindowTag | null = null) {
    this.windows.set(id, tag);
  }

  reset() {
    this.windows.clear();
    this.nextWindowId = 1;
    vi.clearAllMocks();
  }
}

class MockTabRepository implements TabRepository {
  private tabs: Map<TabId, Tab> = new Map();
  private windowTabs: Map<WindowId, TabId[]> = new Map();

  getTab = vi.fn(async (tabId: TabId): Promise<Tab> => {
    const tab = this.tabs.get(tabId);
    if (!tab) throw new Error(`Tab ${tabId} not found`);
    return tab;
  });

  getTabsInWindow = vi.fn(async (windowId: WindowId): Promise<Tab[]> => {
    const tabIds = this.windowTabs.get(windowId) ?? [];
    return tabIds.map(id => this.tabs.get(id)!).filter(Boolean);
  });

  moveTab = vi.fn(async (tabId: TabId, windowId: WindowId): Promise<void> => {
    const tab = this.tabs.get(tabId);
    if (tab) {
      // Update tab's window
      this.tabs.set(tabId, { ...tab, windowId });
      // Update window tabs tracking
      const oldWindowId = tab.windowId;
      const oldTabs = this.windowTabs.get(oldWindowId) ?? [];
      this.windowTabs.set(oldWindowId, oldTabs.filter(id => id !== tabId));
      const newTabs = this.windowTabs.get(windowId) ?? [];
      this.windowTabs.set(windowId, [...newTabs, tabId]);
    }
  });

  activateTab = vi.fn(async (_tabId: TabId): Promise<void> => {});

  // Test helpers
  addTab(tab: Tab) {
    this.tabs.set(tab.id, tab);
    const windowTabs = this.windowTabs.get(tab.windowId) ?? [];
    this.windowTabs.set(tab.windowId, [...windowTabs, tab.id]);
  }

  reset() {
    this.tabs.clear();
    this.windowTabs.clear();
    vi.clearAllMocks();
  }
}

class MockLogger implements Logger {
  log = vi.fn();
  error = vi.fn();
}

describe('TabDispatcher', () => {
  let dispatcher: TabDispatcher;
  let windowRepo: MockWindowRepository;
  let tabRepo: MockTabRepository;
  let logger: MockLogger;
  let ruleSet: TaggingRuleSet;

  const testRules: readonly TaggingRule[] = [
    { tag: '[DEV]', match: ['github.com', 'bitbucket.com'] },
    { tag: '[MEET]', match: ['meet.google.com', 'zoom.us'] },
    { tag: '[MAIL]', match: ['mail.google.com'] }
  ];
  const defaultIgnoredPatterns = ['about:', 'moz-extension:'];

  beforeEach(() => {
    windowRepo = new MockWindowRepository();
    tabRepo = new MockTabRepository();
    logger = new MockLogger();
    ruleSet = new TaggingRuleSet(testRules, defaultIgnoredPatterns);
    dispatcher = new TabDispatcher(ruleSet, windowRepo, tabRepo, logger);
  });

  describe('dispatch', () => {
    describe('internal URLs', () => {
      it('should ignore about: URLs', async () => {
        const tabId = 1 as TabId;
        tabRepo.addTab({ id: tabId, url: 'about:blank', windowId: 100 });

        await dispatcher.dispatch(tabId, 'about:blank');

        expect(tabRepo.moveTab).not.toHaveBeenCalled();
        expect(windowRepo.createWindowWithTab).not.toHaveBeenCalled();
      });

      it('should ignore moz-extension: URLs', async () => {
        const tabId = 2 as TabId;
        tabRepo.addTab({ id: tabId, url: 'moz-extension://id/page.html', windowId: 100 });

        await dispatcher.dispatch(tabId, 'moz-extension://id/page.html');

        expect(tabRepo.moveTab).not.toHaveBeenCalled();
        expect(windowRepo.createWindowWithTab).not.toHaveBeenCalled();
      });
    });

    describe('already in correct window', () => {
      it('should not move tab if already in correct window', async () => {
        const tabId = 10 as TabId;
        const windowId = 100 as WindowId;

        windowRepo.addWindow(windowId, '[DEV]');
        tabRepo.addTab({ id: tabId, url: 'https://github.com/user/repo', windowId });

        await dispatcher.dispatch(tabId, 'https://github.com/user/repo');

        expect(tabRepo.moveTab).not.toHaveBeenCalled();
        expect(windowRepo.createWindowWithTab).not.toHaveBeenCalled();
        expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('already in correct window'));
      });
    });

    describe('move to existing window', () => {
      it('should move tab to existing window with matching tag', async () => {
        const tabId = 20 as TabId;
        const currentWindowId = 100 as WindowId;
        const targetWindowId = 200 as WindowId;

        windowRepo.addWindow(currentWindowId, '[RESEARCH]');
        windowRepo.addWindow(targetWindowId, '[DEV]');
        tabRepo.addTab({ id: tabId, url: 'https://github.com/user/repo', windowId: currentWindowId });

        await dispatcher.dispatch(tabId, 'https://github.com/user/repo');

        expect(tabRepo.moveTab).toHaveBeenCalledWith(tabId, targetWindowId);
        expect(windowRepo.focusWindow).toHaveBeenCalledWith(targetWindowId);
        expect(tabRepo.activateTab).toHaveBeenCalledWith(tabId);
        expect(windowRepo.createWindowWithTab).not.toHaveBeenCalled();
      });

      it('should not move to the current window', async () => {
        const tabId = 30 as TabId;
        const windowId = 100 as WindowId;

        windowRepo.addWindow(windowId, '[MAIL]');
        tabRepo.addTab({ id: tabId, url: 'https://example.com', windowId });

        await dispatcher.dispatch(tabId, 'https://mail.google.com');

        // Should not try to move to current window, should create new or retag
        expect(tabRepo.moveTab).not.toHaveBeenCalled();
      });
    });

    describe('create new window', () => {
      it('should create new window if no matching window exists', async () => {
        const tabId = 40 as TabId;
        const currentWindowId = 100 as WindowId;

        windowRepo.addWindow(currentWindowId, '[RESEARCH]');
        tabRepo.addTab({ id: tabId, url: 'https://github.com/user/repo', windowId: currentWindowId });
        // Add another tab so window is not empty
        tabRepo.addTab({ id: 41 as TabId, url: 'https://example.com', windowId: currentWindowId });

        await dispatcher.dispatch(tabId, 'https://github.com/user/repo');

        expect(windowRepo.createWindowWithTab).toHaveBeenCalledWith(tabId);
        expect(windowRepo.setWindowTag).toHaveBeenCalledWith(expect.any(Number), '[DEV]', undefined);
      });
    });

    describe('retag empty window', () => {
      it('should retag current window if it is empty and untagged', async () => {
        const tabId = 50 as TabId;
        const windowId = 100 as WindowId;

        windowRepo.addWindow(windowId, null); // Untagged window
        tabRepo.addTab({ id: tabId, url: 'https://github.com/user/repo', windowId });

        await dispatcher.dispatch(tabId, 'https://github.com/user/repo');

        expect(windowRepo.setWindowTag).toHaveBeenCalledWith(windowId, '[DEV]', undefined);
        expect(windowRepo.createWindowWithTab).not.toHaveBeenCalled();
        expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Retagging'));
      });

      it('should retag window with only one tab', async () => {
        const tabId = 60 as TabId;
        const windowId = 100 as WindowId;

        windowRepo.addWindow(windowId, null);
        tabRepo.addTab({ id: tabId, url: 'https://github.com/user/repo', windowId });

        await dispatcher.dispatch(tabId, 'https://github.com/user/repo');

        expect(windowRepo.setWindowTag).toHaveBeenCalledWith(windowId, '[DEV]', undefined);
        expect(windowRepo.createWindowWithTab).not.toHaveBeenCalled();
      });

      it('should retag window with one real tab and one about:blank', async () => {
        const tabId = 70 as TabId;
        const blankTabId = 71 as TabId;
        const windowId = 100 as WindowId;

        windowRepo.addWindow(windowId, null);
        tabRepo.addTab({ id: tabId, url: 'https://github.com/user/repo', windowId });
        tabRepo.addTab({ id: blankTabId, url: 'about:blank', windowId });

        await dispatcher.dispatch(tabId, 'https://github.com/user/repo');

        expect(windowRepo.setWindowTag).toHaveBeenCalledWith(windowId, '[DEV]', undefined);
        expect(windowRepo.createWindowWithTab).not.toHaveBeenCalled();
      });

      it('should create new window if current window has tag even if empty', async () => {
        const tabId = 80 as TabId;
        const windowId = 100 as WindowId;

        windowRepo.addWindow(windowId, '[RESEARCH]');
        tabRepo.addTab({ id: tabId, url: 'https://github.com/user/repo', windowId });

        await dispatcher.dispatch(tabId, 'https://github.com/user/repo');

        expect(windowRepo.createWindowWithTab).toHaveBeenCalledWith(tabId);
        expect(windowRepo.setWindowTag).toHaveBeenCalledWith(expect.any(Number), '[DEV]', undefined);
      });
    });

    describe('different tags', () => {
      it('should handle [MEET] tag', async () => {
        const tabId = 90 as TabId;
        const windowId = 100 as WindowId;

        windowRepo.addWindow(windowId, null);
        tabRepo.addTab({ id: tabId, url: 'https://meet.google.com/abc-defg-hij', windowId });

        await dispatcher.dispatch(tabId, 'https://meet.google.com/abc-defg-hij');

        expect(windowRepo.setWindowTag).toHaveBeenCalledWith(windowId, '[MEET]', undefined);
      });

      it('should handle [MAIL] tag', async () => {
        const tabId = 95 as TabId;
        const windowId = 100 as WindowId;

        windowRepo.addWindow(windowId, null);
        tabRepo.addTab({ id: tabId, url: 'https://mail.google.com/mail/u/0/', windowId });

        await dispatcher.dispatch(tabId, 'https://mail.google.com/mail/u/0/');

        expect(windowRepo.setWindowTag).toHaveBeenCalledWith(windowId, '[MAIL]', undefined);
      });

      it('should handle [RESEARCH] default tag', async () => {
        const tabId = 100 as TabId;
        const windowId = 100 as WindowId;

        windowRepo.addWindow(windowId, null);
        tabRepo.addTab({ id: tabId, url: 'https://wikipedia.org', windowId });

        await dispatcher.dispatch(tabId, 'https://wikipedia.org');

        expect(windowRepo.setWindowTag).toHaveBeenCalledWith(windowId, '[RESEARCH]', undefined);
      });
    });

    describe('error handling', () => {
      it('should handle errors gracefully', async () => {
        const tabId = 110 as TabId;
        tabRepo.getTab = vi.fn().mockRejectedValue(new Error('Tab not found'));

        await dispatcher.dispatch(tabId, 'https://github.com/user/repo');

        expect(logger.error).toHaveBeenCalledWith('[DISPATCH] Error:', expect.any(Error));
      });

      it('should log error but not throw', async () => {
        const tabId = 120 as TabId;
        tabRepo.getTab = vi.fn().mockRejectedValue(new Error('Network error'));

        await expect(dispatcher.dispatch(tabId, 'https://github.com')).resolves.toBeUndefined();
        expect(logger.error).toHaveBeenCalled();
      });
    });

    describe('logging', () => {
      it('should log processing message', async () => {
        const tabId = 130 as TabId;
        const windowId = 100 as WindowId;

        windowRepo.addWindow(windowId, '[DEV]');
        tabRepo.addTab({ id: tabId, url: 'https://github.com/user/repo', windowId });

        await dispatcher.dispatch(tabId, 'https://github.com/user/repo');

        expect(logger.log).toHaveBeenCalledWith(
          expect.stringContaining('[DISPATCH] Processing: https://github.com/user/repo -> [DEV]')
        );
      });

      it('should log when window has no tag in storage', async () => {
        const tabId = 140 as TabId;
        const windowId = 100 as WindowId;

        windowRepo.addWindow(windowId, null);
        tabRepo.addTab({ id: tabId, url: 'https://github.com/user/repo', windowId });
        // Add more tabs so it won't retag
        tabRepo.addTab({ id: 141 as TabId, url: 'https://example.com', windowId });

        await dispatcher.dispatch(tabId, 'https://github.com/user/repo');

        expect(logger.log).toHaveBeenCalledWith(
          expect.stringContaining('has no tag in storage')
        );
      });
    });

    describe('complex scenarios', () => {
      it('should handle multiple windows with different tags', async () => {
        const tabId = 150 as TabId;
        const currentWindowId = 100 as WindowId;
        const devWindowId = 200 as WindowId;
        const meetWindowId = 300 as WindowId;

        windowRepo.addWindow(currentWindowId, '[RESEARCH]');
        windowRepo.addWindow(devWindowId, '[DEV]');
        windowRepo.addWindow(meetWindowId, '[MEET]');
        tabRepo.addTab({ id: tabId, url: 'https://github.com/user/repo', windowId: currentWindowId });

        await dispatcher.dispatch(tabId, 'https://github.com/user/repo');

        expect(tabRepo.moveTab).toHaveBeenCalledWith(tabId, devWindowId);
        expect(windowRepo.focusWindow).toHaveBeenCalledWith(devWindowId);
      });

      it('should prefer existing window over creating new one', async () => {
        const tabId = 160 as TabId;
        const currentWindowId = 100 as WindowId;
        const existingDevWindow = 200 as WindowId;

        windowRepo.addWindow(currentWindowId, '[RESEARCH]');
        windowRepo.addWindow(existingDevWindow, '[DEV]');
        tabRepo.addTab({ id: tabId, url: 'https://github.com/user/repo', windowId: currentWindowId });
        tabRepo.addTab({ id: 161 as TabId, url: 'https://example.com', windowId: currentWindowId });

        await dispatcher.dispatch(tabId, 'https://github.com/user/repo');

        expect(tabRepo.moveTab).toHaveBeenCalledWith(tabId, existingDevWindow);
        expect(windowRepo.createWindowWithTab).not.toHaveBeenCalled();
      });
    });

    describe('sticky windows', () => {
      it('should not move tabs from sticky windows', async () => {
        const stickyRules: TaggingRule[] = [
          { tag: '[DEV]', match: ['github.com'], sticky: true },
          { tag: '[MAIL]', match: ['mail.google.com'], sticky: false }
        ];
        const stickyRuleSet = new TaggingRuleSet(stickyRules);
        const stickyDispatcher = new TabDispatcher(stickyRuleSet, windowRepo, tabRepo, logger);

        const tabId = 200 as TabId;
        const windowId = 100 as WindowId;

        windowRepo.addWindow(windowId, '[DEV]');
        tabRepo.addTab({ id: tabId, url: 'https://mail.google.com', windowId });

        await stickyDispatcher.dispatch(tabId, 'https://mail.google.com');

        // Should NOT move the tab because the window is sticky
        expect(tabRepo.moveTab).not.toHaveBeenCalled();
        expect(windowRepo.createWindowWithTab).not.toHaveBeenCalled();
        expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('sticky'));
      });

      it('should allow moving tabs from non-sticky windows', async () => {
        const mixedRules: TaggingRule[] = [
          { tag: '[DEV]', match: ['github.com'], sticky: false },
          { tag: '[MAIL]', match: ['mail.google.com'], sticky: false }
        ];
        const mixedRuleSet = new TaggingRuleSet(mixedRules);
        const mixedDispatcher = new TabDispatcher(mixedRuleSet, windowRepo, tabRepo, logger);

        const tabId = 210 as TabId;
        const windowId = 100 as WindowId;

        windowRepo.addWindow(windowId, '[DEV]');
        tabRepo.addTab({ id: tabId, url: 'https://mail.google.com', windowId });

        await mixedDispatcher.dispatch(tabId, 'https://mail.google.com');

        // Should move or create window because window is not sticky
        expect(windowRepo.createWindowWithTab).toHaveBeenCalledWith(tabId);
      });

      it('should allow retagging untagged windows even if rule is sticky', async () => {
        const stickyRules: TaggingRule[] = [
          { tag: '[DEV]', match: ['github.com'], sticky: true }
        ];
        const stickyRuleSet = new TaggingRuleSet(stickyRules);
        const stickyDispatcher = new TabDispatcher(stickyRuleSet, windowRepo, tabRepo, logger);

        const tabId = 220 as TabId;
        const windowId = 100 as WindowId;

        windowRepo.addWindow(windowId, null); // Untagged window
        tabRepo.addTab({ id: tabId, url: 'https://github.com', windowId });

        await stickyDispatcher.dispatch(tabId, 'https://github.com');

        // Should tag the window because it's untagged
        expect(windowRepo.setWindowTag).toHaveBeenCalledWith(windowId, '[DEV]', undefined);
      });
    });
  });
});

