# Conservation Trips & Adventures

Express + EJS site that also compiles to plain static HTML, which is what GitHub Pages serves.

## Local development

```bash
npm install
npm run dev        # Express + nodemon on http://localhost:3000
```

## Static build

```bash
npm run build      # renders every page into dist/
```

The build is controlled by environment variables:

| Variable        | Default                           | Purpose |
| --------------- | --------------------------------- | ------- |
| `BASE_PATH`     | *(empty)*                         | URL prefix the site is served under, e.g. `/Conservation-Trips-New` for a Pages project site. Leave empty for a custom domain. |
| `SITE_URL`      | `https://tripsandadventures.co.ug` | Origin **including** the base path. Used for canonical / Open Graph URLs. |
| `FORM_ENDPOINT` | *(empty)*                         | Hosted form endpoint the booking form POSTs JSON to (e.g. `https://formspree.io/f/xxxxxxxx`). |

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

## Content to confirm

- `views/privacy.ejs` and `views/terms.ejs` are **drafts** written to match what the site actually
  does. They are not legal advice — have the owner (and counsel, if appropriate) review them.
- Business claims that appear in several places and should be checked by the owner:
  the "6 Countries" stat vs. the four countries listed in the copy, "15+ years" vs. "since 2008",
  and "1,000+ Gorillas Protected".
- `public.html` is a generated snapshot of the home page (`node scripts/export-html.js`); regenerate it
  after changing `views/index.ejs`.
