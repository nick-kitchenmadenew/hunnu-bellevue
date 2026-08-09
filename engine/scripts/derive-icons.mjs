#!/usr/bin/env node
/**
 * Derive favicon.ico and the two apple-touch-icon names from a site's own
 * source logos, before every build.
 *
 *   node ../engine/scripts/derive-icons.mjs
 *
 * Until 2026-08-06, none of these three files existed anywhere on
 * kitchenmadenew.com. Safari draws a bookmark tile from /apple-touch-icon.png,
 * and most browsers probe /favicon.ico directly — both regardless of what the
 * page's <link> tags declare — so their absence produced a generated letter
 * tile instead of the logo, and nothing in the build said so. They were added
 * by hand, once, with a one-off Python/Pillow script that nothing runs again if
 * the logo ever changes.
 *
 * Two source images are the only per-site input: `public/icon-512.png` and
 * `public/icon-180.png`. Everything else derives:
 *
 *   favicon.ico                       — 16/32/48/64/128/256 frames, from the 512
 *   apple-touch-icon.png              — the 180, unchanged
 *   apple-touch-icon-precomposed.png  — the 180, unchanged (older iOS probes
 *                                        this name FIRST and treats the icon as
 *                                        final rather than applying its own gloss)
 *
 * `sharp` (already a dependency — see site/package.json) resizes PNGs but has
 * no ICO writer; confirmed by checking `sharp.format`. Rather than add a
 * dependency for one binary format, or shell out to a Python/Pillow runtime the
 * Vercel build image does not otherwise need, this hand-rolls the packer below.
 * A "PNG-frame" ICO — the form every modern OS and browser reads — is just a
 * 6-byte header, one 16-byte directory entry per frame, then the raw PNG bytes
 * for each frame back to back. Under 40 lines, and it is the same format Pillow
 * was already producing; this only removes the Python step.
 *
 * Run automatically, not by memory: wired into `site/package.json`'s
 * `prebuild`, which npm runs before `build` on every path — a local
 * `npm run build`, `npm run check`, and (because build-all.mjs shells out to
 * `npm run build` once per entity) the multi-entity production build too. One
 * script, one place it can be forgotten from: nowhere.
 *
 * Missing source icons fail loudly rather than silently skip, matching how
 * paths.js's missing-config error names what it looked for and where — a site
 * scaffolded from client-starter/ has no icon-512.png or icon-180.png by
 * design (see client-starter/site/public/README.md) until someone supplies the
 * business's actual logo, and a plausible placeholder here would be worse than
 * a build that stops and says so.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const PUBLIC = 'public';
const SRC_512 = path.join(PUBLIC, 'icon-512.png');
const SRC_180 = path.join(PUBLIC, 'icon-180.png');

for (const [label, p] of [['icon-512.png', SRC_512], ['icon-180.png', SRC_180]]) {
  if (!fs.existsSync(p)) {
    console.error(`\n  derive-icons: missing ${label}\n`
      + `    looked in: ${path.resolve(PUBLIC)}\n`
      + `    every site needs its own ${label} — favicon.ico and the touch icons `
      + `derive from it and icon-180.png, and nothing else supplies one.\n`);
    process.exit(1);
  }
}

// PNG-frame ICO: 6-byte header, then one 16-byte directory entry per frame
// (width/height as a single byte each, 0 meaning 256 — the format's own
// escape for the one size that does not fit in a byte), then every frame's
// raw PNG bytes concatenated in the same order as the directory.
function packIco(pngFrames) {
  const HEADER = 6;
  const ENTRY = 16;
  const header = Buffer.alloc(HEADER);
  header.writeUInt16LE(0, 0);            // reserved
  header.writeUInt16LE(1, 2);            // type: 1 = icon
  header.writeUInt16LE(pngFrames.length, 4);

  const dir = Buffer.alloc(ENTRY * pngFrames.length);
  let offset = HEADER + ENTRY * pngFrames.length;
  pngFrames.forEach(({ size, buf }, i) => {
    const e = i * ENTRY;
    dir.writeUInt8(size >= 256 ? 0 : size, e);       // width
    dir.writeUInt8(size >= 256 ? 0 : size, e + 1);   // height
    dir.writeUInt8(0, e + 2);              // color count: 0 = no palette
    dir.writeUInt8(0, e + 3);              // reserved
    dir.writeUInt16LE(1, e + 4);           // color planes
    dir.writeUInt16LE(32, e + 6);          // bits per pixel
    dir.writeUInt32LE(buf.length, e + 8);  // frame byte length
    dir.writeUInt32LE(offset, e + 12);     // frame byte offset
    offset += buf.length;
  });

  return Buffer.concat([header, dir, ...pngFrames.map((f) => f.buf)]);
}

const ICO_SIZES = [16, 32, 48, 64, 128, 256];

const run = async () => {
  const source512 = sharp(SRC_512);
  const frames = await Promise.all(
    ICO_SIZES.map(async (size) => ({
      size,
      buf: await source512.clone().resize(size, size).png().toBuffer(),
    })),
  );
  fs.writeFileSync(path.join(PUBLIC, 'favicon.ico'), packIco(frames));

  const touch180 = await sharp(SRC_180).resize(180, 180).png().toBuffer();
  fs.writeFileSync(path.join(PUBLIC, 'apple-touch-icon.png'), touch180);
  fs.writeFileSync(path.join(PUBLIC, 'apple-touch-icon-precomposed.png'), touch180);

  console.log(`  ✓ favicon.ico (${ICO_SIZES.join('/')}) and both apple-touch-icon `
    + `names derived from ${SRC_512} and ${SRC_180}`);
};

run();
