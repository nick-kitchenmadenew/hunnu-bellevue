#!/usr/bin/env python3
"""
Parse a Google Business Profile dashboard paste into structured data.

Why paste rather than an API: the Business Profile API is access-gated and only
covers profiles you manage; the Places API never returns the GBP category list or
the services list — and the services list is what the Core 30 silo hangs on.
Copying the dashboard text costs the user two minutes and gives everything.

    python3 gbp_parse.py captures/kmn-oakville.txt \
                         --services captures/kmn-oakville-services.txt \
                         --out out/gbp-oakville.json

Output is always shown for confirmation before it reaches config — extraction is
heuristic and a misread phone number quietly poisons NAP consistency.
"""

import argparse, collections, json, os, re, sys

DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

# Dashboard labels that introduce a value on the following line(s). Google's UI
# occasionally mangles these on copy ("Phone number" → "Phoneber"), so match loosely.
SECTION_LABELS = {
    "business name": "name",
    "business category": "categories",
    "description": "description",
    "opening date": "opened",
    "website": "website",
    "social profiles": "social",
    "business location": "address",
    "service area": "service_area",
    "special hours": "special_hours",
}
NOISE = {"find categories", "generate description", "business information", "about",
         "contact", "location", "hours", "more", "about your business",
         "contact information", "location and areas", "business hours",
         "open with main hours", "from the business", "add more hours", "add",
         "learn how business information is gathered and used by google",
         "your attributes were updated by google.", "chat"}
ATTRIBUTE_GROUPS = {"accessibility", "amenities", "crowd", "offerings", "parking",
                    "payments", "recycling", "service options", "planning",
                    "highlights"}
LANGUAGES = {"english", "french", "mandarin", "cantonese", "spanish", "portuguese",
             "italian", "german", "polish", "russian", "ukrainian", "arabic",
             "hindi", "korean", "vietnamese", "filipino", "romanian",
             "haitian creole", "american sign language"}


def clean(lines):
    out = []
    for ln in lines:
        s = ln.strip()
        if s and s.lower() not in NOISE:
            out.append(s)
    return out


def split_paste(text, known_categories=None):
    """
    One paste, two panels. Returns (profile_text, services_text).

    Two hazards, both seen in real pastes:
      · the panels arrive with no line break between them —
        "No in-store shoppingKitchen remodeler"
      · the More panel repeats itself under "Current" then "Previous"
    """
    lines = text.split("\n")

    # ── drop the duplicated "Previous" attribute block ──────────────────
    idx = [i for i, l in enumerate(lines) if l.strip().lower() in ("current", "previous")]
    cur = next((i for i in idx if lines[i].strip().lower() == "current"), None)
    prev = next((i for i in idx if lines[i].strip().lower() == "previous"), None)
    if cur is not None and prev is not None and prev > cur:
        end = len(lines)
        for j in range(prev + 1, len(lines)):
            if _category_at(lines, j, known_categories):
                end = j
                break
        lines = lines[:prev] + lines[end:]

    # ── find where the services panel starts ────────────────────────────
    for i, l in enumerate(lines):
        cat = _category_at(lines, i, known_categories)
        if cat:
            head = lines[:i]
            # the category name may be glued onto the tail of the previous line
            if l.strip() != cat:
                head = head + [l.strip()[:-len(cat)]]
            return "\n".join(head), "\n".join([cat] + lines[i + 1:])
    return text, ""


def _category_at(lines, i, known):
    """Is line i a category header (its successor says 'Primary/Additional category')?"""
    if i + 1 >= len(lines):
        return None
    if lines[i + 1].strip().lower() not in ("primary category", "additional category"):
        return None
    s = lines[i].strip()
    if known:
        for c in known:                      # tolerate a glued-on prefix
            if s == c or s.endswith(c):
                return c
    return s or None


