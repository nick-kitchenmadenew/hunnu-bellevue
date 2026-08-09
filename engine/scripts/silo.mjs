/**
 * The silo model, built from config-oakville.yaml.
 *
 * The linter used to pass any internal link because it had no idea what a silo
 * was. Core 30's central rule — never link across silos, only down and up — is
 * the one rule it could not check. This module gives it the map.
 *
 * Levels:
 *   1  the entity root                  /oakville/
 *   2  a category pillar                /oakville/painter/
 *   3  a service under that pillar      /oakville/painter/spray-painting/
 *
 * The primary category is merged into the root (docs/CORE30-METHODOLOGY.md §
 * "The page architecture" — the GBP landing page is almost always the
 * homepage), so /oakville/ is
 * simultaneously level 1 and the Kitchen remodeler pillar, and its services hang
 * one level down rather than two.
 */
import fs from 'node:fs';
import yaml from 'js-yaml';
import { configPath } from '../src/lib/paths.js';

// Same file the pages read, resolved by the same module. This used to name
// `../config-oakville.yaml` itself, which meant the linter and the build agreed
// about which config was authoritative only by coincidence.
export const config = yaml.load(fs.readFileSync(configPath, 'utf8'));

/**
 * Build the page model from a config.
 *
 * A factory rather than top-level code so the rule tests can build a SYNTHETIC
 * site and assert against it. They used to assert on real Oakville URLs, which
 * made a suite whose entire purpose is proving the silo rules into a suite that
 * would fail on the first day of the second business — every case naming a page
 * that does not exist there.
 */
export function buildPages(cfg) {
  const root = cfg.entity.root;                       // "/oakville/"
  const join = (...p) => (root + p.filter(Boolean).join('/')).replace(/\/+/g, '/').replace(/\/?$/, '/');

  /** url -> { level, silo, kind, parent } for every page the config declares. */
  const pages = new Map();

  for (const s of cfg.silos) {
    const pillarUrl = s.is_homepage ? join() : join(s.slug);
    pages.set(pillarUrl, {
      level: s.is_homepage ? 1 : 2,
      silo: s.category,
      kind: s.is_homepage ? 'home' : 'pillar',
      parent: s.is_homepage ? null : join(),
    });
    for (const svc of s.services || []) {
      pages.set(s.is_homepage ? join(svc.slug) : join(s.slug, svc.slug), {
        level: 3, silo: s.category, kind: 'service', parent: pillarUrl,
      });
    }
  }

  // Utility pages — contact, about. Declared by entity.nav, because a page in the
  // masthead is a page the site claims to have. They sit outside every silo: they
  // carry no in-silo link and receive none from body prose. What DOES point at them
  // is conversion chrome — the masthead button, the sticky bar, the hero CTA — and
  // that is a navigational link, not a topical one, so it passes no silo equity and
  // is exempt from the anchor registry (docs/CORE30-FAQ.md § "Navbar links do
  // not count; editorial links do" — same footing as nav and tel:).
  for (const n of cfg.entity.nav || []) {
    pages.set(join(n.slug), { level: 1, silo: '__utility', kind: 'utility', parent: join() });
  }

  // Neighbourhood pages. Level 2 off the root, in their own pseudo-silo, exactly
  // as the service-area cities are — the difference is which axis they sit on, not
  // how they link. A location page may reach its parent and nothing else, which is
  // also how the reference build's geo pages behave.
  for (const n of cfg.neighbourhoods || []) {
    pages.set(join(n.slug), {
      level: 2, silo: '__locations', kind: 'location', parent: join(),
      // The one service page this neighbourhood is allowed to reach. Declared, so
      // it is a named edge in the model rather than a hole in the rules: a
      // neighbourhood page may link to ITS service, not to any service.
      focus: n.for ? join(...String(n.for).split('/')) : null,
    });
  }

  // Supporting articles. A child of the service page it answers for, so both
  // directions are already legal and nothing here needs an exemption: the service
  // links down into the article from its question block, the article links back up.
  for (const a of cfg.supporting || []) {
    const parent = join(...String(a.for).split('/'));
    const owner = pages.get(parent);
    // Flat URL, explicit parent. The slug matches the page already live on the
    // domain so nothing 404s at cutover, while the PARENT is the service page it
    // answers for — parentage is declared here rather than read off the path.
    pages.set(join(a.slug), {
      level: (owner?.level ?? 3) + 1,
      silo: owner?.silo ?? '__supporting',
      kind: 'supporting',
      parent,
    });
  }

  // The services hub — a one-way discovery index over every silo.
  //
  // It is the one page besides the root permitted to link down into all of them,
  // and the exemption is deliberately asymmetric: the hub may point at anything,
  // and NOTHING in body prose may point back at it. That is how Caleb's own
  // reference build works — his sub-service pages up-link to their category and
  // reach /services from the nav, never from the copy.
  //
  // The asymmetry is the whole safeguard. A hub that body prose could link INTO
  // would become a path between silos, which is the one thing the silo model
  // exists to prevent: a service in one category would reach a service in another
  // in two hops through a page that belongs to no category at all.
  const hubUrl = join('services');
  pages.set(hubUrl, { level: 1, silo: '__hub', kind: 'hub', parent: join() });

  // The locations hub, on the same footing. Neighbourhood pages are level 2, which
  // the hub rule already permits, so this needs no new exemption — and body prose
  // still cannot link to it, which is why the footer carries it.
  const locationsHubUrl = join('locations');
  pages.set(locationsHubUrl, { level: 1, silo: '__hub', kind: 'hub', parent: join() });

  // Location pages are a second axis off the root, not part of any category silo.
  // Sat below isUtility in the original file, purely by where it was appended —
  // it belongs with the rest of the model.
  for (const l of cfg.locations || []) {
    pages.set(join(l.slug), { level: 2, silo: '__locations', kind: 'location', parent: join() });
  }

  return { pages, hubUrl, locationsHubUrl };
}

