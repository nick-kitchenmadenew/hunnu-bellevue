# Config Schema — the interface between audit and engine

The audit's job is to produce this. The engine consumes only this.

**Two files, deliberately separate:**

| File | Role |
|---|---|
| `config.yaml` | Clean, human-editable. **Authoritative.** The only thing the engine reads |
| `discovery.yaml` | Audit output: provenance, confidence, conflicts, open questions. Never read by the engine |

**Lifecycle:** audit *proposes* → human confirms → `config.yaml` becomes authoritative → later
audits **diff against it** and report drift rather than overwriting. That drift check is the
quarterly GBP review (§10b) made concrete and automatic.

---

## ⚠ Editing this file does not hot-reload

**Verified 2026-07-26** on a long-running `astro dev` server: a config-only change,
confirmed by the build and the linter, and the dev server went on serving the
previous value until something inside `site/` was touched.

*Correction to an earlier version of this note.* It originally claimed this was the
cause of Nick not seeing a footer change. It was not. He was watching
`astro preview`, and the actual cause was Claude repeatedly killing that server
after taking screenshots. The trap described below is real and was reproduced
directly — but it explained a symptom it had not caused, which is worth flagging as
its own kind of error: a correct diagnosis attached to the wrong patient.

**Why.** `config-oakville.yaml` lives at the repo root. Vite watches `site/`. The
config is read once with `readFileSync` when `site/src/lib/config.js` is first
evaluated, so a change to a file outside the watched tree invalidates nothing and
the module keeps the values it loaded at startup.

What makes it genuinely confusing is that it *sometimes* appears to work. Any edit
that also touches something inside `site/` — a component, a layout, `config.js`
itself — invalidates the module and the config is re-read as a side effect. So a
change bundled with a code change propagates, and the very next change on its own
does not.

**Affected by this, all config-only:** footer list, nav, stat tiles, phone number,
hours, review count and rating, descriptor, silo labels, locations.

**Fixes, either one:**

```
touch site/src/lib/config.js     # invalidates the module, server keeps running
```

or restart `npm run dev`.

**What is not affected.** `npm run build`, `npm run check` and `npm run preview`
all read the file fresh every time, so CI and any verification through them is
telling the truth. Only a long-running dev server goes stale — which means the
build passing and the screen disagreeing is the expected symptom, not a
contradiction.

---

## Why provenance is separate

Real values are human-edited over time. If provenance is inline the file becomes unreadable and
edits destroy the metadata. Keeping `discovery.yaml` alongside means the status page can flag
*"this value was inferred and never confirmed"* or *"GBP now disagrees with config"* without
cluttering the thing Nick actually edits.

---

## `config.yaml`

```yaml
site:
  domain: kitchenmadenew.com
  primary_city: Oakville            # ← human decision, not derivable
  languages: [en]                   # /zh/ reserved (§9b)
  ai_crawlers:
    allow: [GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended]

entities:                           # one per Google Business Profile
  - id: gta
    type: service_area              # ← derived: Place Data address empty
    name: Kitchen Made New
    phone: "+1 647-955-7778"
    gbp_url: …
    website_target: /               # the URL this GBP points at
    primary_category: Cabinet maker
    additional_categories: [Painter, Kitchen remodeler]   # ⚠ NOT SET on the live profile
    area_served: [Toronto, Vaughan, Markham, Aurora, …]
    address: null                   # service-area ⇒ omit entirely, never a fake locality
    sameAs: [facebook, instagram, youtube, x, gbp_url]
    reviews: { count: 42, rating: 4.9 }      # display only — never enters schema

  - id: oakville
    type: storefront                # ← derived: Place Data address present
    name: Kitchen Made New
    phone: "+1 289-815-3353"
    website_target: /areas/oakville/
    primary_category: Kitchen remodeler       # ⚠ differs from the GTA profile
    address:
      street: 1155 North Service Rd W Unit 11
      locality: Oakville
      region: ON
      postal_code: L6M 3E3
      country: CA
    geo: { lat: 43.4359449, lng: -79.7144436 }
    reviews: { count: 14, rating: 5.0 }

silos:
  - gbp_category: Cabinet maker
    target_keyword: Cabinet refacing        # the re-theme — human strategy, not GBP data
    slug: cabinet-refacing
    entity: gta
    status: planned                         # planned | draft | published
    services:
      - { gbp_service: Cabinet painting,    slug: cabinet-painting,    status: planned }
      - { gbp_service: Cabinet refinishing, slug: cabinet-refinishing, status: planned }

locations:
  - { city: Oakville, entity: oakville, priority: 1, services: [cabinet-painting] }

pages:                              # inventory — drives link resolution and the redirect map
  - { url: /cabinet-refacing/, type: pillar, silo: cabinet-refacing, status: planned }

redirects:
  - { from: /oakville/cabinet-maker/, to: /cabinet-refacing/, code: 301 }

design:
  tokens: DESIGN-TOKENS.md
  logo: assets/logo.svg

integrations:
  forms:      { endpoint: /api/lead, destination: gohighleveL }
  conversions: { meta_capi: true, google_ads: true }
  remarketing: { meta_pixel: "…", deferred: true }
  analytics:  cloudflare

competitors:                        # from LeadSnap — for content gap + monitoring
  - { name: Attimo Kitchen Refacing, top3: 100%, reviews: 55 }

baselines:
  captured: 2026-07-25
  gsc: { clicks_28d: 52, avg_position: 42.7 }
  grids:                            # a list — one entry per (entity × search term)
    - entity: oakville
      term: "cabinet refacing oakville"     # ← prompted from the user on import
      points: 84
      avg_rank: 6.8
      top3_pct: 0
      market_share: 0
      decay: flat                           # flat | normal | inverted
    - entity: gta
      term: "cabinet refacing toronto"
      points: 107
      avg_rank: 16.4
      top3_pct: 7.5
      market_share: 24.25
      decay: inverted

reviewed:
  gbp_verified: 2026-07-25
  rules_reviewed: 2026-07-25
```

