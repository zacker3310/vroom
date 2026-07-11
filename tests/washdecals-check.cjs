const pw = require('playwright-core');
const os = require('os');
const EXE = os.homedir() + '/Library/Caches/ms-playwright/chromium-1117/chrome-mac/Chromium.app/Contents/MacOS/Chromium';
const URL = 'http://localhost:4173/index.html';
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
  await page.waitForTimeout(500);

  /* ---- decals: cycle, gate, buy, render ---- */
  await tap('#decalBtn');   /* none -> flame (locked, 30) */
  const dec1 = await page.evaluate(() => ({
    decal: state.decal, gated: goBtn.classList.contains('locked'),
    tag: priceTag.classList.contains('show') && priceTag.textContent.trim() === '30'
  }));
  check('decals: cycling to locked flame gates GO with a 30 tag', dec1.decal === 'flame' && dec1.gated && dec1.tag, JSON.stringify(dec1));

  const dec2 = await page.evaluate(() => {
    progress.wallet = 100; renderWallets(false); renderShop();
    priceTag.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    return {
      owned: progress.owned.decal.includes('flame'), wallet: progress.wallet,
      ungated: !goBtn.classList.contains('locked'),
      rendered: preview.innerHTML.includes('translate(150,136)')
    };
  });
  check('decals: buying flame (30) unlocks + stamps the flank', dec2.owned && dec2.wallet === 70 && dec2.ungated && dec2.rendered, JSON.stringify(dec2));
  await page.screenshot({ path: SHOT + 'wd-decal.png' });

  /* decal in a finish photo + compact code round-trip */
  const codec = await page.evaluate(async () => {
    save();
    const code = packCompact();
    const d = await decodeSaveCode(code);
    return { owned: d.owned.decal.includes('flame'), equipped: d.build.decal === 'flame', ver2: true };
  });
  check('decals: compact save code v2 round-trips decal', codec.owned && codec.equipped, JSON.stringify(codec));

  /* persists across reload */
  await page.reload();
  await page.waitForTimeout(500);
  const dec3 = await page.evaluate(() => ({ decal: state.decal, owned: progress.owned.decal.includes('flame') }));
  check('decals: equipped decal survives reload', dec3.decal === 'flame' && dec3.owned, JSON.stringify(dec3));

  /* ---- mud: puddle splashes stick until washed ---- */
  const mud = await page.evaluate(async () => {
    drive(2);
    await new Promise(r => setTimeout(r, 150));
    const p = props.find(pp => pp.type === 'puddle');
    if (!p) return { skip: true };
    targetLane = laneVis = p.lane;
    pos = p.x - 300 - 100; gasKey = true;
    await new Promise(r => setTimeout(r, 600));
    gasKey = false;
    return { muddy: progress.muddy, splashed: p.done };
  });
  check('wash: puddle splash sets persistent mud', mud.skip || (mud.muddy && mud.splashed), JSON.stringify(mud));

  await page.evaluate(() => showGarage());
  await page.waitForTimeout(600);
  const garage = await page.evaluate(() => ({
    washShown: washBtn.classList.contains('show'),
    previewMuddy: preview.innerHTML.includes('opacity:1') && preview.querySelector('.mudSpots') !== null
  }));
  check('wash: garage shows sponge button + muddy preview', garage.washShown && garage.previewMuddy, JSON.stringify(garage));

  /* mud survives reload */
  await page.reload();
  await page.waitForTimeout(500);
  const mudPersist = await page.evaluate(() => progress.muddy === true && washBtn.classList.contains('show'));
  check('wash: mud persists across reload', mudPersist);

  /* ---- the scrub mini-game ---- */
  await tap('#washBtn');
  await page.waitForTimeout(400);
  const openState = await page.evaluate(() => washOverlay.classList.contains('show'));
  check('wash: overlay opens with the muddy car', openState);

  /* rub: drag back and forth across the car */
  const box = await page.locator('#washCar').boundingBox();
  await page.mouse.move(box.x + 60, box.y + box.height / 2);
  await page.mouse.down();
  for (let pass = 0; pass < 8; pass++) {
    for (let i = 0; i <= 12; i++) {
      await page.mouse.move(box.x + 60 + (pass % 2 ? 12 - i : i) * ((box.width - 120) / 12), box.y + box.height / 2 + (i % 3) * 14);
    }
  }
  await page.mouse.up();
  await page.waitForTimeout(300);
  const scrub = await page.evaluate(() => ({
    progress: washProgress, bubbles: document.querySelectorAll('.bubble').length >= 0,
    clean: progress.muddy === false
  }));
  check('wash: scrubbing fills the meter and rinses the mud', scrub.progress >= 100 && scrub.clean, JSON.stringify(scrub));
  await page.screenshot({ path: SHOT + 'wd-wash.png' });
  await page.waitForTimeout(1400);
  const after = await page.evaluate(() => ({
    closed: !washOverlay.classList.contains('show'),
    btnHidden: !washBtn.classList.contains('show'),
    previewClean: preview.innerHTML.includes('opacity:0')
  }));
  check('wash: overlay closes, button hides, truck gleams', after.closed && after.btnHidden && after.previewClean, JSON.stringify(after));

  check('no console errors', errors.length === 0, errors.join(' | ').slice(0, 300));

  await browser.close();
  const fails = results.filter(r => !r.ok);
  console.log(`\n${results.length - fails.length}/${results.length} passed`);
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
