const ejs = require('ejs');
const fs = require('fs');
const path = require('path');

// Deployment target
//   BASE_PATH    URL prefix the site is served under. '' for a custom domain or a
//                user/org site; '/<repo>' for a GitHub Pages project site.
//   SITE_URL     Absolute origin + base path, used for canonical/og URLs.
//   FORM_ENDPOINT  Optional hosted form endpoint (Formspree, Web3Forms, ...) that
//                the booking form POSTs to, since Pages has no server.
function normalizeBasePath(p) {
  const trimmed = (p || '').trim().replace(/^\/+|\/+$/g, '');
  return trimmed ? '/' + trimmed : '';
}

const basePath = normalizeBasePath(process.env.BASE_PATH);
const siteUrl = (process.env.SITE_URL || 'https://tripsandadventures.co.ug').replace(/\/+$/, '');
const formEndpoint = (process.env.FORM_ENDPOINT || '').trim();

// Configuration
const config = {
  viewsDir: path.join(__dirname, '..', 'views'),
  dataDir: path.join(__dirname, '..', 'data'),
  publicDir: path.join(__dirname, '..', 'public'),
  distDir: path.join(__dirname, '..', 'dist'),
  baseUrl: siteUrl
};

let failures = 0;

// Load Data
const tours = JSON.parse(fs.readFileSync(path.join(config.dataDir, 'tours.json'), 'utf8'));
const testimonials = JSON.parse(fs.readFileSync(path.join(config.dataDir, 'testimonials.json'), 'utf8'));
const destinations = JSON.parse(fs.readFileSync(path.join(config.dataDir, 'destinations.json'), 'utf8'));
const blogPosts = JSON.parse(fs.readFileSync(path.join(config.dataDir, 'posts.json'), 'utf8'));

// Helper: Ensure directory exists
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Helper: Copy directory
function copyDir(src, dest) {
  ensureDir(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Helper: Re-root absolute paths
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
    // og:image / twitter:image must be absolute URLs for crawlers
    .replace(/(<meta\s+(?:property="og:image"|name="twitter:image")\s+content=")\/(?!\/)([^"]*)"/g,
      (_, pre, p) => `${pre}${config.baseUrl}/${p}"`);
}

// Helper: Render Page
async function renderPage(viewName, outputPath, data = {}) {
  const fullOutputPath = path.join(config.distDir, outputPath);
  ensureDir(path.dirname(fullOutputPath));

  const templateData = {
    ...data,
    meta: {
      title: 'Conservation Trips & Adventures',
      description: 'Uganda Safari & East Africa Tours',
      keywords: '',
      ogImage: '/images/safari.png',
      // Pages serves "/tours" by redirecting to "/tours/", so canonical URLs carry the slash.
      ogUrl: config.baseUrl + '/' + outputPath.replace(/(^|\/)index\.html$/, '$1'),
      ...data.meta
    },
    staticBuild: true,
    formEndpoint,
    filename: path.join(config.viewsDir, viewName + '.ejs')
  };

  try {
    // 1. Render content body
    const bodyHtml = await ejs.renderFile(path.join(config.viewsDir, viewName + '.ejs'), templateData);

    // 2. Render layout
    const finalHtml = await ejs.renderFile(path.join(config.viewsDir, 'layouts', 'main.ejs'), {
      ...templateData,
      body: bodyHtml,
      filename: path.join(config.viewsDir, 'layouts', 'main.ejs')
    });

    fs.writeFileSync(fullOutputPath, applyBasePath(finalHtml));
    console.log(`  ✅ Generated: ${outputPath}`);
  } catch (err) {
    console.error(`  ❌ Failed to render ${viewName}:`, err.message);
    failures++;
  }
}

