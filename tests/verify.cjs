const pw = require('playwright-core');
const os = require('os');
const EXE = process.env.CHROMIUM || os.homedir() + '/Library/Caches/ms-playwright/chromium-1117/chrome-mac/Chromium.app/Contents/MacOS/Chromium';
const URL = process.env.VROOM_URL || 'http://localhost:4173/index.html';
const SHOT = __dirname + '/shots/';
require('fs').mkdirSync(SHOT, { recursive: true });

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail || '' });
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (detail ? '  -- ' + detail : ''));
}

(async () => {
  const browser = await pw.chromium.launch({ executablePath: EXE });
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  /* the game acts on pointerdown; animated elements (wiggling price tag) fail
     Playwright's stability check, so tap() dispatches the event directly */
  const tap = sel => page.evaluate(s => document.querySelector(s).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 99 })), sel);
  /* tiles act on release (a swipe through the strip must scroll, not equip): down + up on the tile */
  const tapTile = sel => page.evaluate(s => {
    const t = document.querySelector(s);
    t.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 99, clientX: 300, clientY: 600 }));
    t.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 99, clientX: 300, clientY: 600 }));
  }, sel);
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));

  await page.goto(URL);
  await page.waitForTimeout(400);

  /* ---- 1. clean load ---- */
  check('load: no console errors', errors.length === 0, errors.join(' | ').slice(0, 300));

  /* ---- 2. garage inventory ---- */
  const inv = await page.evaluate(() => ({
    swatches: (openTab('color', false), document.querySelectorAll('#strip .tile[data-color]').length),
    bodies: (openTab('body', false), BODY_ORDER.length), wheels: WHEEL_ORDER.length,
    bodyKeys: BODY_ORDER.every(b => !!BODIES[b]),
    wheelKeys: WHEEL_ORDER.every(w => !!WHEELS[w]),
  }));
  check('garage: 23 paint tiles in the strip (12 colors + 11 patterns)', inv.swatches === 23, 'got ' + inv.swatches);
  check('garage: 23 bodies all defined', inv.bodies === 23 && inv.bodyKeys);
  check('garage: 13 wheels all defined', inv.wheels === 13 && inv.wheelKeys);

  /* ---- 3. touch targets >= 64px rendered at 1024x768 (after entrance staggers settle) ---- */
  await page.waitForTimeout(1100);
  const tiny = await page.evaluate(() => {
    const bad = [];
    document.querySelectorAll('#garage button').forEach(b => {
      const r = b.getBoundingClientRect();
      if (r.width > 0 && (r.width < 63.5 || r.height < 63.5)) bad.push(`${b.id || b.className} ${r.width.toFixed(1)}x${r.height.toFixed(1)}`);
    });
    return bad;
  });
  check('garage: all touch targets >= 64px rendered', tiny.length === 0, tiny.join(', '));

  /* ---- 4. new bodies render with eye + paint ---- */
  const bodyRender = await page.evaluate(() => {
    const out = {};
    for (const b of ['police', 'race', 'tractor', 'icecream', 'rocket', 'ufo']) {
      const svg = vehicleSVG({ body: b, wheels: 'normal', color: '#e53935', extras: { horn: true, beacon: true, flag: true } });
      out[b] = svg.includes('fill="#fff"') && svg.includes('var(--paint)') === false ? 'nopaint' : (svg.match(/<(path|rect|circle|ellipse)/g) || []).length;
    }
    return out;
  });
  check('bodies: all 6 new bodies emit svg elements', Object.values(bodyRender).every(v => typeof v === 'number' && v > 8), JSON.stringify(bodyRender));

  /* ---- 5. buy flow (seed wallet, buy police + rainbow) ---- */
  await page.evaluate(() => {
    localStorage.setItem('vroom.v2', JSON.stringify({
      build: { body: 'dump', wheels: 'normal', color: '#fdd835', extras: {} },
      wallet: 500, owned: { body: [], wheels: [], color: [] }, levels: { 1: { best: 4, rating: 2 } }, current: 2
    }));
  });
  await page.reload();
  await page.waitForTimeout(300);
  /* pick police in the body strip */
  await tapTile('.tile[data-body="police"]');
  let shop = await page.evaluate(() => ({
    body: state.body, tag: priceTag.classList.contains('show'), tagText: priceTag.textContent.trim(),
    goLocked: document.getElementById('goBtn').classList.contains('locked')
  }));
  check('shop: locked police shows price tag 25 + GO locked', shop.body === 'police' && shop.tag && shop.tagText === '25' && shop.goLocked, JSON.stringify(shop));
  await page.screenshot({ path: SHOT + 'shop-locked.png' });
  await tap('#priceTag');
  shop = await page.evaluate(() => ({
    wallet: progress.wallet, owned: progress.owned.body.includes('police'),
    tag: priceTag.classList.contains('show'), goLocked: document.getElementById('goBtn').classList.contains('locked')
  }));
  check('shop: buying police deducts 25 and unlocks', shop.wallet === 475 && shop.owned && !shop.tag && !shop.goLocked, JSON.stringify(shop));

  /* rainbow paint */
  await tap('.catTab[data-cat="color"]'); await page.waitForTimeout(400);
  await tapTile('.tile[data-color="rainbow"]');
  await tap('#priceTag');
  const rb = await page.evaluate(() => ({
    wallet: progress.wallet, owned: progress.owned.color.includes('rainbow'),
    grad: preview.innerHTML.includes('linearGradient'), paint: preview.innerHTML.includes('--paint:url(#')
  }));
  check('shop: rainbow paint purchased and renders gradient', rb.wallet === 415 && rb.owned && rb.grad && rb.paint, JSON.stringify(rb));
  await page.screenshot({ path: SHOT + 'garage-rainbow-police.png' });

  /* deny path: wallet 0 */
  await page.evaluate(() => { progress.wallet = 0; save(); renderWallets(false); });
  await tap('.catTab[data-cat="wheels"]'); await page.waitForTimeout(400);
  await tapTile('.tile[data-wheels="gold"]'); /* gold (locked) */
  await tap('#priceTag');
  const deny = await page.evaluate(() => ({
    wheels: state.wheels, owned: progress.owned.wheels.includes('gold'), wallet: progress.wallet,
    tag: priceTag.classList.contains('show')
  }));
  check('shop: broke wallet denies gold wheels', deny.wheels === 'gold' && !deny.owned && deny.wallet === 0 && deny.tag, JSON.stringify(deny));
  /* back to owned wheels so GO unlocks */
  await tapTile('.tile[data-wheels="normal"]');

  /* ---- 6. level generator invariants, all 30 levels ---- */
  const gen = await page.evaluate(() => {
    const report = [];
    for (let n = 1; n <= 30; n++) {
      buildLevel(n);
      const hard = props.filter(p => p.type === 'barrel' || p.type === 'rock');
      let wall = false;
      for (const a of hard) for (const b of hard) for (const c of hard) {
        if (a === b || b === c || a === c) continue;
        const xs = [a.x, b.x, c.x];
        if (Math.max(...xs) - Math.min(...xs) < 240 && new Set([a.lane, b.lane, c.lane]).size === 3) wall = true;
      }
      report.push({
        n, len: LEVEL_LEN,
        finish: props.filter(p => p.type === 'finish').length,
        stars: props.filter(p => p.type === 'star').length,
        hard: hard.length, wall,
        out: props.some(p => p.x < 0 || p.x > LEVEL_LEN),
        badLane: props.some(p => p.lane < 0 || p.lane > 2)
      });
    }
    return report;
  });
  check('levels: every level has exactly 1 finish', gen.every(r => r.finish === 1));
  check('levels: no impassable 3-lane wall in any level', gen.every(r => !r.wall));
  check('levels: props in bounds, lanes valid', gen.every(r => !r.out && !r.badLane));
  check('levels: stars scale up (L1 vs L30)', gen[0].stars >= 5 && gen[29].stars > gen[0].stars, `L1=${gen[0].stars} L30=${gen[29].stars}`);
  check('levels: difficulty scales (hard obstacles L30 > L5)', gen[29].hard > gen[4].hard, `L5=${gen[4].hard} L30=${gen[29].hard}`);
  check('levels: length grows to L30', gen[29].len === 3500 + 20 * 250 + 10 * 100, 'L30 len=' + gen[29].len);
  

  /* ---- 7. drive: gas, lanes, brake ---- */
  await page.evaluate(() => drive(1));
  await page.waitForTimeout(300);
  const hud = await page.evaluate(() => ({ lvl: hudLevel.textContent.trim(), road: roadScene.classList.contains('active') }));
  check('drive: road active with level badge 1', hud.road && hud.lvl === '1', JSON.stringify(hud));

  const gasBox = await page.locator('#gasPedal').boundingBox();
  await page.mouse.move(gasBox.x + gasBox.width / 2, gasBox.y + gasBox.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(900);
  const moving = await page.evaluate(() => ({ v, pos }));
  check('drive: gas pedal accelerates', moving.v > 300 && moving.pos > 100, JSON.stringify(moving));
  await page.mouse.up();

  const sliderBox = await page.locator('#steerSlider').boundingBox();
  await page.mouse.click(sliderBox.x + sliderBox.width * 0.85, sliderBox.y + sliderBox.height / 2);
  await page.waitForTimeout(350);
  let lane = await page.evaluate(() => ({ t: targetLane, vis: laneVis, knob: parseFloat(steerKnob.style.left), stop: [...steerStops].findIndex(s => s.classList.contains('on')) }));
  check('drive: tapping the right end of the steering slider moves to the right lane, knob + stop follow', lane.t === 2 && Math.abs(lane.vis - 2) < 0.1 && lane.knob > 250 && lane.stop === 2, JSON.stringify(lane));
  /* drag: a finger sliding left across the track walks the lanes back to 0 */
  await page.mouse.move(sliderBox.x + sliderBox.width * 0.85, sliderBox.y + sliderBox.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(sliderBox.x + sliderBox.width * (0.85 - 0.07 * i), sliderBox.y + sliderBox.height / 2);
  const mid = await page.evaluate(() => ({ t: targetLane, held: steerEl.classList.contains('held') }));
  await page.mouse.up();
  await page.waitForTimeout(350);
  const dragged = await page.evaluate(() => ({ t: targetLane, held: steerEl.classList.contains('held'), knob: parseFloat(steerKnob.style.left) }));
  check('drive: dragging the slider left walks to the left lane; knob settles on it on release', mid.held && dragged.t === 0 && !dragged.held && dragged.knob < 80, JSON.stringify({ mid, dragged }));
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(350);
  lane = await page.evaluate(() => ({ t: targetLane, vis: laneVis }));
  check('drive: arrow keys move to the left lane', lane.t === 0 && Math.abs(lane.vis) < 0.1, JSON.stringify(lane));

  /* swipe on road surface: right ~117 stage px (one lane is 90) */
  await page.mouse.move(512, 300);
  await page.mouse.down();
  await page.mouse.move(612, 300, { steps: 6 });
  await page.mouse.up();
  lane = await page.evaluate(() => targetLane);
  check('drive: swipe right changes exactly one lane', lane === 1, 'targetLane=' + lane);

  /* brake */
  await page.mouse.move(gasBox.x + gasBox.width / 2, gasBox.y + gasBox.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(800);
  const vBefore = await page.evaluate(() => v);
  await page.mouse.up();
  const brakeBox = await page.locator('#brakePedal').boundingBox();
  await page.mouse.move(brakeBox.x + brakeBox.width / 2, brakeBox.y + brakeBox.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(500);
  const vAfter = await page.evaluate(() => v);
  await page.mouse.up();
  check('drive: brake stops the car fast', vBefore > 400 && vAfter < 30, `before=${vBefore.toFixed(0)} after=${vAfter.toFixed(0)}`);
  await page.screenshot({ path: SHOT + 'road-day.png' });

  /* ---- 8. star collect + hard obstacle hit (teleport to props) ---- */
  const starHit = await page.evaluate(async () => {
    const s = props.find(p => p.type === 'star' && p.y > 400 && !p.done); /* a low star */
    if (!s) return { skip: true };
    targetLane = laneVis = s.lane;
    pos = s.x - 300; v = 0;
    const before = runStars;
    await new Promise(r => setTimeout(r, 120)); /* let a tick run at v=0: |d|<60 ok */
    return { got: runStars === before + 1, done: s.done, before, after: runStars };
  });
  check('drive: same-lane star collects', starHit.got && starHit.done, JSON.stringify(starHit));

  const hardHitRes = await page.evaluate(async () => {
    const b = props.find(p => (p.type === 'barrel' || p.type === 'rock') && !p.done);
    if (!b) return { skip: true, note: 'no hard obstacle on L1' };
    targetLane = laneVis = b.lane;
    pos = b.x - 300 - 160; v = 0;
    gasKey = true;
    await new Promise(r => setTimeout(r, 700));
    gasKey = false;
    return { done: b.done, v, stopped: v < 40 };
  });
  check('drive: hard obstacle bonks and stops car', hardHitRes.skip || (hardHitRes.done && hardHitRes.stopped), JSON.stringify(hardHitRes));

  const wrongLane = await page.evaluate(async () => {
    buildLevel(1); pos = 0; v = 0; runStars = 0;
    const s = props.find(p => p.type === 'star' && p.y > 400 && !p.done);
    targetLane = laneVis = (s.lane + 1) % 3;
    pos = s.x - 300; v = 0;
    await new Promise(r => setTimeout(r, 120));
    return { collected: s.done };
  });
  check('drive: wrong-lane star does NOT collect', !wrongLane.collected);

  /* ---- 9. finish -> celebrate -> bank -> next ---- */
  await page.evaluate(() => { runStars = 4; renderHudStars(false); pos = LEVEL_LEN - 350; v = 0; gasKey = true; });
  await page.waitForTimeout(1600);
  await page.evaluate(() => { gasKey = false; });
  const fin = await page.evaluate(() => ({
    finished, celebrate: document.getElementById('celebrate').classList.contains('active'),
    wallet: progress.wallet, lvl1: progress.levels[1], current: progress.current
  }));
  check('finish: celebrate overlay shows', fin.finished && fin.celebrate, JSON.stringify({ f: fin.finished, c: fin.celebrate }));
  check('finish: stars banked (4+3+2 clean+2 shine=11) and level 2 current', fin.wallet === 11 && fin.current === 2, JSON.stringify({ wallet: fin.wallet, current: fin.current }));
  check('finish: level 1 progress recorded', fin.lvl1 && fin.lvl1.best >= 4 && fin.lvl1.rating >= 1, JSON.stringify(fin.lvl1));
  await page.waitForTimeout(1400);
  await page.screenshot({ path: SHOT + 'celebrate.png' });
  await tap('#nextBtn');
  await page.waitForTimeout(300);
  const nxt = await page.evaluate(() => ({ lvl: level, badge: hudLevel.textContent.trim() }));
  check('finish: next button starts level 2', nxt.lvl === 2 && nxt.badge === '2', JSON.stringify(nxt));

  /* ---- 10. map scene ---- */
  await page.click('#homeBtn');
  await page.click('#mapBtn');
  await page.waitForTimeout(200);
  const map = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('.lvlBtn')];
    const tabs = [...document.querySelectorAll('.worldTab')];
    return {
      count: btns.length, tabs: tabs.length, worlds: WORLD_COUNT,
      l1done: btns[0].classList.contains('done'),
      l2open: btns[1].classList.contains('open') && btns[1].classList.contains('current'),
      l3locked: btns[2].classList.contains('locked'),
      w2locked: tabs[1].classList.contains('locked')
    };
  });
  check('map: world page of 10 + 8 tabs, states correct', map.count === 10 && map.tabs === map.worlds && map.l1done && map.l2open && map.l3locked && map.w2locked, JSON.stringify(map));
  await page.screenshot({ path: SHOT + 'map.png' });
  /* tap level 2 from map */
  await page.evaluate(() => { const b = [...document.querySelectorAll('.lvlBtn')][1]; b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); });
  await page.waitForTimeout(250);
  const fromMap = await page.evaluate(() => ({ road: roadScene.classList.contains('active'), lvl: level }));
  check('map: tapping level 2 drives level 2', fromMap.road && fromMap.lvl === 2, JSON.stringify(fromMap));

  /* ---- 11. themes ---- */
  await page.evaluate(() => drive(15));
  await page.waitForTimeout(200);
  const sunset = await page.evaluate(() => roadScene.classList.contains('sunset'));
  await page.screenshot({ path: SHOT + 'road-sunset.png' });
  await page.evaluate(() => drive(25));
  await page.waitForTimeout(200);
  const night = await page.evaluate(() => roadScene.classList.contains('night') && !roadScene.classList.contains('sunset'));
  await page.screenshot({ path: SHOT + 'road-night.png' });
  check('themes: sunset at L15, night at L25', sunset && night);

  /* ---- 12. persistence round-trip ---- */
  await page.evaluate(() => showGarage());
  await page.reload();
  await page.waitForTimeout(300);
  const persist = await page.evaluate(() => ({
    police: progress.owned.body.includes('police'), rainbow: progress.owned.color.includes('rainbow'),
    lvl1: !!progress.levels[1], current: progress.current
  }));
  check('persistence: purchases + progress survive reload', persist.police && persist.rainbow && persist.lvl1 && persist.current === 2, JSON.stringify(persist));

  /* ---- 13. v1 migration ---- */
  await page.evaluate(() => {
    localStorage.removeItem('vroom.v2');
    localStorage.removeItem('vroom.v2.p0');   /* profiles era: p0 must be empty for v1 migration */
    localStorage.removeItem('vroom.meta');
    localStorage.setItem('vroom.v1', JSON.stringify({ body: 'fire', wheels: 'monster', color: '#43a047', extras: { horn: true, beacon: false, flag: false } }));
  });
  await page.reload();
  await page.waitForTimeout(300);
  const mig = await page.evaluate(() => ({ body: state.body, wheels: state.wheels, color: state.color, horn: state.extras.horn }));
  check('migration: v1 build carries into v2', mig.body === 'fire' && mig.wheels === 'monster' && mig.color === '#43a047' && mig.horn, JSON.stringify(mig));

  /* ---- 14. final console check ---- */
  check('end: no console errors accumulated', errors.length === 0, errors.join(' | ').slice(0, 400));

  await page.screenshot({ path: SHOT + 'garage-final.png' });
  await browser.close();

  const fails = results.filter(r => !r.ok);
  console.log(`\n${results.length - fails.length}/${results.length} passed`);
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
