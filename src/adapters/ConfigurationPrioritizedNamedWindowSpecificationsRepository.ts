/**
 * ConfigurationPrioritizedNamedWindowSpecificationsRepository adapter
 * Implements PrioritizedNamedWindowSpecificationsRepository using browser storage
 */

import type {
    PrioritizedNamedWindowSpecificationsRepository
} from "../application/ports/out/PrioritizedNamedWindowSpecificationsRepository";
import type {PrioritizedNamedWindowSpecifications} from "../domain/specifications/PrioritizedNamedWindowSpecifications";
import type {NamedWindowSpecification} from "../domain/specifications/NamedWindowSpecification";
import type {WindowName} from "../domain/WindowName";
import type {Logger} from "../application/ports/Logger";
import {
    createNamedWindowSpecification,
    createDefaultNamedWindowSpecification
} from "../domain/specifications/NamedWindowSpecification";
import {createTabSpecification} from "../domain/specifications/TabSpecification";
import {createIgnoredTabSpecification} from "../domain/specifications/IgnoredTabSpecification";

declare const browser: typeof import("webextension-polyfill");

/**
 * Serializable representation of the configuration
 */
interface SerializedConfiguration {
    version: string;
    defaultWindowName: string;
    specifications: Array<{
        name: string;
        matchUrls: string[];
        ignoredUrls: string[];
        accentColor?: string;
        textColor?: string;
        frameColor?: string;
        tabBackgroundText?: string;
        sticky: boolean;
    }>;
}

export class ConfigurationPrioritizedNamedWindowSpecificationsRepository implements PrioritizedNamedWindowSpecificationsRepository {
    private readonly storageKey = "defenestrator_config";

    constructor(
        private readonly logger: Logger
    ) {
    }

    async getPrioritizedSpecifications(): Promise<PrioritizedNamedWindowSpecifications | null> {
        try {
            const result = await browser.storage.local.get(this.storageKey);
            const serialized = result[this.storageKey] as SerializedConfiguration | undefined;

            if (!serialized) {
                this.logger.log('[CONFIG] No configuration found in storage');
                return null;
            }

            const deserialized = this.deserializeConfiguration(serialized);
            this.logger.log('[CONFIG] Retrieved prioritized specifications from storage');
            return deserialized;
        } catch (e) {
            this.logger.error('[CONFIG] Error retrieving prioritized specifications:', e);
            return null;
        }
    }

    async savePrioritizedSpecifications(specs: PrioritizedNamedWindowSpecifications): Promise<void> {
        try {
            const serialized = this.serializeConfiguration(specs);

            await browser.storage.local.set({
                [this.storageKey]: serialized
            });

            this.logger.log('[CONFIG] Saved prioritized specifications to storage');
        } catch (e) {
            this.logger.error('[CONFIG] Error saving prioritized specifications:', e);
            throw e;
        }
    }

    /**
     * Serialize PrioritizedNamedWindowSpecifications to SerializedConfiguration
     */
    private serializeConfiguration(specs: PrioritizedNamedWindowSpecifications): SerializedConfiguration {
        // The last specification should be the default one
        const defaultSpec = specs.specifications[specs.specifications.length - 1];
        const defaultWindowName = defaultSpec?.name ?? "[DEFAULT]";

        return {
            version: "1.0",
            defaultWindowName,
            specifications: specs.specifications.map(spec => ({
                name: spec.name,
                matchUrls: [],
                ignoredUrls: [],
                sticky: spec.sticky || false
            }))
        };
    }

    /**
     * Deserialize SerializedConfiguration to PrioritizedNamedWindowSpecifications
     */
    private deserializeConfiguration(serialized: SerializedConfiguration): PrioritizedNamedWindowSpecifications {
        const specifications: NamedWindowSpecification[] = [];

        // Deserialize each specification
        for (const specData of serialized.specifications) {
            let spec: NamedWindowSpecification;

            // Cast the name to WindowName type
            const windowName = specData.name as WindowName;

            // Check if this is a default specification
            if (specData.name === serialized.defaultWindowName) {
                spec = createDefaultNamedWindowSpecification(windowName);
            } else {
                // Create tab specifications from match URLs
                const tabSpecs = specData.matchUrls.length > 0
                    ? specData.matchUrls.map(url => createTabSpecification(url))
                    : [createTabSpecification("")]; // Fallback to match-all pattern

                // Create ignored specification
                const ignoredSpec = createIgnoredTabSpecification(specData.ignoredUrls);

                // Build the theme object only if there are theme properties
                const theme = (specData.accentColor || specData.textColor || specData.frameColor || specData.tabBackgroundText)
                    ? {
                        ...(specData.accentColor && {accentColor: specData.accentColor}),
                        ...(specData.textColor && {textColor: specData.textColor}),
                        ...(specData.frameColor && {frameColor: specData.frameColor}),
                        ...(specData.tabBackgroundText && {tabBackgroundText: specData.tabBackgroundText})
                    }
                    : undefined;

                // Create the full specification
                spec = createNamedWindowSpecification(
                    windowName,
                    tabSpecs as unknown as readonly [any, ...any[]],
                    ignoredSpec,
                    theme,
                    specData.sticky
                );
            }

            specifications.push(spec);
        }

        // Create and return the PrioritizedNamedWindowSpecifications
        return {
            specifications
        };
    }
}
