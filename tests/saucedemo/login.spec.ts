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

// Each test runs in its own worker — all 6 open in parallel (fullyParallel: true)
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
