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

## Known gaps

- The footer links to `/privacy` and `/terms`, but no such pages exist yet (they 404 in the dev server too).
