# Tasks

- [x] T1.1: Scaffold + garage scene: fixed-stage layout, SVG vehicle part system (5 bodies, 3 wheel sets, 6 colors, 3 extras), part-cycling UI with bounce/pop feedback, Web Audio synth module with iOS unlock, honk-on-tap, GO button, localStorage persistence. [SPID]
- [x] T1.2: Road scene: parallax construction site, hold-to-drive physics with engine sound and wheel spin, ramp jump, mud puddle, cones, stars, honk-on-tap, finish confetti celebration, return-to-garage loop. [SPID]

## v3 (2026-07-10, user-directed)

- [x] T3.1: Core systems rewrite: 3-lane road (swipe/arrows/keys), gas + brake pedals, seeded 30-level generator with soft/hard obstacles + day/sunset/night themes, star currency + HUD, level map scene, celebrate w/ tally + replay/next/garage, vroom.v2 persistence + v1 migration, mini-review fixes (engine audio ramps, fit() rotation, audio try/catch, whee gate, collision handler registry). [SPI-]
- [x] T3.2: Content + shop: 6 new bodies (police, race, tractor, icecream, rocket, ufo), 3 new wheels (gold, flower, tank), 6 new colors incl. rainbow gradient, per-body honks, garage shop flow (locked cycle, price tag, buy fanfare, GO gating). [SPI-]
- [x] T3.3: Polish + verify: Playwright full-loop regression, kid-UX pass (12-item punch list), Doubt audit. [SPID]

## v4 (2026-07-10, user-directed: hazards, damage, upgrades, roadtrip longevity)

- [x] T4.1: WASD + arrow keyboard controls (steer/gas/brake) alongside mouse pedals. [SPID:fast]
- [x] T4.2: Damage system: persistent 0-9 damage w/ scuff/crack/smoke tiers + 15% speed penalty at 5+, oil-slick spin-outs (L5+), TNT crates (L12+, 2 dmg), HUD + celebrate damage chips, clean-run +2 star bonus, star-paid repair (2/point), upgrade tracks engine/shield/magnet (3 levels each). [SPI-]
- [x] T4.3a: Surprise capsules (weighted star/gag prizes, 4 gag animations), free-drive endless cruise (map button, seamless parallax wrap, distance-gated difficulty, theme cycling, bank-on-exit), S/A/B/C time-trial medals (HUD timer, celebrate medal, map badges), steeper difficulty curve. [SPI-]
- [x] T4.3b: Longevity round A remainder: tap-everything Easter eggs (sun sunglasses/moon wink, cloud puffs, VROOM sign letter-hop, vehicle eye blink), magic dice owned-parts randomizer w/ drumroll, persisted parent quiet mode (0.22x master volume incl engine). Idle attract shipped in T4.5. Verified live 9/9 + suites 113/113. [SPI-]
- [x] T4.4a: Sticker album scene (buddy collection w/ tap-to-equip, 6 "first!" achievement badges w/ wordless toast, 6-slot finish-line photo polaroids), 6 passenger buddies as capsule prizes (auto-equip, ride peeking over the roofline, bob + squeak). Suite album-check.cjs 11/11; all 7 suites 124/124. [SPI-]
- [x] T4.4b: Decals (5 priced flank stickers, tap-cycle button in the build tray, shop-gated, save-code format v2) + car wash (persistent mud from puddles, sponge button, finger-scrub mini-game w/ bubble trail, meter, rinse + confetti). Suite washdecals-check.cjs 11/11; nine suites 148/148. [SPI-]

## v6 (2026-07-11, user-directed: persistence)

