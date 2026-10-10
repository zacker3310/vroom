const pw = require('playwright-core');
const os = require('os');
const EXE = process.env.CHROMIUM || os.homedir() + '/Library/Caches/ms-playwright/chromium-1117/chrome-mac/Chromium.app/Contents/MacOS/Chromium';
const URL = process.env.VROOM_URL || 'http://localhost:4173/index.html';
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
    for (let n = 1; n <= MAX_LEVEL; n++) {
      buildLevel(n);
      rep.maxLen = Math.max(rep.maxLen, LEVEL_LEN);
      if (props.filter(p => p.type === 'finish').length !== 1) rep.finishBad++;
      const hard = props.filter(p => HARD_T(p.type));
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
  check('gen: all levels — 1 finish each, no 3-lane walls, in bounds', gen.finishBad === 0 && gen.wall === 0 && gen.out === 0, JSON.stringify(gen).slice(0, 200));
  check('gen: stars never starve, length capped', gen.minStars >= 5 && gen.maxLen === 3500 + 20 * 250 + 60 * 100, JSON.stringify({ minStars: gen.minStars, maxLen: gen.maxLen }));
  check('gen: world hazards appear in worlds 5-8', [5,6,7,8].every(w => gen.worldProps[w] > 0), JSON.stringify(gen.worldProps));
  check('gen: world hazards appear in worlds 11-12 (deep sea, sky kingdom)', [11,12].every(w => gen.worldProps[w] > 0), JSON.stringify(gen.worldProps));

  /* ---- worlds 9-10 (volcano, candy land): hazards, no 3-lane walls, theme class, weather ---- */
  const gen2 = await page.evaluate(() => {
    const rep = { worldProps: {}, wall: 0, cls: {}, weather: {} };
    for (let n = 81; n <= 100; n++) {
      buildLevel(n);
      const w = worldOf(n), hard = props.filter(p => HARD_T(p.type));
      for (const p of props) if (WORLD_ITEMS[w] && WORLD_ITEMS[w].includes(p.type)) rep.worldProps[w] = (rep.worldProps[w] || 0) + 1;
      for (const a of hard) for (const b of hard) for (const c of hard) {
        if (a === b || b === c || a === c) continue;
        const xs = [a.x, b.x, c.x];
        if (Math.max(...xs) - Math.min(...xs) < 240 && new Set([a.lane, b.lane, c.lane]).size === 3) rep.wall++;
      }
    }
    for (const [n, want] of [[85, 'w9'], [95, 'w10']]) { buildLevel(n); rep.cls[want] = roadScene.classList.contains(want); rep.weather[want] = document.getElementById('weather').childElementCount; }
    return rep;
  });
  check('worlds 9-10: hazards appear, no 3-lane walls, theme classes w9/w10, ash + sprinkle weather', gen2.worldProps[9] > 0 && gen2.worldProps[10] > 0 && gen2.wall === 0 && gen2.cls.w9 && gen2.cls.w10 && gen2.weather.w9 > 0 && gen2.weather.w10 > 0, JSON.stringify(gen2));

  /* ---- themes + scenery + weather per world ---- */
  const themes = await page.evaluate(() => {
    const out = {};
    for (const [n, want] of [[35,'w4'],[45,'w5'],[55,'w6'],[65,'w7'],[75,'w8'],[105,'w11'],[115,'w12']]) {
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
  check('worlds: deep sea + sky kingdom theme classes and weather', themes.w11.cls && themes.w12.cls && themes.w11.weather > 0 && themes.w12.weather > 0, JSON.stringify({ w11: themes.w11, w12: themes.w12 }));

  /* ---- 13.3 ground painter: shoulders, field strips, crowned tarmac, ramp side walls, quad budget ---- */
  const ground = await page.evaluate(async () => {
    const px = (x, y) => { const d = rctx.getImageData(Math.round(x * 2), Math.round(y * 2), 1, 1).data; return [d[0], d[1], d[2]]; };
    const lum = c => c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114;
    const hex = c => '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
    const out = { worlds: {}, errors: [] };
    /* park the car on a stretch with no ramp in the sampled window and paint one frame */
    const park = (n) => {
      drive(n); v = 0; gasKey = false; targetLane = laneVis = 1;
      let at = 0;
      while (RAMPS.some(r => r.x + r.w > at + 400 && r.x < at + 1300) && at < LEVEL_LEN - 2000) at += 200;
      pos = at; renderWorld(); stopDrive();
      return pos + CAR_SCREEN_X - CAR_HIT_Z;
    };
    /* (a) farm, mid-depth: the ground left of the road holds the shoulder, the crop rows and the grass */
    park(13);
    const T = groundTones(roadPal), z = 800, edge = proj(z, -ROAD_HALF - 26, 0), y = edge[1];
    const seen = new Set();
    for (let x = 2; x < edge[0] - 2; x += 1) seen.add(hex(px(x, y)));
    out.farm = { distinct: seen.size, shoulder: hex(px(proj(z, -ROAD_HALF - 26 - 30, 0)[0], y)), want: T.shoulder, field: seen.has(T.field) };
    /* (b) every world: a clean frame, and the road's centre is lighter than the outer lane */
    for (let w = 1; w <= WORLD_COUNT; w++) {
      try {
        park(w * 10 - 5);
        const zc = 700, cen = px(...proj(zc, 0, 0)), lane = px(...proj(zc, LANE_W, 0));
        out.worlds[w] = { crownLighter: lum(cen) > lum(lane) + 2, quads: roadQuadN, centre: hex(cen), lane: hex(lane) };
      } catch (e) { out.errors.push(w + ': ' + e.message); }
    }
    /* (c) a standard ramp 420 ahead: the centre of its left side face carries the wall tone */
    drive(1); v = 0; gasKey = false; targetLane = laneVis = 1;
    const rp = RAMPS[0];
    pos = rp.x - 420 - CAR_SCREEN_X + CAR_HIT_Z; renderWorld(); stopDrive();
    const z0 = 420, z1 = z0 + rp.w, corners = [proj(z0, -ROAD_HALF - 26, 0), proj(z1, -ROAD_HALF - 26, 0), proj(z1, -ROAD_HALF, rp.h), proj(z0, -ROAD_HALF, 0)];
    /* from inside the road the face projects as a bow-tie: its base line (a-b) crosses the deck edge (e-d) at X and
       the deck covers the far half, so the visible wall is the near triangle a-e-X; sample its centroid */
    const [a, b, d, e] = corners;
    const den = (b[0] - a[0]) * (e[1] - d[1]) - (b[1] - a[1]) * (e[0] - d[0]);
    const t = den ? ((d[0] - a[0]) * (e[1] - d[1]) - (d[1] - a[1]) * (e[0] - d[0])) / den : 2;
    const X = t > 0 && t < 1 ? [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] : b;
    const cx = (a[0] + e[0] + X[0]) / 3, cy = (a[1] + e[1] + X[1]) / 3;
    out.ramp = { got: hex(px(cx, cy)), want: shade(rp.edge || '#b08968', -0.32), deck: hex(px(...proj(z0 + rp.w / 2, 0, rp.h / 2))), quads: roadQuadN, corners: corners.map(p => p.slice(0, 2).map(Math.round)) };
    return out;
  });
  check('ground: farm mid-depth row holds >= 3 tones left of the road, the dirt shoulder sits outside the rumble strip, the crop-row tone is present',
    ground.farm.distinct >= 3 && ground.farm.shoulder === ground.farm.want && ground.farm.field, JSON.stringify(ground.farm));
  const crownBad = Object.keys(ground.worlds).filter(w => !ground.worlds[w].crownLighter);
  check('ground: all 12 worlds paint a clean frame with the road crown lighter than the outer lane',
    ground.errors.length === 0 && Object.keys(ground.worlds).length === 12 && crownBad.length === 0, JSON.stringify({ errors: ground.errors, crownBad, w1: ground.worlds[1] }));
  check('ground: a ramp in view paints its side-wall tone below the deck edge', ground.ramp.got === ground.ramp.want, JSON.stringify(ground.ramp));
  const quadMax = Math.max(ground.ramp.quads, ...Object.values(ground.worlds).map(w => w.quads));
  check('ground: the painter stays under 700 quads a frame on every world, ramp in view included', quadMax <= 700, 'max ' + quadMax);

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
    return { tabs: tabs.length, worlds: WORLD_COUNT, w1open: !tabs[0].classList.contains('locked'), w2locked: tabs[1].classList.contains('locked'), grid: document.querySelectorAll('.lvlBtn').length };
  });
  check('map: 8 tabs, sequential lock, 10-level page', mapUi.tabs === mapUi.worlds && mapUi.w1open && mapUi.w2locked && mapUi.grid === 10, JSON.stringify(mapUi));

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
  /* 2 stars + 3 finish + 2 clean + 1 shine + 25 world = 33 */
  check('rewards: world-clear banks +25 trophy bonus (2+3+2+1+25=33)', unlock.banked === 33 && unlock.worldOpen, JSON.stringify(unlock));
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
    extraBtns: (openTab('extras', false), document.querySelectorAll('#strip .tile[data-extra]').length)
  }));
  check('premium: 4 bodies + 2 wheels + honks registered with prices', premium.bodies && premium.wheels && premium.honks, JSON.stringify(premium));
  check('extras: 3 purchasable extras with tiles (12 total incl. shop pack)', premium.extras && premium.extraBtns === 12, JSON.stringify({ btns: premium.extraBtns }));

  /* locked extra gates GO, buying unlocks */
  const extraShop = await page.evaluate(() => {
    showGarage();
    progress.wallet = 100; renderWallets(false);
    openTab('extras', false);
    const wingsBtn = document.querySelector('.tile[data-extra="wings"]');
    wingsBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 300, clientY: 600 }));
    wingsBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 300, clientY: 600 }));
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

  /* ---- 13.13 deep sea: the glass tunnel's ribs, the caustic overlay, the whale and the bubbles, the second roadside
     set, the cool palette with a dune shoulder and no field strips, and the roller's long low swells ---- */
  const sea = await page.evaluate(async () => {
    const park = async (n, x) => { drive(n); v = 0; gasKey = false; pos = x; await new Promise(r => setTimeout(r, 150)); renderWorld(); };
    const ribsWanted = () => { const carX = pos + CAR_SCREEN_X - CAR_HIT_Z; let want = 0; for (let x = Math.ceil((carX + 100) / TUN_GAP) * TUN_GAP; x - carX < DRAW_FAR; x += TUN_GAP) if (!inChomp(x, 150)) want++; return want; };
    const out = {};
    await park(101, 600);
    out.ribsOpen = tunnelRibN; out.ribsOpenWant = ribsWanted();
    out.caustic = getComputedStyle(document.getElementById('seaCaustic')).display;
    out.causticAnim = getComputedStyle(document.getElementById('seaCaustic'), '::before').animationName;
    out.causticInView = document.getElementById('seaCaustic').parentElement.id;
    out.whale = document.querySelectorAll('#weather .seaWhale').length;
    out.bubbles = document.querySelectorAll('#weather .seaBubble').length;
    const T = groundTones(roadPal);
    out.pal = { rumA: roadPal.rumA, rumB: roadPal.rumB, haze: roadPal.haze, tunnel: !!roadPal.tunnel, fields: T.fields.length, shoulder: T.shoulder, ground: roadPal.ground };
    out.set = WORLD_SET.w11.length;
    out.pieces = ['#c9772a', 'M14 -96 Q30 -14 70 -8', 'M98 -70 Q124 -98 150 -70', 'stroke-linejoin="round"/><circle'].map(s => WORLD_SET.w11.some(p => p.svg.includes(s)));
    stopDrive();
    /* inside level 104's first chomper: the ribs that would fall within its stretch are skipped, the monster owns it */
    await park(104, 0);
    const t = CHOMPS[0];
    pos = t.x0 + 400; renderWorld();
    out.ribsTwist = tunnelRibN; out.ribsTwistWant = ribsWanted(); out.twistLen = t.x1 - t.x0;
    stopDrive();
    await park(95, 600);
    out.ribsCandy = tunnelRibN; out.causticCandy = getComputedStyle(document.getElementById('seaCaustic')).display;
    stopDrive();
    buildLevel(107);
    out.roller = { big: HILLS.filter(h => Math.abs(h.amp) >= 110).length, maxAmp: Math.max(...HILLS.map(h => Math.abs(h.amp))), minLen: Math.min(...HILLS.map(h => h.x1 - h.x0)) };
    return out;
  });
  check('deep sea: glass tunnel ribs ring the road outside twists, none inside a corkscrew, none on other worlds',
    sea.ribsOpen >= 9 && sea.ribsOpen === sea.ribsOpenWant && sea.ribsTwist === sea.ribsTwistWant && sea.ribsTwist < sea.ribsOpen - 3 && sea.ribsCandy === 0,
    JSON.stringify({ open: sea.ribsOpen, want: sea.ribsOpenWant, twist: sea.ribsTwist, twistWant: sea.ribsTwistWant, candy: sea.ribsCandy }));
  check('deep sea: caustic overlay inside #view, shown on w11 only, drifting by a transform keyframe',
    sea.caustic === 'block' && sea.causticCandy === 'none' && sea.causticAnim === 'seaCaustic' && sea.causticInView === 'view', JSON.stringify({ w11: sea.caustic, w10: sea.causticCandy, anim: sea.causticAnim, parent: sea.causticInView }));
  check('deep sea: a whale and more bubbles in the weather, the second roadside set (sea stars, rowing boat, diver helmet, anemone)',
    sea.whale === 1 && sea.bubbles >= 24 && sea.set >= 12 && sea.pieces.every(Boolean), JSON.stringify({ whale: sea.whale, bubbles: sea.bubbles, set: sea.set, pieces: sea.pieces }));
  check('deep sea: white + light-blue rumbles, deep-water haze, dune shoulder, no field strips; the roller rolls in long low swells that still count as big hills',
    sea.pal.rumA === '#f8f9fa' && sea.pal.rumB === '#4cc9f0' && sea.pal.haze === '#2a7d98' && sea.pal.tunnel && sea.pal.fields === 0 && sea.pal.shoulder === '#80afa2' &&
    sea.roller.big >= 3 && sea.roller.maxAmp <= 200 && sea.roller.minLen >= 1100, JSON.stringify({ pal: sea.pal, roller: sea.roller }));
  /* the caustic drift is decorative: off when the device asks for reduced motion */
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const rm = await page.evaluate(() => ({ caustic: getComputedStyle(document.getElementById('seaCaustic'), '::before').animationName, whale: getComputedStyle(document.querySelector('.seaWhale') || document.body).animationName }));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  check('deep sea: caustic drift and the whale crossing are off under prefers-reduced-motion', rm.caustic === 'none' && rm.whale === 'none', JSON.stringify(rm));

  check('no console errors', errors.length === 0, errors.join(' | ').slice(0, 400));

  await browser.close();
  const fails = results.filter(r => !r.ok);
  console.log(`\n${results.length - fails.length}/${results.length} passed`);
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
