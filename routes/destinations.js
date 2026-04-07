const express = require('express');
const router = express.Router();
const destinations = require('../data/destinations.json');
const tours = require('../data/tours.json');

router.get('/', (req, res) => {
  res.render('destinations', {
    meta: {
      title: "Uganda's National Parks & East Africa Destinations | Conservation Trips & Adventures",
      description: "Explore Uganda's stunning national parks and East Africa's greatest wildlife destinations. Bwindi, Queen Elizabeth, Kibale, Murchison Falls, Kidepo, and more.",
      keywords: 'Uganda national parks, safari destinations East Africa, Bwindi gorillas, Queen Elizabeth NP, Kibale chimps, African wildlife',
      ogImage: '/images/safari.png',
      ogUrl: 'https://tripsandadventures.co.ug/destinations'
    },
    destinations
  });
});

router.get('/:country', (req, res, next) => {
  const dest = destinations.find(d => d.slug === req.params.country);
  if (!dest) return next();
  
  const countryTours = tours.filter(t => 
    t.destinations.some(d => d.toLowerCase().includes(dest.name.toLowerCase()))
  );
  
  res.render('destination-country', {
    meta: {
      title: dest.name + ' Safari Tours | Conservation Trips & Adventures',
      description: dest.description.substring(0, 155),
      keywords: dest.name + ' safari, ' + dest.subtitle + ', East Africa tours',
      ogImage: dest.image,
      ogUrl: 'https://tripsandadventures.co.ug/destinations/' + dest.slug
    },
    dest,
    tours: countryTours,
    allTours: tours
  });
});

module.exports = router;