- [x] T6.1: Local profiles: up to 3 kids, buddy-face avatars (no reading), per-profile save keys w/ legacy migration, avatar button in garage opens picker overlay, reload-based clean switch. [SPI-]
- [x] T6.2: Save codes: VROOM1 compact bit-packed code (51 bytes, everything but photos/best-times) rendered as a real QR by a hand-rolled encoder (byte mode, ECC L, v1-5, verified byte-exact against jsQR); VROOM2 gzip full-save text code via clipboard copy/paste; import confirm overlay; #save= URL import for scanned QRs on a hosted copy. Suite profile-check.cjs 12/12; all 8 suites 136/136. [SPI-]
- [x] T4.5: Nintendo-quality game-feel pass: body dynamics (accel lean / brake dive / lane bank), hit-stop + 2-axis quake, landing squash + dust, rising star-combo chimes, layered engine (detuned saws + swept filter + wind), speed lines at vmax, celebrate choreography (payoff first, buttons last, medal beat, damage only when relevant), iris scene transitions, iPad shell (rotate overlay, master compressor, touch-callout, metas, favicon), retuned medal curve (forgiving early, upgrade-tuned late), garage GO attract. [SPI-]

## v5 (2026-07-10, user-directed: "go wild" worlds expansion)

- [x] T5.1: 80 levels across 8 themed worlds (construction/sunset/night/rain/snow/desert/beach/space): shared levelLen(), world-select map (8 tabs + 10-level pages), sequential world unlock, per-world CSS themes + scenery + weather particles (rain/snow), world-specific hazards incl. MOVING obstacles (tumbleweed, crab), low-gravity space physics, world-clear 25-star bonus, golden capsules, free-drive cycles all 8 themes. [SPI-]
- [x] T5.2: Premium content: 4 endgame bodies (limo, dragon, train, royal 250-400 stars), 2 wheels (glow, star), 3 purchasable extras (wings, booster, party hat), golden capsule prize. [SPI-]
- [x] T5.3: Suite updates: worlds-check.cjs (18 checks: 80-level invariants, world hazards, movers, gravity, map, unlock chain, world bonus, golden capsule, premium + extras shop, free-drive world tour) + all prior suites updated; 113/113 green. Mega Doubt running. [SPI-]

## v7 (2026-07-11, user-directed: "Animal Crossing perfect" overhaul)

- [x] T7.1: Full visual/UX audit (agent, 17 screenshots, 25-item report: "two art directors — the album's language wins"). Found the WORLD_TINT key bug. [SPID]
- [x] T7.2: "Toybox" design system integrated: warm cream/wood/putty tokens replacing navy chrome everywhere, unified radii + flat shadows + one press squash, dot textures, warmed scrims/letterbox/iris, attribute-selector icon recolors, theme-color meta. [SPI-]
- [x] T7.3: Structural overhaul: garage 3-tray toolbar + map/GO column; map → winding journey path (nodes on road, one padlock, quiet far dots, per-world tint, calm locked tabs); circular free-drive wheel; celebrate results card (+home hidden while celebrating); entrance choreography (popIn staggers everywhere); lane-arrow gutter; anchor-based damage decals (visible on premium bodies); star-scalloped S medal; 76px swatch floor reconciliation. Suites 137/137. [SPI-]

## v9 (2026-08-04, user-directed: grand finale + decal glow-up)

- [x] T9.1: Victory Parade: golden trophy button on the map once ALL 80 levels are done. One-of-a-kind finale level: rainbow road, golden sky, zero hazards, low-gravity party jumps, ~60 star waves, capsule shower, every found buddy bouncing roadside, fireworks + confetti drizzle, glowing trophy arch, +100 champion jackpot (+10 on replays), 7th album sticker (Champion), trophy results card. Suite parade-check.cjs 12/12. [SPI-]
- [x] T9.2: Living decals: layered flickering flame, shooting star w/ sparkle trail + twinkle, glossy heartbeat heart, crackling electric bolt, wobbling googly eyes. [SPI-]

## v10 (2026-10-06, user-directed: chase cam)

