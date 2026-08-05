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
  await page.waitForTimeout(500);

  /* ---- animated decals ---- */
  const decals = await page.evaluate(() => {
    progress.wallet = 500;
    progress.owned.decal = ['flame', 'star', 'heart', 'bolt', 'eyes'];
    const out = {};
    for (const d of ['flame', 'star', 'heart', 'bolt', 'eyes']) {
      state.decal = d; renderPreview();
      out[d] = /decalFlicker|decalTwinkle|decalBeat|decalCrackle|decalPupil/.test(preview.innerHTML);
    }
    state.decal = 'none'; save(); renderPreview();
    return out;
  });
  check('decals: all five carry living animation classes', Object.values(decals).every(Boolean), JSON.stringify(decals));

  /* ---- parade stays hidden at 79/80 ---- */
  await page.evaluate(() => {
    progress.levels = {};
    for (let n = 1; n <= 79; n++) progress.levels[n] = { best: 3, rating: 2, tier: 'B', bestTime: 9 };
    progress.current = 80; save(); showMap();
  });
  await page.waitForTimeout(400);
  const hidden = await page.evaluate(() => ({
    unlocked: paradeUnlocked(),
    shown: document.getElementById('paradeBtn').classList.contains('show')
  }));
  check('parade: locked until every level is done (79/80 = hidden)', !hidden.unlocked && !hidden.shown, JSON.stringify(hidden));

  /* ---- 80/80: the trophy appears ---- */
  await page.evaluate(() => {
    progress.levels[80] = { best: 3, rating: 2, tier: 'B', bestTime: 9 };
    save(); renderMap();
  });
  await page.waitForTimeout(300);
  const shown = await page.evaluate(() => document.getElementById('paradeBtn').classList.contains('show'));
  check('parade: trophy button appears at 80/80', shown);
  await page.screenshot({ path: SHOT + 'pd-map.png' });

  /* ---- the parade itself ---- */
  await tap('#paradeBtn');
  await page.waitForTimeout(900);
  const world = await page.evaluate(() => ({
    parade: roadScene.classList.contains('parade'), mode: paradeMode,
    hazards: props.filter(p => ['barrel','rock','tnt','cone','oil','cactus','crater','tumbleweed','crab','puddle'].includes(p.type)).length,
    stars: props.filter(p => p.type === 'star').length,
    fans: props.filter(p => p.type === 'fan').length,
    trophy: props.filter(p => p.type === 'trophy').length,
    gravity: gravityNow()
  }));
  check('parade: rainbow world, zero hazards, star waves, fans, trophy, floaty', world.parade && world.mode && world.hazards === 0 && world.stars > 40 && world.fans > 5 && world.trophy === 1 && world.gravity === 640, JSON.stringify(world));

  /* fireworks pop while driving */
  await page.evaluate(() => { gasKey = true; });
  await page.waitForTimeout(2200);
  const fw = await page.evaluate(() => document.querySelectorAll('.firework').length);
  await page.evaluate(() => { gasKey = false; });
  check('parade: fireworks burst overhead', fw >= 1, 'live fireworks: ' + fw);
  await page.screenshot({ path: SHOT + 'pd-parade.png' });

  /* ---- the champion finish ---- */
  const finale = await page.evaluate(async () => {
    const w0 = progress.wallet;
    runStars = 12; runDamage = 0;
    pos = LEVEL_LEN - 350; gasKey = true;
    await new Promise(r => setTimeout(r, 1500));
    gasKey = false;
    return {
      banked: progress.wallet - w0,
      champ: progress.badges.includes('champ'),
      levels81: !!progress.levels[81],
      current: progress.current
    };
  });
  /* 12 stars + 3 + 2 clean + 100 champion = 117; no level-81 record, current untouched */
  check('parade: first finish banks the +100 jackpot (117 total)', finale.banked === 117, JSON.stringify(finale));
  check('parade: champion sticker earned, no phantom level-81 record', finale.champ && !finale.levels81 && finale.current === 80, JSON.stringify(finale));
  await page.waitForTimeout(4200);
  const card = await page.evaluate(() => ({
    trophyOnCard: document.getElementById('celebrateTime').innerHTML.includes('M22 4'),
    nextHidden: getComputedStyle(document.getElementById('nextBtn')).display === 'none'
  }));
  check('parade: celebrate card shows the trophy, no next level', card.trophyOnCard && card.nextHidden, JSON.stringify(card));
  await page.screenshot({ path: SHOT + 'pd-finale.png' });

  /* ---- replay pays the warm 10, not 100 ---- */
  await tap('#replayBtn');
  await page.waitForTimeout(600);
  const replay = await page.evaluate(async () => {
    const w0 = progress.wallet;
    runStars = 5; runDamage = 0;
    pos = LEVEL_LEN - 350; gasKey = true;
    await new Promise(r => setTimeout(r, 1500));
    gasKey = false;
    return { mode: paradeMode, banked: progress.wallet - w0 };
  });
  /* 5 + 3 + 2 clean + 10 replay = 20 */
  check('parade: replay re-runs the parade and banks +10 (20 total)', replay.mode && replay.banked === 20, JSON.stringify(replay));

  /* ---- champion badge in the album; leaving the parade restores normal driving ---- */
  await page.evaluate(() => showGarage());
  await page.waitForTimeout(300);
  await page.evaluate(() => showAlbum());
  await page.waitForTimeout(600);
  const album = await page.evaluate(() => ({
    badgeSlots: document.querySelectorAll('.badgeSlot').length,
    champFilled: [...document.querySelectorAll('.badgeSlot')].filter(b => b.classList.contains('filled')).length >= 1
  }));
  check('album: seven badge slots incl. the champion sticker', album.badgeSlots === 7 && album.champFilled, JSON.stringify(album));

  const normal = await page.evaluate(async () => {
    drive(3);
    await new Promise(r => setTimeout(r, 300));
    return { parade: roadScene.classList.contains('parade'), mode: paradeMode, lvl: level };
  });
  check('parade: normal levels unaffected afterwards', !normal.parade && !normal.mode && normal.lvl === 3, JSON.stringify(normal));

  check('no console errors', errors.length === 0, errors.join(' | ').slice(0, 300));

  await browser.close();
  const fails = results.filter(r => !r.ok);
  console.log(`\n${results.length - fails.length}/${results.length} passed`);
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
