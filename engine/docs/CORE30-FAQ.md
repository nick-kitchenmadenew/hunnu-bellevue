# Core 30 FAQ — implementing the methodology

Answers Caleb has given on the weekly community calls, **deduplicated by
question**. The same questions recur call after call; each one appears here
once, citing every call it came up on.

**This is the implementation layer.** `CORE30-METHODOLOGY.md` is what the
course teaches, from verbatim lesson transcripts, and it governs. Nothing
here overrides it — these entries add nuance, name edge cases, or supply
numbers the lessons left open. Where a call genuinely appears to contradict
a lesson, it is flagged as a conflict rather than silently resolved.

**Fidelity is lower than the lessons.** Weekly-call files are Genspark
summaries, not verbatim transcripts (`summary_or_notes`, per their own
README). Quoted "key sentences" in those files are reliable; paraphrased
bullets are one remove from what was actually said. Treat substance as
sound and exact wording as approximate.

**Read by section. Do not read the raw call files** — they are an audit
trail. Everything worth keeping from them is here.

## Ingestion status

Each call is read **once**, on arrival: keep what is new, discard what a
lesson or an existing entry already answers, then never open it again. A
call with no date in the right-hand column has not been processed yet.

| Call | Date | Processed |
|---|---|---|
| Rank Maps vs Keywords | 2025-11-04 | 2026-08-08 |
| GMB Categories & Client Management | 2025-10-28 | 2026-08-08 |
| GBP Categories & AI Overview | 2024-10-21 | 2026-08-08 |
| Rank Maps, Content Strategy, GBPs | 2025-10-07 | 2026-08-08 |
| Content Production & Pricing | 2025-09-30 | 2026-08-08 |
| Internal Linking & GBP Optimization | 2025-09-23 | 2026-08-08 |
| Facebook Ads SEO Local Ranking | 2025-09-16 | 2026-08-08 |
| GBP Categories, Linking, Content AI | 2025-09-09 | 2026-08-08 |
| Local SEO PBNs Core 30 GBP Tips | 2025-08-26 | 2026-08-08 |
| AI SEO & LLM Landing Pages | 2025-08-07 | 2026-08-08 |
| AI Schema ChatGPT Citations | 2025-08-12 | 2026-08-08 |

---

## Changing an existing site

### If it is ranking, do not change it

**The most-repeated answer across every call** — five separate sessions
(2025-09-30, 2025-08-26, 2025-08-12, 2025-08-07, and implicitly 2025-10-07).
The lessons state this narrowly, about moving a GBP landing page; the calls
extend it to essentially any change:

- Launching a new site on the **same** domain still loses rank position. On
  a new domain you start from scratch.
- Recovery runs **three to six months**.
- Even hosting moves and minor design changes can trigger drops.
- The rule as stated: *only add content, never modify existing elements when
  performing well.*

### When a rebuild is justified anyway

For sites that are old, thin, and **not ranking at all**, rebuilding is
often more efficient than salvaging (2025-10-28). This is not a
contradiction of the rule above — the rule protects existing rankings, and
there are none to protect. The stated threshold: *"We don't delete things
unless the website isn't ranking at all"* (2025-10-07).

## Google Business Profile

### Choosing the primary category is the single most important decision

Raised on three calls (2025-09-23, 2025-09-09, 2024-10-21) and not covered
in the lessons. Choose on **actual consumer search behaviour**, not on how
the industry describes itself. The worked example: in a warm climate an HVAC
business should use *Air Conditioning Repair*, not *HVAC Contractor*.

*"If your primary category is wrong, then even if you do the work to rank,
you won't get calls."* (2025-09-09)

### Adding secondary categories does nothing on its own

Each secondary category needs its own dedicated landing page with unique
content and proper internal linking before it can rank (2025-10-28). This
confirms the lessons' one-URL-per-category rule and explains its purpose —
the categories are not the ranking mechanism, the pages are.

### Every GBP field must be filled in

Incomplete profiles are named as a primary cause of low rankings
(2025-09-23).

### Any GBP change can trigger re-verification

Raised on three calls (2025-10-28, 2025-09-30, 2025-08-26). Name, address
and category changes are the usual triggers, but the risk is broader —
*"you could go in there and tick the box that says you're LGBTQ friendly and
that could trigger re-verification."*

Mitigations offered:
- Have a **Local Guide** (a separate Google account with high review
  activity, unconnected to the profile) *suggest* the change instead. This
  almost never triggers re-verification.
- Use a management tool (LeadSnap) rather than editing directly.
- Have documentation ready before making the change.
- For verification videos: under two minutes, no faces, no motion blur,
  filmed off-peak.

### Lock down the profile

