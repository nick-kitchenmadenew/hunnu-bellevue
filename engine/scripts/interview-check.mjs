#!/usr/bin/env node
/**
 * How much of the owner interview has actually landed.
 *
 *   node ../engine/scripts/interview-check.mjs
 *
 * A REPORT, not a gate. A site can legitimately be built before the interview is
 * finished — the first one was, twice — but nobody should be able to forget that
 * it was, and "the claims file is empty" is invisible in a green build.
 *
 * Three things it can actually check, and it does not pretend to check more.
 * Whether an answer is any good is a judgement no script makes:
 *
 *   1. Does OPERATIONS.md cover each area the interview asks about? Matched on
 *      vocabulary rather than on headings, because the first operations document
 *      predates the template and uses none of its wording.
 *   2. Do the two derived files exist, and do they have anything in them?
 *   3. Is every vocabulary term actually used by the document? specificity.mjs
 *      already drops the ones that are not — silently, which means a term
 *      somebody invented scores zero and looks like a term that simply did not
 *      come up. Here it is named.
 */
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { operationsPath, claimsPath, vocabularyPath, entityId } from '../src/lib/paths.js';

/**
 * The interview areas, and the words a document that covers one tends to use.
 *
 * Deliberately loose. This answers "was this asked about at all", not "was it
 * answered well" — a keyword list cannot tell the difference and should not
 * imply it can. `min` is how many distinct markers count as covered; areas whose
 * vocabulary is common get a higher bar.
 */
const AREAS = [
  { id: 'A', name: 'what is done in-house, and what is contracted out', min: 2,
    words: ['in-house', 'in house', 'subcontract', 'contracted', 'contractor', 'we hold',
            'third party', 'supplier', 'fabricator', 'trade partner'] },
  { id: 'B', name: 'the process, with real timings', min: 3,
    words: ['day one', 'first day', 'timeline', 'weeks', 'days', 'schedule',
            'start to finish', 'completion', 'installation'] },
  { id: 'C', name: 'materials and method', min: 2,
    words: ['material', 'product', 'brand', 'we use', 'application', 'preparation',
            'prep', 'coating', 'system', 'equipment'] },
  { id: 'D', name: 'pricing and how a quote is produced', min: 3,
    words: ['price', 'pricing', 'quote', 'estimate', 'cost', 'deposit', 'payment',
            'per door', 'day rate', 'add-on'] },
  { id: 'E', name: 'warranty, including its exceptions', min: 2,
    words: ['warranty', 'guarantee', 'covered', 'callback', 'call-back', 'year warranty'] },
  // Widened 2026-08-02, after this check reported a section headed WHAT PEOPLE
  // GET WRONG as thin. The document said "the belief" and "the fact"; the list
  // only knew "misconception" and "people think". The tempting fix was to
  // rewrite the document in the checker's vocabulary, which is writing for the
  // metric — a keyword list is a proxy and the proxy was the thing that was
  // wrong. These are the phrasings a correction actually takes.
  { id: 'F', name: 'what people get wrong — the source of the claim guards', min: 3,
    words: ['misconception', 'customers think', 'people think', 'the belief',
            'people believe', 'commonly believed', 'get wrong', 'gets it wrong',
            'assume', 'assumption', 'competitor', 'myth', 'wrongly', 'mistake',
            'incorrect', 'not true', 'contrary', 'in fact', 'actually'] },
  { id: 'G', name: 'the team, the years, and the credentials', min: 2,
    words: ['team', 'employee', 'tenure', 'training', 'years in', 'founded',
            'licence', 'license', 'insured', 'insurance', 'certification'] },
  { id: 'H', name: 'what must never appear on the site', min: 1,
    words: ['do not publish', 'not published', 'never publish', 'off the site',
            'unpublished', 'tracking number', 'no showroom', 'administrative office'] },
];

const rel = (p) => path.relative(process.cwd(), p);
const out = [];
let gaps = 0;

console.log(`\n  INTERVIEW READINESS — ${entityId}\n`);

// ── 1. the document ──────────────────────────────────────────────────────
if (!fs.existsSync(operationsPath)) {
  console.log(`  ✗ no OPERATIONS.md at ${rel(operationsPath)}`);
  console.log('    Nothing on this site can be fact-checked until the interview happens.');
  console.log('    Start from engine/docs/OWNER-INTERVIEW.md.\n');
  process.exit(0);
}
const ops = fs.readFileSync(operationsPath, 'utf8').toLowerCase();
const words = ops.split(/\s+/).length;
console.log(`  OPERATIONS.md — ${words.toLocaleString()} words\n`);

for (const a of AREAS) {
  const hits = a.words.filter((w) => ops.includes(w));
  const ok = hits.length >= a.min;
  if (!ok) gaps++;
  console.log(`    ${ok ? '✓' : '·'} ${a.id}  ${a.name}`);
  if (!ok) {
    out.push(`section ${a.id} — ${a.name}`);
    console.log(`         thin: ${hits.length} marker(s), wanted ${a.min}`);
  }
}

// ── 2. the derived files ─────────────────────────────────────────────────
console.log('');
const claims = fs.existsSync(claimsPath)
  ? (yaml.load(fs.readFileSync(claimsPath, 'utf8'))?.claims ?? []) : null;
const vocab = fs.existsSync(vocabularyPath)
  ? (yaml.load(fs.readFileSync(vocabularyPath, 'utf8')) ?? {}) : null;

if (claims === null) {
  gaps++;
  console.log(`    · no ${path.basename(claimsPath)} — nothing checks the site against the document`);
  console.log('         Section F of the interview is what fills it.');
} else {
  console.log(`    ✓ ${claims.length} claim guard(s)`);
}
if (vocab === null) {
  gaps++;
  console.log(`    · no ${path.basename(vocabularyPath)} — specificity scores on places and filler alone`);
} else {
  console.log(`    ✓ ${(vocab.terms ?? []).length} term(s), ${(vocab.facts ?? []).length} numbered fact(s)`);
}

// ── 3. is the vocabulary grounded ────────────────────────────────────────
// specificity.mjs already drops terms the document does not use — silently,
// which makes an invented term indistinguishable from one that simply did not
// come up in this business's copy. Naming them is the whole value here.
if (vocab?.terms?.length) {
  const norm = (s) => s.toLowerCase().replace(/ise\b/g, 'ize').replace(/ised\b/g, 'ized')
    .replace(/isation/g, 'ization').replace(/ysed\b/g, 'yzed').replace(/our\b/g, 'or');
  const opsN = norm(ops);
  const ungrounded = vocab.terms.filter((t) => !opsN.includes(norm(String(t).split('-')[0])));
  if (ungrounded.length) {
    gaps++;
    console.log(`\n    · ${ungrounded.length} vocabulary term(s) are not in OPERATIONS.md, so they score nothing:`);
    for (const t of ungrounded.slice(0, 10)) console.log(`         ${t}`);
    console.log('       Either the document is missing something the business says, or the');
    console.log('       term was invented. Both are worth knowing; neither is visible today.');
  }
}

console.log(gaps
  ? `\n  ${gaps} area(s) to go. Not a build failure — see engine/docs/OWNER-INTERVIEW.md.\n`
  : '\n  ✓ every interview area is covered and both derived files are populated\n');
