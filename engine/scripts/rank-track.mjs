#!/usr/bin/env node
/**
 * Pull the current LeadSnap rank grid and diff it against the baseline.
 *
 * This closes the loop the whole topical-content method runs on. Caleb's
 * instruction is: write three to five articles, wait a month, CHECK THE RANK MAP,
 * then decide whether to write more or switch to geographic content. Without
 * current grid data that decision is guesswork, and we have just written six.
 *
 * It measures the GBP in the local pack, not the website, so it is meaningful
 * now — unlike organic ranking data, which still describes the old GHL site
 * until the domain cuts over.
 *
 *   node scripts/rank-track.mjs --dry      # plan and cost, calls nothing
 *   set -a && . ../.env.local && set +a && node scripts/rank-track.mjs
 *
 * LEADSNAP_API_KEY comes from the environment and is never written or printed.
 */
import fs from 'node:fs';
import path from 'node:path';
import { config } from './silo.mjs';
import { isoDate } from '../src/lib/config.js';
import { payloadRoot } from '../src/lib/paths.js';

const DRY = process.argv.includes('--dry');
// Per entity. One file was right while there was one profile; with three it
// means whichever ran last is the only one you have, and the other two look like
// they were never pulled.
const OUT = path.join(payloadRoot, `RANK-TRACK-${config.entity.id}.md`);
const BASE = 'https://app.leadsnap.com/public/api/v1';
const BUSINESS = config.entity.name;
// One profile per run, filtered by place_id. Three profiles are tracked under
// this business name and averaging them would mix a storefront grid with a
// service-area one and describe neither.
//
// The service-area profile is NOT centred in Etobicoke — an earlier version of
// this comment said so and it was wrong. Its grids are centred at
// 43.8143, -79.4047, which is Thornhill, straddling Vaughan and Markham; Nick
// reads the rank map as Google placing the business in Vaughan. Recorded because
// the wrong city was asserted here in a comment for a fortnight and nothing
// checks a comment.
const PLACE_ID = config.entity.place_id;

// The grid this run is a diff FROM, read from `baselines.grid` in config rather
// than transcribed here. It was a literal — the 84-point Oakville grid of
// 2026-07-25 — which meant the same numbers lived in the config, in
// RANK-BASELINE-oakville.md and in this script, and only two of the three were
// ever going to be updated together.
const g = config.baselines?.grid ?? {};
/** Has this entity ever been measured? A first run IS the baseline, and saying
    "▼ 6.76" against a baseline of zero is worse than saying nothing. */
const HAS_BASELINE = Boolean(config.baselines?.grid);
/** The baseline belongs to ONE term. Applying it to every keyword reported
    "cabinet refinishing ▼ 11.01" against a figure measured for "cabinet refacing
    oakville" — two different queries, one of them never measured before. Same
    species of error as reading one grid's flat decay curve as a fact about the
    profile. */
const BASELINE_TERM = config.baselines?.grid?.term ?? null;
const BASELINE = {
  // isoDate, not String().slice(10) — YAML parses an unquoted date into a Date,
  // and stringifying one goes through the local timezone, which turned
  // 2026-07-25 into "Fri Jul 24".
  date: config.baselines?.captured ? isoDate(config.baselines.captured) : 'unknown',
  points: g.points ?? 0,
  average: g.avg_rank ?? 0,
  top3: g.top3_pct ?? 0,
  term: g.term,
};
// Distance is measured from EACH GRID'S OWN CENTRE, not from a hardcoded shop.
// The first version used the Oakville address for every grid, which was wrong the
// moment a second GBP appeared: "cabinet refacing near me" is tracked on the
// service-area profile centred in Etobicoke, so all 107 of its points landed in
// the "20 km+" band and the decay analysis said nothing at all.

const key = process.env.LEADSNAP_API_KEY;

if (DRY) {
  console.log(`\n  GET ${BASE}/heatmaps?filter[business_name]=${BUSINESS}`);
  console.log(`  then, per heatmap:  GET ${BASE}/heatmaps/{id}`);
  console.log(`                      GET ${BASE}/heatmaps/{id}/competitors`);
  console.log(HAS_BASELINE
    ? `\n  baseline to diff against: ${BASELINE.date}, ${BASELINE.points} points, avg ${BASELINE.average}, ${BASELINE.top3}% top-3`
    : `\n  no baseline for ${config.entity.id} — this run establishes one`);
  console.log(`  credentials: ${key ? 'found in the environment' : 'NOT SET — add LEADSNAP_API_KEY to .env.local'}`);
  console.log(`  would write: ${OUT}\n`);
  process.exit(0);
}

if (!key) {
  console.error('\n  LEADSNAP_API_KEY is not set.\n'
    + '  Add it to .env.local (gitignored) and run with:\n'
    + '    set -a && . ../.env.local && set +a && node scripts/rank-track.mjs\n');
  process.exit(1);
}

