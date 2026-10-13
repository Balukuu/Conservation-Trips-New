'use strict';

const express = require('express');
const pages = require('../lib/pages');

const router = express.Router();

router.get('/', (req, res) => res.render('index', pages.home()));

// Legal pages (linked from the footer, the cookie notice and the contact form)
router.get('/privacy', (req, res) => res.render('privacy', pages.privacy()));
router.get('/terms', (req, res) => res.render('terms', pages.terms()));

module.exports = router;
