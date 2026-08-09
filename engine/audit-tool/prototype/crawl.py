import json, re, time, urllib.request, urllib.error, gzip
from concurrent.futures import ThreadPoolExecutor
from html import unescape

UA = "Mozilla/5.0 (compatible; Core30Audit/1.0; site-owner-requested)"
urls = [u.strip() for u in open("urls.txt") if u.strip()]

def fetch(u):
    try:
        rq = urllib.request.Request(u, headers={"User-Agent": UA, "Accept-Encoding": "gzip"})
        with urllib.request.urlopen(rq, timeout=30) as r:
            raw = r.read()
            if r.headers.get("Content-Encoding") == "gzip":
                raw = gzip.decompress(raw)
            return r.status, str(r.url), raw.decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, u, ""
    except Exception as e:
        return 0, u, f"ERR {e}"

def strip(h):
    h = re.sub(r"(?is)<(script|style|noscript|svg)\b.*?</\1>", " ", h)
    return re.sub(r"<[^>]+>", " ", h)

# regions we treat as non-body chrome
CHROME = r"(?is)<(nav|header|footer|aside)\b.*?</\1>"
CHROME_CLASS = r'(?is)<(div|section)\b[^>]*class="[^"]*\b(nav|menu|footer|sidebar|widget|breadcrumb)\b[^"]*".*?</\1>'

def analyze(u, status, final, h):
    d = {"url": u, "status": status, "final": final}
    if not h or status != 200:
        return d
    d["title"] = unescape((re.search(r"(?is)<title[^>]*>(.*?)</title>", h) or [None, ""])[1]).strip()
    md = re.search(r'(?is)<meta[^>]+name=["\']description["\'][^>]+content=["\'](.*?)["\']', h) \
         or re.search(r'(?is)<meta[^>]+content=["\'](.*?)["\'][^>]+name=["\']description["\']', h)
    d["meta_desc"] = unescape(md.group(1)).strip() if md else ""
    can = re.search(r'(?is)<link[^>]+rel=["\']canonical["\'][^>]+href=["\'](.*?)["\']', h)
    d["canonical"] = can.group(1) if can else ""
    d["noindex"] = bool(re.search(r'(?is)<meta[^>]+robots[^>]+noindex', h))
    for lv in (1, 2, 3):
        d[f"h{lv}"] = [re.sub(r"\s+", " ", strip(x)).strip()
                       for x in re.findall(rf"(?is)<h{lv}[^>]*>(.*?)</h{lv}>", h)]
    # main body = html minus chrome
    body = re.sub(CHROME, " ", h)
    body = re.sub(CHROME_CLASS, " ", body)
    d["words"] = len(re.sub(r"\s+", " ", unescape(strip(body))).split())
    d["words_full"] = len(re.sub(r"\s+", " ", unescape(strip(h))).split())

    def links(src):
        out = []
        for m in re.finditer(r'(?is)<a\b([^>]*)>(.*?)</a>', src):
            href = re.search(r'href=["\']([^"\']*)["\']', m.group(1))
            if not href:
                continue
            t = re.sub(r"\s+", " ", unescape(strip(m.group(2)))).strip()
            out.append({"href": href.group(1), "text": t,
                        "img": bool(re.search(r"(?is)<img", m.group(2)))})
        return out
    d["links_all"] = links(h)
    d["links_body"] = links(body)
    d["schema"] = []
    for m in re.finditer(r'(?is)<script[^>]+application/ld\+json[^>]*>(.*?)</script>', h):
        try:
            d["schema"].append(json.loads(m.group(1).strip()))
        except Exception:
            d["schema"].append({"_PARSE_ERROR": m.group(1)[:200]})
    imgs = re.findall(r"(?is)<img\b([^>]*)>", h)
    d["img_total"] = len(imgs)
    d["img_no_alt"] = sum(1 for i in imgs if not re.search(r'alt=["\'][^"\']+["\']', i))
    d["img_no_dim"] = sum(1 for i in imgs
                          if not (re.search(r"\bwidth=", i) and re.search(r"\bheight=", i)))
    d["html_bytes"] = len(h)
    return d

def job(u):
    s, f, h = fetch(u)
    time.sleep(0.15)
    return analyze(u, s, f, h)

with ThreadPoolExecutor(max_workers=5) as ex:
    res = list(ex.map(job, urls))

json.dump(res, open("pages.json", "w"))
ok = sum(1 for r in res if r.get("status") == 200)
print(f"crawled {len(res)}  ok={ok}  non200={[ (r['url'],r['status']) for r in res if r.get('status')!=200 ][:10]}")
