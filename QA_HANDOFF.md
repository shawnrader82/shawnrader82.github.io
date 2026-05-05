# Mobile American Notary — Website QA Handoff

Subagent: website QA + polish pass on Shawn's Mobile American Notary HTML files.
Scope: locations hub (`index.html` = `/locations/`), 10 local-area location pages.
Apostille services hub (`/services/apostille.html`) was **not present** in the workspace — see "Outstanding decisions" below.

---

## 1 · Files inventoried

All in `/home/user/workspace/`:

| File | Role | URL on live site |
|---|---|---|
| `index.html` | Locations hub (canonical `/locations/`) | mobileamericannotary.com/locations/ |
| `encino-tarzana-notary-apostille.html` | Local area page | /locations/encino-tarzana-notary-apostille.html |
| `granada-hills-porter-ranch-apostille-notary.html` | Local area page | /locations/granada-hills-porter-ranch-apostille-notary.html |
| `pasadena-altadena-notary-apostille.html` | Local area page | /locations/pasadena-altadena-notary-apostille.html |
| `san-fernando-notary-apostille.html` | Local area page | /locations/san-fernando-notary-apostille.html |
| `santa-monica-venice-marina-del-rey-notary-apostille.html` | Local area page | /locations/santa-monica-venice-marina-del-rey-notary-apostille.html |
| `sylmar-sun-valley-pacoima-notary-apostille.html` | Local area page | /locations/sylmar-sun-valley-pacoima-notary-apostille.html |
| `thousand-oaks-westlake-village-notary-apostille.html` | Local area page | /locations/thousand-oaks-westlake-village-notary-apostille.html |
| `valencia-santa-clarita-notary.html` | Local area page | /locations/valencia-santa-clarita-notary.html |
| `van-nuys-notary-apostille.html` | Local area page | /locations/van-nuys-notary-apostille.html |
| `woodland-hills-west-hills-canoga-park-notary-apostille.html` | Local area page | /locations/woodland-hills-west-hills-canoga-park-notary-apostille.html |

**Not in workspace** (exists on live server, referenced from these files): `services/apostille.html`, `services/notary.html`, `services/livescan.html`, plus other location pages mentioned in `index.html` schema (Beverly Hills, Sherman Oaks, Downtown LA, Chatsworth, Hollywood, Burbank, Reseda, Simi Valley) and supporting CSS/JS (`assets/css/global.css`, `header.css`, `locations.css`; `assets/js/footer.min.js`; root `styles-v2.min.css`, `header.min.js`, `footer.min.js`, `favicon.ico`).

---

## 2 · Issues found (auto-detected + manual review)

### Critical (now fixed)
1. **`index.html` had no `<!DOCTYPE html>` and no `<html lang="en">` opening tag.** File began with `<head>` and closed with `</html>`. Browsers tolerate this in quirks mode, but it breaks HTML5 validation, hurts SEO, and removes the language hint screen readers depend on.
2. **`index.html` had 19 `tel:` links missing the `+` E.164 prefix** (e.g. `tel:12139332507`). The header and mobile nav already used `tel:+12139332507`, but the hero CTA, every "Call / Text" split-button on the 18 location cards, and the trailing micro-copy CTA were inconsistent. Some Android dialers and iOS Safari versions parse `tel:` without `+` differently for international roaming users.
3. **`santa-monica-venice-marina-del-rey-notary-apostille.html` had a duplicate `id="sm-livescan"`** — a full Live Scan section appeared twice, once in the wrong slot (between Real Estate and Jail) and again in the canonical slot (after Jail). Two elements with the same id is invalid HTML and breaks fragment links / `document.getElementById`.

### Minor (now fixed)
4. **Unencoded `&` in Google Fonts query strings** — `&display=swap`, `&wght=…`. Technically should be `&amp;` inside an HTML attribute. html5lib flagged these as `expected-named-entity`. Fixed across all 11 files.

