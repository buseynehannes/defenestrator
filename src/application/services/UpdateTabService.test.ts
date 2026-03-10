import { describe, it, expect, vi } from 'vitest';
import { UpdateTabService } from './UpdateTabService';
import { makeLogger, makeNamedWindows, makeNamedWindowsRepository, tab, windowId } from './testUtils';

describe('UpdateTabService', () => {
    it('calls updateTab on the aggregate and saves the result', async () => {
        const currentWindowId = windowId('win-a');
        const t = tab(1, 'https://example.com');
        const updatedAggregate = makeNamedWindows();
        const namedWindows = makeNamedWindows({ updateTab: vi.fn().mockReturnValue(updatedAggregate) });
        const repository = makeNamedWindowsRepository(namedWindows);
        const service = new UpdateTabService(repository, makeLogger());

        await service.execute(t, currentWindowId);

        expect(namedWindows.updateTab).toHaveBeenCalledWith(t, currentWindowId);
        expect(repository.save).toHaveBeenCalledWith(updatedAggregate);
    });

    it('throws when NamedWindows is not yet initialized', async () => {
        const repository = makeNamedWindowsRepository(null);
        const service = new UpdateTabService(repository, makeLogger());

        await expect(service.execute(tab(1, 'https://example.com'), windowId('win-a')))
            .rejects.toThrow('NamedWindows not initialized');
    });

    it('re-throws errors from updateTab', async () => {
        const namedWindows = makeNamedWindows({
            updateTab: vi.fn().mockImplementation(() => { throw new Error('domain error'); })
        });
        const service = new UpdateTabService(makeNamedWindowsRepository(namedWindows), makeLogger());

        await expect(service.execute(tab(1, 'https://example.com'), windowId('win-a')))
            .rejects.toThrow('domain error');
    });
});
