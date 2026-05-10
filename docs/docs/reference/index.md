---
title: Reference
sidebar_position: 1
slug: /reference
---

# Reference

Deep-dive documentation for everything beyond the cookbooks. Each reference
is self-contained with its own table of contents — load only what you need.

The content here is **synced from**
[`.github/skills/playwright-test/references/`](https://github.com/manimovassagh/samtest/tree/main/.github/skills/playwright-test/references)
at build time — the same files Claude Code uses as its skill knowledge
base. Edits there flow into this site on the next deploy.

## Index

| Topic | When to read |
|---|---|
| **[Writing Tests](./writing-tests)** | Locators, assertions, structure, anti-patterns |
| **[Advanced Config](./advanced-config)** | Every `playwright.config.ts` option that matters |
| **[CLI Reference](./cli)** | All useful CLI flags and recipes |
| **[Fixtures](./fixtures)** | Custom fixtures, scopes, composition — full API |
| **[Network](./network)** | Route mocking, HAR recording, request inspection |
| **[Authentication](./auth)** | All four auth strategies in depth |
| **[Debugging](./debugging)** | Trace viewer, UI mode, Inspector, flake hunting |
| **[CI / CD](./ci)** | GitHub Actions, GitLab, sharding, Docker |
| **[Reporters](./reporters)** | HTML, JUnit, JSON, custom reporters |
| **[MCP Integration](./mcp)** | Playwright MCP + Chrome DevTools MCP |

## How to use these docs as a reference, not a tutorial

The cookbooks teach. The references **answer**. If you're stuck:

1. Find the topic above
2. Use the page's table of contents to jump to the section
3. Copy the example, adapt to your case

Each reference ends with a "common mistakes" or "anti-patterns" table —
worth skimming when you're hunting a subtle bug.
