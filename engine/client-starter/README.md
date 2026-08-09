# Starting this site

Full sequence: `docs/NEW-SITE-CHECKLIST.md` in the core30 repo. This is the
one thing worth knowing before you touch anything here.

## Discovery runs once

```
python3 engine/audit-tool/gbp_parse.py captures/<business>.txt --out audit-tool/out/gbp-<entity>.json
python3 engine/audit-tool/gbp_to_config.py audit-tool/out/gbp-<entity>.json --out config-<entity>.yaml
```

This is a **bootstrap step, not a recurring one.** It turns a Business
Profile paste into a *proposed* `config-<entity>.yaml` and a
`discovery-<entity>.md` naming what it couldn't derive. Once you've read
`discovery-<entity>.md`, filled in every `TODO`, and confirmed the silo map,
`config-<entity>.yaml` is authoritative — edit it by hand from there.
That's not a suggestion `gbp_to_config.py` enforces on you: it genuinely
won't overwrite an existing config (a re-run writes `<name>.proposed.yaml`
beside it instead, so the two can be diffed by eye), but the point of
saying this plainly is that it isn't the workflow either. Re-running it out
of habit means re-reading a discovery file you've already acted on.

**The check that *does* run repeatedly is a different tool:**
`engine/scripts/gbp-drift.mjs` diffs the live GBP against the config you've
already confirmed, to catch drift after the fact. Discovery proposes once;
drift-checking watches on an ongoing basis. Don't reach for the first one
when you mean the second.
