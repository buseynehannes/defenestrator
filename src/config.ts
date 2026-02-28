import type { ConfigurationData } from "./domain/ConfigurationStore.js";

// CONFIGURATION: Define your tags and keywords here
// This is example configuration data that would be stored and loaded
export const EXAMPLE_RULES: ConfigurationData["windows"] = [
    { tag: "[DEV]", match: ["github.com", "bitbucket.com"] },
    { tag: "[MEET]", match: ["meet.google.com", "zoom.us"] },
    { tag: "[MAIL]", match: ["mail.google.com", "outlook.office.com", "dpg-media.app.lumapps.com"] },
    { tag: "[CONFLUENCE]", match: ["atlassian.dpgmedia.net/confluence"] },
    { tag: "[JIRA]", match: ["atlassian.dpgmedia.net/jira"] }
    // NOTE: Everything else defaults to [RESEARCH] (see TaggingRuleSet)
];
