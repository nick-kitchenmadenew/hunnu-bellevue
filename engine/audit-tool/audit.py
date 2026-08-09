#!/usr/bin/env python3
"""
Core 30 Audit & Discovery.

Gathers everything needed to build Core 30 pages, and — where pages already exist —
the gap list to make them compliant. See AUDIT-METHOD.md for the method this implements.

    python3 audit.py --domain kitchenmadenew.com \
                     --leadsnap grid1.csv grid2.csv \
                     --out out/

GSC is not covered here (needs authenticated access); import it separately.
"""

import argparse, collections, csv, gzip, io, json, math, os, re, sys, time
import urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor
from html import unescape
from urllib.parse import urljoin, urlparse

UA_BROWSER = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
              "(KHTML, like Gecko) Chrome/120.0 Safari/537.36")
UA_BOT = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
UA_AUDIT = "Mozilla/5.0 (compatible; Core30Audit/1.0)"

# Off-vertical vocabulary that indicates an injected-spam compromise.
SPAM_TERMS = ["slot", "togel", "judi", "casino", "poker", "gacor", "bandar", "viagra",
              "cialis", "replica", "escort", "porn", "bokep", "situs", "rtp"]
GENERIC_ANCHORS = {"click here", "read more", "learn more", "here", "more", "view more",
                   "see more", "find out more", "get started", "contact us", "get a quote",
                   "this page", "link"}

AI_CRAWLERS = ["GPTBot", "OAI-SearchBot", "ClaudeBot", "PerplexityBot",
               "Google-Extended", "CCBot", "Applebot-Extended"]


# ─────────────────────────────── fetching ────────────────────────────────

def fetch(url, ua=UA_AUDIT, timeout=30):
    """Return (status, final_url, body). status 0 on transport failure."""
    try:
        rq = urllib.request.Request(url, headers={"User-Agent": ua, "Accept-Encoding": "gzip"})
        with urllib.request.urlopen(rq, timeout=timeout) as r:
            raw = r.read()
            if r.headers.get("Content-Encoding") == "gzip":
                raw = gzip.decompress(raw)
            return r.status, str(r.url), raw.decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, url, ""
    except Exception:
        return 0, url, ""


def strip_tags(html):
    html = re.sub(r"(?is)<(script|style|noscript|svg|template)\b.*?</\1>", " ", html)
    return re.sub(r"<[^>]+>", " ", html)


def text_of(html):
    return re.sub(r"\s+", " ", unescape(strip_tags(html))).strip()


# ───────────────────────── phase A: discovery ────────────────────────────

def read_robots(domain):
    """robots.txt → sitemap URLs + AI crawler policy."""
    _, _, body = fetch(f"https://{domain}/robots.txt")
    sitemaps = re.findall(r"(?im)^\s*Sitemap:\s*(\S+)", body)
    blocked = []
    for agent in AI_CRAWLERS:
        # a block for this agent containing a bare "Disallow: /"
        m = re.search(rf"(?is)User-agent:\s*{re.escape(agent)}\s*(.*?)(?=user-agent:|$)", body)
        if m and re.search(r"(?im)^\s*Disallow:\s*/\s*$", m.group(1)):
            blocked.append(agent)
    return {"sitemaps": sitemaps, "ai_crawlers_blocked": blocked, "raw": body.strip()}


def walk_sitemaps(domain, seeds):
    """Recurse sitemap indexes → deduped page URLs."""
    candidates = list(seeds) or [f"https://{domain}/sitemap_index.xml",
                                 f"https://{domain}/sitemap.xml",
                                 f"https://{domain}/wp-sitemap.xml"]
    seen_maps, urls = set(), []
    queue = list(candidates)
    while queue:
        sm = queue.pop(0)
        if sm in seen_maps:
            continue
        seen_maps.add(sm)
        status, _, body = fetch(sm)
        if status != 200 or "<" not in body:
            continue
        locs = re.findall(r"<loc>\s*(.*?)\s*</loc>", body)
        if "<sitemapindex" in body:
            queue.extend(locs)
        else:
            urls.extend(locs)
    out = []
    for u in urls:
        if u not in out:
            out.append(u)
    return out, sorted(seen_maps)


CHROME_TAGS = r"(?is)<(nav|header|footer|aside)\b.*?</\1>"
CHROME_CLASS = (r'(?is)<(div|section)\b[^>]*class="[^"]*'
                r'\b(nav|menu|footer|sidebar|widget|breadcrumb)\b[^"]*".*?</\1>')


