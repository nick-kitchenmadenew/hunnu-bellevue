#!/usr/bin/env node
/**
 * Harvest the H2s and H3s competing pages actually use for a keyword.
 *
 * The supporting-content outline prompt takes "PAA + competitor H2/H3s" as an
 * input. PAA comes from paa-harvest.mjs; this is the other half. Knowing how
 * the ranking pages structure an answer is not the same as copying them — it
 * tells you which sub-questions a reader expects covered, which is exactly what
 * an outline decides.
 *
 * NOT part of the build. Research, run by hand, and the article written from it
 * is the deliverable.
 *
 *   DATAFORSEO_LOGIN=… DATAFORSEO_PASSWORD=… node scripts/serp-headings.mjs "keyword"
 *   node scripts/serp-headings.mjs --dry "keyword"      # plan and cost, calls nothing
 *   node scripts/serp-headings.mjs --out SERP-X.md "a" "b"
 *
 * Unlike paa-harvest.mjs this searches WITH the local SERP but takes the
 * keyword exactly as given — a supporting article's target keyword is already
 * whatever it is, and second-guessing it here would silently research a
 * different page than the one being written.
 *
 * Two calls per keyword: one SERP to find who ranks, one page parse each for
 * the top N. That is the cost driver — see TOP_N.
 */
import fs from 'node:fs';
import path from 'node:path';
import { config } from './silo.mjs';
import { payloadRoot } from '../src/lib/paths.js';
import { credentials, accountLine, MISSING } from './_dataforseo.mjs';

const DRY = process.argv.includes('--dry');
const OUT_FLAG = process.argv.indexOf('--out');
const OUT = path.join(payloadRoot,
  OUT_FLAG > -1 ? process.argv[OUT_FLAG + 1] : 'SERP-HEADINGS.md');

const KEYWORDS = process.argv.slice(2)
  .filter((a, i) => !a.startsWith('--') && process.argv[i + 1] !== a && i !== OUT_FLAG - 1);

if (!KEYWORDS.length) {
  console.error('\n  No keyword given.\n'
    + '    node scripts/serp-headings.mjs --dry "cabinet refacing worth it"\n');
  process.exit(1);
}

const a = config.entity.address;
const LOCATION = [a.locality, a.region_name ?? a.region, a.country_name ?? 'Canada'].join(',');

// How many ranking pages to parse per keyword. Four covers the shape of the
// answer; ten costs 2.5× to watch the same headings repeat.
const TOP_N = 4;

// $0.002 per SERP + $0.00125 per page parsed.
const estimate = (n) => (n * 0.002 + n * TOP_N * 0.00125).toFixed(3);

const creds = credentials(config);

if (DRY) {
  console.log(`\n  ${KEYWORDS.length} keyword(s), location "${LOCATION}", top ${TOP_N} pages each`);
  KEYWORDS.forEach((k) => console.log(`    · ${k}`));
  console.log(`\n  rough upper-bound cost: $${estimate(KEYWORDS.length)}`);
  console.log(accountLine(creds));
  console.log(`  would write: ${OUT}\n`);
  process.exit(0);
}

if (!creds.auth) {
  console.error(MISSING);
  process.exit(1);
}

const post = async (endpoint, body) => {
  const res = await fetch(`https://api.dataforseo.com/v3/${endpoint}`, {
    method: 'POST',
    headers: { Authorization: creds.auth, 'Content-Type': 'application/json' },
    body: JSON.stringify([body]),
  });
  const json = await res.json();
  if (json.status_code !== 20000) throw new Error(`${json.status_code} ${json.status_message}`);
  return json;
};

/** Organic result URLs, in rank order, from a SERP response. */
function ranked(json) {
  const items = json.tasks?.[0]?.result?.[0]?.items ?? [];
  return items.filter((i) => i.type === 'organic' && i.url).map((i) => i.url);
}

/** Every h2/h3 in a parsed page, in document order, at any nesting depth. */
function headings(node, found = []) {
  if (Array.isArray(node)) { node.forEach((n) => headings(n, found)); return found; }
  if (node && typeof node === 'object') {
    const tag = node.tag ?? node.type;
    if ((tag === 'h2' || tag === 'h3') && node.text) {
      found.push({ level: tag, text: String(node.text).trim() });
    }
    Object.values(node).forEach((v) => headings(v, found));
  }
  return found;
}

const results = [];
let spent = 0;

for (const keyword of KEYWORDS) {
  process.stdout.write(`  ${keyword.padEnd(34)}`);
  const entry = { keyword, pages: [] };
  try {
    const serp = await post('serp/google/organic/live/advanced', {
      keyword, location_name: LOCATION, language_code: 'en',
    });
    spent += serp.cost ?? 0;
    const urls = ranked(serp).slice(0, TOP_N);

    for (const url of urls) {
      try {
        const page = await post('on_page/content_parsing/live', { url });
        spent += page.cost ?? 0;
        const hs = headings(page.tasks?.[0]?.result ?? []);
        // Dedupe within one page — a heading repeated in a nav and the body is
        // one heading as far as an outline is concerned.
        const seen = new Set();
        entry.pages.push({
          url,
          headings: hs.filter((h) => !seen.has(h.text) && seen.add(h.text)),
        });
      } catch (e) {
        entry.pages.push({ url, headings: [], error: String(e.message || e) });
      }
    }
    console.log(`${entry.pages.length} pages, `
      + `${entry.pages.reduce((n, p) => n + p.headings.length, 0)} headings`);
  } catch (e) {
    entry.error = String(e.message || e);
    console.log(`FAILED — ${e.message || e}`);
  }
  results.push(entry);
}

const lines = [
  '# Competitor headings — harvested',
  '',
  `Source: DataForSEO SERP + content parsing, location "${LOCATION}", top ${TOP_N} organic results.`,
  `Harvested ${new Date().toISOString().slice(0, 10)}. Cost: $${spent.toFixed(4)}.`,
  '',
  'Input for the supporting-content outline prompt. These are what competing',
  'pages chose to cover — a map of expected sub-questions, not a template to',
  'copy. An outline that matches one of these page-for-page has not been',
  'written, it has been transcribed.',
  '',
];

for (const { keyword, pages, error } of results) {
  lines.push(`## ${keyword}`, '');
  if (error) { lines.push(`_Failed: ${error}_`, ''); continue; }
  for (const p of pages) {
    lines.push(`### ${p.url}`, '');
    if (p.error) { lines.push(`_Could not parse: ${p.error}_`, ''); continue; }
    if (!p.headings.length) { lines.push('_No h2/h3 found._', ''); continue; }
    p.headings.forEach((h) => lines.push(`${h.level === 'h3' ? '  - ' : '- '}${h.text}`));
    lines.push('');
  }
}

fs.writeFileSync(OUT, lines.join('\n'));
console.log(`\n  wrote ${OUT} — $${spent.toFixed(4)}\n`);
