#!/usr/bin/env node
/**
 * Every pre-build check the engine has, in the order that fails most usefully.
 *
 * One entry point rather than a list in each site's package.json. That list was
 * the client's, which meant adding a check here reached exactly the sites whose
 * package.json somebody remembered to edit — a new guard that silently does not
 * run is worse than no guard, because the build still goes green.
 *
 *   node ../engine/scripts/test.mjs
 *
 * Order matters. Frontmatter first: a YAML error there makes everything after it
 * meaningless, and Astro's own message for it is a stack trace from inside the
 * content loader. Drift next, because a config that has wandered from the profile
 * makes the whole site wrong in a way no other check looks for. Then the rules —
 * hours, silos, composition — which are about the shape of what gets built.
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

const suite = [
  'frontmatter.test.mjs',   // does every content file's YAML parse
  'gbp-drift.mjs',          // does the config still match the profile
  'hours.test.mjs',         // does the week normalise the same for schema and footer
  'silo.test.mjs',          // do the link rules hold, and does each file claim its own silo
  'sections.test.mjs',      // does page composition hold
  'cross-entity.mjs',       // does any subtree target another subtree's query
];

for (const script of suite) {
  try {
    execFileSync(process.execPath, [path.join(HERE, script)], { stdio: 'inherit' });
  } catch (e) {
    // The failing script has already said what is wrong and how. Repeating a
    // stack trace over the top of it would bury the only useful line.
    process.exit(e.status ?? 1);
  }
}
