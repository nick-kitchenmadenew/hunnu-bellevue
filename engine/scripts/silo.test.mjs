#!/usr/bin/env node
/**
 * Silo rule tests.
 *
 * These are the Core 30 link rules stated as cases. The linter is only as good as
 * this table — a silo model that quietly starts allowing everything looks exactly
 * like a clean build, which is the failure mode this file exists to prevent.
 *
 * The cases run against a SYNTHETIC business, not against this one. They named
 * real Oakville URLs until 2026-08-02, which meant the suite proving the silo
 * rules was the suite guaranteed to fail on the first day of the second client —
 * every case pointing at a page that does not exist there. A fixture also lets
 * the shapes be chosen for what they test rather than for what Kitchen Made New
 * happens to sell.
 *
 *   node scripts/silo.test.mjs
 */
import { buildPages, checkLink } from './silo.mjs';

const OK = 'ok', NO = 'block';

// A plumber, deliberately: nothing here should read as a kitchen. Two silos so
// there is a boundary to cross, one merged into the root as the primary
// category, a location page, a supporting article pair for the circle, and both
// hubs.
const FIXTURE = {
  entity: {
    root: '/gary/',
    nav: [{ slug: 'about' }, { slug: 'contact' }],
  },
  silos: [
    { category: 'Plumber', is_homepage: true, slug: '',
      services: [{ slug: 'drain-cleaning' }, { slug: 'water-heaters' }] },
    { category: 'Septic system service', slug: 'septic',
      services: [{ slug: 'tank-pumping' }, { slug: 'field-repair' }] },
  ],
  locations: [{ slug: 'merrillville', city: 'Merrillville' }],
  neighbourhoods: [{ slug: 'glen-park', for: 'septic/tank-pumping' }],
  supporting: [
    { slug: 'why-drains-smell', for: 'drain-cleaning' },
    { slug: 'how-often-to-pump', for: 'drain-cleaning' },
  ],
};

const { pages: P } = buildPages(FIXTURE);
const check = (from, to) => checkLink(from, to, P);

const cases = [
  // Down and up, the only two legal directions.
  ['/gary/', '/gary/septic/', OK, 'root down to a category pillar'],
  ['/gary/', '/gary/drain-cleaning/', OK, 'root down to its own service (primary silo is merged into the root)'],
  ['/gary/', '/gary/merrillville/', OK, 'root down to a location page'],
  ['/gary/septic/', '/gary/septic/tank-pumping/', OK, 'pillar down to its own service'],
  ['/gary/septic/tank-pumping/', '/gary/septic/', OK, 'service up to its own pillar'],
  ['/gary/septic/', '/gary/', OK, 'pillar up to the root, which is its parent'],
  ['/gary/merrillville/', '/gary/', OK, 'location up to the root'],

  // Everything sideways, which is what the silo exists to stop.
  ['/gary/septic/', '/gary/drain-cleaning/', NO, 'pillar into the primary silo', 'crosses silo'],
  ['/gary/septic/tank-pumping/', '/gary/drain-cleaning/', NO, 'service to another silo\u2019s service', 'crosses silo'],
  ['/gary/septic/tank-pumping/', '/gary/septic/field-repair/', NO, 'service to a sibling service', 'lateral link'],
  ['/gary/drain-cleaning/', '/gary/water-heaters/', NO, 'service to a sibling inside the primary silo', 'lateral link'],

  // Level skipping.
  ['/gary/septic/tank-pumping/', '/gary/', NO, 'service jumping past its pillar to the root', 'skipping its own parent'],
  ['/gary/', '/gary/septic/tank-pumping/', NO, 'root reaching two levels down into another silo', 'not one level down'],

  // The neighbourhood page's one declared edge, and only that one.
  ['/gary/glen-park/', '/gary/septic/tank-pumping/', OK, 'neighbourhood to the service it argues for'],
  ['/gary/glen-park/', '/gary/septic/field-repair/', NO, 'neighbourhood to a service it does not declare', 'crosses silo'],

  // The circle: laterally between supporting articles under one parent, and
  // nowhere else.
  ['/gary/why-drains-smell/', '/gary/how-often-to-pump/', OK, 'supporting article to its sibling'],
  ['/gary/why-drains-smell/', '/gary/drain-cleaning/', OK, 'supporting article up to the service it answers for'],
  ['/gary/why-drains-smell/', '/gary/septic/', NO, 'supporting article into another silo', 'crosses silo'],

  // The hubs point at everything and nothing in prose points back.
  ['/gary/services/', '/gary/septic/tank-pumping/', OK, 'services hub down into any silo'],
  ['/gary/services/', '/gary/', OK, 'services hub up to its own parent'],
  ['/gary/septic/', '/gary/services/', NO, 'body prose linking into the hub', 'reached from nav and footer only'],
  ['/gary/locations/', '/gary/merrillville/', OK, 'locations hub down to a location'],

  // Unknown target.
  ['/gary/', '/gary/not-a-page/', NO, 'target not declared in config', 'not in any silo'],
];

