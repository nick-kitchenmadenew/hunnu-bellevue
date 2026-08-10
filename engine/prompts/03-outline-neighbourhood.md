# Outline: Neighbourhood / Landmark page

**Page type:** `location` · **Floor:** 1,000 words
**Inputs:** City · Target keyword · GBP Primary Category (from `config-<entity>.yaml`)

> **Research is web search, not DataForSEO.** The hyperlocal facts this prompt
> needs — building types, access, event days, HOA and permit quirks — aren't in
> a SERP API. Gather them in-session (the prompt suggests Reddit and similar).
> The prompt's own Uniqueness Checklist is the stop condition: fewer than five
> area-specific facts means stop and ask for more input rather than padding.
>
> **This page type is the one the duplicate-paragraph linter watches.**
> `lint.mjs` compares normalised paragraphs across location pages and errors on
> repeats, so city-name find/replace fails the build. The similarity guard
> below is not advice — it is what keeps the page shippable.

---

## Prompt

Role
You are a world-class local SEO writer. Produce a complete outline (bullets only) for a supporting content page that targets a single GBP category or service tied to a specific neighborhood or landmark. Goal: strengthen geographic relevance for the Google Business Profile (GBP).

Inputs I'll provide each run

- City: [City, State]
- Target keyword: "[Service or GBP Category] [Landmark/Neighborhood] [City]"
- GBP Primary Category: [Category name]

Output Requirements

- Outline only: bullets, not prose
- Reading level: Grade 5–6. Sentences ≤ 20 words
- No brand info. No prices. No links
- Keyword use: Include the exact target keyword once in the intro outline
- Geo spice: Mention the neighborhood/landmark naturally; rotate nearby areas every 2–3 sections
- Similarity guard: If any wording feels generic, rewrite with new local facts. Aim for ≤20% overlap with other geo pages
- Consider looking at reddit or similar areas to find information about this very hyper local area

Depth and readability

- Propose **H3 subheadings** (`### Subheading`) inside any section that covers more than one idea — access and parking, say, or permits and HOA rules.
- H3s must follow their H2. Never skip from H1 to H3.
- Propose a **list** (`- item`, or `1. item` when order matters) for directions, access steps, and building-type breakdowns. Directions in particular read far better as ordered steps than as a paragraph.

Complete Output Structure

1. H1 Options (include [Service/Category] near [Landmark/Neighborhood] in [City] but more engaging)

2. Introduction outline (bullets only)
   - Localizer: "[Landmark/Neighborhood] in [City]"
   - What this page covers (service/category + area focus)
   - Why proximity matters (access, building types, rules)
   - Soft next step (availability/call)
   - Include the target keyword once

3. H2 Proposals (4–6 statement-style H2s)
   - Statement H2s (no questions)
   - Each H2 maps to distinct job (diagnose, decide, prepare, perform, verify, prevent, logistics)
   - Include one H2 focused on "how to reach us / directions / getting here"
   - Prioritize "ready-to-book" intent over generic research
   - Add city/area only where natural
   - Exclude pricing, brand comparisons, warranties
   - If service where people travel to business: mention serving customers in this area worth the trip
   - If service where business travels to them: mention examples of services performed near this geographic landmark

4. Main Sections (for each H2, 30–70 words total, bullets only)
   - Audience/use case specific to the area
   - Key benefit or what to expect
   - One local detail (building type, access, event days, HOA/permits, transit/parking)
   - Proposed H3 subheadings (where the section covers more than one idea)
   - Proposed list (directions and access steps especially)
   - One section includes placeholder for future driving directions insert

5. Internal Signals & CTAs (outline only)
   - CTA placements: after snippet block, mid-page, end
   - Anchor text suggestions:
     - "[Service] near [Landmark] in [City]"
     - "Check availability in [Neighborhood]"

6. FAQs (outline only)
   - 4–6 hyper-local questions (access timing, high-rise rules, event-day scheduling, permit basics)
   - One-line answer notes (no prose; no prices)

7. Evidence Notes (outline only)
   - Claims that might need sourcing
   - Stat budget: max 3 claims

8. Uniqueness Checklist
   - List 5–8 area-specific facts used in outline (one line each)
   - If fewer than 5, request additional inputs

9. Final Assembly (complete outline in order above, bullets only, keep all placeholders intact)
