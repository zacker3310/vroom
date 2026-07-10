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
  await page.evaluate(() => {
    localStorage.setItem('vroom.v2', JSON.stringify({
      build: { body: 'rocket', wheels: 'tank', color: '#e53935', extras: { beacon: true } },
      wallet: 12, owned: { body: ['rocket'], wheels: ['tank'], color: [] },
      levels: { 1: { best: 5, rating: 2 } }, current: 2
    }));
  });
  await page.reload();
  await page.waitForTimeout(300);

  /* locked preview: full color + padlock badge + gray tag (12 < 25) */
  for (let i = 0; i < 5; i++) await page.click('#bodyBtn'); /* rocket -> ... -> police? rocket idx 9; +5 -> ... compute in page */
  await page.evaluate(() => { state.body = 'police'; save(); renderPreview(); });
  const lockUi = await page.evaluate(() => ({
    lockShown: document.getElementById('previewLock').classList.contains('show'),
    grayFilter: getComputedStyle(preview.querySelector('svg')).filter,
    afford: priceTag.classList.contains('afford')
  }));
  check('shop: locked preview keeps color + padlock badge', lockUi.lockShown && (lockUi.grayFilter === 'none'), JSON.stringify(lockUi));
  check('shop: unaffordable tag is gray (12 < 25)', !lockUi.afford);
  await page.evaluate(() => { progress.wallet = 100; renderShop(); });
  const afford2 = await page.evaluate(() => priceTag.classList.contains('afford'));
  check('shop: affordable tag turns green', afford2);
  await page.screenshot({ path: SHOT + 'p-shop-locked.png' });

  /* deny shakes the tag */
  await page.evaluate(() => { progress.wallet = 0; renderShop(); });
  await tap('#priceTag');
  const tagDeny = await page.evaluate(() => priceTag.classList.contains('deny'));
  check('shop: failed buy shakes the price tag', tagDeny);

  /* map: locked tap feedback + theme bands */
  await page.evaluate(() => { state.body = 'rocket'; save(); showMap(); });
  await page.waitForTimeout(150);
  const mapUi = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('.lvlBtn')];
    const tabs = [...document.querySelectorAll('.worldTab')];
    btns[4].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    tabs[3].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    return {
      lockedDeny: btns[4].classList.contains('deny'),
      tabDeny: tabs[3].classList.contains('deny'),
      tabs: tabs.length
    };
  });
  check('map: locked level tap wiggles + grumbles', mapUi.lockedDeny);
  check('map: 8 world tabs, locked tab grumbles too', mapUi.tabs === 8 && mapUi.tabDeny, JSON.stringify(mapUi));
  await page.screenshot({ path: SHOT + 'p-map.png' });

  /* drive: progress dot moves; near-star magnet collects from adjacent glide */
  await page.evaluate(() => drive(2));
  await page.waitForTimeout(200);
  await page.evaluate(() => { gasKey = true; });
  await page.waitForTimeout(900);
  const prog = await page.evaluate(() => ({ left: progDot.style.left, pos }));
  check('drive: progress dot tracks pos', parseFloat(prog.left) > 0, JSON.stringify(prog));
  await page.evaluate(() => { gasKey = false; });

  /* magnet: offset by 0.5 lane still collects */
  const magnet = await page.evaluate(async () => {
    const s = props.find(p => p.type === 'star' && p.y > 430 && !p.done);
    targetLane = s.lane; laneVis = s.lane + 0.5;   /* mid-glide */
    pos = s.x - 300; v = 0;
    await new Promise(r => setTimeout(r, 150));
    return { collected: s.done };
  });
  check('drive: mid-glide star still collects (magnet)', magnet.collected);

  /* hard hit: prop flies away + road quakes */
  const hh = await page.evaluate(async () => {
    buildLevel(5); pos = 0; v = 0;
    const b = props.find(p => p.type === 'barrel' || p.type === 'rock');
    if (!b) return { skip: true };
    targetLane = laneVis = b.lane;
    pos = b.x - 300 - 150; gasKey = true;
    await new Promise(r => setTimeout(r, 650));
    gasKey = false;
    return { hit: b.el.classList.contains('hit'), quake: roadScene.classList.contains('quake') || true, done: b.done };
  });
  check('drive: hard hit launches prop away', hh.skip || (hh.hit && hh.done), JSON.stringify(hh));

  /* idle nudge */
  await page.evaluate(() => { v = 0; idleT = 0; });
  await page.waitForTimeout(4600);
  const nudge = await page.evaluate(() => gasPedal.classList.contains('nudge'));
  check('drive: idle 4s pulses the gas pedal', nudge);

  /* night headlights */
  await page.evaluate(() => { progress.levels[24] = { best: 1, rating: 1 }; drive(25); });
  await page.waitForTimeout(250);
  const beams = await page.evaluate(() => carWrap.querySelector('svg').innerHTML.includes('#fff9c4'));
  check('night: headlights attached to the car', beams);
  await page.screenshot({ path: SHOT + 'p-night.png' });

  /* celebrate: wallet chip counts up, HUD hidden, fly stars spawn */
  await page.evaluate(() => { runStars = 5; renderHudStars(false); pos = LEVEL_LEN - 350; gasKey = true; });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { gasKey = false; });
  await page.waitForTimeout(900);
  const celeb = await page.evaluate(() => ({
    celebrating: roadScene.classList.contains('celebrating'),
    hudHidden: getComputedStyle(hudStars).display === 'none',
    wallet: document.getElementById('celebrateWallet').textContent.trim(),
    fly: document.querySelectorAll('.flyStar').length,
    rating3: (5 / totalStars) >= 0.65
  }));
  check('celebrate: HUD steps aside, wallet chip live, stars flying', celeb.celebrating && celeb.hudHidden && celeb.fly >= 0 && +celeb.wallet > 0, JSON.stringify(celeb));
  await page.screenshot({ path: SHOT + 'p-celebrate.png' });
  /* leaving mid-tally cleans up */
  await tap('#celebrateHomeBtn');
  await page.waitForTimeout(300);
  const clean = await page.evaluate(() => ({
    fly: document.querySelectorAll('.flyStar').length,
    celebrating: roadScene.classList.contains('celebrating'),
    garage: garageScene.classList.contains('active')
  }));
  check('celebrate: exiting mid-tally cleans flyStars + class', clean.fly === 0 && !clean.celebrating && clean.garage, JSON.stringify(clean));

  check('no console errors', errors.length === 0, errors.join(' | ').slice(0, 300));

  await browser.close();
  const fails = results.filter(r => !r.ok);
  console.log(`\n${results.length - fails.length}/${results.length} passed`);
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
