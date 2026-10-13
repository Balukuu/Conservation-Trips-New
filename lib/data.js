'use strict';

/*
 * Content loaded once from /data, plus the lookups derived from it.
 * Treat everything exported here as read-only: the objects are shared between
 * requests.
 */

const tours = require('../data/tours.json');
const posts = require('../data/posts.json');
const testimonials = require('../data/testimonials.json');
const social = require('../data/social.json');
const rawDestinations = require('../data/destinations.json');

// A tour belongs to every country listed in its `countries`.
function toursForCountry(name) {
  return tours.filter(t => (t.countries || []).includes(name));
}

// tourCount is derived so the "N tours available" badges can't drift from the
// real catalogue.
const destinations = rawDestinations.map(d => ({ ...d, tourCount: toursForCountry(d.name).length }));

const tourBySlug = new Map(tours.map(t => [t.slug, t]));
const postBySlug = new Map(posts.map(p => [p.slug, p]));
const destinationBySlug = new Map(destinations.map(d => [d.slug, d]));

const tourCategories = [...new Set(tours.map(t => t.category))];
const postCategories = [...new Set(posts.map(p => p.category))];

// Same-category tours first, topped up with other tours so the "You may also
// like" strip is never empty for a category that only has one tour.
function relatedTours(tour, limit = 3) {
  const others = tours.filter(t => t.slug !== tour.slug);
  const same = others.filter(t => t.category === tour.category);
  const rest = others.filter(t => t.category !== tour.category);
  return same.concat(rest).slice(0, limit);
}

function relatedPosts(post, limit = 3) {
  return posts.filter(p => p.slug !== post.slug).slice(0, limit);
}

module.exports = {
  tours,
  posts,
  testimonials,
  social,
  destinations,
  tourBySlug,
  postBySlug,
  destinationBySlug,
  tourCategories,
  postCategories,
  toursForCountry,
  relatedTours,
  relatedPosts,
  featuredTours: tours.filter(t => t.featured),
  ugandaParks: (destinations.find(d => d.id === 'uganda') || {}).parks || []
};
