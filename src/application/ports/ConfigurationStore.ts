/**
 * ConfigurationStore port
 * Defines the contract for configuration persistence
 */

export interface ConfigurationData {
    windows: Array<{
        tag: string;
        match: string[];
        theme?: {
            accentColor?: string;
            textColor?: string;
            frameColor?: string;
            tabBackgroundText?: string;
        };
        sticky?: boolean;
    }>;
    defaultWindowTag?: string;
    defaultWindowTheme?: {
        accentColor?: string;
        textColor?: string;
        frameColor?: string;
        tabBackgroundText?: string;
    };
    ignoredUrlPatterns: string[];
}

export interface ConfigurationStore {
    getConfiguration(): Promise<ConfigurationData>;
    saveConfiguration(config: ConfigurationData): Promise<void>;
}

