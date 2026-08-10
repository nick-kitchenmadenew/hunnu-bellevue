/**
 * Shared DataForSEO plumbing: whose account, and are we allowed to spend it.
 *
 * Three scripts bill this API — paa-harvest.mjs, serp-headings.mjs and
 * keyword-data.mjs. Each used to read DATAFORSEO_LOGIN/PASSWORD straight from
 * the environment, which works and tells you nothing: with several client repos
 * open, "whose account did that $4 land on" was answerable only by comparing
 * secrets between .env.local files.
 *
 * So the committed config records the ACCOUNT (`research.dataforseo: shared |
 * client`) and .env.local keeps the CREDENTIALS. This module is where the two
 * meet. The config field is not a security boundary — it is an audit trail, and
 * the mismatch check below exists because a stale field is worse than no field:
 * it says "shared" while quietly billing a client.
 */

/** Which account this entity's config says to use. Defaults to `shared` — the
    field is new, and every site that predates it is on the shared account. */
export function account(config) {
  const v = config.research?.dataforseo ?? 'shared';
  if (v !== 'shared' && v !== 'client') {
    throw new Error(`research.dataforseo is "${v}" — expected "shared" or "client"`);
  }
  return v;
}

/**
 * Credentials, checked against what the config claims.
 *
 * `DATAFORSEO_ACCOUNT` in .env.local is optional and exists only so this check
 * has something to compare against. Absent, we trust the config and say so
 * rather than pretending to have verified it — a check that silently passes
 * when it cannot run is worse than no check.
 */
export function credentials(config) {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  const declared = account(config);
  const actual = process.env.DATAFORSEO_ACCOUNT;

  if (actual && actual !== declared) {
    throw new Error(
      `\n  research.dataforseo says "${declared}" but DATAFORSEO_ACCOUNT in the`
      + ` environment says "${actual}".\n`
      + `  One of them is stale. Fix the config field or the .env.local entry —`
      + ` do not spend against\n  an account the committed config misattributes.\n`);
  }

  return {
    login,
    password,
    declared,
    verified: Boolean(actual),
    auth: login && password
      ? 'Basic ' + Buffer.from(`${login}:${password}`).toString('base64')
      : null,
  };
}

/** One line for a --dry run, so the cost preview says whose money it is. */
export function accountLine(creds) {
  const who = creds.declared === 'shared' ? 'shared (ours)' : 'client';
  const how = creds.verified
    ? 'confirmed by DATAFORSEO_ACCOUNT'
    : 'per config; set DATAFORSEO_ACCOUNT in .env.local to have this verified';
  const have = creds.login && creds.password
    ? 'found in the environment'
    : 'NOT SET — add them to .env.local';
  return `  account:     ${who} — ${how}\n  credentials: ${have}`;
}

/** The stock refusal, shared so three scripts say the same thing. */
export const MISSING = '\n  DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD are not set.\n'
  + '  Add them to .env.local (gitignored) and run with:\n'
  + '    set -a && . ../.env.local && set +a && node ../engine/scripts/<script>.mjs\n';
