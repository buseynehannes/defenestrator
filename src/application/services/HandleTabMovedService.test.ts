import { describe, it, expect, vi } from 'vitest';
import { HandleTabMovedService } from './HandleTabMovedService';
import { makeLogger, makeWindowRepository, tab, windowId } from './testUtils';
import { createWindow } from '../../domain/windows/Window';
import { createTabMovedEvent } from '../../domain/events/TabMovedEvent';

describe('HandleTabMovedService', () => {
    it('moves the tab to the target window', async () => {
        const t = tab(1, 'https://mail.google.com/inbox');
        const event = createTabMovedEvent(t, windowId('win-a'), windowId('win-b'));
        const windowRepo = makeWindowRepository();

        await new HandleTabMovedService(windowRepo, makeLogger()).execute(event);

        expect(windowRepo.moveTab).toHaveBeenCalledWith(t, windowId('win-b'));
    });

    it('closes the source window when the moved tab was its only tab', async () => {
        const t = tab(1, 'https://mail.google.com/inbox');
        const fromWin = createWindow(windowId('win-a'), [t]);
        const event = createTabMovedEvent(t, windowId('win-a'), windowId('win-b'));
        const windowRepo = makeWindowRepository({
            getWindowByDomainId: vi.fn().mockResolvedValue(fromWin),
        });

        await new HandleTabMovedService(windowRepo, makeLogger()).execute(event);

        expect(windowRepo.closeWindow).toHaveBeenCalledWith(windowId('win-a'));
    });

    it('does not close the source window when it still has other tabs', async () => {
        const t = tab(1, 'https://mail.google.com/inbox');
        const fromWin = createWindow(windowId('win-a'), [t, tab(2, 'https://example.com')]);
        const event = createTabMovedEvent(t, windowId('win-a'), windowId('win-b'));
        const windowRepo = makeWindowRepository({
            getWindowByDomainId: vi.fn().mockResolvedValue(fromWin),
        });

        await new HandleTabMovedService(windowRepo, makeLogger()).execute(event);

        expect(windowRepo.closeWindow).not.toHaveBeenCalled();
    });

    it('does not close the source window when it cannot be found', async () => {
        const t = tab(1, 'https://mail.google.com/inbox');
        const event = createTabMovedEvent(t, windowId('win-a'), windowId('win-b'));
        const windowRepo = makeWindowRepository({
            getWindowByDomainId: vi.fn().mockResolvedValue(null),
        });

        await new HandleTabMovedService(windowRepo, makeLogger()).execute(event);

        expect(windowRepo.closeWindow).not.toHaveBeenCalled();
    });
});
