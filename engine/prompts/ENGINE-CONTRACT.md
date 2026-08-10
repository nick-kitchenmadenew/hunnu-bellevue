# Engine contract

**Append this to `05-write-from-outline.md` at generation time.**

The five prompts are editorial — they decide what the page says. This file is
mechanical: what the engine requires in order to build the page at all. Kept
separate so the prompt wording stays the author's and the engine's rules stay
maintainable in one place. Neither is complete alone.

Everything below is enforced. A violation is a build failure or a linter error,
not a style note.

## Links: the `[[anchor]]` marker

**Never write an `<a>` tag or a markdown link.** The template injects links; the
prose only marks where one goes.

A section that carries an in-silo link is declared in frontmatter, not in the
body — `to`, `heading`, `anchor`, and its `paragraphs`. **Exactly one of those
paragraphs must contain the literal token `[[anchor]]`.** `content-config.ts`
refuses the page otherwise:

> *exactly one paragraph must contain [[anchor]] — the link needs one home, and
> it must sit inside its context rather than follow it*

and `prose.js` throws at render time on a linked section with no marker.

The paragraph holding `[[anchor]]` becomes the link's 70–100 word context. That
is why a 450-word section cannot be one block: split it so the marked paragraph
is the right length.

Anchor text must be **unique site-wide** — the linter maintains a registry and
errors on reuse. It must also not be generic: `learn more`, `read more`,
`click here`, `contact us`, `get a quote` and similar are rejected outright, as
is the business's own name.

## Frontmatter

No prompt produces this; it is written alongside the body. Required on every
page:

| Field | Notes |
|---|---|
| `type` | `pillar` \| `service` \| `location` \| `utility` \| `hub` \| `supporting` |
| `silo` | The GBP category this page belongs to; checked against config |
| `title` | 20–80 chars. Carries the **re-themed** keyword. Google truncates near 60 — the linter warns past that |
| `description` | 70–170 chars |
| `h1` | On a **pillar**, must carry the GBP category verbatim |
| `lede` | Sits under the H1 |
| `sections` | Array, min 2. Which sections exist — order is fixed by the template, not here |

Optional and worth knowing: `eyebrow` (on a re-themed page this is where the
target keyword goes, because the H1 is reserved for the category), `hero`
(either `single`, or both `slug` and `ext` — never both, never neither),
`featured_services`, `plainHero`.

The writing prompt's meta title/description output maps to `title` and
`description`.

## Headings

- **One H1 per page**, and it must name the place.
- `## ` delimits a **section**. The slot machinery counts prose blocks by it.
- `### ` is a subheading **inside** a section and renders as a real `<h3>`.
  Supported — `ProseBlocks.astro` matches `/^###\s+/`.
- **Never skip a level.** H1 → H3 with no H2 between is a linter error.
- `<!-- level: 3 -->` on a section renders that section's *own* heading as an
  H3 rather than an H2. Different thing from a `###` inside the section: this
  demotes the whole block. Don't combine the two — a `###` inside an already
  demoted section produces two sibling H3s and reads flat.
- No links inside headings. No empty headings. Duplicate H2 text across one
  page is flagged.

## Lists

`- item` for unordered, `1. item` for ordered — one item per line, inside a
prose paragraph block. `ProseBlocks.astro` picks the tag. A one-item list whose
text still contains a marker means the line breaks were lost; the linter
catches that.

## Word floors

Hard build failure below these:

| Page type | Floor |
|---|---|
| `pillar` | 1,500 |
| `service` | 1,500 |
| `location` | 1,000 |
| `supporting` | 1,000 |
| `hub` | 800 |
| `utility` | none |

**A pillar's floor is met across all its sections, not by the services band
alone.** `ORDER.pillar` has eighteen possible sections; the category outline
prompt covers H1, intro and `services`. The rest — `prose`, `process`,
`compare`, `faq`, `cta` — carry the remainder. Writing only the services band
and expecting 1,500 words is what forced an earlier build to pad its pages.

Guidance inside the floor, from `CONTENT-BRIEF.md`: pillar sections 80–100
words each (one per service); service sections 300–350 words each (one per
aspect); real paragraphs of 50–90 words.

## Silo rules

- Links go **down** (pillar → service) or **up** (service → pillar). Never
  sideways to a sibling, never across silos. `checkLink` rejects both.
- A `supporting` page's `uplink` is compulsory and is its only link — it points
  at the page it supports.
- A `location` page may link only to its parent, the root.
- Nav and footer links are chrome and exempt; body prose is not.

## Re-theming

When a silo has a `retheme` value, the split is:

- **URL** → the GBP category
- **H1** → the GBP category, verbatim
- **Title tag** → the re-theme (the target keyword)
- **Body** → the re-theme throughout; the category is not repeated after the H1

The linter enforces all four. On a re-themed page a title/H1 mismatch is
*required* — generic SEO tooling flags it as an error, and here the match would
be the error.

## Facts

Every factual claim is auditable. After the page is written, run
`FACT-AUDIT.md` before promoting it out of `drafts/`. Where
`claims-<entity>.yaml` exists, the linter checks the page against it.
