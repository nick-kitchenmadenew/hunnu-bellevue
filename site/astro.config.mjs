import { defineConfig } from 'astro/config';
import { makeConfig } from 'core30/astro-config';
import { fileURLToPath } from 'node:url';

/**
 * Domain, base path, image formats and the rest come from config-<entity>.yaml
 * by way of the engine. The only thing this site has to tell the build is where
 * its own photographs are registered — see site/src/lib/images.js.
 */
export default defineConfig(makeConfig({
  imagesModule: fileURLToPath(new URL('./src/lib/images.js', import.meta.url)),
}));
