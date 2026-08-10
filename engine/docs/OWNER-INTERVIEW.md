# The owner interview

Everything a Business Profile can give you is structure: categories, services,
an address, a service area. `gbp_to_config.py` takes that as far as it goes and
stops, because a profile cannot tell you a single thing that makes one business
worth choosing over the one next to it.

This is how you get the rest. One sitting with whoever actually does the work —
not the office, not the marketing contact — and out of it comes `OPERATIONS.md`,
which is then authoritative for every factual claim on the site.

The site's whole quality argument rests on this document. A page that says "we
use a modified solvent degreaser because TSP is water-based and cannot lift the
wax on a kitchen that has been polished for fifteen years" is unownable by any
competitor. A page that says "quality workmanship and attention to detail" is
unownable by anybody at all. The difference is entirely in whether the interview
happened.

---

## How to run it

**Record it.** You are listening for how they say things, not only what they say.
The phrase "for repainting I do not strip out the colours, only for refinishing
we do that" became a build-breaking guard; a summarised note would have lost it.

**Ninety minutes, one sitting, the person who does the work.** An owner who has
stopped doing the work answers in brochure. Somebody still on the tools answers
in specifics, and specifics are the entire product here.

**Follow every correction.** This is the technique that matters more than the
question list. Whenever they say *"no, actually…"* or *"people think X but…"* —
stop, slow down, and get the whole of it. Every one of the twenty-one claim
guards on the first site built this way came out of a moment like that. The
questions below exist mostly to provoke them.

**Do not accept a superlative.** "We use the best materials" is not an answer.
Ask which material, then ask what the cheaper one does wrong. The second answer
is the one worth writing down.

**Ask what they turn down.** A business that will take any job has nothing to
say. A business that refuses work has a reason, and the reason is a page.

**Bring the site's own unanswered questions.** If pages have already been
written — which is normal, since content does not wait for this interview —
every fact audit left a list of `SOURCE TBD` lines in `drafts/*.facts.md`.
Those are claims the site already makes and cannot support: a permit
requirement, a timeframe, a warranty term. Collect them before the session and
work through them alongside the questions below.

This is the highest-value part of the interview and it costs nothing to
prepare. The questions below are what any business in the trade should be
asked; the TBD list is what *this* site has already promised a reader. Every
one you resolve moves into `claims-<entity>.yaml`, where the linter enforces it
on every build from then on.

---

## What the site cannot invent

Each section says what goes wrong without it, so you can tell when an answer is
thin enough to push on.

### A · What you actually do — and what you don't

> *Without this the site claims work the business subcontracts, in the
> first person.*

- Walk me through everything you do in-house. Who physically does each part?
- What do you contract out? To whom, and who holds the schedule?
- Where does your responsibility end on a subcontracted part?
- Is there anything you're listed for that you don't really do any more?

**Why it matters most.** A GBP category list is a marketing surface, not an
inventory of capability. The first site built this way is categorised as a
*Countertop contractor* and does not cut a single countertop — stone shops
template, fabricate and install; the company holds the contract and the schedule.
Both facts are true and the site must say the right one. It produced three
guards, one of which fails the build on the phrase "we template".

### B · The process, in real time, from the customer's side

> *Without this the site compresses a five-week job into a five-day one,
> because the exciting part is five days long.*

- Day one, what actually happens? Then what?
- How long is the whole thing, start to finish? How much of that is waiting?
- How much of it is the customer without a usable room?
- Is there any part where they have to leave the house? Why?
- What's the bit customers are most surprised by?

**Watch for the gap between the loud number and the true one.** The first site's
installation week is five days; the project is four to five weeks, because doors
are being made for four of them. Generated copy reached for "five days from start
to finish" repeatedly, and now four separate guards catch four different ways of
writing it. The two or three days customers must be out of the house for is a
safety fact, and the site had it backwards until the interview.

### C · Materials and method

> *Without this every technical passage is a paraphrase of a supplier's
> website, and reads like one.*

- What exactly do you use? Brand, product, why that one?
- What does everyone else use, and what does it do wrong?
- What's the step nobody sees that decides whether it lasts?
- What have you tried and rejected?
- Is there anything you make or mix yourself?

**Named products, or nothing.** "A quality finish" is filler. "Two-component
catalysed polyurethane, which cross-links rather than drying, so it does not stay
soft the way a water-based enamel does" is a page. The vocabulary you collect
here becomes `vocabulary-<entity>.yaml`, and the specificity script checks each
term against this document — so a term that gets into that file without being in
here is caught as invention.

