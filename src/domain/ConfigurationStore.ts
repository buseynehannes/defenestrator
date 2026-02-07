import type { TaggingRule } from "./TaggingRule.js";

export interface Configuration {
    readonly rules: readonly TaggingRule[];
    readonly ignoredUrlPatterns: readonly string[];
}

export const DEFAULT_CONFIGURATION: Configuration = {
    rules: [
        {
            tag: "[DEV]",
            match: ["github.com", "bitbucket.com", "gitlab.com"],
            theme: { accentColor: "#24292e", textColor: "#ffffff" }
        },
        {
            tag: "[MEET]",
            match: ["meet.google.com", "zoom.us", "teams.microsoft.com"],
            theme: { accentColor: "#00897b", textColor: "#ffffff" }
        },
        {
            tag: "[MAIL]",
            match: ["mail.google.com", "outlook.office.com"],
            theme: { accentColor: "#d93025", textColor: "#ffffff" }
        },
        {
            tag: "[CONFLUENCE]",
            match: ["atlassian.net/confluence", "confluence."],
            theme: { accentColor: "#0052cc", textColor: "#ffffff" }
        },
        {
            tag: "[JIRA]",
            match: ["atlassian.net/jira", "jira."],
            theme: { accentColor: "#0052cc", textColor: "#ffffff" }
        }
    ],
    ignoredUrlPatterns: ["about:", "moz-extension:"]
};

export interface ConfigurationStore {
    getConfiguration(): Promise<Configuration>;
    saveConfiguration(config: Configuration): Promise<void>;
}
