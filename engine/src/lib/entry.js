/**
 * What a content entry's id means.
 *
 * The collection globs one entity's directory, so an id is a slug relative to
 * that entity's root: `about`, `painter/spray-painting`, and `index` for the
 * homepage. Three separate places used to decode this by hand with
 * `id.split('/')`, all of them assuming an entity prefix that the id no longer
 * carries — and when the prefix went, each one silently stripped a real segment
 * instead. The card blurbs vanished from every pillar grid and the build stayed
 * green, because a missing blurb is a legal page.
 *
 * One module, so the next change to the id shape has one place to break.
 */
import { url } from './config.js';
import { entityId } from './paths.js';

/** The entry's own slug, with a trailing `index` removed. `index` → ``. */
export function entrySlug(id) {
  return String(id).replace(/(^|\/)index$/, '');
}

/** The entry's absolute URL on this entity: `about` → `/oakville/about/`. */
export function entryUrl(id) {
  const slug = entrySlug(id);
  return slug ? url(...slug.split('/')) : url();
}

/** The last path segment — a page's own slug, ignoring where it sits. */
export function entryLeaf(id) {
  return entrySlug(id).split('/').filter(Boolean).pop() ?? '';
}

/**
 * The name used for placeholder images, which MUST match `scripts/placeholder.py`
 * — it derives the same name from the filesystem and the two have to agree or a
 * page asks for a plate that was never generated.
 *
 * Python: `page = f.stem if f.stem != "index" else f.parent.name`. So
 * `content/oakville/index.md` is "oakville" — the entity — and a nested
 * `painter/index.md` would be "painter". Getting this wrong renamed every
 * homepage placeholder the first time the ids changed shape.
 */
export function entryPageId(id) {
  const s = String(id);
  if (s === 'index') return entityId;
  if (s.endsWith('/index')) return s.split('/').slice(-2, -1)[0];
  return s.split('/').pop();
}