---

## `discovery.yaml`

Three sections. **The conflicts section is the valuable one.**

```yaml
provenance:
  entities.oakville.phone:  { source: leadsnap.place_data, confidence: confirmed }
  entities.gta.address:     { source: leadsnap.place_data, confidence: derived,
                              note: "empty address ⇒ service-area business" }
  silos[0].target_keyword:  { source: core30_repo, confidence: unconfirmed,
                              note: "strategy doc, not verified against live GBP" }
  site.primary_city:        { source: none, confidence: missing }

conflicts:                          # sources disagree — every one needs a human decision
  - id: gbp-categories-not-set
    severity: high
    planned: [Painter, Kitchen remodeler]      # Core 30 repo
    actual:  [Service establishment]           # live GBP
    impact: "The whole silo structure rests on categories Google isn't told about"

  - id: oakville-primary-category
    severity: high
    expected: Cabinet maker                    # per the strategy doc
    actual:   Kitchen remodeler                # live Oakville GBP
    impact: "Oakville silo may need a different pillar structure from the main site"

  - id: schema-review-entity-mixing
    severity: medium
    detail: "Site-wide schema carries reviewCount 42 (GTA profile) including on Oakville
             pages, where the real profile has 14"

  - id: wireframe-pillar-naming
    severity: medium
    plan: [Cabinet spray painting, Kitchen cabinet refacing]
    wireframe: [Painter, Kitchen Remodeler]
    impact: "URLs are permanent — resolve before the first page ships"

  - id: cabinet-repainting-no-gbp-anchor
    severity: low
    detail: "Wireframe has a Cabinet Repainting page; GBP lists Cabinet painting"

open_questions:                     # audit cannot determine — must be asked
  - hours_per_entity
  - service_area_priority_order     # needs rank maps + business judgment
  - logo_source_file
  - both_profiles_same_address      # duplicate-listing risk
```

### Out of engine scope (2026-07-25)

**Business / legal / DBA naming is not a config field.** The audit still *reports* the
name-pattern finding — every top-3 competitor in both grids carries the service keyword — because
it is a real and significant observation. But it is a business decision, not something the engine
consumes or acts on. Report it; don't model it.

---

## Field derivability

| Automatic | Derived, needs confirming | Human only |
|---|---|---|
| NAP, categories, geo, reviews (LeadSnap) | Storefront vs service-area (from empty address) | Primary city |
| Existing page inventory (sitemap) | Page type from URL pattern | Re-theme keywords |
| Redirect candidates (URL similarity) | Silo assignment | Location priority |
| Design tokens (theme CSS) | Competitor set | Logo, brand assets |
| Baselines (GSC + grids) | Duplicate-page pairs | Tracking IDs |
| AI crawler policy (robots.txt) | | Legal/DBA name |

**The silo map is the one thing that must stay human-confirmed.** It can be proposed from GBP
categories plus URL structure, but cross-silo detection is meaningless if the proposal is wrong —
and it's the single most important Core 30 rule.

---

## `entity.hours` — two forms, one meaning

```yaml
hours:
  mon_sun: "09:00-21:00"          # every day the same
```

```yaml
hours:
  days:                            # a day that differs
    mon: "08:00-18:00"
    tue: "08:00-18:00"
    wed: "08:00-18:00"
    thu: "08:00-18:00"
    fri: "08:00-18:00"
    sat: "08:00-18:00"
    sun: "10:00-17:00"
```

Exactly one of the two. Declaring both throws, because it is a contradiction
rather than something to merge. A day may be `closed`, `null`, or simply absent —
all three mean shut, and schema.org expresses a closure by omission rather than by
a zero-length range.

`hoursByDay()` in `src/lib/config.js` is the only place that knows both forms; it
returns a seven-entry week, Monday first, and the schema graph, the footer and
the drift check all read that. They cannot disagree about the hours because there
is one answer.

The footer renders one line per run of consecutive days sharing a range —
"Seven days · 9:00 am – 9:00 pm" for a uniform week, "Mon–Sat" plus "Sunday" for
the second example. Runs require adjacency, not just equal hours: a Monday and a
Wednesday on the same times are two entries, because "Mon–Wed" would claim a
Tuesday the business is shut.

`days` exists because the second business tried was open 8–6 six days and 10–5 on
Sunday, and `mon_sun` could not say it. Collapsing would have published hours the
profile contradicts. `scripts/hours.test.mjs` holds the cases.

## Producing it

`audit-tool/gbp_to_config.py` turns a parsed profile into a proposed config plus a
`discovery-<entity>.md`. Validated against the Oakville profile: fourteen of
eighteen entity fields come out identical to the file a person wrote and edited
over a fortnight, every silo and every one of the seventeen service slugs match,
and the result passes `gbp-drift.mjs` on all fifteen checked fields. The four that
differ are three list orderings the drift check sorts anyway, and
`service_area_label`, which the tool flags as a human call — it proposed
"Oakville" where a person wrote "Oakville and Halton".

## Re-running against an existing config

1. Re-audit
2. Diff every derivable field against `config.yaml`
3. Emit `drift` entries — GBP category changed, NAP edited, review count moved, page disappeared,
   new competitor entered the top 3
4. **Never auto-overwrite.** Config is authoritative; drift is reported for a human to accept

This is what makes the tool worth running quarterly rather than once.
