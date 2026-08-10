#!/usr/bin/env node
/**
 * Harvest Google "People Also Ask" questions for our categories and services.
 *
 * This is the one step of the topical-relevance method that cannot be done from
 * the transcript alone. Caleb's instruction is to type the term into Google
 * WITHOUT a geographic modifier, find the People Also Ask block, and then "click
 * to open and then click to close and then click to open" until several dozen
 * questions have been drawn out. `people_also_ask_click_depth` is the API's
 * version of that: depth 4 expands each question and harvests what unfolds.
 *
 * NOT part of the build. Run it by hand when the topic list needs refreshing —
 * the output is research, and the articles written from it are the deliverable.
 *
 *   DATAFORSEO_LOGIN=… DATAFORSEO_PASSWORD=… node scripts/paa-harvest.mjs
 *   node scripts/paa-harvest.mjs --dry     # show the plan and the cost, call nothing
 *
 * Credentials come from the environment and are never written anywhere. Put them
 * in .env.local, which is gitignored.
 */
import fs from 'node:fs';
import path from 'node:path';
import { config } from './silo.mjs';
import { payloadRoot } from '../src/lib/paths.js';

const DRY = process.argv.includes('--dry');
const OUT_FLAG = process.argv.indexOf('--out');
const OUT = path.join(payloadRoot,
  OUT_FLAG > -1 ? process.argv[OUT_FLAG + 1] : 'PAA-HARVEST.md');

// The terms to search, WITHOUT the city — that is the instruction, and it
// matters: adding "Oakville" returns a local pack rather than the informational
// questions this is looking for. The location below still localises the SERP.
// Seeds may be passed on the command line to research one cluster rather than
// re-harvesting the whole site's vocabulary:
//   node scripts/paa-harvest.mjs --out PAA-REFACING-LIMITS.md "is cabinet refacing worth it" …
const ARGS = process.argv.slice(2)
  .filter((a, i) => !a.startsWith('--') && process.argv[i + 1] !== a && i !== OUT_FLAG - 1);
// With no seeds on the command line, the default is EVERY service this entity
// declares. That was a hand-written list of Kitchen Made New's eight terms,
// which is the same list the config already holds under `silos` — and which
// would have returned cabinet questions for a plumber.
// Head terms, one per silo, which is what "search the category without a city"
// means. Service names are deliberately NOT the default: seventeen long-tail
// phrases cost five times as much and return thinner blocks, and anyone who
// wants one passes it on the command line.
const KEYWORDS = ARGS.length ? ARGS
  : [...new Set(config.silos.flatMap((s) => [s.retheme, s.category].filter(Boolean)))];

// Localises the SERP without appearing in the query — see the note above about
// searching WITHOUT the city.
const a = config.entity.address;
const LOCATION = [a.locality, a.region_name ?? a.region, a.country_name ?? 'Canada'].join(',');
const CLICK_DEPTH = 4;

// $0.002 per live/advanced request, plus $0.00015 per expanded PAA item. The
// depth multiplier is an upper bound, not a promise — most terms return fewer.
const estimate = (n) => (n * 0.002 + n * CLICK_DEPTH * 8 * 0.00015).toFixed(3);

const login = process.env.DATAFORSEO_LOGIN;
const password = process.env.DATAFORSEO_PASSWORD;

if (DRY) {
  console.log(`\n  ${KEYWORDS.length} keywords, location "${LOCATION}", click depth ${CLICK_DEPTH}`);
  KEYWORDS.forEach((k) => console.log(`    · ${k}`));
  console.log(`\n  rough upper-bound cost: $${estimate(KEYWORDS.length)}`);
  console.log(`  credentials: ${login && password ? 'found in the environment' : 'NOT SET — add them to .env.local'}`);
  console.log(`  would write: ${OUT}\n`);
  process.exit(0);
}

if (!login || !password) {
  console.error('\n  DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD are not set.\n'
    + '  Add them to .env.local (gitignored) and run with:\n'
    + '    set -a && . ../.env.local && set +a && node scripts/paa-harvest.mjs\n');
  process.exit(1);
}

const auth = 'Basic ' + Buffer.from(`${login}:${password}`).toString('base64');

/** Every PAA question in a response, at any nesting depth. */
function questions(node, found = new Set()) {
  if (Array.isArray(node)) { node.forEach((n) => questions(n, found)); return found; }
  if (node && typeof node === 'object') {
    if (node.type === 'people_also_ask_element' && node.title) found.add(node.title.trim());
    Object.values(node).forEach((v) => questions(v, found));
  }
  return found;
}

const results = [];
let spent = 0;

for (const keyword of KEYWORDS) {
  process.stdout.write(`  ${keyword.padEnd(26)}`);
  try {
    const res = await fetch('https://api.dataforseo.com/v3/serp/google/organic/live/advanced', {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      body: JSON.stringify([{
        keyword,
        location_name: LOCATION,
        language_code: 'en',
        people_also_ask_click_depth: CLICK_DEPTH,
      }]),
    });
    const json = await res.json();
    if (json.status_code !== 20000) throw new Error(`${json.status_code} ${json.status_message}`);
    spent += json.cost ?? 0;
    const qs = [...questions(json.tasks?.[0]?.result ?? [])];
    results.push({ keyword, qs });
    console.log(`${qs.length} questions`);
  } catch (e) {
    results.push({ keyword, qs: [], error: String(e.message || e) });
    console.log(`FAILED — ${e.message || e}`);
  }
}

const seen = new Set();
const lines = [
  '# People Also Ask — harvested',
  '',
  `Source: DataForSEO live/advanced, location "${LOCATION}", click depth ${CLICK_DEPTH}.`,
  `Harvested ${new Date().toISOString().slice(0, 10)}. Cost: $${spent.toFixed(4)}.`,
  '',
  'Searched WITHOUT the city, per the method — adding it returns a local pack',
  'rather than the informational questions this is looking for.',
  '',
];
for (const { keyword, qs, error } of results) {
  lines.push(`## ${keyword}`, '');
  if (error) { lines.push(`_request failed: ${error}_`, ''); continue; }
  if (!qs.length) { lines.push('_no People Also Ask block returned_', ''); continue; }
  for (const q of qs) {
    lines.push(`- ${q}${seen.has(q.toLowerCase()) ? '  _(also above)_' : ''}`);
    seen.add(q.toLowerCase());
  }
  lines.push('');
}
lines.push(`---`, ``, `${seen.size} distinct questions across ${KEYWORDS.length} terms.`);

fs.writeFileSync(OUT, lines.join('\n'));
console.log(`\n  ${seen.size} distinct questions -> ${OUT}`);
console.log(`  cost: $${spent.toFixed(4)}\n`);
