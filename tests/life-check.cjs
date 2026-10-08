/* life-check: garage life + buddy reactions on the road (v12.5, T17.5).
   The parked car breathes: a very quiet idle putter runs on the master bus only while the garage is active, a riding
   buddy blinks and yawns, the beacon turns, the flag flutters, the booster flickers, the hover body bobs, and new
   wheels / bodies settle with a wobble. Tap toys: the hood pops open with a clank (engine block + sparkle), a wheel
   spins with a whirr, the body still honks. On the road the chase-cam buddy cheers on a star streak, ducks on a
   hard hit and waves at the finish. Reduced motion turns the idle animations off. */
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

  /* a spy on tone(): every synthesized voice goes through it, so counting calls says a sound played */
  await page.evaluate(() => {
    const orig = tone;
    window.__tones = 0;
    window.tone = (...a) => { window.__tones++; return orig(...a); };
  });
  const tones = () => page.evaluate(() => window.__tones);

  /* ---- 1. idle putter: starts once audio is unlocked while the garage is active, quiet and low ---- */
  const putt = await page.evaluate(async () => {
    unlockAudio();
    document.getElementById('garageWall').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }));
    await new Promise(r => setTimeout(r, 1200));
    return { on: !!putter, type: putter && putter.o.type, hz: putter && putter.o.frequency.value, lfo: putter && putter.lfo.frequency.value,
      lp: putter && putter.f.frequency.value, gain: putter && +putter.g.gain.value.toFixed(4), vol: PUTTER_VOL, garage: garage.classList.contains('active') };
  });
  check('putter: a 52 Hz square pulse at 2 Hz through a 220 Hz lowpass runs in the garage once audio is unlocked, gain ~0.016', putt.on && putt.type === 'square' && putt.hz === 52 && putt.lfo === 2 && putt.lp === 220 && putt.gain > putt.vol * 0.9 && putt.gain <= putt.vol && putt.garage, JSON.stringify(putt));

  const torn = await page.evaluate(async () => {
    showMap();
    await new Promise(r => setTimeout(r, 450));
    const gone = putter === null;
    showGarage();
    await new Promise(r => setTimeout(r, 450));
    return { gone, back: !!putter };
  });
  check('putter: torn down within a poll tick of leaving the garage, back when the garage returns', torn.gone && torn.back, JSON.stringify(torn));

  const quiet = await page.evaluate(async () => {
    progress.quiet = true; putterSync();
    await new Promise(r => setTimeout(r, 1400));
    const g = +putter.g.gain.value.toFixed(4);
    progress.quiet = false; putterSync();
    return { g, target: +(PUTTER_VOL * 0.22).toFixed(4) };
  });
  check('putter: quiet mode scales the putter down (0.22x)', quiet.g < quiet.target * 2 && Math.abs(quiet.g - quiet.target) < 0.002, JSON.stringify(quiet));

  /* ---- 2. buddy idle: blink + yawn hooks only while a buddy rides; every buddy carries both ---- */
  const idle = await page.evaluate(() => {
    state.buddy = null; renderPreview();
    const none = { eyes: preview.querySelectorAll('.bEye').length, mouths: preview.querySelectorAll('.bMouth').length };
    progress.owned.buddy.push('pup'); state.buddy = 'pup'; renderPreview();
    const eye = preview.querySelector('.bEye'), mouth = preview.querySelector('.bMouth');
    const hooks = BUDDY_ORDER.map(id => [id, BUDDY_SVG[id].includes('class="bEye"') && BUDDY_SVG[id].includes('class="bMouth"')]).filter(([, ok]) => !ok).map(([id]) => id);
    return { none, eye: !!eye, mouth: !!mouth, blink: eye && getComputedStyle(eye).animationName, yawn: mouth && getComputedStyle(mouth).animationName,
      bob: getComputedStyle(preview.querySelector('.buddyBob')).animationName, missing: hooks, buddies: BUDDY_ORDER.length };
  });
  check('buddy idle: no hooks without a buddy; with the pup riding its eyes blink (bBlink) and mouth yawns (bYawn) over the bob', idle.none.eyes === 0 && idle.none.mouths === 0 && idle.eye && idle.mouth && idle.blink === 'bBlink' && idle.yawn === 'bYawn' && idle.bob === 'buddyBob', JSON.stringify(idle));
  check('buddy idle: all 10 buddies carry eye + mouth hooks', idle.missing.length === 0 && idle.buddies === 10, idle.missing.join(','));

  /* ---- 3. extras breathe: beacon turns, flag flutters, booster flickers, hover bobs ---- */
  const extras = await page.evaluate(() => {
    state.extras.beacon = true; state.extras.flag = true; state.extras.booster = true; renderPreview();
    const an = sel => { const el = preview.querySelector(sel); return el ? getComputedStyle(el).animationName : 'missing'; };
    const out = { beacon: an('.spinner'), flag: an('.flagFlutter'), booster: an('.boosterFlame') };
    if (!progress.owned.body.includes('hover')) progress.owned.body.push('hover');
    const body = state.body; state.body = 'hover'; renderPreview();
    out.hover = an('.hoverBob');
    state.body = body; state.extras.beacon = false; state.extras.flag = false; state.extras.booster = false; renderPreview();
    return out;
  });
  check('extras: beacon spins, flag pennant flutters, booster flame flickers, hover body bobs', extras.beacon === 'spin' && extras.flag === 'flagFlutter' && extras.booster === 'boosterFlame' && extras.hover === 'hoverBob', JSON.stringify(extras));

  /* ---- 4. wheels settle with a wobble when a new body or set of wheels is equipped, not on a plain re-render ---- */
  const settle = await page.evaluate(() => {
    renderPreview();
    const plain = preview.firstElementChild.classList.contains('settle');
    state.wheels = 'monster'; renderPreview();
    const svg = preview.firstElementChild;
    const wheels = svg.classList.contains('settle') && getComputedStyle(svg.querySelector('.wheelrot')).animationName === 'wheelSettle';
    renderPreview();
    const again = preview.firstElementChild.classList.contains('settle');
    state.body = 'digger'; renderPreview();
    const body = preview.firstElementChild.classList.contains('settle');
    state.body = 'dump'; state.wheels = 'normal'; renderPreview();
    return { plain, wheels, again, body };
  });
  check('settle: new wheels / body add .settle (wheelSettle on .wheelrot); a plain re-render does not', !settle.plain && settle.wheels && !settle.again && settle.body, JSON.stringify(settle));

  /* ---- 5. hood toy: tap opens for a second with a clank + sparkle, then closes; the body is not re-rendered or honked ---- */
  const t0 = await tones();
  const hood = await page.evaluate(async () => {
    const svg = preview.firstElementChild;
    const hit = preview.querySelector('.hoodHit'), r = hit.getBoundingClientRect();
    hit.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 2 }));
    const open = svg.classList.contains('hoodOpen');
    const same = preview.firstElementChild === svg;
    const flap = getComputedStyle(svg.querySelector('.hoodFlap')).animationName, eng = getComputedStyle(svg.querySelector('.hoodEngine')).animationName;
    const hop = getComputedStyle(svg.querySelector('.buddyBob')).animationName;
    const blink = preview.classList.contains('blink');
    return { open, same, flap, eng, hop, blink, count: lifeStats.hood, w: Math.round(r.width), h: Math.round(r.height), parts: !!svg.querySelector('.hoodSpark') };
  });
  await page.waitForTimeout(520);
  await page.screenshot({ path: SHOT + 'life-hood.png' });
  const t1 = await tones();
  await page.waitForTimeout(900);
  const closed = await page.evaluate(() => ({ open: preview.firstElementChild.classList.contains('hoodOpen'), count: lifeStats.hood }));
  check('hood: tap -> .hoodOpen on the same svg (flap + engine animate, buddy hops, no honk blink), hit >= 64px', hood.open && hood.same && hood.flap === 'hoodFlap' && hood.eng === 'hoodEngine' && hood.hop === 'buddyHop' && !hood.blink && hood.count === 1 && hood.w >= 64 && hood.h >= 64 && hood.parts, JSON.stringify(hood));
  check('hood: a clank played (tone spy) and the hood closes again on its own', t1 > t0 && !closed.open && closed.count === 1, JSON.stringify({ t0, t1, closed }));

  /* ---- 6. wheel toy: tapping a wheel spins it with a whirr; the body tap still honks ---- */
  const t2 = await tones();
  const spin = await page.evaluate(() => {
    const svg = preview.firstElementChild;
    const hit = preview.querySelector('.wheelHit[data-i="1"]'), r = hit.getBoundingClientRect();
    hit.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 3 }));
    const rots = svg.querySelectorAll('.wheelrot');
    return { same: preview.firstElementChild === svg, spun: rots[1].classList.contains('spinTap'), other: rots[0].classList.contains('spinTap'),
      anim: getComputedStyle(rots[1]).animationName, count: lifeStats.spin, w: Math.round(r.width), h: Math.round(r.height) };
  });
  const t3 = await tones();
  const honk = await page.evaluate(() => {
    const svg = preview.firstElementChild;
    preview.querySelector('svg > g path').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 4 }));
    return { rerendered: preview.firstElementChild !== svg, blink: preview.classList.contains('blink'), hood: lifeStats.hood, spin: lifeStats.spin };
  });
  const t4 = await tones();
  check('wheel: tap spins that wheel only (wheelSpinTap), whirr plays, hit >= 64px, no re-render', spin.same && spin.spun && !spin.other && spin.anim === 'wheelSpinTap' && spin.count === 1 && spin.w >= 64 && spin.h >= 64 && t3 > t2, JSON.stringify(spin));
  check('body: a tap on the body still honks, re-renders and blinks; the toy counters stay put', honk.rerendered && honk.blink && t4 > t3 && honk.hood === 1 && honk.spin === 1, JSON.stringify(honk));

  /* ---- 7. road: the chase-cam buddy cheers on a star streak, ducks on a hard hit, waves at the finish ---- */
  const road = await page.evaluate(async () => {
    progress.wallet = 0; progress.damage = 0; progress.upgrades.armor = 0; progress.tread = 8; progress.fuel = 8;
    drive(1);
    await new Promise(r => setTimeout(r, 300));
    const b = () => carWrap.querySelector('.buddyRe');
    const present = !!b() && !!b().querySelector('.buddyBob');
    /* star hook: a third star inside 1.5 s is a streak */
    starCombo = 1; lastStarT = performance.now(); laneVis = 1; jumpY = 0;
    const fake = { lane: 1, h: LOW_STAR_H, el: document.createElement('div'), x: pos };
    PROP_HIT.star(fake, 0);
    const cheer = { combo: starCombo, cls: b().classList.contains('cheer'), anim: getComputedStyle(b()).animationName, taken: fake.done };
    /* hit hook: a soaked ding */
    runDamage = 0; applyDamage(1);
    const duck = { cls: b().classList.contains('duck'), gone: !b().classList.contains('cheer'), dmg: progress.damage };
    progress.damage = 0; runDamage = 0; updateDamageVisuals(); renderHudDamage(false);
    return { present, cheer, duck };
  });
  check('road: .buddyRe wraps the chase-cam buddy; the third star of a streak -> .cheer', road.present && road.cheer.combo === 2 && road.cheer.cls && road.cheer.anim === 'buddyCheer' && road.cheer.taken, JSON.stringify(road.cheer));
  check('road: a soaked hard hit -> .duck (replaces .cheer)', road.duck.cls && road.duck.gone && road.duck.dmg === 1, JSON.stringify(road.duck));
  const t5 = await tones();
  const wave = await page.evaluate(async () => {
    pos = LEVEL_LEN - 350; gasKey = true;
    await new Promise(r => setTimeout(r, 1400));
    gasKey = false;
    const b = carWrap.querySelector('.buddyRe');
    return { cls: b.classList.contains('wave'), celebrating: roadScene.classList.contains('celebrating') };
  });
  const t6 = await tones();
  check('road: crossing the finish -> .wave on the buddy (finishLevel hook)', wave.cls && wave.celebrating && t6 > t5, JSON.stringify(wave));
  await page.waitForTimeout(300);
  await page.screenshot({ path: SHOT + 'life-wave.png' });
  const noBuddy = await page.evaluate(() => {
    showGarage(); state.buddy = null; renderPreview();
    drive(1); let ok = true;
    try { buddyReact('cheer'); buddyReact('duck'); buddyReact('wave'); } catch (e) { ok = false; }
    const none = !carWrap.querySelector('.buddyRe');
    showGarage();
    return { ok, none };
  });
  check('road: with no buddy riding the hooks are no-ops', noBuddy.ok && noBuddy.none, JSON.stringify(noBuddy));

  /* ---- 8. reduced motion: the idle animations stop (blink, yawn, bob, flag, beacon, booster, hover) ---- */
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const rm = await page.evaluate(() => {
    state.buddy = 'pup'; state.extras.beacon = true; state.extras.flag = true; state.extras.booster = true; renderPreview();
    const an = sel => { const el = preview.querySelector(sel); return el ? getComputedStyle(el).animationName : 'missing'; };
    const out = { eye: an('.bEye'), mouth: an('.bMouth'), bob: an('.buddyBob'), flag: an('.flagFlutter'), beacon: an('.spinner'), booster: an('.boosterFlame') };
    state.body = 'hover'; renderPreview(); out.hover = an('.hoverBob');
    state.body = 'dump'; state.extras.beacon = false; state.extras.flag = false; state.extras.booster = false; renderPreview();
    return out;
  });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const rmBack = await page.evaluate(() => getComputedStyle(preview.querySelector('.bEye')).animationName);
  check('reduced motion: every idle animation on the preview reads "none"; back to normal when the preference lifts', Object.values(rm).every(v => v === 'none') && rmBack === 'bBlink', JSON.stringify(rm) + ' back=' + rmBack);

  check('no console errors', errors.length === 0, errors.join(' | ').slice(0, 300));

  await browser.close();
  const fails = results.filter(r => !r.ok);
  console.log(`\n${results.length - fails.length}/${results.length} passed`);
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
