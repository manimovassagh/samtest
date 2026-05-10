/**
 * COOKBOOK: Inline config options for test() and test.describe()
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  KEY DISTINCTION — two separate APIs, different keys:                   │
 * │                                                                         │
 * │  test('name', { ...TestDetails }, body)                                 │
 * │  test.describe('name', { ...TestDetails }, callback)                    │
 * │    → ONLY accepts:  tag, annotation                                     │
 * │                                                                         │
 * │  test.describe.configure({ ...options })   ← called BEFORE describe()  │
 * │    → accepts:  mode, retries, timeout                                   │
 * │                                                                         │
 * │  Inside a test body:                                                    │
 * │    test.setTimeout(ms)   test.slow()   test.skip()   test.fail()        │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Run:  npx playwright test inline-config.cookbook.ts --project=chromium
 */

import { test, expect } from '@playwright/test';

// ═══════════════════════════════════════════════════════════════════════════
// PART 1 — TestDetails object  (2nd arg to test() and test.describe())
//           Type: { tag?, annotation? }  — that's the entire type.
// ═══════════════════════════════════════════════════════════════════════════

// ─── tag ─────────────────────────────────────────────────────────────────────
// Used for filtering: --grep /@smoke/ or project grep: /@smoke/ in config

test('single tag', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/');
});

test('multiple tags', { tag: ['@smoke', '@login'] }, async ({ page }) => {
  await page.goto('/');
});

test.describe('Suite with tag — all tests inside inherit it', { tag: '@full' }, () => {
  test('inherits @full', async ({ page }) => { await page.goto('/'); });
  test('also inherits @full', async ({ page }) => { await page.goto('/'); });
});

// ─── annotation ──────────────────────────────────────────────────────────────
// Shows up in the HTML report as extra metadata rows under the test.
// type: any string — common conventions: 'issue', 'owner', 'jira', 'env'

test('annotated test', {
  annotation: [
    { type: 'issue',  description: 'https://github.com/org/repo/issues/42' },
    { type: 'owner',  description: 'auth-team' },
    { type: 'env',    description: 'staging' },
  ],
}, async ({ page }) => {
  await page.goto('/');
});

test.describe('Suite annotation — shown on every test in report', {
  annotation: [{ type: 'feature', description: 'login-flow' }],
}, () => {
  test('carries feature annotation', async ({ page }) => { await page.goto('/'); });
});

// ─── tag + annotation together ───────────────────────────────────────────────

test('tagged + annotated', {
  tag: ['@core'],
  annotation: [{ type: 'jira', description: 'AUTH-123' }],
}, async ({ page }) => {
  await page.goto('/');
});


// ═══════════════════════════════════════════════════════════════════════════
// PART 2 — test.describe.configure()
//           Must be called INSIDE a describe block, BEFORE the tests.
//           Accepts: { mode?, retries?, timeout? }
// ═══════════════════════════════════════════════════════════════════════════

// ─── mode ────────────────────────────────────────────────────────────────────

test.describe('Parallel suite', () => {
  test.describe.configure({ mode: 'parallel' });   // tests run concurrently
  test('runs at the same time A', async ({ page }) => { await page.goto('/'); });
  test('runs at the same time B', async ({ page }) => { await page.goto('/'); });
});

test.describe('Serial suite', () => {
  test.describe.configure({ mode: 'serial' });  // one at a time; skip rest on failure
  test('step 1', async ({ page }) => { await page.goto('/'); });
  test('step 2 — skipped if step 1 failed', async ({ page }) => { await page.goto('/'); });
});

// ─── retries ─────────────────────────────────────────────────────────────────
// Overrides playwright.config.ts retries just for this suite.

test.describe('Flaky suite — extra retries', () => {
  test.describe.configure({ retries: 5 });
  test('retried up to 5 times on failure', async ({ page }) => {
    await page.goto('/');
  });
});

// ─── timeout ─────────────────────────────────────────────────────────────────
// Overrides the global test timeout for every test in this suite.

test.describe('Slow suite — extended timeout', () => {
  test.describe.configure({ timeout: 90_000 }); // 90 s for every test here
  test('slow test A', async ({ page }) => { await page.goto('/'); });
  test('slow test B', async ({ page }) => { await page.goto('/'); });
});

// ─── all three together ──────────────────────────────────────────────────────

test.describe('Full configure example', () => {
  test.describe.configure({ mode: 'serial', retries: 2, timeout: 60_000 });
  test('step 1', async ({ page }) => { await page.goto('/'); });
  test('step 2', async ({ page }) => { await page.goto('/'); });
});


// ═══════════════════════════════════════════════════════════════════════════
// PART 3 — Inside the test body
//           For per-test timeout/skip/fail that depend on runtime conditions.
// ═══════════════════════════════════════════════════════════════════════════

test('per-test timeout override', async ({ page }) => {
  test.setTimeout(90_000);           // this test only — overrides suite/global
  await page.goto('/');
});

test('triple the timeout (slow())', async ({ page }) => {
  test.slow();                       // multiplies current timeout × 3
  await page.goto('/');
});

test('conditionally skip at runtime', async ({ page, browserName }) => {
  test.skip(browserName === 'firefox', 'Known issue on Firefox');
  await page.goto('/');
});

test('expected to fail (test.fail)', async ({ page }) => {
  test.fail();                       // passes if assertion fails; fails if it passes
  await page.goto('/');
  await expect(page).toHaveURL('/should-not-exist');
});

test('mark as broken (test.fixme)', async ({ page }) => {
  test.fixme();                      // skips and flags the test in the HTML report
  await page.goto('/');
});


// ═══════════════════════════════════════════════════════════════════════════
// PART 4 — test.use() inside describe
//           Changes browser/context options for every test in the suite.
//           NOT related to TestDetails — separate API.
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Mobile viewport', () => {
  test.use({ viewport: { width: 390, height: 844 } }); // iPhone 14
  test('login on mobile', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('login-button')).toBeVisible();
  });
});

test.describe('German locale', () => {
  test.use({ locale: 'de-DE', timezoneId: 'Europe/Berlin' });
  test('login with German locale', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('login-button')).toBeVisible();
  });
});