### Notes / possible polish (not changed — preserving existing theme)
- `service-card-text` paragraphs contain a leading `<br>` used as visual padding inside the card. Works but is a layout hack — prefer CSS `padding-top` on `.service-card-text`. Leaving alone to avoid CSS regressions since the stylesheet is not in the workspace.
- Location pages reference `<a href="/locations/sherman-oaks-notary-apostille.html">`, `<a href="/locations/woodland-hills-notary-apostille.html">`, `<a href="/locations/reseda-notary-apostille.html">` from in-body link rolls. These slugs do not match the actual file names on the live server (`sherman-oaks-studio-city-notary-apostille.html`, `woodland-hills-west-hills-canoga-park-notary-apostille.html`, `reseda-winnetka-lake-balboa-notary-apostille.html`). Did **not** auto-fix because the live `/locations/` dir wasn't in scope to verify — flag for next pass.
- Favicon link in `index.html` is `../favicon.ico` (relative; correct for `/locations/`). Location pages use `/favicon.ico` (absolute). Both work; not unified.
- Hero CTA on `index.html` previously read just "Call / Text". Updated to `Call / Text (213) 933‑2507` with an explicit `aria-label` to match the proven pattern on every location page (showing the number on the button measurably increases call-tap rate).
- The `home-mobile-menu` toggle script at the bottom of `index.html` is solid: handles `aria-expanded`, click-outside close, and resize-close above 900px. No changes.

---

## 3 · Fixes applied

| File | Change |
|---|---|
| `index.html` | Added `<!DOCTYPE html>` + `<html lang="en">` at top of file. |
| `index.html` | Replaced all `href="tel:12139332507"` → `href="tel:+12139332507"` (19 occurrences). |
| `index.html` | Hero primary CTA now reads **`Call / Text (213) 933‑2507`** with `aria-label="Call or text Mobile American Notary at 213-933-2507"` to match location-page pattern and lift conversion. |
| `santa-monica-venice-marina-del-rey-notary-apostille.html` | Removed misplaced duplicate `<section id="sm-livescan">` (formerly between Real Estate and Jail); kept the canonical instance after the Jail section. |
| All 11 files | Escaped `&` → `&amp;` in Google Fonts URL query strings (`&display=swap`, `&wght=…`). |

No CSS/JS files were modified (none were in the workspace). No content tone, layout, or theme decisions were changed — purely correctness + a single CTA label clarification.

---

## 4 · QA / tests run

All run against the post-fix files in `/home/user/workspace/`:

1. **Custom static lint** (`qa_scan2.py`) — checks DOCTYPE, `<html lang>`, duplicate IDs, `tel:` E.164, `target="_blank"` + `rel=noopener`, `<img>` `alt`, canonical / description / og:title / viewport, empty `href`, JSON-LD validity.
   - **Result:** all 11 files OK.
2. **html5lib parser (browser-grade HTML5 validator).**
   - **Result:** **0 errors across all 11 files.**
3. **JSON-LD validator** (parses every `<script type="application/ld+json">` block as JSON).
   - **Result:** 31 blocks parsed, 0 errors.
4. **`tel:` audit** — 21 `tel:` references in `index.html`, all now `tel:+12139332507`. Across location pages: all 8/file already used E.164.
5. **`target=_blank` audit** — every external link (Square booking, Rotary club, Yelp, Facebook, etc.) has `rel="noopener"`. Confirmed.
6. **Visual / responsive QA** — could not run because the project's CSS/JS files (`global.css`, `header.css`, `locations.css`, `styles-v2.min.css`, `header.min.js`, `footer.min.js`) are not in the workspace. Recommend Playwright screenshot QA at 375px and 1280px against the deployed site or a local copy with the assets mounted.

The QA scripts are saved in the workspace as `qa_scan.py` and `qa_scan2.py` for future re-runs.

---

## 5 · Outstanding decisions / follow-ups

1. **`/services/apostille.html` not in workspace.** Multiple location pages link to it ("Learn More" buttons in their Apostille sections, and an FAQ link). The user's task description listed this as priority (3) "if present" — it is not present. **Recommendation:** do not invent a brand-new design from scratch. Instead, on the next session ask the user to attach the existing live `services/apostille.html` so we can audit and polish it consistently with the location pages, or generate a new one that mirrors the location-page pattern (hero with Call/Book CTAs → service-card row → service-detail sections in alternating white/blue/gray → FAQ → footer).
2. **Slug mismatches in body link rolls.** As noted in §2 — `sherman-oaks-notary-apostille.html`, `woodland-hills-notary-apostille.html`, `reseda-notary-apostille.html` references should likely be the longer slugs that match the real files. Quick global find/replace would resolve. Holding off until the live `/locations/` dir is confirmed.
3. **Schema `numberOfItems: 11` in `index.html`** — verify count after any locations are added/removed.
4. **Favicon path consistency** — pick `../favicon.ico` (relative) or `/favicon.ico` (absolute) and use uniformly.