def parse_page(url, status, final, html):
    d = {"url": url, "status": status, "final": final}
    if status != 200 or not html:
        return d

    def first(pat):
        m = re.search(pat, html, re.I | re.S)
        return unescape(m.group(1)).strip() if m else ""

    d["title"] = first(r"<title[^>]*>(.*?)</title>")
    d["meta_desc"] = (first(r'<meta[^>]+name=["\']description["\'][^>]+content=["\'](.*?)["\']')
                      or first(r'<meta[^>]+content=["\'](.*?)["\'][^>]+name=["\']description["\']'))
    d["canonical"] = first(r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\'](.*?)["\']')
    d["noindex"] = bool(re.search(r'(?is)<meta[^>]+robots[^>]+noindex', html))
    for lv in (1, 2, 3):
        d[f"h{lv}"] = [text_of(x) for x in
                       re.findall(rf"(?is)<h{lv}[^>]*>(.*?)</h{lv}>", html)]

    body = re.sub(CHROME_CLASS, " ", re.sub(CHROME_TAGS, " ", html))
    d["words"] = len(text_of(body).split())
    d["has_landmarks"] = bool(re.search(r"(?i)<main\b", html)) and \
                         bool(re.search(r"(?i)<footer\b", html))

    def links(src):
        out = []
        for m in re.finditer(r'(?is)<a\b([^>]*)>(.*?)</a>', src):
            href = re.search(r'href=["\']([^"\']*)["\']', m.group(1))
            if href:
                out.append({"href": href.group(1), "text": text_of(m.group(2)),
                            "img": bool(re.search(r"(?is)<img", m.group(2)))})
        return out

    d["links_all"], d["links_body"] = links(html), links(body)
    d["schema"] = []
    for m in re.finditer(r'(?is)<script[^>]+application/ld\+json[^>]*>(.*?)</script>', html):
        try:
            d["schema"].append(json.loads(m.group(1).strip()))
        except Exception:
            d["schema"].append({"_parse_error": True})
    imgs = re.findall(r"(?is)<img\b([^>]*)>", html)
    d["img_total"] = len(imgs)
    d["img_no_alt"] = sum(1 for i in imgs if not re.search(r'alt=["\'][^"\']+["\']', i))
    d["img_no_dim"] = sum(1 for i in imgs
                          if not (re.search(r"\bwidth=", i) and re.search(r"\bheight=", i)))
    d["html_bytes"] = len(html)
    return d


def crawl(urls, workers=5, delay=0.15):
    def job(u):
        s, f, h = fetch(u)
        time.sleep(delay)
        return parse_page(u, s, f, h)
    with ThreadPoolExecutor(max_workers=workers) as ex:
        return list(ex.map(job, urls))


def cloaking_check(urls, sample=6):
    """Compare Googlebot vs browser responses. Divergence ⇒ likely compromise."""
    findings = []
    for u in urls[:sample]:
        _, _, a = fetch(u, ua=UA_BOT)
        _, _, b = fetch(u, ua=UA_BROWSER)
        la, lb = len(a), len(b)
        # word-boundary match on visible text only — substring matching produces
        # constant false positives ("rtp" inside base64, "slot" inside "slots" etc.)
        ta, tb = text_of(a).lower(), text_of(b).lower()
        spam = sorted({t for t in SPAM_TERMS
                       if re.search(rf"\b{re.escape(t)}\b", ta)
                       or re.search(rf"\b{re.escape(t)}\b", tb)})
        diverged = bool(la and lb and abs(la - lb) / max(la, lb) > 0.10)
        if diverged or spam:
            findings.append({"url": u, "bot_bytes": la, "browser_bytes": lb,
                             "diverged": diverged, "spam_terms": spam})
    return {"sampled": min(sample, len(urls)), "findings": findings}


