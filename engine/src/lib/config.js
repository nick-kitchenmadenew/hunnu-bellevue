import fs from 'node:fs';
import yaml from 'js-yaml';
import { configPath, reviewsPath } from './paths.js';

// Read the CANONICAL config, not a copy. An earlier version copied it into
// src/data/ and the two silently diverged — a widget id set in one never reached
// the build. One file, one truth.
//
// WHICH file is not decided here — `paths.js` owns that, because silo.mjs needs
// the same answer and two modules resolving the same filename independently is
// how the engine ended up with the word "oakville" compiled into it twice.
//
// ⚠ THIS DOES NOT HOT-RELOAD. The file sits at the payload root and Vite watches
// `site/`, so editing the config invalidates nothing — this module keeps
// whatever it read when the dev server started. It appears to work whenever the
// same commit also touches a file inside site/, because that invalidates the module
// and the config is re-read as a side effect, which is what makes the failure so
// confusing: it propagates one time and silently does not the next.
//
// `touch site/src/lib/config.js` to force it, or restart the dev server. Builds,
// `npm run check` and `preview` all read fresh and are never affected — so a
// passing build alongside a screen showing the old value is the expected symptom
// rather than a contradiction. Written up in CONFIG-SCHEMA.md.
export const config = yaml.load(fs.readFileSync(configPath, 'utf8'));

/**
 * The review corpus, separate from config because it is captured data rather than
 * settings — and because pages select from it. Nothing here reaches the schema:
 * self-serving review markup is ineligible for rich results and can draw a manual
 * action (PLANNING §7).
 */
export const reviewCorpus = fs.existsSync(reviewsPath)
  ? (yaml.load(fs.readFileSync(reviewsPath, 'utf8')).reviews ?? []) : [];

/**
 * Reviews for a page: the ones this silo's work is described in, plus the
 * service-agnostic ones. A review about a DIFFERENT service is not wrong, but one
 * describing the opposite service undercuts the page — a reface review praising
 * new doors, on a page whose whole argument is that your doors stay.
 */
export function reviewsFor(siloCategory, { limit = 3 } = {}) {
  const usable = reviewCorpus.filter((r) => r.role !== 'warranty-proof');
  const onTopic = usable.filter((r) => r.silo === siloCategory);
  const neutral = usable.filter((r) => !r.silo);
  return [...onTopic, ...neutral]
    .slice(0, limit)
    .map((r) => ({ ...r, text: r.excerpt ?? r.text }));
}

export const entity = config.entity;
export const silos = config.silos;

/** The pillar that lives at the root. */
export const homeSilo = silos.find((s) => s.is_homepage);
/** Pillars that get their own page. */
export const pageSilos = silos.filter((s) => !s.is_homepage);

/** Page URLs derive from the entity root — never hand-written. Always trailing-slashed. */
export function url(...parts) {
  const p = parts.filter(Boolean).join('/').replace(/\/+/g, '/');
  return (entity.root + p).replace(/\/+/g, '/').replace(/\/?$/, '/');
}

/** Asset paths. Same root, but a file must NOT get a trailing slash. */
export function asset(file) {
  return (entity.root + file).replace(/\/+/g, '/');
}

export function serviceUrl(silo, service) {
  return silo.is_homepage ? url(service.slug) : url(silo.slug, service.slug);
}

export function siloUrl(silo) {
  return silo.is_homepage ? url() : url(silo.slug);
}

/** How a pillar is named in the footer. Chrome speaks to customers, so it prefers
    the rethemed term ("Cabinet painting") over the GBP category ("Painter") — the
    category still owns the URL, H1 and schema, which is where alignment matters. */
export function siloNavLabel(silo) {
  return silo.nav_label || silo.retheme || titleCase(silo.category);
}

/** Brands whose own casing has an interior capital. `text-transform: capitalize`
    can raise a first letter but cannot know about the second, so it renders the
    hostname "tiktok" as "Tiktok" — a misspelling of someone else's name. */
