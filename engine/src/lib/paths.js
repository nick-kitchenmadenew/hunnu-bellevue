/**
 * Where this build's payload lives.
 *
 * The build and the business used to be one thing: `config.js` and `silo.mjs`
 * each resolved `../config-oakville.yaml` by name, so the word "oakville" was
 * compiled into the engine in two places that had no idea about each other.
 * That is fine for one site and impossible for the second one.
 *
 * Everything a build needs from outside itself is named here, once. The engine
 * asks this module; nothing else knows a filename.
 *
 *   CORE30_PAYLOAD   the directory holding config, content, reviews, OPERATIONS
 *                    (default: the parent of the cwd, which is what running from
 *                    site/ has always meant)
 *   CORE30_ENTITY    which entity inside it (default: oakville)
 *   CORE30_CONFIG    an explicit config path, overriding both of the above
 *
 * Resolution is cwd-relative rather than relative to this file, deliberately.
 * Once the engine is a package inside node_modules, its own location says
 * nothing about where the client's payload is — but the directory the build was
 * started from does.
 *
 * Both naming conventions are accepted: `config-oakville.yaml` as it is today,
 * and a bare `config.yaml` for a repo that holds exactly one entity. The
 * entity-suffixed name wins when both exist, so nothing changes underneath a
 * build that has not been renamed yet.
 */
import fs from 'node:fs';
import path from 'node:path';

export const entityId = process.env.CORE30_ENTITY || 'oakville';
export const payloadRoot = path.resolve(process.env.CORE30_PAYLOAD || '..');

/** The entity-suffixed file if it exists, else the bare one. */
function pick(stem, ext = 'yaml') {
  const suffixed = path.join(payloadRoot, `${stem}-${entityId}.${ext}`);
  return fs.existsSync(suffixed) ? suffixed : path.join(payloadRoot, `${stem}.${ext}`);
}

export const configPath = process.env.CORE30_CONFIG
  ? path.resolve(process.env.CORE30_CONFIG)
  : pick('config');

// Say what is missing and where it was looked for. Without this the first
// symptom of a mis-set CORE30_PAYLOAD is `ENOENT: config.yaml` from inside a
// Vite module graph, which names neither the entity nor the directory — and
// setting up a new client repo is exactly when that mistake gets made.
if (!fs.existsSync(configPath)) {
  throw new Error(
    `no config for entity "${entityId}"\n`
    + `  looked in: ${payloadRoot}\n`
    + `  for:       config-${entityId}.yaml, then config.yaml\n`
    + `  set CORE30_PAYLOAD to the directory holding the config, `
    + `CORE30_ENTITY to pick between several, or CORE30_CONFIG to name one outright.`);
}
export const reviewsPath = pick('reviews');

/** The operations document, which is what the claim guards and the specificity
    vocabulary are both derived from. Not read by the build itself. */
export const operationsPath = path.join(payloadRoot, 'OPERATIONS.md');

/** Business truth the linter enforces, extracted from the engine so a plumber's
    claims can differ from a cabinet refacer's. Absent is legitimate: a business
    that has not been interviewed yet has no claims to guard. */
export const claimsPath = pick('claims');
export const vocabularyPath = pick('vocabulary');

/** The GBP capture the drift check diffs config against. */
export const gbpCapturePath = (id = entityId) =>
  path.join(payloadRoot, 'audit-tool', 'out', `gbp-${id}.json`);

/** Content and images. The registry itself stays on the client side — see
    `images.js` and the `core30:images` alias — but the content collection's base
    is resolved here so the collection config does not hardcode it either. */
export const contentDir = path.join(payloadRoot, 'content');

/**
 * Just THIS entity's content.
 *
 * The tree is entity-prefixed — content/oakville/, content/northyork/ — and the
 * collection used to glob all of it and strip the first path segment in the
 * route. That works for exactly one entity: add a second and both sets of pages
 * come back from the same collection, land on the same base, and collide at
 * every shared slug. content/oakville/about.md and content/northyork/about.md
 * are both "about".
 *
 * Globbing one directory makes `entry.id` the slug outright, so the route stops
 * slicing and the collision cannot be expressed.
 */
export const entityContentDir = path.join(contentDir, entityId);
