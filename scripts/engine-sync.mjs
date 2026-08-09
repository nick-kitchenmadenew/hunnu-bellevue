#!/usr/bin/env node
/**
 * Bring `engine/` up to a tagged release of core30.
 *
 *   node scripts/engine-sync.mjs v1.1.0
 *   node scripts/engine-sync.mjs v1.1.0 --dry
 *
 * The engine is vendored rather than submoduled, and that was forced rather than
 * chosen: Vercel does not clone private git submodules. Its build printed
 * "Failed to fetch one or more git submodules", carried on, and failed three
 * steps later at "Cannot find module 'core30/astro-config'". Granting the Vercel
 * GitHub App access to the engine repository does not help — the token it clones
 * with is scoped to the project's own repository.
 *
 * Vendoring turns out to cost very little and buy something. Deploys need no
 * credentials and no submodule support. An upgrade arrives as an ordinary diff,
 * so "what changed in the build" is answerable by reading the pull request
 * rather than by diffing two commits in another repository. And the version
 * stays pinned in the only way that matters — nothing changes until somebody
 * runs this.
 *
 * What it does NOT buy is protection from editing engine/ in place. That is what
 * the manifest is for; see engine-check.mjs, which the build runs.
 */
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = 'https://github.com/nick-kitchenmadenew/core30.git';
// fileURLToPath, not URL.pathname. pathname keeps percent-encoding, so under a
// directory with a space in its name this resolved to a literal
// "Claude%20Code%20Folder" — and both scripts agreed with each other about the
// wrong place, so the sync wrote there and the check verified it there. The build
// was the only thing that noticed.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE = path.join(ROOT, 'engine');

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const tag = args.find((a) => !a.startsWith('--'));

if (!tag) {
  console.error('\n  usage: node scripts/engine-sync.mjs <tag> [--dry]\n'
    + '  tags:  git ls-remote --tags ' + REPO + '\n');
  process.exit(1);
}

const run = (cmd, cmdArgs, cwd) =>
  execFileSync(cmd, cmdArgs, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

/** Every file under a directory, repo-relative, sorted, excluding VCS noise. */
function walk(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.name !== '.git' && e.name !== '.DS_Store' && e.name !== 'node_modules')
    .flatMap((e) => {
      const p = path.join(dir, e.name);
      return e.isDirectory() ? walk(p, base) : [path.relative(base, p)];
    })
    .sort();
}

const sha = (file) =>
  crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'core30-'));
try {
  process.stdout.write(`  fetching core30 ${tag} … `);
  run('git', ['clone', '--quiet', '--depth', '1', '--branch', tag, REPO, tmp]);
  const commit = run('git', ['rev-parse', 'HEAD'], tmp);
  console.log(commit.slice(0, 8));

  const incoming = walk(tmp);
  const current = fs.existsSync(ENGINE)
    ? walk(ENGINE).filter((f) => !f.startsWith('.core30-')) : [];

  // Report the change before making it. An engine upgrade is the one moment a
  // site that built yesterday can stop building, so it should not be silent.
  const added = incoming.filter((f) => !current.includes(f));
  const removed = current.filter((f) => !incoming.includes(f));
  const changed = incoming.filter((f) => current.includes(f)
    && sha(path.join(tmp, f)) !== sha(path.join(ENGINE, f)));

  // "No file differences" is not the same as "already on this tag". Two releases
  // can carry identical files — a re-tag, or a version whose only change was
  // reverted — and stopping here left .core30-version naming the OLD tag while
  // the files were the new one. engine-check verifies against that stamp, so the
  // repository then disagreed with itself about which release it was running.
  const stamped = fs.existsSync(path.join(ENGINE, '.core30-version'))
    ? JSON.parse(fs.readFileSync(path.join(ENGINE, '.core30-version'), 'utf8')).tag : null;
  if (!added.length && !removed.length && !changed.length && stamped === tag) {
    console.log(`  engine/ is already ${tag} — nothing to do\n`);
    process.exit(0);
  }
  if (!added.length && !removed.length && !changed.length) {
    console.log(`  no file changes, but the stamp says ${stamped} — restamping as ${tag}`);
  }
  for (const f of added) console.log(`    + ${f}`);
  for (const f of removed) console.log(`    - ${f}`);
  for (const f of changed) console.log(`    ~ ${f}`);
  console.log(`\n  ${added.length} added, ${removed.length} removed, ${changed.length} changed`);

  if (DRY) { console.log('  --dry: nothing written\n'); process.exit(0); }

  fs.rmSync(ENGINE, { recursive: true, force: true });
  fs.mkdirSync(ENGINE, { recursive: true });
  for (const f of incoming) {
    const dest = path.join(ENGINE, f);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(tmp, f), dest);
  }

  fs.writeFileSync(path.join(ENGINE, '.core30-version'), JSON.stringify({
    repo: REPO, tag, commit, synced: new Date().toISOString().slice(0, 10),
  }, null, 2) + '\n');
  fs.writeFileSync(path.join(ENGINE, '.core30-manifest'),
    incoming.map((f) => `${sha(path.join(ENGINE, f))}  ${f}`).join('\n') + '\n');

  console.log(`\n  engine/ is now ${tag} (${commit.slice(0, 8)})`);
  console.log('  run `cd site && npm run check` before committing.\n');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
