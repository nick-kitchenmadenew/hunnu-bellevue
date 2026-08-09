# Changelog

One section per tag, newest first, summarized rather than copied verbatim from
the tag's commit message — the commit itself is the full account, including
measurements and negative tests; this is what changed and why, in a few lines.

Starts at v1.19.0, this run's first release, rather than the full tag history
back to v1.0.0. A full backfill is real, lower-value work on its own — the
file's going-forward purpose (one place to read instead of walking `git log`
tag by tag) doesn't depend on how far back it starts, and starting honestly
from "today" beats a silently partial "from the beginning."

**Convention going forward:** update this file in the same commit that gets
tagged. See `README.md`'s "Versioning" section.

---

## v1.32.0 — 2026-08-09

Fixes a real crash on every new site's first build: `paths.js` eagerly
defaults `CORE30_ENTITY` to `"oakville"` and throws if that entity's config
doesn't exist — a check that's valuable for a script that wants *one*
entity's config, but was also firing for scripts that only wanted
`payloadRoot` to discover entities generically (`build-all.mjs`,
`sitemap.mjs`, `review-link-check.mjs`, `cross-entity.mjs`), crashing them
on import before their own discovery logic ever ran. Found live on
`hunnu-bellevue`'s first Vercel build — worked around there with a
`CORE30_ENTITY=bellevue` project env var, which is no longer necessary
after this fix (harmless to leave in place).

Fixed at the root: `payloadRoot` now lives in its own `payload-root.js`,
re-exported from `paths.js` unchanged for every consumer that legitimately
wants the entity-specific eager-fail behavior. The four entity-discovery
scripts import it directly instead, bypassing the check entirely. Verified
against both real production build commands, not just in isolation:
`kmn-oakville`'s actual 3-entity `vercel.json` buildCommand (still stages
all three, 104-URL sitemap, unaffected) and `hunnu-bellevue`'s single-entity
build (now completes with zero `CORE30_ENTITY` set anywhere).

## v1.31.0 — 2026-08-08

