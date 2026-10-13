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
const galleryData = require('../data/gallery.json');
const albums = require('./albums');
const teamData = require('../data/team.json');

const DEFAULT_IMAGE = '/images/safari.jpg';

// Hero slider
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
    eyebrow: 'Lake Mburo National Park',
    title: 'Zebras on the Open Plains',
    sub: "Uganda's closest savannah park to Kampala: zebra, impala, eland and buffalo, on game drives, on foot or on horseback",
    bg: '/images/photos/lake-mburo-zebras.webp',
    cta: { label: 'SEE WILDLIFE SAFARIS', href: '/tours/category/wildlife-safari' }
  },
  {
    eyebrow: 'Kikorongo Equator',
    title: 'Stand on the Equator',
    sub: 'Straddle two hemispheres at the Equator monuments of Kayabwe and Kikorongo, an easy stop on the road to the western parks',
    bg: '/images/photos/equator-kikorongo-wide.webp',
    cta: { label: 'SEE THE GALLERY', href: '/gallery' }
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

// "Find your kind of safari": one tile per tour category, with its real tour count
const CATEGORY_TILES = {
  'Gorilla Trekking': { label: 'Gorilla Trekking', icon: 'fa-paw', image: '/images/gorilla.jpg', position: '50% 30%' },
  'Wildlife Safari': { label: 'Wildlife Safaris', icon: 'fa-hippo', image: '/images/lion.jpg', position: '50% 40%' },
  'Boat Cruise': { label: 'Boat Cruises', icon: 'fa-ship', image: '/images/photos/kazinga-elephant.webp', position: '45% 30%' },
  'Mountain Climbing': { label: 'Mountain Climbs', icon: 'fa-mountain', image: '/images/social/rwenzori-margherita-peak.jpg', position: '50% 18%' },
  'Primate Safari': { label: 'Primate Tracking', icon: 'fa-tree', image: '/images/gorilla.jpg', position: '20% 25%' },
  'Cultural Tour': { label: 'Cultural Tours', icon: 'fa-masks-theater', image: '/images/gallery/tea-estates/pik_5818.webp', position: '50% 30%' }
};

function categoryTiles() {
  return Object.keys(CATEGORY_TILES)
    .filter(c => data.tourCategories.includes(c))
    .map(c => ({
      category: c,
      ...CATEGORY_TILES[c],
      href: categoryUrl('tours', c),
      count: data.tours.filter(t => t.category === c).length
    }));
}

// Photo bento on the home page: real frames from our own trips, each linking to its album.
// `shape` picks the grid cell (see home.css).
const MOMENTS = [
  { src: '/images/photos/equator-kikorongo-wide.webp', caption: 'Kikorongo Equator', href: '/gallery/kikorongo-equator', shape: 'feature' },
  { src: '/images/photos/lake-mburo-zebras.webp', caption: 'Zebras, Lake Mburo', href: '/gallery/lake-mburo-plains', shape: 'tile' },
  { src: '/images/photos/kazinga-hippos.webp', caption: 'Hippos on the Kazinga Channel', href: '/gallery/kazinga-cruise', shape: 'tall' },
  { src: '/images/photos/equator-kayabwe-staff-ring.webp', caption: 'Kayabwe Equator', href: '/gallery/kayabwe-equator', shape: 'tile' },
  { src: '/images/photos/kazinga-elephant.webp', caption: 'Elephant on the shore', href: '/gallery/kazinga-cruise', shape: 'wide' },
  { src: '/images/photos/lake-sunset-silhouette.webp', caption: 'Golden hour by the lake', href: '/gallery/lake-sunset', shape: 'tile' }
];

// Home page "from the road" mosaic: the cover of the staff-trip albums plus a few guest-trip frames
function photoStrip() {
  const order = ['kikorongo-equator', 'lake-mburo-plains', 'kazinga-cruise', 'kayabwe-equator', 'tea-estates', 'lake-sunset', 'the-coaster', 'lake-mburo-gate'];
  return order
    .map(slug => albums.bySlug.get(slug))
    .filter(Boolean)
    .map(a => ({ src: a.cover.src, title: a.title, href: '/gallery/' + a.slug, count: a.count }));
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
    featuredTours: data.featuredTours,
    testimonials: data.testimonials,
    social: data.social,
    ugandaParks: data.ugandaParks,
    latestPosts: data.posts.slice(0, 3),
    photoStrip: photoStrip(),
    categoryTiles: categoryTiles(),
    countries: data.destinations.map(d => ({
      slug: d.slug, name: d.name, subtitle: d.subtitle, tagline: d.tagline, image: d.image, tourCount: d.tourCount
    })),
    moments: MOMENTS,
    photoTotal: albums.list.reduce((n, a) => n + a.count, 0),
    rating: {
      average: data.testimonials.length ? data.testimonials.reduce((n, t) => n + (t.rating || 0), 0) / data.testimonials.length : 0,
      count: data.testimonials.length
    },
    pageStyles: ['/css/sections.css', '/css/home.css']
  };
}

