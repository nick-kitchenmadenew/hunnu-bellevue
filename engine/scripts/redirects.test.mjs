#!/usr/bin/env node
/**
 * Every URL the live site has must have somewhere to go after cutover.
 *
 *   node ../engine/scripts/redirects.test.mjs
 *
 * The build has never known the live site exists. It passes every check it has
 * while 35 of the 45 indexed URLs under /oakville/ point at nothing — because
 * "does this URL still resolve" is not a question about the pages you built, it
 * is a question about the pages you replaced. That loss would have happened on
 * cutover day, silently, and been unrecoverable a few weeks later.
 *
 * So the crawl is an input to the build. `redirects.yaml` gives every crawled URL
 * under this entity's root exactly one disposition, and this holds it:
 *
 *   keep         the URL is rebuilt — asserted here, not assumed
 *   to: <url>    301 to the closest equivalent page
 *   retire: why  deliberately gone; served as 410 rather than a silent 404
 *
 * Skips cleanly when there is no redirects.yaml — a brand-new site has no
 * predecessor and nothing to preserve.
 */
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { config } from './silo.mjs';
import { payloadRoot, entityId } from '../src/lib/paths.js';
import { emit, emitGone } from './emit-redirects.mjs';

const DIST = process.argv[2] || 'dist';
const ROOT = config.entity.root;
const FILE = path.join(payloadRoot, 'redirects.yaml');

if (!fs.existsSync(FILE)) {
  console.log(`  ⊘ no redirects.yaml — nothing to preserve, skipped`);
  process.exit(0);
}

const doc = yaml.load(fs.readFileSync(FILE, 'utf8')) ?? {};

// One map for the domain, entries owned by whichever entity's root they fall
// under — LONGEST prefix, not merely a matching one (§10c). Without this the
// file's Oakville entries were checked against whatever dist was built, so a
// North York build reported 45 URLs "not built" and buried the one finding
// that was actually about North York.
//
// The `siblings` term is what makes it longest-prefix rather than any-prefix.
// A service-area entity has root "/", and "/" is a prefix of every URL on the
// domain — so without subtracting the siblings the root claims Oakville's and
// North York's pages as undispositioned gaps in its own map. This is the same
// shape as the bug where "/" as a sibling root disabled lint's chrome check
// entirely: a prefix test against "/" is always true and is never what is meant.
//
// vercel.json is domain-wide and is still compared against the WHOLE document.
// Only siblings MORE SPECIFIC than this root can take URLs off it. Filtering
// on `!== ROOT` was not enough: Oakville lists "/" as a sibling, "/" is a
// prefix of "/oakville/anything", and subtracting it left Oakville owning
// nothing at all. Longest prefix wins, so a shorter sibling never does.
// Every declared sibling, including a shorter one. SIBLINGS below is deliberately
// only the more-specific roots — that is an ownership question. This is a
// different question: does any entity on this domain serve that URL at all.
const SIBLINGS_ALL = config.entity.siblings ?? [];
const SIBLINGS = (config.entity.siblings ?? [])
  .filter((r) => r.length > ROOT.length && String(r).startsWith(ROOT));
const owns = (u) => String(u).startsWith(ROOT)
  && !SIBLINGS.some((sib) => String(u).startsWith(sib));

const all = doc.urls ?? [];
const entries = all.filter((e) => owns(e.from));
const problems = [];

