/* paint-check: pattern paint pack — two-page swatch tray, pattern defs in both views,
   buying a pattern, save-code round trip. Honours CHROMIUM + VROOM_URL. */
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
  await page.waitForTimeout(500);

  /* ---- 1. catalog ---- */
  const cat = await page.evaluate(() => {
    const pats = Object.keys(PATTERNS);
    openTab('color', false);
    const patTiles = [...document.querySelectorAll('#strip .tile[data-color]')].filter(t => PATTERNS[t.dataset.color]);
    return {
      n: pats.length, colors: COLORS.length, inColors: pats.every(p => COLORS.includes(p)),
      inCode: pats.every(p => CODE_COLORS.includes(p)),
      prices: pats.filter(p => !PATTERNS[p].secret).map(p => PRICES.color[p]), priciest: ['p:galaxy', 'p:gold'].every(p => PRICES.color[p] >= 100),
      secret: pats.filter(p => PATTERNS[p].secret), secretLast: CODE_COLORS[CODE_COLORS.length - 1] === 'p:rainbowshine' && COLORS[COLORS.length - 1] === 'p:rainbowshine',
      swatches: document.querySelectorAll('#strip .tile[data-color]').length,
      pg1: document.querySelectorAll('#strip .tile[data-color]').length - patTiles.length, pg2: patTiles.length,
      flips: document.querySelectorAll('#paintFlip, #strip .pg2').length,
      pics: patTiles.every(s => s.querySelector('svg pattern, svg linearGradient')),
      locks: patTiles.every(s => s.querySelector('.lockDot'))
    };
  });
  check('catalog: 12 patterns registered in COLORS + CODE_COLORS (11 for sale + the secret rainbow shine, appended last)', cat.n === 12 && cat.inColors && cat.inCode && cat.colors === 24 && cat.secret.length === 1 && cat.secretLast, JSON.stringify([cat.n, cat.colors, cat.secret]));
  check('catalog: prices 40-120, galaxy + gold priciest (the secret paint is not for sale)', cat.prices.length === 11 && cat.prices.every(p => p >= 40 && p <= 120) && cat.priciest, cat.prices.join(','));
  check('strip: 23 paint tiles in one strip, no page flip (12 colors + 11 patterns; the unearned secret paint stays hidden)', cat.swatches === 23 && cat.pg1 === 12 && cat.pg2 === 11 && cat.flips === 0, JSON.stringify([cat.swatches, cat.pg1, cat.pg2]));
  check('strip: pattern tiles show a picture of the pattern', cat.pics);
  check('strip: unowned patterns carry a padlock', cat.locks);

  /* ---- 2. one strip: arrows page from the colors to the patterns and back ---- */
  const vis = () => page.evaluate(() => {
    const sr = strip.getBoundingClientRect();
    const shown = [...document.querySelectorAll('#strip .tile[data-color]')].filter(t => { const r = t.getBoundingClientRect(); return r.left >= sr.left - 1 && r.right <= sr.right + 1; });
    return {
      shown1: shown.filter(t => !PATTERNS[t.dataset.color]).length, shown2: shown.filter(t => PATTERNS[t.dataset.color]).length,
      scroll: Math.round(strip.scrollLeft), chip: (r => [r.width, r.height])(document.getElementById('stripNext').getBoundingClientRect())
    };
  });
  const v0 = await vis();
  check('arrows: strip opens on the colors (7 shown, 0 patterns)', v0.scroll === 0 && v0.shown1 === 7 && v0.shown2 === 0, JSON.stringify(v0));
  check('arrows: page arrow is a >=64px touch target', v0.chip[0] >= 63.5 && v0.chip[1] >= 63.5, v0.chip.map(n => n.toFixed(1)).join('x'));
  await tap('#stripNext'); await page.waitForTimeout(700); await tap('#stripNext'); await page.waitForTimeout(700);
  const v1 = await vis();
  check('arrows: two pages on shows the patterns (7 shown, 0 colors)', v1.shown2 === 7 && v1.shown1 === 0, JSON.stringify(v1));
  await page.screenshot({ path: SHOT + 'paint-patterns-page.png' });
  await tap('#stripPrev'); await tap('#stripPrev'); await page.waitForTimeout(900);
  const v2 = await vis();
  check('arrows: back twice returns to the colors', v2.scroll === 0 && v2.shown1 === 7, JSON.stringify(v2));

  /* ---- 3. defs in both views ---- */
  const defs = await page.evaluate(() => {
    const out = {};
    for (const p of Object.keys(PATTERNS)) {
      const st = { body: 'dump', wheels: 'normal', color: p, extras: {}, decal: 'none' };
      const side = vehicleSVG(st), rear = vehicleRearSVG(st);
      const idS = (side.match(/--paint:url\(#(\w+)\)/) || [])[1], idR = (rear.match(/--paint:url\(#(\w+)\)/) || [])[1];
      out[p] = {
        side: !!idS && new RegExp(`<(pattern|linearGradient) id="${idS}"`).test(side),
        rear: !!idR && new RegExp(`<(pattern|linearGradient) id="${idR}"[^>]*userSpaceOnUse`).test(rear),
        distinct: idS !== idR,
        tiles: rear.includes('<pattern') ? /patternUnits="userSpaceOnUse"/.test(rear) : true
      };
    }
    /* rainbow + flat still work through the shared helper */
    out.rainbow = /<linearGradient id="rg\d+"/.test(vehicleSVG({ body: 'dump', wheels: 'normal', color: 'rainbow', extras: {}, decal: 'none' }))
      && /gradientUnits="userSpaceOnUse"/.test(vehicleRearSVG({ body: 'dump', wheels: 'normal', color: 'rainbow', extras: {}, decal: 'none' }));
    out.flat = /--paint:#e53935/.test(vehicleSVG({ body: 'dump', wheels: 'normal', color: '#e53935', extras: {}, decal: 'none' }));
    return out;
  });
  const bad = Object.keys(defs).filter(k => k.startsWith('p:') && !(defs[k].side && defs[k].rear && defs[k].distinct && defs[k].tiles));
  check('render: every pattern emits a def in side + rear (userSpaceOnUse), unique ids', bad.length === 0, bad.join(','));
  check('render: rainbow + flat colors unchanged through paintDefs', defs.rainbow && defs.flat);

  /* paint actually lands on pixels: the preview car is not the flat body color */
  await page.evaluate(() => { progress.wallet = 500; progress.owned.color.push('p:checker'); state.color = 'p:checker'; renderPreview(); renderSwatchLocks(); });
  await page.waitForTimeout(300);
  const painted = await page.evaluate(() => {
    const svg = document.querySelector('#preview svg');
    const pat = svg.querySelector('pattern');
    return { hasPattern: !!pat, bodyFill: getComputedStyle(svg.querySelector('[fill="var(--paint)"]')).fill };
  });
  check('render: garage preview body resolves to the pattern url', painted.hasPattern && /url\(/.test(painted.bodyFill), painted.bodyFill);

  /* ---- 4. buying a pattern ---- */
  await page.evaluate(() => { progress.owned.color = []; progress.wallet = 100; state.color = '#fdd835'; save(); renderPreview(); renderSwatchLocks(); renderWallets(false); });
  await tapTile('.tile[data-color="p:flames"]'); await page.waitForTimeout(300);
  const tag = await page.evaluate(() => ({
    color: state.color, tag: priceTag.classList.contains('show'), afford: priceTag.classList.contains('afford'),
    text: priceTag.textContent.trim(), goLocked: goBtn.classList.contains('locked'), sel: document.querySelector('#strip .tile.sel').dataset.color
  }));
  check('shop: tapping a locked pattern equips it + shows an affordable 70-star tag', tag.color === 'p:flames' && tag.tag && tag.afford && tag.text === '70' && tag.goLocked && tag.sel === 'p:flames', JSON.stringify(tag));
  await tap('#priceTag'); await page.waitForTimeout(400);
  const bought = await page.evaluate(() => ({
    wallet: progress.wallet, owned: progress.owned.color.includes('p:flames'), tag: priceTag.classList.contains('show'),
    lock: !!document.querySelector('.tile[data-color="p:flames"] .lockDot'), goLocked: goBtn.classList.contains('locked')
  }));
  check('shop: buying spends 70, unlocks, drops the padlock + tag', bought.wallet === 30 && bought.owned && !bought.tag && !bought.lock && !bought.goLocked, JSON.stringify(bought));
  /* not enough stars: tag goes gray, nothing bought */
  await tapTile('.tile[data-color="p:gold"]'); await page.waitForTimeout(200);
  await tap('#priceTag'); await page.waitForTimeout(300);
  const deny = await page.evaluate(() => ({ wallet: progress.wallet, owned: progress.owned.color.includes('p:gold'), afford: priceTag.classList.contains('afford') }));
  check('shop: 30 stars cannot buy gold chrome (120)', deny.wallet === 30 && !deny.owned && !deny.afford, JSON.stringify(deny));
  await page.screenshot({ path: SHOT + 'paint-flames-garage.png' });

  /* ---- 5. dice may roll owned patterns only ---- */
  const dice = await page.evaluate(() => ownedList('color', COLORS));
  check('dice: owned pool holds flames, not gold', dice.includes('p:flames') && !dice.includes('p:gold'), dice.join(','));

  /* ---- 6. save code round trip ---- */
  const rt = await page.evaluate(() => {
    progress.owned.color = ['rainbow', 'p:flames', 'p:galaxy']; state.color = 'p:galaxy'; save();
    const code = packCompact();
    const out = unpackCompact(code.slice(7));
    return { code: code.slice(0, 7), owned: out && out.owned.color, color: out && out.build.color, len: code.length };
  });
  check('code: v3 compact code round-trips owned patterns + equipped galaxy', rt.code === 'VROOM1.' && JSON.stringify(rt.owned) === JSON.stringify(['rainbow', 'p:flames', 'p:galaxy']) && rt.color === 'p:galaxy', JSON.stringify(rt));
  /* a v2 code (6 color flags, no count) still decodes: hand-build one */
  const legacy = await page.evaluate(() => {
    const bits = []; const push = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >> i) & 1); };
    push(2, 8); push(77, 16); push(3, 8); push(0, 4); push(0, 1); push(0, 3); push(0, 6); push(0, 2);
    for (let i = 0; i < CODE_V2.body; i++) push(i === 0 ? 1 : 0, 1);
    for (let i = 0; i < CODE_V2.wheels; i++) push(0, 1);
    push(0, 1); push(0, 1); push(0, 1); push(0, 1); push(0, 1); push(1, 1);   /* 6 color flags: rainbow owned */
    for (let i = 0; i < CODE_V2.extras; i++) push(0, 1);
    for (let i = 0; i < CODE_V2.buddy; i++) push(0, 1);
    for (let i = 0; i < CODE_BADGES.length; i++) push(0, 1);
    while (bits.length % 8) push(0, 1);
    for (let n = 1; n <= 80; n++) { push(0, 2); push(0, 2); }   /* v1/v2 codes always carried 80 levels */
    for (let i = 0; i < CODE_V2.decals; i++) push(0, 1);
    push(0, 3); push(1, 1);
    const bytes = new Uint8Array(Math.ceil(bits.length / 8));
    bits.forEach((b, i) => { if (b) bytes[i >> 3] |= 128 >> (i & 7); });
    const out = unpackCompact(b64url.enc(bytes));
    return out && { wallet: out.wallet, body: out.owned.body, color: out.owned.color, muddy: out.muddy, build: out.build.color };
  });
  check("code: legacy v2 code still decodes (6 color flags, no count)", legacy && legacy.wallet === 77 && legacy.color.join() === "rainbow" && legacy.body.join() === "police" && legacy.muddy === true && legacy.build === "#fdd835", JSON.stringify(legacy));

  /* persistence: reload keeps the equipped pattern and opens the tray on the pattern page */
  await page.reload(); await page.waitForTimeout(600);
  const persisted = await page.evaluate(() => {
    openTab('color', false);
    const sel = document.querySelector('#strip .tile.sel'), sr = strip.getBoundingClientRect(), r = sel && sel.getBoundingClientRect();
    return {
      color: state.color, pg2: !!sel && r.left >= sr.left - 1 && r.right <= sr.right + 1,
      sel: sel && sel.dataset.color, pattern: !!document.querySelector('#preview svg pattern')
    };
  });
  check('persist: reload keeps galaxy equipped, paint strip opens scrolled to it', persisted.color === 'p:galaxy' && persisted.pg2 && persisted.sel === 'p:galaxy' && persisted.pattern, JSON.stringify(persisted));

  /* ---- 7. road car + album photo ---- */
  await page.evaluate(() => { progress.owned.body.push('race'); state.body = 'race'; save(); drive(1); });
  await page.waitForTimeout(700);
  const road = await page.evaluate(() => {
    const svg = document.querySelector('#carWrap svg');
    return { pattern: !!svg.querySelector('pattern'), fill: getComputedStyle(svg.querySelector('[fill="var(--paint)"]')).fill, active: document.getElementById('road').classList.contains('active') };
  });
  check('road: rear car carries the pattern def + url fill', road.active && road.pattern && /url\(/.test(road.fill), JSON.stringify(road));
  await page.screenshot({ path: SHOT + 'paint-galaxy-road.png', clip: { x: 250, y: 250, width: 520, height: 320 } });
  await page.evaluate(() => { showGarage(); });
  await page.waitForTimeout(300);
  const album = await page.evaluate(() => {
    progress.photos = [{ b: JSON.parse(JSON.stringify(state)), n: 1, t: 'A', s: 5 }]; save(); showAlbum();
    const car = document.querySelector('#album .photoCar svg');
    return { ok: !!car && !!car.querySelector('pattern') };
  });
  check('album: a stored photo re-renders its pattern paint', album.ok);

  check('no console errors', errors.length === 0, errors.join(' | ').slice(0, 300));

  await browser.close();
  const passed = results.filter(r => r.ok).length;
  console.log(`\n${passed}/${results.length} passed`);
  process.exit(passed === results.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
