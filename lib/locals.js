'use strict';

/*
 * Helpers every template can call. The Express app puts these on app.locals;
 * scripts/build.js and scripts/export-html.js spread them into each render.
 */

const { siteUrl, assetUrl, categoryUrl } = require('./site');
const { image, og, initials } = require('./images');

module.exports = {
  siteUrl,
  assetUrl,
  categoryUrl,
  image,
  ogImageFor: og,
  initials
};
