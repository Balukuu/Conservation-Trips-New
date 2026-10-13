# Conservation Trips & Adventures

Express + EJS site that also compiles to plain static HTML, which is what GitHub Pages serves.

## Local development

```bash
npm install
npm run dev        # Express + nodemon on http://localhost:3000
```

## How the pieces fit

- `lib/pages.js` builds the view model for **every** page (view data + SEO title/description).
  `routes/*.js` call it per request; `scripts/build.js` calls it once per page. Change page copy or
  data there and the dev server and the static build can't drift apart.
- `lib/data.js` loads `data/*.json` once and derives lookups (tours per country, related tours, …).
  A tour belongs to every country in its `countries` list; the "N tours available" counts are computed.
- `lib/site.js` has `assetUrl()`, which appends a content hash to CSS/JS URLs
  (`/css/main.css?v=00945ef709`), so they are cached for a year and still update on deploy.
- `app.js` is the Express app, `server.js` just listens (keep that name: the cPanel/Passenger config starts it).

## Images

Every photo the site uses is listed in `data/images.json` (alt text + a focal point for cropping).
Templates never write `<img>` by hand; they call `image({ src, sizes, … })` (`lib/images.js`), which emits a
responsive `<img srcset>` of WebP sizes with intrinsic `width`/`height` (no layout shift), lazy-loading and
the registry's alt text / `object-position`. The page's main image uses `priority: true`; purely decorative
images pass `alt: ''`.

```bash
npm run images     # after adding/replacing a photo in public/images/ (and listing it in data/images.json)
```

writes `public/images/opt/*.webp` (160–1600 px, never upscaled), `public/images/og/*.jpg` (1200×630 social
crops), `public/images/icons/*` (favicons from the logo) and `data/image-manifest.json`. The outputs are
committed, so CI and production don't need `sharp`. The build fails if a rendered image isn't registered, or a
tour's gallery repeats a photo.

- The five long-standing hero photos are 1024 px wide at most, so full-bleed heroes made from them are upscaled
  on large screens. The photos in `source-images/photos/` are 2048 px and don't have that problem.

### Photo library (`tRIPS` -> `tRIPS-web` -> site)

`../tRIPS/` (outside this repo) holds the original shoots: `TOUR` (1,300 JPG + CR3, Canon EOS R, 9-10 Dec 2024:
the staff trip from Kampala via the Kayabwe equator, Lake Mburo, the tea estates, Kikorongo equator and the
Kazinga Channel) and `WILDLIFE PHOTOS` (293 NEF, Nikon D800, 20 Apr 2025: a guest trip around Queen Elizabeth NP).

`../tRIPS-web/` has **every usable frame converted to web format** (WebP q85, longest edge 2048 px, orientation
applied, EXIF/GPS stripped; 1,591 files, ~390 MB, originals untouched). It is deliberately *not* in the repo.
Two source files are corrupt and were skipped (`TOUR/doreen4.jpg`, `ABZ_0768.NEF`). Three frames the camera
had saved without an orientation tag (`pik_5778`, `pik_5818`, `pik_5823`) were rotated upright in the library.

#### Albums on the site (`npm run albums`)

`data/albums.json` defines 13 albums by frame-number range (`pik_` = TOUR, `abz_` = WILDLIFE PHOTOS). The script
reads the library (set `PHOTO_LIBRARY` if it lives elsewhere), then per album:

1. drops corrupt (grey-filled), near-black/white and the blurriest 6% of frames,
2. collapses bursts of near-identical frames to the sharpest one (a longer burst keeps two),
3. encodes `public/images/gallery/<album>/<frame>-400.webp` (thumbnail) and `-1100.webp`, plus an `og.jpg` card,
4. writes `data/album-photos.json`.

That turns 1,590 frames into **857 photos**, all browsable at `/gallery/<album>` (masonry wall with the lightbox).
The outputs are committed, so CI and production need neither the library nor `sharp`. Re-running keeps existing
files (`--force` re-encodes); tune the burst threshold with `dedupe` in `albums.json`.

Hand-edit `data/albums.json` to rename an album, move its frame range, set its `cover`, `include`/`exclude`
single frames, or **`"hidden": true` to leave an album off the site** (the three `guests: true` albums are
the guest-trip frames; see the consent note below).

