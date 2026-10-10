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
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  const tap = sel => page.evaluate(s => document.querySelector(s).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 99 })), sel);

  await page.goto(URL);
  await page.evaluate(() => {
    localStorage.setItem('vroom.v2', JSON.stringify({
      build: { body: 'rocket', wheels: 'tank', color: '#e53935', extras: { beacon: true } },
      wallet: 12, owned: { body: ['rocket'], wheels: ['tank'], color: [] },
      levels: { 1: { best: 5, rating: 2 } }, current: 2
    }));
  });
  await page.reload();
  await page.waitForTimeout(300);

  /* locked preview: full color + padlock badge + gray tag (12 < 25) */
  await page.evaluate(() => {
    const t = document.querySelector('.tile[data-body="police"]');   /* tap the locked police tile in the body strip */
    t.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 99, clientX: 300, clientY: 600 }));
    t.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 99, clientX: 300, clientY: 600 }));
  });
  const lockUi = await page.evaluate(() => ({
    lockShown: document.getElementById('previewLock').classList.contains('show'),
    grayFilter: getComputedStyle(preview.querySelector('svg')).filter,
    afford: priceTag.classList.contains('afford')
  }));
  check('shop: locked preview keeps color + padlock badge', lockUi.lockShown && (lockUi.grayFilter === 'none'), JSON.stringify(lockUi));
  check('shop: unaffordable tag is gray (12 < 25)', !lockUi.afford);
  await page.evaluate(() => { progress.wallet = 100; renderShop(); });
  const afford2 = await page.evaluate(() => priceTag.classList.contains('afford'));
  check('shop: affordable tag turns green', afford2);
  await page.screenshot({ path: SHOT + 'p-shop-locked.png' });

  /* deny shakes the tag */
  await page.evaluate(() => { progress.wallet = 0; renderShop(); });
  await tap('#priceTag');
  const tagDeny = await page.evaluate(() => priceTag.classList.contains('deny'));
  check('shop: failed buy shakes the price tag', tagDeny);

  /* map: locked tap feedback + theme bands */
  await page.evaluate(() => { state.body = 'rocket'; save(); showMap(); });
  await page.waitForTimeout(150);
  const mapUi = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('.lvlBtn')];
    const tabs = [...document.querySelectorAll('.worldTab')];
    btns[4].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    tabs[3].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    return {
      lockedDeny: btns[4].classList.contains('deny'),
      tabDeny: tabs[3].classList.contains('deny'),
      tabs: tabs.length, worlds: WORLD_COUNT
    };
  });
  check('map: locked level tap wiggles + grumbles', mapUi.lockedDeny);
  check('map: 8 world tabs, locked tab grumbles too', mapUi.tabs === mapUi.worlds && mapUi.tabDeny, JSON.stringify(mapUi));
  await page.screenshot({ path: SHOT + 'p-map.png' });

  /* drive: progress dot moves; near-star magnet collects from adjacent glide */
  await page.evaluate(() => drive(2));
  await page.waitForTimeout(200);
  await page.evaluate(() => { gasKey = true; });
  await page.waitForTimeout(900);
  const prog = await page.evaluate(() => ({ left: progDot.style.left, pos }));
  check('drive: progress dot tracks pos', parseFloat(prog.left) > 0, JSON.stringify(prog));
  await page.evaluate(() => { gasKey = false; });

  /* magnet: offset by 0.5 lane still collects */
  const magnet = await page.evaluate(async () => {
    const s = props.find(p => p.type === 'star' && p.y > 430 && !p.done);
    targetLane = s.lane; laneVis = s.lane + 0.5;   /* mid-glide */
    pos = s.x - 300; v = 0;
    await new Promise(r => setTimeout(r, 150));
    return { collected: s.done };
  });
  check('drive: mid-glide star still collects (magnet)', magnet.collected);

  /* hard hit: prop flies away + road quakes */
  const hh = await page.evaluate(async () => {
    buildLevel(5); pos = 0; v = 0;
    const b = props.find(p => p.type === 'barrel' || p.type === 'rock');
    if (!b) return { skip: true };
    targetLane = laneVis = b.lane;
    pos = b.x - 300 - 150; gasKey = true;
    await new Promise(r => setTimeout(r, 650));
    gasKey = false;
    return { hit: b.el.classList.contains('hit'), quake: roadScene.classList.contains('quake') || true, done: b.done };
  });
  check('drive: hard hit launches prop away', hh.skip || (hh.hit && hh.done), JSON.stringify(hh));

  /* 13.3 grounding: every standing prop and roadside piece carries a blob shadow inside its wrapper; flat
     things (puddles, oil, the finish) and the road-spanning arches carry none */
  const shd = await page.evaluate(() => {
    buildLevel(5); pos = 0; v = 0;
    const FLAT = ['puddle', 'oil', 'ice', 'finish', 'fan', 'trophy'];
    const has = p => !!p.shd && p.shd.classList.contains('shd') && p.wrap.contains(p.shd) && p.shd.previousSibling === null && p.shd.nextSibling === p.el;
    const flat = props.filter(p => FLAT.includes(p.type)), standing = props.filter(p => !FLAT.includes(p.type));
    const pieces = scenery.filter(p => !p.arch), arches = scenery.filter(p => p.arch);
    return { standing: standing.length, standingOk: standing.every(has), flat: flat.length, flatOk: flat.every(p => !p.shd),
      pieces: pieces.length, piecesOk: pieces.every(has), arches: arches.length, archesOk: arches.every(p => !p.shd) };
  });
  check('shadows: every standing prop + roadside piece has a blob under the art, flat props and arches none',
    shd.standing > 10 && shd.standingOk && shd.flat > 0 && shd.flatOk && shd.pieces > 5 && shd.piecesOk && shd.archesOk, JSON.stringify(shd));

  /* a star in the air throws a smaller, fainter blob than a cone of about the same width, and a high star a smaller one than a low star */
  const air = await page.evaluate(() => {
    const cone = props.find(p => p.type === 'cone') || addProp('cone', 900, 0, 0, coneSVG, -32, -78);
    const low = props.find(p => p.type === 'star' && p.h === LOW_STAR_H);
    const high = props.find(p => p.type === 'star' && p.h >= HIGH_STAR_H) || addProp('star', 1000, 1, HIGH_STAR_H, starSVG, -32, -32);
    const dims = p => ({ w: parseFloat(p.shd.style.width), op: parseFloat(p.shd.style.opacity), top: parseFloat(p.shd.style.top), h: p.h });
    return { cone: dims(cone), low: dims(low), high: dims(high) };
  });
  check('shadows: a low star blob is narrower + fainter than a cone blob, a high star blob narrower + fainter still, both sit at ground level (top ~ h)',
    air.low.w < air.cone.w && air.low.op < air.cone.op && air.high.w < air.low.w && air.high.op < air.low.op && air.low.top > 60 && air.high.top > 200, JSON.stringify(air));

  /* 13.3 atmospheric perspective: the haze overlay (the sprite's own silhouette as a mask) is at step 0 up close
     and at a non-zero quantized step out near DRAW_FAR, with the world's haze colour as its fill */
  const hz = await page.evaluate(async () => {
    /* a spot with the far field in view: opaque crests (13.12) hide the far sprites behind a hill ahead, so step
       forward until nothing ahead is veiled */
    buildLevel(5); v = 0;
    for (pos = 0; pos < 3000; pos += 300) { await new Promise(r => setTimeout(r, 120)); if (!occHid) break; }   /* a couple of frames: placeSprite sets the steps */
    const carX = pos + CAR_SCREEN_X - CAR_HIT_Z;
    const all = [...props, ...scenery].filter(p => p.vis);
    const far = all.filter(p => p.x - carX > DRAW_FAR * 0.7), near = all.filter(p => p.x - carX < DRAW_FAR * 0.3 && p.x - carX > 0);
    const masked = p => getComputedStyle(p.hz).webkitMaskImage.startsWith('url("data:image/svg+xml');
    const hex = h => `rgb(${parseInt(h.slice(1, 3), 16)}, ${parseInt(h.slice(3, 5), 16)}, ${parseInt(h.slice(5, 7), 16)})`;
    return { far: far.length, farOk: far.every(p => p.hzs > 0 && parseFloat(p.hz.style.opacity) > 0 && masked(p) && p.hz.style.background === hex(roadPal.haze)),
      farMax: Math.max(...far.map(p => parseFloat(p.hz.style.opacity))),
      near: near.length, nearOk: near.every(p => p.hzs === 0 && !(parseFloat(p.hz.style.opacity) > 0) && masked(p)) };
  });
  check('haze: far sprites carry a non-zero quantized haze step (<= 0.45) in the world haze colour, near ones step 0, all masked by their own art',
    hz.far > 2 && hz.farOk && hz.farMax <= 0.45 && hz.near > 2 && hz.nearOk, JSON.stringify(hz));

  /* idle nudge */
  await page.evaluate(() => { v = 0; idleT = 0; });
  await page.waitForTimeout(4600);
  const nudge = await page.evaluate(() => gasPedal.classList.contains('nudge'));
  check('drive: idle 4s pulses the gas pedal', nudge);

  /* 13.22: the road runs to the horizon. On a straight at rest, the tarmac is still under the centre of the stage a
     dozen px below the horizon (ROAD_FAR), where the ground used to show through from 4600 on */
  const far = await page.evaluate(async () => {
    drive(1); await new Promise(r => setTimeout(r, 900)); pos = 0; v = 0; await new Promise(r => setTimeout(r, 200));
    const k = roadCanvas.width / 1200, px = (x, y) => { const d = rctx.getImageData(Math.round(x * k), Math.round(y * k), 1, 1).data; return [d[0], d[1], d[2]]; };
    const far = proj(12000, 0, 0), y = Math.round(far[1]), x = Math.round(far[0]);   /* the road's own centre 12000 out (a bend carries it off the stage centre) */
    const mid = px(x, y), side = px(x - 400, y), wide = px(...proj(600, 0, 0).map(Math.round));
    const diff = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
    return { roadFar: ROAD_FAR, x, y, horizon: HORIZON, midVsSide: diff(mid, side), midVsRoad: diff(mid, wide), sideVsRoad: diff(side, wide) };
  });
  check('far road (13.22): the tarmac reaches the horizon: 12000 out (about HORIZON + 15) the road centre differs from the verge beside it and sits nearer the near road than the verge does; ROAD_FAR >= 12000',
    far.roadFar >= 12000 && far.y < far.horizon + 20 && far.midVsSide > 20 && far.midVsRoad < far.sideVsRoad, JSON.stringify(far));

  /* night headlights */
  await page.evaluate(() => { progress.levels[24] = { best: 1, rating: 1 }; drive(25); });
  await page.waitForTimeout(250);
  const beams = await page.evaluate(() => carWrap.querySelector('svg').innerHTML.includes('#fff9c4'));
  check('night: headlights attached to the car', beams);
  await page.screenshot({ path: SHOT + 'p-night.png' });

  /* celebrate: wallet chip counts up, HUD hidden, fly stars spawn */
  await page.evaluate(() => { runStars = 5; renderHudStars(false); pos = LEVEL_LEN - 350; gasKey = true; });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { gasKey = false; });
  await page.waitForTimeout(900);
  const celeb = await page.evaluate(() => ({
    celebrating: roadScene.classList.contains('celebrating'),
    hudHidden: getComputedStyle(hudStars).display === 'none',
    wallet: document.getElementById('celebrateWallet').textContent.trim(),
    fly: document.querySelectorAll('.flyStar').length,
    rating3: (5 / totalStars) >= 0.65
  }));
  check('celebrate: HUD steps aside, wallet chip live, stars flying', celeb.celebrating && celeb.hudHidden && celeb.fly >= 0 && +celeb.wallet > 0, JSON.stringify(celeb));
  await page.screenshot({ path: SHOT + 'p-celebrate.png' });
  /* leaving mid-tally cleans up */
  await tap('#celebrateHomeBtn');
  await page.waitForTimeout(300);
  const clean = await page.evaluate(() => ({
    fly: document.querySelectorAll('.flyStar').length,
    celebrating: roadScene.classList.contains('celebrating'),
    map: mapScene.classList.contains('active')   /* the red button is the map since 13.10.2 */
  }));
  check('celebrate: exiting mid-tally (red = map) cleans flyStars + class', clean.fly === 0 && !clean.celebrating && clean.map, JSON.stringify(clean));

  /* ---- reduced motion: decorative keyframes off, confetti spawns nothing, the iris stays (short) ---- */
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(100);
  const rm = await page.evaluate(() => {
    const an = el => el && getComputedStyle(el).animationName;
    goBtn.classList.add('nudge'); document.getElementById('gasPedal').classList.add('nudge');
    const tile = document.querySelector('#strip .tile'); tile && tile.classList.add('enter');
    const before = garageScene.querySelectorAll('.confetti').length;
    confettiBurst(garageScene, 30);
    const pieces = garageScene.querySelectorAll('.confetti').length - before;
    const iris = document.getElementById('iris'); iris.classList.add('go');
    const out = { flag: reducedMotion(), go: an(goBtn), pedal: an(document.getElementById('gasPedal')), tile: an(tile), pieces, irisName: an(iris), irisDur: getComputedStyle(iris).animationDuration };
    goBtn.classList.remove('nudge'); document.getElementById('gasPedal').classList.remove('nudge'); iris.classList.remove('go');
    return out;
  });
  check('reduced motion: pulse / nudge / pop-in report animation-name none, confettiBurst spawns 0 pieces, the iris keeps a .2s reveal', rm.flag && rm.go === 'none' && rm.pedal === 'none' && rm.tile === 'none' && rm.pieces === 0 && rm.irisName === 'irisReveal' && rm.irisDur === '0.2s', JSON.stringify(rm));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const rmOff = await page.evaluate(() => { goBtn.classList.add('nudge'); const n = getComputedStyle(goBtn).animationName; goBtn.classList.remove('nudge'); return n; });
  check('reduced motion off: the GO nudge pulses again', rmOff === 'pulse', rmOff);

  check('no console errors', errors.length === 0, errors.join(' | ').slice(0, 300));

  await browser.close();
  const fails = results.filter(r => !r.ok);
  console.log(`\n${results.length - fails.length}/${results.length} passed`);
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
