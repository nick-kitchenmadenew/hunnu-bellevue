# Outline: Supporting content article

**Page type:** `supporting` · **Floor:** 1,000 words
**Inputs:** Target keyword · Target keyword of the page it supports · PAA + competitor H2/H3s

> **Where the inputs come from.**
> - **PAA** — `paa-harvest.mjs`, seeded with the article's own topic.
> - **Competitor H2/H3s** — `serp-headings.mjs`.
> - **Secondary keywords (5–8)** is an *output* field of this prompt. Without
>   data the model invents it, which is exactly the failure this pipeline
>   exists to stop — run `keyword-data.mjs` and hand the results in rather than
>   letting it guess.
>
> **`uplink` is compulsory on this page type.** A supporting article that does
> not point at the page it supports does no structural work, and `checkLink`
> refuses anything else — no siblings, no cross-silo. The "Priority internal
> destinations" field below must name that parent page.

---

## Prompt

Role: You are a world-class educational SEO writer and strategist. Create a complete detailed outline for a supporting content article aimed at strengthening local topical authority and nudging searchers toward engaging with the business's Google Business Profile (GBP).

Inputs I'll provide each time (minimal):

- Target keyword
- Target keyword for page it's supporting
- People Also Ask (PAA) + competitor H2/H3s

Global Rules (follow exactly):

Intent lock: Identify one primary search intent and up to three sub-intents. Do not broaden beyond these.

Snippet/AI overview unification: Propose the single question we'll design to win for both Featured Snippet and AI Overview. Provide 2–3 options with rationale.

Evidence: Any stat/claim must include a real source suggestion or "SOURCE TBD (type/site)". No made-up numbers.

E-E-A-T cues: Mark 2–3 spots to add quick firsthand notes (e.g., brief process summary, client scenario, tip from fieldwork). Keep it lightweight—placeholders are fine.

On-page execution:

- Intro 150–200 words
- Snippet/AI block 100–150 words
- Paragraphs ≤120 words
- Content breaks ~every 300 words
- Reading level: Grade 5-6
- Clear calls to action that point to priority internal destinations (include suggested anchor text)

Depth and readability:

- "Content breaks ~every 300 words" is best served by **H3 subheadings** (`### Subheading`), not just paragraph breaks. Propose them inside any H2 that runs long.
- H3s must follow their H2. Never skip from H1 to H3.
- Propose a **list** (`- item`, or `1. item` when order matters) wherever the content is steps, options, or comparisons — the Snippet/AI block in particular often wants a list shape.

Complete Output Structure:

**A) Brief & Strategy**
- Working title:
- Primary search intent:
- Sub-intents (2–3):
- Target keyword (TK):
- Secondary keywords (5–8):
- Searcher "jobs to be done" (2–3 bullets):
- Priority internal destinations (with suggested anchor text):
- Success metric focus for this piece (pick 2): featured snippet win / PAA inclusion / clicks to location page / calls from GBP / direction requests / "services" clicks

**B) Introduction Block (150–200 words)**
- Hook option 1 (question/stat/story). Add [SOURCE TBD or URL] if using a stat.
- Hook option 2 (alternative angle).
- Value promise (1 sentence) using TK once in first 100 words.
- Mini-roadmap (1–2 sentences) previewing the sections.

**C) Featured Snippet + AI Overview Target (100–150 words)**
- Question options (2–3) that include TK or close variant with "why this wins" explanation for each.
- Recommended question choice with draft answer block in tight paragraph or list form (no fluff). Make it skimmable and self-contained.
- CTA line pointing to priority internal destination (e.g., "See pricing for [service] in [city] → [anchor suggestion]").

**D) Main Sections Outline**
- Number of H2 sections with brief explanation why for this topic.
- For each H2:
  - H2 title (include secondary keyword where natural)
  - Purpose (what this section accomplishes for the reader)
  - Key talking points (4–5 bullets)
  - Proposed H3 subheadings (where the section runs past ~300 words)
  - Proposed list (where steps/options/comparisons are the natural shape)

**E) User Experience Elements**
- Table of contents: yes/no (recommend when >1,000 words)
- Content breaks every ~300 words: yes
- Lists/tables: where to use and why (one note per H2)
- Transition cues between sections (2–3 example sentences)
- CTA placement plan (at minimum: after snippet block, mid-article, end)

**F) Evidence Pack**
List each claim you plan to include and a proposed source type:
- Claim → Source (URL or "SOURCE TBD: [type, e.g., 'Energy Star' / 'manufacturer manual' / 'state utility program']")
- Claim → Source
- Claim → Source

**G) Final Outline Assembly**
Complete consolidated outline with:
- Title
- Intro (notes only, not full prose)
- Snippet/AI block (notes only, not full prose)
- H2 structure with bullets
- CTA placements + anchor text
- Evidence Pack appended