def parse_profile(text):
    lines = clean(text.split("\n"))
    d = {"name": None, "primary_category": None, "additional_categories": [],
         "description": None, "opened": None, "phone": None, "website": None,
         "sameAs": [], "address": None, "service_area": [], "hours": {},
         "special_hours": [], "languages": [], "attributes": [], "type": None}

    i = 0
    while i < len(lines):
        ln, low = lines[i], lines[i].lower().rstrip(":")

        if low in ("business name",):
            d["name"] = lines[i + 1] if i + 1 < len(lines) else None
            i += 2; continue

        if low in ("business category",):
            # categories run until the next known label; "Primary" tags the one before it
            j, cats = i + 1, []
            while j < len(lines) and lines[j].lower().rstrip(":") not in SECTION_LABELS:
                cats.append(lines[j]); j += 1
            for k, c in enumerate(cats):
                if c.lower() == "primary" and k > 0:
                    d["primary_category"] = cats[k - 1]
            # Google omits the "Primary" marker when a profile has only one
            # category — and it always lists the primary first regardless.
            if not d["primary_category"] and cats:
                d["primary_category"] = cats[0]
            d["additional_categories"] = [c for k, c in enumerate(cats)
                                          if c.lower() != "primary"
                                          and c != d["primary_category"]]
            i = j; continue

        if low == "description":
            d["description"] = lines[i + 1] if i + 1 < len(lines) else None
            i += 2; continue

        if low == "opening date":
            d["opened"] = lines[i + 1] if i + 1 < len(lines) else None
            i += 2; continue

        # Google mangles "Phone number" on copy; also accept a bare NA-format number
        if low.startswith("phone") or re.fullmatch(r"\(?\d{3}\)?[ .-]?\d{3}[ .-]?\d{4}", ln):
            nxt = lines[i + 1] if i + 1 < len(lines) else ""
            d["phone"] = ln if re.search(r"\d{3}", ln) and not low.startswith("phone") else nxt
            i += 1 if d["phone"] == ln else 2
            continue

        if low == "website":
            d["website"] = lines[i + 1] if i + 1 < len(lines) else None
            i += 2; continue

        if low == "social profiles":
            j = i + 1
            while j < len(lines) and lines[j].startswith("http"):
                d["sameAs"].append(lines[j]); j += 1
            i = j; continue

        if low == "business location":
            d["address"] = lines[i + 1] if i + 1 < len(lines) else None
            i += 2; continue

        if low == "service area":
            j = i + 1
            # "Renton, WA, USA" · "Ballard, Seattle, WA, USA" · "Magnolia, Seattle, WA 98199, USA"
            # — a postal code can sit between the state and the country.
            while j < len(lines) and re.search(r",\s*[A-Z]{2}(\s+\d{4,6})?\s*,", lines[j]):
                d["service_area"].append(lines[j]); j += 1
            i = j; continue

        if ln in DAYS:
            d["hours"][ln] = lines[i + 1] if i + 1 < len(lines) else None
            i += 2; continue

        if low == "special hours":
            j = i + 1
            while j < len(lines):
                m = re.match(r"^[A-Z][a-z]{2,8} \d{1,2}, \d{4}$", lines[j])
                if not m:
                    break
                entry = {"date": lines[j], "label": None, "status": None}
                k = j + 1
                while k < len(lines) and not re.match(r"^[A-Z][a-z]{2,8} \d{1,2}, \d{4}$", lines[k]):
                    if lines[k].lower() in ("closed", "open 24 hours"):
                        entry["status"] = lines[k]
                    elif lines[k].lower() not in NOISE:
                        entry["label"] = lines[k]
                    k += 1
                    if entry["status"]:
                        break
                d["special_hours"].append(entry)
                j = k
            i = j; continue

        if low in LANGUAGES:
            d["languages"].append(ln); i += 1; continue

        if low in ATTRIBUTE_GROUPS:
            j = i + 1
            while j < len(lines) and lines[j].lower() not in ATTRIBUTE_GROUPS \
                    and lines[j].lower() not in SECTION_LABELS \
                    and lines[j].lower() not in LANGUAGES:
                if lines[j].lower() not in ("current", "previous"):
                    d["attributes"].append({"group": ln, "value": lines[j]})
                j += 1
            i = j; continue

        i += 1

    # Google states the ABSENCE of an address as a sentence in the address field.
    # Taken literally it makes a service-area business look like a storefront whose
    # street is "No location; deliveries and home services only" — which then
    # reaches the schema as a PostalAddress and is published. PLANNING §9c is
    # explicit that a service-area entity carries no address at all.
    if d["address"] and re.match(r"\s*(no location|no address|service area only|"
                                 r"deliveries and home services)", d["address"], re.I):
        d["address"] = None
    d["type"] = "storefront" if d["address"] else "service_area"
    return d


def parse_services(text):
    """
    Services paste shape:
        <Category name>
        Primary category | Additional category
        <Service name>
        <long description>
        ...
    Service names are short; descriptions are long. That length split is the only
    reliable separator, since neither carries a label.
    """
    lines = clean(text.split("\n"))
    cats, cur = [], None
    i = 0
    while i < len(lines):
        nxt = lines[i + 1].lower() if i + 1 < len(lines) else ""
        if nxt in ("primary category", "additional category"):
            cur = {"category": lines[i], "role": nxt.split()[0], "services": []}
            cats.append(cur)
            i += 2
            continue
        if cur is not None:
            name = lines[i]
            desc = None
            if i + 1 < len(lines) and len(lines[i + 1]) > 90:
                desc = lines[i + 1]; i += 1
            cur["services"].append({"name": name, "description": desc})
        i += 1
    return cats


