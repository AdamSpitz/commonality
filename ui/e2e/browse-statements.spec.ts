import { test, expect } from '@playwright/test';

/**
 * E2E test for the Browse Statements page
 *
 * This is a "tracer bullet" test - a simple end-to-end test to validate
 * that the entire UI stack works together in a real browser environment.
 *
 * Note: These tests verify the UI renders correctly even when the backend
 * GraphQL server is not available. This allows us to test the frontend
 * independently.
 */

test.describe('Browse Statements Page', () => {
  test('should load the app and navigate to browse page', async ({ page }) => {
    // Start at home page
    await page.goto('/');

    // Verify the app loaded by checking for the app shell
    await expect(page.locator('body')).toBeVisible();

    // Navigate to browse statements
    await page.goto('/browse');

    // The page should load (even if it shows an error due to no backend)
    // We just want to verify the React app renders and routing works
    await page.waitForLoadState('networkidle');

    // Verify we're on the browse page by checking the URL
    expect(page.url()).toContain('/browse');
  });

  test('should render the React app without crashing', async ({ page }) => {
    await page.goto('/');

    // Check that the root element exists and React has rendered
    const root = page.locator('#root');
    await expect(root).toBeVisible();

    // Verify the app hasn't crashed by checking for error boundaries or blank page
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();
    expect(bodyText!.length).toBeGreaterThan(0);
  });
});
