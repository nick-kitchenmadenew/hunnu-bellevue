#!/usr/bin/env node
/**
 * Confirm every entity's `reviews.url` actually points at that entity's own
 * Google Business Profile, before it's trusted.
 *
 *   node ../engine/scripts/review-link-check.mjs
 *
 * config-gta.yaml's review link returned HTTP 200 for months while resolving
 * to a different business entirely — not a 404, not a malformed URL, just
 * wrong. Nothing in the pipeline makes an outbound request, so nothing could
 * have caught it; it surfaced only because a human clicked the link and
 * noticed the page was unfamiliar.
 *
 * Deliberately NOT part of `npm run check`. gbp-drift.mjs set the precedent
 * this follows: it is its own script (`npm run drift`), not folded into the
 * default chain, because it depends on live state outside this repo. This is
 * the same shape and the same reasoning, and it is the first check in the
 * pipeline that makes a network request at all — a transient DNS hiccup or a
 * slow response should not be able to fail a routine, offline build.
 *
 * Run this whenever a review link is added or changed — the exact moment
 * today's bug was introduced — and from the new-site checklist once both
 * `place_id` and `reviews.url` are filled in.
 *
 * WHY TWO MATCHERS. Verified directly, twice, against the same link: Google's
 * redirect target is not one stable shape. `g.page/r/<id>` landed on a
 * `/maps/place/...!1s0x<hex>:0x<hex>...` URL in one probe and a
 * `/search?...&ludocid=<decimal>` URL in another. The decimal ludocid and the
 * second hex half are the same identifier in two encodings — confirmed by
 * decoding one and finding it equal to the other. A checker that only knew one
 * shape would have looked broken half the time for a reason that has nothing
 * to do with whether the link is right.
 *
 * "Neither pattern found" is reported as a warning, not a failure. Google's
 * response shape is not a contract; a future third shape should read as
 * "check this by hand", not as a false failure that trains someone to ignore
 * this script's output.
 */
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { payloadRoot } from '../src/lib/paths.js';

/** Both halves of an ftid, little-endian, as they appear inside a decoded
    place_id — the same check done by hand today when a link is first added. */
function placeIdBytesHex(placeId) {
  return Buffer.from(placeId, 'base64url').toString('hex');
}

function toLittleEndianHex(bigintValue) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(bigintValue));
  return buf.toString('hex');
}

/** Returns true/false once a resolved URL is matched against place_id, or
    null if the URL's shape is neither one this script knows how to read. */
function resolvedMatchesPlaceId(resolvedUrl, placeId) {
  const idBytes = placeIdBytesHex(placeId);

  const ftid = resolvedUrl.match(/1s0x([0-9a-f]+):0x([0-9a-f]+)/i);
  if (ftid) {
    const a = toLittleEndianHex(BigInt(`0x${ftid[1]}`));
    const b = toLittleEndianHex(BigInt(`0x${ftid[2]}`));
    return idBytes.includes(a) && idBytes.includes(b);
  }

  const ludocid = resolvedUrl.match(/[?&]ludocid=(\d+)/);
  if (ludocid) {
    return idBytes.includes(toLittleEndianHex(BigInt(ludocid[1])));
  }

  return null;
}

const entities = fs.readdirSync(payloadRoot)
  .map((f) => /^config-(.+)\.yaml$/.exec(f))
  .filter(Boolean)
  .map((m) => ({
    id: m[1],
    doc: yaml.load(fs.readFileSync(path.join(payloadRoot, m[0]), 'utf8')) ?? {},
  }));

if (!entities.length) {
  console.error(`\n  review-link-check: no config-<entity>.yaml in ${payloadRoot}\n`);
  process.exit(1);
}

let failed = false;
let warned = false;

const results = await Promise.all(entities.map(async ({ id, doc }) => {
  const placeId = doc.entity?.place_id;
  const url = doc.entity?.reviews?.url;
  if (!placeId || !url) return { id, skip: `missing ${!placeId ? 'place_id' : 'reviews.url'}` };

  let resolvedUrl;
  try {
    const res = await fetch(url, { redirect: 'follow' });
    resolvedUrl = res.url;
  } catch (e) {
    return { id, error: e.message };
  }

  const match = resolvedMatchesPlaceId(resolvedUrl, placeId);
  return { id, url, resolvedUrl, match };
}));

console.log(`\n  ${'ENTITY'.padEnd(12)} RESULT`);
console.log('  ' + '─'.repeat(60));
for (const r of results) {
  if (r.skip) { console.log(`  ${r.id.padEnd(12)} skipped — ${r.skip}`); continue; }
  if (r.error) {
    console.log(`  ${r.id.padEnd(12)} ✗ request failed: ${r.error}`);
    failed = true;
  } else if (r.match === true) {
    console.log(`  ${r.id.padEnd(12)} ✓ resolves to this entity's own profile`);
  } else if (r.match === false) {
    console.log(`  ${r.id.padEnd(12)} ✗ resolves to a DIFFERENT profile\n` +
      `               reviews.url: ${r.url}\n` +
      `               resolved to: ${r.resolvedUrl}`);
    failed = true;
  } else {
    console.log(`  ${r.id.padEnd(12)} ? unrecognised redirect shape — check by hand\n` +
      `               resolved to: ${r.resolvedUrl}`);
    warned = true;
  }
}
console.log('');

if (failed) process.exit(1);
if (warned) console.log('  (unrecognised shapes do not fail the build — see the file header)\n');
