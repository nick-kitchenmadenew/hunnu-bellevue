#!/usr/bin/env node
/**
 * Cannibalisation ACROSS entities.
 *
 *   node ../engine/scripts/cross-entity.mjs
 *
 * lint.mjs already refuses two pages on one subtree that aim at the same query.
 * It cannot see the other subtrees: it walks a single `dist`, and each entity is
 * built alone, so /cabinet-refacing-cost/ on the root and a hypothetical
 * /northyork/cabinet-refacing-cost/ would never appear in the same run. Google
 * sees one domain and would have to pick between them.
 *
 * That gap went unnoticed until North York's supporting tier was written and the
 * obvious move — reuse the root's five article slugs with a city on the end —
 * turned out to be one nothing would have caught.
 *
 * So this reads the CONTENT rather than a build. No dist needed, every entity at
 * once, which is the only way to ask a question about the domain rather than
 * about one site on it.
 */
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { payloadRoot } from '../src/lib/payload-root.js';

/** Same reduction lint.mjs uses, restated because that one runs per-entity. */
function titleTarget(title) {
  return [...new Set(String(title).split('|')[0].toLowerCase()
    .replace(/\b(in|the|a|an|your|our|and|for|with|to)\b/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/).filter(Boolean)
    .map((w) => w.replace(/(ers|er|ing|s)$/, '')))]
    .sort().join(' ');
}

const entities = fs.readdirSync(payloadRoot)
  .map((f) => /^config-(.+)\.yaml$/.exec(f)).filter(Boolean).map((m) => m[1]);

const seen = new Map();               // normalised target -> [{entity, file, title}]
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(path.join(dir, e.name))
    : e.name.endsWith('.md') ? [path.join(dir, e.name)] : []);

for (const ent of entities) {
  const dir = path.join(payloadRoot, 'content', ent);
  if (!fs.existsSync(dir)) continue;
  for (const file of walk(dir)) {
    const raw = fs.readFileSync(file, 'utf8');
    const fm = raw.split(/^---$/m)[1];
    if (!fm) continue;
    let doc;
    try { doc = yaml.load(fm); } catch { continue; }
    if (!doc?.title) continue;
    const key = titleTarget(doc.title);
    if (!key) continue;
    if (!seen.has(key)) seen.set(key, []);
    seen.get(key).push({ ent, rel: path.relative(payloadRoot, file), title: doc.title });
  }
}

const clashes = [...seen.values()]
  .filter((rows) => new Set(rows.map((r) => r.ent)).size > 1);

// ── city ownership ───────────────────────────────────────────────────────
// Structural rather than textual, and a hard error rather than a warning.
//
// The title check above compares word SETS for exact equality, so
// "Cabinet Refacing Mississauga" and "Kitchen Cabinet Refacing Mississauga"
// reduce to different keys — one word apart. Two pages, one city, one service,
// both live, and this script said nothing. A third was declared and unbuilt.
//
// Prose is the wrong thing to ask. Which subtree owns a city is DECLARED, in
// `locations` and in the entity's own city, so ask the config.
//
// `service_area_without_pages` is deliberately not a claim — it is the explicit
// statement that a city is served with no page here, which is how a profile
// keeps a city its subtree does not hold.
const norm = (c) => String(c).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const owners = new Map();               // city -> [{ent, kind}]
const claim = (city, ent, kind) => {
  if (!city) return;
  const k = norm(city);
  if (!owners.has(k)) owners.set(k, []);
  owners.get(k).push({ ent, kind, city });
};

const cityErrors = [];
for (const ent of entities) {
  const cfg = yaml.load(
    fs.readFileSync(path.join(payloadRoot, `config-${ent}.yaml`), 'utf8')) ?? {};
  const e = cfg.entity ?? {};
  const declared = (cfg.locations ?? []).map((l) => l.city);
  const disclaimed = (e.service_area_without_pages ?? []).map((s) => s.city);

  for (const c of declared) claim(c, ent, 'location page');
  // The home city is targeted by the subtree itself — every H1 on it says so —
  // so another entity giving it a location page is the same collision.
  claim(e.city, ent, 'home city');
  claim(e.address?.locality, ent, 'home city');

  // Declaring a city in both lists at once says two opposite things.
  for (const c of disclaimed) {
    if (declared.some((d) => norm(d) === norm(c))) {
      cityErrors.push(`${ent}: "${c}" is in BOTH locations and `
        + `service_area_without_pages — it cannot be a page and not a page`);
    }
  }
}

for (const [, rows] of owners) {
  const ents = [...new Set(rows.map((r) => r.ent))];
  if (ents.length < 2) continue;
  // Two entities naming the same city. Legitimate only if neither builds a page
  // for it, which cannot happen here: every row is a page or a subtree target.
  cityErrors.push(`"${rows[0].city}" is claimed by ${ents.length} entities — `
    + rows.map((r) => `${r.ent} (${r.kind})`).join(', '));
}

if (cityErrors.length) {
  console.log(`\n  CITY OWNED BY MORE THAN ONE ENTITY (${cityErrors.length})\n`);
  for (const m of cityErrors) console.log(`    ! ${m}`);
  console.log(`\n  One city, one subtree. Two pages on "cabinet refacing <city>" compete`);
  console.log(`  on a single domain and no link can resolve it — §10c, and rulings`);
  console.log(`  #35.3, #36 and #39. Drop the city from one config's \`locations\` and`);
  console.log(`  declare it under that entity's \`service_area_without_pages\`, which`);
  console.log(`  keeps it on the profile without giving it a second page.\n`);
  process.exit(1);
}

if (!clashes.length) {
  console.log(`  ✓ no page on ${entities.length} entities targets another entity's query`);
  console.log(`  ✓ ${owners.size} cities each owned by exactly one entity`);
  process.exit(0);
}
console.log(`  ✓ ${owners.size} cities each owned by exactly one entity`);

// A WARNING, not a gate, and the reason is the hub pages. /services/ exists on
// every subtree as "Our Services | Kitchen Made New <city>" — the city is after
// the pipe, which this reduction drops, so they collide here while differing to
// Google. Failing the build on those would mean either renaming every hub or
// carving out an exemption that hides the real cases behind it.
console.log(`\n  CROSS-ENTITY TARGETS (${clashes.length})\n`);
for (const rows of clashes) {
  for (const r of rows) console.log(`    ${r.ent.padEnd(10)} ${r.rel}`);
  console.log(`      → "${rows[0].title.split('|')[0].trim()}"\n`);
}
console.log(`  Two subtrees on one query is the collision §10c exists to prevent, and`);
console.log(`  lint.mjs cannot see it — it walks one entity's dist. Hub and utility`);
console.log(`  pages carrying their city after the "|" are expected here; a money page`);
console.log(`  or a supporting article is not.\n`);
