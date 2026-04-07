const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('experiences', {
    meta: {
      title: 'Safari Experiences | Conservation Trips & Adventures Uganda',
      description: 'Gorilla trekking, wildlife safaris, mountain adventures, birding safaris, cultural tours, and honeymoon safaris across Uganda and East Africa.',
      keywords: 'gorilla trekking, wildlife safari Uganda, mountain climbing Africa, birding Uganda, cultural tours Uganda',
      ogImage: '/images/gorilla.png',
      ogUrl: 'https://tripsandadventures.co.ug/experiences'
    }
  });
});

module.exports = router;
