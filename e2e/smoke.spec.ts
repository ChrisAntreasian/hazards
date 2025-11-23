import { test, expect } from '@playwright/test';

/**
 * Smoke Tests - Quick sanity checks
 * These tests run first to ensure basic app functionality
 */

test.describe('Smoke Tests', () => {
  
  test('should load home page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Hazards/i);
  });

  test('should load login page', async ({ page }) => {
    await page.goto('/auth/log-in');

    // Verify login form elements exist
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });  test('should load map page', async ({ page }) => {
    await page.goto('/map');
    
    // Wait for map to load
    await page.waitForSelector('.leaflet-container', { timeout: 10000 });
    
    // Verify map is visible
    await expect(page.locator('.leaflet-container')).toBeVisible();
  });

  test('should redirect to login when accessing protected routes', async ({ page }) => {
    // Try to access hazard creation page without authentication
    await page.goto('/hazards/create');
    
    // Should show authentication required message instead of redirecting
    await expect(page.locator('text=Authentication Required')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('a.btn.btn-primary:has-text("Log In")')).toBeVisible();
  });
});
