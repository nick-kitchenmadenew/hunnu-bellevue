/**
 * Turning content-file text into renderable sections.
 *
 * Two jobs, both of which used to be done by hand in the page file:
 *
 *  1. Split the markdown body into H2 sections. This is exactly the shape the
 *     content generator emits — h1/h2/p and nothing else — so a CSV row and a
 *     hand-written page parse identically.
 *
 *  2. Inject links into prose. The content never contains an <a>. A linked block
 *     names its anchor and marks the spot with [[anchor]]; we substitute. That is
 *     what makes "the link sits inside its 70-100 word context" structurally true
 *     rather than something a reviewer has to check.
 */

/** A markdown list marker: "- " or "1. ". Must agree with ProseBlocks, which
    decides <ul> vs <ol> from the same two shapes. */
const isItem = (s) => /^(-|\d+\.)\s/.test(s);
const isListBlock = (p) => Boolean(p) && isItem(p.split('\n')[0]);

const escapeHtml = (s) => s
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Inline emphasis: `**bold**` and `*italic*`.
 *
 * Two delimiters and no others. Not a markdown parser — the point is that the
 * whole vocabulary fits in one sentence, so nobody has to learn what this does or
 * wonder whether some other markdown construct will be honoured. `_` is
 * deliberately not a delimiter: one family of markers cannot mis-pair with
 * itself the way `*foo_` can.
 *
 * Returns TOKENS rather than HTML, because most callers render through JSX where
 * Astro's escaping should stay switched on. Only the one caller that must emit
 * HTML — injectAnchor, which is splicing an <a> in — goes through inlineHtml.
 *
 * `**` is tried before `*` in the alternation, so bold wins and a bold run is
 * never read as two italics wrapping nothing.
 */
const INLINE = /\*\*(.+?)\*\*|\*(.+?)\*/g;

export function inlineTokens(text) {
  const s = String(text ?? '');
  const out = [];
  let last = 0, m;
  INLINE.lastIndex = 0;
  while ((m = INLINE.exec(s))) {
    if (m.index > last) out.push({ tag: null, text: s.slice(last, m.index) });
    out.push(m[1] !== undefined
      ? { tag: 'strong', text: m[1] }
      : { tag: 'em', text: m[2] });
    last = INLINE.lastIndex;
  }
  if (last < s.length) out.push({ tag: null, text: s.slice(last) });
  return out;
}

/**
 * The same text with the markers removed and nothing marked up.
 *
 * For anywhere the string leaves the page as data rather than as prose: JSON-LD,
 * meta descriptions, og tags, alt text. Schema carrying `**five days**` publishes
 * literal asterisks into a Google rich result, which is exactly what happened the
 * first time emphasis went into the FAQ answers — the page rendered correctly and
 * the FAQPage node did not, because nothing renders a schema string.
 */
export function stripInline(text) {
  return inlineTokens(text).map((t) => t.text).join('');
}

/** The same, as escaped HTML. For callers already emitting HTML — no others. */
export function inlineHtml(text) {
  return inlineTokens(text)
    .map(({ tag, text: t }) => (tag ? `<${tag}>${escapeHtml(t)}</${tag}>` : escapeHtml(t)))
    .join('');
}

/**
 * Resolve the two config placeholders. Kept deliberately tiny — this is not a
 * template language. Anything needing more than a noun substitution belongs in
 * frontmatter as data.
 */
export function resolve(text, vars) {
  return String(text ?? '').replace(/\{\{(\w+)\}\}/g, (m, key) =>
    key in vars ? vars[key] : m);
}

/**
 * Split a markdown body into H2 sections.
 * An `<!-- eyebrow: … -->` comment on the line after a heading sets its eyebrow.
 *
 * @returns {Array<{heading: string, eyebrow: string|null, paragraphs: string[]}>}
 */
