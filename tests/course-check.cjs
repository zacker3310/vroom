/* course-check: the wild courses (v12.9, T21) and the speed-linked mixer drum (T2.3).
   Corkscrews roll the road a full turn (the road ahead turns about the vanishing point, the world off the road
   turns the other way, the car stays upright) and carry stars only; hard turns get chevron boards on their
   outside; roller levels run a train of big hills; mega ramps and hop chains launch by their own numbers
   through the one launch rule the fairness bots share; the chase-cam mixer drum turns with the road speed.
   Reduced motion keeps the hoops and drops the roll. */
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

  /* ---- 2. the roll math and the one launch rule ---- */
  const math = await page.evaluate(() => {
    buildLevel(9);
    const t = TWISTS[0], mid = (t.x0 + t.x1) / 2;
    const megaFast = rampLaunch({ x: 0, ...RAMP_KIND.mega }, 940), stdFast = rampLaunch({ x: 0, w: 250, h: 95 }, 940);
    const ramp = rampLaunch({ x: 0, w: 250, h: 95 }, 700), mega = rampLaunch({ x: 0, ...RAMP_KIND.mega }, 700), hop = rampLaunch({ x: 0, ...RAMP_KIND.hop }, 700), none = rampLaunch(null, 700);
    let mono = true, prev = 0;
    for (let x = t.x0; x <= t.x1; x += 25) { const r = rollAt(x) * t.dir; if (r < prev - 1e-9) mono = false; prev = r; }
    return { a: rollAt(t.x0), b: rollAt(t.x1) * t.dir, m: rollAt(mid) * t.dir, after: rollAt(t.x1 + 900) * t.dir, mono, ramp, mega, hop, none, megaFast, stdFast };
  });
  check('roll: 0 at a twist\'s start, pi halfway, a full 2pi at its end and after, never backwards',
    Math.abs(math.a) < 1e-9 && Math.abs(math.m - Math.PI) < 1e-6 && Math.abs(math.b - 2 * Math.PI) < 1e-9 && Math.abs(math.after - 2 * Math.PI) < 1e-9 && math.mono, JSON.stringify(math));
  check('launch rule: standard ramp unchanged (95 high, 0.9 of the speed, any engine), mega 150 / 1.1 capped at 740 speed, kicker 45 / 0.55',
    math.ramp.y === 95 && math.ramp.vy === 630 && math.none.y === 95 && math.none.vy === 630 && math.mega.y === 150 && Math.abs(math.mega.vy - 770) < 1e-9 && math.hop.y === 45 && Math.abs(math.hop.vy - 385) < 1e-9
      && Math.abs(math.megaFast.vy - 814) < 1e-9 && Math.abs(math.stdFast.vy - 846) < 1e-9,
    JSON.stringify({ ramp: math.ramp, mega: math.mega, hop: math.hop, megaFast: math.megaFast, stdFast: math.stdFast }));

  /* ---- 3. driving through a corkscrew ---- */
  const roll = await page.evaluate(async () => {
    window.__cork = 0; const o = sfx.corkscrew; sfx.corkscrew = () => { window.__cork++; o(); };
    drive(9);
    const t = TWISTS[0];
    pos = t.x0 - CAR_SCREEN_X - 400; v = 0;
    await new Promise(r => setTimeout(r, 900));   /* let the scene iris finish before any screenshot */
    const before = { live: twistLive, env: envEl.style.transform };
    pos = (t.x0 + t.x1) / 2 - CAR_SCREEN_X + CAR_HIT_Z; v = 0;
    await new Promise(r => setTimeout(r, 200));
    const star = props.find(p => p.type === 'star' && !p.done && p.x > t.x0 + (t.x1 - t.x0) * 0.75 && p.x < t.x1);
    /* the top row of the stage (y 20): sky at rest, mostly ground when upside down (hoops and road cross it too) */
    const row = roadCanvas.getContext('2d').getImageData(0, 40, 2400, 1).data, hexAt = i => '#' + [row[i], row[i + 1], row[i + 2]].map(c => c.toString(16).padStart(2, '0')).join('');
    let groundPx = 0, n = 0;
    for (let x = 20; x < 2400; x += 40, n++) if (hexAt(x * 4) === roadPal.ground || hexAt(x * 4) === roadPal.ground2) groundPx++;
    const hex = (groundPx / n).toFixed(2);
    const weatherOut = document.getElementById('weather').parentElement.id === 'road';
    return { before, weatherOut, live: twistLive, roll: rollCar, env: envEl.style.transform, star: star && star.wrap.style.transform, top: hex, ground: roadPal.ground, ground2: roadPal.ground2, cork: window.__cork,
      car: carWrap.style.transform, carRot: /rotate/.test(carWrap.style.transform) };
  });
  await page.screenshot({ path: SHOT + 'course-corkscrew.png' });
  for (const f of [-0.25, 0.25, 0.75]) {
    await page.evaluate(async f => { const t = TWISTS[0]; pos = t.x0 + (t.x1 - t.x0) * f - CAR_SCREEN_X + CAR_HIT_Z; await new Promise(r => setTimeout(r, 120)); }, f);
    await page.screenshot({ path: SHOT + `course-corkscrew-${Math.round(f * 100)}.png` });
  }
  check('corkscrew: drawn ahead but not rolling before it, rolling mid-twist (roll ~pi); the sky never rolls, weather stays outside over the road',
    roll.before.live && roll.before.env === '' && roll.live && roll.weatherOut && Math.abs(Math.abs(roll.roll) - Math.PI) < 0.05 && roll.env === '', JSON.stringify({ before: roll.before, weatherOut: roll.weatherOut, live: roll.live, roll: roll.roll, env: roll.env }));
  check('corkscrew: the horizon stays put (sky at the top of the screen); road sprites ahead turn with the ribbon; the car stays upright',
    +roll.top < 0.5 && /rotate\(/.test(roll.star || '') && !roll.carRot, JSON.stringify({ groundShareOfTopRow: roll.top, star: roll.star, car: roll.car }));
  const out = await page.evaluate(async () => {
    const t = TWISTS[0];
    pos = t.x1 + 3600 - CAR_SCREEN_X; await new Promise(r => setTimeout(r, 150));
    return { live: twistLive, env: envEl.style.transform, cork: window.__cork };
  });
  check('corkscrew: a whoosh on the way in, everything squares up after', roll.cork >= 1 && !out.live && out.env === '', JSON.stringify({ cork: roll.cork, out }));

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
    return { live: twistLive, env: envEl.style.transform, drum: a || '' };
  });
  await page.screenshot({ path: SHOT + 'course-corkscrew-reduced.png' });
  await page.emulateMedia({ reducedMotion: null });
  check('reduced motion: no roll and a still drum', !rm.live && rm.env === '' && rm.drum === '', JSON.stringify(rm));

  check('no page errors', errors.length === 0, errors.join(' | ').slice(0, 300));
  const passed = results.filter(r => r.ok).length;
  console.log(`\n${passed}/${results.length} passed`);
  await browser.close();
  process.exit(passed === results.length ? 0 : 1);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
