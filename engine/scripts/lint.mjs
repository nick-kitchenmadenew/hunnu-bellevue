#!/usr/bin/env node
/**
 * Core 30 linter — runs against built HTML, fails the build on violation.
 *
 * This is the crawl-mode rule engine's sibling: same rules, different front door.
 * Anything added here should eventually be shared with
 * audit-tool/ rather than reimplemented.
 *
 *   node scripts/lint.mjs [dist]
 */
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { config, pages, checkLink, childrenOf, isUtility } from './silo.mjs';
import { claimsPath, configPath, entityId } from '../src/lib/paths.js';

const DIST = process.argv[2] || 'dist';
const ROOT = config.entity.root;                       // "/oakville/"
/** The business's own name, for the anchor check. Escaped, because a name is
    prose and may contain regex metacharacters — "J&B Plumbing (GTA)" would
    otherwise compile into something that matches almost nothing. */
const BRAND = new RegExp(config.entity.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
/** A consultation verb naming this service must be corroborated by the page's own
    title, h1 or re-theme. Absent means the check does not run. */
/**
 * Chrome may link into another entity's subtree — a multi-entity build's own
 * rule, not something the Core 30 methodology addresses; this build cannot see
 * those pages, because a different pass produces them.
 *
 * The root sibling "/" is deliberately EXACT-match only. Treating it as a prefix
 * exempts every absolute href on the site — the first version of this did, and
 * silently switched the whole chrome check off, so a footer pointing at
 * /nowhere/ passed. A subtree's chrome realistically links to the brand home and
 * not to arbitrary depths of it, and a link this build cannot verify is worth a
 * warning rather than silence.
 */
const SIBLING_ROOTS = (config.entity.siblings ?? [])
  .map((r) => String(r).replace(/\/?$/, '/'))
  .filter((r) => r !== ROOT);

// Domain-level pages that live on one entity and are linked from every footer.
// Named exactly, from config, rather than matched by prefix: "/" is a sibling of
// every subtree, and treating it as a prefix would excuse any typo'd chrome link
// on the site — which is the bug this check was rewritten for once already.
const DOMAIN_PAGES = [config.site?.privacy_policy].filter(Boolean);

const isSibling = (href) => DOMAIN_PAGES.includes(href)
  || SIBLING_ROOTS.some((r) => href === r || (r !== '/' && href.startsWith(r)));

const CLAIMED_SERVICE = config.proof?.consultation?.verb_must_match_page
  ? new RegExp(config.proof.consultation.verb_must_match_page, 'i') : null;

/** A site URL -> the built file that serves it, or null if nothing does. */
function builtFile(url) {
  const rel = url.startsWith(ROOT) ? url.slice(ROOT.length) : url.replace(/^\//, '');
  const p = path.join(DIST, rel, 'index.html');
  return fs.existsSync(p) ? p : null;
}
/**
 * Claims this business cannot make, loaded from the payload rather than carried.
 *
 * This was 125 lines of cabinet-refacing truth compiled into the linter — the
 * most valuable thing in the project and the least portable, since a plumber's
 * list would share not one entry with it. It lives in claims-<entity>.yaml now
 * and this only knows the shape.
 *
 * Two shapes. A plain claim fires wherever it matches. A contextual claim
 * carries `unless`, and a hit is forgiven when that second pattern appears
 * within `window` characters either side — which is how the rule about cabinet
 * finishes avoids failing an honest sentence about trim.
 *
 * An absent file means no claim guards. That is correct rather than lenient: a
 * business nobody has interviewed yet has no claims to check, and inventing some
 * would be worse than having none.
 */
const CLAIMS = (() => {
  if (!fs.existsSync(claimsPath)) {
    console.log(`  \u2298 no ${path.basename(claimsPath)} — claim checks skipped`);
    return [];
  }
  const raw = yaml.load(fs.readFileSync(claimsPath, 'utf8'))?.claims ?? [];
  return raw.map((c, i) => {
    const where = `${path.basename(claimsPath)} claim ${c.id ?? `#${i + 1}`}`;
    let re, unless = null;
    // A bad pattern must name itself. A regex that fails to compile inside a
    // build step reports a SyntaxError with no indication of which of twenty-one
    // entries produced it.
    try { re = new RegExp(c.pattern, c.flags ?? 'i'); }
    catch (e) { throw new Error(`${where}: bad pattern — ${e.message}`); }
    if (c.unless) {
      try { unless = new RegExp(c.unless, c.flags ?? 'i'); }
      catch (e) { throw new Error(`${where}: bad "unless" pattern — ${e.message}`); }
    }
    if (!c.why) throw new Error(`${where}: no "why" — the message is the point of the check`);
    return { re, unless, window: c.window ?? 140, why: c.why, id: c.id };
  });
})();

const FLOORS = { pillar: 1500, service: 1500, location: 1000, supporting: 1000, utility: 0, hub: 800 };
const GENERIC = new Set(['learn more', 'read more', 'click here', 'here', 'more', 'view more',
  'see more', 'find out more', 'get started', 'contact us', 'get a quote', 'this page', 'link']);

// Astro adds scoped attributes, so never match `<tag>` — always allow attributes.
const tag = (t) => new RegExp(`<${t}\\b[^>]*>([\\s\\S]*?)</${t}>`, 'gi');
const strip = (s) => s.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ');
const text = (s) => strip(s).replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();

/**
 * Words in a run of rendered HTML.
 *
 * Punctuation-only tokens do not count. strip() turns every tag into a space, so
 * `<strong>size</strong>.` yields "size ." — two tokens for one word. That is
 * invisible until emphasis lands next to punctuation, which is exactly what
 * happened when bold went into the link contexts: three of them jumped to 101
 * against a 70-100 rule without a word of prose changing.
 */
const wordsIn = (html) =>
  text(html).split(/\s+/).filter((t) => /[\p{L}\p{N}]/u.test(t)).length;

const errors = [];
const warnings = [];
const unbuilt = [];                 // links whose target has no built page yet
const anchorRegistry = new Map();   // anchor text -> [pages]  (site-wide uniqueness)
const targetRegistry = new Map();   // normalised title term -> [pages]  (cannibalisation guard —
                                     // protects the one-target-keyword-per-page rule, docs/CORE30-METHODOLOGY.md § Target keywords)
const locationParaRegistry = new Map();  // normalised paragraph -> [pages]  (templated locations)

/**
 * The search term a title tag is actually aiming at, reduced so that two pages
 * chasing one query collide here even when the strings differ.
 *
 * Everything after the first "|" is brand or a differentiator and is dropped —
 * "Cabinet Painting Vaughan | Sprayed, Not Brushed" and "… | Booth-Sprayed 2K"
 * are one term wearing two hats. Stopwords go. Inflections go, because
 * "Kitchen Remodeler Oakville" and "Kitchen Remodeling in Oakville" are the same
 * intent and Google treats them so. Word order goes, since a title is a bag of
 * terms rather than a sentence to the thing reading it.
 */
function titleTarget(title) {
  return [...new Set(String(title).split('|')[0].toLowerCase()
    .replace(/\b(in|the|a|an|your|our|and|for|with|to)\b/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/).filter(Boolean)
    .map((w) => w.replace(/(ers|er|ing|s)$/, '')))]
    .sort().join(' ');
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : e.name.endsWith('.html') ? [p] : [];
  });
}

