# Playwright Automated Testing Setup Guide

## Overview

This document explains how to use the automated Playwright tests to validate the Week 7 community features (voting and expiration systems) without manual testing.

## Why Playwright?

Playwright provides:
- ✅ **Automated E2E Testing** - Simulates real user interactions in a browser
- ✅ **Cross-Browser Support** - Test on Chromium, Firefox, and WebKit
- ✅ **Fast Execution** - Parallel test execution
- ✅ **Visual Debugging** - UI mode and trace viewer for debugging failures
- ✅ **CI/CD Integration** - Easily integrate with GitHub Actions or other CI pipelines
- ✅ **Reliable Selectors** - Auto-waiting and retry mechanisms reduce flaky tests

## Installation

Already completed! The following has been set up:

```bash
npm install -D @playwright/test  # ✅ Installed
npx playwright install chromium   # ✅ Chromium browser installed
```

## Test Structure

```
e2e/
├── test-utils.ts          # Helper functions and fixtures
├── smoke.spec.ts          # Basic app functionality tests
├── voting.spec.ts         # Voting system tests (P0 critical)
├── expiration.spec.ts     # Expiration system tests (P0 critical)
└── [future tests]         # Additional test files as needed
```

## Test Coverage

### ✅ Smoke Tests (`smoke.spec.ts`)
- Home page loads
- Login page loads with form elements
- Map page loads with Leaflet map
- Protected routes redirect to login

### ✅ Voting System Tests (`voting.spec.ts`)
**Basic Voting Functionality**:
- Upvote a hazard
- Downvote a hazard
- Change vote from upvote to downvote
- Remove vote

**Voting Permissions**:
- Prevent voting on own hazard
- Prevent unauthenticated users from voting

**Vote Persistence**:
- Votes persist across page reloads

### ✅ Expiration System Tests (`expiration.spec.ts`)
**Hazard Creation**:
- Create auto-expire hazard (6 hour duration)
- Create user-resolvable hazard
- Create permanent hazard
- Create seasonal hazard with selected months

**Auto-Expire Functionality**:
- Extend hazard expiration by 24 hours
- Multiple extensions allowed

**User-Resolvable Resolution Flow**:
- Submit resolution report
- Confirm resolution (vote yes)
- Auto-resolve at threshold (3 confirmations)

**Seasonal Hazard Behavior**:
- Show as active during season
- Show as dormant outside season

## Running Tests

### Quick Start (Recommended)

```bash
# Run smoke tests first (fastest, catches major issues)
npm run test:e2e:smoke

# Run all E2E tests
npm run test:e2e

# Run specific test suites
npm run test:e2e:voting      # Voting system only
npm run test:e2e:expiration  # Expiration system only
```

### Interactive Modes

```bash
# UI Mode - Visual test runner with time travel debugging
npm run test:e2e:ui

# Headed Mode - See browser while tests run
npm run test:e2e:headed

# Debug Mode - Step through tests with breakpoints
npm run test:e2e:debug
```

### View Test Reports

```bash
# Open HTML test report
npm run test:e2e:report
```

## Test Prerequisites

### ⚠️ Important Setup Required

The tests require **multiple test user accounts** in your Supabase database:

```sql
-- You need to create these test accounts:
-- test@example.com
-- test2@example.com
-- test3@example.com
-- test4@example.com
-- test5@example.com

-- Password for all: password123

-- These can be created via your registration UI or Supabase Auth dashboard
```

### Why Multiple Accounts?

Many tests require different users:
- **Voting Tests**: Can't vote on own hazard, need another user's hazard to test
- **Resolution Tests**: 
  - User A creates hazard
  - User B submits resolution report
  - Users C, D, E confirm resolution (3 confirmations = auto-resolve)

### Creating Test Accounts

**Option 1: Via Registration UI** (Recommended)
1. Go to `/auth/register` in your app
2. Register 5 test accounts with emails above
3. Confirm emails if required (or disable email confirmation in Supabase for test accounts)

**Option 2: Via Supabase Dashboard**
1. Open Supabase Dashboard → Authentication → Users
2. Click "Add User" → "Create New User"
3. Enter email and password for each test account
4. Set "Auto Confirm User" to ON

