/**
 * The directory holding this build's payload — config, content, reviews,
 * OPERATIONS. Split out from `paths.js` so a script that only needs this can
 * import it without also paying for `paths.js`'s eager, entity-specific
 * config-existence check purely by importing the module.
 *
 * That check is genuinely useful for anything that wants one specific
 * entity's config — see `paths.js`, which re-exports this and adds it. It is
 * actively harmful for an orchestrator that runs BEFORE any entity is
 * chosen and discovers every `config-<id>.yaml` in the payload itself
 * (`build-all.mjs`, `sitemap.mjs`, `review-link-check.mjs`,
 * `cross-entity.mjs`) — importing `paths.js` for `payloadRoot` alone used to
 * also default `entityId` to "oakville" and crash on import for any payload
 * without a `config-oakville.yaml`, before the orchestrator's own generic
 * discovery even ran. Found live: `hunnu-bellevue`'s first Vercel build.
 *
 *   CORE30_PAYLOAD   the directory holding config, content, reviews, OPERATIONS
 *                    (default: the parent of the cwd, which is what running
 *                    from site/ has always meant)
 */
import path from 'node:path';

export const payloadRoot = path.resolve(process.env.CORE30_PAYLOAD || '..');
