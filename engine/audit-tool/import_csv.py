#!/usr/bin/env python3
"""
Import a Core 30 content-generator CSV row into a content file.

The CSV is an INPUT, not a source of truth. After import the markdown is the
truth — you will edit it, and a re-export would otherwise overwrite those edits.

What this does mechanically:
  post_content HTML -> markdown body, word for word (verified: it contains only
  h1/h2/p, so the conversion is lossless)
  the 20 ACF fields -> frontmatter
  faq_html          -> structured faq entries
  H2 headings       -> matched against the silo's GBP services

What it CANNOT do, and reports instead:
  Core 30 wants one link per in-silo section, with unique descriptive anchor text
  sitting inside a 70-100 word passage. The generator emits zero links. Choosing
  anchor text is an editorial decision and placing it may mean rewording a
  sentence — the one place "the content does not need to change" and Core 30
  genuinely collide. Provisional anchors are written and every one is listed for
  review.

    python3 audit-tool/import_csv.py <csv> --silo "Painter" [--row 0]
"""

import argparse, csv, html, pathlib, re, sys
import yaml

csv.field_size_limit(10 ** 7)
ROOT = pathlib.Path(__file__).resolve().parent.parent


#: outbound links the generator added, reported for a human to rule on
EXTERNAL_LINKS = []


def to_markdown(source: str) -> str:
    """post_content -> markdown.

    The generator emits h1/h2/p, and as of the 2026-07-26 Cabinet maker export
    also ul/li, <a>, and [FUTURE_SERVICE_PAGE_LINK: …] placeholders. Each needs
    handling or it lands on the page as literal junk — the first import of that
    row put "[FUTURE_SERVICE_PAGE_LINK: Custom Cabinet Door Replacement in
    Oakville]" on screen as a paragraph.
    """
    s = source

    # Placeholders name the destination the generator intended, then sit alone in
    # their own <p>. A link in its own paragraph is the "read more" this whole
    # arrangement exists to avoid, so the marker is dropped and the anchor is
    # placed inside prose by place_anchor() instead.
    s = re.sub(r'<p[^>]*>\s*\[FUTURE_SERVICE_PAGE_LINK:[^\]]*\]\s*</p>', '', s)
    s = re.sub(r'\[FUTURE_SERVICE_PAGE_LINK:[^\]]*\]', '', s)

    # Outbound links: keep the words, drop the link. An uncontrolled external link
    # on a money page is a decision, not a default — reported, never silently kept.
    for href in re.findall(r'<a[^>]+href="([^"]+)"', s):
        if not href.startswith('/'):
            EXTERNAL_LINKS.append(href)
    s = re.sub(r'</?a\b[^>]*>', '', s)

    s = re.sub(r'<h1[^>]*>', '\n# ', s)
    s = re.sub(r'<h2[^>]*>', '\n## ', s)

    # Bold survives the tag strip below. The generator uses <strong> to label the
    # steps of a process ("Day one: protection and prep."), which is the only
    # thing distinguishing one step from the next once it is a list item.
    s = re.sub(r'</?strong[^>]*>', '**', s)

    # An <ol> is an ORDER, not a set. Numbering it "- " like a <ul> loses the one
    # thing it was written to say — that day one comes before day two. Number the
    # items inside each <ol> before the generic <li> rule sees them.
    def number(m):
        n = [0]
        def item(_):
            n[0] += 1
            return f'\n{n[0]}. '
        return re.sub(r'<li[^>]*>', item, m.group(0))
    s = re.sub(r'<ol[^>]*>.*?</ol>', number, s, flags=re.S)

    s = re.sub(r'<li[^>]*>', '\n- ', s)
    s = re.sub(r'</li>', '', s)
    s = re.sub(r'</?[uo]l[^>]*>', '\n', s)
    s = re.sub(r'<p[^>]*>', '\n', s)
    s = re.sub(r'</(h1|h2|p)>', '\n', s)
    s = re.sub(r'<[^>]+>', '', s)
    s = html.unescape(s)
    return re.sub(r'\n{3,}', '\n\n', s).strip()



def words(s: str) -> int:
    return len(html.unescape(re.sub(r'<[^>]+>', ' ', s)).split())


def parse_faq(faq_html: str):
    out = []
    for block in re.findall(r'<div class="faq-item">(.*?)</div>', faq_html or '', re.S):
        q = re.findall(r'<h3[^>]*>(.*?)</h3>', block, re.S)
        a = re.findall(r'<p[^>]*>(.*?)</p>', block, re.S)
        if q and a:
            clean = lambda x: html.unescape(re.sub(r'<[^>]+>', '', x)).strip()
            out.append({'q': clean(q[0]), 'a': clean(a[0])})
    return out


