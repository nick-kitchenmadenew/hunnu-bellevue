#!/usr/bin/env node
/**
 * `engine/` must be exactly the release it says it is.
 *
 * Vendoring the engine buys deploys that need no credentials, and costs one
 * thing: nothing physically stops somebody editing engine/ in place. That is a
 * pleasant way to fix a bug and a terrible way to keep it — the change works
 * here, exists nowhere else, and is silently destroyed by the next sync.
 *
 * So the sync records a sha256 per file and this recomputes them. It runs first
 * in `npm run check`, before the build, because an engine that is not what it
 * claims makes every result after it untrustworthy.
 *
 * If it fires and the edit was deliberate: commit it to the core30 repository,
 * tag a release, and `node scripts/engine-sync.mjs <tag>`. The fix then reaches
 * every other site instead of only this one, which is the whole reason the
 * engine is a separate repository.
 *
 *   node scripts/engine-check.mjs
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// fileURLToPath, not URL.pathname. pathname keeps percent-encoding, so under a
// directory with a space in its name this resolved to a literal
// "Claude%20Code%20Folder" — and both scripts agreed with each other about the
// wrong place, so the sync wrote there and the check verified it there. The build
// was the only thing that noticed.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE = path.join(ROOT, 'engine');
const MANIFEST = path.join(ENGINE, '.core30-manifest');
const VERSION = path.join(ENGINE, '.core30-version');

if (!fs.existsSync(MANIFEST)) {
  console.error('\n  engine/.core30-manifest is missing — engine/ was not put there by'
    + '\n  scripts/engine-sync.mjs, so there is nothing to verify it against.'
    + '\n  Run: node scripts/engine-sync.mjs <tag>\n');
  process.exit(1);
}

const { tag, commit } = JSON.parse(fs.readFileSync(VERSION, 'utf8'));
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

const walk = (dir, base = dir) => fs.readdirSync(dir, { withFileTypes: true })
  .filter((e) => e.name !== '.DS_Store' && e.name !== 'node_modules' && !e.name.startsWith('.core30-'))
  .flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p, base) : [path.relative(base, p)];
  }).sort();

const expected = new Map(fs.readFileSync(MANIFEST, 'utf8').trim().split('\n')
  .map((l) => { const [h, ...rest] = l.split('  '); return [rest.join('  '), h]; }));

const problems = [];
for (const [file, want] of expected) {
  const p = path.join(ENGINE, file);
  if (!fs.existsSync(p)) problems.push(`missing   ${file}`);
  else if (sha(p) !== want) problems.push(`edited    ${file}`);
}
for (const file of walk(ENGINE)) {
  if (!expected.has(file)) problems.push(`unexpected ${file}`);
}

if (problems.length) {
  console.log(`\n  engine/ does not match ${tag} (${String(commit).slice(0, 8)})\n`);
  for (const p of problems.slice(0, 20)) console.log(`    ${p}`);
  if (problems.length > 20) console.log(`    … and ${problems.length - 20} more`);
  console.log('\n  An engine fix belongs in the core30 repository, tagged, then synced —'
    + '\n  otherwise it lives only here and the next sync deletes it.\n');
  process.exit(1);
}
console.log(`  ✓ engine/ is ${tag} (${String(commit).slice(0, 8)}), ${expected.size} files verified`);