/** Does this URL resolve to a page in the build? Mirrors lint.mjs's builtFile. */
const builtFile = (url) => {
  const rel = url.startsWith(ROOT) ? url.slice(ROOT.length) : url.replace(/^\//, '');
  return fs.existsSync(path.join(DIST, rel, 'index.html'));
};

// ── 1. every crawled URL under this root has a disposition ───────────────
// The crawl is the authority for what exists. A URL that appears in a later
// crawl and not here is a page somebody forgot about, which is exactly the
// failure this file was created for.
const crawlPath = path.join(payloadRoot, doc.crawl ?? 'audit-tool/out/pages.json');
let crawled = [];
if (fs.existsSync(crawlPath)) {
  crawled = JSON.parse(fs.readFileSync(crawlPath, 'utf8'))
    .filter((p) => p.status === 200)
    .map((p) => new URL(p.url).pathname.replace(/\/?$/, '/'))
    // Longest-prefix ownership (PLANNING §10c). Compare WITH the trailing slash:
    // "/oakville-cabinet-refacing-locations/" starts with the characters
    // "/oakville" and is not inside "/oakville/".
    .filter(owns);
  const listed = new Set(entries.map((e) => e.from));
  for (const u of crawled) {
    if (!listed.has(u)) problems.push(`no disposition for ${u} — it is live and indexed`);
  }
} else {
  console.log(`  ⊘ no crawl at ${path.relative(payloadRoot, crawlPath)} — coverage unchecked`);
}

// ── 2. every entry is well formed, and its target is real ────────────────
const seen = new Set();
const redirected = new Set(entries.filter((e) => e.to).map((e) => e.from));

for (const e of entries) {
  const from = e.from;
  if (!from) { problems.push(`an entry has no "from"'`); continue; }
  if (seen.has(from)) problems.push(`${from} is listed twice`);
  seen.add(from);

  const how = ['keep', 'to', 'retire'].filter((k) => e[k] !== undefined);
  if (how.length !== 1) {
    problems.push(`${from} has ${how.length} dispositions (${how.join(', ') || 'none'}) — it needs exactly one`);
    continue;
  }

  if (e.keep && !builtFile(from)) {
    problems.push(`${from} says keep, but nothing is built there`);
  }
  if (e.to) {
    // A target inside THIS entity's root has to be in this dist. A target in a
    // sibling subtree cannot be — each entity builds alone, and /oakville/painter/
    // is simply absent from the GTA's dist even though the deployed tree has it.
    // Same resolution as lint.mjs's chrome check: a sibling root vouches for it.
    // Without this, every cross-subtree redirect read as a dead link, which is
    // most of what a legacy /location/ tree maps onto once the cities are split
    // across three sites.
    const owned = owns(e.to);
    if (owned && !builtFile(e.to)) {
      problems.push(`${from} → ${e.to}, which is not a built page`);
    } else if (!owned && !SIBLINGS_ALL.some((r) => String(e.to).startsWith(r))) {
      problems.push(`${from} → ${e.to}, which is in no entity on this domain`);
    }
    // A chain costs a hop and Google follows a limited number of them; more to
    // the point it means one of the two entries is out of date.
    if (redirected.has(e.to)) problems.push(`${from} → ${e.to}, which is itself redirected — chain`);
    if (e.to === from) problems.push(`${from} redirects to itself`);
  }
  if (e.retire !== undefined && !e.retire) {
    problems.push(`${from} is retired with no reason — say why, it is the only record`);
  }
}

// ── 3. vercel.json actually carries what this file says ─────────────────
// Vercel reads vercel.json before the build container starts, so the array
// cannot be generated during the build. It is committed, which means it can
// drift — and a redirect that exists in redirects.yaml and not in vercel.json is
// a redirect that does not happen.
{
  const vf = path.join(payloadRoot, 'vercel.json');
  if (fs.existsSync(vf)) {
    const vj = JSON.parse(fs.readFileSync(vf, 'utf8'));
    const have = vj.redirects ?? [];
    const want = emit(doc);
    if (JSON.stringify(have) !== JSON.stringify(want)) {
      problems.push(`vercel.json's redirects have drifted from redirects.yaml `
        + `(${have.length} there, ${want.length} expected) — run `
        + `\`node ../engine/scripts/emit-redirects.mjs\``);
    }
    // The 410s drift the same way and are easier to miss, because a missing one
    // degrades to a 404 rather than to nothing — the page still fails, just
    // silently and in the way that keeps the URL in the index.
    const haveGone = (vj.rewrites ?? []).filter((r) => r.destination === '/api/gone');
    const wantGone = emitGone(doc);
    if (JSON.stringify(haveGone) !== JSON.stringify(wantGone)) {
      problems.push(`vercel.json's 410 rewrites have drifted from redirects.yaml `
        + `(${haveGone.length} there, ${wantGone.length} expected) — run `
        + `\`node ../engine/scripts/emit-redirects.mjs\``);
    }
  }
}

// ── report ───────────────────────────────────────────────────────────────
const keep = entries.filter((e) => e.keep).length;
const to = entries.filter((e) => e.to).length;
const gone = entries.filter((e) => e.retire !== undefined).length;
const flagged = entries.filter((e) => e.note).length;

if (problems.length) {
  console.log(`\n  REDIRECT MAP (${entityId})\n`);
  for (const p of problems.slice(0, 25)) console.log(`    ! ${p}`);
  if (problems.length > 25) console.log(`    … and ${problems.length - 25} more`);
  console.log(`\n  ${problems.length} problem(s). Every URL the live site serves needs a`);
  console.log(`  disposition, and every target needs to be a page that exists.\n`);
  process.exit(1);
}

const others = all.length - entries.length;
console.log(`  ✓ ${entries.length} live URL(s) dispositioned — ${keep} kept, ${to} redirected`
  + (gone ? `, ${gone} retired` : ''));
if (flagged) {
  console.log(`    ${flagged} flagged for the ranked-keyword inventory before cutover (§11a)`);
}
if (others) {
  console.log(`    ${others} more in redirects.yaml belong to another entity's subtree`);
}