Where they appear: `/gallery` (curated highlights from `data/gallery.json`, then every album), `/gallery/<album>`,
a "From the Road" mosaic on the home page, and the tour galleries (`galleryAlbums` in `data/tours.json`:
`{ "album": "kazinga-cruise", "limit": 12 }` appends that many of the sharpest photos, in frame order).

To use one frame elsewhere as a hero/card image, copy it from `tRIPS-web/` to `source-images/photos/<name>.webp`,
add an entry (alt text, focal point, `maxWidth`) to `data/images.json`, run `npm run images`, and reference it with
`image({ src: '/images/photos/<name>.webp', … })`. `source-images/` is never served.

**Before publishing, please check consent.** The three guest-trip albums show families and children from the
April 2025 trip. They are marked `guests: true`; set `"hidden": true` on them in `data/albums.json` and re-run
`npm run albums` if you do not have permission, and the site is rebuilt without them. Photos are also captioned
by album only; check the location names against what you know.

## URLs

Every page has one address, and variants redirect (301) to it:

| Page | URL |
| --- | --- |
| Section pages | `/tours`, `/blog`, `/destinations`, `/experiences`, `/gallery`, `/about`, … (no `.html`) |
| Detail pages | `/tours/<slug>`, `/blog/<slug>`, `/destinations/<country>` |
| Category listings | `/tours/category/gorilla-trekking`, `/blog/category/travel-tips` (slug of the category name) |

The Express server (`lib/clean-urls.js`) redirects `/Tours`, `/tours/`, `/about.html`, `/index.html` and the old
`?category=Gorilla+Trekking` links to the canonical form. Static hosts serve folders, so there the canonical form
ends in `/` (`/tours/`); `public/.htaccess` and `deploy/nginx.conf` redirect `/…/index.html` to it, and the
filter scripts tidy an old `?category=` link in the address bar. Category pages are generated for every category
in `data/tours.json` / `data/posts.json` by the build, and the link check fails the build if one is missing.

## Static build

```bash
npm run build      # renders every page into dist/
```

The build is controlled by environment variables:

| Variable        | Default                           | Purpose |
| --------------- | --------------------------------- | ------- |
| `BASE_PATH`     | *(empty)*                         | URL prefix the site is served under, e.g. `/Conservation-Trips-New` for a Pages project site. Leave empty for a custom domain. |
| `SITE_URL`      | `https://tripsandadventures.co.ug` | Origin **including** the base path. Used for canonical / Open Graph / share URLs (dev server too). |
| `FORM_ENDPOINT` | *(empty)*                         | Where the static forms POST JSON: a hosted endpoint (e.g. `https://formspree.io/f/xxxxxxxx`) or your Node app (`/contact/submit`). |

The build also **checks every internal link and asset** in `dist/` and fails if one doesn't resolve.

To preview a project-site build locally:

```bash
BASE_PATH=/Conservation-Trips-New SITE_URL=https://<owner>.github.io/Conservation-Trips-New npm run build
npx serve dist     # note: serves at /, so asset paths only resolve when mounted under BASE_PATH
```

Templates keep plain `/css/main.css`-style paths so the dev server and the build share one source;
`scripts/build.js` re-roots them under `BASE_PATH` when it writes the HTML.

## Deploying to GitHub Pages

Deployment is automated by `.github/workflows/pages.yml` on every push to `main`.

One-time setup in the GitHub repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

The workflow works out the URL for you:

- `public/CNAME` exists → custom domain, served at the root (put your domain on one line in that file).
- Repo is named `<owner>.github.io` → user site, served at the root.
- Anything else → project site at `https://<owner>.github.io/<repo>/`.

### Booking form

GitHub Pages has no server, so `routes/contact.js` (and its SMTP settings) is not used on the live site.
When the Node app is running (`npm start`), `routes/contact.js` serves `POST /contact/booking`
(multi-step form), `POST /contact/enquiry` (tour-page form) and `POST /contact/submit` (either payload).
It validates and length-caps input, escapes it in the email, rate-limits per IP (8 per 10 min), and
sends through SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `CONTACT_EMAIL` in `.env`).
Without SMTP settings the forms are accepted in development but not emailed, and answer 503 in production.

- **Recommended:** create a free form endpoint (e.g. Formspree), then add its URL as a repository
  *variable* named `FORM_ENDPOINT` (Settings → Secrets and variables → Actions → Variables) and re-run the workflow.