const SOCIAL_NAMES = { tiktok: 'TikTok', youtube: 'YouTube', linkedin: 'LinkedIn' };

/** Network name for a sameAs URL. Still hostname-derived, so adding a profile to
    config needs no code change; the map only covers what casing cannot reach. */
export function socialLabel(href) {
  const host = new URL(href).hostname.replace(/^www\./, '').split('.')[0];
  return SOCIAL_NAMES[host] || host;
}

/** The footer's "What we do" list, read verbatim from `footer_nav` in config.
    Everything else stays out of chrome (PLANNING §3).

    This used to be derived: any service flagged `in_footer`, then every pillar.
    That gave each pillar a slot automatically, which made the list a structural
    by-product rather than a choice, and it had no way to express an order. Nick
    cut it to the three services that earn the money and set the sequence himself
    (2026-07-26), so the list is now written down instead of computed. */
export function footerNav() {
  return (config.footer_nav ?? []).map((e) => ({ label: e.label, href: url(e.slug) }));
}

/** Title tag uses the retheme when present; the H1 always uses the GBP category. */
export function pillarTitle(silo, city) {
  return `${silo.retheme || silo.category} ${city}`;
}
export function pillarH1(silo, city) {
  return `${titleCase(silo.category)} in ${city}`;
}

/** GBP categories arrive sentence-cased ("Kitchen remodeler"). The words must stay
    verbatim for category alignment, but lowercase mid-heading reads as a typo, so
    casing is a display concern only. */
