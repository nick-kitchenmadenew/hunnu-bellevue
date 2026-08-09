#!/usr/bin/env python3
"""
Propose a `config-<entity>.yaml` from a parsed Google Business Profile.

This is the step between `gbp_parse.py` and a working site. The parser turns a
dashboard paste into JSON; this turns that JSON into the file the engine reads —
the entity, the silos, the services, the service area, the hours.

    python3 gbp_to_config.py out/gbp-oakville.json --out ../config-oakville.yaml

PROPOSES. It will not overwrite an existing config, because the lifecycle in
CONFIG-SCHEMA.md is: audit proposes → human confirms → config is authoritative →
later audits *diff* against it and report drift. `gbp-drift.mjs` is that diff, and
it only means anything if the config is the human's file rather than the tool's.
Re-running against an existing config writes `<name>.proposed.yaml` beside it so
the two can be diffed by eye.

It also writes `discovery-<entity>.md`: everything it could not derive, everything
it guessed, and everything about the profile that will make the site awkward. That
file is the point of the exercise as much as the config is. A tool that emitted a
config and said nothing would be quietly deciding the silo map, and the silo map
is the one thing CONFIG-SCHEMA.md insists stays human-confirmed.

What it will NOT invent, ever: re-theme keywords, geo coordinates, the place id,
the masthead descriptor, any proof (photographs, reviews, warranty terms), and any
claim guard. Those are editorial or come from somewhere else, and a plausible
placeholder for them is worse than a blank, because a blank gets filled in.
"""

import argparse
import json
import os
import re
import sys

# ── the small amount of world knowledge this needs ───────────────────────
# Province and state names, because DataForSEO location strings and schema.org
# want them spelled out while GBP and postal addresses use the abbreviation.
REGIONS = {
    "AB": "Alberta", "BC": "British Columbia", "MB": "Manitoba",
    "NB": "New Brunswick", "NL": "Newfoundland and Labrador", "NS": "Nova Scotia",
    "NT": "Northwest Territories", "NU": "Nunavut", "ON": "Ontario",
    "PE": "Prince Edward Island", "QC": "Quebec", "SK": "Saskatchewan", "YT": "Yukon",
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas",
    "CA": "California", "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware",
    "FL": "Florida", "GA": "Georgia", "HI": "Hawaii", "ID": "Idaho",
    "IL": "Illinois", "IN": "Indiana", "IA": "Iowa", "KS": "Kansas",
    "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland",
    "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi",
    "MO": "Missouri", "MT": "Montana", "NE": "Nebraska", "NV": "Nevada",
    "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico", "NY": "New York",
    "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma",
    "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island",
    "SC": "South Carolina", "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas",
    "UT": "Utah", "VT": "Vermont", "VA": "Virginia", "WA": "Washington",
    "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming",
}
CA_PROVINCES = {"AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"}

LANG_CODES = {"English": "en", "French": "fr", "Cantonese": "yue", "Mandarin": "cmn",
              "Spanish": "es", "Portuguese": "pt", "Italian": "it", "German": "de",
              "Polish": "pl", "Russian": "ru", "Ukrainian": "uk", "Arabic": "ar",
              "Hindi": "hi", "Korean": "ko", "Vietnamese": "vi", "Romanian": "ro"}

# A silo with more services than this cannot be built as one page each without the
# category page becoming an index of an index. Not an error — a decision to make.
SERVICES_PER_SILO_MAX = 8


def slug(text):
    """A URL slug. Ampersands become nothing, not 'and' — 'Millwork & Trim' is
    'millwork-trim', which is what the Oakville site already uses."""
    s = re.sub(r"[^\w\s-]", " ", str(text).lower())
    return re.sub(r"[\s_-]+", "-", s).strip("-")


