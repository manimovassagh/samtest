---
title: Network
sidebar_position: 4
---

# Network — route mocking and inspection

Source: [`tests/saucedemo/network.cookbook.ts`](https://github.com/manimovassagh/samtest/blob/main/tests/saucedemo/network.cookbook.ts)

## Mental model

`page.route(pattern, handler)` registers an interceptor. Matching requests
go through your handler instead of straight to the network. The handler
MUST call one of `route.fulfill`, `route.abort`, `route.continue`, or
`route.fetch + route.fulfill` — otherwise the request hangs.

## Block requests

```typescript
test('block images', async ({ page }) => {
  await page.route('**/*.{png,jpg,gif,webp,svg}', route => route.abort());
  await page.goto('/');
});

test('simulate failure', async ({ page }) => {
  await page.route('**/api/payment', route => route.abort('failed'));
  // ...
});
```

## Mock with fulfill

```typescript
test('mock API response', async ({ page }) => {
  await page.route('**/api/inventory', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 1, name: 'Mock product' }]),
    })
  );

  await page.goto('/');
});
```

## Simulate slow network

```typescript
test('slow API', async ({ page }) => {
  await page.route('**/*', async route => {
    await new Promise(r => setTimeout(r, 1000));
    await route.continue();
  });
  await page.goto('/');
});
```

## Modify real responses

Make the real request, then alter what comes back:

```typescript
test('inject custom header', async ({ page }) => {
  await page.route('**/*', async route => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: { ...response.headers(), 'x-injected': 'true' },
    });
  });
  await page.goto('/');
});

test('augment JSON response', async ({ page }) => {
  await page.route('**/api/me', async route => {
    const response = await route.fetch();
    const body = await response.json();
    await route.fulfill({
      response,
      body: JSON.stringify({ ...body, featureFlag: true }),
    });
  });
});
```

## Assert requests are made

```typescript
test('verify login API call', async ({ page }) => {
  await page.goto('/');

  const requestPromise = page.waitForRequest('**/api/login');
  await page.getByTestId('login-button').click();
  const request = await requestPromise;

  expect(request.method()).toBe('POST');
  expect(request.postDataJSON()).toMatchObject({ username: 'standard_user' });
});

test('verify response', async ({ page }) => {
  const responsePromise = page.waitForResponse(
    r => r.url().includes('/api/me') && r.status() === 200
  );
  await page.goto('/profile');
  const response = await responsePromise;
  expect((await response.json()).email).toMatch(/@/);
});
```

## Match-once with `{ times: N }`

The old `routeOnce` API has been unified. Use `{ times }`:

```typescript
test('first call fails, retry succeeds', async ({ page }) => {
  await page.route('**/api/data', route => route.abort('failed'), { times: 1 });
  await page.goto('/'); // UI retries; the retry hits the real network
});
```

## Patterns to know

| Need | Pattern |
|---|---|
| Block trackers | `context.route(/analytics|hotjar|segment/, r => r.abort())` |
| Force a feature flag | Fetch real, inject into JSON body |
| Test retry behavior | `{ times: 1 }` + abort → next call passes through |
| Capture an API body | `page.waitForResponse('**/api/x').then(r => r.json())` |
| Replay recorded traffic | `page.routeFromHAR('fixtures.har', { url: '**/api/**' })` |

## Anti-patterns

| Don't | Why |
|---|---|
| Register `route` AFTER the action | The request fires before your handler is installed |
| Handler that doesn't call fulfill/abort/continue | Request hangs forever |
| `body: { json: true }` (object) | Must be a string — use `JSON.stringify(...)` |
| `page.on('request', ...)` to assert a request was made | Race condition — use `waitForRequest` BEFORE the action |

## Deep dive

For HAR recording/playback, context-level routes, and request modification
recipes: **[Network Reference](../reference/network)**.
