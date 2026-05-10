import { test, expect } from '@playwright/test';

const PASSWORD = 'secret_sauce';

// All 6 built-in SauceDemo users with their expected login outcome
const users = [
  {
    username: 'standard_user',
    expectSuccess: true,
    description: 'logs in and reaches inventory',
  },
  {
    username: 'locked_out_user',
    expectSuccess: false,
    errorMessage: 'Sorry, this user has been locked out.',
    description: 'is blocked with a locked-out error',
  },
  {
    username: 'problem_user',
    expectSuccess: true,
    description: 'logs in (images broken but page loads)',
  },
  {
    username: 'performance_glitch_user',
    expectSuccess: true,
    description: 'logs in after an artificial delay',
  },
  {
    username: 'error_user',
    expectSuccess: true,
    description: 'logs in (errors appear on later interactions)',
  },
  {
    username: 'visual_user',
    expectSuccess: true,
    description: 'logs in (visual differences on inventory)',
  },
];

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
// Each user carries a `tags` list that maps to a Playwright project in
// playwright.config.ts. Run a specific profile with:
//
//   npm run test:smoke   →  1 user  (standard_user — fast happy-path check)
//   npm run test:core    →  2 users (adds locked_out_user for the error path)
//   npm run test:full    →  all 6   (every built-in SauceDemo account)
//
//   make test-smoke / test-core / test-full
//
test.describe('Login — profiles (@smoke / @core / @full)', () => {
  const profileUsers = [
    {
      username: 'standard_user',
      expectSuccess: true,
      description: 'logs in and reaches inventory',
      tags: ['@smoke', '@core', '@full'],
    },
    {
      username: 'locked_out_user',
      expectSuccess: false,
      errorMessage: 'Sorry, this user has been locked out.',
      description: 'is blocked with a locked-out error',
      tags: ['@core', '@full'],
    },
    {
      username: 'problem_user',
      expectSuccess: true,
      description: 'logs in (images broken but page loads)',
      tags: ['@full'],
    },
    {
      username: 'performance_glitch_user',
      expectSuccess: true,
      description: 'logs in after an artificial delay',
      tags: ['@full'],
    },
    {
      username: 'error_user',
      expectSuccess: true,
      description: 'logs in (errors appear on later interactions)',
      tags: ['@full'],
    },
    {
      username: 'visual_user',
      expectSuccess: true,
      description: 'logs in (visual differences on inventory)',
      tags: ['@full'],
    },
  ];

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
