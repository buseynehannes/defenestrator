# Architecture Overview

## Clean Architecture Layers

This extension follows the Ports & Adapters (Hexagonal) architecture pattern:

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser Events                          │
│            (tabs.onCreated, tabs.onUpdated)                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  background.ts                              │
│              (Dependency Injection)                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    DOMAIN LAYER                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │          TabDispatcher (Business Logic)              │  │
│  └───────────────────┬───────────────────────────────────┘  │
│                      │ uses                                 │
│  ┌───────────────────▼───────────────────────────────────┐  │
│  │  TaggingRuleSet │ Tab │ WindowTag │ TaggedWindow     │  │
│  │           (Domain Models & Rules)                     │  │
│  └───────────────────────────────────────────────────────┘  │
└───────────────────┬─────────────────────┬───────────────────┘
                    │                     │
                    │ depends on          │ depends on
                    │ (interfaces)        │ (interfaces)
                    ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    PORTS LAYER                              │
│  ┌──────────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ TabRepository    │  │ WindowRepo   │  │ Logger       │  │
│  │  (Interface)     │  │ (Interface)  │  │ (Interface)  │  │
│  └──────────────────┘  └──────────────┘  └──────────────┘  │
└───────────────────┬─────────────────────┬───────────────────┘
                    │                     │
                    │ implemented by      │ implemented by
                    ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  ADAPTERS LAYER                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  FirefoxTabRepository  (Firefox API adapter)        │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  FirefoxWindowRepository  (Firefox API adapter)     │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  ConsoleLogger  (Console API adapter)               │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Firefox WebExtension API                       │
│     (browser.tabs, browser.windows, browser.storage)       │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow Example

When a new tab is created with URL "https://github.com/user/repo":

1. **Event Trigger**: `browser.tabs.onCreated` fires
2. **Entry Point**: `background.ts` receives the event
3. **Dispatch**: Calls `dispatcher.dispatch(tabId, url)`
4. **Domain Logic** (`TabDispatcher`):
   - Uses `TaggingRuleSet.determineTag(url)` → returns `"[DEV]"`
   - Queries `WindowRepository.getAllWindows()`
   - Checks each window's tag via `WindowRepository.getWindowTag()`
   - Decides to move tab or create new window
5. **Adapter Action** (`FirefoxWindowRepository`, `FirefoxTabRepository`):
   - Executes actual Firefox API calls
   - Updates storage
   - Moves tab to appropriate window

## Key Benefits

### 1. **Testability**
- Domain logic has no Firefox dependencies
- Can unit test `TabDispatcher` by mocking interfaces
- Can test rules in isolation

### 2. **Type Safety**
- Strongly typed throughout
- Branded types (`TabId`, `WindowId`) prevent mixing
- Readonly interfaces prevent mutation

### 3. **Maintainability**
- Clear separation of concerns
- Business logic isolated from browser API
- Easy to change browser implementation

### 4. **Extensibility**
- Can add new repositories (e.g., Chrome adapter)
- Can swap logger implementations
- Can add new domain rules without touching adapters

## File Responsibilities

### Domain
- **Tab.ts**: Tab model, URL utilities
- **WindowTag.ts**: Window tagging types and constants
- **TaggingRule.ts**: URL-to-tag matching logic
- **TabDispatcher.ts**: Core orchestration logic

### Ports
- **TabRepository.ts**: Tab operations interface
- **WindowRepository.ts**: Window operations interface
- **Logger.ts**: Logging interface

### Adapters
- **FirefoxTabRepository.ts**: Firefox tabs implementation
- **FirefoxWindowRepository.ts**: Firefox windows implementation
- **ConsoleLogger.ts**: Console logging implementation

### Configuration
- **config.ts**: User-configurable tagging rules
- **background.ts**: Dependency injection & event wiring
