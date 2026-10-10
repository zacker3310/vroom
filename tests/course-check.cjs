/* course-check: the wild courses (v12.9, T21) and the speed-linked mixer drum (T2.3).
   Corkscrews are a helix of stars through a tunnel of hoops; inside one the stage cuts to a side-view loop with the
   kid's car on it (13.14) and every star on the loop is the car's; hard turns get chevron boards on their
   outside; roller levels run a train of big hills; mega ramps and hop chains launch by their own numbers
   through the one launch rule the fairness bots share; the chase-cam mixer drum turns with the road speed.
   Reduced motion keeps the hoops and skips the cutaway. */
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

  /* ---- 1. content across all 120 levels ---- */
  const scan = await page.evaluate(() => {
    const out = [];
    for (let n = 1; n <= MAX_LEVEL; n++) {
      buildLevel(n);
      const tw = TWISTS.map(t => ({ ...t,
        stars: props.filter(p => p.type === 'star' && p.x > t.x0 && p.x < t.x1).length,
        blockers: props.filter(p => BLOCKER_T(p.type) && inTwist(p.x, 150)).length }));
      const hard = COURSE.filter(c => c.hard);
      const chev = scenery.filter(p => p.chevron);
      /* each board belongs to the hard stretch it is nearest: it must stand on that stretch's outside verge */
      const dist = (p, c) => p.x < c.x0 ? c.x0 - p.x : p.x > c.x1 ? p.x - c.x1 : 0;
      const owner = p => hard.reduce((m, c) => dist(p, c) < dist(p, m) ? c : m, hard[0]);
      const chevOutside = chev.every(p => Math.sign(p.lx) === -Math.sign(owner(p).k)) && hard.every(c => chev.filter(p => owner(p) === c).length >= 2);
      const kinds = RAMPS.map(r => r.kick === 1.1 ? 'mega' : r.kick === 0.55 ? 'hop' : 'std');
      const landClear = RAMPS.every(r => !props.some(p => BLOCKER_T(p.type) && p.x > r.x - 200 && p.x < r.x + r.w + (r.tail || 420)));
      const sorted = RAMPS.slice().sort((p, q) => p.x - q.x);
      const lastLand = RAMPS.length ? Math.max(...RAMPS.map(rp => rp.x + rp.w + (rp.tail || 420))) : 0;
      const rampsApart = sorted.every((p, i) => !i || p.x >= sorted[i - 1].x + sorted[i - 1].w + (sorted[i - 1].tail || 420));
      const rampInTwist = RAMPS.some(rp => TWISTS.some(t => rp.x - 250 < t.x1 + 150 && rp.x + rp.w + (rp.tail || 420) > t.x0 - 150));
      const flightFits = RAMPS.filter(r => r.kick).every(r => rampFlight(r, worldOf(n)) <= r.w + r.tail);
      out.push({ n, shape: (WORLD_ROAD[worldOf(n)] || WORLD_ROAD[8]).order[(n - 1) % 10], tw, hard: hard.length, chevOutside, chev: chev.length,
        bigHills: HILLS.filter(h => Math.abs(h.amp) >= 110).length, kinds, landClear, flightFits, rampInTwist, rampsApart, lastLand, len: LEVEL_LEN, beats: lastBeats.slice(),
        archInTwist: scenery.some(p => !p.chevron && p.lx === 0 && inTwist(p.x, 300)) });
    }
    return out;
  });
  const by = n => scan[n - 1];
  const twistLvls = scan.filter(r => r.tw.length);
  check('corkscrews: every world has a corkscrew level, finales from world 2 carry one, level 9 is the first',
    [...Array(12)].every((_, w) => scan.slice(w * 10, w * 10 + 10).some(r => r.shape === 'corkscrew' && r.tw.length)) &&
      [...Array(11)].every((_, w) => by((w + 2) * 10).tw.length >= 1) && twistLvls[0].n === 9 && !by(10).tw.length,
    'levels with twists: ' + twistLvls.map(r => r.n).join(','));
  check('corkscrews: two opposite twists on corkscrew levels from world 3', scan.filter(r => r.shape === 'corkscrew' && r.n > 20).every(r => r.tw.length === 2 && r.tw[0].dir === -r.tw[1].dir),
    scan.filter(r => r.shape === 'corkscrew').map(r => r.n + ':' + r.tw.length).join(' '));
  check('corkscrews: stars only inside a twist (no blockers within 150), a helix of >= 8 stars each, no overhead arch in one',
    twistLvls.every(r => r.tw.every(t => !t.blockers && t.stars >= 8) && !r.archInTwist),
    twistLvls.filter(r => r.tw.some(t => t.blockers || t.stars < 8) || r.archInTwist).map(r => 'L' + r.n + JSON.stringify(r.tw.map(t => [t.stars, t.blockers]))).join(' '));
  check('corkscrews: the helix is its own beat in the level sequence', twistLvls.every(r => r.beats.includes('corkscrew')));
  const hardLvls = scan.filter(r => r.shape === 'switchback' || r.shape === 'zigzag');
  check('hard turns: thirteen switchback / zigzag levels, each with >= 3 hard stretches, none before world 3',
    hardLvls.length === 13 && hardLvls.every(r => r.hard >= 3) && scan.slice(0, 20).every(r => !r.hard),
    hardLvls.map(r => `L${r.n}:${r.hard}`).join(' '));
  check('hard turns: chevron boards (>= 2 per turn) on the outside verge of every hard stretch, none on soft roads',
    scan.every(r => r.chevOutside) && scan.filter(r => !r.hard).every(r => !r.chev), scan.filter(r => !r.chevOutside).map(r => 'L' + r.n).join(','));
  const rollers = scan.filter(r => r.shape === 'roller');
  check('roller: nine roller levels, each a train of >= 3 big hills, even in the flat worlds (construction, rain, beach)',
    rollers.length === 9 && rollers.every(r => r.bigHills >= 3), rollers.map(r => `L${r.n}:${r.bigHills}`).join(' '));
  /* opaque crests (13.12): on the run-up to the first big hill of a roller level the crest is a wall: nothing on the
     lower ground beyond it is visible at all, nothing in front of it is clipped, and the strip above the crest line is
     haze (the far plain used to show there in full). Within 120 of the crest the veil is gone and the far side shows. */
  const occ = await page.evaluate(async () => {
    drive(18);
    const h = HILLS[0];
    pos = h.x0 - (h.x1 - h.x0) * 0.15 - CAR_SCREEN_X; v = 0;
    await new Promise(r => setTimeout(r, 200));
    const crestX = (h.x0 + h.x1) / 2, carX = pos + CAR_SCREEN_X - CAR_HIT_Z;
    const all = props.concat(scenery), vis = all.filter(p => p.vis);
    const beyond = all.filter(p => p.x > crestX + 200 && p.x < carX + DRAW_FAR && elevAt(p.x) < elevAt(crestX) - 8);
    const front = vis.filter(p => p.x < crestX - 60), cutFront = front.filter(p => p.wrap.style.clipPath);
    const bk = roadCanvas.width / 1200, c = roadCanvas.getContext('2d');
    const px = (x, y) => { const d = c.getImageData(Math.round(x * bk), Math.round(y * bk), 1, 1).data; return '#' + [d[0], d[1], d[2]].map(v => v.toString(16).padStart(2, '0')).join(''); };
    const near = (a, b, tol) => { const n = parseInt(a.slice(1), 16), m = parseInt(b.slice(1), 16); return [16, 8, 0].every(sh => Math.abs(((n >> sh) & 255) - ((m >> sh) & 255)) <= tol); };
    const top = px(600, HORIZON + 2), mid = px(600, (HORIZON + occTop) / 2);
    const first = { hid: occHid, a: occA, top: Math.round(occTop), beyond: beyond.length, beyondVis: beyond.filter(p => p.vis).length, front: front.length, cutFront: cutFront.length,
      topIsHaze: near(top, roadPal.haze, 24), midNotGround: !near(mid, roadPal.ground, 10) && !near(mid, roadPal.ground2, 10), crestBelowHorizon: occTop > HORIZON + 5 };
    pos = crestX - CAR_SCREEN_X + CAR_HIT_Z; v = 0;   /* on the crest: the ground ahead only turns away past it */
    await new Promise(r => setTimeout(r, 200));
    const atCrest = { hid: occHid, a: occA, beyondVis: beyond.filter(p => p.vis && p.x - (pos + CAR_SCREEN_X - CAR_HIT_Z) < DRAW_FAR - FADE).length };
    return { amp: h.amp, first, atCrest };
  });
  await page.screenshot({ path: SHOT + 'course-hill-occlusion.png' });
  check('hills: on the run-up a crest is a wall: the lower ground beyond it and everything on it is hidden, the strip above the crest is haze, nothing in front is clipped',
    occ.amp > 150 && occ.first.hid && occ.first.a === 1 && occ.first.beyond >= 3 && occ.first.beyondVis === 0 && occ.first.front >= 1 && occ.first.cutFront === 0 && occ.first.topIsHaze && occ.first.midNotGround && occ.first.crestBelowHorizon, JSON.stringify(occ.first));
  check('hills: on the crest the veil is gone and the far side is back', !occ.atCrest.hid && occ.atCrest.a === 0 && occ.atCrest.beyondVis >= 1, JSON.stringify(occ.atCrest));
  const kinds = scan.flatMap(r => r.kinds);
  const hopRuns = scan.filter(r => r.kinds.join(',').includes('hop,hop,hop'));
  check('jumps: mega ramps and three-kicker hop chains appear across the 120 levels, standard ramps still lead (a chain counts once)',
    kinds.filter(k => k === 'mega').length >= 8 && hopRuns.length >= 8 && kinds.filter(k => k === 'std').length > kinds.filter(k => k === 'mega').length + kinds.filter(k => k === 'hop').length / 3 && scan.slice(0, 2).every(r => r.kinds.every(k => k === 'std')),
    `mega ${kinds.filter(k => k === 'mega').length}, hop chains on ${hopRuns.length} levels, std ${kinds.filter(k => k === 'std').length}/${kinds.length}`);
  check('jumps: every level keeps at least one jump, and no ramp (run-up to touchdown) crosses a corkscrew',
    scan.every(r => r.kinds.length >= 1 && !r.rampInTwist), scan.filter(r => !r.kinds.length || r.rampInTwist).map(r => 'L' + r.n).join(','));
  check('jumps: no ramp starts inside another ramp\'s deck or flight (decks never stack)', scan.every(r => r.rampsApart), scan.filter(r => !r.rampsApart).map(r => 'L' + r.n).join(','));
  check('jumps: every ramp (deck and flight) is behind the car before the last 600 units: no ramp past the flags, no finish on a slope or in the air',
    scan.every(r => r.lastLand <= r.len - 600), scan.filter(r => r.lastLand > r.len - 600).map(r => `L${r.n}:${r.lastLand}/${r.len}`).join(' '));
  check('jumps: every landing zone is clear of blockers and every special flight fits its tail',
    scan.every(r => r.landClear && r.flightFits), scan.filter(r => !r.landClear || !r.flightFits).map(r => 'L' + r.n).join(','));

  /* ---- 2. the loop maths and the one launch rule ---- */
  const math = await page.evaluate(() => {
    buildLevel(9);
    const megaFast = rampLaunch({ x: 0, ...RAMP_KIND.mega }, 940), stdFast = rampLaunch({ x: 0, w: 250, h: 95 }, 940);
    const ramp = rampLaunch({ x: 0, w: 250, h: 95 }, 700), mega = rampLaunch({ x: 0, ...RAMP_KIND.mega }, 700), hop = rampLaunch({ x: 0, ...RAMP_KIND.hop }, 700), none = rampLaunch(null, 700);
    let mono = true, prev = -1;
    for (let u = 0; u <= 1.0001; u += 0.01) { const a = loopPt(u)[2]; if (a < prev - 1e-9) mono = false; prev = a; }
    const g0 = loopPt(0), gIn = loopPt(LOOP_IN), top = loopPt(0.5), gOut = loopPt(1 - LOOP_IN), g1 = loopPt(1);
    return { g0, gIn, top, gOut, g1, mono, ramp, mega, hop, none, megaFast, stdFast, R: LOOP_RIDE, cy: LOOP_CY, gy: LOOP_GY };
  });
  check('loop: on the ground at both ends, angle 0 at the run-in, pi (upside down at the top of the ring) halfway, 2pi at the run-out, never backwards',
    math.g0[1] === math.gy && math.g0[2] === 0 && math.g1[1] === math.gy && Math.abs(math.gIn[2]) < 1e-9 && Math.abs(math.top[2] - Math.PI) < 1e-9
      && Math.abs(math.top[1] - (math.cy - math.R)) < 1e-6 && Math.abs(math.gOut[2] - Math.PI * 2) < 1e-9 && Math.abs(math.g1[2] - Math.PI * 2) < 1e-9 && math.mono,
    JSON.stringify({ g0: math.g0, gIn: math.gIn, top: math.top, gOut: math.gOut, g1: math.g1, mono: math.mono }));
  check('launch rule: standard ramp unchanged (95 high, 0.9 of the speed, any engine), mega 150 / 1.1 capped at 740 speed, kicker 45 / 0.55',
    math.ramp.y === 95 && math.ramp.vy === 630 && math.none.y === 95 && math.none.vy === 630 && math.mega.y === 150 && Math.abs(math.mega.vy - 770) < 1e-9 && math.hop.y === 45 && Math.abs(math.hop.vy - 385) < 1e-9
      && Math.abs(math.megaFast.vy - 814) < 1e-9 && Math.abs(math.stdFast.vy - 846) < 1e-9,
    JSON.stringify({ ramp: math.ramp, mega: math.mega, hop: math.hop, megaFast: math.megaFast, stdFast: math.stdFast }));

  /* ---- 3. driving through a corkscrew: the cutaway (13.14). The chase cam stays flat and level; while the car is
     inside the twist the side view is up with the kid's own car on the drawn loop (upside down at the midpoint), its
     stars popping as the simulation collects them in every lane; it cuts away on the far side ---- */
  const roll = await page.evaluate(async () => {
    window.__cork = 0; const o = sfx.corkscrew; sfx.corkscrew = () => { window.__cork++; o(); };
    drive(9);
    const t = TWISTS[0];
    pos = t.x0 - CAR_SCREEN_X - 400; v = 0;
    await new Promise(r => setTimeout(r, 900));   /* let the scene iris finish before any screenshot */
    const env = document.getElementById('env');
    const before = { on: loopView.classList.contains('on'), view: viewEl.style.transform, carRot: /rotate/.test(carWrap.style.transform), stars: props.filter(p => p.type === 'star' && p.x > t.x0 && p.x < t.x1).length };
    pos = (t.x0 + t.x1) / 2 - CAR_SCREEN_X; v = 0;   /* the cutaway runs on the hit point (pos + CAR_SCREEN_X), the one the stars pop against */
    await new Promise(r => setTimeout(r, 200));
    const m = /rotate\((-?[\d.]+)rad\)/.exec(loopCar.style.transform), ty = /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/.exec(loopCar.style.transform);
    const chips = ['hudLevel', 'hudStars'].map(id => { const r = document.getElementById(id).getBoundingClientRect(); const st = document.getElementById('stage').getBoundingClientRect(); const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!el && document.getElementById(id).contains(el) && st.width > 0; });
    const mid = { on: loopView.classList.contains('on'), display: getComputedStyle(loopView).display, car: !!loopCar.querySelector('svg'), carAngle: m ? +m[1] : 0, carY: ty ? +ty[2] : 0,
      loopStars: loopStars.length, drawn: loopView.querySelectorAll('.loopStar').length, view: viewEl.style.transform, env: env.style.transform, carRot: /rotate/.test(carWrap.style.transform), hudOnTop: chips.every(Boolean), canvas: [roadCanvas.width, roadCanvas.height] };
    return { before, mid, cork: window.__cork };
  });
  await page.screenshot({ path: SHOT + 'course-corkscrew.png' });
  for (const f of [-0.25, 0.25, 0.75]) {
    await page.evaluate(async f => { const t = TWISTS[0]; pos = t.x0 + (t.x1 - t.x0) * f - CAR_SCREEN_X + CAR_HIT_Z; await new Promise(r => setTimeout(r, 120)); }, f);
    await page.screenshot({ path: SHOT + `course-corkscrew-${Math.round(f * 100)}.png` });
  }
  check('corkscrew: chase cam before it (no cutaway, no roll); mid-twist the side view is up with the car on the loop upside down at the top, every twist star drawn on it, the HUD still on top, the chase cam flat and level beneath',
    !roll.before.on && !roll.before.carRot && roll.before.view === '' && roll.mid.on && roll.mid.display !== 'none' && roll.mid.car && Math.abs(Math.abs(roll.mid.carAngle) - Math.PI) < 0.05 && roll.mid.carY < 250
      && roll.mid.loopStars === roll.before.stars && roll.mid.drawn === roll.before.stars && roll.before.stars >= 8 && roll.mid.view === '' && roll.mid.env === '' && !roll.mid.carRot && roll.mid.hudOnTop && roll.mid.canvas[0] === 2400,
    JSON.stringify(roll));
  /* drive the whole twist at speed: every star on the loop is collected whatever its lane, and the view cuts back */
  const run = await page.evaluate(async () => {
    const t = TWISTS[0];
    pos = t.x0 - CAR_SCREEN_X - 200; v = 0; targetLane = 1; laneVis = 1;
    const before = runStars, n = props.filter(p => p.type === 'star' && p.x > t.x0 && p.x < t.x1 && !p.done).length;
    gasKey = true;
    const t0 = performance.now();
    while (pos + CAR_SCREEN_X - CAR_HIT_Z < t.x1 + 300 && performance.now() - t0 < 9000) await new Promise(r => setTimeout(r, 50));
    gasKey = false;
    await new Promise(r => setTimeout(r, 200));
    return { n, gained: runStars - before, left: props.filter(p => p.type === 'star' && p.x > t.x0 && p.x < t.x1 && !p.done).length, on: loopView.classList.contains('on'), scene: loopView.querySelectorAll('svg.loopScene').length, view: viewEl.style.transform, carRot: /rotate/.test(carWrap.style.transform), lanes: new Set(props.filter(p => p.type === 'star' && p.x > t.x0 && p.x < t.x1).map(p => p.lane)).size };
  });
  check('corkscrew: a whoosh on the way in; driven through in one lane every star on the loop (laid across lanes) is collected and the cutaway is gone on the far side',
    roll.cork >= 1 && run.n >= 8 && run.lanes >= 2 && run.gained === run.n && run.left === 0 && !run.on && run.scene === 0 && run.view === '' && !run.carRot, JSON.stringify({ cork: roll.cork, run }));

  /* ---- 4. hard turn: squeal at speed ---- */
  const hardTurn = await page.evaluate(async () => {
    const n = [21, 22, 23, 24, 25, 26, 27, 28, 29].find(k => (buildLevel(k), COURSE.some(c => c.hard)));
    drive(n);
    const c = COURSE.find(c => c.hard);
    window.__sq = 0; const o = sfx.squeal; sfx.squeal = () => { window.__sq++; o(); };
    pos = c.x0 - CAR_SCREEN_X - 200; v = 640; gasKey = true;
    await new Promise(r => setTimeout(r, 700));
    gasKey = false;
    const chev = scenery.filter(p => p.chevron && p.vis).length;
    sfx.squeal = o;
    return { n, sq: window.__sq, chev };
  });
  await page.screenshot({ path: SHOT + 'course-hardturn.png' });
  check('hard turn: the tires howl through it at speed, chevron boards on screen', hardTurn.sq >= 1 && hardTurn.chev >= 2, JSON.stringify(hardTurn));

  /* ---- 5. a mega ramp in the real physics loop ---- */
  const mega = await page.evaluate(async () => {
    let n = 0;
    for (let k = 6; k <= 40 && !n; k++) { buildLevel(k); if (RAMPS.some(r => r.kick === 1.1)) n = k; }
    drive(n);
    const rp = RAMPS.find(r => r.kick === 1.1);
    pos = rp.x - CAR_SCREEN_X - 120; v = 700; gasKey = true;
    let top = 0, landX = 0, flew = false;
    const t0 = performance.now();
    while (performance.now() - t0 < 4000) {
      await new Promise(r => setTimeout(r, 16));
      if (airborne) { flew = true; top = Math.max(top, jumpY); }
      if (flew && !airborne) { landX = pos + CAR_SCREEN_X; break; }
    }
    gasKey = false;
    return { n, top: Math.round(top), landX: Math.round(landX), lip: rp.x + rp.w, end: rp.x + rp.w + rp.tail, flew };
  });
  check('mega ramp: a real launch goes much higher than a standard ramp (> 250) and lands inside its clear zone',
    mega.flew && mega.top > 250 && mega.landX > mega.lip && mega.landX <= mega.end, JSON.stringify(mega));

  /* ---- 6. T2.3: the mixer drum turns with the road speed ---- */
  const drum = await page.evaluate(async () => {
    state.body = 'mixer'; drive(1);
    const ang = () => { const m = /rotate\(([\d.]+)deg\)/.exec(drumEls[0] && drumEls[0].style.transform || ''); return m ? +m[1] : null; };
    const spin = async (speed) => {
      const a0 = ang(); const t0 = performance.now();
      gasKey = speed > 0;
      v = speed; await new Promise(r => setTimeout(r, 400));
      const d = ((ang() - a0) % 360 + 360) % 360, dt = (performance.now() - t0) / 1000;
      gasKey = false;
      return d / dt;
    };
    pos = 0; v = 0;
    await new Promise(r => setTimeout(r, 100));
    const slow = await spin(0);
    pos = 0;
    const fast = await spin(700);
    return { n: drumEls.length, cssSpin: !!carWrap.querySelector('.mixer .spinner, .drum.spinner'), slow: Math.round(slow), fast: Math.round(fast) };
  });
  check('mixer drum (T2.3): one JS-driven drum on the chase-cam mixer, a lazy turn parked, much faster at speed',
    drum.n === 1 && !drum.cssSpin && drum.slow > 10 && drum.slow < 90 && drum.fast > drum.slow * 4, JSON.stringify(drum));

  /* ---- 7. reduced motion: hoops stay, the roll and the drum stop ---- */
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const rm = await page.evaluate(async () => {
    state.body = 'mixer'; drive(9);
    const t = TWISTS[0];
    pos = (t.x0 + t.x1) / 2 - CAR_SCREEN_X + CAR_HIT_Z; v = 0;
    await new Promise(r => setTimeout(r, 200));
    const a = drumEls[0] && drumEls[0].style.transform;
    return { live: twistLive, env: viewEl.style.transform, drum: a || '', carRot: /rotate/.test(carWrap.style.transform), cut: loopView.classList.contains('on') };
  });
  await page.screenshot({ path: SHOT + 'course-corkscrew-reduced.png' });
  await page.emulateMedia({ reducedMotion: null });
  check('reduced motion: no cutaway, no roll and a still drum', !rm.live && !rm.cut && rm.env === '' && rm.drum === '' && !rm.carRot, JSON.stringify(rm));

  check('no page errors', errors.length === 0, errors.join(' | ').slice(0, 300));
  const passed = results.filter(r => r.ok).length;
  console.log(`\n${passed}/${results.length} passed`);
  await browser.close();
  process.exit(passed === results.length ? 0 : 1);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