- **Without it**, submitting the form opens a pre-filled email to `info@tripsandadventures.co.ug`
  in the visitor's mail app, and the confirmation screen says so.

## Front-end conventions

The motion/interaction layer follows a few rules — keep them when adding components:

- **CSS load order matters**: `main.css` → `animations.css` → `components.css` → `preferences.css`.
  `preferences.css` (reduced motion / transparency / contrast) loads **last** so it wins.
- **Never `transition: all`.** Use the `--transition` / `--transition-fast` tokens (they list properties)
  and animate `transform` / `opacity`.
- **Hover lifts live in one `@media (hover: hover)` block in `main.css`**, using `--lift` / `--lift-sm`
  (both zeroed for reduced motion). Don't put `transform` on individual `:hover` rules.
- **Scroll reveal** (`.reveal`, `.reveal-left`, `.reveal-right`, `.reveal-scale`, `.reveal-grid`)
  only hides content under `<html class="js">`, and `main.js` adds `.reveal-done` afterwards so the
  element's own hover/transform rules take over. Don't write inline `opacity`/`transform` from JS.
- **Anything that slides away also goes `visibility:hidden`** so it can't be tabbed to off-screen.
- **Cards carry one link.** The title's `<a>` is stretched over the whole card (`a::after { inset: 0 }`);
  photos and "View itinerary / Read more" are decorative (`aria-hidden`). Don't add a second link inside a card.
- **Shadows are tinted and layered** (`--shadow-sm … --shadow-xl`); use the tokens rather than ad-hoc `rgba(0,0,0,…)`.
- **Gold on light backgrounds** uses `--accent-text`; `--accent` is for fills and for text on dark surfaces.
- **Test layouts at a real viewport width.** `vh`/`svh` heroes behave differently under CSS `zoom`, so use a
  genuinely narrower window or an iframe when checking the hero.
- **Errors are inline (`role="alert"`)**, never `window.alert()`.
- `motion.js` holds the small physics helpers (spring with velocity handoff, momentum projection,
  rubber-banding) used by the mobile menu drag-to-dismiss.

## "From our feed" (home page)

`data/social.json` holds hand-picked posts from https://x.com/conservation_t; their photos live in
`public/images/social/` (copied, not hot-linked, so the page loads no third-party script and can't break
if a post is deleted). The static site can't read X live, so to refresh: add posts at the top of
`posts` (newest first) and drop the images into that folder. Time-limited promos shouldn't be added.

## Content to confirm

- Photos in `public/images/social/` came from X posts. Some look like professional wildlife photography —
  confirm the business has the right to use them.
- The Rwenzori summit photo is only 1125px wide, so it is soft as a full-width tour hero; swap in the
  original file if there is one.
- The banner photos in the pinned X post print different emails/phone numbers
  (`…@tripsandadventure.com`, +256 778 137 421 …) than this site. They weren't used; worth reconciling.

- `views/privacy.ejs` and `views/terms.ejs` are **drafts** written to match what the site actually
  does. They are not legal advice — have the owner (and counsel, if appropriate) review them.
- Business claims that appear in several places and should be checked by the owner:
  the "6 Countries" stat vs. the four countries listed in the copy, "15+ years" vs. "since 2008",
  and "1,000+ Gorillas Protected".
- `public.html` is a generated snapshot of the home page (`node scripts/export-html.js`); regenerate it
  after changing `views/index.ejs`.
- The blog posts in `data/posts.json` have placeholder `content` ("Full article content here..."), so every
  article page currently shows the same generic body text. Real articles need writing, then
  `views/blog-post.ejs` should render `post.content`.
- The "50+ Tour Packages" stat on the home page vs. the 11 tours in `data/tours.json`.
- Photo content to review: the safari vehicle in `safari.jpg` carries another operator's logo ("Wilderness
  Safaris") and a Tanzanian number plate; the Kibale chimpanzee tour uses the gorilla photo because there is
  no chimpanzee photo yet; only 5 hero photos + 6 social photos are shared across all tours, parks and posts.
- `public/images/` holds files nothing references: `logo.jpeg` (identical to `logonew.jpeg`),
  `east-africa-tourism.png`, `safaribookings.png`, `utb.png`, `uwa.png`, `iucn.svg`, `tripadvisor.svg`.
  Presumably intended for a partners strip — use them or delete them.
