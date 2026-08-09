# Design Tokens — extracted from the live WordPress theme

**Decision (2026-07-25):** carry the existing visual identity forward. Source is the live
kitchenmadenew.com theme — **Salient / Nectar**, with Google Fonts.

These are the real values pulled from the theme CSS, not guesses. They become the single token
file every component reads; no page ever specifies a colour.

---

## Palette — DECIDED (2026-07-25, delegated to Claude)

### The reasoning

**Photography decides this.** 100+ job albums will dominate every page, and kitchens are already
full of colour — sage cabinets, white quartz, oak floors, brass hardware. A saturated brand
colour spread across the UI competes with the product being sold. So the interface recedes: warm
neutrals for the ~95% of the page that isn't a photograph, one strong accent reserved strictly
for actions.

Warm neutrals also differentiate — every contractor site in this market is grey-and-blue — and
they complement wood and paint tones rather than fighting them.

**Blue is kept for actions**, not replaced. It's a five-figure purchase where blue does real
trust work; it preserves continuity with the existing brand and vehicle livery; and it carries
contrast headroom a warm accent can't.

### Tokens

| Token | Value | Use |
|---|---|---|
| `bg` | `#FAF8F5` | Page background — warm off-white, cuts glare, makes photos sit forward |
| `surface` | `#F2EEE8` | Section backgrounds, cards |
| `border` | `#E2DBD1` | Rules, dividers, image frames |
| `ink` | `#1C1917` | Body text — warm near-black, never pure `#000` |
| `muted` | `#6B6259` | Secondary text, captions, metadata |
| `accent` | `#1B3A6B` | **Actions only** — buttons, links, focus rings |
| `accent-hover` | `#152D53` | Hover/active |
| `warm` | `#E6C7A3` | Carried over from the old theme. **Decorative only** |
| `bronze` | `#9A6B3F` | Icons, rules, small marks. Nods to cabinet hardware |

### Contrast — verified

| Pair | Ratio | Verdict |
|---|---|---|
| `ink` on `bg` | **16.5:1** | AAA |
| `accent` on `bg` | **10.6:1** | AAA — links and headings |
| White on `accent` | **11.3:1** | AAA — button labels |
| `muted` on `bg` | **5.6:1** | AA |
| `warm` on `bg` | ~1.5:1 | ❌ decorative only |
| `bronze` on `bg` | ~4.0:1 | ❌ below AA for body text — icons/rules only, or text on dark |

**Hard rule: `warm` and `bronze` never carry text on a light background and never label a CTA.**
This is the trap in the inherited palette — both read as "brand colours" in a style guide and
both fail. The linter should flag them in text roles.

**Discipline:** `accent` appears only on things you can click. If everything is accented, nothing
reads as the action — which matters, because the phone number and quote button are the entire
point of the page.

### What was replaced, and why

| Old | Status |
|---|---|
| `#0066bf` Salient accent | Dropped — 5.75:1 is only just AA, and it's the generic contractor blue |
| `#003399` | Evolved to `#1B3A6B` — calmer, warmer, sits better against wood tones |
| `#f5cb5c` gold | Dropped — failed contrast, no role once neutrals are warm |
| `#e6c7a3` tan | **Kept** as `warm`, decorative only |
| `#f7f7f7` cool grey | Replaced by warm `#F2EEE8` |

Dark mode is **not** planned — this is a marketing site, and it would double design surface for
no measurable gain.

---

## Typography — DECIDED (2026-07-25)

### The old theme, for reference
Salient used **Poppins** (headings) + **Open Sans** (body), loaded from
`fonts.googleapis.com` — render-blocking and a third-party round-trip. Both are gone.

### What the site uses now

| Token | Family | Job |
|---|---|---|
| `--font-display` | **Newsreader** variable, latin subset | Headings and headline statements **only** |
| `--font-ui` / `--font-body` | **Source Sans 3** variable, latin subset | Everything else |

Self-hosted, subset to latin, `font-display: swap`. Body face preloaded; the display face is
deliberately **not** preloaded — preloading both put 102 KB at top priority and cost 0.5 s of
mobile LCP. Trade-off taken knowingly: CLS 0 → 0.029.

### The rule, because it drifted once

`--font-display` is for **h1–h4, FAQ questions, table headers, the warranty headline, and
customer quotes.** Nothing else. Never below `--step-0`, never uppercase, never a label.

Everything else — body, ledes, bullets, captions, before/after tags, eyebrows, nav, buttons and
statistics — is `--font-ui`.

Customer quotes are the one deliberate exception. A quote is a different *voice*, not a
different level, and the serif is what marks it as someone else speaking.

**What went wrong without this written down:** the serif spread to two micro-labels (the hero
before/after tag, the masthead descriptor) and one statistic (`.cons__count`), so the *same*
before/after tag was set in the serif in the hero and the sans in the gallery, and two headline
figures doing identical jobs used different faces. Corrected 2026-07-25.

`--font-body` and `--font-ui` resolve to the same family today. Both names are kept because
they express different intent and may diverge. When in doubt, use `--font-ui`.

*Future:* Chinese support (§9b) needs a separate CJK stack. CJK webfonts run 2–5 MB unsubsetted
and will need real work against the budget when that time comes.

*Future:* Chinese support (§9b) needs a separate CJK stack. CJK webfonts run 2–5 MB unsubsetted
and will need real work against the budget when that time comes.

---

## Known drift to discard

The content generator emits `hero_bg_color: #f0f7ff` and `hero_primary_color: #2563eb` per page.
That blue is a generic framework default and matches **neither** brand blue. The engine ignores
both fields — tokens win. (See §7 of `PLANNING.md`.)

---

## Still needed from Nick

- **Logo source file** — the live site serves an optimiser-rewritten PNG; an SVG or high-res
  original is wanted for crisp rendering at any size
- **Confirmation the palette is right.** These are the theme's values, which may be a designer's
  intent or may be defaults that were never revisited. If the gold/tan were never deliberate,
  say so and the palette simplifies to the two blues plus neutrals
- Any brand assets used off-site — vehicle wrap, business cards, quote templates — so the site
  matches what customers already see
