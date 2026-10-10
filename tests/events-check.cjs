/* events-check: surprise events on the map (v12.5).
   Three small events rotate with the calendar day, picked by a seeded RNG keyed on YYYY-MM-DD (window.__today
   overrides the clock here): a sleeping dino on one beaten level that naps across the road and drops 5 bonus
   stars when woken, a rainbow day (after level 30) whose marked level awards the secret rainbow-shine paint once,
   and a weather day that runs one world under borrowed rain or snow. Plus the "today" sun chip with the day number. */
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
const TODAY = '2026-10-08';

(async () => {
  const browser = await pw.chromium.launch({ executablePath: EXE });
  const page = await browser.newPage({ viewport: { width: 1200, height: 700 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  /* freeze the calendar: the game reads window.__today before the clock; sessionStorage lets a test pick another day across reloads */
  await page.addInitScript(([d]) => { window.__today = sessionStorage.getItem('vroomTestToday') || d; }, [TODAY]);

  await page.goto(URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(300);

  /* a kid deep in world 4: levels 1-34 beaten, 35 is the frontier */
  await page.evaluate(() => {
    for (let n = 1; n <= 34; n++) progress.levels[n] = { best: 10, rating: 2, tier: 'B', bestTime: 20 };
    progress.current = 35; progress.wallet = 50; save();
  });

  /* ---- 1. determinism: same day = same picks across reloads; another day moves something ---- */
  const p1 = await page.evaluate(() => dailyEvents());
  await page.reload();
  await page.waitForTimeout(300);
  const p2 = await page.evaluate(() => dailyEvents());
  check('picks: all three events land for a world-4 kid (dino, rainbow, rain/snow world)', p1.key === TODAY && p1.day === 8 && p1.dino > 0 && p1.rainbow > 0 && p1.weatherWorld > 0 && ['rain', 'snow'].includes(p1.weather), JSON.stringify(p1));
  check('picks: a reload on the same date repeats the exact picks', JSON.stringify(p1) === JSON.stringify(p2), JSON.stringify(p2));
  const others = await page.evaluate(() => {
    const out = [];
    for (const d of ['2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14']) { window.__today = d; out.push(dailyEvents()); }
    window.__today = '2026-10-08';
    return out;
  });
  const sig = e => [e.dino, e.rainbow, e.weather, e.weatherWorld].join('/');
  check('picks: other dates change at least one pick', others.some(e => sig(e) !== sig(p1)), others.map(sig).join(' ') + ' vs ' + sig(p1));
  check('picks: the dino never sleeps on the frontier, the rainbow stays off the dino, the weather world is not the one that owns that weather',
    others.concat([p1]).every(e => e.dino !== 35 && e.dino >= 31 && e.dino <= 34 && e.rainbow !== e.dino && e.rainbow >= 31 && e.rainbow <= 35 && e.weatherWorld <= 4 && e.weatherWorld !== (e.weather === 'rain' ? 4 : 5)),
    others.map(sig).join(' '));

  /* ---- 2. the map: markers on the right nodes / tab, the arc, the today chip ---- */
  const map = await page.evaluate(() => {
    showMap();
    const ev = dailyEvents();
    const q = s => document.querySelector(s);
    const dinoBtn = q('#mapGrid .evDino') && q('#mapGrid .evDino').closest('.lvlBtn');
    const pipBtn = q('#mapGrid .evPip') && q('#mapGrid .evPip').closest('.lvlBtn');
    const badgeTab = q('#worldTabs .evBadge') && q('#worldTabs .evBadge').closest('.worldTab');
    return { ev, dinoOn: dinoBtn && dinoBtn.getAttribute('aria-label'), dinoLocked: dinoBtn && dinoBtn.classList.contains('locked'),
      dinoZz: !!q('#mapGrid .evDino .evZz'), pipOn: pipBtn && pipBtn.getAttribute('aria-label'),
      arc: q('#mapRainbow').classList.contains('show') && q('#mapRainbow svg path') !== null,
      badgeOn: badgeTab && badgeTab.getAttribute('aria-label'), badgeKind: q('#worldTabs .evBadge') && q('#worldTabs .evBadge').classList.contains(ev.weather),
      badgeLocked: badgeTab && badgeTab.classList.contains('locked'),
      chipGone: !q('#todayChip'),
      counts: [document.querySelectorAll('.evDino').length, document.querySelectorAll('.evPip').length, document.querySelectorAll('.evBadge').length],
      words: [...document.querySelectorAll('#map .evDino, #map .evPip, #map .evBadge, #mapRainbow')].map(e => e.textContent.trim()).join('') };
  });
  check('map: the dino sleeps on its level (unlocked, not the frontier), with sleep bubbles', map.dinoOn === 'level ' + map.ev.dino && map.dinoLocked === false && map.dinoZz, JSON.stringify([map.dinoOn, map.dinoLocked]));
  check('map: the rainbow arcs over the meadow and one level wears the pip', map.arc && map.pipOn === 'level ' + map.ev.rainbow, JSON.stringify([map.arc, map.pipOn]));
  check('map: the weather world tab wears its badge (unlocked tab, right glyph)', map.badgeOn === 'world ' + map.ev.weatherWorld && map.badgeKind && map.badgeLocked === false, JSON.stringify([map.badgeOn, map.ev.weather]));
  check('map: no day chip any more (13.19), one marker of each kind, no words', map.chipGone && map.counts.join() === '1,1,1' && /^\d*$/.test(map.words), JSON.stringify([map.chipText, map.chipH, map.counts, map.words]));
  await page.waitForTimeout(500);
  await page.screenshot({ path: SHOT + 'ev-map.png' });

  /* ---- 3. the road dino: naps mid-lane near the start, not a hard prop; driving into it wakes it, no damage, 5 bonus stars ---- */
  const dinoLevel = p1.dino;
  const napped = await page.evaluate(n => {
    drive(n);
    const d = props.find(p => p.type === 'napdino');
    return { there: !!d, x: d && d.x, lane: d && d.lane, hard: HARD_T('napdino'), soft: SOFT_T('napdino'), total: totalStars, awake: d && d.el.classList.contains('awake'),
      eyes: d && getComputedStyle(d.el.querySelector('.eyeOpen')).display, zz: d && getComputedStyle(d.el.querySelector('.evZz')).display };
  }, dinoLevel);
  check('road: a napping dino sits in the middle lane at 640, neither hard nor soft, eyes shut, bubbles up', napped.there && napped.x === 640 && napped.lane === 1 && !napped.hard && !napped.soft && !napped.awake && napped.eyes === 'none' && napped.zz !== 'none', JSON.stringify(napped));
  await page.waitForTimeout(400);
  await page.screenshot({ path: SHOT + 'ev-road-dino.png' });
  const bump = await page.evaluate(async total0 => {
    progress.damage = 0; runDamage = 0;
    /* the level only promises an empty road before 1000; this drive runs to ~1450, so the level's own
       middle-lane hazards out there are taken off the road: the check is about the dino, not them */
    for (const p of props) if (p.type !== 'napdino' && p.lane === 1 && BLOCKER_T(p.type) && p.x < 1800) p.done = true;
    gasKey = true;
    let minV = Infinity, woke = -1;
    const t0 = performance.now();
    while (performance.now() - t0 < 2600 && pos < 1150) {   /* through the quiet opening only: the level's own hazards start at 1000 */
      await new Promise(r => setTimeout(r, 40));
      const d = props.find(p => p.type === 'napdino');
      if (d.done && woke < 0) woke = Math.round(pos);
      if (woke >= 0 && pos < woke + 400) minV = Math.min(minV, v);
    }
    gasKey = false;
    const d = props.find(p => p.type === 'napdino');
    const bonus = props.filter(p => p.type === 'star' && p.bonus);
    return { woke, awake: d.el.classList.contains('awake'), eyes: getComputedStyle(d.el.querySelector('.eyeOpen')).display, bonus: bonus.length,
      lanes: [...new Set(bonus.map(p => p.lane))], got: bonus.filter(p => p.done).length, total: totalStars, total0, runStars, runDamage, damage: progress.damage, minV: Math.round(minV), pos: Math.round(pos) };
  }, napped.total);
  check('road: the gas-only drive wakes it (eyes open), the car never slows below 300, no damage', bump.woke > 0 && bump.awake && bump.eyes === 'block' && bump.minV >= 300 && bump.runDamage === 0 && bump.damage === 0, JSON.stringify(bump));
  check('road: 5 bonus stars drop on the middle lane, collected on the way, the level total is untouched', bump.bonus === 5 && bump.lanes.join() === '1' && bump.got === 5 && bump.runStars >= 5 && bump.total === bump.total0, JSON.stringify([bump.bonus, bump.got, bump.runStars, bump.total, bump.total0]));

  /* ---- 4. a honk (tap on the car) wakes it from afar ---- */
  const honk = await page.evaluate(n => {
    drive(n);
    const d = props.find(p => p.type === 'napdino');
    carWrap.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 3 }));
    const bonus = props.filter(p => p.type === 'star' && p.bonus);
    return { awake: d.done && d.el.classList.contains('awake'), pos: Math.round(pos), bonus: bonus.length, ahead: bonus.every(p => p.x > d.x) };
  }, dinoLevel);
  check('road: a honk wakes the dino before the car moves, the stars land ahead of it', honk.awake && honk.pos === 0 && honk.bonus === 5 && honk.ahead, JSON.stringify(honk));

  /* ---- 5. rainbow day: only after level 30; finishing the marked level awards the paint once ---- */
  const early = await page.evaluate(() => {
    const keep = progress.levels; progress.levels = {};
    for (let n = 1; n <= 20; n++) progress.levels[n] = keep[n];
    const ev = dailyEvents();
    showMap();
    const out = { rainbow: ev.rainbow, arc: document.getElementById('mapRainbow').classList.contains('show'), pips: document.querySelectorAll('.evPip').length, dino: ev.dino };
    progress.levels = keep; save();
    return out;
  });
  check('rainbow: no rainbow before level 30 is beaten (dino still naps in world 2)', early.rainbow === 0 && !early.arc && early.pips === 0 && early.dino >= 11 && early.dino <= 20, JSON.stringify(early));
  const rbLevel = p1.rainbow;
  const win = await page.evaluate(async n => {
    drive(n);
    const owned0 = progress.owned.color.includes('p:rainbowshine'), onStrip0 = owns('color', 'p:rainbowshine');
    pos = LEVEL_LEN - 350; gasKey = true;
    await new Promise(r => setTimeout(r, 1400));
    gasKey = false;
    const toast = document.getElementById('stickerToast');
    return { owned0, onStrip0, owned: progress.owned.color.filter(c => c === 'p:rainbowshine').length, toast: toast.classList.contains('show'),
      toastSwatch: !!toast.querySelector('svg linearGradient'), ownsNow: owns('color', 'p:rainbowshine'), finished };
  }, rbLevel);
  check('rainbow: finishing the marked level awards rainbow shine once, with a swatch toast', !win.owned0 && !win.onStrip0 && win.owned === 1 && win.toast && win.toastSwatch && win.ownsNow && win.finished, JSON.stringify(win));
  await page.waitForTimeout(300);
  await page.screenshot({ path: SHOT + 'ev-rainbow-toast.png' });
  const again = await page.evaluate(async n => {
    document.getElementById('replayBtn').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 7 }));
    await new Promise(r => setTimeout(r, 300));
    pos = LEVEL_LEN - 350; gasKey = true;
    await new Promise(r => setTimeout(r, 1400));
    gasKey = false;
    runEvents = { rainbow: n }; eventFinish(n);   /* and a direct second award attempt */
    return { owned: progress.owned.color.filter(c => c === 'p:rainbowshine').length, finished };
  }, rbLevel);
  check('rainbow: a second finish does not duplicate the paint', again.finished && again.owned === 1, JSON.stringify(again));

  /* ---- 6. the paint: both views, the swatch tile, a save-code round trip, a reload ---- */
  const paint = await page.evaluate(() => {
    state.color = 'p:rainbowshine'; save();
    const side = vehicleSVG(state), rear = vehicleRearSVG(state);
    showGarage(); openTab('color', false);
    const tile = document.querySelector('#strip .tile[data-color="p:rainbowshine"]');
    const code = packCompact();
    const out = unpackCompact(code.slice('VROOM1.'.length));
    const idS = (side.match(/--paint:url\(#(\w+)\)/) || [])[1], idR = (rear.match(/--paint:url\(#(\w+)\)/) || [])[1];
    return { sideDef: !!idS && new RegExp(`<linearGradient id="${idS}"`).test(side), rearDef: !!idR && new RegExp(`<linearGradient id="${idR}"[^>]*userSpaceOnUse`).test(rear),
      tile: !!tile, tileLocked: tile && tile.classList.contains('locked'), tiles: document.querySelectorAll('#strip .tile[data-color]').length,
      swatch: tile && !!tile.querySelector('svg linearGradient'), preview: getComputedStyle(preview.querySelector('[fill="var(--paint)"]')).fill.startsWith('url('),
      codeOwned: out && out.owned.color.includes('p:rainbowshine'), codeBuild: out && out.build && out.build.color === 'p:rainbowshine', last: CODE_COLORS[CODE_COLORS.length - 1] };
  });
  check('paint: rainbow shine renders as a gradient def + url fill in side and rear views, the preview too', paint.sideDef && paint.rearDef && paint.preview, JSON.stringify([paint.sideDef, paint.rearDef, paint.preview]));
  check('paint: the strip grows a 24th tile (unlocked, gradient swatch) once earned', paint.tile && paint.tileLocked === false && paint.tiles === 24 && paint.swatch, JSON.stringify([paint.tile, paint.tileLocked, paint.tiles]));
  check('paint: v3 save code carries the owned paint + the equipped build (last CODE_COLORS entry)', paint.codeOwned && paint.codeBuild && paint.last === 'p:rainbowshine', JSON.stringify([paint.codeOwned, paint.codeBuild, paint.last]));
  await page.screenshot({ path: SHOT + 'ev-paint.png' });
  await page.reload();
  await page.waitForTimeout(400);
  const reload = await page.evaluate(() => ({ color: state.color, owned: progress.owned.color.includes('p:rainbowshine'), tiles: (openTab('color', false), document.querySelectorAll('#strip .tile[data-color]').length) }));
  check('paint: a reload keeps the secret paint owned and equipped', reload.color === 'p:rainbowshine' && reload.owned && reload.tiles === 24, JSON.stringify(reload));

  /* ---- 7. weather day: that world's levels run the borrowed particles; others and free drive do not ---- */
  const wx = await page.evaluate(() => {
    const ev = dailyEvents();
    const cls = ev.weather === 'rain' ? 'rainDrop' : 'snowFlake';
    const spec = WORLD_WEATHER['w' + (ev.weather === 'rain' ? 4 : 5)];
    const count = () => document.querySelectorAll('#weather .' + cls).length;
    stopDrive(); paradeMode = false; freeMode = false;
    const first = (ev.weatherWorld - 1) * WORLD_SIZE + 1;
    const forced = [first, first + 4, first + 9].map(n => { level = n; buildLevel(n); return count(); });
    const other = [1, 2, 3, 4].filter(w => w !== ev.weatherWorld && w !== (ev.weather === 'rain' ? 4 : 5))[0];
    level = (other - 1) * WORLD_SIZE + 1; buildLevel(level); const elsewhere = count();
    freeMode = true; buildWeather(ev.weatherWorld); const free = count(); freeMode = false;
    return { world: ev.weatherWorld, kind: ev.weather, forced, want: spec.count, elsewhere, free, other };
  });
  check('weather: every level of the badged world spawns the borrowed particles (full spec count)', wx.forced.every(c => c === wx.want), JSON.stringify(wx));
  check('weather: another world and free drive keep their own sky', wx.elsewhere === 0 && wx.free === 0, JSON.stringify([wx.elsewhere, wx.free]));

  /* ---- 8. no date: everything steps aside quietly ---- */
  const nodate = await page.evaluate(() => {
    window.__today = 'not a date';
    const ev = dailyEvents();
    showMap();
    const out = { ev, markers: document.querySelectorAll('.evDino, .evPip, .evBadge').length, arc: document.getElementById('mapRainbow').classList.contains('show') };
    window.__today = '2026-10-08';
    return out;
  });
  check('no date: no picks, no markers, no arc, no errors', !nodate.ev.key && nodate.ev.dino === 0 && nodate.ev.rainbow === 0 && !nodate.ev.weather && nodate.markers === 0 && !nodate.arc, JSON.stringify(nodate));

  check('no console errors', errors.length === 0, errors.join(' | ').slice(0, 300));

  await browser.close();
  const fails = results.filter(r => !r.ok);
  console.log(`\n${results.length - fails.length}/${results.length} passed`);
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
