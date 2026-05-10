# Writing Tests — Reference

Comprehensive patterns for authoring Playwright tests. Use the table of contents
to jump to what you need.

## Contents

1. [File layout](#file-layout)
2. [Locator strategies](#locator-strategies)
3. [Assertions](#assertions)
4. [Test hooks and lifecycle](#test-hooks-and-lifecycle)
5. [Parametrized tests](#parametrized-tests)
6. [Tags and filtering](#tags-and-filtering)
7. [Skips, conditionals, expected failures](#skips-conditionals-expected-failures)
8. [Timeouts](#timeouts)
9. [Multi-page and multi-context](#multi-page-and-multi-context)
10. [Anti-patterns to avoid](#anti-patterns-to-avoid)

---

## File layout

```
tests/
├── shared/                    # cross-feature helpers, types, users.ts
│   └── users.ts
├── auth/
│   ├── login.spec.ts
│   └── logout.spec.ts
├── checkout/
│   ├── cart.spec.ts
│   └── payment.spec.ts
└── inventory/
    └── filtering.spec.ts
```

Rules:
- One `*.spec.ts` file per user-facing feature, not per page object
- Shared helpers (page objects, fixtures, data) live in `shared/` or alongside
  the spec — never reach into another spec file
- Cookbook/example files use `.cookbook.ts` suffix so they can be excluded from
  CI via `testIgnore: '**/*.cookbook.ts'`

## Locator strategies

**Priority order — pick the highest one that works:**

```typescript
// 1. By role — accessible, resilient, recommended
await page.getByRole('button', { name: 'Login' }).click();
await page.getByRole('textbox', { name: 'Username' }).fill('user');

// 2. By label (form fields)
await page.getByLabel('Email address').fill('a@b.com');

// 3. By placeholder
await page.getByPlaceholder('Username').fill('user');

// 4. By test ID — uses `testIdAttribute` from config
// This project: data-test → page.getByTestId('username')
await page.getByTestId('login-button').click();

// 5. By text (read-only content)
await page.getByText('Welcome back').isVisible();

// 6. By alt text (images)
await page.getByAltText('Company logo');

// 7. By title attribute
await page.getByTitle('Tooltip text');

// LAST RESORT — CSS / XPath
await page.locator('.login_logo').click();
await page.locator('//button[@type="submit"]').click();
```

### Chaining locators

```typescript
// Filter to narrow down
const item = page
  .getByTestId('inventory-item')
  .filter({ hasText: 'Sauce Labs Backpack' });

await item.getByRole('button', { name: /add to cart/i }).click();

// Find by index
await page.getByTestId('inventory-item').first().click();
await page.getByTestId('inventory-item').nth(2).click();
await page.getByTestId('inventory-item').last().click();

// `has` and `hasNot` — filter by descendant
page.locator('article').filter({ has: page.getByText('Featured') });
page.locator('article').filter({ hasNot: page.getByText('Sold out') });
```

### Scoping a locator

```typescript
// Confine searches to a region
const cart = page.getByTestId('cart-contents');
await cart.getByRole('button', { name: 'Remove' }).click();
```

## Assertions

**Always `await` web-first assertions** — they auto-retry until the assertion
timeout. Without `await` they return a Promise that may resolve too early.

```typescript
// Visibility
await expect(locator).toBeVisible();
await expect(locator).toBeHidden();
await expect(locator).toBeInViewport();

// State
await expect(locator).toBeEnabled();
await expect(locator).toBeDisabled();
await expect(locator).toBeEditable();
await expect(locator).toBeFocused();
await expect(locator).toBeChecked();

// Content
await expect(locator).toHaveText('exact');
await expect(locator).toHaveText(/regex/);
await expect(locator).toContainText('substring');
await expect(locator).toHaveValue('input value');
await expect(locator).toHaveAttribute('href', '/path');
await expect(locator).toHaveClass(/active/);
await expect(locator).toHaveCount(3);

// Page
await expect(page).toHaveURL(/dashboard/);
await expect(page).toHaveTitle('Page Title');

// Soft — collect all failures, don't bail on first
await expect.soft(loc1).toBeVisible();
await expect.soft(loc2).toHaveText('x');

// Poll arbitrary expressions
await expect.poll(async () => fetchSomething()).toBe('expected');
await expect.poll(() => page.evaluate(() => location.pathname)).toBe('/x');

// Negation
await expect(locator).not.toBeVisible();
```

### Custom timeout on a single assertion

```typescript
await expect(locator).toBeVisible({ timeout: 10_000 });
```

## Test hooks and lifecycle

```typescript
test.beforeAll(async () => { /* once per worker, before any test in file */ });
test.afterAll(async  () => { /* once per worker, after all tests in file */ });
test.beforeEach(async ({ page }) => { /* every test */ });
test.afterEach(async  ({ page }) => { /* every test */ });

// Inside a describe — scoped to that suite
test.describe('Feature', () => {
  test.beforeEach(async ({ page }) => { /* only for this describe */ });
  test('does the thing', async ({ page }) => { /* ... */ });
});
```

**Prefer fixtures over `beforeEach`** when the setup produces something the
test uses. `beforeEach` is fine for side-effects (clear state, log to console).

## Parametrized tests

Generate one test per data row at module load time:

```typescript
import { test, expect } from '@playwright/test';

const cases = [
  { username: 'standard_user',  shouldSucceed: true  },
  { username: 'locked_out_user', shouldSucceed: false },
];

for (const c of cases) {
  test(`login — ${c.username}`, async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('username').fill(c.username);
    await page.getByTestId('password').fill('secret_sauce');
    await page.getByTestId('login-button').click();

    if (c.shouldSucceed) {
      await expect(page).toHaveURL('/inventory.html');
    } else {
      await expect(page.getByTestId('error')).toBeVisible();
    }
  });
}
```

**Key insight**: the `for` loop runs at *collection time*, not runtime — each
iteration registers a separate `test()`, so each gets its own browser context.

## Tags and filtering

```typescript
// Tag on a single test
test('flow A', { tag: '@smoke' }, async () => { /* ... */ });

// Multiple tags
test('flow B', { tag: ['@smoke', '@critical'] }, async () => { /* ... */ });

// Suite-level tag (all tests inherit)
test.describe('Checkout', { tag: '@checkout' }, () => { /* ... */ });
```

Run by tag via CLI:
```bash
npx playwright test --grep "@smoke"
npx playwright test --grep "@critical"
npx playwright test --grep-invert "@slow"
```

Or via project `grep` in config:
```typescript
projects: [
  { name: 'smoke', grep: /@smoke/ },
  { name: 'full',  grep: /@full/  },
]
```

Then: `npm run test:smoke` runs the smoke project.

## Skips, conditionals, expected failures

```typescript
test.skip('not implemented yet', async () => { /* never runs */ });

test('feature flag', async ({ page }) => {
  test.skip(process.env.FEATURE_X !== 'on', 'requires FEATURE_X');
  // ... actual test
});

test.fixme('broken — tracked in JIRA-123', async () => { /* skipped */ });

test('expected to fail until fixed', async () => {
  test.fail();  // PASSES if the body throws, FAILS if it doesn't
  expect(1).toBe(2);
});

test('slow test', async () => {
  test.slow();  // triples the timeout
  // ... long operation
});
```

## Timeouts

Three layers, from coarsest to most precise:

```typescript
// 1. Global default (playwright.config.ts)
timeout: 60_000,

// 2. Suite-level
test.describe('Slow suite', () => {
  test.describe.configure({ timeout: 120_000 });
  // ...
});

// 3. Per-test
test('one slow test', async () => {
  test.setTimeout(180_000);
  // ...
});

// 4. Per-assertion
await expect(loc).toBeVisible({ timeout: 30_000 });

// 5. Per-action (use sparingly — usually fix the test instead)
await page.click('button', { timeout: 5_000 });
```

## Multi-page and multi-context

```typescript
// Two pages in the SAME context (shared cookies, storage)
test('two tabs', async ({ context }) => {
  const page1 = await context.newPage();
  const page2 = await context.newPage();
  // ...
});

// Two ISOLATED contexts (different users, no shared state)
test('two users', async ({ browser }) => {
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();
  // ...
  await ctxA.close();
  await ctxB.close();
});

// Wait for a popup/new tab
const [popup] = await Promise.all([
  context.waitForEvent('page'),
  page.click('a[target=_blank]'),
]);
await popup.waitForLoadState();
```

## Anti-patterns to avoid

| Don't | Do |
|---|---|
| `await page.waitForTimeout(1000)` | `await expect(loc).toBeVisible()` |
| `page.locator('.btn-primary')` | `page.getByRole('button', { name: 'Save' })` |
| Sharing state via module-level variables | Use fixtures with proper scope |
| `if (await loc.isVisible()) ...` | `await expect(loc).toBeVisible()` |
| `expect(await loc.textContent()).toBe('x')` | `await expect(loc).toHaveText('x')` |
| `try/catch` to detect element absence | `await expect(loc).not.toBeVisible()` |
| `page.click('button')` then immediate assertion | The click already waits; trust web-first assertions |
| `beforeEach` for object construction | Fixture that returns the object |
| `import { Page } from 'playwright'` | `import { Page } from '@playwright/test'` |
| Hard-coding URLs | Use `baseURL` in config + relative paths |
