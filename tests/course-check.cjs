/* course-check: the wild courses (v12.9, T21) and the speed-linked mixer drum (T2.3).
   Chompers (13.15, the corkscrew's replacement): a monster across the road with a star trail leading in; it bites,
   chews, spits a few run stars onto the road ahead and spits the car out over them; hard turns get chevron boards on their
   outside; roller levels run a train of big hills; mega ramps and hop chains launch by their own numbers
   through the one launch rule the fairness bots share; the chase-cam mixer drum turns with the road speed.
   Reduced motion keeps the bite and drops the chew shake. */
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
      const tw = CHOMPS.map(t => ({ x0: t.x0, x1: t.x1,
        stars: props.filter(p => p.type === 'star' && p.x > t.x0 && p.x < t.x0 + CHOMP_MOUTH).length,
        after: props.filter(p => p.type === 'star' && p.x > t.x0 + CHOMP_MOUTH && p.x < t.x1).length,
        blockers: props.filter(p => BLOCKER_T(p.type) && inChomp(p.x, 150)).length,
        monster: scenery.filter(p => p.chomper === t && p.x === t.x0 + CHOMP_MOUTH && p.lx === 0).length }));
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
      const rampInTwist = RAMPS.some(rp => CHOMPS.some(t => rp.x - 250 < t.x1 + 150 && rp.x + rp.w + (rp.tail || 420) > t.x0 - 150));
      const flightFits = RAMPS.filter(r => r.kick).every(r => rampFlight(r, worldOf(n)) <= r.w + r.tail);
      out.push({ n, shape: (WORLD_ROAD[worldOf(n)] || WORLD_ROAD[8]).order[(n - 1) % 10], tw, hard: hard.length, chevOutside, chev: chev.length,
        bigHills: HILLS.filter(h => Math.abs(h.amp) >= 110).length, kinds, landClear, flightFits, rampInTwist, rampsApart, lastLand, len: LEVEL_LEN, beats: lastBeats.slice(),
        archInTwist: scenery.some(p => !p.chevron && !p.chomper && p.lx === 0 && inChomp(p.x, 300)) });
    }
    return out;
  });
  const by = n => scan[n - 1];
  const twistLvls = scan.filter(r => r.tw.length);
  check('chompers: every world has a chomper level, finales from world 2 carry one, level 9 is the first',
    [...Array(12)].every((_, w) => scan.slice(w * 10, w * 10 + 10).some(r => r.shape === 'chomper' && r.tw.length)) &&
      [...Array(11)].every((_, w) => by((w + 2) * 10).tw.length >= 1) && twistLvls[0].n === 9 && !by(10).tw.length,
    'levels with chompers: ' + twistLvls.map(r => r.n).join(','));
  check('chompers: two monsters on chomper levels from world 3', scan.filter(r => r.shape === 'chomper' && r.n > 20).every(r => r.tw.length === 2),
    scan.filter(r => r.shape === 'chomper').map(r => r.n + ':' + r.tw.length).join(' '));
  check('chompers: each one is a monster across the road at its mouth with a trail of >= 5 stars leading in, nothing past the mouth, no blockers within 150, no other arch in it',
    twistLvls.every(r => r.tw.every(t => t.monster === 1 && t.stars >= 5 && t.after === 0 && !t.blockers) && !r.archInTwist),
    twistLvls.filter(r => r.tw.some(t => t.monster !== 1 || t.stars < 5 || t.after || t.blockers) || r.archInTwist).map(r => 'L' + r.n + JSON.stringify(r.tw.map(t => [t.monster, t.stars, t.after, t.blockers]))).join(' '));
  check('chompers: the monster is its own beat in the level sequence', twistLvls.every(r => r.beats.includes('chomper')));
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
  check('jumps: every level keeps at least one jump, and no ramp (run-up to touchdown) crosses a chomper',
    scan.every(r => r.kinds.length >= 1 && !r.rampInTwist), scan.filter(r => !r.kinds.length || r.rampInTwist).map(r => 'L' + r.n).join(','));
  check('jumps: no ramp starts inside another ramp\'s deck or flight (decks never stack)', scan.every(r => r.rampsApart), scan.filter(r => !r.rampsApart).map(r => 'L' + r.n).join(','));
  check('jumps: every ramp (deck and flight) is behind the car before the last 600 units: no ramp past the flags, no finish on a slope or in the air',
    scan.every(r => r.lastLand <= r.len - 600), scan.filter(r => r.lastLand > r.len - 600).map(r => `L${r.n}:${r.lastLand}/${r.len}`).join(' '));
  check('jumps: every landing zone is clear of blockers and every special flight fits its tail',
    scan.every(r => r.landClear && r.flightFits), scan.filter(r => !r.landClear || !r.flightFits).map(r => 'L' + r.n).join(','));

  /* ---- 2. the chomp numbers and the one launch rule ---- */
  const math = await page.evaluate(() => {
    buildLevel(9);
    const megaFast = rampLaunch({ x: 0, ...RAMP_KIND.mega }, 940), stdFast = rampLaunch({ x: 0, w: 250, h: 95 }, 940);
    const ramp = rampLaunch({ x: 0, w: 250, h: 95 }, 700), mega = rampLaunch({ x: 0, ...RAMP_KIND.mega }, 700), hop = rampLaunch({ x: 0, ...RAMP_KIND.hop }, 700), none = rampLaunch(null, 700);
    return { len: CHOMP_LEN, mouth: CHOMP_MOUTH, drop: CHOMP_DROP, starX: CHOMP_STAR_X, ramp, mega, hop, none, megaFast, stdFast };
  });
  check('chomp: the spat stars land past the mouth and inside the stretch, three of them at most', math.starX.length === math.drop && math.drop === 3 && math.starX.every((x, i) => x > math.mouth + 60 && x < math.len && (!i || x > math.starX[i - 1] + 100)), JSON.stringify(math));
  /* ---- 3. driving into a chomper (13.15): the jaws open on approach; at the mouth the stage goes into the mouth
     (#chompView shut), the car is held, the chew tosses up to three run stars onto the road ahead in the kid's lane,
     the spit launches the car over them, and driving on gets them straight back ---- */
  const bite = await page.evaluate(async () => {
    window.__growl = 0; window.__spit = 0; const og = sfx.growl, os = sfx.spit; sfx.growl = () => { window.__growl++; og(); }; sfx.spit = () => { window.__spit++; os(); };
    drive(9);
    const t = CHOMPS[0], mouthX = t.x0 + CHOMP_MOUTH;
    pos = mouthX - 1400 - CAR_SCREEN_X; v = 0;
    await new Promise(r => setTimeout(r, 900));   /* let the scene iris finish */
    const far = { open: t.p.el.classList.contains('open'), growl: window.__growl };
    pos = mouthX - 800 - CAR_SCREEN_X; v = 0;
    await new Promise(r => setTimeout(r, 150));
    const near = { open: t.p.el.classList.contains('open'), growl: window.__growl, on: chompView.classList.contains('on') };
    /* drive in at speed from just before the trail */
    pos = t.x0 - 100 - CAR_SCREEN_X; targetLane = 1; laneVis = 1; gasKey = true;
    const t0 = performance.now(); let shut = null, held = null, dropped = null;
    while (performance.now() - t0 < 7000) {
      await new Promise(r => setTimeout(r, 40));
      if (!shut && chompView.classList.contains('shut')) shut = { pos, runStars, v, bite: !!chomp, display: getComputedStyle(chompView).display, hudOnTop: (() => { const r = hudStars.getBoundingClientRect(); const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!el && hudStars.contains(el); })() };
      if (shut && !held && chompView.classList.contains('chew')) held = { pos, moved: Math.abs(pos - shut.pos) };
      if (shut && !dropped && props.some(p => p.spat)) dropped = { runStars, spat: props.filter(p => p.spat).map(p => [p.x - t.x0, p.lane, p.h]) };
      if (dropped && pos + CAR_SCREEN_X > t.x1 + 200) break;
    }
    gasKey = false;
    await new Promise(r => setTimeout(r, 300));
    return { far, near, shut, held, dropped, after: { on: chompView.classList.contains('on'), runStars, spatLeft: props.filter(p => p.spat && !p.done).length, spit: window.__spit, ate: t.ate, open: t.p.el.classList.contains('open') } };
  });
  await page.evaluate(async () => { const t = CHOMPS[0]; t.ate = false; t.p.el.classList.remove('spit', 'bite'); pos = t.x0 + CHOMP_MOUTH - 700 - CAR_SCREEN_X; v = 0; await new Promise(r => setTimeout(r, 150)); });
  await page.screenshot({ path: SHOT + 'course-chomper.png' });
  check('chomper: the jaws open (with a growl) once the car is within 1100, not before; at the mouth the stage goes into the mouth under the HUD and the car is held still through the chew',
    !bite.far.open && bite.far.growl === 0 && bite.near.open && bite.near.growl === 1 && !bite.near.on && !!bite.shut && bite.shut.bite && bite.shut.v === 0 && bite.shut.display !== 'none' && bite.shut.hudOnTop && !!bite.held && bite.held.moved < 3,
    JSON.stringify({ far: bite.far, near: bite.near, shut: bite.shut, held: bite.held }));
  check('chomper: the chew tosses min(3, run stars) onto the road ahead in the kid\'s lane, the spit sends the car flying out, and driving on gets every star back with the jaws at rest',
    !!bite.dropped && bite.dropped.spat.length === Math.min(3, bite.shut.runStars) && bite.dropped.spat.length >= 1 && bite.dropped.runStars === bite.shut.runStars - bite.dropped.spat.length
      && bite.dropped.spat.every(([x, lane]) => x > math.mouth && x < math.len && lane === 1) && bite.after.spit === 1 && bite.after.spatLeft === 0 && bite.after.runStars >= bite.shut.runStars && !bite.after.on && bite.after.ate && !bite.after.open,
    JSON.stringify({ shut: bite.shut, dropped: bite.dropped, after: bite.after }));

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

  /* ---- 7. reduced motion: the bite still happens, the chew shake and the drum stop ---- */
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const rm = await page.evaluate(async () => {
    state.body = 'mixer'; drive(9);
    const t = CHOMPS[0];
    pos = t.x0 + CHOMP_MOUTH - 500 - CAR_SCREEN_X; v = 0;
    await new Promise(r => setTimeout(r, 200));
    const a = drumEls[0] && drumEls[0].style.transform;
    chompView.classList.add('on', 'shut', 'chew');
    const shake = getComputedStyle(chompView).animationName, breathe = getComputedStyle(t.p.el.querySelector('.body')).animationName;
    chompView.classList.remove('on', 'shut', 'chew');
    return { rollOK, env: viewEl.style.transform, drum: a || '', shake, breathe, open: t.p.el.classList.contains('open') };
  });
  await page.screenshot({ path: SHOT + 'course-chomper-reduced.png' });
  await page.emulateMedia({ reducedMotion: null });
  check('reduced motion: the jaws still open, no chew shake, no breathing, a still drum', !rm.rollOK && rm.open && rm.shake === 'none' && rm.breathe === 'none' && rm.env === '' && rm.drum === '', JSON.stringify(rm));

  check('no page errors', errors.length === 0, errors.join(' | ').slice(0, 300));
  const passed = results.filter(r => r.ok).length;
  console.log(`\n${passed}/${results.length} passed`);
  await browser.close();
  process.exit(passed === results.length ? 0 : 1);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
