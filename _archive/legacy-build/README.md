# Legacy Build Tooling — Archived 2026-06-01

These files belonged to the old minification pipeline that targeted the legacy
header/footer JS and the styles-v2 CSS — all of which are now archived.

## What this did

`package.json` defined three npm scripts:

- `build:js` — minified `header.js` → `header.min.js` and `footer.js` → `footer.min.js`
- `build:css` — minified `styles-v2.css` → `styles-v2.min.css`
- `build` — ran both

Dev dependencies: `terser` (^5.46.0) and `clean-css-cli` (^5.6.3).

`package-lock.json` was the dependency lockfile for those two tools.

## Why retired

Every input file these scripts targeted has been archived:

- `header.js` / `footer.js` / `header.min.js` / `footer.min.js` →
  earlier archive (corrupted root-level versions)
- `styles-v2.css` / `styles-v2.min.css` →
  `_archive/legacy-css/` (commit `1c10103`, 2026-06-01)

The site's current JS/CSS stack lives at `/assets/js/` and `/assets/css/` and is
served unminified (no build step). There is no longer any input for these
scripts to operate on.

## If a build pipeline is added in the future

Start fresh — do not resurrect this `package.json`. The `main: "footer.js"`
field, repo metadata, and scripts all reference paths that no longer exist.