---

## 6 · Design conventions (for future incremental edits)

So a follow-up agent (or Shawn) can edit without re-discovery:

### Typography & color
- **Font:** Inter, 400/500/600/700 (`index.html` adds 800). Loaded from Google Fonts.
- **Theme color (light):** `#0f172a` (dark navy, set via `<meta name="theme-color">`).
- **Section background pattern** on location pages: `service-detail--white` → `service-detail--gray` → `service-detail--blue` (alternating). The blue sections house Apostille and Jail content (high-trust / urgent topics).

### Layout & components on location pages (`/locations/<slug>.html`)
Canonical section order:
```
hero (dark) → service-card-row anchor grid → intro (white)
  → apostille (blue) → mobile-notary (gray) → hospital-notary (white)
  → trust-estate (gray) → real-estate (white) → jail-notary (blue)
  → livescan (white) → faq (white|gray)
```
- Section IDs use a 2-letter location prefix: `et-` Encino/Tarzana, `vn-` Van Nuys, `sm-` Santa Monica, `gh-` Granada Hills, `wh-` Woodland Hills, `to-` Thousand Oaks, `pa-` Pasadena, `sf-` San Fernando, `vs-` Valencia/Santa Clarita, `sv-` Sylmar etc. Keep the prefix unique per page.
- Each `service-detail-cta` group holds **3 buttons**: `btn--primary` (Call/Text), `btn--secondary btn--flex` (Book Online — section-specific Square link), and `btn--secondary` (Learn More).
- Square booking URLs are section-specific (different service IDs in the URL path); never replace with a generic link.

### Locations hub (`/locations/` aka `index.html`)
- Sticky header is `class="home-header"` with mobile toggle `#home-menu-toggle` and dropdown `#home-mobile-menu`. The toggle script is inline at the bottom of `index.html` (lines ~1093 onward) — owns the menu.
- Hero is `class="home-hero locations-hero"` with `home-hero-cta--primary` (Call/Text) and `home-hero-cta--secondary` (Browse Locations anchor `#locations-grid`).
- Region groups live in `<section class="locations-region" id="region-…">` containing `<div class="home-service-lanes-grid home-service-lanes-grid--locations">` of `<article class="service-lane service-lane--location-text">` cards.
- Each card has a split CTA: `service-lane-split-button--left` (View area page) + `service-lane-split-button--right` (Call / Text — `tel:+12139332507`).
- FAQ uses native `<details>/<summary>` (`class="locations-faq-item"`) — accessible by default, no JS needed.

### Phone number canonical formats
- **Display:** `(213) 933‑2507` (U+2011 non-breaking hyphen between 933 and 2507).
- **Tel link:** `tel:+12139332507` everywhere.
- **JSON-LD `telephone`:** `+1-213-933-2507`.

### Booking & external links
- Square hub: `https://book.squareup.com/appointments/mp3gi6wm4xznjs/location/7NFJ60G7B23YS/services` (with optional `/<service-id>` for deep links).
- Always render external links with `target="_blank" rel="noopener"` (or `rel="noopener noreferrer"` for the header — both are present).

### Tracking
- GTM container `GTM-KWBRTN9M` is present in every file (head script + body `<noscript>` iframe). Don't duplicate, don't change.

### Schema.org
- Each location page has 3 JSON-LD blocks: `BreadcrumbList`, `Service`, `FAQPage`.
- `index.html` (locations hub) has a single `@graph` block with `BreadcrumbList`, `WebPage`, `WebSite`, `Organization`, `LegalService`, `ItemList` (11 locations), `FAQPage`.
- Aggregate rating used on location pages: `"ratingValue":"5.0", "reviewCount":"100"`.

---

## 7 · Key file paths

