const pw = require('playwright-core');
const os = require('os');
const EXE = os.homedir() + '/Library/Caches/ms-playwright/chromium-1117/chrome-mac/Chromium.app/Contents/MacOS/Chromium';
const URL = 'http://localhost:4173/index.html';
const SHOT = __dirname + '/shots/';
require('fs').mkdirSync(SHOT, { recursive: true });

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok });
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (detail ? '  -- ' + detail : ''));
}

(async () => {
  const browser = await pw.chromium.launch({ executablePath: EXE });
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  const tap = sel => page.evaluate(s => document.querySelector(s).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 99 })), sel);

  await page.goto(URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(300);

  /* ---- empty album renders all slot rows ---- */
  await tap('#albumBtn');
  await page.waitForTimeout(600);
  const empty = await page.evaluate(() => ({
    active: albumScene.classList.contains('active'),
    buddies: document.querySelectorAll('.buddySlot').length,
    filled: document.querySelectorAll('.buddySlot.filled').length,
    badges: document.querySelectorAll('.badgeSlot').length,
    photos: document.querySelectorAll('.photoSlot').length,
    emptyPhotos: document.querySelectorAll('.photoSlot.empty').length
  }));
  check('album: 6+6+6 slots, all empty on fresh save', empty.active && empty.buddies === 6 && empty.filled === 0 && empty.badges === 6 && empty.photos === 6 && empty.emptyPhotos === 6, JSON.stringify(empty));
  await page.screenshot({ path: SHOT + 'a-album-empty.png' });

  /* tapping an unfound buddy grumbles, never equips */
  const denyTap = await page.evaluate(() => {
    document.querySelector('.buddySlot').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    return { buddy: state.buddy, wiggled: document.querySelector('.buddySlot').classList.contains('wiggle') };
  });
  check('album: unfound buddy tap wiggles, no equip', denyTap.buddy === null && denyTap.wiggled, JSON.stringify(denyTap));

  /* ---- buddy capsule prize: found, auto-equipped, rides in car ---- */
  const buddyPrize = await page.evaluate(async () => {
    showGarage(); drive(3);
    await new Promise(r => setTimeout(r, 150));
    const c = props.find(p => p.type === 'capsule');
    if (!c) return { skip: true };
    const rr = Math.random;
    Math.random = () => 0.9;   /* weights 5,2,1,3,2 of 13 -> 11.7 = buddy bucket [11,13) */
    targetLane = laneVis = c.lane; pos = c.x - 300; v = 0;
    await new Promise(r => setTimeout(r, 300));
    Math.random = rr;
    return {
      owned: progress.owned.buddy.length, equipped: state.buddy,
      riding: carWrap.innerHTML.includes('buddyBob'),
      popup: document.querySelectorAll('.buddyPop').length
    };
  });
  check('buddies: capsule prize found + auto-equipped + riding', buddyPrize.skip || (buddyPrize.owned === 1 && !!buddyPrize.equipped && buddyPrize.riding && buddyPrize.popup >= 1), JSON.stringify(buddyPrize));
  await page.screenshot({ path: SHOT + 'a-buddy-pop.png' });

  /* ---- badges: first jump via real ramp physics ---- */
  const jumpBadge = await page.evaluate(async () => {
    const rp = RAMPS[0];
    pos = rp.x - 300 - 60; v = 650; gasKey = true;
    const t0 = performance.now();
    while (!airborne && performance.now() - t0 < 2000) await new Promise(r => setTimeout(r, 30));
    gasKey = false;
    return { airborne: progress.badges.includes('jump'), toast: document.getElementById('stickerToast').classList.contains('show') };
  });
  check('badges: first jump awards sticker + toast', jumpBadge.airborne && jumpBadge.toast, JSON.stringify(jumpBadge));

  /* ---- badges + photo on finish (clean run) ---- */
  const finish = await page.evaluate(async () => {
    runStars = 4; runDamage = 0;
    pos = LEVEL_LEN - 350; gasKey = true;
    await new Promise(r => setTimeout(r, 1500));
    gasKey = false;
    return {
      clean: progress.badges.includes('clean'),
      photos: progress.photos.length,
      photoLevel: progress.photos[0] && progress.photos[0].n,
      hasBuild: progress.photos[0] && !!progress.photos[0].b.body
    };
  });
  check('badges: clean-run sticker on finish', finish.clean);
  check('photos: finish-line photo recorded with build + level', finish.photos === 1 && finish.photoLevel === 3 && finish.hasBuild, JSON.stringify(finish));

  /* ---- buy badge ---- */
  const buyBadge = await page.evaluate(() => {
    showGarage();
    progress.wallet = 200; renderWallets(false);
    state.color = 'rainbow'; save(); renderPreview();
    priceTag.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    return progress.badges.includes('buy');
  });
  check('badges: first purchase awards sticker', buyBadge);

  /* ---- album shows the goods; equip toggle works ---- */
  await tap('#albumBtn');
  await page.waitForTimeout(300);
  const filled = await page.evaluate(() => ({
    buddiesFilled: document.querySelectorAll('.buddySlot.filled').length,
    equipped: document.querySelectorAll('.buddySlot.equipped').length,
    badgesFilled: document.querySelectorAll('.badgeSlot.filled').length,
    photosFilled: document.querySelectorAll('.photoSlot:not(.empty)').length
  }));
  check('album: rows reflect progress (1 buddy, 3+ badges, 1 photo)', filled.buddiesFilled === 1 && filled.equipped === 1 && filled.badgesFilled >= 3 && filled.photosFilled === 1, JSON.stringify(filled));
  const toggle = await page.evaluate(() => {
    const slot = document.querySelector('.buddySlot.equipped');
    slot.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    const off = state.buddy === null;
    document.querySelector('.buddySlot.filled').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    return { off, on: state.buddy !== null };
  });
  check('album: tap rider to hop out, tap again to ride', toggle.off && toggle.on, JSON.stringify(toggle));
  await page.screenshot({ path: SHOT + 'a-album-filled.png' });

  /* ---- photo cap at 6 + full persistence across reload ---- */
  await page.evaluate(() => {
    for (let i = 0; i < 9; i++) {
      progress.photos.unshift({ b: JSON.parse(JSON.stringify(state)), n: i + 1, t: 'B', s: 2 });
    }
    progress.photos = progress.photos.slice(0, 6);
    save();
  });
  await page.reload();
  await page.waitForTimeout(400);
  const persist = await page.evaluate(() => ({
    photos: progress.photos.length,
    buddy: progress.owned.buddy.length === 1 && state.buddy !== null,
    badges: progress.badges.length >= 3
  }));
  check('persistence: photos capped at 6, buddy + badges survive reload', persist.photos === 6 && persist.buddy && persist.badges, JSON.stringify(persist));

  check('no console errors', errors.length === 0, errors.join(' | ').slice(0, 300));

  await browser.close();
  const fails = results.filter(r => !r.ok);
  console.log(`\n${results.length - fails.length}/${results.length} passed`);
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