- [x] T10.1: Road goes head-on: pseudo-3D chase cam (horizon + vanishing point, camera follows lane changes), three lanes left/center/right. Canvas ground plane (world palettes, speed bands, rumble strips, dashes, sloped ramps, checkered finish stripe, horizon haze, ground shadow under jumps); props become depth-sorted perspective sprites; roadside scenery on both shoulders; finish gantry; parade fans line both sides with the trophy floating over the road. Chase-cam vehicles built from projected 3D toy blocks (boxes, cylinders, hulls) for all 15 bodies, front + rear axles, 8 tire styles, extras (twin wings, center booster), night tail lights + headlight pool. Controls remapped: swipe sideways / left-right buttons / A-D steer, W/up gas, S/down brake. Collision/physics/level gen untouched (world x is unchanged). Suites updated, 161/161.

- [x] T10.2-10.6: real gas/brake pedals; steering wheel (tap a side or turn it); chase-cam cars rebuilt as projected 3D toy blocks with front + rear axles, then halved in car space; swept rocket fins + raised dragon bat wings.
- [x] T10.7: New-version gate. The page fingerprints its own code at boot and re-fetches itself (no-store) on boot, on return to foreground, and every 10 min; when the hosted code differs, a green refresh badge appears in the garage. Press-and-hold (1.6s ring) saves and reloads via a cache-busting URL. Suite update-check.cjs 5/5; all 11 suites 166/166.

## v11 (2026-10-06, user-directed: "review every level, make turns, make them very different")

- [x] T11.0: Curve engine (OutRun-style curvature stretches eased in/out, per-frame lateral offset table, skyline parallax by heading, lean into bends). T11.1: hills (cosine elevation through the projector, per-world amplitude).
- [x] T11.2 (agent): beat sequencer — 30 formations, per-level signature + contrast templates, world beats, finales, guarantee passes; `tests/level-report.cjs`.
- [x] T11.3 (agent): every world is a place — roadside pools (5-8 pieces each), overhead arches, horizon landmarks, festive parade set, free-drive re-skin.
- [x] T11.4 (agent): per-world audio (jingles, ambience beds, star scales, bend scrub) + 10 live sky events; suite `world-check-audio-events.cjs` (16).
- [x] T11.5 (agent): adversarial audit of all 80 levels (240 screenshots): owl/whale/snowball events redrawn, arches clear of ramp lips, landmarks drawn once; `buildCourse` rewritten with per-world road character (WORLD_ROAD: highway, switchback pass, drag strips, coast, moon chicanes) and a 10-shape menu so no level after L2 is straight and no neighbours match; fairness bots (greedy star-seeker + center-lane 'lazy toddler') drive all 80 levels: moon flights get a float arc and 950/1850 ramp tails, walls open within one lane of the kid, 700-unit runways, fills never trap a star trail; finales always end in a star shower. Suite `fairness-check.cjs` (9). 13 suites, 191/191.
- [x] T11.6-11.7: HUD row fills the width; garage top row spacing with fixed-width wallets.

## v12 (2026-10-07, user-directed: "go bonkers")

- [x] T12.0: plumbing for 12 worlds / 120 levels (WORLD_META, derived MAX_LEVEL/PARADE_LEVEL, 12 map tabs, length cap at L80), save-code format v3 (count-prefixed catalogs, build travels, v1/v2 decode kept), pack anchors.
- [x] T12.1 (agent): accessory anchor contract — per-body `anchors` in both views, all 15 bodies hand-tuned from contact sheets.
- [x] T12.2 (agents): worlds 9 Volcano, 10 Candy Land, 11 Deep Sea, 12 Sky Kingdom — themes, palettes, scenery pools, arches, landmarks, weather, 2 hazards each (timed geysers, rolling donuts, bobbing jellyfish, lane-hopping crab king and kites, thunderclouds), road character, beats, jingles, ambience, star scales, events; flight length scales with gravity.
- [x] T12.3 (agent): 11 pattern paints as SVG defs in both views, two-page swatch flipper; suite paint-check (22).
- [x] T12.4 (agent): shop pack — 8 bodies (hover 1000 with no wheels + glow + trail, bulldozer, school bus, ambulance, submarine, pirate, dino, unicorn), 5 wheels, 4 extras, 4 buddies, 3 decals; hold-to-cycle-back + dot indicator; legacy decoder sliced to v2 catalog sizes; suite shop-check (21). 15 suites, 237/237.

