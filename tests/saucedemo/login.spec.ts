import { test, expect } from '@playwright/test';
import { users, profileUsers } from './users';

const PASSWORD = 'secret_sauce';

// ─── Example 1: plain parametrised tests (no profiles) ───────────────────────
test.describe('Login', () => {
  for (const user of users) {
    test(`${user.username} — ${user.description}`, async ({ page }) => {
      await page.goto('/');

      await page.getByTestId('username').fill(user.username);
      await page.getByTestId('password').fill(PASSWORD);
      await page.getByTestId('login-button').click();

      if (user.expectSuccess) {
        await expect(page).toHaveURL('/inventory.html');
        await expect(page.getByTestId('inventory-container')).toBeVisible();
        await expect(page.getByTestId('shopping-cart-link')).toBeVisible();
      } else {
        await expect(page.getByTestId('error')).toBeVisible();
        await expect(page.getByTestId('error')).toContainText(user.errorMessage ?? '');
        await expect(page).toHaveURL('/');
      }
    });
  }
});

// ─── Example 2: same tests with named profiles via tags ───────────────────────
//
// Each user in profileUsers (tests/saucedemo/users.ts) carries a `tags` list
// that maps to a Playwright project in playwright.config.ts. Run a profile with:
//
//   npm run test:smoke   →  1 user  (standard_user — fast happy-path check)
//   npm run test:core    →  2 users (adds locked_out_user for the error path)
//   npm run test:full    →  all 6   (every built-in SauceDemo account)
//
//   make test-smoke / test-core / test-full
//
test.describe('Login — profiles (@smoke / @core / @full)', () => {
  for (const user of profileUsers) {
    test(`${user.username} — ${user.description}`, { tag: user.tags }, async ({ page }) => {
      await page.goto('/');

      await page.getByTestId('username').fill(user.username);
      await page.getByTestId('password').fill(PASSWORD);
      await page.getByTestId('login-button').click();

      if (user.expectSuccess) {
        await expect(page).toHaveURL('/inventory.html');
        await expect(page.getByTestId('inventory-container')).toBeVisible();
        await expect(page.getByTestId('shopping-cart-link')).toBeVisible();
      } else {
        await expect(page.getByTestId('error')).toBeVisible();
        await expect(page.getByTestId('error')).toContainText(user.errorMessage ?? '');
        await expect(page).toHaveURL('/');
      }
    });
  }
});
