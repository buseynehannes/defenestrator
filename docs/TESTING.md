# Domain Tests

Comprehensive test suite for the domain layer of the Defenestrator extension.

## Test Coverage

✅ **100% Code Coverage** across all domain files:
- `Tab.ts` - 100%
- `TabDispatcher.ts` - 100%
- `TaggingRule.ts` - 100%
- `WindowTag.ts` - 100%

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (auto-rerun on changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Files

### `Tab.test.ts`
Tests for the Tab domain model and utilities.

**Coverage (10 tests):**
- ✓ `isInternalUrl()` function with various URL types
- ✓ Tab interface structure
- ✓ Type safety for TabId and Url branded types

**Key Tests:**
- Internal URL detection (about:, moz-extension:)
- HTTP/HTTPS URL handling
- Edge cases (empty strings, URLs with query parameters)

### `WindowTag.test.ts`
Tests for window tagging types and constants.

**Coverage (11 tests):**
- ✓ DEFAULT_TAG constant
- ✓ WindowTag type behavior
- ✓ WindowId type behavior  
- ✓ TaggedWindow interface

**Key Tests:**
- Tag comparison and equality
- Window collections and lookups
- Type relationships

### `TaggingRule.test.ts`
Tests for URL matching and tagging rules.

**Coverage (28 tests):**
- ✓ URL pattern matching for all rule types
- ✓ First-match-wins behavior
- ✓ Default tag fallback
- ✓ Internal URL handling
- ✓ Edge cases and special scenarios

**Key Tests:**
- GitHub, Bitbucket, GitLab → [DEV]
- Google Meet, Zoom, Teams → [MEET]
- Gmail, Outlook → [MAIL]
- Google Docs, Notion → [DOCS]
- Unknown URLs → [RESEARCH]
- Case sensitivity, subdomains, query parameters
- Empty rule sets
- Multiple keywords per rule

### `TabDispatcher.test.ts`
Tests for the core business logic orchestrating tab dispatch.

**Coverage (19 tests):**
- ✓ Internal URL handling
- ✓ Tab already in correct window
- ✓ Moving to existing window
- ✓ Creating new windows
- ✓ Retagging empty windows
- ✓ Different tag types
- ✓ Error handling
- ✓ Logging
- ✓ Complex scenarios

**Key Tests:**
- Ignore about: and moz-extension: URLs
- Skip dispatch if tab already in correct window
- Move tab to existing window with matching tag
- Create new window if no match exists
- Retag empty/untagged windows instead of creating new ones
- Handle windows with 1 tab or 1 real tab + about:blank
- Error handling with graceful fallback
- Comprehensive logging
- Multi-window scenarios

## Test Architecture

Tests follow best practices with:

### 1. **Mock Implementations**
```typescript
class MockWindowRepository implements WindowRepository {
  // Full implementation of interface for testing
}
```

All external dependencies (WindowRepository, TabRepository, Logger) are mocked using Vitest's `vi.fn()` for tracking calls and controlling behavior.

### 2. **Arrange-Act-Assert Pattern**
```typescript
it('should move tab to existing window', async () => {
  // Arrange - Set up test data
  windowRepo.addWindow(targetWindowId, '[DEV]');
  
  // Act - Execute the behavior
  await dispatcher.dispatch(tabId, url);
  
  // Assert - Verify the outcome
  expect(tabRepo.moveTab).toHaveBeenCalledWith(tabId, targetWindowId);
});
```

### 3. **Isolated Tests**
Each test is independent with `beforeEach()` setup ensuring clean state.

### 4. **Descriptive Test Names**
Tests use clear, behavior-focused names:
- ❌ `test1()`, `testTab()`
- ✅ `should match GitHub URLs to [DEV] tag`
- ✅ `should retag current window if it is empty and untagged`

## Test Categories

### Unit Tests
All tests are pure unit tests testing domain logic in isolation:
- ✅ No browser APIs
- ✅ No I/O operations
- ✅ Fast execution (~20ms total)
- ✅ Fully deterministic

### Why No Integration Tests?
The adapters (Firefox-specific code) would require:
- Browser environment setup
- WebExtension API mocking
- Complex test infrastructure

The clean architecture allows us to:
1. **Trust the domain logic** - 100% tested
2. **Trust the browser APIs** - Firefox's responsibility
3. **Keep tests simple** - No need for complex E2E setup

## Coverage Reports

After running `npm run test:coverage`, detailed reports are generated in:
- `coverage/index.html` - Visual HTML report
- `coverage/coverage-final.json` - JSON report
- Terminal output - Summary report

Open `coverage/index.html` in your browser for interactive coverage exploration.

## Adding New Tests

### 1. Create test file next to source
```
src/domain/
  NewFeature.ts
  NewFeature.test.ts  ← Same directory
```

### 2. Follow naming convention
```typescript
import { describe, it, expect } from 'vitest';
import { FeatureClass } from './NewFeature';

describe('FeatureClass', () => {
  describe('methodName', () => {
    it('should do something specific', () => {
      // Test code
    });
  });
});
```

### 3. Run tests
```bash
npm run test:watch  # Auto-rerun on save
```

## Continuous Integration

These tests are perfect for CI/CD:
- Fast (< 500ms)
- No external dependencies
- Deterministic results
- Clear pass/fail

Suggested CI configuration:
```yaml
- name: Run tests
  run: npm test

- name: Check coverage
  run: npm run test:coverage
```

## Test Statistics

- **Total Tests:** 68
- **Test Files:** 4
- **Total Duration:** ~20ms (test execution)
- **Coverage:** 100% (statements, branches, functions, lines)

## Debugging Tests

### Run specific test file
```bash
npx vitest run src/domain/TabDispatcher.test.ts
```

### Run specific test
```bash
npx vitest run -t "should move tab to existing window"
```

### Debug with VS Code
Add breakpoints in test files and use the built-in debugger with Vitest extension.

## Best Practices Demonstrated

1. ✅ **Test behavior, not implementation**
2. ✅ **One assertion concept per test**
3. ✅ **Clear test names describe expected behavior**
4. ✅ **Mock external dependencies**
5. ✅ **Test edge cases and error paths**
6. ✅ **Maintain test independence**
7. ✅ **Keep tests fast**
8. ✅ **100% coverage of critical paths**

## Future Enhancements

Potential test additions:
- [ ] Property-based testing with `fast-check`
- [ ] Performance benchmarks with `vitest bench`
- [ ] Mutation testing with `stryker`
- [ ] Snapshot testing for complex objects

Currently, the test suite provides excellent coverage and confidence in the domain logic! 🎉
