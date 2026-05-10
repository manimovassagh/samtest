# playwright-test — Claude Code Skill

Modular skill that gives Claude Code expert knowledge of this project's
Playwright setup. Tests, fixtures, config, CLI, MCP, CI — each as a
separate reference file loaded on demand.

For human-facing docs, the cookbook index, recipes, and getting started,
see the [project README](../../../README.md).

## Layout

```
playwright-test/
├── SKILL.md                ← Entry point — when to load each reference
├── README.md               ← This file
└── references/
    ├── writing-tests.md     Locators, assertions, structure, anti-patterns
    ├── advanced-config.md   playwright.config.ts deep dive
    ├── cli.md               Every useful CLI flag, recipes
    ├── mcp.md               Playwright MCP + Chrome DevTools MCP
    ├── fixtures.md          Custom fixtures, scopes, composition
    ├── network.md           Route mocking, interception, HAR
    ├── auth.md              storageState, login-once patterns
    ├── debugging.md         Trace viewer, UI mode, Inspector
    ├── ci.md                GitHub Actions, sharding, Docker
    └── reporters.md         HTML, JUnit, JSON, custom reporters
```

`SKILL.md` is intentionally short — it's a router that tells the agent
*which reference* to load for *which kind of task*. References are loaded
only when needed (progressive disclosure).

## How to make Claude Code auto-load this

Claude Code's skill discovery looks in three places:

| Location | Scope |
|---|---|
| `~/.claude/skills/` | Personal — your laptop only |
| `<repo>/.claude/skills/` | **Project-scoped — auto-loads for anyone who clones** |
| Plugin manifests | Distributed via a plugin |

**`.github/skills/` is NOT one of them.** Files here are readable as docs
but Claude Code won't trigger the skill from this path.

To make it auto-load for the team, run from the repo root:

```bash
mkdir -p .claude/skills
mv .github/skills/playwright-test .claude/skills/
git add -A && git commit -m "Move Playwright skill to .claude/skills for auto-load"
```

After that, anyone who clones the repo and opens it in Claude Code gets
the skill automatically.

### Why `.github/skills/` at all?

Two reasons you might prefer it here:

1. **Team can read it as plain docs** — `.github/` is a familiar location
   for shared project conventions
2. **Avoids the `.claude/` folder entirely** — if you gitignore `.claude/`
   for personal settings, this keeps the skill separate

The trade-off: no auto-trigger. Agents have to be told to read these
files explicitly.

## Conventions this skill enforces

When the skill is loaded, generated tests will:

- Import from `@playwright/test` (not `playwright`)
- Use `page.getByTestId(...)` first (this project's `data-test` attribute)
- Use `await expect(...)` for all DOM assertions
- Tag tests with `@smoke` / `@core` / `@full` where appropriate
- Live under `tests/<feature>/` with `*.spec.ts` suffix
- Avoid `page.waitForTimeout()` and other anti-patterns

Full conventions list in [`SKILL.md`](./SKILL.md#output-style-for-this-skill).

## Updating the skill

The references are written for Playwright `^1.59.x`. When upgrading:

1. Check the [Playwright release notes](https://github.com/microsoft/playwright/releases)
   for deprecations or new APIs
2. Update the relevant reference file(s) — they're independent
3. If you add a new reference, also list it in [`SKILL.md`](./SKILL.md#when-to-load-each-reference)
   so the agent knows when to load it

Reference files are designed to be **self-contained** — each has a table
of contents and works as a standalone document.
