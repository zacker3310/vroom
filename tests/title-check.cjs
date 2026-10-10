/* title-check: the start screen + the daily gift (v12.5, T17.2).
   The page boots into a wordless title scene (emblem, the kid's car idling, one huge GO) unless opened with
   `?garage` (what run-all hands every other suite) or localStorage "vroom.skipTitle" is set. Once per local
   calendar day a gift capsule hangs on the garage wall above the dice: it pays 15..40 stars or, now and then,
   a buddy the kid does not own yet; `progress.lastGift` (localStorage only, never in a save code) remembers the day,
   and the title's GO button wears a pulsing capsule badge while today's gift is unclaimed. */
const pw = require('playwright-core');
const os = require('os');
const EXE = process.env.CHROMIUM || os.homedir() + '/Library/Caches/ms-playwright/chromium-1117/chrome-mac/Chromium.app/Contents/MacOS/Chromium';
/* this suite wants the title, so it drops the `?garage` the runner appends for everyone else */
const URL = (process.env.VROOM_URL || 'http://localhost:4173/index.html').replace(/[?&]garage\b/, '');
const SHOT = __dirname + '/shots/';
require('fs').mkdirSync(SHOT, { recursive: true });

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok });
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (detail ? '  -- ' + detail : ''));
}
const tap = (page, id) => page.evaluate(i => document.getElementById(i).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 9 })), id);
const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

