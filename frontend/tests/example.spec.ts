import { test, expect } from '@playwright/test';

test.describe('Auth Flow', () => {
  test('should handle local-first authentication and redirect to setup', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');

    // In local mode, should redirect to setup if not configured
    await page.waitForURL('**/setup');

    // Should show setup form
    await expect(page.locator('h1')).toContainText(/setup|configure/i);
  });

  test('should complete local user setup and access protected pages', async ({ page }) => {
    // Navigate to setup page
    await page.goto('/setup');

    // Fill in API keys
    await page.fill('input[name="google_api_key"]', 'test-google-key');
    await page.fill('input[name="openai_api_key"]', 'test-openai-key');

    // Submit setup
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await page.waitForURL('**/');

    // Should be able to access protected pages
    await page.goto('/chat');
    await expect(page.locator('h1')).toContainText('Chat');

    await page.goto('/tools');
    await expect(page.locator('h1')).toContainText('Tools');
  });
});


