'use strict';

const express = require('express');
const pages = require('../lib/pages');
const data = require('../lib/data');
const { categoryUrl } = require('../lib/site');

const router = express.Router();

router.get('/', (req, res) => {
  // Old shared links: /tours?category=Gorilla+Trekking -> /tours/category/gorilla-trekking
  const legacy = req.query.category;
  if (legacy !== undefined) {
    const known = typeof legacy === 'string' && data.tourCategories.includes(legacy);
    return res.redirect(301, known ? categoryUrl('tours', legacy) : '/tours');
  }
  res.render('tours', pages.toursIndex());
});

router.get('/category/:slug', (req, res, next) => {
  const model = pages.toursCategory(req.params.slug);
  if (!model) return next();
  res.render('tours', model);
});

router.get('/:slug', (req, res, next) => {
  const model = pages.tourDetail(req.params.slug);
  if (!model) return next();
  res.render('tour-detail', model);
});

module.exports = router;
