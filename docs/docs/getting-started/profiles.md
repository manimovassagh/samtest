---
title: Test Profiles
sidebar_position: 3
---

# Test Profiles — smoke / core / full

The repo defines three profiles via tagged tests + project filtering. Use
them to scale test coverage to context: PR feedback gets a fast smoke run,
nightly gets the full regression.

## At a glance

| Profile | Users | Command | When to run |
|---|---|---|---|
| `@smoke` | 1 (`standard_user`) | `make test-smoke` | Every PR — fastest sanity check |
| `@core`  | 2 (+ `locked_out_user`) | `make test-core` | Adds main error path — nightly |
| `@full`  | 6 (all SauceDemo users) | `make test-full` | Pre-release regression |

## How it works

Each test in [`login.spec.ts`](https://github.com/manimovassagh/samtest/blob/main/tests/saucedemo/login.spec.ts)
inherits a `tag` from its user data:

```typescript
test.describe('Login — profiles (@smoke / @core / @full)', () => {
  for (const user of profileUsers) {
    test(`${user.username} — ${user.description}`,
         { tag: user.tags },           // ← inherits ['@smoke'], ['@smoke','@core'], etc.
         async ({ page }) => { /* ... */ });
  }
});
```

User tags live in [`tests/saucedemo/users.ts`](https://github.com/manimovassagh/samtest/blob/main/tests/saucedemo/users.ts):

```typescript
export const profileUsers: ProfileUser[] = [
  { username: 'standard_user',  tags: ['@smoke', '@core', '@full'], /* ... */ },
  { username: 'locked_out_user', tags: ['@core', '@full'],          /* ... */ },
  { username: 'problem_user',    tags: ['@full'],                    /* ... */ },
  // ...
];
```

Project filtering in [`playwright.config.ts`](https://github.com/manimovassagh/samtest/blob/main/playwright.config.ts):

```typescript
projects: [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'smoke', grep: /@smoke/, use: { ...devices['Desktop Chrome'] } },
  { name: 'core',  grep: /@core/,  use: { ...devices['Desktop Chrome'] } },
  { name: 'full',  grep: /@full/,  use: { ...devices['Desktop Chrome'] } },
]
```

Running `npm run test:smoke` selects the `smoke` project, which only runs
tests tagged `@smoke`.

## Adding tests to profiles

Tag a test inline:

```typescript
test('checkout happy path', { tag: '@smoke' }, async ({ page }) => {
  // ...
});

test('promo code expired error', { tag: ['@core', '@full'] }, async ({ page }) => {
  // ...
});
```

Or tag a whole suite:

```typescript
test.describe('Mobile checkout', { tag: '@full' }, () => {
  test('on iPhone', async ({ page }) => { /* ... */ });
  test('on Android', async ({ page }) => { /* ... */ });
});
```

## When to add a new profile

Profiles are projects with a `grep` filter — adding one is trivial:

```typescript
// playwright.config.ts
projects: [
  // ... existing ...
  { name: 'mobile', grep: /@mobile/, use: { ...devices['Pixel 5'] } },
]
```

Then in `package.json`:

```json
"test:mobile": "playwright test --project=mobile"
```

Reasons to add one:
- A subset of tests that need different config (mobile viewport, slow network)
- A nightly-only set (slow visual regression, integration with paid services)
- A separate environment (staging vs production)

## Profile vs `--grep`

Both work. The difference:

| Approach | Pros | Cons |
|---|---|---|
| Project (`--project=smoke`) | Different config per profile; CI-friendly | Requires config change to add new ones |
| CLI grep (`--grep "@smoke"`) | Ad-hoc, no config needed | All tests share the same config |

For long-lived sets that need their own config (timeouts, browser,
storageState), use projects. For one-off filtering, use `--grep`.
