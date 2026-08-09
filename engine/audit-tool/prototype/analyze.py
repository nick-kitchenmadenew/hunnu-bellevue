import json, re, collections
from urllib.parse import urlparse, urljoin

P = json.load(open("pages.json"))
byurl = {p["url"]: p for p in P}
HOST = "kitchenmadenew.com"

def norm(u, base):
    if not u or u.startswith(("#", "mailto:", "tel:", "javascript:")):
        return None
    a = urljoin(base, u)
    pr = urlparse(a)
    if pr.netloc.replace("www.", "") != HOST:
        return None
    path = pr.path
    if not path.endswith("/"):
        path += "/"
    return f"https://{HOST}{path}"

def silo(u):
    seg = urlparse(u).path.strip("/").split("/")
    if not seg or seg == [""]:
        return "HOME"
    return seg[0]

print("=" * 78)
print("1. URL STRUCTURE — top-level path segments")
print("=" * 78)
c = collections.Counter(silo(p["url"]) for p in P)
for k, v in c.most_common():
    print(f"  {v:4}  /{k}/")

print()
print("=" * 78)
print("2. HEADINGS")
print("=" * 78)
noh1 = [p["url"] for p in P if len(p.get("h1", [])) == 0]
multi = [(p["url"], len(p["h1"])) for p in P if len(p.get("h1", [])) > 1]
print(f"  pages with NO h1 : {len(noh1)}")
for u in noh1[:8]:
    print("     ", u)
print(f"  pages with >1 h1 : {len(multi)}")
for u, n in sorted(multi, key=lambda x: -x[1])[:8]:
    print(f"      {n}x  {u}")

print()
print("=" * 78)
print("3. DUPLICATE TITLES / META DESCRIPTIONS")
print("=" * 78)
for field in ("title", "meta_desc"):
    d = collections.Counter(p.get(field, "") for p in P if p.get(field))
    dupes = [(t, n) for t, n in d.most_common() if n > 1]
    print(f"  duplicate {field}: {len(dupes)} values covering {sum(n for _, n in dupes)} pages")
    for t, n in dupes[:6]:
        print(f"      {n}x  {t[:88]}")
    missing = [p["url"] for p in P if not p.get(field)]
    print(f"  missing {field}: {len(missing)}")
    for u in missing[:5]:
        print("      ", u)
    print()

print("=" * 78)
print("4. WORD COUNTS (body, chrome removed)")
print("=" * 78)
w = sorted(p.get("words", 0) for p in P)
print(f"  min {w[0]}   median {w[len(w)//2]}   max {w[-1]}")
for floor in (500, 1000, 1500):
    print(f"  pages under {floor} words: {sum(1 for x in w if x < floor)} / {len(w)}")
print("  thinnest:")
for p in sorted(P, key=lambda x: x.get("words", 0))[:10]:
    print(f"      {p.get('words',0):5}w  {p['url']}")

print()
print("=" * 78)
print("5. INTERNAL LINK GRAPH")
print("=" * 78)
graph, bodygraph = collections.defaultdict(set), collections.defaultdict(set)
anchors = collections.Counter()
anchor_targets = collections.defaultdict(set)
for p in P:
    if p.get("status") != 200:
        continue
    for L in p.get("links_all", []):
        t = norm(L["href"], p["url"])
        if t:
            graph[p["url"]].add(t)
    for L in p.get("links_body", []):
        t = norm(L["href"], p["url"])
        if t and t != p["url"] and L["text"] and not L["img"]:
            bodygraph[p["url"]].add(t)
            anchors[L["text"].lower()] += 1
            anchor_targets[L["text"].lower()].add(t)

alltargets = set().union(*graph.values()) if graph else set()
known = set(byurl)
print(f"  pages crawled            : {len(P)}")
print(f"  total internal link edges: {sum(len(v) for v in graph.values())}")
print(f"  body-prose link edges    : {sum(len(v) for v in bodygraph.values())}")
inbound = collections.Counter()
for s, ts in graph.items():
    for t in ts:
        inbound[t] += 1
orphans = [u for u in known if inbound.get(u, 0) == 0]
print(f"  ORPHANS (0 inbound links from any crawled page): {len(orphans)}")
for u in orphans[:15]:
    print("      ", u)
linked_not_in_sitemap = sorted(alltargets - known)
print(f"  linked URLs NOT in sitemap: {len(linked_not_in_sitemap)}")
for u in linked_not_in_sitemap[:12]:
    print("      ", u)

