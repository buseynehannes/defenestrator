# Defenestrator - Firefox Tab Organizer

A Firefox extension that automatically organizes tabs into tagged windows based on URL patterns, designed to work with AeroSpace window manager.

## Architecture

This project follows a clean architecture pattern with three main layers:

### Domain (`src/domain/`)
Contains all domain objects, business logic, and rules:
- **Tab.ts** - Tab domain model and utilities
- **WindowTag.ts** - Window tagging types and constants
- **TaggingRule.ts** - Rules for determining which tag a URL should have
- **TabDispatcher.ts** - Core business logic for dispatching tabs to appropriate windows

### Ports (`src/ports/`)
Interfaces defining domain-level intents:
- **TabRepository.ts** - Interface for tab operations
- **WindowRepository.ts** - Interface for window operations
- **Logger.ts** - Interface for logging

### Adapters (`src/adapters/`)
Firefox-specific implementations:
- **FirefoxTabRepository.ts** - Firefox implementation of TabRepository
- **FirefoxWindowRepository.ts** - Firefox implementation of WindowRepository
- **ConsoleLogger.ts** - Console implementation of Logger

## Configuration

Edit `src/config.ts` to customize your tagging rules:

```typescript
export const RULE_SETS: readonly TaggingRule[] = [
    { tag: "[DEV]", match: ["github.com", "bitbucket.com"] },
    { tag: "[MEET]", match: ["meet.google.com", "zoom.us"] },
    // ... add your own rules
];
```

Tabs that don't match any rule will be tagged with `[RESEARCH]` by default.

## Development

### Prerequisites
- Node.js and npm
- TypeScript 5.x

### Build

```bash
# Install dependencies
npm install

# Build the extension
npm run build

# Watch mode for development
npm run watch

# Clean build artifacts
npm run clean
```

### Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

**Test Coverage:** 100% on all domain files  
See [TESTING.md](docs/TESTING.md) for detailed testing documentation.

### Project Structure

```
defenestrator/
├── src/
│   ├── domain/           # Domain models and business logic
│   ├── ports/            # Interface definitions
│   ├── adapters/         # Firefox-specific implementations
│   ├── config.ts         # Configuration
│   └── background.ts     # Extension entry point
├── dist/                 # Compiled JavaScript output
├── polyfill/            # webextension-polyfill library
├── manifest.json        # Firefox extension manifest
├── package.json
└── tsconfig.json
```

### Loading in Firefox

**Quick Start:**
```bash
# 1. Build the extension
npm run build

# 2. Open Firefox → about:debugging#/runtime/this-firefox
# 3. Click "Load Temporary Add-on"
# 4. Select manifest.json from this directory
```

**For detailed instructions including:**
- Development workflow with auto-reload
- Debugging tips
- Console logging
- Common issues and solutions

See **[LOCAL_TESTING.md](LOCAL_TESTING.md)** for the complete guide.

**Alternative - Using web-ext (recommended for development):**
```bash
# Install web-ext globally
npm install -g web-ext

# Run with auto-reload
npm run watch  # Terminal 1 - auto rebuild
web-ext run    # Terminal 2 - auto reload in Firefox
```

## How It Works

1. **Tab Creation/Update**: When a tab is created or its URL changes, the extension triggers
2. **Tag Determination**: The URL is matched against configured rules to determine its tag
3. **Window Search**: The extension looks for an existing window with the target tag
4. **Tab Dispatch**: The tab is either:
   - Moved to an existing tagged window
   - Used to create a new tagged window
   - Left in place if already in the correct window

Window tags are:
- Stored in Firefox session storage for persistence
- Applied as window title prefixes for AeroSpace integration

## TypeScript Features

This codebase uses strict TypeScript with:
- Strict null checks
- No implicit any
- No unchecked indexed access
- Exact optional property types
- Strong typing throughout with branded types (TabId, WindowId, etc.)

## License

ISC
