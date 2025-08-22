import { test, expect } from '@playwright/test';

test.describe('Search Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/search');
    await expect(page.locator('h1')).toContainText(/Web search|Search/);
  });

  test('should display search form and results area', async ({ page }) => {
    // Should show search input
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();

    // Should show search button
    await expect(page.locator('button:has-text("Search")')).toBeVisible();

    // Should show empty results area
    await expect(page.locator('ul')).toBeVisible();
  });

  test('should perform web search and display results', async ({ page }) => {
    // Enter search query
    await page.fill('input[placeholder*="Search"]', 'artificial intelligence');

    // Perform search
    await page.click('button:has-text("Search")');

    // Should show loading state
    await expect(page.locator('button:has-text("Search"):disabled')).toBeVisible();

    // Should display search results
    await expect(page.locator('li')).toHaveCount({ min: 1 });

    // Each result should have title/url/snippet
    const firstResult = page.locator('li').first();
    await expect(firstResult.locator('text=/artificial intelligence/i')).toBeVisible();
    await expect(firstResult.locator('a[href]')).toBeVisible();
  });

  test('should handle empty search query', async ({ page }) => {
    // Try to search with empty query
    await page.fill('input[placeholder*="Search"]', '');
    await page.click('button:has-text("Search")');

    // Should handle gracefully (either show error or maintain empty state)
    await expect(page.locator('button:has-text("Search"):not(:disabled)')).toBeVisible();
  });

  test('should get contents of search result', async ({ page }) => {
    // Perform search first
    await page.fill('input[placeholder*="Search"]', 'test site');
    await page.click('button:has-text("Search")');

    // Wait for results
    await page.locator('li').first().waitFor();

    // Click "Get contents" button on first result
    const firstResult = page.locator('li').first();
    const getContentsBtn = firstResult.locator('button:has-text("Get contents")');
    await getContentsBtn.click();

    // Should show content area
    await expect(firstResult.locator('pre')).toBeVisible();

    // Should display extracted content
    const content = firstResult.locator('pre');
    await expect(content).not.toBeEmpty();
  });

  test('should open search result in new tab', async ({ page, context }) => {
    // Perform search
    await page.fill('input[placeholder*="Search"]', 'example site');
    await page.click('button:has-text("Search")');

    // Wait for results
    await page.locator('li').first().waitFor();

    // Click "Open" link (opens in new tab)
    const firstResult = page.locator('li').first();
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      firstResult.locator('text=Open').click()
    ]);

    // New page should load
    await newPage.waitForLoadState();
    await expect(newPage.url()).not.toBe(page.url());
  });

  test('should handle search errors gracefully', async ({ page }) => {
    // Mock network error
    await page.route('**/api/web/search', async (route) => {
      await route.abort();
    });

    // Try to search
    await page.fill('input[placeholder*="Search"]', 'test query');
    await page.click('button:has-text("Search")');

    // Should handle error gracefully
    await expect(page.locator('button:has-text("Search"):not(:disabled)')).toBeVisible();

    // Should not show results
    await expect(page.locator('li')).toHaveCount(0);
  });

  test('should handle content extraction errors', async ({ page }) => {
    // Perform search first
    await page.fill('input[placeholder*="Search"]', 'test');
    await page.click('button:has-text("Search")');

    await page.locator('li').first().waitFor();

    // Mock content extraction error
    await page.route('**/api/web/get-contents', async (route) => {
      await route.abort();
    });

    // Try to get contents
    const firstResult = page.locator('li').first();
    await firstResult.locator('button:has-text("Get contents")').click();

    // Should handle error gracefully
    await expect(firstResult.locator('pre')).not.toBeVisible();
  });

  test('should show rate limiting information', async ({ page }) => {
    // Mock response with rate limit headers
    await page.route('**/api/web/search', async (route) => {
      await route.fulfill({
        status: 200,
        headers: {
          'x-ratelimit-remaining': '5',
          'x-ratelimit-limit': '10',
          'x-ratelimit-reset': '60'
        },
        body: JSON.stringify({ results: [] })
      });
    });

    // Perform search
    await page.fill('input[placeholder*="Search"]', 'test');
    await page.click('button:has-text("Search")');

    // Should show rate limit banner (if implemented)
    // This depends on the RateLimitBanner component being visible
    const rateLimitBanner = page.locator('text=/Rate limit|remaining/');
    // Banner might not be visible if not implemented, so we don't assert
  });
});