**Option 3: SQL Script** (Fastest)
```sql
-- Note: Requires Supabase service role key
-- Adjust based on your Supabase setup
```

## Current Test Limitations

### Known Issues to Address

1. **Test Data Dependencies**
   - Tests assume test accounts exist
   - Tests may interfere with each other if run in parallel without isolation
   - **Solution**: Add test data setup/teardown fixtures

2. **Selector Brittleness**
   - Some selectors use text matching (e.g., `button:has-text("👍")`)
   - May break if button text changes
   - **Solution**: Add `data-testid` attributes to critical elements

3. **Timing Issues**
   - Some tests use `waitForTimeout()` which is fragile
   - **Solution**: Replace with proper `waitFor()` conditions

4. **Database State**
   - Tests don't clean up created hazards
   - May accumulate test data over time
   - **Solution**: Add cleanup fixtures or use dedicated test database

## Improving the Tests

### Priority 1: Add Test Data Setup

```typescript
// e2e/test-utils.ts (add this)
export async function setupTestData() {
  // Create test users if they don't exist
  // Create some baseline hazards for testing
  // Return IDs for use in tests
}

export async function cleanupTestData() {
  // Delete hazards created during tests
  // Reset user states
}
```

### Priority 2: Add `data-testid` Attributes

Update components with test IDs:

```svelte
<!-- Example: VotingButtons.svelte -->
<button data-testid="upvote-button" ...>👍 {upvoteCount}</button>
<button data-testid="downvote-button" ...>👎 {downvoteCount}</button>
```

Then use in tests:
```typescript
await page.locator('[data-testid="upvote-button"]').click();
```

### Priority 3: Database Helpers

Add Supabase admin client to test utilities:

```typescript
// e2e/test-utils.ts
import { createClient } from '@supabase/supabase-js';

export function getSupabaseAdmin() {
  return createClient(
    process.env.PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Add to .env
  );
}

// Then in tests:
const supabase = getSupabaseAdmin();
const { data: hazard } = await supabase
  .from('hazards')
  .insert({ ...testHazardData })
  .select()
  .single();
```

## Running Tests in CI/CD

### GitHub Actions Example

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright Browsers
        run: npx playwright install --with-deps chromium
      
      - name: Run Playwright tests
        run: npm run test:e2e
        env:
          PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
      
      - name: Upload test report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

## Test Workflow for Development

### When You Want to Keep Moving Forward

Instead of manual testing, follow this workflow:

1. **Make Code Changes** (implement features as normal)

2. **Run Smoke Tests** (30 seconds)
   ```bash
   npm run test:e2e:smoke
   ```
   - If these pass, basic app functionality is intact
   - If these fail, something fundamental is broken

3. **Run Relevant Test Suite** (2-5 minutes)
   ```bash
   # If you changed voting code:
   npm run test:e2e:voting
   
   # If you changed expiration code:
   npm run test:e2e:expiration
   ```

4. **Fix Failures (if any)**
   - Use UI mode for debugging:
     ```bash
     npm run test:e2e:ui
     ```
   - Click on failed test to see detailed trace
   - Use time-travel debugging to inspect at each step

5. **Commit with Confidence**
   - Tests passing = features working
   - Continue to next task

### When to Run Full Test Suite

- Before merging to main branch
- Before deploying to production
- After major refactoring
- Weekly as a sanity check

```bash
npm run test:e2e  # Runs all tests (~10-15 minutes)
```

## Interpreting Test Results

### Green (✓) - Test Passed
- Feature works as expected
- Continue development

### Red (✗) - Test Failed
- Feature broken or test needs updating
- Check test output for details
- Use UI mode or debug mode to investigate

### Yellow (○) - Test Skipped
- Test marked with `test.skip()` or conditional
- Not a failure, just not run

## Test Maintenance

### When to Update Tests

- **Feature changes**: Update test to match new behavior
- **UI changes**: Update selectors if buttons/elements changed
- **New features**: Write new test files following same patterns

### When Tests Become Flaky

If tests fail intermittently:

