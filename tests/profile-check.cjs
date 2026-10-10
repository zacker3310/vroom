const pw = require('playwright-core');
const os = require('os');
const fs = require('fs');
const EXE = process.env.CHROMIUM || os.homedir() + '/Library/Caches/ms-playwright/chromium-1117/chrome-mac/Chromium.app/Contents/MacOS/Chromium';
const URL = process.env.VROOM_URL || 'http://localhost:4173/index.html';
const SHOT = __dirname + '/shots/';
fs.mkdirSync(SHOT, { recursive: true });
/* jsQR is a TEST-ONLY dependency used to prove the hand-rolled encoder emits real QRs */
const JSQR_SRC = (() => {
  const paths = [__dirname + '/node_modules/jsqr/dist/jsQR.js', __dirname + '/../node_modules/jsqr/dist/jsQR.js'];
  try { paths.push(require.resolve('jsqr/dist/jsQR.js')); } catch (e) { /* not installed anywhere on the module path */ }
  for (const p of paths) if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
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
      return { text: decoded && decoded.data, expected: SAVE_URL_PREFIX + packCompact() };
    }, JSQR_SRC);
    qrOK = r.text && r.text === r.expected;
    qrDetail = r.text ? (qrOK ? 'decoded ' + r.text.length + ' chars, exact match' : 'MISMATCH') : 'decode failed';
  }
  check('qr: scan-to-open QR (URL + save) decodes byte-exact with jsQR', qrOK, qrDetail);

  /* multi-block regression: every version boundary v1-v10 decodes */
  if (JSQR_SRC) {
    const sweep = await page.evaluate(src => {
      eval(src);
      const decodeM = M => {
        const scale = 4, pad = 8;
        const cv = document.createElement('canvas');
        cv.width = cv.height = M.length * scale + pad * 2;
        const ctx = cv.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
        ctx.fillStyle = '#000';
        M.forEach((row, r2) => row.forEach((v, c) => { if (v) ctx.fillRect(c * scale + pad, r2 * scale + pad, scale, scale); }));
        const img = ctx.getImageData(0, 0, cv.width, cv.height);
        const d = jsQR(img.data, img.width, img.height);
        return d && d.data;
      };
      const bad = [];
      for (const n of [17, 32, 33, 53, 78, 106, 107, 134, 154, 155, 192, 230, 231, 271]) {
        const payload = Array.from({ length: n }, (_, i) => String.fromCharCode(65 + (i % 26))).join('');
        const M = qrEncode(payload);
        if (!M || decodeM(M) !== payload) bad.push(n);
      }
      if (qrEncode('x'.repeat(272)) !== null) bad.push('272-accepted');
      return bad;
    }, JSQR_SRC);
    check('qr: v1-v10 boundary sweep decodes, 272 rejects', sweep.length === 0, JSON.stringify(sweep));
  }

  /* ---- the in-app scanner (section 17b): headless Chromium has no camera, so the camera is a canvas stream and the
     detector a stub; the pure-JS decoder is exercised for real on QRs drawn by qrEncode ---- */
  const scanA = await page.evaluate(() => {
    const md = navigator.mediaDevices;
    const isFn = typeof canScanQR === 'function', withCam = canScanQR();
    Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
    const withoutCam = canScanQR();
    Object.defineProperty(navigator, 'mediaDevices', { value: md, configurable: true });
    return { isFn, withCam, withoutCam, bool: typeof withCam === 'boolean' && typeof withoutCam === 'boolean', restored: canScanQR() === withCam };
  });
  check('scan: canScanQR() is a boolean, true with a camera API on localhost, false without navigator.mediaDevices',
    scanA.isFn && scanA.bool && scanA.withCam === true && scanA.withoutCam === false && scanA.restored, JSON.stringify(scanA));

  /* a fake camera: a canvas stream showing the game's own QR; the detector stub reads it only once armed, long enough to screenshot the viewfinder */
  await page.evaluate(() => {
    const cv = document.createElement('canvas'); cv.width = 640; cv.height = 480;
    const c2 = cv.getContext('2d'); let f = 0;
    const qr = document.getElementById('qrCanvas');
    window.__scanPaint = setInterval(() => {
      f++;
      const g = c2.createLinearGradient(0, 0, 640, 480); g.addColorStop(0, '#9a8c7a'); g.addColorStop(1, '#5c5048');
      c2.fillStyle = g; c2.fillRect(0, 0, 640, 480);
      c2.fillStyle = '#fff'; c2.fillRect(190, 110, 260, 260);
      if (window.__scanShowQR) c2.drawImage(qr, 200 + Math.sin(f / 9) * 4, 120, 240, 240);
      else { c2.strokeStyle = '#6b5b4e'; c2.lineWidth = 14; c2.beginPath(); c2.moveTo(230, 300); c2.quadraticCurveTo(320, 120 + Math.sin(f / 7) * 30, 410, 300); c2.stroke(); }
    }, 40);
    window.__scanStopped = 0;
    window.__gum = navigator.mediaDevices.getUserMedia;
    window.__BD = window.BarcodeDetector;
    window.__scanExpected = SAVE_URL_PREFIX + packCompact();
    navigator.mediaDevices.getUserMedia = c => {   /* a fresh stream per call: the scanner stops its tracks when it closes */
      window.__scanConstraints = c;
      const stream = cv.captureStream(15);
      for (const t of stream.getTracks()) { const s = t.stop.bind(t); t.stop = () => { window.__scanStopped++; s(); }; }
      return Promise.resolve(stream);
    };
    window.__detects = 0; window.__scanArmed = false; window.__scanShowQR = false;   /* a scribble in view first, so the viewfinder stays up for the screenshot */
    window.BarcodeDetector = class { detect() { window.__detects++; return Promise.resolve(window.__scanArmed ? [{ rawValue: window.__scanExpected }] : []); } };
    window.__scanPromise = scanSaveQR();
  });
  await page.waitForTimeout(700);
  const scanUI = await page.evaluate(() => {
    const ov = document.getElementById('scanOverlay'), r = s => document.querySelector(s).getBoundingClientRect();
    const v = document.getElementById('scanVideo');
    return { shown: getComputedStyle(ov).display === 'flex', close: r('#scanCloseBtn'), pick: r('#scanPickBtn'), video: r('#scanVideo'),
      playing: v.readyState >= 2 && !v.paused, fit: getComputedStyle(v).objectFit, detects: window.__detects, facing: JSON.stringify(window.__scanConstraints.video.facingMode) };
  });
  await page.screenshot({ path: SHOT + 'p-scan.png' });
  check('scan: viewfinder shows the live stream (object-fit cover, rear camera asked for), frames are being read, cross and picker are 64px+ tap targets',
    scanUI.shown && scanUI.playing && scanUI.fit === 'cover' && scanUI.detects >= 2 && scanUI.facing.includes('environment')
    && scanUI.close.width >= 64 && scanUI.close.height >= 64 && scanUI.pick.width >= 64 && scanUI.pick.height >= 64 && scanUI.video.width > 400, JSON.stringify(scanUI));
  const scanB = await page.evaluate(async () => {
    window.__scanArmed = true;
    const text = await window.__scanPromise;
    await new Promise(r => setTimeout(r, 100));
    const ov = document.getElementById('scanOverlay');
    return { match: text === window.__scanExpected, removed: getComputedStyle(ov).display === 'none' && !ov.classList.contains('got'), stopped: window.__scanStopped, srcCleared: !document.getElementById('scanVideo').srcObject };
  });
  check('scan: a read QR resolves scanSaveQR() with the raw value, removes the overlay, stops every track', scanB.match && scanB.removed && scanB.stopped >= 1 && scanB.srcCleared, JSON.stringify(scanB));

  /* cancel: the cross resolves null and tears down */
  const scanC = await page.evaluate(async () => {
    window.__scanArmed = false; window.__scanStopped = 0;
    const p = scanSaveQR();
    await new Promise(r => setTimeout(r, 200));
    const shown = getComputedStyle(scanOverlay).display === 'flex';
    scanCloseBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    const text = await p;
    return { shown, nul: text === null, removed: getComputedStyle(scanOverlay).display === 'none', stopped: window.__scanStopped };
  });
  check('scan: the cross resolves null, overlay gone, tracks stopped', scanC.shown && scanC.nul && scanC.removed && scanC.stopped >= 1, JSON.stringify(scanC));

  /* the pure-JS decoder on live video: no BarcodeDetector at all, the QR comes into view, the frame loop reads it */
  const scanL = await page.evaluate(async () => {
    window.BarcodeDetector = undefined; window.__scanStopped = 0;
    const p = scanSaveQR();
    await new Promise(r => setTimeout(r, 300));
    const stillOpen = getComputedStyle(scanOverlay).display === 'flex';   /* a scribble is not a QR */
    window.__scanShowQR = true;
    const t0 = Date.now();
    const text = await Promise.race([p, new Promise(r => setTimeout(() => r('timeout'), 4000))]);
    const ms = Date.now() - t0;
    if (text === 'timeout') scanCloseBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await new Promise(r => setTimeout(r, 100));
    return { stillOpen, match: text === window.__scanExpected, ms, removed: getComputedStyle(scanOverlay).display === 'none', stopped: window.__scanStopped };
  });
  check('scan: with no BarcodeDetector the pure-JS decoder reads the QR off the live video within a second or two', scanL.stillOpen && scanL.match && scanL.ms < 2500 && scanL.removed && scanL.stopped >= 1, JSON.stringify(scanL));

  /* a refused camera: deny-shake, the viewfinder stays in picture mode; the picker then feeds a PNG of the game's own QR through the pure-JS decoder */
  const scanD = await page.evaluate(async () => {
    navigator.mediaDevices.getUserMedia = () => Promise.reject(Object.assign(new Error('nope'), { name: 'NotAllowedError' }));
    const p = scanSaveQR();
    await new Promise(r => setTimeout(r, 200));
    const denied = scanOverlay.classList.contains('deny'), noCam = scanOverlay.classList.contains('noCam'), open = getComputedStyle(scanOverlay).display === 'flex';
    const blob = await new Promise(r => document.getElementById('qrCanvas').toBlob(r, 'image/png'));
    const dt = new DataTransfer(); dt.items.add(new File([blob], 'qr.png', { type: 'image/png' }));
    const input = document.getElementById('scanPick'); input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true }));
    const text = await p;
    return { denied, noCam, open, match: text === window.__scanExpected, removed: getComputedStyle(scanOverlay).display === 'none' };
  });
  check('scan: refused camera shakes + stays open in picture mode; a picked PNG of the QR decodes with the pure-JS decoder', scanD.denied && scanD.noCam && scanD.open && scanD.match && scanD.removed, JSON.stringify(scanD));

  /* the decoder alone: qrEncode output drawn to a canvas at several sizes, all four rotations, and inside a camera-sized frame */
  const scanE = await page.evaluate(() => {
    clearInterval(window.__scanPaint);
    navigator.mediaDevices.getUserMedia = window.__gum; window.BarcodeDetector = window.__BD;
    const draw = (M, scale, rot, W, H) => {
      const cv = document.createElement('canvas'); cv.width = W || M.length * scale + 24; cv.height = H || cv.width;
      const ctx = cv.getContext('2d'); ctx.fillStyle = '#ddd'; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.save(); ctx.translate(cv.width / 2, cv.height / 2); ctx.rotate(rot * Math.PI / 2);
      const n = M.length * scale, o = -n / 2;
      ctx.fillStyle = '#fff'; ctx.fillRect(o - 8, o - 8, n + 16, n + 16); ctx.fillStyle = '#111';
      M.forEach((row, r) => row.forEach((v, c) => { if (v) ctx.fillRect(o + c * scale, o + r * scale, scale, scale); }));
      ctx.restore();
      return qrDecodeImage(ctx.getImageData(0, 0, cv.width, cv.height));
    };
    const bad = [];
    const texts = { 1: 'VROOM1.abc', 5: SAVE_URL_PREFIX + 'A'.repeat(60), 10: SAVE_URL_PREFIX + 'Bq'.repeat(100) };
    for (const [v, text] of Object.entries(texts)) {
      const M = qrEncode(text);
      if ((M.length - 17) / 4 !== Number(v)) bad.push('v' + v + ' size');
      for (const scale of [3, 5, 9]) if (draw(M, scale, 0) !== text) bad.push('v' + v + ' x' + scale);
      for (const rot of [1, 2, 3]) if (draw(M, 4, rot) !== text) bad.push('v' + v + ' rot' + rot * 90);
      if (draw(M, 4, 0, 640, 480) !== text) bad.push('v' + v + ' frame');
    }
    if (qrDecodeImage(new ImageData(320, 240)) !== null) bad.push('blank');
    return bad;
  });
  check('scan: pure-JS decoder round-trips qrEncode at v1, v5, v10, three scales, 90/180/270 degrees, inside a 640x480 frame; blank frame is null', scanE.length === 0, JSON.stringify(scanE));

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

  /* ---- delete a profile: a trash badge on every used slot, a hold-to-erase card (parents only: a tap does nothing) ---- */
  const p0Json = await page.evaluate(() => localStorage.getItem('vroom.v2.p0'));   /* put back after the deletes so the import checks below see the same kid */
  await tap('#profileBtn');
  await page.waitForTimeout(200);
  const badges = await page.evaluate(() => {
    const cells = [...document.querySelectorAll('.profileCell')];
    const r = document.querySelector('.slotTrash').getBoundingClientRect();
    return { cells: cells.length, used: cells.filter(c => !c.querySelector('.profileSlot.empty')).length,
      badged: cells.map(c => !!c.querySelector('.slotTrash')), size: Math.min(r.width, r.height) };
  });
  check('delete: used slots carry a trash badge (64px+), the empty slot does not', badges.cells === 3 && badges.used === 2 && badges.badged.join() === 'true,true,false' && badges.size >= 64, JSON.stringify(badges));

  /* a short tap on the hold button changes nothing */
  await page.evaluate(() => document.querySelectorAll('.slotTrash')[1].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
  await page.waitForTimeout(300);
  const card = await page.evaluate(() => ({ show: deleteConfirm.classList.contains('show'), target: deleteTarget,
    stars: document.getElementById('deleteStars').textContent.trim(), flags: document.getElementById('deleteFlags').textContent.trim() }));
  const holdBox = await page.locator('#deleteHold').boundingBox();
  await page.mouse.move(holdBox.x + holdBox.width / 2, holdBox.y + holdBox.height / 2);
  await page.mouse.down(); await page.waitForTimeout(300); await page.mouse.up();
  await page.waitForTimeout(1200);
  const tapped = await page.evaluate(() => ({ show: deleteConfirm.classList.contains('show'), holding: deleteHold.classList.contains('holding'),
    p1: !!localStorage.getItem('vroom.v2.p1'), avatar: meta.avatars[1], timer: deleteHoldT }));
  check('delete: the card shows the slot (0 stars, 0 flags); a short tap on hold-to-erase keeps the save and the card', card.show && card.target === 1 && card.stars === '0' && card.flags === '0'
    && tapped.show && !tapped.holding && tapped.p1 && !!tapped.avatar && tapped.timer === null, JSON.stringify({ card, tapped }));

  /* holding through the ring erases the OTHER kid; the active kid is untouched */
  await page.mouse.down(); await page.waitForTimeout(1500); await page.mouse.up();
  await page.waitForTimeout(400);
  const gone = await page.evaluate(() => ({ show: deleteConfirm.classList.contains('show'), overlay: profileOverlay.classList.contains('show'),
    p1: localStorage.getItem('vroom.v2.p1'), avatar: meta.avatars[1], metaStored: JSON.parse(localStorage.getItem('vroom.meta')).avatars[1],
    empty: document.querySelectorAll('.profileSlot')[1].classList.contains('empty'), badges: document.querySelectorAll('.slotTrash').length,
    active: meta.active, wallet: progress.wallet, p0: JSON.parse(localStorage.getItem('vroom.v2.p0')).wallet }));
  check('delete: a full hold erases the other kid (key gone, slot shows the plus, one badge left); the active kid is untouched', !gone.show && gone.overlay && gone.p1 === null && gone.avatar === null && gone.metaStored === null
    && gone.empty && gone.badges === 1 && gone.active === 0 && gone.wallet === 77 && gone.p0 === 77, JSON.stringify(gone));

  /* deleting the ACTIVE kid hops to the lowest remaining one and reloads into the garage */
  await page.evaluate(() => {
    localStorage.setItem('vroom.v2.p2', JSON.stringify({ build: { body: 'dump', wheels: 'normal', color: '#fdd835', extras: {} }, wallet: 33,
      owned: { body: [], wheels: [], color: [], extras: [], buddy: [], decal: [] }, levels: { 1: { best: 2, rating: 1 } }, current: 2 }));
    meta.avatars[2] = 'ducky'; saveMeta();
    profileOverlay.classList.remove('show');
  });
  await tap('#profileBtn');
  await page.waitForTimeout(200);
  await page.evaluate(() => document.querySelectorAll('.slotTrash')[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
  await page.waitForTimeout(300);
  const activeCard = await page.evaluate(() => ({ target: deleteTarget, stars: document.getElementById('deleteStars').textContent.trim() }));
  const holdBox2 = await page.locator('#deleteHold').boundingBox();
  await page.mouse.move(holdBox2.x + holdBox2.width / 2, holdBox2.y + holdBox2.height / 2);
  await page.mouse.down(); await page.waitForTimeout(1500); await page.mouse.up().catch(() => {});
  await page.waitForTimeout(900);   /* erase + reload */
  const hopped = await page.evaluate(() => ({ active: meta.active, avatars: meta.avatars.slice(), wallet: progress.wallet, p0: localStorage.getItem('vroom.v2.p0'),
    p2: !!localStorage.getItem('vroom.v2.p2'), scene: [...document.querySelectorAll('.scene.active')].map(x => x.id).join(',') }));
  check('delete: erasing the active kid switches to the other one and reloads into the garage with that wallet', activeCard.target === 0 && activeCard.stars === '77'
    && hopped.active === 2 && hopped.avatars.join() === ',,ducky' && hopped.wallet === 33 && hopped.p0 === null && hopped.p2 && hopped.scene === 'garage', JSON.stringify({ activeCard, hopped }));

  /* deleting the last kid resets to a fresh default save on slot 0 */
  await tap('#profileBtn');
  await page.waitForTimeout(200);
  const lastBadges = await page.evaluate(() => document.querySelectorAll('.slotTrash').length);
  await page.evaluate(() => document.querySelector('.slotTrash').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
  await page.waitForTimeout(300);
  const holdBox3 = await page.locator('#deleteHold').boundingBox();
  await page.mouse.move(holdBox3.x + holdBox3.width / 2, holdBox3.y + holdBox3.height / 2);
  await page.mouse.down(); await page.waitForTimeout(1500); await page.mouse.up().catch(() => {});
  await page.waitForTimeout(900);
  const fresh2 = await page.evaluate(() => ({ active: meta.active, avatars: meta.avatars.slice(), wallet: progress.wallet, body: state.body, levels: Object.keys(progress.levels).length,
    keys: Object.keys(localStorage).filter(k => k.startsWith('vroom.v2.p')).join(','), scene: [...document.querySelectorAll('.scene.active')].map(x => x.id).join(',') }));
  check('delete: erasing the last kid restarts slot 0 fresh (pup, 0 stars, default truck) in the garage', lastBadges === 1 && fresh2.active === 0 && fresh2.avatars.join() === 'pup,,'
    && fresh2.wallet === 0 && fresh2.body === 'dump' && fresh2.levels === 0 && fresh2.keys === '' && fresh2.scene === 'garage', JSON.stringify({ lastBadges, fresh2 }));

  /* put the first kid back for the import checks */
  await page.evaluate(j => { localStorage.setItem('vroom.v2.p0', j); profileOverlay.classList.remove('show'); }, p0Json);
  await page.reload();
  await page.waitForTimeout(700);

  /* ---- the receiver sheet: one button on the RECEIVE half opens it; it offers the clipboard, the paste box,
     and the camera scan only when the scanner section answers canScanQR(); a scan that resolves to a code
     feeds the same import flow, a dismissed scan (null) leaves the sheet up ---- */
  await tap('#profileBtn');
  await page.waitForTimeout(200);
  await page.evaluate(() => { window.__canScan = canScanQR; window.canScanQR = () => false; });   /* no scanner: the scan button must hide */
  await tap('#receiveBtn');
  await page.waitForTimeout(200);
  const sheet1 = await page.evaluate(() => ({
    shown: receiveSheet.classList.contains('show'), clip: !clipBtn.hidden, scanHidden: scanBtn.hidden,
    big: Math.min(receiveBtn.getBoundingClientRect().width, clipBtn.getBoundingClientRect().width, pasteBox.getBoundingClientRect().height) >= 64
  }));
  await tap('#receiveClose');
  await page.evaluate(() => { window.__scan = scanSaveQR; window.canScanQR = () => true; window.scanSaveQR = () => Promise.resolve(null); });
  await tap('#receiveBtn');
  await page.waitForTimeout(100);
  const sheet2 = await page.evaluate(() => ({ closed1: true, scanShown: !scanBtn.hidden }));
  await tap('#scanBtn');
  await page.waitForTimeout(200);
  const scanCancel = await page.evaluate(() => ({ sheet: receiveSheet.classList.contains('show'), confirm: document.getElementById('importConfirm').classList.contains('show') }));
  await page.evaluate(() => { window.scanSaveQR = () => Promise.resolve(SAVE_URL_PREFIX + packCompact()); });
  await tap('#scanBtn');
  await page.waitForTimeout(300);
  const scanned = await page.evaluate(() => ({
    sheet: receiveSheet.classList.contains('show'), overlay: profileOverlay.classList.contains('show'),
    confirm: document.getElementById('importConfirm').classList.contains('show'), pending: !!pendingImport
  }));
  await tap('#importNo');
  await page.evaluate(() => { delete window.canScanQR; delete window.scanSaveQR; });
  await page.evaluate(() => { window.canScanQR = window.__canScan; window.scanSaveQR = window.__scan; });   /* the real scanner back for its own checks */
  check('receive: the sheet opens with clipboard + paste box (scan only when canScanQR says so); a cancelled scan keeps the sheet, a scanned URL raises the preview',
    sheet1.shown && sheet1.clip && sheet1.scanHidden && sheet1.big && sheet2.scanShown && scanCancel.sheet && !scanCancel.confirm
    && !scanned.sheet && !scanned.overlay && scanned.confirm && scanned.pending, JSON.stringify({ sheet1, sheet2, scanCancel, scanned }));

  /* ---- the paste box: a code wrapped in message text lands through a paste event ---- */
  await tap('#profileBtn');
  await page.waitForTimeout(200);
  await tap('#receiveBtn');
  await page.waitForTimeout(100);
  await page.evaluate(() => {
    const dt = new DataTransfer(); dt.setData('text', 'look at my car!! ' + packCompact() + ' (sent from Vroom)');
    pasteTarget.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true }));
  });
  await page.waitForTimeout(300);
  const pasted = await page.evaluate(() => ({
    sheet: receiveSheet.classList.contains('show'), overlay: profileOverlay.classList.contains('show'),
    confirm: document.getElementById('importConfirm').classList.contains('show'), box: pasteTarget.value
  }));
  check('receive: the paste box imports a wrapped code (sheet + panel close, preview up)', !pasted.sheet && !pasted.overlay && pasted.confirm && pasted.box === '', JSON.stringify(pasted));

  /* ---- the preview card: the incoming car, its stars and beaten levels, no warning when it brings as much
     as the profile has; the triangle when the profile here has beaten MORE; the avatar from a full code ---- */
  const prev1 = await page.evaluate(() => ({
    car: !!document.querySelector('#importCar svg'), stars: document.getElementById('importStars').textContent.trim(),
    levels: document.getElementById('importLevels').textContent.trim(), warn: document.getElementById('importWarn').classList.contains('show'),
    avatar: document.getElementById('importAvatar').innerHTML === ''
  }));
  await tap('#importNo');
  const prev2 = await page.evaluate(async () => {
    const code = packCompact();                                   /* one beaten level */
    progress.levels[2] = { best: 2, rating: 1, tier: 'B' }; progress.levels[3] = { best: 2, rating: 1, tier: 'B' }; save();
    const ok = await importSaveCode(code);                        /* the profile now has three: the triangle shows */
    const warn = document.getElementById('importWarn').classList.contains('show');
    document.getElementById('importNo').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    const full = await exportFullCode();                          /* a full code carries the kid's avatar */
    const ok2 = await importSaveCode(full);
    const avatar = !!document.querySelector('#importAvatar svg');
    const warn2 = document.getElementById('importWarn').classList.contains('show');
    document.getElementById('importNo').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    delete progress.levels[2]; delete progress.levels[3]; save();
    return { ok, warn, ok2, avatar, warn2 };
  });
  check('preview: the card shows the incoming car, 77 stars, 1 flag; the warning triangle only when the profile here has beaten more levels; the avatar rides in a full code',
    prev1.car && prev1.stars === '77' && prev1.levels === '1' && !prev1.warn && prev1.avatar && prev2.ok && prev2.warn && prev2.ok2 && prev2.avatar && !prev2.warn2,
    JSON.stringify({ prev1, prev2 }));

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
  const applied = await page.evaluate(() => ({ wallet: progress.wallet, dino: progress.owned.buddy.includes('dino'), welcome: welcomeShown, flag: sessionStorage.getItem('vroom.welcome'), garage: garageScene.classList.contains('active') }));
  check('import: accepted code restores wallet + buddies', applied.wallet === 77 && applied.dino, JSON.stringify(applied));
  check('import: the welcome pop fires once in the garage after a confirmed import', applied.welcome === true && applied.flag === null && applied.garage, JSON.stringify(applied));

  /* garbage code is rejected without the overlay */
  const garbage = await page.evaluate(async () => {
    const ok = await importSaveCode('VROOM1.!!!notbase64!!!');
    const ok2 = await importSaveCode('hello');
    const ok3 = await importSaveCode('VROOM1.' + b64url.enc(new Uint8Array([1, 2, 3])));   /* truncated: valid version byte, short payload */
    return { ok, ok2, ok3, confirm: document.getElementById('importConfirm').classList.contains('show'), shake: receiveBtn.classList.contains('deny') };
  });
  check('import: garbage + truncated codes rejected, no overlay, the receive button shakes', !garbage.ok && !garbage.ok2 && !garbage.ok3 && !garbage.confirm && garbage.shake, JSON.stringify(garbage));

  /* ---- the export button (13.4.1): on a touch device or a home-screen app the code goes out through the share
     sheet, elsewhere through the clipboard, both asked for synchronously inside the tap (iOS drops a clipboard or
     share call made after an await); the button shows its check either way; a wrapped code pastes back ---- */
  const exp = await page.evaluate(async () => {
    const btn = document.getElementById('copyCodeBtn');
    const calls = { share: [], clip: [] };
    Object.defineProperty(navigator, 'standalone', { value: true, configurable: true });   /* a home-screen app */
    navigator.share = d => { calls.share.push(d); return Promise.resolve(); };
    const w = navigator.clipboard.writeText;
    navigator.clipboard.writeText = t => { calls.clip.push(t); return Promise.resolve(); };
    cachedCode = '';   /* nothing pre-built: the sync code must serve */
    const t1 = await sendSaveCode();
    const sent1 = btn.classList.contains('sent');
    navigator.share = () => Promise.reject(Object.assign(new Error('x'), { name: 'AbortError' }));
    const t2 = await sendSaveCode();   /* the sheet dismissed: no clipboard fallback, no deny */
    delete navigator.share;
    Object.defineProperty(navigator, 'standalone', { value: undefined, configurable: true });
    const t3 = await sendSaveCode();   /* a desktop: the clipboard */
    navigator.clipboard.writeText = w;
    const wrapped = await decodeSaveCode('look at my car!! ' + calls.share[0].text + ' (sent from Vroom)');
    return { t1, t2, t3, shared: calls.share.length, sharedPrefix: (calls.share[0].text || '').slice(0, 7), sharedUrl: calls.share[0].url === SAVE_URL_PREFIX + calls.share[0].text, sent1, clip: calls.clip.length, clipPrefix: (calls.clip[0] || '').slice(0, 7), wrapped: !!(wrapped && wrapped.owned), synced: exportCodeSync().startsWith('VROOM3.') };
  });
  check('export: share sheet on a home-screen app (code built in the tap, the hosted link + the code), a dismissed sheet is not a failure, clipboard on a desktop, the check shows, a code pasted back inside other text still decodes',
    exp.t1 === 'share' && exp.t2 === 'cancel' && exp.t3 === 'clipboard' && exp.shared === 1 && exp.sharedPrefix === 'VROOM3.' && exp.sharedUrl && exp.sent1 && exp.clip === 1 && exp.clipPrefix === 'VROOM3.' && exp.wrapped && exp.synced, JSON.stringify(exp));

  /* ---- hash import: scanning a QR that opened the hosted game ---- */
  const hashCode = await page.evaluate(() => packCompact());
  await page.goto('about:blank');   /* a scanned QR opens a fresh page, not a same-document hash hop */
  await page.goto(URL + '#save=' + encodeURIComponent(hashCode));
  await page.waitForTimeout(500);
  const hashImp = await page.evaluate(() => ({
    confirm: document.getElementById('importConfirm').classList.contains('show'),
    hashCleared: !location.hash, car: !!document.querySelector('#importCar svg')
  }));
  check('import: #save= URL offers the confirm (with the preview) on boot', hashImp.confirm && hashImp.hashCleared && hashImp.car, JSON.stringify(hashImp));

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
