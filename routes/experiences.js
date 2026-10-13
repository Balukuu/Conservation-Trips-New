'use strict';

const express = require('express');
const pages = require('../lib/pages');

const router = express.Router();

router.get('/', (req, res) => res.render('experiences', pages.experiences()));

module.exports = router;
