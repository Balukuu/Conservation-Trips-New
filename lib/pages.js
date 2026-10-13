'use strict';

/*
 * One place that says, for every page, which view to render and with what.
 * routes/*.js call these per request; scripts/build.js calls them once per
 * page to write dist/. Keeping the SEO copy here means the two can't diverge.
 *
 * Every view model carries `meta.path` (the site-relative URL); the layout
 * turns that into the canonical / og:url, so nothing here hard-codes a domain.
 * The functions that look something up return null when it doesn't exist.
 */

const { BRAND, clip, slugify, categoryUrl } = require('./site');
const data = require('./data');

const DEFAULT_IMAGE = '/images/safari.jpg';

// Hero slider. The first slide is the page's largest image, so it is also
// preloaded (it is a CSS background, which the browser would otherwise find late).
const HERO_SLIDES = [
  {
    eyebrow: 'Murchison Falls National Park',
    title: 'Murchison Falls Awaits',
    sub: "The World's Most Powerful Waterfall",
    bg: '/images/waterfall.jpg'
  },
  {
    eyebrow: 'Bwindi Impenetrable Forest',
    title: 'Face to Face with Mountain Gorillas',
    sub: "Trek through ancient rainforest for a once-in-a-lifetime encounter with Africa's most magnificent primates",
    bg: '/images/gorilla.jpg'
  },
  {
    eyebrow: 'Queen Elizabeth National Park',
    title: 'Where the Savanna Meets the Forest',
    sub: 'Witness the rare tree-climbing lions and cruise the legendary Kazinga Channel teeming with wildlife',
    bg: '/images/lion.jpg'
  },
  {
    eyebrow: 'Kibale Forest',
    title: 'Track Our Closest Relatives',
    sub: "Uganda is home to the world's greatest concentration of habituated chimpanzees in Kibale Forest",
    bg: '/images/safari.jpg'
  }
];

function meta(path, title, description, keywords, ogImage) {
  return { path, title, description, keywords: keywords || '', ogImage: ogImage || DEFAULT_IMAGE };
}

// URL slug -> category name ('gorilla-trekking' -> 'Gorilla Trekking'), or null.
function categoryFromSlug(slug, categories) {
  return categories.find(c => slugify(c) === slug) || null;
}

function home() {
  return {
    meta: meta(
      '/',
      `${BRAND} | Uganda Safari & East Africa Tours`,
      "Uganda's premier safari & adventure travel company. Gorilla trekking, wildlife safaris, mountain climbing, and cultural tours across East Africa. Crafting life-changing journeys since 2008.",
      'gorilla trekking Uganda, Uganda safaris, Bwindi gorillas, Queen Elizabeth National Park, chimpanzee tracking Kibale, Murchison Falls safari, East Africa tours'
    ),
    slides: HERO_SLIDES,
    extraHead: `<link rel="preload" as="image" href="${HERO_SLIDES[0].bg}" fetchpriority="high">`,
    featuredTours: data.featuredTours,
    testimonials: data.testimonials,
    social: data.social,
    ugandaParks: data.ugandaParks,
    latestPosts: data.posts.slice(0, 3),
    useFlags: true // the destinations strip uses flag-icons, which no other page needs
  };
}

function about() {
  return {
    meta: meta(
      '/about',
      `About Us | ${BRAND} Uganda`,
      "Learn about Conservation Trips & Adventures — Uganda's premier safari company crafting life-changing East Africa journeys since 2008. Conservation-first, locally owned.",
      'about Conservation Trips Adventures, Uganda safari company, responsible tourism Uganda, East Africa tour operator'
    )
  };
}

function experiences() {
  return {
    meta: meta(
      '/experiences',
      `Safari Experiences | ${BRAND} Uganda`,
      'Gorilla trekking, wildlife safaris, mountain adventures, birding safaris, cultural tours, and honeymoon safaris across Uganda and East Africa.',
      'gorilla trekking, wildlife safari Uganda, mountain climbing Africa, birding Uganda, cultural tours Uganda',
      '/images/gorilla.jpg'
    )
  };
}

function contact() {
  const now = new Date().getFullYear();
  return {
    meta: meta(
      '/contact',
      `Contact & Book | ${BRAND} Uganda`,
      'Plan your Uganda safari with Conservation Trips & Adventures. Contact us for custom itineraries, gorilla permits, booking enquiries. We respond within 24 hours.',
      'contact Conservation Trips Adventures, safari booking Uganda, gorilla permit booking, custom safari enquiry',
      '/images/gorilla.jpg'
    ),
    tours: data.tours,
    travelYears: [now, now + 1, now + 2]
  };
}

function privacy() {
  return {
    meta: meta(
      '/privacy',
      `Privacy Policy | ${BRAND}`,
      'How Conservation Trips & Adventures collects, uses and protects your personal information when you enquire about a Uganda safari.',
      'privacy policy, Conservation Trips Adventures'
    )
  };
}

function terms() {
  return {
    meta: meta(
      '/terms',
      `Terms of Service | ${BRAND}`,
      'The terms for using the Conservation Trips & Adventures website and for sending a safari enquiry.',
      'terms of service, Conservation Trips Adventures'
    )
  };
}

