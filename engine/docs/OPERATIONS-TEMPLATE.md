# OPERATIONS.md — template

Copy this to `OPERATIONS.md` in the business's repo and fill it from the
interview recording. See `OWNER-INTERVIEW.md` for the questions and for what a
usable answer sounds like.

**This document is authoritative.** Where a generated page and this file
disagree, this file wins and the page is wrong — that is the rule the whole
claim-guard mechanism rests on. Which means: write what is true, not what sells.
Anything aspirational in here becomes a claim the site makes.

Keep the headings. `interview-check.mjs` looks for them to report coverage, and
they are also the order the interview runs in, so a half-finished document shows
you where you stopped. Delete nothing — an empty section under a heading is
information ("we asked, there was nothing"); a missing heading is not.

---

## What we do in-house

<!-- Who physically does each part. Name the trades held. -->

## What we contract out

<!-- To whom, who holds the schedule, where responsibility ends. This section is
     the source of the "we do not say we do X in the first person" guards. -->

## The process, start to finish

<!-- Day one, then what. Real durations. Which parts are waiting. -->

### How long the customer is without the room

<!-- The honest number, not the exciting one. If there is a difference between
     the loud figure and the true one, write both and say which is which. -->

### Anything the customer must do or avoid

<!-- Leaving the house, clearing a room, being present for a decision. Safety
     facts go here and are not negotiable in copy. -->

## Materials and method

<!-- Named products. Why this one. What everyone else uses and what it does
     wrong. What you make or mix yourself. -->

### The step nobody sees

<!-- Preparation, curing, whatever decides the outcome and is invisible in a
     photograph. -->

### What has been tried and rejected

## Pricing

<!-- What drives the number. What makes two similar jobs differ. -->

### How a quote is produced

<!-- From what, by whom, how long it takes, and whether it can change afterwards.
     Be exact: this is where most claim guards come from. -->

### Quoted separately

### The cheap version, and what it costs the customer

## Warranty

<!-- Term, on what, issued when. -->

### Exceptions

<!-- Any part of the job on different terms, and why. -->

### Covered versus damage

## What people get wrong

<!-- Customer misconceptions. Competitor claims that irritate. Bad advice in the
     trade. Jobs put right for somebody else.

     The richest section. Each entry here should become an entry in
     claims-<entity>.yaml. -->

## The business

<!-- Years, structure, volume. -->

### The team

<!-- Employees or subcontractors, tenure, who turns up at a customer's house. -->

### Credentials and compliance

<!-- Licences, insurance, memberships — anything verifiable by a third party.

     And what is NOT held. An honest "no trade certifications, we compete on
     results" is usable on the page; a vague implication of credentials is not. -->

## What must never appear on the site

<!-- Addresses or facilities that stay unpublished. Numbers that are not the one
     to call. Services not to attract enquiries for. Anything out of date on the
     profile. -->

---

## Derived from this document

- `claims-<entity>.yaml` — enforced at build. Each entry cites the section here
  that justifies it.
- `vocabulary-<entity>.yaml` — scored by `specificity.mjs`, which drops any term
  this document does not use.

Update those two whenever this file changes. A claim that no longer matches
operations is worse than no claim, because it fails a build for the wrong reason.
