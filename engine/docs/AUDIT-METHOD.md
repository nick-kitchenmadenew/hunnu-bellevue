# Core 30 Audit & Discovery — Method Spec

Formalised from the manual run against kitchenmadenew.com + both GBPs (2026-07-25).

**Purpose:** gather everything needed to build Core 30 pages, and — where pages already exist —
produce the gap list to make them compliant. This is the **front end of the build pipeline**, not
a sales report.

```
Audit/Discovery ──► site config + page inventory + gap list ──► engine ──► pages
```

**The output is the config.** Anything the audit learns that the engine needs (NAP, categories,
services, silo map, competitor set, baselines) lands in `config.yaml` as structured data. The
human-readable report is a by-product.

---

## Inputs, and how each is obtained

| Input | Source | Access needed | Automatable |
|---|---|---|---|
| URL inventory | `robots.txt` → sitemap index → child sitemaps | none | ✅ full |
| Page data | HTTP crawl | none | ✅ full |
| Cloaking check | same URLs, Googlebot UA vs browser UA | none | ✅ full |
| Core Web Vitals | PageSpeed Insights / CrUX API | free API key | ✅ full |
| Design tokens | theme CSS | none | ✅ full |
| Search performance | Google Search Console | property access | ⚠️ browser-driven or OAuth |
| GBP profile | LeadSnap export (`Place Data`) | LeadSnap account | ⚠️ manual export |
| Rank grid | LeadSnap export (`Points Data`) | LeadSnap (paid per grid) | ⚠️ manual export |
| Competitors | LeadSnap export (`Competitor Data`) | LeadSnap | ⚠️ manual export |
| Planned strategy | Core 30 repo — GBP Categories doc | — | ✅ `gh api` |

**One profile = one grid = one export.** KMN needed two (service-area + Oakville storefront).

---

## Phase order — later phases depend on earlier

### Phase A — Discovery (no access required)

1. **`robots.txt`** → sitemap location. Also record which AI crawlers are allowed/blocked.
2. **Sitemap walk** — try `sitemap_index.xml`, `sitemap.xml`, `wp-sitemap.xml`; recurse child
   sitemaps. Dedupe. *(KMN: 94 pages + 109 posts + 3 video = 203 unique.)*
3. **Crawl every URL.** Per page capture: status, final URL, title, meta description, canonical,
   robots meta, h1/h2/h3, **word count with nav/header/footer/aside stripped**, every `<a>` with
   href + anchor text + whether inside chrome, JSON-LD blocks, `<img>` count / missing alt /
   missing dimensions, HTML byte size.
4. **Cloaking / hack check** — refetch a sample as `Googlebot/2.1` and as a desktop browser;
   compare byte length and scan for injected spam vocabulary (gambling, pharma, replica terms).
   Divergence = compromise.
5. **Design extraction** — pull linked stylesheets, rank hex colours by frequency, read CSS
   custom properties, collect `font-family` declarations, detect Google Fonts and `@font-face`.
6. **CrUX / PageSpeed** — real-user LCP, CLS, INP per URL group.

### Phase B0 — GBP capture (the standard method, decided 2026-07-25)

**Paste the dashboard text. Not screenshots, not an API.**

Screenshots were the plan until we tried it — plain text copied from the Business Profile editor
is better: no OCR risk, no image handling, and it parses deterministically. The APIs don't
compete: the Business Profile API is access-gated and covers only profiles you manage, and the
Places API never returns the GBP **category list** or the **services list** — and the services
list is the thing the entire silo hangs on.

**What to copy, per profile** — two pastes:

| Paste | Panels | Yields |
|---|---|---|
| **Profile** | About · Contact · Location · Hours · More | name, primary + additional categories, description, opening date, phone, website, `sameAs`, address (or service area), hours, special hours, languages, attributes |
| **Services** | the Services panel in full | every service, grouped under its category, with descriptions |

Run:

```
python3 gbp_parse.py captures/<client>.txt --services captures/<client>-services.txt \
                     --out out/gbp-<client>.json
```

`gbp_parse.py` prints a confirmation table and **never writes to config without it being seen** —
extraction is heuristic and a misread phone number quietly poisons NAP consistency.

