# 🔍 How to See Extension Logs (web-ext run)

## The Problem
You're opening the Browser Console (`Cmd+Shift+J`), but extension background script logs appear in a **different console** - the Extension Background Console.

## Solution: Open Extension Background Console

### Method 1: Via about:debugging (Easiest)

1. **In Firefox, open a new tab**
2. **Go to:** `about:debugging#/runtime/this-firefox`
3. **Find:** "AeroSpace Tab Dispatcher" in the list
4. **Click:** The **"Inspect"** button next to it
5. **DevTools opens** with the Console tab showing your extension logs!

### Method 2: Using web-ext (In Terminal)

When you run `web-ext run`, some logs appear in the **terminal**, but detailed logs are still in the Extension Console (Method 1).

However, you can see basic logs in terminal with:

```bash
web-ext run --verbose
```

But for full debugging, you still need to use Method 1.

## Different Consoles Explained

| Console                          | Shortcut                           | What It Shows                          |
|----------------------------------|------------------------------------|----------------------------------------|
| **Browser Console**              | `Cmd+Shift+J`                      | General Firefox logs, page errors      |
| **Web Console**                  | `Cmd+Option+K`                     | Current page's console (not extension) |
| **Extension Background Console** | Via `about:debugging` → Inspect    | **Your extension logs** ← USE THIS!    |
| **Options Page Console**         | Right-click options page → Inspect | Options page UI logs                   |

## Where Your Logs Are

### Background Script Logs (Main Extension Logic)
**Location:** Extension Background Console (Method 1 above)

**What you'll see:**

```javascript
[CONFIG]
Loading
configuration
...
[CONFIG]
Configuration
loaded
successfully
    [STARTUP]
Restoring
window
tags
...
[STARTUP]
Tagged
window
123
as [DEV]
based
on
3 / 5
tabs
    [DISPATCH]
Processing: https://github.com -> [DEV]
    [DISPATCH] >> Creating
NEW
window
for [DEV]
        [THEME] Attempting
to
apply
theme
to
window
456
    [THEME]
Theme
data
prepared: {
    colors: {...
    }
}
[THEME]
Theme
applied
successfully
to
window
456
    [TAG]
Window
456
tagged
as [DEV]
with theme
```

### Options Page Logs (UI Interactions)
**Location:** Right-click options page → Inspect Element → Console tab

**What you'll see:**
```javascript
Configuration saved successfully
Button clicked
Form submitted
```

### Terminal Logs (web-ext)
**Location:** Terminal where you ran `web-ext run`

**What you'll see:**
```
Web ext running...
Extension loaded
[Some extension activity]
```

## Step-by-Step: See Your Logs Now

### 1. Make sure extension is running
```bash
# In terminal
cd /Users/hbuseyne/PersonalProjects/defenestrator
web-ext run
```

### 2. Open Extension Console
- New Firefox tab
- Go to: `about:debugging#/runtime/this-firefox`
- Find "AeroSpace Tab Dispatcher"
- Click "Inspect"

### 3. You Should See Logs!
The console opens and you should immediately see:
```
[CONFIG] Loading configuration...
[CONFIG] Configuration loaded successfully
[STARTUP] Restoring window tags...
[STARTUP] ClassifiedWindow tag restoration complete
```

### 4. Test Tab Organization
- In a regular Firefox window (not the console)
- Navigate to: `https://github.com`
- **Watch the Extension Console**
- You should see:
```
[DISPATCH] Processing: https://github.com -> [DEV]
[DISPATCH] >> Creating NEW window for [DEV]
[THEME] Attempting to apply theme to window X
[TAG] ClassifiedWindow X tagged as [DEV] with theme
```

## Quick Test Script

Once you have the Extension Console open, run this:

```javascript
console.log('✅ Extension console is working!');

// Test that browser API is available
console.log('Browser API:', typeof browser);

// List all tabs
browser.tabs.query({}).then(tabs => {
    console.log(`Found ${tabs.length} tabs`);
});

// Test theme API
browser.windows.getCurrent().then(win => {
    console.log('Current window ID:', win.id);
    return browser.theme.update(win.id, {
        colors: {
            toolbar: '#ff0000',
            toolbar_text: '#ffffff'
        }
    });
}).then(() => {
    console.log('✅ RED theme test passed!');
}).catch(err => {
    console.error('❌ Theme test failed:', err);
});
```

If this works, you're in the right console! 🎉

## Troubleshooting

### "Inspect" button is grayed out
**Solution:** Reload the extension
- Click "Reload" button first
- Then click "Inspect"

### No extension listed in about:debugging
**Solution:** Extension not loaded
- Check terminal - is `web-ext run` still running?
- Try: `about:debugging` → "Load Temporary Add-on" → Select `manifest.json`

### Console opens but shows no logs
**Solution:** Background script may not be running
- Check for errors in the console (red messages)
- Verify manifest.json background configuration
- Try reloading extension

### Logs appear but no [THEME] logs
**Solution:** Theme not being applied
- Check if themes are configured in options
- Verify options were saved
- Navigate to a URL that matches a rule

## Summary

✅ **Don't use:** `Cmd+Shift+J` (Browser Console)  
✅ **DO use:** `about:debugging` → Inspect (Extension Console)  
✅ **For themes:** Watch Extension Console when creating windows  
✅ **For UI:** Right-click options page → Inspect

**Now open the Extension Console and you'll see all your logs!** 🔍