print()
print("=" * 78)
print("6. ANCHOR TEXT — Core 30 rule: never repeat, never generic, never brand")
print("=" * 78)
print(f"  distinct body anchor texts: {len(anchors)}   total body anchors: {sum(anchors.values())}")
rep = [(a, n) for a, n in anchors.most_common() if n > 1]
print(f"  REPEATED anchor texts: {len(rep)}  (covering {sum(n for _, n in rep)} links)")
for a, n in rep[:20]:
    print(f"      {n:4}x  '{a[:60]}'  -> {len(anchor_targets[a])} distinct target(s)")
GEN = ("click here", "read more", "learn more", "here", "more", "view more",
       "contact us", "get a quote", "see more", "find out more", "get started")
gen = [(a, n) for a, n in anchors.items() if a.strip() in GEN]
print(f"  GENERIC anchors: {sum(n for _, n in gen)} links across {len(gen)} texts")
for a, n in sorted(gen, key=lambda x: -x[1])[:8]:
    print(f"      {n:4}x  '{a}'")
brand = [(a, n) for a, n in anchors.items() if "kitchen made new" in a]
print(f"  BRAND-NAME anchors: {sum(n for _, n in brand)} links")
for a, n in sorted(brand, key=lambda x: -x[1])[:5]:
    print(f"      {n:4}x  '{a[:60]}'")

print()
print("=" * 78)
print("7. SILO CROSS-LINKING (proposed silos = top-level path segment)")
print("=" * 78)
cross = collections.Counter()
crossex = collections.defaultdict(list)
for s, ts in bodygraph.items():
    ss = silo(s)
    for t in ts:
        st = silo(t)
        if ss != st:
            cross[(ss, st)] += 1
            crossex[(ss, st)].append((s, t))
print(f"  cross-silo body links: {sum(cross.values())}")
for (a, b), n in cross.most_common(18):
    print(f"      {n:4}  /{a}/  ->  /{b}/")

print()
print("=" * 78)
print("8. SCHEMA")
print("=" * 78)
types = collections.Counter()
noschema = []
for p in P:
    if p.get("status") != 200:
        continue
    ts = set()
    def walk(o):
        if isinstance(o, dict):
            t = o.get("@type")
            if isinstance(t, str):
                ts.add(t)
            elif isinstance(t, list):
                ts.update(t)
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)
    walk(p.get("schema", []))
    if not ts:
        noschema.append(p["url"])
    for t in ts:
        types[t] += 1
for t, n in types.most_common(20):
    print(f"  {n:4}  {t}")
print(f"  pages with NO schema: {len(noschema)}")
for u in noschema[:6]:
    print("      ", u)
agg = [p["url"] for p in P if "aggregateRating" in json.dumps(p.get("schema", []))]
rev = [p["url"] for p in P if '"Review"' in json.dumps(p.get("schema", []))]
print(f"  pages with aggregateRating: {len(agg)}   with Review: {len(rev)}")
for u in agg[:5]:
    print("      ", u)

print()
print("=" * 78)
print("9. IMAGES & PAGE WEIGHT")
print("=" * 78)
ti = sum(p.get("img_total", 0) for p in P)
na = sum(p.get("img_no_alt", 0) for p in P)
nd = sum(p.get("img_no_dim", 0) for p in P)
print(f"  total <img>: {ti}   missing alt: {na} ({na*100//max(ti,1)}%)   missing width/height: {nd} ({nd*100//max(ti,1)}%)")
hb = sorted((p.get("html_bytes", 0), p["url"]) for p in P)
print(f"  HTML size: min {hb[0][0]//1024}KB  median {hb[len(hb)//2][0]//1024}KB  max {hb[-1][0]//1024}KB")
print("  heaviest HTML:")
for b, u in hb[-5:][::-1]:
    print(f"      {b//1024:5}KB  {u}")

print()
print("=" * 78)
print("10. CANONICAL / NOINDEX")
print("=" * 78)
noidx = [p["url"] for p in P if p.get("noindex")]
print(f"  noindex pages: {len(noidx)}")
for u in noidx[:8]:
    print("      ", u)
mism = [(p["url"], p["canonical"]) for p in P
        if p.get("canonical") and p["canonical"].rstrip("/") != p["url"].rstrip("/")]
print(f"  canonical pointing elsewhere: {len(mism)}")
for u, cn in mism[:10]:
    print(f"      {u}\n         -> {cn}")
