# Playwright Boilerplate

A ready-to-use Playwright test boilerplate with full observability configured out of the box.

## What's included

- **CI pipeline** — GitHub Actions workflow runs tests on every push/PR and uploads artifacts
- **Headed mode** — browser window is visible during local runs (headless automatically in CI)
- **Traces** — always-on trace recording per test (timeline, DOM snapshots, network, console)
- **Screenshots** — captured automatically at the end of every test
- **Video** — full screen recording for every test
- **HTML report** — auto-opens in browser after each run with traces, video, and screenshots embedded
- **Retries** — failed tests are automatically retried up to 3 times before being marked as failed
- **Timeouts** — 60s per test, 15s per action to prevent flaky failures on slow networks

## Project structure

```
tests/
  saucedemo/
    login.spec.ts    # login tests for all 6 built-in SauceDemo users
playwright.config.ts
Makefile
tsconfig.json
```

## Getting started

```bash
npm install
npx playwright install --with-deps
```

## Running tests

### npm scripts

| Command | What it does |
|---|---|
| `npm test` | Run all tests |
| `npm run test:chromium` | Chromium only |
| `npm run test:firefox` | Firefox only |
| `npm run test:webkit` | WebKit only |
| `npm run test:headed` | Force headed mode (browser visible) |
| `npm run test:headless` | Force headless mode |
| `npm run test:login` | Login suite only |
| `npm run test:login:chromium` | Login suite, Chromium only |
| `npm run test:ci` | CI mode — headless, 1 worker, no auto-open |
| `npm run test:debug` | Open Playwright Inspector (step-through) |
| `npm run test:ui` | Playwright UI mode (interactive) |
| `npm run test:no-retry` | No retries — fast failure feedback |
| `npm run report` | Reopen last HTML report |
| `npm run trace` | Open a trace file |

### Makefile

```bash
make help               # show all targets
make test               # run all tests
make test-chromium      # Chromium only
make test-login         # login suite (Chromium)
make test-ci            # CI mode
make test-debug         # Playwright Inspector
make test-ui            # Playwright UI mode
make test-no-retry      # no retries
make report             # reopen HTML report
make trace FILE=test-results/.../trace.zip
make clean              # delete test-results/ and playwright-report/
make install            # npm install + playwright install
```

## Test artifacts

Each test writes its artifacts to `test-results/<test-name>/`:

| File | Description |
|---|---|
| `trace.zip` | Full trace — open via `npx playwright show-trace` or trace.playwright.dev |
| `video.webm` | Screen recording of the test |
| `*.png` | Screenshot at test completion |

## CI — GitHub Actions

The workflow at `.github/workflows/playwright.yml` runs on every push and PR to `main`.

After each run, two artifacts are uploaded and available in the GitHub Actions summary:

| Artifact | Contents | Retention |
|---|---|---|
| `playwright-report` | Full HTML report with embedded traces, video, screenshots | 30 days |
| `test-results` | Raw trace zips, videos, and screenshots per test | 30 days |

To view them: go to the Actions tab → click the run → scroll to **Artifacts** at the bottom.
