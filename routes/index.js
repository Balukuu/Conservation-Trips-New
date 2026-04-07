const express = require('express');
const router = express.Router();
const tours = require('../data/tours.json');
const testimonials = require('../data/testimonials.json');
const destinations = require('../data/destinations.json');

router.get('/', (req, res) => {
  const featuredTours = tours.filter(t => t.featured);
  const ugandaDest = destinations.find(d => d.id === 'uganda');
  
  res.render('index', {
    meta: {
      title: 'Conservation Trips & Adventures | Uganda Safari & East Africa Tours',
      description: "Uganda's premier safari & adventure travel company. Gorilla trekking, wildlife safaris, mountain climbing, and cultural tours across East Africa. Crafting life-changing journeys since 2008.",
      keywords: 'gorilla trekking Uganda, Uganda safaris, Bwindi gorillas, Queen Elizabeth National Park, chimpanzee tracking Kibale, Murchison Falls safari, East Africa tours',
      ogImage: '/images/safari.png',
      ogUrl: 'https://tripsandadventures.co.ug/'
    },
    featuredTours,
    testimonials,
    ugandaParks: ugandaDest ? ugandaDest.parks : []
  });
});

module.exports = router;
