import type { TaggingRule } from "./domain/TaggingRule.js";

// CONFIGURATION: Define your tags and keywords here
export const RULE_SETS: readonly TaggingRule[] = [
    { tag: "[DEV]", match: ["github.com", "bitbucket.com"] },
    { tag: "[MEET]", match: ["meet.google.com", "zoom.us"] },
    { tag: "[MAIL]", match: ["mail.google.com", "outlook.office.com", "dpg-media.app.lumapps.com"] },
    { tag: "[CONFLUENCE]", match: ["atlassian.dpgmedia.net/confluence"] },
    { tag: "[JIRA]", match: ["atlassian.dpgmedia.net/jira"] }
    // NOTE: Everything else defaults to [RESEARCH] (see TaggingRuleSet)
];
