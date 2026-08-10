#!/usr/bin/env node
/**
 * Harvest the H2s and H3s competing pages actually use for a keyword.
 *
 * Knowing how the ranking pages structure an answer is not the same as
 * copying them — it tells you which sub-questions a reader expects covered,
 * which is exactly what a section outline decides.
 *
 * Client-local, not vendored. This lived in engine/scripts/ as part of the
 * v1.33.0 content pipeline; Nick reverted that upstream (v1.34.0, "content
 * pipeline removed") before it was ever run on a real page. Restoring it
 * there would work against that decision and would be overwritten by the
 * next engine-sync regardless. This copy is this repo's own, simplified to
 * match how paa-harvest.mjs already reads credentials — straight from the
 * environment, no config field, no shared account-tracking helper.
 *
 * NOT part of the build. Research, run by hand, and the content revised
 * from it is the deliverable.
 *
 *   cd site
 *   CORE30_ENTITY=bellevue node ../scripts/serp-headings.mjs --dry "keyword"
 *   CORE30_ENTITY=bellevue node ../scripts/serp-headings.mjs --out ../SERP-X.md "a" "b"
 *
 * Unlike paa-harvest.mjs this searches WITH the local SERP but takes the
 * keyword exactly as given — the target keyword is already whatever it is,
 * and second-guessing it here would silently research a different page than
 * the one being written.
 *
 * Two calls per keyword: one SERP to find who ranks, one page parse each for
 * the top N. That is the cost driver — see TOP_N.
 *
 * Credentials come from the environment and are never written anywhere. Put
 * them in .env.local, which is gitignored.
 */
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../engine/scripts/silo.mjs';
import { payloadRoot } from '../engine/src/lib/paths.js';

const DRY = process.argv.includes('--dry');
const OUT_FLAG = process.argv.indexOf('--out');
const OUT = path.join(payloadRoot,
  OUT_FLAG > -1 ? process.argv[OUT_FLAG + 1] : 'SERP-HEADINGS.md');

const KEYWORDS = process.argv.slice(2)
  .filter((a, i) => !a.startsWith('--') && process.argv[i + 1] !== a && i !== OUT_FLAG - 1);

if (!KEYWORDS.length) {
  console.error('\n  No keyword given.\n'
    + '    node ../scripts/serp-headings.mjs --dry "kitchen remodeler bellevue"\n');
  process.exit(1);
}

const a = config.entity.address;
const LOCATION = [a.locality, a.region_name ?? a.region, a.country_name ?? 'United States'].join(',');

// How many ranking pages to parse per keyword. Four covers the shape of the
// answer; ten costs 2.5x to watch the same headings repeat.
const TOP_N = 4;

// $0.002 per SERP + $0.00125 per page parsed.
const estimate = (n) => (n * 0.002 + n * TOP_N * 0.00125).toFixed(3);

const login = process.env.DATAFORSEO_LOGIN;
const password = process.env.DATAFORSEO_PASSWORD;

if (DRY) {
  console.log(`\n  ${KEYWORDS.length} keyword(s), location "${LOCATION}", top ${TOP_N} pages each`);
  KEYWORDS.forEach((k) => console.log(`    · ${k}`));
  console.log(`\n  rough upper-bound cost: $${estimate(KEYWORDS.length)}`);
  console.log(`  credentials: ${login && password ? 'found in the environment' : 'NOT SET — add them to .env.local'}`);
  console.log(`  would write: ${OUT}\n`);
  process.exit(0);
}

if (!login || !password) {
  console.error('\n  DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD are not set.\n'
    + '  Add them to .env.local (gitignored) and run with:\n'
    + '    set -a && . ../.env.local && set +a && node ../scripts/serp-headings.mjs\n');
  process.exit(1);
}

const auth = 'Basic ' + Buffer.from(`${login}:${password}`).toString('base64');

const post = async (endpoint, body) => {
  const res = await fetch(`https://api.dataforseo.com/v3/${endpoint}`, {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
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

/**
 * Every heading DataForSEO's content parser found in the page's main body,
 * in document order.
 *
 * The real response shape (confirmed against a live call, 2026-08-10) is
 * `page_content.main_topic[]`, each entry `{ h_title, level, primary_content }`
 * — NOT a generic `{ tag: 'h2'|'h3', text }` tree. `secondary_topic` exists
 * too (sidebar/widget content) and is deliberately skipped — it isn't the
 * body structure an outline should be informed by.
 */
function headings(pageContent) {
  return (pageContent?.main_topic ?? [])
    .filter((b) => b && b.h_title)
    .map((b) => ({ level: Number(b.level) || 2, text: String(b.h_title).trim() }));
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
        const pageContent = page.tasks?.[0]?.result?.[0]?.items?.[0]?.page_content;
        const hs = headings(pageContent);
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
  'What ranking pages chose to cover — a map of expected sub-questions, not a',
  'template to copy. Content that matches one of these page-for-page has not',
  'been written, it has been transcribed.',
  '',
];

for (const { keyword, pages, error } of results) {
  lines.push(`## ${keyword}`, '');
  if (error) { lines.push(`_Failed: ${error}_`, ''); continue; }
  for (const p of pages) {
    lines.push(`### ${p.url}`, '');
    if (p.error) { lines.push(`_Could not parse: ${p.error}_`, ''); continue; }
    if (!p.headings.length) { lines.push('_No headings found._', ''); continue; }
    p.headings.forEach((h) => lines.push(`${'  '.repeat(Math.max(0, h.level - 2))}- (h${h.level}) ${h.text}`));
    lines.push('');
  }
}

fs.writeFileSync(OUT, lines.join('\n'));
console.log(`\n  wrote ${OUT} — $${spent.toFixed(4)}\n`);
