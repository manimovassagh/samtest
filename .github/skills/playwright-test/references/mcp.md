# Playwright MCP Reference

This project has two browser-controlling MCP servers configured in `mcp.json`:

```json
{
  "servers": {
    "io.github.ChromeDevTools/chrome-devtools-mcp": {
      "command": "npx",
      "args": ["chrome-devtools-mcp@0.10.2"]
    },
    "microsoft/playwright-mcp": {
      "command": "npx",
      "args": ["@playwright/mcp@latest", "--extension"]
    }
  }
}
```

## Contents

1. [What is the Playwright MCP](#what-is-the-playwright-mcp)
2. [When to use Playwright MCP vs Chrome DevTools MCP](#when-to-use-which)
3. [Playwright MCP tools](#playwright-mcp-tools)
4. [Workflow: writing tests via MCP exploration](#workflow-writing-tests-via-mcp)
5. [Chrome DevTools MCP — extras](#chrome-devtools-mcp)
6. [Common patterns](#common-patterns)
7. [Configuration flags](#configuration-flags)

---

## What is the Playwright MCP

The Playwright MCP server (`@playwright/mcp`) exposes Playwright's browser
automation as MCP tools so Claude can:

- Drive a real browser interactively
- Take DOM snapshots and screenshots
- Inspect network requests
- Execute JavaScript in the page
- Generate locator suggestions

This is the live counterpart to writing tests. Use it to **explore** an
application, then translate that exploration into a `.spec.ts` file.

The `--extension` flag in this project's `mcp.json` means the MCP runs as a
Chrome extension companion — it controls your actual Chrome browser instead of
launching a headless one.

## When to use which

| Task | Use |
|---|---|
| Exploring a new page to write tests | `mcp__plugin_playwright_playwright__browser_*` |
| Recording a flow for a new spec file | Playwright MCP, then translate to code |
| Performance profiling | Chrome DevTools MCP (lighthouse, traces) |
| Memory leak debugging | Chrome DevTools MCP (heap snapshots) |
| Network request inspection during exploration | Either — both have it |
| Accessibility audit | Chrome DevTools MCP (`lighthouse_audit`) |
| Quick screenshot | Either |

## Playwright MCP tools

All tools are prefixed `mcp__plugin_playwright_playwright__`.

### Navigation & lifecycle

| Tool | What it does |
|---|---|
| `browser_navigate` | Goto a URL |
| `browser_navigate_back` | Back button |
| `browser_close` | Close the current tab |
| `browser_tabs` | List/switch tabs |
| `browser_resize` | Resize viewport |

### Interaction

| Tool | What it does |
|---|---|
| `browser_click` | Click an element (by ref or accessibility) |
| `browser_type` | Type into an input |
| `browser_fill_form` | Fill multiple fields at once |
| `browser_select_option` | Pick from a `<select>` |
| `browser_press_key` | Send a keyboard key |
| `browser_hover` | Hover |
| `browser_drag` | Drag-and-drop |
| `browser_drop` | Companion to drag |
| `browser_file_upload` | Upload files |
| `browser_handle_dialog` | Dismiss/accept alert, confirm, prompt |

### Inspection

| Tool | What it does |
|---|---|
| `browser_snapshot` | Accessibility tree snapshot — best for understanding structure |
| `browser_take_screenshot` | PNG of viewport or element |
| `browser_console_messages` | Console log dump |
| `browser_network_requests` | All requests since last clear |
| `browser_network_request` | Inspect one specific request |
| `browser_evaluate` | Run JS in the page |
| `browser_wait_for` | Wait for selector/state |

### Code execution

| Tool | What it does |
|---|---|
| `browser_run_code_unsafe` | Execute arbitrary Node code — use sparingly |

## Workflow: writing tests via MCP exploration

The typical loop when adding a test for a new feature:

```text
1. browser_navigate(url='https://www.saucedemo.com')
2. browser_snapshot()                ← see the accessibility tree
3. browser_click(ref='login-button') ← interact
4. browser_snapshot()                ← see what changed
5. browser_take_screenshot()         ← visual confirmation
6. Translate the actions into Playwright API calls in a .spec.ts file
```

**Key insight**: `browser_snapshot` returns ARIA refs you can pass to other
tools. These are stable across renders within a session — use them instead of
guessing selectors.

### Example: exploring saucedemo

```text
browser_navigate(url='https://www.saucedemo.com')

browser_snapshot()
  → returns:
    - textbox "Username" [ref=e1]
    - textbox "Password" [ref=e2]
    - button "Login" [ref=e3]
    - heading "Swag Labs" [level=1]

browser_type(ref='e1', text='standard_user')
browser_type(ref='e2', text='secret_sauce')
browser_click(ref='e3')

browser_snapshot()
  → returns:
    - heading "Products" [ref=e10]
    - link "Shopping Cart" [ref=e11]
    - 6 × article "inventory-item" [ref=e20..e25]
```

Now translate to test code:

```typescript
test('login as standard_user', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('username').fill('standard_user');
  await page.getByTestId('password').fill('secret_sauce');
  await page.getByTestId('login-button').click();

  await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible();
  await expect(page.getByTestId('inventory-item')).toHaveCount(6);
});
```

## Chrome DevTools MCP

Different tool set — focused on profiling, not authoring tests. Prefixed
`mcp__plugin_chrome-devtools-mcp_chrome-devtools__`.

### Unique tools (beyond what Playwright MCP has)

| Tool | What it does |
|---|---|
| `performance_start_trace` / `performance_stop_trace` | DevTools performance trace |
| `performance_analyze_insight` | AI-style analysis of a trace |
| `lighthouse_audit` | Run Lighthouse on the current page |
| `take_memory_snapshot` | V8 heap snapshot |
| `emulate` | CPU/network throttling, device emulation |

### When you'd combine the two

```text
1. Playwright MCP: navigate, login, drive to the suspect page
2. Chrome DevTools MCP: performance_start_trace
3. Playwright MCP: trigger the slow interaction
4. Chrome DevTools MCP: performance_stop_trace + performance_analyze_insight
```

## Common patterns

### Pattern 1: discover testIds for a page

```text
browser_navigate(url='/path')
browser_evaluate(function='() => Array.from(document.querySelectorAll("[data-test]")).map(e => e.getAttribute("data-test"))')
```

Returns all `data-test` attributes — paste into the test as `getByTestId(...)` calls.

### Pattern 2: capture a real network response for mocking

```text
browser_navigate(url='/page-that-fetches')
browser_network_requests()
  → find the API call you care about
browser_network_request(url='https://api.example.com/data')
  → returns full response body — paste into your test as `route.fulfill({ body: ... })`
```

### Pattern 3: verify a fix interactively before adding regression test

```text
browser_navigate(url='/buggy-page')
browser_snapshot()                ← see broken state
[user applies fix in code]
browser_navigate(url='/buggy-page')  (or browser_evaluate for SPA reload)
browser_snapshot()                ← see fixed state
[write the spec file]
```

## Configuration flags

`mcp.json` args for `@playwright/mcp`:

| Flag | What it does |
|---|---|
| `--extension` | Connect to your real Chrome via the Playwright extension (this project uses this) |
| `--browser=chromium\|firefox\|webkit` | Pick the browser engine |
| `--headless` | Hide the browser window |
| `--user-data-dir=PATH` | Persist cookies/localStorage across sessions |
| `--viewport-size=WxH` | Initial viewport |
| `--device="iPhone 12"` | Emulate a device |
| `--proxy-server=URL` | Run all traffic through a proxy |
| `--ignore-https-errors` | Allow self-signed certs |

To change config: edit `/Users/mani/Documents/Projects/samtest/mcp.json` and
restart the MCP server (Claude Code restarts MCPs on session start).

## Limitations to know

- The Playwright MCP runs against a SINGLE browser session per Claude session
- It does NOT see what your test runner sees — different process
- It WON'T run your `.spec.ts` files — for that, use the regular Playwright CLI
- Browser state persists across tool calls until `browser_close` or new session
- The `--extension` mode requires the matching Chrome extension installed and Chrome running

## Anti-patterns

| Don't | Do |
|---|---|
| Use MCP as a permanent test runner | Use it to explore, then write `.spec.ts` |
| Trust `browser_evaluate` for production assertions | Use it for exploration; assert in Playwright tests |
| Rely on element refs across sessions | Refs are session-scoped — re-snapshot each time |
| Use Playwright MCP for performance profiling | Use Chrome DevTools MCP for that |
