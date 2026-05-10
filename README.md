# Playwright Cookbook

A production-ready Playwright boilerplate that doubles as a learn-by-example
cookbook. Every pattern you need — fixtures, network mocking, authentication,
page objects, custom matchers — is in this repo as a runnable `.cookbook.ts`
file you can read, copy, and adapt.

> 📖 **Full docs (Docusaurus + live test report)**: https://manimovassagh.github.io/samtest/
>
> Source for the docs site lives in [`docs/`](docs/) — auto-deployed via
> [`.github/workflows/docs.yml`](.github/workflows/docs.yml) on every push to `main`.

## Quick start

```bash
make install                 # npm install + playwright browsers
make test                    # run everything
make test-smoke              # fastest sanity check (1 user)
```

Open the HTML report after a run:

```bash
make report
```

## What's in this repo

```
samtest/
├── tests/saucedemo/          ← Cookbook files (see below)
│   ├── login.spec.ts            ← Real parametrized tests
│   ├── users.ts                  ← Test data, profile tags
│   ├── inline-config.cookbook.ts
│   ├── fixtures.cookbook.ts
│   ├── network.cookbook.ts
│   ├── assertions.cookbook.ts
│   ├── auth.cookbook.ts
│   └── page-objects.cookbook.ts
├── playwright.config.ts      ← Trace/screenshot/video always on, 3 retries
├── Makefile                  ← Friendly test commands
├── mcp.json                  ← Playwright + Chrome DevTools MCP servers
├── .github/
│   ├── workflows/playwright.yml ← CI pipeline with artifact uploads
│   └── skills/playwright-test/   ← Claude Code skill (modular reference)
└── README.md                 ← You are here
```

## Cookbook index

Every file under `tests/saucedemo/*.cookbook.ts` is a self-contained tutorial
on one topic. Read in this order if you're new to Playwright:

| Cookbook | What it teaches | Run it |
|---|---|---|
| [inline-config.cookbook.ts](tests/saucedemo/inline-config.cookbook.ts) | `tag`, `annotation`, `mode`, `retries`, `timeout` — everything you can pass inline to `test()` / `test.describe()` | `npx playwright test inline-config.cookbook.ts --project=chromium` |
| [fixtures.cookbook.ts](tests/saucedemo/fixtures.cookbook.ts) | Custom fixtures (test-scoped, worker-scoped, auto-use), composition, overriding built-ins | `npx playwright test fixtures.cookbook.ts --project=chromium` |
| [network.cookbook.ts](tests/saucedemo/network.cookbook.ts) | `route`, `fulfill`, `abort`, modify responses, `waitForRequest`, `{ times: N }` | `npx playwright test network.cookbook.ts --project=chromium` |
| [assertions.cookbook.ts](tests/saucedemo/assertions.cookbook.ts) | Web-first assertions, soft assertions, `expect.poll`, custom matchers, aria snapshots | `npx playwright test assertions.cookbook.ts --project=chromium` |
| [auth.cookbook.ts](tests/saucedemo/auth.cookbook.ts) | `storageState`, worker-scoped auth, multi-user contexts, cookie/localStorage injection | `npx playwright test auth.cookbook.ts --project=chromium` |
| [page-objects.cookbook.ts](tests/saucedemo/page-objects.cookbook.ts) | Classic POM, component objects, fixture-powered page objects | `npx playwright test page-objects.cookbook.ts --project=chromium` |

The real tests in [login.spec.ts](tests/saucedemo/login.spec.ts) show how
these patterns combine in production code.

## Test profiles (smoke / core / full)

The repo defines three profiles via tagged tests + project filtering. Users
are tagged in [tests/saucedemo/users.ts](tests/saucedemo/users.ts).

| Profile | Users | Command | Use for |
|---|---|---|---|
| `@smoke` | 1 (standard_user) | `make test-smoke` | Fastest sanity check — every PR |
| `@core`  | 2 (+ locked_out_user) | `make test-core` | Adds main error path — nightly |
| `@full`  | 6 (all SauceDemo users) | `make test-full` | Pre-release regression |

Profile config lives in [playwright.config.ts](playwright.config.ts):
```typescript
projects: [
  { name: 'smoke', grep: /@smoke/, use: { ...devices['Desktop Chrome'] } },
  { name: 'core',  grep: /@core/,  use: { ...devices['Desktop Chrome'] } },
  { name: 'full',  grep: /@full/,  use: { ...devices['Desktop Chrome'] } },
]
```

Tests opt into profiles via tags: `test('name', { tag: ['@smoke', '@core', '@full'] }, ...)`.

## Running tests

### npm scripts

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

### Makefile

`make help` lists everything. Most commonly:

```bash
make test                     # all tests
make test-smoke               # smoke profile
make test-debug               # Inspector for step-through
make test-ui                  # interactive UI mode
make trace FILE=path/to/trace.zip
make clean                    # delete test-results/ and playwright-report/
```

### Raw `npx playwright` recipes

