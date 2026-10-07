/* garage-check: the redesigned garage — one hierarchy (car hero, GO primary), six category tabs over one
   options strip. Checks: calm element count at rest, every tab's item count, selection ring follows state,
   locked tile -> tag -> buy -> equipped, arrows page the strip, swipe scrolls instead of equipping, the speaker
   lives in the grown-ups overlay and persists, >=64px targets at iPad scale, zero text (numerals only). */
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
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  const tap = sel => page.evaluate(s => document.querySelector(s).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 99 })), sel);
  /* tiles act on release (a swipe through them must scroll, not equip) */
  const tapTile = sel => page.evaluate(s => {
    const t = document.querySelector(s);
    t.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 99, clientX: 300, clientY: 600 }));
    t.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 99, clientX: 300, clientY: 600 }));
  }, sel);
  const openTab = cat => tap(`.catTab[data-cat="${cat}"]`).then(() => page.waitForTimeout(500));

  await page.goto(URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(1300);   /* entrance pops settle */

  check('load: no console errors', errors.length === 0, errors.join(' | ').slice(0, 300));

  /* ---- 1. calm at rest: <= 16 interactive elements (the strip counts as one scroller) ---- */
  const rest = await page.evaluate(() => {
    const vis = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
    const controls = [...document.querySelectorAll('#garage button:not(.tile), #garage .chip')].filter(vis);
    return {
      n: controls.length + 1, ids: controls.map(b => b.id || b.className.replace('bigBtn ', '')).join(','),
      gone: ['bodyBtn', 'wheelBtn', 'decalBtn', 'cycleDots', 'swatches', 'paintFlip', 'upgrades', 'garageSign', 'quietBtn'].filter(id => document.querySelector('#garage #' + id)),
      extrasHidden: document.getElementById('extras').getBoundingClientRect().width === 0,
      flipHidden: !document.getElementById('extrasFlip') || document.getElementById('extrasFlip').getBoundingClientRect().width === 0,
      wallHidden: ['repairBtn', 'washBtn'].every(id => !vis(document.getElementById(id)))
    };
  });
  check('rest: <= 16 interactive elements on the garage (strip = 1)', rest.n <= 16, rest.n + ': ' + rest.ids);
  check('rest: old controls gone (cycle buttons, dots, swatch grid, flips, rack, title, speaker)', rest.gone.length === 0 && rest.extrasHidden && rest.flipHidden, rest.gone.join(','));
  check('rest: repair + wash absent when nothing needs them', rest.wallHidden);
  await page.screenshot({ path: SHOT + 'garage-rest.png' });

  /* ---- 2. GO is the biggest control; everything >= 64px rendered ---- */
  const sizes = await page.evaluate(() => {
    const go = document.getElementById('goBtn').getBoundingClientRect();
    const others = [...document.querySelectorAll('#garage button, #garage .chip')].filter(b => b !== goBtn && b.getBoundingClientRect().width > 0);
    const tiny = others.filter(b => { const r = b.getBoundingClientRect(); return r.width < 63.5 || r.height < 63.5; }).map(b => (b.id || b.className) + ' ' + b.getBoundingClientRect().width.toFixed(1));
    const biggest = Math.max(...others.map(b => Math.min(b.getBoundingClientRect().width, b.getBoundingClientRect().height)));
    return { go: Math.min(go.width, go.height), biggest, tiny, tabs: [...document.querySelectorAll('.catTab')].map(t => t.getBoundingClientRect().width.toFixed(1)).join(',') };
  });
  check('GO: >= 180 stage px (>= 153 rendered) and the biggest control on screen', sizes.go >= 153 && sizes.go > sizes.biggest, JSON.stringify(sizes));
  check('targets: every visible garage control >= 64px rendered at 1024x768', sizes.tiny.length === 0, sizes.tiny.join(', '));

  /* ---- 3. every tab opens its strip with the right item count ---- */
  const counts = {};
  await openTab('work');   /* so the body tab below is a real switch (the open tab does not re-animate) */
  for (const [cat, attr] of [['body', 'body'], ['wheels', 'wheels'], ['color', 'color'], ['decal', 'decal'], ['extras', 'extra'], ['work', 'upg']]) {
    await openTab(cat);
    counts[cat] = await page.evaluate(a => ({
      n: document.querySelectorAll('#strip .tile').length, typed: document.querySelectorAll(`#strip .tile[data-${a}]`).length,
      sel: document.querySelector('.catTab.sel').dataset.cat, entered: document.querySelectorAll('#strip .tile.enter').length
    }), attr);
    await page.screenshot({ path: SHOT + 'garage-tab-' + cat + '.png' });
  }
  const want = { body: 23, wheels: 13, color: 23, decal: 9, extras: 10, work: 3 };
  const badCounts = Object.keys(want).filter(c => counts[c].n !== want[c] || counts[c].typed !== want[c] || counts[c].sel !== c);
  check('tabs: body 23 / wheels 13 / paint 23 / sticker 9 / extras 10 / workbench 3', badCounts.length === 0, JSON.stringify(counts));
  check('tabs: a tab switch pops its tiles in (popIn .enter stagger)', Object.values(counts).every(c => c.entered === c.n));

  /* workbench grows repair + wash tiles when the truck needs them */
  const work = await page.evaluate(() => {
    progress.damage = 3; progress.muddy = true; save(); renderPreview(); renderRepair(); renderWash();
    const vis = el => el.getBoundingClientRect().width > 0;
    return {
      tiles: document.querySelectorAll('#strip .tile').length, repair: !!document.querySelector('#strip .tile[data-act="repair"]'),
      wash: !!document.querySelector('#strip .tile[data-act="wash"]'), price: document.querySelector('#strip .tile[data-act="repair"] .upgPrice').textContent.trim(),
      wall: vis(repairBtn) && vis(washBtn), arrowsOff: document.getElementById('stripNext').classList.contains('off')
    };
  });
  check('workbench: repair (6) + wash tiles appear with damage + mud, wall buttons too, arrows hidden (all fits)', work.tiles === 5 && work.repair && work.wash && work.price === '6' && work.wall && work.arrowsOff, JSON.stringify(work));
  await page.screenshot({ path: SHOT + 'garage-workbench-repair-wash.png' });
  await page.evaluate(() => { progress.damage = 0; progress.muddy = false; save(); renderPreview(); renderRepair(); renderWash(); });

  /* ---- 4. selection ring follows state ---- */
  await openTab('body');
  const ring = await page.evaluate(() => {
    const a = document.querySelector('#strip .tile.sel');
    state.body = 'fire'; renderPreview();
    const b = document.querySelectorAll('#strip .tile.sel');
    return { a: a && a.dataset.body, b: b.length === 1 && b[0].dataset.body, state: state.body };
  });
  check('ring: one yellow ring on the current body; moves when state changes', ring.a === 'dump' && ring.b === 'fire', JSON.stringify(ring));

  /* ---- 5. locked tile -> tag -> buy -> equipped ---- */
  await page.evaluate(() => { progress.wallet = 100; save(); renderWallets(false); });
  await tapTile('.tile[data-body="police"]');
  await page.waitForTimeout(300);
  const locked = await page.evaluate(() => ({
    body: state.body, sel: document.querySelector('#strip .tile.sel').dataset.body, lockDot: !!document.querySelector('.tile[data-body="police"] .lockDot'),
    tilePrice: document.querySelector('.tile[data-body="police"] .upgPrice').textContent.trim(),
    tag: priceTag.classList.contains('show'), tagText: priceTag.textContent.trim(), afford: priceTag.classList.contains('afford'),
    lock: previewLock.classList.contains('show'), go: goBtn.classList.contains('locked')
  }));
  check('locked: tapping police selects it, tile shows padlock + 25, tag 25 under the preview, GO locked', locked.body === 'police' && locked.sel === 'police' && locked.lockDot && locked.tilePrice === '25' && locked.tag && locked.tagText === '25' && locked.afford && locked.lock && locked.go, JSON.stringify(locked));
  await page.screenshot({ path: SHOT + 'garage-locked.png' });
  await tap('#priceTag'); await page.waitForTimeout(400);
  const bought = await page.evaluate(() => ({
    wallet: progress.wallet, owned: progress.owned.body.includes('police'), body: state.body, sel: document.querySelector('#strip .tile.sel').dataset.body,
    lockDot: !!document.querySelector('.tile[data-body="police"] .lockDot'), tilePrice: document.querySelector('.tile[data-body="police"] .upgPrice').textContent.trim(),
    tag: priceTag.classList.contains('show'), go: goBtn.classList.contains('locked')
  }));
  check('buy: tag spends 25, police owned + equipped, padlock + price + tag gone, GO unlocked', bought.wallet === 75 && bought.owned && bought.body === 'police' && bought.sel === 'police' && !bought.lockDot && bought.tilePrice === '' && !bought.tag && !bought.go, JSON.stringify(bought));

  /* ---- 6. arrows page the strip; a swipe scrolls instead of equipping ---- */
  await page.evaluate(() => { state.body = 'dump'; renderPreview(); openTab('body', false); });
  await page.waitForTimeout(100);
  const visIdx = () => page.evaluate(() => {
    const s = strip.getBoundingClientRect();
    return [...document.querySelectorAll('#strip .tile')].map((t, i) => [t, i]).filter(([t]) => { const r = t.getBoundingClientRect(); return r.left >= s.left - 1 && r.right <= s.right + 1; }).map(([, i]) => i);
  });
  const p0 = await visIdx();
  const arrows0 = await page.evaluate(() => ({ prevEnd: stripPrev.classList.contains('end'), nextEnd: stripNext.classList.contains('end'), off: stripNext.classList.contains('off'), w: stripNext.getBoundingClientRect().width }));
  await tap('#stripNext'); await page.waitForTimeout(700);
  const p1 = await visIdx();
  await tap('#stripNext'); await page.waitForTimeout(700);
  const p2 = await visIdx();
  await tap('#stripPrev'); await tap('#stripPrev'); await page.waitForTimeout(900);
  const p3 = await visIdx();
  check('arrows: 7 tiles per page; next shows 7-13 then 14-20, prev returns to 0-6; prev dimmed at the start', p0.join() === '0,1,2,3,4,5,6' && p1.join() === '7,8,9,10,11,12,13' && p2.join() === '14,15,16,17,18,19,20' && p3.join() === '0,1,2,3,4,5,6' && arrows0.prevEnd && !arrows0.nextEnd && !arrows0.off && arrows0.w >= 54, JSON.stringify([p0, p1, p2, p3, arrows0]));
  const swipe = await page.evaluate(() => {
    const t = document.querySelector('.tile[data-body="digger"]');
    t.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 7, clientX: 300, clientY: 600 }));
    t.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 7, clientX: 250, clientY: 600 }));
    t.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 7, clientX: 250, clientY: 600 }));
    const afterSwipe = state.body;
    t.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 8, clientX: 300, clientY: 600 }));
    t.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 8, clientX: 302, clientY: 601 }));
    return { afterSwipe, afterTap: state.body, pressed: !!document.querySelector('.tile.pressed') };
  });
  check('tiles: a 50px swipe does not equip, a tap does (digger), no stuck pressed state', swipe.afterSwipe === 'dump' && swipe.afterTap === 'digger' && !swipe.pressed, JSON.stringify(swipe));

  /* ---- 7. speaker lives in the grown-ups overlay and persists ---- */
  const speaker0 = await page.evaluate(() => ({
    inGarage: !!document.querySelector('#garage #quietBtn'), inOverlay: !!document.querySelector('#profileOverlay #quietBtn'),
    quiet: progress.quiet, on: quietBtn.classList.contains('on')
  }));
  await tap('#profileBtn'); await page.waitForTimeout(500);
  const speaker1 = await page.evaluate(() => {
    const r = quietBtn.getBoundingClientRect();
    return { shown: profileOverlay.classList.contains('show'), w: r.width, h: r.height, pressed: quietBtn.getAttribute('aria-pressed') };
  });
  await tap('#quietBtn'); await page.waitForTimeout(200);
  const speaker2 = await page.evaluate(() => ({ quiet: progress.quiet, on: quietBtn.classList.contains('on'), pressed: quietBtn.getAttribute('aria-pressed') }));
  await page.screenshot({ path: SHOT + 'garage-overlay-quiet.png' });
  await page.reload(); await page.waitForTimeout(600);
  const speaker3 = await page.evaluate(() => ({ quiet: progress.quiet, on: quietBtn.classList.contains('on') }));
  check('speaker: not on the garage, in the overlay as a >= 64px toggle', !speaker0.inGarage && speaker0.inOverlay && speaker1.shown && speaker1.w >= 63.5 && speaker1.h >= 63.5, JSON.stringify([speaker0, speaker1]));
  check('speaker: off -> on flips progress.quiet + aria-pressed + .on, persists across reload', !speaker0.quiet && !speaker0.on && speaker1.pressed === 'false' && speaker2.quiet && speaker2.on && speaker2.pressed === 'true' && speaker3.quiet && speaker3.on, JSON.stringify([speaker2, speaker3]));
  await page.evaluate(() => { progress.quiet = false; save(); });

  /* ---- 8. zero text: no letters in any garage text node (numerals only) ---- */
  const text = await page.evaluate(() => {
    const out = [];
    for (const cat of ['body', 'wheels', 'color', 'decal', 'extras', 'work']) {
      openTab(cat, false);
      const walker = document.createTreeWalker(document.getElementById('garage'), NodeFilter.SHOW_TEXT);
      let n; while ((n = walker.nextNode())) if (/[A-Za-z]/.test(n.nodeValue)) out.push(n.nodeValue.trim().slice(0, 20));
    }
    openTab('body', false);
    return out;
  });
  check('text: no letters anywhere on the garage (numerals only)', text.length === 0, text.join(' | '));

  /* ---- 9. aria labels everywhere ---- */
  const aria = await page.evaluate(() => [...document.querySelectorAll('#garage button')].filter(b => !b.getAttribute('aria-label')).map(b => b.id || b.className));
  check('a11y: every garage button keeps an aria-label', aria.length === 0, aria.join(','));

  check('no console errors', errors.length === 0, errors.join(' | ').slice(0, 300));

  await browser.close();
  const fails = results.filter(r => !r.ok);
  console.log(`\n${results.length - fails.length}/${results.length} passed`);
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
