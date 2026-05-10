---
title: Cookbooks
sidebar_position: 1
slug: /cookbooks
---

# Cookbooks

Each cookbook is a runnable `.ts` file under
[`tests/saucedemo/`](https://github.com/manimovassagh/samtest/tree/main/tests/saucedemo)
plus a docs page that explains the patterns. Read the doc, then open the
file to see the working code.

## Index

| Cookbook | What it teaches | Source |
|---|---|---|
| **[Inline config](./inline-config)** | `tag`, `annotation`, `mode`, `retries`, `timeout` — everything you can pass inline to `test()` / `test.describe()` | [inline-config.cookbook.ts](https://github.com/manimovassagh/samtest/blob/main/tests/saucedemo/inline-config.cookbook.ts) |
| **[Fixtures](./fixtures)** | Custom fixtures, worker scope, auto-use, composition | [fixtures.cookbook.ts](https://github.com/manimovassagh/samtest/blob/main/tests/saucedemo/fixtures.cookbook.ts) |
| **[Network](./network)** | `route`, `fulfill`, `abort`, modify responses, `waitForRequest` | [network.cookbook.ts](https://github.com/manimovassagh/samtest/blob/main/tests/saucedemo/network.cookbook.ts) |
| **[Assertions](./assertions)** | Web-first, soft, `expect.poll`, custom matchers, aria snapshots | [assertions.cookbook.ts](https://github.com/manimovassagh/samtest/blob/main/tests/saucedemo/assertions.cookbook.ts) |
| **[Authentication](./auth)** | `storageState`, worker auth, multi-user, cookie injection | [auth.cookbook.ts](https://github.com/manimovassagh/samtest/blob/main/tests/saucedemo/auth.cookbook.ts) |
| **[Page Objects](./page-objects)** | Classic POM, component objects, fixture-powered page objects | [page-objects.cookbook.ts](https://github.com/manimovassagh/samtest/blob/main/tests/saucedemo/page-objects.cookbook.ts) |

## Reading order

If you're new to Playwright, read in this order:

1. **[Inline config](./inline-config)** — understand what `test()` accepts
2. **[Assertions](./assertions)** — the most important API to internalize
3. **[Fixtures](./fixtures)** — the dependency-injection system
4. **[Network](./network)** — mock the network for deterministic tests
5. **[Authentication](./auth)** — skip login on every test
6. **[Page Objects](./page-objects)** — structure tests as the suite grows

## How to run a cookbook

Each cookbook file is a real Playwright spec. Run individually:

```bash
npx playwright test tests/saucedemo/inline-config.cookbook.ts --project=chromium
```

Or just run the lot:

```bash
make test
```

Cookbook tests are tagged so they run alongside the real tests. To
**exclude** them from CI, add to [`playwright.config.ts`](https://github.com/manimovassagh/samtest/blob/main/playwright.config.ts):

```typescript
testIgnore: ['**/*.cookbook.ts'],
```