def place_anchor(paragraphs):
    """Mark the paragraph that will carry the link.

    Core 30 wants the link inside a 70-100 word passage, so pick a paragraph
    already in that range — earliest first, since a link near the top of a section
    is read more than one buried at the bottom. If none qualifies, fall back to
    whichever is closest to 85 words and let the linter say so.
    """
    # A list is not prose: it cannot host a link, and a run of paragraphs may not
    # be joined ACROSS one. Giving lists a size of zero let the merge walk straight
    # through a bulleted block and swallow it whole, which is how one anchor
    # paragraph came out at 125 words.
    is_list = [bool(re.match(r'(- |\d+\. )', p)) for p in paragraphs]
    sizes = [0 if is_list[i] else len(p.split()) for i, p in enumerate(paragraphs)]

    # Best case: a paragraph is already the right length. Earliest wins — a link
    # near the top of a section is read more than one buried at the bottom.
    idx = next((i for i, n in enumerate(sizes) if not is_list[i] and 70 <= n <= 100), None)
    if idx is not None:
        out = list(paragraphs)
        out[idx] = out[idx] + ' [[anchor]]'
        return out

    # Otherwise join adjacent paragraphs until the run reaches 70. This changes a
    # paragraph break, not a word — the generator writes short paragraphs and Core
    # 30 measures a passage, so the two only disagree about where breaks go.
    for start in range(len(paragraphs)):
        if is_list[start]:
            continue
        total = 0
        for end in range(start, len(paragraphs)):
            if is_list[end]:
                break                      # a list ends the run
            total += sizes[end]
            if total > 100:
                break
            if total >= 70:
                merged = ' '.join(paragraphs[start:end + 1]) + ' [[anchor]]'
                return paragraphs[:start] + [merged] + paragraphs[end + 1:]

    # No run lands inside 70-100. Take the run closest to the middle of the window
    # even if it overshoots: a 101-word context is a warning, a 39-word one is a
    # link with no context at all. Rejecting 101 to keep 39 would be the rule
    # defeating its own purpose.
    best = None
    for start in range(len(paragraphs)):
        if is_list[start]:
            continue
        total = 0
        for end in range(start, len(paragraphs)):
            if is_list[end]:
                break
            total += sizes[end]
            score = abs(total - 85)
            if best is None or score < best[0]:
                best = (score, start, end, total)
    _, start, end, total = best
    if end > start:
        merged = ' '.join(paragraphs[start:end + 1]) + ' [[anchor]]'
        return paragraphs[:start] + [merged] + paragraphs[end + 1:]
    out = list(paragraphs)
    out[start] = out[start] + ' [[anchor]]'
    return out