// About page: staff photos for the "on the road" mosaic (see about.css for the shapes)
const CREW_PHOTOS = [
  { src: '/images/photos/coaster-guide-door.webp', shape: 'feature', caption: 'All aboard the safari coaster' },
  { src: '/images/photos/guide-portrait.webp', shape: 'tall', caption: 'In the field' },
  { src: '/images/photos/guides-trio-track.webp', shape: 'tile', caption: 'Guides on the track' },
  { src: '/images/photos/equator-kayabwe-staff-ring.webp', shape: 'tile', caption: 'Kayabwe Equator' },
  { src: '/images/photos/tea-estate-sign.webp', shape: 'wide', caption: 'Western Uganda tea estates' },
  { src: '/images/photos/lake-sunset-heart.webp', shape: 'tile', caption: 'Golden hour' }
];

function about() {
  return {
    meta: meta(
      '/about',
      `About Us | ${BRAND} Uganda`,
      "Learn about Conservation Trips & Adventures — Uganda's premier safari company crafting life-changing East Africa journeys since 2008. Conservation-first, locally owned.",
      'about Conservation Trips Adventures, Uganda safari company, responsible tourism Uganda, East Africa tour operator',
      '/images/photos/coaster-guides.webp'
    ),
    team: teamData,
    crew: CREW_PHOTOS,
    pageStyles: ['/css/sections.css', '/css/about.css']
  };
}

