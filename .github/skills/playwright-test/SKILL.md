---
name: playwright-test
description: >
  Use this skill for anything related to Playwright testing — writing new tests,
  designing fixtures, debugging failures, configuring playwright.config.ts, running
  the CLI, working with the Playwright MCP server, sharding for CI, or anything
  involving spec files, traces, HTML reports, screenshots, or video recordings.
  Trigger on: writing a test, running tests, test failures, flaky tests, trace
  viewer, HTML report, headless/headed, retries, timeouts, locators, fixtures,
  network mocking, storageState, page objects, parallel execution, sharding,
  playwright.config.ts, npx playwright, or the tests/ directory. Use even for
  vague requests like "add a test for this page" or "why did my test fail".
---

# Playwright Test Skill

Modular reference covering the full Playwright surface: writing tests, advanced
config, CLI, MCP integration, fixtures, network, auth, debugging, CI.

## Project context

Working directory: `/Users/mani/Documents/Projects/samtest`
Site under test: `https://www.saucedemo.com`
Playwright version: `^1.59.1`
Existing cookbooks: `tests/saucedemo/*.cookbook.ts`

| Setting              | Value          | Source                |
|----------------------|----------------|-----------------------|
| `testDir`            | `./tests`      | playwright.config.ts  |
| `retries`            | `3`            | playwright.config.ts  |
| `timeout`            | `60_000`       | playwright.config.ts  |
| `actionTimeout`      | `15_000`       | playwright.config.ts  |
| `trace`              | `'on'`         | playwright.config.ts  |
| `screenshot`         | `'on'`         | playwright.config.ts  |
| `video`              | `'on'`         | playwright.config.ts  |
| `fullyParallel`      | `true`         | playwright.config.ts  |
| `testIdAttribute`    | `'data-test'`  | playwright.config.ts  |
| Projects             | `chromium`, `smoke`, `core`, `full` | playwright.config.ts |

## When to load each reference

Load only what's needed for the task — the references are designed for
progressive disclosure.

| If the task is about… | Load |
|---|---|
| Writing test code, locators, assertions, structure | `references/writing-tests.md` |
| Modifying `playwright.config.ts` — projects, timeouts, reporters, web server | `references/advanced-config.md` |
| Running tests, CLI flags, debugging from terminal | `references/cli.md` |
| Browser-controlling MCP servers (Playwright MCP, Chrome DevTools MCP) | `references/mcp.md` |
| Custom fixtures, scope, composition, dependency injection | `references/fixtures.md` |
| Route mocking, request interception, HAR recording | `references/network.md` |
| storageState, login-once-share-many patterns, auth fixtures | `references/auth.md` |
| Trace viewer, UI mode, Inspector, codegen, troubleshooting flakes | `references/debugging.md` |
| GitHub Actions, sharding, parallel workers, retries on CI | `references/ci.md` |
| HTML report customization, JSON/JUnit reporters, attachments | `references/reporters.md` |

## Quick command reference

```bash
# Run all (npm scripts preferred)
npm test                          # all tests
npm run test:chromium             # chromium project only
npm run test:smoke                # @smoke-tagged tests
npm run test:ui                   # interactive UI mode
npm run test:debug                # Inspector with PWDEBUG=1
npm run report                    # reopen last HTML report

# Surgical (when no script fits)
npx playwright test -g "name"                    # filter by test title
npx playwright test path/to/file.spec.ts:42      # one test by file:line
npx playwright test --project=chromium --workers=1 --retries=0
npx playwright show-trace test-results/*/trace.zip
npx playwright codegen https://www.saucedemo.com
```

## Cookbook files in this project

Tests under `tests/saucedemo/` include comprehensive cookbooks — read them
before writing similar patterns:

| File | Covers |
|---|---|
| `login.spec.ts` | Real tests + parametrized via users.ts |
| `inline-config.cookbook.ts` | `tag`, `annotation`, `mode`, `retries`, `timeout` on test/describe |
| `fixtures.cookbook.ts` | Custom fixtures, worker-scoped, auto-use, overriding built-ins |
| `network.cookbook.ts` | `route`, `fulfill`, `abort`, modify, `waitForRequest` |
| `assertions.cookbook.ts` | Web-first, soft, `expect.poll`, custom matchers, aria snapshots |
| `auth.cookbook.ts` | storageState, worker auth, multi-user, cookie/localStorage injection |
| `page-objects.cookbook.ts` | POM, component objects, fixture-powered page objects |

## Core principles (read before writing any test)

1. **Locators are the API** — prefer `getByRole`, `getByLabel`, `getByTestId`
   (data-test). Avoid CSS/XPath unless nothing else works.
2. **Web-first assertions auto-retry** — `await expect(loc).toBeVisible()`
   already retries until the timeout. Never add manual `waitForTimeout`.
3. **No `page.waitForTimeout()` in production tests** — that's a sleep. Use
   `expect.poll` or wait for the actual condition.
4. **Test isolation** — every `test()` gets its own browser context. Cross-test
   state should be set up via fixtures or `storageState`, never globals.
5. **Tag → filter** — tags on tests (`{ tag: '@smoke' }`) work with project
   `grep:` filters. This project uses `@smoke`, `@core`, `@full`.
6. **Don't import from `playwright`** — always import `test`, `expect` from
   `@playwright/test`.

## Output style for this skill

When writing tests:
- Always import from `@playwright/test` (not `playwright`)
- Use `page.getByTestId(...)` first (this project uses `data-test` attribute)
- Use `await expect()` for all DOM/page assertions — never bare `expect`
- Prefer `test.describe.configure({ retries, timeout })` over per-test `setTimeout`
- Co-locate test data files (`users.ts`) next to the spec that consumes them

When modifying config:
- Don't break the existing `smoke` / `core` / `full` projects
- Preserve `testIdAttribute: 'data-test'` — many existing tests rely on it
- Keep `trace: 'on'` / `screenshot: 'on'` / `video: 'on'` unless CI overrides

When debugging:
- Always start by reading the trace (`npm run trace -- test-results/.../trace.zip`)
- Then check the HTML report's Steps tab — every Playwright API call appears there
- If still stuck, run the failing test with `npm run test:debug` (PWDEBUG=1)
