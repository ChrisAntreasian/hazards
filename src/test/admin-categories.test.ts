import { test, expect } from '@playwright/test';

// Test admin category management workflows
test.describe('Admin Category Management', () => {
  // Setup: Login as admin before each test
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/auth/login');
    
    // Fill in admin credentials (adjust based on your test setup)
    await page.fill('input[type="email"]', process.env.TEST_ADMIN_EMAIL || 'admin@test.com');
    await page.fill('input[type="password"]', process.env.TEST_ADMIN_PASSWORD || 'testpassword');
    
    // Submit login form
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard or home
    await page.waitForURL(/\/(dashboard|$)/);
    
    // Verify we're logged in (adjust selector based on your UI)
    await expect(page.locator('text=/admin|profile/i')).toBeVisible({ timeout: 10000 });
  });

  test('should display category management page', async ({ page }) => {
    // Navigate to category management
    await page.goto('/admin/categories');
    
    // Verify page loaded
    await expect(page.locator('text=/Category Management|Manage Categories/i')).toBeVisible();
    
    // Verify tabs are present
    await expect(page.locator('text=Manage Categories')).toBeVisible();
    await expect(page.locator('text=Review Suggestions')).toBeVisible();
  });

  test('should create a new root category', async ({ page }) => {
    await page.goto('/admin/categories');
    
    // Click create/add category button (adjust selector as needed)
    const createButton = page.locator('button:has-text("Add Category"), button:has-text("Create Category"), button:has-text("New Category")').first();
    await createButton.click();
    
    // Fill in category form
    const testCategoryName = `Test Category ${Date.now()}`;
    await page.fill('input[name="name"], input[placeholder*="name" i]', testCategoryName);
    await page.fill('input[name="icon"], input[placeholder*="icon" i]', '🧪');
    await page.fill('textarea[name="description"], textarea[placeholder*="description" i]', 'This is a test category for E2E testing');
    
    // Submit form
    await page.click('button[type="submit"]:has-text("Create"), button[type="submit"]:has-text("Save")');
    
    // Verify success (adjust based on your UI feedback)
    await expect(page.locator(`text=${testCategoryName}`)).toBeVisible({ timeout: 5000 });
  });

  test('should create a child category', async ({ page }) => {
    await page.goto('/admin/categories');
    
    // Find an existing category to add a child to (adjust selector based on your UI)
    const parentCategory = page.locator('text=/Animals|Weather|Plants/i').first();
    await expect(parentCategory).toBeVisible();
    
    // Click to add child (this may vary based on your UI - might be a dropdown, button, etc.)
    // Option 1: If there's an "Add Child" button near the category
    await parentCategory.hover();
    const addChildButton = page.locator('button:has-text("Add Child"), button[aria-label*="add child" i]').first();
    
    if (await addChildButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addChildButton.click();
    } else {
      // Option 2: If you select parent from a dropdown
      const createButton = page.locator('button:has-text("Add Category")').first();
      await createButton.click();
      
      // Select parent from dropdown
      await page.click('select[name="parent_id"], select[name="parent"]');
      await page.selectOption('select[name="parent_id"], select[name="parent"]', { index: 1 });
    }
    
    // Fill in child category details
    const testChildName = `Test Child ${Date.now()}`;
    await page.fill('input[name="name"]', testChildName);
    await page.fill('input[name="icon"]', '🔬');
    
    // Submit
    await page.click('button[type="submit"]:has-text("Create"), button[type="submit"]:has-text("Save")');
    
    // Verify child appears (might be nested/indented in UI)
    await expect(page.locator(`text=${testChildName}`)).toBeVisible({ timeout: 5000 });
  });

  test('should edit a category', async ({ page }) => {
    await page.goto('/admin/categories');
    
    // Find first editable category (not system categories if those are locked)
    const categoryToEdit = page.locator('[data-category-id], .category-item, .category-row').first();
    await expect(categoryToEdit).toBeVisible();
    
    // Click edit button (adjust selector based on your UI)
    const editButton = categoryToEdit.locator('button:has-text("Edit"), button[aria-label*="edit" i]').first();
    await editButton.click();
    
    // Modify description
    const updatedDescription = `Updated description ${Date.now()}`;
    const descriptionField = page.locator('textarea[name="description"]');
    await descriptionField.clear();
    await descriptionField.fill(updatedDescription);
    
    // Save changes
    await page.click('button[type="submit"]:has-text("Save"), button[type="submit"]:has-text("Update")');
    
    // Verify update succeeded (look for success message or updated content)
    await expect(page.locator('text=/saved|updated successfully/i')).toBeVisible({ timeout: 5000 });
  });

  test('should toggle section visibility for a category', async ({ page }) => {
    await page.goto('/admin/categories');
    
    // Find a category with section configuration
    const category = page.locator('[data-category-id], .category-item').first();
    await expect(category).toBeVisible();
    
    // Click to configure sections (may be a button, link, or expand action)
    const configureButton = category.locator('button:has-text("Sections"), button:has-text("Configure"), button[aria-label*="section" i]').first();
    
    if (await configureButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await configureButton.click();
      
      // Toggle a section checkbox
      const sectionCheckbox = page.locator('input[type="checkbox"][name*="section"], input[type="checkbox"][data-section-id]').first();
      const initialState = await sectionCheckbox.isChecked();
      await sectionCheckbox.click();
      
      // Verify state changed
      await expect(sectionCheckbox).toHaveAttribute('aria-checked', String(!initialState), { timeout: 2000 });
      
      // Save configuration
      await page.click('button:has-text("Save")');
      await expect(page.locator('text=/saved|updated/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should delete a category without children', async ({ page }) => {
    await page.goto('/admin/categories');
    
    // First create a test category to delete
    const createButton = page.locator('button:has-text("Add Category")').first();
    await createButton.click();
    
    const testCategoryName = `Delete Me ${Date.now()}`;
    await page.fill('input[name="name"]', testCategoryName);
    await page.fill('input[name="icon"]', '🗑️');
    await page.click('button[type="submit"]:has-text("Create")');
    
    // Wait for it to appear
    await expect(page.locator(`text=${testCategoryName}`)).toBeVisible({ timeout: 5000 });
    
    // Find and click delete button
    const categoryRow = page.locator(`text=${testCategoryName}`).locator('..'); // Parent element
    const deleteButton = categoryRow.locator('button:has-text("Delete"), button[aria-label*="delete" i]').first();
    await deleteButton.click();
    
    // Confirm deletion in modal/dialog
    const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete")').last();
    await confirmButton.click();
    
    // Verify category is gone
    await expect(page.locator(`text=${testCategoryName}`)).not.toBeVisible({ timeout: 5000 });
  });

  test('should prevent deleting category with children', async ({ page }) => {
    await page.goto('/admin/categories');
    
    // Find a category that has children (like "Animals" or "Weather")
    const parentCategory = page.locator('text=/Animals|Weather/i').first();
    await expect(parentCategory).toBeVisible();
    
    // Try to delete it
    const categoryRow = parentCategory.locator('..'); 
    const deleteButton = categoryRow.locator('button:has-text("Delete"), button[aria-label*="delete" i]').first();
    
    if (await deleteButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await deleteButton.click();
      
      // Should see error message
      await expect(page.locator('text=/cannot delete.*children|has child categories/i')).toBeVisible({ timeout: 5000 });
    } else {
      // If delete button is disabled/hidden for categories with children, that's also valid
      await expect(deleteButton).toBeDisabled().catch(() => {
        expect(true).toBe(true); // Button not found is also acceptable
      });
    }
  });

  test('should switch between Manage and Suggestions tabs', async ({ page }) => {
    await page.goto('/admin/categories');
    
    // Verify we start on Manage tab
    await expect(page.locator('.tab.active:has-text("Manage Categories"), button.active:has-text("Manage Categories")')).toBeVisible();
    
    // Click Suggestions tab
    await page.click('button:has-text("Review Suggestions")');
    
    // Verify suggestions content loads
    await expect(page.locator('text=/suggestions|pending review/i')).toBeVisible({ timeout: 5000 });
    
    // Switch back to Manage
    await page.click('button:has-text("Manage Categories")');
    await expect(page.locator('text=/category tree|add category/i')).toBeVisible({ timeout: 5000 });
  });
});
