#!/usr/bin/env node
/**
 * Every check that needs the built site, in one place.
 *
 *   node ../engine/scripts/post-build.mjs [dist]
 *
 * The sibling of test.mjs, and it exists for the same reason: a site's
 * package.json listing the individual checks means a guard added here reaches
 * only the sites somebody remembered to edit, and a guard that silently does not
 * run is worse than no guard at all.
 *
 * The split between the two is what the check needs, not what it is about.
 * test.mjs runs on source — frontmatter, config, the rules. This runs on `dist`,
 * because you cannot ask whether a link resolves or a redirect target exists
 * until the pages are on disk.
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const dist = process.argv[2] ? [process.argv[2]] : [];

for (const script of ['lint.mjs', 'redirects.test.mjs']) {
  try {
    execFileSync(process.execPath, [path.join(HERE, script), ...dist], { stdio: 'inherit' });
  } catch (e) {
    process.exit(e.status ?? 1);
  }
}
