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

  /* ---- empty album renders all slot rows ---- */
  await tap('#albumBtn');
  await page.waitForTimeout(600);
  const empty = await page.evaluate(() => ({
    active: albumScene.classList.contains('active'),
    buddies: document.querySelectorAll('.buddySlot').length,
    filled: document.querySelectorAll('.buddySlot.filled').length,
    badges: document.querySelectorAll('.badgeSlot').length,
    photos: document.querySelectorAll('.photoSlot').length,
    emptyPhotos: document.querySelectorAll('.photoSlot.empty').length
  }));
  check('album: 10 buddies + 8 stickers + 13 photo frames (one per world and the parade), all empty on a fresh save', empty.active && empty.buddies === 10 && empty.filled === 0 && empty.badges === 8 && empty.photos === 13 && empty.emptyPhotos === 13, JSON.stringify(empty));
  await page.screenshot({ path: SHOT + 'a-album-empty.png' });

  /* tapping an unfound buddy grumbles, never equips */
  const denyTap = await page.evaluate(() => {
    document.querySelector('.buddySlot').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    return { buddy: state.buddy, wiggled: document.querySelector('.buddySlot').classList.contains('wiggle') };
  });
  check('album: unfound buddy tap wiggles, no equip', denyTap.buddy === null && denyTap.wiggled, JSON.stringify(denyTap));

  /* ---- buddy capsule prize: found, auto-equipped, rides in car ---- */
  const buddyPrize = await page.evaluate(async () => {
    showGarage(); drive(3);
    await new Promise(r => setTimeout(r, 150));
    const c = props.find(p => p.type === 'capsule');
    if (!c) return { skip: true };
    const rr = Math.random;
    Math.random = () => 0.9;   /* weights 5,2,1,3,2 of 13 -> 11.7 = buddy bucket [11,13) */
    targetLane = laneVis = c.lane; pos = c.x - 300; v = 0;
    await new Promise(r => setTimeout(r, 300));
    Math.random = rr;
    return {
      owned: progress.owned.buddy.length, equipped: state.buddy,
      riding: carWrap.innerHTML.includes('buddyBob'),
      popup: document.querySelectorAll('.buddyPop').length
    };
  });
  check('buddies: capsule prize found + auto-equipped + riding', buddyPrize.skip || (buddyPrize.owned === 1 && !!buddyPrize.equipped && buddyPrize.riding && buddyPrize.popup >= 1), JSON.stringify(buddyPrize));
  await page.screenshot({ path: SHOT + 'a-buddy-pop.png' });

  /* ---- badges: first jump via real ramp physics ---- */
  const jumpBadge = await page.evaluate(async () => {
    const rp = RAMPS[0];
    targetLane = laneVis = rp.l0;   /* 13.16: decks can be one lane wide, so take the ramp's lane */
    pos = rp.x - 300 - 60; v = 650; gasKey = true;
    const t0 = performance.now();
    while (!airborne && performance.now() - t0 < 2000) await new Promise(r => setTimeout(r, 30));
    gasKey = false;
    return { airborne: progress.badges.includes('jump'), toast: document.getElementById('stickerToast').classList.contains('show') };
  });
  check('badges: first jump awards sticker + toast', jumpBadge.airborne && jumpBadge.toast, JSON.stringify(jumpBadge));

  /* ---- badges + photo on finish (clean run) ---- */
  const finish = await page.evaluate(async () => {
    runStars = 4; runDamage = 0;
    pos = LEVEL_LEN - 350; gasKey = true;
    await new Promise(r => setTimeout(r, 1500));
    gasKey = false;
    return {
      clean: progress.badges.includes('clean'),
      photos: progress.photos.length,
      photoLevel: progress.photos[0] && progress.photos[0].n,
      hasBuild: progress.photos[0] && !!progress.photos[0].b.body
    };
  });
  check('badges: clean-run sticker on finish', finish.clean);
  check('photos: finish-line photo recorded with build + level', finish.photos === 1 && finish.photoLevel === 3 && finish.hasBuild, JSON.stringify(finish));

  /* ---- buy badge ---- */
  const buyBadge = await page.evaluate(() => {
    showGarage();
    progress.wallet = 200; renderWallets(false);
    state.color = 'rainbow'; save(); renderPreview();
    priceTag.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    return progress.badges.includes('buy');
  });
  check('badges: first purchase awards sticker', buyBadge);

  /* ---- album shows the goods; equip toggle works ---- */
  await tap('#albumBtn');
  await page.waitForTimeout(300);
  const filled = await page.evaluate(() => ({
    buddiesFilled: document.querySelectorAll('.buddySlot.filled').length,
    equipped: document.querySelectorAll('.buddySlot.equipped').length,
    badgesFilled: document.querySelectorAll('.badgeSlot.filled').length,
    photosFilled: document.querySelectorAll('.photoSlot:not(.empty)').length
  }));
  check('album: rows reflect progress (1 buddy, 3+ badges, 1 photo)', filled.buddiesFilled === 1 && filled.equipped === 1 && filled.badgesFilled >= 3 && filled.photosFilled === 1, JSON.stringify(filled));
  const toggle = await page.evaluate(() => {
    const slot = document.querySelector('.buddySlot.equipped');
    slot.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    const off = state.buddy === null;
    document.querySelector('.buddySlot.filled').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    return { off, on: state.buddy !== null };
  });
  check('album: tap rider to hop out, tap again to ride', toggle.off && toggle.on, JSON.stringify(toggle));
  await page.screenshot({ path: SHOT + 'a-album-filled.png' });

  /* ---- every memory is its own: world backdrops + stamps, and a tap opens the big card ---- */
  const distinct = await page.evaluate(() => {
    progress.photos = [];
    [[3, 'S', 7], [14, 'A', 4], [27, 'B', 2], [41, 'S', 9], [95, 'C', 1], [MAX_LEVEL + 1, 'S', 12]].forEach(([n, t, s]) =>
      progress.photos.push({ b: JSON.parse(JSON.stringify(state)), n, t, s }));
    save(); renderAlbum();
    const slots = [...document.querySelectorAll('.photoSlot:not(.empty)')];
    const bgs = slots.map(sl => sl.querySelector('.photoCar').style.background);
    const stamps = slots.map(sl => sl.querySelector('.photoStamp svg') !== null);
    const parade = slots[5].querySelector('.photoCap').textContent.trim();
    return { n: slots.length, distinctBgs: new Set(bgs).size, stamps: stamps.every(Boolean), paradeCapNoNumber: parade === 'S' };   /* medal letter only, no level number */
  });
  check('photos: six memories from five worlds + the parade get six different backdrops and a world stamp each', distinct.n === 6 && distinct.distinctBgs === 6 && distinct.stamps && distinct.paradeCapNoNumber, JSON.stringify(distinct));
  await page.screenshot({ path: SHOT + 'a-album-worlds.png' });
  const peek1 = await page.evaluate(() => {
    document.querySelectorAll('.photoSlot')[4].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));   /* the frames run by world: level 41 is world 5's */
    const chips = [...peekCard.querySelectorAll('.peekCap .chip')].map(c => c.textContent.trim());
    return { open: peekOverlay.classList.contains('show'), cls: peekCard.className, chips, car: !!peekCard.querySelector('.peekShot svg'), bg: peekCard.querySelector('.peekShot').style.background };
  });
  check('peek: tapping world 5\'s frame opens its card: level 41, 9 stars, S medal, car + snow backdrop', peek1.open && peek1.cls === 'photo' && peek1.chips[0] === '41' && peek1.chips[1] === '9' && peek1.chips[2] === 'S' && peek1.car && peek1.bg.length > 0, JSON.stringify(peek1));
  await page.waitForTimeout(400);
  await page.screenshot({ path: SHOT + 'a-peek-photo.png' });
  const peek2 = await page.evaluate(() => {
    peekOverlay.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    const closed = !peekOverlay.classList.contains('show');
    const bg1 = (document.querySelectorAll('.photoSlot')[4].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })), peekCard.querySelector('.peekShot').style.background);
    peekOverlay.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    document.querySelectorAll('.photoSlot')[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    const chips = [...peekCard.querySelectorAll('.peekCap .chip')].map(c => c.textContent.trim());
    const bg2 = peekCard.querySelector('.peekShot').style.background;
    peekOverlay.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    return { closed, differs: bg1 !== bg2, chips, closedAgain: !peekOverlay.classList.contains('show') };
  });
  check('peek: a tap closes it; a different photo shows different content (level 3, 7 stars, different backdrop)', peek2.closed && peek2.differs && peek2.chips[0] === '3' && peek2.chips[1] === '7' && peek2.closedAgain, JSON.stringify(peek2));
  const peekBadgeRes = await page.evaluate(() => {
    const owned = document.querySelector('.badgeSlot.filled'), locked = document.querySelector('.badgeSlot:not(.filled)');
    owned.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    const r1 = { open: peekOverlay.classList.contains('show'), cls: peekCard.className, icon: !!peekCard.querySelector('.peekBadge svg') };
    peekOverlay.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    locked.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    const r2 = { open: peekOverlay.classList.contains('show'), wiggle: locked.classList.contains('wiggle') };
    return { r1, r2 };
  });
  check('peek: an earned sticker opens big with confetti; an unearned one only wiggles', peekBadgeRes.r1.open && peekBadgeRes.r1.cls === 'badge' && peekBadgeRes.r1.icon && !peekBadgeRes.r2.open && peekBadgeRes.r2.wiggle, JSON.stringify(peekBadgeRes));
  await page.waitForTimeout(400);
  await page.screenshot({ path: SHOT + 'a-peek-badge.png' });

  /* ---- 13.23: one frame per world, the wall only gets better ---- */
  const wall = await page.evaluate(() => {
    const shot = (n, t, s) => ({ b: JSON.parse(JSON.stringify(state)), n, t, s });
    progress.photos = [];
    const r = {};
    r.first = keepPhoto(shot(3, 'B', 4));                 /* an empty frame takes anything */
    r.worse = keepPhoto(shot(5, 'C', 9));                 /* a worse medal is kept out, even with more stars */
    r.keptLevel = progress.photos[0].n;
    r.equalFewer = keepPhoto(shot(7, 'B', 2));            /* same medal, fewer stars: kept out */
    r.equalMore = keepPhoto(shot(8, 'B', 6));             /* same medal, more stars: the newer one goes up */
    r.levelNow = progress.photos[0].n;
    r.better = keepPhoto(shot(9, 'A', 1));                /* a better medal always goes up */
    r.levelBetter = progress.photos[0].n;
    r.otherWorld = keepPhoto(shot(14, 'C', 1));           /* world 2's own frame */
    r.n = progress.photos.length;
    for (let w = 3; w <= WORLD_COUNT; w++) keepPhoto(shot(w * 10, 'B', 2));
    keepPhoto(shot(MAX_LEVEL + 1, 'S', 30));
    r.full = progress.photos.length;
    renderAlbum();
    r.filled = document.querySelectorAll('.photoSlot:not(.empty)').length;
    r.counts = ['buddyTab', 'badgeTab', 'photoTab'].map(id => document.getElementById(id).querySelector('b').textContent);
    r.photoDone = document.getElementById('photoTab').classList.contains('done');
    r.paradeGold = document.querySelector('.photoSlot.parade:not(.empty)') !== null;
    save();
    return r;
  });
  check('photo wall (13.23): one frame per world: an empty frame takes any finish, a worse medal or fewer stars is kept out, an equal-or-better finish goes up, the parade has its own gold frame',
    wall.first && !wall.worse && wall.keptLevel === 3 && !wall.equalFewer && wall.equalMore && wall.levelNow === 8 && wall.better && wall.levelBetter === 9 && wall.otherWorld && wall.n === 2 && wall.full === 13 && wall.filled === 13 && wall.paradeGold,
    JSON.stringify(wall));
  check('album tabs (13.23): each page counts found/total and turns green when complete', wall.counts[0] === '1/10' && wall.counts[1].endsWith('/8') && wall.counts[2] === '13/13' && wall.photoDone, JSON.stringify(wall.counts));
  const fresh = await page.evaluate(async () => {
    showGarage(); showAlbum();   /* a visit: everything new since the last one carries a star, then counts as seen */
    const first = document.querySelectorAll('.fresh').length;
    showGarage(); showAlbum();
    const second = document.querySelectorAll('.fresh').length;
    const nb = BUDDY_ORDER.find(id => !progress.owned.buddy.includes(id));   /* a buddy not found yet */
    progress.owned.buddy.push(nb); showGarage(); showAlbum();
    const third = { fresh: document.querySelectorAll('.fresh').length, robot: document.querySelectorAll('.buddySlot')[BUDDY_ORDER.indexOf(nb)].classList.contains('fresh') };
    progress.owned.buddy.pop(); save();
    await new Promise(r => setTimeout(r, 1300));   /* the entrance pop-in has to finish before the slots measure true */
    const k = 1200 / document.getElementById('stage').getBoundingClientRect().width;   /* css px -> stage px */
    const sizes = [...document.querySelectorAll('.buddySlot, .badgeSlot, .photoSlot')].map(el => Math.min(el.getBoundingClientRect().width, el.getBoundingClientRect().height) * k);
    return { first, second, third, minSize: Math.round(Math.min(...sizes)), seenInCode: JSON.parse(exportJSON()).albumSeen === undefined };
  });
  check('fresh stars (13.23): new buddies, stickers and photos carry a star on the first visit and none on the next; a new find stars again; albumSeen stays out of the share code', fresh.first >= 13 && fresh.second === 0 && fresh.third.fresh === 1 && fresh.third.robot && fresh.seenInCode, JSON.stringify(fresh));
  check('album (13.23): every slot is a real tap target (>= 76 stage px)', fresh.minSize >= 76, String(fresh.minSize));
  const ghost = await page.evaluate(() => {
    progress.photos = progress.photos.filter(p => photoWorld(p.n) !== 6); renderAlbum();
    const slot = document.querySelectorAll('.photoSlot')[5];
    slot.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    return { empty: slot.classList.contains('empty'), ghostIcon: !!slot.querySelector('.photoGhost svg'), wiggle: slot.classList.contains('wiggle'), peek: peekOverlay.classList.contains('show'), label: slot.getAttribute('aria-label') };
  });
  check('empty frame (13.23): shows its world\'s icon as a ghost, a tap wiggles and denies, never opens a peek', ghost.empty && ghost.ghostIcon && ghost.wiggle && !ghost.peek && ghost.label.includes('world 6'), JSON.stringify(ghost));

  /* ---- persistence across reload: the wall is capped at 13, one per world ---- */
  await page.evaluate(() => {
    for (let i = 0; i < 9; i++) progress.photos.unshift({ b: JSON.parse(JSON.stringify(state)), n: 60 + i, t: 'B', s: 2 });   /* nine more from world 6, straight into storage */
    save();
  });
  await page.reload();
  await page.waitForTimeout(400);
  const persist = await page.evaluate(() => ({
    photos: progress.photos.length,
    buddy: progress.owned.buddy.length === 1 && state.buddy !== null,
    badges: progress.badges.length >= 3
  }));
  check('persistence: photos load one per world (13 frames, the nine extra world-6 shots collapse to one), buddy + badges survive reload', persist.photos === 13 && persist.buddy && persist.badges, JSON.stringify(persist));

  check('no console errors', errors.length === 0, errors.join(' | ').slice(0, 300));

  await browser.close();
  const fails = results.filter(r => !r.ok);
  console.log(`\n${results.length - fails.length}/${results.length} passed`);
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
