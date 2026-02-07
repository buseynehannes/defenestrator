# 🔍 Visual Guide: Finding Background Script Logs

## Where to Look for Logs

### Background Script Console (Main Logs)

```
┌─────────────────────────────────────────────────┐
│  Firefox: about:debugging                      │
├─────────────────────────────────────────────────┤
│                                                 │
│  This Firefox                                   │
│  ┌───────────────────────────────────────────┐ │
│  │ 🔧 AeroSpace Tab Dispatcher              │ │
│  │ aerospace-dispatcher@hannesbuseyne.com    │ │
│  │                                           │ │
│  │ [Inspect] [Reload] [Remove]    <-- CLICK │ │
│  │     ↑                                     │ │
│  │     Click this to open console            │ │
│  └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘

After clicking "Inspect":

┌─────────────────────────────────────────────────┐
│  Debugger for moz-extension://...              │
├─────────────────────────────────────────────────┤
│  Console | Debugger | Sources                  │
│  ───────                                        │
│                                                 │
│  [CONFIG] Loading configuration...             │
│  [CONFIG] Configuration loaded successfully    │
│  [STARTUP] Restoring window tags...            │
│  [STARTUP] Window tag restoration complete     │
│  [DISPATCH] Processing: https://github.com ... │
│  [TAG] Window 123 tagged as [DEV]              │
│                                                 │
│  ↑ YOUR LOGS APPEAR HERE                       │
└─────────────────────────────────────────────────┘
```

### Options Page Console (UI Logs)

```
┌─────────────────────────────────────────────────┐
│  Firefox: about:addons                         │
├─────────────────────────────────────────────────┤
│  Extensions                                     │
│  ┌───────────────────────────────────────────┐ │
│  │ 🪟 AeroSpace Tab Dispatcher              │ │
│  │                                           │ │
│  │ [Options] [Disable] [Remove]   <-- CLICK │ │
│  │     ↑                                     │ │
│  └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘

Options page opens, then:
Right-click → Inspect Element

┌─────────────────────────────────────────────────┐
│  Defenestrator Configuration                   │
├─────────────────────────────────────────────────┤
│  [DevTools Panel at bottom/side]               │
│  Console | Elements | Network                  │
│  ───────                                        │
│                                                 │
│  (UI logs appear here)                         │
│  - Button clicks                               │
│  - Configuration changes                       │
│  - Save events                                 │
└─────────────────────────────────────────────────┘
```

## What Logs to Expect

### On Extension Load/Reload

**Background Console:**
```javascript
[CONFIG] Loading configuration...
[CONFIG] Configuration loaded successfully
[STARTUP] Restoring window tags...
[STARTUP] Tagged window 123 as [DEV] (sticky) based on 3/5 tabs
[STARTUP] Tagged window 456 as [MAIL] based on 2/2 tabs
[STARTUP] Window tag restoration complete
```

**What this means:**
- ✅ Background script is running
- ✅ Configuration loaded from storage
- ✅ Existing windows were analyzed and tagged

### When Opening New Tab

**Background Console:**
```javascript
[DISPATCH] Processing: https://github.com/user/repo -> [DEV]
[DISPATCH] >> Creating NEW window for [DEV]
[TAG] Window 789 tagged as [DEV] with theme
```

**What this means:**
- ✅ URL matched [DEV] rule
- ✅ New window created
- ✅ Window tagged and themed

### When Navigating in Existing Tab

**Background Console:**
```javascript
[DISPATCH] Processing: https://mail.google.com -> [MAIL]
[DISPATCH] >> Moving tab to existing window 456 [[MAIL]]
```

**What this means:**
- ✅ URL matched [MAIL] rule
- ✅ Found existing [MAIL] window
- ✅ Tab moved there

### When in Sticky Window

**Background Console:**
```javascript
[DISPATCH] Processing: https://github.com -> [DEV]
[DISPATCH] ✓ Window 123 is sticky ([RESEARCH]), not moving tab
```

**What this means:**
- ✅ Tab is in sticky window
- ✅ Movement blocked (expected)
- ✅ Tab stays where it is

### When Configuration Changes

**Options Page Console:**
```javascript
(UI interactions, saves, etc.)
```

**Background Console:**
```javascript
[CONFIG] Configuration changed, reloading...
[CONFIG] Loading configuration...
[CONFIG] Configuration loaded successfully
```

**What this means:**
- ✅ Detected storage change
- ✅ Reloaded configuration
- ✅ New rules active

## No Logs? Troubleshooting

### Problem: No [CONFIG] logs at all

**Cause:** Background script not loading

**Check:**
1. manifest.json correct? ✅
2. Extension reloaded? ✅
3. dist/background.js exists? ✅

**Fix:** Reload extension

### Problem: [CONFIG] logs but no [DISPATCH] logs

**Cause:** Tab events not triggering

**Check:**
1. Navigate to a URL (not just open tab)
2. URL matches a rule?
3. Permissions granted?

**Test:**
```javascript
// In background console:
browser.tabs.query({active: true}).then(tabs => {
    console.log('Active tab:', tabs[0].url);
});
```

### Problem: [DISPATCH] logs but tabs don't move

**Cause:** Logic issue or permissions

**Check console for:**
- Error messages?
- "Window is sticky"?
- "Already in correct window"?

**Each log tells you why tab didn't move**

## Color Coding

When viewing logs:

🟢 **Green/White** = Info (normal operation)
- `[CONFIG] ...`
- `[STARTUP] ...`
- `[DISPATCH] Processing...`
- `[TAG] ...`

🟡 **Yellow** = Warnings (non-critical)
- Usually from theme application
- Can be ignored

🔴 **Red** = Errors (needs fixing)
- Module not found
- Permission denied
- JavaScript errors

## Quick Reference

| What You Want | Where to Look |
|--------------|---------------|
| Extension loading | Background console |
| Tab organization | Background console |
| Window tagging | Background console |
| Theme application | Background console |
| UI interactions | Options page console |
| Errors | Both (look for red) |

## Copy-Paste Debug Commands

**Run in background console:**

```javascript
// Check if script loaded
console.log('✅ Background script is running!');

// Check configuration
browser.storage.local.get('defenestrator_config').then(r => {
    console.log('Config:', r);
});

// List all tabs
browser.tabs.query({}).then(tabs => {
    console.log(`Found ${tabs.length} tabs`);
    tabs.forEach(t => console.log(t.url));
});

// List all windows
browser.windows.getAll({}).then(wins => {
    console.log(`Found ${wins.length} windows`);
});

// Test tagging
browser.windows.getCurrent().then(win => {
    browser.windows.update(win.id, { titlePreface: '[TEST]' });
    console.log('Window should now show [TEST] prefix');
});
```

If these commands work → Extension is loaded! ✅

---

**Still stuck?** Check [BACKGROUND_SCRIPT_FIX.md](BACKGROUND_SCRIPT_FIX.md) for detailed troubleshooting.

