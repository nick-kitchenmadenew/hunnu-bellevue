# The Core 30 methodology

What the course actually teaches, synthesized from the eleven lesson videos
in `course-transcripts/`. Organized by topic, because that is how it gets
consulted mid-work — not by video.

**This is a faithful record, not our opinion.** Same discipline as
`CORE30-LEARNINGS.md`: what Caleb teaches goes here unchanged. What *we*
have concluded from applying it goes in `CORE30-APPLIED-PRINCIPLES.md`.
What is true for one client only stays in that site's own `OPERATIONS.md`
and `DISCREPANCIES.md`. Never blur the three.

**Read this file by section, not end to end.** Grep for the heading you
need. The raw transcripts are an audit trail — normal work should not open
them. If an answer is missing here, fix this file rather than re-reading
captions.

**Fidelity:** the lessons are verbatim, timestamped transcripts, so wording
is trustworthy. Where the automatic transcription is garbled, it is flagged
inline rather than guessed at. Lesson-derived statements are canonical;
`CORE30-FAQ.md` (from weekly calls) may add nuance to them but never
overrides them.

## Source lessons

| # | Lesson | Covers |
|---|---|---|
| 1 | How to Structure the Core 30 | The page architecture, target keywords, the three phases |
| 2 | Core 30 Content Audit | Auditing an existing site against the structure |
| 3 | Structure for Multiple Locations | Multi-GBP builds |
| 4 | Building More Topical Relevance | Phase 2 — supporting content from PAA |
| 5 | Building More Geographical Relevance | Phase 3 — landmark pages |
| 6 | Creating an "About" Page | E-E-A-T, proving a real author |
| 7 | Local Business Schema | What schema, where it goes |
| 8 | Technical Audit | Screaming Frog + AI, large sites only |
| 9 | How ChatGPT Makes Recommendations | LLM visibility vs. Google ranking |
| 10 | Re-Theming a GBP Category | When the target keyword is not a GBP category |
| 11 | Internal Anchor Text Guidelines | Topic/variation silos and link circles (non-local) |

---

## The page architecture

The structure follows the Google Business Profile. The GBP is the blueprint;
the site mirrors it.

**The GBP landing page.** For a single-location business this is almost
always the homepage. For multi-location, each GBP gets its own landing page
(see *Multiple locations*).

**One URL per GBP category.** A GBP carries up to 10 categories — a primary
plus the rest, which the course calls secondary categories. Every one gets
its own dedicated page.

**One URL per GBP service.** Same rule. A real business should have more
than the eleven services used in the lesson's example.

**The homepage carries a block per GBP category.** Each gets a subheading, a
block of body copy, and — inside that copy — a link to that category's
dedicated URL.

> The transcript states the block length as "5200 words… that 5100 word
> block," which is garbled automatic transcription (both figures appear
> within two seconds of each other and neither is plausible for a homepage
> section). The intended figure is not recoverable from the transcript.
> Treat block length as unspecified here rather than inventing one.

**Two or three critical services also link directly from the homepage.**
Not all of them — only the high-profit jobs the client most wants (the
lesson's example: water heater replacement, main drain line replacement for
a plumber). These are also what gets tracked on the local rank map.

**A locations page.** A standard one is part of the Core 30 from the start;
it becomes load-bearing in Phase 3.

**Naming.** "Core 30" is the count of category + service pages for one GBP.
Three GBPs makes it "a Core 90" — the structure is rebuilt per location, not
shared.

## Target keywords

The rule is positional — which page a URL is decides its keyword:

| Page | Target keyword |
|---|---|
| GBP landing page (usually homepage) | primary GBP category + city |
| Category page | that secondary GBP category + city |
| Service page | that GBP service + city |
| Supporting content (Phase 2) | PAA question + city |
| Landmark page (Phase 3) | category or service + geographic landmark + city |

**The exact-match phrase goes in both the title tag and the H1.** Extra
words around it are fine and expected — "Find out why we're the best plumber
in Chicago 2025" is a valid title for target keyword *plumber Chicago*.

The single exception is re-theming a GBP category — see that section.

## The three phases

An engagement moves through these in order, and the **local rank map decides
when to advance** — not a schedule, not word count.

1. **Build the Core 30.** Every category page, every service page, external
   links sourced to them.
2. **Topical relevance**, if the rank map still looks poor after Phase 1.
3. **Geographic relevance**, once roughly a third of the rank map is green.

Phase 3's trigger is stated precisely: about one third green, with rankings
strong close in and falling off with distance — the signature of proximity
being the remaining constraint rather than relevance.

## Phase 2 — topical relevance

**Trigger:** the Core 30 is built, external links are sourced, and the rank
map still looks bad.

**Finding the questions.** Search your category or service in Google
*without* the geographic modifier ("plumber", not "plumber Houston"), then
scroll to People Also Ask. If there is no PAA block, add "how" or "what" to
the query. Repeatedly expanding and collapsing PAA entries keeps generating
more — several dozen questions are obtainable this way.

