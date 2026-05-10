---
title: Assertions
sidebar_position: 5
---

# Assertions

Source: [`tests/saucedemo/assertions.cookbook.ts`](https://github.com/manimovassagh/samtest/blob/main/tests/saucedemo/assertions.cookbook.ts)

Playwright's `expect()` is NOT the same as Jest's. **Web-first assertions
automatically retry** until the condition is true or the assertion timeout
expires. Never add manual waits before them.

## Always `await`

```typescript
// ✅ Auto-retries until visible (or timeout)
await expect(page.getByTestId('error')).toBeVisible();

// ❌ Returns a Promise that may resolve too early
expect(page.getByTestId('error')).toBeVisible();
```

## Locator state

```typescript
await expect(loc).toBeVisible();
await expect(loc).toBeHidden();
await expect(loc).toBeEnabled();
await expect(loc).toBeDisabled();
await expect(loc).toBeEditable();
await expect(loc).toBeFocused();
await expect(loc).toBeChecked();
await expect(loc).toBeInViewport();
```

## Content

```typescript
await expect(loc).toHaveText('exact');
await expect(loc).toHaveText(/regex/);
await expect(loc).toContainText('substring');
await expect(loc).toHaveValue('input value');
await expect(loc).toHaveAttribute('href', '/path');
await expect(loc).toHaveClass(/active/);
await expect(loc).toHaveCount(3);
```

## Page

```typescript
await expect(page).toHaveURL(/dashboard/);
await expect(page).toHaveTitle('Page Title');
```

## Soft assertions

Collect all failures without bailing on the first:

```typescript
test('check multiple things', async ({ page }) => {
  await page.goto('/');

  await expect.soft(page.getByTestId('login-button')).toBeVisible();
  await expect.soft(page.getByTestId('login-button')).toHaveText('Login');
  await expect.soft(page.getByTestId('username')).toBeVisible();

  // Hard assertion still gates pass/fail
  await expect(page.getByTestId('login-logo')).toBeVisible();
});
```

## `expect.poll` — retry any async expression

Not just locators. Useful for API calls, counters, external state:

```typescript
await expect.poll(async () => {
  const response = await fetch('https://api.example.com/status');
  return (await response.json()).ready;
}, {
  message: 'API never reported ready',
  timeout: 5_000,
  intervals: [500, 1000, 2000],
}).toBe(true);
```

## Custom timeout

```typescript
await expect(loc).toBeVisible({ timeout: 10_000 });
await expect(loc).not.toBeVisible({ timeout: 1_000 });  // negate quickly
```

## Custom matchers

Add domain-specific matchers so tests read like the business:

```typescript
expect.extend({
  async toShowLoginError(page: any, expectedMessage: string) {
    const error = page.getByTestId('error');
    const isVisible = await error.isVisible();
    if (!isVisible) {
      return { pass: false, message: () => 'Expected login error to be visible' };
    }
    const text = await error.textContent();
    const matches = text?.includes(expectedMessage) ?? false;
    return {
      pass: matches,
      message: () => matches
        ? `Expected error NOT to contain "${expectedMessage}"`
        : `Expected error to contain "${expectedMessage}", got "${text}"`,
    };
  },
});

// In a test:
await (expect(page) as any).toShowLoginError('locked out');
```

## ARIA snapshots — accessibility tree assertion

Pin down the structure of a region without coupling to CSS:

```typescript
await expect(page.locator('form')).toMatchAriaSnapshot(`
  - textbox "Username"
  - textbox "Password"
  - button "Login"
`);
```

## Visual snapshots

```typescript
await expect(page).toHaveScreenshot('login-page.png', {
  maxDiffPixelRatio: 0.01,
});
```

First run creates the baseline. Update with `npx playwright test --update-snapshots`.

## Anti-patterns

| Don't | Do |
|---|---|
| `expect(await loc.textContent()).toBe('x')` | `await expect(loc).toHaveText('x')` |
| `if (await loc.isVisible()) {...}` | `await expect(loc).toBeVisible()` |
| `try/catch` to detect absence | `await expect(loc).not.toBeVisible()` |
| `await page.waitForTimeout(1000)` then assert | Web-first assertions already wait |
| Storing `await loc.elementHandle()` then asserting | Use the locator — it re-resolves on each call |