function lintPage(file, html) {
  // Built paths are relative to the entity root: dist/index.html serves /oakville/.
  const rel = (ROOT + path.relative(DIST, file).replace(/index\.html$/, '')).replace(/\/+/g, '/');
  const err = (m) => errors.push(`${rel}  ${m}`);
  const warn = (m) => warnings.push(`${rel}  ${m}`);

  const main = (html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i) || [, ''])[1];

  // ── headings ─────────────────────────────────────────────────────────
  const h1s = [...html.matchAll(tag('h1'))].map((m) => text(m[1]));

  // Every page, not only pillars — the collisions this caught in practice were
  // pillar-vs-service, homepage-vs-location and service-vs-location.
  {
    const t = (html.match(/<title>([^<]*)</i) || [, ''])[1];
    const key = titleTarget(t);
    if (key) {
      if (!targetRegistry.has(key)) targetRegistry.set(key, []);
      targetRegistry.get(key).push(`${rel}  "${t.split('|')[0].trim()}"`);
    }
  }
  if (h1s.length !== 1) err(`h1 count is ${h1s.length}, expected exactly 1`);
  if (!/<main\b/i.test(html)) err('no <main> landmark');
  if (!/<footer\b/i.test(html)) err('no <footer> landmark');

  const self = pages.get(rel);

  // ── a place name in every H1 ────────────────────────────────────────
  // The category proves WHAT; nothing proved WHERE until a reader got as far
  // as the footer or the URL bar. A location page already names its own place
  // — Burlington, Glen Abbey — and that satisfies this on its own, the same
  // way a re-themed pillar's title satisfies the category check differently
  // from a plain one. Everything else gets the entity's home city, checked
  // against config rather than hardcoded, so a second entity with a
  // different home city is covered without editing this file.
  // Pages that do not compete in local search are exempt — a privacy policy
  // does not, and "Privacy Policy in Vaughan" would read as a mistake rather
  // than as geographic relevance. Named rather than kind-based: about and
  // contact are `utility` too, and those DO need the city, so `type: utility`
  // alone is too broad a signal to exempt on.
  //
  // A thank-you page is here for the same reason and arrives by a different
  // route: nobody searches for one, because it is only ever reached by having
  // just submitted a form. It is a destination, not a landing page. Both
  // spellings, because the slug is dictated by whatever the form provider was
  // configured to redirect to rather than chosen here — GHL sends ours to
  // /thankyou/.
  const isNonCompeting =
    /\/(privacy-policy|terms-of-service|cookie-policy|thankyou|thank-you)\/$/.test(rel);
  if (!isNonCompeting) {
    const h1 = h1s[0] || '';
    const has = (hay, needle) => hay.toLowerCase().includes(needle.toLowerCase());
    const homeCity = config.entity.city ?? config.entity.address?.locality;
    const ownPlace = self?.kind === 'location'
      ? (config.neighbourhoods ?? []).find((n) => rel === `${ROOT}${n.slug}/`)
        ?? (config.locations ?? []).find((l) => rel === `${ROOT}${l.slug}/`)
      : null;
    const requiredPlace = ownPlace ? (ownPlace.name ?? ownPlace.city) : homeCity;
    if (h1 && requiredPlace && !has(h1, requiredPlace)) {
      err(`h1 "${h1}" names no place — expected "${requiredPlace}" somewhere in it`);
    }

    // ── location pages copied by swapping the place name ─────────────────
    // A location page earns its own existence by being about that place —
    // not by being the same page as its five neighbours with a find-and-
    // replace run over it. One shared sentence is a coincidence; three is
    // the same section pasted six times. Counted per PAIR of pages rather
    // than per paragraph, so a single genuinely-universal fact (the warranty
    // term, the payment schedule) repeating everywhere never trips this —
    // only a pair that shares a real run of them does.
    if (self?.kind === 'location' && requiredPlace) {
      const placeRe = new RegExp(requiredPlace.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const chunks = [...main.matchAll(tag('p')), ...main.matchAll(tag('dd'))]
        .map((m) => text(m[1]));
      for (const chunk of chunks) {
        if (wordsIn(chunk) < 25) continue;
        const normalised = chunk.replace(placeRe, '{PLACE}');
        if (!locationParaRegistry.has(normalised)) locationParaRegistry.set(normalised, []);
        locationParaRegistry.get(normalised).push(rel);
      }
    }
  }

  // ── re-theming ───────────────────────────────────────────────────────
  // docs/CORE30-METHODOLOGY.md § "Re-theming a GBP category". The URL and H1
  // prove category alignment to Google; the re-theme lives in the title tag
  // and the body. Generic SEO tooling flags a
  // title/H1 mismatch as an error — on a re-themed page the mismatch is REQUIRED,
  // and it is the match that is wrong.
  if (self && (self.kind === 'home' || self.kind === 'pillar')) {
    const siloCfg = config.silos.find((s) => s.category === self.silo);
    const h1 = h1s[0] || '';
    const titleText = (html.match(/<title>([^<]*)</i) || [, ''])[1];
    const has = (hay, needle) => hay.toLowerCase().includes(needle.toLowerCase());

    if (siloCfg && !has(h1, siloCfg.category)) {
      err(`h1 "${h1}" does not carry the GBP category "${siloCfg.category}" verbatim`);
    }
    if (siloCfg?.retheme) {
      if (!has(titleText, siloCfg.retheme)) {
        err(`re-themed page: title must carry "${siloCfg.retheme}", got "${titleText}"`);
      }
      if (has(titleText, siloCfg.category)) {
        err(`re-themed page: title still carries the GBP category "${siloCfg.category}" — ` +
            `the category belongs in the URL and H1, the re-theme in the title`);
      }
      // "After the H1, the category is never mentioned again."
      const afterH1 = text(main).replace(h1, '');
      const strays = (afterH1.match(new RegExp(`\\b${siloCfg.category}\\b`, 'gi')) || []).length;
      if (strays) warn(`GBP category "${siloCfg.category}" appears ${strays}× in the body of a re-themed page`);
      const themed = (text(main).match(new RegExp(siloCfg.retheme, 'gi')) || []).length;
      if (themed < 3) warn(`re-theme "${siloCfg.retheme}" appears only ${themed}× in the body — the re-theme should run throughout`);
    }

    // ── the consultation count line ────────────────────────────────────
    // Consultation.astro hardcoded "100+ kitchens refaced across Oakville and
    // Halton" and shipped it on all four pages that render the block, so the
    // painter, cabinet-maker and countertop pillars each claimed refacing under
    // a heading about something else. It reached production.
    //
    // The verb now comes from headings.consultation.verb per page. Two ways that
    // can go wrong, and both are silent in the rendered page: leave the field out
    // and the sentence reads "100+ kitchens  across Oakville and Halton"; copy a
    // consultation block from the homepage into a new pillar and it claims
    // refacing again. This catches each of them.
    const count = (html.match(/class="cons__count"[^>]*>([\s\S]*?)<\/p>/) || [, ''])[1];
    if (count) {
      const said = text(count).replace(/\s+/g, ' ').trim();
      const m = said.match(/^\S+\s+kitchens\s+(.*?)\s+across\b/);
      if (!m || !m[1]) {
        err(`consultation count line has no verb ("${said}") — set headings.consultation.verb`);
      } else if (CLAIMED_SERVICE && CLAIMED_SERVICE.test(m[1])
                 && !CLAIMED_SERVICE.test(`${titleText} ${h1} ${siloCfg?.retheme || ''}`)) {
        // Tested against what the page itself claims, not against the silo. The
        // homepage sits in its primary silo with retheme: null — it is the
        // refacing page by editorial decision rather than by config — so a silo
        // test flags it and misses the actual rule. What the title carries is the
        // real signal.
        //
        // The pattern comes from config. It was a bare /refac/i here, which is
        // one business's vocabulary sitting in the shared linter.
        err(`consultation says "kitchens ${m[1]}" but nothing in this page's title, ` +
            `h1 or re-theme corroborates it`);
      }
    }
    if (/class="cons__lead"[^>]*>\s*<\/p>/.test(html)) {
      err('consultation lede is empty — set headings.consultation.body');
    }
  }

  // ── claims against OPERATIONS.md ─────────────────────────────────────
  // The list comes from claims-<entity>.yaml; see the loader at the top. Two
  // shapes share one loop, because the contextual one used to be written out
  // separately here and that is why it was the only claim nobody could reuse.
  const flat = text(main);
  for (const c of CLAIMS) {
    if (!c.unless) {
      const hit = flat.match(c.re);
      if (hit) err(`"${hit[0]}" contradicts OPERATIONS.md — ${c.why}`);
      continue;
    }
    // A hit forgiven by its surroundings. The window is generous in both
    // directions on purpose: letting one true sentence pass costs nothing, while
    // a false failure pushes somebody to delete an accurate line to get a green
    // build — which is how several of these findings were introduced.
    const re = new RegExp(c.re.source, c.re.flags.includes('g') ? c.re.flags : c.re.flags + 'g');
    for (const m of flat.matchAll(re)) {
      const around = flat.slice(Math.max(0, m.index - c.window), m.index + m[0].length + c.window);
      if (!c.unless.test(around)) err(`"${m[0]}" — ${c.why}`);
    }
  }

  // ── collapsed lists ──────────────────────────────────────────────────
  // A one-item list whose text still contains a marker is a list that lost its
  // line breaks somewhere between the markdown and the DOM. It renders as a single
  // bullet with " - " sitting in the prose, and every other check passes: the tags
  // are well formed, the words are all present, the count barely moves. Found by
  // eye on two pages after I had "verified" one of them by counting <ol> tags
  // rather than <li> ones.
  for (const m of main.matchAll(/<(ul|ol)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const items = [...m[2].matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)];
    if (items.length !== 1) continue;
    const body = text(items[0][1]);
    if (/\s-\s\S/.test(body) || /\s\d+\.\s\S/.test(body)) {
      err(`<${m[1]}> collapsed to one item — markers left in the text: "${body.slice(0, 60)}…"`);
    }
  }

  // ── unrendered markdown ──────────────────────────────────────────────
  // ** reaching the DOM means a bold run was never converted.
  if (/\*\*/.test(text(main))) err('literal ** in the rendered page — bold was not converted');

  // The same markers leaking into places the string is DATA rather than prose.
  // This checked <main> only, and <main> renders correctly — so emphasis added to
  // the FAQ answers shipped `**five days**` into the FAQPage schema and the meta
  // description, where nothing renders it and Google would have published the
  // asterisks in a rich result. Caught on the deployed site, not by the build.
  const ldRaw = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
  if (ldRaw && /\*\*/.test(ldRaw[1])) {
    err('emphasis markers in JSON-LD — schema strings must go through stripInline()');
  }
  for (const m of html.matchAll(/<meta[^>]*(?:name|property)="(description|og:[\w:]+|twitter:[\w:]+)"[^>]*content="([^"]*)"/gi)) {
    if (/\*\*/.test(m[2])) err(`emphasis markers in <meta ${m[1]}>`);
  }
  if (/\*\*/.test((html.match(/<title>([^<]*)</i) || [, ''])[1])) err('emphasis markers in <title>');

  // ── founding year ────────────────────────────────────────────────────
  // "since <year>" has to agree with entity.opened. The generator's copy claimed
  // 2012 and the GBP profile says 15 January 2013; the wrong year reached a live
  // page because every other page renders the year from config as a stat, so
  // there was nothing to compare the one hand-written sentence against.
  const opened = new Date(config.entity.opened).getFullYear();
  for (const m of text(main).matchAll(/\bsince\s+((?:19|20)\d\d)\b/gi)) {
    if (+m[1] !== opened) err(`claims "since ${m[1]}" but entity.opened is ${opened}`);
  }
  // Nick has 25 years in the trade and 13 running the company — twelve before
  // 2012 plus the business since. Both numbers are now on the site, which makes
  // conflating them the obvious next error: "25 years in business" would be false
  // by twelve years, and it is the flattering direction to get it wrong in.
  const inBusiness = new Date().getFullYear() - opened;
  for (const m of text(main).matchAll(/\b(\d{1,2})\s+years?\s+in\s+business\b/gi)) {
    if (+m[1] !== inBusiness) {
      err(`claims "${m[1]} years in business" but the company opened in ${opened} — ` +
          `that is ${inBusiness}. Years in the trade are a different number.`);
    }
  }

  // ── word count ───────────────────────────────────────────────────────
  const words = wordsIn(main);
  const type = !self || self.kind === 'utility' ? 'utility'
    : self.kind === 'location' ? 'location'
    // The hub carries a lower floor than a pillar on purpose. Most of its
    // surface is the index itself, and padding an index with prose to clear a
    // 1,500-word bar would make it worse at the one job it has.
    : self.kind === 'hub' ? 'hub'
    // The floor for `supporting` has been in this table since before anything
    // used it. The method asks for roughly 1,500 words an article; 1,000 is the
    // point below which it stops being long-form and becomes a padded FAQ answer.
    : self.kind === 'supporting' ? 'supporting'
    : self.kind === 'service' ? 'service' : 'pillar';
  if (words < FLOORS[type]) err(`${words} words, floor for ${type} is ${FLOORS[type]}`);
  if (!self) warn('not declared in any silo — the config does not know this page exists');

  // ── links that leave the site open in a new tab ──────────────────────
  /* Scans the whole document rather than <main>, because that is where the
     links are: when this rule was written, 371 of the site's 380 external links
     were the footer's social list. A check limited to prose would have passed a
     site where the rule was almost entirely unapplied.

     Both directions are errors. A missing target on an external link is the
     stated rule; target on an INTERNAL link is the failure mode of anyone who
     later tries to satisfy this rule with a blanket selector, and it is worse —
     it strands visitors in a pile of tabs inside one site.

     The announcement span is deliberately NOT checked here. It is an
     accessibility affordance whose absence a linter cannot distinguish from a
     link whose visible text already says where it goes, and a rule that forces
     boilerplate onto every anchor produces screen-reader noise rather than
     clarity. */
  const OWN_HOST = config.site?.domain ?? null;
  const offsite = (href) => {
    try {
      const h = new URL(href).hostname;
      return !OWN_HOST || !(h === OWN_HOST || h.endsWith(`.${OWN_HOST}`));
    } catch { return false; }        // unparseable: not this rule's business
  };
  for (const m of html.matchAll(/<a\b[^>]*href="(https?:\/\/[^"]+)"[^>]*>/gi)) {
    if (offsite(m[1]) && !/\btarget="_blank"/i.test(m[0])) {
      err(`external link opens in this tab: ${m[1]}`);
    }
  }
  for (const m of html.matchAll(/<a\b[^>]*href="(\/[^"]*)"[^>]*>/gi)) {
    if (/\btarget="_blank"/i.test(m[0])) {
      err(`internal link opens in a new tab: ${m[1]}`);
    }
  }

  // ── links in body prose ──────────────────────────────────────────────
  const links = [...main.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)]
    .map((m) => ({ href: m[1], text: text(m[2]) }))
    .filter((l) => l.text && !/^(tel:|mailto:|#)/.test(l.href));

  // Links to a utility page (contact, about) are conversion chrome that happens to
  // sit inside <main> — the hero's "Get a quote" button, not a sentence about a
  // destination. They pass no silo equity, so they are exempt from the silo rules
  // and from the anchor registry, exactly as nav and tel: are (docs/CORE30-FAQ.md
  // § "Navbar links do not count; editorial links do"). Without
  // this the same button on 25 pages would be 25 collisions on one generic anchor,
  // and every one of them a cross-silo violation.
  //
  // They are NOT exempt from having to exist.
  const allInternal = links.filter((l) => l.href.startsWith('/'));
  const internal = allInternal.filter((l) => !isUtility(l.href));
  for (const l of allInternal.filter((l) => isUtility(l.href))) {
    if (!builtFile(l.href)) unbuilt.push(`${rel} → ${l.href} (chrome)`);
  }

  // Links inside a card grid. Needed twice below: they are index links rather
  // than editorial ones, which changes what two of the rules should ask of them.
  const cardHtml = [...main.matchAll(/<ul class="cards">[\s\S]*?<\/ul>/gi)].map((m) => m[0]).join('');
  const inACard = new Set([...cardHtml.matchAll(/<a\b[^>]*href="([^"]+)"/gi)].map((m) => m[1]));

  for (const l of internal) {
    const key = l.text.toLowerCase();
    if (GENERIC.has(key)) err(`generic anchor "${l.text}"`);
    // The business's own name is as useless an anchor as "click here": it
    // describes the linker, not the destination. Read from config rather than
    // typed in — this was `/kitchen made new/i`, which meant the check silently
    // stopped working for any other business the moment there was one.
    if (BRAND.test(l.text)) err(`brand-name anchor "${l.text}"`);
    // Card links stay out of the site-wide anchor registry, for the reason nav
    // and footer links already do (docs/CORE30-FAQ.md § "Navbar links do not
    // count; editorial links do"): an index entry is a navigational
    // link, not an editorial one, and the registry exists to keep EDITORIAL
    // anchors varied and descriptive.
    //
    // Enforcing it here made the build dictate the copy. The hub and a pillar
    // both link to Spray Painting, so one of them had to say something else, and
    // the something else was " in Oakville" appended to every card title — which
    // wrapped all five homepage titles onto two lines to solve a problem no
    // reader has. Both grids sit under a heading that already says "in Oakville".
    // They still have to be descriptive and non-generic, which the two checks
    // above enforce whether the link is in a card or not.
    if (!inACard.has(l.href)) {
      if (!anchorRegistry.has(key)) anchorRegistry.set(key, []);
      anchorRegistry.get(key).push(rel);
    }

    // ── silo ownership ─────────────────────────────────────────────────
    // The rule Core 30 exists to enforce, and the one this linter was blind to.
    const violation = checkLink(rel, l.href);
    if (violation) err(violation);

    // ── target exists ──────────────────────────────────────────────────
    // A link to a page that has not been built passes no equity and dead-ends a
    // visitor. Structurally perfect and functionally worthless.
    if (!builtFile(l.href)) unbuilt.push(`${rel} → ${l.href}`);
  }

  // Two links to the same destination on one page — an engine-level anti-spam
  // refinement of the internal-linking discipline (docs/CORE30-METHODOLOGY.md
  // § "Internal linking: topic silos and link circles"), not a rule the course
  // states explicitly. Amended by DISCREPANCIES #31.
  //
  // The rule stands everywhere except one place: a service may ALSO appear in a
  // card grid, so a pillar that argues for a service in prose may repeat it as a
  // scannable card below. Anything beyond that is still an error, which keeps the
  // rule doing its real job — catching the same link pasted twice into body copy.
  //
  // Nick's call, made knowing the cost: first-link-wins means the card link
  // passes no authority, so this buys a reader something and a crawler nothing.
  const hits = new Map();
  for (const l of internal) hits.set(l.href, (hits.get(l.href) ?? 0) + 1);
  for (const [href, n] of hits) {
    const allowed = 1 + (inACard.has(href) ? 1 : 0);
    if (n > allowed) err(`links ${n}× to ${href} — the limit is ${allowed}`);
  }

  // ── heading hygiene ──────────────────────────────────────────────────
  const heads = [...html.matchAll(/<(h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/gi)];
  let prev = 0;
  for (const m of heads) {
    const lvl = +m[1][1];
    if (prev && lvl > prev + 1) err(`heading level skips h${prev} → h${lvl} at "${text(m[2]).slice(0, 40)}"`);
    if (/<a\b/i.test(m[2])) err(`link inside heading "${text(m[2]).slice(0, 40)}"`);
    // An empty heading is a section whose title was never written. It renders as
    // blank space with the outline of a real heading, and no other check sees it:
    // the level is valid, it holds no link, and the word count barely moves.
    if (!text(m[2]).trim()) err(`empty <${m[1]}> — a section is missing its title`);
    prev = lvl;
  }

  // ── silo coverage ────────────────────────────────────────────────────
  // A pillar that cannot reach some of its own children is not siloing them.
  if (self && (self.kind === 'home' || self.kind === 'pillar')) {
    const reached = new Set(internal.map((l) => l.href));
    const missed = childrenOf(rel).filter((c) => !reached.has(c));

    // Split "not written yet" from "written but orphaned". Both were reported
    // identically, and for days the four location pages produced a warning that
    // read like a defect while actually describing a decision.
    //
    // Nick, 2026-07-31: the location pages are SUPPORTING pages, deliberately
    // after the category and service structure — "don't worry about the other
    // locations yet, like Burlington, Mississauga, Milton, and Hamilton. We will
    // leave that for later." They are declared in config so the plan is on
    // record; they are not built, and that is the plan working.
    //
    // A page that exists and nothing links to is still a real fault: it is
    // reachable by Google and orphaned from its own silo.
    const orphaned = missed.filter((c) => builtFile(c));
    const notBuilt = missed.filter((c) => !builtFile(c));

    if (orphaned.length) {
      warn(`${orphaned.length} child page(s) built but unlinked from this pillar: ${orphaned.join(', ')}`);
    }
    if (notBuilt.length) {
      warn(`${notBuilt.length} planned page(s) not built yet — declared in config, no page and no link: `
        + `${notBuilt.join(', ')}`);
    }
  }

  // ── the up-link ──────────────────────────────────────────────────────
  // Core 30 is "down and up only", and the linter enforced only half of it: it
  // checked that no link went sideways, and never that the up-link existed. A
  // service page carrying zero internal links passed silently, which is the whole
  // silo model failing open.
  //
  // Services are a hard error — all eleven built so far carry one, so this pins
  // behaviour rather than demanding new work. Pillars are a warning: none of the
  // three link up to the homepage, and that looks deliberate rather than
  // accidental, so it is Nick's call and not the linter's.
  //
  // Utility pages are exempt for the reason given in silo.mjs — they are reached
  // from chrome and carry no topical links in either direction.
  //
  // The services hub is exempt because down-only is the entire point of it. It
  // indexes every silo, so an up-link from it is not the "AND up" this rule is
  // asking for — it would be the hub joining a silo it is supposed to sit
  // outside. Its parent is the root, which its own index already reaches.
  if (self && self.parent && !isUtility(rel) && self.kind !== 'hub') {
    const linksUp = internal.some((l) => l.href === self.parent);
    if (!linksUp) {
      const m = `no up-link to its parent ${self.parent} — Core 30 is down AND up`;
      if (self.kind === 'service') err(m); else warn(m);
    }
  }

  // ── contextual link sections ─────────────────────────────────────────
  // Core 30 wants the link SURROUNDED by 70–100 words, not preceded by them.
  // A link outside the prose block is a "read more" in disguise.
  //
  // The services hub is the one page this cannot apply to, and the exception is
  // the honest kind rather than a convenience. Everywhere else, a bare list of
  // links means a writer took a shortcut past the context the rule is there to
  // force. On an index, the list IS the page — wrapping each of seventeen
  // entries in eighty words of prose would not make it more contextual, it would
  // make it a fifth pillar nobody asked for and bury the one thing a visitor
  // came here to do, which is find the right service and leave.
  const sections = [...main.matchAll(/<section\b[^>]*class="ls[ "][^>]*>([\s\S]*?)<\/section>/gi)];
  if (!sections.length && internal.length && self?.kind !== 'hub') {
    warn('no contextual sections matched — did the component class change?');
  }
  for (const m of sections) {
    const block = m[1];
    const head = text((block.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i) || [, '?'])[1]);
    const prose = (block.match(/<div\b[^>]*class="linked__prose[^"]*"[^>]*>([\s\S]*?)<\/div>/i) || [, ''])[1];
    const n = wordsIn(prose);
    const inProse = (prose.match(/<a\b/gi) || []).length;
    const inBlock = (block.match(/<a\b/gi) || []).length;
    if (inBlock !== 1) err(`"${head}" has ${inBlock} links, contextual sections take exactly 1`);
    else if (inProse !== 1) err(`"${head}" link sits outside the prose — it must be surrounded by its context, not follow it`);
    if (n < 70 || n > 100) warn(`"${head}" context is ${n} words, rule is 70–100`);
  }

  // ── two sections with the same name ──────────────────────────────────
  // The about page carried "The five of us" as an H2 twice — once as a prose
  // heading, once as the team section's title — from the day the team section
  // was added. It survived every read of that page because each heading is
  // correct where it sits and they are most of a screen apart, which is exactly
  // why a person does not catch it and a two-line check does.
  //
  // Compared on words rather than characters: "The five of us" and "The Five of
  // Us" are the same section name to a reader, and the site mixes casing between
  // frontmatter headings and markdown ones.
  const h2s = new Map();
  for (const m of main.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)) {
    const shown = text(m[1]);
    const key = shown.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (!key) continue;
    const prev = h2s.get(key);
    h2s.set(key, { shown: prev?.shown ?? shown, n: (prev?.n ?? 0) + 1 });
  }
  for (const { shown, n } of h2s.values()) {
    if (n > 1) err(`${n} sections are headed "${shown}" — rename one, they are two things to a reader`);
  }

  // A silo page with no outbound contextual links does no silo work at all. A
  // utility page is not in a silo and has none to do.
  if (!internal.length && type !== 'utility') {
    err('no internal body links — this page links to nothing in its silo');
  }

  // ── chrome links ─────────────────────────────────────────────────────
  // Nav and footer links are exempt from the SILO rules (docs/CORE30-FAQ.md §
  // "Navbar links do not count; editorial links do") — chrome is
  // not body prose and carries no silo weight. They are not exempt from having to
  // exist. Nothing checked these before, so the masthead pointed at two 404s.
  const chrome = html.replace(/<main\b[\s\S]*?<\/main>/i, '');
  for (const m of chrome.matchAll(/<a\b[^>]*href="(\/[^"#]*)"/gi)) {
    const href = m[1];
    // A link into ANOTHER entity's subtree is legitimate and is built by a
    // different pass, so this build's dist cannot see it. This is a
    // multi-entity build's own rule, not the Core 30 methodology — structural
    // chrome may cross between subtrees while body prose may not, and
    // checkLink already refuses the body case.
    //
    // Matched on segments with the trailing slash, never on the string:
    // "/oakville-cabinet-refacing-locations/" starts with the characters
    // "/oakville" and is not inside "/oakville/". An earlier version of this
    // fell into that exact trap, pulling 15 legacy pages into the wrong entity.
    if (isSibling(href)) continue;
    if (!builtFile(href)) unbuilt.push(`${rel} → ${href} (chrome)`);
  }

  // ── band rhythm ──────────────────────────────────────────────────────
  // Two adjacent bands on the same ground have no boundary between them, so they
  // read as one long section. The page alternates plain/surface; dark is reserved
  // for the two moments that earn it (the gallery, the closing CTA). The hero is
  // exempt — its full-bleed image and stats strip are their own boundary.
  const bands = [...main.matchAll(/<section\b[^>]*class="([^"]*)"/gi)]
    .map((m) => m[1].split(' ').filter(Boolean))
    .filter((c) => !c.some((x) => x.startsWith('ls')) && !c.includes('hero'))
    .map((c) => c.includes('cta') ? 'dark'
      : (c.find((x) => x.startsWith('band--')) || 'band--?').slice(6));
  bands.forEach((tone, i) => {
    if (i && tone === bands[i - 1]) {
      warn(`bands ${i} and ${i + 1} are both "${tone}" — no boundary between them`);
    }
  });

  // ── images ───────────────────────────────────────────────────────────
  const imgs = [...html.matchAll(/<img\b([^>]*)>/gi)].map((m) => m[1]);
  imgs.forEach((a, i) => {
    if (!/alt="[^"]/.test(a) && !/alt=""/.test(a)) err(`image ${i + 1} has no alt attribute`);
    if (!(/\bwidth=/.test(a) && /\bheight=/.test(a))) err(`image ${i + 1} missing width/height (CLS)`);
  });
  // The hero image, found by where it sits rather than by counting past the logo.
  // `imgs[1]` assumed every page opens with a before/after pair; on a plainHero
  // page it landed on the first team portrait and called it a lazy-loaded LCP.
  const heroFig = html.match(/<section\b[^>]*class="[^"]*\bhero\b[^"]*"[^>]*>([\s\S]*?)<\/section>/i);
  const heroImg = heroFig && (heroFig[1].match(/<img\b[^>]*>/i) || [])[0];
  if (heroImg && /loading="lazy"/.test(heroImg)) {
    err('hero image is lazy-loaded — it is the LCP element');
  }

  // Placeholders are deliberately loud on screen, but a build report is what
  // actually gets read. A page must never borrow another page's photograph, so
  // the alternative to a real image is a plate — and the plate has to nag.
  const placeholders = [...new Set(
    [...html.matchAll(/<img[^>]*src="[^"]*\/(ph-[a-z0-9-]+)\.[^"]*"/gi)].map((m) => m[1]))];
  if (placeholders.length) {
    warn(`${placeholders.length} placeholder image(s) still to be replaced: ${placeholders.join(', ')}`);
  }

  // ── the contact form ─────────────────────────────────────────────────
  // Nick, 2026-07-30: "it keeps disappearing from the Contact page... it was
  // there last time." It had not broken — it had been rendered away, silently,
  // more than once. There are three ways to lose it and none of them fail a
  // build, which is why it kept coming back:
  //
  //   1. `headings.form.button` gets set on contact.md. Pillar.astro tests that
  //      FIRST, so the page quietly swaps the real form for a link to itself.
  //   2. `integrations.forms.form_id` goes missing or gets renamed in the
  //      config. Neither branch then matches and the section renders NOTHING —
  //      no band, no error, a clean build.
  //   3. `- form` is dropped from contact.md's sections.
  //
  // The contact page is the only place on the site a lead can actually be
  // submitted. Losing the form costs real money and is invisible until someone
  // happens to scroll the live page, so this is an error, not a warning.
  if (/\/contact\/$/.test(rel)) {
    // Either shape counts: the GHL iframe (what ships today) or our own form
    // (LeadFormNative, once it can take photographs). What must never happen is
    // neither — that is the silent disappearance this guard exists for.
    const iframe = /data-form-id="[^"]+"/.test(html);
    const native = /<form[^>]*id="lead-form"/.test(html) && /\/api\/lead\//.test(html);
    if (!iframe && !native) {
      // Two different failures wearing one message. A site with no
      // `integrations.forms` block has not been wired to a CRM yet — that is the
      // normal state of an entity between being written and being launched, and
      // it is a warning. A site that HAS the block and still renders no form is
      // broken, and that is the error this check was written for.
      const wired = Boolean(config.integrations?.forms?.form_id);
      (wired ? err : warn)('CONTACT FORM IS MISSING — the page has neither the GHL iframe '
        + '(data-form-id) nor our own form posting to /api/lead/. Check, in order: '
        + `headings.form.button set in content/${entityId}/contact.md (renders a `
        + 'button INSTEAD of the form); integrations.forms.form_id absent from '
        + `${path.basename(configPath)} (renders nothing at all); \`- form\` missing `
        + "from contact.md's sections list.");
    }
  }

  // The same silent-empty shape, anywhere. A #consultation band that carries
  // neither a form nor a call to action is a heading over blank space — which is
  // exactly what the contact page looked like each time this went wrong.
  if (/id="consultation"/.test(html)) {
    const band = (html.match(/id="consultation"[\s\S]*?<\/section>/i) || [''])[0];
    // A real form, or a link to the page that has one. The homepage and the
    // pillars deliberately show the second: a button pointing at /contact/.
    if (band && !/<form[^>]*id="lead-form"/.test(band) && !/<a\b[^>]*class="btn"/.test(band)) {
      err('the #consultation band has neither a form nor a button — it renders as a heading over blank space');
    }
  }

  // ── schema ───────────────────────────────────────────────────────────
  const ld = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
  if (!ld) err('no JSON-LD');
  else {
    const g = JSON.parse(ld[1]);
    const blob = JSON.stringify(g);
    if (/aggregateRating|"Review"/.test(blob)) err('self-serving review markup — remove it');
    const faqNode = g['@graph'].find((n) => n['@type'] === 'FAQPage');
    // Count the <dt>s INSIDE the FAQ, not every <dt> on the page. Counting all of
    // them was a safe proxy while the FAQ was the only definition list on the
    // site; the "why choose us" section is a second one, and it made all four
    // pillars report their FAQ schema as short by the number of reasons they
    // give. A tightening rather than a loosening — the check now measures the
    // thing it names.
    const faqHtml = (main.match(/<dl class="faq"[\s\S]*?<\/dl>/i) || [''])[0];
    const visible = (faqHtml.match(/<dt\b/gi) || []).length;
    if (faqNode && faqNode.mainEntity.length !== visible) {
      err(`FAQ schema has ${faqNode.mainEntity.length} entries, page shows ${visible}`);
    }

    const typeOf = (n) => [].concat(n['@type']);
    const node = (t) => g['@graph'].find((n) => typeOf(n).includes(t));

    // Two nodes stating the same fact must state it identically. LocalBusiness
    // said the business served four cities while Service said five, on the same
    // page — because one built areaServed from config.locations, which is the
    // OTHER cities, and the home city fell out.
    const names = (n) => (n?.areaServed ?? []).map((c) => c.name).sort().join(',');
    const lb = node('LocalBusiness'), sv = node('Service');

    // Every node that claims a service area is checked against the CONFIG, not
    // against its sibling on the page.
    //
    // It used to compare LocalBusiness to Service, which worked while both
    // appeared on all 23 pages. D7 ended that: the full business entity is now
    // defined on the GBP landing page alone and everywhere else is a reference
    // node stating no area at all. Comparing the two therefore ran on exactly
    // one page, and 22 Service nodes went unchecked — a real loss of cover
    // disguised as a scoping tweak, which is how it was first written up here.
    //
    // Checking each node against the source both are generated from restores
    // all 24 pages and is stronger than the original besides: two nodes that
    // agree with each other can still both be wrong, and this catches that.
    // The home-city rule is subsumed — the config list leads with it, so a node
    // that omits it cannot match.
    // A storefront's home city is not in `locations` — it IS the entity — so it
    // is added. A service-area business has no home city and every city it serves
    // is already declared, so adding one would expect a duplicate. Mirrors
    // areaServed() in config.js, which builds the node this checks.
    const expected = [...(config.entity.address?.locality ? [config.entity.address.locality] : []),
                      ...(config.locations ?? []).map((l) => l.city)].sort().join(',');
    // A neighbourhood page is the one case where a narrower area is correct — the
    // whole point of it is to be about one place. So it is held to a different
    // expectation rather than excused from having one: its Service node must name
    // exactly the neighbourhood the config says that slug is, and nothing else.
    const ownHood = self?.kind === 'location'
      ? (config.neighbourhoods ?? []).find((n) => rel === `${ROOT}${n.slug}/`)
      : null;
    for (const [label, n] of [['LocalBusiness', lb], ['Service', sv]]) {
      if (!n?.areaServed) continue;
      const want = (ownHood && label === 'Service') ? ownHood.name : expected;
      if (names(n) !== want) {
        err(`${label} areaServed is [${names(n)}], expected [${want}]`);
      }
    }

    // A node nothing points at is invisible to a consumer walking the graph.
    const ids = new Set(g['@graph'].map((n) => n['@id']).filter(Boolean));
    const referenced = new Set();
    JSON.stringify(g).replace(/"@id":"([^"]+)"/g, (m, id) => { referenced.add(id); return m; });
    for (const n of g['@graph']) {
      if (!n['@id']) { err(`${typeOf(n)[0]} node has no @id`); continue; }
      const pointedAt = JSON.stringify(g).split(`"@id":"${n['@id']}"`).length - 1 > 1;
      // The page node is the graph's root — nothing above it points down at it.
      // Exempt it by @id rather than by type: ContactPage and AboutPage are
      // WebPage subtypes, and matching on the literal type name flagged both as
      // orphans the moment the contact page stopped being a plain WebPage.
      const isRoot = n['@id'].endsWith('#page') || typeOf(n).includes('LocalBusiness');
      if (!pointedAt && !isRoot) {
        warn(`${typeOf(n)[0]} is in the graph but nothing references it`);
      }
    }
    // A reference to an @id that no node defines.
    for (const r of referenced) if (!ids.has(r)) err(`schema references undefined @id ${r}`);

    // The video file is the one asset on the site that nothing else checks. A
    // poster is an import and fails the build if it is missing; `video.file` is a
    // bare string interpolated into a URL, so a typo ships a play button that 404s
    // and a VideoObject pointing at nothing. Both the file and its thumbnail are
    // resolved against dist here, because schema naming a missing video is worse
    // than no schema — it is a claim Google will try to fetch and fail.
    const vid = node('VideoObject');
    if (vid) {
      for (const [field, url] of [['contentUrl', vid.contentUrl],
                                  ['thumbnailUrl', vid.thumbnailUrl]]) {
        const p = path.join(DIST, new URL(url).pathname.replace(ROOT, ''));
        if (!fs.existsSync(p)) err(`VideoObject ${field} is not in the build: ${url}`);
      }
      // A VideoObject with no visible player is markup claiming something the
      // page does not show.
      if (!/id="walkthrough"/.test(main)) err('VideoObject in schema but no video band on the page');
    }
  }

  // ── emphasis ─────────────────────────────────────────────────────────
  // Bold and italic went across the site on 2026-07-28 to make long prose
  // scannable. The failure mode is not using them, it is using them everywhere: a
  // page with a bolded phrase in every paragraph reads as keyword stuffing to a
  // person and to Google, and emphasis that is everywhere marks nothing.
  //
  // Two limits. A run longer than twelve words is a bolded sentence, which is the
  // commonest way this goes wrong — the eye has nothing short to land on. And
  // density is capped against body word count. Counted inside p/li/dd only:
  // <strong> also carries the consultation count and the stats figures, which are
  // chrome rather than prose.
  const proseRuns = [...main.matchAll(/<(?:p|li|dd)\b[^>]*>([\s\S]*?)<\/(?:p|li|dd)>/gi)]
    .map((m) => m[1]).join(' ');
  const emphases = [...proseRuns.matchAll(/<(strong|em)>([\s\S]*?)<\/\1>/gi)];
  for (const [, tag, inner] of emphases) {
    const words = inner.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean);
    if (words.length > 12) {
      err(`<${tag}> runs ${words.length} words — emphasis this long is a bolded ` +
          `sentence: "${words.slice(0, 8).join(' ')}…"`);
    }
  }
  const proseWords = wordsIn(proseRuns);
  // One per 60 words is roughly one per short paragraph — already generous.
  if (emphases.length && proseWords / emphases.length < 60) {
    warn(`${emphases.length} emphasised runs in ${proseWords} words of prose ` +
         `(1 per ${Math.round(proseWords / emphases.length)}) — reads as keyword bolding`);
  }

  // ── metadata ─────────────────────────────────────────────────────────
  const meta = (n) => (html.match(
    new RegExp(`<meta[^>]*(?:name|property)="${n}"[^>]*content="([^"]*)"`, 'i')) || [, null])[1];
  const titleText = (html.match(/<title>([^<]*)</i) || [, ''])[1];
  if (titleText.length > 60) warn(`title is ${titleText.length} chars — truncates near 60`);
  const desc = meta('description');
  if (!desc) err('no meta description');
  else if (desc.length > 155) warn(`description is ${desc.length} chars — truncates near 155`);
  if (!/<link rel="canonical"/i.test(html)) err('no canonical');
  if (!meta('og:image')) warn('no og:image — shares render without a picture');

  // ── weight ───────────────────────────────────────────────────────────
  const kb = Buffer.byteLength(html) / 1024;
  if (kb > 100) warn(`${kb.toFixed(0)} KB of HTML`);
  return { rel, words, links: internal.length, kb };
}

