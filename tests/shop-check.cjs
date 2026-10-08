/* shop pack: 23 bodies cycle both ways, hover (no wheels, floats), new wheels / extras / decals / the 12.5 mid-tier items /
   buddies render in both views, 1000-star hover purchase, v3 save code round trip, legacy decode. */
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
  const release = sel => page.evaluate(s => document.querySelector(s).dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 99 })), sel);
  /* tiles act on release (a swipe through the strip must scroll, not equip): down + up on the tile */
  const tapTile = sel => page.evaluate(s => {
    const t = document.querySelector(s);
    t.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 99, clientX: 300, clientY: 600 }));
    t.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 99, clientX: 300, clientY: 600 }));
  }, sel);

  await page.goto(URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(500);

  /* ---- 1. catalog ---- */
  const cat = await page.evaluate(() => ({
    bodies: BODY_ORDER.length, wheels: WHEEL_ORDER.length, decals: DECAL_ORDER.length, buddies: BUDDY_ORDER.length,
    extras: Object.keys(state.extras).length, extraBtns: (openTab('extras', false), document.querySelectorAll('#strip .tile[data-extra]').length),
    newBodies: SHOP_BODY_IDS.every(b => BODIES[b] && BODIES[b].anchors && CAR3D[b] && CAR3D[b].anchors && CAR3D[b].win && CAR3D[b].smoke && typeof HONKS[b] === 'function' && PRICES.body[b] > 0),
    hoverPrice: PRICES.body.hover, codeBodies: CODE_BODIES.length, codeWheels: CODE_WHEELS.length, codeExtras: CODE_EXTRAS.length, codeDecals: CODE_DECALS.length,
    codeTail: CODE_BODIES.slice(-8).join(','), wheelKeys: SHOP_WHEEL_IDS.every(w => WHEELS[w] && WHEEL_DECOR[w] && PRICES.wheels[w] > 0),
    decalKeys: SHOP_DECAL_IDS.every(d => DECAL_SVG[d] && PRICES.decal[d] > 0), buddyKeys: ['fox', 'bunny', 'frog', 'robot'].every(b => BUDDY_SVG[b])
  }));
  check('catalog: 23 bodies / 14 wheels / 9 decals / 10 buddies / 12 extras + tiles', cat.bodies === 23 && cat.wheels === 14 && cat.decals === 9 && cat.buddies === 10 && cat.extras === 12 && cat.extraBtns === 12, JSON.stringify(cat));
  check('catalog: every new body has side + rear entries, anchors, win/smoke, honk, price', cat.newBodies && cat.wheelKeys && cat.decalKeys && cat.buddyKeys);
  check('catalog: hover costs 1000; CODE_* lists appended (18/11/9/8), shop bodies last', cat.hoverPrice === 1000 && cat.codeBodies === 18 && cat.codeWheels === 11 && cat.codeExtras === 9 && cat.codeDecals === 8 && cat.codeTail.endsWith('unicorn,hover'), JSON.stringify([cat.codeBodies, cat.codeWheels, cat.codeExtras, cat.codeDecals, cat.codeTail]));

  /* ---- 2. body strip: 23 tiles, tapping each equips it, exactly one ring on the current body ---- */
  await page.evaluate(() => openTab('body', false));
  const seen = [];
  for (const id of ['digger', 'mixer', 'fire', 'monster', 'police', 'race', 'tractor', 'icecream', 'rocket', 'ufo', 'limo', 'dragon', 'train', 'royal', 'bulldozer', 'schoolbus', 'ambulance', 'submarine', 'pirate', 'dino', 'unicorn', 'hover', 'dump']) {
    await tapTile(`.tile[data-body="${id}"]`); seen.push(await page.evaluate(() => state.body));
  }
  const ring = await page.evaluate(() => ({ n: document.querySelectorAll('#strip .tile[data-body]').length, on: document.querySelectorAll('#strip .tile.sel').length, onId: document.querySelector('#strip .tile.sel').dataset.body }));
  check('strip: 23 body taps visit every body once and return to dump', new Set(seen).size === 23 && seen[22] === 'dump', seen.join(','));
  check('strip: 23 body tiles, exactly one ring, on the current body', ring.n === 23 && ring.on === 1 && ring.onId === 'dump', JSON.stringify(ring));

  /* ---- 3. arrows page the strip 7 tiles at a time; the wheel strip lists all 14 ---- */
  const visIdx = () => page.evaluate(() => {
    const sr = strip.getBoundingClientRect();
    return [...document.querySelectorAll('#strip .tile')].map((t, i) => [t, i]).filter(([t]) => { const r = t.getBoundingClientRect(); return r.left >= sr.left - 1 && r.right <= sr.right + 1; }).map(([, i]) => i).join(',');
  });
  const pg0 = await visIdx();
  await tap('#stripNext'); await page.waitForTimeout(700);
  const pg1 = await visIdx();
  await tap('#stripNext'); await tap('#stripNext'); await page.waitForTimeout(900);   /* third page clamps to the end (16-22) */
  const pg2 = await visIdx();
  await tap('#stripPrev'); await page.waitForTimeout(700);
  const pg3 = await visIdx();
  check('arrows: next pages 0-6 -> 7-13, twice more clamps at 16-22 (hover last), prev steps back a page', pg0 === '0,1,2,3,4,5,6' && pg1 === '7,8,9,10,11,12,13' && pg2 === '16,17,18,19,20,21,22' && pg3 === '9,10,11,12,13,14,15', [pg0, pg1, pg2, pg3].join(' > '));
  await tap('.catTab[data-cat="wheels"]'); await page.waitForTimeout(500);
  await tapTile('.tile[data-wheels="disco"]');
  const wheelBack = await page.evaluate(() => ({ w: state.wheels, tiles: document.querySelectorAll('#strip .tile[data-wheels]').length, sel: document.querySelector('#strip .tile.sel').dataset.wheels }));
  check('wheels: tapping the last wheel tile (disco) equips it, 14 tiles', wheelBack.w === 'disco' && wheelBack.tiles === 14 && wheelBack.sel === 'disco', JSON.stringify(wheelBack));
  await page.evaluate(() => { state.wheels = 'normal'; save(); renderPreview(); });

  /* ---- 4. hover: no wheels in either view, floats, bobs ---- */
  await page.evaluate(() => { state.body = 'hover'; state.wheels = 'normal'; renderPreview(); });
  await page.waitForTimeout(100);
  const hov = await page.evaluate(() => {
    const side = preview.innerHTML, rear = vehicleRearSVG(state);
    const dumpSide = vehicleSVG({ ...state, body: 'dump' });
    return {
      sideWheels: (side.match(/class="wheelrot"/g) || []).length, dumpWheels: (dumpSide.match(/class="wheelrot"/g) || []).length,
      rearTires: (rear.match(/treadRoll/g) || []).length, dumpTires: (vehicleRearSVG({ ...state, body: 'dump' }).match(/treadRoll/g) || []).length,
      lift: /translate\(0,-20\)/.test(side), bobSide: /class="hoverBob"/.test(side), bobRear: /class="hoverBob"/.test(rear),
      glow: /hoverGlow/.test(side) && /hoverGlow/.test(rear), trail: /hoverTrail/.test(side) && /hoverTrail/.test(rear),
      bottom: (() => { const r = preview.querySelector('svg').getBoundingClientRect(); const b = [...preview.querySelectorAll('path, ellipse')].reduce((m, e) => Math.max(m, e.getBoundingClientRect().bottom), 0); return (r.bottom - b) / r.height * 230; })()
    };
  });
  check('hover: no wheels side (0 vs 2) or rear (0 vs 2 tread sets)', hov.sideWheels === 0 && hov.dumpWheels === 2 && hov.rearTires === 0 && hov.dumpTires === 2, JSON.stringify(hov));
  check('hover: floats 20px, bobs in both views, glow ring + light trail present', hov.lift && hov.bobSide && hov.bobRear && hov.glow && hov.trail && hov.bottom > 40, JSON.stringify(hov));
  await page.screenshot({ path: SHOT + 'shop-hover-garage.png' });

  /* ---- 5. every new body renders in both views with every extra, a buddy and a decal, no errors ---- */
  const errBefore = errors.length;
  const renders = await page.evaluate(() => {
    progress.owned.buddy = BUDDY_ORDER.slice();
    const bad = [];
    const extras = Object.fromEntries(Object.keys(state.extras).map(e => [e, true]));
    for (const body of SHOP_BODY_IDS) for (const [wheels, buddy, decal] of [['normal', 'fox', 'rainbow'], ['crystal', 'robot', 'dinofoot'], ['monster', null, 'flower']]) {
      const st = { body, wheels, color: '#e63946', extras, buddy, decal };
      try {
        const s = vehicleSVG(st), r = vehicleRearSVG(st);
        const d = document.createElement('div'); d.innerHTML = s + r;
        if (d.querySelectorAll('svg').length !== 2 || !/data-decal/.test(s) || !/data-decal/.test(r)) bad.push(body + ':' + wheels);
        if (buddy && (!s.includes(BUDDY_SVG[buddy].slice(0, 30)) || !r.includes(BUDDY_SVG[buddy].slice(0, 30)))) bad.push(body + ' buddy');
        for (const [k, sig] of [['spoiler', 'brightness(.8)"/></g>'], ['antenna', 'antennaSway'], ['surf', 'M-50 -36'], ['bubbles', 'bubbleDrift']]) if (!s.includes(sig) || !r.includes(k === 'surf' ? 'M-6 -30' : k === 'spoiler' ? 'brightness(.8)' : sig)) bad.push(body + ' ' + k);
      } catch (e) { bad.push(body + ' ' + e.message); }
    }
    progress.owned.buddy = [];
    return bad;
  });
  check('render: 8 new bodies x 3 loadouts, all extras + buddy + decal, both views', renders.length === 0 && errors.length === errBefore, renders.join(' | ').slice(0, 300));

  /* ---- 6. new wheels / decals / buddies render ---- */
  const parts = await page.evaluate(() => {
    const bad = [];
    for (const w of SHOP_WHEEL_IDS) {
      const s = vehicleSVG({ ...state, body: 'dump', wheels: w, extras: {} }), r = vehicleRearSVG({ ...state, body: 'dump', wheels: w, extras: {} });
      if ((s.match(/class="wheelrot"/g) || []).length !== 2 || !s.includes(WHEELS[w].hub)) bad.push('side ' + w);
      const accent = { donut: '#ff70a6', cookie: '#5a3a22', lava: 'lavaGlow', bubble: 'opacity=".35"', crystal: '#9d4edd', disco: 'discoGlint' }[w];
      if (!r.includes(accent)) bad.push('rear ' + w);
    }
    for (const d of SHOP_DECAL_IDS) {
      const s = vehicleSVG({ ...state, body: 'fire', wheels: 'normal', extras: {}, decal: d });
      const cls = { rainbow: 'decalShimmer', dinofoot: 'decalStomp', flower: 'decalSpin' }[d];
      if (!s.includes(cls) || !vehicleRearSVG({ ...state, body: 'fire', wheels: 'normal', extras: {}, decal: d }).includes(cls)) bad.push('decal ' + d);
    }
    return bad;
  });
  check('render: 6 new wheels (side decor + rear accent) and 3 living decals in both views', parts.length === 0, parts.join(','));

  /* ---- 6b. mid-tier (12.5): jetpack / trophy rack / disco on four bodies in both views, stacking rules ---- */
  const mid = await page.evaluate(() => {
    const bad = [];
    const keep = JSON.stringify(progress.levels), keepBuddy = progress.owned.buddy.slice();
    progress.levels = { 1: { best: 5, rating: 3, tier: 'S' }, 2: { best: 5, rating: 2, tier: 'A' }, 3: { best: 5, rating: 2, tier: 'B' }, 4: { best: 5, rating: 1, tier: 'C' }, 5: { best: 5, rating: 3, tier: 'S' }, 6: { best: 5, rating: 3, tier: 'A' } };
    const cups = trophyCups().join('');
    progress.owned.buddy = ['pup'];
    for (const body of ['dump', 'race', 'hover', 'bulldozer']) for (const buddy of [null, 'pup']) {
      const st = { ...state, body, wheels: 'disco', extras: { ...state.extras, jetpack: true, trophyrack: true, partyhat: true, surf: true }, buddy, decal: 'none', number: '' };
      try {
        for (const [v, svg] of [['side', vehicleSVG(st)], ['rear', vehicleRearSVG(st)]]) {
          const tag = body + '/' + v + (buddy ? '+buddy' : '');
          if ((svg.match(/class="jetPuff"/g) || []).length !== 4) bad.push(tag + ' jetpack');
          if ((svg.match(/class="trophyCup"/g) || []).length !== 5 || !svg.includes('data-tier="S"')) bad.push(tag + ' cups');
          if (!svg.includes(`translate(0,${-SURF_LIFT})`) && v === 'rear') bad.push(tag + ' rack not lifted over the surf board');
          const hatOnTanks = v === 'side' ? `translate(${BODIES[body].anchors.hat[0]},${BODIES[body].anchors.hat[1] - JET_H}) rotate(-12)` : `translate(0,${-JET_H})`;
          if (!buddy && !svg.includes(hatOnTanks)) bad.push(tag + ' hat not on the tanks');
          if (!BODIES[body].noWheels && !svg.includes('discoGlint')) bad.push(tag + ' disco');
        }
      } catch (e) { bad.push(body + ' threw ' + e.message); }
    }
    /* the side view: the jetpack straps onto the buddy (drawn in its frame) instead of the hat anchor */
    const withBuddy = vehicleSVG({ ...state, body: 'dump', wheels: 'normal', extras: { jetpack: true }, buddy: 'pup', decal: 'none', number: '' });
    const noBuddy = vehicleSVG({ ...state, body: 'dump', wheels: 'normal', extras: { jetpack: true }, buddy: null, decal: 'none', number: '' });
    const A = BODIES.dump.anchors;
    const onBuddy = withBuddy.includes(`translate(${A.buddy[0]},${A.buddy[1]}) scale(1) translate(-32,-6) translate(32,6)`), onHat = noBuddy.includes(`translate(${A.hat[0]},${A.hat[1]})`);
    progress.levels = JSON.parse(keep); progress.owned.buddy = keepBuddy;
    return { bad, cups, onBuddy, onHat };
  });
  check('mid-tier: jetpack + trophy rack (5 best medals, S first) + disco render on dump / race / hover / bulldozer in both views; hat on the tanks, rack over the surf board, pack rides the buddy', mid.bad.length === 0 && mid.cups === 'SSAAB' && mid.onBuddy && mid.onHat, JSON.stringify(mid).slice(0, 300));
  await tap('#albumBtn'); await page.waitForTimeout(500);
  const album = await page.evaluate(() => ({ slots: document.querySelectorAll('.buddySlot').length, sil: document.querySelectorAll('.buddySlot svg.sil').length,
    w: Math.min(...[...document.querySelectorAll('.buddySlot')].map(b => b.getBoundingClientRect().width)), fits: document.getElementById('buddyRow').getBoundingClientRect().width <= document.getElementById('stage').getBoundingClientRect().width }));
  check('album: 10 buddy slots (fox/bunny/frog/robot as silhouettes), >= 64px, row fits the stage', album.slots === 10 && album.sil === 10 && album.w >= 63.5 && album.fits, JSON.stringify(album));
  await page.screenshot({ path: SHOT + 'shop-album.png' });
  await tap('#albumHomeBtn'); await page.waitForTimeout(400);

  /* ---- 7. extras strip: 12 tiles, 7 per page, the arrow shows the rest, every target >= 64px ---- */
  await tap('.catTab[data-cat="extras"]'); await page.waitForTimeout(1100);   /* let the entrance pop-ins settle before measuring */
  const tray = await page.evaluate(() => {
    const sr = strip.getBoundingClientRect();
    const shown = () => [...document.querySelectorAll('#strip .tile[data-extra]')].filter(t => { const r = t.getBoundingClientRect(); return r.left >= sr.left - 1 && r.right <= sr.right + 1; }).map(t => t.dataset.extra);
    return { n: document.querySelectorAll('#strip .tile[data-extra]').length, shown: shown(), arrow: stripNext.getBoundingClientRect().width > 0 && !stripNext.classList.contains('off'),
      tiny: [...document.querySelectorAll('#controls button')].filter(b => { const q = b.getBoundingClientRect(); return q.width > 0 && (q.width < 63.5 || q.height < 63.5); }).map(b => b.id || b.className) };
  });
  await tap('#stripNext'); await page.waitForTimeout(700);
  const tray2 = await page.evaluate(() => {
    const sr = strip.getBoundingClientRect();
    return { shown: [...document.querySelectorAll('#strip .tile[data-extra]')].filter(t => { const r = t.getBoundingClientRect(); return r.left >= sr.left - 1 && r.right <= sr.right + 1; }).map(t => t.dataset.extra) };
  });
  const last3 = Object.keys(await page.evaluate(() => state.extras)).slice(-3);
  check('extras strip: 12 tiles, first 7 shown + arrow, the arrow shows the last 3, no tiny targets', tray.n === 12 && tray.shown.length === 7 && tray.arrow && tray.tiny.length === 0 && tray2.shown.length === 7 && last3.every(k => tray2.shown.includes(k)), JSON.stringify([tray, tray2]));
  await tap('#stripPrev'); await page.waitForTimeout(300);

  /* ---- 8. shop: hover at 999 denies, 1000 buys + equips; new extra toggles and prices ---- */
  await page.evaluate(() => { progress.wallet = 999; state.body = 'hover'; state.wheels = 'normal'; state.extras = Object.fromEntries(Object.keys(state.extras).map(k => [k, false])); save(); renderPreview(); renderWallets(false); });
  const tag = await page.evaluate(() => ({ text: priceTag.textContent.trim(), afford: priceTag.classList.contains('afford'), lock: previewLock.classList.contains('show'), go: goBtn.classList.contains('locked') }));
  await tap('#priceTag'); await page.waitForTimeout(300);
  const deny = await page.evaluate(() => ({ wallet: progress.wallet, owned: progress.owned.body.includes('hover'), go: goBtn.classList.contains('locked') }));
  check('shop: hover shows a 1000 tag, 999 stars cannot buy it', tag.text === '1000' && !tag.afford && tag.lock && tag.go && deny.wallet === 999 && !deny.owned && deny.go, JSON.stringify([tag, deny]));
  await page.evaluate(() => { progress.wallet = 1000; renderWallets(false); renderShop(); });
  await tap('#priceTag'); await page.waitForTimeout(400);
  const buy = await page.evaluate(() => ({ wallet: progress.wallet, owned: progress.owned.body.includes('hover'), body: state.body, go: goBtn.classList.contains('locked'), tag: priceTag.classList.contains('show') }));
  check('shop: 1000 stars buys hover (wallet 0), stays equipped, GO unlocks', buy.wallet === 0 && buy.owned && buy.body === 'hover' && !buy.go && !buy.tag, JSON.stringify(buy));
  await tapTile('.tile[data-extra="spoiler"]'); await page.waitForTimeout(200);
  const ex = await page.evaluate(() => ({ on: state.extras.spoiler, btn: document.querySelector('.tile[data-extra="spoiler"]').classList.contains('on'), tag: priceTag.textContent.trim(), locked: lockedParts().map(p => p[1]).join(',') }));
  check('shop: spoiler toggles on, prices as a locked 30-star extra', ex.on && ex.btn && ex.tag === '30' && ex.locked === 'spoiler', JSON.stringify(ex));

  /* ---- 8b. mid-tier prices: 180 / 220 / 260 sit between the everyday parts and the 400 number; buying deducts ---- */
  await page.evaluate(() => { state.extras.spoiler = false; progress.wallet = 659; save(); renderPreview(); renderWallets(false); });
  await tapTile('.tile[data-extra="jetpack"]'); await tapTile('.tile[data-extra="trophyrack"]');
  await tap('.catTab[data-cat="wheels"]'); await page.waitForTimeout(400);
  await tapTile('.tile[data-wheels="disco"]');
  const midTag = await page.evaluate(() => ({ tag: priceTag.textContent.trim(), afford: priceTag.classList.contains('afford'), locked: lockedParts().map(p => p[1]).sort().join(','),
    prices: [PRICES.extras.jetpack, PRICES.wheels.disco, PRICES.extras.trophyrack].join('/'), wallet: progress.wallet }));
  await tap('#priceTag'); await page.waitForTimeout(300);   /* 659 < 660: nothing happens */
  const midDeny = await page.evaluate(() => ({ wallet: progress.wallet, owned: progress.owned.extras.includes('jetpack') || progress.owned.wheels.includes('disco') }));
  await page.evaluate(() => { progress.wallet = 700; renderWallets(false); renderShop(); });
  await tap('#priceTag'); await page.waitForTimeout(300);
  const midBuy = await page.evaluate(() => ({ wallet: progress.wallet, owned: ['jetpack', 'trophyrack'].every(k => progress.owned.extras.includes(k)) && progress.owned.wheels.includes('disco'),
    on: state.extras.jetpack && state.extras.trophyrack && state.wheels === 'disco', tag: priceTag.classList.contains('show') }));
  check('mid-tier: jetpack 180 + disco 220 + trophy rack 260 tag as 660; 659 stars are denied, 700 buys all three (wallet 40), all stay equipped', midTag.prices === '180/220/260' && midTag.tag === '660' && !midTag.afford && midTag.locked === 'disco,jetpack,trophyrack' && midDeny.wallet === 659 && !midDeny.owned && midBuy.wallet === 40 && midBuy.owned && midBuy.on && !midBuy.tag, JSON.stringify([midTag, midDeny, midBuy]));
  await page.evaluate(() => { state.wheels = 'normal'; state.extras.jetpack = false; state.extras.trophyrack = false; state.extras.spoiler = true; save(); renderPreview(); });   /* back to the step-8 build */
  await tap('.catTab[data-cat="extras"]'); await page.waitForTimeout(400);
  await page.evaluate(() => { progress.wallet = 500; renderWallets(false); renderShop(); });
  await tap('#priceTag'); await page.waitForTimeout(300);

  /* ---- 9. v3 save code round trip with a hover build + new wheel + extras + buddy ---- */
  const rt = await page.evaluate(() => {
    progress.owned.wheels.push('crystal'); progress.owned.extras.push('bubbles'); progress.owned.buddy = ['frog']; progress.owned.decal.push('flower');
    state.wheels = 'crystal'; state.extras.bubbles = true; state.extras.antenna = false; state.extras.jetpack = true; state.buddy = 'frog'; state.decal = 'flower'; save();
    const code = packCompact();
    const out = unpackCompact(code.slice(7));
    return { prefix: code.slice(0, 7), body: out.build.body, wheels: out.build.wheels, buddy: out.build.buddy, decal: out.build.decal,
      extras: Object.keys(out.build.extras).filter(k => out.build.extras[k]).join(','), ownBody: out.owned.body.includes('hover'), ownWheel: out.owned.wheels.includes('crystal'), ownDisco: out.owned.wheels.includes('disco'),
      ownExtras: out.owned.extras.join(','), ownBuddy: out.owned.buddy.join(','), ownDecal: out.owned.decal.includes('flower'),
      bytes: Math.floor((code.length - 'VROOM1.'.length) * 6 / 8), chars: code.length - 'VROOM1.'.length, url: (SAVE_URL_PREFIX + code).length };
  });
  check('code v3: hover + crystal + spoiler/bubbles/jetpack + frog + flower round-trip (disco + trophy rack owned), 94 bytes', rt.prefix === 'VROOM1.' && rt.body === 'hover' && rt.wheels === 'crystal' && rt.buddy === 'frog' && rt.decal === 'flower' && rt.extras === 'spoiler,bubbles,jetpack' && rt.ownBody && rt.ownWheel && rt.ownDisco && rt.ownExtras === 'spoiler,bubbles,jetpack,trophyrack' && rt.ownBuddy === 'frog' && rt.ownDecal && rt.bytes === 94, JSON.stringify(rt));
  /* reload applies it: the equipped hover build survives through loadState's catalog validation */
  await page.reload(); await page.waitForTimeout(500);
  const persisted = await page.evaluate(() => ({ body: state.body, wheels: state.wheels, buddy: state.buddy, decal: state.decal, bubbles: state.extras.bubbles, spoiler: state.extras.spoiler }));
  check('persist: hover build with new wheel/extras/buddy/decal survives reload', persisted.body === 'hover' && persisted.wheels === 'crystal' && persisted.buddy === 'frog' && persisted.decal === 'flower' && persisted.bubbles && persisted.spoiler, JSON.stringify(persisted));

  /* ---- 10. legacy v2 code (pre-pack layout) still decodes ---- */
  const legacy = await page.evaluate(() => {
    /* hand-pack a v2 code exactly as the old game did: 10 bodies, 5 wheels, 6 colors, 3 extras, 6 buddies, 6 badges, 80 levels, 5 decals */
    const bits = [];
    const push = (v, n) => { for (let i = n - 1; i >= 0; i--) bits.push((v >> i) & 1); };
    push(2, 8); push(321, 16); push(12, 8); push(0, 4); push(0, 1); push(2, 3); push(1, 2); push(0, 2); push(0, 2); push(0, 2);
    [1, 0, 0, 0, 0, 1, 0, 0, 0, 0].forEach(b => push(b, 1));       /* police + ufo */
    [0, 0, 1, 0, 0].forEach(b => push(b, 1));                      /* tank */
    [0, 0, 0, 0, 0, 1].forEach(b => push(b, 1));                   /* rainbow */
    [1, 0, 0].forEach(b => push(b, 1));                            /* wings */
    [0, 1, 0, 0, 0, 0].forEach(b => push(b, 1));                   /* kitty */
    [1, 1, 0, 0, 0, 0].forEach(b => push(b, 1));
    while (bits.length % 8) push(0, 1);
    for (let n = 1; n <= 80; n++) { push(n <= 12 ? 3 : 0, 2); push(n <= 12 ? 2 : 0, 2); }
    [1, 0, 0, 0, 0].forEach(b => push(b, 1)); push(1, 3); push(1, 1);
    const bytes = new Uint8Array(Math.ceil(bits.length / 8)); bits.forEach((b, i) => { if (b) bytes[i >> 3] |= 128 >> (i & 7); });
    const out = unpackCompact(b64url.enc(bytes));
    return out && { wallet: out.wallet, bodies: out.owned.body.join(','), wheels: out.owned.wheels.join(','), colors: out.owned.color.join(','), extras: out.owned.extras.join(','), buddy: out.build.buddy, decal: out.build.decal, muddy: out.muddy, lv: Object.keys(out.levels).length };
  });
  check('code v2 legacy: decodes with the old fixed-width lists, untouched by the longer catalog', legacy && legacy.wallet === 321 && legacy.bodies === 'police,ufo' && legacy.wheels === 'tank' && legacy.colors === 'rainbow' && legacy.extras === 'wings' && legacy.buddy === 'kitty' && legacy.decal === 'flame' && legacy.muddy && legacy.lv === 12, JSON.stringify(legacy));

  /* ---- 11. honks: every new body has a voice that plays without throwing ---- */
  const honks = await page.evaluate(() => { const bad = []; for (const b of SHOP_BODY_IDS) { try { HONKS[b](); } catch (e) { bad.push(b); } } return bad; });
  check('honks: 8 new voices play', honks.length === 0, honks.join(','));

  check('no console errors', errors.length === 0, errors.join(' | ').slice(0, 300));

  await browser.close();
  const fails = results.filter(r => !r.ok);
  console.log(`\n${results.length - fails.length}/${results.length} passed`);
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
