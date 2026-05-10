# Playwright Boilerplate

A ready-to-use Playwright test boilerplate with full observability configured out of the box.

## What's included

- **Headed mode** — browser window is visible during test runs
- **Traces** — always-on trace recording per test (timeline, DOM snapshots, network, console)
- **Screenshots** — captured automatically at the end of every test
- **Video** — full screen recording for every test
- **HTML report** — auto-opens in browser after each run with traces, video, and screenshots embedded
- **Retries** — failed tests are automatically retried up to 3 times before being marked as failed
- **Timeouts** — 60s per test, 15s per action to prevent flaky failures on slow networks

## Project structure

```
tests/
  my-tests/
    sample.spec.ts   # example tests against playwright.dev
playwright.config.ts
tsconfig.json
```

## Getting started

```bash
npm install
npx playwright install
npx playwright test
```

The HTML report opens automatically after the run. To reopen it later:

```bash
npx playwright show-report
```

## Test artifacts

Each test writes its artifacts to `test-results/<test-name>/`:

| File | Description |
|---|---|
| `trace.zip` | Full trace — open via `npx playwright show-trace` or trace.playwright.dev |
| `video.webm` | Screen recording of the test |
| `*.png` | Screenshot at test completion |
