---
title: Inline config
sidebar_position: 2
---

# Inline config — `test()` and `test.describe()` options

Source: [`tests/saucedemo/inline-config.cookbook.ts`](https://github.com/manimovassagh/samtest/blob/main/tests/saucedemo/inline-config.cookbook.ts)

## What you can pass inline

Two distinct APIs that are often confused:

| Call | Accepts | For |
|---|---|---|
| `test('name', { ... }, body)` | `tag`, `annotation` | Metadata: filtering and reporting |
| `test.describe('name', { ... }, callback)` | `tag`, `annotation` | Same — applied to all tests in the suite |
| `test.describe.configure({ ... })` | `mode`, `retries`, `timeout` | Runtime behavior for the *next* describe block |

`timeout` and `retries` are **NOT** in `TestDetails` — they go through
`configure()` or `test.setTimeout()` inside the body.

## TestDetails — `tag` and `annotation`

### Filtering with tags

```typescript
test('single tag', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/');
});

test('multiple tags', { tag: ['@smoke', '@login'] }, async ({ page }) => {
  await page.goto('/');
});

test.describe('Suite tag — every test inherits', { tag: '@full' }, () => {
  test('inherits @full', async ({ page }) => { /* ... */ });
});
```

Filter via CLI or project `grep`:

```bash
npx playwright test --grep "@smoke"
npx playwright test --grep "@smoke|@critical"   # OR
npx playwright test --grep-invert "@slow"        # exclude
```

This project uses tags for the `@smoke` / `@core` / `@full` profiles —
see [Test Profiles](../getting-started/profiles).

### Annotations — extra metadata in the report

```typescript
test('annotated', {
  annotation: [
    { type: 'issue',  description: 'https://github.com/org/repo/issues/42' },
    { type: 'owner',  description: 'auth-team' },
    { type: 'env',    description: 'staging' },
  ],
}, async ({ page }) => {
  await page.goto('/');
});
```

Annotations appear in the HTML report as rows under the test name. Use
for: issue links, ownership, environment, JIRA tickets.

## `test.describe.configure()` — mode, retries, timeout

Must be called **inside** a `describe`, **before** the tests.

### `mode: 'parallel' | 'serial'`

```typescript
test.describe('Parallel suite', () => {
  test.describe.configure({ mode: 'parallel' });
  test('runs concurrently A', async ({ page }) => { /* ... */ });
  test('runs concurrently B', async ({ page }) => { /* ... */ });
});

test.describe('Serial suite', () => {
  test.describe.configure({ mode: 'serial' });    // one at a time
  test('step 1', async ({ page }) => { /* ... */ });
  test('step 2 — skipped if step 1 fails', async ({ page }) => { /* ... */ });
});
```

### `retries` and `timeout`

```typescript
test.describe('Flaky suite — extra retries', () => {
  test.describe.configure({ retries: 5 });
  // ...
});

test.describe('Slow suite — extended timeout', () => {
  test.describe.configure({ timeout: 90_000 });
  // ...
});

test.describe('All three together', () => {
  test.describe.configure({ mode: 'serial', retries: 2, timeout: 60_000 });
  // ...
});
```

## Inside the test body — runtime control

For per-test logic that depends on runtime conditions:

```typescript
test('extended timeout', async ({ page }) => {
  test.setTimeout(90_000);                  // this test only
  // ...
});

test('triple timeout', async ({ page }) => {
  test.slow();                              // × 3
  // ...
});

test('conditional skip', async ({ page, browserName }) => {
  test.skip(browserName === 'firefox', 'Known issue on Firefox');
  // ...
});

test('expected to fail', async ({ page }) => {
  test.fail();                              // passes if body throws
  // ...
});
```

## `test.use()` inside describe — change browser options

Not part of `TestDetails` — separate API.

```typescript
test.describe('Mobile viewport', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test('login on mobile', async ({ page }) => { /* ... */ });
});

test.describe('German locale', () => {
  test.use({ locale: 'de-DE', timezoneId: 'Europe/Berlin' });
  test('login with German locale', async ({ page }) => { /* ... */ });
});
```

## Cheat sheet

```
test('name', { ... TestDetails ... }, body)
test.describe('name', { ... TestDetails ... }, callback)
  TestDetails = { tag?, annotation? }

test.describe.configure({ mode?, retries?, timeout? })
  → controls scheduling/retries/timeout for the NEXT describe block

Inside test body:
  test.setTimeout(ms)     test.slow()
  test.skip(cond, reason) test.fail()  test.fixme()

test.use({ ...BrowserContextOptions }) inside describe:
  viewport, locale, timezoneId, geolocation, permissions,
  storageState, baseURL, extraHTTPHeaders, colorScheme, ...
```