**Writing the FAQ entry** (on the category or service page):

- Rewrite the PAA question **semantically rather than exact-match** — this
  changed after summer 2023; exact-match H2s were the older guidance. Use AI
  for the rewrite.
- The rewritten question, plus the city, becomes an H2.
- **Answer in the first few words**, echoing the question's own phrasing:
  *"How much money does a plumber make in Houston"* → *"A plumber in Houston
  makes between $75,000 and $120,000 per year on average."* The repetition
  is deliberate — it is what makes the answer unambiguous to the algorithm.
- 50–75 words total in that paragraph.
- Inside that paragraph, link to a long-form article on the same question.

**The long-form article:** ~1,500 words, target keyword is the question with
the city in it, written specifically for that city. It carries a contextual
editorial link back up to the page holding the FAQ — the raw URL is fine, it
does not need to deep-link to the question. Source an external link to it.

**Cadence:** three to five articles per month per topic, budget permitting,
**alternating topics month to month.** Rank-map movement lags content, so
alternating avoids over-producing for a topic that was already going to
improve.

## Phase 3 — geographic relevance

**Trigger:** roughly a third of the rank map green.

**Pick the target by rank position, not by geography.** Look for a **4, 5,
or 6** on the map — ideally a 4 or 5. The logic is margin: moving a 4 into
the top three is a win; moving a 6 to a 4 changes nothing that matters.

