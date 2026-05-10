---
title: Running Tests
sidebar_position: 2
---

# Running Tests

Three ways to run, in increasing order of control: **Make**, **npm scripts**, **raw `npx`**.

## Quick reference

```bash
make test               # everything
make test-smoke         # 1 user — fastest sanity check
make test-core          # 2 users — adds main error path
make test-full          # all 6 users — full regression
make test-ui            # Playwright UI mode (interactive)
make test-debug         # Inspector — step through manually
make report             # reopen the last HTML report
```

`make help` lists every target.

## npm scripts

For finer control. Defined in [`package.json`](https://github.com/manimovassagh/samtest/blob/main/package.json):

| Command | What it does |
|---|---|
| `npm test` | Run all tests |
| `npm run test:chromium` | Chromium only |
| `npm run test:firefox` / `:webkit` | Single browser |
| `npm run test:headed` / `:headless` | Force visibility mode |
| `npm run test:smoke` / `:core` / `:full` | Profile-filtered |
| `npm run test:login` | Login suite only |
| `npm run test:ci` | CI mode (headless, no auto-open) |
| `npm run test:debug` | Playwright Inspector (`PWDEBUG=1`) |
| `npm run test:ui` | Playwright UI mode (interactive) |
| `npm run test:no-retry` | Skip retries (debugging flakes) |
| `npm run report` | Reopen last HTML report |
| `npm run trace` | Open a trace file |

## Raw `npx playwright`

When no script fits:

```bash
# By test title substring
npx playwright test -g "standard_user" --project=chromium

# By file:line
npx playwright test tests/saucedemo/login.spec.ts:42

# Run a cookbook file directly
npx playwright test tests/saucedemo/network.cookbook.ts --project=chromium

# Repeat to expose flakes
npx playwright test -g "name" --repeat-each=20 --retries=0

# Generate a test by recording your clicks
npx playwright codegen https://www.saucedemo.com
```

Full CLI flag reference: **[CLI Reference](../reference/cli)**.

## Test artifacts

Every run writes to `test-results/<test-name>/`:

| File | How to open |
|---|---|
| `trace.zip` | `make trace FILE=test-results/<name>/trace.zip` or drop into [trace.playwright.dev](https://trace.playwright.dev) |
| `video.webm` | Any video player or your browser |
| `*.png` | Screenshot at test completion |

The `playwright-report/` folder contains the HTML report with all of the
above embedded. `make report` reopens the last one.

## CI runs

Every push and PR runs the suite via GitHub Actions. The HTML report is
uploaded as an artifact and **mirrored to this docs site at
[`/test-report/`](pathname:///test-report/)** after every push to `main`.

CI integration deep-dive: **[CI / CD Reference](../reference/ci)**.

## What "passes" really means

This project's config:

- `retries: 3` — a test is retried up to 3× before being marked failed
- `timeout: 60_000` — each test has 60s to complete
- `actionTimeout: 15_000` — each action (click, fill) has 15s

If a test passes after retries, the HTML report flags it as **flaky** —
not the same as green. Flaky tests are worth fixing; see
[Debugging → Diagnosing flaky tests](../reference/debugging#diagnosing-flaky-tests).
