import { TaggingRuleSet } from './TaggingRule';
import type { TaggingRule } from './TaggingRule';
import { DEFAULT_TAG } from './WindowTag';

describe('TaggingRuleSet', () => {
  let ruleSet: TaggingRuleSet;
  let testRules: readonly TaggingRule[];

  beforeEach(() => {
    testRules = [
      { tag: '[DEV]', match: ['github.com', 'bitbucket.com', 'gitlab.com'] },
      { tag: '[MEET]', match: ['meet.google.com', 'zoom.us', 'teams.microsoft.com'] },
      { tag: '[MAIL]', match: ['mail.google.com', 'outlook.office.com'] },
      { tag: '[DOCS]', match: ['docs.google.com', 'notion.so'] }
    ];
    ruleSet = new TaggingRuleSet(testRules);
  });

  describe('determineTag', () => {
    describe('matching rules', () => {
      it('should match GitHub URLs to [DEV] tag', () => {
        expect(ruleSet.determineTag('https://github.com/user/repo')).toBe('[DEV]');
        expect(ruleSet.determineTag('http://github.com')).toBe('[DEV]');
        expect(ruleSet.determineTag('https://www.github.com/pulls')).toBe('[DEV]');
      });

      it('should match Bitbucket URLs to [DEV] tag', () => {
        expect(ruleSet.determineTag('https://bitbucket.com/team/project')).toBe('[DEV]');
        expect(ruleSet.determineTag('http://bitbucket.com')).toBe('[DEV]');
      });

      it('should match GitLab URLs to [DEV] tag', () => {
        expect(ruleSet.determineTag('https://gitlab.com/project')).toBe('[DEV]');
      });

      it('should match Google Meet URLs to [MEET] tag', () => {
        expect(ruleSet.determineTag('https://meet.google.com/abc-defg-hij')).toBe('[MEET]');
      });

      it('should match Zoom URLs to [MEET] tag', () => {
        expect(ruleSet.determineTag('https://zoom.us/j/123456789')).toBe('[MEET]');
        expect(ruleSet.determineTag('https://us02web.zoom.us/j/123456789')).toBe('[MEET]');
      });

      it('should match Microsoft Teams URLs to [MEET] tag', () => {
        expect(ruleSet.determineTag('https://teams.microsoft.com/meeting')).toBe('[MEET]');
      });

      it('should match Gmail URLs to [MAIL] tag', () => {
        expect(ruleSet.determineTag('https://mail.google.com/mail/u/0/')).toBe('[MAIL]');
      });

      it('should match Outlook URLs to [MAIL] tag', () => {
        expect(ruleSet.determineTag('https://outlook.office.com/mail/')).toBe('[MAIL]');
      });

      it('should match Google Docs URLs to [DOCS] tag', () => {
        expect(ruleSet.determineTag('https://docs.google.com/document/d/abc123')).toBe('[DOCS]');
      });

      it('should match Notion URLs to [DOCS] tag', () => {
        expect(ruleSet.determineTag('https://www.notion.so/workspace/page')).toBe('[DOCS]');
      });
    });

    describe('first match wins', () => {
      it('should return the first matching tag when multiple rules could match', () => {
        const overlappingRules: readonly TaggingRule[] = [
          { tag: '[GOOGLE]', match: ['google.com'] },
          { tag: '[MEET]', match: ['meet.google.com'] }
        ];
        const overlappingRuleSet = new TaggingRuleSet(overlappingRules);

        // Should match [GOOGLE] first since it comes first in the rules
        expect(overlappingRuleSet.determineTag('https://meet.google.com/abc')).toBe('[GOOGLE]');
      });

      it('should respect rule order', () => {
        const orderedRules: readonly TaggingRule[] = [
          { tag: '[SPECIFIC]', match: ['example.com/specific'] },
          { tag: '[GENERAL]', match: ['example.com'] }
        ];
        const orderedRuleSet = new TaggingRuleSet(orderedRules);

        expect(orderedRuleSet.determineTag('https://example.com/specific/page')).toBe('[SPECIFIC]');
        expect(orderedRuleSet.determineTag('https://example.com/other')).toBe('[GENERAL]');
      });
    });

    describe('default tag', () => {
      it('should return DEFAULT_TAG for unmatched URLs', () => {
        expect(ruleSet.determineTag('https://example.com')).toBe(DEFAULT_TAG);
        expect(ruleSet.determineTag('https://www.wikipedia.org')).toBe(DEFAULT_TAG);
        expect(ruleSet.determineTag('https://stackoverflow.com/questions')).toBe(DEFAULT_TAG);
      });

      it('should return DEFAULT_TAG for unknown domains', () => {
        expect(ruleSet.determineTag('https://random-site.com')).toBe(DEFAULT_TAG);
        expect(ruleSet.determineTag('http://localhost:3000')).toBe(DEFAULT_TAG);
      });
    });

    describe('internal URLs', () => {
      it('should return null for about: URLs', () => {
        expect(ruleSet.determineTag('about:blank')).toBeNull();
        expect(ruleSet.determineTag('about:config')).toBeNull();
        expect(ruleSet.determineTag('about:debugging')).toBeNull();
      });

      it('should return null for moz-extension: URLs', () => {
        expect(ruleSet.determineTag('moz-extension://extension-id/page.html')).toBeNull();
      });
    });

    describe('edge cases', () => {
      it('should return null for empty URLs', () => {
        expect(ruleSet.determineTag('')).toBeNull();
      });

      it('should handle URLs with query parameters', () => {
        expect(ruleSet.determineTag('https://github.com/user/repo?tab=readme')).toBe('[DEV]');
      });

      it('should handle URLs with fragments', () => {
        expect(ruleSet.determineTag('https://github.com/user/repo#section')).toBe('[DEV]');
      });

      it('should handle URLs with ports', () => {
        expect(ruleSet.determineTag('https://github.com:443/user/repo')).toBe('[DEV]');
      });

      it('should be case-sensitive in matching', () => {
        // Since includes() is case-sensitive
        expect(ruleSet.determineTag('https://GITHUB.COM/user/repo')).toBe(DEFAULT_TAG);
        expect(ruleSet.determineTag('https://github.com/user/repo')).toBe('[DEV]');
      });

      it('should handle subdomains', () => {
        expect(ruleSet.determineTag('https://api.github.com/repos')).toBe('[DEV]');
        expect(ruleSet.determineTag('https://gist.github.com/user/123')).toBe('[DEV]');
      });
    });

    describe('partial matching', () => {
      it('should match keywords anywhere in the URL', () => {
        expect(ruleSet.determineTag('https://subdomain.github.com.example.com')).toBe('[DEV]');
        expect(ruleSet.determineTag('https://example.com/path/github.com/more')).toBe('[DEV]');
      });
    });

    describe('empty rule set', () => {
      it('should return DEFAULT_TAG for all valid URLs when no rules exist', () => {
        const emptyRuleSet = new TaggingRuleSet([]);
        expect(emptyRuleSet.determineTag('https://github.com')).toBe(DEFAULT_TAG);
        expect(emptyRuleSet.determineTag('https://google.com')).toBe(DEFAULT_TAG);
      });

      it('should still return null for internal URLs', () => {
        const emptyRuleSet = new TaggingRuleSet([]);
        expect(emptyRuleSet.determineTag('about:blank')).toBeNull();
        expect(emptyRuleSet.determineTag('moz-extension://id/page.html')).toBeNull();
      });
    });

    describe('multiple keywords per rule', () => {
      it('should match any keyword in the rule', () => {
        const devTag = ruleSet.determineTag('https://github.com');
        expect(devTag).toBe('[DEV]');

        const devTag2 = ruleSet.determineTag('https://bitbucket.com');
        expect(devTag2).toBe('[DEV]');

        const devTag3 = ruleSet.determineTag('https://gitlab.com');
        expect(devTag3).toBe('[DEV]');
      });
    });
  });

  describe('TaggingRule interface', () => {
    it('should create valid tagging rules', () => {
      const rule: TaggingRule = {
        tag: '[TEST]',
        match: ['test.com', 'testing.com']
      };

      expect(rule.tag).toBe('[TEST]');
      expect(rule.match).toEqual(['test.com', 'testing.com']);
    });

    it('should enforce readonly properties', () => {
      const rule: TaggingRule = {
        tag: '[TEST]',
        match: ['test.com']
      };

      // These would fail at compile time:
      // rule.tag = '[OTHER]';
      // rule.match = ['other.com'];
      // rule.match.push('another.com'); // readonly array

      expect(rule).toBeDefined();
    });
  });

  describe('custom ignored URL patterns', () => {
    it('should respect custom ignored patterns', () => {
      const customIgnoredPatterns = ['chrome:', 'edge:', 'internal:'];
      const customRuleSet = new TaggingRuleSet(testRules, customIgnoredPatterns);

      expect(customRuleSet.determineTag('chrome://settings')).toBeNull();
      expect(customRuleSet.determineTag('edge://flags')).toBeNull();
      expect(customRuleSet.determineTag('internal://page')).toBeNull();
    });

    it('should allow about: URLs when not in ignored patterns', () => {
      const noAboutRuleSet = new TaggingRuleSet(testRules, ['moz-extension:']);

      // about: URLs should return DEFAULT_TAG since they're not ignored
      expect(noAboutRuleSet.determineTag('about:blank')).toBe(DEFAULT_TAG);
      expect(noAboutRuleSet.determineTag('about:config')).toBe(DEFAULT_TAG);

      // But moz-extension: should still be ignored
      expect(noAboutRuleSet.determineTag('moz-extension://id/page.html')).toBeNull();
    });

    it('should handle empty ignored patterns array', () => {
      const noIgnoredRuleSet = new TaggingRuleSet(testRules, []);

      // Nothing is ignored, so internal URLs get DEFAULT_TAG
      expect(noIgnoredRuleSet.determineTag('about:blank')).toBe(DEFAULT_TAG);
      expect(noIgnoredRuleSet.determineTag('moz-extension://id/page.html')).toBe(DEFAULT_TAG);

      // Regular URLs still work
      expect(noIgnoredRuleSet.determineTag('https://github.com')).toBe('[DEV]');
    });
  });
});