def match_service(heading: str, services):
    """A generator heading elaborates on the service name — "Spray Painting for a
    Factory-Smooth Finish" for "Spray painting". Match on prefix, longest first so
    "Wood painting" cannot swallow "Wood staining"."""
    norm = lambda s: re.sub(r'[^a-z0-9 ]', '', s.lower()).strip()
    h = norm(heading)
    for svc in sorted(services, key=lambda s: -len(s['name'])):
        if h.startswith(norm(svc['name'])):
            return svc
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('csv')
    ap.add_argument('--silo', required=True, help='GBP category, exactly as in config')
    ap.add_argument('--config', default='config-oakville.yaml')
    ap.add_argument('--row', type=int, default=0)
    ap.add_argument('--out', default=None)
    a = ap.parse_args()

    cfg = yaml.safe_load((ROOT / a.config).read_text())
    entity_id = cfg['entity']['id']
    city = cfg['entity']['address']['locality']
    silo = next((s for s in cfg['silos'] if s['category'] == a.silo), None)
    if not silo:
        sys.exit(f"silo {a.silo!r} is not in {a.config}. "
                 f"Have: {', '.join(s['category'] for s in cfg['silos'])}")

    row = list(csv.DictReader(open(a.csv)))[a.row]
    get = lambda k: (row.get(k) or row.get('﻿' + k) or '').strip()

    # A row whose post_name matches one of the silo's services is a SERVICE page,
    # not the pillar. It is detectable rather than a flag to remember, and getting
    # it wrong produces a page that links the wrong way down the silo.
    own = next((x for x in (silo.get('services') or []) if x['slug'] == get('post_name')), None)
    page_type = 'service' if own else 'pillar'
    # What the FAQ is about: this service, or the category the pillar covers.
    faq_topic = own['name'] if own else (silo.get('retheme') or silo['category'])

    body = get('post_content')
    h1 = re.sub(r'<[^>]+>', '', (re.findall(r'<h1[^>]*>(.*?)</h1>', body, re.S) or [''])[0]).strip()

    # Split the body into H2 sections and resolve each against the silo.
    sections, notes = [], []
    for chunk in re.split(r'(?=<h2)', body):
        heads = re.findall(r'<h2[^>]*>(.*?)</h2>', chunk, re.S)
        if not heads:
            continue
        heading = html.unescape(re.sub(r'<[^>]+>', '', heads[0])).strip()
        prose = to_markdown(re.sub(r'<h2[^>]*>.*?</h2>', '', chunk, flags=re.S))
        svc = match_service(heading, silo.get('services') or [])
        # Consecutive list lines are ONE list, not several paragraphs. Both kinds
        # count: only "- " did, so a four-step numbered process arrived as four
        # separate blocks and rendered as four ordered lists of one item each,
        # every one of them numbered "1.".
        #
        # A bulleted run and a numbered run that touch stay separate — they are
        # two lists, and merging them would renumber one into the other.
        def kind(line):
            if line.startswith('- '):
                return 'ul'
            return 'ol' if re.match(r'\d+\. ', line) else None

        paras, buf, buf_kind = [], [], None
        for line in (x.strip() for x in re.split(r'\n+', prose)):
            if not line:
                continue
            k = kind(line)
            if k and k == buf_kind:
                buf.append(line)
                continue
            if buf:
                paras.append('\n'.join(buf)); buf = []
            if k:
                buf, buf_kind = [line], k
            else:
                buf_kind = None
                paras.append(line)
        if buf:
            paras.append('\n'.join(buf))
        sections.append({'heading': heading, 'paragraphs': paras, 'service': svc,
                         'words': len(prose.split())})

    linked = [s for s in sections if s['service']]

    # The markdown body carries ONLY the sections that did NOT resolve to an
    # in-silo service. A section that resolved becomes a linked block in
    # frontmatter, and writing it to both renders it twice — which is exactly what
    # happened to "Kitchen Cabinet Painting" on the first Painter build.
    free = [s for s in sections if not s['service']]
    md = '\n\n'.join('## ' + s['heading'] + '\n\n' + '\n\n'.join(s['paragraphs'])
                      for s in free)

    # hero_subheadline has arrived truncated mid-word on BOTH exports so far —
    # the identical string, "…operating since 2012 wi". It is the second thing a
    # visitor reads and it was also being copied into the CTA. A lede that does
    # not end in terminal punctuation is not a lede; better an empty field the
    # schema rejects than a broken sentence nobody notices.
    sub = get('hero_subheadline')
    lede_broken = bool(sub) and sub[-1] not in '.!?"\''
    lede = '' if lede_broken else sub

    base_of_parent = ('/' + entity_id + '/') if silo.get('is_homepage') \
        else f"/{entity_id}/{silo['slug']}/"

    brand = cfg['entity']['name']
    csv_title = get('meta_title')
    if silo.get('retheme'):
        title = f"{silo['retheme'].title()} {city} | {brand}"
        retitled = csv_title
    else:
        title = csv_title or f"{silo['category']} in {city} | {brand}"
        retitled = None

    # ── frontmatter ──────────────────────────────────────────────────────
    fm = {
        'type': page_type,
        'silo': silo['category'],
        # PLANNING §10c: on a re-themed page the title carries the RE-THEME and
        # must not carry the GBP category — the category's job is the URL and H1.
        # The generator's meta_title uses the category ("Painter in Oakville"),
        # which is exactly backwards, so it is regenerated rather than trusted.
        'title': title,
        'description': get('meta_description'),
        # The H1 carries the GBP category verbatim; the re-theme stays in the title.
        'h1': h1 or f"{silo['category']} in {city}",
        # On a re-themed page the H1 is reserved for the GBP category, so the
        # target keyword goes in the eyebrow above it — where Hero renders it at
        # display size and steps the H1 back. CORE30-STRUCTURE §2.
        **({'eyebrow': silo['retheme']} if silo.get('retheme') else {}),
        'lede': lede,
        # ONE `prose` per free body section. They are consumed positionally, one
        # slot one section, so a single `prose` against five H2s renders the first
        # and discards the rest — which is how a 1,739-word import first rendered
        # as 1,063 words with no error but a word-floor miss.
        'sections': ['prose'] * len(free)
                    + (['uplink'] if page_type == 'service' else ['services'])
                    + ['faq', 'cta'],
        'headings': {
            'services': {'eyebrow': 'What we do',
                         'title': f"{silo.get('retheme') or silo['category']} services in {city}"},
            # A service page's FAQ is about the SERVICE. Naming the category here
            # put "Common questions about kitchen remodeler in Oakville" on a
            # cabinet refacing page — the category after the H1, which is the one
            # thing re-theming forbids, and wrong about the topic besides.
            'faq': {'eyebrow': 'Questions',
                    'title': f"Common questions about {faq_topic.lower()} in {city}"},
        },
        **({'services': [{
            'to': s['service']['slug'],
            'heading': s['heading'],
            'anchor': f"TODO {s['service']['name'].lower()} in {city}",
            'paragraphs': place_anchor(s['paragraphs']),
        } for s in linked]} if page_type == 'pillar' else {}),
        # A service page has exactly one in-silo link and it points UP to the
        # parent pillar. There is nowhere else it may point: siblings are lateral
        # and other silos are out of bounds. The block is left for a human to
        # write, because it has to argue for the parent, not for this page.
        **({'uplink': {
            'to': '..',
            'heading': f"Part of our {(silo.get('retheme') or silo['category']).lower()} work",
            'anchor': f"TODO link up to {(silo.get('retheme') or silo['category']).lower()}",
            'paragraphs': ['TODO — 70-100 words about the parent pillar, with [[anchor]] '
                           'inside a sentence.'],
        }} if page_type == 'service' else {}),
        'faq': parse_faq(get('faq_html')),
        'cta': {'heading': f"Ready to talk about your {city} kitchen?",
                'body': lede[:200]},
    }

    out = pathlib.Path(a.out) if a.out else ROOT / 'content' / entity_id / f"{get('post_name')}.md"
    out.parent.mkdir(parents=True, exist_ok=True)
    front = yaml.safe_dump(fm, sort_keys=False, allow_unicode=True, width=100)
    out.write_text(f"---\n{front}---\n\n{md}\n")

    # ── report ───────────────────────────────────────────────────────────
    total = words(body)
    try:
        shown = out.relative_to(ROOT)
    except ValueError:
        shown = out                      # --out may point outside the repo
    print(f"\n  wrote {shown}   [{page_type}]")
    print(f"  {total} words from post_content, {len(sections)} H2 sections\n")

    print("  section                                          words  in silo")
    for s in sections:
        mark = s['service']['slug'] if s['service'] else '— not a GBP service'
        print(f"    {s['heading'][:46]:46} {s['words']:5}  {mark}")

    if not free:
        print(f"    · every H2 resolved in-silo, so the markdown body is empty and the "
              f"page has no free-prose section")
    print("\n  NEEDS A DECISION")
    if page_type == 'service':
        print(f"    · service page: its one in-silo link goes UP to {base_of_parent}. "
              f"The uplink block is a TODO — it has to argue for the parent, not this page.")
    if lede_broken:
        print(f"    · hero_subheadline is truncated mid-sentence and was DROPPED, so the lede "
              f"and CTA body are empty and the build will refuse them. Write both.")
        print(f"        CSV had: …{sub[-46:]}")
    if total < 1500:
        print(f"    · {total} words is under the 1,500 floor for a pillar — "
              f"{1500 - total} short")
    if retitled:
        print(f"    · title regenerated for the re-theme \"{silo['retheme']}\"")
        print(f"        CSV had : {retitled}")
        print(f"        now     : {title}")
    desc = get('meta_description')
    if silo.get('retheme') and silo['category'].lower() in desc.lower():
        print(f"    · meta description still says \"{silo['category']}\" — a re-themed page "
              f"should describe \"{silo['retheme']}\"")
    if not get('target_city'):
        print(f"    · target_city was empty in the CSV; filled from config ({city})")
    if EXTERNAL_LINKS:
        print(f"    · {len(EXTERNAL_LINKS)} outbound link(s) removed, text kept — decide whether "
              f"a money page should carry them:")
        for h in dict.fromkeys(EXTERNAL_LINKS):
            print(f"        {h[:88]}")
    for s in linked:
        print(f"    · anchor text for \"{s['heading'][:44]}\" — provisional, and "
              f"[[anchor]] is parked at the end of the block")
    # Pillar-only. A pillar owes every child a section; a SERVICE page owes its
    # siblings nothing — writing about them is the lateral link Core 30 forbids,
    # arrived at through prose. Running this check on a service page asked it to
    # cover the four pages it is specifically not allowed to discuss.
    if page_type == 'pillar':
        missing = [x['name'] for x in (silo.get('services') or [])
                   if x['slug'] not in {s['service']['slug'] for s in linked}]
        if missing:
            print(f"    \u00b7 no H2 for in-silo service(s): {', '.join(missing)}")
    print()


if __name__ == '__main__':
    main()
