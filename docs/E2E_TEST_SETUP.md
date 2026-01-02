# E2E Test Setup Guide

This guide walks you through setting up end-to-end (E2E) tests for the Hazards application.

## Prerequisites

- Node.js (v18 or higher)
- Running Supabase project
- Local development environment configured

## Step-by-Step Setup

### 1. Install Dependencies

```powershell
# Install all project dependencies
npm install

# Install Playwright browsers
npx playwright install
```

### 2. Configure Test Environment

Copy the environment template:

```powershell
Copy-Item .env.test.example .env.test
```

Edit `.env.test` with your test configuration:

```env
# Supabase Configuration
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here

# Test User Credentials
TEST_ADMIN_EMAIL=admin@test.com
TEST_ADMIN_PASSWORD=securepassword123

# Application URL
BASE_URL=http://localhost:5173
```

### 3. Create Test Admin User

#### Option A: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Users**
3. Click **Add User**
4. Fill in:
   - Email: `admin@test.com`
   - Password: `securepassword123`
   - Email Confirm: ✓
5. Click **Create User**
6. Navigate to **Database** → **Table Editor** → **profiles**
7. Find the user and set `role = 'admin'`

#### Option B: Using SQL

Run this SQL in your Supabase SQL Editor:

```sql
-- Create test admin user
INSERT INTO auth.users (
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
) VALUES (
  'admin@test.com',
  crypt('securepassword123', gen_salt('bf')),
  now(),
  now(),
  now()
) RETURNING id;

-- Set admin role (replace USER_ID with the ID from above)
INSERT INTO public.profiles (id, email, role)
VALUES ('USER_ID', 'admin@test.com', 'admin');
```

### 4. Create Test Data

You need at least one test category for E2E tests to work properly.

#### Option A: Using Application UI

1. Start your dev server: `npm run dev`
2. Log in as admin (`admin@test.com`)
3. Go to **Admin** → **Categories**
4. Create a test category (e.g., "Weather Hazards")

#### Option B: Using SQL

```sql
INSERT INTO hazard_categories (name, description, icon, parent_id, path)
VALUES ('Weather Hazards', 'Test category for E2E tests', '🌤️', NULL, 'weather-hazards');
```

### 5. Validate Setup

Run the setup validation script:

```powershell
npm run test:e2e:setup
```

This will check:
- ✓ Environment variables are configured
- ✓ Test admin user exists
- ✓ Test admin has correct role
- ✓ Test data is present

Expected output:

```
✓ All environment variables are set
✓ Test admin user exists
✓ User has admin role
✓ Test data present (3 categories found)

Setup validation completed successfully!
You can now run E2E tests with: npm run test:e2e
```

### 6. Run Tests

Start your development server in one terminal:

```powershell
npm run dev
```

Run E2E tests in another terminal:

```powershell
# Run all E2E tests
npm run test:e2e

# Run with interactive UI
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Run specific test file
npm run test:e2e:admin
```

## Common Issues

### Issue: "Test admin user not found"

**Cause**: Test user doesn't exist in Supabase

**Solution**:
1. Verify `TEST_ADMIN_EMAIL` in `.env.test` matches your Supabase user
2. Check user exists in Supabase dashboard: Authentication → Users
3. Create user following Step 3 above

### Issue: "User does not have admin role"

**Cause**: User exists but doesn't have admin privileges

**Solution**:
1. Go to Supabase dashboard: Database → profiles table
2. Find user by email
3. Set `role` column to `'admin'`

### Issue: "No test data found"

**Cause**: No categories exist in database

**Solution**:
1. Create at least one category (see Step 4)
2. Alternatively, run seed script if available

### Issue: "Browser not installed"

**Cause**: Playwright browsers not installed

**Solution**:
```powershell
npx playwright install
```

### Issue: "Connection refused to localhost:5173"

**Cause**: Development server not running

**Solution**:
1. Start dev server: `npm run dev`
2. Verify it's running at http://localhost:5173
3. Run E2E tests in a separate terminal

### Issue: Tests fail intermittently

**Cause**: Timing issues, network delays

**Solution**:
1. Run tests in headed mode to observe: `npm run test:e2e:headed`
2. Check for race conditions in test code
3. Add appropriate waits for elements to load
4. Increase timeouts in `playwright.config.ts` if needed

### Issue: "Invalid credentials" during login

**Cause**: Wrong password or email

**Solution**:
1. Double-check `.env.test` credentials
2. Try logging in manually at http://localhost:5173/auth/login
3. Reset password if needed in Supabase dashboard

## Test Environments

### Local Development

- **URL**: http://localhost:5173
- **Database**: Your local or development Supabase project
- **Purpose**: Development and testing

### Staging (Optional)

- **URL**: https://staging.yourdomain.com
- **Database**: Staging Supabase project
- **Purpose**: Pre-production testing

### Production

⚠️ **DO NOT run E2E tests against production**

Tests create and delete data, which can affect real users.

## Security Notes

1. **Never commit `.env.test`**: It contains sensitive credentials
2. **Use separate test users**: Don't use real user accounts for testing
3. **Use separate database**: Consider using a dedicated test database
4. **Rotate credentials**: Change test passwords periodically
5. **Limit permissions**: Test users should only have access to test data

## Advanced Configuration

### Custom Test Timeout

Edit `playwright.config.ts`:

```typescript
export default defineConfig({
  timeout: 60000, // 60 seconds per test
  expect: {
    timeout: 10000 // 10 seconds for assertions
  }
});
```

### Running Tests in CI

Example GitHub Actions workflow:

```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          TEST_ADMIN_EMAIL: ${{ secrets.TEST_ADMIN_EMAIL }}
          TEST_ADMIN_PASSWORD: ${{ secrets.TEST_ADMIN_PASSWORD }}
          BASE_URL: http://localhost:5173
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

### Running Specific Browsers

```powershell
# Run only on Chromium
npx playwright test --project=chromium

# Run only on Firefox
npx playwright test --project=firefox

# Run only on WebKit (Safari)
npx playwright test --project=webkit
```

### Debugging Tests

```powershell
# Open Playwright Inspector
npm run test:e2e:debug

# Run with UI (interactive mode)
npm run test:e2e:ui

# View last test report
npm run test:e2e:report
```

## Next Steps

Once setup is complete:

1. ✓ Run `npm run test:e2e` to verify everything works
2. ✓ Read `docs/TESTING_GUIDE.md` for detailed testing guide
3. ✓ Review `src/test/helpers.ts` for available test utilities
4. ✓ Explore `src/test/admin-categories.test.ts` for example tests
5. ✓ Write your own E2E tests for new features

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Testing Guide](./TESTING_GUIDE.md)
- [Supabase Local Development](https://supabase.com/docs/guides/cli/local-development)

---

**Questions or Issues?**

If you encounter problems not covered here:
1. Check the troubleshooting section in `docs/TESTING_GUIDE.md`
2. Review Playwright logs in `playwright-report/`
3. Run tests with `--debug` flag for step-by-step debugging
4. Check Supabase logs for API/database issues

**Last Updated**: December 2025
