/**
 * COOKBOOK: Assertions — web-first, soft, polling, custom matchers
 *
 * Playwright's `expect()` is NOT the same as Jest's.
 * Web-first assertions automatically RETRY until the condition is true
 * (or the assertion timeout expires). Never add manual waits before them.
 *
 * ┌────────────────────────────────────────────────────────────────────┐
 * │  expect(locator).toBeVisible()  ← retries until visible or timeout │
 * │  expect(locator).toHaveText()   ← retries until text matches       │
 * │  expect(page).toHaveURL()       ← retries until URL matches        │
 * │                                                                     │
 * │  expect.soft(locator)           ← failure doesn't stop the test    │
 * │  expect.poll(() => fn)          ← retry any async expression        │
 * │  expect.extend({ ... })         ← add your own matchers             │
 * └────────────────────────────────────────────────────────────────────┘
 *
 * Run:  npx playwright test assertions.cookbook.ts --project=chromium
 */

import { test, expect } from '@playwright/test';

const PASSWORD = 'secret_sauce';

async function login(page: any, username = 'standard_user') {
  await page.goto('/');
  await page.getByTestId('username').fill(username);
  await page.getByTestId('password').fill(PASSWORD);
  await page.getByTestId('login-button').click();
}


// ═══════════════════════════════════════════════════════════════════════════
// PART 1 — Web-first locator assertions (auto-retry built in)
// ═══════════════════════════════════════════════════════════════════════════

test('visibility and state assertions', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('login-button')).toBeVisible();
  await expect(page.getByTestId('login-button')).toBeEnabled();
  await expect(page.getByTestId('username')).toBeEditable();
  await expect(page.getByTestId('username')).toBeFocused();       // first field is auto-focused
  await expect(page.getByTestId('login-button')).not.toBeHidden();
  await expect(page.getByTestId('login-logo')).toBeInViewport();
});

test('text content assertions', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('login-button')).toHaveText('Login');
  await expect(page.getByTestId('login-button')).toContainText('Log');  // substring match
  await expect(page.locator('.login_logo')).toHaveText(/Swag Labs/);    // regex match
});

test('attribute and class assertions', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('username')).toHaveAttribute('type', 'text');
  await expect(page.getByTestId('password')).toHaveAttribute('type', 'password');
  await expect(page.getByTestId('username')).toHaveAttribute('placeholder', /username/i);
});

test('input value assertions', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('username').fill('standard_user');

  await expect(page.getByTestId('username')).toHaveValue('standard_user');
  await expect(page.getByTestId('password')).toHaveValue('');  // empty initially
});

test('URL and title assertions', async ({ page }) => {
  await login(page);

  await expect(page).toHaveURL('/inventory.html');
  await expect(page).toHaveURL(/inventory/);          // regex works too
  await expect(page).toHaveTitle('Swag Labs');
  await expect(page).toHaveTitle(/Swag/);
});

test('count assertions on multiple elements', async ({ page }) => {
  await login(page);

  const items = page.getByTestId('inventory-item');
  await expect(items).toHaveCount(6);           // exactly 6 items on inventory page
  await expect(items.first()).toBeVisible();
  await expect(items.last()).toBeVisible();
});


// ═══════════════════════════════════════════════════════════════════════════
// PART 2 — Soft assertions
//
// expect.soft() marks a failure but continues the test.
// All soft failures are reported together at the end.
// ═══════════════════════════════════════════════════════════════════════════

test('soft assertions — check multiple things without stopping early', async ({ page }) => {
  await page.goto('/');

  // All three are checked even if one fails.
  expect.soft(page.getByTestId('login-button'), 'button should exist').toBeTruthy();
  await expect.soft(page.getByTestId('login-button')).toBeVisible();
  await expect.soft(page.getByTestId('login-button')).toHaveText('Login');
  await expect.soft(page.getByTestId('username')).toBeVisible();
  await expect.soft(page.getByTestId('password')).toBeVisible();

  // Hard assertion at the end still gates the overall pass/fail.
  await expect(page.getByTestId('login-logo')).toBeVisible();
});


// ═══════════════════════════════════════════════════════════════════════════
// PART 3 — expect.poll()
//
// Retries ANY async expression — not just locator assertions.
// Useful for checking API responses, counters, or external state.
// ═══════════════════════════════════════════════════════════════════════════

test('poll a JS expression until it resolves', async ({ page }) => {
  await login(page);

  // Retry until the cart badge count is a specific value.
  await expect.poll(async () => {
    const badge = page.getByTestId('shopping-cart-badge');
    const count = await badge.count();
    return count;
  }, {
    message: 'cart badge should not be visible yet',
    timeout: 5_000,
    intervals: [500, 1000, 2000],  // custom retry intervals in ms
  }).toBe(0);
});

test('poll a page evaluate expression', async ({ page }) => {
  await login(page);

  await expect.poll(
    () => page.evaluate(() => document.readyState),
    { timeout: 5_000 }
  ).toBe('complete');
});


// ═══════════════════════════════════════════════════════════════════════════
// PART 4 — Assertion timeout override
//
// Default assertion timeout comes from config. Override per-assertion with
// { timeout: ms } as the last argument to expect().
// ═══════════════════════════════════════════════════════════════════════════

test('assertion with custom timeout', async ({ page }) => {
  await page.goto('/');

  // This particular assertion waits up to 10 s (instead of the global default).
  await expect(page.getByTestId('login-button')).toBeVisible({ timeout: 10_000 });

  // Negate with a short timeout — useful to assert something does NOT appear.
  await expect(page.getByTestId('error')).not.toBeVisible({ timeout: 1_000 });
});


// ═══════════════════════════════════════════════════════════════════════════
// PART 5 — Custom matchers with expect.extend()
//
// Add project-specific matchers so tests read like business language.
// ═══════════════════════════════════════════════════════════════════════════

expect.extend({
  async toShowLoginError(page: any, expectedMessage: string) {
    const error = page.getByTestId('error');
    const isVisible = await error.isVisible();

    if (!isVisible) {
      return {
        message: () => `Expected login error to be visible but it wasn't`,
        pass: false,
      };
    }

    const text = await error.textContent();
    const matches = text?.includes(expectedMessage) ?? false;

    return {
      message: () =>
        matches
          ? `Expected login error NOT to contain "${expectedMessage}"`
          : `Expected login error to contain "${expectedMessage}", got "${text}"`,
      pass: matches,
    };
  },
});

// Teach TypeScript about the custom matcher.
declare module '@playwright/test' {
  interface PageAssertions {
    toShowLoginError(message: string): Promise<void>;
  }
}

test('custom matcher — toShowLoginError', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('username').fill('locked_out_user');
  await page.getByTestId('password').fill(PASSWORD);
  await page.getByTestId('login-button').click();

  await (expect(page) as any).toShowLoginError('locked out');
});


// ═══════════════════════════════════════════════════════════════════════════
// PART 6 — Snapshot assertions (screenshot and aria)
// ═══════════════════════════════════════════════════════════════════════════

test('aria snapshot — assert accessibility tree structure', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('form')).toMatchAriaSnapshot(`
    - textbox "Username"
    - textbox "Password"
    - button "Login"
  `);
});

// Visual screenshot comparison — first run creates the baseline, subsequent runs diff it.
// Uncomment once you want to lock in a visual baseline:
//
// test('visual snapshot of login page', async ({ page }) => {
//   await page.goto('/');
//   await expect(page).toHaveScreenshot('login-page.png', { maxDiffPixelRatio: 0.01 });
// });