**Parsing notes that cost time to work out:**
- Google mangles labels on copy — "Phone number" arrives as `Phoneber`. Match loosely.
- Categories are a flat list with the word `Primary` on the line *after* the primary one.
- In the services paste, a line followed by `Primary category` / `Additional category` is a
  category header. Service names and descriptions carry no labels — the only reliable separator
  is length (descriptions run past ~90 characters).
- `storefront` vs `service_area` is derived from whether an address is present. **Both can be
  true**: Oakville is a storefront *with* a service area. The address is the NAP; the service
  area drives the location silo.

**Derived automatically at capture time:** page-count projection (categories → pillars, services →
service pages) and **cannibalisation warnings** where near-identical services sit in different
categories and therefore can never link to each other.

**Still not captured by this method:** reviews count/rating (comes from LeadSnap), rank grids,
competitors.

---

### Phase B — Profile & market (needs LeadSnap export)

7. **Parse the LeadSnap CSV.** Format is **multi-block**: `Place Data:`, `Points Data:`,
   `Competitor Data:` — each a header line then its own CSV table. Split on
   `^[A-Z][A-Za-z ]+:\s*$` before parsing.
8. **Place Data** → name, address (empty ⇒ service-area business), phone, website target, review
   count + rating, **primary category**, related categories, lat/lng.
9. **Points Data** → grid of lat/lng/rank.
   **⚠️ Prompt the user for the search term** — LeadSnap does not include it in the export, and a
   grid without its term is uninterpretable and incomparable. Store as `(entity, term, date)`;
   one entity may have several grids. On re-import, warn if the term differs from the stored
   baseline, since the comparison is then invalid.
10. **Competitor Data** → name, avg rank, top-3 %, market share, rating, review count.

### Phase C — Search performance (needs GSC)

11. **Queries, trailing 12 months** — scan for spam vocabulary. Off-topic high-click terms mean a
    current or historical compromise.
12. **Pages, trailing 12 months** — where spam landed. Injection on *legitimate* URLs (gallery,
    privacy policy) indicates content injection rather than added pages.
13. **Queries + clicks, trailing 28 days** — the *real* baseline once spam has decayed out.
14. **Security Issues** and **Manual Actions** — both must be checked; either can be clean while
    the other isn't.

### Phase D — Strategy inputs

15. Read the Core 30 project docs for the business — planned primary/additional categories,
    service list, re-theme mapping.
16. **Human confirms the silo map.** Cross-silo analysis is impossible without it and cannot be
    reliably inferred. ~2 minutes; the difference between an audit and a guess.

---

## Derived analyses — where the real findings came from

None of these come from a single module. **This is the part worth automating.**

| Analysis | Method | What it found for KMN |
|---|---|---|
| **Rank vs distance decay** | Bucket grid points by km from the pin; average rank per band | Oakville flat at ~7 *including* 2 km from its own door → not a proximity problem. Service-area **inverted** — worst at the centre, all top-3 at 20–25 km |
| **Review count vs top-3 share** | Scatter competitors' review count against top-3 % | Competitors with 3 and 12 reviews holding 50% and 45%; KMN with 14 holding 0% → **reviews are not the constraint** |
| **Business-name pattern** | Check top-share competitors for service keywords in name | Every high-share competitor in *both* grids has the keyword; KMN has none |
| **Spam-query detection** | Match top queries against off-vertical vocabulary | 40,000 of 45,900 annual clicks were Indonesian gambling spam |
| **12-month vs 28-day** | Compare windows | Separated hack traffic from a real baseline of 52 clicks / 28 days |
| **Schema vs reality** | Compare `reviewCount`/`aggregateRating` to actual GBP | Site claimed 42 site-wide; Oakville profile has 14 → entity mixing |
| **Planned vs actual categories** | Core 30 doc vs live GBP | Additional categories (Painter, Kitchen remodeler) **never configured**; Oakville primary differs from plan |
| **Anchor-text census** | Count distinct anchors vs total internal links | 2,144 links across 342 texts — 88% non-compliant |
| **Orphan detection** | Sitemap URLs with zero inbound internal links | 17 orphans, all city-level money pages |
| **Contrast validation** | WCAG ratio for every extracted colour pair | Brand gold and tan both fail at ~1.5:1 |

---

## Outputs

### 1. `config.yaml` seed
Business entities (one per GBP) with NAP, phone, categories, `sameAs`, service area; proposed
silo map from GBP categories + re-theme; location list; competitor set.

