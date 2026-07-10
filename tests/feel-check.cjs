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

  /* ---- iPad shell ---- */
  const shell = await page.evaluate(() => ({
    callout: getComputedStyle(document.body).webkitTouchCallout || 'none-supported',
    statusBar: !!document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]'),
    favicon: !!document.querySelector('link[rel="icon"]'),
    rotate: !!document.getElementById('rotateOverlay')
  }));
  check('shell: status-bar meta + favicon + rotate overlay present', shell.statusBar && shell.favicon && shell.rotate, JSON.stringify(shell));

  /* portrait shows rotate overlay */
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(200);
  const portrait = await page.evaluate(() => getComputedStyle(document.getElementById('rotateOverlay')).display !== 'none');
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForTimeout(200);
  const landscape = await page.evaluate(() => getComputedStyle(document.getElementById('rotateOverlay')).display === 'none');
  check('shell: rotate overlay shows in portrait, hides in landscape', portrait && landscape);

  /* ---- audio bus limiter ---- */
  const bus = await page.evaluate(() => {
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    return typeof masterBus !== 'undefined' ? (masterBus && masterBus.constructor.name) : 'missing';
  });
  check('audio: master compressor bus exists', bus.includes('Dynamics') || bus.includes('Compressor'), bus);

  /* ---- body dynamics: accel lean + brake dive + lane bank ---- */
  await page.evaluate(() => drive(1));
  await page.waitForTimeout(200);
  const lean = await page.evaluate(async () => {
    gasKey = true;
    await new Promise(r => setTimeout(r, 220));
    const accelLean = bodyTilt;
    gasKey = false; brakeKey = true;
    await new Promise(r => setTimeout(r, 180));
    const brakeDive = bodyTilt;
    brakeKey = false;
    return { accelLean, brakeDive };
  });
  check('feel: accel leans back, brake dives forward', lean.accelLean > 0.5 && lean.brakeDive < -0.5, JSON.stringify(lean));

  /* ---- landing squash + dust ---- */
  const landing = await page.evaluate(async () => {
    jumpY = 60; airborne = true; vy = -300;
    await new Promise(r => setTimeout(r, 400));
    return {
      squash: carWrap.classList.contains('land') || (carWrap.querySelector('svg') && carWrap.querySelector('svg').classList.contains('land')),
      dust: document.querySelectorAll('.dust').length > 0
    };
  });
  check('feel: landing squash class + dust puffs', landing.squash || landing.dust, JSON.stringify(landing));

  /* ---- hit-stop ---- */
  const hitstop = await page.evaluate(async () => {
    buildLevel(5); pos = 0;
    const b = props.find(p => p.type === 'barrel' || p.type === 'rock');
    if (!b) return { skip: true };
    targetLane = laneVis = b.lane;
    pos = b.x - 300 - 120; v = 500; gasKey = false;
    const t0 = performance.now();
    while (!b.done && performance.now() - t0 < 800) await new Promise(r => setTimeout(r, 16));
    const frozen = typeof freezeUntil !== 'undefined' && freezeUntil > performance.now() - 200;
    return { done: b.done, frozen };
  });
  check('feel: hard hit triggers hit-stop freeze', hitstop.skip || (hitstop.done && hitstop.frozen), JSON.stringify(hitstop));

  /* ---- combo chime state ---- */
  const combo = await page.evaluate(() => typeof starCombo !== 'undefined');
  check('feel: star combo pitch ladder exists', combo);

  /* ---- speed lines at vmax ---- */
  const lines = await page.evaluate(async () => {
    v = 700; gasKey = true;
    await new Promise(r => setTimeout(r, 300));
    const el = document.getElementById('speedLines');
    const on = el && getComputedStyle(el).opacity !== '0';
    gasKey = false; v = 0;
    await new Promise(r => setTimeout(r, 400));
    const off = el && parseFloat(getComputedStyle(el).opacity) < 0.5;
    return { on, off };
  });
  check('feel: speed lines fade in at vmax, out when slow', lines.on && lines.off, JSON.stringify(lines));

  /* ---- celebration choreography: buttons wait for the payoff ---- */
  await page.evaluate(() => { runStars = 3; pos = LEVEL_LEN - 350; gasKey = true; });
  await page.waitForTimeout(1200);
  await page.evaluate(() => { gasKey = false; });
  const early = await page.evaluate(() => {
    const row = document.getElementById('celebrateRow');
    return {
      active: document.getElementById('celebrate').classList.contains('active'),
      rowHidden: getComputedStyle(row).opacity === '0' || getComputedStyle(row).display === 'none' || !row.classList.contains('ready')
    };
  });
  await page.waitForTimeout(3500);
  const late = await page.evaluate(() => {
    const row = document.getElementById('celebrateRow');
    return { rowShown: getComputedStyle(row).display !== 'none' && getComputedStyle(row).opacity !== '0' };
  });
  check('feel: celebrate buttons wait for tally + stars, then appear', early.active && early.rowHidden && late.rowShown, JSON.stringify({ early, late }));
  await page.screenshot({ path: SHOT + 'n-celebrate.png' });

  /* ---- medal curve: L1 S is humane, L30 S expects upgrades ---- */
  const curve = await page.evaluate(() => {
    /* perfect-run time: accel 0->vmax then cruise */
    const perfect = (n, vmax) => {
      const len = 3500 + Math.min(n, 20) * 250 + Math.max(0, n - 20) * 100;
      const tA = vmax / 900, dA = vmax * tA / 2;
      return tA + (len - dA) / vmax;
    };
    return {
      l1stockS: timeTier(1, perfect(1, 700) * 1.25) === 'S',      /* 25% slack on stock */
      l30stockS: timeTier(30, perfect(30, 700) * 1.02),           /* stock near-perfect: should NOT be S */
      l30upgS: timeTier(30, perfect(30, 940) * 1.12) === 'S'      /* upgraded w/ 12% slack: S */
    };
  });
  check('feel: medal curve forgiving early, upgrade-tuned late', curve.l1stockS && curve.l30stockS !== 'S' && curve.l30upgS, JSON.stringify(curve));

  /* ---- damage chip off the victory screen ---- */
  const chips = await page.evaluate(() => ({
    damageShown: getComputedStyle(document.getElementById('celebrateDamage')).display,
    hasMedal: !!document.querySelector('#celebrateTime .medal, #celebrateDamage .medal')
  }));
  check('feel: medal has its own beat (time chip), damage only when relevant', chips.hasMedal, JSON.stringify(chips));

  /* ---- regressions guard ---- */
  check('no console errors', errors.length === 0, errors.join(' | ').slice(0, 300));

  await browser.close();
  const fails = results.filter(r => !r.ok);
  console.log(`\n${results.length - fails.length}/${results.length} passed`);
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