def extract_design(domain, home_html):
    """Theme CSS → palette, custom properties, fonts."""
    blob = home_html
    hrefs = re.findall(r'<link[^>]+href=["\']([^"\']+\.css[^"\']*)["\']', home_html)
    for h in list(dict.fromkeys(hrefs))[:14]:
        u = h if h.startswith("http") else urljoin(f"https://{domain}/", h)
        _, _, css = fetch(u)
        blob += css

    counts = collections.Counter()
    for m in re.finditer(r"#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b", blob):
        c = m.group(0).lower()
        if len(c) == 4:
            c = "#" + "".join(ch * 2 for ch in c[1:])
        counts[c] += 1
    props = dict(list(dict.fromkeys(
        re.findall(r"(--[a-z0-9-]*(?:color|accent|primary|brand|bg)[a-z0-9-]*)\s*:\s*([^;}]{1,40})",
                   blob, re.I)))[:25])
    fonts = collections.Counter(re.sub(r"\s+", " ", f.strip())
                                for f in re.findall(r"font-family\s*:\s*([^;}]{3,90})", blob))
    return {"top_colours": counts.most_common(18),
            "css_variables": {k: v.strip() for k, v in props.items()},
            "fonts": fonts.most_common(10),
            "google_fonts": bool(re.search(r"fonts\.googleapis\.com", blob))}


def contrast(hex1, hex2):
    """WCAG contrast ratio."""
    def lum(h):
        h = h.lstrip("#")
        ch = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
        ch = [c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4 for c in ch]
        return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
    a, b = sorted([lum(hex1), lum(hex2)], reverse=True)
    return round((a + 0.05) / (b + 0.05), 2)


# ────────────────────── structure & link analysis ────────────────────────

