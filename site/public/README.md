# public/ — two files required, everything else derives

Drop in exactly two source images before the first build:

- `icon-512.png` — square, at least 512×512, this business's actual logomark
- `icon-180.png` — square, 180×180 (Apple's own required size for a touch icon)

`derive-icons.mjs` (wired into `npm run build` via `prebuild`) generates
everything else from those two, on every build: `favicon.ico`,
`apple-touch-icon.png`, `apple-touch-icon-precomposed.png`, and it fails the
build loudly, naming exactly what's missing, if either source is absent. See
`derive-icons.mjs`'s own header comment for the full reasoning — the short
version is that kitchenmadenew.com went live without any of these, and Safari
drew a generic grey letter tile for a bookmark instead of the logo, silently,
for as long as nobody happened to try bookmarking the site on an iPhone.

Also declared in Base.astro and expected to exist here: `icon-32.png`,
`icon-192.png`. Same requirement — real source assets, not generated,
because a 512 downscaled to 32 and a 512 shown at native size are not the
same design decision, and a wordmark that reads at 512px can turn to mud at
32.

`logo-square-512.png` also belongs here — used in the site's schema.org
markup (`image`/`logo`), separate from the favicon family above.

Do not commit generated files from a different site into this folder as a
shortcut. A blank build failure is the signal that these are still missing;
a wrong logo that happens to build is much harder to notice.
