# Core 30 Page Structure Spec

How the engine assembles a page. **Content is never rewritten** — the generator's prose is
authoritative. The engine only decides structure: order, headings, links, schema, markup.

Audited against `core30-acf-export-export-2026-07-25.csv`
(page: *Cabinet Maker in Oakville*, a Level 2 category page).

---

## 1. What the generator gives us

`post_content` contains **only `<h1>`, `<h2>`, `<p>`** — no divs, no classes, no styling.
Everything else arrives as separate ACF fields:

| Field | Role |
|---|---|
| `post_content` | Article body — H1 + 10 H2 sections |
| `hero_headline` / `hero_subheadline` / `hero_cta_text` / `hero_cta_phone` | Hero |
| `faq_html` | FAQ — `div.faq-item > h3 + p` |
| `featured_image` | One image per page |
| `meta_title` / `meta_description` | Head |
| `target_keyword` / `target_city` / `service_name` | Targeting |
| `schema_json` | Discarded — regenerated |
| `hero_bg_color` / `hero_primary_color` | Ignored — design tokens win |

This is a clean separation and should be preserved.

---

## 2. Canonical page structure

Every page type renders in this fixed order. Sections are catalog components.

```
1. Breadcrumb          Home › Category [› Service]        structural nav, not a body link
2. Hero                H1 (exactly one), subheadline, tel: CTA
3. Intro               what this is                       ← prose
4. Process             how the work runs                  ← moved above the service list
5. Compare             how it differs from the obvious alternative
6. Gallery             proof
7. Consultation        the offer, plus reviews and warranty
8. Body sections       one per H2; in-silo sections carry one contextual link
9. Pricing / Locations
10. Form
11. FAQ                H2 + one row per question
12. Bottom CTA         tel: — exempt
13. Footer             NAP, hours, legal, 4 pillars + services flagged in_footer
```

The live order is `ORDER` in `site/src/lib/sections.js`, which is what the
template reads. A content file says WHICH sections it has; it cannot reorder them,
or twenty-five pages become twenty-five shapes.

**Process sits above the service list** (moved 2026-07-26). It had been below,
which put "here is how the work runs" behind five sections about individual
services — by then the reader has already decided.

### Heading rules

- **Exactly one `<h1>` per page.** Conflict in the sample: `post_content` opens with
  `<h1>Cabinet Maker in Oakville</h1>` while `hero_headline` is `Cabinet maker`. **Resolution:
  the hero renders the H1 using `post_content`'s H1 text; `hero_headline` renders as a styled
  eyebrow/`<p>`, and the H1 is stripped from the body.** Never two H1s.
- Body sections are `<h2>`. FAQ questions are `<h3>` under the FAQ `<h2>`. No level skipping.
- No links inside any heading.

---

## 3. Link resolution — the core of compliance

The generator emits **no links** in `post_content` (verified: zero `<a>` tags, zero
`[FUTURE_SERVICE_PAGE_LINK:]` placeholders). So the engine injects **all** internal links.

### Rules

1. **One link per H2 section, maximum.** Never two links to the same destination on a page —
   *except* that a service may also appear once in a card grid, so a pillar may argue for it in
   prose and repeat it as a scannable card. Ruled 2026-08-01, DISCREPANCIES #31. A third link is
   still an error.
2. **In-silo only.** An H2 gets a link *only if* its service resolves to a page in this page's
   own silo. Cross-silo H2s stay as plain prose — this is how the silo survives content that
   ranges wider than the silo does.
3. **Anchor text** is chosen by the engine from a site-wide registry: unique across the whole
   site, descriptive of the destination, no brand name, no "click here", plain text (never a
   button).
4. **Context window** — the link is placed inside a passage of 70–100 words about the
   destination, within the H2 section that discusses it.
5. **Down and up only.** Category → its services; service → its parent category. Never lateral
   between silos. (Supporting articles may link laterally *within* one silo.)
