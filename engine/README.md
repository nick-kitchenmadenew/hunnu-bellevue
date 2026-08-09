# core30

The build behind a Core 30 local-SEO site: layouts, the section model, the silo
link rules, the linter, and the audit tooling that turns a Google Business
Profile into a site structure.

It is not a site. It is consumed by **one repository per business**, which
supplies everything the engine deliberately does not know: the config, the
content, the photographs, the reviews, and the claims that business cannot make.

## The split

The rule is: if it would be different for a plumber, it is not in here.

| here | in the business's repo |
|---|---|
| layouts, components, section order | content, photographs, reviews |
| the silo rules and the linter | `claims-<entity>.yaml`, `vocabulary-<entity>.yaml` |
| the frontmatter schema | `config-<entity>.yaml` |
| the design tokens and type | the logo, the icons, the colour overrides |
| the GBP audit and PAA harvest | their outputs |

The claim guards are the sharpest case. They are 21 regular expressions saying
what one cabinet refacer must never write — that stone carries their five-year
warranty, that a quote is produced during a visit — and every one traces to a
finding in that business's own operations document. Held here, they would be
either wrong or dead for every other business. Held there, they are the
machine-readable residue of the owner interview.

## Consuming it

A business repository looks like this:

```
acme-plumbing/
  package.json          npm workspaces: ["engine", "site"]
  engine/               a tagged release of core30, vendored — see below
  scripts/engine-sync.mjs
  scripts/engine-check.mjs
  site/
    package.json
    astro.config.mjs    makeConfig({ imagesModule })
    src/
      content.config.ts  re-exports the engine schema
      pages/[...slug].astro
      lib/images.js      the photograph registry — see below
      assets/            the photographs
    public/
  content/
  config-acme.yaml
  claims-acme.yaml
```

Workspaces rather than a plain dependency, and that is not a preference. Node
resolves a symlinked package by its real path, so engine files inside
`site/node_modules/core30` would look for `astro` and `js-yaml` in the engine's
own tree and never find the site's. Hoisting to one `node_modules` at the repo
root is what makes both halves resolve, and it keeps a single Astro instance,
which `astro:content` requires.

### Three files the engine cannot provide

**`src/lib/images.js`** — the photograph registry. `import.meta.glob` is resolved
by Vite relative to the file that calls it, so a registry inside the engine would
glob the engine's assets and find nothing. It is also the right home: which
photographs exist is the business's fact. The engine reaches it through the
`core30:images` alias, which `makeConfig` wires up.

**`src/pages/[...slug].astro`** — Astro requires `getStaticPaths` to be exported
from a file under the project's own `src/pages`. The body is four lines
re-exporting `core30/lib/routes.js`.

**`src/content.config.ts`** — the same constraint, one line.

## Where the payload is

Every path the build needs from outside itself is resolved in `src/lib/paths.js`:

```
CORE30_PAYLOAD   directory holding config, content, reviews, OPERATIONS
                 (default: the parent of the cwd — i.e. running from site/)
CORE30_ENTITY    which entity inside it (default: oakville)
CORE30_CONFIG    an explicit config path, overriding both
```

Both naming conventions work: `config-acme.yaml` and a bare `config.yaml`.

## Running it

From the business repo's `site/`:

```
npm run check     frontmatter → GBP drift → silo rules → composition → build → lint
npm run build
```

`check` is the gate. It fails the build on a broken silo link, a claim that
contradicts the operations document, a heading level out of order, a duplicated
section name, or frontmatter YAML that would have thrown a stack trace from
inside the content loader.

A site's `test` script should be exactly two entries — verify the vendored engine,
then run its suite:

```json
"test": "node ../scripts/engine-check.mjs && node ../engine/scripts/test.mjs",
"lint": "node ../engine/scripts/post-build.mjs",
"check": "npm run test && astro build && npm run lint"
```

`test.mjs` runs on source, `post-build.mjs` runs on `dist` — the split is what a
check needs, not what it is about. You cannot ask whether a redirect target
exists until the pages are on disk.

Listing the individual checks there instead means a guard added to the engine
reaches only the sites whose package.json somebody remembered to edit, and a new
guard that silently does not run is worse than no guard — the build still goes
green.

Research tooling, run by hand rather than in the build:

```
node ../engine/scripts/paa-harvest.mjs --dry      People Also Ask, via DataForSEO
node ../engine/scripts/rank-track.mjs --dry       the LeadSnap grid against baseline
node ../engine/scripts/specificity.mjs            what only this business could say
```

## The two halves of a new site

A Business Profile gives you structure. It cannot give you a single fact that
makes one business worth choosing over the one beside it — that comes out of an
interview with whoever does the work, and it is where the quality lives.

| | from | produces |
|---|---|---|
| structure | a GBP dashboard paste | `config-<entity>.yaml` |
| substance | ninety minutes with the owner | `OPERATIONS.md`, and from it `claims-` and `vocabulary-<entity>.yaml` |

`docs/OWNER-INTERVIEW.md` is the question set, organised by what breaks without
each answer. `docs/OPERATIONS-TEMPLATE.md` is the skeleton the answers go into.
`scripts/interview-check.mjs` reports how much has landed — a report rather than
a gate, because a site can legitimately be built before the interview is
finished, but nobody should be able to forget that it was.

