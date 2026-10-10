const pw = require('playwright-core');
const os = require('os');
const EXE = process.env.CHROMIUM || os.homedir() + '/Library/Caches/ms-playwright/chromium-1117/chrome-mac/Chromium.app/Contents/MacOS/Chromium';
const URL = process.env.VROOM_URL || 'http://localhost:4173/index.html';
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

  /* ---- camera dynamics (juice): the chase cam lags a lane change on a spring and settles ----
     (the settle waits on the simulated state with a wall-clock cap: under load the loop's dt is capped at 50 ms,
     so simulated time runs slower than the clock; `settleMs` is the wall time it took, informational) */
  await page.evaluate(() => { window.__until = async (fn, cap) => { const t0 = performance.now(); while (!fn() && performance.now() - t0 < cap) await new Promise(r => setTimeout(r, 16)); return Math.round(performance.now() - t0); }; });
  const camLag = await page.evaluate(async () => {
    targetLane = laneVis = 1; camReset(); v = 0;
    await __until(() => laneVis === 1 && camX === camXT, 1000);
    setLane(2);
    await __until(() => laneVis > 1.05, 1000);   /* the car has started across: the camera must be behind */
    const early = { camX, camXT, carX: carScreenX() };
    const settleMs = await __until(() => laneVis === 2 && Math.abs(camX - camXT) < 0.01 && camXv === 0, 3000);
    const late = { camX, camXT, carX: carScreenX(), settleMs };
    return { early, late, goal: LANE_W * CAM_FOLLOW, carSettled: 600 + LANE_W * (1 - CAM_FOLLOW) };
  });
  check('camera: a lane change leaves camX behind its target (spring lag), then it settles with the car where it always landed',
    camLag.early.camXT - camLag.early.camX > 5 && camLag.early.camX < camLag.goal * 0.5
      && Math.abs(camLag.late.camX - camLag.goal) < 0.5 && Math.abs(camLag.late.carX - camLag.carSettled) < 0.5 && camLag.late.settleMs < 3000, JSON.stringify(camLag));

  /* ---- FOV punch: the lens widens at full speed (fovK > 1, CAM_D pulled in while rendering) and relaxes to 1 at rest ---- */
  const fov = await page.evaluate(async () => {
    v = 700; gasKey = true;
    const inMs = await __until(() => fovK > 1.06, 3000);
    const fast = fovK, camDRest = CAM_D;
    gasKey = false; v = 0;
    const outMs = await __until(() => fovK === 1, 3000);
    return { fast, rest: fovK, camDRest, base: CAM_D0, inMs, outMs };
  });
  check('camera: FOV punch > 1 at vmax, back to 1 at rest, CAM_D restored after each frame',
    fov.fast > 1.04 && fov.fast <= 1.08 && fov.rest < 1.003 && fov.camDRest === fov.base, JSON.stringify(fov));

  /* ---- landing: the camera dips with the touchdown and the body squats; both settle ---- */
  const dip = await page.evaluate(async () => {
    v = 0; bodyTilt = 0; camDipY = 0; camDipV = 0;
    jumpY = 40; airborne = true; vy = -600;
    let peak = 0, squat = 0;
    await __until(() => { peak = Math.max(peak, camDipY); squat = Math.max(squat, bodyTilt); return !airborne && peak > 0 && camDipY < peak; }, 2000);
    const settleMs = await __until(() => camDipY === 0 && camDipV === 0, 3000);
    return { peak, squat, after: camDipY, fx: camFxY, landed: !airborne, settleMs };
  });
  check('feel: landing dips the camera (3..16 px) and squats the body, then both settle',
    dip.landed && dip.peak > 3 && dip.peak <= 16 && dip.squat > 2 && dip.after === 0 && dip.fx === 0, JSON.stringify(dip));

  /* ---- impact: a hard hit shakes the road world (not the HUD), throws debris, bumps the wrench chip, then goes still ---- */
  await page.evaluate(() => drive(5));   /* a fresh run: the checks above may have carried the car past a finish line */
  await page.waitForTimeout(200);
  const impact = await page.evaluate(async () => {
    const b = props.find(p => p.type === 'barrel' || p.type === 'rock');
    if (!b) return { skip: true };
    targetLane = laneVis = b.lane; camReset();
    pos = b.x - 300 - 100; v = 500;
    const t0 = performance.now();
    while (!b.done && performance.now() - t0 < 800) await new Promise(r => setTimeout(r, 8));
    await new Promise(r => setTimeout(r, 30));
    const live = { x: camFxX, y: camFxY, canvas: roadCanvas.style.transform, world: worldEl.style.transform, hud: getComputedStyle(hudStars).transform,
      debris: document.querySelectorAll('.debris').length, bump: hudDamage.classList.contains('bump'), freeze: freezeUntil - t0 };
    /* shake is over by ~300 ms and debris chips clear at 420 ms; wait on the state, not the clock */
    const stillMs = await __until(() => shakeDur === 0 && document.querySelectorAll('.debris').length === 0, 3000);
    const still = { x: camFxX, y: camFxY, canvas: roadCanvas.style.transform, debris: document.querySelectorAll('.debris').length, stillMs };
    return { done: b.done, live, still };
  });
  check('feel: hard hit = shake offset within 50 ms on canvas + #world (HUD untouched), 5..8 debris chips, wrench bump; then still and clear',
    impact.skip || (impact.done && (impact.live.x !== 0 || impact.live.y !== 0) && impact.live.canvas !== '' && impact.live.canvas === impact.live.world
      && impact.live.hud === 'none' && impact.live.debris >= 5 && impact.live.debris <= 8 && impact.live.bump
      && impact.still.x === 0 && impact.still.y === 0 && impact.still.canvas === '' && impact.still.debris === 0), JSON.stringify(impact));

  /* ---- stars: the sprite pops (keyframe), three sparks streak to the chip, the chip pops ---- */
  await page.evaluate(() => drive(1));
  await page.waitForTimeout(200);
  const starFx = await page.evaluate(async () => {
    const s = props.find(p => p.type === 'star' && p.lane === 1 && p.h <= 90);
    if (!s) return { skip: true };
    pos = s.x - 300 - 40; v = 300;
    await new Promise(r => setTimeout(r, 120));
    await __until(() => s.done, 1500);
    await __until(() => document.querySelectorAll('.flyStar.spark').length === 3, 500);
    const anim = getComputedStyle(s.el).animationName;
    const out = { done: s.done, anim, sparks: document.querySelectorAll('.flyStar.spark').length, chipPop: hudStars.classList.contains('pop') };
    v = 0;
    await __until(() => document.querySelectorAll('.flyStar.spark').length === 0, 2000);
    out.sparksGone = document.querySelectorAll('.flyStar.spark').length;
    return out;
  });
  check('feel: star collect pops the sprite (starPop), 3 sparks fly to the star chip, the chip pops, sparks clear',
    starFx.skip || (starFx.done && starFx.anim === 'starPop' && starFx.sparks === 3 && starFx.chipPop && starFx.sparksGone === 0), JSON.stringify(starFx));

  /* ---- reduced motion: the camera snaps and sits still, no debris, no sparks ---- */
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => drive(1));
  await page.waitForTimeout(200);
  const rm = await page.evaluate(async () => {
    const out = { rollOK };
    setLane(2);
    await new Promise(r => setTimeout(r, 80));
    out.lagGap = Math.abs(camX - camXT);
    const p0 = pos; v = 700; gasKey = true;
    await __until(() => pos - p0 > 300, 2000);   /* a real stretch at full speed (simulated distance, not wall time) */
    out.fov = fovK; gasKey = false; v = 0;
    jumpY = 40; airborne = true; vy = -600;
    await new Promise(r => setTimeout(r, 60));
    out.dip = camDipY;
    buildLevel(5); pos = 0;
    const b = props.find(p => p.type === 'barrel' || p.type === 'rock');
    targetLane = laneVis = b.lane; camReset(); pos = b.x - 300 - 100; v = 500;
    const t0 = performance.now();
    while (!b.done && performance.now() - t0 < 800) await new Promise(r => setTimeout(r, 8));
    await new Promise(r => setTimeout(r, 30));
    out.hit = b.done; out.fx = [camFxX, camFxY]; out.canvas = roadCanvas.style.transform; out.debris = document.querySelectorAll('.debris').length;
    buildLevel(1); pos = 0; targetLane = laneVis = 1; camReset();
    const s = props.find(p => p.type === 'star' && p.lane === 1 && p.h <= 90);
    pos = s.x - 300 - 40; v = 300;
    await new Promise(r => setTimeout(r, 120));
    out.star = s.done; out.sparks = document.querySelectorAll('.flyStar.spark').length;
    return out;
  });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  check('reduced motion: camera snaps (no lag, FOV 1, no dip), a hit shakes nothing and throws no debris, a star sends no sparks',
    !rm.rollOK && rm.lagGap < 0.01 && rm.fov === 1 && rm.dip === 0 && rm.hit && rm.fx[0] === 0 && rm.fx[1] === 0 && rm.canvas === '' && rm.debris === 0 && rm.star && rm.sparks === 0, JSON.stringify(rm));
  await page.evaluate(() => drive(1));
  await page.waitForTimeout(200);

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

  /* ---- a clean line is faster (13.16): lane changes and landings scrub speed, so a swerving, jumping run differs from the ghost ---- */
  const scrub = await page.evaluate(async () => {
    drive(2); await new Promise(r => setTimeout(r, 300));
    v = 600; targetLane = 1; laneVis = 1; setLane(2); const one = v;
    v = 600; targetLane = 0; laneVis = 0; setLane(2); const two = v;
    v = 600; targetLane = 1; laneVis = 1; setLane(1); const same = v;
    v = 50; targetLane = 1; setLane(0); const slow = v;
    /* a landing: put the car just above the ground falling, let one frame run */
    v = 600; airborne = true; jumpY = 1; vy = -300; gasKey = false;
    await new Promise(r => setTimeout(r, 60));
    return { one, two, same, slow, landed: !airborne, vLand: v, LANE_SCRUB, LAND_SCRUB };
  });
  check('feel: a lane change scrubs 6% of the speed per lane crossed (none when parked or staying put), a landing scrubs 15%',
    Math.abs(scrub.one - 600 * scrub.LANE_SCRUB) < 1 && Math.abs(scrub.two - 600 * scrub.LANE_SCRUB * scrub.LANE_SCRUB) < 1 && scrub.same === 600 && scrub.slow === 50
      && scrub.landed && scrub.vLand < 600 * scrub.LAND_SCRUB + 2 && scrub.vLand > 600 * scrub.LAND_SCRUB * 0.9, JSON.stringify(scrub));

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
