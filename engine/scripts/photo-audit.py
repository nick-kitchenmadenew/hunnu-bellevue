#!/usr/bin/env python3
"""
Which photograph is published where, and which albums are still spare.

    python3 ../engine/scripts/photo-audit.py            # write PHOTO-USAGE.md
    python3 ../engine/scripts/photo-audit.py --check    # fail on a duplicate

WHY THIS EXISTS. On 2026-08-02 the `antonella` kitchen went live on the GTA root
captioned "King City" while it was already live on Oakville captioned "Merton" —
the same kitchen claimed in two places fifty kilometres apart, which is the
specific failure INVENTORY.md's section F warns about. It was found by accident,
in a screenshot taken for something else.

The cause was trusting prose. Section F listed that album as "complete and
unpublished"; Oakville had already used it. A note about what is published goes
stale the moment somebody publishes something. The galleries are the only thing
that actually knows, so this reads them.

MATCHING IS PERCEPTUAL, not by filename. Published files are named
<service>-<hood>-<city>.jpg and carry no trace of the album they came from.

The first version of this used a plain average hash over the whole frame and was
wrong: published assets are CROPPED from their source, and neither average nor
difference hashing survives a crop. It matched 9 albums where roughly 40 are in
use, which would have told somebody an album was spare when it was already live —
precisely the mistake this file exists to prevent. A tool that is confidently
wrong about this is worse than no tool.

What works is sliding a 5:4 window over the source at three scales and nine
positions and keeping the closest difference hash. On the one pair whose
provenance is independently known — Glenorchy is the marialopez album — that
scores 46 against 81 for the nearest unrelated image. Whole-frame hashing scored
53 against 59 and could not tell them apart.

HEIC is skipped where a .jpg sibling exists. The library keeps 1400px review
conversions next to the originals; decoding 1,154 HEICs to learn what the jpg
already says would turn a minute into twenty.
"""
import argparse
import csv
import json
import os
import pathlib
import sys

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit("  Pillow is required: pip3 install pillow")
try:
    import yaml
except ImportError:
    sys.exit("  PyYAML is required: pip3 install pyyaml")

HERE = pathlib.Path(__file__).resolve()
PAYLOAD = pathlib.Path(os.environ.get("CORE30_PAYLOAD", HERE.parent.parent.parent))
ASSETS = PAYLOAD / "site" / "src" / "assets"
LIBRARY = pathlib.Path(os.environ.get("CORE30_PHOTOS", PAYLOAD.parent / "KMN Photo Library"))
CACHE = PAYLOAD / ".photo-hash-cache.json"
REPORT = PAYLOAD / "PHOTO-USAGE.md"

# Two PUBLISHED assets are the same photograph below this. Both went through the
# same crop, so the distance collapses to near zero — the Merton/King City pair
# scored 1.
SAME = 20

# A published asset came from this SOURCE image below this. Wider, because the
# published version is a crop of it. Calibrated on Glenorchy/marialopez: 46 for
# the true source, 81 for the nearest unrelated image. Anything between is
# reported as uncertain rather than guessed at.
FROM_SOURCE = 65
UNCERTAIN = 80

# Version of the crops() window grid. It is part of the crop cache key, because
# nothing else in that key changes when the grid does. Bump it with crops().
GRID = 2


def opened(path):
    """Open, and rotate ONCE, here.

    The library's 1400px review JPEGs are stored landscape with a rotation flag,
    so reading one raw hashes a sideways picture — the paulcassian pair scored 95
    unrotated and 1 rotated.

    Rotating inside dhash() instead looked equivalent and was not: crops() would
    then slice the SIDEWAYS frame and rotate each fragment afterwards, which is a
    different region of a different picture. That scored 67 — inside the
    uncertain band — and reported an album as spare that was live on the GTA
    root. Rotate the source, then cut it up. Not the other way round.
    """
    return ImageOps.exif_transpose(Image.open(path))


def dhash(im, s=16):
    """Difference hash as an int, so comparison is one XOR and a popcount."""
    im = im.convert("L").resize((s + 1, s))
    px = list(im.getdata())
    bits = 0
    for r in range(s):
        row = px[r * (s + 1):(r + 1) * (s + 1)]
        for c in range(s):
            bits = (bits << 1) | (1 if row[c] > row[c + 1] else 0)
    return bits