// Every tour is rendered; the ones outside `activeCategory` are just `hidden`.
// That keeps the client-side filter working on a category page (switching tab
// needs the other cards) while the URL and the first paint show one category.
function toursListing(activeCategory) {
  const inCategory = activeCategory === 'All' ? data.tours : data.tours.filter(t => t.category === activeCategory);
  const itineraries = inCategory.length === 1 ? '1 handpicked itinerary' : `${inCategory.length} handpicked itineraries`;
  const m = activeCategory === 'All'
    ? meta(
        '/tours',
        `Our Safari Packages | ${BRAND} Uganda`,
        'Browse all Uganda safari packages — gorilla trekking, wildlife safaris, mountain climbing, and cultural tours. Handpicked itineraries crafted by East Africa experts.',
        'Uganda safari packages, gorilla trekking tours, wildlife safari Uganda, Kilimanjaro climbing, chimpanzee tracking',
        '/images/gorilla.jpg'
      )
    : meta(
        categoryUrl('tours', activeCategory),
        `${activeCategory} Packages | ${BRAND}`,
        `Browse our ${activeCategory.toLowerCase()} packages in Uganda and East Africa — ${itineraries} crafted by local experts.`,
        `${activeCategory}, Uganda safari packages, East Africa tours`,
        inCategory[0].image
      );
  return {
    meta: m,
    tours: data.tours,
    allTours: data.tours,
    categories: data.tourCategories,
    activeCategory
  };
}

function toursIndex() {
  return toursListing('All');
}

function toursCategory(slug) {
  const category = categoryFromSlug(slug, data.tourCategories);
  return category ? toursListing(category) : null;
}

function tourDetail(slug) {
  const tour = data.tourBySlug.get(slug);
  if (!tour) return null;
  return {
    meta: meta(
      '/tours/' + tour.slug,
      `${tour.name} | ${BRAND}`,
      clip(tour.summary),
      `${tour.name}, Uganda safari, ${tour.destinations.join(', ')}`,
      tour.image
    ),
    tour,
    relatedTours: data.relatedTours(tour),
    allTours: data.tours
  };
}

function blogListing(activeCategory) {
  const m = activeCategory === 'All'
    ? meta(
        '/blog',
        `Safari Insights & Travel Tips | ${BRAND}`,
        "Uganda safari guides, travel tips, gorilla trekking advice, and conservation news from East Africa's premier safari company.",
        'Uganda safari tips, gorilla trekking guide, Kilimanjaro climbing, East Africa travel blog, conservation Uganda',
        '/images/gorilla.jpg'
      )
    : meta(
        categoryUrl('blog', activeCategory),
        `${activeCategory} Articles | ${BRAND}`,
        `Safari insights, guides and stories about ${activeCategory.toLowerCase()} from East Africa's premier safari company.`,
        `${activeCategory}, Uganda safari blog, East Africa travel`,
        data.posts.find(p => p.category === activeCategory).image
      );
  return {
    meta: m,
    posts: data.posts, // all of them; see toursListing
    categories: ['All', ...data.postCategories],
    activeCategory
  };
}

function blogIndex() {
  return blogListing('All');
}

function blogCategory(slug) {
  const category = categoryFromSlug(slug, data.postCategories);
  return category ? blogListing(category) : null;
}

function blogPost(slug) {
  const post = data.postBySlug.get(slug);
  if (!post) return null;
  return {
    meta: meta(
      '/blog/' + post.slug,
      `${post.title} | ${BRAND}`,
      clip(post.excerpt),
      `${post.category}, Uganda safari, East Africa travel`,
      post.image
    ),
    post,
    related: data.relatedPosts(post)
  };
}

function destinationsIndex() {
  return {
    meta: meta(
      '/destinations',
      `Uganda's National Parks & East Africa Destinations | ${BRAND}`,
      "Explore Uganda's stunning national parks and East Africa's greatest wildlife destinations. Bwindi, Queen Elizabeth, Kibale, Murchison Falls, Kidepo, and more.",
      'Uganda national parks, safari destinations East Africa, Bwindi gorillas, Queen Elizabeth NP, Kibale chimps, African wildlife'
    ),
    destinations: data.destinations
  };
}

function destination(slug) {
  const dest = data.destinationBySlug.get(slug);
  if (!dest) return null;
  return {
    meta: meta(
      '/destinations/' + dest.slug,
      `${dest.name} Safari Tours | ${BRAND}`,
      clip(dest.description),
      `${dest.name} safari, ${dest.subtitle}, East Africa tours`,
      dest.image
    ),
    dest,
    tours: data.toursForCountry(dest.name),
    allTours: data.tours
  };
}

function notFound() {
  return {
    meta: { title: `Page Not Found | ${BRAND}`, description: 'The page you are looking for could not be found.', keywords: '', ogImage: DEFAULT_IMAGE }
  };
}

function serverError() {
  return {
    meta: { title: `Server Error | ${BRAND}`, description: 'Something went wrong on our side.', keywords: '', ogImage: DEFAULT_IMAGE }
  };
}

module.exports = {
  home, about, experiences, contact, privacy, terms,
  toursIndex, toursCategory, tourDetail, blogIndex, blogCategory, blogPost, destinationsIndex, destination,
  notFound, serverError
};
