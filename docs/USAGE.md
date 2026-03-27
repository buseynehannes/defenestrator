# Using Tab Defenestrator

## What are named windows?

A **named window** is a regular Firefox window that has been assigned a *specification* — a set of rules that describes what kind of tabs belong in it.

Each specification has:
- A **name** (e.g. "Work", "Research", "Social")
- One or more **URL patterns** that identify matching tabs
- An optional **theme** (toolbar and frame colours to make windows visually distinct)
- An optional **sticky** flag (see [Sticky windows](#sticky-windows))

Once a window is assigned a specification, Tab Defenestrator keeps it tidy automatically. Every time a tab is opened, or its URL changes, the extension checks which specification it belongs to and moves it to the right window if it isn't there already.

---

## Your first rule

1. Click the Tab Defenestrator icon in the toolbar and then the **⚙** button, or go to `about:addons` → Tab Defenestrator → Preferences.
2. Click **Add Specification**.
3. Give it a name, e.g. `Work`.
4. Add one or more URL patterns, e.g.:
   ```
   mail.google.com
   calendar.google.com
   docs.google.com
   ```
5. Optionally pick a theme colour so the window is easy to spot.
6. Click **Save**.

From this point on, any tab whose URL contains `mail.google.com`, `calendar.google.com`, or `docs.google.com` will be automatically moved into your "Work" window.

---

## URL pattern matching

Patterns are **substring matches** — a tab matches if its URL *contains* the pattern anywhere. There is no regex or glob syntax.

| Pattern       | Matches                        | Does not match            |
|---------------|--------------------------------|---------------------------|
| `github.com`  | `https://github.com/user/repo` | `https://notgithub.com`   |
| `docs.google` | `https://docs.google.com/...`  | `https://google.com/docs` |
| `localhost`   | `http://localhost:3000`        | `http://127.0.0.1:3000`   |

Multiple patterns within a single specification are combined with **OR** — a tab matches the spec if it matches *any* of the patterns.

---

## Rule priority

When a tab's URL could match more than one specification, the specification that appears **highest in the list** wins. You can reorder specifications using the **↑** and **↓** buttons in the options page.

**Example:** You have a "Google" spec matching `google.com` and a "Work" spec matching `docs.google.com`. Because `docs.google.com` is more specific, put "Work" above "Google" so Docs tabs go to the Work window instead.

The **Default** specification always sits at the bottom and cannot be moved — it catches any tab that doesn't match anything else.

---

## The default window

Every configuration includes one **Default** specification. Tabs that don't match any rule end up here. You can theme it like any other window but you cannot delete it, and it cannot be made sticky.

---

## Sticky windows

By default, Tab Defenestrator routes a tab based on its *current* URL. If you open Gmail in your Work window and then navigate to Reddit, the tab will be moved to whichever window Reddit belongs to (or the default window if there's no matching rule).

**Sticky mode** changes this behaviour: a sticky window *holds on* to its tabs as long as at least one tab in the window still matches the spec. Tabs only leave when the last matching tab is gone.

This is useful for windows where you do research or temporary browsing alongside the main content — you want the extra tabs to stay nearby rather than being scattered.

### Toggling sticky

There are two ways to toggle sticky for the current window:

- **Popup:** Click the Tab Defenestrator toolbar icon. If the window has a spec, you'll see a **Make sticky** / **Remove sticky** button.
- **Keyboard shortcut:** Press **⌥⌘T** on macOS or **Alt+Ctrl+T** on Windows/Linux from anywhere. A notification will confirm the change.

The sticky state is saved immediately and persists across browser restarts.

---

## Window theming

Each specification can have four independent colour settings, all applied via Firefox's native toolbar theming:

| Setting | What it affects |
|---|---|
| **Accent** | Toolbar background colour |
| **Text** | Text colour in the toolbar |
| **Frame** | Colour of the window frame/titlebar |
| **Tab text** | Text colour on active tabs |

Themes are applied as soon as you switch to a named window and removed when you move away from it, so each window has its own look without permanently modifying your Firefox theme.

---

## Global ignored URLs

Some URLs should never be routed — browser internals, extension pages, local development addresses, and so on. Add patterns to the **Global Ignored URLs** list and Tab Defenestrator will leave matching tabs exactly where they are.

Common entries:
```
about:
moz-extension:
localhost
127.0.0.1
```

---

## Session restore

Named window assignments are stored in session storage and restored automatically when Firefox restarts. The extension looks at the tabs already open in each window and reassigns them to the best matching specification, so your workspace layout survives a browser restart without any manual steps.

---

## AeroSpace integration

Tab Defenestrator sets Firefox's `titlePreface` for each named window, which prepends the spec name to the window title in square brackets. For example, a window with the "Work" spec will have a title like `[Work] Mozilla Firefox`.

This makes named windows directly targetable in [AeroSpace](https://github.com/nikitabobko/AeroSpace) using its `title-regex-match` rule:

```toml
[[on-window-detected]]
if.app-id = "org.mozilla.firefox"
if.title-regex-match = "^\[Work\]"
run = "move-node-to-workspace W"

[[on-window-detected]]
if.app-id = "org.mozilla.firefox"
if.title-regex-match = "^\[Research\]"
run = "move-node-to-workspace R"
```

Each named window lands on its own AeroSpace workspace automatically, giving you a fully automated per-context desktop layout.

