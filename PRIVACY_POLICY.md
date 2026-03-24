# Privacy Policy — Tab Defenestrator

**Last updated: March 2026**

## What data is accessed

Tab Defenestrator reads the **URL and title of your open tabs** in order to match them against your configured window rules. This is the core function of the extension: routing tabs to the correct window based on URL patterns you define.

## What data is stored

Your **window specifications** (rule names, URL patterns, theme colours, sticky flags) are saved to Firefox's local extension storage (`browser.storage.local`). This data never leaves your device.

No tab URLs, tab titles, browsing history, or any other browsing activity is stored or transmitted anywhere.

## What data is shared

**Nothing.** Tab Defenestrator does not send any data to any server, third party, or external service. There is no analytics, no telemetry, and no network requests made by the extension.

## Permissions explained

| Permission | Why it is needed |
|---|---|
| `tabs` | Read tab URLs and titles to match them against your rules |
| `storage` | Save your window specifications locally on your device |
| `theme` | Apply your configured accent/frame colours to each named window |
| `notifications` | Show a brief confirmation when toggling a window's sticky status |
| `<all_urls>` | Required to read tab URLs for any website (no data is collected or sent) |

## Contact

Questions? Open an issue at https://github.com/hbuseyne/defenestrator

