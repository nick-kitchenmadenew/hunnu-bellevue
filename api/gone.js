/**
 * 410 Gone — for a URL from a PRIOR site that this one deliberately does not
 * replace. Only relevant when this repo is replacing an existing website;
 * skip this file entirely for a business with no prior web presence.
 *
 * The distinction between 404 and 410 is not pedantry. A 404 tells Google the
 * page may come back and it keeps recrawling; a 410 says it is gone on purpose
 * and gets dropped from the index far faster. `redirects.yaml`'s `410`
 * disposition and `emit-redirects.mjs` are what wire a specific retired URL to
 * this handler — see docs/CORE30-STRUCTURE.md.
 *
 * Vercel's `redirects` in vercel.json cannot itself carry a 410 (only 301, 302,
 * 307, 308), which is why a retired path is rewritten to this function instead
 * — see the `rewrites` entry in vercel.json — keeping the URL the visitor sees
 * rather than sending them somewhere else for a page that no longer exists.
 *
 * EVERY PLACEHOLDER BELOW NEEDS FILLING IN. Left as generic text on purpose —
 * see docs/CONFIG-SCHEMA.md's own reasoning for leaving a TODO blank rather
 * than writing a plausible-looking value into it: a blank gets noticed and
 * filled in, a plausible fake does not.
 */
export default function handler(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.status(410).send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="robots" content="noindex">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Page removed — REPLACE-ME: business name</title>
<style>
  body{font:16px/1.6 system-ui,sans-serif;max-width:34rem;margin:14vh auto;padding:0 1.5rem;color:#1a1a1a}
  a{color:#1b3a6b} h1{font-size:1.5rem;margin:0 0 .75rem}
  ul{padding-left:1.1rem} li{margin:.3rem 0}
</style></head><body>
<h1>This page has been removed</h1>
<p>It was part of an older version of this site and has no direct replacement.</p>
<ul>
  <li><a href="/">REPLACE-ME: link to the homepage, and one to each entity subtree this site has, and to /contact/</a></li>
</ul>
</body></html>`);
}