```
/home/user/workspace/
  index.html                    ← locations hub (canonical /locations/)
  <slug>-notary-apostille.html  ← local area pages (10)
  qa_scan.py                    ← initial scan (noisier, ignores meta/link false positives)
  qa_scan2.py                   ← refined scan, run this for re-validation
  QA_HANDOFF.md                 ← this document
```

Re-run validation any time:
```bash
cd /home/user/workspace && python3 qa_scan2.py
python3 -c "import html5lib,glob; [print(f, len(html5lib.HTMLParser(strict=False).errors) if html5lib.HTMLParser(strict=False).parse(open(f).read()) or True else 0) for f in sorted(glob.glob('*.html'))]"
```

---

## 8 · Visual QA pass — assets-uploaded session (May 5)

The user uploaded `global-5.css`, `header-6.css`, `home-7.css`, `locations-8.css`,
`header.js`, `header.min.js`, `footer.js`, `footer.min.js`. With the assets in
place we ran a real Playwright pass at 1280px desktop and 375px mobile (and a
320px overflow scan).

### Bugs found and fixed

#### A · Locations hub (`index.html`) — undefined CSS custom properties
`locations-8.css` references typography tokens that nobody defines:
`--text-kicker`, `--text-label`, `--text-sm`, `--text-body`, `--text-body-lg`,
`--text-button`, `--text-card-title`, `--text-section-title`,
`--text-hero-title-inner`, `--weight-bold`, `--weight-extrabold`,
`--tracking-tight`, `--tracking-wider`, `--line-body`, `--line-body-tight`.

**Live evidence**: on `mobileamericannotary.com/locations/`, the section heading
*“Choose your city or area”* renders at `font-size: 16px` (browser default) instead
of a real H2; the hero eyebrow *“Service areas”* renders at `400` weight, not `700`.
Flat broken in production today.

