import { test, expect } from '@playwright/test';

test.describe('Playwright Docs', () => {
  test('homepage has correct title', async ({ page }) => {
    await page.goto('https://playwright.dev/');
    await expect(page).toHaveTitle(/Playwright/);
  });

  test('get started link navigates to installation page', async ({ page }) => {
    await page.goto('https://playwright.dev/');
    await page.getByRole('link', { name: 'Get started' }).click();
    await expect(page).toHaveURL(/intro/);
    await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
  });
});
