import type { ToggleCurrentWindowStickyUseCase } from '../ports/in/ToggleCurrentWindowStickyUseCase';
import type { WindowSpecInfo } from '../ports/in/GetCurrentWindowSpecUseCase';
import type { WindowRepository } from '../ports/out/WindowRepository';
import type { NamedWindowsRepository } from '../ports/out/NamedWindowsRepository';
import type { PrioritizedNamedWindowSpecificationsRepository } from '../ports/out/PrioritizedNamedWindowSpecificationsRepository';
import type { Logger } from '../ports/Logger';
import { withStickyToggled } from '../../domain/specifications/NamedWindowSpecification';
import { withUpdatedSpecification } from '../../domain/specifications/PrioritizedNamedWindowSpecifications';

export class ToggleCurrentWindowStickyService implements ToggleCurrentWindowStickyUseCase {
    constructor(
        private readonly windowRepository: WindowRepository,
        private readonly namedWindowsRepository: NamedWindowsRepository,
        private readonly specsRepository: PrioritizedNamedWindowSpecificationsRepository,
        private readonly logger: Logger,
    ) {}

    async execute(firefoxWindowId: number): Promise<WindowSpecInfo | null> {
        const windowId = await this.windowRepository.resolveWindowId(firefoxWindowId);
        if (!windowId) {
            this.logger.log(`[POPUP] Toggle sticky: window ${firefoxWindowId} is not tracked`);
            return null;
        }

        const namedWindows = await this.namedWindowsRepository.get();
        if (!namedWindows) return null;

        const currentSpec = namedWindows.getSpecifications()
            .find(spec => namedWindows.getWindowId(spec) === windowId);

        if (!currentSpec) {
            this.logger.log(`[POPUP] Toggle sticky: no spec found for window ${firefoxWindowId}`);
            return null;
        }

        if (currentSpec.isDefault) {
            this.logger.log('[POPUP] Toggle sticky: default spec cannot be made sticky');
            return {
                name: currentSpec.name,
                sticky: currentSpec.sticky,
                isDefault: true,
                matchUrls: [],
            };
        }

        const specs = await this.specsRepository.getPrioritizedSpecifications();
        if (!specs) return null;

        const updatedSpec = withStickyToggled(currentSpec);
        const updatedSpecs = withUpdatedSpecification(specs, updatedSpec);
        await this.specsRepository.savePrioritizedSpecifications(updatedSpecs);

        this.logger.log(`[POPUP] Toggled sticky for "${currentSpec.name}": ${currentSpec.sticky} → ${updatedSpec.sticky}`);

        return {
            name: updatedSpec.name,
            sticky: updatedSpec.sticky,
            isDefault: false,
            matchUrls: updatedSpec.tabSpecifications?.map(ts => ts.urlPattern) ?? [],
        };
    }
}