6. Exempt from the registry: same-page `#anchors`, `tel:`, `mailto:`, breadcrumbs, nav, footer.
   The footer's link list (added 2026-07-26, PLANNING §3) lives here: chrome carries no silo
   weight, so it neither passes equity nor violates the cross-silo rule. It exists because
   service pages were otherwise dead ends for a human. **The four pillars, plus only those
   services flagged `in_footer: true` in config — one today, cabinet refacing.** The flag is
   what keeps this from becoming a services menu; adding one is a decision, not a default.

### Applied to the sample page

Ten H2 sections. Silo ownership decides which get links:

| H2 | Resolves to | Link? |
|---|---|---|
| Kitchen Remodeling | Kitchen remodeler silo | ✗ cross-silo — prose only |
| Full Kitchen Design | Kitchen remodeler silo | ✗ cross-silo — prose only |
| Kitchen Cabinet Refacing | Kitchen remodeler pillar | ✗ cross-silo — prose only |
| **Kitchen Cabinet Painting** | Cabinet maker → Cabinet painting | **✓ link down** |
| Quartz Countertop Installation | Kitchen remodeler silo | ✗ cross-silo — prose only |
| Custom Cabinet Door Replacement | not a GBP service | ✗ no target |
| Backsplash Installation | not a GBP service | ✗ no target |
| Kitchen Island Upgrades | not a GBP service | ✗ no target |
| Custom Millwork and Trim | not a GBP service | ✗ no target |
| Soft-Close Hinge Upgrades | not a GBP service | ✗ no target |

**Only one of ten sections can legally link.** The content stays exactly as written — but be
aware this page currently does almost no silo work, because eight of its ten sections describe
services that either sit in another silo or have no page to point at. That's a content-brief
issue for future pages, not something to fix here.

*(Cabinet refinishing — the other GBP service under Cabinet maker — has no H2 on this page, so
that link has nowhere to attach.)*

---

## 4. Section word counts

Core 30's "70–100 words" is the **link context window**, not a section cap. Long sections are
fine; the link just has to sit in a 70–100 word passage about its destination.

Sample sections run 481, 433, 195, 201, 146, 141, 140, 144, 148, 141 words. All acceptable.
Page total 2,204 words — clears the 1,500 floor for a Level 2 page. **Pass.**

---

## 5. URL structure

`post_name` is currently flat (`cabinet-maker`). The engine derives the URL from
`silo` + `post_name`, not from `post_name` alone:

```
/cabinet-refacing/                          L2 pillar
/cabinet-refacing/cabinet-painting/         L3 service
/areas/oakville/                            geo hub
/areas/oakville/cabinet-refacing/           geo × service
```

**Open:** the sample is titled "…in Oakville" with a flat slug and images under
`kitchenmadenew.com/core30/`. Needs settling — Oakville as a section of the main site, or its
own site. Blocks final URL assignment.

---

## 6. Schema — regenerated, never passed through

Discard `schema_json` / `schema_markup` (byte-identical duplicates). Generate from config +
frontmatter + the rendered page:

| Node | Source |
|---|---|
| `LocalBusiness` | site config — NAP must match GBP character-for-character |
| `WebPage` | page meta |
| `BreadcrumbList` | silo position |
| `Service` | `service_name`, linked to the LocalBusiness `@id` |
| `FAQPage` | generated **from the rendered FAQ**, so the two cannot diverge |
| `ImageObject` | image manifest |

Fixes defects observed in the sample: double slash in every `@id`
(`kitchenmadenew.com/core30//#business`), orphan `Person` author node nothing references, no
`BreadcrumbList`, no `WebPage`, no `Service`, empty `sameAs`, FAQ duplicated as a second copy
that will drift on the first edit.

---

## 7. Ingest checklist (per page)

> **Before a page is generated at all**, see `CONTENT-BRIEF.md` — what the
> generator must produce for the ingest below to have anything to work with.
> Written from two real exports and everything that had to be fixed by hand.


1. Read CSV row → frontmatter; require `silo`, `parent`, `type` (**not yet emitted — must be
   added to the generator, or mapped from `service_name` via the silo config**)
