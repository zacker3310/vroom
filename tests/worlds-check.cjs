const pw = require('playwright-core');
const os = require('os');
const EXE = os.homedir() + '/Library/Caches/ms-playwright/chromium-1117/chrome-mac/Chromium.app/Contents/MacOS/Chromium';
const URL = 'http://localhost:4173/index.html';
const SHOT = __dirname + '/shots/';

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
  const tap = sel => page.evaluate(s => document.querySelector(s).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 99 })), sel);

  await page.goto(URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(300);

  /* ---- 80-level generator invariants ---- */
  const gen = await page.evaluate(() => {
    const rep = { finishBad: 0, wall: 0, out: 0, minStars: 99, worldProps: {}, maxLen: 0 };
    for (let n = 1; n <= 80; n++) {
      buildLevel(n);
      rep.maxLen = Math.max(rep.maxLen, LEVEL_LEN);
      if (props.filter(p => p.type === 'finish').length !== 1) rep.finishBad++;
      const hard = props.filter(p => ['barrel','rock','tnt','cactus','crater'].includes(p.type));
      for (const a of hard) for (const b of hard) for (const c of hard) {
        if (a === b || b === c || a === c) continue;
        const xs = [a.x, b.x, c.x];
        if (Math.max(...xs) - Math.min(...xs) < 240 && new Set([a.lane, b.lane, c.lane]).size === 3) { rep.wall++; }
      }
      if (props.some(p => p.x < 0 || p.x > LEVEL_LEN)) rep.out++;
      rep.minStars = Math.min(rep.minStars, props.filter(p => p.type === 'star').length);
      const w = worldOf(n);
      for (const p of props) if (WORLD_ITEMS[w] && WORLD_ITEMS[w].includes(p.type)) rep.worldProps[w] = (rep.worldProps[w] || 0) + 1;
    }
    return rep;
  });
  check('gen: 80 levels — 1 finish each, no 3-lane walls, in bounds', gen.finishBad === 0 && gen.wall === 0 && gen.out === 0, JSON.stringify(gen).slice(0, 200));
  check('gen: stars never starve, length capped', gen.minStars >= 5 && gen.maxLen === 3500 + 20 * 250 + 60 * 100, JSON.stringify({ minStars: gen.minStars, maxLen: gen.maxLen }));
  check('gen: world hazards appear in worlds 5-8', [5,6,7,8].every(w => gen.worldProps[w] > 0), JSON.stringify(gen.worldProps));

  /* ---- themes + scenery + weather per world ---- */
  const themes = await page.evaluate(() => {
    const out = {};
    for (const [n, want] of [[35,'w4'],[45,'w5'],[55,'w6'],[65,'w7'],[75,'w8']]) {
      buildLevel(n);
      out[want] = {
        cls: roadScene.classList.contains(want),
        weather: document.getElementById('weather').childElementCount
      };
    }
    return out;
  });
  check('worlds: theme classes at L35/45/55/65/75', ['w4','w5','w6','w7','w8'].every(w => themes[w].cls), JSON.stringify(Object.keys(themes).filter(w => !themes[w].cls)));
  check('worlds: rain + snow weather particles, none in desert', themes.w4.weather > 10 && themes.w5.weather > 10 && themes.w6.weather === 0, JSON.stringify({ w4: themes.w4.weather, w5: themes.w5.weather, w6: themes.w6.weather }));

  /* ---- movers ---- */
  const movers = await page.evaluate(async () => {
    /* find a level with a tumbleweed */
    let tw = null;
    for (let n = 51; n <= 60 && !tw; n++) { buildLevel(n); tw = props.find(p => p.type === 'tumbleweed'); }
    if (!tw) return { skip: true };
    drive(51);
    await new Promise(r => setTimeout(r, 150));
    tw = props.find(p => p.type === 'tumbleweed');
    if (!tw) return { skip: true, note: 'none in L51' };
    const x0 = tw.x;
    await new Promise(r => setTimeout(r, 500));
    return { moved: tw.x < x0, dx: Math.round(tw.x - x0) };
  });
  check('movers: tumbleweed rolls toward the car', movers.skip || movers.moved, JSON.stringify(movers));

  const crab = await page.evaluate(async () => {
    let cb = null;
    for (let n = 61; n <= 70 && !cb; n++) { buildLevel(n); cb = props.find(p => p.type === 'crab'); }
    if (!cb) return { skip: true };
    drive(61 + 0);
    await new Promise(r => setTimeout(r, 100));
    cb = props.find(p => p.type === 'crab');
    if (!cb) return { skip: true, note: 'none in L61' };
    const l0 = cb.lane;
    await new Promise(r => setTimeout(r, 1600));
    return { hopped: cb.lane !== l0, from: l0, to: cb.lane };
  });
  check('movers: crab hops lanes', crab.skip || crab.hopped, JSON.stringify(crab));

  /* ---- space: low gravity ---- */
  const grav = await page.evaluate(async () => {
    drive(75);
    await new Promise(r => setTimeout(r, 150));
    return { g: gravityNow(), theme: roadScene.classList.contains('w8'), beams: !!carWrap.querySelector('.beams') };
  });
  check('space: low gravity + skyStars theme + headlights', grav.g === 640 && grav.theme && grav.beams, JSON.stringify(grav));
  await page.screenshot({ path: SHOT + 'w-space.png' });

  /* ---- world map UI ---- */
  await page.evaluate(() => showMap());
  await page.waitForTimeout(150);
  const mapUi = await page.evaluate(() => {
    const tabs = [...document.querySelectorAll('.worldTab')];
    return { tabs: tabs.length, w1open: !tabs[0].classList.contains('locked'), w2locked: tabs[1].classList.contains('locked'), grid: document.querySelectorAll('.lvlBtn').length };
  });
  check('map: 8 tabs, sequential lock, 10-level page', mapUi.tabs === 8 && mapUi.w1open && mapUi.w2locked && mapUi.grid === 10, JSON.stringify(mapUi));

  /* world unlock: finishing L10 opens world 2 tab */
  const unlock = await page.evaluate(async () => {
    progress.levels[9] = { best: 1, rating: 1 };
    drive(10);
    await new Promise(r => setTimeout(r, 150));
    const w0 = progress.wallet;
    runStars = 2; runDamage = 0;
    pos = LEVEL_LEN - 350; gasKey = true;
    await new Promise(r => setTimeout(r, 1500));
    gasKey = false;
    return { banked: progress.wallet - w0, worldOpen: !!progress.levels[10] };
  });
  /* 2 stars + 3 finish + 2 clean + 25 world = 32 */
  check('rewards: world-clear banks +25 trophy bonus (2+3+2+25=32)', unlock.banked === 32 && unlock.worldOpen, JSON.stringify(unlock));
  await page.evaluate(() => showMap());
  await page.waitForTimeout(150);
  const w2 = await page.evaluate(() => !document.querySelectorAll('.worldTab')[1].classList.contains('locked'));
  check('map: world 2 tab unlocks after finishing level 10', w2);
  await page.screenshot({ path: SHOT + 'w-map.png' });

  /* ---- golden capsule ---- */
  const golden = await page.evaluate(async () => {
    drive(3);
    await new Promise(r => setTimeout(r, 150));
    const c = props.find(p => p.type === 'capsule');
    if (!c) return { skip: true };
    const rr = Math.random;
    Math.random = () => 0.57;   /* weights 5,2,1,3,2 of 13: 7.41 -> golden bucket [7,8) */
    const before = runStars;
    targetLane = laneVis = c.lane; pos = c.x - 300; v = 0;
    await new Promise(r => setTimeout(r, 250));
    Math.random = rr;
    return { gained: runStars - before };
  });
  check('rewards: golden capsule pays 20', golden.skip || golden.gained === 20, JSON.stringify(golden));

  /* ---- premium content + extras shop ---- */
  const premium = await page.evaluate(() => ({
    bodies: ['limo','dragon','train','royal'].every(b => !!BODIES[b] && PRICES.body[b] >= 250),
    wheels: !!WHEELS.glow && !!WHEELS.star && PRICES.wheels.glow === 90,
    honks: ['limo','dragon','train','royal'].every(b => typeof HONKS[b] === 'function'),
    extras: ['wings','booster','partyhat'].every(x => PRICES.extras[x] > 0 && state.extras[x] === false),
    extraBtns: document.querySelectorAll('.extraBtn').length
  }));
  check('premium: 4 bodies + 2 wheels + honks registered with prices', premium.bodies && premium.wheels && premium.honks, JSON.stringify(premium));
  check('extras: 3 purchasable extras with buttons (6 total)', premium.extras && premium.extraBtns === 6, JSON.stringify({ btns: premium.extraBtns }));

  /* locked extra gates GO, buying unlocks */
  const extraShop = await page.evaluate(() => {
    showGarage();
    progress.wallet = 100; renderWallets(false);
    const wingsBtn = document.querySelector('.extraBtn[data-extra="wings"]');
    wingsBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    const gated = goBtn.classList.contains('locked') && priceTag.classList.contains('show');
    priceTag.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    return { gated, owned: progress.owned.extras.includes('wings'), wallet: progress.wallet, ungated: !goBtn.classList.contains('locked'), rendered: preview.innerHTML.includes('flapWing') };
  });
  check('extras: toggling locked wings gates GO, 40-star buy unlocks + renders', extraShop.gated && extraShop.owned && extraShop.wallet === 60 && extraShop.ungated && extraShop.rendered, JSON.stringify(extraShop));

  /* premium body renders + world CSS injected */
  const dragon = await page.evaluate(() => {
    progress.wallet = 500; progress.owned.body.push('dragon'); state.body = 'dragon'; save(); renderPreview();
    return { svg: (preview.innerHTML.match(/<(path|rect|circle|ellipse)/g) || []).length, css: !!Array.from(document.styleSheets).length };
  });
  check('premium: dragon renders in garage', dragon.svg > 10, JSON.stringify(dragon));
  await page.screenshot({ path: SHOT + 'w-dragon-garage.png' });

  /* ---- free drive tours all 8 worlds ---- */
  const tour = await page.evaluate(async () => {
    state.body = 'dump'; save();
    driveFree();
    await new Promise(r => setTimeout(r, 150));
    const seen = [];
    for (const target of [1000, 8000, 15000, 22000, 29000, 36000, 43000, 50000, 57000]) {
      pos = target;
      await new Promise(r => setTimeout(r, 120));
      const cl = roadScene.classList;
      seen.push(cl.contains('w8') ? 'w8' : cl.contains('w7') ? 'w7' : cl.contains('w6') ? 'w6' : cl.contains('w5') ? 'w5' : cl.contains('w4') ? 'w4' : cl.contains('night') ? 'night' : cl.contains('sunset') ? 'sunset' : 'day');
    }
    return seen.join(',');
  });
  check('free: tours all 8 worlds then wraps', tour === 'day,sunset,night,w4,w5,w6,w7,w8,day', tour);
  await page.evaluate(() => showGarage());

  check('no console errors', errors.length === 0, errors.join(' | ').slice(0, 400));

  await browser.close();
  const fails = results.filter(r => !r.ok);
  console.log(`\n${results.length - fails.length}/${results.length} passed`);
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
