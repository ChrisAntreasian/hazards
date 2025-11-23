import { test as base, expect, type Page } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Test Utilities for Hazards App
 * Provides helpers for authentication, database setup, and common test operations
 */

// Extend base test with custom fixtures
export const test = base.extend<{
  authenticatedPage: Page;
  testUser: TestUser;
  supabaseAdmin: SupabaseClient;
}>({
  // Fixture for authenticated page
  authenticatedPage: async ({ page }, use) => {
    await loginUser(page, 'playwright-test1@testmail.app', 'password123');
    await use(page);
  },

  // Fixture for test user data
  testUser: async ({}, use) => {
    const user = {
      email: 'playwright-test1@testmail.app',
      password: 'password123',
      id: null as string | null,
    };
    await use(user);
  },

  // TODO: Add Supabase admin client fixture for database operations
  // supabaseAdmin: async ({}, use) => {
  //   const supabase = createClient(
  //     process.env.PUBLIC_SUPABASE_URL!,
  //     process.env.SUPABASE_SERVICE_ROLE_KEY! // Admin key for testing
  //   );
  //   await use(supabase);
  // },
});

export { expect };

// Test user interface
export interface TestUser {
  email: string;
  password: string;
  id: string | null;
}

/**
 * Login helper function
 */
export async function loginUser(page: Page, email: string, password: string) {
  await page.goto('/auth/log-in');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  
  // Wait for navigation after login
  await page.waitForURL(/\/(dashboard|map)/, { timeout: 10000 });
}

/**
 * Logout helper function
 */
export async function logoutUser(page: Page) {
  // Navigate to profile or settings and click logout
  // Adjust based on your actual logout implementation
  await page.goto('/profile');
  await page.click('button:has-text("Logout")');
  await page.waitForURL('/auth/log-in');
}

/**
 * Create a test hazard
 */
export async function createTestHazard(
  page: Page,
  options: {
    title: string;
    description: string;
    category?: string;
    severity?: number;
    expirationType?: 'auto_expire' | 'user_resolvable' | 'permanent' | 'seasonal';
    autoExpireDuration?: number; // hours
    seasonalMonths?: number[]; // 1-12
  }
) {
  await page.goto('/hazards/create');
  
  // Fill basic info
  await page.fill('input[name="title"]', options.title);
  await page.fill('textarea[name="description"]', options.description);
  
  // Select category if provided
  if (options.category) {
    // Get all option elements and find one that contains the category text
    const categoryOptions = await page.locator('select[name="category_id"] option').allTextContents();
    const matchingIndex = categoryOptions.findIndex(opt => opt.toLowerCase().includes(options.category!.toLowerCase()));
    
    if (matchingIndex >= 0) {
      const matchingValue = await page.locator(`select[name="category_id"] option`).nth(matchingIndex).getAttribute('value');
      if (matchingValue) {
        await page.selectOption('select[name="category_id"]', matchingValue);
      }
    }
  }
  
  // Set severity if provided (it's a range input, not a select)
  if (options.severity) {
    await page.locator('input[name="severity_level"]').fill(options.severity.toString());
  }
  
  // Set location using the location search
  // Fill in a simple search query (use default coordinates for testing)
  const locationSearch = page.locator('input[placeholder*="Search by address"]');
  await locationSearch.fill('Denver, CO'); // Use a known location
  await locationSearch.press('Enter');
  
  // Wait for the map to load with the location
  await page.waitForTimeout(2000); // Give map time to update
  
  // Now the map should be interactive - we can adjust location by clicking if needed
  // For now, just use the searched location
  
  // Set expiration type if provided
  if (options.expirationType) {
    await page.click(`input[type="radio"][value="${options.expirationType}"]`);
    
    // Wait for conditional fields to appear
    await page.waitForTimeout(1000);
    
    // Handle auto-expire duration
    if (options.expirationType === 'auto_expire' && options.autoExpireDuration) {
      // Wait for the input to be visible
      await page.waitForSelector('input#auto-expire-duration', { state: 'visible', timeout: 5000 });
      await page.fill('input#auto-expire-duration', options.autoExpireDuration.toString());
    }
    
    // Handle seasonal months
    if (options.expirationType === 'seasonal' && options.seasonalMonths) {
      for (const month of options.seasonalMonths) {
        await page.click(`button.month-button:nth-child(${month})`);
      }
    }
  }
  
  // Submit form
  await page.click('button[type="submit"]');
  
  // Wait for redirect to hazard detail page
  await page.waitForURL(/\/hazards\/[a-f0-9-]+/, { timeout: 10000 });
  
  // Extract hazard ID from URL
  const url = page.url();
  console.log('Redirected to URL:', url);
  const match = url.match(/\/hazards\/([a-f0-9-]+)/);
  console.log('Extracted hazard ID:', match ? match[1] : 'NO MATCH');
  return match ? match[1] : null;
}

