import { test, expect } from './test-utils';
import {
  loginUser,
  createTestHazard,
  goToHazard,
  voteOnHazard,
  getVoteCounts,
} from './test-utils';

/**
 * PART 1: Hazard Voting System Tests
 * Priority: P0 - Critical
 */

test.describe('Hazard Voting System', () => {
  
  test.describe('Basic Voting Functionality', () => {
    
    test('should allow upvoting a hazard', async ({ page }) => {
      // Login as test user
      await loginUser(page, 'playwright-test1@testmail.app', 'password123');
      
      // Create a hazard as another user (you'll need a second test account)
      // For now, we'll assume a hazard exists with ID from setup
      // TODO: Create test data setup with multiple users
      
      // Navigate to a hazard (not owned by current user)
      await page.goto('/map');
      
      // Find and click on a hazard marker (force click to bypass emoji interception)
      await page.locator('.leaflet-marker-icon').first().click({ force: true });
      
      // Wait for detail page to load
      await page.waitForSelector('button:has-text("👍")');
      
      // Get initial vote counts
      const initialCounts = await getVoteCounts(page);
      
      // Cast upvote
      await voteOnHazard(page, 'upvote');
      
      // Wait for UI update
      await page.waitForTimeout(1000);
      
      // Verify vote count increased
      const newCounts = await getVoteCounts(page);
      expect(newCounts.upvotes).toBe(initialCounts.upvotes + 1);
      
      // Verify upvote button is active
      const upvoteButton = page.locator('button:has-text("👍")');
      await expect(upvoteButton).toHaveClass(/active|selected/);
    });

    test('should allow downvoting a hazard', async ({ page }) => {
      await loginUser(page, 'playwright-test1@testmail.app', 'password123');
      
      await page.goto('/map');
      await page.locator('.leaflet-marker-icon').first().click({ force: true });
      await page.waitForSelector('button:has-text("👎")');
      
      const initialCounts = await getVoteCounts(page);
      
      await voteOnHazard(page, 'downvote');
      await page.waitForTimeout(1000);
      
      const newCounts = await getVoteCounts(page);
      expect(newCounts.downvotes).toBe(initialCounts.downvotes + 1);
      
      const downvoteButton = page.locator('button:has-text("👎")');
      await expect(downvoteButton).toHaveClass(/active|selected/);
    });

    test('should allow changing vote from upvote to downvote', async ({ page }) => {
      await loginUser(page, 'playwright-test1@testmail.app', 'password123');
      
      await page.goto('/map');
      await page.locator('.leaflet-marker-icon').first().click({ force: true });
      await page.waitForSelector('button:has-text("👍")');
      
      // First upvote
      await voteOnHazard(page, 'upvote');
      await page.waitForTimeout(1000);
      
      const afterUpvote = await getVoteCounts(page);
      
      // Then downvote (change vote)
      await voteOnHazard(page, 'downvote');
      await page.waitForTimeout(1000);
      
      const afterChange = await getVoteCounts(page);
      
      // Upvote count should decrease, downvote should increase
      expect(afterChange.upvotes).toBe(afterUpvote.upvotes - 1);
      expect(afterChange.downvotes).toBe(afterUpvote.downvotes + 1);
    });

    test('should allow removing vote', async ({ page }) => {
      await loginUser(page, 'playwright-test1@testmail.app', 'password123');
      
      await page.goto('/map');
      await page.locator('.leaflet-marker-icon').first().click({ force: true });
      await page.waitForSelector('button:has-text("👍")');
      
      // First upvote
      await voteOnHazard(page, 'upvote');
      await page.waitForTimeout(1000);
      
      const afterVote = await getVoteCounts(page);
      
      // Click upvote again to remove
      await voteOnHazard(page, 'upvote');
      await page.waitForTimeout(1000);
      
      const afterRemove = await getVoteCounts(page);
      
      // Vote count should decrease by 1
      expect(afterRemove.upvotes).toBe(afterVote.upvotes - 1);
      
      // Button should no longer be active
      const upvoteButton = page.locator('button:has-text("👍")');
      await expect(upvoteButton).not.toHaveClass(/active|selected/);
    });
  });

  test.describe('Voting Permissions', () => {
    
    test('should prevent voting on own hazard', async ({ page }) => {
      await loginUser(page, 'playwright-test1@testmail.app', 'password123');
      
      // Create a hazard
      const hazardId = await createTestHazard(page, {
        title: 'Test Hazard for Voting',
        description: 'This is a test hazard to verify users cannot vote on their own hazards',
        expirationType: 'user_resolvable',
      });
      
      if (!hazardId) {
        throw new Error('Failed to create test hazard');
      }
      
      // Navigate to own hazard
      await goToHazard(page, hazardId);
      
      // Verify voting buttons are disabled or hidden
      const upvoteButton = page.locator('button:has-text("👍")');
      const downvoteButton = page.locator('button:has-text("👎")');
      
      // Check if disabled
      const upvoteDisabled = await upvoteButton.isDisabled().catch(() => false);
      const downvoteDisabled = await downvoteButton.isDisabled().catch(() => false);
      
      // Or check if hidden
      const upvoteHidden = !(await upvoteButton.isVisible().catch(() => false));
      const downvoteHidden = !(await downvoteButton.isVisible().catch(() => false));
      
      // Either disabled or hidden is acceptable
      expect(upvoteDisabled || upvoteHidden).toBe(true);
      expect(downvoteDisabled || downvoteHidden).toBe(true);
      
      // Verify message is shown
      await expect(page.locator('text=/cannot vote on your own/i')).toBeVisible();
    });

    test('should prevent unauthenticated users from voting', async ({ page }) => {
      // Don't login - test as anonymous user
      
      await page.goto('/map');
      
      // Try to click a hazard
      await page.locator('.leaflet-marker-icon').first().click({ force: true });
      await page.waitForSelector('button:has-text("👍")', { timeout: 5000 });
      
      // Verify voting buttons are disabled or show login prompt
      const upvoteButton = page.locator('button:has-text("👍")');
      
      const isDisabled = await upvoteButton.isDisabled().catch(() => false);
      
      if (!isDisabled) {
        // If not disabled, clicking should redirect to login
        await upvoteButton.click();
        await page.waitForURL(/\/auth\/login/, { timeout: 5000 });
      } else {
        // Verify message about needing to log in
        await expect(page.locator('text=/log in to vote/i')).toBeVisible();
      }
    });
  });

  test.describe('Vote Persistence', () => {
    
    test('should persist votes across sessions', async ({ page }) => {
      await loginUser(page, 'playwright-test1@testmail.app', 'password123');
      
      await page.goto('/map');
      await page.locator('.leaflet-marker-icon').first().click({ force: true });
      await page.waitForSelector('button:has-text("👍")');
      
      // Cast upvote
      await voteOnHazard(page, 'upvote');
      await page.waitForTimeout(1000);
      
      // Get URL of current hazard
      const hazardUrl = page.url();
      
      // Reload page (simulating new session)
      await page.reload();
      await page.waitForSelector('button:has-text("👍")');
      
      // Verify upvote button still shows active state
      const upvoteButton = page.locator('button:has-text("👍")');
      await expect(upvoteButton).toHaveClass(/active|selected/);
    });
  });
});
