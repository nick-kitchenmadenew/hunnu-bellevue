# Starting a new site — the checklist

This sequences existing tooling with two additions (icons, review-link
verification) that closed real gaps found while onboarding kmn-oakville's
third entity. It does not replace `README.md`'s "Starting a new site from a
Business Profile" or `docs/OWNER-INTERVIEW.md` — it orders them, and adds the
steps that weren't part of either process before 2026-08-06.

## 1. Scaffold the repo

Copy `client-starter/` into a new repo. Rename the two placeholder
`"REPLACE-ME-site"` package names in `package.json` and `site/package.json`.

## 2. Structure, from a Business Profile

```
python3 engine/audit-tool/gbp_parse.py captures/<business>.txt \
        --services captures/<business>-services.txt \
        --out audit-tool/out/gbp-<entity>.json
python3 engine/audit-tool/gbp_to_config.py audit-tool/out/gbp-<entity>.json \
        --out config-<entity>.yaml
```

Produces `config-<entity>.yaml` and `discovery-<entity>.md` — read the
discovery file, it names what the generator could not derive and why. Read
`client-starter/config-template.yaml` first if the shape of the output is
unfamiliar; it is a tour, not something to copy over the generator's output.

**Fill in every TODO the generator left**, `place_id` especially — nothing
downstream can tell a wrong `place_id` from a right one until step 5 below.

## 3. Substance, from the owner

`docs/OWNER-INTERVIEW.md` — the interview that produces `OPERATIONS.md` and,
from it, `claims-<entity>.yaml` and `vocabulary-<entity>.yaml`. Check
progress with:

```
node ../engine/scripts/interview-check.mjs
```

A report, not a gate — a site can be built before the interview is finished,
but nobody should be able to forget that it was left unfinished.

## 4. Icons

Drop `icon-512.png` and `icon-180.png` into `site/public/` — see
`client-starter/site/public/README.md`. Everything else in the favicon
family (`favicon.ico`, both `apple-touch-icon` names, plus `icon-32.png` and
`icon-192.png`, which also need supplying) generates automatically on every
build via `derive-icons.mjs`, and the build now fails loudly if either source
is missing rather than shipping a site with no bookmark icon, which is what
happened to kitchenmadenew.com for its first month live.

## 5. Verify the review link, once `place_id` and `reviews.url` are both filled in

```
cd site && npm run reviewlinks
```

Confirms `reviews.url` actually resolves to the same Google profile named by
`place_id`, before the link ships. This is the check that would have caught
kmn-oakville's GTA review link pointing at a different business's profile —
returning HTTP 200 the whole time, invisible to every other check — for as
long as it did. Re-run it any time a review link is added or changed, not
only during onboarding.

## 6. Pull in the engine

```
node scripts/engine-sync.mjs v1.25.0   # or whatever the current tag is
```

## 7. Check everything

```
cd site && npm run check
```

Runs frontmatter validation, the silo/hours/composition tests, the build
itself, and the full post-build lint — including the icon-existence guard
from step 4 and everything documented in `docs/CORE30-STRUCTURE.md`.

## 8. If replacing an existing site

Only if this repo retires a prior website's URLs:

- `redirects.yaml` — every crawled live URL needs a disposition (keep / 301 /
  410); `redirects.test.mjs` fails the build on anything undeclared.
- `emit-redirects.mjs` writes the 301s into `vercel.json`'s `redirects` array.
- A retired URL that should return 410 rather than redirect needs a rewrite
  entry pointing at `/api/gone` in `vercel.json` — see `api/gone.js`'s header
  comment for why 410 and not a redirect, and fill in every placeholder in
  that file before it goes live; it ships with none of a real business's
  details in it.

A greenfield business with no prior site skips this step entirely — there is
nothing to retire.
