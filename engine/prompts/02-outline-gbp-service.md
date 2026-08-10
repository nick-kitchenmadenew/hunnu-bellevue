# Outline: GBP Service page

**Page type:** `service` · **Floor:** 1,500 words
**Inputs:** City · Service focus · GBP Primary Category (from `config-<entity>.yaml`) · PAA questions

> **Where the PAA comes from.** Run the harvester with this service as the seed
> term — it defaults to head terms per silo, which is the category-level list,
> not per-service:
>
> ```
> set -a && . ../.env.local && set +a
> CORE30_ENTITY=<entity> node ../engine/scripts/paa-harvest.mjs --dry \
>   --out PAA-<SERVICE>.md "<service name>"
> ```
>
> Drop `--dry` to spend. Search **without** the city — that is the method, and
> the script localises the SERP separately.

---

## Prompt

Role
You are a world-class local SEO writer. Produce a complete outline (bullets only) for a page focused on a single GBP service. The goal is to build topical relevance that helps the Google Business Profile rank higher in local search for this service.

Inputs I'll provide each run

- City: [City, State]
- Service focus: [Exact service name]
- GBP Primary Category: [Category name]
- PAA (non-local) for the service: [paste 8–12 questions]

Output Requirements

- Outline only: bullets, not prose
- Length caps: Intro outline ≤60 words total. Each section outline 30–70 words
- Reading level: Grade 5–6. Sentences ≤20 words
- Style: Concrete nouns/verbs. No fluff. No prices
- Geo spice: Mention the city once per section; use a neighborhood every 2–3 sections
- Keyword use: Include "[Service] in [City]" in H1 or the first 100 words of the page

Depth and readability

- Each H2 section expands to roughly 300–350 words of finished prose. At that length a section needs internal structure: propose **H3 subheadings** (`### Subheading`) for any section covering more than one idea.
- H3s must follow their H2. Never skip from H1 to H3.
- Propose a **list** (`- item`, or `1. item` when order matters) wherever the content is steps, options, or what-is-included — not prose.

Complete Output Structure

1. H1 (include Service and City name, engaging format)

2. Intro paragraph outline (bullets only)
   - Localizer: "In [City], …"
   - What this page covers (the service + common use cases)
   - Light expectations (availability / next steps)
   - Value promise tied to GBP Primary Category

3. H2 Proposals (4–6 statement-style H2s built from PAA)
   - Statement H2s, not questions
   - Each H2 maps to distinct job (diagnose, decide, prepare, perform, verify, prevent)
   - Prioritize "ready-to-book" intent over research
   - Add city only where natural
   - Exclude pricing, brand comparisons, warranties

4. Featured Snippet + AI Overview target (outline only)
   - Target question with "[Service] in [City]" variant
   - Why this wins explanation (one bullet)
   - Answer shape: Definition (2–3 sentences + 3 bullets) OR Steps (5–7 numbered steps)
   - Length cap: ≤115 words

5. Main Sections (for each approved H2)
   - Audience/use case in [City]
   - Key benefit or what to expect
   - One local factor (climate, building type, regulation, seasonality, neighborhood)
   - Proposed H3 subheadings (where the section covers more than one idea)
   - Proposed list (where steps/options/inclusions are the natural shape)

6. FAQs (4–6 local, intent-matched questions)
   - Questions drawn from PAA, rephrased for booking intent
   - One-line answer notes each
   - Avoid pricing and guarantees

7. Final Assembly (complete outline in order above, bullets only)
