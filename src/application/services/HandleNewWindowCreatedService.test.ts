import { describe, it, expect } from 'vitest';
import { HandleNewWindowCreatedService } from './HandleNewWindowCreatedService';
import { makeLogger, makeWindowRepository, emailSpec, defaultSpec, tab, windowId } from './testUtils';
import { createNewWindowCreatedEvent } from '../../domain/events/NewWindowCreatedEvent';

describe('HandleNewWindowCreatedService', () => {
    it('opens a new window and sets the title prefix', async () => {
        const t = tab(1, 'https://mail.google.com/inbox');
        const event = createNewWindowCreatedEvent(windowId('win-a'), t, emailSpec);
        const windowRepo = makeWindowRepository();

        await new HandleNewWindowCreatedService(windowRepo, makeLogger()).execute(event);

        expect(windowRepo.openWindow).toHaveBeenCalledWith(windowId('win-a'), t);
        expect(windowRepo.setTitlePrefix).toHaveBeenCalledWith(windowId('win-a'), emailSpec.name);
    });

    it('sets the theme when the specification has one', async () => {
        const t = tab(1, 'https://mail.google.com/inbox');
        const event = createNewWindowCreatedEvent(windowId('win-a'), t, emailSpec);
        const windowRepo = makeWindowRepository();

        await new HandleNewWindowCreatedService(windowRepo, makeLogger()).execute(event);

        expect(windowRepo.setTheme).toHaveBeenCalledWith(windowId('win-a'), emailSpec.theme);
    });

    it('does not set the theme when the specification has none', async () => {
        const t = tab(1, 'https://example.com');
        const event = createNewWindowCreatedEvent(windowId('win-a'), t, defaultSpec);
        const windowRepo = makeWindowRepository();

        await new HandleNewWindowCreatedService(windowRepo, makeLogger()).execute(event);

        expect(windowRepo.setTheme).not.toHaveBeenCalled();
    });
});
