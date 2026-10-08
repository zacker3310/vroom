/* doc-shots: regenerates the README screenshots in docs/ from a scripted save.
   Needs the game served (python3 -m http.server 4173) and a Chromium (CHROMIUM env or playwright-core's).
   Usage: npm run shots   |   VROOM_URL=http://host:port/index.html node scripts/doc-shots.cjs */
'use strict';
const path = require('path');
const pw = require('playwright-core');
const OUT = path.join(__dirname, '..', 'docs') + path.sep;
const URL = (process.env.VROOM_URL || 'http://localhost:4173/index.html') + '?garage';
const EXE = process.env.CHROMIUM || pw.chromium.executablePath();
(async () => {
  const b = await pw.chromium.launch({ executablePath: EXE });
  const page = await b.newPage({ viewport: { width: 1200, height: 700 }, deviceScaleFactor: 1 });
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.addInitScript(() => { window.__today = '2026-10-08'; });
  await page.goto(URL); await page.waitForTimeout(400);
  await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(500);
  /* a well-played save: 34 levels beaten, a pirate ship with a fox buddy, badges, photos from four worlds */
  await page.evaluate(() => {
    for (let n = 1; n <= 34; n++) progress.levels[n] = { best: 6, rating: n % 3 ? 3 : 2, tier: ['S', 'A', 'B'][n % 3] };
    progress.current = 35; progress.wallet = 212; progress.lastGift = todayKey();
    ['pirate', 'race', 'police'].forEach(id => progress.owned.body.push(id));
    ['monster', 'gold'].forEach(id => progress.owned.wheels.push(id));
    progress.owned.color.push('#e63946', '#00acc1'); progress.owned.decal.push('star'); progress.owned.extras.push('wings');
    progress.owned.buddy.push('pup', 'fox', 'ducky'); progress.badges.push('jump', 'clean', 'shine', 'world', 'buy');
    state.body = 'pirate'; state.wheels = 'monster'; state.color = '#e63946'; state.buddy = 'fox'; state.decal = 'star'; state.number = '7'; state.extras.flag = true; state.extras.beacon = true;
    [[3, 'S', 7], [14, 'A', 5], [27, 'B', 4], [31, 'S', 9]].forEach(([n, t, s]) => progress.photos.push({ b: JSON.parse(JSON.stringify(state)), n, t, s }));
    save(); renderWallets(false); renderPreview(); renderUpkeep(); openTab('body', false);
  });
  await page.waitForTimeout(700); await page.screenshot({ path: OUT + 'garage.png' });
  await page.evaluate(() => showMap()); await page.waitForTimeout(800); await page.screenshot({ path: OUT + 'map.png' });
  await page.evaluate(() => showAlbum()); await page.waitForTimeout(900); await page.screenshot({ path: OUT + 'album.png' });
  const road = async (lvl, file, lane, ms) => {
    await page.evaluate(([lvl, lane]) => { showGarage(); drive(lvl); setTimeout(() => { targetLane = lane; laneVis = lane; gasKey = true; }, 150); }, [lvl, lane]);
    await page.waitForTimeout(ms); await page.evaluate(() => { gasKey = false; });
    await page.screenshot({ path: OUT + file });
  };
  await road(75, 'space.png', 1, 2600);
  await road(103, 'sea.png', 2, 2400);
  await road(114, 'sky.png', 1, 2400);
  await road(36, 'rain.png', 0, 2200);
  /* the wild courses (v12.9): parked at a set spot, so the frame is the same every run */
  const spot = async (file, fn) => {
    await page.evaluate(() => { showGarage(); });
    await page.waitForTimeout(300);
    await page.evaluate(fn);
    await page.waitForTimeout(1100);   /* the scene iris has opened */
    await page.screenshot({ path: OUT + file });
  };
  await spot('corkscrew.png', () => { drive(7); const t = TWISTS[0]; pos = t.x0 + (t.x1 - t.x0) * 0.4 - CAR_SCREEN_X + CAR_HIT_Z; v = 0; });
  await spot('hardturn.png', () => { drive(56); const c = COURSE.find(c => c.hard); pos = c.x0 - CAR_SCREEN_X - 420; v = 0; });
  await spot('megaramp.png', () => {
    let n = 0; for (let k = 6; k <= 40 && !n; k++) { buildLevel(k); if (RAMPS.some(r => r.kick === 1.1)) n = k; }
    drive(n); const rp = RAMPS.find(r => r.kick === 1.1); pos = rp.x - CAR_SCREEN_X - 760; v = 0;   /* the big red one dead ahead, its star arc rising */
  });
  /* results card: a shiny S-tier finish */
  await page.evaluate(async () => { showGarage(); progress.muddy = false; progress.damage = 0; drive(12); await new Promise(r => setTimeout(r, 200)); runStars = 9; runDamage = 0; renderHudStars(false); pos = LEVEL_LEN - 350; gasKey = true; });
  await page.waitForTimeout(3600); await page.evaluate(() => { gasKey = false; });
  await page.screenshot({ path: OUT + 'celebrate.png' });
  console.log('wrote 11 screenshots to', OUT, errs.length ? '\nerrors: ' + errs.join('\n') : '');
  await b.close();
})();
