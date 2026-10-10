const pw = require('playwright-core');
const os = require('os');
const fs = require('fs');
const EXE = process.env.CHROMIUM || os.homedir() + '/Library/Caches/ms-playwright/chromium-1117/chrome-mac/Chromium.app/Contents/MacOS/Chromium';
const URL = process.env.VROOM_URL || 'http://localhost:4173/index.html';

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail || '' });
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (detail ? '  -- ' + detail : ''));
}

(async () => {
  const browser = await pw.chromium.launch({ executablePath: EXE });
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  const src = fs.readFileSync(__dirname + '/../index.html', 'utf8');
  let serveNew = false, reloadedWithBust = false;
  /* the version probe fetches index.html?v=<n>: hand it either the same file or a "deployed" one */
  await page.route(/index\.html\?v=/, route => {
    if (route.request().resourceType() === 'document') { reloadedWithBust = true; return route.continue(); }
    route.fulfill({ status: 200, contentType: 'text/html', body: serveNew ? src.replace('"use strict";', '"use strict"; /* v-next */') : src });
  });

  /* 13.26: the gate is the title's PLAY pill. Boot without ?garage: no update, the pill is PLAY and a tap goes to the garage */
  const TITLE = URL.replace(/[?&]garage\b/, '');
  await page.goto(TITLE);
  await page.waitForTimeout(3200);
  const plain = await page.evaluate(() => ({ ready: updateReady, cls: titleScene.classList.contains('update'), playFace: getComputedStyle(titleGo.querySelector('.facePlay')).display !== 'none', newFace: getComputedStyle(titleGo.querySelector('.faceNew')).display === 'none', noGates: !document.getElementById('updateBtn') && !document.getElementById('titleUpdateBtn') }));
  check('update: when the server copy matches the pill is PLAY, no update face, no gate buttons anywhere', !plain.ready && !plain.cls && plain.playFace && plain.newFace && plain.noGates, JSON.stringify(plain));

  serveNew = true;
  await page.evaluate(() => { lastUpdateCheck = 0; return checkForUpdate(); });
  const armed = await page.evaluate(() => ({ ready: updateReady, cls: titleScene.classList.contains('update'), playFace: getComputedStyle(titleGo.querySelector('.facePlay')).display === 'none', newFace: getComputedStyle(titleGo.querySelector('.faceNew')).display !== 'none', bg: getComputedStyle(titleGo).backgroundImage.includes('240, 165, 0'), label: titleGo.getAttribute('aria-label'), words: titleGo.querySelectorAll('text').length }));
  check('update: a new version arms the pill: PLAY gives way to the amber update face (tray, arrow, ring, sparkles), still no words', armed.ready && armed.cls && armed.playFace && armed.newFace && armed.bg && armed.label.includes('hold') && armed.words === 0, JSON.stringify(armed));

  /* a quick tap must not reload, and must not go to the garage either: the ring lets go */
  const box = await page.locator('#titleGo').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); await page.waitForTimeout(300);
  const midHold = await page.evaluate(() => ({ holding: titleGo.classList.contains('holding'), ring: +titleGo.querySelector('.faceNew .ring').style.strokeDashoffset }));
  await page.mouse.up();
  await page.waitForTimeout(1800);
  const after = await page.evaluate(() => ({ title: titleScene.classList.contains('active'), holding: titleGo.classList.contains('holding'), ring: +titleGo.querySelector('.faceNew .ring').style.strokeDashoffset }));
  check('update: a quick tap on the armed pill fills part of the ring, then lets go: no reload, still on the title', !reloadedWithBust && midHold.holding && midHold.ring < 289 && midHold.ring > 100 && after.title && !after.holding && after.ring === 289, JSON.stringify({ midHold, after }));

  /* holding through the ring reloads with a cache-busting URL */
  await page.mouse.down();
  await page.waitForTimeout(2300);
  await page.mouse.up().catch(() => {});
  await page.waitForTimeout(800);
  check('update: press-and-hold on the pill loads the new version (a cache-busting URL)', reloadedWithBust && page.url().includes('?v='), page.url());

  /* the fresh page: PLAY is back and goes to the garage */
  reloadedWithBust = false; serveNew = false;
  await page.goto(TITLE); await page.waitForTimeout(3200);
  const fresh = await page.evaluate(() => ({ ready: updateReady, cls: titleScene.classList.contains('update') }));
  await page.locator('#titleGo').dispatchEvent('pointerdown');
  await page.waitForTimeout(600);
  const went = await page.evaluate(() => ({ garage: document.getElementById('garage').classList.contains('active'), title: titleScene.classList.contains('active') }));
  check('update: on the fresh page the pill is PLAY again and a tap goes to the garage', !fresh.ready && !fresh.cls && went.garage && !went.title && !reloadedWithBust, JSON.stringify({ fresh, went }));
  check('update: no page errors', errors.length === 0, errors.join(' | '));

  await browser.close();
  const pass = results.filter(r => r.ok).length;
  console.log(`\n${pass}/${results.length} passed`);
  process.exit(pass === results.length ? 0 : 1);
})();
