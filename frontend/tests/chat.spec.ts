import { test, expect } from '@playwright/test';

test.describe('Chat Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to chat page (assumes user is already set up)
    await page.goto('/chat');
    await expect(page.locator('h1')).toContainText('Chat');
  });

  test('should display empty chat state initially', async ({ page }) => {
    // Should show empty state message
    await expect(page.locator('text=/Start a conversation/')).toBeVisible();
  });

  test('should create new conversation and send message', async ({ page }) => {
    // Type a message
    await page.fill('input[placeholder*="message"]', 'Hello, how are you?');

    // Send the message
    await page.click('button:has-text("Send")');

    // Should show user message
    await expect(page.locator('text=Hello, how are you?')).toBeVisible();
    await expect(page.locator('text=user')).toBeVisible();

    // Should receive assistant response (mocked)
    await expect(page.locator('text=assistant')).toBeVisible();
  });

  test('should load existing conversation from URL', async ({ page }) => {
    // First create a conversation
    await page.fill('input[placeholder*="message"]', 'Test message');
    await page.click('button:has-text("Send")');

    // Wait for URL to update with conversation ID
    await page.waitForURL(/conversation=.+/);

    // Get conversation ID from URL
    const url = page.url();
    const conversationId = new URLSearchParams(url.split('?')[1]).get('conversation');

    // Navigate away and back
    await page.goto('/conversations');
    await page.goto(`/chat?conversation=${conversationId}`);

    // Should load previous messages
    await expect(page.locator('text=Test message')).toBeVisible();
  });

  test('should handle message sending errors gracefully', async ({ page }) => {
    // Type a message
    await page.fill('input[placeholder*="message"]', 'This should fail');

    // Mock network error by blocking API calls
    await page.route('**/api/agi/messages', async (route) => {
      await route.abort();
    });

    // Try to send message
    await page.click('button:has-text("Send")');

    // Should show error toast
    await expect(page.locator('text=/Failed to send message/')).toBeVisible();

    // Message should be removed from UI
    await expect(page.locator('text=This should fail')).not.toBeVisible();
  });
});