// Experiences page. `category` ties an experience to a tour category, so the page can say how
// many tours there really are; an experience without one links to `link`.
const EXPERIENCES = [
  {
    id: 'gorilla-trekking', icon: 'fa-paw', title: 'Gorilla Trekking', category: 'Gorilla Trekking', cta: 'See Gorilla Trekking Tours',
    subtitle: 'Bwindi Impenetrable Forest & Mgahinga',
    desc1: 'Trek into the misty forests of Bwindi or Mgahinga to spend one magical hour face-to-face with mountain gorilla families in the wild.',
    desc2: 'Our expert guides have decades of experience. Permits are limited — book early to secure your spot.',
    image: '/images/gorilla.jpg',
    highlights: ['Habituated gorilla families', '1 hour with the gorillas', 'Expert UWA certified guides', 'UNESCO World Heritage Forest', 'Gorilla tracking certificate']
  },
  {
    id: 'wildlife-safari', icon: 'fa-hippo', title: 'Wildlife Safari', category: 'Wildlife Safari', cta: 'See Wildlife Safari Tours',
    subtitle: 'Queen Elizabeth NP, Murchison Falls & Lake Mburo',
    desc1: "Game drives across Uganda's savannah parks: Queen Elizabeth, Murchison Falls, Lake Mburo — lions, elephants, hippos, giraffes and over 600 bird species.",
    desc2: "The Kazinga Channel boat cruise offers one of Africa's most spectacular wildlife viewing experiences — with exceptional hippo, crocodile and waterbird density.",
    image: '/images/social/elephant-mother-and-calves.jpg',
    highlights: ['Big Five game drives', 'Kazinga Channel cruise', 'Tree-climbing lions of Ishasha', '600+ bird species', 'Nile River boat trips']
  },
  {
    id: 'mountain-climbing', icon: 'fa-mountain', title: 'Mountain Adventures', category: 'Mountain Climbing', cta: 'See Mountain Climbing Tours',
    subtitle: 'Kilimanjaro, Rwenzori Mountains & Mount Kenya',
    desc1: 'Conquer Kilimanjaro, the Rwenzori Mountains of the Moon, or Mount Kenya — guided by our certified high-altitude experts.',
    desc2: 'Our certified mountaineering guides have led hundreds of successful summits with strong safety protocols throughout every ascent.',
    image: '/images/social/rwenzori-margherita-peak.jpg', imagePosition: '50% 16%',
    highlights: ['Mount Kilimanjaro 5,895m', 'Rwenzori Margherita Peak 5,109m', 'Mount Kenya 5,199m', 'Certified guides & porters', 'Full logistics included']
  },
  {
    id: 'cultural-tours', icon: 'fa-masks-theater', title: 'Cultural Tours', category: 'Cultural Tour', cta: 'See Cultural Tours',
    subtitle: 'Buganda, Ankole, Karamoja & Batwa Communities',
    desc1: 'Immerse in the kingdoms, traditions, and communities of Uganda — from Buganda to Karamoja, Ankole to Batwa.',
    desc2: 'Our cultural tours prioritise authentic, respectful engagement with local communities including traditional meals, storytelling and visits to royal palaces.',
    image: '/images/safari.jpg',
    highlights: ['Batwa forest community', 'Ankole long-horned cattle', 'Bunyoro royal palace', 'Traditional music & dance', 'Fort Portal crater lakes']
  },
  {
    id: 'birding', icon: 'fa-dove', title: 'Birding Safaris', link: '/tours', cta: 'Browse Our Tours',
    subtitle: '1,000+ Species — Shoebill & Albertine Rift Endemics',
    desc1: "Uganda is a birder's paradise with 1,000+ species. Spot the elusive shoebill, African green broadbill, and rare Albertine Rift endemics.",
    desc2: 'Our specialist birding guides take you to Mabamba swamp, Kibale Forest, and Bwindi for the finest birding Uganda offers.',
    image: '/images/safari.jpg',
    highlights: ['1,000+ bird species', 'Shoebill stork specialist trips', 'Mabamba swamp birding', 'Albertine Rift endemics', 'Expert naturalist guides']
  },
  {
    id: 'honeymoon', icon: 'fa-heart', title: 'Honeymoon Safaris', link: '/contact', cta: 'Plan a Honeymoon Safari',
    subtitle: 'Romantic Escapes Across East Africa',
    desc1: 'Sundowners on the savannah, candlelit dinners at forest lodges, private boat cruises, and gorilla trekking side by side.',
    desc2: 'We craft tailor-made romantic itineraries combining wildlife adventure with luxurious lodge stays and exclusive private experiences.',
    image: '/images/photos/lake-sunset-heart.webp',
    highlights: ['Private gorilla permits', 'Luxury lodge stays', 'Sundowner experiences', 'Private boat cruises', 'Surprise candlelit dinners']
  },
  {
    id: 'boat-cruises', icon: 'fa-ship', title: 'Boat Cruises', category: 'Boat Cruise', cta: 'See Boat Cruise Tours',
    subtitle: 'Kazinga Channel, Queen Elizabeth NP & the Nile at Murchison Falls',
    desc1: 'A launch cruise along the Kazinga Channel puts you at eye level with hippos, buffalo and elephants coming down to drink, with some of the richest birdlife in the park.',
    desc2: 'Cruises run on the Nile below Murchison Falls too. They are slow, comfortable and photographer-friendly, and make a calm break between game drives.',
    image: '/images/photos/kazinga-elephant.webp',
    highlights: ['Hippos, crocodiles and elephants from the water', 'Fish eagles, kingfishers and other waterbirds', 'Open decks for photography', 'Life jackets and a trained crew', 'A gentle break between game drives']
  },
  {
    id: 'equator', icon: 'fa-globe', title: 'The Equator', link: '/gallery#equator', cta: 'See the Equator Photos',
    subtitle: 'Kayabwe & Kikorongo monuments',
    desc1: 'Uganda sits astride the Equator, and the line is easy to cross on safari. The best-known monuments are the white ring at Kayabwe on the Masaka road and the mirror-steel globe at Kikorongo, beside Queen Elizabeth National Park.',
    desc2: 'We build a stop into your route, long enough for photographs with a foot in each hemisphere and a coffee or cold drink before you drive on.',
    image: '/images/photos/equator-kayabwe-staff-ring.webp',
    highlights: ['The Kayabwe ring on the Kampala–Masaka road', 'The Kikorongo globe near Queen Elizabeth NP', 'A foot in each hemisphere for the photo', 'An easy stop on the way to the western parks']
  }
];

