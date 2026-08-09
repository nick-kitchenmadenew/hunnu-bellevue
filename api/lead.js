/**
 * Lead capture, deployed as this site's serverless function.
 *
 * The handler is the engine's — a GoHighLevel post is the same job whichever
 * business it is for, and the token and location id come from the Vercel
 * environment rather than from code. Duplicating it per site is how two versions
 * of an attribution bug end up being fixed once — which happened for real on
 * 2026-08-06: a hardcoded CRM tag from an earlier, non-generic version of this
 * file was silently mistagging leads from every entity but one. See core30's
 * DISCREPANCIES-equivalent note in the client repo this generated, or the
 * engine's own git history for `api/lead.js`, if this ever needs re-litigating.
 *
 * Vercel discovers functions at api/ in the deployed repository's root, so this
 * file has to exist here. A relative import rather than the `core30` package
 * specifier: the function bundler traces imports from the repository, and the
 * package is only linked inside the workspace's node_modules.
 *
 * Set GHL_LEAD_TOKEN and GHL_LOCATION_ID in the Vercel project. Neither belongs
 * in this repo and the handler never logs or echoes them.
 */
export { default } from '../engine/api/lead.js';
