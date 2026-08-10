# Drafts

Content in progress. Three files per page, in this order:

```
<page-slug>.outline.md    from one of engine/prompts/01–04
<page-slug>.md            from engine/prompts/05, written against that outline
<page-slug>.facts.md      from engine/prompts/FACT-AUDIT.md, two passes
```

**Committed, deliberately.** These are not scratch files — review happens by
reading a diff, and the fact audit is the record that a page's claims were
checked. A gitignored draft folder would make "was this ever audited?"
unanswerable.

**Nothing moves into `content/<entity>/` until:**

1. The outline is approved.
2. The prose is written from that approved outline — not freehand.
3. The fact audit has run **both** passes, and its `SOURCE TBD` lines are
   either acceptable or resolved.
4. It has been read once as a reader rather than as an auditor.

Promoting means moving the `.md` into `content/<entity>/` and adding the
frontmatter (`engine/prompts/ENGINE-CONTRACT.md` has the required fields —
no prompt writes it). The `.outline.md` and `.facts.md` stay here as the
record.

Then `npm run check`. The floors, link rules and silo checks are enforced at
build time, so a page that skipped a step usually fails loudly — but the fact
audit is the one part nothing can enforce for you.
