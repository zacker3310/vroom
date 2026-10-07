/* number-check: the race number (v12.3). A keypad types up to two digits onto a white roundel at the body's
   decal anchor in both views; a sticker on the same panel slides aside. Setting or changing costs 400 stars,
   taking it off is free. The number rides in the build, photos, and the v3 save-code tail. */
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
  const key = k => page.evaluate(k => document.querySelector(`#numKeys [data-key="${k}"]`).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })), k);
  const ok = () => page.evaluate(() => numOk.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));

  await page.goto(URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(300);

  /* ---- 1. the sticker tab leads with the number tile; no number on a fresh truck ---- */
  const tile = await page.evaluate(() => {
    openTab('decal', false);
    const t = document.querySelector('#strip .tile[data-act="number"]');
    return { first: document.querySelector('#strip .tile') === t, price: t.textContent.trim(), cant: t.classList.contains('cant'),
      none: state.number === '' && !preview.querySelector('[data-number]'), tiles: document.querySelectorAll('#strip .tile').length };
  });
  check('tile: race-number tile leads the sticker tab, priced 400, greyed on a poor wallet, no roundel yet', tile.first && tile.price === '400' && tile.cant && tile.none && tile.tiles === 10, JSON.stringify(tile));

  /* ---- 2. keypad: digits, two max, leading zeros trimmed, backspace, clear ---- */
  await page.evaluate(() => { progress.wallet = 1000; renderWallets(false); syncStrip(); openNumpad(); });
  await key('0'); await key('0'); await key('7');
  const t1 = await page.evaluate(() => numTyped);
  await key('7'); await key('7');
  const t2 = await page.evaluate(() => ({ typed: numTyped, preview: numPreview.textContent.trim(), price: numOk.textContent.trim(), afford: numOk.classList.contains('afford') }));
  await key('back');
  const t3 = await page.evaluate(() => numTyped);
  await key('clear');
  const t4 = await page.evaluate(() => ({ typed: numTyped, free: numOk.classList.contains('free'), price: numOk.textContent.trim() }));
  check('keypad: 0 0 7 -> "7", third digit ignored (77), backspace -> 7, clear -> empty (free OK, no price)', t1 === '7' && t2.typed === '77' && t2.preview === '77' && t2.price === '400' && t2.afford && t3 === '7' && t4.typed === '' && t4.free && t4.price === '', JSON.stringify([t1, t2, t3, t4]));
  await key('2'); await key('7');
  await page.screenshot({ path: SHOT + 'num-keypad.png' });

  /* ---- 3. OK pays 400 and puts the roundel on the truck; keypad closes ---- */
  await ok();
  await page.waitForTimeout(200);
  const set = await page.evaluate(() => ({
    number: state.number, wallet: progress.wallet, closed: !numOverlay.classList.contains('show'),
    side: preview.querySelector('[data-number="27"] text') && preview.querySelector('[data-number="27"] text').textContent,
    tile: document.querySelector('#strip .tile[data-act="number"]').textContent.trim()
  }));
  check('buy: OK pays 400, "27" on the flank, tile shows the number + price', set.number === '27' && set.wallet === 600 && set.closed && set.side === '27' && set.tile.startsWith('27'), JSON.stringify(set));
  await page.screenshot({ path: SHOT + 'num-garage.png' });

  /* ---- 4. a sticker shares the panel: both present, pushed apart, scaled down ---- */
  const share = await page.evaluate(() => {
    progress.owned.decal.push('flame'); state.decal = 'flame'; save(); renderPreview();
    const tf = g => g.getAttribute('transform');
    const d = preview.querySelector('[data-decal]'), n = preview.querySelector('[data-number]');
    const x = g => parseFloat(tf(g).match(/translate\(([-\d.]+)/)[1]), k = g => parseFloat(tf(g).match(/scale\(([-\d.]+)/)[1]);
    const anchor = BODIES[state.body].anchors.decal;
    const y = g => parseFloat(tf(g).match(/translate\([-\d.]+,([-\d.]+)/)[1]);
    return { dx: x(d) - x(n), dy: y(d) - y(n), kd: k(d), kn: k(n), base: anchor[2] ?? 1, numAtAnchor: x(n) === anchor[0] };
  });
  check('layout: number owns the panel centre at numK; the sticker shrinks to 55% and perches on its upper-front shoulder', share.numAtAnchor && Math.abs(share.kn - Math.max(0.62, Math.min(0.95, share.base * 1.3))) < 1e-6 && share.dx > 0 && share.dy < 0 && Math.abs(share.kd - share.base * 0.55) < 1e-6, JSON.stringify(share));

  /* ---- 4b. the race car has a painted number slot: the typed number replaces its stock 1 there, sticker stays put ---- */
  const race = await page.evaluate(() => {
    const stock = vehicleSVG({ body: 'race', wheels: 'normal', color: '#fdd835', extras: {}, decal: 'flame', number: '' });
    const typed = vehicleSVG({ body: 'race', wheels: 'normal', color: '#fdd835', extras: {}, decal: 'flame', number: '27' });
    const slot = BODIES.race.anchors.number, dec = BODIES.race.anchors.decal;
    const m = typed.match(/data-number="27" transform="translate\(([-\d.]+),([-\d.]+)\) scale\(([-\d.]+)\)/);
    const d = typed.match(/data-decal="flame" transform="translate\(([-\d.]+),([-\d.]+)\) scale\(([-\d.]+)\)/);
    return { stockHasOne: stock.includes('M217 130 L224 126'), typedHasOne: typed.includes('M217 130 L224 126'),
      atSlot: m && +m[1] === slot[0] && +m[2] === slot[1] && Math.abs(+m[3] - slot[2]) < 1e-9,
      decalHome: d && +d[1] === dec[0] && +d[2] === dec[1] && +d[3] === dec[2] };
  });
  check('race car: stock 1 only while no number; typed number takes the painted slot; sticker stays home', race.stockHasOne && !race.typedHasOne && race.atSlot && race.decalHome, JSON.stringify(race));

  /* ---- 5. rear view carries the number too ---- */
  const rear = await page.evaluate(() => {
    const html = vehicleRearSVG(state);
    return { num: /data-number="27"/.test(html) && />27<\/text>/.test(html), decal: /data-decal="flame"/.test(html) };
  });
  check('rear view: roundel 27 + flame both drawn', rear.num && rear.decal, JSON.stringify(rear));
  await page.evaluate(() => drive(2));
  await page.waitForTimeout(600);
  await page.screenshot({ path: SHOT + 'num-road.png' });
  await page.evaluate(() => showGarage());

  /* ---- 6. same number = free close; broke wallet = deny, nothing changes ---- */
  const same = await page.evaluate(() => { openNumpad(); const w = progress.wallet; numOk.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); return { wallet: progress.wallet - w, closed: !numOverlay.classList.contains('show') }; });
  await page.evaluate(() => { progress.wallet = 100; renderWallets(false); openNumpad(); });
  await key('clear'); await key('8');
  await ok();
  const broke = await page.evaluate(() => ({ number: state.number, wallet: progress.wallet, open: numOverlay.classList.contains('show'), deny: numOk.classList.contains('deny') }));
  check('rules: re-confirming the same number is free; 100 stars cannot buy a change (deny shake, keypad stays)', same.wallet === 0 && same.closed && broke.number === '27' && broke.wallet === 100 && broke.open && broke.deny, JSON.stringify([same, broke]));

  /* ---- 7. taking the number off is free ---- */
  await key('clear');
  await ok();
  const off = await page.evaluate(() => ({ number: state.number, wallet: progress.wallet, roundel: !!preview.querySelector('[data-number]'), closed: !numOverlay.classList.contains('show') }));
  check('rules: clear + OK removes the number for free', off.number === '' && off.wallet === 100 && !off.roundel && off.closed, JSON.stringify(off));

  /* ---- 8. persistence: reload, photos, save-code tail (+ a code without the tail) ---- */
  await page.evaluate(() => { progress.wallet = 1000; state.number = '42'; save(); });
  await page.reload();
  await page.waitForTimeout(400);
  const persist = await page.evaluate(() => {
    const code = packCompact();
    const body = code.slice('VROOM1.'.length);
    const out = unpackCompact(body);
    const bytes = b64url.dec(body);
    const old = unpackCompact(b64url.enc(bytes.slice(0, bytes.length - 1)));   /* a 12.2 code: fuel/tread tail, no number */
    return { number: state.number, code: out.build.number, oldNumber: old && old.build.number, oldFuel: old && old.fuel, bytes: bytes.length };
  });
  check('save: 42 survives reload and rides the v3 tail; a 12.2 code decodes with no number', persist.number === '42' && persist.code === '42' && persist.oldNumber === '' && persist.oldFuel === 8, JSON.stringify(persist));
  const photo = await page.evaluate(async () => {
    drive(1); await new Promise(r => setTimeout(r, 200));
    runStars = 2; pos = LEVEL_LEN - 350; gasKey = true;
    await new Promise(r => setTimeout(r, 1400));
    gasKey = false;
    return { n: progress.photos[0] && progress.photos[0].b.number };
  });
  check('album: the finish-line photo keeps the number', photo.n === '42', JSON.stringify(photo));
  await page.evaluate(() => { const k = saveKey(); const s = JSON.parse(localStorage.getItem(k)); s.build.number = '123'; localStorage.setItem(k, JSON.stringify(s)); });
  await page.reload();
  await page.waitForTimeout(400);
  const bad = await page.evaluate(() => state.number);
  check('save: a malformed stored number (123) is dropped', bad === '', JSON.stringify(bad));

  /* ---- 9. targets: every key and OK >= 64px rendered; no text outside numerals ---- */
  await page.evaluate(() => openNumpad());
  await page.waitForTimeout(450);   /* let the card's pop-in settle before measuring */
  const targets = await page.evaluate(() => {
    const small = [...document.querySelectorAll('#numKeys button, #numOk')].filter(b => { const r = b.getBoundingClientRect(); return r.width < 63.5 || r.height < 63.5; }).length;
    const words = (document.getElementById('numCard').textContent.match(/[A-Za-z]{2,}/g) || []).length;
    closeNumpad();
    return { small, words };
  });
  check('keypad: all 13 targets >= 64px, numerals only', targets.small === 0 && targets.words === 0, JSON.stringify(targets));

  check('no console errors', errors.length === 0, errors.join(' | ').slice(0, 300));

  await browser.close();
  const fails = results.filter(r => !r.ok);
  console.log(`\n${results.length - fails.length}/${results.length} passed`);
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