## v12.1 (2026-10-07, user-directed: "super clean and professional", "Nintendo-grade menu")

- [x] T13.1 (agent): visual polish across every screen — one panel recipe, aligned columns, consistent radii/borders/shadows, 12 tabs clear the top row, 76px hit zones on small nodes, parade/free-drive buttons mirror.
- [x] T13.2 (agent): code quality — 30-section TOC, dead code and always-true guards removed, shared helpers (injectCSS, restartAnim, mountCar, shopGateOpen...), ESLint harness at zero findings; byte-identical level report.
- [x] T13.3 (agent): repo hygiene — GitHub Actions CI, `npm test` runner, manifest + app icons, APP_VERSION in the grown-ups panel, README/CONTRIBUTING/ARCHITECTURE.
- [x] T13.4 (agent): garage redesign — car as hero, six category tabs + one scroll-snap tile strip (23/13/23/9/10 + workbench), GO dominant, repair/wash contextual, speaker moved to the grown-ups panel, title plate and side racks removed; suite garage-check (19). 16 suites, 256/256.

## v12.2 (2026-10-07, user-directed: "duplicate buttons, more mechanical upkeep, clean car = bonus")

- [x] T14.1: Garage dedupe + right column. The wall repair/wash buttons are gone; upkeep lives on the workbench tab only and the wrench tab wears a pulsing dot while anything needs doing. Dice (88), map (88) and GO (180) share one x-centre at 1086 with 16px gaps; the map rests on the bench rim.
- [x] T14.2: Fuel. 8-unit tank, one unit per level of road, burned in `tick` (levels only). Low = 20% slower + engine coughs with a gauge jolt; dry = 55% crawl, never a stop. Fill-up tile (1 star a unit, partial fills) with a glug sound.
- [x] T14.3: Tires. 8 units of tread, half a unit per level plus half per soaked hard hit. Bald = lane changes at 60%, 10% off the top, a scrub on every turn. New-set tile (1 star a unit, all or nothing) with an air-wrench sound.
- [x] T14.4: Shine bonus. No mud + zero damage at the line = +50% of collected stars (rounded up), a sparkle chip on the results card, and the eighth album sticker. HUD grows fuel + tire gauges under the wrench in the same 108px rhythm (red when low, hidden during the celebration).
- [x] T14.5: Persistence. `progress.fuel` / `progress.tread` in localStorage (older saves read full), v3 save-code tail (4 + 4 bits after the level run; tail-less codes decode as full). Fairness bots get a serviced car per level. Suite upkeep-check (20); jsQR lookup honours the module path. 17 suites, 276/276; lint 0.

- [x] T14.6: Steering slider. The rotating wheel (hard for small hands) is replaced by a three-stop slider bottom-left: the finger's x on the track is the lane, a tap picks it, a drag keeps picking with the knob riding under the finger, release settles the knob on the car's lane; swipes and keys move the knob too; lit stop = current lane. verify.cjs covers tap + drag (36). 17 suites, 277/277.

- [x] T14.7: Upkeep lasts 3x: fuel 15600 units of road per unit (about 24 levels a tank), tread 31200 (about 48 levels a set), 1/6 unit of tread per hard hit.

## v12.3 (2026-10-07, user-directed: "race car number, numpad entry, 400 stars to change")

- [x] T15.1: Race number. `state.number` (up to two digits) draws a white roundel at the body's decal anchor in both views; a sticker on the same panel slides aside and both scale to 80% (roundel 1.3x the sticker scale, clamped 42-65 px; the rear one at least 1.4x so it reads at chase-cam scale; a sticker shrinks to 55% and perches on the roundel's shoulder). The sticker tab leads with the number tile (shows the current number + 400). Keypad overlay: 3x4 pad (0-9, erase, clear), live roundel preview, OK pays 400 each change, free to remove, deny shake when poor. Travels in the build, photos and a 7-bit v3 save-code tail. Bodies may declare a `number` anchor: the race car's painted roundel is its slot, so the typed number replaces the stock 1 there and the sticker stays home. Suite number-check (13). 18 suites, 290/290.

