# Fixtures Reference

Fixtures are Playwright's dependency injection system. Tests declare what they
need; Playwright builds it, hands it over, and tears it down.

Runnable cookbook in this repo: `tests/saucedemo/fixtures.cookbook.ts`.

## Contents

1. [Mental model](#mental-model)
2. [Defining a fixture](#defining-a-fixture)
3. [Scopes — test vs worker](#scopes--test-vs-worker)
4. [Auto-use fixtures](#auto-use-fixtures)
5. [Overriding built-in fixtures](#overriding-built-in-fixtures)
6. [Composing fixtures](#composing-fixtures)
7. [Options (configurable fixtures)](#options-configurable-fixtures)
8. [Built-in fixtures cheat sheet](#built-in-fixtures-cheat-sheet)
9. [Common patterns](#common-patterns)

---

## Mental model

A fixture is a function with three phases:

```typescript
async ({ dependencies }, use) => {
  // SETUP — runs before the test
  const resource = await createSomething();

  await use(resource);   // hand off to test, wait for completion

  // TEARDOWN — runs after the test
  await resource.dispose();
}
```

Tests opt in by listing fixtures in their destructured params:

```typescript
test('uses the fixture', async ({ resource }) => {
  // resource was created by the setup phase
});
// teardown runs automatically after this test
```

## Defining a fixture

Use `test.extend<TestFixtures, WorkerFixtures>({})`:

```typescript
import { test as base, expect } from '@playwright/test';

type Fixtures = {
  apiClient: ApiClient;
};

export const test = base.extend<Fixtures>({
  apiClient: async ({}, use) => {
    const client = new ApiClient({ baseURL: 'https://api.example.com' });
    await client.connect();
    await use(client);
    await client.disconnect();
  },
});

export { expect };
```

Then in spec files:

```typescript
import { test, expect } from './fixtures';   // your extended test

test('calls the API', async ({ apiClient }) => {
  const result = await apiClient.get('/users');
  expect(result.status).toBe(200);
});
```

## Scopes — test vs worker

| Scope | Created | Useful for |
|---|---|---|
| `test` (default) | Once per test | Per-test state, browser contexts |
| `worker` | Once per Playwright worker process | Expensive setup safe to share (DB conn, compiled assets) |

```typescript
test.extend<{}, { dbConnection: Db }>({
  dbConnection: [async ({}, use) => {
    const db = await Db.connect();
    await use(db);
    await db.close();
  }, { scope: 'worker' }],
});
```

Trade-off: worker-scoped fixtures speed up runs but break isolation. If one
test mutates the resource, the next sees the mutation. Use only for truly
read-only or self-resetting resources.

## Auto-use fixtures

Run for every test in the file without being declared in the test signature:

```typescript
type AutoFixtures = { logger: void };

test.extend<AutoFixtures>({
  logger: [async ({}, use, testInfo) => {
    console.log(`[start] ${testInfo.title}`);
    await use();
    console.log(`[end]   ${testInfo.title} — ${testInfo.status}`);
  }, { auto: true }],
});
```

Use for: telemetry, console error capture, global cleanup. Don't use for state
that tests actually need — that hides dependencies.

## Overriding built-in fixtures

Playwright ships with `browser`, `context`, `page`, `request`, `browserName`,
`viewport`, etc. You can override any of them:

```typescript
test.extend<{ page: Page }>({
  page: async ({ page }, use) => {
    await page.goto('/');
    await page.context().addCookies([{ name: 'consent', value: 'accepted' }]);
    await use(page);
  },
});
```

Now every test that destructures `{ page }` gets the modified page.

## Composing fixtures

Fixtures can depend on other fixtures — Playwright resolves the graph:

```typescript
type Fixtures = {
  loginPage: LoginPage;
  authedPage: Page;
};

test.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  authedPage: async ({ page, loginPage }, use) => {
    await loginPage.loginAs('standard_user');
    await use(page);
  },
});

test('starts logged in', async ({ authedPage }) => {
  await expect(authedPage).toHaveURL('/inventory.html');
});
```

## Options (configurable fixtures)

For fixtures that take config from `playwright.config.ts`:

```typescript
type Options = {
  defaultUser: string;
};

export const test = base.extend<Options>({
  defaultUser: ['standard_user', { option: true }],
});

// playwright.config.ts
projects: [
  { name: 'std',     use: { defaultUser: 'standard_user' } },
  { name: 'problem', use: { defaultUser: 'problem_user'  } },
],
```

## Built-in fixtures cheat sheet

### Test-scoped

| Fixture | Type | Use |
|---|---|---|
| `page` | `Page` | The main page object |
| `context` | `BrowserContext` | Cookies, permissions, storageState |
| `request` | `APIRequestContext` | Make HTTP calls (no browser) |
| `browserName` | `'chromium' / 'firefox' / 'webkit'` | Conditional logic per browser |

### Worker-scoped

| Fixture | Type | Use |
|---|---|---|
| `browser` | `Browser` | Create new contexts |
| `playwright` | `Playwright` | Access launchers |

### Options (via `test.use({...})` or project config)

| Option | Description |
|---|---|
| `baseURL` | Prefix for relative goto |
| `viewport` | Browser viewport |
| `userAgent` | UA override |
| `locale` / `timezoneId` | I18n |
| `geolocation` | GPS spoof |
| `permissions` | Granted browser permissions |
| `storageState` | Pre-authenticated state |
| `httpCredentials` | Basic auth |
| `extraHTTPHeaders` | Headers on every request |
| `proxy` | Proxy config |
| `offline` | Simulate offline |
| `colorScheme` | `light` / `dark` |
| `testIdAttribute` | Default `data-testid`; this project uses `data-test` |
| `actionTimeout` | ms — overrides global default |
| `navigationTimeout` | ms — for goto/waitForURL |

## Common patterns

### Per-test mocked API

```typescript
test.extend<{ mockApi: void }>({
  mockApi: [async ({ page }, use) => {
    await page.route('**/api/**', route => route.fulfill({
      status: 200,
      body: JSON.stringify({ mocked: true }),
    }));
    await use();
  }, { auto: true }],
});
```

### Page object factory

```typescript
type Pages = {
  loginPage:     LoginPage;
  inventoryPage: InventoryPage;
  cartPage:      CartPage;
};

test.extend<Pages>({
  loginPage:     async ({ page }, use) => use(new LoginPage(page)),
  inventoryPage: async ({ page }, use) => use(new InventoryPage(page)),
  cartPage:      async ({ page }, use) => use(new CartPage(page)),
});
```

### Per-test artifacts

```typescript
test.extend<{}>({
  page: async ({ page }, use, testInfo) => {
    await use(page);

    if (testInfo.status !== testInfo.expectedStatus) {
      const screenshot = await page.screenshot();
      await testInfo.attach('failure-screenshot', {
        body: screenshot,
        contentType: 'image/png',
      });
    }
  },
});
```

## Common mistakes

| Mistake | Fix |
|---|---|
| Defining `Fixtures` type but forgetting to destructure in test | Always list the fixture name in `async ({ fixtureName })` |
| Using `beforeEach` for object creation | Use a fixture |
| Worker-scoped fixture that mutates state | Make it test-scoped, or reset state in setup |
| Importing `test` from `@playwright/test` after extending | Re-export your extended `test` from a fixtures file |
| Fixture without `await use(...)` | The test will never run — `use` hands off control |