### D · Price

> *Without this every service page routes to a contact form instead of
> answering the question the visitor came with.*

- What actually drives the number? What makes two similar-looking jobs differ?
- How is a quote produced — from what, by whom, how long does it take?
- Does the price change afterwards? Ever? Under what circumstances?
- What is quoted separately rather than included?
- What's the cheapest way someone could get this done, and what do they lose?

**Ask how the quote is produced very precisely.** On the first site, 99% of
quotes come from photographs, the written price follows the visit by 24–48 hours
rather than being handed over on the day, and it is never revised afterwards.
Each of those three is a guard, because the generic copywriter's instinct — "book
a free estimate and we'll price it on the spot" — contradicts all three at once
and gives away the fixed-price promise in the bargain.

### E · Warranty

> *Without this the site either undersells the guarantee or claims it
> covers something it doesn't.*

- What's the term, exactly? On what — the material, the labour, both?
- Is any part of the job on different terms?
- When is it issued? Before or after they commit?
- What's actually covered, and what's damage rather than failure?
- What happens when someone calls in year four?

**The exception is the valuable part.** Five years on their own work, fifteen on
one material, and one year on stone — because that one comes from the fabricator,
not from them. A page sweeping countertops into the five-year term is a claim the
business cannot honour, so it fails the build.

### F · What people get wrong

> *This is the richest section and the one most likely to be skipped.
> Do not skip it.*

- What do customers believe about this work that isn't true?
- What do your competitors say that irritates you?
- What do people assume you do that you don't?
- What's the worst advice out there?
- Tell me about a job you had to put right for somebody else.

Everything here converts almost directly into `claims-<entity>.yaml`. The form of
a claim guard is exactly the form of a correction: *the obvious thing to write is
X; the truth is Y*. If this section is empty, the claims file will be empty, and
the site loses the check that keeps generated content honest.

### G · Proof, including the proof you don't have

> *Without this the About page is a stock photo and an adjective.*

- How long, who, and how many? Employees or subcontractors — and how long have
  they been with you?
- Licences, insurance, memberships. What can somebody verify independently?
- What certifications do you hold? **And if none — say so.**
- What would you rather be judged on instead?

**The absence is usable.** The first site's credentials block ends with a row
headed *"No trade certificates"*, because the operations document is explicit
that this business holds none and competes on results instead. Saying it plainly
is worth more than the row it replaces, and it is the only version that survives
somebody checking.

### H · What must never appear

> *Without this the site publishes something the owner assumed you knew
> not to.*

- Is there an address, a location, or a facility that shouldn't be published?
- Any number that isn't the one you want called?
- Anything on your profile that's out of date or that you'd rather not lead with?
- Is there a service you'd rather not attract enquiries for?

On the first site the workshop's location stays off the site, the registered
address is an administrative office with nothing to visit, and one of the numbers
on the profile is a call-tracking line for a vehicle wrap. Twelve passages had
named the workshop's street before anyone asked.

---

## Turning the answers into the two files

`OPERATIONS.md` is prose and is authoritative. Two machine-readable files derive
from it, and both live with the business rather than with the engine:

**`claims-<entity>.yaml`** — one entry per correction from section F, plus any
hard fact from B, D or E that generated copy would get wrong. Each is a regular
expression and a `why` that states what is *true*, not what is banned: the person
reading it is mid-build and needs the correct fact, not a scolding. Write the
pattern narrowly enough that the page can still describe what competitors do —
the site is allowed to say "estimates that change are the competitor practice",
it is not allowed to offer one.

**`vocabulary-<entity>.yaml`** — the terms of art from section C, plus the
numbers from B, D and E. `specificity.mjs` scores every page on how many appear,
and drops any term this document does not actually use, so the list cannot be
padded to improve the score.

Neither file needs to be complete on day one. An absent claims file means no claim
checks, which is the right behaviour for a business nobody has interviewed yet —
and the wrong behaviour to leave in place once they have.

---

## Checking it

```
node ../engine/scripts/interview-check.mjs
```

Reports which sections of the interview the operations document covers, whether
the two derived files exist, and whether every vocabulary term is actually
grounded in the document. A report rather than a gate: a site can legitimately be
built before the interview is finished, but nobody should be able to forget that
it was.
