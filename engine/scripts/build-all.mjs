#!/usr/bin/env node
/**
 * Build every entity in this payload and stage them into one output tree.
 *
 *   cd site && node ../engine/scripts/build-all.mjs
 *
 * One domain serves every entity — `/`, `/oakville/`, `/northyork/` — from one
 * Vercel project and one output directory, so a deploy has to run one build per
 * entity and merge the results. That sequence used to live in `vercel.json`'s
 * buildCommand, until it grew past the 256 characters Vercel allows there. The
 * limit is enforced server-side only: `vercel build` runs the long command
 * locally without complaint and the deploy fails with a schema error, which is
 * a slow way to find out.
 *
 * The entity list is DISCOVERED rather than declared. Every `config-<id>.yaml`
 * in the payload is an entity, which is already how `paths.js` resolves one — so
 * adding a fourth location is a config file and nothing else. A hardcoded list
 * here would be a second place to remember, and the failure mode of forgetting
 * is a subtree that silently stops deploying while every check still passes.
 *
 * ORDER MATTERS, in one direction. A subtree entity stages into its own
 * directory. The root entity's directory IS the output root, so it merges its
 * files in around whatever is already there — see stage-dist.mjs. Staging the
 * root first would work too, but only because that merge is written to be safe
 * both ways; going last is the order that stays correct if it ever is not.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { payloadRoot } from '../src/lib/paths.js';

const entities = fs.readdirSync(payloadRoot)
  .map((f) => /^config-(.+)\.yaml$/.exec(f))
  .filter(Boolean)
  .map((m) => {
    const doc = yaml.load(fs.readFileSync(path.join(payloadRoot, m[0]), 'utf8')) ?? {};
    return { id: m[1], root: doc.entity?.root ?? `/${m[1]}/` };
  })
  // Subtrees first, root last. Ties keep a stable order so two deploys of the
  // same commit produce the same tree.
  .sort((a, b) => (a.root === '/' ? 1 : 0) - (b.root === '/' ? 1 : 0)
    || a.id.localeCompare(b.id));

if (!entities.length) {
  console.error(`\n  No config-<entity>.yaml in ${payloadRoot} — nothing to build.\n`);
  process.exit(1);
}

// Clear the staging tree ONCE, here, before any entity is built.
//
// stage-dist.mjs deliberately does not do this — it runs per entity, and wiping
// the tree there would destroy the entity staged before it; its own comment says
// so. But the wipe still has to happen somewhere, and when the deploy command
// moved out of vercel.json — where it read `rm -rf ../.vercel-out && …` — into
// this script, it moved into nothing.
//
// What that cost: a SUBTREE replaces its own directory, so deleting one of its
// pages removes the file. The ROOT merges its files in around the subtrees, so a
// page deleted from the root was never removed from the output. /burlington/ was
// deleted, committed, rebuilt and deployed, and went on being served — its HTML
// had simply never left this directory.
//
// This is the only place it can go: the one step that runs before all three,
// rather than once per entity.
// maxRetries is not defensive padding. `recursive: true` alone threw ENOTEMPTY
// here on the first run — macOS hands out a directory listing that something
// else (Spotlight, Finder, a watcher) writes into mid-delete, and the unlink
// then finds the directory non-empty. It had already removed part of the tree
// before it threw, which is the worst outcome available: a half-staged deploy.
const staged = path.join(payloadRoot, '.vercel-out');
fs.rmSync(staged, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });

console.log(`\n  Building ${entities.length} entit${entities.length === 1 ? 'y' : 'ies'}: `
  + entities.map((e) => `${e.id} (${e.root})`).join(', ') + '\n');

for (const e of entities) {
  const env = { ...process.env, CORE30_ENTITY: e.id };
  execFileSync('npm', ['run', 'build'], { stdio: 'inherit', env });
  execFileSync('node', ['../engine/scripts/stage-dist.mjs'], { stdio: 'inherit', env });
}

console.log(`\n  ✓ ${entities.length} entities staged into one tree\n`);

// One sitemap and one robots.txt for the domain, written after every entity is
// staged and never per entity — see sitemap.mjs for why this cannot be an Astro
// integration. It walks the finished tree, so it has to run last.
execFileSync('node', ['../engine/scripts/sitemap.mjs'], { stdio: 'inherit' });