Team members with access can inadvertently delete secondary categories and
cause ranking drops (2025-09-09).

### Service-area businesses are much harder

A business without a visible address is roughly **30–50% harder to rank**
than one with a physical location (2025-10-28, 2025-08-26). Price
accordingly.

## Rank maps

### Rank maps replace keyword research

For local work, keyword research is considered unnecessary (2025-11-04,
2025-08-26). Google Keyword Planner is built to sell ads and its volume data
is misleading for organic local SEO. The rank map is the instrument that
decides what to build next — which is what makes the lessons' phase triggers
operational.

*"For local SEO, we don't do keyword research… All we're trying to do is get
the GBP to rank higher."*

### Grid settings

A **13×13 grid at 0.5–1 mile intervals** (2025-10-07).

### Track the primary category and two or three core services — not more

Do not spend credits on 50 keyword variations (2025-10-07, 2025-09-23). A
site ranking for *lawyer* will likely rank for *attorney*. The primary
category is usually the most competitive term, so it is the honest measure.

### Rank maps are the client report

The only reporting done: the rank map from the day of hire beside the rank
map today (2025-10-07).

## Content and structure

### Google decides site structure from internal linking, not URL structure

Raised on three calls (2025-10-07, 2025-08-12, 2025-11-04). Folder depth and
URL shape do not matter; keep URLs simple. **Internal linking is the
structure** as far as the algorithm is concerned.

### The first link to a URL is the only one that passes authority

*"Google crawls websites from the top down and the first link it sees to a
URL is the only link that can pass SEO authority"* (2025-10-07). This is why
navbar placement matters: a navbar link appearing before the editorial link
consumes the authority that the editorial link was meant to pass.

### Navbar links do not count; editorial links do

(2025-09-23, 2025-09-09.) The lessons say to minimize navbar links; the
calls state the reason plainly — they carry no SEO weight. Keep the navbar
under 20–30 links (2025-10-07) and put the real linking in body copy.

### Internal anchor text ratio

Roughly **two-thirds branded or naked URLs, one-third keyword-rich**
(2025-09-23).

### Link hierarchy

Homepage → category pages → service pages → supporting content, with
category and service pages linked bidirectionally (2025-09-23, 2025-09-09).
Supporting content hangs off the relevant FAQ at the bottom of a service
page — which is exactly the Phase 2 mechanism in the lessons.

### Keep silos separate

Cross-linking between service categories confuses the algorithm and dilutes
topical relevance (2025-08-12). Same rule the lessons give for topic silos.

### Do not repurpose content across locations

Generate unique content per city (2025-10-07). With AI costs under half a
cent per word, the saving is not worth the indexing risk.

### There is no target word count

*"We don't give content length guidelines in the writing prompt. I don't
want them to be 10,000 words long, and I don't want them to be 200 words
long, but anything in between."* (2025-09-30)

Worth noting against `CORE30-METHODOLOGY.md`'s flagged transcription gap —
the lesson's homepage-block word count is garbled and unrecoverable, and
this suggests no precise figure was ever intended. Copywriters aim for
1,000–1,500 words on articles.

### FAQ blocks must be plain text

Plain paragraphs under headers — **no JavaScript dropdowns or accordions** —
so they stay crawlable (2025-09-30).

### Stop producing topical content once relevance is established

*"You probably don't need 400 pages to establish topical relevance… once you
establish that, stop cranking out this topical content and switch to
geographical content."* (2025-09-09) Consistent with the lessons' phase
model, and a caution against running Phase 2 indefinitely.

## Geographic targeting

### The August 2025 update penalizes city pages without a GBP

*"What Google updated in August of 2025 is they started treating city pages
like spam and more specifically it's city pages where you don't have a
Google business profile."* (2025-10-07)

**This constrains Phase 3.** Landmark pages *inside* the city where the GBP
sits remain the recommended play; pages targeting other cities where the
business has no profile are now a liability. Corroborated on 2025-08-12 and
2025-09-16: ranking outside the physical location is high-effort and often
futile, and hyper-local neighbourhood content within the primary city is the
recommended alternative.

### Ranking one GBP in multiple neighbouring cities is very hard

Google weighs the searcher's city against the GBP's city heavily
(2025-10-07). If competitors are managing it, it may be possible; otherwise
separate GBPs are required.

### Build location pages only when the rank map calls for one

*"We only create location pages when the rank map tells us that we need a
location page"* (2025-09-23) — i.e. when 4s, 5s and 6s appear, exactly as
the lessons specify. Local competition, not population, determines
difficulty (2025-09-30).

## Links

### Every published piece gets at least one external link sourced to it

