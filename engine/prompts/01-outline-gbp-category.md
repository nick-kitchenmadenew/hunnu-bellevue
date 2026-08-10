# Outline: GBP Category page

**Page type:** `pillar` · **Produces:** H1 + intro + the `services` band
**Inputs:** City · GBP Category · GBP Primary Category · Target keyword · Services list (all from `config-<entity>.yaml`)

> **Scope note — read before using.** This prompt covers the `services` band of
> a pillar, not the whole page. `ORDER.pillar` has eighteen possible sections;
> the 1,500-word floor is met by the pillar's *other* sections (`prose`,
> `process`, `compare`, `faq`, `cta`) alongside this one. Generating only what
> this prompt returns and expecting it to clear the floor is what forced an
> earlier build to pad its pages.

---

## Prompt

Role
You are a world-class local SEO writer. Produce a complete outline for a GBP category page that ranks for "[GBP category] [City]" and builds topical semantic relevance for the GBP.

Inputs I'll give you each run

- City: [City, State]
- GBP Category: [Category name]
- GBP Primary Category: [Category name]
- Target keyword: "[GBP Category] [City]"
- Services under this category: [Comma-separated list or bullets]

Non-negotiables

- No brand info. No links
- H1 once, then H2 for every relevant service in the list. If there are too many services to reasonably capture each, choose the most relevant and valuable for this local business to rank for
- Reading level: Grade 5–6. Sentences ≤ 20 words. No fluff
- Style: Concrete nouns/verbs. Skip generic adjectives unless they add clarity

Depth and readability

- Any H2 section that will run past roughly 150 words gets **H3 subheadings** (`### Subheading`) to break it up. Propose them in the outline; do not leave a wall of text for the writing step to discover.
- H3s are optional per section and must follow their H2 — never place one before the first H2, and never skip from H1 straight to H3.
- Where a section lists steps, options, or what-is-included, propose a **list** rather than prose: `- item` for unordered, `1. item` for ordered.

Complete Output Structure

H1: "[GBP Category] in [City]"

Intro paragraph outline (bullets only):

- Localizer: ("In [City], …")
- What this page covers:
- Expectations / next steps:
- Value proposition:

Service Selection Rationale:

- Explain why you selected the H2's you did and why you left any out

Service Sections (in priority order, most important services first):

H2: [Service] in [City]

- Audience/use case:
- Benefit/what to expect:
- Local detail:
- Proposed H3 subheadings (only if the section will run long):
- Proposed list (only where steps/options/inclusions are the natural shape):
- (future: service page link here)

H2: [Service] in [City]

- Audience/use case:
- Benefit/what to expect:
- Local detail:
- Proposed H3 subheadings (only if the section will run long):
- Proposed list (only where steps/options/inclusions are the natural shape):
- (future: service page link here)

[Repeat for all selected services]

Omitted services (if any):

- [Service] — reason
- [Service] — reason

Additional Guidelines Applied:

- Synonym mix: Use one synonym or close variant for the service where natural
- Geo spice: Use one neighborhood/area term every 2–3 sections (e.g., "Downtown," "Northside")—keep it natural
- No price claims or references
