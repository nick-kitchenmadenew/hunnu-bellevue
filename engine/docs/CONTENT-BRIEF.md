# Content Brief — what the generator should produce

For whoever writes the content-generator prompt. Everything here comes from
importing two real exports (Cabinet maker, 2026-07-25; Painter, 2026-07-26) and
fixing what broke.

**The engine handles structure. You handle words.** Links, schema, breadcrumbs,
band colours, section order, image placeholders and the whole silo are generated
and enforced — you never write an `<a>`, never write JSON-LD, never decide what
order sections appear in. What the engine cannot do is write, and it cannot fix
prose that is at the wrong level of detail.

---

## 1. The rule that matters most

**A pillar page section is a 90-word summary. The depth goes on the service page.**

A pillar exists to make its service pages worth clicking. A section that answers
everything leaves the child page nothing to say and no reason to be visited.

Observed on the Painter export:

| Section | Words | |
|---|---|---|
| Kitchen Cabinet Painting | 83 | fine |
| **Spray Painting** | **448** | five times the others |
| Color Consultation | 89 | fine |
| Wood Staining | 109 | fine |
| **Wood Painting** | **503** | five times the others |

The two long ones contained waterborne alkyd brand comparisons, front-door
substrate behaviour, coffered-ceiling technique and trim colour names. All good
material. All of it belongs at `/oakville/painter/wood-painting/`, and 783 words
had to be moved by hand.

**Target: every body section 80–100 words.** If a topic needs 450 words, that is
the generator telling you it is a service page, not a section.

For comparison, the homepage's eight sections run 81, 82, 86, 88, 89, 98, 99, 99.

---

## 2. Section topics must be services in this page's own silo

Each `<h2>` should correspond to a **GBP service belonging to this page's
category**. The engine matches headings to services by prefix, so
"Spray Painting for a Factory-Smooth Finish" resolves to "Spray painting".

A heading that resolves to a service in a *different* silo cannot carry a link —
Core 30 forbids linking across silos — so the section does no structural work at
all.

- **Painter export: 5 of 5 resolved.** Good.
- **Cabinet maker export: 1 of 10 resolved.** Eight of its ten sections described
  Kitchen remodeler or Countertop contractor services. Nine sections of prose, one
  usable link.

Take the service list for the category straight from the GBP profile. Do not
invent services, and do not write about a sibling category's work.

---

## 2b. A service page is the opposite of a pillar

The rules above describe a **pillar**. A service page inverts two of them, and the
first import of one (`kitchen-cabinet-refacing`, 2026-07-26) got both right — this
is written down so the next four do too.

| | Pillar | Service page |
|---|---|---|
| Sections are | one per service, 80–100 words | one per aspect of **this** service, 300–350 words |
| Links | down, to each of its services | **one link, up**, to its pillar |
| May write about | its own services | itself only |

**A service page must not describe its siblings.** Refacing does not get a section
on refinishing. That is a lateral link arrived at through prose — Core 30 forbids
the link, and writing the section without the link is worse: the page does the
competing without getting the connection.

**Depth belongs here.** The refacing export ran 1,739 words of `post_content` over
five sections averaging 340 words each, and that is correct — the same 340-word
section on a pillar would be the defect described in §1. Both floors are 1,500
rendered words, but a pillar reaches it across many shallow sections and a service
page across few deep ones.

**The up-link is not generated.** It argues for the *parent*, not for the page it
sits on, so the importer leaves it as a TODO — 70–100 words on why the wider
category is worth reading, with a unique anchor. Nothing in the export can supply
that, so do not try to write it in the CSV.

**Ordered lists survive now.** `<ol>` renders as a numbered list and `<strong>`
survives as bold, so a process written as numbered steps arrives as numbered steps.
Before 2026-07-26 both were silently flattened.


## 3. Paragraphs, and where the link will go

Write **real paragraphs of 50–90 words**. The engine picks one to carry the
in-silo link, and Core 30 wants that link surrounded by 70–100 words of context.

- One 450-word block gives it nothing to choose from.
- A 60-word section gives it nothing long enough.
- Several 50–90 word paragraphs let it pick cleanly, and it will join two short
  adjacent ones if it has to.

**Never write a link.** The generator should emit zero `<a>` tags — it already
does, correctly. Anchor text is chosen from a site-wide registry so it stays
unique, and is injected into a sentence. If a paragraph is written so tightly
that no phrase can become a link, that paragraph has to be reworded by hand later.

## 3a. Subheadings and lists inside a section

Two markers break up a long section, and both are already supported —
`ProseBlocks.astro` picks the tag, the same way it does for a paragraph:

- `### Subheading` renders a real `<h3>` **inside** the section. Use it wherever
  a section covers more than one idea; a 300–350 word service section usually
  wants one or two. Never skip a level — an `###` with no `##` above it is a
  linter error.