*"I cannot remember the last time I published content and didn't source a
link to it… External links is a massive validation signal"* (2025-08-26).
The lessons repeat this per phase; the calls confirm it is universal.

### Two distinct kinds of link

(2025-09-23.)
1. **"This isn't slop" links** — establish that content is legitimate and
   get it indexed.
2. **Trust links** — real community standing: Chamber of Commerce,
   sponsorships, local events.

PBN links are used for the first purpose — one per published piece, as a
validation signal (2025-08-26).

### Local links are cheap and are the whole strategy

$100–$200 range (2025-10-07, 2025-10-28, 2025-09-23, 2025-09-16). Chambers
of Commerce — even one 70 miles away — and youth sports sponsorships are the
named tactics. A $250 local event sponsorship is described as often enough
to hold a top-three position. Expensive high-ticket backlinks are explicitly
rejected.

### Do not do competitor backlink analysis

*"I don't care what backlinks my competitors have… we don't do a backlink
analysis"* (2025-09-16). Ahrefs is called a waste of money for local-only
work (2025-08-26).

### Outbound authority links

Two to three links to high-authority sites (the examples given are Harvard,
Forbes) per 500–700 words. Stated to improve indexing, build trust, and
lower AI-detection scores (2025-09-09).

## Schema and AI visibility

### Put what you want ChatGPT to say in the schema

*"The easiest way to get Chat GPT to tell its users what you want Chat GPT
to tell them is to put it in your schema"* (2025-08-12, 2025-08-07). Use
**nested** schema — service schema inside local business schema — so the
relationships are explicit.

### Citation consistency is near-absolute for AI Overview

*"Google's AI overview seems to care about nothing except that you have
perfectly consistent citations. Like, if you want the Google AI overview to
recommend you and you messed up like one minor character on a citation,
you're not going to get recommended."* (2025-08-12)

This sharpens the lessons' "everything must match the GBP" rule from good
practice into a hard gate for AI recommendation specifically.

### LLM-oriented landing pages

Pages built for AI consumption rather than human conversion (2025-08-07):
heavy FAQ sections, embedded review widgets (LLMs parse them for
service-specific mentions), and clear owner/business biography. ChatGPT uses
reviews far more than Google does.

### Proximity is not a ranking factor for ChatGPT

Unlike Google, where it is decisive (2025-08-07).

### Reddit and local forums

Participation in local subreddits — AMAs, genuinely helpful answers — is a
rising signal for both Google and LLMs (2025-08-07). Consistent with the
lessons' point that LLMs want brand *mentions* rather than links.

## Scope and tooling

### When the full Core 30 is not necessary

*"When you do that in most cities that are 100, 200, 300,000 people, that's
enough to rank… it doesn't need to be the whole Core 30."* (2025-09-16)

The simplified version — GBP management, correct category and service
selection, landing-page edits — is claimed to move a business from ~5% to
40–50% top-three coverage in cities under roughly 300,000 people. The full
Core 30 is for competitive markets. **This is a scoping answer the lessons
do not give**, and it matters commercially: it defines the floor a client
actually needs.

### Which model for what

- **Content:** Claude, consistently preferred over ChatGPT (2024-10-21,
  2025-08-26 — Sonnet named).
- **Analysis:** the largest reasoning model available (Opus for the
  technical audit, per the lesson; 2025-08-26 agrees).
- Use per-client **Claude Projects** carrying business details, tone and
  "do not mention" constraints (2025-09-09, 2025-09-23).
- Run a dedicated **fact-check prompt** over generated content as a separate
  step — called out as the single change that most improved output quality
  (2025-09-23).

### Tool stack

LeadSnap (rank maps, citations, ~$20/month), HighLevel (site building),
Claude and ChatGPT (content), Screaming Frog (crawling), Page Optimizer Pro
(on-page optimization, used more the more competitive the market)
(2025-10-07, 2025-08-26). Ahrefs explicitly not used.

### Indexing

About a week is normal for a healthy site. If a URL has internal links, is
in the sitemap, has an external link, and still is not indexed, use an
indexing service (2025-08-07).

### GBP posts

Low value for humans, useful only as an activity signal to Google. *"Spend
five minutes on and then never think about it for another year."*
(2025-08-07)

---

## Deliberately not captured

Roughly half of every call is **agency-operations** material — copywriter
pay rates and hiring, team structure, Facebook ad funnels, cold email,
client firing, webinars, sales scripts, the "10K challenge". It is real
advice and it is genuinely repetitive call to call, but it is about running
an SEO agency, not about the Core 30 methodology or building a compliant
site, so it is out of scope here.

If that ever becomes relevant — for instance if the productized offering
needs pricing or delivery guidance — it should get its own file rather than
being mixed into this one.