(async () => {
  const browser = await pw.chromium.launch({ executablePath: EXE });
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));

  await page.goto(URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(2200);   /* the entrance choreography (badge slam, car drive-in, GO pop at 1.4 s) has settled */

  /* ---- 1. boot: the title is the only active scene; GO >= 180 stage px; the car and emblem are there; zero text ---- */
  const boot = await page.evaluate(() => {
    const r = id => document.getElementById(id).getBoundingClientRect();
    const walker = document.createTreeWalker(document.getElementById('title'), NodeFilter.SHOW_TEXT);
    const words = []; let n; while ((n = walker.nextNode())) if (/[A-Za-z0-9]/.test(n.nodeValue)) words.push(n.nodeValue.trim().slice(0, 20));
    const go = r('titleGo'), car = r('titleCar'), logo = r('titleLogo'), prof = r('titleProfileBtn');
    return { active: [...document.querySelectorAll('.scene.active')].map(s => s.id).join(','), go: Math.min(go.width, go.height),
      car: car.width > 300 && !!document.querySelector('#titleCar svg'), idle: titleCar.classList.contains('idle'),
      logo: logo.width > 200 && !!document.querySelector('#titleLogo svg'), words, prof: Math.min(prof.width, prof.height),
      buddyBob: !!document.querySelector('#titleCar .buddyBob') || !state.buddy };
  });
  check('boot: the title scene is the active scene, GO >= 153px rendered, car + emblem drawn, avatar >= 64px', boot.active === 'title' && boot.go >= 153 && boot.car && boot.logo && boot.idle && boot.prof >= 64, JSON.stringify(boot));
  check('boot: zero text on the title (no letters or numerals)', boot.words.length === 0, boot.words.join(' | '));
  await page.screenshot({ path: SHOT + 'title-boot.png' });

  /* ---- 1b. the moving world (v13.10): once the entrance is over, the tree line, road dashes, sun rays, glint,
     wheels and GO all run on CSS keyframes; the car has driven in (no translate left on it); the shadow sits
     on the tire line. The title's own update gate is there, hidden, and >= 64 px once shown. ---- */
  await page.waitForTimeout(600);
  const world = await page.evaluate(() => {
    const an = el => el ? getComputedStyle(el).animationName : 'missing';
    const car = titleCar.getBoundingClientRect(), st = document.getElementById('stage').getBoundingClientRect(), s = st.width / 1200;
    const wheel = titleCar.querySelector('.wheelrot');
    const ground = parseFloat(titleCar.style.getPropertyValue('--tGround'));
    const shadow = titleCar.querySelector('.tShadow').getBoundingClientRect();
    /* the wheel group's rect wobbles as it turns (spokes, treads): read it at rest, as placeTitleGround did */
    if (wheel) wheel.style.animation = 'none';
    const wheelBottom = wheel ? wheel.getBoundingClientRect().bottom : car.bottom;
    if (wheel) wheel.style.animation = '';
    const gate = document.getElementById('titleUpdateBtn'), gateHidden = getComputedStyle(gate).display === 'none';
    gate.classList.add('show'); const gr = gate.getBoundingClientRect(); gate.classList.remove('show');
    return { trees: an(document.getElementById('tTrees')), dash: an(document.getElementById('tDash')), rays: an(document.querySelector('#tSun .rays')),
      glint: an(document.querySelector('#titleLogo .glint')), wheel: wheel ? an(wheel) : 'tWheel', go: an(titleGo), carX: Math.round((car.left - st.left) / s),
      ground, shadowGap: Math.round(((shadow.top + shadow.height / 2) - wheelBottom) / s), shadowOnTires: Math.abs((shadow.top + shadow.height / 2) - wheelBottom) / s < 12, layers: document.querySelectorAll('#title .tLayer svg').length,
      gateHidden, gate: Math.min(gr.width, gr.height) / s };
  });
  check('world: trees, dashes, sun rays, glint, wheels and GO animate; the car has arrived at x=330; 10 tile svgs', world.trees === 'tScroll' && world.dash === 'tDash' && world.rays === 'spin' && world.glint === 'tGlint' && world.wheel === 'tWheel' && /tGoPulse/.test(world.go) && world.carX === 330 && world.layers === 10, JSON.stringify(world));
  check('world: the shadow sits on the tire line (--tGround measured)', world.ground > 0 && world.shadowOnTires, JSON.stringify({ ground: world.ground, gap: world.shadowGap, on: world.shadowOnTires }));
  check('gate: the title carries its own update gate, hidden until a new version is found, >= 76 stage px when shown', world.gateHidden && world.gate >= 76, JSON.stringify({ hidden: world.gateHidden, size: world.gate }));

  /* ---- 2. GO badge: a fresh save has today's gift unclaimed, so the capsule badge pulses on GO ---- */
  const badge = await page.evaluate(() => ({ show: titleGift.classList.contains('show'), display: getComputedStyle(titleGift).display,
    anim: getComputedStyle(titleGift).animationName, svg: !!titleGift.querySelector('svg') }));
  check('badge: GO wears the pulsing gift badge while the gift is unclaimed', badge.show && badge.display !== 'none' && badge.anim === 'pulse' && badge.svg, JSON.stringify(badge));

  /* ---- 3. the car honks on a tap (a wrong body id would throw, and the bounce restarts) ---- */
  const honk = await page.evaluate(() => { let threw = false; try { titleCar.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 9 })); } catch (e) { threw = true; }
    return { threw, bounce: titleCar.classList.contains('bounce'), still: document.getElementById('title').classList.contains('active') }; });
  check('car: a tap honks and bounces, stays on the title', !honk.threw && honk.bounce && honk.still, JSON.stringify(honk));

  /* ---- 4. GO -> garage, gift capsule on the wall above the map (88px, centred on x=1086, top 192: one 16px rhythm with map and GO) ---- */
  await tap(page, 'titleGo');
  await page.waitForTimeout(500);
  const garage = await page.evaluate(() => {
    const st = document.getElementById('stage').getBoundingClientRect(), s = st.width / 1200;
    const anim = getComputedStyle(giftBtn).animationName;
    giftBtn.style.animation = 'none';   /* measure the capsule at rest, not mid-pulse */
    const g = giftBtn.getBoundingClientRect(), d = mapBtn.getBoundingClientRect();
    giftBtn.style.animation = '';
    return { active: [...document.querySelectorAll('.scene.active')].map(x => x.id).join(','), show: giftBtn.classList.contains('show'),
      size: Math.min(g.width, g.height), cx: Math.round((g.left + g.width / 2 - st.left) / s), top: Math.round((g.top - st.top) / s),
      aboveDice: g.bottom < d.top, sameAxis: Math.abs((g.left + g.width / 2) - (d.left + d.width / 2)) < 1, anim,
      worldOff: getComputedStyle(document.getElementById('tTrees')).animationName === 'none' && getComputedStyle(document.getElementById('tDash')).animationName === 'none' };
  });
  check('GO: the title world stops animating once the garage is up (nothing runs behind it)', garage.worldOff, JSON.stringify({ worldOff: garage.worldOff }));
  check('GO: lands in the garage; the gift capsule pulses above the map, 88px, centred on x=1086 at top 192', garage.active === 'garage' && garage.show && garage.size >= 64 && garage.cx === 1086 && garage.top === 192 && garage.aboveDice && garage.sameAxis && garage.anim === 'pulse', JSON.stringify(garage));
  await page.screenshot({ path: SHOT + 'title-gift.png' });

  /* ---- 5. opening the gift: 15..40 stars or a new buddy; the capsule disappears; the day is stamped ---- */
  const before = await page.evaluate(() => ({ wallet: progress.wallet, buddies: progress.owned.buddy.slice(), today: todayStr() }));
  await tap(page, 'giftBtn');
  await page.waitForTimeout(300);
  await page.screenshot({ path: SHOT + 'title-gift-open.png' });
  await page.waitForTimeout(1500);
  const after = await page.evaluate(() => ({ wallet: progress.wallet, buddies: progress.owned.buddy.slice(), lastGift: progress.lastGift, show: giftBtn.classList.contains('show'),
    display: getComputedStyle(giftBtn).display, chip: garageWallet.textContent.trim(), saved: JSON.parse(localStorage.getItem(saveKey())).lastGift,
    confetti: document.querySelectorAll('#garage .confetti').length }));
  const gain = after.wallet - before.wallet, newBuddy = after.buddies.filter(b => !before.buddies.includes(b));
  const prizeOk = (gain >= 15 && gain <= 40 && newBuddy.length === 0) || (gain === 0 && newBuddy.length === 1 && !before.buddies.includes(newBuddy[0]));
  check('gift: pays 15..40 stars or one unowned buddy, with confetti; the chip shows the new total', prizeOk && after.confetti > 0 && after.chip === String(after.wallet), JSON.stringify({ gain, newBuddy, chip: after.chip, confetti: after.confetti }));
  check('gift: the capsule is gone and today is stamped in localStorage', !after.show && after.display === 'none' && after.lastGift === before.today && after.saved === before.today, JSON.stringify({ show: after.show, lastGift: after.lastGift, saved: after.saved }));

  /* ---- 6. a second tap the same day gives nothing ---- */
  const again = await page.evaluate(() => { const w = progress.wallet, b = progress.owned.buddy.length; openGift(); return { same: progress.wallet === w && progress.owned.buddy.length === b }; });
  check('gift: a second open the same day gives nothing', again.same);

  /* ---- 7. reload: still claimed (garage via ?garage), the title badge is off ---- */
  await page.goto(URL + (URL.includes('?') ? '&' : '?') + 'garage');
  await page.waitForTimeout(500);
  const claimed = await page.evaluate(() => ({ active: [...document.querySelectorAll('.scene.active')].map(x => x.id).join(','), show: giftBtn.classList.contains('show'),
    lastGift: progress.lastGift, badge: titleGift.classList.contains('show'), wallet: progress.wallet }));
  check('reload: ?garage skips the title; the gift stays claimed (no capsule, no GO badge), the prize persisted', claimed.active === 'garage' && !claimed.show && !claimed.badge && claimed.lastGift === before.today && claimed.wallet === after.wallet, JSON.stringify(claimed));

  /* ---- 8. a new day: lastGift = yesterday brings the capsule back, and the badge on the title ---- */
  await page.evaluate(y => { progress.lastGift = y; save(); }, yesterday());
  await page.goto(URL);
  await page.waitForTimeout(600);
  const nextDay = await page.evaluate(() => ({ active: [...document.querySelectorAll('.scene.active')].map(x => x.id).join(','), badge: titleGift.classList.contains('show'), ready: giftReady() }));
  await tap(page, 'titleGo');
  await page.waitForTimeout(400);
  const nextGarage = await page.evaluate(() => ({ show: giftBtn.classList.contains('show'), display: getComputedStyle(giftBtn).display }));
  check('next day: lastGift = yesterday brings the GO badge and the wall capsule back', nextDay.active === 'title' && nextDay.badge && nextDay.ready && nextGarage.show && nextGarage.display !== 'none', JSON.stringify({ nextDay, nextGarage }));

  /* ---- 9. skip switches: localStorage "vroom.skipTitle" boots to the garage; lastGift never rides in a save code ---- */
  await page.evaluate(() => localStorage.setItem('vroom.skipTitle', '1'));
  await page.goto(URL);
  await page.waitForTimeout(400);
  const skip = await page.evaluate(async () => {
    localStorage.removeItem('vroom.skipTitle');
    const full = await exportFullCode();
    const data = await decodeSaveCode(full);
    return { active: [...document.querySelectorAll('.scene.active')].map(x => x.id).join(','), inFull: 'lastGift' in data, compact: packCompact().length };
  });
  check('skip: localStorage vroom.skipTitle boots straight to the garage; lastGift is not in the full save code', skip.active === 'garage' && !skip.inFull && skip.compact > 0, JSON.stringify(skip));

  /* ---- 10. reduced motion: the pop-ins are skipped ---- */
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(URL);
  await page.waitForTimeout(300);
  const rm = await page.evaluate(() => ({ active: [...document.querySelectorAll('.scene.active')].map(x => x.id).join(','),
    logo: getComputedStyle(titleLogo).animationName, car: getComputedStyle(titleCar).animationName, go: getComputedStyle(titleGo).animationName,
    trees: getComputedStyle(document.getElementById('tTrees')).animationName, dash: getComputedStyle(document.getElementById('tDash')).animationName,
    wheel: (w => w ? getComputedStyle(w).animationName : 'none')(titleCar.querySelector('.wheelrot')), glint: getComputedStyle(document.querySelector('#titleLogo .glint')).display }));
  check('reduced motion: no pop-in animations on the title, the world holds still, the glint is hidden', rm.active === 'title' && rm.logo === 'none' && rm.car === 'none' && rm.go === 'none' && rm.trees === 'none' && rm.dash === 'none' && rm.wheel === 'none' && rm.glint === 'none', JSON.stringify(rm));
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  check('no console errors', errors.length === 0, errors.join(' | ').slice(0, 300));

  await browser.close();
  const fails = results.filter(r => !r.ok);
  console.log(`\n${results.length - fails.length}/${results.length} passed`);
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
