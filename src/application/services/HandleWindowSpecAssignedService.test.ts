import { describe, it, expect } from 'vitest';
import { HandleWindowSpecAssignedService } from './HandleWindowSpecAssignedService';
import { makeLogger, makeWindowRepository, emailSpec, defaultSpec, windowId } from './testUtils';
import { createWindowSpecAssignedEvent } from '../../domain/events/WindowSpecAssignedEvent';

describe('HandleWindowSpecAssignedService', () => {
    it('sets the title prefix for the assigned window', async () => {
        const event = createWindowSpecAssignedEvent(windowId('win-a'), emailSpec);
        const windowRepo = makeWindowRepository();

        await new HandleWindowSpecAssignedService(windowRepo, makeLogger()).execute(event);

        expect(windowRepo.setTitlePrefix).toHaveBeenCalledWith(windowId('win-a'), emailSpec.name);
    });

    it('sets the theme when the specification has one', async () => {
        const event = createWindowSpecAssignedEvent(windowId('win-a'), emailSpec);
        const windowRepo = makeWindowRepository();

        await new HandleWindowSpecAssignedService(windowRepo, makeLogger()).execute(event);

        expect(windowRepo.setTheme).toHaveBeenCalledWith(windowId('win-a'), emailSpec.theme);
    });

    it('does not set the theme when the specification has none', async () => {
        const event = createWindowSpecAssignedEvent(windowId('win-a'), defaultSpec);
        const windowRepo = makeWindowRepository();

        await new HandleWindowSpecAssignedService(windowRepo, makeLogger()).execute(event);

        expect(windowRepo.setTheme).not.toHaveBeenCalled();
    });
});
