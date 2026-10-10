/* fairness-check: two headless bots drive every level through the real collision code.
   "smart" steers one lane at a time toward the nearest star ahead (≤900) and away from hard
   obstacles and gaps in the road (≤500), never more than one lane change per 350 units; it must finish every
   level, grab ≥45% of the stars and take ≤4 hard hits. "lazy toddler" sits in the middle
   lane with the gas floored and never steers; it must finish every level (nothing may block
   the road for good) and still find ≥15% of the stars on levels 1-20.
   Usage: CHROMIUM=... VROOM_URL=http://localhost:4173/index.html node fairness-check.cjs [--table] */
const pw = require('playwright-core');
const os = require('os');
const EXE = process.env.CHROMIUM || os.homedir() + '/Library/Caches/ms-playwright/chromium-1117/chrome-mac/Chromium.app/Contents/MacOS/Chromium';
const URL = process.env.VROOM_URL || 'http://localhost:4173/index.html';
const table = process.argv.includes('--table');

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok });
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (detail ? '  -- ' + detail : ''));
}

(async () => {
  const browser = await pw.chromium.launch({ executablePath: EXE });
  const page = await browser.newPage({ viewport: { width: 1200, height: 700 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(300);

  const runs = await page.evaluate(() => {
    const HARD = t => HARD_T(t);                    /* the game's own hard-type test: world packs' hazards count too */
    finishLevel = () => {};                         /* the bot only needs the flag */
    progress.upgrades = { engine: 0, armor: 0, magnet: 0 };
    const sim = (n, smart) => {
      stopDrive(); paradeMode = false; freeMode = false; level = n;
      buildLevel(n);
      progress.damage = 0; progress.fuel = FUEL_MAX; progress.tread = TREAD_MAX;   /* a serviced car per level: the bots judge the road, not the upkeep */
      let dice = (n * 7919 + (smart ? 1 : 2)) >>> 0; gapRoll = () => { dice = (Math.imul(dice, 1103515245) + 12345) >>> 0; return (dice >>> 8) / 16777216; };   /* the blowout dice, seeded per run so the bots are reproducible */
      pos = 0; v = 0; jumpY = 0; vy = 0; airborne = false; finished = false;
      targetLane = 1; laneVis = 1; runStars = 0; runDamage = 0; runTime = 0;
      const dt = 1 / 60;
      let t = 0, hits = 0, lastChange = -1e9, changes = 0, drops = 0; const hitLog = [];
      /* a gap in the road (13.16) is dodged like a hard prop; the full-width one is jumped from the ramp before it */
      const gapAhead = (lane, carX, far) => GAPS.some(g => gapHas(g, lane) && g.x - carX > -40 && g.x - carX < far);
      /* a chomper's mouth (13.21) is dodged like a hard prop; a car that enters it is held, loses up to 3 run stars onto the road
         behind, is thrown 560 back and shoved into the open lane (the game's chompStart/chompSpit, modelled here without timers) */
      const mouthAhead = (lane, carX, far) => CHOMPS.some(t => lane >= t.l0 && lane <= t.l1 && t.x0 + CHOMP_MOUTH - carX > -40 && t.x0 + CHOMP_MOUTH - carX < far);
      const hardAhead = (lane, carX, far) => gapAhead(lane, carX, far) || mouthAhead(lane, carX, far) || props.some(p => !p.done && HARD(p.type) && p.lane === lane && p.x - carX > -40 && p.x - carX < far);
      let bites = 0;
      while (!finished && t < 150) {
        v = Math.min(vmaxEff(), v + ACCEL * dt); pos += v * dt; t += dt;
        const carX = pos + CAR_SCREEN_X;
        if (smart && carX - lastChange >= 350) {
          let want = targetLane;
          if (hardAhead(targetLane, carX, 500)) {
            /* the clearest adjacent lane: furthest first hard obstacle, stars break ties */
            const clear = l => { let d = 1e9; for (const p of props) if (!p.done && HARD(p.type) && p.lane === l && p.x - carX > -40) d = Math.min(d, p.x - carX); for (const t of CHOMPS) if (l >= t.l0 && l <= t.l1 && t.x0 + CHOMP_MOUTH - carX > -40) d = Math.min(d, t.x0 + CHOMP_MOUTH - carX); for (const g of GAPS) if (gapHas(g, l) && g.x - carX > -40) d = Math.min(d, g.x - carX); return Math.min(d, 900); };
            const score = l => clear(l) * 10 + props.filter(p => !p.done && p.type === 'star' && p.lane === l && p.x - carX > 0 && p.x - carX < 900).length;
            const opts = [targetLane - 1, targetLane + 1].filter(l => l >= 0 && l <= 2).sort((a, b) => score(b) - score(a));
            if (opts.length && clear(opts[0]) > clear(targetLane)) want = opts[0];
          } else {
            let best = null;
            for (const p of props) if (!p.done && p.type === 'star' && p.x - carX > 60 && p.x - carX < 900 && (!best || p.x < best.x)) best = p;
            if (best && best.lane !== targetLane) {
              const l = targetLane + Math.sign(best.lane - targetLane);
              if (!hardAhead(l, carX, 500)) want = l;
            }
          }
          if (want !== targetLane) { targetLane = want; lastChange = carX; changes++; }
        }
        laneVis += (targetLane - laneVis) * Math.min(1, dt * 9);
        if (Math.abs(targetLane - laneVis) < 0.01) laneVis = targetLane;
        tickMovers(dt);
        if (airborne) {
          vy -= gravityNow() * dt; jumpY += vy * dt;
          if (jumpY <= 0) { jumpY = 0; airborne = false; }
        } else {
          const L = rampRoll(carX);   /* the game's own ramp rule: a deck only in the car's lane, mega ramps and kickers fly by their own numbers */
          if (L) { airborne = true; vy = L.vy; jumpY = L.y; }
        }
        for (const p of props) {
          if (p.done) continue;
          const wasHard = HARD(p.type);
          PROP_HIT[p.type](p, carX - p.x);
          if (wasHard && p.done) { hits++; hitLog.push(p.type + '@' + p.x + (RAMPS.some(rp => p.x > rp.x - 200 && p.x < rp.x + rp.w + (rp.tail || 420)) ? '(rampzone)' : '') + ' jy' + Math.round(jumpY)); }
        }
        for (const ch of CHOMPS) {
          const d = ch.x0 + CHOMP_MOUTH - carX, lane = Math.round(laneVis), inMouth = lane >= ch.l0 && lane <= ch.l1;
          if (d > 1100) ch.botSnapped = false;
          if (d <= -60 && !inMouth) ch.botSnapped = true;   /* slipped past: the jaws snap shut behind the car and stay shut (chompMiss) */
          if (d <= 40 && d > -400 && inMouth && !airborne && !ch.botSnapped) {
            /* the bite: hold, lose up to three stars, get flung back out and shoved into the open lane */
            bites++; t += 2.2; runStars = Math.max(0, runStars - 3);
            pos -= 560; v = 0; targetLane = chompFreeLane(ch); laneVis = targetLane; lastChange = pos + CAR_SCREEN_X;
          }
        }
        const hitGaps = GAPS.filter(g => g.hit).length;
        gapTick(carX);   /* the game's own gap pass: a drop into a hole is a soft hit, counted apart from the hard ones */
        if (GAPS.filter(g => g.hit).length > hitGaps) drops++;
      }
      const got = props.filter(p => p.type === 'star' && p.done).length;   /* star props only (capsules add bonus stars to runStars) */
      return { n, finished, t: Math.round(t * 10) / 10, stars: got, total: totalStars, pct: Math.round(100 * got / totalStars), hits, drops, bites, changes, hitLog };
    };
    const out = { smart: [], lazy: [] };
    for (let n = 1; n <= MAX_LEVEL; n++) { out.smart.push(sim(n, true)); out.lazy.push(sim(n, false)); }
    return out;
  });

  if (table) {
    console.log(' L   smart: fin   t  stars  pct hits drp chg bit | lazy: fin   t  stars  pct hits drp bit');
    for (let i = 0; i < runs.smart.length; i++) {
      const s = runs.smart[i], l = runs.lazy[i];
      console.log(`L${String(s.n).padStart(2)}        ${s.finished ? ' ok' : 'NO '} ${String(s.t).padStart(5)} ${String(s.stars).padStart(3)}/${String(s.total).padEnd(3)} ${String(s.pct).padStart(3)}% ${String(s.hits).padStart(3)} ${String(s.drops).padStart(3)} ${String(s.changes).padStart(3)} ${String(s.bites).padStart(3)} |      ${l.finished ? ' ok' : 'NO '} ${String(l.t).padStart(5)} ${String(l.stars).padStart(3)}/${String(l.total).padEnd(3)} ${String(l.pct).padStart(3)}% ${String(l.hits).padStart(3)} ${String(l.drops).padStart(3)} ${String(l.bites).padStart(3)}`);
    }
  }
  if (process.argv.includes('--hits')) for (const r of runs.smart) if (r.hits) console.log('L' + r.n + ' smart hits: ' + r.hitLog.join(', '));
  const bad = (arr, f) => arr.filter(f).map(r => 'L' + r.n).join(',');
  const s = runs.smart, l = runs.lazy;
  check('smart bot finishes every level', s.every(r => r.finished), bad(s, r => !r.finished));
  check('smart bot collects >= 45% of stars on every level', s.every(r => r.pct >= 45), bad(s, r => r.pct < 45) || 'min ' + Math.min(...s.map(r => r.pct)) + '%');
  check('smart bot takes <= 4 hard hits on every level', s.every(r => r.hits <= 4), bad(s, r => r.hits > 4) || 'max ' + Math.max(...s.map(r => r.hits)));
  check('smart bot <= 1 lane change per 350 units', s.every(r => r.changes * 350 <= levelLenOf(r.n) + 350));
  check('lazy toddler finishes every level (nothing blocks the road for good)', l.every(r => r.finished), bad(l, r => !r.finished));
  check('lazy toddler finds >= 15% of stars on levels 1-20', l.slice(0, 20).every(r => r.pct >= 15), bad(l.slice(0, 20), r => r.pct < 15) || 'min ' + Math.min(...l.slice(0, 20).map(r => r.pct)) + '%');
  check('world 1 is gentle: smart bot <= 1 hard hit, lazy toddler <= 3 on levels 1-10', s.slice(0, 10).every(r => r.hits <= 1) && l.slice(0, 10).every(r => r.hits <= 3), 'smart ' + s.slice(0, 10).map(r => r.hits).join('') + ' lazy ' + l.slice(0, 10).map(r => r.hits).join(''));
  check('every level finishes in under 45s at full gas', s.every(r => r.t < 45) && l.every(r => r.t < 45), 'max ' + Math.max(...s.map(r => r.t), ...l.map(r => r.t)) + 's');
  check('no page errors during 160 bot runs', errors.length === 0, errors.join(' | ').slice(0, 300));

  const worst = s.slice().sort((a, b) => a.pct - b.pct).slice(0, 5).map(r => `L${r.n} ${r.pct}%`).join('  ');
  console.log('worst 5 star%: ' + worst);
  const passed = results.filter(r => r.ok).length;
  console.log(`\n${passed}/${results.length} passed`);
  await browser.close();
  process.exit(passed === results.length ? 0 : 1);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });

function levelLenOf(n) { return 3500 + Math.min(n, 20) * 250 + Math.max(0, n - 20) * 100; }
