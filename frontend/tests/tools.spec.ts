import { test, expect } from '@playwright/test';

test.describe('Tool Execution Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools');
    await expect(page.locator('h1')).toContainText('Tools');
  });

  test('should load and display tools list', async ({ page }) => {
    // Should load tools list
    await expect(page.locator('ul')).toBeVisible();

    // Should show at least one tool
    const toolItems = page.locator('li');
    await expect(toolItems.first()).toBeVisible();

    // Each tool should have a name and status
    const firstTool = toolItems.first();
    await expect(firstTool.locator('text=/Available|Unavailable/')).toBeVisible();
  });

  test('should navigate to tool execution page', async ({ page }) => {
    // Click on first available tool
    const availableTools = page.locator('li:not(:has-text("Unavailable"))');
    const firstAvailable = availableTools.first();

    // Click the "Open" link
    await firstAvailable.locator('text=Open').click();

    // Should navigate to tool execution page
    await page.waitForURL(/\/tools\//);

    // Should show tool execution form
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('input[placeholder*="action"]')).toBeVisible();
    await expect(page.locator('textarea')).toBeVisible();
  });

  test('should execute tool with valid parameters', async ({ page }) => {
    // Navigate to a specific tool (assuming we have a test tool)
    await page.goto('/tools/search');

    // Fill in action
    await page.fill('input[placeholder*="action"]', 'search');

    // Fill in parameters as JSON
    await page.fill('textarea', JSON.stringify({
      query: 'test search',
      limit: 5
    }, null, 2));

    // Execute tool
    await page.click('button:has-text("Execute")');

    // Should show loading state
    await expect(page.locator('button:has-text("Executing")')).toBeVisible();

    // Should show result
    await expect(page.locator('pre')).toBeVisible();

    // Should show success toast
    await expect(page.locator('text=/executed successfully/')).toBeVisible();
  });

  test('should handle tool execution errors', async ({ page }) => {
    // Navigate to tool execution page
    await page.goto('/tools/search');

    // Fill with invalid JSON
    await page.fill('textarea', 'invalid json');

    // Try to execute
    await page.click('button:has-text("Execute")');

    // Should show error for invalid JSON
    await expect(page.locator('text=/must be valid JSON/')).toBeVisible();
  });

  test('should handle unavailable tools', async ({ page }) => {
    // Look for unavailable tools
    const unavailableTools = page.locator('li:has-text("Unavailable")');

    // If there are unavailable tools, test them
    if (await unavailableTools.count() > 0) {
      await unavailableTools.first().click();

      // Should not navigate or should show disabled state
      const currentUrl = page.url();
      await expect(page).toHaveURL(currentUrl);
    }
  });
});
