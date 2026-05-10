/**
 * COOKBOOK: Page Object Model (POM)
 *
 * Page Objects encapsulate how to interact with a page. Tests describe WHAT
 * to do; page objects describe HOW. This removes duplication and makes tests
 * resilient to UI changes — update the selector in one place, not everywhere.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  Design rules:                                                       │
 * │  1. Page objects receive `page` from the test — never create pages.  │
 * │  2. Methods return the next page object when navigation happens.      │
 * │  3. No assertions inside page objects — keep those in tests.          │
 * │  4. Expose meaningful actions, not raw locators.                      │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Run:  npx playwright test page-objects.cookbook.ts --project=chromium
 */

import { test as base, expect, type Page, type Locator } from '@playwright/test';

const PASSWORD = 'secret_sauce';


// ═══════════════════════════════════════════════════════════════════════════
// PART 1 — Basic page objects
// ═══════════════════════════════════════════════════════════════════════════

class LoginPage {
  readonly heading:      Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton:  Locator;
  readonly errorMessage: Locator;

  constructor(private readonly page: Page) {
    this.heading       = page.locator('.login_logo');
    this.usernameInput = page.getByTestId('username');
    this.passwordInput = page.getByTestId('password');
    this.loginButton   = page.getByTestId('login-button');
    this.errorMessage  = page.getByTestId('error');
  }

  async goto() {
    await this.page.goto('/');
  }

  // Returns InventoryPage because successful login navigates there.
  async loginAs(username: string): Promise<InventoryPage> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(PASSWORD);
    await this.loginButton.click();
    return new InventoryPage(this.page);
  }

  async expectError(message: string) {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.errorMessage).toContainText(message);
  }
}

class InventoryPage {
  readonly container:  Locator;
  readonly cartLink:   Locator;
  readonly cartBadge:  Locator;
  readonly items:      Locator;
  readonly sortSelect: Locator;
  readonly menuButton: Locator;

  constructor(readonly page: Page) {
    this.container  = page.getByTestId('inventory-container');
    this.cartLink   = page.getByTestId('shopping-cart-link');
    this.cartBadge  = page.getByTestId('shopping-cart-badge');
    this.items      = page.getByTestId('inventory-item');
    this.sortSelect = page.getByTestId('product-sort-container');
    this.menuButton = page.getByRole('button', { name: 'Open Menu' });
  }

  async assertLoaded() {
    await expect(this.page).toHaveURL('/inventory.html');
    await expect(this.container).toBeVisible();
  }

  async addToCartByName(productName: string): Promise<void> {
    const item = this.page.getByTestId('inventory-item').filter({ hasText: productName });
    await item.getByRole('button', { name: /add to cart/i }).click();
  }

  async cartCount(): Promise<number> {
    const badge = this.cartBadge;
    if (await badge.isVisible()) {
      return Number.parseInt(await badge.textContent() ?? '0', 10);
    }
    return 0;
  }

  async sortBy(value: 'az' | 'za' | 'lohi' | 'hilo') {
    await this.sortSelect.selectOption(value);
  }

  async goToCart(): Promise<CartPage> {
    await this.cartLink.click();
    return new CartPage(this.page);
  }
}

class CartPage {
  readonly title:   Locator;
  readonly items:   Locator;
  readonly checkout: Locator;
  readonly continue: Locator;

  constructor(private readonly page: Page) {
    this.title    = page.getByTestId('title');
    this.items    = page.getByTestId('cart-item');
    this.checkout = page.getByTestId('checkout');
    this.continue = page.getByTestId('continue-shopping');
  }

  async assertLoaded() {
    await expect(this.page).toHaveURL('/cart.html');
    await expect(this.title).toHaveText('Your Cart');
  }

  async itemCount(): Promise<number> {
    return this.items.count();
  }
}


// ═══════════════════════════════════════════════════════════════════════════
// PART 2 — Tests using the page objects
// ═══════════════════════════════════════════════════════════════════════════

test('login success — chained page objects', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();

  const inventoryPage = await loginPage.loginAs('standard_user');
  await inventoryPage.assertLoaded();

  await expect(inventoryPage.items).toHaveCount(6);
});

test('login failure — error message', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();

  await loginPage.loginAs('locked_out_user');
  await loginPage.expectError('locked out');
});

test('add items to cart and navigate', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  const inventory = await loginPage.loginAs('standard_user');
  await inventory.assertLoaded();

  await inventory.addToCartByName('Sauce Labs Backpack');
  expect(await inventory.cartCount()).toBe(1);

  await inventory.addToCartByName('Sauce Labs Bike Light');
  expect(await inventory.cartCount()).toBe(2);

  const cart = await inventory.goToCart();
  await cart.assertLoaded();
  expect(await cart.itemCount()).toBe(2);
});


// ═══════════════════════════════════════════════════════════════════════════
// PART 3 — Component objects
//
// For reusable UI sections (header, nav, modal) — same idea as page objects
// but scoped to a locator, not the whole page.
// ═══════════════════════════════════════════════════════════════════════════

class HamburgerMenu {
  private readonly root: Locator;

  readonly allItems:   Locator;
  readonly about:      Locator;
  readonly logout:     Locator;
  readonly resetApp:   Locator;

  constructor(page: Page) {
    this.root      = page.locator('.bm-menu-wrap');
    this.allItems  = page.getByTestId('inventory-sidebar-link');
    this.about     = page.getByTestId('about-sidebar-link');
    this.logout    = page.getByTestId('logout-sidebar-link');
    this.resetApp  = page.getByTestId('reset-sidebar-link');
  }

  async open(page: Page) {
    await page.getByRole('button', { name: 'Open Menu' }).click();
    await expect(this.root).toBeVisible();
  }

  async close(page: Page) {
    await page.getByRole('button', { name: 'Close Menu' }).click();
    await expect(this.root).not.toBeVisible();
  }

  async clickLogout() {
    await this.logout.click();
  }
}

test('component object — hamburger menu', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.loginAs('standard_user');

  const menu = new HamburgerMenu(page);
  await menu.open(page);
  await menu.clickLogout();

  // After logout we're back on the login page.
  await expect(page).toHaveURL('/');
  await expect(new LoginPage(page).loginButton).toBeVisible();
});


// ═══════════════════════════════════════════════════════════════════════════
// PART 4 — Fixture-powered page objects (recommended for larger projects)
//
// Wire page objects into fixtures so you never call `new XPage(page)` in tests.
// ═══════════════════════════════════════════════════════════════════════════

type PomFixtures = {
  loginPage:     LoginPage;
  inventoryPage: InventoryPage;
};

const test = base.extend<PomFixtures>({
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

test('fixture-powered POM — inventory pre-loaded', async ({ inventoryPage }) => {
  await expect(inventoryPage.items).toHaveCount(6);
  await expect(inventoryPage.cartLink).toBeVisible();
});

test('fixture-powered POM — sort products', async ({ inventoryPage }) => {
  await inventoryPage.sortBy('hilo');

  const names = await inventoryPage.page
    .getByTestId('inventory-item-name')
    .allTextContents();

  // Verify first item is the most expensive after sorting high→low.
  expect(names[0]).toBe('Sauce Labs Fleece Jacket');
});