def crops(im, ar=1.25):
    """The 5:4 windows a published asset could have been taken from.

    The grid was (1.0, 0.85, 0.7) at thirds, and that was too coarse. Two GTA
    refinishing heroes were cut at zoom 1.45 — a 0.69 window, just under the
    floor — anchored at 0.45/0.30 and 0.62/0.20, which the thirds do not reach.
    One scored 67, inside the uncertain band; the other did not match at all,
    and `leea` was reported spare while it was live on the GTA root.

    Going to quarters and down to 0.55 costs about 3.5x the windows. That is
    minutes on a full run, against the cost of publishing one kitchen twice
    under two city names.
    """
    w, h = im.size
    for scale in (1.0, 0.85, 0.7, 0.55):
        if w / h > ar:
            cw, ch = int(h * ar * scale), int(h * scale)
        else:
            cw, ch = int(w * scale), int(w / ar * scale)
        if cw > w or ch > h or cw < 40 or ch < 40:
            continue
        for fx in (0, 0.25, 0.5, 0.75, 1):
            for fy in (0, 0.25, 0.5, 0.75, 1):
                x, y = int((w - cw) * fx), int((h - ch) * fy)
                yield im.crop((x, y, x + cw, y + ch))


def dist(a, b):
    return bin(a ^ b).count("1")


def load_cache():
    if CACHE.exists():
        try:
            return json.loads(CACHE.read_text())
        except Exception:
            pass
    return {}


def _key(path):
    st = path.stat()
    return f"{path}|{int(st.st_mtime)}|{st.st_size}"


def hashed(path, cache):
    """One hash of the whole frame. For PUBLISHED assets, which are already cropped."""
    k = _key(path)
    if k not in cache:
        try:
            cache[k] = dhash(opened(path))
        except Exception:
            cache[k] = None
    return cache[k]


def crop_hashes(path, cache):
    """Every 5:4 window of a SOURCE image, so a cropped publish still matches.

    GRID is in the cache key on purpose. The key is path|mtime|size, none of
    which change when crops() changes, so widening the window grid would have
    silently reused the old 27 hashes per source and the fix would have looked
    like it did nothing. Bump GRID whenever crops() changes.
    """
    k = _key(path) + f"|crops{GRID}"
    if k not in cache:
        try:
            cache[k] = [dhash(c) for c in crops(opened(path))]
        except Exception:
            cache[k] = []
    return cache[k]