def confirm_table(profile, services):
    w = 22
    out = ["", "─" * 74, "  PARSED — check every line before this reaches config", "─" * 74]

    def row(k, v):
        out.append(f"  {k:<{w}} {v}")
    row("Name", profile["name"])
    row("Type", profile["type"])
    row("Primary category", profile["primary_category"])
    row("Additional", ", ".join(profile["additional_categories"]) or "—")
    row("Phone", profile["phone"])
    row("Website", profile["website"])
    row("Address", profile["address"] or "— (service area)")
    row("Service area", ", ".join(a.split(",")[0] for a in profile["service_area"]) or "—")
    row("Opened", profile["opened"])
    row("Languages", ", ".join(profile["languages"]) or "—")
    row("sameAs", f"{len(profile['sameAs'])} profile(s)")
    for s in profile["sameAs"]:
        out.append(f"  {'':<{w}} {s}")
    hrs = collections.Counter(profile["hours"].values())
    if len(hrs) == 1 and None not in hrs:
        row("Hours", f"{list(hrs)[0]} all week")
    elif hrs:
        common, _ = hrs.most_common(1)[0]
        odd = [d for d, v in profile["hours"].items() if v != common]
        row("Hours", f"{common} — except " + ", ".join(f"{d} {profile['hours'][d]}" for d in odd))
    else:
        row("Hours", "none parsed")
    for sh in profile["special_hours"]:
        row("Special hours", f"{sh['date']} — {sh.get('label') or ''} {sh.get('status') or ''}".strip())
    row("Attributes", f"{len(profile['attributes'])} captured")

    if services:
        out += ["", "  SERVICES — the silo structure", "  " + "─" * 70]
        total = 0
        for c in services:
            out.append(f"  {c['category']}  [{c['role']}]  — {len(c['services'])} services")
            for s in c["services"]:
                mark = " " if s["description"] else "!"
                out.append(f"    {mark} {s['name']}")
                total += 1
        out.append("")
        out.append(f"  {len(services)} categories · {total} services "
                   f"→ {len(services)} pillar pages + {total} service pages")
        missing = [s['name'] for c in services for s in c['services'] if not s['description']]
        if missing:
            out.append(f"  ! no description captured: {', '.join(missing)}")
    out.append("─" * 74)
    return "\n".join(out)


def warnings(profile, services):
    w = []
    if profile["address"] and profile["service_area"]:
        w.append("storefront WITH a service area — both are valid; the address is the NAP, "
                 "the service area drives the location silo")
    if not profile["phone"]:
        w.append("no phone parsed — check the paste included the Contact panel")
    if services:
        empty = [c["category"] for c in services if not c["services"]]
        if empty:
            w.append("category with no services, so its pillar has nothing to link down to: "
                     + ", ".join(empty))
        seen = {}
        for c in services:
            for s in c["services"]:
                key = re.sub(r"\b(installation|installations|install|replacement|upgrades?|"
                             r"services?|repairs?)\b", "", s["name"].lower()).strip()
                seen.setdefault(key, []).append((c["category"], s["name"]))
        for key, hits in seen.items():
            if len({h[0] for h in hits}) > 1:
                names = {n for _, n in hits}
                kind = ("same service in several categories — remove it from all but one in GBP"
                        if len(names) == 1 else
                        "near-identical services in different silos — needs distinct angles")
                w.append(f"cannibalisation risk, {kind}: "
                         + " vs ".join(f"{n} ({c})" for c, n in hits))
    if not profile["sameAs"]:
        w.append("no social profiles — sameAs will be empty for this entity")
    return w


SIMPLE = ["name", "type", "primary_category", "phone", "website", "root",
          "address", "opened", "description"]
LISTS = ["additional_categories", "languages", "sameAs", "service_area"]


def root_from(website):
    if not website:
        return "/"
    p = re.sub(r"^https?://[^/]+", "", website.strip())
    p = p if p.startswith("/") else "/" + p
    return p if p.endswith("/") else p + "/"