```bash
# Run one test by title substring
npx playwright test -g "standard_user" --project=chromium

# Run one test by file:line
npx playwright test tests/saucedemo/login.spec.ts:42

# Repeat 20 times to expose flakes
npx playwright test -g "flaky test" --repeat-each=20 --retries=0

# Generate code by recording your clicks
npx playwright codegen https://www.saucedemo.com

# Update visual snapshots
npx playwright test --update-snapshots
```

## Config at a glance

[`playwright.config.ts`](playwright.config.ts):

| Setting | Value | Why |
|---|---|---|
| `testIdAttribute` | `'data-test'` | SauceDemo's attribute — `page.getByTestId(...)` reads from here |
| `baseURL` | `https://www.saucedemo.com` | `page.goto('/')` resolves to the homepage |
| `retries` | `3` | 4 attempts total before failure |
| `timeout` | `60_000` | 60s per test |
| `actionTimeout` | `15_000` | 15s per click/fill |
| `trace` / `screenshot` / `video` | `'on'` | Full observability — switch to `'on-first-retry'` for CI cost |
| `fullyParallel` | `true` | Tests within a file run concurrently |
| `headless` | CI-only | Browser visible during dev |
| `reporter` | `list` + `html` | Terminal stream + HTML report |

See [`.github/skills/playwright-test/references/advanced-config.md`](.github/skills/playwright-test/references/advanced-config.md)
for the full option-by-option breakdown.

## Test artifacts

After every run, `test-results/<test-name>/` contains:

| File | How to open |
|---|---|
| `trace.zip` | `make trace FILE=test-results/<name>/trace.zip` — or drag to https://trace.playwright.dev |
| `video.webm` | Any video player or browser |
| `*.png` | Screenshot at test completion |

The HTML report (`playwright-report/`) embeds all three — click any test
row → expand Steps → click the Trace icon.

## CI — GitHub Actions

The workflow at [`.github/workflows/playwright.yml`](.github/workflows/playwright.yml)
runs on every push and PR to `main`. After each run, two artifacts are
uploaded:

| Artifact | Contents | Retention |
|---|---|---|
| `playwright-report` | Full HTML report with embedded traces, video, screenshots | 30 days |
| `test-results` | Raw `trace.zip`, `video.webm`, screenshots per test | 30 days |

View them: Actions tab → click the run → scroll to **Artifacts**.

### CI scaling recipe (when the suite grows)

