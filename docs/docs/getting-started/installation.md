---
title: Installation
sidebar_position: 1
---

# Installation

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | `>=18` | Required by Playwright and Docusaurus |
| npm | bundled with Node | Or use `pnpm` / `yarn` if you prefer |
| git | any recent | For cloning the repo |

Check what you have:

```bash
node --version    # v18.x or newer
npm --version
git --version
```

## Clone and install

```bash
git clone https://github.com/manimovassagh/samtest.git
cd samtest

# Install JS dependencies + Playwright browsers + system deps
make install
```

This runs `npm install` then `npx playwright install --with-deps`. The
`--with-deps` flag installs OS-level libraries that the browsers need
(Linux only — no-op on macOS/Windows).

Manual equivalent:

```bash
npm install
npx playwright install              # browsers only
# or
npx playwright install --with-deps  # + system libraries (Linux)
```

## Verify

Run the fastest test:

```bash
make test-smoke
```

You should see one test pass (the `standard_user` login) in a few seconds.
The HTML report will open in your browser automatically.

If you see errors, see [Debugging reference](../reference/debugging) for
common failure modes.

## Optional: docs site locally

If you want to preview this docs site locally:

```bash
cd docs
npm install
npm start
```

Opens `http://localhost:3000/samtest/`. The `start` script auto-syncs
reference markdown from `.github/skills/playwright-test/references/`
before launching.

## Optional: MCP servers

Two browser-controlling MCP servers are configured in [`mcp.json`](https://github.com/manimovassagh/samtest/blob/main/mcp.json):

```json
{
  "servers": {
    "io.github.ChromeDevTools/chrome-devtools-mcp": { "command": "npx", "args": ["chrome-devtools-mcp@0.10.2"] },
    "microsoft/playwright-mcp":                    { "command": "npx", "args": ["@playwright/mcp@latest", "--extension"] }
  }
}
```

Claude Code (or any MCP-compatible client) picks these up automatically
when opening this repo. See the [MCP reference](../reference/mcp) for
how to use them.

## Project layout

```
samtest/
├── tests/saucedemo/           # spec files + cookbooks + test data
├── playwright.config.ts        # full observability, 3 retries, tag-based projects
├── Makefile                    # friendly test commands
├── mcp.json                    # MCP server config
├── docs/                       # this Docusaurus site
└── .github/
    ├── workflows/              # CI: tests + docs deployment
    └── skills/playwright-test/ # Claude Code skill (modular reference)
```