def write_review(profile, services, path):
    """The file Nick edits. Forgiving format — no indentation rules, no quoting."""
    L = [f"# GBP capture — {profile['name']}",
         "# Edit any value after the colon, then re-run with --review to apply.",
         "# Lines starting with # are ignored. Delete a service line to drop that page.",
         f"#   python3 gbp_parse.py --review {os.path.basename(path)}",
         ""]
    p = dict(profile)
    p["root"] = root_from(profile.get("website"))
    for k in SIMPLE:
        L.append(f"{k+':':<20}{p.get(k) or ''}")
    for k in LISTS:
        L.append(f"{k+':':<20}{', '.join(p.get(k) or []) if k != 'service_area' else ''}")
        if k == "service_area":
            for v in p.get(k) or []:
                L.append(f"  {v}")
    L += ["", "hours:"]
    for d, v in (p.get("hours") or {}).items():
        L.append(f"  {d:<12}{v}")
    if p.get("special_hours"):
        L.append("special_hours:")
        for s in p["special_hours"]:
            L.append(f"  {s['date']} | {s.get('label') or ''} | {s.get('status') or ''}")
    L += ["", "# ─── SERVICES ─────────────────────────────────────────────",
          "# [primary] or [additional] then the category, services indented below.", ""]
    for c in services:
        L.append(f"[{c['role']}] {c['category']}")
        for s in c["services"]:
            L.append(f"  {s['name']}")
        L.append("")
    open(path, "w", encoding="utf-8").write("\n".join(L).rstrip() + "\n")


def read_review(path):
    """Read the edited file back. Ignores comments, blank lines and stray spacing."""
    profile = {k: None for k in SIMPLE}
    profile.update({k: [] for k in LISTS})
    profile.update({"hours": {}, "special_hours": [], "attributes": []})
    services, cur, section = [], None, None

    for raw in open(path, encoding="utf-8"):
        line = raw.rstrip("\n")
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        m = re.match(r"^\[(primary|additional)\]\s*(.+)$", line.strip(), re.I)
        if m:
            cur = {"category": m.group(2).strip(), "role": m.group(1).lower(), "services": []}
            services.append(cur)
            section = "services"
            continue
        indented = line[0] in " \t"
        key, _, val = line.strip().partition(":")
        key, val = key.strip().lower(), val.strip()

        if not indented and _ and key in SIMPLE + LISTS + ["hours", "special_hours"]:
            section = key
            if key in SIMPLE:
                profile[key] = val or None
            elif key in LISTS:
                profile[key] = [x.strip() for x in val.split(",") if x.strip()]
            continue

        body = line.strip()
        if section == "service_area":
            profile["service_area"].append(body)
        elif section == "hours":
            parts = body.split(None, 1)
            if len(parts) == 2:
                profile["hours"][parts[0]] = parts[1].strip()
        elif section == "special_hours":
            bits = [b.strip() for b in body.split("|")]
            profile["special_hours"].append({"date": bits[0],
                                             "label": bits[1] if len(bits) > 1 else None,
                                             "status": bits[2] if len(bits) > 2 else None})
        elif section == "services" and cur is not None:
            cur["services"].append({"name": body, "description": None})
    return profile, services


def main():
    ap = argparse.ArgumentParser(description="Parse a GBP dashboard paste")
    ap.add_argument("profile", nargs="?", help="text file: one paste, or the profile panels")
    ap.add_argument("--services", help="separate file for the Services panel, if you split them")
    ap.add_argument("--review", help="read back an edited .review.md instead of parsing a paste")
    ap.add_argument("--out", help="write JSON here")
    args = ap.parse_args()

    if args.review:
        profile, services = read_review(args.review)
        print(f"  read edits from {args.review}")
    elif args.services:
        profile = parse_profile(open(args.profile, encoding="utf-8").read())
        services = parse_services(open(args.services, encoding="utf-8").read())
    else:
        raw = open(args.profile, encoding="utf-8").read()
        # first pass gets the category names, which lets the splitter find the boundary
        cats = parse_profile(raw)
        known = [c for c in [cats["primary_category"]] + cats["additional_categories"] if c]
        head, tail = split_paste(raw, known)
        profile = parse_profile(head)
        services = parse_services(tail) if tail.strip() else []

    print(confirm_table(profile, services))
    warns = warnings(profile, services)
    if warns:
        print()
        for x in warns:
            print(f"  ⚠  {x}")

    if args.out:
        os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
        profile["root"] = profile.get("root") or root_from(profile.get("website"))
        json.dump({"profile": profile, "services": services,
                   "captured": __import__("time").strftime("%Y-%m-%d"),
                   "source": os.path.basename(args.review or args.profile)},
                  open(args.out, "w"), indent=2)
        review = re.sub(r"\.json$", "", args.out) + ".review.md"
        if not args.review:
            write_review(profile, services, review)
            print(f"\n  → {args.out}")
            print(f"  → {review}   ← open and edit this, then re-run with --review")
        else:
            print(f"\n  → {args.out}   (from your edits)")


if __name__ == "__main__":
    main()
