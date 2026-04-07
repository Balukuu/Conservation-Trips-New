const express = require('express');
const router = express.Router();

const blogPosts = [
  {
    id: 1,
    slug: 'best-time-gorilla-trekking-uganda',
    title: 'The Best Time to Go Gorilla Trekking in Uganda',
    category: 'Gorilla Trekking',
    date: 'March 15, 2025',
    author: 'Conservation Trips Team',
    readTime: '6 min read',
    excerpt: 'Planning a gorilla trek in Bwindi? Timing is everything. We break down the dry and wet seasons to help you plan the perfect visit to Bwindi Impenetrable Forest — including permit availability tips.',
    image: '/images/gorilla.png',
    content: 'Full article content here...'
  },
  {
    id: 2,
    slug: 'uganda-packing-list-safari',
    title: 'The Ultimate Uganda Safari Packing List',
    category: 'Travel Tips',
    date: 'February 22, 2025',
    author: 'Conservation Trips Team',
    readTime: '8 min read',
    excerpt: 'From gorilla trekking clothes to savannah game drive essentials — here is everything you need to pack for the perfect Uganda safari, from what to wear in the forest to camera gear recommendations.',
    image: '/images/safari.png',
    content: 'Full article content here...'
  },
  {
    id: 3,
    slug: 'tree-climbing-lions-ishasha',
    title: "Uganda's Incredible Tree-Climbing Lions of Ishasha",
    category: 'Wildlife',
    date: 'January 10, 2025',
    author: 'Conservation Trips Team',
    readTime: '5 min read',
    excerpt: "One of Africa's most extraordinary wildlife sightings — lions lounging in fig trees. We explore the Ishasha sector of Queen Elizabeth National Park where this unique behaviour has been observed for generations.",
    image: '/images/lion.png',
    content: 'Full article content here...'
  },
  {
    id: 4,
    slug: 'murchison-falls-complete-guide',
    title: 'Murchison Falls: The Complete Safari Guide',
    category: 'Wildlife',
    date: 'December 5, 2024',
    author: 'Conservation Trips Team',
    readTime: '7 min read',
    excerpt: "Uganda's largest national park contains the world's most powerful waterfall and some of East Africa's most exciting game viewing. Here is everything you need to know to plan your Murchison Falls safari.",
    image: '/images/waterfall.png',
    content: 'Full article content here...'
  },
  {
    id: 5,
    slug: 'conservation-ugandas-mountain-gorillas',
    title: "Conservation: Protecting Uganda's Endangered Mountain Gorillas",
    category: 'Conservation',
    date: 'November 18, 2024',
    author: 'Conservation Trips Team',
    readTime: '9 min read',
    excerpt: "Mountain gorillas were once on the brink of extinction. Today, thanks to sustained conservation efforts and community-based tourism, their population is slowly growing. Here's how responsible travel contributes.",
    image: '/images/gorilla.png',
    content: 'Full article content here...'
  },
  {
    id: 6,
    slug: 'kilimanjaro-machame-route-guide',
    title: 'Climbing Kilimanjaro: The Machame Route Guide',
    category: 'Mountain Adventures',
    date: 'October 30, 2024',
    author: 'Conservation Trips Team',
    readTime: '10 min read',
    excerpt: "The Machame Route — known as the 'Whiskey Route' — is Africa's most scenic Kilimanjaro trail. We share what to expect, how to train, and why this is the best route for most climbers aiming for Uhuru Peak.",
    image: '/images/safari.png',
    content: 'Full article content here...'
  }
];

router.get('/', (req, res) => {
  const { category } = req.query;
  let filtered = [...blogPosts];
  if (category && category !== 'All') {
    filtered = filtered.filter(p => p.category === category);
  }
  const categories = ['All', ...new Set(blogPosts.map(p => p.category))];
  
  res.render('blog', {
    meta: {
      title: 'Safari Insights & Travel Tips | Conservation Trips & Adventures',
      description: 'Uganda safari guides, travel tips, gorilla trekking advice, and conservation news from East Africa\'s premier safari company.',
      keywords: 'Uganda safari tips, gorilla trekking guide, Kilimanjaro climbing, East Africa travel blog, conservation Uganda',
      ogImage: '/images/gorilla.png',
      ogUrl: 'https://tripsandadventures.co.ug/blog'
    },
    posts: filtered,
    categories,
    activeCategory: category || 'All'
  });
});

router.get('/:slug', (req, res, next) => {
  const post = blogPosts.find(p => p.slug === req.params.slug);
  if (!post) return next();
  
  const related = blogPosts.filter(p => p.slug !== post.slug).slice(0, 3);
  
  res.render('blog-post', {
    meta: {
      title: post.title + ' | Conservation Trips & Adventures',
      description: post.excerpt.substring(0, 155),
      keywords: post.category + ', Uganda safari, East Africa travel',
      ogImage: post.image,
      ogUrl: 'https://tripsandadventures.co.ug/blog/' + post.slug
    },
    post,
    related
  });
});

module.exports = router;