export function parseProse(body, vars = {}) {
  const out = [];
  let current = null;

  for (const rawLine of String(body ?? '').split('\n')) {
    const line = rawLine.trim();

    const h2 = line.match(/^##\s+(.*)$/);
    if (h2) {
      current = { heading: resolve(h2[1], vars), eyebrow: null, paragraphs: [] };
      out.push(current);
      continue;
    }
    if (!current) continue;                       // preamble before the first H2

    const eyebrow = line.match(/^<!--\s*eyebrow:\s*(.*?)\s*-->$/);
    if (eyebrow) { current.eyebrow = eyebrow[1]; continue; }

    // `<!-- level: 3 -->` renders this section's heading as an h3 rather than
    // an h2. The `##` still delimits the section — the slot machinery counts
    // prose blocks by it — so the marker changes only what SectionHead emits.
    const level = line.match(/^<!--\s*level:\s*([23])\s*-->$/);
    if (level) { current.level = +level[1]; continue; }

    // `<!-- image: a description of the photograph -->` gives the section a
    // picture in its heading rail. The payload is alt text, not a filename: the
    // file is named from the page and the section's position, the same way
    // service and gallery plates are, so there is nothing to keep in sync. Alt
    // text is the one thing that cannot be derived — which also means a section
    // cannot ask for an image without describing it.
    const image = line.match(/^<!--\s*image:\s*(.*?)\s*-->$/);
    if (image && image[1]) { current.image = image[1]; continue; }

    // `<!-- jump: Short label -->` names this section in the mobile jump bar.
    // Separate from the heading because the two have different jobs: the heading
    // is a sentence you read on arrival ("How Cabinet Refacing Works and What It
    // Replaces"), the jump label is a word you scan in a row of them ("How it
    // works"). Falling back to the heading gives a bar of six long chips, which
    // is more words on a page the bar exists to make feel like fewer.
    const jump = line.match(/^<!--\s*jump:\s*(.*?)\s*-->$/);
    if (jump && jump[1]) { current.jump = jump[1]; continue; }

    if (!line || line.startsWith('<!--')) {       // blank or comment ends a para
      if (current.paragraphs.at(-1)) current.paragraphs.push('');
      continue;
    }
    if (!current.paragraphs.length) current.paragraphs.push('');
    const paras = current.paragraphs;
    const last = paras.at(-1);

    // Lines are joined into a paragraph with a space, which is right for prose and
    // wrong for a list: a wrapped "- item" block collapsed into one long line, so
    // only the FIRST marker was consumed and every later "- " stayed in the text as
    // a literal dash. One bullet, three fake ones, and a numbered process rendered
    // as a single step "1." containing all four.
    //
    // So a list keeps its line breaks, and a line that is NOT a marker continues
    // the item above it — which is how the source is wrapped in the first place.
    if (isItem(line)) {
      if (!last) paras[paras.length - 1] = line;
      else if (isListBlock(last)) paras[paras.length - 1] = last + '\n' + line;
      else paras.push(line);                      // a list opening under a paragraph
    } else if (isListBlock(last)) {
      paras[paras.length - 1] = last + ' ' + line;    // wrapped continuation
    } else {
      paras[paras.length - 1] = (last + ' ' + line).trim();
    }
  }

  // `index` is the section's position in the body, and it names that section's
  // image plate — ph-<page>-section-<index+1>. It has to be assigned here rather
  // than counted at the call site, because the slots consume these through a
  // cursor and a section that renders nothing would still advance it.
  return out.map((s, index) => ({
    ...s,
    index,
    paragraphs: s.paragraphs.filter(Boolean).map((p) => resolve(p, vars)),
  }));
}

/**
 * Replace [[anchor]] with a real link. Returns HTML.
 *
 * Throws if the marker is absent — a linked section without a marker would
 * render prose with no link in it, pass the eye, and quietly do no silo work.
 * Better to stop the build.
 */
export function injectAnchor(prose, { href, anchor }, vars = {}) {
  const text = resolve(prose, vars);
  if (!text.includes('[[anchor]]')) {
    throw new Error(`prose for "${anchor}" has no [[anchor]] marker`);
  }
  const link = `<a href="${escapeHtml(href)}">${escapeHtml(anchor)}</a>`;
  // inlineHtml escapes as it goes, so this is still escape-then-splice — the
  // marker survives because it has no characters escaping would touch.
  return inlineHtml(text).replace('[[anchor]]', link);
}

/** Words in a prose block, counting the anchor text but not the markup. */
export function wordCount(prose, anchor) {
  return resolve(prose, {})
    .replace('[[anchor]]', anchor || '')
    .split(/\s+/).filter(Boolean).length;
}