def e164(phone, country):
    """GBP shows '(289) 815-3353'; config stores E.164 for schema and tel: links."""
    d = re.sub(r"\D", "", str(phone or ""))
    if not d:
        return None
    if len(d) == 11 and d[0] == "1":
        d = d[1:]
    if len(d) != 10:
        return str(phone)                       # leave it visibly odd for a human
    cc = "+1"                                   # CA and US share it; anything else needs a human
    return f"{cc} {d[0:3]}-{d[3:6]}-{d[6:]}"


def parse_address(raw):
    """
    '1155 North Service Road West Unit 11, Oakville, ON L6M 3E3'
    '4100 Ne 10th st, Renton, WA 98059'

    Returns (dict, confidence). Confidence is what the discovery file reports —
    an address this tool got wrong poisons NAP consistency everywhere, so a
    low-confidence parse is worth more than a silent one.
    """
    raw = str(raw or "").strip().rstrip(",")
    if not raw:
        return None, "no address on the profile — a service-area business?"
    parts = [p.strip() for p in raw.split(",")]
    # Some profiles append the country; drop it and remember it.
    country_word = None
    if parts and parts[-1].lower() in ("canada", "usa", "united states", "us"):
        country_word = parts.pop().lower()
    if len(parts) < 3:
        return None, f"could not split {raw!r} into street, city, region+postal"

    tail = parts[-1]
    locality = parts[-2]
    street = ", ".join(parts[:-2])

    m = re.match(r"^([A-Za-z]{2})\s+(.+)$", tail)
    if not m:
        return None, f"could not read a region and postal code from {tail!r}"
    region, postal = m.group(1).upper(), m.group(2).strip()

    if country_word in ("usa", "united states", "us"):
        country = "US"
    elif country_word == "canada":
        country = "CA"
    else:
        country = "CA" if region in CA_PROVINCES else "US"

    return {
        "street": street, "locality": locality, "region": region,
        "region_name": REGIONS.get(region), "postal_code": postal, "country": country,
        "country_name": "Canada" if country == "CA" else "United States",
    }, None


DAY_SHORT = {"Monday": "mon", "Tuesday": "tue", "Wednesday": "wed",
             "Thursday": "thu", "Friday": "fri", "Saturday": "sat", "Sunday": "sun"}
DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]


def parse_hours(hours):
    """
    GBP is per-day. Config takes either — `mon_sun` when every day is the same,
    `days` when one is not.

    Returns (mon_sun|None, days|None, note|None). Exactly one of the first two,
    or neither with a note. Collapsing a week that genuinely differs would put
    hours on the page and in the schema that the profile contradicts, which is
    why this reports instead of guessing.
    """
    if not hours:
        return None, None, "no hours on the profile"

    def to24(t):
        t = str(t).strip()
        if re.match(r"^\s*closed\s*$", t, re.I):
            return None
        m = re.match(r"(\d+):(\d+)\s*(AM|PM)", t, re.I)
        if not m:
            return t
        h = int(m.group(1)) % 12 + (12 if m.group(3).upper() == "PM" else 0)
        return f"{h:02d}:{m.group(2)}"

    def as_range(v):
        v = str(v).strip()
        if re.match(r"^\s*closed\s*$", v, re.I):
            return "closed"
        if re.match(r"^\s*open 24", v, re.I):
            return "00:00-23:59"              # schema.org's way of saying always
        span = re.split(r"\s*[-–—]\s*", v)
        if len(span) != 2:
            return None
        a, b = to24(span[0]), to24(span[1])
        return f"{a}-{b}" if a and b else None

    by_day, unreadable = {}, []
    for name, v in hours.items():
        short = DAY_SHORT.get(name)
        if not short:
            continue
        r = as_range(v)
        if r is None:
            unreadable.append(f"{name}={v!r}")
        by_day[short] = r
    if unreadable:
        return None, None, "could not read " + ", ".join(unreadable)
    if len(by_day) < 7:
        missing = [d for d in DAY_ORDER if d not in by_day]
        for d in missing:
            by_day[d] = "closed"

    distinct = set(by_day.values())
    if len(distinct) == 1 and "closed" not in distinct:
        return next(iter(distinct)), None, None
    return None, by_day, None


