#!/usr/bin/env node
/**
 * Write sitemap.xml and robots.txt for the whole domain.
 *
 *   node scripts/sitemap.mjs
 *
 * Runs ONCE, after every entity has been staged — not per entity, which is the
 * whole reason this is its own script rather than an Astro integration.
 *
 * @astrojs/sitemap would have been the obvious choice and it is the wrong shape
 * here. It runs inside a single `astro build`, so it sees one entity's pages and
 * writes one sitemap under that entity's base. Three entities on one domain
 * would produce three sitemaps — /sitemap-index.xml, /oakville/sitemap-index.xml,
 * /northyork/sitemap-index.xml — none of which lists the whole site. Search
 * engines take a sitemap per host, and this is one host.
 *
 * So it walks the staged tree instead. Every index.html under .vercel-out is a
 * page that will be served; its path IS its URL. That also means a page cannot
 * be in the sitemap unless it is genuinely deployed, which is the property that
 * matters — a sitemap listing a 404 is worse than no sitemap.
 *
 * NO lastmod. The only date available here is the file mtime, which is the build
 * time — every page would claim it changed on every deploy, which is false for
 * all of them and teaches Google to ignore the field. Omitting it is honest and
 * costs nothing; Google treats an absent lastmod as "unknown" rather than "old".
 */
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { payloadRoot } from '../src/lib/paths.js';

const staged = path.join(payloadRoot, '.vercel-out');

if (!fs.existsSync(staged)) {
  console.error(`\n  No staged tree at ${staged} — run the entity builds first.\n`);
  process.exit(1);
}

// ── the domain, agreed across every entity ───────────────────────────────
// One host serves all of them, so `site.domain` has to be identical in every
// config. It always has been; this checks rather than assumes, because a
// mismatch would silently emit a sitemap pointing at the wrong origin — which
// Google rejects wholesale rather than partially.
const configs = fs.readdirSync(payloadRoot)
  .map((f) => /^config-(.+)\.yaml$/.exec(f))
  .filter(Boolean)
  .map((m) => ({
    id: m[1],
    doc: yaml.load(fs.readFileSync(path.join(payloadRoot, m[0]), 'utf8')) ?? {},
  }));

if (!configs.length) {
  console.error(`\n  No config-<entity>.yaml in ${payloadRoot}.\n`);
  process.exit(1);
}

const domains = [...new Set(configs.map((c) => c.doc.site?.domain))];
if (domains.length !== 1 || !domains[0]) {
  console.error('\n  site.domain must be set and identical in every config — found: '
    + JSON.stringify(domains) + '\n');
  process.exit(1);
}
const origin = `https://${domains[0]}`;

// ── every staged page ────────────────────────────────────────────────────
/** Directories that hold assets rather than pages. Nothing under them is a URL. */
const SKIP = new Set(['_astro', 'video', 'api']);

function walk(dir, urls = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP.has(entry.name)) continue;
      walk(path.join(dir, entry.name), urls);
    } else if (entry.name === 'index.html') {
      const rel = path.relative(staged, dir).split(path.sep).filter(Boolean).join('/');
      // trailingSlash: 'always' everywhere else in this build, so the sitemap
      // has to agree. A sitemap URL that redirects is a wasted crawl and Search
      // Console reports it as such.
      urls.push(rel ? `${origin}/${rel}/` : `${origin}/`);
    }
  }
  return urls;
}

// Sorted so two builds of the same commit produce byte-identical output — the
// same reason build-all.mjs sorts its entity list.
const urls = walk(staged).sort();

if (!urls.length) {
  console.error('\n  Staged tree has no index.html — refusing to write an empty sitemap.\n');
  process.exit(1);
}

const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n'
  + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
  + urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')
  + '\n</urlset>\n';

fs.writeFileSync(path.join(staged, 'sitemap.xml'), sitemap);

// ── robots.txt ───────────────────────────────────────────────────────────
// `site.ai_crawlers.allow` has been in every config since the first one and
// nothing has ever read it. This is where it belongs: the list is a decision
// about who may crawl, and robots.txt is the only place that decision is
// expressed. Naming them is redundant against `User-agent: *` today and stops
// being redundant the moment a default-deny is wanted, which is the point of
// having written the list down.
const allow = [...new Set(configs.flatMap((c) => c.doc.site?.ai_crawlers?.allow ?? []))].sort();

const robots = [
  `# ${origin}`,
  '',
  'User-agent: *',
  'Allow: /',
  '',
  ...(allow.length
    ? ['# Explicitly welcome (site.ai_crawlers.allow)',
       ...allow.flatMap((ua) => [`User-agent: ${ua}`, 'Allow: /', ''])]
    : []),
  `Sitemap: ${origin}/sitemap.xml`,
  '',
].join('\n');

fs.writeFileSync(path.join(staged, 'robots.txt'), robots);

console.log(`\n  ✓ sitemap.xml — ${urls.length} URLs, and robots.txt\n`);
