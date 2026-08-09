/**
 * Page composition: what sections a page has, in what order, on what ground.
 *
 * The homepage was hand-assembled — eleven <Band> tags with the tone typed in by
 * hand. That is how two pairs of adjacent bands ended up on the same ground with
 * no boundary between them. Here the tone is COMPUTED from position, so the
 * collision cannot be expressed, let alone shipped.
 *
 * Dark is not part of the alternation. It is reserved for the two moments that
 * earn it — the gallery, where photographs need a dark ground to sit forward, and
 * the closing CTA, where a full stop is the point. A third dark band would stop
 * either of them being an event.
 */

/** Sections that always sit on the dark ground, whatever their position. */
export const ALWAYS_DARK = new Set(['gallery', 'cta']);

/** Sections the template supplies rather than the content file. */
export const GENERATED = new Set([
  'gallery', 'video', 'consultation', 'reviews', 'services', 'categories',
  'locations', 'form', 'faq', 'cta',
]);

/**
 * Assign a ground to every section.
 *
 * Plain and surface alternate. A dark band resets the alternation rather than
 * participating in it, so the section after the gallery is free to be either —
 * the dark band is itself the boundary.
 *
 * @param {Array<{name: string}>} sections  in page order
 * @returns {Array<{name: string, tone: 'plain'|'surface'|'dark'}>}
 */
export function withTones(sections) {
  let previous = null;
  return sections.map((s) => {
    if (ALWAYS_DARK.has(s.name)) {
      previous = null;                     // dark resets: it is its own boundary
      return { ...s, tone: 'dark' };
    }
    const tone = previous === 'plain' ? 'surface' : 'plain';
    previous = tone;
    return { ...s, tone };
  });
}

/**
 * The canonical order for a page type. A content file may omit sections, but it
 * may not reorder them — the order is the spec (CORE30-STRUCTURE §2), not a
 * per-page choice.
 */
