/* course-check: the wild courses (v12.9, T21) and the speed-linked mixer drum (T2.3).
   Chompers (13.15, the corkscrew's replacement): a monster across the road with a star trail leading in; it bites,
   chews, spits a few run stars onto the road ahead and spits the car out over them. Sizes (13.16): one lane, two or
   all three, the trail in the monster's lanes only, a car in another lane drives past unbitten; hard turns get chevron boards on their
   outside; roller levels run a train of big hills; mega ramps and hop chains launch by their own numbers
   through the one launch rule the fairness bots share; the chase-cam mixer drum turns with the road speed.
   Reduced motion keeps the bite and drops the chew shake.
   13.16: ramp decks come in one-, two- and three-lane widths (a car beside a narrow deck drives past on the flat) and
   the road has gaps: holes across one, two or all three lanes, the full-width one behind a full-width ramp whose
   launch clears it, a drop into any of them a soft hit that never damages. */
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
      const tw = CHOMPS.map(t => { const n = t.l1 - t.l0 + 1, lx = n === 3 ? 0 : (laneX(t.l0) + laneX(t.l1)) / 2; return { x0: t.x0, x1: t.x1, l0: t.l0, l1: t.l1, n,
        stars: props.filter(p => p.type === 'star' && p.x > t.x0 && p.x < t.x0 + CHOMP_MOUTH).length,
        lanes: [...new Set(props.filter(p => p.type === 'star' && p.x > t.x0 - 150 && p.x < t.x0 + CHOMP_MOUTH).map(p => p.lane))].sort(),
        after: props.filter(p => p.type === 'star' && p.x > t.x0 + CHOMP_MOUTH && p.x < t.x1).length,
        blockers: props.filter(p => BLOCKER_T(p.type) && inChomp(p.x, 150)).length,
        monster: scenery.filter(p => p.chomper === t && p.x === t.x0 + CHOMP_MOUTH && p.lx === lx && p.k === CHOMP_K[n] && p.arch === (n === 3)).length }; });
      const hard = COURSE.filter(c => c.hard);
      const chev = scenery.filter(p => p.chevron);
      /* each board belongs to the hard stretch it is nearest: it must stand on that stretch's outside verge */
      const dist = (p, c) => p.x < c.x0 ? c.x0 - p.x : p.x > c.x1 ? p.x - c.x1 : 0;
      const owner = p => hard.reduce((m, c) => dist(p, c) < dist(p, m) ? c : m, hard[0]);
      const chevOutside = chev.every(p => Math.sign(p.lx) === -Math.sign(owner(p).k)) && hard.every(c => chev.filter(p => owner(p) === c).length >= 2);
      const kinds = RAMPS.map(r => r.kick === RAMP_KIND.mega.kick ? 'mega' : r.kick === RAMP_KIND.hop.kick ? 'hop' : 'std');
      const landClear = RAMPS.every(r => !props.some(p => BLOCKER_T(p.type) && p.x > r.x - 200 && p.x < r.x + r.w + (r.tail || 420)));
      const sorted = RAMPS.slice().sort((p, q) => p.x - q.x);
      const lastLand = RAMPS.length ? Math.max(...RAMPS.map(rp => rp.x + rp.w + (rp.tail || 420))) : 0;
      const rampsApart = sorted.every((p, i) => !i || p.x >= sorted[i - 1].x + sorted[i - 1].w + (sorted[i - 1].tail || 420));
      const rampInTwist = RAMPS.some(rp => CHOMPS.some(t => rp.x - 250 < t.x1 + 150 && rp.x + rp.w + (rp.tail || 420) > t.x0 - 150));
      const flightFits = RAMPS.filter(r => r.kick).every(r => rampFlight(r, worldOf(n)) <= r.w + r.tail);
      /* 13.16: lane widths and gaps */
      const widths = RAMPS.map(r => r.l1 - r.l0 + 1);
      const starOffDeck = RAMPS.some(r => props.some(p => p.type === 'star' && p.h > LOW_STAR_H && p.x > r.x + r.w && p.x < r.x + r.w + r.tail && (p.lane < r.l0 || p.lane > r.l1)));
      const STD = { w: 250, h: 95, kick: KICK_STD };
      const gaps = GAPS.map(g => {
        const full = g.l0 === 0 && g.l1 === 2;
        const own = full ? RAMPS.find(r => r.l0 === 0 && r.l1 === 2 && !r.kick && r.x + r.w < g.x && g.x - r.x - r.w <= 200) : null;
        return { x: g.x, w: g.w, l0: g.l0, l1: g.l1, full,
          ramp: !!own, clears: !!own && own.x + rampFlight(STD, worldOf(n), 0.75 * VMAX) >= g.x + g.w,
          inBounds: g.x >= 600 && g.x + g.w <= LEVEL_LEN - 700,
          inChomp: inChomp(g.x, 150) || inChomp(g.x + g.w, 150),
          inZone: RAMPS.some(r => r !== own && g.x + g.w > r.x - 200 && g.x < r.x + r.w + (r.tail || 420)),
          blocker: props.some(p => BLOCKER_T(p.type) && p.x > g.x - 300 && p.x < g.x + g.w + 300),
          star: props.some(p => p.type === 'star' && p.h === LOW_STAR_H && p.x >= g.x && p.x <= g.x + g.w && p.lane >= g.l0 && p.lane <= g.l1),
          boards: scenery.filter(p => p.gapBoard && p.x === g.x - 30).length };
      });
      const gapsSorted = GAPS.slice().sort((a, b) => a.x - b.x);
      const gapsApart = gapsSorted.every((g, i) => !i || g.x - gapsSorted[i - 1].x >= 900);
      out.push({ n, shape: (WORLD_ROAD[worldOf(n)] || WORLD_ROAD[8]).order[(n - 1) % 10], tw, hard: hard.length, chevOutside, chev: chev.length,
        bigHills: HILLS.filter(h => Math.abs(h.amp) >= 110).length, kinds, landClear, flightFits, rampInTwist, rampsApart, lastLand, len: LEVEL_LEN, beats: lastBeats.slice(),
        widths, starOffDeck, gaps, gapsApart,
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
  /* sizes (13.16): one-lane, two-lane and full monsters across the 120 levels, a fair share of each, two different on a two-monster level */
  const allTw = twistLvls.flatMap(r => r.tw), sizeN = [1, 2, 3].map(n => allTw.filter(t => t.n === n).length);
  check('chompers: one-lane and two-lane monsters each take at least a third of the 120 levels\' chompers, never all three lanes (13.21: it bites every time, so an open lane must exist), and a level with two has two different sizes',
    sizeN[0] >= allTw.length / 3 && sizeN[1] >= allTw.length / 3 && sizeN[2] === 0 && allTw.every(t => t.l0 >= 0 && t.l1 <= 2 && t.l1 >= t.l0 && t.n === t.l1 - t.l0 + 1) && twistLvls.filter(r => r.tw.length === 2).every(r => r.tw[0].n !== r.tw[1].n),
    'sizes 1/2/3: ' + sizeN.join('/') + ' of ' + allTw.length + '; ' + twistLvls.map(r => 'L' + r.n + ':' + r.tw.map(t => t.l0 + '-' + t.l1).join(',')).join(' '));
  check('chompers: the star trail runs in the monster\'s lanes only (every one of them under a two- or three-lane monster), the monster sits centred on its lanes at its size',
    allTw.every(t => t.lanes.length === t.n && t.lanes.every(l => l >= t.l0 && l <= t.l1) && t.monster === 1),
    twistLvls.filter(r => r.tw.some(t => t.lanes.length !== t.n || t.lanes.some(l => l < t.l0 || l > t.l1) || t.monster !== 1)).map(r => 'L' + r.n + JSON.stringify(r.tw.map(t => [t.l0, t.l1, t.lanes, t.monster]))).join(' '));
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
  /* ---- 1b. 13.16: ramp widths and gaps across the 120 levels ---- */
  const widths = scan.flatMap(r => r.widths), share = k => widths.filter(w => w === k).length / widths.length;
  check('ramps (13.16): decks come in one-, two- and three-lane widths, each about a third of all ramps (levels 1-2 full width), every deck 1..3 lanes',
    widths.every(w => w >= 1 && w <= 3) && [1, 2, 3].every(k => share(k) >= 0.22 && share(k) <= 0.45) && scan.slice(0, 2).every(r => r.widths.every(w => w === 3)),
    [1, 2, 3].map(k => k + ':' + widths.filter(w => w === k).length).join(' ') + ' of ' + widths.length);
  check('ramps (13.16): every high star over a ramp\'s flight sits in one of the deck\'s lanes', scan.every(r => !r.starOffDeck), scan.filter(r => r.starOffDeck).map(r => 'L' + r.n).join(','));
  const gapLvls = scan.filter(r => r.gaps.length), allGaps = scan.flatMap(r => r.gaps);
  check('gaps (13.16): none before level 15, one to three on every level from 15, holes of one, two and three lanes all appear, each its own beat',
    scan.slice(0, 14).every(r => !r.gaps.length) && scan.slice(14).every(r => r.gaps.length >= 1 && r.gaps.length <= 3) &&
      [1, 2, 3].every(k => allGaps.filter(g => g.l1 - g.l0 + 1 === k).length >= 20) &&
      gapLvls.every(r => r.gaps.filter(g => !g.full).length <= r.beats.filter(b => b === 'gap').length && r.gaps.filter(g => g.full).length <= r.beats.filter(b => b === 'rampGap').length),
    'levels ' + gapLvls.length + ', gaps ' + allGaps.length + ' (' + [1, 2, 3].map(k => k + ':' + allGaps.filter(g => g.l1 - g.l0 + 1 === k).length).join(' ') + '), first L' + (gapLvls[0] || {}).n);
  check('gaps (13.16): never in the first 600 or last 700 units, in a chomper or a ramp zone, within 300 of a blocker or 900 of another gap, never under a low star, a hazard board on each verge',
    allGaps.every(g => g.inBounds && !g.inChomp && !g.inZone && !g.blocker && !g.star && g.boards === 2) && scan.every(r => r.gapsApart),
    scan.filter(r => !r.gapsApart || r.gaps.some(g => !g.inBounds || g.inChomp || g.inZone || g.blocker || g.star || g.boards !== 2)).map(r => 'L' + r.n + JSON.stringify(r.gaps.map(g => [g.inBounds, g.inChomp, g.inZone, g.blocker, g.star, g.boards]))).join(' '));
  check('gaps (13.16): every full-width gap lies just past a full-width standard ramp whose launch at three quarters of top speed clears it',
    allGaps.filter(g => g.full).length >= 20 && allGaps.filter(g => g.full).every(g => g.ramp && g.clears),
    scan.filter(r => r.gaps.some(g => g.full && !(g.ramp && g.clears))).map(r => 'L' + r.n).join(',') || allGaps.filter(g => g.full).length + ' full-width gaps');

  /* ---- 2. the chomp numbers and the one launch rule ---- */
  const math = await page.evaluate(() => {
    buildLevel(9);
    const megaFast = rampLaunch({ x: 0, ...RAMP_KIND.mega }, 940), stdFast = rampLaunch({ x: 0, w: 250, h: 95 }, 940);
    const ramp = rampLaunch({ x: 0, w: 250, h: 95 }, 700), mega = rampLaunch({ x: 0, ...RAMP_KIND.mega }, 700), hop = rampLaunch({ x: 0, ...RAMP_KIND.hop }, 700), none = rampLaunch(null, 700);
    return { len: CHOMP_LEN, mouth: CHOMP_MOUTH, drop: CHOMP_DROP, starX: CHOMP_STAR_X, ramp, mega, hop, none, megaFast, stdFast };
  });
  check('chomp: the spat stars land before the mouth, inside the stretch, three of them at most', math.starX.length === math.drop && math.drop === 3 && math.starX.every((x, i) => x > 0 && x < math.mouth - 20 && (!i || x > math.starX[i - 1] + 100)), JSON.stringify(math));
  /* ---- 3. driving into a chomper (13.15): the jaws open on approach; at the mouth the stage goes into the mouth
     (#chompView shut), the car is held, the chew tosses up to three run stars onto the road behind, in the open lane,
     the spit launches the car over them, and driving on gets them straight back ---- */
  const miss = await page.evaluate(async () => {
    /* a one-lane monster whose stretch is the first on its level (level 9 is one); the car drives past it in another lane */
    let n = 0, t = null;
    for (let k = 1; k <= MAX_LEVEL && !t; k++) { buildLevel(k); if (CHOMPS.length && CHOMPS[0].l0 === CHOMPS[0].l1) { n = k; t = CHOMPS[0]; } }
    if (!t) return { none: true };
    drive(n); t = CHOMPS[0];
    const lane = t.l0 === 0 ? 2 : 0;
    await new Promise(r => setTimeout(r, 900));
    pos = t.x0 - 100 - CAR_SCREEN_X; targetLane = lane; laneVis = lane; gasKey = true;
    const t0 = performance.now(); let shut = false, snapped = false, open = false;
    while (performance.now() - t0 < 6000) {
      await new Promise(r => setTimeout(r, 40));
      if (chompView.classList.contains('shut')) shut = true;
      if (t.p.el.classList.contains('open')) open = true;
      if (t.p.el.classList.contains('bite')) snapped = true;
      if (pos + CAR_SCREEN_X > t.x1 + 200) break;
    }
    gasKey = false;
    await new Promise(r => setTimeout(r, 400));
    return { n, l0: t.l0, lane, open, shut, snapped, missed: !!t.missed, ate: !!t.ate, spat: props.filter(p => p.spat).length, bite: !!chomp, on: chompView.classList.contains('on'), jawsAtRest: !t.p.el.classList.contains('bite') && !t.p.el.classList.contains('open'), past: pos + CAR_SCREEN_X > t.x1 };
  });
  check('chomper: a car in a lane a one-lane monster does not cover drives past it: the jaws gape then snap shut behind it, the stage never goes into the mouth, no star is dropped, it is not eaten',
    !miss.none && miss.past && miss.open && miss.snapped && !miss.shut && miss.spat === 0 && !miss.ate && miss.missed && !miss.bite && !miss.on && miss.jawsAtRest, JSON.stringify(miss));
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
    pos = t.x0 - 100 - CAR_SCREEN_X; targetLane = t.l0; laneVis = t.l0; gasKey = true;
    const t0 = performance.now(); let shut = null, held = null, dropped = null, flung = null; const dmg0 = progress.damage;
    while (performance.now() - t0 < 7000) {
      await new Promise(r => setTimeout(r, 40));
      if (!shut && chompView.classList.contains('shut')) shut = { pos, runStars, v, bite: !!chomp, display: getComputedStyle(chompView).display, hudOnTop: (() => { const r = hudStars.getBoundingClientRect(); const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!el && hudStars.contains(el); })() };
      if (shut && !held && chompView.classList.contains('chew')) held = { pos, moved: Math.abs(pos - shut.pos) };
      if (shut && !dropped && props.some(p => p.spat)) dropped = { runStars, spat: props.filter(p => p.spat).map(p => [p.x - t.x0, p.lane, p.h]), damage: progress.damage - dmg0 };
      if (dropped && !flung && airborne && chompFling < 0) flung = { pos, back: chompFling, air: airborne };
      if (flung && !flung.landed && !airborne && !chompFling) flung.landed = { pos, backBy: flung.pos - pos };
      if (flung && flung.landed && !flung.shoved) flung.shoved = { lane: targetLane, free: chompFreeLane(t) };
      if (dropped && pos + CAR_SCREEN_X > t.x1 + 200) break;
    }
    gasKey = false;
    await new Promise(r => setTimeout(r, 300));
    /* steer back into the mouth: it bites again, every single time (13.21) */
    const after = { lane: targetLane, free: chompFreeLane(t), on: chompView.classList.contains('on'), runStars, spatLeft: props.filter(p => p.spat && !p.done).length, spit: window.__spit, ate: t.ate, open: t.p.el.classList.contains('open') };
    const bites1 = t.bites, stars1 = runStars, spat1 = props.filter(p => p.spat).length;
    const trail = props.filter(p => p.type === 'star' && !p.spat && p.lane === chompFreeLane(t) && p.x > t.x1 + 150 && p.x < t.x1 + 800).length;
    /* a fresh approach from beyond 1100 (the jaws re-arm there), then straight back into the mouth's lane */
    pos = t.x0 + CHOMP_MOUTH - 1300 - CAR_SCREEN_X; v = 0; await new Promise(r => setTimeout(r, 120));
    pos = t.x0 + CHOMP_MOUTH - 700 - CAR_SCREEN_X; targetLane = t.l0; laneVis = t.l0; v = 0; gasKey = true;
    const t1 = performance.now(); let again = null;
    while (performance.now() - t1 < 5000) {
      await new Promise(r => setTimeout(r, 40));
      if (t.bites > bites1 && props.filter(p => p.spat).length > spat1) { again = { bites: t.bites, runStars, spat: props.filter(p => p.spat).length - spat1, open: t.p.el.classList.contains('open') }; break; }
    }
    gasKey = false; await new Promise(r => setTimeout(r, 2500));
    const after2 = { lane: targetLane, free: chompFreeLane(t), on: chompView.classList.contains('on') };
    return { far, near, shut, held, dropped, flung, lane: t.l0, again: again && Object.assign(again, { bites1, stars1 }), after, after2, trail };
  });
  await page.evaluate(async () => { const t = CHOMPS[0]; t.p.el.classList.remove('spit', 'bite'); pos = t.x0 + CHOMP_MOUTH - 700 - CAR_SCREEN_X; v = 0; targetLane = t.l0; laneVis = t.l0; await new Promise(r => setTimeout(r, 150)); });
  await page.screenshot({ path: SHOT + 'course-chomper.png' });
  check('chomper: the jaws open (with a growl) once the car is within 1100, not before; at the mouth the stage goes into the mouth under the HUD and the car is held still through the chew',
    !bite.far.open && bite.far.growl === 0 && bite.near.open && bite.near.growl === 1 && !bite.near.on && !!bite.shut && bite.shut.bite && bite.shut.v === 0 && bite.shut.display !== 'none' && bite.shut.hudOnTop && !!bite.held && bite.held.moved < 3,
    JSON.stringify({ far: bite.far, near: bite.near, shut: bite.shut, held: bite.held }));
  check('chomper: the bite does 3 damage; the chew tosses min(3, run stars) back onto the road the car came up, in the open lane; the spit throws the car backwards through the air into the open lane and it lands well behind; driving back up gets every star',
    !!bite.dropped && bite.dropped.damage === 3 && bite.dropped.spat.length === Math.min(3, bite.shut.runStars) && bite.dropped.spat.length >= 1 && bite.dropped.runStars === bite.shut.runStars - bite.dropped.spat.length
      && bite.dropped.spat.every(([x, lane]) => x > 0 && x < math.mouth && lane === bite.flung.shoved.free) && !!bite.flung && bite.flung.back < 0 && !!bite.flung.landed && bite.flung.landed.backBy > 250
      && bite.after.spit >= 1 && bite.flung.shoved && bite.flung.shoved.lane === bite.flung.shoved.free && bite.after.spatLeft === 0 && bite.after.runStars >= bite.shut.runStars - 3 && !bite.after.on && bite.after.ate,
    JSON.stringify({ shut: bite.shut, dropped: bite.dropped, flung: bite.flung, after: bite.after }));
  check('chomper: a consolation run of stars waits past the beast in the open lane (the one the spit shoves the kid into)',
    bite.trail >= 3, JSON.stringify({ trail: bite.trail, free: bite.after.free }));
  check('chomper: steer back into the mouth and it bites again, every single time, and takes stars again',
    !!bite.again && bite.again.bites === bite.again.bites1 + 1 && bite.again.spat >= 1 && bite.again.runStars <= Math.max(0, bite.again.stars1 - 1) && !bite.after2.on && bite.after2.lane === bite.after2.free, JSON.stringify({ again: bite.again, after: bite.after2 }));

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
    for (let k = 6; k <= 40 && !n; k++) { buildLevel(k); if (RAMPS.some(r => r.kick === RAMP_KIND.mega.kick)) n = k; }
    drive(n);
    const rp = RAMPS.find(r => r.kick === RAMP_KIND.mega.kick);
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
  check('mega ramp: a real launch goes much higher than a standard ramp (> 180 after the 13.20 nerf) and lands inside its clear zone',
    mega.flew && mega.top > 180 && mega.landX > mega.lip && mega.landX <= mega.end, JSON.stringify(mega));

  /* ---- 5b. 13.16: lane-wide decks and gaps in the real physics code ---- */
  const lanes = await page.evaluate(async () => {
    let n = 0, rp = null;
    for (let k = 3; k <= 60 && !rp; k++) { buildLevel(k); rp = RAMPS.find(r => r.l0 === r.l1 && !r.kick); if (rp) n = k; }
    drive(n);
    await new Promise(r => setTimeout(r, 200));
    const roll = lane => {   /* the bots' own loop: rampRoll each frame from 200 before the deck to well past the lip */
      pos = rp.x - 200 - CAR_SCREEN_X; v = 650; targetLane = lane; laneVis = lane; airborne = false; jumpY = 0;
      let launched = false, top = 0, onDeck = 0; const dt = 1 / 60;
      for (let i = 0; i < 80; i++) {
        pos += v * dt; const carX = pos + CAR_SCREEN_X;
        if (airborne) { vy -= gravityNow() * dt; jumpY += vy * dt; if (jumpY <= 0) { jumpY = 0; airborne = false; } top = Math.max(top, jumpY); }
        else { const L = rampRoll(carX); if (jumpY > 0) onDeck++; if (L) { airborne = true; vy = L.vy; jumpY = L.y; launched = launched || !!L.rp; } }
      }
      return { launched, top: Math.round(top), onDeck };
    };
    const on = roll(rp.l0), off = roll(rp.l0 === 1 ? 0 : 1);
    /* a gap: drive into a one-lane hole in its lane, then past it in the open lane */
    let g = null, gn = 0;
    for (let k = 15; k <= 60 && !g; k++) { buildLevel(k); g = GAPS.find(q => q.l0 === q.l1); if (g) gn = k; }
    drive(gn); g = GAPS.find(q => q.l0 === q.l1); progress.damage = 0; progress.upgrades.armor = 0; runStars = 5;   /* drive() rebuilds the level: take the live gap */
    await new Promise(r => setTimeout(r, 200));
    /* the hole as drawn (13.22): seen from close in (its near lip 100 past the projector's origin, which sits CAR_HIT_Z
       ahead of the bumper) in the lane beside, the far wall fills most of the opening and a sliver of floor shows under
       it: the floor near black, the far wall lighter, the tarmac beside the hole lighter still (the canvas is read at
       its backing scale) */
    pos = g.x - 100 - CAR_SCREEN_X + CAR_HIT_Z; v = 0; targetLane = g.l0 === 1 ? 0 : 1; laneVis = targetLane; await new Promise(r => setTimeout(r, 250));
    const k = roadCanvas.width / 1200, px = (x, y) => { const d = rctx.getImageData(Math.round(x * k), Math.round(y * k), 1, 1).data; return d[0] + d[1] + d[2]; };
    const z0 = g.x - curCarX, z1 = z0 + g.w;
    const floor = proj(z0 + 190, laneX(g.l0), -GAP_DEPTH), wallMid = proj(z1, laneX(g.l0), -GAP_DEPTH * 0.5), tarmac = proj(z0 + g.w * 0.5, laneX(g.l0 === 1 ? 0 : 1), 0);
    const look = { z0: Math.round(z0), floor: px(floor[0], floor[1]), wall: px(wallMid[0], wallMid[1]), tarmac: px(tarmac[0], tarmac[1]) };
    const into = (lane, roll) => {
      gapRoll = () => roll;
      pos = g.x - 120 - CAR_SCREEN_X; v = 600; targetLane = lane; laneVis = lane; airborne = false; jumpY = 0; g.hit = false;
      carWrap.classList.remove('drop', 'flat'); progress.damage = 0; progress.tread = TREAD_MAX;
      const dt = 1 / 60, v0 = v;
      for (let i = 0; i < 60; i++) { pos += v * dt; gapTick(pos + CAR_SCREEN_X); }
      return { hit: g.hit, v0, v1: Math.round(v), drop: carWrap.classList.contains('drop'), damage: progress.damage, tread: +progress.tread.toFixed(2), flat: carWrap.classList.contains('flat'), limp: getComputedStyle(carWrap.querySelector('svg')).animationName };
    };
    const inHole = into(g.l0, 0.9), popped = into(g.l0, 0.1), beside = into(g.l0 === 1 ? 0 : 1, 0.1);
    gapRoll = Math.random;
    return { n, lane: rp.l0, on, off, gn, look, inHole, popped, beside, stars: runStars };
  });
  check('ramps (13.16, physics): a car on a single-lane deck climbs it and launches off the lip; one in the lane beside it rolls past on the flat',
    lanes.on.launched && lanes.on.top > 100 && lanes.on.onDeck > 5 && !lanes.off.launched && lanes.off.top === 0 && lanes.off.onDeck === 0, JSON.stringify(lanes));
  check('gaps (13.22, physics): driving into a hole in its lane wrecks the car: the fall, 2 damage, speed down to GAP_KEEP (15%), no stars lost; the lane beside it is untouched',
    lanes.inHole.hit && lanes.inHole.drop && lanes.inHole.v1 <= Math.round(lanes.inHole.v0 * 0.15) + 1 && lanes.inHole.v1 > 60 && lanes.inHole.damage === 2 && !lanes.inHole.flat && lanes.inHole.tread > 7
      && !lanes.beside.hit && lanes.beside.v1 === lanes.beside.v0 && lanes.beside.damage === 0 && lanes.stars === 5,
    JSON.stringify({ inHole: lanes.inHole, beside: lanes.beside, stars: lanes.stars }));
  check('gaps (13.22, blowout): the dice under GAP_POP pop a tire: tread 0 at once, the car on a flat (#carWrap.flat, the limp keyframe) until new tires; over it, no pop',
    lanes.popped.hit && lanes.popped.flat && lanes.popped.tread === 0 && lanes.popped.limp === 'carDrop' && !lanes.inHole.flat && lanes.inHole.limp === 'carDrop' && !lanes.beside.flat,
    JSON.stringify({ popped: lanes.popped, inHole: lanes.inHole }));
  check('gaps (13.22, depth): the hole is drawn deep: through the opening the floor is near black, the far wall lighter than the floor, the tarmac beside it untouched',
    lanes.look.z0 === 100 && lanes.look.floor < 120 && lanes.look.wall > lanes.look.floor + 30 && lanes.look.tarmac > lanes.look.wall + 20, JSON.stringify(lanes.look));

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