function experiences() {
  const list = EXPERIENCES.map(e => ({
    ...e,
    link: e.category ? categoryUrl('tours', e.category) : e.link,
    tourCount: e.category ? data.tours.filter(t => t.category === e.category).length : 0
  }));
  return {
    meta: meta(
      '/experiences',
      `Safari Experiences | ${BRAND} Uganda`,
      'Gorilla trekking, wildlife safaris, mountain adventures, birding safaris, cultural tours, and honeymoon safaris across Uganda and East Africa.',
      'gorilla trekking, wildlife safari Uganda, mountain climbing Africa, birding Uganda, cultural tours Uganda',
      '/images/gorilla.jpg'
    ),
    experiences: list,
    pageStyles: ['/css/sections.css', '/css/experiences.css']
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
    travelYears: [now, now + 1, now + 2],
    pageStyles: ['/css/sections.css', '/css/contact.css']
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
    activeCategory,
    tabs: toursTabs(),
    toursStats: toursStats(),
    visibleCount: inCategory.length,
    pageStyles: ['/css/sections.css', '/css/tours.css']
  };
}

// Filter tabs for /tours: "All" plus one per category, each with its real tour count.
function toursTabs() {
  const tab = (category, label, count) => ({ category, label, count, href: categoryUrl('tours', category) });
  return [
    tab('All', 'All Safaris', data.tours.length),
    ...data.tourCategories.map(c => tab(c, c, data.tours.filter(t => t.category === c).length))
  ];
}

