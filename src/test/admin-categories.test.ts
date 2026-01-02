import { test, expect } from '@playwright/test';
import { login, createTestCategory, deleteCategory, expectAlertMessage } from './helpers';

// Test admin category management workflows
test.describe('Admin Category Management', () => {
  // Setup: Login as admin before each test
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display category management page', async ({ page }) => {
    // Navigate to category management
    await page.goto('/admin/categories');
    
    // Verify page loaded - look for the "Category Management" heading
    await expect(page.locator('h2:has-text("Category Management")')).toBeVisible();
    
    // Verify create button is present
    await expect(page.locator('button:has-text("Create Category")')).toBeVisible();
    
    // Verify tabs are present
    await expect(page.locator('text=Manage Categories')).toBeVisible();
    await expect(page.locator('text=Review Suggestions')).toBeVisible();
  });

  test('should create a new root category', async ({ page }) => {
    await page.goto('/admin/categories');
    
    // Create test category using helper
    const testCategoryName = `Test Category ${Date.now()}`;
    await createTestCategory(page, {
      name: testCategoryName,
      icon: '🧪',
      description: 'This is a test category for E2E testing'
    });
    
    // Verify category appears in tree
    await expect(page.locator(`.category-name:has-text("${testCategoryName}")`)).toBeVisible({ timeout: 10000 });
  });

  test('should create a child category', async ({ page }) => {
    await page.goto('/admin/categories');
    
    // Wait for categories to load
    await page.waitForSelector('.category-item', { timeout: 10000 });
    
    // Click create category button
    await page.click('button:has-text("Create Category")');
    
    // Select a parent category
    const parentSelect = page.locator('select#parent');
    await parentSelect.selectOption({ index: 1 }); // Select first available parent
    
    // Fill in child category details
    const testChildName = `Test Child ${Date.now()}`;
    await page.fill('input#name', testChildName);
    await page.fill('input#icon', '🔬');
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Wait and verify child appears
    await page.waitForTimeout(1000);
    await expect(page.locator(`.category-name:has-text("${testChildName}")`)).toBeVisible({ timeout: 10000 });
  });

  test('should edit a category', async ({ page }) => {
    await page.goto('/admin/categories');
    
    // Wait for categories to load
    await page.waitForSelector('.category-item', { timeout: 10000 });
    
    // Click on first category to select it
    await page.click('.category-item .category-content:first-of-type');
    
    // Verify form opened in edit mode
    await expect(page.locator('h3:has-text("Edit Category")')).toBeVisible();
    
    // Modify description
    const updatedDescription = `Updated description ${Date.now()}`;
    const descriptionField = page.locator('textarea#description');
    await descriptionField.clear();
    await descriptionField.fill(updatedDescription);
    
    // Save changes
    await page.click('button[type="submit"]');
    
    // Verify success message
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 5000 });
  });

  test('should toggle section visibility for a category', async ({ page }) => {
    await page.goto('/admin/categories');
    
    // Wait for categories to load
    await page.waitForSelector('.category-item', { timeout: 10000 });
    
    // Click on first category
    await page.click('.category-item .category-content:first-of-type');
    
    // Verify edit form opened
    await expect(page.locator('h3:has-text("Edit Category")')).toBeVisible();
    
    // Click on Sections tab
    await page.click('.tab:has-text("Sections")');
    
    // Wait for sections to load
    await page.waitForTimeout(500);
    
    // Toggle a section if any exist
    const sectionToggle = page.locator('input[type="checkbox"]').first();
    if (await sectionToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      const initialState = await sectionToggle.isChecked();
      await sectionToggle.click();
      
      // Verify state changed
      await expect(sectionToggle).toHaveAttribute('checked', String(!initialState), { timeout: 2000 });
    }
  });

  test('should delete a category without children', async ({ page }) => {
    await page.goto('/admin/categories');
    
    // First create a test category to delete
    await page.click('button:has-text("Create Category")');
    
    const testCategoryName = `Delete Me ${Date.now()}`;
    await page.fill('input#name', testCategoryName);
    await page.fill('input#icon', '🗑️');
    await page.click('button[type="submit"]');
    
    // Wait for it to appear
    await expect(page.locator(`.category-name:has-text("${testCategoryName}")`)).toBeVisible({ timeout: 5000 });
    
    // Find and click delete button for this category
    const categoryItem = page.locator(`.category-item:has(.category-name:has-text("${testCategoryName}"))`);
    await categoryItem.locator('button.btn-danger').click();
    
    // Confirm deletion in dialog (if exists)
    const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete")');
    if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmButton.click();
    }
    
    // Wait a moment for deletion
    await page.waitForTimeout(1000);
    
    // Verify category is gone
    await expect(page.locator(`.category-name:has-text("${testCategoryName}")`)).not.toBeVisible({ timeout: 5000 });
  });

  test('should prevent deleting category with children', async ({ page }) => {
    await page.goto('/admin/categories');
    
    // Wait for categories to load
    await page.waitForSelector('.category-item', { timeout: 10000 });
    
    // Find a top-level category (likely to have children)
    const parentCategory = page.locator('.category-item').filter({ has: page.locator('.category-name') }).first();
    
    // Try to delete it
    const deleteButton = parentCategory.locator('button.btn-danger');
    
    if (await deleteButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await deleteButton.click();
      
      // Should see error message about children
      await expect(page.locator('.alert-error:has-text("children"), .alert-error:has-text("child")')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should switch between Manage and Suggestions tabs', async ({ page }) => {
    await page.goto('/admin/categories');
    
    // Verify we start on Manage tab (it should show the category tree)
    await expect(page.locator('h3:has-text("Category Hierarchy")')).toBeVisible();
    
    // Click Suggestions tab
    await page.click('button:has-text("Review Suggestions")');
    
    // Wait for content to load
    await page.waitForTimeout(500);
    
    // Switch back to Manage
    await page.click('button:has-text("Manage Categories")');
    await expect(page.locator('h3:has-text("Category Hierarchy")')).toBeVisible({ timeout: 5000 });
  });
});
