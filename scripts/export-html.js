'use strict';

// Writes public.html: a single-file snapshot of the home page.
// Run after changing views/index.ejs:  node scripts/export-html.js
const ejs = require('ejs');
const fs = require('fs');
const path = require('path');

const viewLocals = require('../lib/locals');
const pages = require('../lib/pages');

const viewsDir = path.join(__dirname, '..', 'views');
const outputFile = path.join(__dirname, '..', 'public.html');

try {
  console.log('🚀 Starting static HTML export...');

  const locals = { ...pages.home(), ...viewLocals, staticBuild: true, formEndpoint: '' };
  const viewFile = path.join(viewsDir, 'index.ejs');
  const layoutFile = path.join(viewsDir, 'layouts', 'main.ejs');

  const body = ejs.render(fs.readFileSync(viewFile, 'utf8'), locals, { filename: viewFile });
  const html = ejs.render(fs.readFileSync(layoutFile, 'utf8'), { ...locals, body }, { filename: layoutFile });

  fs.writeFileSync(outputFile, html);
  console.log(`✅ Success! Static homepage compiled to: ${outputFile}`);
} catch (err) {
  console.error('❌ Error during export:', err);
  process.exit(1);
}