- `- item` and `1. item`, one per line, render as `<ul>`/`<ol>`. Reach for a
  list where the content is steps, options, or what-is-included. Directions in
  particular read far better numbered than as prose.

Distinct from `<!-- level: 3 -->`, which demotes a section's *own* heading from
H2 to H3. Don't combine them: a `###` inside an already-demoted section gives
two sibling H3s and reads flat.

---

## 4. Re-theming: the category and the keyword are different words

Some categories are re-themed. **Painter** is targeted as **Cabinet painting**.

| Element | Uses | Painter example |
|---|---|---|
| URL | the GBP category | `/oakville/painter/` |
| H1 | the GBP category + city | "Painter in Oakville" |
| `meta_title` | **the target keyword** + city | "Cabinet Painting Oakville \| Kitchen Made New" |
| body, H2s, FAQ | **the target keyword** | "cabinet painting" throughout |

**After the H1, the category is never mentioned again.** The Painter export used
"Painter in Oakville" as its `meta_title` — the category twice, the keyword
nowhere — and said "painter" three more times in FAQ answers. Both had to be
rewritten.

The engine now regenerates the title from the re-theme rather than trusting
`meta_title`, and the linter fails a build where a re-themed page's title carries
the category. But the body is yours.

**A pillar must not target a term one of its own services owns.** The Painter
pillar targets "Cabinet painting" — the category, covering doors, built-ins and
trim. `kitchen-cabinet-painting` owns "Kitchen cabinet painting" specifically.
Parent and child competing for one query is a self-inflicted wound that a
parent/child link does not fix.

---

## 5. Fields that arrived broken

**`hero_subheadline` was truncated mid-word** on the Painter export:
`"…operating since 2012 wi"`. It is the hero lede, the second thing anyone reads,
and it was also copied into the CTA. Check the field is complete before export.

**`target_city` was empty on both exports** despite "in Oakville" being in the
title. The engine fills it from config, but it should not have to.

**`meta_description` claimed services the business does not offer.** The Painter
one advertised *"interior, exterior, and specialty painting"*. Exterior painting
is not a GBP category, not a listed service, and not on the van. That is not an
SEO problem — it generates enquiries for work that cannot be quoted.

Write the description from the page's own content, under **155 characters**,
carrying the target keyword.

**Discarded on import, so do not spend effort on them:** `schema_json`,
`schema_markup` (byte-identical duplicates, with a double slash in every `@id`),
`hero_bg_color`, `hero_primary_color`.

---

## 6. FAQ

Six to eight questions **about this page's topic**. The Painter export included
*"When should I call a painter for trim and doors versus just doing it myself?"* —
a trim question, on a cabinet-painting page, using the category twice.

Ask what customers actually ask about the thing this page sells. For a painting
page that is cure time, durability, colour choice, whether the doors come off.
Answer in 40–60 words, plainly, and do not hedge.

The FAQ is rendered and turned into `FAQPage` schema from what rendered, so the
two can never disagree.

---

## 7. Word counts

| Page type | Floor |
|---|---|
| Pillar | 1,500 |
| Service | 1,500 |
| Location | 1,000 |

Measured on the **rendered page**, not on `post_content`. The template adds the
hero, gallery captions, consultation block, reviews, FAQ and CTA, which is
typically 600–800 words. The Painter export's 1,205 words of `post_content`
rendered as 1,837.

A pillar also needs sections that are *about the category rather than about one
service* — what the work is, how it differs from the obvious alternative, how the
job runs, where you work. The Painter export had none: every H2 was a service, so
once the over-long ones were trimmed the page fell under the floor and four
pillar-level sections had to be written by hand.

**Aim for: an intro, a comparison against the obvious alternative, a process, an
area-served section, plus one 90-word section per service.**

---

## 8. Checklist before export

- [ ] Every `<h2>` is a GBP service **in this page's category**
- [ ] Every section 80–100 words
- [ ] Paragraphs 50–90 words, several per section
- [ ] Pillar has intro / comparison / process / area-served sections too
- [ ] Zero `<a>` tags
- [ ] `meta_title` carries the **target keyword**, not the category
- [ ] Category does not appear in the body after the H1
- [ ] `meta_description` under 155 chars, only claims real services
- [ ] `hero_subheadline` complete, not truncated
- [ ] `target_city` filled
- [ ] FAQ is about this page's topic

---

## 9. What happens after export

```
python3 audit-tool/import_csv.py <csv> --silo "<GBP category>"
python3 site/scripts/placeholder.py      # plates for images not yet supplied
cd site && npm run check                 # drift, silo rules, build, lint
```

The importer reports what it could not decide — anchors, word shortfalls, an
empty `target_city`, a regenerated title. The linter reports the rest. Neither
will invent content, and neither will quietly accept a page that breaks a rule.
