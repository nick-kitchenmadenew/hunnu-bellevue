# Discovery — Hunnu Construction

From `gbp-bellevue.review.md`, captured 2026-07-25.
Proposed by `gbp_to_config.py`. Never read by the engine.

## Not derivable from a Business Profile

Every one of these is a TODO in the proposed config, and the build fails
until they are answered. A plausible placeholder would be worse than a
blank, because a blank gets filled in.

| field | where it comes from |
|---|---|
| `entity.place_id` | the Places API, or the profile's share link |
| `entity.geo` | the map pin |
| `entity.descriptor.does` | what a customer calls the work, not the GBP category |
| `silos[].retheme` | keyword research — the term the title tag competes for |
| `proof.*` | the photographs, reviews and warranty this business actually has |
| `claims-<entity>.yaml` | the owner interview, via OPERATIONS.md |
| `vocabulary-<entity>.yaml` | the same interview — what only this business can say |

## What the profile did say

- **1 categories** — Kitchen remodeler (primary)
- **4 services** across 1 categories
- **12 service-area entries**
- **0 attributes** — not used by the build, but the payments list feeds `paymentAccepted` in schema if you want it