2. Fill `target_city` if empty — derive from title (empty in the sample despite "in Oakville")
3. Parse `post_content`; lift H1 into the hero; keep H2/P as body sections
4. Resolve link targets per §3; inject links; register anchors
5. Render FAQ from `faq_html`; generate `FAQPage` from what rendered
6. Attach images from the manifest; `featured_image` becomes the hero
7. Discard incoming schema; regenerate per §6
8. Discard `hero_bg_color` / `hero_primary_color`; apply design tokens
9. Run the linter; fail the build on violation

---

## 7a. Worked example — new content + config

Handing the engine the Oakville cabinet-maker CSV row, with `config.yaml` populated:

**Resolved automatically from config**
- `entity: oakville` → footer shows 1155 North Service Rd W + **289** number, not the GTA 647
- `LocalBusiness` with storefront address, geo, its own `sameAs`; **no** review markup
- Breadcrumb, `BreadcrumbList`, parent link, canonical URL from silo position
- Photos pulled by `cabinet-painting` + `Oakville` tags; EXIF stripped; alt templated
- `hero_bg_color` / `hero_primary_color` discarded in favour of tokens

**Errors raised**
- Two H1s (`post_content` H1 vs `hero_headline`) → hero takes the H1
- `target_city` empty despite "Oakville" in the title → filled from config
- Incoming JSON-LD discarded (double-slash `@id`s, orphan `Person`, duplicated FAQ)

**Link resolution across the ten H2s**
| H2 | Outcome |
|---|---|
| Kitchen Cabinet Painting | ✅ in-silo GBP service → link injected, anchor registered |
| Kitchen Remodeling · Full Kitchen Design · Kitchen Cabinet Refacing · Quartz Countertop Installation | ✗ other silo → prose only |
| Cabinet Door Replacement · Backsplash · Kitchen Island · Millwork · Soft-Close Hinges | ✗ not GBP services → no target |

**Warnings only config makes possible**
- Only 1 of 10 H2 sections links in-silo
- `Cabinet refinishing` is an in-silo GBP service with no H2 on its category page
- Oakville GBP primary is **Kitchen remodeler**, but the page is assigned to the **Cabinet maker**
  silo — conflict carried from `discovery.yaml`

### Scope boundary

The linter validates **structure** — silos, anchors, schema, entities, word counts, headings,
links. It says nothing about whether content is *true*: prices, claims, accuracy, quality. A page
can pass every check and still be wrong. Structure is machine-checkable; accuracy is not.

---

## 8. Linter checks specific to this structure

`site/scripts/lint.mjs`, with the silo model in `site/scripts/silo.mjs` and its rules
pinned by `site/scripts/silo.test.mjs`. `npm run check` runs the rule tests, the
build, then the linter.

**Hard fail**
- More or fewer than one `<h1>`
- Heading level skipped, or a link inside a heading
- Any link crossing a silo, or going sideways within one
- A link whose target is not declared in config
- A dead link — target declared but never built *(escalates from warning once every
  declared page has been built at least once; see below)*
- Anchor text already used anywhere on the site
- Generic or brand-name anchor text
- Two links to one destination on a page
- Word count below the floor for the page type
- FAQ schema not matching the rendered FAQ
- Self-serving review markup
- Link outside body prose, or a contextual section with ≠ 1 link
- Missing alt, missing width/height, lazy-loaded hero

**Warn**
- A pillar that does not link to all of its own children
- A built page not declared in any silo
- Link context window outside 70–100 words
- Links pointing at pages not built yet, while the silo is still being built out
- Component class drift (no contextual sections matched)

### Why dead links warn before they fail

While the silo is being built, every link on the homepage points at a page that does
not exist yet. Failing the build on that would make it permanently red, and a build
that is always red tells you nothing. So unbuilt targets warn — and become hard
errors the moment every page the config declares has been built at least once.

### What the linter still cannot see

- Whether the content is **true**. Prices, claims, timelines, accuracy. A page can
  pass every check here and be wrong about everything. Structure is machine-checkable;
  accuracy is not.
- Whether the anchor text is a **good** description of its destination, only that it
  is unique and not generic.
- Whether a link's 70–100 word context is actually *about* the destination.