## Starting a new site from a Business Profile

```
python3 engine/audit-tool/gbp_parse.py captures/acme.txt \
        --services captures/acme-services.txt --out audit-tool/out/gbp-acme.json
python3 engine/audit-tool/gbp_to_config.py audit-tool/out/gbp-acme.json \
        --out config-acme.yaml
```

Paste the dashboard rather than calling an API: the Business Profile API is
access-gated and the Places API never returns the category list or the services
list — and the services list is what the silos hang on.

`gbp_to_config.py` **proposes**. It derives the entity, the address, the hours,
the categories, the silos, every service slug and the service-area cities, and it
refuses to overwrite an existing config — later runs write `.proposed.yaml`
beside it, because from the moment a person has edited the config it is
authoritative and `gbp-drift.mjs` is how the profile gets compared to it.

It writes `discovery-<entity>.md` alongside: what it guessed, what it could not
derive, and what about the profile will make the site awkward. That file matters
as much as the config. Run against a five-category construction profile it
reported that two of the categories produce twenty-two of the same service slugs
— which is a decision about the silo map, and the silo map is the one thing that
must stay human-confirmed.

Fifteen TODOs survive in a generated config and every one is deliberate:
`place_id`, `geo`, the masthead descriptor, and a `retheme` per silo. None is on
a Business Profile, and a plausible placeholder would be worse than a blank
because a blank gets filled in.

## Versioning: vendored, not submoduled

A site copies a tagged release into `engine/` and commits it:

```
node scripts/engine-sync.mjs v1.1.0
cd site && npm run check
```

This was forced rather than chosen. **Vercel does not clone private git
submodules** — its build prints `Warning: Failed to fetch one or more git
submodules`, carries on, and dies three steps later at `Cannot find module
'core30/astro-config'`. Granting the Vercel GitHub App access to this repository
does not help: the token it clones with is scoped to the project's own repo.

It turns out to cost little and buy something. Deploys need no credentials and no
submodule support anywhere. An upgrade arrives as an ordinary diff, so "what
changed in the build" is answerable by reading the pull request. And the pin is
the strongest kind — nothing changes until somebody runs the sync.

What it does not buy is protection from editing `engine/` in place, which works
locally, exists nowhere else, and is destroyed by the next sync. So the sync
writes a sha256 per file to `engine/.core30-manifest` and `engine-check.mjs`
verifies it first in `npm run check`. Both scripts live in `client-starter/`.

Upgrading stays deliberate because the linter is strict: a new guard is a new way
for a site that built yesterday to stop, and that should happen when someone
chose it, not when they happened to deploy.

Every tag gets a `CHANGELOG.md` entry, written in the same commit that gets
tagged — the tag message is the full account; the changelog is the one place
to read what changed release over release without walking `git log`.

**Two tracks feed a tag, not one.** Most releases are a code change — a
linter rule, a template fix — with a CHANGELOG entry alongside it. But the
methodology knowledge base (`docs/CORE30-METHODOLOGY.md`, `CORE30-FAQ.md`,
`CORE30-APPLIED-PRINCIPLES.md`) can change on its own, with no code diff at
all, and that's a real release too: `engine-sync.mjs` copies the whole repo
tree, `docs/` included, so a docs-only tag is exactly as valid a way to get
a KB update into a consuming site as a code tag is — it just has nothing to
verify against `.core30-manifest` beyond the new file hashes. Small wording
fixes can wait for the next tag; anything a session might actually need
soon — a new FAQ answer, a newly confirmed applied principle — tags on its
own, same threshold already used for code. If a KB entry turns out to
*imply* something that should be enforced (a linter rule, a template
change), that's just a code tag that happens to have a KB edit in the same
commit — no separate mechanism, and not something to automate: deciding
whether a principle deserves enforcement is a judgment call made once, by
whoever is adding it, not a scan that runs later.

## Documentation

`docs/` carries the method rather than the code: `CORE30-STRUCTURE.md` for the
page and link model, `CONFIG-SCHEMA.md` for every config field, `AUDIT-METHOD.md`
for the GBP audit, `CORE30-LEARNINGS.md` for what has been tried and what came of
it, `DESIGN-TOKENS.md` for the type and colour rules, `CONTENT-BRIEF.md` for how
pages get written.

### The methodology knowledge base

Three files hold what the Core 30 method actually *is*, kept strictly
separate by whose claim each one is. Read them by section — grep the heading
you need rather than opening them whole.

- **`CORE30-METHODOLOGY.md`** — what the course teaches, synthesized from the
  eleven lesson videos. Canonical; governs the other two.
- **`CORE30-FAQ.md`** — implementation answers from the weekly calls,
  deduplicated by question. Adds nuance to the methodology, never overrides
  it. Carries the ingestion-status table for new calls.
- **`CORE30-APPLIED-PRINCIPLES.md`** — what *we* have validated across more
  than one client. Never mixed into the two above.

The raw material sits in `course-transcripts/` and is an **audit trail** —
normal work should not open it. A missing answer is a gap to fix in the
synthesis, not a reason to re-read transcripts.