### 1a. Content brief
`CONTENT-BRIEF.md` — what the content generator must emit. Section lengths, which
services a page may write about, the re-theme rule, and the fields that arrived
broken on the first two exports.

### 2. Gap list — existing pages → Core 30 compliance
Per page: word count vs floor, H1 faults, missing/duplicate meta, cross-silo links, repeated or
generic anchors, orphan status, schema defects, missing alt text. Plus the site-level 301 map.

### 3. Baseline snapshot — re-measure quarterly
Rank grid (avg, top-3 %, market share, decay curve), GSC clicks/impressions/position, page count,
cross-silo link count, anchor repeat rate, orphan count, median HTML weight.

---

## Drift: keeping the config honest between audits

A capture is a photograph. The config is what the site is actually built from. Between audits
either can move — someone adds a service in GBP, or edits a category in the config — and nothing
would notice until rankings did.

`site/scripts/gbp-drift.mjs` diffs the two on every build (`npm run test`, which `npm run check`
runs first). It compares `config-<entity>.yaml` against `audit-tool/out/gbp-<entity>.json` and
**fails the build** on any difference in:

name · phone · address · website field · `sameAs` · languages · service area · hours ·
primary category · additional categories · silo categories · services per category

**Categories and services are compared verbatim** — no case folding, no fuzzy matching. That is
the point of the check: category alignment is the mechanism, so a rename is a real change, not a
formatting difference.

Only four things are normalised, because the two sides legitimately store the same fact in
different shapes. Each one is a fact the check can no longer catch, so the list stays short:

| Fact | GBP | Config | Why |
|---|---|---|---|
| Phone | `(289) 815-3353` | `+1 289-815-3353` | E.164 for schema and `tel:` |
| Address | one string | split fields | schema needs `PostalAddress` |
| Languages | `Cantonese` | `yue` | schema.org wants ISO 639 |
| Service area | `Milton, ON, Canada` | `Milton` | config stores bare cities |

Service **order** differing with the same set is reported but does not fail — order carries no
ranking weight.

The check skips cleanly when no capture exists, so a new entity can be built before its first
audit. It also prints the capture's age, which is the cue to re-audit.

**GBP is authoritative for what the business is.** On drift, fix the config — or re-capture, if
GBP itself is what changed. The check never reconciles automatically; that decision is a human's.

---

## Gotchas hit during the manual run

- **zsh globs `?`** — quote `gh api` URLs containing query strings.
- **Word counts must strip chrome.** Nav/footer/sidebar inflate every page. If the theme lacks
  `<nav>`/`<footer>`/`<main>` (Salient does), fall back to class-name heuristics — and record that
  "is this link in body prose?" became undecidable, which is itself a finding.
- **Sitemap filename varies** — try all common variants, and follow the `robots.txt` pointer first.
- **Cloaking may be historical.** A clean UA comparison doesn't rule out a past compromise — check
  GSC's 12-month query history too.
- **GSC UI export caps at 1,000 rows** — fine below ~1,000 pages.
- **GSC manual actions URL** is `/manual-actions` (plural); the singular 404s.
- **`aggregateRating` is not always fabricated** — check it against the right entity before
  calling it wrong. It matched one profile and not the other.
- **Figma canvas exports are enormous** (32768 × 22753). Detect frame bounds by scanning for
  non-background columns, then crop; a contact sheet of all frames at ~250 px wide reads the whole
  set in one pass.
- **Browser screenshots can be blocked** by extension host permissions — have a non-browser
  fallback for anything critical.
- **YAML 1.1 reads a bare `ON` as boolean `true`.** `region: ON` parsed as `True` in PyYAML
  (the audit tool) and as `"ON"` in js-yaml (the site) — one config file, two answers, and a
  broken `addressRegion` on the Python side. Quote province and country codes. Same trap catches
  `NO` (Norway) and `Y`/`N`.

---

## Prototype scripts

Working versions from the manual run are preserved in `audit-tool/prototype/`:

- `crawl.py` — sitemap-driven crawl, 5 workers, per-page extraction
- `analyze.py` — structure, links, anchors, silo crossing, schema, images, canonicals

Not productionised. They become the crawler adapter for the shared rule engine
(`PLANNING.md` §5) rather than a separate codebase — same rules, different front door.