// The facts under the /tours heading, all read from the tour data.
function toursStats() {
  const days = data.tours.map(t => t.durationDays).filter(Number.isFinite);
  const prices = data.tours.map(t => t.priceUSD).filter(Number.isFinite);
  const countries = [...new Set(data.tours.flatMap(t => t.countries || []))];
  return {
    tours: data.tours.length,
    countries: countries.length,
    minDays: days.length ? Math.min(...days) : null,
    maxDays: days.length ? Math.max(...days) : null,
    fromPrice: prices.length ? Math.min(...prices) : null
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

  // The tour's hand-picked images first, then photos from our own journeys on
  // the same route (tour.galleryAlbums: [{ album, from?, to?, limit }]).
  const seen = new Set(tour.gallery || []);
  const gallery = [...(tour.gallery || [])];
  const galleryAlbums = [];
  for (const spec of tour.galleryAlbums || []) {
    const album = albums.bySlug.get(spec.album);
    if (!album) continue;
    const photos = albums.pick(spec).filter(p => !seen.has(p.src));
    if (!photos.length) continue;
    photos.forEach(p => { seen.add(p.src); gallery.push(p.src); });
    galleryAlbums.push({ slug: album.slug, title: album.title, count: album.count });
  }

  return {
    meta: meta(
      '/tours/' + tour.slug,
      `${tour.name} | ${BRAND}`,
      clip(tour.summary),
      `${tour.name}, Uganda safari, ${tour.destinations.join(', ')}`,
      tour.image
    ),
    tour,
    gallery,
    galleryAlbums,
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
  const categories = ['All', ...data.postCategories];
  return {
    meta: m,
    posts: data.posts, // all of them; see toursListing
    categories,
    activeCategory,
    tabs: categories.map(c => ({
      category: c,
      count: c === 'All' ? data.posts.length : data.posts.filter(p => p.category === c).length,
      href: categoryUrl('blog', c)
    })),
    visibleCount: activeCategory === 'All' ? data.posts.length : data.posts.filter(p => p.category === activeCategory).length,
    blogStats: { articles: data.posts.length, topics: data.postCategories.length },
    pageStyles: ['/css/sections.css', '/css/blog.css']
  };
}

function blogIndex() {
  return blogListing('All');
}

function blogCategory(slug) {
  const category = categoryFromSlug(slug, data.postCategories);
  return category ? blogListing(category) : null;
}

// The article body. posts.json `content` is plain text: blank lines separate paragraphs and a
// line starting "## " is a heading. While it is still the placeholder, every article shows the
// same general introduction instead.
const PLACEHOLDER_CONTENT = /^full article content here\.*$/i;
const GENERIC_BODY = [
  { type: 'p', text: "Planning the perfect Uganda safari requires insider knowledge. As East Africa's premier safari operator since 2008, Conservation Trips and Adventures has guided thousands of travellers through Uganda's extraordinary national parks and wilderness areas." },
  { type: 'p', text: 'Uganda — the Pearl of Africa — is home to half the world\'s remaining mountain gorillas, the chimpanzee capital of the world at Kibale Forest, and over 1,000 bird species. The country offers a diversity of wildlife experiences that few destinations can match.' },
  { type: 'h2', text: 'Getting the Most from Your Safari' },
  { type: 'p', text: "Whether you're tracking mountain gorillas in the misty forests of Bwindi, watching tree-climbing lions in Queen Elizabeth National Park, or cruising the Nile at Murchison Falls — timing, preparation, and expert guidance make all the difference." },
  { type: 'p', text: 'Our team of certified guides and naturalists are available to answer any questions and craft your personalised itinerary. We respond to all enquiries within 24 hours and require no payment at the enquiry stage.' }
];

function postBody(post) {
  const raw = String(post.content || '').trim();
  if (!raw || PLACEHOLDER_CONTENT.test(raw)) return GENERIC_BODY;
  return raw.split(/\n{2,}/).map(b => b.trim()).filter(Boolean)
    .map(b => (b.startsWith('## ') ? { type: 'h2', text: b.slice(3).trim() } : { type: 'p', text: b }));
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
    articleBody: postBody(post), // not `body`: the layout owns that name
    related: data.relatedPosts(post),
    pageStyles: ['/css/sections.css', '/css/blog.css']
  };
}

// What each park card links to: the tours whose `destinations` name the park, shortest first.
function parksWithTours(parks) {
  return (parks || []).map(park => {
    const matches = data.tours.filter(t => (t.destinations || []).includes(park.name))
      .sort((a, b) => a.durationDays - b.durationDays);
    return {
      ...park,
      tourCount: matches.length,
      tours: matches.slice(0, 2).map(t => ({ slug: t.slug, name: t.name, duration: t.duration }))
    };
  });
}

function destinationsIndex() {
  const uganda = data.destinations.find(d => d.id === 'uganda');
  const parks = parksWithTours(uganda && uganda.parks);
  return {
    meta: meta(
      '/destinations',
      `Uganda's National Parks & East Africa Destinations | ${BRAND}`,
      "Explore Uganda's stunning national parks and East Africa's greatest wildlife destinations. Bwindi, Queen Elizabeth, Kibale, Murchison Falls, Kidepo, and more.",
      'Uganda national parks, safari destinations East Africa, Bwindi gorillas, Queen Elizabeth NP, Kibale chimps, African wildlife'
    ),
    destinations: data.destinations,
    parks,
    destStats: { countries: data.destinations.length, parks: parks.length, tours: data.tours.length },
    pageStyles: ['/css/sections.css', '/css/destinations.css']
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
    parks: parksWithTours(dest.parks),
    tours: data.toursForCountry(dest.name),
    allTours: data.tours,
    pageStyles: ['/css/sections.css', '/css/destinations.css']
  };
}

function galleryAlbumCard(a) {
  return { slug: a.slug, title: a.title, blurb: a.blurb, count: a.count, guests: a.guests, cover: a.cover.src, coverAlt: a.alt, href: '/gallery/' + a.slug };
}

function gallery() {
  const list = albums.list.map(galleryAlbumCard);
  const total = list.reduce((n, a) => n + a.count, 0);
  return {
    meta: meta(
      '/gallery',
      `Safari Photo Gallery | ${BRAND}`,
      'Photographs from our own journeys across Uganda: the Equator monuments at Kayabwe and Kikorongo, zebras and impala at Lake Mburo, hippos and elephants on the Kazinga Channel.',
      'Uganda safari photos, Uganda equator Kayabwe Kikorongo, Lake Mburo zebras, Kazinga Channel hippos, Queen Elizabeth National Park',
      '/images/photos/equator-kikorongo-wide.webp'
    ),
    sections: galleryData.sections,
    albums: list,
    photoTotal: total
  };
}

function galleryAlbum(slug) {
  const album = albums.bySlug.get(slug);
  if (!album) return null;
  const index = albums.list.indexOf(album);
  const near = i => albums.list[(i + albums.list.length) % albums.list.length];
  return {
    meta: meta(
      '/gallery/' + album.slug,
      `${album.title}: Photos | ${BRAND}`,
      clip(`${album.blurb} ${album.count} photographs from our own journeys in Uganda.`),
      `${album.title}, Uganda safari photos, ${BRAND}`,
      album.og
    ),
    album,
    prev: albums.list.length > 1 ? galleryAlbumCard(near(index - 1)) : null,
    next: albums.list.length > 1 ? galleryAlbumCard(near(index + 1)) : null
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
  home, about, experiences, gallery, galleryAlbum, contact, privacy, terms,
  toursIndex, toursCategory, tourDetail, blogIndex, blogCategory, blogPost, destinationsIndex, destination,
  notFound, serverError
};
