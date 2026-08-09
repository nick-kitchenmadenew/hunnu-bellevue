import { fileURLToPath } from 'node:url';
import { config } from './src/lib/config.js';

/**
 * The Astro config every Core 30 site builds with.
 *
 * A client's astro.config.mjs is three lines: import this, call it, export the
 * result. Everything it needs to know is already in the config YAML — the domain
 * and the base path come from `site.domain` and `entity.root`, which is what the
 * whole config-as-truth arrangement is for.
 *
 * @param {object} opts
 * @param {string} opts.imagesModule
 *   Absolute path to the client's image registry. The engine's layouts import
 *   `core30:images`, and this is what that alias points at.
 *
 *   The registry cannot live in the engine. `import.meta.glob` is resolved by
 *   Vite relative to the file that calls it, so a registry inside the engine
 *   would glob the engine's own assets directory and find no photographs at all.
 *   Keeping it client-side also puts it where it belongs: which photographs exist
 *   is the business's fact, not the build's.
 * @param {object} [opts.astro]  merged over the defaults, for the rare override
 */
export function makeConfig({ imagesModule, astro = {} } = {}) {
  if (!imagesModule) {
    throw new Error('makeConfig needs `imagesModule` — the absolute path to this site\'s '
      + 'src/lib/images.js. Without it the layouts have no photographs to draw.');
  }

  // Astro wants the base without a trailing slash; the config carries it with
  // one, because every URL the site emits is trailing-slashed. One of the two has
  // to convert, and it is cheaper here than in the forty places that use
  // `entity.root`.
  const base = config.entity.root.replace(/\/$/, '') || '/';

  return {
    site: `https://${config.site.domain}`,
    base,
    trailingSlash: 'always',
    build: { format: 'directory', inlineStylesheets: 'always' },
    image: { formats: ['avif', 'webp'] },
    ...astro,
    vite: {
      ...(astro.vite ?? {}),
      resolve: {
        ...(astro.vite?.resolve ?? {}),
        alias: {
          'core30:images': imagesModule,
          ...(astro.vite?.resolve?.alias ?? {}),
        },
      },
    },
  };
}

/** Where this file sits, so a client can resolve engine paths without guessing. */
export const engineRoot = fileURLToPath(new URL('.', import.meta.url));
