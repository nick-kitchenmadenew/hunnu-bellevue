#!/usr/bin/env node
/**
 * Score every built page on how much of it could ONLY appear on this site.
 *
 * The concern this answers is real — the August 2025 updates went after
 * generic AI content — but an AI-detector is the wrong instrument for it.
 * Detectors key on burstiness and perplexity, so they flag clean prose whatever
 * wrote it, and "improving" the score means adding irregularity: worse writing,
 * for a metric Google has never said it reads.
 *
 * What actually separates a useful page from slop is whether it says anything a
 * competitor could not. "We use a modified solvent degreaser because TSP cannot
 * lift wax and swells solid timber" is unownable by anyone else. "Quality
 * workmanship and attention to detail" is unownable by anyone at all.
 *
 * So this counts both.
 *
 *   node scripts/specificity.mjs [dist]
 *
 * The specific vocabulary comes from vocabulary-<entity>.yaml, cross-checked
 * against OPERATIONS.md so it cannot be padded with terms nobody uses. The
 * generic list stays in this file, because contractor-marketing filler is a
 * fixed genre and reads the same whether it is selling kitchens or drains —
 * which is the whole distinction this script is built on.
 */
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { config } from './silo.mjs';
import { operationsPath, vocabularyPath } from '../src/lib/paths.js';

const DIST = process.argv[2] || 'dist';
const ROOT = config.entity.root;

// ── what only this business can say ──────────────────────────────────────
// Terms and facts come from vocabulary-<entity>.yaml. They were listed here,
// which meant a script that measures whether a page could have been written by
// anyone was itself written for exactly one business.
const vocab = fs.existsSync(vocabularyPath)
  ? yaml.load(fs.readFileSync(vocabularyPath, 'utf8')) ?? {}
  : {};
if (!fs.existsSync(vocabularyPath)) {
  console.log(`\n  \u2298 no ${path.basename(vocabularyPath)} — scoring on places and filler alone\n`);
}

// Spelling is normalised on both sides before matching. The site is written in
// British English and OPERATIONS.md in American, so a literal match dropped
// "catalysed" — a term that appears on nine pages — because the document spells
// it with a z. The check was quietly undercounting the exact vocabulary it
// exists to find.
const norm = (s) => s.toLowerCase().replace(/ise\b/g, 'ize').replace(/ised\b/g, 'ized')
  .replace(/isation/g, 'ization').replace(/ysed\b/g, 'yzed').replace(/our\b/g, 'or');

// Only keep terms the operations document actually uses. Anything else would be
// vocabulary somebody invented, which is the failure this check exists to detect
// — so the list cannot be padded to improve the score.
const OPS = fs.existsSync(operationsPath)
  ? norm(fs.readFileSync(operationsPath, 'utf8')) : '';
const TERMS = (vocab.terms ?? []).filter((t) => OPS.includes(norm(t.split('-')[0])));

// Real places we have worked, from the config.
const PLACES = [
  ...(config.neighbourhoods ?? []).map((n) => n.name),
  ...(config.locations ?? []).map((l) => l.city),
  // A service-area entity has no address; its city is stated explicitly and every
  // city it serves is already in `locations`. Same shape as areaServed().
  config.entity.city ?? config.entity.address?.locality,
].filter(Boolean);

const FACTS = (vocab.facts ?? []).map((f) => new RegExp(f, 'i'));

// ── what any contractor could say ────────────────────────────────────────
const FILLER = [
  'quality workmanship', 'attention to detail', 'customer satisfaction',
  'years of experience', 'state of the art', 'peace of mind', 'dream kitchen',
  'wide range of', 'team of professionals', 'free consultation', 'competitive prices',
  'we pride ourselves', 'second to none', 'unparalleled', 'one-stop shop',
  'transform your space', 'look no further', 'we understand that', 'rest assured',
  'in today\'s world', 'when it comes to', 'first and foremost', 'top-notch',
  'cutting-edge', 'tailored to your needs', 'no job too big',
];

const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(d, e.name);
  return e.isDirectory() ? walk(p) : e.name === 'index.html' ? [p] : [];
});

const rows = [];
for (const file of walk(DIST)) {
  const html = fs.readFileSync(file, 'utf8');
  const main = (html.match(/<main\b[\s\S]*?<\/main>/i) || [''])[0];
  const text = main.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ');
  const lower = norm(text);
  const words = text.split(' ').filter(Boolean).length;
  if (!words) continue;

  const terms = TERMS.filter((t) => lower.includes(t)).length;
  const places = PLACES.filter((p) => text.includes(p)).length;
  const facts = FACTS.filter((re) => re.test(text)).length;
  const filler = FILLER.filter((f) => lower.includes(f));

  const specific = terms + places + facts;
  rows.push({
    url: (ROOT + file.replace(new RegExp(`^${DIST}/?`), '')).replace(/index\.html$/, '').replace(/\/+/g, '/'),
    words, terms, places, facts, specific,
    per1k: (specific / words) * 1000,
    filler,
  });
}

rows.sort((a, b) => a.per1k - b.per1k);

const pad = (s, n) => String(s).padEnd(n);
console.log('\n  SPECIFICITY — markers that could only appear on this site\n');
console.log(`  ${pad('page', 52)}${pad('words', 7)}${pad('term', 6)}${pad('place', 7)}${pad('fact', 6)}${pad('per 1k', 8)}filler`);
console.log('  ' + '─'.repeat(96));
for (const r of rows) {
  console.log(`  ${pad(r.url.slice(0, 50), 52)}${pad(r.words, 7)}${pad(r.terms, 6)}`
    + `${pad(r.places, 7)}${pad(r.facts, 6)}${pad(r.per1k.toFixed(1), 8)}`
    + (r.filler.length ? `⚠ ${r.filler.length}: ${r.filler.slice(0, 2).join(', ')}` : ''));
}

const med = rows[Math.floor(rows.length / 2)].per1k;
const withFiller = rows.filter((r) => r.filler.length);
console.log('\n  ' + '─'.repeat(96));
console.log(`  ${rows.length} pages · median ${med.toFixed(1)} markers per 1,000 words`);
console.log(`  weakest: ${rows[0].url} (${rows[0].per1k.toFixed(1)})`);
console.log(`  strongest: ${rows[rows.length - 1].url} (${rows[rows.length - 1].per1k.toFixed(1)})`);
console.log(`  pages containing contractor filler: ${withFiller.length}`);
for (const r of withFiller) console.log(`    ${r.url} — ${r.filler.join(', ')}`);
console.log();
