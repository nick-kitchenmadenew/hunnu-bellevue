#!/usr/bin/env python3
"""Generate the cream "photo pending" plates the layout is built around.

A placeholder has one job: be impossible to mistake for a finished photo, so it
cannot ship by accident. Hence the hatching, the border and the literal word
REPLACE. It carries the same aspect ratio as a real photo so swapping a real file
in never moves the layout.

**A page never borrows another page's photograph.** The Painter pillar spent its
first build showing the homepage's cabinet-maker delivery shot and a refacing
hero, because the template hardcoded them. Reusing an image is worse than showing
a placeholder: the placeholder is a visible task, the borrowed photo is a silent
inaccuracy that survives to launch.

So this scans the content files and generates a plate for every image slot a page
declares without supplying a file. Run it after importing a page, before building.

Text is ASCII only — the system faces used here have no en dash or middle dot,
and PIL renders a missing glyph as a tofu box rather than failing loudly.

    python3 scripts/placeholder.py
"""

from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import os
import re
import yaml

# Where the CLIENT's images live, not where this script does. SITE used to be
# derived from __file__, which was right while the script sat in the site's own
# scripts/ directory and wrong the moment it moved into the engine — it wrote
# forty placeholder plates into engine/src/assets, where nothing looks for them
# and where the integrity check rejects them.
SITE = Path(__file__).resolve().parent.parent
_ENTITY = os.environ.get("CORE30_ENTITY", "oakville")
# SITE.parent, never Path.cwd().parent. The two agree only when the script is run
# from site/, which is what the docstring says to do and not what anyone does —
# and when they disagree the plates land in a directory that is not the
# repository, the script reports "generated", and the build then says the image
# is not registered. OUT is computed here, AFTER _ROOT is final; it used to be
# computed between two assignments to _ROOT and silently used the first one.
_ROOT = Path(os.environ.get("CORE30_PAYLOAD", SITE.parent))
OUT = Path(os.environ.get("CORE30_ASSETS", _ROOT / "site" / "src" / "assets"))
# THIS entity's content only. It scanned all of content/ while reading a single
# config, so with more than one entity it judged Oakville's pages against the
# GTA's gallery — and fell over on a config that has no proof block yet, which is
# the normal state of a site that has been configured and not yet written.
CONTENT = _ROOT / "content" / _ENTITY
# Same resolution order as src/lib/paths.js: the entity-suffixed file if it
# exists, else a bare config.yaml. Python cannot import the JS module, so the
# rule is restated — the two must be changed together, which is why the rule is
# two lines long rather than clever.
CONFIG = _ROOT / f"config-{_ENTITY}.yaml"
if not CONFIG.exists():
    CONFIG = _ROOT / "config.yaml"

# Must match GALLERY_MIN in Pillar.astro. A pillar with fewer real jobs than this
# pads with placeholders rather than borrowing another silo's work.
GALLERY_MIN = 4

BG     = (241, 238, 232)              # --surface
HATCH  = (226, 219, 208)
BORDER = (198, 187, 172)
INK    = (108, 98, 88)
FAINT  = (154, 143, 129)

FONTS = [
    "/System/Library/Fonts/Supplemental/Helvetica.ttc",
    "/System/Library/Fonts/Helvetica.ttc",
    "/Library/Fonts/Arial.ttf",
]


def font(size):
    for path in FONTS:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default(size)


def plate(path, label, subject, size=(1200, 900)):
    """label is the slot (BEFORE / AFTER / a section); subject names the page."""
    W, H = size
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)

    for x in range(-H, W, 34):                      # 45 degree hatching
        d.line([(x, H), (x + H, 0)], fill=HATCH, width=2)
    d.rectangle([28, 28, W - 29, H - 29], fill=BG, outline=BORDER, width=2)

    def centred(y, text, f, fill):
        left, top, right, bottom = d.textbbox((0, 0), text, font=f)
        d.text(((W - (right - left)) / 2 - left, y - top), text, font=f, fill=fill)
        return bottom - top

    y = H / 2 - 78
    y += centred(y, label.upper()[:40], font(int(W / 26))) if False else 0
    y = H / 2 - 78
    y += centred(y, label.upper()[:40], font(int(W / 26)), INK) + 30
    y += centred(y, subject[:34], font(int(W / 23)), INK) + 34
    centred(y, "PLACEHOLDER / REPLACE", font(int(W / 40)), FAINT)

    # exist_ok, but NOT parents. src/assets/ is a directory the site already has;
    # if it is missing, OUT was computed from the wrong root and creating the
    # whole chain is exactly how four plates ended up outside the repository
    # while this script reported success.
    if not path.parent.parent.is_dir():
        raise SystemExit(
            f"\n  {path.parent} is not inside a site.\n"
            f"  OUT resolved to {OUT}, which has no src/ above it — so the plates\n"
            f"  would land somewhere nothing looks for them. Check CORE30_PAYLOAD.\n")
    path.parent.mkdir(exist_ok=True)
    im.save(path, optimize=True)
    return path.name