const files = walk(DIST);
const rows = files.map((f) => lintPage(f, fs.readFileSync(f, 'utf8')));

// ── the supporting link circles ───────────────────────────────────────────
// checkLink permits a lateral link between supporting articles sharing a parent.
// That permission is only safe if the links form the circles it was granted for,
// so the shape is verified rather than assumed.
//
// The test is out-degree and in-degree, both exactly one. A directed graph where
// every node has one edge out and one edge in IS a disjoint union of cycles —
// that is what a permutation is — so this admits any number of separate circles
// under one parent while still rejecting a mesh, a chain, or an article that
// links to two siblings. It started as "one closed loop per parent", which was
// right when there was one topic and wrong the moment a second silo was added
// under the same service page.
{
  const groups = new Map();
  for (const [url, p] of pages) {
    if (p.kind !== 'supporting') continue;
    if (!groups.has(p.parent)) groups.set(p.parent, []);
    groups.get(p.parent).push(url);
  }
  for (const [parent, members] of groups) {
    const built = members.filter((u) => builtFile(u));
    if (built.length < 2) continue;
    const out = new Map(), into = new Map(built.map((u) => [u, 0]));
    for (const u of built) {
      const html = fs.readFileSync(builtFile(u), 'utf8');
      const main = (html.match(/<main\b[\s\S]*?<\/main>/i) || [''])[0];
      const uniq = [...new Set([...main.matchAll(/<a\b[^>]*href="([^"]+)"/gi)]
        .map((m) => m[1]).filter((h) => built.includes(h) && h !== u))];
      if (uniq.length !== 1) {
        errors.push(`${u} links to ${uniq.length} sibling(s) — a circle wants exactly 1`);
        continue;
      }
      out.set(u, uniq[0]);
      into.set(uniq[0], (into.get(uniq[0]) ?? 0) + 1);
    }
    if (out.size !== built.length) continue;
    for (const [u, n] of into) {
      if (n !== 1) errors.push(`${u} is linked to by ${n} sibling(s) — a circle wants exactly 1`);
    }
    // Report how many circles that resolves to, so the shape is visible rather
    // than merely legal.
    const seen = new Set(); let circles = 0;
    for (const u of built) {
      if (seen.has(u)) continue;
      circles++; let cur = u;
      while (!seen.has(cur)) { seen.add(cur); cur = out.get(cur); }
    }
    console.log(`  ${built.length} supporting articles under ${parent} in ${circles} circle(s)`);
  }
}

