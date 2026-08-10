#!/usr/bin/env node
/**
 * Search volume and related terms for a keyword.
 *
 * READ THIS BEFORE USING IT. The course this engine implements is explicit that
 * local SEO does not do keyword research — "all we're trying to do is get the
 * GBP to rank higher", and Keyword Planner "exists to help people buy more
 * ads". See docs/CORE30-FAQ.md § "Rank maps replace keyword research". Rank
 * maps decide what to build next; this does not.
 *
 * It exists because Nick asked for it, knowing that, on 2026-08-09 — a
 * deliberate divergence rather than an oversight. It has ONE legitimate job:
 * the supporting-content outline prompt has a "Secondary keywords (5–8)" output
 * field, and without data the model invents that list. Inventing it is exactly
 * the failure this pipeline was built to stop. Filling it from real data is the
 * use case.
 *
 * Do not let it become the thing that decides which pages to build. That is the
 * rank map's job, and swapping the two is how a local site ends up optimised
 * for volume it will never rank for.
 *
 *   DATAFORSEO_LOGIN=… DATAFORSEO_PASSWORD=… node scripts/keyword-data.mjs "keyword"
 *   node scripts/keyword-data.mjs --dry "keyword"
 *   node scripts/keyword-data.mjs --out KW-X.md "a" "b"
 */
import fs from 'node:fs';
import path from 'node:path';
import { config } from './silo.mjs';
import { payloadRoot } from '../src/lib/paths.js';
import { credentials, accountLine, MISSING } from './_dataforseo.mjs';

const DRY = process.argv.includes('--dry');
const OUT_FLAG = process.argv.indexOf('--out');
const OUT = path.join(payloadRoot,
  OUT_FLAG > -1 ? process.argv[OUT_FLAG + 1] : 'KEYWORD-DATA.md');

const KEYWORDS = process.argv.slice(2)
  .filter((a, i) => !a.startsWith('--') && process.argv[i + 1] !== a && i !== OUT_FLAG - 1);

if (!KEYWORDS.length) {
  console.error('\n  No keyword given.\n'
    + '    node scripts/keyword-data.mjs --dry "cabinet refacing cost"\n');
  process.exit(1);
}

const a = config.entity.address;
const LOCATION = [a.locality, a.region_name ?? a.region, a.country_name ?? 'Canada'].join(',');

// $0.05 per task on keywords_for_keywords, whatever the keyword count — so one
// call carrying every seed rather than one call each.
const estimate = () => (0.05).toFixed(3);

const creds = credentials(config);

if (DRY) {
  console.log(`\n  ${KEYWORDS.length} seed keyword(s), location "${LOCATION}"`);
  KEYWORDS.forEach((k) => console.log(`    · ${k}`));
  console.log(`\n  rough upper-bound cost: $${estimate()}  (one task, all seeds)`);
  console.log(accountLine(creds));
  console.log(`  would write: ${OUT}`);
  console.log('\n  Note: volume is a tie-breaker for secondary keywords, not a page-selection');
  console.log('  tool — docs/CORE30-FAQ.md § "Rank maps replace keyword research".\n');
  process.exit(0);
}

if (!creds.auth) {
  console.error(MISSING);
  process.exit(1);
}

const res = await fetch(
  'https://api.dataforseo.com/v3/keywords_data/google_ads/keywords_for_keywords/live', {
    method: 'POST',
    headers: { Authorization: creds.auth, 'Content-Type': 'application/json' },
    body: JSON.stringify([{
      keywords: KEYWORDS,
      location_name: LOCATION,
      language_code: 'en',
      sort_by: 'search_volume',
    }]),
  });

const json = await res.json();
if (json.status_code !== 20000) {
  console.error(`\n  FAILED — ${json.status_code} ${json.status_message}\n`);
  process.exit(1);
}

const spent = json.cost ?? 0;
const items = json.tasks?.[0]?.result ?? [];

const lines = [
  '# Keyword data — harvested',
  '',
  `Source: DataForSEO keywords_for_keywords, location "${LOCATION}".`,
  `Seeds: ${KEYWORDS.map((k) => `"${k}"`).join(', ')}.`,
  `Harvested ${new Date().toISOString().slice(0, 10)}. Cost: $${spent.toFixed(4)}.`,
  '',
  '**What this is for:** filling the "Secondary keywords (5–8)" field in a',
  'supporting-content outline with real terms instead of invented ones.',
  '',
  '**What it is not for:** deciding which pages to build. Rank maps do that —',
  'see `docs/CORE30-FAQ.md` § "Rank maps replace keyword research". Volume is a',
  'tie-breaker between phrasings, not a reason a page should exist.',
  '',
  '| Keyword | Volume | Competition | CPC |',
  '|---|---:|---|---:|',
];

for (const k of items) {
  const vol = k.search_volume ?? 0;
  const comp = k.competition ?? '—';
  const cpc = k.cpc == null ? '—' : `$${Number(k.cpc).toFixed(2)}`;
  lines.push(`| ${k.keyword} | ${vol} | ${comp} | ${cpc} |`);
}

if (!items.length) lines.push('| _no results_ | | | |');

fs.writeFileSync(OUT, lines.join('\n') + '\n');
console.log(`\n  ${items.length} keywords — wrote ${OUT} — $${spent.toFixed(4)}\n`);
