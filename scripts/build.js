'use strict';

const ejs = require('ejs');
const fs = require('fs');
const path = require('path');

const { siteUrl, slugify, PUBLIC_DIR } = require('../lib/site');
const viewLocals = require('../lib/locals');
const images = require('../lib/images');
const data = require('../lib/data');
const pages = require('../lib/pages');

// Deployment target
//   BASE_PATH    URL prefix the site is served under. '' for a custom domain or a
//                user/org site; '/<repo>' for a GitHub Pages project site.
//   SITE_URL     Absolute origin + base path, used for canonical/og URLs
//                (read by lib/site.js).
//   FORM_ENDPOINT  Optional hosted form endpoint (Formspree, Web3Forms, ...) that
//                the booking form POSTs to, since Pages has no server.
function normalizeBasePath(p) {
  const trimmed = (p || '').trim().replace(/^\/+|\/+$/g, '');
  return trimmed ? '/' + trimmed : '';
}

const basePath = normalizeBasePath(process.env.BASE_PATH);
const formEndpoint = (process.env.FORM_ENDPOINT || '').trim();

const VIEWS_DIR = path.join(__dirname, '..', 'views');
const DIST_DIR = path.join(__dirname, '..', 'dist');

let failures = 0;

// Re-root absolute paths
// Templates use plain "/css/main.css"-style paths so the Express dev server and the
// static build share one source. For a Pages project site those must live under
// BASE_PATH, so rewrite them in the rendered HTML. Page links also get a trailing
// slash, which avoids a redirect hop for "/tours" -> "/tours/" on GitHub Pages.
const FILE_EXT = /\.[a-z0-9]{1,5}$/i;

