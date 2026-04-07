const express = require('express');
const router = express.Router();
const tours = require('../data/tours.json');

// All tours listing
router.get('/', (req, res) => {
  const { category, duration } = req.query;
  let filteredTours = [...tours];
  
  if (category) {
    filteredTours = filteredTours.filter(t => t.category === category);
  }
  
  const categories = [...new Set(tours.map(t => t.category))];
  
  res.render('tours', {
    meta: {
      title: 'Our Safari Packages | Conservation Trips & Adventures Uganda',
      description: 'Browse all Uganda safari packages — gorilla trekking, wildlife safaris, mountain climbing, and cultural tours. Handpicked itineraries crafted by East Africa experts.',
      keywords: 'Uganda safari packages, gorilla trekking tours, wildlife safari Uganda, Kilimanjaro climbing, chimpanzee tracking',
      ogImage: '/images/gorilla.png',
      ogUrl: 'https://tripsandadventures.co.ug/tours'
    },
    tours: filteredTours,
    allTours: tours,
    categories,
    activeCategory: category || 'All'
  });
});

// Single tour detail
router.get('/:slug', (req, res, next) => {
  const tour = tours.find(t => t.slug === req.params.slug);
  if (!tour) return next();
  
  const relatedTours = tours.filter(t => t.slug !== tour.slug && t.category === tour.category).slice(0, 3);
  
  res.render('tour-detail', {
    meta: {
      title: tour.name + ' | Conservation Trips & Adventures Uganda',
      description: tour.summary.substring(0, 155),
      keywords: tour.name + ', Uganda safari, ' + tour.destinations.join(', '),
      ogImage: tour.image,
      ogUrl: 'https://tripsandadventures.co.ug/tours/' + tour.slug
    },
    tour,
    relatedTours,
    allTours: tours
  });
});

module.exports = router;
