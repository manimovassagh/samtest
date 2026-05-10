# Playwright Test Skill

A modular Claude Code skill that knows this project's Playwright setup
inside-out — writing tests, designing fixtures, debugging failures,
configuring `playwright.config.ts`, running the CLI, and integrating with
the Playwright MCP server.

## What's in here

```
.github/skills/playwright-test/
├── SKILL.md                         ← entry point (read first)
├── README.md                        ← this file
└── references/
    ├── writing-tests.md             ← Locators, assertions, structure
    ├── advanced-config.md           ← playwright.config.ts deep dive
    ├── cli.md                       ← Every useful playwright CLI flag
    ├── mcp.md                       ← Playwright MCP + Chrome DevTools MCP
    ├── fixtures.md                  ← Custom fixtures, scopes, composition
    ├── network.md                   ← Route mocking, request interception
    ├── auth.md                      ← storageState, login-once patterns
    ├── debugging.md                 ← Trace viewer, UI mode, Inspector
    ├── ci.md                        ← GitHub Actions, sharding, Docker
    └── reporters.md                 ← HTML, JUnit, JSON, custom reporters
```

`SKILL.md` is short on purpose — it lists which reference to load for each
type of task (progressive disclosure). References are loaded on demand so
the agent only reads what's relevant.

## How a human uses this

Just read the file you need. Every reference has a table of contents and
working code examples grounded in this project (saucedemo, `data-test`
attributes, `@smoke`/`@core`/`@full` projects).

Pair with the runnable cookbooks under [tests/saucedemo/](../../../tests/saucedemo/):

| Cookbook | Covers |
|---|---|
| `inline-config.cookbook.ts` | `tag`, `annotation`, `mode`, `retries`, `timeout` |
| `fixtures.cookbook.ts` | Custom fixtures, worker-scoped, auto-use |
| `network.cookbook.ts` | `route`, `fulfill`, `abort`, `times` |
| `assertions.cookbook.ts` | Web-first, soft, `expect.poll`, custom matchers |
| `auth.cookbook.ts` | storageState, worker auth, multi-user |
| `page-objects.cookbook.ts` | POM, component objects, fixture-powered |

## How Claude Code uses this

Claude Code auto-discovers skills from a few well-known locations:

| Location | Scope |
|---|---|
| `~/.claude/skills/` | Personal — only loads on your machine |
| `<repo>/.claude/skills/` | **Project-scoped — auto-loads for anyone who clones the repo** |
| Plugin directories | Distributed via plugin manifest |

**`.github/skills/` is NOT auto-discovered.** It works as documentation that
the team can read, but Claude Code won't load it as a triggerable skill from
this location.

### To make it auto-load as a skill

Symlink or copy into `.claude/skills/` (which IS auto-discovered):

```bash
# from repo root
mkdir -p .claude/skills
ln -s ../../.github/skills/playwright-test .claude/skills/playwright-test
```

Or move the folder entirely:

```bash
mkdir -p .claude/skills
mv .github/skills/playwright-test .claude/skills/
```

Either way, commit the result so teammates get it on clone.

### Why `.github/` then?

If you'd rather keep `.claude/` out of the repo (e.g. you already gitignore
it for personal settings), `.github/skills/` is a reasonable place for the
skill content to live as shared reference docs — the team can still read
the markdown files even if Claude Code doesn't auto-load them.

## Conventions enforced

When this skill is in use, generated tests will:

- Import from `@playwright/test` (not `playwright`)
- Use `page.getByTestId(...)` first (this project's `data-test` attribute)
- Use `await expect(...)` for all DOM assertions
- Tag tests with `@smoke` / `@core` / `@full` where appropriate
- Live under `tests/<feature>/` with `*.spec.ts` suffix
- Avoid `page.waitForTimeout()` and other anti-patterns

See [SKILL.md](./SKILL.md#output-style-for-this-skill) for the full list.
