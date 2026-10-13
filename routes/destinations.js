'use strict';

const express = require('express');
const pages = require('../lib/pages');

const router = express.Router();

router.get('/', (req, res) => res.render('destinations', pages.destinationsIndex()));

router.get('/:slug', (req, res, next) => {
  const model = pages.destination(req.params.slug);
  if (!model) return next();
  res.render('destination-country', model);
});

module.exports = router;
