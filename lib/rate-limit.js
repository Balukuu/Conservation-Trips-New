'use strict';

/*
 * Minimal in-memory rate limiter (per client IP, sliding window). Enough to
 * stop a form being used as a mail cannon on a single Node process; it is not
 * shared between processes or restarts.
 *
 * Behind a proxy, set `trust proxy` (see app.js) so req.ip is the visitor.
 */
function rateLimit({ windowMs, max, message }) {
  const hits = new Map(); // ip -> timestamps (ms) inside the window

  const sweep = setInterval(() => {
    const cutoff = Date.now() - windowMs;
    for (const [ip, times] of hits) {
      if (times[times.length - 1] <= cutoff) hits.delete(ip);
    }
  }, windowMs);
  sweep.unref(); // never keep the process alive just for housekeeping

  return function limiter(req, res, next) {
    const now = Date.now();
    const times = (hits.get(req.ip) || []).filter(t => t > now - windowMs);

    if (times.length >= max) {
      res.set('Retry-After', String(Math.ceil((times[0] + windowMs - now) / 1000)));
      return res.status(429).json({ success: false, message });
    }

    times.push(now);
    hits.set(req.ip, times);
    next();
  };
}

module.exports = rateLimit;
