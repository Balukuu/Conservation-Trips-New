const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('about', {
    meta: {
      title: 'About Us | Conservation Trips & Adventures Uganda',
      description: 'Learn about Conservation Trips & Adventures — Uganda\'s premier safari company crafting life-changing East Africa journeys since 2008. Conservation-first, locally owned.',
      keywords: 'about Conservation Trips Adventures, Uganda safari company, responsible tourism Uganda, East Africa tour operator',
      ogImage: '/images/safari.png',
      ogUrl: 'https://tripsandadventures.co.ug/about'
    }
  });
});

module.exports = router;
