# Testing Guide

This guide covers the testing infrastructure for the Hazards application, including unit tests and end-to-end (E2E) tests.

## Overview

The application uses two primary testing approaches:

1. **Unit Tests**: Test individual functions, API endpoints, and business logic using Vitest
2. **E2E Tests**: Test complete user workflows using Playwright

## Table of Contents

- [Quick Start](#quick-start)
- [Unit Tests](#unit-tests)
- [E2E Tests](#e2e-tests)
- [Test Helpers](#test-helpers)
- [Environment Setup](#environment-setup)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### Running All Tests

```powershell
# Run all unit tests
npm test

# Run all E2E tests
npm run test:e2e
```

### Running Specific Test Suites

```powershell
# Unit tests with UI
npm run test:ui

# Run unit tests with coverage
npm run test:coverage

# Run E2E tests with UI (interactive)
npm run test:e2e:ui

# Run E2E tests in headed mode (see browser)
npm run test:e2e:headed

# Run specific E2E test suite
npm run test:e2e:admin
```

---

## Unit Tests

Unit tests are located alongside the code they test, typically in files ending with `.test.ts`.

### Technology

- **Framework**: [Vitest](https://vitest.dev/)
- **Mocking**: Built-in Vitest mocking capabilities
- **Coverage**: c8 for code coverage

### Writing Unit Tests

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('Feature Name', () => {
  it('should do something specific', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = myFunction(input);
    
    // Assert
    expect(result).toBe('expected');
  });
});
```

### Running Unit Tests

```powershell
# Run in watch mode (default)
npm test

# Run once and exit
npm run test:run

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage
```

### Example: API Endpoint Tests

See `src/routes/api/admin/categories/+server.test.ts` for examples of testing SvelteKit API endpoints:

```typescript
describe('GET /api/admin/categories', () => {
  it('should return tree structure', async () => {
    const mockRequest = new Request('http://localhost/api/admin/categories');
    const mockLocals = { /* ... */ };
    
    const response = await GET({ request: mockRequest, locals: mockLocals });
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
  });
});
```

---

## E2E Tests

E2E tests verify complete user workflows by simulating real user interactions in a browser.

### Technology

- **Framework**: [Playwright](https://playwright.dev/)
- **Browsers**: Chromium, Firefox, WebKit (Safari), Mobile Chrome/Safari
- **Location**: `src/test/*.test.ts`

### Setup

1. **Copy environment template**:
   ```powershell
   Copy-Item .env.test.example .env.test
   ```

2. **Configure test environment** (`.env.test`):
   ```env
   PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_anon_key
   TEST_ADMIN_EMAIL=admin@test.com
   TEST_ADMIN_PASSWORD=your_test_password
   BASE_URL=http://localhost:5173
   ```

3. **Validate setup**:
   ```powershell
   npm run test:e2e:setup
   ```
   
   This script checks:
   - Environment variables are configured
   - Test admin user exists in Supabase
   - Test data is present (categories, etc.)

4. **Start development server**:
   ```powershell
   npm run dev
   ```

5. **Run E2E tests** (in a separate terminal):
   ```powershell
   npm run test:e2e
   ```

### Writing E2E Tests

```typescript
import { test, expect } from '@playwright/test';
import { login, createTestCategory } from './helpers';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should perform user action', async ({ page }) => {
    await page.goto('/target-page');
    
    // Interact with UI
    await page.click('button:has-text("Click Me")');
    
    // Assert expected outcome
    await expect(page.locator('.success-message')).toBeVisible();
  });
});
```

### Running E2E Tests

```powershell
# Run all E2E tests
npm run test:e2e

# Run with interactive UI
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Run in debug mode (step through tests)
npm run test:e2e:debug

# Run specific test file
npm run test:e2e:admin

# View last test report
npm run test:e2e:report
```

### E2E Test Configuration

Configuration is in `playwright.config.ts`:

- **Test Directory**: `./src/test`
- **Timeouts**:
  - Test: 30 seconds
  - Expect: 5 seconds
  - Navigation: 15 seconds
  - Action: 10 seconds
- **Retries**: 2 (on CI), 0 (locally)
- **Trace**: Retained on failure
- **Video**: Captured on failure
- **Browsers**: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari

---

## Test Helpers

Reusable test utilities are in `src/test/helpers.ts`.

### Available Helpers

#### `login(page, email?, password?)`
Logs in as admin user (or specified credentials).

```typescript
await login(page); // Uses TEST_ADMIN_EMAIL/PASSWORD
await login(page, 'user@test.com', 'password'); // Custom credentials
```

#### `logout(page)`
Logs out the current user.

```typescript
await logout(page);
```

#### `createTestCategory(page, category)`
Creates a test category through the UI.

```typescript
await createTestCategory(page, {
  name: 'Test Category',
  icon: '🧪',
  description: 'Description',
  parent_id: null // Optional: ID of parent category
});
```

#### `deleteCategory(page, categoryName)`
Deletes a category by name.

```typescript
await deleteCategory(page, 'Test Category');
```

#### `expectAlertMessage(page, expectedText, type?)`
Asserts an alert message is displayed.

```typescript
await expectAlertMessage(page, 'Success!', 'success');
```

#### `waitForPageReady(page)`
Waits for page to fully load.

```typescript
await waitForPageReady(page);
```

#### `takeScreenshot(page, filename)`
Takes a screenshot for debugging.

```typescript
await takeScreenshot(page, 'test-state.png');
```

#### `cleanupTestCategories(page)`
Removes all test categories created during tests.

```typescript
test.afterAll(async ({ page }) => {
  await cleanupTestCategories(page);
});
```

#### `verifyAdminAccess(page)`
Verifies user has admin access.

```typescript
await verifyAdminAccess(page);
```

---

## Environment Setup

### Development Environment

1. **Install dependencies**:
   ```powershell
   npm install
   ```

2. **Install Playwright browsers**:
   ```powershell
   npx playwright install
   ```

### Test Environment

1. **Create test user in Supabase**:
   - Email: `admin@test.com`
   - Role: `admin`
   - Verified: `true`

2. **Create test data**:
   - At least one test category
   - Sample hazard reports (optional)

3. **Configure environment variables** (`.env.test`):
   ```env
   PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your_anon_key_here
   TEST_ADMIN_EMAIL=admin@test.com
   TEST_ADMIN_PASSWORD=securepassword123
   BASE_URL=http://localhost:5173
   ```

4. **Validate setup**:
   ```powershell
   npm run test:e2e:setup
   ```

---

## Best Practices

### Unit Tests

1. **Test one thing per test**: Each test should verify a single behavior
2. **Use descriptive names**: Test names should clearly state what they verify
3. **Arrange, Act, Assert**: Structure tests with clear setup, execution, and verification
4. **Mock external dependencies**: Use mocks for database, APIs, etc.
5. **Test edge cases**: Include tests for error conditions and boundary values

### E2E Tests

1. **Use test helpers**: Leverage `src/test/helpers.ts` for common operations
2. **Avoid hardcoded waits**: Use `waitForSelector` instead of `waitForTimeout`
3. **Use stable selectors**: Prefer data attributes or specific text over generic classes
4. **Clean up test data**: Remove test data after tests complete
5. **Run locally first**: Verify tests pass locally before committing
6. **Keep tests independent**: Each test should run successfully in isolation

### General

1. **Write tests alongside code**: Create tests as you develop features
2. **Run tests frequently**: Run tests before committing changes
3. **Maintain test coverage**: Aim for >80% coverage on critical paths
4. **Update tests when code changes**: Keep tests in sync with implementation
5. **Document complex tests**: Add comments explaining non-obvious test logic

---

## Troubleshooting

### Unit Tests

**Problem**: Tests fail with "module not found"
- **Solution**: Check import paths, ensure files exist
- **Command**: `npm run test:run`

**Problem**: Mocks not working
- **Solution**: Ensure mocks are defined before imports
- **Example**:
  ```typescript
  vi.mock('$lib/supabase', () => ({ /* mock */ }));
  import { GET } from './+server';
  ```

**Problem**: Async tests timing out
- **Solution**: Increase timeout or ensure promises resolve
- **Command**: Add `{ timeout: 10000 }` to test

### E2E Tests

**Problem**: Tests fail with "element not found"
- **Solution**: Check selectors match actual DOM, add waits
- **Debug**: Run with `npm run test:e2e:debug`

**Problem**: Authentication fails
- **Solution**: Verify `TEST_ADMIN_EMAIL` and `TEST_ADMIN_PASSWORD` are correct
- **Validate**: Run `npm run test:e2e:setup`

**Problem**: Tests fail on CI but pass locally
- **Solution**: Check timeouts, network conditions, browser versions
- **Config**: Increase retries in `playwright.config.ts`

**Problem**: Intermittent failures
- **Solution**: Replace `waitForTimeout` with specific waits
- **Example**: `await page.waitForSelector('.success-message')`

**Problem**: Browser not installed
- **Solution**: Install Playwright browsers
- **Command**: `npx playwright install`

### General

**Problem**: Tests are slow
- **Solution**: Run tests in parallel, reduce unnecessary waits
- **Command**: `npm run test:run` (unit), `npm run test:e2e` (E2E)

**Problem**: Need to see browser during tests
- **Solution**: Use headed mode
- **Command**: `npm run test:e2e:headed`

**Problem**: Need to debug specific test
- **Solution**: Use debug mode or test UI
- **Commands**: 
  - `npm run test:e2e:debug`
  - `npm run test:e2e:ui`

**Problem**: Want to see what happened in failed test
- **Solution**: Check traces and videos
- **Location**: `playwright-report/` directory
- **Command**: `npm run test:e2e:report`

---

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [SvelteKit Testing](https://kit.svelte.dev/docs/testing)
- [Supabase Testing Guide](https://supabase.com/docs/guides/getting-started/local-development)

---

## Test Coverage

### Current Coverage

- **Admin Category Management**: 100% (17 unit tests, 8 E2E tests)
  - Category CRUD operations
  - Section configuration
  - Parent/child relationships
  - Authentication and authorization

### Coverage Goals

- **Critical Paths**: 100% coverage
- **Feature Modules**: >90% coverage
- **Utilities**: >80% coverage
- **Overall**: >80% coverage

### Checking Coverage

```powershell
# Generate coverage report
npm run test:coverage

# View coverage in browser
# Open coverage/index.html
```

---

## CI/CD Integration

### GitHub Actions (Recommended)

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:run
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
        env:
          PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          TEST_ADMIN_EMAIL: ${{ secrets.TEST_ADMIN_EMAIL }}
          TEST_ADMIN_PASSWORD: ${{ secrets.TEST_ADMIN_PASSWORD }}
```

---

## Contributing

When contributing tests:

1. Follow existing test patterns
2. Use test helpers for common operations
3. Write descriptive test names
4. Include both positive and negative test cases
5. Ensure tests pass locally before committing
6. Update this guide if adding new testing patterns

---

**Last Updated**: December 2025  
**Maintainer**: Development Team
