/**
 * COOKBOOK: Network interception — route mocking, request inspection, throttling
 *
 * page.route(pattern, handler) intercepts matching requests BEFORE they hit
 * the network. You can: fulfill (mock), abort, continue (passthrough), or modify.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │  page.route(url, handler)   — register a route interceptor           │
 * │  route.fulfill(response)    — respond with mock data                  │
 * │  route.abort()              — simulate a network error                │
 * │  route.continue()           — forward request as-is                   │
 * │  route.fetch() + fulfill()  — real request, then modify the response  │
 * │                                                                        │
 * │  page.waitForRequest(url)   — assert a request was made               │
 * │  page.waitForResponse(url)  — wait for a specific response             │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * Run:  npx playwright test network.cookbook.ts --project=chromium
 */

import { test, expect } from '@playwright/test';

const PASSWORD = 'secret_sauce';

async function login(page: any, username = 'standard_user') {
  await page.goto('/');
  await page.getByTestId('username').fill(username);
  await page.getByTestId('password').fill(PASSWORD);
  await page.getByTestId('login-button').click();
  await expect(page).toHaveURL('/inventory.html');
}

// ═══════════════════════════════════════════════════════════════════════════
// PART 1 — Blocking requests
// ═══════════════════════════════════════════════════════════════════════════

// Abort specific request types — useful to test how the UI handles missing assets.
test('block all image requests', async ({ page }) => {
  await page.route('**/*.{png,jpg,jpeg,gif,webp,svg}', route => route.abort());

  await login(page);
  // Inventory page still loads, images just fail silently
  await expect(page.getByTestId('inventory-container')).toBeVisible();
});

// Abort a specific URL pattern to test an error state.
test('simulate script load failure', async ({ page }) => {
  await page.route('**/*.js', route => route.abort('failed'));
  // The page will be broken — useful to verify your error boundary behaviour.
  await page.goto('/');
  // Just checking the page didn't throw an unhandled error that crashes the test.
});


// ═══════════════════════════════════════════════════════════════════════════
// PART 2 — Fulfilling with mock data (no real network request)
// ═══════════════════════════════════════════════════════════════════════════

// Mock a REST API response entirely.
test('mock inventory API response', async ({ page }) => {
  const mockProducts = [
    { id: 1, name: 'Mock Product A', desc: 'A mocked item', price: 9.99, image: '' },
    { id: 2, name: 'Mock Product B', desc: 'Another mock',  price: 19.99, image: '' },
  ];

  await page.route('**/api/inventory', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockProducts),
    })
  );

  await login(page);
  await expect(page.getByTestId('inventory-container')).toBeVisible();
  // Real saucedemo doesn't have a /api/inventory, but this pattern works for apps that do.
});

// Simulate a 500 server error.
test('handle server error gracefully', async ({ page }) => {
  await page.route('**/api/checkout', route =>
    route.fulfill({ status: 500, body: 'Internal Server Error' })
  );

  await page.goto('/');
  // The route is registered — test continues with the rest of the UI flow.
});

// Simulate slow network (artificial delay before fulfilling).
test('simulate slow response', async ({ page }) => {
  await page.route('**/*', async route => {
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1 s delay
    await route.continue();
  });

  await page.goto('/');
  await expect(page.getByTestId('login-button')).toBeVisible();
});


// ═══════════════════════════════════════════════════════════════════════════
// PART 3 — Intercepting and modifying real responses
//           route.fetch() makes the REAL request, then you can alter the response.
// ═══════════════════════════════════════════════════════════════════════════

test('modify response header from real request', async ({ page }) => {
  await page.route('**/*', async route => {
    const response = await route.fetch();         // make the real HTTP request
    await route.fulfill({
      response,                                   // use real status, body, etc.
      headers: {
        ...response.headers(),
        'x-playwright-intercepted': 'true',       // inject a custom header
      },
    });
  });

  await page.goto('/');
  await expect(page.getByTestId('login-button')).toBeVisible();
});

// Modify JSON response body from a real API call.
test('augment real API response', async ({ page }) => {
  await page.route('**/api/some-endpoint', async route => {
    const response = await route.fetch();
    const body = await response.json();

    await route.fulfill({
      response,
      body: JSON.stringify({ ...body, injected: true }),
    });
  });

  await page.goto('/');
});


// ═══════════════════════════════════════════════════════════════════════════
// PART 4 — Asserting that requests were (or weren't) made
// ═══════════════════════════════════════════════════════════════════════════

// waitForRequest resolves when a matching request is dispatched.
test('assert a request is made on login', async ({ page }) => {
  await page.goto('/');

  const requestPromise = page.waitForRequest(req =>
    req.url().includes('saucedemo.com') && req.method() === 'GET'
  );

  await page.getByTestId('username').fill('standard_user');
  await page.getByTestId('password').fill(PASSWORD);
  await page.getByTestId('login-button').click();

  const request = await requestPromise;
  expect(request.method()).toBe('GET');
});

// waitForResponse resolves when a matching response arrives.
test('assert a response status after navigation', async ({ page }) => {
  const responsePromise = page.waitForResponse(
    res => res.url().includes('saucedemo.com') && res.status() === 200
  );

  await page.goto('/');
  const response = await responsePromise;
  expect(response.status()).toBe(200);
});

// Count how many requests were made.
test('count requests made during login', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', req => requests.push(req.url()));

  await login(page);

  console.log(`Login made ${requests.length} requests`);
  expect(requests.length).toBeGreaterThan(0);
});


// ═══════════════════════════════════════════════════════════════════════════
// PART 5 — Route once vs every request
//
// route() matches every request by default.
// route.once() matches only the NEXT matching request then removes itself.
// ═══════════════════════════════════════════════════════════════════════════

test('route.once — only intercepts first matching request', async ({ page }) => {
  let callCount = 0;

  // This will only fire once — subsequent requests to '/' pass through normally.
  await page.routeOnce('**/', route => {
    callCount++;
    route.continue();
  });

  await page.goto('/');
  await page.reload();  // second navigation — routeOnce already removed itself

  expect(callCount).toBe(1);
});


// ═══════════════════════════════════════════════════════════════════════════
// PART 6 — Unregistering routes
// ═══════════════════════════════════════════════════════════════════════════

test('unroute when mock is no longer needed', async ({ page }) => {
  const handler = (route: any) => route.fulfill({ status: 200, body: 'mocked' });

  await page.route('**/api/endpoint', handler);
  // ... do something with the mock ...
  await page.unroute('**/api/endpoint', handler); // remove only this handler

  await page.goto('/');
  await expect(page.getByTestId('login-button')).toBeVisible();
});
