import { describe, it, expect, vi } from 'vitest';
import { GetCurrentWindowSpecService } from './GetCurrentWindowSpecService';
import {
    makeLogger, makeNamedWindows, makeNamedWindowsRepository, makeWindowRepository,
    emailSpec, defaultSpec, windowId,
} from './testUtils';

describe('GetCurrentWindowSpecService', () => {
    const firefoxWindowId = 42;
    const domainWindowId = windowId('win-a');

    it('returns the spec for the current window', async () => {
        const namedWindows = makeNamedWindows({
            getSpecifications: vi.fn().mockReturnValue([emailSpec, defaultSpec]),
            getWindowId: vi.fn().mockImplementation(spec =>
                spec === emailSpec ? domainWindowId : null
            ),
        });
        const service = new GetCurrentWindowSpecService(
            makeWindowRepository({ resolveWindowId: vi.fn().mockResolvedValue(domainWindowId) }),
            makeNamedWindowsRepository(namedWindows),
            makeLogger(),
        );

        const result = await service.execute(firefoxWindowId);

        expect(result).not.toBeNull();
        expect(result!.name).toBe('[EMAIL]');
        expect(result!.sticky).toBe(false);
        expect(result!.isDefault).toBe(false);
        expect(result!.matchUrls).toEqual(['mail.google.com']);
    });

    it('returns null when the Firefox window is not tracked by FirefoxWindowRepository', async () => {
        const service = new GetCurrentWindowSpecService(
            makeWindowRepository({ resolveWindowId: vi.fn().mockResolvedValue(null) }),
            makeNamedWindowsRepository(makeNamedWindows()),
            makeLogger(),
        );

        const result = await service.execute(firefoxWindowId);

        expect(result).toBeNull();
    });

    it('returns null when NamedWindows is not yet initialized', async () => {
        const service = new GetCurrentWindowSpecService(
            makeWindowRepository({ resolveWindowId: vi.fn().mockResolvedValue(domainWindowId) }),
            makeNamedWindowsRepository(null),
            makeLogger(),
        );

        const result = await service.execute(firefoxWindowId);

        expect(result).toBeNull();
    });

    it('returns null when the domain window ID has no matching spec in NamedWindows', async () => {
        const namedWindows = makeNamedWindows({
            getSpecifications: vi.fn().mockReturnValue([emailSpec, defaultSpec]),
            getWindowId: vi.fn().mockReturnValue(null), // no spec maps to this window
        });
        const service = new GetCurrentWindowSpecService(
            makeWindowRepository({ resolveWindowId: vi.fn().mockResolvedValue(domainWindowId) }),
            makeNamedWindowsRepository(namedWindows),
            makeLogger(),
        );

        const result = await service.execute(firefoxWindowId);

        expect(result).toBeNull();
    });

    it('includes an empty matchUrls array for the default spec', async () => {
        const namedWindows = makeNamedWindows({
            getSpecifications: vi.fn().mockReturnValue([emailSpec, defaultSpec]),
            getWindowId: vi.fn().mockImplementation(spec =>
                spec === defaultSpec ? domainWindowId : null
            ),
        });
        const service = new GetCurrentWindowSpecService(
            makeWindowRepository({ resolveWindowId: vi.fn().mockResolvedValue(domainWindowId) }),
            makeNamedWindowsRepository(namedWindows),
            makeLogger(),
        );

        const result = await service.execute(firefoxWindowId);

        expect(result).not.toBeNull();
        expect(result!.isDefault).toBe(true);
        expect(result!.matchUrls).toEqual([]);
    });
});

