/* ghost-check: the ghost race (v12.5, T17.3).
   A level run is sampled every 0.2 s into progress.levels[n].ghost = { t, p }; the next run on that level spawns a
   translucent twin that follows the trace through the road projector; a faster run replaces the ghost with a medal
   flourish, a slower one changes nothing; the gap chip shows signed seconds; ghosts live in localStorage only. */
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
  const page = await browser.newPage({ viewport: { width: 1200, height: 700 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));

  await page.goto(URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(300);

  /* wait for the finish flag from inside the page (polling keeps the suite independent of run length) */
  const untilFinished = () => page.waitForFunction(() => finished, null, { timeout: 15000 });

  /* ---- 1. first run on level 1: no ghost on the road, the gap chip stays hidden; the trace is stored at the line ---- */
  const first = await page.evaluate(async () => {
    drive(1);
    const during = { sprite: ghostSprite === null, trace: ghostTrace === null, chipOn: hudGhost.classList.contains('on'), rec: Array.isArray(ghostRec) && ghostRec.length === 3 };
    pos = LEVEL_LEN - 2200; gasKey = true;
    await new Promise(r => setTimeout(r, 800));
    setLane(2);
    return during;
  });
  await untilFinished();
  const stored = await page.evaluate(() => {
    gasKey = false;
    const g = progress.levels[1].ghost;
    return { has: !!g, t: g && g.t, n: g && g.p.length, mod: g && g.p.length % 3, ints: g && g.p.every(x => Number.isInteger(x)),
      lanes: g && [...new Set(g.p.filter((x, i) => i % 3 === 1))].sort((a, b) => a - b), bestTime: progress.levels[1].bestTime, run: +runTime.toFixed(2),
      lastPos: g && g.p[g.p.length - 3], mono: g && g.p.filter((x, i) => i % 3 === 0).every((x, i, a) => i === 0 || x >= a[i - 1]),
      newBest: document.getElementById('celebrateTime').classList.contains('newBest'), win: !!document.querySelector('#celebrateTime .ghostWin') };
  });
  check('first run: no ghost sprite, chip hidden, recording armed with its t=0 sample', first.sprite && first.trace && !first.chipOn && first.rec, JSON.stringify({ sprite: first.sprite, trace: first.trace, chipOn: first.chipOn, rec: first.rec }));
  check('first run: trace stored as { t, p }: t = run time, flat ints x3, >= 2 samples, monotonic pos, lane 1 then 2, ends at the line',
    stored.has && Math.abs(stored.t - stored.run) < 0.05 && stored.n >= 6 && stored.mod === 0 && stored.ints && stored.lanes[0] === 100 && stored.lanes[stored.lanes.length - 1] === 200
      && stored.mono && stored.lastPos > 0, JSON.stringify(stored));
  check('first run: no ghost to beat = plain medal, no ghost check on the time chip', !stored.newBest && !stored.win, JSON.stringify({ newBest: stored.newBest, win: stored.win }));
  const ghostA = stored.t;

  /* ---- 2. replay: the twin spawns, follows the trace (lane 2 at a known time, moving ahead in depth), the chip reads behind ---- */
  await page.waitForTimeout(600);
  await page.evaluate(() => document.getElementById('replayBtn').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 7 })));
  await page.waitForTimeout(250);
  const spawn = await page.evaluate(() => {
    pos = LEVEL_LEN - 2200;   /* the same jump as the recorded run, so the twin starts beside the kid */
    const el = document.querySelector('#world .prop.ghost');
    return { sprite: !!ghostSprite, inDom: !!el, inProps: props.some(p => p.type === 'ghost'), chipOn: hudGhost.classList.contains('on'),
      clean: el && !el.querySelector('.mudSpots, .dmgScuff, .dmgCrack, .dmgSmoke, .hitbox'), ring: el && !!el.querySelector('ellipse[stroke-dasharray]'),
      car: el && el.querySelectorAll('svg').length >= 1, opacity: el && getComputedStyle(el).opacity, trace: ghostTrace === progress.levels[1].ghost,
      r: hudGhost.getBoundingClientRect(), lv: hudLevel.getBoundingClientRect(), pr: document.getElementById('hudProgress').getBoundingClientRect() };
  });
  check('replay: one ghost sprite in #world (not in props), the kid\'s car art with no mud / dings / hitbox, dashed ring, chip on',
    spawn.sprite && spawn.inDom && !spawn.inProps && spawn.chipOn && spawn.clean && spawn.ring && spawn.car && spawn.trace, JSON.stringify({ ...spawn, r: undefined, lv: undefined, pr: undefined }));
  check('hud: the ghost chip sits under the level chip (left 136, top 132, 12px gap), >= 64px tall, clear of the progress bar',
    Math.round(spawn.r.left) === 136 && Math.round(spawn.r.top) === 132 && Math.round(spawn.r.left) === Math.round(spawn.lv.left) && Math.round(spawn.r.top - spawn.lv.bottom) === 12 && spawn.r.height >= 64 && spawn.r.right <= spawn.pr.left,
    JSON.stringify({ left: spawn.r.left, top: spawn.r.top, h: spawn.r.height, lvBottom: spawn.lv.bottom, prLeft: spawn.pr.left }));
  /* wait on the ghost's own clock (wall time drifts under load), then sample */
  await page.waitForFunction(() => ghostT >= 1.6, null, { timeout: 5000 });
  const s1 = await page.evaluate(() => {
    const tf = ghostSprite.wrap.style.transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\) scale\(([\d.]+)\)/);
    return { t: +ghostT.toFixed(2), lane: +ghostAt(ghostT)[1].toFixed(2), lx: ghostSprite.lx, z: Math.round(ghostSprite.x - curCarX), sx: +tf[1], sy: +tf[2], s: +tf[3],
      vis: ghostSprite.vis, display: ghostSprite.wrap.style.display, zi: ghostSprite.zi, chip: hudGhost.textContent.trim(), behind: hudGhost.classList.contains('behind'),
      ahead: hudGhost.classList.contains('ahead'), kidX: carScreenX() };
  });
  await page.screenshot({ path: SHOT + 'ghost-replay.png' });
  await page.waitForTimeout(500);
  const s2 = await page.evaluate(() => {
    const tf = ghostSprite.wrap.style.transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\) scale\(([\d.]+)\)/);
    return { t: +ghostT.toFixed(2), z: Math.round(ghostSprite.x - curCarX), sx: +tf[1], sy: +tf[2], s: +tf[3], zi: ghostSprite.zi };
  });
  check('replay: at t~1.6 the twin is in the recorded lane 2 (lx = LANE_W), ahead of the parked kid (z > 0, right of them on screen, smaller, behind the car in z-order)',
    s1.t > 1.4 && s1.t < 2.2 && Math.abs(s1.lane - 2) < 0.08 && Math.abs(s1.lx - 240) < 2 && s1.z > 200 && s1.sx > s1.kidX && s1.s < 1 && s1.vis && s1.display === 'block' && s1.zi < 19990, JSON.stringify(s1));
  check('replay: the twin keeps moving: depth, screen x/y and scale all change over the next half second', s2.z > s1.z + 100 && s2.sx !== s1.sx && s2.sy < s1.sy && s2.s < s1.s && s2.zi < s1.zi, JSON.stringify({ s1, s2 }));
  check('hud: with the kid parked the chip reads a negative gap to two decimals in putty (behind)', /^-\d+\.\d{2}$/.test(s1.chip) && s1.behind && !s1.ahead, JSON.stringify({ chip: s1.chip, behind: s1.behind }));

  /* ---- 3. a slower run keeps the old ghost ---- */
  await page.evaluate(() => { gasKey = true; });
  await untilFinished();
  const slower = await page.evaluate(() => {
    gasKey = false;
    return { t: progress.levels[1].ghost.t, run: +runTime.toFixed(2), newBest: document.getElementById('celebrateTime').classList.contains('newBest'),
      win: !!document.querySelector('#celebrateTime .ghostWin'), chipHidden: getComputedStyle(hudGhost).display === 'none' };
  });
  check('slower run: the stored ghost keeps its time, no flourish, chip hidden during the celebration', slower.run > ghostA && slower.t === ghostA && !slower.newBest && !slower.win && slower.chipHidden, JSON.stringify({ ghostA, ...slower }));

  /* ---- 4. a faster run (engine 3, a bigger head start) replaces it: medal pop + ghost check; the chip read ahead; the twin fades past its line ---- */
  await page.waitForTimeout(600);
  await page.evaluate(() => { progress.upgrades.engine = 3; document.getElementById('replayBtn').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 7 })); });
  await page.waitForTimeout(250);
  await page.evaluate(() => { pos = LEVEL_LEN - 1000; gasKey = true; });
  await page.waitForTimeout(1200);
  const mid = await page.evaluate(() => ({ chip: hudGhost.textContent.trim(), ahead: hudGhost.classList.contains('ahead'), behind: hudGhost.classList.contains('behind') }));
  check('hud: out in front the chip reads a positive gap to two decimals in green (ahead)', /^\+\d+\.\d{2}$/.test(mid.chip) && mid.ahead && !mid.behind, JSON.stringify(mid));
  await untilFinished();
  const faster = await page.evaluate(() => {
    gasKey = false;
    const g = progress.levels[1].ghost;
    return { t: g.t, run: +runTime.toFixed(2), n: g.p.length, newBest: document.getElementById('celebrateTime').classList.contains('newBest'),
      win: !!document.querySelector('#celebrateTime .ghostWin'), medal: !!document.querySelector('#celebrateTime .medal svg'), rolling: ghostSprite.vis };
  });
  check('faster run: the ghost is replaced by this run, the medal pops with a ghost + check beside it', faster.run < ghostA && Math.abs(faster.t - faster.run) < 0.05 && faster.newBest && faster.win && faster.medal, JSON.stringify({ ghostA, ...faster }));
  /* the old ghost was still 1200 units behind the camera when the kid crossed; its own clock keeps rolling, it drives through the frame, then fades */
  await page.waitForFunction(() => ghostT > 3.0, null, { timeout: 8000 });
  const rolling = await page.evaluate(() => ({ finished, vis: ghostSprite.vis, t: +ghostT.toFixed(2), z: Math.round(ghostSprite.x - curCarX), op: ghostSprite.el.style.opacity }));
  await page.waitForFunction(() => ghostT > ghostTrace.t + 0.9, null, { timeout: 8000 });
  const faded = await page.evaluate(() => ({ vis: ghostSprite.vis, display: ghostSprite.wrap.style.display, over: +(ghostT - ghostTrace.t).toFixed(2) }));
  check('replay: the old twin (behind the camera at the kid\'s finish) rolls on by its own clock after the kid finishes, then is gone 0.8 s past its own line',
    !faster.rolling && rolling.finished && rolling.vis && rolling.z > -260 && +rolling.op > 0 && !faded.vis && faded.display === 'none', JSON.stringify({ rolling, faded }));
  const ghostB = faster.t;

  /* ---- 5. persistence: reload keeps it, the full save code leaves it out, a malformed stored ghost is dropped ---- */
  const code = await page.evaluate(async () => { const c = await exportFullCode(); const d = await decodeSaveCode(c); return { has1: !!d.levels[1], ghost: d.levels[1].ghost, keyHas: /"ghost"/.test(localStorage.getItem(saveKey())) }; });
  check('save code: the full code carries the level but no ghost; localStorage does', code.has1 && code.ghost === undefined && code.keyHas, JSON.stringify(code));
  await page.reload();
  await page.waitForTimeout(400);
  const reload = await page.evaluate(() => { const g = progress.levels[1].ghost; return { t: g && g.t, n: g && g.p.length }; });
  check('save: the ghost survives a reload with the same time and samples', reload.t === ghostB && reload.n === faster.n, JSON.stringify({ ghostB, ...reload }));
  await page.evaluate(() => {
    const k = saveKey(); const s = JSON.parse(localStorage.getItem(k));
    s.levels[1].ghost = { t: 'x', p: [1, 2, 3, 4, 5, 6] };
    s.levels[2] = { best: 3, rating: 1, ghost: { t: 4, p: [1, 2, 3, 4, 5] } };
    s.levels[3] = { best: 3, rating: 1, ghost: { t: 4, p: [1, 2, 'a', 4, 5, 6] } };
    localStorage.setItem(k, JSON.stringify(s));
  });
  await page.reload();
  await page.waitForTimeout(400);
  const dropped = await page.evaluate(() => {
    const out = { g1: progress.levels[1].ghost, g2: progress.levels[2].ghost, g3: progress.levels[3].ghost, kept: !!progress.levels[2] };
    drive(2);
    out.chipOn = hudGhost.classList.contains('on'); out.sprite = ghostSprite; out.trace = ghostTrace;
    showGarage();
    return out;
  });
  check('load: malformed ghosts (bad t, length not x3, non-numeric) are dropped, the level itself stays; a level with no ghost drives with no twin and no chip',
    dropped.g1 === undefined && dropped.g2 === undefined && dropped.g3 === undefined && dropped.kept && !dropped.chipOn && dropped.sprite === null && dropped.trace === null, JSON.stringify(dropped));

  check('no console errors', errors.length === 0, errors.join(' | ').slice(0, 300));

  await browser.close();
  const fails = results.filter(r => !r.ok);
  console.log(`\n${results.length - fails.length}/${results.length} passed`);
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
