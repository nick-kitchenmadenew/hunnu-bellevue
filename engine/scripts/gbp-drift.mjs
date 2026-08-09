#!/usr/bin/env node
/**
 * Config ↔ GBP drift check.
 *
 * The config is authoritative for the build; the GBP profile is authoritative for
 * reality. Re-audits diff against the config and report drift — they never
 * overwrite it (PLANNING §5). This is that diff, run at build time so a config
 * that has quietly wandered away from the profile cannot ship.
 *
 * It fires when either side moves: a category added in GBP and not mirrored here,
 * or a service renamed here and not in GBP. Both need a human; neither should be
 * silently reconciled.
 *
 * Skips cleanly when no capture exists — a fresh entity has nothing to diff yet.
 *
 *   node scripts/gbp-drift.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { config } from './silo.mjs';
import { hoursByDay } from '../src/lib/config.js';
import { gbpCapturePath } from '../src/lib/paths.js';

const entity = config.entity;
const capture = gbpCapturePath(entity.id);

if (!fs.existsSync(capture)) {
  console.log(`  ⊘ no GBP capture at audit-tool/out/gbp-${entity.id}.json — drift check skipped`);
  process.exit(0);
}

const gbp = JSON.parse(fs.readFileSync(capture, 'utf8'));
const profile = gbp.profile;

// ── normalisation ────────────────────────────────────────────────────────
// Only where the two sides legitimately store the same fact differently. Anything
// normalised here is a fact this check can no longer catch, so keep the list short
// and say why each one earns its place.

/** GBP shows "(289) 815-3353"; config stores E.164 for schema and tel: links. */
const digits = (s) => String(s || '').replace(/\D/g, '').replace(/^1/, '');

/**
 * GBP gives one address string; config splits it so schema can use PostalAddress.
 *
 * Returns null when there is no address rather than reading `.street` off
 * undefined. A service-area business has no address on EITHER side — Google
 * hides it on the profile and the config omits it — and this function used to
 * throw on exactly that shape.
 *
 * The throw was worse than it sounds. An uncaught exception exits 1, which is
 * also what a real drift finding does, so `gbp-drift` on the GTA root profile
 * looked like every other entity from the outside while never having checked a
 * single field. A guard that cannot run must not be indistinguishable from a
 * guard that ran and found something.
 */
const address = (a) => a?.street
  ? `${a.street}, ${a.locality}, ${a.region} ${a.postal_code}`
  : null;

/**
 * GBP lists language names; schema.org wants ISO 639 codes.
 *
 * A name missing from this table is not a silent pass — it falls through to
 * itself, so a display name gets compared against a code and reports as drift
 * that no config edit can fix. `Vietnamese` did exactly that on the North York
 * profile. When it happens the check now names the culprit instead of leaving
 * you to guess, but the real fix is always to add the language here.
 */
const LANG = { English: 'en', Cantonese: 'yue', Mandarin: 'cmn', French: 'fr',
               Vietnamese: 'vi' };

/** GBP service-area entries are "Milton, ON, Canada"; config stores bare cities. */
const cityOf = (s) => String(s).split(',')[0].trim();

const drift = [];
const checked = [];
function same(label, a, b, hint) {
  const eq = JSON.stringify(a) === JSON.stringify(b);
  (eq ? checked : drift).push({ label, gbp: a, config: b, hint });
}

/**
 * Same members, order irrelevant — for lists where Google's dashboard order is
 * incidental. The social profiles came back in a different order after a
 * re-capture and were reported as drift; the set had not changed at all. Says so
 * when the order differs, because a silent pass would hide a real reordering.
 */
function sameSet(label, a, b, hint) {
  const A = [...(a ?? [])].sort(), B = [...(b ?? [])].sort();
  if (JSON.stringify(A) !== JSON.stringify(B)) {
    drift.push({ label, gbp: a, config: b, hint });
    return;
  }
  checked.push({ label: JSON.stringify(a) === JSON.stringify(b)
    ? label : `${label} (reordered, same set)` });
}