/**
 * Navigate to hazard detail page
 */
export async function goToHazard(page: Page, hazardId: string) {
  await page.goto(`/hazards/${hazardId}`);
  await page.waitForLoadState('networkidle');
}

/**
 * Cast a vote on a hazard
 */
export async function voteOnHazard(page: Page, voteType: 'upvote' | 'downvote') {
  const buttonSelector = voteType === 'upvote' 
    ? 'button:has-text("👍")' 
    : 'button:has-text("👎")';
  
  await page.click(buttonSelector);
  
  // Wait for vote to be processed
  await page.waitForTimeout(500);
}

/**
 * Submit a resolution report
 */
export async function submitResolutionReport(
  page: Page,
  note: string,
  evidenceUrl?: string
) {
  // Click "Report as Resolved" button if form not visible
  const formVisible = await page.locator('textarea[name="resolution_note"]').isVisible();
  if (!formVisible) {
    await page.click('button:has-text("Report as Resolved")');
  }
  
  // Fill resolution form
  await page.fill('textarea[name="resolution_note"]', note);
  if (evidenceUrl) {
    await page.fill('input[name="evidence_url"]', evidenceUrl);
  }
  
  // Submit form
  await page.click('button:has-text("Submit Report")');
  
  // Wait for submission
  await page.waitForTimeout(500);
}

/**
 * Confirm or dispute a resolution
 */
export async function confirmResolution(
  page: Page,
  confirmation: 'confirmed' | 'disputed'
) {
  const buttonText = confirmation === 'confirmed' ? 'Yes, Resolved' : 'No, Still There';
  await page.click(`button:has-text("${buttonText}")`);
  
  // Wait for confirmation
  await page.waitForTimeout(500);
}

/**
 * Extend hazard expiration
 */
export async function extendExpiration(page: Page) {
  await page.click('button:has-text("Extend Expiration")');
  
  // Wait for extension
  await page.waitForTimeout(500);
}

/**
 * Wait for element with text
 */
export async function waitForText(page: Page, text: string, timeout = 5000) {
  await page.locator(`text=${text}`).waitFor({ timeout });
}

/**
 * Get vote counts from page
 */
export async function getVoteCounts(page: Page): Promise<{ upvotes: number; downvotes: number }> {
  const upvoteText = await page.locator('button:has-text("👍")').textContent();
  const downvoteText = await page.locator('button:has-text("👎")').textContent();
  
  const upvotes = parseInt(upvoteText?.match(/\d+/)?.[0] || '0');
  const downvotes = parseInt(downvoteText?.match(/\d+/)?.[0] || '0');
  
  return { upvotes, downvotes };
}

/**
 * Get confirmation counts from page
 */
export async function getConfirmationCounts(page: Page): Promise<{ confirmed: number; disputed: number }> {
  const confirmedText = await page.locator('text=/Confirmed:\\s*\\d+/').textContent();
  const disputedText = await page.locator('text=/Disputed:\\s*\\d+/').textContent();
  
  const confirmed = parseInt(confirmedText?.match(/\d+/)?.[0] || '0');
  const disputed = parseInt(disputedText?.match(/\d+/)?.[0] || '0');
  
  return { confirmed, disputed };
}
