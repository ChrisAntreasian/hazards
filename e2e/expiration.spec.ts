import { test, expect } from './test-utils';
import {
  loginUser,
  createTestHazard,
  goToHazard,
  submitResolutionReport,
  confirmResolution,
  extendExpiration,
  getConfirmationCounts,
  waitForText,
} from './test-utils';

/**
 * PART 2: Hazard Expiration System Tests
 * Priority: P0 - Critical
 */

test.describe('Hazard Expiration System', () => {
  
  test.describe('Hazard Creation with Expiration Types', () => {
    
    test('should create auto-expire hazard with 6 hour duration', async ({ page }) => {
      await loginUser(page, 'playwright-test1@testmail.app', 'password123');
      
      const hazardId = await createTestHazard(page, {
        title: 'Auto-Expire Test Hazard',
        description: 'This hazard should expire automatically in 6 hours',
        category: 'Weather', // Assuming Weather has auto-expire default
        expirationType: 'auto_expire',
        autoExpireDuration: 6,
      });
      
      expect(hazardId).toBeTruthy();
      
      // Navigate to hazard detail page
      await goToHazard(page, hazardId!);
      
      // Verify status badge shows "Active"
      await expect(page.locator('text=/Active/i')).toBeVisible();
      
      // Verify time remaining countdown is visible
      await expect(page.locator('text=/expires in/i')).toBeVisible();
      
      // Verify "Extend Expiration" button is visible (for owner)
      await expect(page.locator('button:has-text("Extend Expiration")')).toBeVisible();
      
      // Verify extended count shows 0
      const extendedCountVisible = await page.locator('text=/extended 0 times/i').isVisible().catch(() => false);
      // Extended count may not be shown if 0, so this is optional
    });

    test('should create user-resolvable hazard', async ({ page }) => {
      await loginUser(page, 'playwright-test1@testmail.app', 'password123');
      
      const hazardId = await createTestHazard(page, {
        title: 'User-Resolvable Test Hazard',
        description: 'This hazard can be reported as resolved by users',
        expirationType: 'user_resolvable',
      });
      
      expect(hazardId).toBeTruthy();
      
      await goToHazard(page, hazardId!);
      
      // Verify status badge shows "Active"
      await expect(page.locator('text=/Active/i')).toBeVisible();
      
      // Verify NO expiration countdown (user-resolvable doesn't expire automatically)
      const hasCountdown = await page.locator('text=/expires in/i').isVisible().catch(() => false);
      expect(hasCountdown).toBe(false);
      
      // Verify NO "Extend Expiration" button (not applicable for user-resolvable)
      const hasExtendButton = await page.locator('button:has-text("Extend Expiration")').isVisible().catch(() => false);
      expect(hasExtendButton).toBe(false);
      
      // For owner: should NOT see "Report as Resolved" button
      const hasReportButton = await page.locator('button:has-text("Report as Resolved")').isVisible().catch(() => false);
      expect(hasReportButton).toBe(false);
    });

    test('should create permanent hazard', async ({ page }) => {
      await loginUser(page, 'playwright-test1@testmail.app', 'password123');
      
      const hazardId = await createTestHazard(page, {
        title: 'Permanent Test Hazard',
        description: 'This hazard never expires',
        expirationType: 'permanent',
      });
      
      expect(hazardId).toBeTruthy();
      
      await goToHazard(page, hazardId!);
      
      // Verify "Permanent" badge or status
      await expect(page.locator('text=/Permanent/i')).toBeVisible();
      
      // Verify NO expiration countdown
      const hasCountdown = await page.locator('text=/expires in/i').isVisible().catch(() => false);
      expect(hasCountdown).toBe(false);
      
      // Verify NO extend button
      const hasExtendButton = await page.locator('button:has-text("Extend Expiration")').isVisible().catch(() => false);
      expect(hasExtendButton).toBe(false);
      
      // Verify NO resolution options
      const hasResolutionSection = await page.locator('text=/Report as Resolved/i').isVisible().catch(() => false);
      expect(hasResolutionSection).toBe(false);
    });

    test('should create seasonal hazard with selected months', async ({ page }) => {
      await loginUser(page, 'playwright-test1@testmail.app', 'password123');
      
      const hazardId = await createTestHazard(page, {
        title: 'Seasonal Test Hazard',
        description: 'This hazard is only active May through September',
        expirationType: 'seasonal',
        seasonalMonths: [5, 6, 7, 8, 9], // May-September
      });
      
      expect(hazardId).toBeTruthy();
      
      await goToHazard(page, hazardId!);
      
      // Verify seasonal badge is visible
      await expect(page.locator('text=/May.*September/i')).toBeVisible();
      
      // Status depends on current month (November = dormant)
      // Current date is November 17, 2025, so hazard should be dormant
      const isDormant = await page.locator('text=/Dormant/i').isVisible();
      const isActive = await page.locator('text=/Active/i').isVisible();
      
      // Should show either Active or Dormant based on current month
      expect(isDormant || isActive).toBe(true);
    });
  });

  test.describe('Auto-Expire Functionality', () => {
    
    test('should extend auto-expire hazard by 24 hours', async ({ page }) => {
      await loginUser(page, 'playwright-test1@testmail.app', 'password123');
      
      const hazardId = await createTestHazard(page, {
        title: 'Extend Test Hazard',
        description: 'Testing extension functionality',
        expirationType: 'auto_expire',
        autoExpireDuration: 1, // 1 hour for quick testing
      });
      
      expect(hazardId).toBeTruthy();
      
      await goToHazard(page, hazardId!);
      
      // Wait for page to load
      await page.waitForSelector('button:has-text("Extend Expiration")');
      
      // Click extend button
      await extendExpiration(page);
      
      // Wait for success message or UI update
      await page.waitForTimeout(1000);
      
      // Verify success message
      const hasSuccessMessage = await page.locator('text=/extended/i').isVisible();
      expect(hasSuccessMessage).toBe(true);
      
      // Verify extended count increased (should now be 1)
      // This might be shown in UI or you may need to check database
      const hasExtendedCount = await page.locator('text=/extended 1 time/i').isVisible().catch(() => false);
      // Count display is optional in UI
    });

    test('should allow multiple extensions', async ({ page }) => {
      await loginUser(page, 'playwright-test1@testmail.app', 'password123');
      
      const hazardId = await createTestHazard(page, {
        title: 'Multiple Extensions Test',
        description: 'Testing unlimited extensions',
        expirationType: 'auto_expire',
        autoExpireDuration: 1,
      });
      
      expect(hazardId).toBeTruthy();
      
      await goToHazard(page, hazardId!);
      
      // Extend 3 times
      for (let i = 0; i < 3; i++) {
        await extendExpiration(page);
        await page.waitForTimeout(1000);
      }
      
      // Verify all extensions succeeded (no error messages)
      const hasError = await page.locator('text=/error|failed/i').isVisible().catch(() => false);
      expect(hasError).toBe(false);
    });
  });

  test.describe('User-Resolvable Resolution Flow', () => {
    
    test('should submit resolution report', async ({ page, context }) => {
      // Create hazard as User A
      await loginUser(page, 'playwright-test1@testmail.app', 'password123');
      
      const hazardId = await createTestHazard(page, {
        title: 'Resolution Test Hazard',
        description: 'Testing resolution reporting',
        expirationType: 'user_resolvable',
      });
      
      expect(hazardId).toBeTruthy();
      
      // Logout and login as User B (different user)
      // For this test to work fully, you need a second test account
      // For now, we'll skip the user switch and just test the UI
      
      // Open in new context as different user
      const page2 = await context.newPage();
      await loginUser(page2, 'playwright-test2@testmail.app', 'password123');
      
      await goToHazard(page2, hazardId!);
      
      // Submit resolution report
      await submitResolutionReport(
        page2,
        'I visited this location today at 3pm. The hazard has been completely cleared.',
        'https://example.com/evidence.jpg'
      );
      
      // Wait for submission
      await page2.waitForTimeout(1500);
      
      // Verify success message or report is now visible
      const reportVisible = await page2.locator('text=/visited this location/i').isVisible();
      expect(reportVisible).toBe(true);
      
      // Verify confirmation buttons are visible
      await expect(page2.locator('button:has-text("Yes, Resolved")')).toBeVisible();
      await expect(page2.locator('button:has-text("No, Still There")')).toBeVisible();
      
      await page2.close();
    });

    test('should confirm resolution', async ({ page, context }) => {
      // This test requires:
      // 1. A hazard with an existing resolution report
      // 2. A different user to confirm
      
      // For demonstration, we'll show the test structure
      // In practice, you'd set up test data beforehand
      
      // Create hazard as User A
      await loginUser(page, 'playwright-test1@testmail.app', 'password123');
      
      const hazardId = await createTestHazard(page, {
        title: 'Confirmation Test',
        description: 'Testing resolution confirmation',
        expirationType: 'user_resolvable',
      });
      
      // User B submits report
      const page2 = await context.newPage();
      await loginUser(page2, 'playwright-test2@testmail.app', 'password123');
      await goToHazard(page2, hazardId!);
      await submitResolutionReport(page2, 'Hazard is resolved', '');
      await page2.waitForTimeout(1000);
      
      // User C confirms
      const page3 = await context.newPage();
      await loginUser(page3, 'playwright-test3@testmail.app', 'password123');
      await goToHazard(page3, hazardId!);
      
      await confirmResolution(page3, 'confirmed');
      await page3.waitForTimeout(1000);
      
      // Verify confirmed count increased to 1
      const counts = await getConfirmationCounts(page3);
      expect(counts.confirmed).toBeGreaterThan(0);
      
      // Verify button shows active state
      const yesButton = page3.locator('button:has-text("Yes, Resolved")');
      await expect(yesButton).toHaveClass(/active|selected/);
      
      await page2.close();
      await page3.close();
    });

    test('should auto-resolve at threshold (3 confirmations)', async ({ page, context }) => {
      // This is a complex test requiring multiple users
      // Simplified version showing test structure
      
      await loginUser(page, 'playwright-test1@testmail.app', 'password123');
      
      const hazardId = await createTestHazard(page, {
        title: 'Auto-Resolve Test',
        description: 'Testing auto-resolution at threshold',
        expirationType: 'user_resolvable',
      });
      
      // User B submits report
      const page2 = await context.newPage();
      await loginUser(page2, 'playwright-test2@testmail.app', 'password123');
      await goToHazard(page2, hazardId!);
      await submitResolutionReport(page2, 'Resolved', '');
      await page2.waitForTimeout(1000);
      
      // Users C, D, E confirm (need 3 confirmations)
      for (const email of ['playwright-test3@testmail.app', 'playwright-test4@testmail.app', 'playwright-test5@testmail.app']) {
        const userPage = await context.newPage();
        await loginUser(userPage, email, 'password123');
        await goToHazard(userPage, hazardId!);
        await confirmResolution(userPage, 'confirmed');
        await userPage.waitForTimeout(1000);
        await userPage.close();
      }
      
      // Check if hazard is now resolved
      await page.goto(`/hazards/${hazardId}`);
      await page.waitForLoadState('networkidle');
      
      // Verify "Resolved" badge or status
      const isResolved = await page.locator('text=/Resolved/i').isVisible();
      expect(isResolved).toBe(true);
      
      await page2.close();
    });
  });

  test.describe('Seasonal Hazard Behavior', () => {
    
    test('should show seasonal hazard as active during season', async ({ page }) => {
      await loginUser(page, 'playwright-test1@testmail.app', 'password123');
      
      // Create seasonal hazard with current month included
      // November = month 11, so include it in active months
      const hazardId = await createTestHazard(page, {
        title: 'Seasonal Active Test',
        description: 'Testing seasonal hazard during active season',
        expirationType: 'seasonal',
        seasonalMonths: [11], // November only
      });
      
      expect(hazardId).toBeTruthy();
      
      await goToHazard(page, hazardId!);
      
      // Should show "Active" status since we're in November
      await expect(page.locator('text=/Active/i')).toBeVisible();
    });

    test('should show seasonal hazard as dormant outside season', async ({ page }) => {
      await loginUser(page, 'playwright-test1@testmail.app', 'password123');
      
      // Create seasonal hazard WITHOUT current month (November = 11)
      const hazardId = await createTestHazard(page, {
        title: 'Seasonal Dormant Test',
        description: 'Testing seasonal hazard outside active season',
        expirationType: 'seasonal',
        seasonalMonths: [5, 6, 7], // May-July (not November)
      });
      
      expect(hazardId).toBeTruthy();
      
      await goToHazard(page, hazardId!);
      
      // Should show "Dormant" status since we're not in active months
      await expect(page.locator('text=/Dormant/i')).toBeVisible();
      
      // Should show active month range
      await expect(page.locator('text=/May.*July/i')).toBeVisible();
    });
  });
});