def published():
    """Every asset any entity actually renders, and what uses it."""
    used = {}                                  # asset stem -> [(entity, how)]
    for cfg in sorted(PAYLOAD.glob("config-*.yaml")):
        ent = cfg.stem.replace("config-", "")
        doc = yaml.safe_load(cfg.read_text()) or {}
        proof = doc.get("proof") or {}
        for g in proof.get("gallery") or []:
            for side in ("before", "after"):
                used.setdefault(f"{g['slug']}-{side}", []).append(
                    (ent, f"gallery · {g.get('hood','?')} · {g.get('silo','?')}"))
        for key in ("share_image",):
            if proof.get(key):
                used.setdefault(pathlib.Path(proof[key]).stem, []).append((ent, key))
        for key in ("consultation", "team"):
            blk = proof.get(key) or {}
            if blk.get("photo"):
                used.setdefault(pathlib.Path(blk["photo"]).stem, []).append((ent, key))
        # page-level heroes
        for md in sorted((PAYLOAD / "content" / ent).rglob("*.md")):
            head = md.read_text().split("---")
            if len(head) < 2:
                continue
            try:
                fm = yaml.safe_load(head[1]) or {}
            except Exception:
                continue
            hero = fm.get("hero") or {}
            if hero.get("slug"):
                for side in ("before", "after"):
                    used.setdefault(f"{hero['slug']}-{side}", []).append(
                        (ent, f"hero · /{md.stem}/"))
            if hero.get("single"):
                used.setdefault(pathlib.Path(hero["single"]).stem, []).append(
                    (ent, f"hero · /{md.stem}/"))
    return used


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true",
                    help="exit non-zero if one photograph is published twice")
    args = ap.parse_args()

    if not LIBRARY.exists():
        sys.exit(f"  no photo library at {LIBRARY}\n"
                 f"  set CORE30_PHOTOS if it lives somewhere else.")

    cache = load_cache()
    used = published()

    # ── the published side ────────────────────────────────────────────────
    live = {}
    for p in sorted(ASSETS.iterdir()):
        if p.name.startswith("ph-") or p.suffix.lower() not in (".jpg", ".jpeg", ".png", ".webp"):
            continue
        h = hashed(p, cache)
        if h:
            live[p.stem] = h

    # ── one photograph published twice ────────────────────────────────────
    dupes = []
    stems = sorted(live)
    for i, a in enumerate(stems):
        for b in stems[i + 1:]:
            if dist(live[a], live[b]) < SAME:
                wa = used.get(a, [])
                wb = used.get(b, [])
                if wa and wb:
                    dupes.append((a, b, wa, wb))

    # ── which album each published photograph came from ───────────────────
    albums = sorted(d for d in LIBRARY.iterdir() if d.is_dir() and not d.name.startswith(("_", ".")))
    best = {}                                   # published stem -> (distance, album)
    for alb in albums:
        jpgs = {p.stem.lower(): p for p in alb.iterdir()
                if p.suffix.lower() in (".jpg", ".jpeg", ".png")}
        for p in alb.iterdir():
            if p.suffix.lower() not in (".jpg", ".jpeg", ".png", ".heic"):
                continue
            if p.suffix.lower() == ".heic" and p.stem.lower() in jpgs:
                continue                       # the review jpg says the same thing
            for stem, lh in live.items():
                d = min((dist(h, lh) for h in crop_hashes(p, cache)), default=999)
                if d < best.get(stem, (999, None))[0]:
                    best[stem] = (d, alb.name)

    # ── the same job filed under two album names ──────────────────────────
    # hatty2 and hattybedford are one kitchen in two folders — 65 identical
    # frames — and Oakville publishes it as Southeast Oakville. Comparing only
    # PUBLISHED assets could never see that: the second folder has nothing
    # published, so it read as spare and was very nearly recommended for the GTA
    # homepage. An album is only spare if no NAME for that job is spent.
    by_frame = {}
    for alb in albums:
        for f in alb.iterdir():
            if f.suffix.lower() not in (".jpg", ".jpeg", ".png"):
                continue
            h = hashed(f, cache)
            if h is not None:
                by_frame.setdefault(h, set()).add(alb.name)
    twinned = {}
    for names in by_frame.values():
        if len(names) > 1:
            for a in names:
                twinned.setdefault(a, set()).update(names - {a})
    # three shared frames, so one coincidental match does not marry two albums
    twins = {a: bs for a, bs in twinned.items()
             if any(sum(1 for n in by_frame.values() if a in n and b in n) >= 3 for b in bs)}

    CACHE.write_text(json.dumps(cache))

    album_use, uncertain = {a.name: [] for a in albums}, []
    for stem, (d, alb) in best.items():
        if stem not in used:
            continue
        if d < FROM_SOURCE:
            album_use[alb].append(stem)
        elif d < UNCERTAIN:
            uncertain.append((stem, alb, d))
    # a job published under its other name is not spare
    for a, bs in twins.items():
        if not album_use.get(a) and any(album_use.get(b) for b in bs):
            album_use[a] = [f"(same job as {', '.join(sorted(bs))}, published there)"]

    # Three buckets, not two. An uncertain match used to be recorded and then
    # dropped, so the album appeared on the plain spare list with nothing said
    # about the doubt — `leea` matched a GTA hero and was offered up for North
    # York, which would have published one kitchen as a Vaughan job AND a
    # Toronto job.
    #
    # Folding uncertain into "used" was tried and is worse. The band is 65–80
    # and the nearest UNRELATED image in the original calibration scored 81, so
    # most of the band is noise: doing that sterilised eleven usable albums on
    # distances of 74–79 and emptied the shortlist this report exists to fill.
    #
    # So: a third list. Not spare, not spent, just needs eyes on it. The only
    # thing that settles a 74 is a person looking at both pictures.
    checkable = {a for _, a, _ in uncertain}
    spare = [a for a, u in album_use.items() if not u and a not in checkable]
    check = [a for a, u in album_use.items() if not u and a in checkable]
    spent = {a: sorted(set(u)) for a, u in album_use.items() if u}

    # ── report ────────────────────────────────────────────────────────────
    out = [
        "# Which photograph is published where",
        "",
        "Generated by `engine/scripts/photo-audit.py` — do not edit by hand, it is",
        "overwritten. Regenerate after publishing anything:",
        "",
        "```",
        "python3 ../engine/scripts/photo-audit.py",
        "```",
        "",
        "Matching is perceptual rather than by filename, because a published file is",
        "named for its service and neighbourhood and keeps no trace of the album it",
        "came from. A 16×16 average hash survives the crop and the resize.",
        "",
        f"Library: {len(albums)} albums. Published: {len(live)} assets, "
        f"{len(used)} of them referenced by a config or a page.",
        "",
        "## One photograph published twice",
        "",
    ]
    if dupes:
        out += ["**This is the failure this file exists for.** The same kitchen on two",
                "subtrees, or in two neighbourhoods, is what a competitor notices.", ""]
        for a, b, wa, wb in dupes:
            out.append(f"- `{a}` and `{b}`")
            for e, how in wa + wb:
                out.append(f"  - {e} — {how}")
        out.append("")
    else:
        out += ["None. Every published photograph appears once.", ""]

    out += ["## The same job under two album names", ""]
    if twins:
        out += ["Folders holding the same kitchen. Publishing one after the other is",
                "published is the same mistake as publishing one kitchen twice, and the",
                "published-asset check above cannot see it.", "",
                "| Album | Same job as |", "|---|---|"]
        for a in sorted(twins):
            out.append(f"| `{a}` | {', '.join('`'+b+'`' for b in sorted(twins[a]))} |")
        out.append("")
    else:
        out += ["None found.", ""]

    out += ["## Albums already used", ""]
    if spent:
        out += ["| Album | Published as |", "|---|---|"]
        for alb in sorted(spent):
            where = []
            for stem in spent[alb]:
                for e, how in used.get(stem, []):
                    where.append(f"{e}: {how}")
            out.append(f"| `{alb}` | {'<br>'.join(sorted(set(where))) or '—'} |")
    else:
        out.append("None matched.")
    if uncertain:
        out += ["", "## Too close to call", "",
                "Between the two thresholds. Confirm by eye before treating any of "
                "these albums as spare.", "",
                "| Published | Probably from | Distance |", "|---|---|---|"]
        out += [f"| `{s_}` | `{a}` | {d} |" for s_, a, d in sorted(uncertain, key=lambda r: r[2])]

    out += ["", "## Albums with nothing published", "",
            "Candidates for the pages still on placeholder plates. Two caveats, both "
            "of which matter: this knows what is *unused*, not what is *usable* — "
            "`INVENTORY.md` rules on people in frame, consent and our own work "
            "mid-flight. And a very tightly cropped publish can still slip past the "
            "matcher, so check a candidate against the galleries before using it.", ""]
    out += [f"- `{a}`" for a in sorted(spare)] or ["- none"]
    out.append("")

    out += ["## Albums that need a look before they are treated as spare", "",
            "Something published resembles a frame in these, but not closely enough "
            "to call it. The band is 65–80 and the nearest unrelated image in the "
            "original calibration scored 81, so most of this is noise — but the one "
            "that is not noise is a kitchen about to be published twice under two "
            "city names. Open both pictures. Then move the album to spare or record "
            "the usage in `INVENTORY.md`.", ""]
    if check:
        by_alb = {}
        for stem, a, d in uncertain:
            by_alb.setdefault(a, []).append((d, stem))
        for a in sorted(check):
            hits = ", ".join(f"`{s}` at {d}" for d, s in sorted(by_alb[a])[:3])
            out.append(f"- `{a}` — resembles {hits}")
    else:
        out.append("- none")
    out.append("")
    REPORT.write_text("\n".join(out))

    print(f"  {len(albums)} albums · {len(spent)} used · {len(spare)} spare "
          f"· {len(check)} to verify")
    print(f"  duplicates published: {len(dupes)}")
    print(f"  wrote {REPORT.relative_to(PAYLOAD)}")
    if args.check and dupes:
        print("\n  A photograph is published in two places. See PHOTO-USAGE.md.\n")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