export function titleCase(s) {
  const small = new Set(['and', 'or', 'the', 'of', 'in', 'a', 'an', 'for']);
  return s.split(' ').map((w, i) =>
    i > 0 && small.has(w.toLowerCase()) ? w.toLowerCase()
      : w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * The city this entity's pages are about — every H1, title and heading is built
 * from it.
 *
 * A storefront's is its address locality and needs no thought. A SERVICE-AREA
 * business has no address, so it has to say which city it is competing in, and
 * that is an editorial decision rather than a derivable one: the GTA profile
 * covers eleven of them and has to choose the one its homepage targets.
 * CONFIG-SCHEMA.md lists "primary city" under human-only for this reason.
 */
export const city = entity.city ?? entity.address?.locality;
if (!city) {
  throw new Error(`entity "${entity.id}" has no city. A storefront takes it from `
    + `address.locality; a service-area business must set entity.city explicitly, `
    + `because it has no address and the choice of which city to target is editorial.`);
}
export const phoneDisplay = entity.phone.replace(/^\+1\s*/, '').trim();
export const phoneHref = 'tel:' + entity.phone.replace(/[^\d+]/g, '');

/** Not a GBP field — a profile has no public "business email" the way it has a
    phone and address, so there is nothing here for a re-audit to diff against.
    Set directly in config, per entity, same footer role as phone. */
export const email = entity.email;
export const emailHref = entity.email ? `mailto:${entity.email}` : null;

/** Absolute URL for anything on this entity. */
export const abs = (p = '') =>
  `https://${config.site.domain}${(entity.root + p).replace(/\/+/g, '/')}`;

/**
 * Everywhere this entity works: the home city first, then the location pages.
 *
 * config.locations is the OTHER cities — Oakville is the storefront, not a
 * location page — so building areaServed from it alone silently omitted the home
 * city. LocalBusiness said Burlington/Mississauga/Milton/Hamilton while the
 * Service node said all five, which is two nodes disagreeing on the same page.
 */
export const areaServed = () => [
  // A storefront's home city is not in `locations` — it is the entity itself —
  // so it is added here. A service-area business has no home city and every one
  // it serves is already declared below, so adding one would duplicate it.
  ...(entity.address?.locality ? [{ '@type': 'City', name: entity.address.locality }] : []),
  ...(config.locations ?? []).map((l) => ({ '@type': 'City', name: l.city })),
];

/** YAML parses an unquoted date into a Date. Format back to a calendar date
    WITHOUT going through UTC, or 2026-05-18 in Toronto becomes 2026-05-17. */
export const isoDate = (d) => d instanceof Date
  ? `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
  : String(d);

/** A schema.org datetime — VideoObject.uploadDate among them — has to be a full
    ISO 8601 datetime WITH a timezone; a bare calendar date fails Google's own
    validator on two counts at once ("missing a timezone" and "invalid datetime
    value"), which is what content authors kept writing because `uploaded:
    '2026-07-28'` is the natural way to fill in a frontmatter field and nothing
    caught the mismatch before Search Console did.

    Content stays exactly that natural to write; the gap closes here instead.
    No real upload time is recorded anywhere, so noon is a placeholder — Google
    validates that the value is a well-formed datetime, not that it matches when
    a file was actually written.

    The offset is computed per date rather than hardcoded, because Toronto
    changes between -04:00 and -05:00 with DST and every entity is in it — a
    fixed offset would be quietly wrong for roughly half the calendar. */
export const isoDateTime = (dateStr, tz = 'America/Toronto') => {
  const d = new Date(`${dateStr}T12:00:00Z`);
  const off = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' })
    .formatToParts(d).find((p) => p.type === 'timeZoneName').value.replace('GMT', '');
  return `${dateStr}T12:00:00${off}`;
};

/** Opening hours, read from config rather than restated. */
/**
 * The week, as the engine understands it.
 *
 * Config accepts two forms and this is the single place that knows both, so
 * everything downstream — the schema graph, the footer, the drift check — reads
 * one shape and cannot disagree about what the hours are:
 *
 *   hours: { mon_sun: "09:00-21:00" }              every day the same
 *   hours: { days: { mon: "08:00-18:00", …,        a day that differs
 *                    sun: closed } }
 *
 * `mon_sun` stays because most trades are one range, and a shorthand that covers
 * the common case is worth keeping. Exactly one of the two is allowed; declaring
 * both is a contradiction rather than a merge, so it throws.
 *
 * A day may be `closed`, `null`, or simply absent — all three mean shut, and
 * schema.org expresses a closure by omission rather than by a zero-length range.
 *
 * @returns {Array<[string, string|null]>} seven entries, Monday first
 */
const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_FULL = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
                   fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
const DAY_SHORT = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu',
                    fri: 'Fri', sat: 'Sat', sun: 'Sun' };

export function hoursByDay(hours = entity.hours) {
  const h = hours ?? {};
  if (h.mon_sun && h.days) {
    throw new Error('entity.hours declares both `mon_sun` and `days` — one or the other. '
      + '`mon_sun` is the shorthand for a week where every day is the same.');
  }
  const clean = (v) => {
    if (v == null) return null;
    const s = String(v).trim();
    if (!s || /^closed$/i.test(s)) return null;
    const [open, close] = s.split(/\s*-\s*/);
    return open && close ? `${open}-${close}` : null;
  };
  if (h.mon_sun) {
    const r = clean(h.mon_sun);
    return DAY_ORDER.map((d) => [d, r]);
  }
  if (h.days) {
    const unknown = Object.keys(h.days).filter((k) => !DAY_ORDER.includes(k));
    if (unknown.length) {
      throw new Error(`entity.hours.days has unknown day(s): ${unknown.join(', ')} — `
        + `use ${DAY_ORDER.join(', ')}`);
    }
    return DAY_ORDER.map((d) => [d, clean(h.days[d])]);
  }
  return DAY_ORDER.map((d) => [d, null]);
}

/** Runs of consecutive days sharing one range. Monday first, closures dropped. */
function hourRuns(hours) {
  const runs = [];
  for (const [day, range] of hoursByDay(hours)) {
    if (!range) continue;
    const last = runs[runs.length - 1];
    // Only extend a run when the previous day is genuinely the day before — a
    // Monday and a Wednesday on the same hours are two runs, not "Mon–Wed".
    const adjacent = last && DAY_ORDER.indexOf(day) === DAY_ORDER.indexOf(last.to) + 1;
    if (last && last.range === range && adjacent) last.to = day;
    else runs.push({ from: day, to: day, range });
  }
  return runs;
}

function openingHours() {
  const spec = hourRuns(entity.hours).map((r) => {
    const [opens, closes] = r.range.split('-');
    const from = DAY_ORDER.indexOf(r.from), to = DAY_ORDER.indexOf(r.to);
    return {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: DAY_ORDER.slice(from, to + 1).map((d) => DAY_FULL[d]),
      opens, closes,
    };
  });
  // Declared closures. Without these the schema claims the business is open on
  // days config already records it as shut.
  for (const d of entity.hours?.special ?? []) {
    if (d.status !== 'closed') continue;
    spec.push({
      '@type': 'OpeningHoursSpecification',
      validFrom: isoDate(d.date), validThrough: isoDate(d.date),
      opens: '00:00', closes: '00:00',
    });
  }
  return spec;
}

/**
 * Opening hours as a person reads them, from the same config the schema uses.
 * The footer used to hardcode "Seven days · 9:00 am – 9:00 pm" — it agreed with
 * the schema only by coincidence, and would have stopped agreeing the first time
 * the hours changed. A page saying one thing and telling Google another is the
 * defect this whole config-as-truth arrangement exists to prevent.
 *
 * Returns a LIST, because a week is not always one line. A business open
 * different hours on Sunday gets two entries; one open the same all week gets
 * one, labelled "Seven days" as before.
 *
 * @returns {Array<{days: string, range: string}>}
 */
export function hoursDisplay(hours = entity.hours) {
  const h12 = (t) => {
    const [H, M] = t.split(':').map(Number);
    const suffix = H >= 12 ? 'pm' : 'am';
    return `${((H + 11) % 12) + 1}:${String(M).padStart(2, '0')}\u00a0${suffix}`;
  };
  // Open round the clock. "00:00-23:59" is the schema.org convention and it is
  // what the config stores, but rendering it as a clock gives
  // "12:00 am – 11:59 pm", which is a strange way to write "always".
  const ALL_DAY = (a, b) => a === '00:00' && (b === '23:59' || b === '24:00');
  const runs = hourRuns(hours);
  if (!runs.length) return [];
  const open = runs.reduce((n, r) => n + DAY_ORDER.indexOf(r.to) - DAY_ORDER.indexOf(r.from) + 1, 0);
  return runs.map((r) => {
    const [a, b] = r.range.split('-');
    const label = runs.length === 1 && open === 7 ? 'Seven days'
      : r.from === r.to ? DAY_FULL[r.from]
      : `${DAY_SHORT[r.from]}\u2013${DAY_SHORT[r.to]}`;
    return { days: label, range: ALL_DAY(a, b) ? 'Open 24 hours' : `${h12(a)} \u2013 ${h12(b)}` };
  });
}

/** LocalBusiness graph — generated, never hand-written. No review markup: see PLANNING §7. */
export function localBusiness(pageUrl) {
  const a = entity.address;
  return {
    // HomeAndConstructionBusiness is a real LocalBusiness subtype and fits better
    // than the generic one; both are kept so consumers that only know the parent
    // still resolve it.
    '@type': ['LocalBusiness', 'HomeAndConstructionBusiness'],
    '@id': abs('#business'),
    name: entity.name,
    url: abs(),
    telephone: entity.phone,
    image: abs('logo-square-512.png'),
    logo: abs('logo-square-512.png'),
    // A SERVICE-AREA business publishes neither (PLANNING §9c). Emitting an
    // empty PostalAddress, or the hidden centre Google uses for distance, would
    // publish precisely what the profile withholds — and the live site's
    // `addressLocality: "Greater Toronto Area"`, a region in a field that wants a
    // city, is the malformed version of trying anyway. `areaServed` carries it.
    ...(a?.street ? {
      address: {
        '@type': 'PostalAddress',
        streetAddress: a.street,
        addressLocality: a.locality,
        addressRegion: a.region,
        postalCode: a.postal_code,
        addressCountry: a.country,
      },
    } : {}),
    ...(entity.geo ? {
      geo: { '@type': 'GeoCoordinates', latitude: entity.geo.lat, longitude: entity.geo.lng },
    } : {}),
    areaServed: areaServed(),
    sameAs: entity.sameAs,
    openingHoursSpecification: openingHours(),
    // Category alignment, machine-readable. Without this the page corroborated the
    // GBP categories with nothing at all — "Cabinet maker" appeared zero times in
    // the whole document, "Painter" only inside a URL. Both names and both lists
    // come straight from config, which the drift check holds to the GBP profile.
    knowsAbout: [entity.primary_category, ...entity.additional_categories],
    // From the GBP attributes rather than invented. "Not cash-only" on the profile
    // is what puts Cash in the list; the negatives it also records cannot be
    // expressed in schema and are therefore omitted rather than guessed at.
    ...(entity.payments ? { paymentAccepted: entity.payments.join(', ') } : {}),
    currenciesAccepted: 'CAD',
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: `${entity.name} — ${city}`,
      itemListElement: silos.map((s) => ({
        '@type': 'OfferCatalog',
        name: s.category,                     // the GBP category, verbatim
        itemListElement: (s.services || []).map((svc) => ({
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: svc.name,                   // the GBP service, verbatim
            url: `https://${config.site.domain}${serviceUrl(s, svc)}`,
            serviceType: s.category,
            provider: { '@id': abs('#business') },
            areaServed: { '@type': 'City', name: city },
          },
        })),
      })),
    },
  };
}