// ── identity ─────────────────────────────────────────────────────────────
same('business name', profile.name, entity.name);
// A profile may carry call-tracking numbers alongside the real one. Those are
// declared in config under phone_tracking and are not drift — but an UNDECLARED
// number appearing on the profile still is, so they are matched explicitly
// rather than the check being loosened.
{
  const known = [entity.phone, ...(entity.phone_tracking ?? []).map((t) => t.number)]
    .map(digits);
  const onProfile = digits(profile.phone);
  if (known.includes(onProfile)) {
    checked.push({ label: onProfile === digits(entity.phone)
      ? 'phone' : `phone (matched a declared tracking number)` });
  } else {
    drift.push({ label: 'phone', gbp: onProfile, config: digits(entity.phone),
      hint: 'not the location number, and not a declared tracking number' });
  }
}
// `?? null` on both sides so a service-area business — no address on the
// profile, none in the config — compares null against null. Without it
// `JSON.stringify(undefined)` is undefined and `JSON.stringify(null)` is
// "null", and two absent addresses would report as drift.
same('address', profile.address ?? null, address(entity.address));
same('website field', profile.website, entity.website_target);
sameSet('sameAs profiles', profile.sameAs, entity.sameAs);
{
  // Anything GBP spells out that LANG cannot translate is compared as a display
  // name against an ISO code, which can never match. Name those explicitly —
  // otherwise the report shows ["Vietnamese","en"] against ["en","vi"] and looks
  // like a config error rather than a missing table entry.
  const unmapped = (profile.languages || [])
    .filter((l) => !LANG[l] && !/^[a-z]{2,3}$/.test(l));
  same('languages',
    (profile.languages || []).map((l) => LANG[l] || l).sort(),
    [...(entity.languages || [])].sort(),
    unmapped.length
      ? `not in the LANG table, so compared verbatim: ${unmapped.join(', ')} — `
        + 'add them to LANG in gbp-drift.mjs rather than editing the config'
      : undefined);
}
// Service area is a BUSINESS fact; `locations` is an editorial decision about
// which city pages exist. They are not the same question, so a city that is
// genuinely served but has no page of its own is declared under
// `service_area_without_pages` rather than being forced into either side.
same('service area',
  [...new Set((profile.service_area || []).map(cityOf))].sort(),
  [...new Set([
    // The home city, from BOTH fields, because they answer different questions
    // and can legitimately differ. `address.locality` is where the premises are;
    // `entity.city` is the city the pages target, which DISCREPANCIES #36 made
    // explicit for North York — premises in North York, pages targeting Toronto,
    // and GBP's service area lists both. A service-area business has no address
    // at all and carries only `city`. Reading either one alone dropped a real
    // city from the comparison and reported it as drift.
    ...(entity.address?.locality ? [entity.address.locality] : []),
    ...(entity.city ? [entity.city] : []),
    ...(config.locations || []).map((l) => l.city),
    ...(entity.service_area_without_pages ?? []).map((s) => s.city),
  ])].sort());
// Same rigour as the services declarations: a city declared as served-without-a-page
// that GBP no longer lists is a stale claim in the config, not a silent pass.
for (const d of entity.service_area_without_pages ?? []) {
  const cities = new Set((profile.service_area || []).map(cityOf));
  if (!cities.has(d.city)) {
    drift.push({ label: `service_area_without_pages · ${d.city}`,
      gbp: [...cities].sort(), config: d.city,
      hint: 'declared as served without a page, but GBP no longer lists it — '
          + 'drop the declaration or re-capture' });
  }
}

// Hours, compared day by day.
//
// This used to collapse GBP's seven days to one value and compare that against
// `mon_sun`, reporting drift whenever the days differed from each other — which
// is not drift, it is a business open different hours on Sunday. Config can say
// that now, so the comparison is per-day and the whole week is checked.
{
  const to24 = (t) => {
    const m = String(t).match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!m) return String(t).trim();
    const h = +m[1] % 12 + (/pm/i.test(m[3]) ? 12 : 0);
    return String(h).padStart(2, '0') + ':' + m[2];
  };
  // Split on any dash Google might use. The dashboard renders an EN DASH (–), and
  // splitting on "-" alone silently produced a one-sided range: "09:00" against
  // config's "09:00-21:00", reported as drift when nothing had drifted.
  const range = (v) => {
    const s = String(v ?? '').trim();
    if (!s || /^closed$/i.test(s)) return null;
    // The dashboard writes this in words; the config stores the schema.org range.
    if (/^open 24/i.test(s)) return '00:00-23:59';
    const parts = s.split(/\s*[-–—]\s*/);
    return parts.length === 2 ? parts.map(to24).join('-') : s;
  };
  const SHORT = { Monday: 'mon', Tuesday: 'tue', Wednesday: 'wed', Thursday: 'thu',
                  Friday: 'fri', Saturday: 'sat', Sunday: 'sun' };
  // Both sides as an ORDERED list, Monday first. `same` compares by
  // JSON.stringify, and Google's dashboard starts the week on Sunday — so two
  // identical weeks in different key order were reported as drift on the first
  // run of this.
  const week = hoursByDay();                       // [[day, range], …] Mon-first
  const gbpByDay = {};
  for (const [day, v] of Object.entries(profile.hours || {})) {
    if (SHORT[day]) gbpByDay[SHORT[day]] = range(v);
  }
  if (Object.keys(gbpByDay).length) {
    same('hours',
      week.map(([d]) => [d, gbpByDay[d] ?? null]),
      week,
      'compared day by day; `closed` and an absent day both read as null');
  }
}

