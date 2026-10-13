'use strict';

/*
 * One address per page. Variants that would otherwise serve the same content
 * under a second URL are redirected (301) to the canonical form:
 *
 *   /Tours   -> /tours          (lower case)
 *   /tours/  -> /tours          (no trailing slash)
 *   /about.html, /index.html    -> /about, /
 *   //tours  -> /tours
 *
 * Runs after express.static, so real files are never touched. GET/HEAD only:
 * a redirect would turn a form POST into a GET.
 */
module.exports = function cleanUrls(req, res, next) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();

  const url = req.originalUrl;
  const q = url.indexOf('?');
  const pathname = q === -1 ? url : url.slice(0, q);
  const query = q === -1 ? '' : url.slice(q);

  // Browsers read "/\host" as "//host": never build a Location from that.
  if (/\\|%5c/i.test(pathname)) return next();

  let clean = pathname
    .replace(/\/index\.html$/i, '/')
    .replace(/\.html$/i, '')
    .replace(/\/{2,}/g, '/')
    .replace(/%[0-9a-f]{2}|[A-Z]/gi, m => (m[0] === '%' ? m : m.toLowerCase()));
  if (clean.length > 1) clean = clean.replace(/\/+$/, '');
  if (!clean.startsWith('/')) return next();

  if (clean !== pathname) return res.redirect(301, clean + query);
  next();
};
