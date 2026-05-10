# Debugging Reference

Five tools for figuring out why a test is failing. Use them in this order.

## Contents

1. [Decision tree — which tool first](#decision-tree)
2. [UI mode (best for development)](#ui-mode)
3. [Trace viewer (best for CI failures)](#trace-viewer)
4. [HTML report](#html-report)
5. [Playwright Inspector / PWDEBUG=1](#inspector)
6. [VS Code extension](#vs-code-extension)
7. [Diagnosing flaky tests](#diagnosing-flaky-tests)
8. [Common failure modes](#common-failure-modes)

---

## Decision tree

```
Is the test failing right now in your terminal?
├─ Yes → UI mode (`npm run test:ui`) — fastest iteration
│
Did the test fail in CI?
├─ Yes → Trace viewer on the trace.zip artifact
│
Is the test sometimes passing, sometimes failing?
├─ Yes → Flake debugging (see section below)
│
Is the test hung / not finishing?
└─ Yes → PWDEBUG=1 with breakpoints, or check for un-awaited promises
```

## UI mode

```bash
npm run test:ui                          # or: npx playwright test --ui
```

This is the most powerful debug interface. Features:

- **Watch mode** — re-runs tests on file save
- **Time-travel** — slider through every action with DOM snapshot at each step
- **Locator picker** — hover any element to get its recommended locator
- **Console + Network tabs** — see what the page did
- **Step debugger** — pick a test, click Step to advance manually
- **Source view** — see your test code highlighting current line

Workflow:
1. Run `npm run test:ui`
2. Filter to the failing test
3. Hit "Run" — observe the failure visually
4. Scrub the timeline to find where it diverged
5. Use the picker to get a better locator if the issue was selector-related

## Trace viewer

For traces produced by CI or past runs:

```bash
npx playwright show-trace test-results/<test-name>/trace.zip
npm run trace                            # this project's helper
```

Or drag the `trace.zip` onto https://trace.playwright.dev (works offline too).

Trace viewer tabs:

| Tab | Shows |
|---|---|
| **Actions** | Every Playwright API call — click, fill, expect, etc. |
| **Console** | Browser console output |
| **Network** | HTTP requests, status, headers, response bodies |
| **Source** | Your test source with the current line highlighted |
| **Errors** | Stack traces |
| **Attachments** | Screenshots, videos, custom attachments |

Each action shows a **before/after** DOM snapshot — you can hover ANY element
in the snapshot and Playwright shows you the locator that would match it.

### Tracing config that this project uses

```typescript
use: { trace: 'on' }   // every test, always
```

For CI, switch to `'on-first-retry'` — only records the retry, saves disk space.

## HTML report

```bash
npm run report                           # opens the last report
# or
npx playwright show-report
```

Click any failed test → expand. You see:

- Error message + stack trace
- All test steps as an expandable tree
- Screenshots at each failed assertion
- Video recording (if `video: 'on'`)
- Trace viewer link (if `trace: 'on'`)

Search bar supports tags: `@smoke`, `@core`, etc.

### Reading the steps tree

Every Playwright API call appears as a step. Failures highlight in red.
Click a step to see exactly which line of your test ran it.

## Inspector

`PWDEBUG=1` mode — pauses before every Playwright action and opens a control
window so you can step manually:

```bash
PWDEBUG=1 npx playwright test login.spec.ts
npm run test:debug                       # this project
```

The Inspector window has:
- **Resume** — continue to next pause point
- **Step Over** — execute one action then pause
- **Record** — append actions to your test as you click
- **Pick Locator** — copy a working locator from the page

### `PWDEBUG=console`

Auto-pauses on `console.log` calls — useful when you want to pause at a
specific point without modifying the test:

```typescript
test('pause here', async ({ page }) => {
  await page.goto('/');
  console.log('paused before clicking login');  // inspector pauses here
  await page.getByTestId('login-button').click();
});
```

### Programmatic pause

```typescript
await page.pause();   // opens Inspector at this exact line
```

Drop this anywhere. Remove before committing.

## VS Code extension

Install: `Playwright Test for VSCode` (Microsoft).

Features:
- Run individual tests by clicking the gutter ▶ icon
- Debug with breakpoints in your test code
- Locator picker integrated into the editor
- Auto-detects `playwright.config.ts`

When you open this project in VS Code, you should see green ▶ icons in the
margin next to every `test(...)` declaration.

## Diagnosing flaky tests

A flaky test passes sometimes, fails other times. Causes ranked by frequency:

1. **Race conditions** — asserting before the UI settled
2. **Network timing** — assuming an API call finished
3. **Animation timing** — interacting with an element that's still animating
4. **Test order dependence** — relying on state from a previous test

### Step 1: reproduce reliably

```bash
# Run the test 10 times in parallel
npx playwright test -g "flaky test name" --repeat-each=10 --workers=4

# Force it to run with retries=0 to expose the flake
npx playwright test -g "name" --retries=0 --repeat-each=20
```

### Step 2: look for race conditions

Bad:
```typescript
await page.getByRole('button', { name: 'Submit' }).click();
const text = await page.getByTestId('result').textContent();  // ← may be empty!
expect(text).toBe('Success');
```

Good:
```typescript
await page.getByRole('button', { name: 'Submit' }).click();
await expect(page.getByTestId('result')).toHaveText('Success');  // ← retries
```

### Step 3: disable animations

```typescript
// playwright.config.ts
use: {
  // applies via `expect(...).toHaveScreenshot({ animations: 'disabled' })`
  // for full disable, inject CSS:
}

// Or in a fixture:
test.extend<{}>({
  page: async ({ page }, use) => {
    await page.addStyleTag({
      content: `*, *::before, *::after { animation: none !important; transition: none !important; }`,
    });
    await use(page);
  },
});
```

### Step 4: check network timing

```typescript
// Wait for the API call before asserting
const responsePromise = page.waitForResponse('**/api/save');
await page.click('button');
await responsePromise;                                        // ← network settled
await expect(page.getByText('Saved')).toBeVisible();
```

## Common failure modes

### "Element is not attached to the DOM"

The element you found has been removed from the DOM between locating and
acting on it. Cause: React re-render, animation, navigation.

Fix: relocate inside the action's auto-retry. Locators are lazy — they
re-resolve on each call. Use a single chained locator instead of caching:

```typescript
// Bad — element reference may be stale
const btn = await page.$('button.submit');
await btn?.click();

// Good — locator re-resolves on each action
await page.getByRole('button', { name: 'Submit' }).click();
```

### "Timeout exceeded while waiting for ..."

Either:
- The selector doesn't match anything → use the locator picker
- The page is genuinely slow → check trace for network/JS time
- Auth missing → check storageState loaded

### "Test timeout exceeded"

The whole test took too long. Either:
- Optimize the test (skip unnecessary navigations)
- Increase timeout for this test: `test.setTimeout(120_000)`
- Or use `test.slow()` to triple it

### "navigation failed because page crashed"

Browser ran out of memory or hit a critical error. Check:
- Memory leak in the app (use Chrome DevTools MCP heap snapshot)
- Infinite loop in JS
- A previous test left the browser in a bad state

### "Page closed"

Something closed the page mid-test. Often a fixture teardown ran early, or
a redirect to a different origin invalidated the context.

## Recommended debug session

```bash
# 1. Reproduce the flake locally
npx playwright test -g "failing test" --repeat-each=20 --retries=0 --workers=4

# 2. When it fails, open the trace
npx playwright show-trace test-results/<test>/trace.zip

# 3. Identify the failing action — read 2 steps before and 2 after
# 4. If still unclear, run with Inspector
PWDEBUG=1 npx playwright test -g "failing test"

# 5. Use page.pause() at the suspected line, step through manually
```
