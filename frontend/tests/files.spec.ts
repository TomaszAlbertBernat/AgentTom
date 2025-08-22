import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('File Upload Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/files');
    await expect(page.locator('h1')).toContainText('Files');
  });

  test('should display file upload form', async ({ page }) => {
    // Should show file input
    await expect(page.locator('input[type="file"]')).toBeVisible();

    // Should show upload options
    await expect(page.locator('text=Upload as base64')).toBeVisible();

    // Should show upload buttons
    await expect(page.locator('button:has-text("Upload")')).toBeVisible();
  });

  test('should upload file via FormData', async ({ page }) => {
    // Create a test file
    const testFilePath = path.join(process.cwd(), 'package.json');

    // Upload file
    await page.setInputFiles('input[type="file"]', testFilePath);

    // Ensure base64 checkbox is unchecked
    await page.uncheck('input[type="checkbox"]');

    // Click upload
    await page.click('button:has-text("Upload")');

    // Should show loading state
    await expect(page.locator('button:has-text("Upload"):disabled')).toBeVisible();

    // Should show upload result
    await expect(page.locator('pre')).toBeVisible();

    // Should show success message
    await expect(page.locator('text=/uploaded successfully/')).toBeVisible();

    // Should show file UUID and download links
    await expect(page.locator('text=/uuid/')).toBeVisible();
    await expect(page.locator('text=Download raw by uuid')).toBeVisible();
    await expect(page.locator('text=View file page')).toBeVisible();
  });

  test('should upload file as base64', async ({ page }) => {
    // Create a test file
    const testFilePath = path.join(process.cwd(), 'README.md');

    // Upload file as base64
    await page.setInputFiles('input[type="file"]', testFilePath);
    await page.check('input[type="checkbox"]'); // Enable base64 upload
    await page.click('button:has-text("Upload Base64")');

    // Should show loading state
    await expect(page.locator('button:has-text("Upload Base64"):disabled')).toBeVisible();

    // Should show upload result
    await expect(page.locator('pre')).toBeVisible();

    // Should show success message
    await expect(page.locator('text=/uploaded successfully.*base64/')).toBeVisible();
  });

  test('should handle file upload errors', async ({ page }) => {
    // Try to upload without selecting a file
    await page.click('button:has-text("Upload")');

    // Should show error (button should remain clickable since no file was selected)
    await expect(page.locator('button:has-text("Upload"):not(:disabled)')).toBeVisible();

    // Should not show result
    await expect(page.locator('pre')).not.toBeVisible();
  });

  test('should navigate to file viewer', async ({ page }) => {
    // First upload a file
    const testFilePath = path.join(process.cwd(), 'package.json');
    await page.setInputFiles('input[type="file"]', testFilePath);
    await page.click('button:has-text("Upload")');

    // Wait for upload to complete
    await expect(page.locator('text=Download raw by uuid')).toBeVisible();

    // Click on file viewer link
    await page.click('text=View file page');

    // Should navigate to file viewer
    await page.waitForURL(/\/files\//);

    // Should show file content
    await expect(page.locator('pre')).toBeVisible();
  });

  test('should handle large file uploads appropriately', async ({ page }) => {
    // Create a larger test file path (assuming we have one for testing)
    const largeFilePath = path.join(process.cwd(), 'frontend/package.json');

    // Upload larger file
    await page.setInputFiles('input[type="file"]', largeFilePath);
    await page.click('button:has-text("Upload")');

    // Should handle the upload (may take longer)
    await page.waitForTimeout(5000); // Wait up to 5 seconds for large file

    // Should still complete successfully
    await expect(page.locator('text=/uploaded successfully/')).toBeVisible();
  });
});
