import type { GetCurrentWindowSpecUseCase, WindowSpecInfo } from '../ports/in/GetCurrentWindowSpecUseCase';
import type { WindowRepository } from '../ports/out/WindowRepository';
import type { NamedWindowsRepository } from '../ports/out/NamedWindowsRepository';
import type { Logger } from '../ports/Logger';

export class GetCurrentWindowSpecService implements GetCurrentWindowSpecUseCase {
    constructor(
        private readonly windowRepository: WindowRepository,
        private readonly namedWindowsRepository: NamedWindowsRepository,
        private readonly logger: Logger,
    ) {}

    async execute(firefoxWindowId: number): Promise<WindowSpecInfo | null> {
        const windowId = await this.windowRepository.resolveWindowId(firefoxWindowId);
        if (!windowId) {
            this.logger.log(`[POPUP] Window ${firefoxWindowId} is not tracked`);
            return null;
        }

        const namedWindows = await this.namedWindowsRepository.get();
        if (!namedWindows) {
            this.logger.log('[POPUP] NamedWindows not yet initialized');
            return null;
        }

        for (const spec of namedWindows.getSpecifications()) {
            if (namedWindows.getWindowId(spec) === windowId) {
                return {
                    name: spec.name,
                    sticky: spec.sticky,
                    isDefault: spec.isDefault,
                    matchUrls: spec.tabSpecifications?.map(ts => ts.urlPattern) ?? [],
                };
            }
        }

        this.logger.log(`[POPUP] No spec found for window ${firefoxWindowId}`);
        return null;
    }
}

