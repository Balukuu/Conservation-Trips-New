require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Middleware
app.use(morgan('dev'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Routes
app.use('/', require('./routes/index'));
app.use('/tours', require('./routes/tours'));
app.use('/destinations', require('./routes/destinations'));
app.use('/about', require('./routes/about'));
app.use('/contact', require('./routes/contact'));
app.use('/blog', require('./routes/blog'));
app.use('/experiences', require('./routes/experiences'));

// 404 Handler
app.use((req, res) => {
  res.status(404).render('404', {
    layout: 'layouts/main',
    meta: {
      title: 'Page Not Found | Conservation Trips & Adventures',
      description: 'The page you are looking for could not be found.',
      keywords: 'Conservation Trips Adventures Uganda safari',
      ogImage: '/images/safari.png',
      ogUrl: 'https://tripsandadventures.co.ug/404'
    }
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('404', {
    layout: 'layouts/main',
    meta: {
      title: 'Server Error | Conservation Trips & Adventures',
      description: 'An error occurred.',
      keywords: '',
      ogImage: '/images/safari.png',
      ogUrl: ''
    }
  });
});

app.listen(PORT, () => {
  console.log('\n🌿 Conservation Trips & Adventures server running on http://localhost:' + PORT);
  console.log('📍 Uganda Safari & East Africa Tours\n');
});

module.exports = app;