async function build() {
  console.log('🚀 Starting Static Site Build...\n');
  console.log(`   base path : ${basePath || '(root)'}`);
  console.log(`   site url  : ${siteUrl}`);
  console.log(`   form      : ${formEndpoint || '(none — mailto fallback)'}\n`);

  // 1. Clean & Prepare Dist
  if (fs.existsSync(config.distDir)) {
    fs.rmSync(config.distDir, { recursive: true, force: true });
  }
  ensureDir(config.distDir);

  // 2. Copy Assets
  console.log('📂 Copying public assets...');
  copyDir(config.publicDir, config.distDir);

  // 3. Render Static Pages
  console.log('\n📄 Rendering Static Pages...');
  
  // Home
  const featuredTours = tours.filter(t => t.featured);
  const ugandaDest = destinations.find(d => d.id === 'uganda');
  await renderPage('index', 'index.html', {
    meta: {
      title: 'Conservation Trips & Adventures | Uganda Safari & East Africa Tours',
      description: "Uganda's premier safari & adventure travel company. Gorilla trekking, wildlife safaris, mountain climbing, and cultural tours across East Africa."
    },
    featuredTours,
    testimonials,
    ugandaParks: ugandaDest ? ugandaDest.parks : []
  });

  // About
  await renderPage('about', 'about/index.html', {
    meta: { title: 'About Us | Conservation Trips & Adventures' }
  });

  // Contact
  await renderPage('contact', 'contact/index.html', {
    meta: { title: 'Contact Us | Conservation Trips & Adventures' }
  });

  // Tours Index
  const categories = [...new Set(tours.map(t => t.category))];
  await renderPage('tours', 'tours/index.html', {
    meta: { title: 'Our Safari Packages | Conservation Trips & Adventures' },
    tours: tours,
    allTours: tours,
    categories,
    activeCategory: 'All'
  });

  // Blog Index
  const blogCats = ['All', ...new Set(blogPosts.map(p => p.category))];
  await renderPage('blog', 'blog/index.html', {
    meta: { title: 'Safari Insights & Travel Tips | Conservation Trips & Adventures' },
    posts: blogPosts,
    categories: blogCats,
    activeCategory: 'All'
  });

  // Destinations Index
  await renderPage('destinations', 'destinations/index.html', {
    meta: { title: "Uganda's National Parks & Destinations | Conservation Trips & Adventures" },
    destinations
  });

  // Experiences (if exists)
  await renderPage('experiences', 'experiences/index.html', {
    meta: { title: 'Authentic Safari Experiences | Conservation Trips & Adventures' }
  });

  // Legal
  await renderPage('privacy', 'privacy/index.html', {
    meta: {
      title: 'Privacy Policy | Conservation Trips & Adventures',
      description: 'How Conservation Trips & Adventures collects, uses and protects your personal information when you enquire about a Uganda safari.'
    }
  });
  await renderPage('terms', 'terms/index.html', {
    meta: {
      title: 'Terms of Service | Conservation Trips & Adventures',
      description: 'The terms for using the Conservation Trips & Adventures website and for sending a safari enquiry.'
    }
  });

  // 404
  await renderPage('404', '404.html', {
    meta: { title: 'Page Not Found | Conservation Trips & Adventures' }
  });

  // 4. Render Dynamic Tours
  console.log('\n🐆 Rendering Dynamic Tour Pages...');
  for (const tour of tours) {
    const relatedTours = tours.filter(t => t.slug !== tour.slug && t.category === tour.category).slice(0, 3);
    await renderPage('tour-detail', `tours/${tour.slug}/index.html`, {
      meta: {
        title: `${tour.name} | Conservation Trips & Adventures`,
        description: tour.summary.substring(0, 155),
        ogImage: tour.image
      },
      tour,
      relatedTours,
      allTours: tours
    });
  }

  // 5. Render Dynamic Blog Posts
  console.log('\n✍️ Rendering Dynamic Blog Posts...');
  for (const post of blogPosts) {
    const related = blogPosts.filter(p => p.slug !== post.slug).slice(0, 3);
    await renderPage('blog-post', `blog/${post.slug}/index.html`, {
      meta: {
        title: `${post.title} | Conservation Trips & Adventures`,
        description: post.excerpt.substring(0, 155),
        ogImage: post.image
      },
      post,
      related
    });
  }

  // 6. Render Dynamic Destinations
  console.log('\n🌍 Rendering Dynamic Destination Pages...');
  for (const dest of destinations) {
    const countryTours = tours.filter(t => 
      t.destinations.some(d => d.toLowerCase().includes(dest.name.toLowerCase()))
    );
    await renderPage('destination-country', `destinations/${dest.slug}/index.html`, {
      meta: {
        title: `${dest.name} Safari Tours | Conservation Trips & Adventures`,
        description: dest.description.substring(0, 155),
        ogImage: dest.image
      },
      dest,
      tours: countryTours,
      allTours: tours
    });
  }

  if (failures > 0) {
    console.error(`\n❌ Build finished with ${failures} failed page(s).\n`);
    process.exitCode = 1;
    return;
  }

  console.log('\n✨ Build Complete! Static site available in /dist\n');
}

build().catch(err => {
  console.error(err);
  process.exit(1);
});
