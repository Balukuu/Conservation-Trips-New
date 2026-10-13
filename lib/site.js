'use strict';

/*
 * Site-wide constants and helpers shared by the Express server and the static
 * build (scripts/build.js), so both render identical markup.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const BRAND = 'Conservation Trips & Adventures';

// Origin (including any base path) used for canonical / Open Graph / share URLs.
const siteUrl = (process.env.SITE_URL || 'https://tripsandadventures.co.ug').replace(/\/+$/, '');

/*
 * assetUrl('/css/main.css') -> '/css/main.css?v=3f9a1c20be'
 *
 * The version is a hash of the file's content, so a changed stylesheet or
 * script gets a new URL and the old one can be cached "forever". Unknown paths
 * come back unchanged. Versions are memoised: forever in production, and by
 * mtime elsewhere so edits show up without a restart.
 */
const versions = new Map();
const memoiseForever = process.env.NODE_ENV === 'production';

function assetUrl(url) {
  const file = path.join(PUBLIC_DIR, url);
  const hit = versions.get(url);
  if (hit && memoiseForever) return hit.url;

  let mtime;
  try {
    mtime = fs.statSync(file).mtimeMs;
  } catch (err) {
    return url;
  }
  if (hit && hit.mtime === mtime) return hit.url;

  const hash = crypto.createHash('sha1').update(fs.readFileSync(file)).digest('hex').slice(0, 10);
  const entry = { url: url + '?v=' + hash, mtime };
  versions.set(url, entry);
  return entry.url;
}

// Trim to a meta-description length without cutting a word in half.
function clip(text, max = 155) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  return s.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
}

// "Gorilla Trekking" -> "gorilla-trekking"
function slugify(text) {
  return String(text || '')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// Path of a category listing: categoryUrl('tours', 'Gorilla Trekking') -> '/tours/category/gorilla-trekking'
// ('All' is the section's own index.)
function categoryUrl(section, category) {
  return category === 'All' ? '/' + section : `/${section}/category/${slugify(category)}`;
}

module.exports = { BRAND, PUBLIC_DIR, siteUrl, assetUrl, clip, slugify, categoryUrl };
