---
title: Introduction
sidebar_position: 1
slug: /intro
---

# samtest — a Playwright Cookbook

A production-ready Playwright boilerplate that doubles as a learn-by-example
cookbook. Every pattern you need for real-world Playwright suites — fixtures,
network mocking, authentication, page objects, custom matchers — lives in
this repo as a runnable `.cookbook.ts` file you can read, copy, and adapt.

## What this site is

Three layers of documentation, navigated by audience:

| Section | For | Contains |
|---|---|---|
| **[Getting Started](./getting-started/installation)** | Anyone new to the repo | Install, run, profiles |
| **[Cookbooks](./cookbooks)** | Test authors looking for patterns | Six topic guides, each backed by a runnable `.ts` file |
| **[Reference](./reference)** | Deep-dive — config, CLI, debugging, CI | Ten reference docs synced from the in-repo skill |

Plus a **[live test report](pathname:///test-report/)** from the latest CI run.

## What the project is

The repo is a Playwright boilerplate around the public
[SauceDemo](https://www.saucedemo.com/) site. Why SauceDemo:

- Free, stable, no auth secrets needed
- Multiple test users that exercise different code paths (locked-out,
  performance glitch, visual differences, etc.)
- Realistic flows: login, browse, cart, checkout

Real tests live in [`tests/saucedemo/login.spec.ts`](https://github.com/manimovassagh/samtest/blob/main/tests/saucedemo/login.spec.ts).
The six `.cookbook.ts` files are pedagogical — they cover one topic each
with annotated examples.

## What you get out of the box

- **Full observability** — trace, screenshot, video on every test
- **Tag-filtered projects** — `@smoke` (1 user), `@core` (2), `@full` (6)
- **GitHub Actions CI** with artifact uploads + auto-deployed docs site
- **MCP integration** — Playwright MCP + Chrome DevTools MCP pre-configured
- **A Claude Code skill** at `.github/skills/playwright-test/` — modular
  reference docs Claude can load on demand
- **This docs site** — Docusaurus, dark-mode default, auto-deployed to
  GitHub Pages

## Where to start

If you're new:

1. **[Installation](./getting-started/installation)** — clone, install, run
2. **[Cookbooks index](./cookbooks)** — pick a pattern you need
3. **[Writing tests reference](./reference/writing-tests)** — locator priority,
   assertions, anti-patterns

If you just want to run things:

```bash
git clone https://github.com/manimovassagh/samtest.git
cd samtest
make install
make test-smoke         # 1-user sanity check
make report             # open the HTML report
```
