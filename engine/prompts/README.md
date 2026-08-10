# Content prompts

The pipeline that turns research into a page. One page at a time.

```
research  →  outline  →  (approve)  →  write  →  fact audit ×2  →  review  →  promote
```

Nothing enters `content/<entity>/` until it has been through all of it. Drafts
live in `drafts/` and are committed, so review is diffable.

## The prompts

| File | Page type | Inputs it needs |
|---|---|---|
| `01-outline-gbp-category.md` | `pillar` | City, GBP category, primary category, target keyword, services list — all from `config-<entity>.yaml` |
| `02-outline-gbp-service.md` | `service` | City, service focus, primary category, **8–12 PAA questions** |
| `03-outline-neighbourhood.md` | `location` | City, target keyword, primary category, **hyperlocal facts** (web research) |
| `04-outline-supporting-content.md` | `supporting` | Target keyword, parent page's keyword, **PAA + competitor H2/H3s**, keyword data |
| `05-write-from-outline.md` | any | An approved outline, plus `ENGINE-CONTRACT.md` |
| `FACT-AUDIT.md` | any | The finished prose |
| `ENGINE-CONTRACT.md` | — | Appended to `05`; not used alone |

## Where research comes from

| Input | Tool |
|---|---|
| PAA questions | `scripts/paa-harvest.mjs` — seed with the *service* name for per-service questions; it defaults to head terms per silo |
| Competitor H2/H3s | `scripts/serp-headings.mjs` |
| Keyword volume, related terms | `scripts/keyword-data.mjs` |
| Hyperlocal facts | Web search, in session. No tool — a SERP API doesn't know which buildings have loading-dock rules. |

All three scripts bill DataForSEO. Which account is set per site by
`research.dataforseo` in `config-<entity>.yaml`; credentials live in gitignored
`.env.local`. Every script takes `--dry` — it prints the keywords, the account
and the estimated cost, and calls nothing. **Use it first.**

```
set -a && . ../.env.local && set +a
CORE30_ENTITY=<entity> node ../engine/scripts/paa-harvest.mjs --dry
```

## Two things that will fail the build if ignored

Both live in `ENGINE-CONTRACT.md`, and neither is mentioned in the editorial
prompts:

1. **`[[anchor]]`** — a linked section needs exactly one paragraph containing
   that literal token. `prose.js` throws without it.
2. **Frontmatter** — no prompt writes it. `type`, `silo`, `title`,
   `description`, `h1`, `lede`, `sections` are all required.

## Changing a prompt

These are engine files. Edit here, add a `CHANGELOG.md` entry in the same
commit, tag a release — then every site picks the change up on its next
`engine-sync`. See the "two tracks" note in the root `README.md`.
