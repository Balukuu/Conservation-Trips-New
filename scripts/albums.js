'use strict';

/*
 * npm run albums
 *
 * Turns the web-format photo library (tRIPS-web: one WebP per frame) into the
 * site's photo albums:
 *
 *   1. assigns every frame to an album by its number (data/albums.json),
 *   2. drops corrupt (grey-filled), near-black/white and the blurriest frames,
 *   3. collapses runs of near-identical frames (bursts) to the sharpest one,
 *   4. encodes two sizes per photo:  public/images/gallery/<album>/<id>-400.webp
 *                                    public/images/gallery/<album>/<id>-1100.webp
 *   5. writes data/album-photos.json (the list the site reads).
 *
 * The encoded files and the JSON are committed, so CI and production never need
 * the library or sharp. Point PHOTO_LIBRARY at the folder if it is elsewhere
 * (default: ../tRIPS-web, next to this repository). Existing outputs are kept;
 * pass --force to re-encode everything.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

sharp.cache(false);
sharp.concurrency(2);

const ROOT = path.join(__dirname, '..');
const LIBRARY = path.resolve(process.env.PHOTO_LIBRARY || path.join(ROOT, '..', 'tRIPS-web'));
const OUT = path.join(ROOT, 'public', 'images', 'gallery');
const MANIFEST = path.join(ROOT, 'data', 'album-photos.json');
const FORCE = process.argv.includes('--force');

const THUMB = { width: 400, quality: 62 };
const FULL = { width: 1100, quality: 66 };

const config = require('../data/albums.json');
const DEDUPE = config.dedupe || 22; // max dHash distance (of 64 bits) between frames of one burst

// pik_5286 / abz_0720 -> folder in the library; doreen* are edited frames from TOUR
const folderOf = stem => (stem.startsWith('abz_') ? 'wildlife-photos' : 'tour');
const numberOf = stem => Number((stem.match(/(\d+)$/) || [])[1] || 0);

function hamming(a, b) {
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
  return d;
}

async function analyse(stem) {
  const file = path.join(LIBRARY, folderOf(stem), stem + '.webp');
  if (!fs.existsSync(file)) return null;
  try {
    const meta = await sharp(file).metadata();

    // 9x8 difference hash: structure of the frame, indifferent to small changes
    const g = await sharp(file).greyscale().resize(9, 8, { fit: 'fill' }).raw().toBuffer();
    let hash = '';
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) hash += g[y * 9 + x] > g[y * 9 + x + 1] ? '1' : '0';

    // sharpness: spread of a Laplacian-filtered copy
    const lap = await sharp(file).resize({ width: 512, withoutEnlargement: true }).greyscale()
      .convolve({ width: 3, height: 3, kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0], scale: 1, offset: 128 }).stats();

    // exposure, and the flat mid-grey a damaged preview leaves behind
    const px = await sharp(file).resize(96, 96, { fit: 'inside' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const n = px.info.width * px.info.height;
    const c = px.info.channels;
    let grey = 0;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const r = px.data[i * c], gg = px.data[i * c + 1], b = px.data[i * c + 2];
      sum += (r + gg + b) / 3;
      if (Math.abs(r - 128) <= 2 && Math.abs(gg - 128) <= 2 && Math.abs(b - 128) <= 2) grey++;
    }
    return { stem, file, width: meta.width, height: meta.height, hash, sharp: lap.channels[0].stdev, bright: sum / n, grey: grey / n };
  } catch (err) {
    console.warn('  skipped (unreadable):', stem);
    return null;
  }
}

function frameStems(album) {
  const stems = [];
  for (const [prefix, from, to] of album.frames || []) {
    const dir = path.join(LIBRARY, prefix === 'abz' ? 'wildlife-photos' : 'tour');
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      const m = f.match(new RegExp('^' + prefix + '_(\\d+)\\.webp$'));
      if (m && Number(m[1]) >= from && Number(m[1]) <= to) stems.push(f.replace(/\.webp$/, ''));
    }
  }
  for (const s of album.include || []) stems.push(s);
  return [...new Set(stems)].filter(s => !(album.exclude || []).includes(s)).sort((a, b) => numberOf(a) - numberOf(b));
}

function pick(frames, album) {
  const usable = frames.filter(f => f.grey < 0.06 && f.bright > 22 && f.bright < 240);
  const floor = usable.map(f => f.sharp).sort((a, b) => a - b)[Math.floor(usable.length * 0.06)] || 0;
  const good = usable.filter(f => f.sharp >= floor || f.stem === album.cover);

  // consecutive frames that look alike form one burst
  const bursts = [];
  let current = [];
  for (const f of good) {
    if (current.length && hamming(current[current.length - 1].hash, f.hash) > DEDUPE) {
      bursts.push(current);
      current = [];
    }
    current.push(f);
  }
  if (current.length) bursts.push(current);

  const keep = new Set();
  for (const burst of bursts) {
    const ranked = [...burst].sort((a, b) => b.sharp - a.sharp);
    keep.add(ranked[0].stem);
    // a long burst earns a second frame, at least three frames away from the first
    if (burst.length >= 7) {
      const second = ranked.find(f => Math.abs(numberOf(f.stem) - numberOf(ranked[0].stem)) >= 3);
      if (second) keep.add(second.stem);
    }
  }
  if (album.cover) keep.add(album.cover);
  return good.filter(f => keep.has(f.stem));
}

// 1200x630 JPEG for og:image / twitter:image on the album's page
async function socialCard(frame, album) {
  const target = path.join(OUT, album.slug, 'og.jpg');
  if (!FORCE && fs.existsSync(target)) return;
  await sharp(frame.file).resize(1200, 630, { fit: 'cover', position: sharp.gravity.north })
    .jpeg({ quality: 80, progressive: true, mozjpeg: true }).toFile(target);
}

async function encode(frame, album) {
  const dir = path.join(OUT, album.slug);
  fs.mkdirSync(dir, { recursive: true });
  for (const [suffix, spec] of [['400', THUMB], ['1100', FULL]]) {
    const target = path.join(dir, `${frame.stem}-${suffix}.webp`);
    if (!FORCE && fs.existsSync(target) && fs.statSync(target).size > 0) continue;
    await sharp(frame.file).resize({ width: spec.width, withoutEnlargement: true }).webp({ quality: spec.quality, effort: 4 }).toFile(target);
  }
}

async function main() {
  if (!fs.existsSync(LIBRARY)) throw new Error(`Photo library not found: ${LIBRARY} (set PHOTO_LIBRARY)`);
  console.log('library:', LIBRARY);

  const manifest = {};
  let total = 0;
  let seen = 0;

  for (const album of config.albums) {
    if (album.hidden) {
      fs.rmSync(path.join(OUT, album.slug), { recursive: true, force: true });
      console.log(`  ${album.slug.padEnd(24)} hidden`);
      continue;
    }
    const stems = frameStems(album);
    const frames = [];
    for (const stem of stems) {
      const a = await analyse(stem);
      if (a) frames.push(a);
    }
    const chosen = pick(frames, album);
    seen += frames.length;
    total += chosen.length;

    // clear files that are no longer part of the album
    const dir = path.join(OUT, album.slug);
    if (fs.existsSync(dir)) {
      const wanted = new Set(['og.jpg', ...chosen.flatMap(f => [`${f.stem}-400.webp`, `${f.stem}-1100.webp`])]);
      for (const f of fs.readdirSync(dir)) if (!wanted.has(f)) fs.rmSync(path.join(dir, f));
    }
    for (const f of chosen) await encode(f, album);
    const cover = chosen.find(f => f.stem === album.cover) || chosen[0];
    if (cover) await socialCard(cover, album);

    manifest[album.slug] = chosen.map(f => [f.stem, f.width, f.height, Math.round(f.sharp * 10) / 10]);
    console.log(`  ${album.slug.padEnd(24)} ${String(frames.length).padStart(4)} frames -> ${String(chosen.length).padStart(4)} photos`);
  }

  fs.writeFileSync(MANIFEST, JSON.stringify(manifest) + '\n');
  console.log(`\n${total} photos from ${seen} frames. Wrote ${path.relative(ROOT, MANIFEST)}`);
}

main().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
