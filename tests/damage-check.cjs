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
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(300);

  /* ---- keyboard: A/D steer left/right, W gas, S brake ---- */
  await page.evaluate(() => drive(1));
  await page.waitForTimeout(200);
  await page.keyboard.press('d');
  await page.waitForTimeout(80);
  let lane = await page.evaluate(() => targetLane);
  check('keys: D moves right a lane', lane === 2, 'targetLane=' + lane);
  await page.keyboard.press('a');
  await page.keyboard.press('a');
  await page.waitForTimeout(80);
  lane = await page.evaluate(() => targetLane);
  check('keys: A moves left a lane', lane === 0, 'targetLane=' + lane);
  await page.keyboard.down('w');
  await page.waitForTimeout(600);
  const vGas = await page.evaluate(() => v);
  await page.keyboard.up('w');
  check('keys: W is gas', vGas > 300, 'v=' + vGas.toFixed(0));
  await page.keyboard.down('s');
  await page.waitForTimeout(500);
  const vBrake = await page.evaluate(() => v);
  await page.keyboard.up('s');
  check('keys: S is brake', vBrake < 40, 'v=' + vBrake.toFixed(0));

  /* ---- damage: barrel hit = 1, HUD chip + scuffs ---- */
  const dmg1 = await page.evaluate(async () => {
    buildLevel(5); pos = 0; v = 0;
    progress.damage = 0; runDamage = 0; renderHudDamage(false);
    const b = props.find(p => p.type === 'barrel' || p.type === 'rock');
    if (!b) return { skip: true };
    targetLane = laneVis = b.lane;
    pos = b.x - 300 - 150; gasKey = true;
    await new Promise(r => setTimeout(r, 650));
    gasKey = false;
    return {
      damage: progress.damage, run: runDamage, hud: hudDamage.textContent.trim(),
      scuff: carWrap.querySelector('.dmgScuff') && carWrap.querySelector('.dmgScuff').style.display !== 'none'
    };
  });
  check('damage: hard hit deals 1 + HUD + scuffs', dmg1.skip || (dmg1.damage === 1 && dmg1.run === 1 && dmg1.hud === '1' && dmg1.scuff), JSON.stringify(dmg1));

  /* ---- damage tiers: 3 = crack, 5 = smoke + slower top speed ---- */
  const tiers = await page.evaluate(() => {
    progress.damage = 3; updateDamageVisuals();
    const crack = carWrap.querySelector('.dmgCrack').style.display !== 'none';
    progress.damage = 5; updateDamageVisuals();
    const smoke = carWrap.querySelector('.dmgSmoke').style.display !== 'none';
    return { crack, smoke, vmaxHurt: vmaxEff() < 700, vmaxVal: vmaxEff() };
  });
  check('damage: crack at 3, smoke at 5, smoking = slower', tiers.crack && tiers.smoke && tiers.vmaxHurt, JSON.stringify(tiers));
  await page.screenshot({ path: SHOT + 'd-damaged.png' });

  /* ---- oil: spin-out, no damage ---- */
  const oil = await page.evaluate(async () => {
    let found = null;
    for (let n = 5; n <= 14 && !found; n++) { buildLevel(n); found = props.find(p => p.type === 'oil'); }
    if (!found) return { skip: true, note: 'no oil in L5-14' };
    pos = 0; v = 0; progress.damage = 0; runDamage = 0;
    targetLane = laneVis = found.lane;
    pos = found.x - 300 - 200; gasKey = true;
    await new Promise(r => setTimeout(r, 700));
    gasKey = false;
    return { done: found.done, damage: progress.damage };
  });
  check('damage: oil slick spins, no damage', oil.skip || (oil.done && oil.damage === 0), JSON.stringify(oil));

  /* ---- tnt: boom = 2 damage + stop ---- */
  const tnt = await page.evaluate(async () => {
    let found = null;
    for (let n = 12; n <= 24 && !found; n++) { buildLevel(n); found = props.find(p => p.type === 'tnt'); }
    if (!found) return { skip: true, note: 'no tnt in L12-24' };
    pos = 0; v = 0; progress.damage = 0; runDamage = 0; renderHudDamage(false);
    targetLane = laneVis = found.lane;
    pos = found.x - 300 - 150; gasKey = true;
    const t0 = performance.now();
    while (!found.done && performance.now() - t0 < 900) await new Promise(r => setTimeout(r, 30));
    gasKey = false;                    /* release right at the boom so we can observe the stop */
    await new Promise(r => setTimeout(r, 60));
    return { done: found.done, damage: progress.damage, stopped: v < 120 };
  });
  check('damage: tnt booms for 2 + stop', tnt.skip || (tnt.done && tnt.damage === 2 && tnt.stopped), JSON.stringify(tnt));

  /* ---- tnt respects never-block-3-lanes ---- */
  const wall = await page.evaluate(() => {
    for (let n = 12; n <= 30; n++) {
      buildLevel(n);
      const hard = props.filter(p => p.type === 'barrel' || p.type === 'rock' || p.type === 'tnt');
      for (const a of hard) for (const b of hard) for (const c of hard) {
        if (a === b || b === c || a === c) continue;
        const xs = [a.x, b.x, c.x];
        if (Math.max(...xs) - Math.min(...xs) < 240 && new Set([a.lane, b.lane, c.lane]).size === 3) return { n, wall: true };
      }
    }
    return { wall: false };
  });
  check('damage: no 3-lane wall incl. tnt across L12-30', !wall.wall, JSON.stringify(wall));

  /* ---- clean run banks +2 bonus; damaged run doesn't ---- */
  await page.evaluate(() => { progress.damage = 0; drive(1); });
  await page.waitForTimeout(200);
  const clean = await page.evaluate(async () => {
    const w0 = progress.wallet;
    runStars = 4; runDamage = 0; renderHudStars(false);
    pos = LEVEL_LEN - 350; gasKey = true;
    await new Promise(r => setTimeout(r, 1400));
    gasKey = false;
    return { banked: progress.wallet - w0, chip: document.getElementById('celebrateDamage').querySelector('span').textContent.trim() };
  });
  check('economy: clean run banks 4+3+2 clean+2 shine', clean.banked === 11, JSON.stringify(clean));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: SHOT + 'd-celebrate.png' });

  await tap('#replayBtn');
  await page.waitForTimeout(250);
  const dirty = await page.evaluate(async () => {
    const w0 = progress.wallet;
    runStars = 4; runDamage = 2; progress.damage = 2; renderHudDamage(false);
    pos = LEVEL_LEN - 350; gasKey = true;
    await new Promise(r => setTimeout(r, 1400));
    gasKey = false;
    return { banked: progress.wallet - w0, chip: document.getElementById('celebrateDamage').querySelector('span').textContent.trim() };
  });
  check('economy: dinged run banks 4+3, damage chip shows 2', dirty.banked === 7 && dirty.chip === '2', JSON.stringify(dirty));

  /* ---- damage persists across runs and reload ---- */
  await tap('#replayBtn');
  await page.waitForTimeout(250);
  const persist1 = await page.evaluate(() => ({ damage: progress.damage, hud: hudDamage.textContent.trim() }));
  check('damage: persists across runs', persist1.damage === 2 && persist1.hud === '2', JSON.stringify(persist1));
  await page.reload();
  await page.waitForTimeout(300);
  const persist2 = await page.evaluate(() => progress.damage);
  check('damage: persists across reload', persist2 === 2, 'damage=' + persist2);

  /* ---- repair: wrench tile on the workbench tab, costs 2x damage; the wrench tab wears a dot ---- */
  const repairUi = await page.evaluate(() => {
    showGarage(); progress.wallet = 100; renderWallets(false); renderUpkeep(); openTab('work', false);
    const tile = document.querySelector('#strip .tile[data-act="repair"]');
    return {
      visible: !!tile && tile.getBoundingClientRect().width > 0,
      price: tile ? tile.textContent.trim() : '',
      dot: document.querySelector('.catTab[data-cat="work"]').classList.contains('needs'),
      noWall: !document.getElementById('repairBtn') && !document.getElementById('washBtn'),
      previewDinged: preview.querySelector('.dmgScuff').style.display !== 'none'
    };
  });
  check('repair: wrench tile on the workbench with price 4, tab dot on, no wall buttons, preview dinged', repairUi.visible && repairUi.price === '4' && repairUi.dot && repairUi.noWall && repairUi.previewDinged, JSON.stringify(repairUi));
  await page.screenshot({ path: SHOT + 'd-garage-repair.png' });
  await page.evaluate(() => doRepair());
  const repaired = await page.evaluate(() => ({
    damage: progress.damage, wallet: progress.wallet,
    hidden: !document.querySelector('#strip .tile[data-act="repair"]'),
    dot: document.querySelector('.catTab[data-cat="work"]').classList.contains('needs'),
    clean: preview.querySelector('.dmgScuff').style.display === 'none'
  }));
  check('repair: pays 4, damage 0, tile gone, tab dot off, truck clean', repaired.damage === 0 && repaired.wallet === 96 && repaired.hidden && !repaired.dot && repaired.clean, JSON.stringify(repaired));

  /* ---- upgrades: engine buy raises vmax; armor soaks damage; prices deduct ---- */
  const upg = await page.evaluate(() => {
    progress.wallet = 200; renderWallets(false); renderUpgrades();
    const before = vmaxEff();
    (k => { openTab('work', false); const t = document.querySelector(`.tile[data-upg="${k}"]`); t.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 300, clientY: 600 })); t.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 300, clientY: 600 })); })('engine');   /* tap the engine tile on the workbench tab */
    const after = vmaxEff();
    return { before, after, lvl: progress.upgrades.engine, wallet: progress.wallet };
  });
  check('upgrade: engine L1 costs 60, vmax 700->780', upg.before === 700 && upg.after === 780 && upg.lvl === 1 && upg.wallet === 140, JSON.stringify(upg));

  const armor = await page.evaluate(async () => {
    (k => { openTab('work', false); const t = document.querySelector(`.tile[data-upg="${k}"]`); t.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 300, clientY: 600 })); t.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 300, clientY: 600 })); })('armor');   /* tap the armor tile on the workbench tab */
    drive(5);
    await new Promise(r => setTimeout(r, 200));
    const b = props.find(p => p.type === 'barrel' || p.type === 'rock');
    if (!b) return { skip: true };
    progress.damage = 0; runDamage = 0;
    armorRoll = () => 0;   /* force the shield to hold for this hit */
    targetLane = laneVis = b.lane;
    pos = b.x - 300 - 150; gasKey = true;
    await new Promise(r => setTimeout(r, 650));
    gasKey = false;
    const held = { hit: b.done, damage: progress.damage, armorLvl: progress.upgrades.armor, flash: !!carWrap.querySelector('svg.shieldHit') };
    /* the shield is not perfect: a miss lets the point through; odds are 50 / 65 / 80% per pip; a TNT (2) can be half-blocked */
    armorRoll = () => 0.99; applyDamage(1);
    const missed = progress.damage;
    let seq = [0.1, 0.9]; armorRoll = () => seq.shift(); applyDamage(2);
    const half = progress.damage;
    armorRoll = () => Math.random();
    return { held, missed, half, odds: ARMOR_BLOCK.join(',') };
  });
  check('upgrade: armor L1 can hold a barrel (ping + blue flash) but is not perfect: a miss lands, a TNT can be half-blocked, odds 50/65/80', armor.skip || (armor.held.hit && armor.held.damage === 0 && armor.held.armorLvl === 1 && armor.held.flash && armor.missed === 1 && armor.half === 2 && armor.odds === '0,0.5,0.65,0.8'), JSON.stringify(armor));

  /* upgrades persist */
  await page.reload();
  await page.waitForTimeout(300);
  const upgPersist = await page.evaluate(() => progress.upgrades);
  check('upgrade: levels persist across reload', upgPersist.engine === 1 && upgPersist.armor === 1, JSON.stringify(upgPersist));

  /* deny: broke wallet can't upgrade */
  const upgDeny = await page.evaluate(() => {
    progress.wallet = 1; renderWallets(false); renderUpgrades();
    const lvl0 = progress.upgrades.magnet;
    (k => { openTab('work', false); const t = document.querySelector(`.tile[data-upg="${k}"]`); t.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 300, clientY: 600 })); t.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 300, clientY: 600 })); })('magnet');   /* tap the magnet tile on the workbench tab */
    return { unchanged: progress.upgrades.magnet === lvl0, wallet: progress.wallet };
  });
  check('upgrade: broke wallet denied', upgDeny.unchanged && upgDeny.wallet === 1, JSON.stringify(upgDeny));

  check('no console errors', errors.length === 0, errors.join(' | ').slice(0, 300));

  await browser.close();
  const fails = results.filter(r => !r.ok);
  console.log(`\n${results.length - fails.length}/${results.length} passed`);
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