/**
 * The business as a REFERENCE rather than a definition — type, @id, name, url
 * and nothing else.
 *
 * Every page used to carry the full sixteen-property LocalBusiness block:
 * address, geo, areaServed, opening hours, sameAs, knowsAbout and the entire
 * hasOfferCatalog, repeated twenty-three times across the site. Caleb's rule is
 * that the full entity belongs on the GBP landing page alone and every other
 * page points at its @id.
 *
 * It cannot simply be dropped from the inner pages. `WebPage.about` and
 * `Service.provider` both reference `#business`, and lint.mjs:644 rejects a
 * reference to an @id that no node on that page defines — correctly, because a
 * dangling reference is a broken graph whatever Google happens to resolve
 * across pages. So the inner pages define the id and say nothing more about it,
 * which is what a reference node is for.
 */
export function localBusinessRef() {
  return {
    '@type': ['LocalBusiness', 'HomeAndConstructionBusiness'],
    '@id': abs('#business'),
    name: entity.name,
    url: abs(),
  };
}

/** The Service node CORE30-STRUCTURE §6 requires, for the page's own subject. */
export function serviceNode(name, pageUrl, description, areas) {
  return {
    '@type': 'Service',
    '@id': `https://${config.site.domain}${pageUrl}#service`,
    name,
    ...(description ? { description } : {}),
    serviceType: name,
    provider: { '@id': abs('#business') },
    // `areas` narrows this to one place. A neighbourhood page said it was a
    // "Kitchen Remodeler" serving five cities — the category rather than the
    // service, and everywhere rather than the one place the page is about. The
    // machine-readable layer was the least specific thing on the page.
    areaServed: areas ?? areaServed(),
  };
}

/** One neighbourhood, as a Place inside the home city. */
export function neighbourhood(name) {
  return {
    '@type': 'Place',
    name,
    containedInPlace: { '@type': 'City', name: city },
  };
}

/** The WebSite the pages belong to. WebPage.isPartOf wants this, not the business. */
export function webSite() {
  return {
    '@type': 'WebSite',
    '@id': abs('#website'),
    url: abs(),
    name: entity.name,
    publisher: { '@id': abs('#business') },
    inLanguage: 'en-CA',
  };
}
