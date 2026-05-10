/**
 * COOKBOOK: Fixtures
 *
 * Fixtures are Playwright's dependency injection system. Instead of
 * beforeEach/afterEach hooks, you declare what a test needs and Playwright
 * provides it — then tears it down automatically.
 *
 * ┌──────────────────────────────────────────────────────────────┐
 * │  test.extend<T>({ fixtureName: [setup fn, { scope }] })      │
 * │                                                              │
 * │  scope: 'test'   → fresh instance per test  (default)        │
 * │  scope: 'worker' → shared across all tests in one worker     │
 * └──────────────────────────────────────────────────────────────┘
 *
 * Run:  npx playwright test fixtures.cookbook.ts --project=chromium
 */

import { test as base, expect, type Page } from '@playwright/test';

const PASSWORD = 'secret_sauce';

// ═══════════════════════════════════════════════════════════════════════════
// PART 1 — Defining fixtures with test.extend()
// ═══════════════════════════════════════════════════════════════════════════

// ─── Simple value fixture ─────────────────────────────────────────────────────
// A fixture that just provides a value — no teardown needed.

type ValueFixtures = {
  credentials: { username: string; password: string };
};

const testWithCredentials = base.extend<ValueFixtures>({
  credentials: async ({}, use) => {
    // Everything before `await use(...)` is setup.
    const creds = { username: 'standard_user', password: PASSWORD };
    await use(creds);
    // Everything after `await use(...)` is teardown (none needed here).
  },
});

testWithCredentials('fixture provides credentials', async ({ page, credentials }) => {
  await page.goto('/');
  await page.getByTestId('username').fill(credentials.username);
  await page.getByTestId('password').fill(credentials.password);
  await page.getByTestId('login-button').click();
  await expect(page).toHaveURL('/inventory.html');
});

// ─── Page Object fixture ──────────────────────────────────────────────────────
// Fixtures compose naturally — LoginPage receives `page` automatically.

class LoginPage {
  constructor(private page: Page) {}

  async goto()                        { await this.page.goto('/'); }
  async fillUsername(u: string)       { await this.page.getByTestId('username').fill(u); }
  async fillPassword(p: string)       { await this.page.getByTestId('password').fill(p); }
  async submit()                      { await this.page.getByTestId('login-button').click(); }

  async loginAs(username: string) {
    await this.goto();
    await this.fillUsername(username);
    await this.fillPassword(PASSWORD);
    await this.submit();
  }
}

type PageFixtures = {
  loginPage: LoginPage;
};

const testWithPages = base.extend<PageFixtures>({
  // `page` is a built-in fixture — Playwright injects it automatically.
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
});

testWithPages('page object fixture', async ({ page, loginPage }) => {
  await loginPage.loginAs('standard_user');
  await expect(page).toHaveURL('/inventory.html');
});

// ─── Logged-in fixture ────────────────────────────────────────────────────────
// Composes loginPage to provide a pre-authenticated page.

type AuthFixtures = PageFixtures & {
  loggedInPage: Page;
};

const testAuthenticated = testWithPages.extend<AuthFixtures>({
  // This fixture depends on `loginPage` — fixtures chain automatically.
  loggedInPage: async ({ page, loginPage }, use) => {
    await loginPage.loginAs('standard_user');
    await expect(page).toHaveURL('/inventory.html');
    await use(page); // hand the already-logged-in page to the test
  },
});

testAuthenticated('receives a pre-logged-in page', async ({ loggedInPage }) => {
  await expect(loggedInPage.getByTestId('inventory-container')).toBeVisible();
  await expect(loggedInPage.getByTestId('shopping-cart-link')).toBeVisible();
});


// ═══════════════════════════════════════════════════════════════════════════
// PART 2 — Worker-scoped fixtures
//
// A worker-scoped fixture is created once per Playwright worker process and
// shared by all tests running in that worker. Use for expensive setup that
// is safe to share (e.g. a DB connection, a compiled resource).
// ═══════════════════════════════════════════════════════════════════════════

type WorkerFixtures = {
  sharedConfig: { baseURL: string; appName: string };
};

const testWithWorkerFixture = base.extend<{}, WorkerFixtures>({
  // Note: worker fixtures go in the SECOND type param of extend<T, W>().
  sharedConfig: [async ({}, use) => {
    console.log('[worker] shared config created — runs once per worker');
    await use({ baseURL: 'https://www.saucedemo.com', appName: 'Swag Labs' });
    console.log('[worker] shared config torn down');
  }, { scope: 'worker' }],
});

testWithWorkerFixture('worker fixture — test A', async ({ sharedConfig }) => {
  expect(sharedConfig.appName).toBe('Swag Labs');
});

testWithWorkerFixture('worker fixture — test B (reuses same instance)', async ({ sharedConfig }) => {
  expect(sharedConfig.baseURL).toBe('https://www.saucedemo.com');
});


// ═══════════════════════════════════════════════════════════════════════════
// PART 3 — Auto-use fixtures
//
// Runs for every test in the suite automatically — no need to declare it
// in the test signature. Good for global setup like intercepting console errors.
// ═══════════════════════════════════════════════════════════════════════════

type AutoFixtures = {
  captureConsoleErrors: void;
};

const testWithAutoCapture = base.extend<AutoFixtures>({
  captureConsoleErrors: [async ({ page }, use) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await use(); // run the test

    if (errors.length > 0) {
      console.warn(`[auto-fixture] Console errors captured:\n${errors.join('\n')}`);
    }
  }, { auto: true }], // ← auto: true means it runs without being listed in test args
});

testWithAutoCapture('console errors are captured automatically', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('login-button')).toBeVisible();
  // No need to reference captureConsoleErrors — it runs automatically.
});


// ═══════════════════════════════════════════════════════════════════════════
// PART 4 — Overriding built-in fixtures
//
// You can override Playwright's own fixtures (page, context, browser) to
// add behavior globally — e.g. always navigate to baseURL before the test.
// ═══════════════════════════════════════════════════════════════════════════

const testPreNavigated = base.extend<{ page: Page }>({
  page: async ({ page }, use) => {
    await page.goto('/'); // every test using this fixture starts at the login page
    await use(page);
  },
});

testPreNavigated('page always starts at login', async ({ page }) => {
  await expect(page.getByTestId('login-button')).toBeVisible();
  // No need to call page.goto('/') in the test body.
});
