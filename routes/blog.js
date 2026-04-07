const express = require('express');
const router = express.Router();
const blogPosts = require('../data/posts.json');

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
