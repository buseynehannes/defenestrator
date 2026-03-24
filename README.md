# Tab Defenestrator

A Firefox extension that automatically organizes tabs into themed windows based on URL patterns — designed to integrate with the [AeroSpace](https://github.com/nikitabobko/AeroSpace) window manager.

## Features

- **Window title prefix** — each named window gets its rule name set as a title prefix (via Firefox's `titlePreface`), making it directly targetable by AeroSpace's title-matching rules
- **Automatic tab routing** — tabs are moved to the right window the moment they are opened or navigated
- **URL pattern rules** — each named window is backed by one or more URL patterns that determine which tabs belong to it
- **Prioritized rules** — rules are evaluated in order, so you have full control over which window wins when patterns overlap
- **Window theming** — give each window a distinct look by configuring its accent, text, frame, and tab background colours
- **Sticky windows** — mark a window as sticky so tabs are kept in it even after navigating away from a matching URL, as long as at least one matching tab remains. Toggle sticky for the current window in two ways:
  - Click the toolbar icon and press **Make sticky / Remove sticky**
  - Press **⌥⌘T** (macOS) / **Alt+Ctrl+T** (Windows/Linux) from anywhere — a notification confirms the change
- **Default window** — a catch-all fallback window for tabs that don't match any rule
- **Global ignored URLs** — exclude specific URLs from being routed altogether
- **Session persistence** — named window assignments are restored when the browser restarts

## Design Philosophy

Rules are declared, not scripted. You describe *what each window is for* (which URLs belong there, how it looks, how it behaves) and the extension takes care of routing tabs automatically. The goal is zero manual tab management — open a link and it ends up exactly where you expect it.

## Documentation

→ **[How to use Tab Defenestrator](docs/USAGE.md)** — named windows explained, URL pattern matching, sticky mode, theming, AeroSpace integration, and more.

## Setup

**Prerequisites:** Node.js and npm

```bash
make install   # install dependencies
make build     # build the extension
make test      # run tests
```

Run `make help` to see all available targets.

### Loading in Firefox

1. Run `make build`
2. Open `about:debugging#/runtime/this-firefox` in Firefox
3. Click **Load Temporary Add-on** and select `manifest.json`

For development with auto-reload:

```bash
make watch  # auto-rebuild on file changes
web-ext run # auto-reload in Firefox (requires web-ext: npm i -g web-ext)
```
