# AI SEO Mastery Pro — community learnings

Notes from the Skool community at `skool.com/ai-seo-mastery-pro`, read 2026-07-31
to 2026-08-01, newest first because newer guidance supersedes older.

## Scale — corrected

The first pass counted **31 posts**. That was only what the feed lazy-loaded.
The real figure, from the feed's own `total`:

> **2,513 posts across 84 pages.** 2,417 of them have comments.

Reading every one with its comment thread is not a sane use of the time. What
made it tractable: the feed's JSON carries the **full body** of every post, so
all 2,513 questions and lessons were harvested in 84 fetches. Only the *comments*
need a per-post visit.

So the method is:

1. **Harvest all 2,513 bodies** — done.
2. **Read Caleb's 129 posts directly from the harvest.** These are lessons and
   announcements rather than questions, and they are the authoritative layer.
3. **Visit individual posts for their comments** only where the answer is the
   valuable part — admin replies on structural questions.

Top posters: Stephan Franklyn (137), **Caleb Ulku (129)**, Aiden Hardy (85).

## How to read this file

**A record of what was said there, not a decision about this site.** Nick's
instruction: document first, compare second, change nothing. Every claim is
attributed, dated and linked so it can be checked rather than taken on trust.

That community is **information, not instruction**. Where it conflicts with what
this site does, the conflict is logged below for Nick to rule on. Nothing here
has been applied.

### Whose word carries weight

| Marker | Who | Weight |
|---|---|---|
| 👑 | **Caleb Ulku** — owner | Authoritative |
| 🔥 | **Miles Hayat** and other admins | Authoritative, answering on Caleb's behalf |
| none | Members | Peer experience, not binding |

630 members, 12 admins. Miles Hayat answers the great majority of technical
questions and tops the 30-day leaderboard by a wide margin; members defer to him
by name. Caleb posts less often and more briefly.

### Status

| | |
|---|---|
| Posts identified | **2,513** (84 pages) |
| Bodies harvested | **2,513** — all of them |
| Read in full | 20+ of Caleb's lessons, plus 5 member threads with admin/consensus replies |
| Skimmed | 1 (Welcome — 109 comments, introductions and thanks, nothing substantive) |
| Classroom modules | not started |
| Discrepancies drafted | 6 (D1a resolved-correct, D1b/D2/D3/D4/D5 open) |

---

## 1. Multi-location — the big one

