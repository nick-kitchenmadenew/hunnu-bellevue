/**
 * This business's photographs, as a registry the engine's layouts can ask.
 *
 * One of three files the engine cannot supply. `import.meta.glob` is resolved by
 * Vite relative to the file that calls it, so a registry living inside core30
 * would glob core30's own assets directory and find no photographs at all. The
 * engine imports `core30:images`, an alias astro.config points here.
 *
 * It belongs on this side anyway: which photographs exist, and what each one
 * shows, is a fact about the business rather than about the build.
 *
 * Files live in src/assets so Astro can generate responsive variants at build;
 * public/ files are served untouched, which is how kmn-oakville ended up
 * shipping 1024px originals into 340px slots before that was caught.
 */
const files = import.meta.glob('../assets/*.{webp,png,jpg,jpeg}', { eager: true });

const registry = Object.fromEntries(
  Object.entries(files).map(([path, mod]) => [path.split('/').pop(), mod.default])
);

export function img(name) {
  const found = registry[name];
  if (!found) throw new Error(`image not registered: ${name} — add it to src/assets/`);
  return found;
}

/**
 * The first of `names` that exists, or undefined. For slots that have a
 * placeholder to fall back on: a real photograph wins if one has been dropped in,
 * and nothing has to be edited to switch over — which is the same deal the hero
 * and the gallery already offer. `img` still throws, because everywhere else a
 * missing file is a mistake rather than a slot waiting to be filled.
 */
export function firstImg(...names) {
  for (const n of names) if (registry[n]) return registry[n];
  return undefined;
}
