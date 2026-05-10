# CI Integration Reference

Running Playwright in CI/CD systems with reliability, speed, and good reports.

## Contents

1. [Universal CI principles](#universal-ci-principles)
2. [GitHub Actions](#github-actions)
3. [GitLab CI](#gitlab-ci)
4. [CircleCI](#circleci)
5. [Sharding for speed](#sharding)
6. [Docker / container runs](#docker)
7. [Browser caching](#browser-caching)
8. [Failure artifacts](#failure-artifacts)
9. [Branching strategy](#branching-strategy)

---

## Universal CI principles

```typescript
// playwright.config.ts — CI-aware defaults
export default defineConfig({
  forbidOnly: !!process.env.CI,                  // fail if test.only leaks in
  retries: process.env.CI ? 2 : 0,               // CI tolerates flakes; dev doesn't
  workers: process.env.CI ? 1 : undefined,       // serial on CI for stability — or shard instead
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }], ['junit', { outputFile: 'results.xml' }]]
    : [['list'], ['html', { open: 'on-failure' }]],
  use: {
    headless: !!process.env.CI,
    trace: process.env.CI ? 'on-first-retry' : 'on',
    screenshot: process.env.CI ? 'only-on-failure' : 'on',
    video: process.env.CI ? 'retain-on-failure' : 'on',
  },
});
```

Why these defaults:
- `forbidOnly` — `test.only(...)` accidentally committed = entire suite skipped
- `retries: 2` — covers genuine flakes without hiding real bugs (retries SHOW in report)
- `trace: 'on-first-retry'` — costs nothing on green runs, full visibility on flakes
- `workers: 1` here is a placeholder — for real speed, shard instead (see below)

## GitHub Actions

Reference: https://github.com/microsoft/playwright

```yaml
# .github/workflows/playwright.yml
name: Playwright Tests
on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run Playwright tests
        run: npx playwright test
        env:
          CI: true

      - name: Upload Playwright report
        if: ${{ !cancelled() }}
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 14

      - name: Upload test results (for trace download)
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: test-results/
          retention-days: 7
```

### With GitHub annotations

The `['github']` reporter creates inline annotations on failed lines — appears
in PR Files view as red squiggles:

```typescript
reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
```

## GitLab CI

```yaml
# .gitlab-ci.yml
stages: [test]

playwright:
  stage: test
  image: mcr.microsoft.com/playwright:v1.59.1-jammy
  cache:
    paths:
      - node_modules/
  script:
    - npm ci
    - npx playwright test
  artifacts:
    when: always
    paths:
      - playwright-report/
      - test-results/
    reports:
      junit: results.xml
    expire_in: 1 week
```

The official `mcr.microsoft.com/playwright:v1.X.Y-jammy` image has browsers
pre-installed — no `npx playwright install` needed.

## CircleCI

```yaml
# .circleci/config.yml
version: 2.1
jobs:
  playwright:
    docker:
      - image: mcr.microsoft.com/playwright:v1.59.1-jammy
    steps:
      - checkout
      - restore_cache:
          keys: [v1-deps-{{ checksum "package-lock.json" }}]
      - run: npm ci
      - save_cache:
          paths: [node_modules]
          key: v1-deps-{{ checksum "package-lock.json" }}
      - run: npx playwright test
      - store_artifacts:
          path: playwright-report
      - store_test_results:
          path: results.xml

workflows:
  test:
    jobs: [playwright]
```

## Sharding

The big win for CI speed. Split tests across N machines.

### Setup

```yaml
# .github/workflows/playwright.yml
jobs:
  test:
    strategy:
      fail-fast: false
      matrix:
        shard: [1/4, 2/4, 3/4, 4/4]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'npm' }
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test --shard=${{ matrix.shard }}
        env: { CI: true }

      - name: Upload blob report
        if: ${{ !cancelled() }}
        uses: actions/upload-artifact@v4
        with:
          name: blob-report-${{ strategy.job-index }}
          path: blob-report
          retention-days: 1

  merge-reports:
    if: ${{ !cancelled() }}
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'npm' }
      - run: npm ci

      - name: Download blob reports
        uses: actions/download-artifact@v4
        with:
          path: all-blob-reports
          pattern: blob-report-*
          merge-multiple: true

      - name: Merge into HTML report
        run: npx playwright merge-reports --reporter=html ./all-blob-reports

      - name: Upload merged report
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report
          retention-days: 14
```

### Switch the reporter to blob

```typescript
reporter: process.env.CI ? [['blob']] : [['list'], ['html']],
```

Blob reports are intermediate — `playwright merge-reports` combines them into
one HTML report after all shards complete.

### Choosing shard count

Rule of thumb: total runtime / target runtime, rounded up. Diminishing returns
past ~8 shards due to per-shard startup overhead.

## Docker

### Official image (fastest start)

```bash
docker run --rm -v $(pwd):/work -w /work \
  mcr.microsoft.com/playwright:v1.59.1-jammy \
  bash -c "npm ci && npx playwright test"
```

Tags:
- `v1.X.Y-jammy` — Ubuntu 22.04 (most common)
- `v1.X.Y-focal` — Ubuntu 20.04 (older)
- `v1.X.Y-noble` — Ubuntu 24.04 (newest)

### Custom Dockerfile

```dockerfile
FROM mcr.microsoft.com/playwright:v1.59.1-jammy
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
CMD ["npx", "playwright", "test"]
```

## Browser caching

If you don't use the official image, cache the browser download:

```yaml
- name: Cache Playwright browsers
  uses: actions/cache@v4
  with:
    path: ~/.cache/ms-playwright
    key: playwright-${{ hashFiles('package-lock.json') }}

- name: Install Playwright
  run: npx playwright install --with-deps
```

`~/.cache/ms-playwright` is where Playwright downloads browsers by default.
Override with `PLAYWRIGHT_BROWSERS_PATH=...` if you need a different location.

## Failure artifacts

### Trace.zip is the most valuable artifact

```yaml
- name: Upload failure artifacts
  if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: playwright-failures
    path: |
      test-results/
      playwright-report/
    retention-days: 7
```

Download from the workflow run page, then:

```bash
npx playwright show-trace path/to/trace.zip
```

### Slack / Teams notification on failure

```yaml
- name: Notify Slack on failure
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    payload: '{"text":"Playwright tests failed on ${{ github.ref }}"}'
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

## Branching strategy

For monorepos / large suites:

```yaml
# Run smoke tests on every PR (fast feedback)
on:
  pull_request:
    branches: [main]
jobs:
  smoke:
    runs-on: ubuntu-latest
    steps:
      - run: npx playwright test --project=smoke

# Run full suite nightly + on main
on:
  schedule: [{ cron: '0 2 * * *' }]
  push:
    branches: [main]
jobs:
  full:
    strategy:
      matrix:
        shard: [1/4, 2/4, 3/4, 4/4]
    steps:
      - run: npx playwright test --project=full --shard=${{ matrix.shard }}
```

This project's `@smoke` / `@core` / `@full` projects are designed for exactly
this — smoke runs in ~30s, full in several minutes.

## CI checklist

Before pushing a CI workflow:

- [ ] `forbidOnly: !!process.env.CI`
- [ ] `retries: 2` (not too many — hides real flakes)
- [ ] `reporter: 'github'` (or blob if sharding)
- [ ] `--with-deps` flag on `playwright install`
- [ ] HTML report uploaded as artifact (with `if: !cancelled()`)
- [ ] `trace: 'on-first-retry'` (not `'on'` — disk space)
- [ ] `headless: true` (default in CI but be explicit)
- [ ] Browser cache OR official Docker image (not both)
- [ ] Timeout > expected runtime × 1.5
- [ ] `.gitignore` includes `test-results/`, `playwright-report/`, `playwright/.auth/`