For sharded parallel runs across N machines, see
[`.github/skills/playwright-test/references/ci.md`](.github/skills/playwright-test/references/ci.md#sharding).

## Locator priority (read this once)

Resilient tests use accessible locators. Pick the highest one that works:

```typescript
// 1. By role — semantic, accessibility-friendly
await page.getByRole('button', { name: 'Login' }).click();

// 2. By label (form fields)
await page.getByLabel('Email').fill('a@b.com');

// 3. By placeholder
await page.getByPlaceholder('Username').fill('user');

// 4. By test ID — uses data-test (this project's choice)
await page.getByTestId('login-button').click();

// 5. By text (read-only content)
await expect(page.getByText('Welcome')).toBeVisible();

// LAST RESORT — CSS/XPath
await page.locator('.login_logo').click();
```

Full reference: [`.github/skills/playwright-test/references/writing-tests.md`](.github/skills/playwright-test/references/writing-tests.md#locator-strategies).

## MCP integration (for AI agents)

[`mcp.json`](mcp.json) registers two browser-controlling MCP servers:

| Server | Use for |
|---|---|
| `microsoft/playwright-mcp` | Drive a real browser interactively (explore pages before writing tests) |
| `io.github.ChromeDevTools/chrome-devtools-mcp` | Performance traces, Lighthouse audits, heap snapshots |

The Playwright MCP runs as a Chrome extension companion (`--extension` flag)
so it controls your actual Chrome, not a headless one.

Full guide:
[`.github/skills/playwright-test/references/mcp.md`](.github/skills/playwright-test/references/mcp.md).

## Claude Code skill

A modular Playwright skill ships in this repo at
[`.github/skills/playwright-test/`](.github/skills/playwright-test/). It
knows this project's conventions and references can be loaded on demand
when an agent needs them.

| File | Topic |
|---|---|
| [`SKILL.md`](.github/skills/playwright-test/SKILL.md) | Entry point — when to load each reference |
| [`references/writing-tests.md`](.github/skills/playwright-test/references/writing-tests.md) | Locators, assertions, structure, anti-patterns |
| [`references/advanced-config.md`](.github/skills/playwright-test/references/advanced-config.md) | Every `playwright.config.ts` option that matters |
| [`references/cli.md`](.github/skills/playwright-test/references/cli.md) | Full CLI reference + recipes |
| [`references/mcp.md`](.github/skills/playwright-test/references/mcp.md) | Playwright MCP + Chrome DevTools MCP workflows |
| [`references/fixtures.md`](.github/skills/playwright-test/references/fixtures.md) | Fixture system, scopes, composition |
| [`references/network.md`](.github/skills/playwright-test/references/network.md) | Route interception, mocking, HAR replay |
| [`references/auth.md`](.github/skills/playwright-test/references/auth.md) | Auth strategies from slowest to fastest |
| [`references/debugging.md`](.github/skills/playwright-test/references/debugging.md) | Trace viewer, UI mode, Inspector, flake hunting |
| [`references/ci.md`](.github/skills/playwright-test/references/ci.md) | GitHub Actions, GitLab, sharding, Docker |
| [`references/reporters.md`](.github/skills/playwright-test/references/reporters.md) | HTML, JUnit, JSON, custom reporters |

> Note: `.github/skills/` is not auto-discovered by Claude Code. To make
> it trigger automatically, move the folder to `.claude/skills/`. See the
> [skill's README](.github/skills/playwright-test/README.md) for details.

## Common tasks — recipes

### Add a new test for a page

1. Use Playwright MCP to explore: `browser_navigate('/path')`, then `browser_snapshot()`
2. Identify the locators (prefer `data-test`, then role)
3. Write the spec under `tests/<feature>/<name>.spec.ts`
4. Run: `npx playwright test tests/<feature>/<name>.spec.ts --project=chromium`

Worked example: open [login.spec.ts](tests/saucedemo/login.spec.ts).

### Debug a failing test

```bash
# 1. Reproduce locally with verbose output
npx playwright test -g "name" --project=chromium --retries=0 --reporter=line

# 2. If it failed, open the trace
make trace FILE=test-results/<test-name>/trace.zip

# 3. Still stuck? Step through it
npm run test:debug -- -g "name"
```

Full guide: [`debugging.md`](.github/skills/playwright-test/references/debugging.md).

### Add network mocking to a test

```typescript
test('handles API error', async ({ page }) => {
  await page.route('**/api/checkout', route =>
    route.fulfill({ status: 500, body: 'Server error' })
  );

  await page.goto('/checkout');
  await expect(page.getByText('Something went wrong')).toBeVisible();
});
```

See [network.cookbook.ts](tests/saucedemo/network.cookbook.ts) for 6 patterns.

### Speed up the suite by sharing auth

```typescript
// playwright.config.ts
projects: [
  { name: 'setup', testMatch: /global\.setup\.ts/ },
  {
    name: 'authenticated',
    dependencies: ['setup'],
    use: { storageState: 'playwright/.auth/user.json' },
  },
]
```

See [auth.cookbook.ts](tests/saucedemo/auth.cookbook.ts) and
[`auth.md`](.github/skills/playwright-test/references/auth.md).

## Conventions in this repo

- **Spec files end with `.spec.ts`** — picked up by the runner
- **Cookbook files end with `.cookbook.ts`** — runnable examples (also picked up; exclude via `testIgnore` if undesired)
- **Test IDs use `data-test`** (not `data-testid`) — `testIdAttribute: 'data-test'`
- **Always `await` web-first assertions** — they auto-retry
- **No `page.waitForTimeout()`** — use `expect.poll` or wait for the actual condition
- **One feature per spec file** — `auth/login.spec.ts`, not `auth.spec.ts`
- **Test data lives next to its spec** — see `users.ts` next to `login.spec.ts`

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Element not attached to the DOM` | Cached element reference; DOM re-rendered | Use locators directly — don't cache `.$()` results |
| `Test timeout exceeded` | Test took > 60s | Add `test.setTimeout(120_000)` or optimize the test |
| `Cannot find name 'test'` | Used `test()` after `const test = base.extend(...)` (TDZ) | Use `base(...)` for tests outside the extended fixture, or move `extend` earlier |
| `routeOnce is not a function` | Old API — Playwright unified this | Use `page.route(url, handler, { times: 1 })` |
| HTML report won't open in CI | `open: 'always'` triggers `xdg-open` | In config: `open: process.env.CI ? 'never' : 'always'` |
| Suspicious flake — passes locally, fails on CI | Race condition exposed by faster CI machine | Wait for the actual condition: `await expect(loc).toBeVisible()` |

More: [`debugging.md → common failure modes`](.github/skills/playwright-test/references/debugging.md#common-failure-modes).

## Learn more

Order if you're new:

1. **This README** — orientation
2. **[login.spec.ts](tests/saucedemo/login.spec.ts)** — see a real test
3. **[inline-config.cookbook.ts](tests/saucedemo/inline-config.cookbook.ts)** — what you can pass inline
4. **[assertions.cookbook.ts](tests/saucedemo/assertions.cookbook.ts)** — how to assert things
5. **[fixtures.cookbook.ts](tests/saucedemo/fixtures.cookbook.ts)** — the fixture system
6. **[network.cookbook.ts](tests/saucedemo/network.cookbook.ts)** — mock the network
7. **[auth.cookbook.ts](tests/saucedemo/auth.cookbook.ts)** — skip the login UI
8. **[page-objects.cookbook.ts](tests/saucedemo/page-objects.cookbook.ts)** — scale to a real app
9. **[skill references](.github/skills/playwright-test/)** — deep dives by topic
