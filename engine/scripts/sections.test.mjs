#!/usr/bin/env node
/**
 * Composition rules, stated as cases.
 *
 * The point of computing tones is that a collision becomes unexpressible. That
 * claim is only worth anything if it is tested, so: no arrangement of sections,
 * however many or in whatever order, may produce two adjacent bands on the same
 * ground.
 *
 *   node scripts/sections.test.mjs
 */
import { withTones, compose, ORDER } from '../src/lib/sections.js';

let failed = 0;
const fail = (msg) => { failed++; console.log('  FAIL  ' + msg); };

// ── the alternation holds, for every length ──────────────────────────────
for (let n = 1; n <= 30; n++) {
  const toned = withTones(Array.from({ length: n }, () => ({ name: 'prose' })));
  for (let i = 1; i < toned.length; i++) {
    if (toned[i].tone === toned[i - 1].tone) {
      fail(`${n} plain sections: bands ${i} and ${i + 1} are both ${toned[i].tone}`);
      break;
    }
  }
}

// ── dark is dark wherever it lands, and resets rather than alternates ────
{
  const t = withTones([{ name: 'prose' }, { name: 'gallery' }, { name: 'prose' },
                       { name: 'prose' }, { name: 'cta' }]);
  const tones = t.map((x) => x.tone);
  if (tones[1] !== 'dark') fail('gallery is not dark');
  if (tones[4] !== 'dark') fail('cta is not dark');
  for (let i = 1; i < tones.length; i++) {
    if (tones[i] === tones[i - 1] && tones[i] !== 'dark') {
      fail('collision around a dark band: ' + tones.join(','));
      break;
    }
  }
  // A dark band is its own boundary, so what follows it may be either ground —
  // but must still differ from what comes after IT.
  if (tones[2] === tones[3]) fail('two bands after the gallery share a ground');
}

// ── a random walk cannot produce a collision ─────────────────────────────
{
  const names = ['prose', 'gallery', 'consultation', 'cta', 'faq', 'form'];
  for (let trial = 0; trial < 500; trial++) {
    const n = 1 + Math.floor(Math.random() * 12);
    const secs = Array.from({ length: n }, () =>
      ({ name: names[Math.floor(Math.random() * names.length)] }));
    const tones = withTones(secs).map((x) => x.tone);
    for (let i = 1; i < tones.length; i++) {
      if (tones[i] === tones[i - 1] && tones[i] !== 'dark') {
        fail('random walk collided: ' + tones.join(',')); trial = 1e9; break;
      }
    }
  }
}

// ── compose sorts into canonical order and reports typos ─────────────────
{
  const { sections, unknown } = compose('pillar', [
    { name: 'faq' }, { name: 'prose' }, { name: 'gallery' }, { name: 'cta' },
  ]);
  const got = sections.map((s) => s.name).join(',');
  if (got !== 'prose,gallery,faq,cta') fail('compose did not sort: ' + got);
  if (unknown.length) fail('false positive on unknown');

  const typo = compose('pillar', [{ name: 'prose' }, { name: 'galery' }]);
  if (typo.unknown.length !== 1) fail('typo "galery" was not reported');
}

// ── every declared type has an order, and cta is last in each ────────────
// A content page opens with prose: the reader gets the explanation before the
// lists. `utility` is the exception and may open with its form instead. The
// contact page's H1 is "Get a quote for your kitchen" — the form IS the page, and
// putting four paragraphs of how-it-works above it is a scroll between the
// visitor and the only action the page exists for. On a phone that was most of a
// screen. Relaxed 2026-07-28 at Nick's request; still asserted, because opening
// with `faq` or `reviews` would be wrong on any page type.
for (const [type, order] of Object.entries(ORDER)) {
  if (order[order.length - 1] !== 'cta') fail(`${type} does not end with cta`);
  // A hub may open with its index, for the reason `utility` may open with its
  // form: the index IS the page. /locations exists so a visitor can pick the
  // neighbourhood they live in, and seven hundred words in front of that list is
  // the same scroll-between-visitor-and-action the contact page was relaxed for.
  // The reference build puts both of its hub indexes directly under the H1.
  const mayOpen = type === 'utility' ? ['prose', 'form']
    : type === 'hub' ? ['prose', 'service_index', 'location_index']
    : ['prose'];
  if (!mayOpen.includes(order[0])) {
    fail(`${type} starts with "${order[0]}" — expected one of ${mayOpen.join(', ')}`);
  }
}

if (failed) { console.log(`\n  ${failed} composition rule(s) wrong\n`); process.exit(1); }
console.log('  ✓ composition rules hold (alternation, dark reset, ordering, 500 random walks)');
