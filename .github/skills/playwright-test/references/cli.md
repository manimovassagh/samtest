# Playwright CLI Reference

Every useful command, flag, and recipe.

## Contents

1. [Running tests](#running-tests)
2. [Filtering](#filtering)
3. [Debugging modes](#debugging-modes)
4. [Reports and traces](#reports-and-traces)
5. [Code generation](#code-generation)
6. [Snapshots](#snapshots)
7. [Sharding](#sharding)
8. [Environment variables](#environment-variables)
9. [Installation and updates](#installation-and-updates)

---

## Running tests

```bash
npx playwright test                              # run all
npx playwright test login.spec.ts                # one file
npx playwright test tests/auth/                  # one folder
npx playwright test login.spec.ts:42             # one test by line number
npx playwright test --list                       # list all without running
```

### Project selection

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox --project=webkit    # multiple
npx playwright test --project=smoke                       # tag-filtered project
```

### Worker and retry overrides

```bash
npx playwright test --workers=1                  # serial
npx playwright test --workers=4                  # explicit parallel count
npx playwright test --workers=50%                # half of CPU
npx playwright test --retries=0                  # no retries (for flake debugging)
npx playwright test --max-failures=5             # stop after 5 failures
npx playwright test --fully-parallel             # force parallel even within file
```

### Headed vs headless

```bash
npx playwright test --headed                     # see the browser
npx playwright test --headless                   # no UI (CI default)
```

### Reporter override

```bash
npx playwright test --reporter=list
npx playwright test --reporter=dot,html
npx playwright test --reporter=json > out.json
npx playwright test --reporter=junit             # CI XML
npx playwright test --reporter=github            # GitHub annotations
npx playwright test --reporter=blob              # for cross-shard merging
```

## Filtering

### By test name (grep on title)

```bash
npx playwright test -g "login success"           # substring
npx playwright test -g "/^login/"                # regex
npx playwright test --grep-invert "slow"         # exclude
```

### By tag

```bash
npx playwright test --grep "@smoke"
npx playwright test --grep "@smoke|@critical"    # OR
npx playwright test --grep "@smoke" --grep-invert "@flaky"
```

### By file/folder

```bash
npx playwright test tests/auth tests/checkout    # multiple paths
npx playwright test --test-search="login"         # filename substring
```

## Debugging modes

### UI mode (preferred for development)

```bash
npx playwright test --ui                         # interactive — pick tests, watch
npm run test:ui                                  # this project
```

Features: watch mode, time-travel through actions, locator picker, console,
network log — all in one interface.

### Inspector (step-by-step)

```bash
PWDEBUG=1 npx playwright test                    # pauses before every action
PWDEBUG=console npx playwright test              # auto-pauses on console.log
npm run test:debug                               # this project
```

Inspector shows the page, current Playwright command, and lets you step
through manually. Press F8 (or button) to resume.

### Debug a specific test

```bash
npx playwright test login.spec.ts --debug        # equivalent to PWDEBUG=1 for that file
npx playwright test -g "specific test" --debug
```

### Trace viewer (post-mortem)

```bash
npx playwright show-trace test-results/.../trace.zip
npx playwright show-trace https://example.com/trace.zip     # remote URL
```

Or drag-drop the trace into https://trace.playwright.dev.

### Inspect the codegen recorder

```bash
npx playwright codegen https://www.saucedemo.com           # opens browser, records clicks
npx playwright codegen --target=javascript                  # output language
npx playwright codegen --output=tests/recorded.spec.ts      # save directly
npx playwright codegen --device="iPhone 12"                 # emulate device
npx playwright codegen --color-scheme=dark
npx playwright codegen --load-storage=auth.json             # start logged-in
```

The recorder window has a Pick Locator button — click any element to copy its
recommended locator.

## Reports and traces

```bash
npx playwright show-report                       # opens last HTML report
npx playwright show-report playwright-report/    # specific folder
npm run report                                   # this project

npx playwright show-trace path/to/trace.zip      # open a single trace
npm run trace                                    # this project (Makefile passes FILE=)
```

### Merge reports across shards

```bash
# Each shard outputs a blob-report/<shard>.zip
# After all shards complete:
npx playwright merge-reports --reporter=html ./all-blob-reports
```

## Snapshots

```bash
npx playwright test --update-snapshots           # update all
npx playwright test login.spec.ts -u             # short form, one file
npx playwright test --update-snapshots="missing" # only create missing
npx playwright test --update-snapshots="changed" # update only changed (default with -u)
npx playwright test --update-snapshots="all"     # rewrite even unchanged
```

## Sharding

Distribute tests across N machines:

```bash
# Machine 1
npx playwright test --shard=1/4

# Machine 2
npx playwright test --shard=2/4

# Each shard produces blob-report/
# Combine after all complete:
npx playwright merge-reports --reporter=html blob-reports/
```

Playwright's sharding is deterministic by test list — same test goes to the
same shard every run, so flaky tests can be reproduced.

## Environment variables

| Variable | Effect |
|---|---|
| `PWDEBUG=1` | Run with Inspector, pause before every action |
| `PWDEBUG=console` | Auto-pause on `console.log` |
| `DEBUG=pw:api` | Verbose Playwright API logging |
| `DEBUG=pw:browser` | Browser process logging |
| `DEBUG=pw:protocol` | CDP/WebKit protocol logging |
| `CI=true` | Enables CI defaults in playwright.config.ts conditionals |
| `PLAYWRIGHT_HTML_REPORT` | Override HTML report output folder |
| `PLAYWRIGHT_JSON_OUTPUT_NAME` | Override JSON reporter output path |
| `PLAYWRIGHT_BROWSERS_PATH` | Where browsers are downloaded (CI cache) |
| `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` | Skip downloading browsers (use system) |
| `PLAYWRIGHT_TEST_BASE_URL` | Override baseURL at runtime |

## Installation and updates

```bash
# Install Playwright in a project
npm init playwright@latest                       # interactive scaffolding

# In an existing project
npm install -D @playwright/test
npx playwright install                           # download browsers
npx playwright install --with-deps               # + system deps (Linux)
npx playwright install chromium                  # one browser only
npx playwright install-deps                      # system deps only

# Update
npm install -D @playwright/test@latest
npx playwright install                           # re-download matching browsers

# Browser info
npx playwright --version
npx playwright list-files                        # show config + projects
```

### Container/CI install

```bash
# Use the official image — has all browsers + deps pre-installed
docker run --rm -v $(pwd):/work mcr.microsoft.com/playwright:v1.59.1-jammy bash -c "cd /work && npm ci && npx playwright test"
```

## Common recipes for this project

```bash
# Run only the locked_out_user test
npx playwright test -g "locked_out_user" --project=chromium

# Run the @smoke profile with no retries
npx playwright test --project=smoke --retries=0

# Generate a recorder for a new test against saucedemo
npx playwright codegen https://www.saucedemo.com

# Debug a specific failing test
PWDEBUG=1 npx playwright test login.spec.ts -g "problem_user"

# Open the trace for the most recent failure
npx playwright show-trace test-results/*/trace.zip

# Update visual snapshots after a redesign
npx playwright test --update-snapshots

# Run smoke tests in CI mode locally (headless, no parallel)
CI=true npx playwright test --project=smoke
```