for (const [anchor, on] of anchorRegistry) {
  if (on.length > 1) errors.push(`anchor "${anchor}" reused on ${on.length} pages: ${on.join(', ')}`);
}

// Cannibalisation guard — protects the one-target-keyword-per-page rule in
// docs/CORE30-METHODOLOGY.md § "Target keywords". Two pages on one subtree
// aiming at the same query is the failure the primary-pillar merge exists to
// prevent, and it kept reappearing one
// level down: a pillar re-themed to the name of its own service, a homepage and a
// location page for the same city, a category noun beside its own gerund. Every
// one of those shipped green, because nothing compared one page's title with
// another's. The config comment claiming "the cannibalisation guards" existed was
// the only thing that ever checked it, and a comment checks nothing.
for (const [, on] of targetRegistry) {
  if (on.length > 1) {
    errors.push(`${on.length} pages target the same query — Google picks one and the `
      + `signals split:\n        ${on.join('\n        ')}`);
  }
}

// Location pages templated by swapping the place name. Reported per PAIR of
// pages, not per paragraph — count how many identical long paragraphs each
// pair shares, across every normalised chunk collected above, and only flag
// a pair once the shared count says "this is the same section pasted in
// again", not "these two pages happen to both state the warranty term".
{
  const pairCounts = new Map();   // "pageA :: pageB" -> { count, example }
  for (const [normalised, on] of locationParaRegistry) {
    const uniquePages = [...new Set(on)];
    if (uniquePages.length < 2) continue;
    for (let i = 0; i < uniquePages.length; i++) {
      for (let j = i + 1; j < uniquePages.length; j++) {
        const key = [uniquePages[i], uniquePages[j]].sort().join(' :: ');
        if (!pairCounts.has(key)) pairCounts.set(key, { count: 0, example: normalised });
        pairCounts.get(key).count++;
      }
    }
  }
  const DUPLICATE_PARAGRAPH_LIMIT = 3;
  for (const [pair, { count, example }] of pairCounts) {
    if (count >= DUPLICATE_PARAGRAPH_LIMIT) {
      const [a, b] = pair.split(' :: ');
      errors.push(`${a} and ${b} share ${count} identical paragraphs once the place name is `
        + `swapped out — location pages need to differ by more than the city, not less `
        + `(e.g. "${example.slice(0, 90)}…")`);
    }
  }
}

