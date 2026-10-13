'use strict';

const express = require('express');
const pages = require('../lib/pages');
const data = require('../lib/data');
const { categoryUrl } = require('../lib/site');

const router = express.Router();

router.get('/', (req, res) => {
  // Old shared links: /blog?category=Travel%20Tips -> /blog/category/travel-tips
  const legacy = req.query.category;
  if (legacy !== undefined) {
    const known = typeof legacy === 'string' && data.postCategories.includes(legacy);
    return res.redirect(301, known ? categoryUrl('blog', legacy) : '/blog');
  }
  res.render('blog', pages.blogIndex());
});

router.get('/category/:slug', (req, res, next) => {
  const model = pages.blogCategory(req.params.slug);
  if (!model) return next();
  res.render('blog', model);
});

router.get('/:slug', (req, res, next) => {
  const model = pages.blogPost(req.params.slug);
  if (!model) return next();
  res.render('blog-post', model);
});

module.exports = router;