The first docs-only tag — no code diff, and per the new "two tracks" note in
README.md's Versioning section, that's now a normal kind of release, not an
exception. Adds the Core 30 methodology knowledge base:
`docs/CORE30-METHODOLOGY.md` (the 11 lessons, synthesized by topic),
`docs/CORE30-FAQ.md` (the 11 weekly calls, deduplicated by question — the
same questions recur call after call, so each appears once citing every
call it came up on), and `docs/CORE30-APPLIED-PRINCIPLES.md` (empty by
design; nothing goes in until it's confirmed independently more than once).
`course-transcripts/` moves here from a consuming site's repo, where
`PLANNING.md` was already citing it as living "in the Core 30 repo" — true
now, and fixed there in the matching commit.

Also fixes a real, longstanding bug this work surfaced: `scripts/lint.mjs`
and `scripts/silo.mjs` cited rule numbers against a `PLANNING.md` that has
never existed anywhere in this repo (roughly a dozen bare `§`-citations).
Every one now points at the real `CORE30-METHODOLOGY.md` or `CORE30-FAQ.md`
section it corresponds to, or — where a citation was for an engine-specific
rule the course never actually taught (multi-entity subtree chrome, the
same-destination link cap) — the false citation is simply removed rather
than left pointing at nothing. No rule *logic* changed, only what each rule
says its source is.

## v1.30.0 — 2026-08-06

Gallery grids no longer pad an odd real job count up to even. That padding
existed to avoid a lone last item sitting alone in a half-empty grid row, but
it bought that by inventing a "PLACEHOLDER / REPLACE" plate on service/pillar
pages, or by silently dropping an actually-published job from the homepage —
and the former shipped to a live site the moment a silo's real count went
odd. `BeforeAfter.astro` now centers a lone trailing item across both grid
columns instead, at its normal single-column width, so an odd count is fine
everywhere and neither workaround is needed. `Pillar.astro`'s `galleryTarget`
drops the `+ (gallery.length % 2)` forcing and the homepage's trim-by-one is
gone entirely.

## v1.28.0 — 2026-08-06

Completed `client-starter/` into an actual repo skeleton (package.json,
vercel.json, both `api/` functions, an annotated `config-template.yaml`) —
previously just the two engine-sync scripts. Writing it surfaced a real bug in
`api/lead.js`: a hardcoded CRM tag (`'oakville'`) on the one function that
handles leads for all three of kmn-oakville's entities, silently mistagging
every GTA and North York submission. Fixed the source; the tag itself is
simplified to `['website']` until a proper entity-aware fix lands (a
client-side change, deliberately out of scope here — the URL-guessing
alternative was tested and proven wrong for the root entity). Added
`docs/NEW-SITE-CHECKLIST.md`, sequencing the existing GBP-to-config process
with the icon and review-link work below.

## v1.27.0 — 2026-08-06

`review-link-check.mjs` — confirms an entity's `reviews.url` actually resolves
to the Google profile named by its own `place_id`, before the link ships.
Written after finding kmn-oakville's GTA review link pointing at the wrong
business for months while returning a plain HTTP 200. First network-dependent
check in the pipeline; kept out of the default `npm run check` (its own
`npm run reviewlinks`), following the precedent `gbp-drift.mjs` already set.

## v1.26.0 — 2026-08-06

`derive-icons.mjs` generates `favicon.ico` and both `apple-touch-icon` names
from a site's two source logos, automatically, before every build — replacing
a one-off hand-run Python script. `lint.mjs` now fails the build if any of the
icon family is missing from a built `dist`. Closes the gap that let
kitchenmadenew.com launch with no `/favicon.ico` anywhere on the domain.

## v1.25.0 — 2026-08-06

Fixed `VideoObject.uploadDate`: was a bare calendar date, which Search Console
correctly rejects (a schema.org datetime needs an offset). `isoDateTime()`
computes the real, DST-aware Toronto offset per date rather than hardcoding
one that would be wrong roughly half the year.

## v1.24.0 — 2026-08-05

Declared the `icon-192.png` and `icon-512.png` files that were shipping in
`public/` but pointed at by no `<link>` tag — a bookmark or start-page tile has
nothing but a 32×32 to draw from without them, which is why Safari was drawing
a generic letter tile instead of the logo.

## v1.23.0 — 2026-08-05

Every link with `target="_blank"` now carries a visually-hidden "(opens in a
new tab)" announcement, for WCAG 3.2.5. Added the lint rule enforcing the
`v1.22.0` change in both directions — external without a target, or internal
with one — and negative-tested both.

## v1.22.0 — 2026-08-05

Every external link now opens in a new tab. Scanning the built HTML rather
than reading components found the real shape of the problem: 371 of the
site's 380 external links were the footer's social list, not the isolated
cases a code review would have guessed at.

## v1.21.0 — 2026-08-05

`StickyCall` gained an optional strapline (`site.sticky_tagline`) above the
mobile button row — absent by default, since a line naming specific services
is a claim this engine cannot make for every site it serves.

## v1.20.1 — 2026-08-05

Vertically aligned the sticky bar's buttons with the chat bubble's centre, not
just cleared it horizontally — GHL's bubble centre sits at a fixed 49px from
the bottom of the viewport, and the bar's own padding didn't match it.

## v1.20.0 — 2026-08-05

The chat bubble now hides while the cookie-consent dialog is open (it was
covering the Accept button), and the sticky bar's two buttons — visibly
different widths since v1.19.0 — are equalized.

## v1.19.0 — 2026-08-05

First fix for the GHL chat bubble covering the sticky call bar's buttons on
phones. Removed a chat-widget stylesheet that had never worked — it targeted
a shadow root page CSS cannot reach, using selectors that named ids the real
element doesn't have — and reserved space in the bar instead, since the
bubble's position is entirely GHL's and cannot be moved from this side.
