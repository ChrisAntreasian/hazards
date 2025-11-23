# Playwright Quick Reference

## Essential Commands

```bash
# Smoke tests (30 seconds) - Run this first!
npm run test:e2e:smoke

# All tests (10-15 minutes)
npm run test:e2e

# Specific test suites (2-5 minutes each)
npm run test:e2e:voting
npm run test:e2e:expiration

# Interactive debugging modes
npm run test:e2e:ui        # Visual test runner (RECOMMENDED)
npm run test:e2e:headed    # See browser while running
npm run test:e2e:debug     # Step through with breakpoints

# View test report
npm run test:e2e:report
```

## Quick Start

1. **Create 5 test accounts** in Supabase:
   - test@example.com (password: password123)
   - test2@example.com (password: password123)
   - test3@example.com (password: password123)
   - test4@example.com (password: password123)
   - test5@example.com (password: password123)

2. **Start dev server** (in separate terminal):
   ```bash
   npm run dev
   ```

3. **Run smoke tests**:
   ```bash
   npm run test:e2e:smoke
   ```

4. **If smoke tests pass**, run full suite:
   ```bash
   npm run test:e2e
   ```

## Test Files

- `e2e/smoke.spec.ts` - Basic app functionality (home, login, map)
- `e2e/voting.spec.ts` - Voting system (upvote, downvote, permissions)
- `e2e/expiration.spec.ts` - Expiration system (all 4 types, resolution flow)

## Debugging Failed Tests

### Option 1: UI Mode (Easiest)
```bash
npm run test:e2e:ui
```
- Click on failed test
- See screenshots at each step
- Time-travel through test execution
- Inspect DOM and network calls

### Option 2: Headed Mode
```bash
npm run test:e2e:headed
```
- Watch browser as tests run
- See what the test is doing in real-time

### Option 3: Debug Mode
```bash
npm run test:e2e:debug
```
- Pauses at each step
- Use browser DevTools
- Step through test line by line

## Common Issues

### "Element not found"
- Add better wait: `await page.waitForSelector('[data-testid="element"]')`
- Check selector: `await page.locator('[data-testid="element"]').isVisible()`

### "Test timed out"
- Increase timeout in test: `test.setTimeout(60000); // 60 seconds`
- Or in config: `use: { actionTimeout: 15000 }`

### "Authentication failed"
- Verify test accounts exist in Supabase
- Check email/password are correct
- Ensure email confirmation not required

### Tests fail on first run, pass on second
- Tests may be interfering with each other
- Add test isolation (cleanup fixtures)
- Run tests in series: `npm run test:e2e -- --workers=1`

## Development Workflow

1. **Make code changes**
2. **Run relevant tests**: `npm run test:e2e:voting`
3. **If tests pass**: Continue to next feature
4. **If tests fail**: Debug with UI mode
5. **Before committing**: Run full suite

## Test Coverage

### ✅ Currently Tested
- ✅ Upvote/downvote hazards
- ✅ Vote permissions (own hazard, unauthenticated)
- ✅ Vote persistence
- ✅ Create all 4 expiration types
- ✅ Extend auto-expire hazards
- ✅ Submit resolution reports
- ✅ Confirm/dispute resolutions
- ✅ Auto-resolve at threshold
- ✅ Seasonal active/dormant states

### 🔜 Not Yet Tested (Add Later)
- 🔜 Multiple vote changes
- 🔜 Resolution report updates
- 🔜 Moderator permissions
- 🔜 Expiration warnings (<24h)
- 🔜 Expired hazard behavior
- 🔜 Seasonal month transitions
- 🔜 Admin settings interface
- 🔜 Anonymous posting

## Playwright Resources

- **Docs**: https://playwright.dev
- **Best Practices**: https://playwright.dev/docs/best-practices
- **Test Generator**: `npx playwright codegen http://localhost:5173`
- **Trace Viewer**: `npx playwright show-trace trace.zip`

## Pro Tips

1. **Use UI mode for development** - Visual, fast, easy to debug
2. **Use test generator** - Record interactions, generate test code
3. **Add data-testid attributes** - More stable than text matching
4. **Test one feature at a time** - Faster feedback loop
5. **Run smoke tests frequently** - Catch major breaks early
6. **Check HTML report** - Visual test results with screenshots

## Getting Help

1. Check test output for error details
2. Use UI mode to see what's happening
3. Look at screenshots in `test-results/` folder
4. View trace files for detailed timeline
5. Check Playwright docs for API reference

---

**Remember**: Tests are 50-100x faster than manual testing. Use them!
