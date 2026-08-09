#!/usr/bin/env node
/**
 * Opening hours, stated as cases.
 *
 * Config accepts two forms — `mon_sun` for a week where every day is the same,
 * `days` for one that is not — and one normaliser turns both into a per-day week
 * that the schema graph, the footer and the drift check all read. The whole
 * point is that those three cannot disagree, so the normaliser is the thing to
 * test, against fixtures rather than against whichever business happens to be in
 * this repository.
 *
 * The case that forced this to exist: a construction profile in Washington open
 * 8–6 six days and 10–5 on Sunday. `mon_sun` could not say it, and collapsing it
 * would have put hours on the page and in the schema that the profile
 * contradicts.
 *
 *   node scripts/hours.test.mjs
 */
import { hoursByDay, hoursDisplay } from '../src/lib/config.js';

const cases = [
  {
    label: 'mon_sun — every day the same',
    hours: { mon_sun: '09:00-21:00' },
    open: 7,
    display: [{ days: 'Seven days', range: '9:00 am – 9:00 pm' }],
  },
  {
    label: 'days — one day differs (the Washington case)',
    hours: { days: { mon: '08:00-18:00', tue: '08:00-18:00', wed: '08:00-18:00',
                     thu: '08:00-18:00', fri: '08:00-18:00', sat: '08:00-18:00',
                     sun: '10:00-17:00' } },
    open: 7,
    display: [{ days: 'Mon–Sat', range: '8:00 am – 6:00 pm' },
              { days: 'Sunday', range: '10:00 am – 5:00 pm' }],
  },
  {
    label: 'days — closed Sunday, expressed three ways',
    hours: { days: { mon: '08:00-17:00', tue: '08:00-17:00', wed: '08:00-17:00',
                     thu: '08:00-17:00', fri: '08:00-17:00', sat: 'closed',
                     sun: null } },
    open: 5,
    display: [{ days: 'Mon–Fri', range: '8:00 am – 5:00 pm' }],
  },
  {
    label: 'days — an absent day is a shut day',
    hours: { days: { mon: '09:00-17:00', tue: '09:00-17:00' } },
    open: 2,
    display: [{ days: 'Mon–Tue', range: '9:00 am – 5:00 pm' }],
  },
  {
    // The reason runs check adjacency rather than only equality. Monday and
    // Wednesday on the same hours are two runs; "Mon–Wed" would claim a Tuesday
    // the business is shut.
    label: 'days — same hours either side of a closure do not merge',
    hours: { days: { mon: '09:00-17:00', tue: 'closed', wed: '09:00-17:00' } },
    open: 2,
    display: [{ days: 'Monday', range: '9:00 am – 5:00 pm' },
              { days: 'Wednesday', range: '9:00 am – 5:00 pm' }],
  },
  {
    // The GTA service-area profile. A clock reading is technically right and
    // reads as a mistake.
    label: 'open round the clock',
    hours: { mon_sun: '00:00-23:59' },
    open: 7,
    display: [{ days: 'Seven days', range: 'Open 24 hours' }],
  },
  {
    label: 'nothing declared',
    hours: {},
    open: 0,
    display: [],
  },
];

let failed = 0;
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

for (const c of cases) {
  const week = hoursByDay(c.hours);
  const open = week.filter(([, r]) => r).length;
  if (week.length !== 7) {
    failed++; console.log(`  FAIL  ${c.label}\n        week has ${week.length} days, not 7`);
  }
  if (open !== c.open) {
    failed++; console.log(`  FAIL  ${c.label}\n        ${open} open day(s), expected ${c.open}`);
  }
  const shown = hoursDisplay(c.hours);
  if (!eq(shown, c.display)) {
    failed++;
    console.log(`  FAIL  ${c.label}`);
    console.log(`        got      ${JSON.stringify(shown)}`);
    console.log(`        expected ${JSON.stringify(c.display)}`);
  }
}

// Declaring both forms is a contradiction, not something to silently merge.
try {
  hoursByDay({ mon_sun: '09:00-17:00', days: { mon: '10:00-16:00' } });
  failed++; console.log('  FAIL  declaring both mon_sun and days was accepted');
} catch { /* expected */ }

// A typo in a day name must name itself rather than silently mean "shut".
try {
  hoursByDay({ days: { monday: '09:00-17:00' } });
  failed++; console.log('  FAIL  an unknown day name was accepted');
} catch { /* expected */ }

if (failed) {
  console.log(`\n  ${failed} hours case(s) wrong\n`);
  process.exit(1);
}
console.log(`  ✓ ${cases.length + 2} opening-hours cases hold`);
