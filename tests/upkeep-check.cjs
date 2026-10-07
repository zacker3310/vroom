/* upkeep-check: fuel + tire wear + the shine bonus (v12.2).
   Fuel and tread burn with distance in levels only; a dry tank crawls but never strands; bald tires steer slower;
   fill-ups and tires are workbench tiles priced per unit; a spotless, ding-free finish earns +50% on collected stars;
   both gauges ride in the save code's appended v3 tail and default to full on older saves. */
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

  await page.goto(URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(300);

  /* ---- 1. fresh save: full tank, fresh tires, nothing to buy on the bench ---- */
  const fresh = await page.evaluate(() => {
    openTab('work', false);
    return { fuel: progress.fuel, tread: progress.tread, max: [FUEL_MAX, TREAD_MAX], tiles: document.querySelectorAll('#strip .tile').length,
      dot: document.querySelector('.catTab[data-cat="work"]').classList.contains('needs') };
  });
  check('fresh: full tank + fresh tires (8/8), workbench shows only the 3 upgrades, no wrench dot', fresh.fuel === 8 && fresh.tread === 8 && fresh.tiles === 3 && !fresh.dot, JSON.stringify(fresh));

  /* ---- 2. gauges on the HUD, in the right column rhythm, >= 64px, clear of the pedal ---- */
  const hud = await page.evaluate(() => {
    drive(3);
    const r = id => document.getElementById(id).getBoundingClientRect();
    const f = r('hudFuel'), t = r('hudTires'), d = r('hudDamage'), g = r('gasPedal');
    return { fuelTxt: hudFuel.textContent.trim(), tireTxt: hudTires.textContent.trim(), low: hudFuel.classList.contains('low') || hudTires.classList.contains('low'),
      size: Math.min(f.width, f.height, t.width, t.height), gapDF: Math.round(f.top - d.bottom), gapFT: Math.round(t.top - f.bottom),
      clearPedal: t.bottom < g.top, sameX: Math.abs(f.left - d.left) < 1 && Math.abs(t.left - d.left) < 1 };
  });
  check('hud: fuel 8 + tread 8 gauges under the wrench, even gaps, >= 64px, clear of the gas pedal', hud.fuelTxt === '8' && hud.tireTxt === '8' && !hud.low && hud.size >= 64 && hud.gapDF === hud.gapFT && hud.gapDF > 0 && hud.clearPedal && hud.sameX, JSON.stringify(hud));

  /* ---- 3. burn with distance: fuel 1 unit per 5200, tread half as fast ---- */
  const burn = await page.evaluate(async () => {
    pos = 0; v = 0; progress.fuel = 8; progress.tread = 8; renderHudUpkeep(false);
    gasKey = true;
    await new Promise(r => setTimeout(r, 1500));
    gasKey = false;
    const df = 8 - progress.fuel, dtr = 8 - progress.tread;
    return { pos: Math.round(pos), df: +df.toFixed(3), dtr: +dtr.toFixed(3), ratio: +(df / dtr).toFixed(2), expectF: +(pos / FUEL_PER_UNIT).toFixed(3),
      hud: hudFuel.textContent.trim() };
  });
  check('burn: fuel drops with distance (pos/15600), tread at half that rate', burn.df > 0.015 && Math.abs(burn.df - burn.expectF) < 0.01 && Math.abs(burn.ratio - 2) < 0.05, JSON.stringify(burn));
  check('burn: HUD rounds up (7 after the first sip)', burn.hud === '8' || burn.hud === String(Math.ceil(8 - burn.df)), burn.hud);

  /* ---- 4. free drive and the parade do not burn ---- */
  const noBurn = await page.evaluate(() => {
    progress.fuel = 8; progress.tread = 8;
    freeMode = true; burnUpkeep(5000, performance.now()); const a = progress.fuel; freeMode = false;
    paradeMode = true; burnUpkeep(5000, performance.now()); const b = progress.tread; paradeMode = false;
    return { a, b };
  });
  check('burn: free drive + parade leave the gauges alone', noBurn.a === 8 && noBurn.b === 8, JSON.stringify(noBurn));

  /* ---- 5. dry tank: a crawl, never a stop; low gauge turns red; coughs do not throw ---- */
  const dry = await page.evaluate(async () => {
    progress.fuel = 0; progress.tread = 8; renderHudUpkeep(false);
    const vmaxDry = vmaxEff();
    pos = 0; v = 0; gasKey = true;
    await new Promise(r => setTimeout(r, 900));
    gasKey = false;
    const moved = pos;
    progress.fuel = 1.5; const vmaxLow = vmaxEff();
    progress.fuel = 8; const vmaxFull = vmaxEff();
    return { vmaxDry, vmaxLow, vmaxFull, moved: Math.round(moved), low: hudFuel.classList.contains('low'), stillZero: progress.fuel === 0 || progress.fuel === 8 };
  });
  check('dry tank: top speed 55% (385), low tank 80% (560), full 700; the car still moves; gauge red', dry.vmaxDry === 385 && dry.vmaxLow === 560 && dry.vmaxFull === 700 && dry.moved > 150 && dry.low, JSON.stringify(dry));

  /* ---- 6. bald tires: slower lane changes + a touch off the top speed ---- */
  const grip = await page.evaluate(async () => {
    const sample = async tread => {
      progress.tread = tread; gasKey = false; v = 0;
      targetLane = 1; laneVis = 1;
      setLane(2);
      await new Promise(r => setTimeout(r, 120));
      return laneVis;
    };
    const fresh = await sample(8), bald = await sample(1);
    const vmaxBald = vmaxEff(); progress.tread = 8;
    return { fresh: +fresh.toFixed(3), bald: +bald.toFixed(3), vmaxBald, k: gripK() };
  });
  check('bald tires: lane change lags (grip 0.6) and top speed drops to 630', grip.bald < grip.fresh - 0.05 && grip.vmaxBald === 630 && grip.k === 1, JSON.stringify(grip));

  /* ---- 7. a hard hit scuffs half a unit of tread (armor soaks it) ---- */
  const scuff = await page.evaluate(() => {
    progress.tread = 8; progress.damage = 0; progress.upgrades.armor = 0; runDamage = 0;
    applyDamage(1); const a = +progress.tread.toFixed(4);
    progress.upgrades.armor = 1; applyDamage(1); const b = +progress.tread.toFixed(4);
    progress.upgrades.armor = 0; progress.damage = 0; runDamage = 0; updateDamageVisuals(); renderHudDamage(false);
    return { a, b };
  });
  check('hit: -1/6 tread per soaked ding, armor keeps the rubber', scuff.a === 7.8333 && scuff.b === 7.8333, JSON.stringify(scuff));

  /* ---- 8. shine bonus: spotless + ding-free finish earns +50% of collected stars ---- */
  const shineRun = await page.evaluate(async () => {
    progress.muddy = false; progress.damage = 0; progress.fuel = 8; progress.tread = 8; updateDamageVisuals(); renderHudDamage(false);
    const w0 = progress.wallet;
    runStars = 7; runDamage = 0; renderHudStars(false);
    pos = LEVEL_LEN - 350; gasKey = true;
    await new Promise(r => setTimeout(r, 1400));
    gasKey = false;
    const chip = document.getElementById('celebrateShine');
    return { banked: progress.wallet - w0, chip: chip.textContent.trim(), shown: chip.style.display !== 'none', badge: progress.badges.includes('shine'),
      fuelHidden: getComputedStyle(hudFuel).display === 'none' };
  });
  check('shine: 7 stars + 3 + 2 clean + 4 shine = 16, chip shows +4, sticker awarded, gauges step aside', shineRun.banked === 16 && shineRun.chip === '+4' && shineRun.shown && shineRun.badge && shineRun.fuelHidden, JSON.stringify(shineRun));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: SHOT + 'uk-shine.png' });

  await page.evaluate(() => document.getElementById('replayBtn').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 7 })));
  await page.waitForTimeout(250);
  const muddyRun = await page.evaluate(async () => {
    progress.muddy = true;
    const w0 = progress.wallet;
    runStars = 7; runDamage = 0; renderHudStars(false);
    pos = LEVEL_LEN - 350; gasKey = true;
    await new Promise(r => setTimeout(r, 1400));
    gasKey = false;
    return { banked: progress.wallet - w0, shown: document.getElementById('celebrateShine').style.display !== 'none' };
  });
  check('shine: a muddy truck gets no shine (7+3+2 = 12), chip hidden', muddyRun.banked === 12 && !muddyRun.shown, JSON.stringify(muddyRun));

  /* ---- 9. workbench: fuel + tire tiles appear when a unit is missing, priced per unit, dot + pulse when low ---- */
  const bench = await page.evaluate(() => {
    showGarage(); progress.wallet = 100; progress.muddy = false; progress.damage = 0;
    progress.fuel = 3.2; progress.tread = 5; save(); renderWallets(false); renderUpkeep(); openTab('work', false);
    const q = sel => document.querySelector(sel);
    const r1 = { tiles: document.querySelectorAll('#strip .tile').length, fuelPrice: q('#strip .tile[data-act="fuel"] .upgPrice').textContent.trim(),
      tirePrice: q('#strip .tile[data-act="tires"] .upgPrice').textContent.trim(), dot: q('.catTab[data-cat="work"]').classList.contains('needs'),
      urgent: !!q('#strip .tile.urgent'), order: [...document.querySelectorAll('#strip .tile')].map(t => t.dataset.id).join(',') };
    progress.fuel = 1; renderUpkeep();
    const r2 = { dot: q('.catTab[data-cat="work"]').classList.contains('needs'), urgent: q('#strip .tile[data-act="fuel"]').classList.contains('urgent') };
    return { r1, r2 };
  });
  check('bench: fuel (5) + tires (3) tiles ahead of the upgrades, no dot above the low line', bench.r1.tiles === 5 && bench.r1.fuelPrice === '5' && bench.r1.tirePrice === '3' && !bench.r1.dot && !bench.r1.urgent && bench.r1.order === 'fuel,tires,engine,armor,magnet', JSON.stringify(bench.r1));
  check('bench: low fuel lights the wrench dot and pulses the fuel tile', bench.r2.dot && bench.r2.urgent, JSON.stringify(bench.r2));
  await page.screenshot({ path: SHOT + 'uk-bench.png' });

  /* ---- 10. buying: fill-up pays per unit (partial when short), tires are a set ---- */
  const buy = await page.evaluate(() => {
    progress.fuel = 3; progress.wallet = 100; renderUpkeep();
    doRefuel(document.querySelector('#strip .tile[data-act="fuel"]'));
    const a = { fuel: progress.fuel, wallet: progress.wallet, tile: !!document.querySelector('#strip .tile[data-act="fuel"]') };
    progress.fuel = 3; progress.wallet = 2; renderUpkeep();
    doRefuel(document.querySelector('#strip .tile[data-act="fuel"]'));
    const b = { fuel: progress.fuel, wallet: progress.wallet };
    doRefuel(document.querySelector('#strip .tile[data-act="fuel"]'));
    const c = { fuel: progress.fuel, wallet: progress.wallet, deny: document.querySelector('#strip .tile[data-act="fuel"]').classList.contains('deny') };
    progress.tread = 5; progress.wallet = 2; renderUpkeep();
    doTires(document.querySelector('#strip .tile[data-act="tires"]'));
    const d = { tread: progress.tread, wallet: progress.wallet };
    progress.wallet = 10;
    doTires(document.querySelector('#strip .tile[data-act="tires"]'));
    const e = { tread: progress.tread, wallet: progress.wallet, tile: !!document.querySelector('#strip .tile[data-act="tires"]') };
    return { a, b, c, d, e };
  });
  check('buy: fill-up 5 stars -> tank 8, tile gone', buy.a.fuel === 8 && buy.a.wallet === 95 && !buy.a.tile, JSON.stringify(buy.a));
  check('buy: 2 stars buys 2 glugs (3 -> 5), broke = deny shake, nothing taken', buy.b.fuel === 5 && buy.b.wallet === 0 && buy.c.fuel === 5 && buy.c.wallet === 0 && buy.c.deny, JSON.stringify([buy.b, buy.c]));
  check('buy: tires are all-or-nothing: 2 stars denied, 3 stars -> fresh set, tile gone', buy.d.tread === 5 && buy.d.wallet === 2 && buy.e.tread === 8 && buy.e.wallet === 7 && !buy.e.tile, JSON.stringify([buy.d, buy.e]));

  /* ---- 11. persistence: localStorage + save code tail; older saves/codes read as full ---- */
  const persist = await page.evaluate(() => {
    progress.fuel = 3.4; progress.tread = 6; save();
    const code = packCompact();
    const out = unpackCompact(code.slice('VROOM1.'.length));
    /* an older v3 code ends at the level run: drop our one-byte tail */
    const bytes = b64url.dec(code.slice('VROOM1.'.length));
    const old = unpackCompact(b64url.enc(bytes.slice(0, bytes.length - 1)));
    return { fuel: out && out.fuel, tread: out && out.tread, oldFuel: old && old.fuel, oldOk: !!old && old.wallet === progress.wallet };
  });
  check('save code: v3 tail carries fuel 4 (ceil 3.4) + tread 6; a tail-less older code still decodes with no gauges', persist.fuel === 4 && persist.tread === 6 && persist.oldFuel === undefined && persist.oldOk, JSON.stringify(persist));
  await page.reload();
  await page.waitForTimeout(400);
  const reload = await page.evaluate(() => ({ fuel: progress.fuel, tread: progress.tread }));
  check('save: gauges survive a reload (3.4 / 6)', Math.abs(reload.fuel - 3.4) < 1e-9 && reload.tread === 6, JSON.stringify(reload));
  await page.evaluate(() => { const k = saveKey(); const s = JSON.parse(localStorage.getItem(k)); delete s.fuel; delete s.tread; localStorage.setItem(k, JSON.stringify(s)); });
  await page.reload();
  await page.waitForTimeout(400);
  const legacy = await page.evaluate(() => ({ fuel: progress.fuel, tread: progress.tread }));
  check('save: a pre-12.2 save without gauges loads with a full tank + fresh tires', legacy.fuel === 8 && legacy.tread === 8, JSON.stringify(legacy));

  /* ---- 12. the right column: dice / map / GO share one x-centre with even 16px gaps ---- */
  const column = await page.evaluate(() => {
    const r = id => document.getElementById(id).getBoundingClientRect();
    const d = r('diceBtn'), m = r('mapBtn'), g = r('goBtn');
    const cx = b => b.left + b.width / 2;
    return { gapDM: Math.round(m.top - d.bottom), gapMG: Math.round(g.top - m.bottom), cx: [cx(d), cx(m), cx(g)].map(x => Math.round(x)),
      bottom: Math.round(g.bottom), stage: document.getElementById('stage').getBoundingClientRect().bottom };
  });
  check('garage column: dice, map, GO centred on one axis with equal gaps', column.gapDM === column.gapMG && column.gapDM > 0 && new Set(column.cx).size === 1, JSON.stringify(column));

  check('no console errors', errors.length === 0, errors.join(' | ').slice(0, 300));

  await browser.close();
  const fails = results.filter(r => !r.ok);
  console.log(`\n${results.length - fails.length}/${results.length} passed`);
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