PAYMENT_NAMES = {
    "accepts debit cards": "Debit Card", "accepts credit cards": "Credit Card",
    "not cash only": "Cash", "cash only": "Cash", "accepts cash": "Cash", "accepts nfc mobile payments": "NFC Mobile",
    "visa": "Visa", "mastercard": "Mastercard", "american express": "American Express",
    "discover": "Discover", "cheques": "Cheque", "checks": "Check",
}


def payments_from(attributes):
    """The payment methods a profile positively claims.

    "Not cash-only" is Google's way of saying cash IS taken, which reads backwards
    and is the reason this is a lookup rather than a string match. Anything
    starting "No " is an absence, and schema.org cannot express one — so those are
    dropped rather than inverted into a claim the business never made.
    """
    out = []
    for a in attributes or []:
        if str(a.get("group", "")).strip().lower() != "payments":
            continue
        v = str(a.get("value", "")).strip()
        if v.lower().startswith("no "):
            continue
        # "Cash-only" and "cash only" are the same attribute written two ways.
        name = PAYMENT_NAMES.get(re.sub(r"[-\s]+", " ", v.lower()).strip())
        if name and name not in out:
            out.append(name)
    return out


def root_from(website, locality):
    """
    The entity root — the path the site lives under, and the GBP website field is
    authoritative for it (PLANNING §10c).

    A website of "https://example.com/" means the root IS "/". That is the oldest
    profile on a domain, the one holding the homepage, and it is not a missing
    value to be filled in from the city — reading it as one produced "/gta/" for a
    profile whose landing page is the homepage.
    """
    m = re.match(r"^https?://[^/]+(/.*)?$", str(website or "").strip())
    if m:
        path = m.group(1) or "/"
        return "/" if path == "/" else re.sub(r"/+$", "", path) + "/"
    return f"/{slug(locality)}/" if locality else "/"


def domain_from(website):
    m = re.match(r"^https?://([^/]+)", str(website or "").strip())
    return re.sub(r"^www\.", "", m.group(1)) if m else None


# ── YAML emitting, by hand ───────────────────────────────────────────────
# Not yaml.dump. The output is a file a human is about to edit, and comments
# saying which lines are guesses are most of its value — a dump would strip
# exactly the part that makes it usable.

def q(v):
    """
    Quote a scalar wherever YAML could misread it — including in FLOW context.

    The comma is the one that bit. `{ date: May 18, 2026, status: closed }` is a
    perfectly valid flow mapping that reads as three entries: `date: May 18`, a
    bare key `2026` with a null value, and `status`. It parses without a murmur in
    both js-yaml and PyYAML, and the wrong date reaches the schema. Braces and
    brackets are here for the same reason; `#` because it opens a comment.
    """
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    s = str(v)
    if s == "":
        return '""'
    if (re.match(r"^[*&!|>@`%]", s) or ": " in s or s.endswith(":")
            or re.search(r"[,{}\[\]#]", s)
            or re.match(r"^(yes|no|on|off|true|false|null|~)$", s, re.I)
            or re.match(r"^[\d.+-]+$", s) or s.strip() != s):
        return '"' + s.replace('"', '\\"') + '"'
    return s


