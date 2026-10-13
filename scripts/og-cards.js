'use strict';

/*
 * npm run og
 *
 * Draws the branded link-share card, the large image that WhatsApp, Facebook,
 * X, LinkedIn and iMessage show when a page is shared, and writes it as a
 * 1200×630 JPEG:
 *   public/images/og/card-home.jpg
 *
 * The card is plain HTML + CSS (so it uses the site's own Figtree font, logo and
 * colours), rendered by headless Chrome and re-encoded with sharp. It needs
 * Chrome or Chromium installed; CHROME_BIN points at a specific binary.
 *
 * The output is committed, so CI and production need neither. The "from" price
 * and the rating are read from the site data: re-run after changing them.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { pathToFileURL } = require('url');
const sharp = require('sharp');

const { BRAND, PUBLIC_DIR, siteUrl } = require('../lib/site');
const data = require('../lib/data');

const SIZE = { width: 1200, height: 630 };
const HOST = siteUrl.replace(/^https?:\/\//, '');

// ── What the card says ────────────────────────────────────────
const lowestPrice = Math.min(...data.tours.map(t => t.priceUSD).filter(Number.isFinite));
const rated = data.testimonials.filter(t => t.rating);
const rating = rated.reduce((n, t) => n + t.rating, 0) / rated.length;

const CARDS = [
  {
    file: 'card-home.jpg',
    photo: '/images/gorilla.jpg',
    photoPosition: '50% 30%',
    eyebrow: 'Gorilla Trekking · Wildlife Safaris · Mountain Climbs',
    headline: 'Safaris that turn Uganda into a <em>life-changing journey.</em>',
    sub: 'Gorilla trekking, wildlife safaris, mountain climbs and cultural tours across East Africa, guided by local experts.',
    badge: { label: 'Safaris from', value: `USD ${lowestPrice.toLocaleString('en-US')}` },
    pills: [
      { icon: 'shield', text: 'UTB & UWA registered' },
      { icon: 'calendar', text: 'Since 2008' },
      { icon: 'star', text: `${rating.toFixed(1)} traveller rating` }
    ],
    url: HOST
  }
];

// ── Icons (24×24, stroke) ─────────────────────────────────────
const ICONS = {
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>',
  star: '<path d="m12 2.5 2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.3l-5.8 3.1 1.1-6.45-4.7-4.6 6.5-.95z"/>'
};
const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;

// ── The card ──────────────────────────────────────────────────
function html(card) {
  const url = p => pathToFileURL(path.join(PUBLIC_DIR, p)).href;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<style>
  @font-face {
    font-family: 'Figtree';
    src: url('${url('/fonts/figtree-v9-latin-wght-normal.woff2')}') format('woff2');
    font-weight: 300 900;
  }
  * { box-sizing: border-box; margin: 0; }
  html, body { width: ${SIZE.width}px; height: ${SIZE.height}px; overflow: hidden; }
  body {
    position: relative;
    font-family: 'Figtree', system-ui, sans-serif;
    color: #fff;
    background: #0b170b;
  }

  /* Photo on the right, fading into the dark green; a warm glow in the corner */
  .photo {
    position: absolute; inset: 0 0 0 auto; width: 680px;
    background: url('${url(card.photo)}') ${card.photoPosition} / cover no-repeat;
    -webkit-mask-image: linear-gradient(90deg, transparent 0, rgba(0,0,0,.55) 22%, #000 55%);
            mask-image: linear-gradient(90deg, transparent 0, rgba(0,0,0,.55) 22%, #000 55%);
  }
  .shade {
    position: absolute; inset: 0;
    background:
      radial-gradient(circle at 100% 0, rgba(200,146,42,.38), transparent 46%),
      linear-gradient(0deg, rgba(11,23,11,.55), transparent 38%);
  }

  .frame {
    position: relative; height: 100%;
    padding: 52px 60px 54px;
    display: flex; flex-direction: column; justify-content: space-between;
  }

  .top { display: flex; align-items: flex-start; justify-content: space-between; }
  .brand { display: flex; align-items: center; gap: 14px; }
  .brand-mark {
    width: 60px; height: 60px; border-radius: 16px; background: #fff;
    display: grid; place-items: center; overflow: hidden;
  }
  /* The logo file has a wide white margin: scale it up so the emblem fills the chip */
  .brand-mark img { width: 60px; height: 60px; object-fit: contain; transform: scale(1.22); }
  .brand-name { font-size: 22px; font-weight: 700; letter-spacing: -.01em; }

  .badge {
    text-align: right; padding: 12px 20px 13px; border-radius: 16px;
    background: rgba(11,23,11,.58); border: 1px solid rgba(255,255,255,.18);
  }
  .badge small {
    display: block; font-size: 12px; font-weight: 700; letter-spacing: .14em;
    text-transform: uppercase; color: #e3b04b;
  }
  .badge strong { display: block; font-size: 30px; font-weight: 800; letter-spacing: -.01em; line-height: 1.15; }

  .eyebrow {
    display: inline-flex; align-items: center; gap: 10px;
    padding: 9px 18px 9px 14px; border-radius: 999px;
    background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.14);
    font-size: 15px; font-weight: 600; color: rgba(255,255,255,.88);
  }
  .eyebrow::before { content: ''; width: 8px; height: 8px; border-radius: 50%; background: #5fbf5f; }

  h1 {
    margin-top: 22px; max-width: 640px;
    font-size: 58px; line-height: 1.06; font-weight: 800; letter-spacing: -.028em;
  }
  h1 em {
    font-style: normal;
    background: linear-gradient(90deg, #e3b04b, #f4d58f);
    -webkit-background-clip: text; background-clip: text; color: transparent;
  }
  .sub {
    margin-top: 22px; max-width: 560px;
    font-size: 21px; line-height: 1.45; font-weight: 500; color: rgba(255,255,255,.74);
  }

  .bottom { display: flex; align-items: center; justify-content: space-between; }
  .pills { display: flex; gap: 12px; }
  .pill {
    display: inline-flex; align-items: center; gap: 9px;
    padding: 10px 17px 10px 13px; border-radius: 999px;
    background: rgba(11,23,11,.6); border: 1px solid rgba(255,255,255,.16);
    font-size: 16px; font-weight: 600; color: rgba(255,255,255,.92);
  }
  .pill svg { width: 19px; height: 19px; fill: none; stroke: #e3b04b; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
  .url {
    padding: 11px 22px; border-radius: 999px; background: #fff; color: #0b170b;
    font-size: 18px; font-weight: 800; letter-spacing: -.005em;
  }
</style></head>
<body>
  <div class="photo"></div>
  <div class="shade"></div>
  <div class="frame">
    <div class="top">
      <div class="brand">
        <div class="brand-mark"><img src="${url('/images/logonew.jpeg')}" alt=""></div>
        <span class="brand-name">${BRAND}</span>
      </div>
      <div class="badge"><small>${card.badge.label}</small><strong>${card.badge.value}</strong></div>
    </div>
    <div>
      <span class="eyebrow">${card.eyebrow}</span>
      <h1>${card.headline}</h1>
      <p class="sub">${card.sub}</p>
    </div>
    <div class="bottom">
      <div class="pills">${card.pills.map(p => `<span class="pill">${icon(p.icon)}${p.text}</span>`).join('')}</div>
      <span class="url">${card.url}</span>
    </div>
  </div>
</body></html>`;
}

// ── Render ────────────────────────────────────────────────────
function chromeBinary() {
  const candidates = [process.env.CHROME_BIN, 'google-chrome-stable', 'google-chrome', 'chromium', 'chromium-browser'].filter(Boolean);
  for (const bin of candidates) {
    if (spawnSync(bin, ['--version'], { stdio: 'ignore' }).status === 0) return bin;
  }
  throw new Error('No Chrome or Chromium found. Install one, or set CHROME_BIN to its path.');
}

function screenshot(bin, htmlFile, pngFile, profileDir) {
  const run = spawnSync(bin, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
    '--force-device-scale-factor=1', `--window-size=${SIZE.width},${SIZE.height}`,
    `--user-data-dir=${profileDir}`, `--screenshot=${pngFile}`, pathToFileURL(htmlFile).href
  ], { encoding: 'utf8', timeout: 60000 });
  if (!fs.existsSync(pngFile)) throw new Error(`Chrome produced no screenshot.\n${run.stderr || ''}`);
}

async function main() {
  const bin = chromeBinary();
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'og-cards-'));
  console.log(`Rendering ${CARDS.length} card${CARDS.length === 1 ? '' : 's'} with ${bin}\n`);

  try {
    for (const card of CARDS) {
      const htmlFile = path.join(work, 'card.html');
      const pngFile = path.join(work, 'card.png');
      fs.writeFileSync(htmlFile, html(card));
      screenshot(bin, htmlFile, pngFile, path.join(work, 'profile'));

      // 4:4:4 keeps coloured text edges clean; the size still lands well under WhatsApp's ~300 KB preview limit.
      const out = path.join(PUBLIC_DIR, 'images', 'og', card.file);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      await sharp(pngFile)
        .extract({ left: 0, top: 0, width: SIZE.width, height: SIZE.height })
        .jpeg({ quality: 88, chromaSubsampling: '4:4:4', mozjpeg: true })
        .toFile(out);

      console.log(`  ✅ /images/og/${card.file}  ${SIZE.width}×${SIZE.height}  ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
    }
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
}

main().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});
