---
title: Fixtures
sidebar_position: 3
---

# Fixtures

Source: [`tests/saucedemo/fixtures.cookbook.ts`](https://github.com/manimovassagh/samtest/blob/main/tests/saucedemo/fixtures.cookbook.ts)

Fixtures are Playwright's dependency-injection system. Tests declare what
they need; Playwright builds it, hands it over, and tears it down.

## Mental model

```typescript
async ({ dependencies }, use) => {
  // SETUP
  const resource = await createSomething();

  await use(resource);        // hand off to test, wait for completion

  // TEARDOWN
  await resource.dispose();
}
```

## Defining a fixture

```typescript
import { test as base, expect } from '@playwright/test';

type Fixtures = {
  credentials: { username: string; password: string };
};

const test = base.extend<Fixtures>({
  credentials: async ({}, use) => {
    await use({ username: 'standard_user', password: 'secret_sauce' });
  },
});

test('uses fixture', async ({ page, credentials }) => {
  await page.goto('/');
  await page.getByTestId('username').fill(credentials.username);
});
```

## Page Object fixture

Fixtures compose — `LoginPage` receives `page` automatically:

```typescript
class LoginPage {
  constructor(private page: Page) {}
  async loginAs(username: string) { /* ... */ }
}

const test = base.extend<{ loginPage: LoginPage }>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
});
```

## Logged-in fixture (compose two)

```typescript
const test = base.extend<{ loginPage: LoginPage; loggedInPage: Page }>({
  loginPage: async ({ page }, use) => use(new LoginPage(page)),

  loggedInPage: async ({ page, loginPage }, use) => {
    await loginPage.loginAs('standard_user');
    await expect(page).toHaveURL('/inventory.html');
    await use(page);
  },
});

test('starts logged in', async ({ loggedInPage }) => {
  await expect(loggedInPage.getByTestId('inventory-container')).toBeVisible();
});
```

## Worker-scoped fixtures

Created once per Playwright worker, shared across all tests in that worker.

```typescript
const test = base.extend<{}, { sharedConfig: Config }>({
  sharedConfig: [async ({}, use) => {
    const cfg = await loadConfigOnce();        // expensive setup
    await use(cfg);
    await cfg.dispose();
  }, { scope: 'worker' }],                      // ← worker scope
});
```

**Trade-off**: faster but breaks per-test isolation. If a test mutates the
resource, the next test sees the mutation. Use only for read-only or
self-resetting resources.

## Auto-use fixtures

Run for every test without being declared in the signature:

```typescript
const test = base.extend<{ logger: void }>({
  logger: [async ({}, use, testInfo) => {
    console.log(`[start] ${testInfo.title}`);
    await use();
    console.log(`[end]   ${testInfo.title} — ${testInfo.status}`);
  }, { auto: true }],                            // ← auto
});

test('logged automatically', async ({ page }) => {
  // No need to reference `logger` — it runs anyway
});
```

Use for: telemetry, console-error capture, global cleanup. Don't use for
state tests actually need — that hides dependencies.

## Overriding built-in fixtures

```typescript
const test = base.extend<{ page: Page }>({
  page: async ({ page }, use) => {
    await page.goto('/');                       // every test starts here
    await use(page);
  },
});
```

Now every test that destructures `{ page }` gets the pre-navigated page.

## When to use which

| Pattern | Use when |
|---|---|
| Test-scoped fixture | Default — per-test state, browser contexts |
| Worker-scoped fixture | Expensive setup that's safe to share (DB connection, compiled resource) |
| Auto-use | Cross-cutting concerns — logging, error capture, global cleanup |
| Override built-in | Wrap `page` / `context` with project-wide behavior |
| `test.use({ ... })` | Per-suite browser options — viewport, locale, storageState |

## Deep dive

For all the details — scopes, options as fixtures, the full lifecycle —
see **[Fixtures Reference](../reference/fixtures)**.