// Unbuilt targets are reported apart from the pass/fail line. While the silo is
// being built out every link points at a page that does not exist yet, so failing
// on it would make the build permanently red and the signal worthless. It becomes
// a hard error once every declared page has been built at least once.
// Utility pages are declared and must exist, but they are not silo pages — they
// are counted and reported with the chrome targets below, not in the silo tally.
const declared = [...pages].filter(([, p]) => p.kind !== 'utility').map(([u]) => u);
const builtAll = declared.every((u) => builtFile(u));
if (unbuilt.length) {
  if (builtAll) unbuilt.forEach((u) => errors.push(`dead link: ${u}`));
  else {
    const missingSilo = declared.filter((u) => !builtFile(u));
    warnings.push(`${unbuilt.filter((u) => !u.endsWith('(chrome)')).length} body link(s) ` +
      `point at pages not built yet — ${missingSilo.length} of ${declared.length} silo pages missing`);
    // Chrome targets are named individually: they are not silo pages, so they do
    // not appear in the count above and would otherwise go unnoticed entirely.
    const chromeDead = [...new Set(unbuilt.filter((u) => u.endsWith('(chrome)'))
      .map((u) => u.split(' → ')[1].replace(' (chrome)', '')))];
    if (chromeDead.length) {
      warnings.push(`nav/footer point at ${chromeDead.length} page(s) that do not exist: ` +
        chromeDead.join(', '));
    }
  }
}

