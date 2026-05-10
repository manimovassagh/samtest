# Authentication Strategies

Doing full UI login on every test is the #1 cause of slow Playwright suites.
This reference covers four strategies, from simplest to fastest.
Cookbook: `tests/saucedemo/auth.cookbook.ts`.

## Contents

1. [Decision tree — pick a strategy](#decision-tree)
2. [Strategy 1: storageState (recommended default)](#strategy-1-storagestate)
3. [Strategy 2: Project dependencies](#strategy-2-project-dependencies)
4. [Strategy 3: Worker-scoped auth fixture](#strategy-3-worker-scoped-fixture)
5. [Strategy 4: API login (bypass UI)](#strategy-4-api-login)
6. [Multi-role testing](#multi-role-testing)
7. [Logout and isolation](#logout-and-isolation)

---

## Decision tree

```
Are tests authenticated as the SAME user?
├─ YES → Do you have an API to authenticate without UI?
│        ├─ YES → Strategy 4 (API login)
│        └─ NO  → Strategy 2 (project dependencies + storageState)
│
└─ NO → Do you have a SMALL number of personas (2–5)?
         ├─ YES → Pre-generate storageState for each, switch via project
         └─ NO  → Strategy 3 (worker-scoped multi-user fixture)
```

For most apps: **Strategy 2** is the right default.

## Strategy 1: storageState

The bedrock concept. Run the login UI once, dump cookies + localStorage to
a JSON file, then every subsequent test loads that file.

### Save once

```typescript
// playwright/login-setup.spec.ts (runs once, manually)
import { test as setup } from '@playwright/test';

setup('authenticate as standard_user', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('username').fill('standard_user');
  await page.getByTestId('password').fill('secret_sauce');
  await page.getByTestId('login-button').click();
  await page.waitForURL('/inventory.html');

  await page.context().storageState({ path: 'playwright/.auth/user.json' });
});
```

### Load every test

```typescript
// playwright.config.ts
use: {
  storageState: 'playwright/.auth/user.json',
}
```

Every browser context starts with those cookies + localStorage — the user is
already logged in when the test begins. Speed gain: typically 3–5× faster
than UI login per test.

**Important**: add `playwright/.auth/` to `.gitignore` — auth files contain real session tokens.

## Strategy 2: Project dependencies

Best practice — combine setup project with storageState. Setup project runs
ONCE before the test project, generates the auth file, and the test project
loads it automatically.

```typescript
// playwright.config.ts
projects: [
  {
    name: 'setup',
    testMatch: /global\.setup\.ts/,
  },
  {
    name: 'chromium',
    dependencies: ['setup'],                        // ← waits for setup
    use: {
      ...devices['Desktop Chrome'],
      storageState: 'playwright/.auth/user.json',   // ← loads the artifact
    },
    testIgnore: /global\.setup\.ts/,
  },
],
```

```typescript
// tests/global.setup.ts
import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

setup('authenticate', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('username').fill('standard_user');
  await page.getByTestId('password').fill('secret_sauce');
  await page.getByTestId('login-button').click();
  await expect(page).toHaveURL('/inventory.html');

  await page.context().storageState({ path: authFile });
});
```

Now `npx playwright test` runs setup first, then all tests with logged-in
state. Setup is traced/screenshotted/videoed just like any test — you can
debug auth failures in the trace viewer.

## Strategy 3: Worker-scoped fixture

When you can't write storageState to disk (concurrent test runs, ephemeral
tokens) — log in once per Playwright worker process and share the context.

```typescript
// tests/fixtures/worker-auth.ts
import { test as base, BrowserContext } from '@playwright/test';

export const test = base.extend<{ authedPage: Page }, { authedContext: BrowserContext }>({
  authedContext: [async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('/');
    await page.getByTestId('username').fill('standard_user');
    await page.getByTestId('password').fill('secret_sauce');
    await page.getByTestId('login-button').click();
    await page.waitForURL('/inventory.html');
    await page.close();
    await use(context);
    await context.close();
  }, { scope: 'worker' }],

  authedPage: async ({ authedContext }, use) => {
    const page = await authedContext.newPage();
    await use(page);
    await page.close();
  },
});
```

```typescript
import { test, expect } from './fixtures/worker-auth';

test('runs logged in — no setup file needed', async ({ authedPage }) => {
  await authedPage.goto('/inventory.html');
  await expect(authedPage.getByTestId('inventory-container')).toBeVisible();
});
```

**Trade-off**: tests in the same worker share a context. If one test mutates
session state (e.g. logs out), the next test breaks. Use sparingly.

## Strategy 4: API login

If your app has a `/api/login` that returns a session cookie or JWT, skip
the browser UI entirely:

```typescript
import { test as base, request } from '@playwright/test';

export const test = base.extend({
  storageState: async ({}, use) => {
    const ctx = await request.newContext();
    const response = await ctx.post('https://api.example.com/auth/login', {
      data: { username: 'standard_user', password: 'secret_sauce' },
    });
    const { token } = await response.json();

    // Build storageState object directly — no browser involved
    const state = {
      cookies: [],
      origins: [{
        origin: 'https://www.example.com',
        localStorage: [{ name: 'auth-token', value: token }],
      }],
    };
    await use(state);
  },
});
```

**Fastest option** — milliseconds instead of seconds. Use when:
- API is stable and well-known
- You're not testing the login UI itself
- You need fresh tokens per test (no shared state)

## Multi-role testing

When different tests need different users:

### Pattern: storageState file per persona

```bash
playwright/.auth/
├── admin.json
├── standard_user.json
└── locked_out_user.json
```

```typescript
// playwright.config.ts
projects: [
  { name: 'setup', testMatch: /global\.setup\.ts/ },

  {
    name: 'as-admin',
    dependencies: ['setup'],
    use: { storageState: 'playwright/.auth/admin.json' },
  },
  {
    name: 'as-user',
    dependencies: ['setup'],
    use: { storageState: 'playwright/.auth/standard_user.json' },
  },
],
```

Generate all of them in setup:

```typescript
// tests/global.setup.ts
setup('auth as admin', async ({ page }) => {
  await loginAs(page, 'admin');
  await page.context().storageState({ path: 'playwright/.auth/admin.json' });
});

setup('auth as user', async ({ page }) => {
  await loginAs(page, 'standard_user');
  await page.context().storageState({ path: 'playwright/.auth/standard_user.json' });
});
```

Run: `npx playwright test --project=as-admin` or `--project=as-user`.

### Pattern: multi-user fixture (two users in ONE test)

```typescript
test('admin sees what user creates', async ({ browser }) => {
  const adminCtx = await browser.newContext({ storageState: 'playwright/.auth/admin.json' });
  const userCtx  = await browser.newContext({ storageState: 'playwright/.auth/user.json' });

  const adminPage = await adminCtx.newPage();
  const userPage  = await userCtx.newPage();

  await userPage.goto('/create-something');
  // ... user creates a thing

  await adminPage.goto('/admin/dashboard');
  // ... admin sees the thing

  await adminCtx.close();
  await userCtx.close();
});
```

## Logout and isolation

If a test logs the user out, subsequent tests sharing the same context will
fail. Two options:

```typescript
// Option 1: tag and isolate
test('logout flow', { tag: '@destructive' }, async ({ page }) => {
  await page.context().clearCookies();   // start clean
  await loginUI(page);
  await logoutUI(page);
});

// Option 2: use a fresh context
test('logout flow', async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await loginUI(page);
  await logoutUI(page);
  await ctx.close();
});
```

## When auth fails — debugging

1. **Run setup in isolation**: `npx playwright test global.setup.ts --project=setup`
2. **Check the trace** of the setup project run
3. **Inspect the saved file**: `cat playwright/.auth/user.json` — look for the
   expected cookie/localStorage key
4. **Check baseURL** — storageState origin must match. If you saved against
   `https://staging.example.com` but tests run against `https://prod.example.com`,
   the cookies are ignored

## Common mistakes

| Mistake | Fix |
|---|---|
| Committing `.auth/` files to git | Add to `.gitignore` |
| Using `globalSetup` for auth | Use a setup PROJECT instead — traceable, parallel-safe |
| Sharing storageState across origins | One file per origin, project filters by origin |
| storageState saved without `await page.waitForURL` | Login may not have completed — assert before saving |
| Worker-scoped context with mutating tests | Switch to per-test storageState |
