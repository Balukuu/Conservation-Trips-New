'use strict';

/*
 * The Express app, without a listener (see server.js), so it can be required
 * by tests or another entry point without binding a port.
 */

require('dotenv').config();

const express = require('express');
const compression = require('compression');
const morgan = require('morgan');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');

const { PUBLIC_DIR } = require('./lib/site');
const locals = require('./lib/locals');
const cleanUrls = require('./lib/clean-urls');
const pages = require('./lib/pages');

const isProduction = process.env.NODE_ENV === 'production';
const app = express();

app.disable('x-powered-by');

// Production sits behind nginx / Passenger. Without this every visitor appears
// to come from the proxy's address (which breaks per-IP rate limiting).
// TRUST_PROXY overrides it: a hop count, "true", "false" or a subnet name.
const trustProxy = process.env.TRUST_PROXY;
if (trustProxy !== undefined && trustProxy !== '') {
  app.set('trust proxy', /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy === 'true' ? true : trustProxy === 'false' ? false : trustProxy);
} else if (isProduction) {
  app.set('trust proxy', 1);
}

// View engine. Views keep their own <script>/<style> blocks (JSON-LD lives in
// index.ejs), so layout "extract" is deliberately off — the layout has no
// placeholder for extracted blocks and they would silently disappear.
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// Available to every view and to the layout
Object.assign(app.locals, locals);
app.locals.staticBuild = false;
app.locals.formEndpoint = '';
app.locals.useFlags = false;

app.use(compression());

app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
  });
  next();
});

// Static files. CSS/JS are referenced through assetUrl() (content-hashed), so
// they can be cached for a year; images keep stable names, so a shorter lease.
app.use(express.static(PUBLIC_DIR, {
  maxAge: isProduction ? '30d' : 0,
  setHeaders(res, file) {
    if (isProduction && /\.(css|js)$/.test(file)) {
      res.set('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

// Files above are served as-is; every page URL below has exactly one spelling.
app.use(cleanUrls);

app.use(morgan(isProduction ? 'combined' : 'dev'));

// Forms post small payloads; anything larger is not an enquiry.
app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: false, limit: '20kb' }));

app.use('/', require('./routes/index'));
app.use('/tours', require('./routes/tours'));
app.use('/destinations', require('./routes/destinations'));
app.use('/about', require('./routes/about'));
app.use('/contact', require('./routes/contact'));
app.use('/blog', require('./routes/blog'));
app.use('/experiences', require('./routes/experiences'));

app.use((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(404).json({ success: false, message: 'Not found.' });
  }
  res.status(404).render('404', pages.notFound());
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  const status = err.status >= 400 && err.status < 600 ? err.status : 500;
  if (status >= 500) console.error(err.stack || err);

  // Form posts are fetch() calls expecting JSON, not a page.
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const message = status === 413 ? 'That message is too long.' : status < 500 ? 'We could not read that request.' : 'Something went wrong on our side. Please try again.';
    return res.status(status).json({ success: false, message });
  }
  res.status(status).render('404', pages.serverError());
});

module.exports = app;
