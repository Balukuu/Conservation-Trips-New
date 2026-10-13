'use strict';

/*
 * Photo albums (data/albums.json: what each album is; data/album-photos.json:
 * which frames `npm run albums` kept). Each photo has two encoded sizes, a
 * 400 px thumbnail and a 1100 px version, and a logical `src` that
 * lib/images.js registers so image({ src }) works for album photos anywhere.
 */

const config = require('../data/albums.json');
const kept = require('../data/album-photos.json');

const numberOf = stem => Number((stem.match(/(\d+)$/) || [])[1] || 0);

const list = config.albums
  .filter(a => !a.hidden && kept[a.slug] && kept[a.slug].length)
  .map(a => {
    const items = kept[a.slug].map(([stem, width, height, score]) => ({
      stem,
      number: numberOf(stem),
      width,
      height,
      score,
      album: a.slug,
      src: `/images/gallery/${a.slug}/${stem}.webp`,
      thumb: `/images/gallery/${a.slug}/${stem}-400.webp`,
      full: `/images/gallery/${a.slug}/${stem}-1100.webp`
    }));
    const cover = items.find(i => i.stem === a.cover) || items[0];
    return {
      slug: a.slug,
      title: a.title,
      blurb: a.blurb,
      alt: a.alt,
      guests: Boolean(a.guests),
      hidden: Boolean(a.hidden),
      og: `/images/gallery/${a.slug}/og.jpg`,
      count: items.length,
      items,
      cover
    };
  });

const bySlug = new Map(list.map(a => [a.slug, a]));
const byStem = new Map(list.flatMap(a => a.items.map(i => [i.stem, i])));

/*
 * pick({ album, from, to, limit }) -> photos of one album whose frame number is
 * in [from, to]. With `limit`, the sharpest `limit` of them, in frame order.
 */
function pick({ album, from = 0, to = Infinity, limit = Infinity }) {
  const a = bySlug.get(album);
  if (!a) return [];
  const inRange = a.items.filter(i => i.number >= from && i.number <= to);
  const chosen = inRange.length > limit ? [...inRange].sort((x, y) => y.score - x.score).slice(0, limit) : inRange;
  return chosen.sort((x, y) => x.number - y.number);
}

module.exports = { list, bySlug, byStem, pick };
