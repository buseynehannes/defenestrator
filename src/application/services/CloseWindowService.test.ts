import { describe, it, expect, vi } from 'vitest';
import { CloseWindowService } from './CloseWindowService';
import { makeLogger, makeNamedWindows, makeNamedWindowsRepository, windowId } from './testUtils';

describe('CloseWindowService', () => {
    it('calls clearWindow on the aggregate and saves the result', async () => {
        const wId = windowId('win-a');
        const cleared = makeNamedWindows();
        const namedWindows = makeNamedWindows({ clearWindow: vi.fn().mockReturnValue(cleared) });
        const repository = makeNamedWindowsRepository(namedWindows);
        const service = new CloseWindowService(repository, makeLogger());

        await service.execute(wId);

        expect(namedWindows.clearWindow).toHaveBeenCalledWith(wId);
        expect(repository.save).toHaveBeenCalledWith(cleared);
    });

    it('does nothing when NamedWindows is not initialized', async () => {
        const repository = makeNamedWindowsRepository(null);
        const service = new CloseWindowService(repository, makeLogger());

        await service.execute(windowId('win-a'));

        expect(repository.save).not.toHaveBeenCalled();
    });
});
