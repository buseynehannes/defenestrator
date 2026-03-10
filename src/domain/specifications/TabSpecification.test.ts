import { describe, it, expect } from 'vitest';
import { createTabSpecification } from './TabSpecification';
import { createTab, createTabId } from '../windows/Tab';

describe('TabSpecification', () => {
    const tab = (url: string) => createTab(createTabId(1), url);

    describe('isSatisfiedBy', () => {
        it('returns true when the tab URL contains the pattern', () => {
            const spec = createTabSpecification('mail.google.com');
            expect(spec.isSatisfiedBy(tab('https://mail.google.com/mail/u/0/'))).toBe(true);
        });

        it('returns true for a partial URL match', () => {
            const spec = createTabSpecification('google.com');
            expect(spec.isSatisfiedBy(tab('https://mail.google.com/inbox'))).toBe(true);
        });

        it('returns false when the tab URL does not contain the pattern', () => {
            const spec = createTabSpecification('mail.google.com');
            expect(spec.isSatisfiedBy(tab('https://outlook.com/inbox'))).toBe(false);
        });

        it('returns false for an empty URL', () => {
            const spec = createTabSpecification('mail.google.com');
            expect(spec.isSatisfiedBy(tab(''))).toBe(false);
        });

        it('exposes the urlPattern', () => {
            const spec = createTabSpecification('protonmail.com');
            expect(spec.urlPattern).toBe('protonmail.com');
        });
    });
});

