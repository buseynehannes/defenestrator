import { describe, it, expect, vi } from 'vitest';
import { ToggleCurrentWindowStickyService } from './ToggleCurrentWindowStickyService';
import {
    makeLogger, makeNamedWindows, makeNamedWindowsRepository, makeWindowRepository, makeSpecsRepository,
    emailSpec, defaultSpec, prioritizedSpecs, windowId,
} from './testUtils';
import { createNamedWindowSpecification } from '../../domain/specifications/NamedWindowSpecification';
import { createTabSpecification } from '../../domain/specifications/TabSpecification';
import type { WindowName } from '../../domain/WindowName';

describe('ToggleCurrentWindowStickyService', () => {
    const firefoxWindowId = 42;
    const domainWindowId = windowId('win-a');

    function makeService({
        resolvedWindowId = domainWindowId as ReturnType<typeof windowId> | null,
        namedWindows = makeNamedWindows({
            getSpecifications: vi.fn().mockReturnValue([emailSpec, defaultSpec]),
            getWindowId: vi.fn().mockImplementation(spec =>
                spec === emailSpec ? domainWindowId : null
            ),
        }),
        specs = prioritizedSpecs,
    } = {}) {
        return new ToggleCurrentWindowStickyService(
            makeWindowRepository({ resolveWindowId: vi.fn().mockResolvedValue(resolvedWindowId) }),
            makeNamedWindowsRepository(namedWindows),
            makeSpecsRepository(specs),
            makeLogger(),
        );
    }

    it('returns null when the Firefox window is not tracked', async () => {
        const service = makeService({ resolvedWindowId: null });
        expect(await service.execute(firefoxWindowId)).toBeNull();
    });

    it('returns null when NamedWindows is not initialized', async () => {
        const service = new ToggleCurrentWindowStickyService(
            makeWindowRepository({ resolveWindowId: vi.fn().mockResolvedValue(domainWindowId) }),
            makeNamedWindowsRepository(null),
            makeSpecsRepository(),
            makeLogger(),
        );
        expect(await service.execute(firefoxWindowId)).toBeNull();
    });

    it('returns null when the domain window has no assigned spec', async () => {
        const namedWindows = makeNamedWindows({
            getSpecifications: vi.fn().mockReturnValue([emailSpec, defaultSpec]),
            getWindowId: vi.fn().mockReturnValue(null),
        });
        const service = makeService({ namedWindows });
        expect(await service.execute(firefoxWindowId)).toBeNull();
    });

    it('toggles a non-sticky spec to sticky and returns the updated info', async () => {
        const specsRepo = makeSpecsRepository(prioritizedSpecs);
        const service = makeService({ specs: prioritizedSpecs });
        // Rebuild service with the spy-backed repo
        const serviceWithSpy = new ToggleCurrentWindowStickyService(
            makeWindowRepository({ resolveWindowId: vi.fn().mockResolvedValue(domainWindowId) }),
            makeNamedWindowsRepository(makeNamedWindows({
                getSpecifications: vi.fn().mockReturnValue([emailSpec, defaultSpec]),
                getWindowId: vi.fn().mockImplementation(spec =>
                    spec === emailSpec ? domainWindowId : null
                ),
            })),
            specsRepo,
            makeLogger(),
        );

        const result = await serviceWithSpy.execute(firefoxWindowId);

        expect(result).not.toBeNull();
        expect(result!.name).toBe('[EMAIL]');
        expect(result!.sticky).toBe(true);
        expect(specsRepo.savePrioritizedSpecifications).toHaveBeenCalledOnce();
    });

    it('toggles a sticky spec back to non-sticky', async () => {
        const stickyEmail = createNamedWindowSpecification(
            '[EMAIL]' as WindowName,
            [createTabSpecification('mail.google.com')],
            undefined,
            true,
        );
        const namedWindows = makeNamedWindows({
            getSpecifications: vi.fn().mockReturnValue([stickyEmail, defaultSpec]),
            getWindowId: vi.fn().mockImplementation(spec =>
                spec === stickyEmail ? domainWindowId : null
            ),
        });
        // Build a prioritizedSpecs that contains the sticky version
        const { createPrioritizedNamedWindowSpecifications } = await import('../../domain/specifications/PrioritizedNamedWindowSpecifications');
        const { createGlobalIgnoredUrls } = await import('../../domain/specifications/GlobalIgnoredUrls');
        const stickySpecs = createPrioritizedNamedWindowSpecifications(
            [stickyEmail, defaultSpec],
            createGlobalIgnoredUrls(['about:'])
        );
        const specsRepo = makeSpecsRepository(stickySpecs);

        const service = new ToggleCurrentWindowStickyService(
            makeWindowRepository({ resolveWindowId: vi.fn().mockResolvedValue(domainWindowId) }),
            makeNamedWindowsRepository(namedWindows),
            specsRepo,
            makeLogger(),
        );

        const result = await service.execute(firefoxWindowId);

        expect(result).not.toBeNull();
        expect(result!.sticky).toBe(false);
        expect(specsRepo.savePrioritizedSpecifications).toHaveBeenCalledOnce();
    });

    it('does not save and returns the spec unchanged when the window is the default spec', async () => {
        const namedWindows = makeNamedWindows({
            getSpecifications: vi.fn().mockReturnValue([emailSpec, defaultSpec]),
            getWindowId: vi.fn().mockImplementation(spec =>
                spec === defaultSpec ? domainWindowId : null
            ),
        });
        const specsRepo = makeSpecsRepository();

        const service = new ToggleCurrentWindowStickyService(
            makeWindowRepository({ resolveWindowId: vi.fn().mockResolvedValue(domainWindowId) }),
            makeNamedWindowsRepository(namedWindows),
            specsRepo,
            makeLogger(),
        );

        const result = await service.execute(firefoxWindowId);

        expect(result).not.toBeNull();
        expect(result!.isDefault).toBe(true);
        expect(specsRepo.savePrioritizedSpecifications).not.toHaveBeenCalled();
    });
});