// ── categories and services — no normalisation, this is the point ────────
same('primary category', profile.primary_category, entity.primary_category);
same('additional categories', profile.additional_categories, entity.additional_categories);

const gbpServices = Object.fromEntries(
  (gbp.services || []).map((b) => [b.category, b.services.map((s) => s.name)]));
const cfgServices = Object.fromEntries(
  config.silos.map((s) => [s.category, (s.services || []).map((x) => x.name)]));

same('silo categories', Object.keys(gbpServices).sort(), Object.keys(cfgServices).sort());

// A service on the profile that deliberately has no page of its own. The silo
// `services` list does double duty — it declares what the business offers AND
// it builds the pages — so an editorial decision to merge a service into
// another page surfaces here as though the business had stopped offering it.
//
// Declared the same way `phone_tracking` is: named explicitly, so the exception
// is visible in the config rather than the check being loosened. A declaration
// that no longer matches anything in GBP is itself reported, so removing the
// service from the profile cannot leave a silent lie behind in the config.
const noPage = entity.services_without_pages ?? [];
for (const d of noPage) {
  if (!(gbpServices[d.category] || []).includes(d.name)) {
    drift.push({ label: `services_without_pages · ${d.name}`,
      gbp: gbpServices[d.category] || [], config: d.name,
      hint: `declared as a GBP service with no page, but GBP no longer lists it `
          + `under "${d.category}" — drop the declaration or re-capture` });
  }
}

for (const cat of Object.keys(gbpServices)) {
  const g = gbpServices[cat] || [], c = cfgServices[cat] || [];
  const declared = noPage.filter((d) => d.category === cat).map((d) => d.name);
  const missing = g.filter((s) => !c.includes(s) && !declared.includes(s));
  const extra = c.filter((s) => !g.includes(s));
  if (missing.length || extra.length) {
    drift.push({ label: `services · ${cat}`, gbp: g, config: c,
      hint: [missing.length && `in GBP, not in config: ${missing.join(', ')}`,
             extra.length && `in config, not in GBP: ${extra.join(', ')}`]
        .filter(Boolean).join(' | ') });
  } else if (declared.length) {
    checked.push({ label: `services · ${cat} `
      + `(${declared.length} declared without a page: ${declared.join(', ')})` });
  } else if (JSON.stringify(g) !== JSON.stringify(c)) {
    // Same set, different order. Order carries no ranking weight — note it, do not fail.
    checked.push({ label: `services · ${cat} (reordered, same set)` });
  } else {
    checked.push({ label: `services · ${cat}` });
  }
}

// ── report ───────────────────────────────────────────────────────────────
const age = Math.round((Date.now() - new Date(gbp.captured || 0)) / 86400000);
console.log(`  GBP capture ${gbp.captured || '?'} (${age} days old)`);

if (!drift.length) {
  console.log(`  ✓ config matches GBP on all ${checked.length} checked fields`);
  process.exit(0);
}

console.log(`\n  CONFIG HAS DRIFTED FROM GBP (${drift.length})`);
for (const d of drift) {
  console.log(`    ! ${d.label}`);
  console.log(`        GBP    : ${JSON.stringify(d.gbp)}`);
  console.log(`        config : ${JSON.stringify(d.config)}`);
  if (d.hint) console.log(`        ${d.hint}`);
}
console.log('\n  GBP is authoritative for what the business is; fix the config to match,');
console.log('  or re-capture the profile if GBP itself has changed.\n');
process.exit(1);