const get = async (p) => {
  const res = await fetch(`${BASE}${p}`, {
    headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`${res.status} on ${p}`);
  return res.json();
};

/** Straight-line km between the shop and a grid point. */
const km = (lat, lng, c) => {
  const dLat = (lat - c.lat) * 111;
  const dLng = (lng - c.lng) * 111 * Math.cos((c.lat * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
};

const list = await get(`/heatmaps?filter[business_name]=${encodeURIComponent(BUSINESS)}&per_page=50&sort=-created_at`);
const maps = (list.data ?? []).filter((m) => m.status === 'completed'
  && (!PLACE_ID || m.business_place_id === PLACE_ID));
if (!maps.length) {
  console.error(`  no completed heatmaps found for "${BUSINESS}"`);
  process.exit(1);
}

// Latest run per keyword — the method tracks the primary category and two or
// three core services, not every term.
const latest = new Map();
for (const m of maps) if (!latest.has(m.keyword)) latest.set(m.keyword, m);

const lines = ['# Rank tracking — LeadSnap grid', '',
  HAS_BASELINE
    ? `Pulled ${new Date().toISOString().slice(0, 10)}. Baseline: ${BASELINE.date}, `
      + `${BASELINE.points} points, average ${BASELINE.average}, ${BASELINE.top3}% top-3.`
    : `Pulled ${new Date().toISOString().slice(0, 10)}. **No prior baseline** — this run is the `
      + `first measurement of this profile, so the columns below are a starting point rather `
      + `than a change.`, '',
  `${config.entity.city ?? config.entity.address?.locality ?? config.entity.id} profile only (\`${PLACE_ID}\`). Any other profile under this`
  + ` name is tracked separately.`, '',
  'Measures the GBP in the local pack. Independent of which site the domain serves.', ''];

for (const [keyword, stub] of latest) {
  const h = await get(`/heatmaps/${stub.id}`);
  let comp = null;
  try { comp = await get(`/heatmaps/${stub.id}/competitors`); } catch { /* optional */ }

  // Only the term the baseline was taken for gets a comparison.
  const same = HAS_BASELINE && BASELINE_TERM
    && keyword.trim().toLowerCase() === String(BASELINE_TERM).trim().toLowerCase();
  const pts = h.points ?? [];
  const ranked = pts.filter((p) => typeof p.rank === 'number' && p.rank > 0);
  const avg = ranked.length ? ranked.reduce((a, p) => a + p.rank, 0) / ranked.length : null;
  const top3 = ranked.filter((p) => p.rank <= 3).length;

  lines.push(`## ${keyword}`, '',
    same ? '' : `_No baseline for this term — ${BASELINE_TERM ? `the recorded one is "${BASELINE_TERM}"` : 'none recorded'}. `
      + `The figures below are a first measurement._`, '',
    `Run ${String(h.created_at).slice(0, 10)} · ${h.grid_size}×${h.grid_size} grid · ${pts.length} points`,
    `Profile: \`${h.business_place_id}\``, '',
    '| | now | baseline | change |', '|---|---|---|---|',
    ...(same
      ? [`| average rank | ${avg ? avg.toFixed(2) : '—'} | ${BASELINE.average} | ${avg ? (BASELINE.average - avg > 0 ? '▲ ' : '▼ ') + Math.abs(BASELINE.average - avg).toFixed(2) : '—'} |`,
         `| top-3 points | ${top3} of ${ranked.length} | ${BASELINE.top3}% | ${top3 > 0 ? '▲ ' + top3 : 'no change'} |`]
      : [`| average rank | ${avg ? avg.toFixed(2) : '—'} | not measured | — |`,
         `| top-3 points | ${top3} of ${ranked.length} | not measured | — |`]),
    `| market share | ${h.market_share ?? '—'}% (position ${h.market_share_position ?? '—'}) | — | — |`,
    `| LeadSnap's own delta | ${h.ranking_change ?? '—'} (was ${h.previous_ranking ?? '—'}) | | |`, '');

  // Distance bands — the baseline's key finding was that rank does NOT decay
  // with distance, which is what ruled out geography as the constraint. Worth
  // recomputing every time, because if it starts decaying the diagnosis changes.
  const centre = { lat: h.grid_center_lat, lng: h.grid_center_lng };
  if (ranked.length) {
    const bands = [[0, 4], [4, 8], [8, 12], [12, 16], [16, 20], [20, 999]];
    lines.push(`Rank by distance from this grid's centre (${centre.lat.toFixed(4)}, ${centre.lng.toFixed(4)}):`, '', '| band | points | avg rank |', '|---|---|---|');
    for (const [lo, hi] of bands) {
      const inBand = ranked.filter((p) => { const d = km(p.lat, p.lng, centre); return d >= lo && d < hi; });
      if (!inBand.length) continue;
      const a = inBand.reduce((s, p) => s + p.rank, 0) / inBand.length;
      lines.push(`| ${lo}–${hi === 999 ? '∞' : hi} km | ${inBand.length} | ${a.toFixed(1)} |`);
    }
    lines.push('');
  }

  if (comp) {
    lines.push(`Competitor view: ${comp.top_3_points ?? '—'} of ${comp.total_points ?? '—'} points in the top 3, `
      + `market share ${comp.market_share ?? '—'}% at position ${comp.market_share_position ?? '—'}.`, '');
  }
  console.log(`  ${keyword.padEnd(30)} avg ${avg ? avg.toFixed(2) : '—'}  top3 ${top3}`);
}

lines.push('---', '',
  'Read this against the method: a grid that is still uniformly 4–10 with no top-3 says',
  'geography is not the constraint and more geographic pages will not fix it. Movement in the',
  'average is the signal to keep producing topical content; no movement after a batch is the',
  'signal that the constraint is elsewhere — profile strength, or the business-name finding in',
  `RANK-BASELINE-${config.entity.id}.md.`);

fs.writeFileSync(OUT, lines.join('\n'));
console.log(`\n  ${latest.size} keyword(s) -> ${OUT}\n`);
