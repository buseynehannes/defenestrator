import { describe, it, expect, vi } from 'vitest';
import { RestoreNamedWindowsService } from './RestoreNamedWindowsService';
import {
    makeLogger, makeNamedWindows, makeNamedWindowsRepository,
    makeWindowRepository, makeSpecsRepository,
    emailSpec, tab, windowId,
} from './testUtils';
import type { NamedWindows } from '../../domain/NamedWindows';
import { createWindow } from '../../domain/windows/Window';

describe('RestoreNamedWindowsService', () => {
    it('skips restoration when NamedWindows is already initialized', async () => {
        const namedWindowsRepo = makeNamedWindowsRepository(makeNamedWindows());
        const windowRepo = makeWindowRepository();
        const service = new RestoreNamedWindowsService(windowRepo, makeSpecsRepository(), namedWindowsRepo, makeLogger());

        await service.execute();

        expect(windowRepo.getAllWindows).not.toHaveBeenCalled();
        expect(namedWindowsRepo.save).not.toHaveBeenCalled();
    });

    it('skips restoration when no specifications are found', async () => {
        const namedWindowsRepo = makeNamedWindowsRepository(null);
        const specsRepo = makeSpecsRepository();
        specsRepo.getPrioritizedSpecifications = vi.fn().mockResolvedValue(null);
        const windowRepo = makeWindowRepository();
        const service = new RestoreNamedWindowsService(windowRepo, specsRepo, namedWindowsRepo, makeLogger());

        await service.execute();

        expect(namedWindowsRepo.save).not.toHaveBeenCalled();
    });

    it('fetches all windows, classifies them, and saves the aggregate', async () => {
        const wins = [createWindow(windowId('win-a'), [tab(1, 'https://mail.google.com/inbox')])];
        const namedWindowsRepo = makeNamedWindowsRepository(null);
        const windowRepo = makeWindowRepository({ getAllWindows: vi.fn().mockResolvedValue(wins) });
        const service = new RestoreNamedWindowsService(windowRepo, makeSpecsRepository(), namedWindowsRepo, makeLogger());

        await service.execute();

        expect(windowRepo.getAllWindows).toHaveBeenCalled();
        expect(namedWindowsRepo.save).toHaveBeenCalledOnce();
    });

    it('saves a NamedWindows that has the correct window assigned to the email spec', async () => {
        const wins = [createWindow(windowId('win-a'), [tab(1, 'https://mail.google.com/inbox')])];
        const namedWindowsRepo = makeNamedWindowsRepository(null);
        const windowRepo = makeWindowRepository({ getAllWindows: vi.fn().mockResolvedValue(wins) });
        const service = new RestoreNamedWindowsService(windowRepo, makeSpecsRepository(), namedWindowsRepo, makeLogger());

        await service.execute();

        const savedAggregate: NamedWindows = (namedWindowsRepo.save as ReturnType<typeof vi.fn>).mock.calls[0]![0];
        expect(savedAggregate.getWindowId(emailSpec)).toBe(windowId('win-a'));
    });
});

