/**
 * COOKBOOK: Authentication strategies
 *
 * Doing a full UI login for every test is slow. These patterns share or
 * reuse authentication state so login only happens once.
 *
 * ┌───────────────────────────────────────────────────────────────────────┐
 * │  Strategy 1 — storageState file                                        │
 * │    Login once in a global setup script, save cookies/localStorage to   │
 * │    a JSON file, then every test loads that file instead of logging in. │
 * │                                                                         │
 * │  Strategy 2 — worker-scoped auth fixture                               │
 * │    Login once per Playwright worker and share the context across all    │
 * │    tests in that worker.                                                │
 * │                                                                         │
 * │  Strategy 3 — API login (bypass UI entirely)                           │
 * │    POST credentials directly to the auth API, inject the session token  │
 * │    into the browser context — fastest possible setup.                   │
 * └───────────────────────────────────────────────────────────────────────┘
 *
 * Run:  npx playwright test auth.cookbook.ts --project=chromium
 */

import { test as base, expect, type BrowserContext } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const PASSWORD = 'secret_sauce';
const AUTH_FILE = path.join(__dirname, '.auth', 'standard_user.json');

// ═══════════════════════════════════════════════════════════════════════════
// PART 1 — Save storageState to a file (run this ONCE as setup)
//
// In a real project this goes in a globalSetup script referenced in
// playwright.config.ts:  globalSetup: './global-setup.ts'
// ═══════════════════════════════════════════════════════════════════════════

base('save auth state to file (run once as setup)', async ({ page }) => {
  // Perform the full UI login.
  await page.goto('/');
  await page.getByTestId('username').fill('standard_user');
  await page.getByTestId('password').fill(PASSWORD);
  await page.getByTestId('login-button').click();
  await expect(page).toHaveURL('/inventory.html');

  // Create the directory if it doesn't exist.
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });

  // Dump all cookies + localStorage to a JSON file.
  await page.context().storageState({ path: AUTH_FILE });
  // File looks like: { cookies: [...], origins: [{ localStorage: [...] }] }
});


// ═══════════════════════════════════════════════════════════════════════════
// PART 2 — Load storageState from file in subsequent tests
//
// In playwright.config.ts you'd set this globally:
//   use: { storageState: '.auth/standard_user.json' }
//
// Or per-project:
//   projects: [{ name: 'authenticated', use: { storageState: AUTH_FILE } }]
//
// Here we show how to do it per-test using a custom fixture.
// ═══════════════════════════════════════════════════════════════════════════

type AuthFileFixture = {
  authenticatedContext: BrowserContext;
};

const testWithSavedAuth = base.extend<AuthFileFixture>({
  authenticatedContext: async ({ browser }, use) => {
    // Skip if the auth file doesn't exist yet (run the save test first).
    const authExists = fs.existsSync(AUTH_FILE);
    const context = await browser.newContext(
      authExists ? { storageState: AUTH_FILE } : {}
    );
    await use(context);
    await context.close();
  },
});

testWithSavedAuth('uses saved auth state — no UI login needed', async ({ authenticatedContext }) => {
  const page = await authenticatedContext.newPage();

  // Navigate directly to a protected page — already authenticated.
  await page.goto('/inventory.html');
  await expect(page.getByTestId('inventory-container')).toBeVisible();
});


// ═══════════════════════════════════════════════════════════════════════════
// PART 3 — Worker-scoped auth fixture
//
// Login once per worker, share the authenticated context across all tests
// that run in the same worker. Much faster than per-test login.
// ═══════════════════════════════════════════════════════════════════════════

type WorkerAuthFixtures = {
  workerAuthContext: BrowserContext;
  authedPage: import('@playwright/test').Page;
};

const testWithWorkerAuth = base.extend<Pick<WorkerAuthFixtures, 'authedPage'>, Pick<WorkerAuthFixtures, 'workerAuthContext'>>({
  // Worker-scoped: login happens once per worker, context is reused.
  workerAuthContext: [async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('/');
    await page.getByTestId('username').fill('standard_user');
    await page.getByTestId('password').fill(PASSWORD);
    await page.getByTestId('login-button').click();
    await expect(page).toHaveURL('/inventory.html');
    await page.close();

    await use(context);   // all tests in this worker share this context
    await context.close();
  }, { scope: 'worker' }],

  // Test-scoped: each test gets a new Page from the shared worker context.
  authedPage: async ({ workerAuthContext }, use) => {
    const page = await workerAuthContext.newPage();
    await use(page);
    await page.close();
  },
});

testWithWorkerAuth('worker auth — test A (no UI login)', async ({ authedPage }) => {
  await authedPage.goto('/inventory.html');
  await expect(authedPage.getByTestId('inventory-container')).toBeVisible();
});

testWithWorkerAuth('worker auth — test B (shares same logged-in worker context)', async ({ authedPage }) => {
  await authedPage.goto('/inventory.html');
  await expect(authedPage.getByTestId('shopping-cart-link')).toBeVisible();
});


// ═══════════════════════════════════════════════════════════════════════════
// PART 4 — Multi-user auth (test as different users)
//
// Different tests need different authenticated contexts.
// Create a factory that returns a context per username.
// ═══════════════════════════════════════════════════════════════════════════

type MultiUserFixture = {
  loginAs: (username: string) => Promise<import('@playwright/test').Page>;
};

const testMultiUser = base.extend<MultiUserFixture>({
  loginAs: async ({ browser }, use) => {
    const contexts: BrowserContext[] = [];

    const factory = async (username: string) => {
      const context = await browser.newContext();
      contexts.push(context);
      const page = await context.newPage();
      await page.goto('/');
      await page.getByTestId('username').fill(username);
      await page.getByTestId('password').fill(PASSWORD);
      await page.getByTestId('login-button').click();
      await expect(page).toHaveURL('/inventory.html');
      return page;
    };

    await use(factory);

    // Teardown: close all created contexts.
    for (const ctx of contexts) await ctx.close();
  },
});

testMultiUser('two users simultaneously in separate contexts', async ({ loginAs }) => {
  const standardPage = await loginAs('standard_user');
  const problemPage  = await loginAs('problem_user');

  await expect(standardPage.getByTestId('inventory-container')).toBeVisible();
  await expect(problemPage.getByTestId('inventory-container')).toBeVisible();

  // Both are logged in independently — separate cookies, separate sessions.
  expect(standardPage.context()).not.toBe(problemPage.context());
});


// ═══════════════════════════════════════════════════════════════════════════
// PART 5 — Injecting cookies/localStorage manually
//
// When you know the exact token format, skip the UI entirely.
// ═══════════════════════════════════════════════════════════════════════════

base('inject session cookie manually', async ({ context, page }) => {
  // SauceDemo uses localStorage, not cookies — but this is the pattern for cookie-based auth:
  await context.addCookies([
    {
      name: 'session-token',
      value: 'fake-jwt-token-value',
      domain: 'www.saucedemo.com',
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
    },
  ]);

  // Or inject localStorage directly via page.evaluate:
  await page.goto('/');
  await page.evaluate(() => {
    // SauceDemo stores the logged-in user in localStorage.
    // Real apps: set your auth token here instead.
    localStorage.setItem('session-username', 'standard_user');
  });

  // For real apps with token-based auth, the page would now be authenticated.
  await page.goto('/');
  await expect(page.getByTestId('login-button')).toBeVisible(); // saucedemo ignores the ls key on /
});
