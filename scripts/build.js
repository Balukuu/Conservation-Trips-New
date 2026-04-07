const ejs = require('ejs');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  viewsDir: path.join(__dirname, '..', 'views'),
  dataDir: path.join(__dirname, '..', 'data'),
  publicDir: path.join(__dirname, '..', 'public'),
  distDir: path.join(__dirname, '..', 'dist'),
  baseUrl: 'https://tripsandadventures.co.ug'
};

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
      ogUrl: config.baseUrl + (outputPath === 'index.html' ? '' : '/' + outputPath.replace('/index.html', '')),
      ...data.meta
    },
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

    fs.writeFileSync(fullOutputPath, finalHtml);
    console.log(`  ✅ Generated: ${outputPath}`);
  } catch (err) {
    console.error(`  ❌ Failed to render ${viewName}:`, err.message);
  }
}

async function build() {
  console.log('🚀 Starting Static Site Build...\n');

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

  console.log('\n✨ Build Complete! Static site available in /dist\n');
}

build();
