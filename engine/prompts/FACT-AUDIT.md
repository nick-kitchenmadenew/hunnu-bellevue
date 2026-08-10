# Fact audit

**Runs on the finished prose, before the page is promoted out of `drafts/`.**
Output goes to `drafts/<page-slug>.facts.md` — a committed file, not a chat
message.

## Why this exists

A page shipped on a real client site with hand-written FAQ answers about
permits, warranties and licensing. They were plausible, non-contradictory, and
sourced from nothing. The session that wrote them said so plainly when asked —
but nobody would have known to ask.

This step makes that impossible to repeat quietly: every factual claim gets
listed with where it came from, and the ones that came from nowhere are visible
as `SOURCE TBD`.

## The protocol

Three steps, in order. **Do not merge steps 1 and 2** — the whole value is that
they are separate passes.

### Pass 1 — enumerate

Read the finished page. List **every factual claim** it makes, each with its
citation. A factual claim is anything a reader could be wrong about: numbers,
timeframes, materials, methods, regulations, what is and isn't included,
service areas, hours, credentials, guarantees.

Not claims: opinion, second-person address, calls to action, descriptions of
what the page itself covers.

### Pass 2 — adversarial re-scan

Read the page **again**, this time against pass 1's list, hunting specifically
for claims pass 1 missed.

This pass exists because a single self-audit reliably lists the obvious claims
and skips the ones embedded mid-sentence — a subordinate clause asserting a
timeframe, an adjective doing factual work ("code-compliant"), a number inside
a benefit statement. Look for those.

**Report what pass 2 found, including nothing.** If it genuinely surfaces no
new claims on a real page, say so — do not manufacture findings to justify the
step, and do not treat one clean run as proof the step is unnecessary.

### Then: read and review

Read the whole page once more as a reader, not an auditor. Regenerate any
section where the audit shows the prose is carrying weight it cannot support.

## Citations

Every claim resolves to exactly one of four:

| Source | Means |
|---|---|
| `OPERATIONS.md` | The owner interview. Quote the line. |
| `gbp-<entity>.json` | The GBP capture — address, hours, categories, services, opened date. Name the field. |
| A URL | External source. Real and checked, not remembered. |
| `SOURCE TBD` | **Nothing backs this yet.** Say what kind of source would. |

`SOURCE TBD` is not a failure state — it is the honest label for a claim the
business hasn't verified yet, and the convention the supporting-content prompt
already uses (*"No made-up numbers"*). What is a failure is a claim presented
as sourced when it isn't.

If a claim can't be sourced and can't be hedged into accuracy, cut it.

## Output format

```markdown
# Fact audit — <page slug>

Audited <date> against `drafts/<page-slug>.md`.

## Pass 1 — enumerated claims

| Claim (quoted) | Section | Source |
|---|---|---|
| "…" | H2 name | OPERATIONS.md § C |
| "…" | H2 name | gbp-bellevue.json → hours |
| "…" | FAQ 3 | SOURCE TBD — needs owner confirmation on permit handling |

## Pass 2 — claims pass 1 missed

<Either a table in the same shape, or the sentence "Pass 2 surfaced no
additional claims." Never omit this section.>

## Review outcome

<Regenerated which sections and why, or "no changes needed".>

## Open — SOURCE TBD

- <claim> — <what would source it>
```

## Where the TBDs go

The `SOURCE TBD` list is the point of writing this to a file. It accumulates
across pages into a specific worklist for the owner interview — "here are the
fourteen claims this site makes that we cannot source yet" beats ninety minutes
of generic questions.

Once `OPERATIONS.md` exists, resolved claims move into `claims-<entity>.yaml`,
where `lint.mjs` enforces them on every subsequent build. That is what turns
"revise after the interview" from an intention into a step someone takes.
