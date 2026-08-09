#!/usr/bin/env node
/**
 * Move the built site to where Vercel serves it, under this entity's root.
 *
 * The build command used to do this inline:
 *
 *     mv dist ../.vercel-out/oakville
 *
 * which put the entity's name in a third place — after the config and
 * astro.config — with nothing holding the three together. Get it wrong and the
 * deploy succeeds and serves 404s, because the files are simply in a directory
 * nobody asked for.
 *
 * The destination is `entity.root` and nothing else. While it is here it also
 * checks the one part of the deploy that cannot be derived — the root redirect
 * in vercel.json, which is static JSON — and says so if it points somewhere
 * else. That mismatch is invisible until a visitor lands on the bare domain.
 *
 *   node scripts/stage-dist.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { config } from './silo.mjs';
import { payloadRoot } from '../src/lib/paths.js';

const root = config.entity.root;                       // "/oakville/"
const dir = root.replace(/^\/|\/$/g, '');              // "oakville"
const out = path.join(payloadRoot, '.vercel-out');

if (!fs.existsSync('dist')) {
  console.error('  no dist/ — run the build first');
  process.exit(1);
}

// One output tree, several entities staged into it. This used to wipe the whole
// of .vercel-out first, which is correct for one site and destroys the previous
// entity's pages when there are three.
//
// A SUBTREE replaces its own directory and nothing else. The ROOT copies its
// files in around the subtrees, because its directory IS the output root and
// renaming onto it would take them with it. Either order works, deliberately —
// staging depends on the entity rather than on the sequence.
fs.mkdirSync(out, { recursive: true });
if (dir) {
  const dest = path.join(out, dir);
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.renameSync('dist', dest);
  console.log(`  staged dist -> .vercel-out/${dir}/`);
} else {
  const merge = (from, to) => {
    for (const e of fs.readdirSync(from, { withFileTypes: true })) {
      const a = path.join(from, e.name), b = path.join(to, e.name);
      if (e.isDirectory()) { fs.mkdirSync(b, { recursive: true }); merge(a, b); }
      else fs.copyFileSync(a, b);
    }
  };
  merge('dist', out);
  fs.rmSync('dist', { recursive: true, force: true });
  console.log(`  staged dist -> .vercel-out/  (root entity, merged around the subtrees)`);
}

// The redirect Vercel serves at the bare domain. Static JSON, so it cannot be
// derived — but it can be checked.
//
// Skipped when THIS entity is the root: a site that serves "/" itself needs no
// redirect away from it.
//
// Also skipped when a SIBLING is the root, which is the case the first version
// of this check could not see. It was written while "/" was still GoHighLevel
// and a subtree was the only thing being deployed, so "no redirect for /" meant
// the bare domain would 404. Once a root entity ships, "/" is a real page and
// the redirect is not merely unnecessary, it is wrong — and this warned about
// its absence on every deploy of both subtrees. A warning that is always wrong
// is how people learn to stop reading warnings.
const vercelJson = path.join(payloadRoot, 'vercel.json');
const rootSibling = (config.entity.siblings ?? []).includes('/');
if (dir && !rootSibling && fs.existsSync(vercelJson)) {
  const v = JSON.parse(fs.readFileSync(vercelJson, 'utf8'));
  const rootRedirect = (v.redirects ?? []).find((r) => r.source === '/');
  if (!rootRedirect) {
    console.log('  ⚠ vercel.json has no redirect for "/" — the bare domain will 404');
  } else if (rootRedirect.destination !== root) {
    console.log(`  ⚠ vercel.json sends "/" to ${rootRedirect.destination}, but entity.root is ${root}`);
    process.exit(1);
  }
}
