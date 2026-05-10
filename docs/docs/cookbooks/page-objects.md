---
title: Page Objects
sidebar_position: 7
---

# Page Object Model

Source: [`tests/saucedemo/page-objects.cookbook.ts`](https://github.com/manimovassagh/samtest/blob/main/tests/saucedemo/page-objects.cookbook.ts)

Page Objects encapsulate **how** to interact with a page. Tests describe
**what** to do. This removes duplication and makes tests resilient to UI
changes — update the selector in one place, not everywhere.

## Design rules

1. Page objects receive `page` from the test — never create pages
2. Methods return the next page object when navigation happens
3. No assertions inside page objects (some teams allow them; this repo doesn't)
4. Expose meaningful actions, not raw locators

## Basic page object

```typescript
class LoginPage {
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton:   Locator;
  readonly errorMessage:  Locator;

  constructor(private readonly page: Page) {
    this.usernameInput = page.getByTestId('username');
    this.passwordInput = page.getByTestId('password');
    this.loginButton   = page.getByTestId('login-button');
    this.errorMessage  = page.getByTestId('error');
  }

  async goto() {
    await this.page.goto('/');
  }

  // Returns InventoryPage because successful login navigates there
  async loginAs(username: string): Promise<InventoryPage> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill('secret_sauce');
    await this.loginButton.click();
    return new InventoryPage(this.page);
  }

  async expectError(message: string) {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.errorMessage).toContainText(message);
  }
}
```

## Chaining page objects

```typescript
test('add items to cart', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();

  const inventory = await loginPage.loginAs('standard_user');
  await inventory.assertLoaded();

  await inventory.addToCartByName('Sauce Labs Backpack');
  expect(await inventory.cartCount()).toBe(1);

  const cart = await inventory.goToCart();
  await cart.assertLoaded();
  expect(await cart.itemCount()).toBe(1);
});
```

## Component objects

For reusable UI sections (header, nav, modal) — same pattern, scoped to
a locator instead of the whole page:

```typescript
class HamburgerMenu {
  private readonly root: Locator;
  readonly logout: Locator;

  constructor(page: Page) {
    this.root   = page.locator('.bm-menu-wrap');
    this.logout = page.getByTestId('logout-sidebar-link');
  }

  async open(page: Page) {
    await page.getByRole('button', { name: 'Open Menu' }).click();
    await expect(this.root).toBeVisible();
  }

  async clickLogout() {
    await this.logout.click();
  }
}
```

## Fixture-powered page objects (recommended for big projects)

Wire page objects into fixtures so you never call `new XPage(page)` in tests:

```typescript
type Pages = {
  loginPage:     LoginPage;
  inventoryPage: InventoryPage;
};

const test = base.extend<Pages>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await use(loginPage);
  },

  inventoryPage: async ({ page, loginPage }, use) => {
    const inventory = await loginPage.loginAs('standard_user');
    await inventory.assertLoaded();
    await use(inventory);
  },
});

test('inventory pre-loaded', async ({ inventoryPage }) => {
  await expect(inventoryPage.items).toHaveCount(6);
});
```

## When NOT to use POM

Page Object Model is for apps with **state and complex flows**. For
simple sites (marketing pages, landing pages), POM is overkill — just
write the test inline.

Use POM when:
- Multiple tests interact with the same page
- The page has multi-step flows (login → MFA → dashboard)
- UI changes are frequent and you don't want to update 20 test files

Skip POM when:
- One-off tests
- Highly stable UIs
- Tests that just verify content, not behavior
