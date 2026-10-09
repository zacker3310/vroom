/* world audio + live events: jingles/ambience beds never throw (audio locked or unlocked),
   events are scheduled per level and fire as the car passes them, star scales cover 8 worlds,
   quiet mode scales the ambience bed. v13: the engine's gear bands and body voices, the per-world
   music bed (scheduler, intensity, riser, finish duck, teardown, quiet) and the pass-by whoosh. */
const pw = require('playwright-core');
const os = require('os');
const EXE = process.env.CHROMIUM || os.homedir() + '/Library/Caches/ms-playwright/chromium-1117/chrome-mac/Chromium.app/Contents/MacOS/Chromium';
const URL = process.env.VROOM_URL || 'http://localhost:4173/index.html';
const ENGINE_TRUCK_BASE = 34;   /* ENGINE_VOICES.truck.base: the race voice must idle above it */

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
  check('star scale table covers at least 8 worlds, each a rising 9-step ladder', tables.scales >= 8 && tables.scaleLens, JSON.stringify(tables));
  check('jingle + ambience bed per world (+ parade)', tables.jingles && tables.beds);
  check('6+ event kinds, every world mapped to valid kinds', tables.worldEvents && tables.eventKinds >= 6, 'kinds=' + tables.eventKinds);

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

  /* ---- engine, music bed, pass-by (audio graph checks: Playwright can't hear) ---- */
  const tabs = await page.evaluate(() => {
    const worlds = [1,2,3,4,5,6,7,8,9,10,11,12,'parade'];
    const ok = worlds.every(w => MUSIC[w] && MUSIC[w].bpm > 40 && MUSIC[w].bass.length >= 32 && MUSIC[w].arp.length >= 8 && MUSIC[w].perc.length >= 6
      && [...MUSIC[w].bass + MUSIC[w].arp].every(c => c === '.' || NOTE_CH.includes(c)) && [...MUSIC[w].perc].every(c => '.kshK'.includes(c)));
    const fams = new Set(BODY_ORDER.map(b => ENGINE_FAMILY[b] || 'default'));
    const bases = new Set([...fams].map(f => ENGINE_VOICES[f].base));
    return { ok, fams: [...fams], bases: bases.size, gears: [...fams].map(f => ENGINE_VOICES[f].gears), whine: ENGINE_VOICES.whine.kind === 'whine' && ENGINE_VOICES.whine.gears === 1 };
  });
  check('music table: a valid loop for all 12 worlds + parade (bass sets the length, arp/perc repeat)', tabs.ok);
  check('engine voices: 4+ body families with distinct idle pitch, a gearless whine for rocket/ufo', tabs.fams.length >= 4 && tabs.bases >= 4 && tabs.whine, JSON.stringify(tabs));

  const eng = await page.evaluate(async () => {
    const out = { sched: [], loops: [], amb: [] };
    for (let w = 1; w <= 12; w++) {
      drive(w * 10 - 3);
      await new Promise(r => setTimeout(r, 40));
      out.sched.push(!!(music && music.key === w && music.timer && music.nextT > actx.currentTime && music.loopDur > 5 && music.loopDur < 60));
      out.loops.push(music ? +music.loopDur.toFixed(2) : 0);
      out.amb.push(ambTargetLevel());
      stopDrive();
    }
    out.ambBare = ambTargetLevel();
    /* gears on the default dump truck (3 bands) */
    drive(5); await new Promise(r => setTimeout(r, 30));
    const g = [];
    const seq = []; for (let s = 0; s <= 700; s += 25) { engineSet(s, true, false); seq.push(engine.gear); }
    out.monotone = seq.every((x, i) => !i || x >= seq[i - 1]); out.top = seq[seq.length - 1]; out.bands = engine.voice.gears;
    for (let i = 0; i < 4; i++) engineSet(0, false, false);   /* one gear per call on the way down: settle to 0 */
    g.push(engine.gear);                                    /* 0 */
    engineSet(250, true, false); g.push(engine.gear);       /* u .357: still gear 0 (edge .333 + hysteresis .035) */
    engineSet(275, true, false); g.push(engine.gear);       /* u .393: gear 1 */
    engineSet(225, false, true); g.push(engine.gear);       /* u .321: holds gear 1 (hysteresis) */
    engineSet(200, false, true); g.push(engine.gear);       /* u .286: down to 0 */
    out.g = g; out.shifts = engine.shifts;
    /* race body: 4 bands, high pitch */
    const body = state.body; engineStop(); state.body = 'race'; engineStart();
    for (let s = 0; s <= 700; s += 25) engineSet(s, true, false);
    out.race = { gears: engine.voice.gears, gear: engine.gear, base: engine.voice.base };
    engineStop(); state.body = body;
    stopDrive();
    return out;
  });
  check('after drive(n): music scheduler running per world (timer, next note ahead of the clock, loop length)', eng.sched.every(Boolean), eng.loops.join(','));
  check('ambience bed sits lower under the music (x0.7), back to full after stopDrive', eng.amb.every(a => Math.abs(a / eng.ambBare - 0.7) < 1e-6), eng.amb[0] + ' vs ' + eng.ambBare);
  check('engine gear rises with v, shifts at band edges with hysteresis, downshifts on braking', eng.monotone && eng.top === eng.bands - 1 && eng.g.join('') === '00110' && eng.shifts >= 3, JSON.stringify({ g: eng.g, top: eng.top, bands: eng.bands, shifts: eng.shifts }));
  check('race body: 4 gear bands, higher idle than the truck', eng.race.gears === 4 && eng.race.gear === 3 && eng.race.base > ENGINE_TRUCK_BASE, JSON.stringify(eng.race));

  const pb = await page.evaluate(async () => {
    const out = {};
    drive(25); await new Promise(r => setTimeout(r, 40));
    window.__pb = []; const o = sfx.passby; sfx.passby = (k, pan) => { window.__pb.push([k, pan]); o(k, pan); };
    const pick = props.find(q => (q.type === 'cone' || q.type === 'barrel') && q.lane !== 1 && q.x > 1500);
    out.prop = pick && [pick.type, pick.lane];
    v = 500; pos = pick.x - CAR_SCREEN_X - 60;
    await new Promise(r => setTimeout(r, 180));
    out.fast = window.__pb.length; out.count = passByCount; out.args = window.__pb[0];
    /* below the speed floor: teleport past another prop, nothing plays */
    const slow = props.find(q => (q.type === 'cone' || q.type === 'barrel') && q.lane !== 1 && q !== pick) || pick;
    v = 100; pos = slow.x - CAR_SCREEN_X - 20; await new Promise(r => setTimeout(r, 180));
    out.slowAdded = window.__pb.length - out.fast;
    /* rate limit: two crossings in the same tick play once */
    v = 500; passByLast = performance.now(); passBy(props[0]); passBy(props[1]);
    out.limited = window.__pb.length === out.fast;
    /* intensity + riser + finish duck + teardown */
    v = 100; await new Promise(r => setTimeout(r, 160)); out.hiSlow = music.hi;
    v = 650; await new Promise(r => setTimeout(r, 160)); out.hiFast = music.hi;
    airborne = true; jumpY = 120; vy = 400; await new Promise(r => setTimeout(r, 60)); out.riser = !!music.riser;   /* a real jump, not one the next tick lands */
    airborne = false; jumpY = 0; vy = 0; await new Promise(r => setTimeout(r, 60)); out.riserOff = !music.riser;
    v = 0; finished = true; await new Promise(r => setTimeout(r, 160));
    out.ducked = music.ducked && Math.abs(musicTarget() - MUSIC_LEVEL * MUSIC_DUCK) < 1e-9;
    stopDrive();
    out.stopped = music === null && musicLive() === 0 && engine === null;
    sfx.passby = o;
    /* quiet mode: the bed is silent */
    progress.quiet = true; drive(12); await new Promise(r => setTimeout(r, 160));
    out.quiet = musicTarget() === 0 && music.master.gain.value <= 0.0001;
    stopDrive(); progress.quiet = false;
    return out;
  });
  check('pass-by at speed plays through sfx.passby (louder with speed, panned), silent below 250, rate-limited', pb.fast >= 1 && pb.count >= 1 && pb.args && pb.args[0] > 0.5 && Math.abs(pb.args[1]) > 0 && pb.slowAdded === 0 && pb.limited, JSON.stringify(pb));
  check('music intensity follows speed (arp/perc off when slow, on above 60%), riser while airborne', pb.hiSlow === 0 && pb.hiFast === 1 && pb.riser && pb.riserOff, JSON.stringify([pb.hiSlow, pb.hiFast, pb.riser, pb.riserOff]));
  check('finish ducks the music target; stopDrive stops the scheduler with no live music or engine nodes', pb.ducked && pb.stopped, JSON.stringify([pb.ducked, pb.stopped]));
  check('quiet mode: music gain never above 0', pb.quiet);

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
