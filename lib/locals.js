'use strict';

/*
 * Helpers every template can call. The Express app puts these on app.locals;
 * scripts/build.js and scripts/export-html.js spread them into each render.
 */

const { siteUrl, assetUrl, categoryUrl } = require('./site');
const { image, og, initials, manifest } = require('./images');
const { tripDates, money, lowestPrice } = require('./trips');

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// "Christmas in the Wild: Queen Elizabeth National Park" -> two phrases that wrap as units,
// so a long place name isn't cut in the middle ("Queen / Elizabeth National Park"). Returns HTML.
function splitTitle(name) {
  const i = String(name).indexOf(': ');
  if (i < 0) return esc(name);
  return `<span class="t-part">${esc(name.slice(0, i + 1))}</span> <span class="t-part">${esc(name.slice(i + 2))}</span>`;
}

module.exports = {
  siteUrl,
  assetUrl,
  categoryUrl,
  splitTitle,
  tripDates,
  money,
  lowestPrice,
  image,
  ogImageFor: og,
  initials,
  imageInfo: src => manifest[src] || null
};
