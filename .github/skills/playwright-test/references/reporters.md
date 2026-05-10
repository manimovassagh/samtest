# Reporters Reference

How to customize reporter output and write your own.

## Contents

1. [Built-in reporters](#built-in-reporters)
2. [Reporter combinations](#reporter-combinations)
3. [HTML report customization](#html-report)
4. [JUnit, JSON, blob](#machine-readable)
5. [Custom attachments](#attachments)
6. [Writing a custom reporter](#custom-reporter)
7. [Third-party reporters](#third-party)

---

## Built-in reporters

| Reporter | What it does | Use when |
|---|---|---|
| `list` | Real-time stream of test results in terminal | Default for dev — see progress |
| `line` | Compact single-line updates | Long runs where `list` is too verbose |
| `dot` | One character per test result | CI logs you don't read normally |
| `html` | Self-contained interactive web report | Always — primary debugging artifact |
| `json` | Machine-readable result dump | Dashboards, custom tooling |
| `junit` | XML in JUnit format | Most CI systems display this natively |
| `github` | Inline GitHub Actions annotations | PR workflows |
| `blob` | Intermediate format for merging across shards | Sharded CI |
| `null` | Silent | Programmatic runs that parse stdout themselves |

## Reporter combinations

```typescript
// playwright.config.ts
reporter: [
  ['list'],
  ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ['json', { outputFile: 'results.json' }],
  ['junit', { outputFile: 'junit.xml' }],
  ['github'],
],
```

Order matters slightly — first reporter is "primary" for some plugins.
Compose multiple freely.

### Conditional on env

```typescript
reporter: process.env.CI
  ? [['github'], ['html', { open: 'never' }], ['junit', { outputFile: 'results.xml' }]]
  : [['list'], ['html', { open: 'on-failure' }]],
```

### Sharded CI — use blob

```typescript
reporter: process.env.CI ? [['blob']] : [['list'], ['html']],
```

Then merge after all shards finish:

```bash
npx playwright merge-reports --reporter=html ./all-blob-reports
```

## HTML report

The HTML reporter is the gold standard — embedded videos, screenshots, traces,
network logs, step-by-step actions.

```typescript
['html', {
  outputFolder: 'playwright-report',     // where to write
  open: 'always',                         // 'always' | 'on-failure' | 'never'
  host: 'localhost',                      // for `playwright show-report`
  port: 9323,                             // default port for the report server
  attachmentsBaseURL: 'https://...',      // if hosting attachments elsewhere
}],
```

### Opening

```bash
npm run report                           # uses this project's helper
npx playwright show-report               # opens default folder
npx playwright show-report path/to/dir   # specific folder
```

### Filtering and searching

The HTML report's search bar supports:

| Syntax | Meaning |
|---|---|
| `text` | Match in test title |
| `@smoke` | Match tag |
| `s:passed` | Status filter (`passed`, `failed`, `skipped`, `flaky`) |
| `p:chromium` | Project filter |
| `f:login.spec.ts` | File filter |

### Step tree

Every action and assertion appears as a step. Failed steps highlight in red.
Click any step to see:
- The exact line in your test
- DOM snapshot (if a locator action)
- Network requests during that step

## Machine-readable

### JSON

```typescript
['json', { outputFile: 'results.json' }],
```

Schema is documented at https://playwright.dev/docs/test-reporter-api.
Useful keys: `stats`, `suites[*].specs[*].tests[*].results[*]`.

```bash
# Quick failure summary from CI logs
jq '[.suites[].specs[].tests[] | select(.results[0].status == "failed") | .title]' results.json
```

### JUnit

```typescript
['junit', { outputFile: 'junit.xml' }],
```

Most CI systems (GitHub Actions, GitLab, Jenkins, CircleCI) display this in
their test-results UI automatically.

### Blob

Used only for sharding — see [ci.md](./ci.md#sharding).

## Attachments

Attach arbitrary files to a test result — visible in the HTML report:

```typescript
test('with custom attachment', async ({ page }, testInfo) => {
  await page.goto('/');

  // Attach a screenshot
  await testInfo.attach('homepage-screenshot', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });

  // Attach a JSON payload
  await testInfo.attach('api-response', {
    body: JSON.stringify({ users: 100 }, null, 2),
    contentType: 'application/json',
  });

  // Attach a file from disk
  await testInfo.attach('export.csv', {
    path: 'fixtures/data.csv',
    contentType: 'text/csv',
  });
});
```

### Attach via fixture (universal capture)

```typescript
test.extend<{}>({
  page: async ({ page }, use, testInfo) => {
    await use(page);

    // On failure, attach DOM HTML for post-mortem
    if (testInfo.status !== testInfo.expectedStatus) {
      const html = await page.content();
      await testInfo.attach('page-html', {
        body: html,
        contentType: 'text/html',
      });
    }
  },
});
```

## Custom reporter

Implement the `Reporter` interface from `@playwright/test/reporter`:

```typescript
// reporters/slack-reporter.ts
import type { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter';

export default class SlackReporter implements Reporter {
  private failures: { title: string; error: string }[] = [];

  onTestEnd(test: TestCase, result: TestResult) {
    if (result.status === 'failed' || result.status === 'timedOut') {
      this.failures.push({
        title: test.title,
        error: result.error?.message ?? 'unknown',
      });
    }
  }

  async onEnd(result: FullResult) {
    if (this.failures.length === 0) return;

    await fetch(process.env.SLACK_WEBHOOK!, {
      method: 'POST',
      body: JSON.stringify({
        text: `❌ ${this.failures.length} Playwright tests failed`,
        attachments: this.failures.map(f => ({
          color: 'danger',
          title: f.title,
          text: f.error,
        })),
      }),
    });
  }
}
```

Register:

```typescript
// playwright.config.ts
reporter: [
  ['list'],
  ['./reporters/slack-reporter.ts'],
],
```

### Reporter lifecycle hooks

| Hook | When | Use |
|---|---|---|
| `onBegin(config, suite)` | Before any test runs | Log run start, send "starting" notifications |
| `onTestBegin(test, result)` | Before each test | Per-test logging |
| `onStepBegin(test, result, step)` | Before each step (locator action, expect) | Verbose tracing |
| `onStepEnd(test, result, step)` | After each step | Step-level analytics |
| `onTestEnd(test, result)` | After each test | Per-test reporting |
| `onEnd(result)` | After all tests done | Summary, notifications, uploads |
| `onError(error)` | Reporter / runner error | Crash handling |
| `printsToStdio()` | Returns boolean | `true` if your reporter writes to stdout |

## Third-party

Notable community reporters:

| Reporter | Purpose |
|---|---|
| `@currents/playwright` | Cloud dashboard with cross-run analytics |
| `playwright-qase-reporter` | Sync with Qase test management |
| `allure-playwright` | Allure framework report — richer than HTML |
| `monocart-reporter` | HTML report with code coverage |
| `playwright-tesults-reporter` | Upload to Tesults |
| `playwright-bdd` | Cucumber/Gherkin integration |

Install: `npm install -D <package>`, add to `reporter` array in config.

## Recipes

### Slack only on main branch failures

```typescript
reporter: [
  ['list'],
  ['html', { open: 'never' }],
  ...(process.env.GITHUB_REF === 'refs/heads/main' ? [['./reporters/slack.ts']] : []),
],
```

### Email digest of flaky tests

```typescript
// reporters/flaky-digest.ts
export default class FlakyDigest implements Reporter {
  private flaky: string[] = [];

  onTestEnd(test: TestCase, result: TestResult) {
    if (result.retry > 0 && result.status === 'passed') {
      this.flaky.push(test.title);
    }
  }

  async onEnd() {
    if (this.flaky.length > 0) {
      await sendEmail({
        subject: `${this.flaky.length} flaky tests in last run`,
        body: this.flaky.join('\n'),
      });
    }
  }
}
```

### Report only failures to stdout

```typescript
// Set `quiet: true` in config to suppress stdout from test process
// AND use the dot reporter for compact terminal output
quiet: true,
reporter: [['dot'], ['html']],
```
