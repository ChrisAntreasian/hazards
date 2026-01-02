import { Page, expect } from '@playwright/test';

/**
 * E2E Test Helpers
 * Reusable utilities for Playwright tests
 */

/**
 * Login as a user with the given credentials
 */
export async function login(
  page: Page,
  email: string = process.env.TEST_ADMIN_EMAIL || 'admin@test.com',
  password: string = process.env.TEST_ADMIN_PASSWORD || 'testpassword'
) {
  await page.goto('/auth/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|$)/, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

/**
 * Logout the current user
 */
export async function logout(page: Page) {
  // Adjust selector based on your UI
  const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Sign Out"), button:has-text("Sign Out")');
  if (await logoutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await logoutButton.click();
    await page.waitForURL(/\/auth/, { timeout: 5000 });
  }
}

/**
 * Create a test category and return its name
 */
export async function createTestCategory(
  page: Page,
  options: {
    name?: string;
    icon?: string;
    description?: string;
    parentId?: string;
  } = {}
): Promise<string> {
  const categoryName = options.name || `Test Category ${Date.now()}`;
  
  await page.click('button:has-text("Create Category")');
  await page.fill('input#name', categoryName);
  
  if (options.icon) {
    await page.fill('input#icon', options.icon);
  }
  
  if (options.description) {
    await page.fill('textarea#description', options.description);
  }
  
  if (options.parentId) {
    await page.selectOption('select#parent', options.parentId);
  }
  
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1000); // Wait for API
  
  return categoryName;
}

/**
 * Delete a category by name
 */
export async function deleteCategory(page: Page, categoryName: string) {
  const categoryItem = page.locator(`.category-item:has(.category-name:has-text("${categoryName}"))`);
  await categoryItem.locator('button.btn-danger').click();
  
  // Handle confirmation dialog if exists
  const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete")');
  if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await confirmButton.click();
  }
  
  await page.waitForTimeout(1000);
}

/**
 * Wait for an alert message to appear
 */
export async function expectAlertMessage(
  page: Page,
  type: 'success' | 'error',
  textPattern?: string | RegExp
) {
  const selector = `.alert-${type}`;
  const alert = page.locator(selector);
  
  await expect(alert).toBeVisible({ timeout: 5000 });
  
  if (textPattern) {
    if (typeof textPattern === 'string') {
      await expect(alert).toContainText(textPattern);
    } else {
      await expect(alert).toContainText(textPattern);
    }
  }
}

/**
 * Wait for navigation and network to be idle
 */
export async function waitForPageReady(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle');
}

/**
 * Take a screenshot with a descriptive name
 */
export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({ 
    path: `screenshots/${name}-${Date.now()}.png`,
    fullPage: true 
  });
}

/**
 * Clear all test data created during tests
 * (categories with "Test" in the name)
 */
export async function cleanupTestCategories(page: Page) {
  await page.goto('/admin/categories');
  
  const testCategories = page.locator('.category-item:has(.category-name:text-matches("Test", "i"))');
  const count = await testCategories.count();
  
  for (let i = 0; i < count; i++) {
    const item = testCategories.nth(i);
    const deleteBtn = item.locator('button.btn-danger');
    
    if (await deleteBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await deleteBtn.click();
      
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")');
      if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await confirmButton.click();
      }
      
      await page.waitForTimeout(500);
    }
  }
}

/**
 * Check if user has admin access
 */
export async function verifyAdminAccess(page: Page) {
  await page.goto('/admin/categories');
  
  // Should not redirect to unauthorized page
  await expect(page).not.toHaveURL(/\/(unauthorized|auth\/login)/);
  
  // Should see admin UI
  await expect(page.locator('h2:has-text("Category Management")')).toBeVisible({ timeout: 5000 });
}