1. **Add better waits**: Replace `waitForTimeout()` with `waitFor()` or `waitForSelector()`
2. **Check network**: Ensure API calls complete before assertions
3. **Stabilize selectors**: Use `data-testid` instead of text matching
4. **Isolate state**: Ensure tests don't depend on each other

## Benefits for Your Workflow

### ✅ Continue Development Without Blocking

You asked: *"I do not have time to test this at the moment but still want to keep moving forward"*

With Playwright:
- **Run tests in background** while you work on next feature
- **Tests validate your work** without manual clicking
- **Catch regressions early** before they compound
- **Document expected behavior** in code (tests are living documentation)

### ✅ Confidence to Deploy

- All tests passing = features work
- HTML report shows exactly what was tested
- Screenshots of failures help debugging
- Trace files let you replay failures

### ✅ Faster Iteration

Manual testing Week 7 features would take:
- 7-11 hours (per test plan estimate)

Automated Playwright tests take:
- **~10-15 minutes** to run all tests
- **~30 seconds** for smoke tests
- **~2-3 minutes** for specific suite

**50-100x faster** than manual testing!

## Next Steps

### Immediate Actions

1. **Create Test Accounts** (5 minutes)
   - Register 5 test users as described above

2. **Run Smoke Tests** (1 minute)
   ```bash
   npm run test:e2e:smoke
   ```
   - Verify basic app functionality works

3. **Run Voting Tests** (2 minutes)
   ```bash
   npm run test:e2e:voting
   ```
   - May fail if test accounts don't exist yet

4. **Run Expiration Tests** (5 minutes)
   ```bash
   npm run test:e2e:expiration
   ```
   - May fail if test accounts don't exist yet

### Short-Term Improvements

5. **Add Test Data Setup** (1-2 hours)
   - Create setup/teardown fixtures
   - Generate test users programmatically
   - Clean up test hazards after runs

6. **Add `data-testid` Attributes** (1 hour)
   - Add to voting buttons
   - Add to expiration buttons
   - Add to forms and inputs

7. **Improve Selectors** (1 hour)
   - Replace text matching with test IDs
   - Add better wait conditions

### Long-Term

8. **Expand Test Coverage** (ongoing)
   - Add tests for remaining P1, P2, P3 test cases from test plan
   - Add tests for admin features
   - Add tests for anonymous posting

9. **Integrate with CI/CD** (1-2 hours)
   - Set up GitHub Actions workflow
   - Run tests on every commit
   - Block merges if tests fail

10. **Performance Testing** (future)
    - Add tests for large datasets
    - Test concurrent operations
    - Measure page load times

## Troubleshooting

### Tests Won't Run

```bash
# Reinstall Playwright
npm install -D @playwright/test
npx playwright install chromium
```

### Browser Doesn't Launch

```bash
# Install system dependencies (Linux)
npx playwright install-deps chromium

# On Windows, Chromium should work out of the box
```

### Tests Fail with "Element not found"

- Element selector may be wrong
- Page may not be fully loaded
- Add better waits:
  ```typescript
  await page.waitForSelector('[data-testid="my-element"]');
  await page.locator('[data-testid="my-element"]').click();
  ```

### Tests Timeout

- Increase timeout in `playwright.config.ts`:
  ```typescript
  use: {
    actionTimeout: 10000, // 10 seconds
    navigationTimeout: 30000, // 30 seconds
  }
  ```

### Authentication Issues

- Verify test accounts exist in Supabase
- Check environment variables are set
- Ensure Supabase is running and accessible

## Resources

- **Playwright Docs**: https://playwright.dev/docs/intro
- **Best Practices**: https://playwright.dev/docs/best-practices
- **Debugging Guide**: https://playwright.dev/docs/debug
- **CI/CD Guide**: https://playwright.dev/docs/ci

## Conclusion

You now have automated tests that can validate your Week 7 community features without manual testing. This allows you to:

1. ✅ **Continue development** on Tasks 8, 9, 10
2. ✅ **Run tests in background** to validate work
3. ✅ **Catch issues early** before they compound
4. ✅ **Deploy with confidence** knowing tests pass

**Next Action**: Create 5 test user accounts, then run `npm run test:e2e:smoke` to verify setup!
