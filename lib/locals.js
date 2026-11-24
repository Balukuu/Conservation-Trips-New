'use strict';

/*
 * Helpers every template can call. The Express app puts these on app.locals;
 * scripts/build.js and scripts/export-html.js spread them into each render.
 */

const { siteUrl, assetUrl, categoryUrl } = require('./site');
const { image, og, initials, manifest } = require('./images');
const { tripDates, money, lowestPrice } = require('./trips');

module.exports = {
  siteUrl,
  assetUrl,
  categoryUrl,
  tripDates,
  money,
  lowestPrice,
  image,
  ogImageFor: og,
  initials,
  imageInfo: src => manifest[src] || null
};
