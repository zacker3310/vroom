/* shop pack: 23 bodies cycle both ways, hover (no wheels, floats), new wheels / extras / decals /
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

  await page.goto(URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(500);

  /* ---- 1. catalog ---- */
  const cat = await page.evaluate(() => ({
    bodies: BODY_ORDER.length, wheels: WHEEL_ORDER.length, decals: DECAL_ORDER.length, buddies: BUDDY_ORDER.length,
    extras: Object.keys(state.extras).length, extraBtns: document.querySelectorAll('.extraBtn').length,
    newBodies: SHOP_BODY_IDS.every(b => BODIES[b] && BODIES[b].anchors && CAR3D[b] && CAR3D[b].anchors && CAR3D[b].win && CAR3D[b].smoke && typeof HONKS[b] === 'function' && PRICES.body[b] > 0),
    hoverPrice: PRICES.body.hover, codeBodies: CODE_BODIES.length, codeWheels: CODE_WHEELS.length, codeExtras: CODE_EXTRAS.length, codeDecals: CODE_DECALS.length,
    codeTail: CODE_BODIES.slice(-8).join(','), wheelKeys: SHOP_WHEEL_IDS.every(w => WHEELS[w] && WHEEL_DECOR[w] && PRICES.wheels[w] > 0),
    decalKeys: SHOP_DECAL_IDS.every(d => DECAL_SVG[d] && PRICES.decal[d] > 0), buddyKeys: ['fox', 'bunny', 'frog', 'robot'].every(b => BUDDY_SVG[b])
  }));
  check('catalog: 23 bodies / 13 wheels / 9 decals / 10 buddies / 10 extras + buttons', cat.bodies === 23 && cat.wheels === 13 && cat.decals === 9 && cat.buddies === 10 && cat.extras === 10 && cat.extraBtns === 10, JSON.stringify(cat));
  check('catalog: every new body has side + rear entries, anchors, win/smoke, honk, price', cat.newBodies && cat.wheelKeys && cat.decalKeys && cat.buddyKeys);
  check('catalog: hover costs 1000; CODE_* lists appended (18/10/7/8), shop bodies last', cat.hoverPrice === 1000 && cat.codeBodies === 18 && cat.codeWheels === 10 && cat.codeExtras === 7 && cat.codeDecals === 8 && cat.codeTail.endsWith('unicorn,hover'), JSON.stringify([cat.codeBodies, cat.codeWheels, cat.codeExtras, cat.codeDecals, cat.codeTail]));

  /* ---- 2. forward cycling walks all 23 and wraps; dots follow ---- */
  const seen = [];
  for (let i = 0; i < 23; i++) { await tap('#bodyBtn'); await release('#bodyBtn'); seen.push(await page.evaluate(() => state.body)); }
  const dots = await page.evaluate(() => ({ n: document.querySelectorAll('#cycleDots i').length, on: document.querySelectorAll('#cycleDots i.on').length, shown: cycleDots.classList.contains('show'), onIdx: [...document.querySelectorAll('#cycleDots i')].findIndex(d => d.classList.contains('on')) }));
  check('cycle: 23 taps visit every body once and return to dump', new Set(seen).size === 23 && seen[22] === 'dump', seen.join(','));
  check('dots: 23 dots, exactly one lit, matching the current body', dots.n === 23 && dots.on === 1 && dots.shown && dots.onIdx === 0, JSON.stringify(dots));

  /* ---- 3. long press steps backward (tap's forward step undone), repeats while held ---- */
  await tap('#bodyBtn');                      /* -> digger immediately */
  const mid = await page.evaluate(() => state.body);
  await page.waitForTimeout(750);             /* 600 ms hold: back 2 -> hover (wraps) */
  const held = await page.evaluate(() => state.body);
  await page.waitForTimeout(500);             /* one repeat tick -> unicorn */
  const held2 = await page.evaluate(() => state.body);
  await release('#bodyBtn');
  await page.waitForTimeout(600);
  const after = await page.evaluate(() => state.body);
  check('long-press: tap goes forward, hold 600ms lands one back (wraps to hover), repeats, stops on release', mid === 'digger' && held === 'hover' && held2 === 'unicorn' && after === 'unicorn', [mid, held, held2, after].join(' > '));
  await tap('#wheelBtn'); await page.waitForTimeout(750); await release('#wheelBtn');
  const wheelBack = await page.evaluate(() => ({ w: state.wheels, dots: document.querySelectorAll('#cycleDots i').length }));
  check('long-press: wheel button steps back to the last wheel (crystal), 13 dots', wheelBack.w === 'crystal' && wheelBack.dots === 13, JSON.stringify(wheelBack));

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
      const accent = { donut: '#ff70a6', cookie: '#5a3a22', lava: 'lavaGlow', bubble: 'opacity=".35"', crystal: '#9d4edd' }[w];
      if (!r.includes(accent)) bad.push('rear ' + w);
    }
    for (const d of SHOP_DECAL_IDS) {
      const s = vehicleSVG({ ...state, body: 'fire', wheels: 'normal', extras: {}, decal: d });
      const cls = { rainbow: 'decalShimmer', dinofoot: 'decalStomp', flower: 'decalSpin' }[d];
      if (!s.includes(cls) || !vehicleRearSVG({ ...state, body: 'fire', wheels: 'normal', extras: {}, decal: d }).includes(cls)) bad.push('decal ' + d);
    }
    return bad;
  });
  check('render: 5 new wheels (side decor + rear accent) and 3 living decals in both views', parts.length === 0, parts.join(','));
  await tap('#albumBtn'); await page.waitForTimeout(500);
  const album = await page.evaluate(() => ({ slots: document.querySelectorAll('.buddySlot').length, sil: document.querySelectorAll('.buddySlot svg.sil').length,
    w: Math.min(...[...document.querySelectorAll('.buddySlot')].map(b => b.getBoundingClientRect().width)), fits: document.getElementById('buddyRow').getBoundingClientRect().width <= document.getElementById('stage').getBoundingClientRect().width }));
  check('album: 10 buddy slots (fox/bunny/frog/robot as silhouettes), >= 64px, row fits the stage', album.slots === 10 && album.sil === 10 && album.w >= 63.5 && album.fits, JSON.stringify(album));
  await page.screenshot({ path: SHOT + 'shop-album.png' });
  await tap('#albumHomeBtn'); await page.waitForTimeout(400);

  /* ---- 7. extras tray: 3x3 grid, two pages, flip chip, every target >= 64px ---- */
  await page.waitForTimeout(1100);   /* let the entrance pop-ins settle before measuring */
  const tray = await page.evaluate(() => {
    const vis = sel => [...document.querySelectorAll(sel)].filter(b => b.getBoundingClientRect().width > 0).length;
    const r = document.getElementById('extras').getBoundingClientRect();
    return { pg1: vis('.extraBtn[data-pg="1"]'), pg2: vis('.extraBtn[data-pg="2"]'), flip: vis('#extrasFlip'), rows: Math.round(r.height / (r.width / 3)), tiny: [...document.querySelectorAll('#controls button')].filter(b => { const q = b.getBoundingClientRect(); return q.width > 0 && (q.width < 63.5 || q.height < 63.5); }).map(b => (b.id || b.className) + ' ' + b.getBoundingClientRect().width.toFixed(0) + 'x' + b.getBoundingClientRect().height.toFixed(0)) };
  });
  await tap('#extrasFlip'); await page.waitForTimeout(300);
  const tray2 = await page.evaluate(() => { const vis = sel => [...document.querySelectorAll(sel)].filter(b => b.getBoundingClientRect().width > 0).length; return { pg1: vis('.extraBtn[data-pg="1"]'), pg2: vis('.extraBtn[data-pg="2"]'), pg2on: document.getElementById('extras').classList.contains('pg2') }; });
  check('extras tray: page 1 shows 8 + flip (3 rows), flip shows the other 2, no tiny targets', tray.pg1 === 8 && tray.pg2 === 0 && tray.flip === 1 && tray.rows === 3 && tray.tiny.length === 0 && tray2.pg1 === 0 && tray2.pg2 === 2 && tray2.pg2on, JSON.stringify([tray, tray2]));
  await tap('#extrasFlip'); await page.waitForTimeout(200);

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
  await tap('.extraBtn[data-extra="spoiler"]'); await page.waitForTimeout(200);
  const ex = await page.evaluate(() => ({ on: state.extras.spoiler, btn: document.querySelector('.extraBtn[data-extra="spoiler"]').classList.contains('on'), tag: priceTag.textContent.trim(), locked: lockedParts().map(p => p[1]).join(',') }));
  check('shop: spoiler toggles on, prices as a locked 30-star extra', ex.on && ex.btn && ex.tag === '30' && ex.locked === 'spoiler', JSON.stringify(ex));
  await page.evaluate(() => { progress.wallet = 500; renderWallets(false); renderShop(); });
  await tap('#priceTag'); await page.waitForTimeout(300);

  /* ---- 9. v3 save code round trip with a hover build + new wheel + extras + buddy ---- */
  const rt = await page.evaluate(() => {
    progress.owned.wheels.push('crystal'); progress.owned.extras.push('bubbles'); progress.owned.buddy = ['frog']; progress.owned.decal.push('flower');
    state.wheels = 'crystal'; state.extras.bubbles = true; state.extras.antenna = false; state.buddy = 'frog'; state.decal = 'flower'; save();
    const code = packCompact();
    const out = unpackCompact(code.slice(7));
    return { prefix: code.slice(0, 7), body: out.build.body, wheels: out.build.wheels, buddy: out.build.buddy, decal: out.build.decal,
      extras: Object.keys(out.build.extras).filter(k => out.build.extras[k]).join(','), ownBody: out.owned.body.includes('hover'), ownWheel: out.owned.wheels.includes('crystal'),
      ownExtras: out.owned.extras.join(','), ownBuddy: out.owned.buddy.join(','), ownDecal: out.owned.decal.includes('flower') };
  });
  check('code v3: hover + crystal + spoiler/bubbles + frog + flower round-trip', rt.prefix === 'VROOM1.' && rt.body === 'hover' && rt.wheels === 'crystal' && rt.buddy === 'frog' && rt.decal === 'flower' && rt.extras === 'spoiler,bubbles' && rt.ownBody && rt.ownWheel && rt.ownExtras === 'spoiler,bubbles' && rt.ownBuddy === 'frog' && rt.ownDecal, JSON.stringify(rt));
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
