#!/usr/bin/env node
/**
 * Write vercel.json's `redirects` array from redirects.yaml.
 *
 *   node ../engine/scripts/emit-redirects.mjs
 *
 * Not part of the build, and it cannot be: Vercel reads vercel.json before the
 * build container starts, so anything generated during the build is generated
 * too late to be served. The array is therefore committed, and
 * redirects.test.mjs fails the build when it has drifted from redirects.yaml —
 * which is the same arrangement as the config and the GBP profile.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { payloadRoot } from '../src/lib/paths.js';

/**
 * Retired URLs, as rewrites to the 410 handler.
 *
 * Vercel's `redirects` accepts 301, 302, 307 and 308 and nothing else, so a 410
 * cannot be expressed there. A rewrite to /api/gone can, and it keeps the URL
 * the visitor and the crawler asked for, which a redirect would not.
 *
 * Why bother at all: a 404 tells Google the page might return and it keeps
 * recrawling; a 410 says gone on purpose and it drops the URL far sooner. The
 * root's 96 retirements are almost entirely pages the site was compromised with,
 * so the whole value is in being dropped quickly. redirects.yaml has claimed
 * this behaviour since it was written and nothing implemented it, because until
 * the root's map no entry had ever used `retire`.
 */
/**
 * Sources keep their trailing slash, and that is not cosmetic.
 *
 * vercel.json sets `trailingSlash: true`, so Vercel 308s /about-us to /about-us/
 * BEFORE it evaluates any custom redirect. A source written as "/about-us" is
 * therefore compared against a path that always ends in a slash and never
 * matches — the request falls through to a 404.
 *
 * Every redirect in this file was emitted slashless and every one of them was
 * inert on the deployed site, Oakville's 35 included. Nothing caught it because
 * the drift check compares vercel.json with redirects.yaml and both agreed; what
 * neither of them knows is what Vercel does with the result. A guard that reads
 * two files can only tell you they match each other.
 */
export function emitGone(doc) {
  return (doc.urls ?? []).filter((e) => e.retire !== undefined).map((e) => ({
    source: e.from,
    destination: '/api/gone',
  }));
}

export function emit(doc) {
  return [
    ...(doc.manual ?? []).map((m) => ({
      source: m.from,
      destination: m.to,
      permanent: m.permanent ?? true,
    })),
    // 301 for everything derived from the crawl. These are permanent moves —
    // the old URL is not coming back — and a 302 would leave Google indexing
    // the source rather than the destination.
    ...(doc.urls ?? []).filter((e) => e.to).map((e) => ({
      source: e.from,
      destination: e.to,
      permanent: true,
    })),
  ];
}

// fileURLToPath, not `file://${argv[1]}`. import.meta.url percent-encodes, argv
// does not, so under a directory with a space in its name the two never match
// and the script silently does nothing — which is exactly how it first behaved.
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const doc = yaml.load(fs.readFileSync(path.join(payloadRoot, 'redirects.yaml'), 'utf8'));
  const file = path.join(payloadRoot, 'vercel.json');
  const v = JSON.parse(fs.readFileSync(file, 'utf8'));
  v.redirects = emit(doc);
  // Rewrites that are NOT retirements are hand-written (the /api/:fn/ trailing-slash
  // rule) and must survive. Only the /api/gone entries are generated.
  const kept = (v.rewrites ?? []).filter((r) => r.destination !== '/api/gone');
  v.rewrites = [...kept, ...emitGone(doc)];
  fs.writeFileSync(file, JSON.stringify(v, null, 2) + '\n');
  console.log(`  vercel.json — ${v.redirects.length} redirect(s) and `
    + `${v.rewrites.length - kept.length} × 410 written from redirects.yaml`);
}
