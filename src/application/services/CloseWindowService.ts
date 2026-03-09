import type { CloseWindowUseCase } from "../ports/in/CloseWindowUseCase";
import type { NamedWindowsRepository } from "../ports/out/NamedWindowsRepository";
import type { Logger } from "../ports/Logger";
import type { WindowId } from "../../domain/WindowName";

export class CloseWindowService implements CloseWindowUseCase {
    constructor(
        private readonly namedWindowsRepository: NamedWindowsRepository,
        private readonly logger: Logger
    ) {}

    async execute(windowId: WindowId): Promise<void> {
        const namedWindows = await this.namedWindowsRepository.get();
        if (!namedWindows) {
            this.logger.log(`[WINDOW] Window ${windowId} closed but no NamedWindows aggregate exists, ignoring.`);
            return;
        }

        this.logger.log(`[WINDOW] Window ${windowId} closed — clearing its assignment.`);
        const updated = namedWindows.clearWindow(windowId);
        await this.namedWindowsRepository.save(updated);
    }
}


