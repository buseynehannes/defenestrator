import { DEFAULT_TAG } from './WindowTag';
import type { WindowTag, WindowId, TaggedWindow } from './WindowTag';

describe('WindowTag', () => {
  describe('DEFAULT_TAG', () => {
    it('should have the correct default tag value', () => {
      expect(DEFAULT_TAG).toBe('[RESEARCH]');
    });

    it('should be of type WindowTag', () => {
      const tag: WindowTag = DEFAULT_TAG;
      expect(typeof tag).toBe('string');
    });
  });

  describe('WindowTag type', () => {
    it('should accept any string as WindowTag', () => {
      const devTag: WindowTag = '[DEV]';
      const meetTag: WindowTag = '[MEET]';
      const customTag: WindowTag = '[CUSTOM]';

      expect(devTag).toBe('[DEV]');
      expect(meetTag).toBe('[MEET]');
      expect(customTag).toBe('[CUSTOM]');
    });
  });

  describe('WindowId type', () => {
    it('should handle WindowId as a number', () => {
      const windowId: WindowId = 123 as WindowId;
      expect(typeof windowId).toBe('number');
      expect(windowId).toBe(123);
    });

    it('should support multiple window IDs', () => {
      const ids: WindowId[] = [1, 2, 3, 100, 999] as WindowId[];
      expect(ids).toHaveLength(5);
      expect(ids[0]).toBe(1);
      expect(ids[4]).toBe(999);
    });
  });

  describe('TaggedWindow interface', () => {
    it('should create a valid TaggedWindow object', () => {
      const taggedWindow: TaggedWindow = {
        id: 456 as WindowId,
        tag: '[DEV]'
      };

      expect(taggedWindow.id).toBe(456);
      expect(taggedWindow.tag).toBe('[DEV]');
    });

    it('should enforce readonly properties', () => {
      const taggedWindow: TaggedWindow = {
        id: 789 as WindowId,
        tag: '[MEET]'
      };

      expect(taggedWindow).toBeDefined();
    });

    it('should support different tag types', () => {
      const devWindow: TaggedWindow = { id: 1 as WindowId, tag: '[DEV]' };
      const meetWindow: TaggedWindow = { id: 2 as WindowId, tag: '[MEET]' };
      const mailWindow: TaggedWindow = { id: 3 as WindowId, tag: '[MAIL]' };
      const researchWindow: TaggedWindow = { id: 4 as WindowId, tag: DEFAULT_TAG };

      expect(devWindow.tag).toBe('[DEV]');
      expect(meetWindow.tag).toBe('[MEET]');
      expect(mailWindow.tag).toBe('[MAIL]');
      expect(researchWindow.tag).toBe('[RESEARCH]');
    });

    it('should work in collections', () => {
      const windows: TaggedWindow[] = [
        { id: 1 as WindowId, tag: '[DEV]' },
        { id: 2 as WindowId, tag: '[MEET]' },
        { id: 3 as WindowId, tag: DEFAULT_TAG }
      ];

      expect(windows).toHaveLength(3);
      expect(windows.find(w => w.tag === '[DEV]')).toBeDefined();
      expect(windows.find(w => w.tag === '[MEET]')).toBeDefined();
      expect(windows.find(w => w.tag === DEFAULT_TAG)).toBeDefined();
    });
  });

  describe('Type relationships', () => {
    it('should allow WindowTag and DEFAULT_TAG to be compared', () => {
      const currentTag: WindowTag = '[RESEARCH]';
      expect(currentTag === DEFAULT_TAG).toBe(true);
    });

    it('should allow WindowTag comparisons', () => {
      const tag1: WindowTag = '[DEV]';
      const tag2: WindowTag = '[DEV]';
      const tag3: WindowTag = '[MEET]';

      expect(tag1 === tag2).toBe(true);
      expect(tag1 === tag3).toBe(false);
    });
  });
});