def slug_for(page: str, slot: str) -> str:
    """Deterministic name so the template can reference it without being told."""
    return f"ph-{page}-{slot}".replace("_", "-").lower()


def wanted():
    """Every image slot the content files declare, as (filename, label, subject).

    A linked section gets a photograph when it is one of the first two on the
    page — the feature treatment. That mirrors the template, and the two must
    agree or a page asks for a plate that never renders.
    """
    out = []
    for f in sorted(CONTENT.rglob("*.md")):
        raw = f.read_text()
        if not raw.startswith("---"):
            continue
        fm = yaml.safe_load(raw.split("---")[1]) or {}
        page = f.stem if f.stem != "index" else f.parent.name

        # A plainHero page renders no pair, so it must not be asked for plates for
        # one — it would generate two files nothing references.
        hero = fm.get("hero")
        if not hero and not fm.get("plainHero"):
            out.append((slug_for(page, "hero-before"), "hero before", page))
            out.append((slug_for(page, "hero-after"),  "hero after",  page))

        # A person without a photograph gets a plate the same as a job without one.
        # Named after the person, so the plate says whose face is missing and
        # inserting someone does not silently reassign everyone else's picture.
        for g in fm.get("team") or []:
            for person in g.get("people") or []:
                if not person.get("photo"):
                    out.append((slug_for(page, f"team-{person['name']}"),
                                person.get("role", "")[:30], person["name"]))

        # A body section that asks for a picture with `<!-- image: alt -->`. The
        # plate is named from the section's position, which must match the
        # `section-${index + 1}` in Pillar.astro. Counted over every H2 in the
        # body, not only the ones carrying the directive, because the index is a
        # position rather than a tally.
        body = raw.split("---", 2)[2] if raw.count("---") >= 2 else ""
        section = 0
        for line in body.splitlines():
            if re.match(r"^##\s+", line):
                section += 1
            m = re.match(r"^<!--\s*image:\s*(.*?)\s*-->$", line.strip())
            if m and m.group(1) and section:
                out.append((slug_for(page, f"section-{section}"),
                            m.group(1)[:30], page))

        for i, s in enumerate(fm.get("services") or []):
            if i >= 2 or s.get("image"):
                continue
            out.append((slug_for(page, f"service-{i + 1}"), s.get("heading", "")[:30], page))

        # Gallery: a category pillar shows only jobs tagged to its own silo, and a
        # service page only jobs tagged to itself, so anything short of GALLERY_MIN
        # needs plates for the rest.
        #
        # The two filters below must stay identical to the ones in Pillar.astro —
        # if they drift, this script generates plates the page never renders, or
        # the page asks for plates that were never generated.
        if "gallery" in (fm.get("sections") or []) and fm.get("silo"):
            cfg = yaml.safe_load(CONFIG.read_text())
            # is_homepage belongs to the silo, and the primary silo holds five
            # service pages besides the homepage itself. Testing it alone skipped
            # all of them, so a service page that needed plates never got any.
            home = next((x for x in cfg["silos"]
                         if x["category"] == fm["silo"] and x.get("is_homepage")), None)
            if not (home and fm.get("type") == "pillar"):
                jobs = (cfg.get("proof") or {}).get("gallery") or []
                real = ([g for g in jobs if g.get("service") == page]
                        if fm.get("type") == "service"
                        else [g for g in jobs if g.get("silo") == fm["silo"]])
                # Even count as well as GALLERY_MIN — the grid is two columns and
                # an odd number orphans the last job in a half-empty row. Must
                # match galleryTarget in Pillar.astro.
                target = max(GALLERY_MIN, len(real) + (len(real) % 2))
                for i in range(len(real), target):
                    for state in ("before", "after"):
                        out.append((slug_for(page, f"gallery-{i + 1}-{state}"),
                                    f"job {i + 1} {state}", page))
    return out


if __name__ == "__main__":
    made, skipped = [], []
    for name, label, subject in wanted():
        target = OUT / f"{name}.png"
        if target.exists():
            skipped.append(target.name)
            continue
        made.append(plate(target, label, subject))

    print(f"  scanned {CONTENT}")
    for n in made:
        print(f"    generated  {n}")
    for n in skipped:
        print(f"    exists     {n}")
    if not made and not skipped:
        print("    every image slot has a real photograph")
