const pw = require('playwright-core');
const os = require('os');
const fs = require('fs');
const EXE = os.homedir() + '/Library/Caches/ms-playwright/chromium-1117/chrome-mac/Chromium.app/Contents/MacOS/Chromium';
const URL = 'http://localhost:4173/index.html';
const SHOT = __dirname + '/shots/';
fs.mkdirSync(SHOT, { recursive: true });
/* jsQR is a TEST-ONLY dependency used to prove the hand-rolled encoder emits real QRs */
const JSQR_SRC = (() => {
  for (const p of [__dirname + '/node_modules/jsqr/dist/jsQR.js',
                   '/private/tmp/claude-501/-Users-zacker-Documents-dev-vroom/ece5a294-0b4b-45a6-aba6-879f1850b067/scratchpad/node_modules/jsqr/dist/jsQR.js']) {
    if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
  }
  return null;
})();

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

  /* ---- migration: legacy single-profile save becomes profile 0 ---- */
  await page.evaluate(() => {
    localStorage.setItem('vroom.v2', JSON.stringify({
      build: { body: 'fire', wheels: 'monster', color: '#43a047', extras: {} },
      wallet: 77, owned: { body: [], wheels: [], color: [], extras: [], buddy: ['dino'] },
      levels: { 1: { best: 3, rating: 2, tier: 'A', bestTime: 8 } }, current: 2,
      damage: 1, upgrades: { engine: 1, armor: 0, magnet: 0 }, badges: ['jump'], photos: []
    }));
  });
  await page.reload();
  await page.waitForTimeout(400);
  const mig = await page.evaluate(() => ({
    p0: !!localStorage.getItem('vroom.v2.p0'), old: !!localStorage.getItem('vroom.v2'),
    wallet: progress.wallet, active: meta.active, avatar: meta.avatars[0]
  }));
  check('profiles: legacy save migrates to p0 and loads', mig.p0 && !mig.old && mig.wallet === 77 && mig.active === 0 && mig.avatar === 'pup', JSON.stringify(mig));

  /* ---- overlay: 1 filled + 2 empty; new profile switch ---- */
  await tap('#profileBtn');
  await page.waitForTimeout(200);
  const overlay = await page.evaluate(() => ({
    shown: profileOverlay.classList.contains('show'),
    slots: document.querySelectorAll('.profileSlot').length,
    empty: document.querySelectorAll('.profileSlot.empty').length,
    active: document.querySelectorAll('.profileSlot.activeP').length,
    qr: document.getElementById('qrCanvas').width > 50
  }));
  check('profiles: overlay shows 3 slots (2 empty), active ring, QR rendered', overlay.shown && overlay.slots === 3 && overlay.empty === 2 && overlay.active === 1 && overlay.qr, JSON.stringify(overlay));
  await page.screenshot({ path: SHOT + 'p-overlay.png' });

  /* ---- QR decodes with a real decoder to the compact code ---- */
  let qrOK = false, qrDetail = 'jsQR unavailable';
  if (JSQR_SRC) {
    const r = await page.evaluate(src => {
      eval(src);   /* defines global jsQR in page context */
      const canvas = document.getElementById('qrCanvas');
      const ctx = canvas.getContext('2d');
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const decoded = jsQR(img.data, img.width, img.height);
      return { text: decoded && decoded.data, expected: packCompact() };
    }, JSQR_SRC);
    qrOK = r.text && r.text === r.expected;
    qrDetail = r.text ? (qrOK ? 'decoded ' + r.text.length + ' chars, exact match' : 'MISMATCH') : 'decode failed';
  }
  check('qr: hand-rolled QR decodes byte-exact with jsQR', qrOK, qrDetail);

  /* ---- compact code round-trip fidelity ---- */
  const compact = await page.evaluate(async () => {
    const code = packCompact();
    const d = await decodeSaveCode(code);
    return {
      wallet: d.wallet === progress.wallet, current: d.current === progress.current,
      dino: d.owned.buddy.includes('dino'), badge: d.badges.includes('jump'),
      lvl1: d.levels[1] && d.levels[1].rating === 2 && d.levels[1].tier === 'A',
      engine: d.upgrades.engine === 1, damage: d.damage === 1
    };
  });
  check('codec: compact code round-trips every field', Object.values(compact).every(Boolean), JSON.stringify(compact));

  /* ---- full code round-trip incl photos ---- */
  const full = await page.evaluate(async () => {
    progress.photos = [{ b: JSON.parse(JSON.stringify(state)), n: 1, t: 'A', s: 3 }];
    save();
    const code = await exportFullCode();
    const d = await decodeSaveCode(code);
    return { prefix: code.slice(0, 7), photos: d.photos.length === 1, bestTime: d.levels[1].bestTime === 8, wallet: d.wallet === 77 };
  });
  check('codec: full code keeps photos + best times', (full.prefix === 'VROOM2.' || full.prefix === 'VROOM3.') && full.photos && full.bestTime && full.wallet, JSON.stringify(full));

  /* ---- new profile: fresh world, then switch back restores ---- */
  await page.evaluate(() => {
    document.querySelectorAll('.profileSlot')[1].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  });
  await page.waitForTimeout(700);   /* switch triggers reload */
  const fresh = await page.evaluate(() => ({ active: meta.active, wallet: progress.wallet, avatar: meta.avatars[1] }));
  check('profiles: new profile starts fresh with its own avatar', fresh.active === 1 && fresh.wallet === 0 && !!fresh.avatar && fresh.avatar !== 'pup', JSON.stringify(fresh));

  await tap('#profileBtn');
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    document.querySelectorAll('.profileSlot')[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  });
  await page.waitForTimeout(700);
  const back = await page.evaluate(() => ({ active: meta.active, wallet: progress.wallet, body: state.body }));
  check('profiles: switching back restores the first kid intact', back.active === 0 && back.wallet === 77 && back.body === 'fire', JSON.stringify(back));

  /* ---- import applies via confirm ---- */
  const imp = await page.evaluate(async () => {
    const code = packCompact();       /* snapshot of profile 0 */
    /* hop to profile 2 context manually: just import over the CURRENT profile after zeroing */
    progress.wallet = 0; save();
    await importSaveCode(code);
    return { confirm: document.getElementById('importConfirm').classList.contains('show') };
  });
  check('import: valid code raises the confirm overlay', imp.confirm);
  await page.evaluate(() => document.getElementById('importYes').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
  await page.waitForTimeout(700);   /* applies + reloads */
  const applied = await page.evaluate(() => ({ wallet: progress.wallet, dino: progress.owned.buddy.includes('dino') }));
  check('import: accepted code restores wallet + buddies', applied.wallet === 77 && applied.dino, JSON.stringify(applied));

  /* garbage code is rejected without the overlay */
  const garbage = await page.evaluate(async () => {
    const ok = await importSaveCode('VROOM1.!!!notbase64!!!');
    const ok2 = await importSaveCode('hello');
    const ok3 = await importSaveCode('VROOM1.' + b64url.enc(new Uint8Array([1, 2, 3])));   /* truncated: valid version byte, short payload */
    return { ok, ok2, ok3, confirm: document.getElementById('importConfirm').classList.contains('show') };
  });
  check('import: garbage + truncated codes rejected, no overlay', !garbage.ok && !garbage.ok2 && !garbage.ok3 && !garbage.confirm, JSON.stringify(garbage));

  /* ---- hash import: scanning a QR that opened the hosted game ---- */
  const hashCode = await page.evaluate(() => packCompact());
  await page.goto('about:blank');   /* a scanned QR opens a fresh page, not a same-document hash hop */
  await page.goto(URL + '#save=' + encodeURIComponent(hashCode));
  await page.waitForTimeout(500);
  const hashImp = await page.evaluate(() => ({
    confirm: document.getElementById('importConfirm').classList.contains('show'),
    hashCleared: !location.hash
  }));
  check('import: #save= URL offers the confirm on boot', hashImp.confirm && hashImp.hashCleared, JSON.stringify(hashImp));

  /* a mangled %-escape in the hash must not halt boot (listeners after the import block still attach) */
  await page.goto('about:blank');
  await page.goto(URL + '#save=%ZZ');
  await page.waitForTimeout(400);
  const badHash = await page.evaluate(() => ({
    confirm: document.getElementById('importConfirm').classList.contains('show'),
    hashCleared: !location.hash
  }));
  check('import: malformed #save= boots clean, no confirm, hash cleared', !badHash.confirm && badHash.hashCleared, JSON.stringify(badHash) + ' (URIError would also trip the console check)');

  check('no console errors', errors.length === 0, errors.join(' | ').slice(0, 300));

  await browser.close();
  const fails = results.filter(r => !r.ok);
  console.log(`\n${results.length - fails.length}/${results.length} passed`);
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