## v12.4 (2026-10-07, user-directed: "the album looks the same on every click")

- [x] T16.1: Album memories. Photos carry their world: backdrop from `ROAD_PAL` (sky / ground / road bands) and the world's map icon as a stamp on its tint; the parade gets a rainbow road and the champion cup. Tapping a photo opens the peek card (big car on its backdrop, level, stars collected, medal); tapping an earned sticker opens it big with confetti; unearned stickers still only wiggle. album-check 15 (+4). 18 suites, 294/294.

## v12.5

- [x] T17.2: Start screen with a hook. A wordless title scene on boot (`#title`: a star-over-road emblem, the kid's own car idling on a little road with the buddy bobbing, the avatar button, one 210 px green GO with pop-in choreography that `prefers-reduced-motion` skips; the engine putter starts on the first touch, tapping the car honks). A daily gift: once per local calendar day (`progress.lastGift`, localStorage only, never in a save code) a capsule pulses on the garage wall above the dice and pops open for 15..40 stars (weighted low) or, one time in six, a buddy the kid does not own, flying into the wallet chip / onto the car; the title GO wears a pulsing capsule badge while it is unclaimed. `?garage`, `localStorage["vroom.skipTitle"]` and a profile switch skip the title; `run-all.cjs` appends `?garage` for every suite. title-check 13 (new). 19 suites, 307/307.
- [x] T17.3: Ghost race against yourself. Level runs are sampled every 0.2 s (`[pos, lane, jumpY]` as a flat int array) and the fastest run per level is kept as `progress.levels[n].ghost = { t, p }` (localStorage only, never in a save code; malformed traces dropped on load). A stored ghost rides the next run as the kid's own car at 45% with a dashed ring, projected through `placeSprite` so it sits right in bends and over hills, interpolated by its own clock, fading out after its own finish; it never collides. A ghost chip under the level chip shows the signed gap in seconds (green ahead, putty behind, hidden with no ghost and during the celebration). Beating the ghost pops the medal bigger and adds a ghost + check on the time chip; losing changes nothing. Suite ghost-check (16).
- [x] T17.8: Mid-tier economy. Three aspirational items between the everyday parts and the 400 number / 1000 hover: `jetpack` extra (180: twin tanks on the roof at the hat anchor with a puffing nozzle each side; straps onto the buddy when one rides, the party hat perches on top otherwise), `disco` wheels (220: mirror-ball tiles with a twinkling glint, side decor + rear sidewall accent), `trophyrack` extra (260: a 56px roof rack at the beacon anchor carrying the kid's best five medals as gold / silver / bronze / grey cups, lifted onto the surf board when both ride). Appended to `SHOP_WHEEL_IDS` / `SHOP_EXTRA_IDS` (v3 save code now 94 bytes), priced in `PRICES`, pictograms in the `#extras` registry, equip voices. shop-check 23 (+2), garage-check counts 14 / 12.
- [x] T17.9: Polish debt. `prefers-reduced-motion: reduce` turns off every decorative keyframe (pulses, nudges, pop-ins, confetti, idle bobs, hover bob, shimmers, accessory flutter) and shortens the iris and strip transitions; `confettiBurst` spawns nothing under it. The HUD's fuel and tire gauges share one `#hudUpkeep` chip in the fuel slot until a gauge is low, then that gauge gets its red single in its own slot and the other keeps the combined chip below. MIT `LICENSE`, README footer, `"license"` in package.json. polish-check 16 (+2), upkeep-check 21 (+1).
- [x] T17.6: Surprise events on the map. A seeded daily rotation (mulberry32 over the local YYYY-MM-DD, `window.__today` for the suites): a sleeping dino marker on one beaten level of the current world that naps mid-lane on that road and wakes on a honk, a crawl-up or a bump (no damage, 5 bonus stars outside the level total); rainbow day after level 30 (arc over the map, a pip on one level, finishing it awards the secret `p:rainbowshine` paint once, appended last to COLORS / CODE_COLORS, hidden from the strip until earned); weather day (a rain / snow badge on one world tab, every level there runs those particles); a sun chip with the day number. No date = no events. Suite events-check (23); paint-check pins 12 patterns / 24 colors.
- [x] T17.5: Garage life + buddy reactions. The parked car breathes: a very quiet idle putter (52 Hz square pulse at 2 Hz through the master bus) runs only while the garage scene is active, after audio unlock, honours quiet mode and is torn down on scene change; a riding buddy blinks every ~4 s and yawns every ~11 s (`.bEye` / `.bMouth` hooks on all 10 buddies, look unchanged); the flag pennant flutters (beacon, booster and hover already animated); the wheels wobble into place when a new body or set of wheels is equipped. Tap toys on the preview: the hood region at the body's `hat` anchor pops open for a second with a clank (a painted flap swings up, a cartoon engine block rises out with a sparkle, the buddy hops; `noHood: true` opts a body out), a wheel tap spins it with a whirr, the body still honks; every hit region >= 64 px. On the road the chase-cam buddy (`.buddyRe` in `carWrap`) bounces with a cheer tone on a star streak (third star in a row), ducks behind the body for a second on a soaked hard hit and waves at the finish, via one-line `buddyReact()` hooks at the star, `applyDamage` and `finishLevel` sites. `prefers-reduced-motion` stops every idle animation. Suite life-check (17).

## v12.6 (2026-10-08, user-directed: "no tilt, more 3D, swipe steering, premium")

- [x] T18.1: No tilt. The chase-cam car transform is translate + squat only; the skewX toward the vanishing point and the lane/bend bank are gone.
- [x] T18.2: 3D lighting. `partSVG` layers shared gradient overlays (`V3D_DEFS`) on every box/cylinder/hull face: top sheen, side fall-off, back-face ambient occlusion with a bevel hairline, tire highlight/contact band; `vehicleRearSVG` draws a blurred footprint shadow under wheeled bodies. Overlays, so pattern paints are untouched.
- [x] T18.4: Imperfect armor. The shield rolls per point of damage (block chance 50 / 65 / 80% by pip, `ARMOR_BLOCK`) instead of soaking a flat point per pip; a held point pings with a blue bloom on the car, a miss crunches as before; `armorRoll` is the test seam.
- [x] T18.5: Glyphs. The engine upgrade is a speedometer with the needle pinned (the flame read as fire, not speed); the dice button is a pair of crossing shuffle arrows.
- [x] T18.3: Swipe steering. The slider is gone; a swipe anywhere on the road changes lanes (70 px per lane, long swipes walk several). A lane-dot pill bottom-left shows the lane; two breathing chevrons beside the car hint the swipe on levels 1-2 until the first steer. verify.cjs covers a right swipe and a two-lane left swipe. 22 suites, 368/368.

## v12.7 (2026-10-08, user-directed: "upgrades way more expensive, two more items")

- [x] T19.1: Ladders. Engine 60/150/350, armor 50/120/300, magnet 40/100/250 (were 20/40/80 and 15/30/60). Two new workbench upgrades: tank (+2 fuel units per pip via `fuelMax()`, filled on purchase) and springs (`springK()` scales launch speed and gravity together, so jumps go 18% higher per pip and land where the level designer cleared). Both pips ride a 4-bit v3 save-code tail (95 bytes). upkeep-check +3. 22 suites, 371/371.

## v12.8 (2026-10-08, user-directed: "shuffle inline with the tabs, production GO and map")

- [x] T20.1: The shuffle button ends the tab row (76px, x 664-740, 28px after the wrench so it reads as a tool, not a tab); the right wall keeps only the daily gift. GO is a glossy green dome with a double ring, bevelled chevron and a press that sinks; the map is a 96px blue card with a folded map, route and pin. Column: gift 192-280, map 392-488, GO 504-684. Tests: upkeep-check column geometry, title-check gift placement.

## v12.9 (2026-10-08, user-directed: "jumps and corkscrews and wackier courses like hard turns, go wild")

- [x] T2.3: Speed-linked mixer drum. The chase-cam mixer's drum (`.drum`) is turned from `tick()` at 40 + 0.95·v degrees a second (a lazy churn parked, about two turns a second flat out) instead of the fixed 2.2 s CSS spin; still under reduced motion. The garage idle putter half shipped with T17.5. course-check.
- [x] T21: Wild courses. Corkscrews (`TWISTS`, `rollAt`, 2200 long): the road ahead rolls about the vanishing point while the ground, roadside and `#env` sky layers roll the other way, so the world spins around an upright car through a tunnel of striped hoops; stars only inside (a helix laid first), no ramps or arches near one, a swirl sound on entry, reduced motion keeps the hoops and drops the roll. Hard turns (`CURVE.hard`) with red chevron boards on the outside verge and a tire howl at speed. Four new course shapes swapped into every world's order (`corkscrew`, `roller`, from world 3 `switchback` and `zigzag`); finales from world 2 add a twist. Jumps: `rampLaunch` is the one launch rule (the fairness bot calls it too), `megaRamp` (150 high, kick 1.1, launch capped at 740) and `hopChain` (three 45-high kickers) with physics-derived clear zones. New suite course-check (21). 23 suites, 392/392.
- [x] T21.1: Re-review fixes. Ramp beats are measured by what they place: `tryRamp` takes back any that would touch down past `landLimit` (L13, L22, L28, L34, L114 had ramps past the flags, one finish on a slope, one in the air) and retries a plain ramp; when none fits, the road home is star trails. The forced-ramp clash check uses the real launch x (after the 350 run-up), the runway floor can no longer push the only jump into a twist, twist bookkeeping is restored exactly on a take-back. Filler barrels keep the last 300 of a ramp run-up and the 300 before a same-lane star clear. World 1's corkscrew moves to level 9 (level 7 is too short for a twist and a jump). course-check 22. 23 suites, 393/393.

## v12.10 (2026-10-08, user-directed: "see-through hills, two-decimal times")

- [x] T22.1: Solid hills. Every far-hill tile (`WORLD_FAR` and the default) draws with a solid pre-blended fill instead of 0.7 to 0.95 opacity, so the sky no longer shows through and the 520px tiles no longer stack darker bands at their seams. World packs 9 to 12 stripped too.
- [x] T22.2: Times to two decimals: the HUD run clock, the results card and the ghost gap chip (`+1.25` / `-0.40`); best times are stored to 0.01. HUD time slot widened with tabular numerals; ghost chip 176px at 32px type so `+12.34` fits beside the progress bar. verify.cjs checks the formats; its star-collect check now picks a star with no neighbour inside the collect window.

## v13.0 (2026-10-08, user-directed: "ghost up top, corkscrew is buggy, more gravity")

- [x] T23.1: Ghost chip in the top HUD row at 316 (after the level flag); `#road.ghostOn` moves the progress bar to 508 while a ghost rides.
- [x] T23.2: Corkscrew rebuilt as a ribbon. `rollPt()` turns road points and road props about the hoop axis in car space (`proj`, `placeSprite`), `rollNear()` keeps the deck flat for the first 120 units ahead of the car; the ground, sky, hills and roadside never roll (the old world-roll tilted only some layers: two horizons, a seam, a wall of road ahead). course-check asserts the sky stays up and the sprites turn.
- [x] T23.5: The wash tile always leads the workbench strip when the truck is muddy; repair, fuel and tires follow.
- [x] T23.4: Lane perspective. `vehicleRearSVG(st, camOff)` composes the car for the camera's lateral offset (`vpOff` in `vp`: the rear-bumper plane stays put, farther parts drift toward the vanishing point, side faces and the inner tire wall show when the camera is outboard of them). `setCarView` keeps quarter-lane views cached per build and swaps them as `laneVis` slides, re-binding wheels, drum, mud, headlights and damage overlays.
- [x] T23.3: Gravity 1900 on earth-type worlds (1 to 7, 9, 10; was 1500); the moon 640, the deep sea 1100 and the sky kingdom 900 keep their float. `flightLen` interpolates from `G_EARTH`. Fairness bots green on all 120 levels.

## v13.2 (2026-10-08, user-directed: "the corkscrew has never been worse, spin up some testing")

- [x] T24.1: Corkscrew as a car barrel-roll. The road, ground, sky and sprites no longer move at all (`rollPt`, `rollNear`, `groundRoll` and the twist branches in `proj` / `placeSprite` / `drawRoad` are gone); `tick` rotates `#carWrap` by `rollAt(carX)` with a 30 px lift through the top, the baked contact shadow fades while rolling and the canvas footprint stays on the road. Screenshot sequences along the twist on levels 9, 17 (opposite roll) and 28 (two twists, night) in three lanes; course-check asserts a flat world, an upside-down car mid-twist and a level car after. 23 suites, 394/394.

- [x] T24.2: Hills hide what stands behind them. `buildOcc` keeps a per-frame running minimum of the ground's screen y by depth; `placeSprite` clips sprites (props, scenery, the ghost) at the crest line in front of them, `occClip` does the same for ramps, the finish stripe and the hoops. Houses, silos, stars and ramps no longer float over the face of a hill. course-check 23. 23 suites, 395/395.

## v13.2.2 (2026-10-09, user-directed: "make this AAA worthy", round 1 of 5)

- [x] T25.4: Blob shadows under every prop (`div.shd` in the sprite wrapper: radial gradient, footprint from `SHADOW_W` or the art width, fainter and smaller with height, none for flat props, arches or the ghost) and atmospheric haze on far sprites (`div.hz` masked by the sprite's own SVG via one shared stylesheet rule per art string, stepping to 0.45 of the world haze colour at the fade band). Both ride the crest clip-path. polish-check 19. 23 suites, 398/398.

## v13.3.0 (2026-10-09, user-directed: "implement all" of the AAA list, rounds 2 to 5)

- [x] T25.1: Camera dynamics and impact juice. Damped lateral follow (`CAM_W`, `CAM_Z`), lens widening with speed (`fovK`, `CAM_D = CAM_D0 / fovK` per frame), landing dip, decaying 2D hit shake on the road layers only (`startShake`, `applyCamFx`), hit-stop scaled by damage (70 / 110 ms), debris chips in the prop's colours, wrench-chip bump, landing squat and dust, star pop with three sparks to the star chip. All off under reduced motion. feel-check 18.
- [x] T25.2: Steering yaw. `vp` rotates car space about the rear axle by `carYaw` (`vrot`, `faceVis`), front tires steer, `tickYaw` eases toward `YAW_MAX` 0.18 while `laneVis` glides, views cached per quarter-lane x yaw step. No tilt, skew or roll. verify 40.
- [x] T25.3: Ground texture and ramp wedges. Shoulders, field strips (`fields`), crown and wheel wear on every world via `groundTones` defaults with hand tuning for construction, farm, snow, desert, volcano and candy; ramps get a side wall and lip shadow, the finish stripe a near edge; quads batched per tone (`roadQuadN` <= 700). worlds-check 25.
- [x] T25.5: Audio. `ENGINE_VOICES` by body family with virtual gears, throttle and clunks; `sfx.passby` doppler on passing props; `MUSIC[w]` adaptive beds per world (bass always, arp and percussion with speed, riser in the air and in corkscrews, ducked at the finish, silent in quiet mode) with a documented `MIX`. world-check-audio-events 26.
- Five worktree agents, squash-merged; 23 suites, 421/421, lint 0.

## Backlog (v2 candidates, from kid-testing)

- [ ] T2.1: Real-device iOS pass: audio unlock, multi-touch, add-to-home-screen icon.
