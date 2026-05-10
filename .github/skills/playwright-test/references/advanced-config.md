# Advanced Config — playwright.config.ts Reference

Every option that matters in `playwright.config.ts`, organized by what you're
trying to accomplish.

## Contents

1. [Top-level options](#top-level-options)
2. [The `use` block — browser context defaults](#the-use-block)
3. [Projects](#projects)
4. [Reporters](#reporters)
5. [Web server (auto-start)](#web-server)
6. [Global setup and teardown](#global-setup-and-teardown)
7. [Snapshot config](#snapshot-config)
8. [Expect timeouts](#expect-timeouts)
9. [Test ignore and match patterns](#test-ignore-and-match-patterns)

---

## Top-level options

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',                       // root folder for spec discovery
  testIgnore: ['**/*.cookbook.ts'],          // skip files matching pattern
  testMatch: ['**/*.spec.ts'],               // only run these (default: *.spec.ts/js/mjs)

  fullyParallel: true,                       // tests within a file run in parallel
  forbidOnly: !!process.env.CI,              // fail CI if test.only leaks in

  retries: process.env.CI ? 2 : 0,           // retry failed tests
  workers: process.env.CI ? 4 : undefined,   // parallel workers (default: cpu count - 1)

  timeout: 60_000,                            // default per-test timeout (ms)
  globalTimeout: 30 * 60_000,                 // entire run max (default: none)
  maxFailures: process.env.CI ? 10 : 0,        // stop after N failures (CI only)

  outputDir: 'test-results',                  // per-test artifact folder
  preserveOutput: 'failures-only',            // 'always' | 'failures-only' | 'never'
  updateSnapshots: 'missing',                 // 'all' | 'none' | 'missing'
  quiet: false,                                // suppress stdout from test process

  expect: {
    timeout: 5_000,                            // default for `await expect(...)`
    toHaveScreenshot: { maxDiffPixels: 100 },  // visual diff threshold
    toMatchSnapshot:  { maxDiffPixelRatio: 0.01 },
  },

  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['json', { outputFile: 'results.json' }],
  ],

  use: { /* see next section */ },
  projects: [ /* see Projects section */ ],
});
```

## The `use` block

These apply to **every test in every project** unless a project overrides them.

```typescript
use: {
  // ─── Browser ───────────────────────────────────────────────────────
  baseURL: 'https://www.saucedemo.com',     // page.goto('/') resolves here
  headless: !!process.env.CI,                // CI headless, dev headed
  viewport: { width: 1280, height: 720 },
  ignoreHTTPSErrors: true,                   // allow self-signed certs
  bypassCSP: true,                           // disable CSP for the page

  // ─── Locators ──────────────────────────────────────────────────────
  testIdAttribute: 'data-test',              // page.getByTestId reads this attr

  // ─── Timeouts ──────────────────────────────────────────────────────
  actionTimeout: 15_000,                     // click, fill, etc.
  navigationTimeout: 30_000,                 // goto, reload, waitForURL

  // ─── Tracing / Media ───────────────────────────────────────────────
  trace: 'on',                               // 'off' | 'on' | 'retain-on-failure' | 'on-first-retry'
  screenshot: 'on',                          // 'off' | 'on' | 'only-on-failure'
  video: 'on',                               // 'off' | 'on' | 'retain-on-failure' | 'on-first-retry'

  // ─── HTTP ──────────────────────────────────────────────────────────
  extraHTTPHeaders: {
    'X-Custom-Header': 'value',
  },
  httpCredentials: {                          // basic auth
    username: 'user',
    password: 'pass',
  },
  offline: false,                             // simulate offline mode
  proxy: { server: 'http://proxy:8080' },

  // ─── Storage / Identity ────────────────────────────────────────────
  storageState: 'auth/standard_user.json',    // pre-authenticated state
  permissions: ['geolocation', 'notifications'],
  geolocation: { latitude: 51.5, longitude: -0.13 },
  locale: 'en-GB',
  timezoneId: 'Europe/London',
  colorScheme: 'dark',                        // 'light' | 'dark' | 'no-preference'
  contextOptions: { reducedMotion: 'reduce' },

  // ─── Device emulation ──────────────────────────────────────────────
  isMobile: false,
  hasTouch: false,
  deviceScaleFactor: 2,
  userAgent: 'custom UA string',
},
```

### Recording vs retain-on-failure

| Mode | Behavior |
|---|---|
| `'on'` | Recorded for every test always (verbose, useful for dev) |
| `'retain-on-failure'` | Recorded, deleted on pass (good for CI) |
| `'on-first-retry'` | Only when retrying a failed test (cheapest) |
| `'off'` | Never recorded |

This project uses `'on'` everywhere because the boilerplate is dev-focused.
In real CI, switch to `'retain-on-failure'` or `'on-first-retry'`.

## Projects

Projects are independent test runs with different config. Use cases:

1. **Cross-browser** — run same tests on Chromium, Firefox, WebKit
2. **Cross-environment** — run on staging vs production
3. **Test groups** — smoke, regression, full
4. **Setup/teardown sequencing** — auth project that produces storageState for others

```typescript
projects: [
  // Browser matrix
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
  { name: 'webkit',   use: { ...devices['Desktop Safari']  } },

  // Mobile
  { name: 'Pixel 5',     use: { ...devices['Pixel 5']     } },
  { name: 'iPhone 12',   use: { ...devices['iPhone 12']   } },

  // Tag-filtered groups
  { name: 'smoke',  grep: /@smoke/  },
  { name: 'core',   grep: /@core/   },
  { name: 'full',   grep: /@full/   },

  // Authenticated tests — depends on setup project running first
  {
    name: 'setup',
    testMatch: /global\.setup\.ts/,
  },
  {
    name: 'authenticated',
    dependencies: ['setup'],                  // ← runs after setup completes
    use: { storageState: 'playwright/.auth/user.json' },
    testIgnore: /global\.setup\.ts/,
  },
],
```

Run a specific project: `npx playwright test --project=chromium`

### Project teardown

```typescript
{
  name: 'cleanup',
  testMatch: /global\.teardown\.ts/,
},
{
  name: 'tests',
  teardown: 'cleanup',                         // ← runs after this project finishes
  dependencies: ['setup'],
},
```

## Reporters

Composable — list any number of reporters:

```typescript
reporter: [
  ['list'],                                      // terminal default, real-time
  ['line'],                                      // compact, one line per test
  ['dot'],                                       // minimal — one char per test
  ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ['json', { outputFile: 'results.json' }],
  ['junit', { outputFile: 'results.xml' }],
  ['github'],                                    // GitHub Actions annotations
  ['blob', { outputDir: 'blob-report' }],         // for merge across shards
  ['./my-custom-reporter.ts'],                   // custom Reporter class
],

// CI vs local
reporter: process.env.CI
  ? [['github'], ['html', { open: 'never' }], ['junit', { outputFile: 'results.xml' }]]
  : [['list'], ['html', { open: 'on-failure' }]],
```

See `references/reporters.md` for the full reporter API and customization.

## Web server

Auto-start your dev server before the test run:

```typescript
webServer: {
  command: 'npm run dev',
  url: 'http://localhost:3000',                  // wait for this URL to respond
  reuseExistingServer: !process.env.CI,
  timeout: 120_000,
  stdout: 'pipe',                                // 'pipe' | 'ignore'
  stderr: 'pipe',
  env: {
    NODE_ENV: 'test',
  },
},

// Multiple servers (e.g. API + frontend)
webServer: [
  { command: 'npm run api',  url: 'http://localhost:4000' },
  { command: 'npm run web',  url: 'http://localhost:3000' },
],
```

## Global setup and teardown

Single setup/teardown across the whole run (NOT per-project — use project
dependencies for that):

```typescript
// playwright.config.ts
globalSetup:    require.resolve('./global-setup'),
globalTeardown: require.resolve('./global-teardown'),
```

```typescript
// global-setup.ts
import { chromium, FullConfig } from '@playwright/test';

export default async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://www.saucedemo.com');
  await page.getByTestId('username').fill('standard_user');
  await page.getByTestId('password').fill('secret_sauce');
  await page.getByTestId('login-button').click();
  await page.context().storageState({ path: 'playwright/.auth/user.json' });
  await browser.close();
}
```

**Project-based setup (preferred over globalSetup)**: use the `setup` project
pattern shown above — runs per-project, parallelizable, traced, screenshotted.

## Snapshot config

```typescript
snapshotPathTemplate: '{testDir}/__snapshots__/{testFilePath}/{arg}{ext}',

expect: {
  toHaveScreenshot: {
    maxDiffPixels: 100,                          // absolute pixel count
    maxDiffPixelRatio: 0.01,                     // relative
    threshold: 0.2,                              // per-pixel color delta
    animations: 'disabled',                      // pause CSS animations
    caret: 'hide',                               // hide text caret
    scale: 'css',                                // 'css' | 'device'
    stylePath: 'screenshot.css',                 // inject CSS before shot
  },
},
```

Update baselines: `npx playwright test --update-snapshots`

## Expect timeouts

```typescript
expect: {
  timeout: 5_000,                                // default for await expect()
},
```

Different from the `timeout` top-level which is the WHOLE-test timeout.
The expect timeout is per-assertion — auto-retries `toBeVisible()` etc.

## Test ignore and match patterns

```typescript
testMatch: ['**/*.spec.ts'],                     // default
testIgnore: [
  '**/*.cookbook.ts',                            // cookbook examples
  '**/fixtures/**',                              // helper files
  '**/.archive/**',                              // archived tests
],

// Per-project override
projects: [{
  name: 'integration',
  testMatch: 'tests/integration/**/*.spec.ts',
}],
```

## Full example with all sections

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testIgnore: ['**/*.cookbook.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  timeout: 60_000,

  expect: { timeout: 5_000 },

  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'on-failure' }]],

  use: {
    baseURL: process.env.BASE_URL ?? 'https://www.saucedemo.com',
    testIdAttribute: 'data-test',
    headless: !!process.env.CI,
    trace: process.env.CI ? 'on-first-retry' : 'on',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
  },

  projects: [
    { name: 'setup', testMatch: /global\.setup\.ts/ },
    {
      name: 'chromium',
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/user.json' },
    },
    { name: 'smoke', grep: /@smoke/, use: { ...devices['Desktop Chrome'] } },
  ],

  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
  },
});
```