export const { pages, hubUrl, locationsHubUrl } = buildPages(config);

/** Is this URL a utility page? Links TO one are exempt from the silo rules. */
export const isUtility = (url) => pages.get(url)?.kind === 'utility';


/**
 * Is this link legal under Core 30?
 * Returns null when fine, or a string explaining the violation.
 *
 * Down and up only. A pillar may reach its own services; a service may reach its
 * own pillar. The root is the parent of every silo, so it — and only it — may
 * link down into each of them. Anything sideways is what the silo exists to stop.
 */
export function checkLink(fromUrl, toUrl, map = pages) {
  const from = map.get(fromUrl);
  const to = map.get(toUrl);
  if (!from) return null;                       // page not modelled — nothing to say
  if (!to) return `target ${toUrl} is not in any silo`;

  // The hub indexes everything, so every downward link out of it is legal. It
  // has no silo of its own to cross.
  if (from.kind === 'hub') {
    if (to.level === 2 || to.level === 3) return null;
    // …and up to its own parent, which is the root. This branch sits above the
    // generic parent/child checks, so without naming it here the hub was the one
    // page on the site forbidden to link to its own parent.
    //
    // That is not a theoretical tidy-up. The primary silo's pillar IS the root,
    // so the rule silently removed the "explained, start to finish" link from the
    // Kitchen Remodeling group while the other three groups kept theirs — and I
    // wrote a comment justifying the gap rather than noticing the rule was wrong.
    // Nick spotted it on the page.
    if (toUrl === from.parent) return null;
    return `services hub links to ${to.kind} ${toUrl}, which is not a pillar, a service or its own parent`;
  }

  // And nothing reaches it through the copy. Body prose linking into the hub is
  // what would turn a one-way index into a corridor between silos — see the note
  // where the hub is registered above.
  if (to.kind === 'hub') {
    return `links to the services hub (${toUrl}) from body prose — the hub is reached from nav and footer only`;
  }

  // A neighbourhood page reaches two things: the root, and the one service it
  // argues for. Both are how the reference build does it — its geo pages carry a
  // link to the homepage and a second to the service page the geography is about.
  // Anything else it might point at is still refused below.
  if (from.kind === 'location' && from.focus && toUrl === from.focus) return null;

  // Supporting articles under the SAME parent may link to each other. This is
  // the link circle — "one links to two, two links to three, three links to one"
  // — and it is the only lateral link anywhere in the model.
  //
  // Two things keep it from becoming a hole. It is restricted to a shared parent,
  // so a refacing article can reach another refacing article and never a painting
  // one; and lint verifies the links form a single closed cycle covering every
  // sibling, so "lateral is allowed here" cannot quietly become a mesh.
  //
  // Worth recording that this technique comes from the NON-LOCAL module. The
  // local one — the People Also Ask method these articles follow — describes only
  // the up-link. Nick's call, made knowing that.
  if (from.kind === 'supporting' && to.kind === 'supporting'
      && from.parent === to.parent && fromUrl !== toUrl) return null;

  if (from.kind === 'home') {
    // Level 1 is the parent of everything: down to any pillar, down to its own
    // services (the primary silo is merged into the root), down to locations.
    if (to.level === 2 || to.parent === fromUrl) return null;
    return `root links to ${to.kind} ${toUrl}, which is not one level down`;
  }

  // Parent and child first. The root is the primary pillar as well as level 1, so
  // a pillar linking up to it is a legal up-link — checking silo identity before
  // this would reject it as a cross-silo link, which is what it looks like but is
  // not what it is.
  if (from.parent === toUrl) return null;                     // up to own parent
  if (to.parent === fromUrl) return null;                     // down to own child

  if (to.kind === 'home') {
    return `links to the root, skipping its own parent ${from.parent}`;
  }
  if (to.silo !== from.silo) {
    return `crosses silo: ${from.silo} → ${to.silo} (${toUrl})`;
  }
  if (from.level === to.level) return `lateral link within ${from.silo} (${toUrl})`;
  return `not a parent/child link within ${from.silo} (${toUrl})`;
}

/** Every in-silo child a page is expected to be able to reach. */
export function childrenOf(url, map = pages) {
  // Utility pages hang off the root structurally but are NOT silo children: they
  // are reached from chrome, never from body prose. Counting them here told the
  // homepage it had failed to link to its own contact page — a link Core 30 would
  // then have flagged as crossing out of the silo. The rule cannot demand a link
  // that another rule forbids.
  // The services hub is the same: it hangs off the root and is reached from the
  // nav, and checkLink forbids body prose from linking to it. Counting it here
  // would tell the homepage to make a link the silo rules reject.
  return [...map]
    .filter(([, p]) => p.parent === url && p.kind !== 'utility' && p.kind !== 'hub')
    .map(([u]) => u);
}
