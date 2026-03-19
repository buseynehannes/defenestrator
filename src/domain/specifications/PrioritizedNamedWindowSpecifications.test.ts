import {describe, it, expect} from 'vitest';
import {
    createPrioritizedNamedWindowSpecifications,
    createDefaultPrioritizedNamedWindowSpecifications,
    withUpdatedSpecification,
} from './PrioritizedNamedWindowSpecifications';
import {createNamedWindowSpecification} from './NamedWindowSpecification';
import {createDefaultNamedWindowSpecification} from './DefaultNamedWindowSpecification';
import {createTabSpecification} from './TabSpecification';
import {createGlobalIgnoredUrls} from './GlobalIgnoredUrls';
import type {WindowName} from '../WindowName';

describe('PrioritizedNamedWindowSpecifications', () => {
    const emailSpec = createNamedWindowSpecification(
        '[EMAIL]' as WindowName,
        [createTabSpecification('mail.google.com')]
    );
    const defaultSpec = createDefaultNamedWindowSpecification('[DEFAULT]' as WindowName);
    const globalIgnoredUrls = createGlobalIgnoredUrls(['about:', 'moz-extension:']);

    describe('createPrioritizedNamedWindowSpecifications', () => {
        it('preserves specification order (earlier = higher priority)', () => {
            const prioritized = createPrioritizedNamedWindowSpecifications(
                [emailSpec, defaultSpec],
                globalIgnoredUrls
            );
            expect(prioritized.specifications[0]).toBe(emailSpec);
            expect(prioritized.specifications[1]).toBe(defaultSpec);
        });

        it('exposes the globalIgnoredUrls', () => {
            const prioritized = createPrioritizedNamedWindowSpecifications(
                [emailSpec, defaultSpec],
                globalIgnoredUrls
            );
            expect(prioritized.globalIgnoredUrls).toBe(globalIgnoredUrls);
        });

        it('throws when fewer than 2 specifications are provided', () => {
            expect(() => createPrioritizedNamedWindowSpecifications([], globalIgnoredUrls))
                .toThrow('at least 2 specifications');
            expect(() => createPrioritizedNamedWindowSpecifications([defaultSpec], globalIgnoredUrls))
                .toThrow('at least 2 specifications');
        });

        it('throws when the lowest-priority specification is not a default', () => {
            const anotherSpec = createNamedWindowSpecification(
                '[OTHER]' as WindowName,
                [createTabSpecification('example.com')]
            );
            expect(() => createPrioritizedNamedWindowSpecifications([emailSpec, anotherSpec], globalIgnoredUrls))
                .toThrow('lowest-priority specification must be a default');
        });

        it('throws when two specifications share the same name', () => {
            const duplicateEmail = createNamedWindowSpecification(
                '[EMAIL]' as WindowName,
                [createTabSpecification('outlook.com')]
            );
            expect(() => createPrioritizedNamedWindowSpecifications([emailSpec, duplicateEmail, defaultSpec], globalIgnoredUrls))
                .toThrow('Duplicate window specification names');
        });

        it('throws when a default specification appears at a higher priority position', () => {
            const anotherDefault = createDefaultNamedWindowSpecification('[OTHER_DEFAULT]' as WindowName);
            expect(() => createPrioritizedNamedWindowSpecifications([anotherDefault, emailSpec, defaultSpec], globalIgnoredUrls))
                .toThrow('Only the lowest-priority specification can be a default');
        });

        it('accepts a valid list with unique names ending in a default', () => {
            expect(() => createPrioritizedNamedWindowSpecifications([emailSpec, defaultSpec], globalIgnoredUrls))
                .not.toThrow();
        });
    });

    describe('createDefaultPrioritizedNamedWindowSpecifications', () => {
        it('returns a configuration with at least two specifications', () => {
            const defaults = createDefaultPrioritizedNamedWindowSpecifications();
            expect(defaults.specifications.length).toBeGreaterThanOrEqual(2);
        });

        it('last specification is the default (accepts any tab)', () => {
            const defaults = createDefaultPrioritizedNamedWindowSpecifications();
            const last = defaults.specifications[defaults.specifications.length - 1];
            expect(last!.shouldAcceptTab({id: 1 as any, url: 'https://anything.com'})).toBe(true);
        });

        it('has an email specification before the default', () => {
            const defaults = createDefaultPrioritizedNamedWindowSpecifications();
            const emailSpecification = defaults.specifications.find(s => s.name === '[EMAIL]');
            expect(emailSpecification).toBeDefined();
        });

        it('email specification accepts google mail URLs', () => {
            const defaults = createDefaultPrioritizedNamedWindowSpecifications();
            const email = defaults.specifications.find(s => s.name === '[EMAIL]')!;
            expect(email.shouldAcceptTab({id: 1 as any, url: 'https://mail.google.com/inbox'})).toBe(true);
        });

        it('email specification does not accept unrelated URLs', () => {
            const defaults = createDefaultPrioritizedNamedWindowSpecifications();
            const email = defaults.specifications.find(s => s.name === '[EMAIL]')!;
            expect(email.shouldAcceptTab({id: 1 as any, url: 'https://example.com'})).toBe(false);
        });

        it('globally ignores about: URLs', () => {
            const defaults = createDefaultPrioritizedNamedWindowSpecifications();
            expect(defaults.globalIgnoredUrls.isIgnored({id: 1 as any, url: 'about:newtab'})).toBe(true);
        });

        it('globally ignores moz-extension: URLs', () => {
            const defaults = createDefaultPrioritizedNamedWindowSpecifications();
            expect(defaults.globalIgnoredUrls.isIgnored({
                id: 1 as any,
                url: 'moz-extension://id/page.html'
            })).toBe(true);
        });

        it('does not globally ignore regular https URLs', () => {
            const defaults = createDefaultPrioritizedNamedWindowSpecifications();
            expect(defaults.globalIgnoredUrls.isIgnored({id: 1 as any, url: 'https://example.com'})).toBe(false);
        });
    });

    describe('withUpdatedSpecification', () => {
        it('replaces the matching spec while keeping all others', () => {
            const workSpec = createNamedWindowSpecification(
                '[WORK]' as any,
                [createTabSpecification('work.com')]
            );
            const prioritized = createPrioritizedNamedWindowSpecifications(
                [emailSpec, workSpec, defaultSpec],
                globalIgnoredUrls
            );
            const updatedEmail = createNamedWindowSpecification(
                '[EMAIL]' as any,
                [createTabSpecification('mail.google.com')],
                undefined,
                true // toggled sticky
            );

            const result = withUpdatedSpecification(prioritized, updatedEmail);

            expect(result.specifications).toHaveLength(3);
            expect(result.getSpecificationByName('[EMAIL]' as any)!.sticky).toBe(true);
            expect(result.getSpecificationByName('[WORK]' as any)).toBe(workSpec);
            expect(result.getSpecificationByName('[DEFAULT]' as any)).toBe(defaultSpec);
        });

        it('preserves the original order of specifications', () => {
            const prioritized = createPrioritizedNamedWindowSpecifications(
                [emailSpec, defaultSpec],
                globalIgnoredUrls
            );
            const updatedEmail = createNamedWindowSpecification(
                '[EMAIL]' as any,
                [createTabSpecification('mail.google.com')],
                undefined,
                true
            );

            const result = withUpdatedSpecification(prioritized, updatedEmail);

            expect(result.specifications[0]!.name).toBe('[EMAIL]');
            expect(result.specifications[1]!.name).toBe('[DEFAULT]');
        });

        it('preserves the globalIgnoredUrls', () => {
            const prioritized = createPrioritizedNamedWindowSpecifications(
                [emailSpec, defaultSpec],
                globalIgnoredUrls
            );
            const result = withUpdatedSpecification(prioritized, emailSpec);
            expect(result.globalIgnoredUrls).toBe(globalIgnoredUrls);
        });

        it('does not mutate the original', () => {
            const prioritized = createPrioritizedNamedWindowSpecifications(
                [emailSpec, defaultSpec],
                globalIgnoredUrls
            );
            const updatedEmail = createNamedWindowSpecification(
                '[EMAIL]' as any,
                [createTabSpecification('mail.google.com')],
                undefined,
                true
            );
            withUpdatedSpecification(prioritized, updatedEmail);
            expect(prioritized.getSpecificationByName('[EMAIL]' as any)!.sticky).toBe(false);
        });
    });
});

