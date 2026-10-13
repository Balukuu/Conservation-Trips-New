'use strict';

const express = require('express');
const pages = require('../lib/pages');

const router = express.Router();

router.get('/', (req, res) => res.render('gallery', pages.gallery()));

router.get('/:album', (req, res, next) => {
  const model = pages.galleryAlbum(req.params.album);
  if (!model) return next();
  res.render('gallery-album', model);
});

module.exports = router;
