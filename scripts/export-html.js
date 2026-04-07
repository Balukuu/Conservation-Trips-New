const ejs = require('ejs');
const fs = require('fs');
const path = require('path');

// Paths
const viewsDir = path.join(__dirname, '..', 'views');
const dataDir = path.join(__dirname, '..', 'data');
const outputFile = path.join(__dirname, '..', 'public.html');

// Load Data
const tours = JSON.parse(fs.readFileSync(path.join(dataDir, 'tours.json'), 'utf8'));
const testimonials = JSON.parse(fs.readFileSync(path.join(dataDir, 'testimonials.json'), 'utf8'));
const destinations = JSON.parse(fs.readFileSync(path.join(dataDir, 'destinations.json'), 'utf8'));

const featuredTours = tours.filter(t => t.featured);
const ugandaDest = destinations.find(d => d.id === 'uganda');
const ugandaParks = ugandaDest ? ugandaDest.parks : [];

// Template Data
const templateData = {
  meta: {
    title: 'Conservation Trips & Adventures | Uganda Safari & East Africa Tours',
    description: "Uganda's premier safari & adventure travel company. Gorilla trekking, wildlife safaris, mountain climbing, and cultural tours across East Africa. Crafting life-changing journeys since 2008.",
    keywords: 'gorilla trekking Uganda, Uganda safaris, Bwindi gorillas, Queen Elizabeth National Park, chimpanzee tracking Kibale, Murchison Falls safari, East Africa tours',
    ogImage: '/images/safari.png',
    ogUrl: 'https://tripsandadventures.co.ug/'
  },
  featuredTours,
  testimonials,
  ugandaParks,
  // Helper for partials if needed, though EJS handles relative paths
  filename: path.join(viewsDir, 'index.ejs') 
};

async function build() {
  try {
    console.log('🚀 Starting static HTML export...');

    // 1. Render the body (index.ejs)
    const bodyHtml = await ejs.renderFile(path.join(viewsDir, 'index.ejs'), templateData);

    // 2. Render the layout with the body
    const finalHtml = await ejs.renderFile(path.join(viewsDir, 'layouts', 'main.ejs'), {
      ...templateData,
      body: bodyHtml,
      filename: path.join(viewsDir, 'layouts', 'main.ejs')
    });

    // 3. Save to file
    fs.writeFileSync(outputFile, finalHtml);

    console.log(`✅ Success! Static homepage compiled to: ${outputFile}`);
  } catch (err) {
    console.error('❌ Error during export:', err);
    process.exit(1);
  }
}

build();