// A blocked case also names the rule that must catch it. Without that the suite
// passes while the model rots: delete the cross-silo rule and every case it
// covered still comes back blocked, because the lateral-link rule catches them
// on the way past. Same verdict, different reason, and nothing to see.
let failed = 0;
for (const [from, to, want, label, reason] of cases) {
  const v = check(from, to);
  const got = v ? NO : OK;
  if (got !== want) {
    failed++;
    console.log(`  FAIL  expected ${want}, got ${got}  —  ${label}`);
    console.log(`        ${from} → ${to}${v ? '\n        ' + v : ''}`);
  } else if (want === NO && reason && !v.includes(reason)) {
    failed++;
    console.log(`  FAIL  blocked for the wrong reason  —  ${label}`);
    console.log(`        ${from} → ${to}`);
    console.log(`        wanted "${reason}", got "${v}"`);
  }
}

if (failed) {
  console.log(`\n  ${failed} of ${cases.length} silo rules wrong\n`);
  process.exit(1);
}
console.log(`  ✓ ${cases.length} silo rules hold`);

/**
 * Every content file's declared `silo` must match the silo its path puts it in.
 *
 * Runs here rather than in lint.mjs because the linter reads built HTML and this
 * lives in frontmatter. It also has to run BEFORE the build, since the whole
 * point is to catch the file before it becomes a page.
 *
 * The failure it prevents is quiet rather than loud. Put `silo: Painter` on a
 * file under the Kitchen remodeler root and every other check still passes — the
 * schema is satisfied, the word count is fine, the links resolve — but the page
 * now claims one silo while the link rules judge it by another, and the
 * re-theming checks read the wrong config entry. It looks like a clean build.
 */
const fs = await import('node:fs');
const path = await import('node:path');
const { pages, config } = await import('./silo.mjs');
const { contentDir } = await import('../src/lib/paths.js');

const CONTENT = contentDir;
const root = config.entity.root;
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(d, e.name);
  return e.isDirectory() ? walk(p) : e.name.endsWith('.md') ? [p] : [];
});

let siloFailed = 0, checked = 0;
for (const file of walk(CONTENT)) {
  const src = fs.readFileSync(file, 'utf8');
  const fm = (src.match(/^---\n([\s\S]*?)\n---/) || [, ''])[1];
  const declared = (fm.match(/^silo:\s*(.+)$/m) || [, null])[1]?.trim();
  if (!declared) continue;

  // content/oakville/painter/spray-painting.md -> /oakville/painter/spray-painting/
  const rel = path.relative(CONTENT, file).replace(/\.md$/, '').split(path.sep);
  const url = (root + rel.slice(1).join('/') + '/').replace(/\/+/g, '/');
  const known = pages.get(url);
  if (!known) continue;                       // not declared in config; other checks own that
  checked++;

  // Utility pages sit outside every silo but still name one, so that a stray
  // body link from About has something to be judged against. Not a mismatch.
  //
  // The services hub is the same case for a different reason: it indexes every
  // silo and therefore belongs to none, so whatever it names in frontmatter
  // cannot match `__hub`. checkLink governs its links directly rather than by
  // silo identity — see the note where the hub is registered in silo.mjs.
  // Location pages are the same case again: they declare a silo so the template
  // can resolve a base and a parent name, but they sit on the geographic axis
  // and their path is in `__locations`, which no declared category can match.
  if (known.kind === 'utility' || known.kind === 'hub' || known.kind === 'location') continue;

  if (known.silo !== declared) {
    siloFailed++;
    console.log(`  FAIL  ${path.relative(CONTENT, file)}`);
    console.log(`        declares silo "${declared}" but its path is in "${known.silo}" (${url})`);
  }
}

if (siloFailed) {
  console.log(`\n  ${siloFailed} content file(s) declare the wrong silo\n`);
  process.exit(1);
}
console.log(`  ✓ ${checked} content file(s) declare the silo their path puts them in`);