MONTHS = {m: i + 1 for i, m in enumerate(
    ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"])}


def iso_date(raw):
    """'January 15, 2013' or 'Jul 1, 2026' -> '2013-01-15'. None if it will not go.

    Worth doing rather than leaving as a TODO: the config wants YYYY-MM-DD, YAML
    parses that shape into a real date, and the alternative is a human retyping
    dates by hand — which is where transcription errors come from."""
    m = re.match(r"^\s*([A-Za-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})\s*$", str(raw or ""))
    if not m:
        return None
    mon = MONTHS.get(m.group(1)[:3].lower())
    return f"{m.group(3)}-{mon:02d}-{int(m.group(2)):02d}" if mon else None


def build(gbp, entity_id):
    profile = gbp.get("profile", {})
    notes = []                                   # (severity, text) for discovery
    out = []
    w = out.append

    service_area_only = profile.get("type") == "service_area"
    addr, addr_problem = parse_address(profile.get("address"))
    if addr is None:
        # A service-area business having no address is the correct state, not a
        # failure to parse one. Only a storefront missing its address is a blocker.
        if not service_area_only:
            notes.append(("BLOCKER", f"address: {addr_problem}"))
        addr = {"street": None, "locality": None, "region": None, "region_name": None,
                "postal_code": None, "country": None, "country_name": None}
    locality = addr.get("locality")
    website = profile.get("website")
    domain = domain_from(website)
    if not domain:
        notes.append(("BLOCKER", "no website on the profile — site.domain cannot be derived"))
    root = root_from(website, locality or entity_id)

    hours, hours_days, hours_note = parse_hours(profile.get("hours"))
    if hours_note:
        notes.append(("DECIDE", f"hours: {hours_note}"))

    w(f"# {profile.get('name') or entity_id}")
    w(f"# PROPOSED from {gbp.get('source') or 'a GBP capture'}, "
      f"captured {gbp.get('captured') or '?'}.")
    w("#")
    w("# Not authoritative yet. Read it, fix it, then it is — and from that point")
    w("# gbp-drift.mjs diffs the profile against it rather than this tool rewriting it.")
    w("# Lines marked TODO cannot be derived from a Business Profile and will fail the")
    w("# build until they are answered. That is deliberate.")
    w("#")
    w("# See discovery-%s.md for what was guessed and what is missing." % entity_id)
    w("")
    w("site:")
    w(f"  domain: {q(domain) if domain else 'TODO   # no website on the profile'}")
    # NOT the profile's language list. `site.languages` is what the SITE is
    # published in — one locale per URL prefix — while `entity.languages` below is
    # what the business speaks, which is a fact about the staff. Conflating them
    # made the drift check fail on the first run of this tool, correctly.
    w("  languages: [en]                  # add a locale here only when a translated tree exists")
    w("  ai_crawlers:")
    w("    allow: [GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended]")
    w("")
    w("entity:")
    w(f"  id: {q(entity_id)}")
    w(f"  root: {q(root)}                 # from the GBP website field")
    w(f"  type: {q(profile.get('type') or 'storefront')}")
    w(f"  name: {q(profile.get('name'))}")
    w(f"  phone: {q(e164(profile.get('phone'), addr.get('country')))}")
    w(f"  website_target: {q(website)}")
    if profile.get("opened"):
        opened = iso_date(profile["opened"])
        if opened:
            w(f"  opened: {opened}")
        else:
            w(f"  opened: {q(profile['opened'])}   # TODO as YYYY-MM-DD")
            notes.append(("FIX", f"could not read a date from opened={profile['opened']!r}"))
    w(f"  primary_category: {q(profile.get('primary_category'))}")
    w("  additional_categories: [%s]" % ", ".join(
        q(c) for c in (profile.get("additional_categories") or [])))
    if service_area_only:
        w("  # Which city this entity's pages target. A storefront takes it from its")
        w("  # address; a service-area business covers many and has to choose the one")
        w("  # its homepage competes in. Editorial — CONFIG-SCHEMA.md lists it under")
        w("  # human-only — and the build throws without it.")
        w("  city: TODO")
        w("  # NO ADDRESS, deliberately. PLANNING §9c: a service-area entity carries")
        w("  # none at all and `areaServed` carries the meaning instead. Emitting the")
        w("  # field with nulls would put an empty PostalAddress in the schema, and")
        w("  # the live site's `addressLocality: \"Greater Toronto Area\"` — a region")
        w("  # where the field wants a city — is the malformed version of this.")
        w("  # `locations` below is built from the profile's service area.")
    else:
        w("  address:")
        for k in ("street", "locality", "region", "region_name", "postal_code",
                  "country_name", "country"):
            w(f"    {k}: {q(addr.get(k))}")
    langs = [LANG_CODES.get(l, slug(l)) for l in (profile.get("languages") or [])]
    if langs:
        w("  # What the business speaks, from the profile. Distinct from site.languages.")
        w("  languages: [%s]" % ", ".join(langs))
    # Payments, from the GBP attributes, positives only. The profile also records
    # what is NOT accepted and schema has no way to express an absence, so those
    # are left out rather than inverted into a claim.
    pays = payments_from(profile.get("attributes"))
    if pays:
        w("  payments: [%s]" % ", ".join(q(p) for p in pays))
    if profile.get("sameAs"):
        w("  sameAs:")
        for s in profile["sameAs"]:
            w(f"    - {q(s)}")
    w("")
    w("  # Neither is on a Business Profile paste. place_id comes from the Places API")
    w("  # or the profile's share link; geo from the map pin. Rank tracking filters on")
    w("  # place_id, so a wrong one silently averages two businesses together.")
    w("  place_id: TODO")
    w("  geo: { lat: TODO, lng: TODO }")
    w("")
    w("  # The masthead's typeset descriptor beside the wordmark. `does` is the")
    w("  # plain-language service a customer recognises, NOT the GBP category.")
    w("  descriptor:")
    w("    does: TODO")
    where = None
    if locality:
        region_label = addr.get("region_name") or addr.get("region")
        where = f"{locality}, {region_label}" if region_label else locality
    w(f"    where: {q(where) if where else 'TODO'}")
    w("")
    w("  # How the service area reads in running prose. `locations` below is the")
    w("  # machine-readable list; this is what a sentence says.")
    w(f"  service_area_label: {q(locality) if locality else 'TODO'}   # TODO widen if the region has a name people use")
    w("")
    w("  nav:")
    w("    - { label: About,   slug: about }")
    w("    - { label: Contact, slug: contact }")
    if hours or hours_days:
        w("  hours:")
        if hours:
            w(f'    mon_sun: "{hours}"')
        else:
            w("    # Days differ, so they are listed. `mon_sun` is the shorthand for a")
            w("    # week where every day is the same; this business is not one.")
            w("    days:")
            for d in DAY_ORDER:
                v = hours_days.get(d) or "closed"
                w(f'      {d}: {v if v == "closed" else chr(34) + v + chr(34)}')
        specials = [s for s in (profile.get("special_hours") or []) if s.get("date")]
        if specials:
            w("    # Declared closures. Without these the schema claims the business is")
            w("    # open on days the profile records it as shut.")
            w("    special:")
            for sp in specials:
                d = iso_date(sp["date"])
                label = f", label: {q(sp['label'])}" if sp.get("label") else ""
                status = q((sp.get("status") or "").lower())
                if d:
                    w(f"      - {{ date: {d}{label}, status: {status} }}")
                else:
                    w(f"      - {{ date: {q(sp['date'])}{label}, status: {status} }}   # TODO as YYYY-MM-DD")
                    notes.append(("FIX", f"could not read a date from {sp['date']!r}"))
    else:
        w("  hours:")
        w("    mon_sun: TODO   # see discovery")
    w("")

    # ── silos ────────────────────────────────────────────────────────────
    blocks = gbp.get("services") or []
    primary = profile.get("primary_category")
    w("# SILOS — proposed, and the one thing that must be confirmed by a person.")
    w("# Cross-silo link detection is meaningless if the map is wrong, and it is the")
    w("# single most important Core 30 rule (CONFIG-SCHEMA.md).")
    w("#")
    w("# The primary category is merged into the root: its pillar IS the homepage and")
    w("# its services hang directly off the root, one level up from the others.")
    w("silos:")
    seen_slugs = {}
    collisions = {}          # (category, category) -> [slug, …]
    for b in blocks:
        cat = b.get("category")
        is_primary = cat == primary
        services = b.get("services") or []
        w("")
        w(f"  - category: {q(cat)}")
        w(f"    role: {'primary' if is_primary else 'secondary'}")
        if is_primary:
            w("    is_homepage: true")
            w('    slug: ""')
        else:
            w(f"    slug: {q(slug(cat))}")
        w("    # TODO the customer-facing term for this category, or null to keep the")
        w("    #      GBP wording. It owns the title tag; the category owns URL and H1.")
        w("    retheme: TODO")
        if not services:
            w("    services: []")
            notes.append(("DECIDE", f'category "{cat}" has no services on the profile — '
                                    "add them in GBP, or drop the category from the site"))
            continue
        w("    services:")
        for s in services:
            name = s.get("name")
            sl = slug(name)
            if sl in seen_slugs and seen_slugs[sl] != cat:
                collisions.setdefault((seen_slugs[sl], cat), []).append(sl)
            seen_slugs[sl] = cat
            w(f"      - {{ name: {q(name)}, slug: {q(sl)} }}")
        if len(services) > SERVICES_PER_SILO_MAX:
            notes.append(("DECIDE", f'"{cat}" has {len(services)} services. Each becomes a page; '
                                    f"more than about {SERVICES_PER_SILO_MAX} turns the category "
                                    "page into an index of an index. Choose the ones that earn a page."))
    # Collisions are reported per category PAIR rather than per slug. One
    # construction profile produced twenty-six identical-looking lines, which
    # buried the actual finding: two of its GBP categories are near-duplicates of
    # each other. That is a decision about the silo map, and it reads as one.
    for (a, b), slugs in collisions.items():
        notes.append(("FIX",
            f'"{a}" and "{b}" produce {len(slugs)} of the same service slug'
            f'{"s" if len(slugs) != 1 else ""} ({", ".join(sorted(slugs)[:4])}'
            f'{", …" if len(slugs) > 4 else ""}). Two silos cannot own the same URL, and two '
            f'categories this alike are usually one silo — merge them, or split the services '
            f'so each belongs to exactly one.'))
    w("")

    # ── locations ────────────────────────────────────────────────────────
    areas = []
    for a in profile.get("service_area") or []:
        city = str(a).split(",")[0].strip()
        # A storefront's home city is the entity itself rather than a location
        # page. A service-area business has no home city, so every one counts.
        if city and (service_area_only or city != locality) and city not in areas:
            areas.append(city)
    w("# Service-area cities, minus the home city. Each is a page that has to be")
    w("# written; they are declared here first so the linter can tell the difference")
    w("# between a page not built yet and a page nobody meant to build.")
    w("locations:")
    if areas:
        for c in areas:
            w(f"  - {{ city: {q(c)}, slug: {q(slug(c))} }}")
    else:
        w("  []")
    w("")
    w("# Neighbourhood pages, which no Business Profile knows about. They are the")
    w("# geographic tier that actually moves a rank grid; add them once there is work")
    w("# to point at. `for` names the one service page each may link to.")
    w("neighbourhoods: []")
    w("")
    w("# Supporting articles — the topical tier, harvested with paa-harvest.mjs.")
    w("supporting: []")
    w("")
    w("# TODO everything below is editorial or comes from somewhere other than GBP.")
    w("# proof:      photographs, review counts, warranty terms, the consultation block")
    w("# footer_nav: the three or four services that earn a place in the footer")
    w("# design:     logo files and icons")
    w("# baselines:  the rank grid this site is trying to move")
    w("# integrations, cannibalisation_guards: per site")
    w("")
    w("reviewed:")
    w(f"  gbp_verified: {q(gbp.get('captured') or '')}")
    return "\n".join(out) + "\n", notes


def discovery(entity_id, gbp, notes):
    p = gbp.get("profile", {})
    L = [f"# Discovery — {p.get('name') or entity_id}", "",
         f"From `{gbp.get('source') or '?'}`, captured {gbp.get('captured') or '?'}.",
         "Proposed by `gbp_to_config.py`. Never read by the engine.", ""]
    order = {"BLOCKER": 0, "FIX": 1, "DECIDE": 2}
    if notes:
        L += ["## Open", ""]
        for sev, text in sorted(notes, key=lambda n: order.get(n[0], 9)):
            L.append(f"- **{sev}** — {text}")
        L.append("")
    L += ["## Not derivable from a Business Profile", "",
          "Every one of these is a TODO in the proposed config, and the build fails",
          "until they are answered. A plausible placeholder would be worse than a",
          "blank, because a blank gets filled in.", "",
          "| field | where it comes from |",
          "|---|---|",
          "| `entity.place_id` | the Places API, or the profile's share link |",
          "| `entity.geo` | the map pin |",
          "| `entity.descriptor.does` | what a customer calls the work, not the GBP category |",
          "| `silos[].retheme` | keyword research — the term the title tag competes for |",
          "| `proof.*` | the photographs, reviews and warranty this business actually has |",
          "| `claims-<entity>.yaml` | the owner interview, via OPERATIONS.md |",
          "| `vocabulary-<entity>.yaml` | the same interview — what only this business can say |",
          "",
          "## What the profile did say", "",
          f"- **{len(p.get('additional_categories') or []) + 1} categories** — "
          f"{p.get('primary_category')} (primary)"
          + (", " + ", ".join(p.get("additional_categories") or []) if p.get("additional_categories") else ""),
          f"- **{sum(len(b.get('services') or []) for b in gbp.get('services') or [])} services** across "
          f"{len(gbp.get('services') or [])} categories",
          f"- **{len(p.get('service_area') or [])} service-area entries**",
          f"- **{len(p.get('attributes') or [])} attributes** — not used by the build, but the "
          "payments list feeds `paymentAccepted` in schema if you want it",
          ""]
    return "\n".join(L) + "\n"


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("capture", help="out/gbp-<entity>.json from gbp_parse.py")
    ap.add_argument("--entity", help="entity id (default: from the capture filename)")
    ap.add_argument("--out", help="where to write the config (default: ./config-<entity>.yaml)")
    ap.add_argument("--force", action="store_true",
                    help="overwrite an existing config. Almost never right — see the module docstring")
    a = ap.parse_args()

    with open(a.capture) as f:
        gbp = json.load(f)

    entity = a.entity or re.sub(r"^gbp-|\.json$", "", os.path.basename(a.capture))
    out = a.out or f"config-{entity}.yaml"
    text, notes = build(gbp, entity)

    target = out
    if os.path.exists(out) and not a.force:
        target = re.sub(r"\.yaml$", "", out) + ".proposed.yaml"
        print(f"\n  {out} already exists — it is authoritative and this will not touch it.")
        print(f"  Writing the proposal beside it instead:\n    {target}")
        print(f"    diff {out} {target}")

    with open(target, "w") as f:
        f.write(text)
    disc = os.path.join(os.path.dirname(os.path.abspath(target)), f"discovery-{entity}.md")
    with open(disc, "w") as f:
        f.write(discovery(entity, gbp, notes))

    print(f"\n  {target}")
    print(f"  {disc}")
    todos = text.count("TODO")
    blockers = [n for n in notes if n[0] == "BLOCKER"]
    print(f"\n  {todos} TODO(s) in the config, {len(notes)} note(s) in discovery")
    for sev, t in sorted(notes, key=lambda n: {"BLOCKER": 0, "FIX": 1, "DECIDE": 2}.get(n[0], 9)):
        print(f"    {sev:8} {t}")
    print()
    return 1 if blockers else 0


if __name__ == "__main__":
    sys.exit(main())