export const ORDER = {
  // What it is, then how it is done, then how it differs from the alternative,
  // then the proof. Process sat after the service list, which put "here is how
  // the work runs" behind five sections about individual services — the reader
  // has already decided by then.
  // `uplink` added to pillars 2026-07-26. It was service-only, on the reasoning
  // that a service has nothing else it may legally link to. True, but it left
  // pillars linking only downward — the linter's new up-link check found all three
  // of them with no topical route to the homepage, reachable from chrome alone.
  //
  // It sits LATE here and second on a service, and the difference is deliberate.
  // A service page up-links early because its first job is triage: this may not be
  // the job you need. A pillar's reader has already chosen a category, so the
  // up-link's job is the opposite — having shown what this silo does, point out
  // that it is one of several and send them to the comparison. That belongs after
  // the services, not in front of them.
  //
  // `video` sits immediately after `gallery` on both page types, because it is the
  // same argument continued — the stills prove the change, the walkthrough proves
  // the room is real and that the finish holds up while the camera moves through
  // it, which a photograph cannot. It also inherits the gallery's tone reset: dark
  // band, then the video on plain, so the walkthrough is not a second dark event
  // competing with the photographs.
  // `service_cards` sits directly after `services`: the editorial blocks make
  // the argument for each service with the link inside its context, and the grid
  // repeats them as something scannable. Order matters — the editorial link is
  // first in the document and therefore the one that carries weight.
  // `location_index` on a pillar was tried 2026-08-04 and reverted the same day.
  // lint.mjs's silo-coverage check WARNS when a pillar does not link directly to
  // each of its own children, on the theory that a page reached only through the
  // hub (kind: '__hub', outside every silo) gets no topical-relevance signal from
  // its own pillar. That is a real argument and also only a warning — the same
  // section of CORE30-STRUCTURE.md that states it files it under "Warn", not
  // "Fail" — and Nick ruled the hub is the right place for the full list: the
  // pillar names its neighbourhoods in prose, the hub (reached from the footer,
  // same as it already was) is where each one gets a card and a link. Same
  // standing as Milton and Hamilton — hub-linked, not pillar-linked, on purpose.
  // Ruled 2026-08-04, kmn-oakville DISCREPANCIES #40.
  pillar: ['prose', 'process', 'compare', 'gallery', 'video', 'consultation', 'reviews',
           'services', 'service_cards', 'categories', 'pricing', 'locations',
           'uplink', 'why', 'gbp', 'form', 'faq', 'cta'],
  // On a service, `uplink` is the page's single in-silo link and it points UP to
  // the parent pillar. A service may not link to a sibling or to another silo, so
  // there is nothing else it is allowed to point at — which is why the section is
  // named for the direction rather than for what it contains.
  // `compare` added 2026-07-26. It was pillar-only, which was circumstance rather
  // than a rule — the refacing page argues refacing against full replacement, and
  // that is a table whatever kind of page carries it.
  //
  // It sits after `prose` and before `uplink` because those are the only positions
  // available: compose() groups by name, so a page's prose blocks all render
  // consecutively and nothing can be interleaved between them. Closing the
  // explanatory run with the comparison leads into the uplink, which says this may
  // not be the job you need — the same argument, continued.
  service: ['prose', 'compare', 'uplink', 'process', 'gallery', 'video', 'consultation',
            'reviews', 'pricing', 'locations', 'form', 'faq', 'cta'],
  // `uplink` is the only link a location page may carry — checkLink rejects a
  // link from one to a pillar, a service, the hub or a sibling. Its parent is
  // the root, so the up-link is how the reader gets back into the silo.
  // A supporting article: the answer at length, then back up to the service page
  // it belongs to. `uplink` is its only link, and it is compulsory — an article
  // that does not point at the page it supports is doing no structural work.
  // `compare` added 2026-08-04, same reasoning as service's: several supporting
  // articles ARE a comparison — can-you-reface-cabinets-yourself is DIY against
  // professional, spray-or-brush is method against method — argued across five
  // H2 sections that a three-row table says in one glance. Sits after `prose`
  // for the same structural reason service's does: it reads as the recap once
  // the explanation is already made, not a substitute for it.
  supporting: ['prose', 'compare', 'uplink', 'sibling', 'faq', 'cta'],
  location: ['prose', 'gallery', 'uplink', 'service_link', 'reviews', 'services', 'form', 'faq', 'cta'],
  // The services hub. `service_index` is the page's reason to exist — the
  // grouped index of every service in every silo — and it is generated from the
  // config rather than written, so it cannot fall out of step with the silos it
  // indexes. Prose sits above and below it because a bare list of links is a
  // sitemap, not a page.
  // The index leads. compose() groups by name and cannot interleave, so the
  // choice is all prose before the list or all prose after it — and on a page
  // whose job is "pick the one you want", seven hundred words in front of the
  // list is a scroll between the visitor and the only thing they came for. The
  // reference build puts its index directly under the H1 for the same reason.
  hub: ['service_index', 'location_index', 'prose', 'faq', 'cta'],
  // Utility pages — contact, about. Not part of any silo: they carry no in-silo
  // link, and nothing links to them from body prose, only from chrome. The list
  // is a union, not a shape; contact takes form/prose/faq, about takes
  // prose/team/reviews.
  //
  // `form` leads. It sat after `prose` on the reasoning that a reader wants the
  // explanation before the thing to fill in, which is true on a page that is
  // about something and false on a page whose H1 is "Get a quote for your
  // kitchen". There the form IS the page, and four paragraphs of how-it-works
  // above it is a scroll between the visitor and the one action the page exists
  // for — on a phone, most of a screen of it. The prose still follows, for
  // whoever wants it.
  //
  // `credentials` sits between the team and the reviews, which is the order a
  // wary reader asks in: who are you, what backs you, who says so. It cannot go
  // higher — compose() groups by name, so anything above `team` lands in front
  // of the whole prose run, and a licence-and-insurance grid is a strange way to
  // open a page whose first job is to say why the business exists.
  utility: ['form', 'prose', 'team', 'credentials', 'gallery', 'reviews', 'locations', 'faq', 'cta'],
};

/**
 * Sort a page's declared sections into canonical order and drop unknown names.
 * Returns { sections, unknown } so the caller can fail loudly on a typo rather
 * than silently rendering a page with a section missing.
 */
export function compose(type, declared) {
  const order = ORDER[type];
  if (!order) throw new Error(`unknown page type "${type}"`);
  const unknown = declared.filter((d) => !order.includes(d.name));
  const sections = order
    .flatMap((name) => declared.filter((d) => d.name === name));
  return { sections: withTones(sections), unknown };
}
