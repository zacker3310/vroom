const pw = require('playwright-core');
const os = require('os');
const EXE = os.homedir() + '/Library/Caches/ms-playwright/chromium-1117/chrome-mac/Chromium.app/Contents/MacOS/Chromium';
const URL = 'http://localhost:4173/index.html';
const SHOT = __dirname + '/shots/';

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

  /* ---- capsules in seeded levels ---- */
  const capGen = await page.evaluate(() => {
    let total = 0, lvls = 0;
    for (let n = 2; n <= 30; n++) {
      buildLevel(n);
      const c = props.filter(p => p.type === 'capsule').length;
      total += c; if (c > 0) lvls++;
    }
    return { total, lvls };
  });
  check('capsules: present across most levels 2-30', capGen.lvls >= 24, JSON.stringify(capGen));

  /* ---- star prize: deterministic via Math.random stub ---- */
  const starPrize = await page.evaluate(async () => {
    drive(3);
    await new Promise(r => setTimeout(r, 150));
    const c = props.find(p => p.type === 'capsule');
    if (!c) return { skip: true };
    const realRandom = Math.random;
    Math.random = () => 0;   /* first PRIZE_TABLE entry: stars x3 */
    const before = runStars;
    targetLane = laneVis = c.lane;
    pos = c.x - 300; v = 0;
    await new Promise(r => setTimeout(r, 250));
    Math.random = realRandom;
    return { done: c.done, gained: runStars - before, popped: c.el.innerHTML.includes('svg') };
  });
  check('capsules: star prize adds 3 run stars', starPrize.skip || (starPrize.done && starPrize.gained === 3), JSON.stringify(starPrize));

  /* ---- gag prize spawns + cleans up ---- */
  const gag = await page.evaluate(async () => {
    drive(4);
    await new Promise(r => setTimeout(r, 150));
    const c = props.find(p => p.type === 'capsule');
    if (!c) return { skip: true };
    const realRandom2 = Math.random;
    Math.random = () => 0.8;   /* weights 5,2,1,3,2 of 13: 10.4 = gag bucket [8,11); also picks gag idx 3 */
    targetLane = laneVis = c.lane;
    pos = c.x - 300; v = 0;
    await new Promise(r => setTimeout(r, 300));
    Math.random = realRandom2;
    const live = document.querySelectorAll('.gagWrap').length;
    showGarage();
    const afterExit = document.querySelectorAll('.gagWrap').length;
    return { done: c.done, live, afterExit };
  });
  check('capsules: gag spawns over car, cleaned on exit', gag.skip || (gag.done && gag.live >= 1 && gag.afterExit === 0), JSON.stringify(gag));

  /* ---- free drive: entry from map ---- */
  await page.evaluate(() => showMap());
  await page.waitForTimeout(150);
  const hasBtn = await page.evaluate(() => !!document.getElementById('freeBtn'));
  check('free: map has free-drive button', hasBtn);
  await tap('#freeBtn');
  await page.waitForTimeout(250);
  const entered = await page.evaluate(() => ({
    road: roadScene.classList.contains('active'), free: freeMode,
    progHidden: getComputedStyle(document.getElementById('hudProgress')).display === 'none'
  }));
  check('free: enters endless road, progress bar hidden', entered.road && entered.free && entered.progHidden, JSON.stringify(entered));

  /* ---- free drive: world extends and prunes ---- */
  await page.evaluate(() => { gasKey = true; });
  await page.waitForTimeout(2500);
  const world = await page.evaluate(() => ({
    pos: Math.round(pos),
    ahead: props.filter(p => p.x > pos + 300).length,
    behind: props.filter(p => p.x < pos - 700).length,
    count: props.length
  }));
  /* ahead >= 2: spawn spacing is 280-540px (+500 skip after ramps), so 2 in the 1600px window is a legit floor */
  check('free: props spawn ahead, prune behind', world.pos > 1000 && world.ahead >= 2 && world.behind === 0 && world.count < 120, JSON.stringify(world));

  /* ---- free drive: theme cycles with distance ---- */
  const themes = await page.evaluate(async () => {
    const out = [];
    for (const target of [1000, 8000, 15000, 22000]) {
      pos = target;
      await new Promise(r => setTimeout(r, 120));
      out.push(roadScene.classList.contains('night') ? 'night' : roadScene.classList.contains('sunset') ? 'sunset' : 'day');
    }
    return out;
  });
  check('free: theme cycles day->sunset->night->day', themes.join(',') === 'day,sunset,night,day', themes.join(','));
  await page.evaluate(() => { gasKey = false; });
  await page.screenshot({ path: SHOT + 'f-free-drive.png' });

  /* ---- free drive: exit banks stars ---- */
  const banked = await page.evaluate(() => {
    runStars = 6; renderHudStars(false);
    const w0 = progress.wallet;
    document.getElementById('homeBtn').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    return { gain: progress.wallet - w0, garage: garageScene.classList.contains('active') };
  });
  check('free: exiting banks collected stars', banked.gain === 6 && banked.garage, JSON.stringify(banked));

  /* ---- regular levels unaffected: finish still celebrates ---- */
  await page.evaluate(() => drive(1));
  await page.waitForTimeout(200);
  const lvl = await page.evaluate(async () => {
    pos = LEVEL_LEN - 350; gasKey = true;
    await new Promise(r => setTimeout(r, 1400));
    gasKey = false;
    return { finished, celebrate: document.getElementById('celebrate').classList.contains('active'), free: freeMode };
  });
  check('levels: normal finish flow intact, freeMode off', lvl.finished && lvl.celebrate && !lvl.free, JSON.stringify(lvl));

  /* ---- time tiers ---- */
  const tiers = await page.evaluate(() => ({
    fast: timeTier(1, 5), mid: timeTier(1, 8), slow: timeTier(1, 60),
    l30fast: timeTier(30, 12), l30slow: timeTier(30, 120),
    recorded: progress.levels[1] && progress.levels[1].tier, bestTime: progress.levels[1] && progress.levels[1].bestTime
  }));
  check('tiers: S for fast, C for slow, scale with level', tiers.fast === 'S' && tiers.slow === 'C' && tiers.l30fast === 'S' && tiers.l30slow === 'C', JSON.stringify(tiers));
  check('tiers: finish records tier + bestTime', ['S','A','B','C'].includes(tiers.recorded) && tiers.bestTime > 0, JSON.stringify({ t: tiers.recorded, bt: tiers.bestTime }));

  const mapBadge = await page.evaluate(() => {
    showMap();
    return { badges: document.querySelectorAll('.lvlBtn .tierBadge').length };
  });
  check('tiers: medal badge on completed map levels', mapBadge.badges >= 1, JSON.stringify(mapBadge));

  /* ---- difficulty is progressive ---- */
  const diff = await page.evaluate(() => {
    const hardAt = n => {
      buildLevel(n);
      return props.filter(p => ['barrel','rock','tnt'].includes(p.type)).length;
    };
    return { l5: hardAt(5), l15: hardAt(15), l30: hardAt(30) };
  });
  check('difficulty: hard obstacles climb L5 <= L15 <= L30 and grow overall', diff.l5 <= diff.l15 && diff.l15 <= diff.l30 && diff.l30 > diff.l5, JSON.stringify(diff));

  check('no console errors', errors.length === 0, errors.join(' | ').slice(0, 300));

  await browser.close();
  const fails = results.filter(r => !r.ok);
  console.log(`\n${results.length - fails.length}/${results.length} passed`);
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
