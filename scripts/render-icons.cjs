#!/usr/bin/env node
/* render-icons: rasterise docs/icons/icon.svg into the PNGs the manifest and <head> link.
   The game ships no build step; this is a one-off asset tool, re-run only when icon.svg changes.
     docs/icons/icon-192.png            manifest, purpose "any" (rounded corners, transparent)
     docs/icons/icon-512.png            manifest, purpose "any"
     docs/icons/icon-512-maskable.png   manifest, purpose "maskable" (full-bleed cream, OS crops it)
     docs/icons/apple-touch-icon.png    180px, full-bleed (iOS rounds its own corners)
   Usage: CHROMIUM=/path/to/chrome node scripts/render-icons.cjs   (else playwright-core's Chromium) */
'use strict';
const fs = require('fs');
const path = require('path');
const pw = require('playwright-core');

const DIR = path.resolve(__dirname, '..', 'docs', 'icons');
const svg = fs.readFileSync(path.join(DIR, 'icon.svg'), 'utf8');
const exe = process.env.CHROMIUM || pw.chromium.executablePath();
const OUT = [
  { file: 'icon-192.png', size: 192, bleed: false },
  { file: 'icon-512.png', size: 512, bleed: false },
  { file: 'icon-512-maskable.png', size: 512, bleed: true },
  { file: 'apple-touch-icon.png', size: 180, bleed: true },
];

(async () => {
  const browser = await pw.chromium.launch({ executablePath: exe });
  for (const o of OUT) {
    const page = await browser.newPage({ viewport: { width: o.size, height: o.size }, deviceScaleFactor: 1 });
    const bg = o.bleed ? 'background:#fdf6ea' : 'background:transparent';
    await page.setContent(`<!doctype html><html><body style="margin:0;${bg}"><div id="i" style="width:${o.size}px;height:${o.size}px;line-height:0">${svg}</div></body></html>`);
    await page.evaluate(s => { const el = document.querySelector('svg'); el.setAttribute('width', s); el.setAttribute('height', s); }, o.size);
    const buf = await page.locator('#i').screenshot({ omitBackground: !o.bleed, type: 'png' });
    fs.writeFileSync(path.join(DIR, o.file), buf);
    console.log(`${o.file.padEnd(26)} ${o.size}x${o.size}  ${buf.length} bytes`);
    await page.close();
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