// Every browser that probes for an icon does it at these exact names, at the
// domain root, regardless of what any page's <link> tags declare — Safari
// fetches /apple-touch-icon.png directly when building a bookmark tile, most
// browsers fetch /favicon.ico directly for a tab icon, and older iOS tries
// apple-touch-icon-precomposed.png before the plain name. None of that is
// visible from a page's own markup, which is exactly how kitchenmadenew.com
// went live with all three missing and nothing caught it until Safari drew a
// letter tile instead of the logo.
//
// derive-icons.mjs (run via `prebuild`) is what is supposed to put these
// here — this is the guard for the case it did not run, or ran against the
// wrong public/, rather than a duplicate of what it already checks.
//
// Checked once per entity build, not once per page: these are domain-root
// assets Astro copies from public/ into every dist/ wholesale, identical on
// every page, so asserting it inside lintPage would repeat the same check
// 45+ times for one answer.
for (const f of ['favicon.ico', 'apple-touch-icon.png', 'apple-touch-icon-precomposed.png',
  'icon-32.png', 'icon-180.png', 'icon-192.png', 'icon-512.png']) {
  if (!fs.existsSync(path.join(DIST, f))) errors.push(`missing /${f} — see derive-icons.mjs`);
}

console.log(`\n  ${'PAGE'.padEnd(42)} ${'WORDS'.padStart(6)} ${'LINKS'.padStart(6)} ${'KB'.padStart(6)}`);
console.log('  ' + '─'.repeat(64));
for (const r of rows) console.log(`  ${r.rel.padEnd(42)} ${String(r.words).padStart(6)} ${String(r.links).padStart(6)} ${r.kb.toFixed(0).padStart(6)}`);

if (warnings.length) {
  console.log(`\n  WARNINGS (${warnings.length})`);
  warnings.forEach((w) => console.log(`    ~ ${w}`));
}
if (errors.length) {
  console.log(`\n  ERRORS (${errors.length})`);
  errors.forEach((e) => console.log(`    ! ${e}`));
  console.log('');
  process.exit(1);
}
console.log(`\n  ✓ ${rows.length} page(s) pass\n`);
