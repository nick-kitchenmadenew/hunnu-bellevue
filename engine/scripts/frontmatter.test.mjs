#!/usr/bin/env node
/**
 * Every content file's frontmatter must parse as YAML.
 *
 * Astro already fails the build on malformed frontmatter, so this is not about
 * catching something that would otherwise ship. It is about WHERE the failure
 * lands and what it says. Astro's message is a js-yaml stack trace pointing at a
 * line and column, thrown from inside the content loader partway through a
 * build, and it does not name the cause.
 *
 * The cause has been the same thing four times now: an unquoted scalar
 * containing ": ". YAML reads that as a key separator, so the value ends there
 * and the rest of the sentence becomes a mapping entry it cannot parse.
 *
 *     a: The fix is deliberate: it means you can take a line out.
 *                              ^ ends the value here
 *
 * It is easy to write and invisible on reading, which is why it keeps coming
 * back. This runs before the build, names the file, quotes the line, and says
 * what to do about it.
 *
 *   node scripts/frontmatter.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { contentDir } from '../src/lib/paths.js';

const CONTENT = contentDir;
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(d, e.name);
  return e.isDirectory() ? walk(p) : e.name.endsWith('.md') ? [p] : [];
});

/** A key line: optional list dash, a plain key, a colon, then the value. */
const KEY = /^(\s*(?:-\s+)?[A-Za-z_][A-Za-z0-9_]*:\s+)(.*)$/;

/**
 * Lines whose VALUE starts or contains something YAML reads as syntax.
 *
 * Two species, both from writing markdown into an unquoted scalar:
 *   ": "  ends the value there and makes the rest a mapping entry
 *   "*"   at the START of a value is an alias reference — so an answer opening
 *         with **bold** fails with "unidentified alias", which names neither
 *         markdown nor the asterisk.
 */
function suspects(fm) {
  const out = [];
  fm.split('\n').forEach((line, i) => {
    const m = KEY.exec(line);
    const value = m ? m[2] : line;
    if (value.trimStart().startsWith('#')) return;
    const n = i + 2;                                // 1-indexed, past the ---
    if (m && /^[*&]/.test(value.trim())) {
      out.push({ n, line: line.trim(), why: 'value starts with * or & — YAML reads it as an alias/anchor' });
    } else if (value.includes(': ')) {
      out.push({ n, line: line.trim(), why: '": " inside an unquoted value ends it early' });
    }
  });
  return out;
}

let failed = 0, checked = 0;
for (const file of walk(CONTENT)) {
  const src = fs.readFileSync(file, 'utf8');
  const parts = src.split('---', 3);
  if (parts.length < 3) {
    console.log(`  FAIL  ${path.relative(CONTENT, file)}\n        no frontmatter block`);
    failed++; continue;
  }
  checked++;
  try {
    yaml.load(parts[1]);
  } catch (err) {
    failed++;
    console.log(`  FAIL  ${path.relative(CONTENT, file)}`);
    console.log(`        ${String(err.message).split('\n')[0]}`);
    const hits = suspects(parts[1]);
    if (hits.length) {
      for (const h of hits.slice(0, 3)) {
        console.log(`        likely cause — ${h.why}`);
        console.log(`          line ${h.n}: ${h.line.slice(0, 76)}`);
      }
      console.log(`        fix: rephrase so the value does not open with markup, replace the`);
      console.log(`             colon with an em dash, or quote the whole value.`);
    }
  }
}

if (failed) {
  console.log(`\n  ${failed} content file(s) have unparseable frontmatter\n`);
  process.exit(1);
}
console.log(`  ✓ ${checked} content file(s) have valid frontmatter`);