def analyse(pages, host, silo_map=None):
    ok = [p for p in pages if p.get("status") == 200]
    known = {p["url"] for p in pages}

    def norm(href, base):
        if not href or href.startswith(("#", "mailto:", "tel:", "javascript:")):
            return None
        pr = urlparse(urljoin(base, href))
        if pr.netloc.replace("www.", "") != host:
            return None
        path = pr.path if pr.path.endswith("/") else pr.path + "/"
        return f"https://{host}{path}"

    def silo(u):
        if silo_map:
            for prefix, name in silo_map.items():
                if urlparse(u).path.startswith(prefix):
                    return name
        seg = urlparse(u).path.strip("/").split("/")
        return seg[0] if seg and seg[0] else "HOME"

    graph, body_graph = collections.defaultdict(set), collections.defaultdict(set)
    anchors = collections.Counter()
    anchor_targets = collections.defaultdict(set)
    for p in ok:
        for l in p.get("links_all", []):
            t = norm(l["href"], p["url"])
            if t:
                graph[p["url"]].add(t)
        for l in p.get("links_body", []):
            t = norm(l["href"], p["url"])
            if t and t != p["url"] and l["text"] and not l["img"]:
                body_graph[p["url"]].add(t)
                anchors[l["text"].lower()] += 1
                anchor_targets[l["text"].lower()].add(t)

    inbound = collections.Counter()
    for s, ts in graph.items():
        for t in ts:
            inbound[t] += 1

    cross = collections.Counter()
    for s, ts in body_graph.items():
        for t in ts:
            if silo(s) != silo(t):
                cross[(silo(s), silo(t))] += 1

    def dupes(field):
        c = collections.Counter(p.get(field, "") for p in ok if p.get(field))
        return {v: n for v, n in c.items() if n > 1}

    schema_types = collections.Counter()
    review_markup = []
    for p in ok:
        blob = json.dumps(p.get("schema", []))
        for t in re.findall(r'"@type":\s*"([^"]+)"', blob):
            schema_types[t] += 1
        if "aggregateRating" in blob or '"Review"' in blob:
            review_markup.append(p["url"])

    words = sorted(p.get("words", 0) for p in ok)
    repeated = {a: n for a, n in anchors.items() if n > 1}
    return {
        "pages_total": len(pages),
        "pages_ok": len(ok),
        "url_patterns": collections.Counter(silo(p["url"]) for p in ok).most_common(),
        "no_h1": [p["url"] for p in ok if len(p.get("h1", [])) == 0],
        "multi_h1": [(p["url"], len(p["h1"])) for p in ok if len(p.get("h1", [])) > 1],
        "dup_titles": dupes("title"),
        "dup_meta": dupes("meta_desc"),
        "missing_meta": [p["url"] for p in ok if not p.get("meta_desc")],
        "words": {"min": words[0] if words else 0,
                  "median": words[len(words) // 2] if words else 0,
                  "max": words[-1] if words else 0,
                  "under_1500": sum(1 for w in words if w < 1500),
                  "thinnest": sorted(((p.get("words", 0), p["url"]) for p in ok))[:10]},
        "links": {"edges_all": sum(len(v) for v in graph.values()),
                  "edges_body": sum(len(v) for v in body_graph.values())},
        "orphans": [u for u in known if inbound.get(u, 0) == 0],
        "offsitemap_targets": sorted(set().union(*graph.values()) - known)[:60] if graph else [],
        "anchors": {"distinct": len(anchors), "total": sum(anchors.values()),
                    "repeated_texts": len(repeated),
                    "repeated_links": sum(repeated.values()),
                    "top_repeats": collections.Counter(repeated).most_common(20),
                    "generic": sum(n for a, n in anchors.items() if a.strip() in GENERIC_ANCHORS)},
        "cross_silo": {"total": sum(cross.values()), "pairs": cross.most_common(15)},
        "schema_types": schema_types.most_common(20),
        "review_markup_pages": review_markup,
        "images": {"total": sum(p.get("img_total", 0) for p in ok),
                   "no_alt": sum(p.get("img_no_alt", 0) for p in ok),
                   "no_dim": sum(p.get("img_no_dim", 0) for p in ok)},
        "html_bytes": {"median": sorted(p.get("html_bytes", 0) for p in ok)[len(ok) // 2] if ok else 0,
                       "max": max((p.get("html_bytes", 0) for p in ok), default=0),
                       "heaviest": sorted(((p.get("html_bytes", 0), p["url"]) for p in ok),
                                          reverse=True)[:5]},
        "no_landmarks": sum(1 for p in ok if not p.get("has_landmarks")),
        "noindex": [p["url"] for p in ok if p.get("noindex")],
    }


# ────────────────────── phase B: LeadSnap parsing ────────────────────────

def parse_leadsnap(path, term=None):
    """LeadSnap exports are multi-block CSV: 'Place Data:', 'Points Data:', 'Competitor Data:'."""
    raw = open(path, encoding="utf-8-sig").read()
    blocks, cur, name = {}, [], None
    for line in raw.split("\n"):
        if re.match(r"^[A-Z][A-Za-z ]+:\s*$", line):
            if name:
                blocks[name] = "\n".join(cur)
            name, cur = line.strip().rstrip(":"), []
        else:
            cur.append(line)
    if name:
        blocks[name] = "\n".join(cur)

    def rows(key):
        if key not in blocks:
            return []
        return list(csv.DictReader(io.StringIO(blocks[key].strip())))

    place = (rows("Place Data") or [{}])[0]
    # LeadSnap's final column (related_categories) contains unquoted commas, so csv
    # spills the extras into the restkey. Fold them back in.
    overflow = place.pop(None, None) or []
    if overflow:
        place["related_categories"] = ",".join(
            [place.get("related_categories") or ""] + [str(x) for x in overflow]).strip(",")
    pts = [p for p in rows("Points Data") if str(p.get("rank", "")).isdigit()]
    comps = rows("Competitor Data")

    ranks = [int(p["rank"]) for p in pts]
    result = {
        "source_file": os.path.basename(path),
        "search_term": term,
        "place": {
            "name": place.get("name"),
            "address": place.get("address") or None,
            "phone": place.get("phone"),
            "website": place.get("website_url"),
            "reviews": {"count": _int(place.get("review_count")),
                        "rating": _f(place.get("ave_review_rating"))},
            "primary_category": place.get("main_category"),
            "related_categories": [c for c in (place.get("related_categories") or "").split(",") if c],
            "lat": _f(place.get("latitude")), "lng": _f(place.get("longitude")),
            "type": "storefront" if (place.get("address") or "").strip() else "service_area",
        },
        "grid": {"points": len(pts)},
    }
    if ranks:
        result["grid"].update({
            "avg_rank": round(sum(ranks) / len(ranks), 2),
            "best": min(ranks), "worst": max(ranks),
            "top3_pct": round(sum(1 for r in ranks if r <= 3) * 100 / len(ranks), 1),
            "bands": {"1-3": sum(1 for r in ranks if r <= 3),
                      "4-10": sum(1 for r in ranks if 4 <= r <= 10),
                      "11-20": sum(1 for r in ranks if 11 <= r <= 20),
                      "20+": sum(1 for r in ranks if r > 20)},
        })
        result["grid"]["decay"] = rank_decay(pts, result["place"]["lat"], result["place"]["lng"])

    def f(x):
        try:
            return float(str(x).replace("%", ""))
        except Exception:
            return 0.0
    comps.sort(key=lambda r: -f(r.get("Market_Share")))
    result["competitors"] = [{
        "name": c.get("Name"), "avg_rank": f(c.get("Avg_Rank")),
        "top3_pct": f(c.get("Top_3")), "market_share": f(c.get("Market_Share")),
        "rating": f(c.get("Review")), "reviews": int(f(c.get("Reviews_Count"))),
    } for c in comps[:25]]
    return result


def _f(x):
    try:
        return float(x)
    except Exception:
        return None


def _int(x):
    try:
        return int(float(x))
    except Exception:
        return None


def rank_decay(points, lat0, lng0, band_km=5):
    """Rank bucketed by distance from the pin. Reveals proximity anomalies."""
    if lat0 is None or lng0 is None:
        return None
    bands = collections.defaultdict(list)
    for p in points:
        la, ln = _f(p.get("lat")), _f(p.get("lng"))
        if la is None or ln is None:
            continue
        dy = (la - lat0) * 111.0
        dx = (ln - lng0) * 111.0 * math.cos(math.radians(lat0))
        bands[int(math.hypot(dx, dy) // band_km)].append(int(p["rank"]))
    out = []
    for b in sorted(bands):
        v = bands[b]
        out.append({"band_km": f"{b*band_km}-{(b+1)*band_km}", "n": len(v),
                    "avg_rank": round(sum(v) / len(v), 1),
                    "top3_pct": round(sum(1 for r in v if r <= 3) * 100 / len(v), 1)})
    # Classify by where performance actually peaks, not by comparing endpoints —
    # a mid-range peak (best rank 20 km out) is the signal, and an endpoint
    # comparison misses it entirely.
    if len(out) >= 3:
        best = min(range(len(out)), key=lambda i: out[i]["avg_rank"])
        spread = max(b["avg_rank"] for b in out) - min(b["avg_rank"] for b in out)
        if spread < 2:
            shape = "flat"
        elif best <= 1:
            shape = "normal"          # strongest near the pin, as expected
        else:
            shape = "inverted"        # strongest away from the pin — abnormal
        peak_band = out[best]["band_km"]
    else:
        shape, peak_band = "unknown", None
    return {"bands": out, "shape": shape, "peak_band": peak_band}


# ─────────────────── derived cross-source analyses ───────────────────────

KEYWORD_HINTS = ["refacing", "refinishing", "painting", "cabinet", "kitchen",
                 "remodel", "countertop", "staining", "renovation"]


def derive(struct, grids, planned=None):
    """The findings that come from cross-referencing, not from any single module."""
    out = []

    for g in grids:
        pl, gr = g["place"], g.get("grid", {})
        dec = gr.get("decay") or {}
        if dec.get("shape") == "inverted":
            out.append({"id": "rank-decay-inverted", "severity": "high",
                        "entity": pl["name"], "term": g.get("search_term"),
                        "detail": "Ranks worst near the pin and best far away — abnormal for "
                                  "local pack results, which are proximity-weighted."})
        elif dec.get("shape") == "flat" and gr.get("top3_pct") == 0:
            out.append({"id": "rank-decay-flat-no-pack", "severity": "high",
                        "entity": pl["name"], "term": g.get("search_term"),
                        "detail": "Rank does not improve near the pin and never reaches the "
                                  "top 3 — indicates profile/authority weakness, not distance."})

        # does review count explain top-3 share?
        weak = [c for c in g["competitors"] if c["top3_pct"] > 20 and c["reviews"] < pl["reviews"]["count"]]
        if weak and gr.get("top3_pct", 0) < 5:
            out.append({"id": "reviews-not-the-constraint", "severity": "medium",
                        "entity": pl["name"],
                        "detail": f"{len(weak)} competitor(s) hold >20% top-3 with fewer reviews "
                                  f"than this profile ({pl['reviews']['count']}). Review count is "
                                  f"not what is gating the pack.",
                        "examples": [f"{c['name']} — {c['reviews']} reviews, "
                                     f"{c['top3_pct']}% top-3" for c in weak[:4]]})

        # keyword-in-business-name pattern among winners
        winners = [c for c in g["competitors"] if c["top3_pct"] >= 20]
        kw = [c for c in winners if any(k in c["name"].lower() for k in KEYWORD_HINTS)]
        self_kw = any(k in (pl["name"] or "").lower() for k in KEYWORD_HINTS)
        if winners and len(kw) / len(winners) >= 0.7 and not self_kw:
            out.append({"id": "keyword-in-business-name", "severity": "info",
                        "entity": pl["name"],
                        "detail": f"{len(kw)} of {len(winners)} competitors holding ≥20% top-3 "
                                  f"carry a service keyword in their business name; this profile "
                                  f"does not. Reported only — out of engine scope.",
                        "examples": [c["name"] for c in kw[:5]]})

    if struct["review_markup_pages"]:
        out.append({"id": "self-serving-review-markup", "severity": "high",
                    "detail": f"{len(struct['review_markup_pages'])} page(s) carry Review or "
                              f"aggregateRating markup about the business on its own site. "
                              f"Ineligible for review rich results; can draw a manual action."})

    a = struct["anchors"]
    if a["total"] and a["repeated_links"] / a["total"] > 0.25:
        out.append({"id": "anchor-text-not-unique", "severity": "high",
                    "detail": f"{a['repeated_links']} of {a['total']} internal links "
                              f"({round(a['repeated_links']*100/a['total'])}%) reuse anchor text "
                              f"across only {a['distinct']} distinct strings."})

    if struct["orphans"]:
        out.append({"id": "orphan-pages", "severity": "high",
                    "detail": f"{len(struct['orphans'])} page(s) in the sitemap have zero inbound "
                              f"internal links.", "examples": struct["orphans"][:10]})

    if struct["cross_silo"]["total"]:
        out.append({"id": "cross-silo-links", "severity": "high",
                    "detail": f"{struct['cross_silo']['total']} body links cross a silo boundary "
                              f"(silos proposed from URL structure — confirm before acting)."})

    if len(struct["url_patterns"]) > 8:
        out.append({"id": "url-structure-fragmented", "severity": "medium",
                    "detail": f"{len(struct['url_patterns'])} distinct top-level URL patterns — "
                              f"no coherent silo structure."})

    if struct["no_landmarks"]:
        out.append({"id": "no-semantic-landmarks", "severity": "low",
                    "detail": f"{struct['no_landmarks']} page(s) lack <main>/<footer>. Hurts "
                              f"accessibility and makes body-vs-chrome undecidable for checkers."})

    if planned:
        for g in grids:
            # the primary category counts as configured — it is set, just not as an "additional"
            actual = set(x.strip().lower() for x in g["place"]["related_categories"])
            actual.add((g["place"].get("primary_category") or "").strip().lower())
            want = set(x.strip().lower() for x in planned.get("additional_categories", []))
            missing = want - actual
            if missing:
                label = g["place"].get("address") or f"{g['place']['type']} profile"
                out.append({"id": "gbp-categories-not-set", "severity": "high",
                            "entity": g["place"]["name"], "profile": label,
                            "detail": f"[{label}] planned additional categories not configured: "
                                      f"{', '.join(sorted(missing))}. The silo structure depends "
                                      f"on them."})
    return out


# ────────────────────────── emit config files ────────────────────────────

def emit(domain, robots, struct, grids, derived, design, cloak, outdir):
    os.makedirs(outdir, exist_ok=True)
    entities = []
    for i, g in enumerate(grids):
        pl = g["place"]
        eid = re.sub(r"[^a-z0-9]+", "-",
                     (pl.get("address") or pl.get("name") or f"entity{i}").lower()).strip("-")[:24]
        e = {"id": eid, "type": pl["type"], "name": pl["name"], "phone": pl["phone"],
             "website_target": pl["website"], "primary_category": pl["primary_category"],
             "additional_categories": pl["related_categories"],
             "reviews": pl["reviews"], "_display_only": "reviews never enter schema"}
        if pl["type"] == "storefront":
            e["address"] = pl["address"]
            e["geo"] = {"lat": pl["lat"], "lng": pl["lng"]}
        else:
            e["address"] = None
        entities.append(e)

    config = {
        "site": {"domain": domain,
                 "primary_city": None,
                 "languages": ["en"],
                 "ai_crawlers": {"blocked": robots["ai_crawlers_blocked"]}},
        "entities": entities,
        "silos": [], "locations": [], "pages": [], "redirects": [],
        "design": {"tokens": "DESIGN-TOKENS.md", "logo": None},
        "competitors": [c for g in grids for c in g["competitors"][:8]],
        "baselines": {"captured": time.strftime("%Y-%m-%d"),
                      "grids": [{"entity": e["id"], "term": g.get("search_term"),
                                 **{k: v for k, v in g.get("grid", {}).items() if k != "decay"}}
                                for e, g in zip(entities, grids)]},
        "reviewed": {"gbp_verified": time.strftime("%Y-%m-%d")},
    }

    discovery = {
        "generated": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "conflicts": [d for d in derived if d["severity"] in ("high", "medium")],
        "findings": derived,
        "open_questions": ["primary_city", "silo_map_confirmation", "hours_per_entity",
                           "service_area_priority", "logo_source_file",
                           "rank_grid_search_terms" if any(not g.get("search_term") for g in grids)
                           else None],
        "structure": struct, "design": design, "cloaking": cloak,
        "grids": grids, "robots": robots,
    }
    discovery["open_questions"] = [q for q in discovery["open_questions"] if q]

    json.dump(config, open(f"{outdir}/config.json", "w"), indent=2)
    json.dump(discovery, open(f"{outdir}/discovery.json", "w"), indent=2)
    return config, discovery


# ─────────────────────────────── main ────────────────────────────────────

def main():
    ap = argparse.ArgumentParser(description="Core 30 audit & discovery")
    ap.add_argument("--domain", required=True)
    ap.add_argument("--leadsnap", nargs="*", default=[],
                    help="LeadSnap CSV export(s). Use file.csv:search term to attach the term.")
    ap.add_argument("--planned-categories", nargs="*", default=[],
                    help="Additional GBP categories the strategy calls for")
    ap.add_argument("--out", default="out")
    ap.add_argument("--limit", type=int, default=0, help="cap pages crawled (testing)")
    args = ap.parse_args()

    print(f"[1/6] robots.txt + sitemaps for {args.domain}")
    robots = read_robots(args.domain)
    urls, maps = walk_sitemaps(args.domain, robots["sitemaps"])
    if args.limit:
        urls = urls[:args.limit]
    print(f"      {len(urls)} URLs from {len(maps)} sitemap(s)")

    print(f"[2/6] crawling {len(urls)} pages")
    pages = crawl(urls)
    ok = sum(1 for p in pages if p.get("status") == 200)
    print(f"      {ok}/{len(pages)} returned 200")

    print("[3/6] cloaking / injection check")
    cloak = cloaking_check(urls)
    print(f"      {len(cloak['findings'])} suspicious of {cloak['sampled']} sampled")

    print("[4/6] structure & link analysis")
    struct = analyse(pages, args.domain.replace("www.", ""))

    print("[5/6] design tokens + LeadSnap")
    home = next((p for p in pages if p["url"].rstrip("/") == f"https://{args.domain}"), None)
    _, _, home_html = fetch(f"https://{args.domain}/")
    design = extract_design(args.domain, home_html)
    for name, hexv in [("bg", "#ffffff")]:
        pass
    grids = []
    for spec in args.leadsnap:
        path, _, term = spec.partition(":")
        if not term:
            term = input(f"      search term for {os.path.basename(path)}: ").strip() or None
        grids.append(parse_leadsnap(path, term or None))
        print(f"      {os.path.basename(path)} → {grids[-1]['place']['name']} "
              f"({grids[-1]['place']['type']}), {grids[-1]['grid'].get('points',0)} points")

    print("[6/6] derived analyses + config emit")
    planned = {"additional_categories": args.planned_categories} if args.planned_categories else None
    derived = derive(struct, grids, planned)
    config, discovery = emit(args.domain, robots, struct, grids, derived, design, cloak, args.out)
    json.dump(pages, open(f"{args.out}/pages.json", "w"))

    print(f"\n  → {args.out}/config.json     ({len(config['entities'])} entities)")
    print(f"  → {args.out}/discovery.json  ({len(derived)} findings, "
          f"{len(discovery['conflicts'])} needing a decision)")
    print(f"  → {args.out}/pages.json      ({len(pages)} pages)\n")
    for d in sorted(derived, key=lambda x: {"high": 0, "medium": 1, "low": 2, "info": 3}[x["severity"]]):
        print(f"  [{d['severity'].upper():6}] {d['id']}: {d['detail'][:110]}")


if __name__ == "__main__":
    main()