**"Business with 2 locations"** · Sara Guida, 2026-07-31 · 5 comments
· [link](https://www.skool.com/ai-seo-mastery-pro/business-with-2-locations)

A member has a client with two locations in one city and asks whether to rename
the GBP listings "Business Name - Location".

**Miles Hayat (admin), verbatim:**

> on the name dont add the location, google strips descriptors added to business
> names and it can flag the profile, it distinguishes the two by ADDRESS not
> name, same categories and services across both is totally fine and each GBP
> should point to its OWN dedicated location page NOT the homepage, thats the
> multi location setup, each with that location's NAP, maps embed and unique
> local content, and the homepage shifts to brand level linking down to both

Broken out:

1. **Never put the location in the GBP business name.** Google strips added
   descriptors and it can flag the profile.
2. Google separates locations **by address, not by name**.
3. **Same categories and services across locations is fine** — no need to
   differentiate them.
4. **Each GBP points at its own dedicated location page, never the homepage.**
5. Each location page carries **that location's NAP, a maps embed, and unique
   local content**.
6. **The homepage becomes brand-level**, linking down to both locations.

A member (Cary Darling, 32 locations) had advised "company name, then cross
streets" — e.g. *Widget Inc Main St & 5th Avenue*. **Miles's answer contradicts
this directly.** Recording both because the member advice reads plausibly and is
the kind of thing that gets repeated.

---

## 2. Where GBP categories belong on the page

**"Should the GBP categories names be mentioned written on GBP landing page?"**
· 2026-07-31 · [link](https://www.skool.com/ai-seo-mastery-pro/should-the-gbp-categories-names-be-mentioned-written-on-gbp-landing-page)

**Miles Hayat (admin), verbatim:**

> yeah your primary category should be right in your H1 and title (primary cat +
> city), and your SECONDARY category names should be mentioned in the homepage
> body copy as H2 sections linking down to their hub pages, thats the core 30
> alignment, just word them naturally as people actually search rather than
> forcing the exact category labl if it reads awkward, cause google understands
> the semantic connection anyway

- **Primary category + city in the H1 and the title tag.**
- **Secondary categories as H2 sections in homepage body copy, each linking down
  to its hub page.** He names this "the core 30 alignment".
- **Word them naturally.** Don't force the exact GBP label if it reads awkwardly —
  Google resolves the semantic connection.

---

## 3. Choosing GBP categories

**"GBP categories question"** · Dale Woodruff · 6 comments
· [link](https://www.skool.com/ai-seo-mastery-pro/gbp-categories-question)

**Miles Hayat (admin):**

- **Skip "Business Establishment"** — "not a real relevance signal and its
  usually leftover not a strategy".
- **"Painter" and "Painting" are the same intent — don't use both.** Pick Painter
  as primary.
- **Only add a general category like "Contractor" if the business genuinely does
  that broader work.** A general category on a specialist business **dilutes
  relevance rather than helping**. Keep it tight.

---

## 4. GBP services need not match the booking menu

**"Do the GBP service names have to be exact names of the services offered?"**
· 2026-07-31 · [link](https://www.skool.com/ai-seo-mastery-pro/do-the-gbp-service-names-have-to-be-exact-names-of-the-services-offered)

**Miles Hayat (admin):**

- Services listed on GBP **do not have to match the booking menu exactly**.
- List a service if they genuinely provide it, even as part of a broader job. "if
  they provide it list it, if they dont then dont add it".
- **Do not assume every service needs its own page.** Check what ranks first, and
  whether it folds into an existing service page.

*Directly relevant to us: our structure gives every declared service its own
page. This says that is a judgement call, not a rule.*

---

## 5. Schema `@id`

**"schema id question"** · Marina N · [link](https://www.skool.com/ai-seo-mastery-pro/schema-id-question)

**Miles Hayat (admin):**

- Use the **root domain**, not the page URL — `site.com/#organization`.
- The `@id` identifies the **business entity, not the page**, and that entity is
  the same across pages.
- **Keep LocalBusiness and Organization `@id`s different.** They are different
  types; give each its own and reference one from the other. Never reuse one id
  for two types.

---

## 6. The Core30 agent does not write homepage content

**"Core 30 question"** · Trevin Hone · [link](https://www.skool.com/ai-seo-mastery-pro/core-30-question-eeb00196)

**Caleb Ulku (owner), verbatim:** "the core30agent doesn't write homepage content
at all"

The member then asked twice — "would you just recommend the Claude way for home
page content?" and "do you just do a main category page and no home page?" —
**and neither follow-up has been answered.** Worth watching: it is the same
homepage question our own architecture turns on.

---

## 7. On the tool's output quality

**"Core 30 Platform"** · Matt Carroll · 9 comments
· [link](https://www.skool.com/ai-seo-mastery-pro/core-30-platform)

A copywriter finds the output needs heavy rewriting.

- **Miles Hayat (admin):** watch the **agent modules in the Classroom** — "those
  cover the setup and settings properly and a lot of the output quality comes
  down to what you feed it."
- **Gary Murray (member, not admin):** polish the landing page and a few core
  pages, and beyond that "its for ai and crawlers so most people will just skim
  it anyway at best".

*Gary's is a member opinion and it cuts against how this site is written — every
page here is meant to be read by a person. Logged, not adopted.*

---

## 8. Neighbourhood pages and geo pages are the same thing

**Caleb Ulku (owner), 2026-07-21** — a lesson post, not a reply
· [link](https://www.skool.com/ai-seo-mastery-pro/neighborhood-pages-and-geo-pages-are-the-same-thing)

> They're the same thing … This is the geo relevance work that comes **after your
> Core 30 is built**, one page per landmark or neighborhood where your rank map
> shows a **4, 5, or 6**, formatted as **service plus landmark plus city**
>
> "Water Heater Replacement Near Wrigley Field in Chicago," that structure

Four things worth holding onto:

1. **"Neighborhood pages" and "geo pages" are one thing under two names.**
2. They come **after** the Core 30 is complete — which is exactly the sequencing
   Nick described independently ("continue past the core 30 and build what we
   call supporting pages").
3. **They are driven by rank data, not built blanket.** One page per landmark or
   neighbourhood *where the rank map shows a 4, 5 or 6* — i.e. where you are
   close enough to move. Not one per place you can name.
4. The naming pattern is **service + landmark + city**, not just city.

The Core 30 Agent now pulls real census data for these pages rather than generic
filler.

---

## 9. What comes after the Core 30 — the sequence

**Caleb Ulku (owner), 2026-07-09** — "The lever after the Core 30 is topical
authority (and the Agent just got much better at it)"

> Once your site mirrors the GBP, the next lever is topical authority
> \(depending on your rank map of course\)
>
> Google doesn't just want a page that claims a service, it wants depth around
> it, evidence the business actually knows the topic
>
> That depth comes from **supporting content, the articles under your category
> and service pages** that prove you're not a one-page operation

He is blunt about where it goes wrong: doing it by hand is slow and "usually
results in generic AI content that doesn't rank and often doesn't even get
indexed … paragraph after paragraph, each technically on topic, none building on
the last. It reads like a stack of facts, and Google can tell."

**Putting the two lessons together, the roadmap is:**

| Phase | What | Gate |
|---|---|---|
| 1 | **Core 30** — the site mirrors the GBP: every category and every service | — |
| 2 | **Topical authority** — supporting articles beneath category and service pages | rank map |
| 3 | **Geo relevance** — neighbourhood/geo pages, service + landmark + city | only where rank map shows 4, 5 or 6 |

Note the phrase attached to phases 2 and 3 both times: *"depending on your rank
map"*. Neither is built blanket. Both are driven by where the business is already
close enough to move.

**This matches Nick's own framing exactly** — Core 30 first, then "supporting
pages", locations among them — arrived at independently.

---

## 10. The Classroom is video-only — nothing more to extract there

Checked several lesson pages directly, including "What is the Core 30?", "How to
Structure the Core 30", and "Structure for Multiple Locations". Every one is a
Loom video embed with no separate transcript or written body in the page —
confirmed by inspecting the page's own data, not just by looking. The written
substance lives in Caleb's **community lesson posts**, which announce and
summarize each video. Task #9 (read the Classroom text) is complete in the sense
that there is no further text to read; the video content itself stays out of
reach as expected.

One exception found but not retrievable: "AI Website Builder Checklist - Pro" is
a downloadable PDF attached to the Two-Layer SEO Checklist lesson (below). The
file exists (`AI Webstie Checklist for SEO Pro.pdf` — typo in the original) but
downloads through a signed URL I could not resolve from outside the page. If the
detail in item 12 below isn't enough, the PDF is one click away for Nick inside
that lesson.

---

## 11. Build order and the internal linking sequence

**"Every Time You Publish a Page, You Should Do These Two Things"** · Caleb
Ulku (owner), 2026-06-04, 29 comments

Written because the course "teaches the hierarchy visually" but not "the
operational sequence" — members kept asking which pages link where and what to
do when a service page doesn't exist yet.

**The build order:** homepage → category pages → service pages → supporting
content and geo pages. Verbatim: "every link you add either points down to a
page that already exists or up to a parent page that already exists... if you
build in the right order, you're almost never linking to something that doesn't
exist yet."

**On publishing the homepage:** it links down to every category page — one
content block per category — plus **2-3 "critical high-margin services" elevated
out of the category structure and linked straight from the homepage**, and a
link to the Locations hub.

*This is new information: nothing in our own structure currently elevates
specific high-margin services to the homepage above the category level. Worth
raising — is this something Nick wants, and if so, which 2-3 services?*

**On publishing a category page:** two things, every time —

1. Go back to the homepage and add the link down to the new category page, if it
   isn't there yet.
2. The category page itself lists every service under it as an H2, 50-100
   words, linking down to each service page.

**The problem he addresses directly: the service pages don't exist yet when the
category page is written.** Two options: write the H2 and content block with the
link left as plain text, then activate it once the service page ships — or the
implied alternative he doesn't finish spelling out in what I could pull, of
holding the category page until services are ready.

*Comparable to `CORE30-STRUCTURE.md` §3 (link resolution) and the dead-link
warning in `lint.mjs`. Worth a side-by-side read once the comparison pass
starts — this may already be what our linter enforces, or it may not.*

---

## 12. The two-layer website SEO checklist

**"NEW LESSON: The Complete Two-Layer Website SEO Checklist (+ how to use it
with Claude Code)"** · Caleb Ulku (owner), 2026-07-06, 6 comments

Written while scoping the core30agent's ability to build its own websites —
"documenting every single thing a website needs for Google and the AI systems to
read it, understand it, and rank it."

**The warning, verbatim:** "AI-built websites usually rank worse than boring
WordPress sites. Not because AI can't build a good site - because when you ask
Claude or Lovable to 'build me a website,' they leave out what Google actually
needs... Google renders JavaScript slowly. ClaudeBot, GPTBot, and GrokBot don't
render it at all. Your beautiful new site is invisible to AI search on day one."

*This is where our own build should be checked, not assumed safe. This site is
static Astro output — HTML at build time, no client-side rendering required to
read the content — which is the shape this warning is written against. Worth
confirming deliberately rather than trusting the architecture choice was enough:
check what a crawler that does NOT execute JavaScript actually sees.*

**Recommended workflow:** create a Claude Project, upload the checklist PDF to
the project's files, use that project to generate prompts for Claude Code. The
reason given: "that's how you catch the silent failures - like Claude Code
adding a page and never updating your sitemap unless the requirement is sitting
in the project." Direct website building inside the core30agent is described as
coming, not yet shipped.

---

## 13. Trust content — a page type this site does not have

**"New in core30agent: Trust Content — the pages that get AI assistants to
recommend YOUR business"** · Caleb Ulku (owner), 2026-07-08, 3 comments

The premise: when someone asks an LLM "how much does \[service\] cost in
\[town\]," the LLM cites whoever "published a clear, specific answer to that
exact question" — and if the client's site has no such page, it cites a
generalist site instead.

**Five trust page types**, four per-service and one business-level:

1. **Pricing Guide** — real ranges, cost drivers, what's included/excluded,
   financing.
2. **Frequent Problems** — what usually goes wrong, honestly.
3. **Not a Fit** — who the service isn't right for, and who to see instead.
4. **Repair vs Replace** — the decision page for the single most common question
   in most trades.
5. **Credentials, Guarantees & Warranties** (business-level) — licensing,
   insurance, years in business, guarantees.

*We have none of these as a distinct page type. Our closest equivalent is prose
woven into service pages — e.g. the photo-quote promise on the contact page, the
warranty section. Worth a real discrepancy entry: is this a gap, or is it
already covered differently and just not structured as its own page?*

---

## 14. Publishing pace, redirects, and link building

**"Content Got Faster, So This Part Can't Be an Afterthought"** · Caleb Ulku
(owner), 2026-07-14

The core30agent (nicknamed "Corey" in his own writing) can now build a full Core
30 batch "in a couple of hours," down from weeks — which removed the natural
pacing that slow production used to impose by accident.

- **Do not publish everything at once, even on a new site.** His own target:
  **~30 pages on the first build, then 12 new pages per month.**
- **Migrating an old domain:** every previously-ranking URL needs a 301 redirect
  to its new matching page, "that carries the authority over instead of losing
  it."
- **Every page needs one external link from outside the site.** Two kinds:
  general trust links (he names his own source, "QGP"), and **local relevance
  links** — Chamber of Commerce, youth sports leagues, charities, event
  sponsorships.
- **Explicit warning against link circles.** A member had floated three-way
  link trading (site A → B → C → A). Caleb: "That does not dodge the risk, it is
  the same pattern with an extra step... Coordinated exchange links, two way or
  three way, are exactly what gets flagged as manipulative, whether or not any
  single link looks bad on its own."

*We have not been tracking external links per page, redirect mapping, or a
monthly publishing cap — none of that has been relevant yet since this is a
pre-launch build, but the 30-then-12 pacing and the redirect requirement are
both worth knowing before this site's content keeps growing past today's 23
pages.*

---

## 15. GBP audit and setup — the agency's own process

**"New Section Added: GBP Audit & Setup Process"** · Caleb Ulku (owner),
2026-01-15

Announces "the exact workflow we use for every new client," three parts:

- **GBP Audit** — categories via GMB Everywhere, services organized with AI,
  every field checked systematically (special hours, review responses, photos).
- **GBP Landing Page Audit** — NAP checks, schema validation, title/H1
  optimization, and **"the biggest mistake local businesses make (writing about
  themselves instead of the searcher)."**
- **GBP Management Software Setup** — a full Leadsnap walkthrough (photo
  scheduling with geotags, drip posting, automated recurring posts).

*The "writing about themselves instead of the searcher" line is worth having on
record — it is the same instinct behind this site's copy, arrived at
independently.*

---

## 16. A live reference site exists

**"Happy New Year — Here's the Example Site You've Been Asking For"** · Caleb
Ulku (owner), 2026-01-05, 38 comments

A complete example site is live in the Pro resources: **a plumber website for
Gary, IN, built in Lovable on the Core 30 framework**. Described as containing a
GBP landing page with proper title/H1/H2 structure for secondary categories and
core services, service-page architecture with internal linking, LocalBusiness
schema, and above-the-fold goal-completion elements (click-to-call, trust
signals, multiple CTAs).

I could not pull a bare URL for it out of the page — it's linked from inside the
classroom lesson rather than as a plain anchor. **Worth Nick opening directly**
if a side-by-side against a reference implementation would help the comparison
pass.

---

## 17. Title tags: service + city first, brand last — Claude got this wrong once

**"Claude was wrong"** · Caleb Ulku (owner), 2026-06-29, 11 comments

Claude gave him title-tag advice for a client that was confident, well-formatted,
and wrong — it treated the title tag as a snippet for a human reader to parse
around the ~60-character truncation point, and told him to lead with the firm
name.

**His correction, verbatim logic:**

> We're not optimizing the snippet someone reads. We're feeding Google and the
> AI systems a relevance signal about what this business does and where.
>
> The earlier words in a title tag carry more weight. So leading with the brand
> spends your strongest position on the one term you were never going to lose.
> **The service and the city go up front where the weight is. The firm name goes
> at the end, or comes off the page entirely.**

**This is a validation, not a discrepancy.** This site's title tags already
follow that pattern — e.g. `Cabinet Painting Oakville | Kitchen Made New`,
service and city first, brand last. Worth recording as confirmed-correct rather
than silently assuming it, since it's exactly the mistake he's warning about.

The post closes with a general caution about the tool we ourselves use for this
site: "\[Claude\] handed me textbook general SEO dressed up as local SEO, and
those are not the same game... The moment an answer sounds clean and certain is
the moment to slow down and check it against what you actually know." Worth
carrying as a working discipline, not just a note.

A companion post, **"Claude was wrong... again!"** (2026-07-01), makes a
narrower technical point for service-area businesses: the ranking benefit of an
address comes from **Google having a verified address on file**, not from
whether that address is displayed publicly on the listing. Less relevant to us
directly — KMN has a real storefront address and shows it — but the mechanism is
worth knowing.

---

## 18. A structural note on how this course's advice applies to us

Most of Caleb's practical/tactical posts (Client Settings Configuration, the
Crawl step, Supp Planner, credits, tool bugs) are **instructions for operating
the core30agent SaaS tool** — a product many members use to generate their
sites. We do not use that tool; this site is hand-built with Claude Code against
a config-driven Astro system of our own.

**Two different layers worth keeping separate when comparing:**

- **Structural principles** — the Core 30 definition, link order, schema shape,
  GBP↔site alignment, title tag construction, trust content, publishing pace —
  apply regardless of what built the site. These are the ones worth checking our
  build against.
- **Tool mechanics** — anything about the core30agent's own settings, buttons or
  bugs — do not apply to us and can be skipped without loss.

This is filtering criterion I'm applying silently while choosing what to read in
depth; recorded here so it's visible rather than assumed.

---

## 19. Beyond Core 30 — off-page tactics noted, not yet relevant

**"3 New Lessons Dropped: AI Visibility Stack for Your Clients"** · Caleb Ulku
(owner), 2026-03-31

Three off-page tactics for AI-recommendation visibility, described as
compounding together: monthly Google News mentions via "silly day" press
releases (~$75/mo), paid quality mentions in regional/topical publications via a
named vendor, and a review-request message engineered to produce
detail-rich reviews that match what AI systems look for. "Press releases build
entity recognition. Quality mentions build authority signals. Specific,
diversified reviews build the recommendation layer."

Recorded for completeness. **This is all post-Core-30, off-page work** — not a
site-structure question, and not something to act on during a learning pass
about the manual. Worth returning to once the Core 30 comparison is settled.

**"Key Insights from Today's Call: Nav Structure, Call Tracking & GBP
Optimization"** · Caleb Ulku (owner), 2025-07-01

A short summary post from an early call, worth its bullet points:

- **"Don't fight clients over nav bars"** — nav structure is a low-priority
  local SEO lever; the call literally calls it "priority #86."
- **Missed call rate is a ranking factor** — tracked via GoHighLevel.
- **New websites take 3-6 months minimum to rank.**
- **"GBP products/service areas have zero ranking impact"** per his internal
  testing across 90+ plumbers.

*Missed-call tracking is worth a look given we already use GHL for lead capture
— worth asking whether that tracking is switched on for this account, separate
from the contact-form work already done.*

---

## 20. Homepage = Primary Category page — confirmed, not a separate page

**"Questions on website structure for Core 30"** · Oct 2025, 15 comments

A member updating their agency's build SOPs asked directly: does the primary
GBP category (which sits in the homepage's title and H1) *also* get its own
separate category page, alongside the secondary categories?

The thread runs through real confusion and a real correction before landing
cleanly. **Elliot Berard** (a member, not an admin — no 🔥 badge, not on the
admin list) answers, gets pushed back on by **Matthew Furman**, re-reads his own
answer, and corrects himself in the thread:

> I often see confusion \[over\] the word "Homepage". The top of the Core 30
> structure is the **"Landing Page"**. In a single location site, the **"Landing
> Page" IS the Homepage**. The Landing Page is optimized for the Primary
> Category... We do NOT want two pages optimized for the same keywords... The
> GBP Landing Page **is** the Primary Category \[page\]. \[no additional page\]

**No admin (Caleb or Miles) confirmed this explicitly in the thread**, despite
being tagged. I'm recording it because the correction is internally consistent,
the original wrong reading was walked back in public, and it matches
`PLANNING.md` §10c's own reasoning almost exactly — but it is member-sourced,
not admin-sourced, and flagged as such rather than upgraded to authoritative.

**This is a validation of our existing architecture, not a discrepancy.**
`config-oakville.yaml` already makes the homepage double as the Kitchen
remodeler (primary category) pillar, with no separate category page underneath
it — exactly this shape.

Two other answers from the same thread, this time **from the original
questioner's list**, not yet confirmed by anyone: no megamenu ("keep it small",
matching our own `PLANNING.md` §3 mega-menu rule), and "critical services" means
the highest-priority services under the primary category — which is the same
concept as the "2-3 critical high-margin services" from item 11 above.

---

## 21. The H2 rule, precisely — confirmed by Miles

**"Should I change GBP LP original headings to h3/h4 or paragraph text?"** ·
Apr 2025, 16 comments

A chiropractor site's homepage had H1/H2 sprinkled across testimonials, an
"about us" blurb, a benefits section, and a how-it-works block, alongside the
category and service headings.

**Miles Hayat (admin), verbatim, in two replies:**

> you only want H2s for your main GBP secondary categories and main services on
> the homepage. testimonials about us benefits and how it works sections dont
> need H2 treatment cause those arent ranking signals google needs to see, H3s
> work fine for those or just bold paragraph headings. keep your H2s reserved
> for the topically important stuff

> exclude the primary category from H2 since its already covered in your H1 and
> title tag, no need to repeat it as H2 cause that dilutes the H2 signals... the
> primary category owns the H1 and title, secondaries own the H2s, thats the
> proper hierarchy

**The rule, precisely, on a homepage:**

- **H1** — primary category + city. (Also the title tag.)
- **H2** — secondary GBP categories and top/critical services **only**. Not the
  primary category again — that would dilute the signal.
- **Everything else** (testimonials, about, benefits, how-it-works, FAQ-style
  content) — **H3 or bold paragraph text, never H2.**

*This is specific and checkable — worth literally counting the H2s on our own
homepage build against this rule during the comparison pass, not just reading it
and moving on.*

---

## Where this leaves the discrepancy list

Two of the three original draft discrepancies have moved. **D1 (homepage
architecture)** is now *confirmed correct* for a single location by two
independent threads (§11, §20) rather than open — the open part is specifically
what happens *when a second location is added*, which item 1's multi-location
answer already covers (homepage shifts to brand level). **The title tag pattern
(§17) is confirmed correct.** What remains genuinely open: D2 (whether all 17 of
our service pages are earning their place), D3 (schema `@id` — still unchecked
against our actual output), plus two new checkable items from this batch — the
H2 rule (§21) and whether 2-3 "critical services" should be elevated to link
from the homepage (§11).

---

## 22. INTERNAL LINKING — the complete structure, in Caleb's own words

Nick asked specifically for this. Two threads, four months apart, give a
complete and mostly self-consistent picture — including one place where a
member's own advice was corrected by an admin on his own follow-up post.

### The hierarchy itself

**"Caleb Give Me A Christmas Present & Nail This Internal Linking Down"** ·
Frank Apuzzo, 2025-12-18, 11 comments

A member stuck on how linking works beyond the basic "home links to categories"
picture. **Caleb Ulku (owner) answers directly**, describing the structure of
his own in-progress example site (a plumber):

```
GBP landing page (= homepage)
  → secondary categories
  → core services              ("critical services", elevated — see item 11)
  → "services we offer"        (a hub/index for the rest)

secondary category page
  → GBP landing page  (UP)
  → services relevant to this category  (DOWN)

core service page
  → GBP landing page  (UP only)

"services we offer" (hub)
  → GBP landing page  (UP)
  → services under the primary category that are NOT core services  (DOWN)
```

**Four kinds of page get linked differently, not two:**

1. **Secondary category pages** — two-way with the homepage, and each links down
   to its own services.
2. **Core / critical services** — elevated straight under the homepage,
   bypassing the category level entirely (matches item 11).
3. **Ordinary primary-category services** (not core, not under a secondary
   category) — live under a **"services we offer" hub page**, not linked
   directly from the homepage.
4. **Secondary-category services** — live under their category page, linked
   from there.

**A direct question and answer worth having verbatim.** Mark Farrow asked
whether the non-core primary-category services should link up to *both* the
"services we offer" hub *and* the homepage. **Caleb: "No, just the landing
page. you aren't trying to support the services under primary category that
aren't core services page."** Read plainly: those lower-tier services are
deliberately not given much internal link support, because the hub page they
sit under is not itself a page worth pushing authority into.

### The correction: no link wheels

In the same Christmas thread, **Mark Farrow** (a member — high leaderboard
rank, but not an admin) described linking sibling services to each other in a
loop: "the services within that CAT get link-wheeled - 1-2, 2-3, 3-4, 4-1."

**Two months later, Mark asked about this himself** in his own post, **"Link
Wheel on Services"** (2026-02-19, 7 comments) — what to do when a new service
gets added later, insert it into the loop?

**Miles Hayat (admin) corrected the premise, not just the follow-up question:**

> I'd suggest dont do link wheels just link each service page UP to its parent
> category page and homepage. all services under same category link to that
> category page not to each other. if adding new service later just link it to
> category page like all others. **flat structure not circular linking**, keeps
> it simple and clean

When another member asked whether that meant abandoning the pattern entirely,
Miles clarified what *is* correct, twice, converging on:

> homepage --- target URLs (category pages) --- supporting pages linking back
> up, thats exactly what core 30 does. just make sure arrows go UP to parent not
> circularly between supporting pages at same level... make sure homepage also
> links DOWN to target URL not just target linking up, **should be two way
> between homepage and category page**

**Caleb (owner) confirmed the same thread**, on a different sub-question — when
a new service is added later, don't rebuild the wheel, "don't undo - just add
where it makes sense. Undoing looks weird."

### The rule, reconciled

Put together, the two threads agree on everything except the one place Mark's
own earlier comment was wrong:

- **Homepage ↔ category pages: two-way.** Always link down and back up.
- **Category → its own services: down only from category; services link back
  up to category, never sideways to each other.** No link wheels, no circular
  linking between siblings at the same level — this is the correction.
- **Core/critical services bypass the category and sit directly under the
  homepage**, up-link only.
- **Everything else under the primary category that isn't core** lives under a
  "services we offer" hub, linking up to the homepage only — not double-linked
  to both the hub and the homepage.
- **A new page added later gets linked into the existing structure going
  forward; earlier pages are not retroactively rewired.**

*This is the single most directly comparable finding of the whole reading pass.*
`CORE30-STRUCTURE.md` §3 and `lint.mjs`'s dead-link/anchor checks should be read
against this precisely — worth checking in the comparison pass whether our
linter would catch a link wheel if one existed, and whether the "services we
offer" hub concept has any equivalent in our structure (it may not need one, at
17 services across 4 categories rather than dozens under one).

---

## 23. The live reference site, inspected directly

Nick sent the actual URL: **https://ai-seo-pro-gary.lovable.app/plumber-gary-in**
— the plumber site Caleb built himself and announced in item 16. Worth more than
the announcement post, because it's the thing that actually shipped rather than
a description of it. Inspected the homepage and one service page directly.

**What matches everything else in this file:**

- **H1:** "Plumber in Gary IN – Fast Emergency Repairs & Same-Day Service" —
  service + city, brand absent. Matches item 17 exactly.
- **Homepage service sections each link to their own dedicated page** —
  Drainage Service, Bathroom Remodeler, Water Heater Replacement, Main Drain
  Line Replacement, each an H2 linking to its own URL.
- **URLs are flat, not nested:** `/drainage-service-gary-in`,
  `/bathroom-remodeler-gary-in` — not `/services/drainage-service-gary-in`. This
  matches a separate answer Miles gave in a different thread (below): hierarchy
  is read from internal linking, breadcrumbs and schema, **not URL nesting**. Our
  own site nests (`/painter/spray-painting/`) — not wrong on this evidence, since
  nested URLs still carry the hierarchy in the path *in addition* to links and
  schema, but worth knowing the reference implementation doesn't rely on nesting
  at all.

**What does NOT match the stated rules — recorded plainly, not smoothed over:**

- **The H2 rule (item 21) is not followed on this reference site.** Miles was
  explicit: H2 reserved for secondary categories and top services only,
  testimonials/benefits/about sections should be H3 or bold paragraph text. On
  the actual homepage, **"Why Gary Homeowners Call Us First"** (a benefits
  block) and **"What Gary Customers Say"** (testimonials) are both **H2**.
- **No breadcrumbs found** on either the homepage or the drainage service page
  I checked, despite breadcrumbs being named as one of the three hierarchy
  signals in the URL-nesting answer below.
- **The service page links up to the homepage only through the global nav**,
  not through a distinct in-content editorial link back to the category/hub —
  worth knowing if our own linter checks for an editorial up-link specifically
  rather than accepting global nav as satisfying it.

*Read this as "even the reference implementation doesn't perfectly follow every
stated rule," not as "the rules are wrong." Could mean the site predates the
rule (Caleb built it in January, some of this guidance is from April/June), or
that the rule is a strong preference rather than a hard requirement. Worth
weighing during the comparison rather than either dismissing our own gaps or
holding ourselves to a standard the reference site itself doesn't meet.*

---

## 24. Hierarchy comes from links, breadcrumbs and schema — not URL nesting

**"Best exemplary site structure"** · Aank Suvd, 5 days ago, 7 comments — a very
recent thread, and a third independent confirmation of the same structure.

**Miles Hayat (admin)**, restating the pattern once more, worded slightly
differently each time it comes up — which is itself worth noting as a sign it's
a stable, memorized rule rather than something being made up per-thread:

> your HOMEPAGE is your primary category page linking down to its main service
> pages, each SECONDARY category gets its own hub linking down to its services,
> and services link back up to their parent

The member's follow-up is the valuable part: she was about to **restructure
service URLs to nest them under new category paths** and asked whether to
change existing URLs (Option B) or keep them flat and build the hierarchy
through links/breadcrumbs/schema instead (Option A).

**Miles, verbatim, telling her not to touch the URLs:**

> go with OPTION A no question, you already have 34 pages uncrawled plus your
> dev is mid cleanup with redirects, so 26 more URL changes stacks risk on an
> already unstable site and the benefit of B is minimal anyway **cause google
> reads hierarchy from internal LINKING, breadcrumbs and schema not URL
> nesting**, so keep your URLs and build the category hubs, linking and
> breadcrumbs properly, zero recrawl risk

**The general principle, independent of her specific migration risk:** URL path
nesting is not what tells Google the site's hierarchy. Links, breadcrumbs and
schema do that job. This is why the reference site in item 23 can run flat URLs
and still be a correct Core 30 build.

*Our own site nests URLs (`/painter/spray-painting/`) AND uses links and schema.
Nothing here says that's wrong — nesting isn't penalized, it's just not required.
Worth knowing if a future URL change is ever tempting: per this answer, the
hierarchy signal wouldn't be the reason to do it.*

---

# Comparison against our Core 30 — checked, not assumed

Nick: "let's move to comparison." Every item below was checked against the
actual built output in `site/dist/` (fresh `npm run check` run, 23 pages
passing) or the linter's own source — not re-read from memory. Nothing has
been changed on the site; this is the comparison pass, the fourth item is
still to come: deciding what to do about each open item, together.

## Resolved correct — no action needed

### D1a — Single-location homepage architecture ✅
Already resolved in the reading pass (item 20). Confirmed again here: nothing
to add.

### D3 — Schema `@id` convention ✅ VERIFIED
Checked five pages (`/`, `/painter/`, `/painter/spray-painting/`, `/contact/`,
`/about/`). The LocalBusiness `@id` is **byte-identical on every page**:
`https://kitchenmadenew.com/oakville/#business` — anchored to this location's
own root, not to whatever page the schema block happens to sit on. That is
exactly the substance of Miles's rule ("the @id identifies the business
ENTITY not the page its on and that entity's the same across pages"), even
though the anchor is `/oakville/` rather than the bare domain root — correct,
because `/oakville/` **is** this location's root; `kitchenmadenew.com/` itself
is a different, higher-level entity per `PLANNING.md`'s GTA structure.

No separate `Organization` type exists anywhere in our schema — only
`LocalBusiness`/`HomeAndConstructionBusiness`. Miles's warning about keeping
LocalBusiness and Organization ids different has nothing to collide with here.
**Closed.**

### Internal linking (items 22-24) ✅ VERIFIED, and one part independently discovered before we read about it
Checked directly rather than trusting the file structure implies it works:

- **Homepage → all 3 secondary pillars:** confirmed, one link each, in `<main>`.
- **Each pillar → homepage:** confirmed, one link each. (`lint.mjs` carries a
  comment claiming "none of the three link up to the homepage" — that comment
  is **stale**; running the linter fresh produces zero up-link warnings. Worth
  a note in the codebase so the next person doesn't trust the comment over the
  code.)
- **No link wheels:** checked `spray-painting` against its four Painter
  siblings — zero sideways links, confirmed by direct HTML search.
- **This isn't accidental.** `silo.mjs`'s `checkLink()` has a rule, line 97:
  `if (from.level === to.level) return 'lateral link within ${from.silo}'` —
  a same-silo, same-level link is a **hard build error**. That is precisely
  Miles's correction to Mark Farrow ("dont do link wheels... flat structure
  not circular linking"), enforced in our linter since before we ever read
  that thread. Nothing to change; worth knowing it's independently correct,
  not correct by luck.

## Real transcripts arrived — the comparison gets sharper

Nick sent a transcript bundle for 11 of the Classroom videos (`course-transcripts/`
in this repo — the raw `.md` files plus `summary.csv`). This is a different tier
of source from anything above: Caleb's own words, unfiltered by an announcement
post's summary of them. Two of them change what's written above.

### D1b, resolved far more precisely than the community thread suggested

**"How to Structure the Core 30"** and **"Structure for Multiple Locations"** —
Caleb walking through his own diagram, not a member's paraphrase of it.

The line worth keeping exactly as said: **"if you have three GBPs, your core 30
suddenly becomes a core 90."** Multi-location isn't "one site plus location
pages" — it's a **full, separate Core 30 structure per GBP**: its own landing
page, its own category pages, its own service pages, all mirroring the single-
location structure exactly.

**Which location gets the actual homepage** isn't arbitrary — it's whichever is
biggest or most important, and the choice can be revised: "I've looked at
clients before that had eight locations. All eight GBPs were pointed to the
homepage. Six of them are ranking really well. Two of them weren't. The two that
weren't ranking well, we created new GBP landing pages for those two. We left
the other six pointed to the homepage."

**The rule that actually matters for us right now, stated as an absolute:**

> Before you change the GBP landing page, you must run a local rank map. If
> they're ranking, don't move the GP landing page. **You will lose ranking.**
> ... Moving GBP landing pages to a new page will lose rank position. Moving it
> away from the homepage will lose rank position.

This corrects the loose framing in item 1 ("the homepage shifts to brand
level"). That is not what happens in Caleb's own explanation. There is no
neutral brand-level shell above the locations — **the strongest location keeps
the homepage**, full stop, and other locations get their own equally-structured
"mini-homepage" pages, reached either from a locations index or linked directly
from the homepage (both are described as fine — "if you want to link to these
other landing pages directly from the homepage... that also is perfectly
fine"). Something like 90% of a local business site's traffic lands on the GBP
landing page, not the homepage as an abstract concept — which is why moving one
is so costly.

**For Oakville specifically:** whatever this domain's `/oakville/` currently
ranks for should **not move** if Burlington is added. The safe pattern per this
transcript is Oakville stays exactly where it is, and Burlington becomes its
own equally-complete "mini Core 30," not a page that displaces or restructures
what Oakville already has. **This is now the clearest, most actionable version
of D1b, and it argues for keeping Oakville's homepage untouched rather than
redesigning it around a hypothetical second location.**

One more real pattern worth having on record, not applicable at our stage but
worth knowing exists: **for very high-competition multi-location clients**,
Caleb sometimes builds a *second*, cityless set of category/service pages
purely for nav-bar use, so a Miami visitor never lands on nav links optimized
for New York. Not something to build pre-emptively — his own framing is "we
don't do that for every client, just ones that are very very high competition."

### The link-wheel correction has a boundary — supporting content works differently

**"Internal Anchor Text Guidelines"** describes a *different* layer of the site
than the Core 30 category/service structure: **topical authority / supporting
content** — the articles that come after the Core 30 is built (matches item 9).

And here, Caleb explicitly prescribes what Miles told Mark Farrow **not** to do
at the Core 30 layer:

> Each one of these variations will also link back up to topic one and **we'll
> do a link circle**. So, one links to two, two links to three, three links to
> one... We do not want topic 4 variation two to link over to topic one. We
> want to keep these as structured silos that don't interlink across these
> different topics.

**Reconciled, precisely — this is two rules, not one rule and an exception:**

- **Core 30 layer (categories, services):** no circular linking between
  siblings. Flat — up to parent only. This is item 21's finding, confirmed
  correct against our build.
- **Topical-authority layer (supporting articles under a service):** circular
  linking *within* one topic's variations is the prescribed pattern. Never
  crossing between different topics/silos.

We have no supporting-content layer built yet — this site is still at the Core
30 stage, deliberately (Nick's own framing: "continue past the core 30 and
build what we call supporting pages"). **Nothing to compare yet, but worth
having the correct pattern on record before that layer gets built**, so it
isn't built flat by habit when it should link in circles.

### D7 — NEW: LocalBusiness schema repeated in full on every page

**"Local Business Schema"**, verbatim: "this schema... goes on the GBP landing
page. That means the landing page that your GBP links to. **It doesn't go on
every single URL on your domain. Just the landing page.**"

Checked our actual output: the full LocalBusiness block — all 16 properties,
not a stub reference — is emitted **identically on every page**, homepage,
every service page, contact, about. Confirmed by comparing three pages'
schema keys directly; they match exactly.

This is a real, literal divergence from what Caleb says he does. **Not
necessarily broken** — repeating full entity data with a consistent `@id`
across pages is a common, generally-accepted JSON-LD pattern, and nothing in
Google's own documentation forbids it — but it is measurably more than his
stated rule, and mechanically simple to change if Nick wants to match it
exactly (full block on the homepage only; other pages carry just their own
WebPage/Service/breadcrumb nodes and reference the business `@id` rather than
repeating it). **Open — a should-we-bother question, not a fix-this-now one.**

### About page — a checklist worth Nick's eyes, not mine

**"Creating an 'About' Page"** gives five concrete E-E-A-T requirements: a
contact method, a verifiable personal story, an author bio box, active and
varied social profiles linked from the page, and multimedia — ideally video,
minimum multiple photos of the same real person from different angles (not
the same photo everywhere, which reads as easier to fake).

Light-touch check only: our About page has a founding story, 9 social-link
references, and video is present. I did not verify the "multiple angles, same
person" photo requirement or check whether crew photos satisfy the spirit of
this rather than the letter — that's an editorial judgement about real photos
of real people, not something worth guessing at from a regex. **Worth Nick's
own five-minute read against this checklist rather than a claim from me either
way.**

### Skimmed, no new discrepancy

**"Core 30 Content Audit"** — a workflow video (ChatGPT + Screaming Frog to
find gaps between a site and its GBP). Confirms the audit *method*, not a new
structural rule. We've effectively been doing this audit by hand throughout
this whole project, cross-checking site content against `OPERATIONS.md` and
the GBP data — nothing here contradicts that.

**"Re-Themeing a GBP Category"** — for keywords with no matching GBP category
(his example: "car accident lawyer" → GBP category "civil law attorney"). Every
one of our silos (Painter, Cabinet maker, Countertop contractor, Kitchen
remodeler) **is** a real GBP category, so this technique mostly doesn't apply
to us. Different reasoning from why `PLANNING.md` already uses `retheme:
"Cabinet painting"` on the Painter pillar — that's to avoid the pillar
competing with its own child service, not a keyword/category mismatch. Worth
knowing they're different problems that happen to use a similar-sounding word.

## Open — genuinely worth a decision

### D1b — What a second location does to the homepage
Still open, still a business/architecture decision, not something a build
check resolves. Unchanged from the reading pass. **This is the one to rule on
before Burlington gets built.**

### D2 — Every declared service has its own page
Checked word counts across all 17 service pages: **1,577–2,554 words each**,
none thin, none padded to hit a floor. So this isn't a content-quality
problem — every page earns its length. What the community's advice actually
turns on is **search demand data** (rank map, what's already indexed and
ranking) that lives outside this codebase, in GBP/Search Console. Not
resolvable from the repo alone. **Open, but reframed:** the question isn't "are
these pages good enough," it's "does Nick have rank data suggesting any of
the 17 should fold into a sibling" — worth asking directly rather than
guessing from content quality, which is already fine.

### D4 — The H2 rule
Counted all 21 H2s on the homepage against Miles's rule (H2 reserved for
secondary categories + top services; testimonials/benefits/how-it-works should
be H3 or bold paragraph). **The picture is mixed, not a blanket pass or fail:**

- **8 are legitimate category/service H2s** — Kitchen cabinet refacing, Cabinet
  painting and spraying, Kitchen cabinet refinishing, Quartz countertop
  replacement, Kitchen remodeling, Full kitchen design, Custom doors/drawers/
  hardware, Quartz countertops and backsplash. These match the rule exactly.
- **8 are structural section headers** — gallery, video, services-intro,
  categories-intro, locations, form, FAQ, closing CTA. These aren't
  testimonials or benefits; they're named Core 30 sections in their own right,
  and the H2 rule (stated against a simple chiropractor GBP page with no such
  sections) doesn't obviously apply to them. Reading the reference site (item
  23) the same way — its H2 sections are similarly structural, not just
  content blocks — supports treating these as fine.
- **5 are genuinely comparable to what Miles said to avoid:** "What cabinet
  refacing actually is," "Why the disruption is only five days," "Refacing or
  repainting — they are not the same job," "We design it in your kitchen,"
  "How refacing is priced." These sit inside the homepage's prose section and
  read exactly like the chiropractor's "Benefits of Chiropractic" and "How it
  Works" blocks that Miles told to drop to H3.

**Concrete and small: worth Nick deciding whether those 5 specific headings
move to H3.** Not the other 16.

### D5 — Elevated services
More resolved than it looked in the reading pass. **Our primary category's own
5 services are already all linked from the homepage** — because the homepage
doubles as the primary category page, listing its own services there directly
already satisfies Caleb's "core services" concept; there's no separate primary
category page for them to be elevated *out of*. What genuinely doesn't happen:
no individual **secondary-category** service (e.g. one standout Painter or
Countertop service) is pulled out and linked from the homepage above its
category — only the three secondary categories themselves are linked, not any
service beneath them. **Open, narrower than first framed:** is there one
secondary-category service worth that special placement, or is "link to the
category, not around it" fine as-is? Business judgement, not a technical gap.

### D6 — NEW: breadcrumb schema exists, visible breadcrumbs do not
Found while checking item 24 (hierarchy signals: links, breadcrumbs, schema).
Every page carries a `BreadcrumbList` in JSON-LD — but there is **no visible
breadcrumb trail** in the rendered page; grepping for a breadcrumb `<nav>`
element finds nothing. We have two of Miles's three hierarchy signals visibly
(linking, and schema), and the third (breadcrumbs) only as structured data
search engines can read but a visitor never sees. Schema-only breadcrumbs are
valid and do work for rich results, so this isn't broken — but it's a real,
small, checkable gap if a visible trail is wanted. Worth noting the reference
site (item 23) doesn't have visible breadcrumbs either, so this may simply be
uncommon in practice rather than an oversight specific to us.

## Decisions — walked through together, 2026-08-01

Nick's instruction for this pass: discovery only, nothing changes on the site
yet. This records what was decided; none of it has been built. That's the next
separate step, whenever Nick wants it.

| # | Decision | What it means when built |
|---|---|---|
| **D1b** | Acknowledged, not a content decision | Constraint for whenever Burlington is built: don't restructure or move Oakville's homepage. Keep it exactly where it is; add Burlington as its own equally-complete structure. |
| **D2** | **Keep all 17 service pages as-is** | No change. Nick is confident each earns its place regardless of rank data. |
| **D4** | **Drop 5 headings from H2 to H3** | "What cabinet refacing actually is," "Why the disruption is only five days," "Refacing or repainting — they are not the same job," "We design it in your kitchen," "How refacing is priced." The other 16 H2s on the homepage stay as-is. |
| **D5** | **No change** | Category-level links (Painter, Cabinet maker, Countertop contractor) are enough. No individual secondary-category service gets elevated to a direct homepage link. |
| **D6** | **Add a visible breadcrumb trail** | Currently schema-only (invisible). A visible trail gets added across pages, matching all three of Miles's hierarchy signals (links, breadcrumbs, schema) rather than two. |
| **D7** | **Trim LocalBusiness schema to homepage-only** | Every other page currently repeats the full 16-property block. Matches Caleb's stated rule: full schema on the GBP landing page only; other pages reference the business `@id` rather than repeating it. |

**Two real build items came out of a discovery pass that started as "just
reading":** D6 (visible breadcrumbs) and D7 (schema trim) are genuine site
changes, not wording tweaks. D4 is a small, mechanical one (5 heading tags).
D2 and D5 close with no work.

## 25. The reference site, crawled fully — the services hub, in concrete detail

Nick, after seeing item 23's spot-check: "I think it is very important for you
to crawl every page on this website... it's really good for us to use this as a
source of information when we are building our own website." Right call — the
first pass sampled two pages; the real structure only became visible crawling
all of it. **77 unique URLs found and the site map fully reconstructed** by
following every internal link from the homepage, the services hub, and the
locations hub.

### The site map

| Type | Count | Example |
|---|---|---|
| Homepage | 1 | `/plumber-gary-in` |
| Services hub (index) | 1 | `/services` |
| Locations hub (index) | 1 | `/locations` |
| About, Contact | 2 | `/about`, `/contact` |
| **Core/critical services** | 4 | `/drainage-service-gary-in` |
| **Granular services under a core service** | ~27 | `/drain-cleaning-gary-in` |
| **"General" services (no core parent)** | ~24 | `/leak-detection-gary-in` |
| **Geo/landmark pages** | 17 | `/plumber-near-marquette-park-gary-in` |

### The services hub — this is the thing Nick wants to build

`/services` is a single page, own H1 ("Plumbing Services in Gary IN — Full-
Service Plumber for Every Job"), that indexes **every** service on the site,
grouped like this:

```
H2  Drainage Service →              (a core service — H2 itself links to its own page)
  H3  Drain Cleaning                (links to its own page)
  H3  Clogged Drain Repair
  H3  Sewer Line Repair
  ... (10 total under this group)

H2  Bathroom Remodeling →
  H3  Bathroom Plumbing Remodeling
  ... (8 total)

H2  Water Heater Replacement →
  H3  Water Heater Installation
  ... (5 total)

H2  Main Drain Line Replacement →
  H3  Water Line Replacement
  ... (5 total)

H2  General Plumbing Services       (NOT linked — no page of its own, purely a
  H3  Emergency Plumbing Repair       label grouping the leftover services)
  H3  Toilet Repair
  ... (24 total)
```

**Every single H3 is a genuine link to its own dedicated page** — confirmed by
checking the DOM directly, not assumed from the visual layout. This is a real,
large site: ~55 individual service pages, not 11.

### The linking rule, now confirmed with real pages rather than a diagram

This concretely proves out item 22's abstract structure from the Christmas
thread — checked directly, not re-derived from a description of it:

- **A core service's own page** (e.g. `/water-heater-replacement-gary-in`) links
  **up** to the homepage, **and down** to its own 5 sub-services in an "Our
  Water Heater Services" section — it's a mini-hub in its own right, not a dead
  end.
- **A sub-service under a core group** (e.g. `/drain-cleaning-gary-in`) links up
  to **its core service parent** (`/drainage-service-gary-in`), not the
  homepage and not `/services`. Three levels: homepage → core service →
  sub-service.
- **A "general" service with no core parent** (e.g. `/leak-detection-gary-in`)
  links up **directly to the homepage**, skipping `/services` entirely. This is
  the exact case Caleb described in the Christmas thread ("No, just the landing
  page... you aren't trying to support the \[hub\] page") — now seen in
  a real, live page rather than a diagram.
- **`/services` and `/locations` are both one-way indexes.** Every page checked
  that appears *on* them links up to the *homepage*, never back to the hub
  itself. The hub exists purely so a visitor (or a crawler) can discover
  everything from one place — it is a link *source*, never a link *target*.

### Geo pages mirror the exact same pattern, and prove the "rank map 4/5/6" rule in practice

`/locations` groups landmark pages the same way — by which service, then by
neighbourhood — and critically, **the landmark lists are different per
service**: "Plumber by Area" covers 7 neighbourhoods, "Water Heater Replacement
by Area" covers 5 (two of which don't appear in the first list), "Drain Line
Replacement by Area" covers a different 5 again. That's the "only where the
rank map shows a 4, 5 or 6" rule (item 9) made concrete — coverage isn't
uniform across services, because rank position isn't uniform across services.

A sample geo page (`/plumber-near-marquette-park-gary-in`) is genuinely
hyperlocal, not a templated city-swap: "Jobs We Have Done Near Marquette Park,"
"Services for Historic Lakefront Homes," "Driving Directions to Marquette
Park," and FAQ entries like "Are there permit requirements in the Marquette
Park area?" and "Do you work on lakefront properties?" It links up directly to
the homepage, same as a general service page.

### The About page, checked against the video's checklist directly

Matches item "Creating an About Page" closely — this is template content
(placeholder names like `[Owner Name]`, confirming it's demo scaffolding rather
than a finished real site) but the section shape is real:

`How \[Company\] Got Started` (founding story) → `Meet Our Team` (bio boxes,
one H3 per person) → `Watch Our Introduction` (video) → `Proudly Serving...`
(service area) → `Licensed, Insured, and Guaranteed` + `Our Credentials` →
`Find Us on Google` → `Follow Us` (social links) → `Ready to Work With Us?`
(closing CTA).

### What this means for building our own services hub

We don't have this layer at all today — our silos link straight from category
pages to a flat list of services, no intermediate hub page, no grouping of
"critical" vs "general" services, no granular sub-service tier. Building one
would mean, concretely:

1. **A `/services` (or per-silo) hub page**, H1 of its own, that indexes every
   service grouped under H2s.
2. **Deciding which of our services are "core"** (get their own homepage link
   *and* act as a group header) versus "general" (grouped under a catch-all
   heading with no page of its own for the heading itself).
3. **A decision on whether to go three levels deep** — do any of our 17
   services warrant their own granular sub-services (the way "Drainage Service"
   splits into 10 further pages), or does a two-level hub (hub → service) match
   our actual scope? Given D2's decision to keep all 17 as they are, this is
   the more likely fit for us: no third tier, just the hub.

Not decided, not built — this is what the "I want to implement this too"
request is asking for, and it's a genuinely new page type, not a tweak to an
existing one.

## 26. Weekly call recordings — 11 more sessions, lower fidelity

Nick sent a second bundle (`individual_youtube_text_11.zip`) — 11 more calls,
2025-08-07 through 2025-11-04, with one outlier dated 2024-10-21. **Important
caveat, stated by the source itself:** these are Genspark `summary_or_notes`
output, not verbatim timestamped transcripts like the first 11-video batch in
`course-transcripts/`. Treat everything below as paraphrase-with-selected-quotes,
one level less reliable than item 22's sourcing. Files live in
`course-transcripts/weekly-calls/`.

**The one finding that matters most for our roadmap** — from
`04_Vyj4GaCvaQU.md` (2025-10-07): Google shipped an August 2025 update that
treats **city pages without a matching physical GBP in that city as spam**.
Direct quote: *"What Google updated in August of 2025 is they started treating
city pages like spam and more specifically it's city pages where you don't
have a Google business profile."* This lands squarely on D1b (Oakville keeps
the homepage; Burlington/Mississauga/Milton/Hamilton are deferred). It doesn't
change the decision — it strengthens it. When Burlington is eventually built,
it needs its own real GBP, not just a page targeting the Burlington name; a
content-only "Burlington" page with no matching listing is now an explicit
spam signal, not just a weak one.

**Likely identified: the missing Sept 23 call.** `06_lOOT6i43ZxM.md`
("2025-09-23 Internal Linking & GBP Optimization") is very likely the exact
"Summary of AI SEO Community Call - September 23, 2025" that Frank Apuzzo
referenced in the Christmas thread and that I couldn't locate earlier (item
22). Its content matches: internal linking ratios, editorial-vs-navigation
links, FAQ-as-supporting-content — all consistent with what the Christmas
thread described secondhand.

**Reinforces what we already have right:**
- *"The internal links you got correct: Homepage links to the category pages,
  category pages link to their service pages—golden."* (`08_HtcXItcvnBA.md`,
  2025-09-09) — a direct, independent confirmation of our existing structure,
  not a course claim I'm inferring.
- *"Nav bar links don't count for SEO... editorial links in the content"*
  matter (`06_lOOT6i43ZxM.md`) — restates item 22's editorial-vs-navigation
  distinction from a second source.
- *"We only create location pages when the rank map tells us that we need a
  location page"* (`06_lOOT6i43ZxM.md`) — independently confirms the "defer
  Burlington/Mississauga/Milton/Hamilton until there's a reason" call already
  made, this time from the agency's own client process rather than the
  reference-site inspection.
- *"Don't change what's working... if ranking well, minimal changes
  recommended"* — some version of this appears in at least four separate
  calls (`05`, `08` implicitly, `09`, `10`, `11`). This is now the
  best-supported single piece of advice in the whole corpus. It argues for
  building D4/D6/D7 as small, additive, incremental commits rather than one
  large restructuring pass, once building starts.

**New, specific, checkable details not previously logged:**
- **Anchor-text ratio**: roughly 2/3 branded or naked-URL anchors to 1/3
  keyword-rich anchors, for editorial internal links (`06_lOOT6i43ZxM.md`).
  Not yet checked against our actual pages.
- **FAQ must be plain text, not a JS dropdown** — *"FAQ blocks should be
  plain text paragraphs under headers (no JS-enabled dropdowns) to maximize
  crawlability"* (`05_NwssK77hGe4.md`). This is directly checkable against our
  FAQ component and worth verifying once we're back in a building session.
- **External authority links**: 2-3 links to high-authority sites (their
  example: Harvard, Forbes) per 500-700 words of content (`08_HtcXItcvnBA.md`).
  New idea, not previously logged — we currently have no outbound authority
  links in our content at all. Flagging as a possible content gap, not a
  decision.
- **"First link wins"**: *"Google crawls websites from the top down and the
  first link it sees to a URL is the only link that can pass SEO authority"*
  (`04_Vyj4GaCvaQU.md`). Worth keeping in mind for any future page where a
  service is linked from more than one place — the first instance in DOM
  order is what counts, not every instance.
- **Hierarchy restated with a fourth tier**: Homepage → Category → Services →
  Supporting Content (FAQs), with FAQs linking out to relevant deeper articles
  (`06_lOOT6i43ZxM.md`). Consistent with, and slightly more specific than,
  item 22's three-tier version.

**Noted but not adopted — flagged, not endorsed:** `09_huNDhM7afqc.md`
(2025-08-26) has Caleb stating that PBN (private blog network) links are a
core part of his own agency's backlink strategy — every published article
gets one PBN link "to serve as a validation signal." PBNs are a widely
considered black-hat/grey-hat tactic that carries real Google penalty risk.
Recording this because it's part of what the community teaches, not because
it's something to do — no PBN activity is planned or in progress for this
site.

**Agency-operations content (team hiring, pricing per article, client
management, Facebook ad funnels) across most of these 11 calls is not
relevant to us** — KMN isn't running an agency — and has been read but not
logged in detail here.

**Dating flag:** `03_5PAD9BtyTew.md` is dated 2024-10-21, over a year before
every other file in either batch. Its content (the "lazy ranking method,"
GBP/title-tag alignment, Claude-over-ChatGPT for content) is consistent with
everything else and nothing in it contradicts newer material, so it's kept,
but treat it as the least current source if a future finding ever conflicts
with it.

## Post index

| # | Post | Comments | Read |
|---|---|---|---|
| 1 | Welcome to AI SEO Mastery Pro | 109 | ☑ skim — introductions only |
| 2 | Business with 2 locations | 5 | ☑ |
| 3 | Core 30 Platform | 9 | ☑ |
| 4 | adding stuff to gbp & avoiding reverification | 1 | ☐ |
| 5 | realtor strategy help | 0 | ☐ |
| 6 | Question About Claude and Ai Tool | 0 | ☐ |
| 7 | Best AI site builder starting from scratch | 2 | ☐ |
| 8 | location | 0 | ☐ |
| 9 | Map rankings heavy fluxuation after page build out | — | ☐ |
| 10 | Geo tracker | — | ☐ |
| 11 | schema id question | 1 | ☑ |
| 12 | Write AI content. Help | — | ☐ |
| 13 | Do the GBP service names have to be exact names | 2 | ☑ |
| 14 | Core30 agent 2.0 early access | — | ☐ |
| 15 | GLocal for GBP Management | — | ☐ |
| 16 | Is it worth creating content in different languages | — | ☐ |
| 17 | Core30 2.0 is LIVE | — | ☐ |
| 18 | GBP categories question | 6 | ☑ |
| 19 | Core 30 Agent Suggestion and/or Request | — | ☐ |
| 20 | Change of Address for SAB | — | ☐ |
| 21 | Core 30 for restaurants | — | ☐ |
| 22 | Video content questions | — | ☐ |
| 23 | Should the GBP category names be on the landing page | 2 | ☑ |
| 24 | Other agencies involved | — | ☐ |
| 25 | Site speed and builders | — | ☐ |
| 26 | Website + GBP audit | — | ☐ |
| 27 | Direct GBP support from Google | — | ☐ |
| 28 | Would you recommend making a sponsored page | — | ☐ |
| 29 | GBP landing page video | — | ☐ |
| 30 | Core 30 question | 3 | ☑ |
| 31 | Lovable question | — | ☐ |