function prefixPath(url, isPage) {
  const [, pathname, rest] = url.match(/^([^?#]*)(.*)$/);
  const slashed = isPage && !pathname.endsWith('/') && !FILE_EXT.test(pathname) ? pathname + '/' : pathname;
  return basePath + slashed + rest;
}

function applyBasePath(html) {
  return html
    // <a href="/x">, <img src="/x">, <form action="/x">, and onerror="this.src='/x'"
    .replace(/\b(href|src|action|poster)=(["'])\/(?!\/)([^"']*)\2/g,
      (_, attr, q, p) => `${attr}=${q}${prefixPath('/' + p, attr === 'href')}${q}`)
    // style="background-image:url('/x')"
    .replace(/url\((["']?)\/(?!\/)([^"')]*)\1\)/g,
      (_, q, p) => `url(${q}${prefixPath('/' + p, false)}${q})`)
    // srcset="/a-320.webp 320w, /a-640.webp 640w"
    .replace(/\b(srcset|imagesrcset)="([^"]*)"/g, (_, attr, list) =>
      `${attr}="${list.split(',').map(c => c.trim().replace(/^\/(?!\/)(\S*)/, (m, p) => prefixPath('/' + p, false))).join(', ')}"`);
}

// Render one view model to dist/<outputPath>
function renderPage(view, outputPath, model) {
  const viewFile = path.join(VIEWS_DIR, view + '.ejs');
  const layoutFile = path.join(VIEWS_DIR, 'layouts', 'main.ejs');

  const locals = {
    useFlags: false,
    ...model,
    ...viewLocals,
    staticBuild: true,
    formEndpoint
  };

  try {
    // 1. the view's body, 2. wrapped in the layout (which receives it as `body`)
    const body = ejs.render(fs.readFileSync(viewFile, 'utf8'), locals, { filename: viewFile });
    const html = ejs.render(fs.readFileSync(layoutFile, 'utf8'), { ...locals, body }, { filename: layoutFile });

    const target = path.join(DIST_DIR, outputPath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, applyBasePath(html));
    console.log(`  ✅ Generated: ${outputPath}`);
  } catch (err) {
    console.error(`  ❌ Failed to render ${view} → ${outputPath}:`, err.message);
    failures++;
  }
}

// Every internal link and asset in the output must resolve to a file in dist/.
// Cheap, and it catches a typo'd slug or a missing image before it ships.
function checkInternalLinks() {
  const missing = new Map();
  const seen = new Set();

  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.html')) check(full);
    }
  })(DIST_DIR);

  function exists(urlPath) {
    const rel = decodeURIComponent(urlPath).replace(/^\/+/, '');
    const abs = path.join(DIST_DIR, rel);
    if (!abs.startsWith(DIST_DIR)) return false;
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return true;
    return fs.existsSync(path.join(abs, 'index.html'));
  }

  function check(file) {
    const html = fs.readFileSync(file, 'utf8');
    // href/src, plus every URL inside srcset
    const urls = [...html.matchAll(/\b(?:href|src)="(\/[^"#?]*)/g)].map(m => m[1]);
    for (const m of html.matchAll(/\bsrcset="([^"]*)"/g)) {
      for (const candidate of m[1].split(',')) {
        const url = candidate.trim().split(/\s+/)[0];
        if (url.startsWith('/')) urls.push(url);
      }
    }
    for (let p of urls) {
      if (p.startsWith('//')) continue;
      if (basePath && p.startsWith(basePath + '/')) p = p.slice(basePath.length);
      else if (basePath && p === basePath) p = '/';
      if (seen.has(p)) continue;
      seen.add(p);
      if (!exists(p)) missing.set(p, path.relative(DIST_DIR, file));
    }
  }

  for (const [url, from] of missing) {
    console.error(`  ❌ Broken link ${url} (first seen in ${from})`);
    failures++;
  }
}

// Every local image that was rendered must be registered (alt text + generated
// sizes), and a gallery shouldn't show the same photo twice.
function checkImages() {
  for (const src of images.unregistered) {
    console.error(`  ❌ ${src} is used but not in data/images.json / data/image-manifest.json (add it, then npm run images)`);
    failures++;
  }
  for (const tour of data.tours) {
    const dupes = tour.gallery.filter((src, i) => tour.gallery.indexOf(src) !== i);
    if (dupes.length) {
      console.error(`  ❌ ${tour.slug}: gallery repeats ${[...new Set(dupes)].join(', ')}`);
      failures++;
    }
  }
}

function build() {
  console.log('🚀 Starting Static Site Build...\n');
  console.log(`   base path : ${basePath || '(root)'}`);
  console.log(`   site url  : ${siteUrl}`);
  console.log(`   form      : ${formEndpoint || '(none — mailto fallback)'}\n`);

  // 1. Clean & copy assets
  fs.rmSync(DIST_DIR, { recursive: true, force: true });
  console.log('📂 Copying public assets...');
  fs.cpSync(PUBLIC_DIR, DIST_DIR, { recursive: true });

  // 2. Static pages
  console.log('\n📄 Rendering Static Pages...');
  renderPage('index', 'index.html', pages.home());
  renderPage('about', 'about/index.html', pages.about());
  renderPage('contact', 'contact/index.html', pages.contact());
  renderPage('tours', 'tours/index.html', pages.toursIndex());
  renderPage('blog', 'blog/index.html', pages.blogIndex());
  renderPage('destinations', 'destinations/index.html', pages.destinationsIndex());
  renderPage('experiences', 'experiences/index.html', pages.experiences());
  renderPage('gallery', 'gallery/index.html', pages.gallery());
  renderPage('privacy', 'privacy/index.html', pages.privacy());
  renderPage('terms', 'terms/index.html', pages.terms());
  renderPage('404', '404.html', pages.notFound());

  // 3. One page per tour / post / destination
  console.log('\n🐆 Rendering Dynamic Tour Pages...');
  for (const tour of data.tours) {
    renderPage('tour-detail', `tours/${tour.slug}/index.html`, pages.tourDetail(tour.slug));
  }
  for (const category of data.tourCategories) {
    const slug = slugify(category);
    renderPage('tours', `tours/category/${slug}/index.html`, pages.toursCategory(slug));
  }

  console.log('\n✍️ Rendering Dynamic Blog Posts...');
  for (const post of data.posts) {
    renderPage('blog-post', `blog/${post.slug}/index.html`, pages.blogPost(post.slug));
  }
  for (const category of data.postCategories) {
    const slug = slugify(category);
    renderPage('blog', `blog/category/${slug}/index.html`, pages.blogCategory(slug));
  }

  console.log('\n🌍 Rendering Dynamic Destination Pages...');
  for (const dest of data.destinations) {
    renderPage('destination-country', `destinations/${dest.slug}/index.html`, pages.destination(dest.slug));
  }

  console.log('\n🖼️  Checking images...');
  checkImages();

  console.log('\n🔗 Checking internal links...');
  checkInternalLinks();

  if (failures > 0) {
    console.error(`\n❌ Build finished with ${failures} problem(s).\n`);
    process.exitCode = 1;
    return;
  }

  console.log('\n✨ Build Complete! Static site available in /dist\n');
}

try {
  build();
} catch (err) {
  console.error(err);
  process.exit(1);
}
