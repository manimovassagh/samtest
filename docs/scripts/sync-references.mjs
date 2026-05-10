#!/usr/bin/env node
/**
 * Sync the skill reference markdown files from .github/skills/playwright-test/references/
 * into docs/docs/reference/. The source of truth is the skill folder; this script
 * mirrors it so Docusaurus can build a docs site from the same content.
 *
 * Adds a Docusaurus frontmatter block to each file using its filename as the title.
 */
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, '..', '..', '.github', 'skills', 'playwright-test', 'references');
const DEST = join(__dirname, '..', 'docs', 'reference');

const TITLES = {
  'writing-tests.md':   'Writing Tests',
  'advanced-config.md': 'Advanced Config',
  'cli.md':             'CLI Reference',
  'mcp.md':             'MCP Integration',
  'fixtures.md':        'Fixtures',
  'network.md':         'Network',
  'auth.md':            'Authentication',
  'debugging.md':       'Debugging',
  'ci.md':              'CI / CD',
  'reporters.md':       'Reporters',
};

const SIDEBAR_POSITIONS = {
  'writing-tests.md':   1,
  'advanced-config.md': 2,
  'cli.md':             3,
  'fixtures.md':        4,
  'network.md':         5,
  'auth.md':            6,
  'debugging.md':       7,
  'ci.md':              8,
  'reporters.md':       9,
  'mcp.md':             10,
};

async function main() {
  if (!existsSync(SRC)) {
    console.error(`[sync] source not found: ${SRC}`);
    process.exit(1);
  }
  await mkdir(DEST, { recursive: true });

  const files = (await readdir(SRC)).filter(f => f.endsWith('.md'));
  for (const file of files) {
    const title = TITLES[file] ?? basename(file, '.md');
    const position = SIDEBAR_POSITIONS[file] ?? 99;

    const body = await readFile(join(SRC, file), 'utf8');

    // Strip an existing top-level heading if present (Docusaurus uses frontmatter title)
    const stripped = body.replace(/^#\s+.+\n+/, '');

    const frontmatter =
      `---\n` +
      `title: ${title}\n` +
      `sidebar_position: ${position}\n` +
      `---\n\n`;

    const out = frontmatter + stripped;
    await writeFile(join(DEST, file), out, 'utf8');
    console.log(`[sync] ${file}`);
  }
  console.log(`[sync] copied ${files.length} files → docs/reference/`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
