'use strict';

/*
 * npm run images
 *
 * Reads data/images.json (the list of photos the site uses) and writes:
 *   public/images/opt/…-<w>.webp   responsive WebP sizes, never upscaled
 *   public/images/og/….jpg         1200×630 social-share crops (focal point honoured)
 *   public/images/icons/…          favicon + touch icon from the logo
 *   data/image-manifest.json       intrinsic size + variant list, read by lib/images.js
 *
 * The outputs are committed, so CI and production don't need sharp. Re-run this
 * after adding or replacing a photo (and add it to data/images.json first).
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const registry = require('../data/images.json');

const WIDTHS = [160, 320, 640, 1024, 1600];
const WEBP = { quality: 72, effort: 6 };
const OG = { width: 1200, height: 630 };

const read = src => path.join(PUBLIC, src);
const write = async (file, pipeline) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await pipeline.toFile(file);
  return fs.statSync(file).size;
};

// "50% 38%" -> [0.5, 0.38]
function focal(position) {
  const [x, y] = String(position || '50% 50%').split(/\s+/).map(v => parseFloat(v) / 100);
  return [Number.isFinite(x) ? x : 0.5, Number.isFinite(y) ? y : 0.5];
}

async function socialCrop(file, position) {
  const meta = await sharp(file).metadata();
  const scale = Math.max(OG.width / meta.width, OG.height / meta.height);
  const w = Math.max(OG.width, Math.round(meta.width * scale));
  const h = Math.max(OG.height, Math.round(meta.height * scale));
  const [fx, fy] = focal(position);
  return sharp(file)
    .resize(w, h)
    .extract({ left: Math.round((w - OG.width) * fx), top: Math.round((h - OG.height) * fy), width: OG.width, height: OG.height })
    .jpeg({ quality: 82, progressive: true, mozjpeg: true });
}

async function main() {
  const manifest = {};
  let before = 0;
  let after = 0;

  for (const [src, cfg] of Object.entries(registry)) {
    if (!src.startsWith('/')) continue; // "_readme"
    const file = read(src);
    if (!fs.existsSync(file)) throw new Error(`data/images.json lists ${src}, which is not in public/`);

    const meta = await sharp(file).rotate().metadata();
    const stem = src.replace(/^\/images\//, '').replace(/\.[^.]+$/, '');
    const entry = { width: meta.width, height: meta.height, variants: [] };
    before += fs.statSync(file).size;

    // every standard width below the original (and below cfg.maxWidth, for images
    // only ever shown small, like avatars), plus the original width if it fits
    const cap = Math.min(cfg.maxWidth || Infinity, WIDTHS[WIDTHS.length - 1]);
    const widths = WIDTHS.filter(w => w < Math.min(meta.width, cap)).concat(meta.width <= cap ? [meta.width] : [cap]);
    for (const w of widths) {
      const out = `/images/opt/${stem}-${w}.webp`;
      const bytes = await write(read(out), sharp(file).rotate().resize({ width: w, withoutEnlargement: true }).webp(WEBP));
      entry.variants.push({ w, url: out });
      if (w === widths[widths.length - 1]) after += bytes;
    }

    if (cfg.og !== false) {
      const out = `/images/og/${stem}.jpg`;
      await write(read(out), await socialCrop(file, cfg.position));
      entry.og = out;
    }

    manifest[src] = entry;
    console.log(`  ✅ ${src}  ${meta.width}×${meta.height}  → ${widths.join(', ')}${entry.og ? ' + og' : ''}`);
  }

  // Favicons from the logo: padded onto white so the round emblem isn't clipped.
  const logo = read('/images/logonew.jpeg');
  for (const [name, size] of [['favicon-32.png', 32], ['favicon-192.png', 192], ['apple-touch-icon.png', 180]]) {
    const inner = Math.round(size * 0.92);
    const mark = await sharp(logo).resize(inner, inner, { fit: 'contain', background: '#ffffff' }).toBuffer();
    await write(read('/images/icons/' + name), sharp({ create: { width: size, height: size, channels: 3, background: '#ffffff' } })
      .composite([{ input: mark, gravity: 'centre' }]).png({ compressionLevel: 9 }));
  }
  console.log('  ✅ /images/icons/ favicon-32, favicon-192, apple-touch-icon');

  fs.writeFileSync(path.join(ROOT, 'data', 'image-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`\nLargest variants total ${(after / 1024).toFixed(0)} KB vs ${(before / 1024).toFixed(0)} KB originals.`);
}

main().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
