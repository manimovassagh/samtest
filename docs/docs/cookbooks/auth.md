---
title: Authentication
sidebar_position: 6
---

# Authentication

Source: [`tests/saucedemo/auth.cookbook.ts`](https://github.com/manimovassagh/samtest/blob/main/tests/saucedemo/auth.cookbook.ts)

UI login on every test is the #1 cause of slow Playwright suites. Three
strategies, from simplest to fastest.

## Decision tree

```
Same user across tests?
├─ Yes → API to login without UI?
│        ├─ Yes → API login (fastest)
│        └─ No  → Project dependencies + storageState (recommended)
│
└─ No → Small # of personas (2–5)?
         ├─ Yes → Pre-generate storageState per persona
         └─ No  → Worker-scoped multi-user fixture
```

## Strategy 1 — `storageState`

The bedrock. Login UI once, save cookies + localStorage to JSON, replay.

```typescript
// Save (run once)
test('save auth', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('username').fill('standard_user');
  await page.getByTestId('password').fill('secret_sauce');
  await page.getByTestId('login-button').click();
  await expect(page).toHaveURL('/inventory.html');

  await page.context().storageState({ path: 'playwright/.auth/user.json' });
});

// Load (every test)
// In playwright.config.ts:
use: { storageState: 'playwright/.auth/user.json' }
```

3-5× speed-up vs UI login per test.

## Strategy 2 — Project dependencies (recommended)

The setup project runs **once** before the test project. The test project
loads the artifact it produced.

```typescript
// playwright.config.ts
projects: [
  {
    name: 'setup',
    testMatch: /global\.setup\.ts/,
  },
  {
    name: 'chromium',
    dependencies: ['setup'],
    use: {
      ...devices['Desktop Chrome'],
      storageState: 'playwright/.auth/user.json',
    },
    testIgnore: /global\.setup\.ts/,
  },
],
```

```typescript
// tests/global.setup.ts
import { test as setup, expect } from '@playwright/test';

setup('authenticate', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('username').fill('standard_user');
  await page.getByTestId('password').fill('secret_sauce');
  await page.getByTestId('login-button').click();
  await expect(page).toHaveURL('/inventory.html');

  await page.context().storageState({ path: 'playwright/.auth/user.json' });
});
```

Setup is traced/screenshotted/videoed like any test — auth failures are
debuggable in the trace viewer.

## Strategy 3 — Worker-scoped auth fixture

Useful when you can't write storageState to disk (CI runners with
ephemeral tokens, parallel test files).

```typescript
const test = base.extend<{ authedPage: Page }, { authedContext: BrowserContext }>({
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

**Trade-off**: tests in the same worker share context. If one test
mutates session state, the next can break. Use carefully.

## Strategy 4 — API login (fastest)

```typescript
const test = base.extend({
  storageState: async ({}, use) => {
    const ctx = await request.newContext();
    const { token } = await (await ctx.post(
      'https://api.example.com/auth/login',
      { data: { username: 'standard_user', password: 'secret_sauce' } }
    )).json();

    await use({
      cookies: [],
      origins: [{
        origin: 'https://www.example.com',
        localStorage: [{ name: 'auth-token', value: token }],
      }],
    });
  },
});
```

Milliseconds instead of seconds. Use when the API is stable and you
aren't testing the login UI.

## Multi-user — same test, two contexts

```typescript
test('admin sees what user creates', async ({ browser }) => {
  const adminCtx = await browser.newContext({ storageState: 'playwright/.auth/admin.json' });
  const userCtx  = await browser.newContext({ storageState: 'playwright/.auth/user.json'  });

  const adminPage = await adminCtx.newPage();
  const userPage  = await userCtx.newPage();

  await userPage.goto('/create');
  // ...

  await adminPage.goto('/admin/dashboard');
  // ...

  await adminCtx.close();
  await userCtx.close();
});
```

## Security note

```bash
# .gitignore
playwright/.auth/
```

Auth files contain real session tokens. Never commit them.

## Debugging failed auth

1. Run setup in isolation: `npx playwright test global.setup.ts --project=setup`
2. Open the trace — check the URL after login completes
3. Inspect the file: `cat playwright/.auth/user.json` — look for the expected cookie/localStorage key
4. Check that the storageState **origin matches your baseURL** — cookies for `staging.example.com` are ignored on `prod.example.com`