**Find a landmark.** Zoom into that point, cross-check against Google Maps,
and take any geographic landmark — a neighbourhood, park, lake, monument, or
major intersection. Neighbourhoods are convenient where they exist (Chicago
is the lesson's example) but are not required.

**Write the landmark page.** Target keyword is the category or service being
improved, plus the landmark, plus the city. Content can take any of three
angles: jobs done near that landmark, what makes jobs there different from
elsewhere in the city, or something genuinely distinctive about the landmark
itself, woven back to the service. **Include driving directions from the
landmark to the GBP.**

**Wire it up.** The locations page carries a few hundred words on the
service area overall and links to every landmark page; each landmark page
links back to the locations page. Source an external link to every landmark
article.

## Multiple locations

**Run a local rank map before touching any GBP landing page.** This is the
hardest rule in the lesson and it is stated three separate ways: moving a
GBP's landing page loses rank position. Moving it *away from the homepage*
loses rank position.

The worked example: a client with eight locations, all eight GBPs pointed at
the homepage, six ranking well and two not. The two that were not ranking
got new landing pages. **The six that were ranking were left alone.**

**Structure.** Each additional GBP landing page is treated as its own
homepage, with the full category/service/supporting hierarchy rebuilt
beneath it. These pages can sit under the locations page or be linked
directly from the homepage — either is fine.

**Which location gets the homepage.** The homepage is almost always the most
powerful URL on the domain, so it goes to the location you most want to
rank — subject to the rule above: if an existing GBP already points there
and ranks, moving it costs rank. That is a conversation with the client, not
a decision to make silently.

**Every GBP needs its own phone number.**

Roughly 90% of a local business's website traffic goes to the GBP landing
page (from Google Analytics across their clients) — which is why these
function as mini-homepages rather than as ordinary location pages.

**High-competition markets only:** build a *second* set of category and
service pages whose target keywords carry no city, and put that set in the
navbar. This stops a visitor in Miami clicking a navbar link targeting New
York City. It roughly doubles the content required, so it is not done for
every client.

**Navbar links are minimized** in general; the structure runs on editorial
links in body copy.

## Re-theming a GBP category

**Only applies when the target keyword is not a GBP category at all.** Most
home-service businesses can skip this entirely — plumber, roofer and the
like are already categories.

The worked example is *car accident lawyer Houston*: a high-value keyword
with no matching GBP category. The closest category is *civil law attorney*,
taken as a secondary category (with *personal injury attorney* as primary).

| Element | Value | Why |
|---|---|---|
| URL | exact match to the **GBP category** (`/civil-law-attorney`) | Proves site/GBP consistency |
| Title tag | the **target keyword** (*car accident lawyer Houston*) | What we actually want to rank for |
| H1 | exact match to the **GBP category** (*civil law attorney Houston*) | The one documented exception to H1-matches-title |
| H2s | about the target keyword | The real topic |
| H3s | keyword qualifiers and modifiers, bulleted | |

Past the URL and H1, the page does not keep talking about the category — the
body is about the target keyword.

**Note the general rule embedded here:** exact-match URLs for GBP secondary
categories are standard practice for every secondary category, not just
re-themed ones.

Title tags should use numbers, brackets and parentheses to improve
click-through — the exact-match keyword is a requirement, not the whole tag.

## Internal linking: topic silos and link circles

From lesson 11, which is framed for **non-local** sites (its file name says
"Internal Anchor Text Guidelines"; the content is the topic/variation
structure). The linking pattern is the transferable part.

Built on a topical relevance map: ask AI for ~30 topics from the target
keyword, then ~15 variations per topic.

- The topic article links **down** to each of its variation URLs, from a
  section of text actually relevant to that variation.
- Each variation links **back up** to its topic.
- Variations link to each other in a **circle** — 1→2, 2→3, 3→1 — extended
  however far the list runs.
- Supporting content repeats the pattern one level down, treating the
  variation as the topic.

**Never link across topics.** Topic 4's variation must not link to topic 1.
The silos stay separate; that separation is what builds topical relevance
quickly.

Source at least one external link to each piece.

## Local business schema

**Goes on the GBP landing page only** — not on every URL of the domain. For
multi-location, on each location's own landing page.

**Every field matches the GBP exactly:** business name (exactly as on the
GBP), business type (the primary category), description (the GBP
description), address, phone, email, website URL, opening hours, service
area, social profiles.

Latitude and longitude come from right-clicking the location in Google Maps.
Also include: logo URL, other image URLs, payment methods, and price range
(dollar signs — omitting it produces a warning).

Generate it with AI, then **validate in Google's structured data testing
tool** — the lesson is explicit that the model makes mistakes here.

## The About page

The purpose is E-E-A-T: making it obvious to Google that a **real, specific
person** is behind the content. The lesson is blunt that an AI-generated
face plus an invented story worked five years ago and does not work now.

Required:

1. A method of contact.
2. A personal story, ideally verifiable elsewhere on the internet.
3. An author bio box with an image.
4. Links to social profiles — Facebook, LinkedIn, X, optionally Pinterest,
   Instagram and others. They should be genuinely created and at least
   moderately active, showing the **same person but not the same photo** on
   every profile.
5. Multimedia of the person. **Video is ideal**; multiple images from
   different angles and lighting is the minimum. The reasoning is explicitly
   adversarial — one reused image is trivially AI-generated, and varied
   media raises the cost of faking.
6. For a **non-local** business: create a GBP and point it at the About
   page. (A local business points its GBP at the homepage or location page
   instead.)

## Content audit — auditing an existing site

Run when taking on a client with an existing site, to find what is missing
against the Core 30 structure. **Used for clients and near-clients, not
prospects.**

Inputs:
- Homepage content, copy-pasted into a document.
- The GBP's secondary categories and services list.
- Screaming Frog exports: `internal_all.csv` and `links_all.csv`. Screaming
  Frog is free under 500 URLs.

Use a **reasoning model** — the lesson prefers ChatGPT's o1 over Claude for
this specific analysis, noting Claude handles it fine if you are not paying
for ChatGPT.

**Known failure mode:** the model will usually first claim it cannot read
the CSVs and answer theoretically. Tell it the files were provided and to
use them; it will then parse them properly.

Output names the missing category pages, missing service pages, homepage
gaps, and next steps.

## Technical audit

**Not run for every client** — only the largest *websites* (the lesson's
example has 1,400 URLs, which needs a licensed Screaming Frog since the free
tier stops at 500).

Set up a PageSpeed Insights API key first (Screaming Frog → Configuration →
API Access → PageSpeed Insights); the crawl runs considerably slower with it
connected.

Export: internal_all, page titles, meta descriptions, response codes,
images, canonicals, structured data, page speed, links, directives. Search
Console data is optional.

Analyze with **Claude Opus**. The output is an executive summary plus a
local SEO health score.

**Route findings by owner** rather than fixing top to bottom — page speed
and image optimization go to the developer; schema and thin content to
staff. Several categories of finding (local schema, NAP consistency,
geographic keywords in titles) are deliberately deprioritized here because
the other audits catch them anyway.

Re-run after remediation and give the client both scored PDFs.

## How ChatGPT recommends businesses

ChatGPT faces the problem Google solved 25 years ago: deciding whether a
third-party business is trustworthy using only what is on the internet.
Neither platform is trying to identify *you*; both are asking whether enough
sources they already trust agree the business is legitimate.

Differences that change tactics:

- **ChatGPT does not crawl.** It draws on the Bing API, pre-trained data
  (through 2023), and real-time search that leans on Bing more than Google
  does.
- **Recency matters far less** than it does to Google. Years-old material
  gets cited if it is relevant.
- **Exact-match keywords are essentially ignored**; it runs on semantic
  similarity.
- **Reviews are read for their substance.** Not "best plumber" — which reads
  as spam — but attributes: fast, clean, well-priced. Reviews that
  consistently mention similar attributes make a recommendation more likely.
  It reads reviews everywhere it can find them, not only Google.
- **Brand mentions, not links.** High-trust environments — Reddit, local
  news, forums, Quora, Nextdoor — need only to *mention the business name*.
  For Google the same placements would need actual links.
- **Schema matters more than it does for Google.** Local business schema and
  FAQ schema, with clear answers to service questions embedded in the
  schema itself.

The summary: **Google ranks websites; ChatGPT recommends businesses.**
Ranking well on Google is itself a trust signal to ChatGPT, and most of what
earns Google rankings also earns ChatGPT recommendations — the items above
are additions, not a separate program.