**Fix:** added the missing tokens to `global-5.css` (`:root` block) with values
that match the rest of the design (e.g. `--text-section-title:
clamp(2rem, 3.4vw, 3.1rem)` to match `home-7.css`'s `.section-heading h2`).

#### B · Locations hub (`index.html`) was missing a stylesheet link
`index.html` only linked `global.css`, `header.css`, `locations.css`. But the
markup uses `home-*` classes that originate in `home-7.css` (`.section-shell`,
`.section-heading`, `.section-kicker`, `.home-final-cta-*`, `.site-footer-*`,
`.home-coverage-button`).

**Fix:** added `<link rel="stylesheet" href="../assets/css/home.css">` to
`index.html` head.

#### C · Hero eyebrow + region kicker missing `text-transform: uppercase`
Design system uses uppercase tracked kickers everywhere except where these new
tokens were applied. With tokens now defined, eyebrow / region label sized
correctly but stayed sentence case.

**Fix:** appended a small block to `locations-8.css` adding
`text-transform: uppercase` + matching tracking/weight on
`.locations-hero .home-hero-eyebrow`, `.home-service-lanes--locations .section-kicker`,
and `.locations-region-title`.

#### D · Long Book-Online CTAs overflowed on mobile (location pages)
At 375px, two `.btn.btn--secondary.btn--flex` buttons exceeded the viewport by
28–36px (`Book Online – Hospital/Medical Notary Appointment` and `Book Online –
Estate Planning Notary Appointment`). The shared `styles-v2.min.css` keeps these
buttons at `white-space: nowrap` for desktop polish, which is the wrong call on
narrow phones.

**Fix:** injected an idempotent defensive `<style>` block into the `<head>` of
all 10 location pages (marker `qa-mobile-cta-wrap-v1`):

```css
@media (max-width: 480px) {
  .btn.btn--flex { white-space: normal; text-align: center; line-height: 1.25;
                   padding-top: 12px; padding-bottom: 12px; }
  .service-detail-cta { flex-wrap: wrap; gap: 10px; }
  .service-detail-cta .btn { flex: 1 1 100%; }
}
```

Doesn't change the live shared stylesheet; this can also be lifted into
`styles-v2.min.css` later with the same effect.

#### E · `header.min.js` vs `header.js` path inconsistency — NOT fixed (intentional)
`header.js` (source) fetches `/partials/header.html` (matches the new
`home-header` markup styled by `header-6.css`).
`header.min.js` (production) fetches `/header.html` (matches an OLDER
`main-header` markup styled by the legacy `styles-v2.min.css`).

Both files exist on the live server and both render legitimately. Touching the
minified script could break legacy location pages immediately. Recommend the
user regenerate `header.min.js` from `header.js` (e.g. `terser header.js -m -o
header.min.js`) at the same time as a coordinated cutover. Flagged, not
auto-fixed.

### What was screenshot-tested

| Page | 1280 desktop | 375 mobile | 320 overflow scan |
|---|---|---|---|
| `index.html` (locations hub) | ✅ `qa_index_desktop_v3.png` | ✅ `qa_index_mobile_v3.png` | ✅ no overflow |
| `van-nuys-notary-apostille.html` | ✅ `qa_vannuys_desktop.png` | ✅ `qa_vannuys_mobile_v2.png` | ✅ no overflow after fix |
| `santa-monica-...html` | ✅ `qa_santamonica_desktop.png` | ✅ `qa_santamonica_mobile.png` | ✅ |
| `encino-tarzana-notary-apostille.html` | ✅ `qa_encino_desktop.png` | ✅ `qa_encino_mobile.png` | ✅ |
| Mobile menu open state | — | ✅ `qa_index_mobile_menu_open.png` (toggle + aria-expanded work) | — |

Tap-target audit at 375px: only the menu toggle (38×40) and the brand image
(small because logo asset 404s locally) are <44×44. Both are acceptable; on the
live site the brand has the real logo.png/webp at full size.

Only remaining console warnings on the local copy are 404s for image assets
(logo, hero photo, button thumbnails) that live on the production server but
are not in the workspace — expected, not site-impacting.

### Files changed in this round

| File | Change |
|---|---|
| `global-5.css` | Added missing typography/weight/tracking/line tokens to `:root`. |
| `locations-8.css` | Added `text-transform: uppercase` to `.locations-hero .home-hero-eyebrow`; added uppercase / tracking / weight rules for `.home-service-lanes--locations .section-kicker` and `.locations-region-title`. |
| `index.html` | Added `<link rel="stylesheet" href="../assets/css/home.css">` to head. |
| All 10 location HTMLs | Injected `<style>qa-mobile-cta-wrap-v1</style>` block in `<head>` to fix mobile CTA overflow. Marker is idempotent. |

All uploaded assets are also mirrored into expected paths so the project can be
served locally:
```
assets/css/global.css   ← global-5.css
assets/css/header.css   ← header-6.css
assets/css/home.css     ← home-7.css
assets/css/locations.css ← locations-8.css
assets/js/footer.min.js ← footer.min.js
assets/js/header.min.js ← header.min.js  (etc.)
footer.min.js, header.min.js, header.html, styles-v2.min.css, favicon.ico in repo root for location pages
partials/header.html, partials/footer.html  (downloaded from live for local QA only)
```

### What still needs the user

1. **Apply this round's CSS edits to the live copies of `global-5.css`,
   `locations-8.css`, and the location HTMLs.** The local source-of-truth files
   in workspace are now correct; copy them into the deploy pipeline.
2. **Regenerate `header.min.js` from `header.js`** so the minified version
   stops fetching `/header.html` (legacy) and uses `/partials/header.html`
   instead. Coordinate with whichever cutover removes the old `main-header`
   markup entirely.
3. **Slug mismatches (still open)**: `sherman-oaks-notary-apostille.html`,
   `woodland-hills-notary-apostille.html`, `reseda-notary-apostille.html` body
   links don't match the actual long file slugs. Quick global search-and-replace
   when next pass starts.
4. **`/services/apostille.html` still missing from workspace.** Multiple location
   pages link to it. Attach to next session for QA.


---

## 9 · Main Homepage QA

This section covers the new root homepage `/index.html` (canonical `https://www.mobileamericannotary.com/`) — distinct from the locations hub which has been preserved as `locations-index.html` / `locations/index.html`.

### 9.1 Files

| Path in workspace | Role | URL on live site |
|---|---|---|
| `index.html` | Main homepage | mobileamericannotary.com/ |
| `locations-index.html` | Locations hub (was previously `index.html`) | mobileamericannotary.com/locations/ |
| `locations/index.html` | Local copy of the locations hub for Playwright runs | (same as above) |

### 9.2 Static validation results

- html5lib strict parse: **0 errors** (after fixes)
- JSON-LD blocks: **2** (Organization + LocalBusiness graph, FAQPage) — both valid JSON
- `tel:` links: 9 total, **all `tel:+12139332507`** (E.164)
- Duplicate IDs: 0
- `target="_blank"` links missing `rel="noopener"`: 0
- `<img>` without `alt`: 0
- External link audit (URLs hit on the live site): see §9.5

### 9.3 Bugs found and fixed

#### Critical / functional
1. **Mobile menu drawer never appeared on touch.** The CSS rule `.home-mobile-menu { display: none; }` was the base, and JS only toggled the `[hidden]` attribute and an `is-open` class on the header — but no CSS rule set `display: block` for `.home-header.is-open .home-mobile-menu`. Result: hamburger toggled `aria-expanded` but the drawer stayed invisible. Direct conversion-blocker on phones.
   - **Fix:** added `.home-header.is-open .home-mobile-menu { display: block; }` to `header-6.css` and `assets/css/header.css`.
2. **Footer never rendered.** Lines 625–626 had stray `-->` tokens after the closing tags:
   ```html
   <div id="footer-placeholder"></div> -->
   <script src="/assets/js/footer.min.js" defer></script> -->
   ```
   The literal `-->` text appeared after the elements and *also*, because the homepage previously had no Inter font load, the visual fallback masked the missing footer. Removed the trailing `-->` so the placeholder JS now fetches `/partials/footer.html` and the footer hydrates on load.
3. **5 `tel:2139332507` (non-E.164) links.** Lines 327, 352, 377, 402, 514 — all four service-card "Call / Text" split buttons and the coverage section's primary CTA. Normalised to `tel:+12139332507`. The header, hero, and reviews CTAs were already correct, so users tapping a card from a phone got an inconsistent dialer behaviour. **Fix:** all 9 `tel:` instances are now `tel:+12139332507`.
4. **Apostille service link 404.** `href="/services/apostille/"` (trailing slash, no `.html`) was used in two places on the apostille service card (image link and title link) — verified `/services/apostille/` returns 404 on production while `/services/apostille.html` returns 200 (the header navigation already used `.html` correctly). **Fix:** both updated to `/services/apostille.html`.
5. **Service card CTA overflow at 320 px.** The `.service-lane__actions` row used `width: calc(100% + 32px); margin: auto -16px -1px;` to bleed to the card edges, but the card content has no horizontal padding to compensate, so the actions row sat ~3 px outside the viewport on a 320 px screen. **Fix:** in both the ≤720 and ≤480 media queries, `.service-lane__actions` is now `width: 100%; margin: auto 0 -1px;`. Verified zero overflow at 320 px (`docW === winW === 320`).

#### SEO / metadata
6. **`og:image` and `twitter:image` pointed to a 404.** `/images/og-default.jpg` returns 404 on production. Social previews would fall back to whatever the platform autodetects. **Fix:** changed both to `/images/brand/logo.webp` (returns 200). Stop-gap until a proper 1200×630 OG asset exists — see §9.6.
7. **JSON-LD `Organization.logo` and `LegalService.image` pointed to a 404.** Both used `/images/brandlogo.webp` (no slash, 404). The actual logo is at `/images/brand/logo.webp` (200). **Fix:** all three references updated.
8. **No FAQPage schema** despite 6 visible FAQ articles. Added a `FAQPage` JSON-LD block with all 6 Q/A pairs verbatim from the rendered markup. Eligible for FAQ rich results in Google.
9. **Inter font wasn't loaded.** The locations hub loads `Inter:wght@400;500;600;700;800` from Google Fonts; the homepage only `preconnect`-ed to `fonts.googleapis.com` without the actual `<link rel="stylesheet">`. CSS asked for `font-family: Inter, "Helvetica Neue", Arial, sans-serif` but the browser never had Inter to render with, so the entire page fell back to Helvetica/Arial. **Fix:** added `<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&amp;display=swap" rel="stylesheet">` to `<head>`. Confirmed via computed style — `font-family` resolves to Inter post-load.

#### Code hygiene
10. CSS `<link>` tag indentation in `<head>` normalised (was 1 line indented, 2 not).
11. Removed obsolete `frameborder="0"` from the SociableKit reviews iframe (HTML5 anti-pattern; `style="border:0;"` already present).

### 9.4 Findings *not* auto-changed (need user decision)

- **Hero eyebrow copy.** `<p class="home-hero__eyebrow">Mobile American Notary & Apostilles</p>` is the brand name, not a kicker. Conventional pattern is something category- or value-driven (e.g. "Notary, apostille & live scan", "Trusted across LA, Orange & Ventura"). Left untouched — copy decision belongs to Shawn.
- **No BreadcrumbList JSON-LD.** Minor; homepages typically don't need one, but adding a 1-item breadcrumb is sometimes recommended for consistency.
- **`/images/og-default.jpg` should exist.** A real 1200×630 OG image branded with the logo + tagline would render better in Slack, iMessage, LinkedIn, and Facebook previews than the small square logo currently set as fallback.

### 9.5 Live-site URL audit (relevant to homepage links)

| URL | Status | Used? |
|---|---|---|
| `/services/apostille.html` | 200 | yes (after fix) |
| `/services/apostille/` | 404 | removed |
| `/services/notary.html` | 200 | yes |
| `/services/notary-hospital.html` | 200 | yes |
| `/services/notary-jail.html` | 200 | yes |
| `/services/livescan.html` | 200 | yes |
| `/images/services/notary-hero.webp` | 200 | hero preload |
| `/images/og-default.jpg` | 404 | removed |
| `/images/brandlogo.webp` | 404 | removed |
| `/images/brand/logo.webp` | 200 | yes (after fix) |
| `/assets/images/brand/logo.webp` | 200 | header logo |
| `/assets/images/home/{apostille,notary,hospital-notary,jail-notary}-card.webp` | 200 | service cards |

Local-only 404s during Playwright runs (`/assets/images/...`) are expected — those binaries live only on the production server. No code changes needed.

### 9.6 Outstanding follow-ups (not blockers)

1. **Create a real 1200×630 OG image** (e.g. `/images/og-default.jpg` or `/images/og/home.png`) and swap the current logo fallback in `og:image`/`twitter:image`. Until then, social previews show a tall logo instead of a richly designed card.
2. **Centralise the Inter font load.** Right now the homepage and locations hub each include their own Google Fonts `<link>`. The shared `partials/header.html` would be a natural place to load Inter once and have every page benefit. Prevents this exact "Inter missing" recurrence.
3. **Decide on hero eyebrow copy.** Replace brand name with a value-prop kicker.
4. **Header `home-header__call` and `home-header__book` action buttons in the actions row** are visible alongside the hamburger on phones — by design (per the user's 3 May feedback the header bar now loads properly and that discrepancy can be ignored). No further work needed.

### 9.7 Playwright QA artefacts

| Screenshot | Viewport | Notes |
|---|---|---|
| `qa_home_desktop.png` | 1280 × 900 | Full-page capture, Inter active, all sections render, 2 valid JSON-LD blocks |
| `qa_home_mobile.png` | 375 × 812 | Full-page capture, single-column layout, service cards stack with edge-flush CTAs |
| `qa_home_mobile_menu_open.png` | 375 × 812 viewport | Drawer visible after fix (display: block via `.is-open`); 6 nav items shown |
| `qa_home_320.png` | 320 × 720 | Full-page capture; `docW === winW === 320`, **zero overflow offenders** after fix |

### 9.8 Files changed this round

| File | Change |
|---|---|
| `index.html` | OG/Twitter image, JSON-LD logo/image, Inter font link, FAQPage schema, footer comment fix, 5 `tel:` E.164 normalisations, apostille link fix (×2), CSS link indentation, removed `frameborder` |
| `header-6.css` | Added `.home-header.is-open .home-mobile-menu { display: block; }` |
| `assets/css/header.css` | Mirrored `header-6.css` |
| `home-7.css` | Service-lane actions: `width: 100%; margin: auto 0 -1px` at ≤720px and ≤480px (was bleed-out negative-margin) |
| `assets/css/home.css` | Mirrored `home-7.css` |

