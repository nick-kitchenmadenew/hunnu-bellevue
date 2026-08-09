/**
 * The frontmatter schema, which belongs to the engine.
 *
 * Astro requires this file to exist inside the project, so it is here and it is
 * three lines. Editing it is almost always wrong: a field that a second business
 * would also need belongs in core30/src/content-config.ts, and a field only this
 * business needs probably belongs in the config rather than in every page.
 */
export { collections } from 'core30/content-config';
