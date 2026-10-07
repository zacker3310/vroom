/* world audio + live events: jingles/ambience beds never throw (audio locked or unlocked),
   events are scheduled per level and fire as the car passes them, star scales cover 8 worlds,
   quiet mode scales the ambience bed. */
const pw = require('playwright-core');
const os = require('os');
const EXE = process.env.CHROMIUM || os.homedir() + '/Library/Caches/ms-playwright/chromium-1117/chrome-mac/Chromium.app/Contents/MacOS/Chromium';
const URL = process.env.VROOM_URL || 'http://localhost:4173/index.html';

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

  await page.goto(URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(300);

  /* ---- static tables ---- */
  const tables = await page.evaluate(() => ({
    scales: Object.keys(STAR_SCALES).length,
    scaleLens: Object.values(STAR_SCALES).every(s => s.length >= 9 && s.every((r, i, a) => i === 0 || r > a[i - 1])),
    jingles: [1,2,3,4,5,6,7,8].every(w => typeof JINGLES[w] === 'function') && typeof JINGLES.parade === 'function',
    beds: [1,2,3,4,5,6,7,8].every(w => typeof AMBIENCE[w] === 'function') && typeof AMBIENCE.parade === 'function',
    worldEvents: [1,2,3,4,5,6,7,8].every(w => WORLD_EVENTS[w].length >= 1 && WORLD_EVENTS[w].every(k => typeof LIVE_EVENTS[k] === 'function')),
    eventKinds: Object.keys(LIVE_EVENTS).length
  }));
  check('star scale table has 8+ worlds, each a rising 9-step ladder', tables.scales >= 8 && tables.scaleLens, JSON.stringify(tables));
  check('jingle + ambience bed per world (+ parade)', tables.jingles && tables.beds);
  check('6-24 event kinds, every world mapped to valid kinds', tables.worldEvents && tables.eventKinds >= 6 && tables.eventKinds <= 24, 'kinds=' + tables.eventKinds);

  /* ---- scheduling invariants across all 80 levels ---- */
  const sched = await page.evaluate(() => {
    const rep = { missing: [], early: 0, late: 0, close: 0, unsorted: 0, offWorld: 0, total: 0 };
    for (let n = 1; n <= 80; n++) {
      buildLevel(n);
      if (n >= 3 && LEVEL_EVENTS.length < 1) rep.missing.push(n);
      const list = WORLD_EVENTS[worldOf(n)];
      for (let i = 0; i < LEVEL_EVENTS.length; i++) {
        const e = LEVEL_EVENTS[i];
        rep.total++;
        if (e.x < 600) rep.early++;
        if (e.x > LEVEL_LEN - 800) rep.late++;
        if (i && e.x - LEVEL_EVENTS[i - 1].x < 1200) rep.close++;
        if (i && e.x < LEVEL_EVENTS[i - 1].x) rep.unsorted++;
        if (!list.includes(e.kind)) rep.offWorld++;
      }
    }
    buildLevel(5); const a = LEVEL_EVENTS.map(e => e.x + e.kind).join();
    buildLevel(5); const b = LEVEL_EVENTS.map(e => e.x + e.kind).join();
    rep.seeded = a === b;
    return rep;
  });
  check('events scheduled for every level >= 3', sched.missing.length === 0, 'missing: ' + sched.missing.join(','));
  check('events respect lead 600 / tail 800 / gap 1200, sorted, world-matched', sched.early === 0 && sched.late === 0 && sched.close === 0 && sched.unsorted === 0 && sched.offWorld === 0, JSON.stringify(sched));
  check('event schedule is seeded (deterministic per level)', sched.seeded && sched.total > 80, 'total=' + sched.total);

  /* ---- drive one level per world with audio LOCKED (actx null) ---- */
  const lockedBefore = errors.length;
  const locked = await page.evaluate(async () => {
    const out = { actx: actx === null, fired: 0, overlays: 0, starHz: [] };
    for (let w = 1; w <= 8; w++) {
      drive(w * 10 - 5);
      await new Promise(r => setTimeout(r, 60));
      /* teleport to just past the first event so it fires on the next tick */
      const ev = LEVEL_EVENTS[0];
      if (ev) { pos = ev.x - CAR_SCREEN_X + 5; v = 400; }
      await new Promise(r => setTimeout(r, 120));
      out.fired += eventsFired;
      out.overlays += document.querySelectorAll('.liveEv').length;
      out.starHz.push(Math.round(starChimeFreq(4)));
      stopDrive();
    }
    return out;
  });
  check('audio locked: driving every world, events fire and draw, no exceptions', locked.actx && locked.fired >= 8 && locked.overlays >= 8 && errors.length === lockedBefore, JSON.stringify(locked) + ' ' + errors.slice(lockedBefore).join('|').slice(0, 200));
  check('star chime pitch differs between worlds', new Set(locked.starHz).size >= 5, locked.starHz.join(','));

  /* ---- every event kind renders + cleans up ---- */
  const kinds = await page.evaluate(async () => {
    drive(75);
    const rep = {};
    for (const k of Object.keys(LIVE_EVENTS)) {
      const before = runStars;
      fireEvent({ kind: k });
      rep[k] = document.querySelectorAll('.liveEv').length > 0;
      if (k === 'ufo') { await new Promise(r => setTimeout(r, 2500)); rep.ufoStar = runStars === before + 1; }
      document.querySelectorAll('.liveEv').forEach(e => e.remove());
    }
    stopDrive();
    await new Promise(r => setTimeout(r, 100));
    rep.leftover = document.querySelectorAll('.liveEv').length;
    return rep;
  });
  check('every event kind draws an overlay', Object.keys(kinds).filter(k => k !== 'ufoStar' && k !== 'leftover').every(k => kinds[k]), JSON.stringify(kinds));
  check('UFO beam awards one run star', kinds.ufoStar === true);

  /* ---- unlock audio in headless (context may stay suspended) ---- */
  const unlockedBefore = errors.length;
  const au = await page.evaluate(async () => {
    unlockAudio();
    const out = { actx: !!actx, state: actx && actx.state, beds: [], scrub: false, levelLoud: 0, levelQuiet: 0, quietTick: true };
    if (!actx) return out;
    for (let w = 1; w <= 8; w++) {
      drive(w * 10 - 2);
      await new Promise(r => setTimeout(r, 50));
      out.beds.push(!!(amb && amb.world === w && amb.nodes.length >= 1 && amb.master));
      out.scrub = out.scrub || !!(scrub && scrub.g);
      v = 500; await new Promise(r => setTimeout(r, 80));   /* a few ticks of ambTick/scrubSet */
      stopDrive();
    }
    /* parade fanfare + bed, then free drive theme switch */
    progress.levels = {}; for (let n = 1; n <= 80; n++) progress.levels[n] = { stars: 3, best: 1, tier: 'S' };
    driveParade(); await new Promise(r => setTimeout(r, 50)); out.parade = !!(amb && amb.world === 'parade'); stopDrive();
    driveFree(); await new Promise(r => setTimeout(r, 50));
    pos = 7100; await new Promise(r => setTimeout(r, 80));
    out.freeSwitch = !!(amb && amb.world === 2);
    stopDrive();
    /* quiet mode scales the bed target */
    progress.quiet = false; out.levelLoud = ambTargetLevel();
    progress.quiet = true; out.levelQuiet = ambTargetLevel();
    drive(12); await new Promise(r => setTimeout(r, 50));
    try { ambTickT = 1; ambTick(0.5); } catch (e) { out.quietTick = false; }
    stopDrive();
    progress.quiet = false;
    return out;
  });
  check('audio unlocked: AudioContext exists, bed nodes built for all 8 worlds, scrub layer exists', au.actx && au.beds.every(Boolean) && au.scrub, JSON.stringify(au));
  check('parade bed + free-drive bed switches with the world', au.parade && au.freeSwitch);
  check('quiet mode scales ambience gain (0.22x)', au.levelQuiet > 0 && Math.abs(au.levelQuiet / au.levelLoud - 0.22) < 1e-6 && au.quietTick, au.levelLoud + ' -> ' + au.levelQuiet);
  check('audio unlocked: no exceptions while driving', errors.length === unlockedBefore, errors.slice(unlockedBefore).join('|').slice(0, 300));

  /* ---- perf: level 80 frame time median with everything on ---- */
  const perf = await page.evaluate(async () => {
    drive(80);
    const dts = [];
    let last = performance.now();
    await new Promise(r => {
      const loop = () => {
        const n = performance.now(); dts.push(n - last); last = n;
        gasKey = true;
        if (dts.length < 150) requestAnimationFrame(loop); else r();
      };
      requestAnimationFrame(loop);
    });
    gasKey = false; stopDrive();
    dts.sort((a, b) => a - b);
    return { median: dts[Math.floor(dts.length / 2)], p90: dts[Math.floor(dts.length * 0.9)] };
  });
  check('perf: level 80 median frame <= 17ms', perf.median <= 17, JSON.stringify(perf));

  await page.evaluate(() => showGarage());
  check('no console errors', errors.length === 0, errors.join(' | ').slice(0, 400));

  await browser.close();
  const fails = results.filter(r => !r.ok);
  console.log(`\n${results.length - fails.length}/${results.length} passed`);
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
