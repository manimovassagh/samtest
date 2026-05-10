# Network Reference

Route interception, request inspection, response mocking, HAR recording.
Cookbook with runnable examples: `tests/saucedemo/network.cookbook.ts`.

## Contents

1. [Mental model](#mental-model)
2. [page.route — register an interceptor](#pageroute)
3. [Route actions](#route-actions)
4. [Matching patterns](#matching-patterns)
5. [Times limit (replaces routeOnce)](#times-limit)
6. [Modifying real responses](#modifying-real-responses)
7. [Asserting requests were made](#asserting-requests-were-made)
8. [HAR recording and replay](#har-recording-and-replay)
9. [Context-level routes](#context-level-routes)
10. [Patterns](#patterns)

---

## Mental model

```
   Browser              page.route handler           Real server
      |                        |                          |
      |  request               |                          |
      |----------------------->|                          |
      |                        |  one of:                 |
      |                        |   • fulfill (mock)       |
      |                        |   • abort                |
      |                        |   • continue --------->  |
      |                        |   • fetch + fulfill <--  |
      |  response              |                          |
      |<-----------------------|<-------------------------|
```

`page.route(pattern, handler)` registers an interceptor. The handler MUST call
one of: `route.fulfill`, `route.abort`, `route.continue`, or `route.fetch + route.fulfill`.
Otherwise the request hangs.

## page.route

```typescript
await page.route(urlPattern, handler, { times: N });
```

Registered BEFORE the request happens. Subsequent requests matching the pattern
go through the handler instead of straight to the network.

```typescript
// Register before navigation
await page.route('**/api/users', route => {
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([{ id: 1, name: 'Alice' }]),
  });
});

await page.goto('/users');
// All requests to **/api/users return the mock
```

## Route actions

```typescript
// 1. fulfill — respond with mock data
await route.fulfill({
  status: 200,
  contentType: 'application/json',
  headers: { 'X-Custom': 'value' },
  body: JSON.stringify({ ok: true }),
  // OR
  path: 'fixtures/users.json',          // read body from file
});

// 2. abort — simulate network failure
await route.abort();                     // generic failure
await route.abort('failed');             // specific error code
await route.abort('timedout');
await route.abort('aborted');
await route.abort('blockedbyclient');
await route.abort('connectionrefused');

// 3. continue — pass through unchanged
await route.continue();

// 3a. continue with modifications
await route.continue({
  url: 'https://different-url.com',
  method: 'POST',
  postData: JSON.stringify({ modified: true }),
  headers: { ...route.request().headers(), 'X-Injected': 'true' },
});

// 4. fetch + fulfill — make real request, then alter response
const response = await route.fetch();
const body = await response.json();
await route.fulfill({
  response,
  body: JSON.stringify({ ...body, injected: true }),
});
```

## Matching patterns

```typescript
// Glob patterns (most common)
await page.route('**/api/**', handler);             // any /api/* path
await page.route('**/*.{png,jpg,gif}', handler);     // any image
await page.route('https://api.example.com/**', h);   // specific origin

// Regex
await page.route(/.*\/users\/\d+/, handler);

// Predicate function — full control
await page.route(
  url => url.pathname.startsWith('/api') && url.searchParams.has('debug'),
  handler
);
```

The pattern matches the FULL URL by default. If `baseURL` is set, relative
glob patterns like `'/api/users'` work too.

## Times limit

Replace the old `routeOnce` with `{ times: N }`:

```typescript
// Handler fires once then auto-removes
await page.route('**/api/data', handler, { times: 1 });

// Handle the first 3 requests, then pass through
await page.route('**/api/data', handler, { times: 3 });
```

Useful for: simulating a failing request that succeeds after retry, mocking
a paginated load where only the first page is mocked.

## Modifying real responses

Inject headers, modify JSON, redact secrets — without writing a fake response:

```typescript
await page.route('**/api/user', async route => {
  const response = await route.fetch();
  const json = await response.json();

  await route.fulfill({
    response,
    body: JSON.stringify({
      ...json,
      email: 'redacted@example.com',
    }),
  });
});
```

## Asserting requests were made

```typescript
// Wait for a matching request (race-safe)
const requestPromise = page.waitForRequest('**/api/login');
await page.getByTestId('login-button').click();
const request = await requestPromise;

expect(request.method()).toBe('POST');
expect(request.postDataJSON()).toEqual({ username: 'standard_user' });

// Wait for a response
const responsePromise = page.waitForResponse(
  r => r.url().includes('/api/login') && r.status() === 200
);
await page.getByTestId('login-button').click();
const response = await responsePromise;
expect(await response.json()).toMatchObject({ token: expect.any(String) });

// Passive collection — record all requests
const requests: string[] = [];
page.on('request', r => requests.push(r.url()));
// ... do stuff
expect(requests).toContain('https://api.example.com/users');
```

## HAR recording and replay

A HAR file is a complete recording of network activity. Use it to:

1. **Record** real traffic once
2. **Replay** in subsequent test runs without hitting the network

### Recording

```typescript
// In playwright.config.ts or test.use()
use: {
  recordHar: { path: 'fixtures/api.har', mode: 'minimal' },
}
```

### Replaying

```typescript
test('replays from HAR', async ({ page }) => {
  await page.routeFromHAR('fixtures/api.har', {
    url: '**/api/**',         // only mock API calls; everything else hits the network
    update: false,            // false = replay only; true = update on miss
  });

  await page.goto('/');
});
```

`update: true` re-records on cache miss — useful for refreshing fixtures.

## Context-level routes

Apply to ALL pages in the context (multi-page tests):

```typescript
await context.route('**/analytics/**', route => route.abort());
// Every page created from this context blocks analytics calls
```

## Patterns

### Block third-party trackers

```typescript
test.beforeEach(async ({ context }) => {
  await context.route(/.*(google-analytics|hotjar|segment|amplitude).*/, route =>
    route.abort()
  );
});
```

### Force a specific feature flag

```typescript
await page.route('**/api/config', async route => {
  const response = await route.fetch();
  const config = await response.json();
  await route.fulfill({
    response,
    body: JSON.stringify({ ...config, features: { ...config.features, newCheckout: true } }),
  });
});
```

### Simulate a slow API

```typescript
await page.route('**/api/**', async route => {
  await new Promise(r => setTimeout(r, 2000));
  await route.continue();
});
```

### Test retry behavior — fail once, then succeed

```typescript
let calls = 0;
await page.route('**/api/data', route => {
  calls++;
  if (calls === 1) return route.abort('failed');
  return route.continue();
});
// Trigger the action — UI should retry and succeed on call #2
```

### Capture API response for assertion

```typescript
const userResponse = page.waitForResponse('**/api/me');
await page.goto('/profile');
const response = await userResponse;
const user = await response.json();
expect(user.email).toBe('user@example.com');
```

### Inspect request headers (e.g. verify auth header)

```typescript
const requestPromise = page.waitForRequest('**/api/protected');
await page.click('button');
const req = await requestPromise;
expect(req.headers()['authorization']).toMatch(/^Bearer /);
```

## Common mistakes

| Mistake | Fix |
|---|---|
| Registering `route` AFTER the request fires | Register before `goto` / `click` that triggers it |
| Handler returns without calling fulfill/abort/continue | Always end with one of those — otherwise request hangs |
| Trying to use `routeOnce` (doesn't exist in modern Playwright) | Use `route(..., handler, { times: 1 })` |
| `fulfill` with object body instead of string | Stringify JSON: `body: JSON.stringify({...})` |
| Forgetting `contentType` for JSON | Add `contentType: 'application/json'` or browsers may misinterpret |
| Asserting via `page.on('request', ...)` after the action | Use `waitForRequest` BEFORE the action — race-safe |
