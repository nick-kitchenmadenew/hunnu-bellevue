/**
 * Every page on the site, from the content collection.
 *
 * This was the frontmatter of `src/pages/[...slug].astro`. It is a plain module
 * so a client's route file can re-export it — Astro requires `getStaticPaths` to
 * be exported from the page file itself, and a page file has to live in the
 * client's own src/pages, which is the one directory the engine cannot provide.
 *
 * It replaced four hand-written route files — index/painter/cabinet-maker/
 * countertop-contractor — that were byte-identical apart from one string. They
 * were not merely repetitive: writing a new content file produced a green build
 * with the page simply absent, because nothing connects a content file to a route
 * except somebody remembering to add one. That is the same failure as declaring a
 * silo and never building it, and the linter could not see it either — it only
 * inspects pages that were built.
 *
 * Now a content file IS a page. The collection is the list of pages, so the two
 * cannot disagree.
 */
import { getCollection } from 'astro:content';

export async function getStaticPaths() {
  const entries = await getCollection('pages');
  return entries.map((entry) => {
    // The collection globs THIS entity's directory, so the id is already the
    // slug — no prefix to strip. It used to be entity-prefixed and sliced here,
    // which silently limited the build to one entity: two content trees globbed
    // together produce two pages claiming the same slug.
    //
    // The one thing still to strip is "index". Astro drops it when the file sits
    // below the glob base — content/oakville/index.md was id "oakville" — but the
    // base IS that directory now, so the homepage arrives as the literal id
    // "index" and built itself at /index/ the first time this ran. Written as a
    // trailing-segment strip rather than an equality test so a nested
    // painter/index.md would behave too.
    const slug = entry.id.replace(/(^|\/)index$/, '') || undefined;
    return { params: { slug }, props: { entry } };
  });
}
