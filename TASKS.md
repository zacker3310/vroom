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

- [x] T7.1: Full visual/UX audit (agent, 17 screenshots, 25-item report: "two art directors: the album's language wins"). Found the WORLD_TINT key bug. [SPID]
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
- [x] T11.2 (agent): beat sequencer: 30 formations, per-level signature + contrast templates, world beats, finales, guarantee passes; `tests/level-report.cjs`.
- [x] T11.3 (agent): every world is a place: roadside pools (5-8 pieces each), overhead arches, horizon landmarks, festive parade set, free-drive re-skin.
- [x] T11.4 (agent): per-world audio (jingles, ambience beds, star scales, bend scrub) + 10 live sky events; suite `world-check-audio-events.cjs` (16).
- [x] T11.5 (agent): adversarial audit of all 80 levels (240 screenshots): owl/whale/snowball events redrawn, arches clear of ramp lips, landmarks drawn once; `buildCourse` rewritten with per-world road character (WORLD_ROAD: highway, switchback pass, drag strips, coast, moon chicanes) and a 10-shape menu so no level after L2 is straight and no neighbours match; fairness bots (greedy star-seeker + center-lane 'lazy toddler') drive all 80 levels: moon flights get a float arc and 950/1850 ramp tails, walls open within one lane of the kid, 700-unit runways, fills never trap a star trail; finales always end in a star shower. Suite `fairness-check.cjs` (9). 13 suites, 191/191.
- [x] T11.6-11.7: HUD row fills the width; garage top row spacing with fixed-width wallets.

## v12 (2026-10-07, user-directed: "go bonkers")

- [x] T12.0: plumbing for 12 worlds / 120 levels (WORLD_META, derived MAX_LEVEL/PARADE_LEVEL, 12 map tabs, length cap at L80), save-code format v3 (count-prefixed catalogs, build travels, v1/v2 decode kept), pack anchors.
- [x] T12.1 (agent): accessory anchor contract: per-body `anchors` in both views, all 15 bodies hand-tuned from contact sheets.
- [x] T12.2 (agents): worlds 9 Volcano, 10 Candy Land, 11 Deep Sea, 12 Sky Kingdom: themes, palettes, scenery pools, arches, landmarks, weather, 2 hazards each (timed geysers, rolling donuts, bobbing jellyfish, lane-hopping crab king and kites, thunderclouds), road character, beats, jingles, ambience, star scales, events; flight length scales with gravity.
- [x] T12.3 (agent): 11 pattern paints as SVG defs in both views, two-page swatch flipper; suite paint-check (22).
- [x] T12.4 (agent): shop pack: 8 bodies (hover 1000 with no wheels + glow + trail, bulldozer, school bus, ambulance, submarine, pirate, dino, unicorn), 5 wheels, 4 extras, 4 buddies, 3 decals; hold-to-cycle-back + dot indicator; legacy decoder sliced to v2 catalog sizes; suite shop-check (21). 15 suites, 237/237.

## v12.1 (2026-10-07, user-directed: "super clean and professional", "Nintendo-grade menu")

- [x] T13.1 (agent): visual polish across every screen: one panel recipe, aligned columns, consistent radii/borders/shadows, 12 tabs clear the top row, 76px hit zones on small nodes, parade/free-drive buttons mirror.
- [x] T13.2 (agent): code quality: 30-section TOC, dead code and always-true guards removed, shared helpers (injectCSS, restartAnim, mountCar, shopGateOpen...), ESLint harness at zero findings; byte-identical level report.
- [x] T13.3 (agent): repo hygiene: GitHub Actions CI, `npm test` runner, manifest + app icons, APP_VERSION in the grown-ups panel, README/CONTRIBUTING/ARCHITECTURE.
- [x] T13.4 (agent): garage redesign: car as hero, six category tabs + one scroll-snap tile strip (23/13/23/9/10 + workbench), GO dominant, repair/wash contextual, speaker moved to the grown-ups panel, title plate and side racks removed; suite garage-check (19). 16 suites, 256/256.

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

## v13.4.0 (2026-10-09, user-directed: "I want the actual track to be the corkscrew")

- [x] T26.1: The road is the corkscrew. Road-space points go through `rollPt(rollAt(x))` about the hoop axis (a real twisted ribbon inside the tunnel); the camera rides the car around the tube (`camWX`, `camWY`) and its roll is one rotation of `#view` about the vanishing point, with the car counter-rolled upright. Ground, fields, hoops and roadside stay in flat world space (`groundSpace`). While a twist is live: 1500 px square canvas at 1x backing (`setOverscan`), near plane at -80, occlusion off. Twist frames render faster than the straight road. course-check reworked (23). 23 suites, 421/421.

## v13.4.1 (2026-10-09, user-directed: "the export progress button is not working in the home-screen app")

- [x] T26.2: Export that works on iOS. The copy button awaited a gzip stream before touching the clipboard, and WebKit only grants the clipboard and the share sheet inside the tap itself, so in the home-screen app it always failed (deny sound, nothing copied). Now: the full code is pre-built when the overlay opens (`cachedCode`) with a synchronous plain code as the fallback (`exportCodeSync`), the button listens on click, a touch device or a standalone app goes through the share sheet (`sendSaveCode`, `preferShare`), a desktop through the clipboard, a dismissed sheet is not a failure, and a green check rides over the button when the code went. `decodeSaveCode` picks the `VROOM` token out of pasted text so a code sent inside a message pastes back. profile-check 15. 23 suites, 422/422.

## v13.5.0 (2026-10-09, user-directed: "free drive should only be playable every so often, end it at 100 stars")

- [x] T27.1: Free drive is a daily treat. `FREE_CAP` 100 stars per local day counted across runs (`progress.freeDay`, `progress.freeUsed`, localStorage only, excluded from save codes); the HUD bar is the day's star meter with the time slot counting the stars left; the cap ends the run with a flourish and sends the kid home with the stars (`finishFree`, `bankFreeRun`); the map button greys out with a moon badge (`renderFreeBtn`, `.spent`) and refuses with a deny shake until tomorrow. free-check 15. 23 suites, 423/423.

## v13.6.0 (2026-10-09, user-directed: "audit the economy; implement all; ghost victory pays 1.5x")

- [x] T28.1: Economy audit. The fairness bots' per-level take (good player 6,270 first-clear stars over 120 levels, toddler 3,170) against a 9,475-star catalog showed the first-clear economy well tuned and the leak in repeat income: replays paid full price every time (about 100 stars a minute on level 1, 75 per 20-second run by world 8). Upkeep was under 2% of income.
- [x] T28.2: Payout rule in `finishLevel`: first clear or a new star best pays in full; beating the ghost pays the stars at `GHOST_MULT` 1.5 (the celebrate card shows ghost + check + ×1.5); a plain replay pays `REPEAT_MULT` 0.5 and skips the finish and clean bonuses (a ½ badge on the tally). Shine applies to the paid stars. Stars never go down.
- [x] T28.3: Premium tier x1.5: pirate 270, dino 330, limo 375, unicorn 420, dragon 450, train 525, royal 600, crystal 180, disco 330, jetpack 270, trophy rack 390. World-1 pricing untouched. Fuel 4 a unit, tires 2 a unit (a fill-up is about 3% of a tour's income).
- Tests: damage-check (half-rate replay), ghost-check 17 (the x1.5 bank), upkeep-check and shop-check renumbered. 23 suites, 424/424.

## v13.6.1 (2026-10-09, user-directed: "the hills should not be see-through at all")

- [x] T28.4: Solid horizon. The canvas painted a 46 px full-strength haze band under the horizon line; against the far hills (which end exactly on that line) it read as a bright gap under their feet, as if the hills were translucent at the base. The band is now 26 px at half strength, so the hills meet the ground. Checked on rain, farm and night worlds at 2x.

## v13.7.0 (2026-10-10, user-directed: "surely you can make this cork better")

- [x] T29.1: Corkscrew polish. Sprites behind the car are hidden while the view rolls (`TWIST_BEHIND` -40: the ghost twin and roadside signs used to be rolled and magnified into the bottom of the frame); the ribbon is lit from the sky, each band shaded by how far its surface has turned (70% upside down) so the tube reads as a tube; `#weather` moved inside `#view` so the rain falls in the world and rolls with it. course-check's weather assertion updated. 23 suites, 424/424.

## v13.7.1 (2026-10-10, user-directed: "I want to be able to delete the game saves")

- [x] T30.1: Hold-to-delete a kid's save. A trash badge on each used profile slot opens a confirm card (avatar, star wallet, beaten levels, a big cross) with a 1.2 s hold button and fill ring on the update gate's pattern, so a tap cannot trigger it. `deleteProfile` removes the save key and clears the avatar; deleting the active kid hops to the lowest used slot or restarts slot 0 fresh and reloads to the garage. profile-check 20. 23 suites, 429/429.

## v13.8.0 (2026-10-10, user-directed: "the copy / share / paste is so clunky, overhaul it")

- [x] T30.2: Save transfer in two taps. The profile panel's save tools are a SEND half (the QR at 230 px plus one share button handing the share sheet the hosted link and the plain code, the clipboard on a desktop) and a RECEIVE half (one button opening a sheet: camera scan, clipboard, and a paste box for browsers that keep the clipboard to themselves). Every incoming save shows a wordless preview (the car, stars, beaten levels, the kid's avatar, a warning triangle when the profile here has beaten more) before the tick; the loaded car honks in with confetti after the reload. `exportJSON` now carries the avatar.
- [x] T30.3: In-app QR scanner (section 17b). `scanSaveQR()` opens a viewfinder (rear camera, brackets, scan line, cross, a picture picker that also reads a screenshot of a QR) and resolves the raw text; BarcodeDetector when a browser has it, otherwise a pure-JS decoder for the game's own QRs (byte mode, ECC L, v1 to v10: finder location, homography sampling, format BCH, Reed-Solomon) since WebKit never shipped the native one. A scanned code lands in the home-screen app's own storage, which the iOS camera could not do. A refused camera keeps the picker open.
- Three worktree agents, squash-merged with the hold-to-delete round. profile-check 31. 23 suites, 440/440.

## v13.8.1 (2026-10-10, user-directed: "way too complicated now, simplify it")

- [x] T30.4: Transfer collapsed to a QR and two buttons. Share (the share sheet with the hosted link plus the code, the clipboard on a desktop) and Scan (the in-app camera; its viewfinder keeps the picture picker). The receiver sheet, the clipboard-read button, the paste box and the send / receive panes are gone; a shared link still lands in the preview through the `#save=` hash. profile-check 30. 23 suites, 439/439.

## v13.8.2 (2026-10-10, user-directed: "a tap on the avatar should open one simple card: stats, play, delete, and paste a save in")

- [x] T30.5: The slot card. A tap on any face opens one card (`openSlotCard`): the kid, their car (`carOfSave`), stars and flags, play (switch; hidden for the active kid; starts a new kid on an empty slot), scan a save into this slot (`importSaveCode(code, slot)`, `pendingSlot`; `importYes` writes that slot, gives an empty slot a free face and makes it active), close, and the hold-to-erase ring. The trash badges and the panel's scan button are gone; the panel is the QR, share and sound. profile-check 32. 23 suites, 441/441.

## v13.9.0 (2026-10-10, user-directed: "more button options on the end-of-race menu")

- [x] T31.1: The results row. Again (big, pulsing, blue, far left) with the ghost to beat bobbing over it (`renderGhostTease`: the ghost icon wearing the medal its stored time earns on this road; the parade, which has no ghost, shows a slashed one), garage (orange, `showGarage` + `openTab("work")`: straight to wash, repair, fuel and tires), home (red), next race (big, pulsing, green). New `--v-accent-orange` tokens. ghost-check 19, parade-check updated. 23 suites, 443/443.

## v13.10.0 (2026-10-10, user-directed: "rename the game, make the title screen AAA, hold-to-update out on the title too")

- [x] T32.1: The name: Zoomies. `<title>`, the apple-mobile-web-app-title meta, `manifest.webmanifest` (name + short_name), the share-sheet title (`GAME_NAME`), `package.json`, README and doc headings. Storage keys (`vroom.*`), save-code prefixes (`VROOM1/2/3.`) and the repo URL stay as they are so every existing save and link keeps working. [SPID]
- [x] T32.2: The title as a moving world (section 30). Ten parallax strips built once by `buildTitleWorld()` (two cloud layers, two hill bands, a tree line, each a 1200 px tile drawn twice and slid a full tile per loop so there is no seam), a sun with turning rays, two birds crossing, the road dashes streaming at 437 px/s with the car's `.wheelrot` groups turning to match, exhaust puffs off the tail, a shadow on the tire line (`placeTitleGround()` measures `--tGround` per body, tracks and hover rings included). Entrance: the gold-rimmed badge slams in behind a shock ring and then floats with a glint sweep and four twinkles; the car drives in from off-stage; GO pops last and keeps a halo ring rolling outward with a gloss cap. Every keyframe is scoped to `#title.active` so nothing runs behind the garage, and all of it is off under `prefers-reduced-motion`. [SPID]
- [x] T32.3: The update gate on the title. `#titleUpdateBtn` beside the avatar shares `.updateGate` with the garage button; `checkForUpdate` arms both and the hold logic fills whichever ring is held (`updateHeld`). update-check 5 -> 8, title-check 13 -> 17, battery 443 -> 450. [SPID]

## v13.10.1 (2026-10-10, user-directed: "move the hovering ghost out to the left and have him taunting")

- [x] T32.4: The ghost to beat now taunts from the left of AGAIN instead of hiding under the results card: `ghostTauntIcon` (eyes on the button, one winking, tongue out, an arm waving it over) on a `teaseTaunt` wobble that leans in toward the button, with `tongueWag` and `armWave` on their own loops, the medal hanging below. The parade's slashed ghost stays calm and half-faded. All of it is in the reduced-motion list. [SPID]

## v13.10.2 (2026-10-10, user-directed: "the house swap, make it a map icon")

- [x] T32.5: The results row's red button is the level map: the wrench already lands in the garage, so the two buttons pointed at the same room. It wears the map pictogram (the garage's own, in white with red-down ink) and calls `showMap()`; polish-check's mid-tally exit now expects the map. [SPID]

## v13.11.0 (2026-10-10, user-directed: "revamp the home screen inspired by this one, find a spot for the Zoomies logo, the real worlds in the background")

- [x] T33.1: The landing. A wooden sign hangs from two chains over the stage with the ZOOMIES wordmark drawn as SVG paths (gold gradient, navy outline, a paw in the first O; the one word in the game, never `<text>`), a star pennant, a checkered flag, leaves, a glint sweep and twinkles; it drops in, swings to rest and sways. Behind it a panorama of the twelve worlds in parallax bands: desert mesas and arch, snow peaks with a waterfall, the volcano, the sky kingdom's floating castle (far); the construction crane, the rain city with its cloud, candy-land lollipops, beach palms over the sea with the deep sea's whale (mid); the hills; fences, bushes, cactus and paw signposts at the road edge and the verge flowers below it (road speed). The space corner (SVG radial fade, stars, ringed planet, the night's moon, a rocket crossing) and two sunset balloons live in the static sky. The car sits centred on the road, wheels turning, exhaust puffing, shadow on the tire line; the play pill (380x152) glows at the bottom with its gloss and halo. Everything scoped to `#title.active`, all of it off under reduced motion. title-check: play pill >= 150 stage px tall, 12 tile svgs, balloons, no SVG text nodes. CLAUDE.md records the wordmark exception. [SPID]

## v13.11.1 (2026-10-10, user-directed: "the play button should say play, make it skeuomorphic with proper shadowing and spacing")

- [x] T33.2: The play pill, 420x152, built like a toy button: a top-lit gradient face, an inset highlight and a shaded lower lip, the thick green base, a soft ground shadow, and a press that sinks it 8 px onto the base. The face is a white play chip on the left and PLAY on the right, the letters drawn as paths like the wordmark (CLAUDE.md records both exceptions). The gift badge rides the upper right shoulder clear of the Y. [SPID]

## v13.12.0 (2026-10-10, user-directed: "rebuild the corkscrews: the car follows the road through an upside-down turn, no rolling view; and fix the see-through hills now")

- [x] T34.1: The loop. The corkscrew no longer rolls the view: the camera stays level and the car follows the twisting ribbon, placed at its lane spot turned by `rollAt(carX)` (`carRibDX`, `carRibY`) and turned about its own contact point, so it climbs the wall, hangs upside down under the ribbon at the top and comes back down while sky, ground, hoops and roadside stay the right way up; the camera follows 60% of the climb (`LOOP_FOLLOW`) so the rise is visible. `setViewRoll`, `setOverscan`, the 1500 px canvas, `TWIST_BEHIND` and the counter-roll are gone. course-check 3 rewritten: no view roll, camWY above CAM_H mid-twist, the car at rotate ~pi and 264 px above its line, sideways on the wall, stars turning with the ribbon, canvas 1200x700 throughout. [SPID]
- [x] T34.2: Opaque crests. `buildOcc` marks ground beyond a back-facing step that lies lower than the highest crest ahead (`OCCH`), `drawRoad` veils it and the strip up to the horizon with haze (`mixHex`, `occTop`, `occA`), fading over the last 280..60 units to the crest so the far side unfolds instead of popping; sprites, ramps and hoops on hidden ground stay out until the veil is under 0.15. Dips keep their far side, taller hills behind keep their head. course-check: the run-up veil (lower ground beyond the crest hidden, haze above the crest line, nothing in front clipped) and the crest (veil gone, far side back); 23 -> 24, battery 450 -> 451. [SPID]

## v13.12.1 (2026-10-10, user-directed: "the corkscrews still need massive amounts of work")

- [x] T34.3: Loop rendering pass. Inside a twist the ribbon is painted in half-bands (80 units) so it curves instead of kinking, drops its shoulders so it reads as a bare tube of tarmac and rumble rather than a wide deck turned on its side, and the stretch behind the car dissolves over 120 units (tarmac alpha, no dashes) so the rolled near field never sweeps a giant slab across the frame. [SPID]

## v13.12.2 (2026-10-10, user-directed: level 116 screenshot, the ribbon on edge beside the camera was a wall)

- [x] T34.4: The glass road. Inside a twist the ribbon's deck is painted at `LOOP_DECK` (0.55) alpha, rumble edges solid, so the stretch standing on edge beside the level camera is a tinted sheet the world shows through instead of a grey wall filling half the frame; the helix still reads from its edges and the hoops. [SPID]
## v13.13.0 (2026-10-10, user-directed: "the underwater levels need massive amounts of work")

- [x] T35.1: Deep sea rebuild. The glass tunnel is drawn (`drawTunnel`: pale ribs every 320 units in world space, clipped to crests, fading far, never inside a corkscrew twist); the hard navy band is a water column that runs down into the seabed (`#road.w11` gradient landing on the haze at `HORIZON`, `hazeH`/`hazeA` deepen the canvas veil); a caustic light dapple drifts over the seabed (`#seaCaustic`, transform-only, soft-light, masked at the horizon, still under reduced motion); a slow whale silhouette crosses the far water, the light shafts sway and there are more bubbles; four new roadside pieces (sea star cluster, sunken rowing boat, diver's helmet with a crab, anemone with a clownfish); the palette is a cool sandy-teal seabed with a greyer sand road, white and light-blue rumbles, a dune shoulder and no field strips; the roller level's train is long low swells (`WORLD_META[11].roller`). worlds-check +5 (30).

## v13.13.1 (2026-10-10, user-directed: "need to be able to paste a save file on the plus button")

- [x] T35.2: The paste button. An empty slot's face on the slot card is a raised clipboard-with-plus button: a tap reads the clipboard inside the gesture (`readClipboardText`, a test seam) and hands the text to `importSaveCode(text, slot)`, so a pasted code raises the usual preview aimed at that slot; anything that is not a code shakes the face (`receiveDeny` picks the face on a blank card). profile-check 32 -> 33, battery 456 -> 457. [SPID]

## v13.13.2 (2026-10-10, user-directed: "the copy paste isn't working")

- [x] T35.3: The paste read moved from pointerdown to click: WebKit only grants clipboard access (and shows the iOS paste bubble) inside a click's activation, the same gate the share button already uses; pointerdown keeps the pop. [SPID]

## v13.13.3 (2026-10-10, user-directed: "play button needs to be like 35% smaller")

- [x] T33.3: The play pill at 65%: 275x100 (was 420x152), its face, halo and shadows scaled with it, still well over the 76 stage px tap floor. [SPID]

## v13.13.4 (2026-10-10, user-directed: "once it receives the paste the slot card should dismiss and show the preview with the green accept")

- [x] T35.4: A good paste closes the slot card as the preview comes up, so the tick is the only thing left to press; a bad paste still keeps the card and shakes the face. [SPID]

## v13.14.0 (2026-10-10, user-directed: "what can we do to fix the damn corkscrews" -> option 1, the side-view loop cutaway)

- [x] T36.1: The corkscrew cutaway. The rolled ribbon, its level-camera follow, the glass deck and the counter-roll are gone: on the chase cam a twist is flat road with its star helix in the hoop tunnel. While the car is inside one, `loopTick` keeps `#loopView` up: a side-view scene from the world's palette with a drawn loop (ring, rumble edges, centre dashes), the kid's own side-view car riding the ring's inner surface by `loopPt(u)` (flat run-in, a full turn at the pace of the straights, upside down at the top, flat run-out), wheels turning, puffs off the tail, and every twist star drawn on the loop, popping as the real simulation collects it; the star pickup ignores lanes inside a twist. Closes on the far side; reduced motion never opens it. course-check rewritten (loop maths, the cutaway mid-twist with the HUD on top, a full drive collecting every star lane-free); 24 -> 23, battery 457 -> 456. [SPID]

## v13.15.0 (2026-10-10, user-directed: "forget the corkscrews: a monster eats the vehicle and spits it back out and you lose some stars"; the play button smaller and lifted)

- [x] T37.1: The chomper replaces the corkscrew on every world. A purple monster sits across the road with its mouth for an archway (`addChomper`, arch-style scenery); a trail of stars leads in and the stretch past the mouth stays clear (`chompClear`). The jaws open with a growl within 1100; at the mouth the bite: `#chompView` clips shut over the stage under the HUD, the car is held by the crash hit-stop for 900 ms, munch sounds and a chew shake, `chompDrop` tosses min(3, run stars) back onto the road ahead in the kid's lane (`p.spat`), then `chompSpit` opens the jaws with a ptooey and launches the car in a high arc over them. The wallet never drops (CLAUDE.md records the wrinkle). The loop cutaway, the hoops and every rolled-ribbon remnant are gone; `sfx.growl/gulp/munch/spit` replace the swirl. course-check rewritten (23 -> 20), worlds-check ribs probe moved to CHOMPS, docs/chomper.png replaces corkscrew.png. [SPID]
- [x] T33.4: The play pill at 240x88, lifted to 566 so its base and shadow sit inside the stage, centred on the verge row. [SPID]

## v13.16.0 (2026-10-10, user-directed: "jumps and turning should slow you down, especially against a ghost")

- [x] T38.1: A clean line is faster. `LANE_SCRUB` 0.94 per lane crossed on every lane change above 100 px/s, `LAND_SCRUB` 0.85 on every touchdown, so a swerving, jumping run no longer matches the ghost that did not; medal curve untouched. feel-check 18 -> 19. [SPID]

## v13.17.0 (2026-10-10, user-directed: "make a ton of them single lane, dual lane or all three lanes")

- [x] T38.2: Chompers in three sizes. Every `CHOMPS` entry carries `l0..l1`, the lanes it covers: a small monster in a single lane, a middling one over two, the giant across all three (`chompLanes`, dealt from a seed off the level number so the roads never moved, never the same size twice on one level; 11/10/12 across the 120 levels). `addChomper` scales the one piece of art by the sprite's `k` (`CHOMP_K`) and centres it on its lanes; only the full one is an arch. The star trail runs in the monster's lanes only (alternating under two, a single file under one) after the opening run's stars in the run-in make way, and `chompOff` keeps other stars out of the run-in's other lanes. `chompTick` bites only with the car's lane inside `l0..l1`; in another lane the car drives past and `chompMiss` snaps the jaws shut behind it with a munch, no hold, no stars. course-check 20 -> 23 (size mix, trail lanes and placement, the drive-past), battery 453 -> 456. [SPID]

## v13.18.0 (2026-10-10, user-directed: "I need a variety": set pieces in single-, two- and three-lane sizes, plus gaps in the track)

- [x] T38.3: Ramps in three widths. Every ramp carries `l0..l1` (`rampLanes`: a third one lane, a third two, a third the whole road, seeded per level, levels 1-2 full); the deck, walls, chevrons and lip shadow draw over those lanes only; `rampOn` / `rampElev` / `rampBehind` read the car's lane so a car beside a narrow deck drives past on the flat and only one on it climbs and launches; `rampRoll` is the one frame step the loop and the fairness bots share (a lane change off the side of a deck is a plain drop, no kick); the flight star and the mega / hop arcs sit in the deck's lanes. [SPID]
- [x] T38.4: Track gaps. `GAPS` of `{x, w: 220, l0, l1}`: a dark hole with a hazard rim in the rumble tones on the road canvas, a board on each verge. The `gap` beat (one or two lanes, stars round it) goes in on cue from level 15 (a second past 40), the `rampGap` ramp beat lays a full-width hole 120 past a full-width ramp's lip that a three-quarter-speed launch clears. Placement: never the first 600 or last 700, a chomper, a ramp zone, within 300 of a blocker or 900 of another gap, three a level; blockers keep 300 clear, low stars never float over a hole, hard props also stay out of the 350 past a landing. Driving in (`gapTick`, the hazard pass) is a soft hit: a thud, the drop, a third of the speed kept, no damage, no stars lost. The smart bot dodges holes like barrels; both bots roll through `rampRoll` and `gapTick`. course-check 20 -> 27 (460 checks). [SPID]

## v13.18.1 (2026-10-10, user-directed: "running into the chomper needs to cause massive damage and he has to spit you back out the way you came")

- [x] T38.5: The bite does 3 damage with the crash shake; the spat stars land before the mouth in the kid's lane and the spit throws the car backwards through the air (`chompFling`) to land behind them; the beast dozes off full and the road through it is open, so the kid drives back up and collects. [SPID]

## v13.19.0 (2026-10-10, user-directed: "drop the sun chip, grey disc, update README completely")

- [x] T39.1: The map's day chip (a sun with the day of the month) is gone: `#todayChip`, its CSS, `EV_SUN` and the fill in `renderMapEvents`; events-check follows. [SPID]
- [x] T39.2: The grey disc: the ghost twin drawn between the camera and the car (a flat saucer body there projects as a huge translucent disc across the road). During a race `ghostPlace` never draws the twin behind the car and fades it right out on top of the kid's car; after the finish it may still drive through the frame. ghost-check 19 -> 20. [SPID]
- [x] T39.3: README rewritten for the game as it is: Zoomies, the title landing, chompers in three sizes, ramps in three widths, track gaps, the clean-line speed scrubs, solid hills, the paste button, the results row; new docs/gap.png and docs/narrowramp.png; counts and version badge current. [SPID]

## v13.20.0 (2026-10-10, user-directed: "gravity needs majorly nerfed, the vehicles are going way too high")

- [x] T40.1: Launches cut hard: the standard kick 0.9 -> 0.6 (`KICK_STD`, also the flight-star arc), mega 1.1 -> 0.75, hop 0.55 -> 0.4, the springs ladder +18% -> +8% a pip (1.24 at the top, was 1.54), the chomper's spit 470 -> 420. Flight tables, tails and landing zones unchanged (they were generous), so every landing stays clear. [SPID]

## v13.26.0 (2026-10-10, user-directed: "move the hold-to-reload button to the home screen and make it replace PLAY; implement what you think is best")

- [x] T46.1: The PLAY pill is the update gate. When a new version is on the server the pill goes amber and swaps its face for the update one (a tray with an arrow dropping in, the hold ring round it, three sparkles: pictograms, no third word on screen); press and hold fills the ring and loads the new version, a quick tap lets go and stays put. The two round gate buttons (title and garage) are gone. update-check rewritten (8 -> 6), title-check follows. [SPID]
- [x] T46.2: Audit cleanups. Every em dash in the repo is gone (index.html comments, TASKS, SPEC, tests/README, four suites). package.json carries the app version. SPEC: 120 levels, ten buddies. The dead corkscrew-renderer paragraph in ARCHITECTURE is one sentence. The armor probe waits for the hit instead of a fixed 650 ms (it flaked under battery load). The fairness bots roll seeded blowout dice, so every run is reproducible. [SPID]

## v13.25.0 (2026-10-10, user-directed: "I can still see through the hills and some items off the road are being cut off, do a full sweep")

- [x] T45.1: Hills are solid again. The veil loop in `drawRoad` had lost its body, so the valley behind a crest showed through wherever a taller hill behind lifted the haze band above the crest line. The veil quads are back, one per run of hidden steps and clipped to above the crest in front (the crest's own face stays ground); a hill behind keeps its head only when `OCC_HEAD` (60) clear of the crest, and the veil holds to 180 before the crest and is gone at 30 (was 280..60). polish-check: a pixel sweep of every see-through spot on level 5's run-up. [SPID]
- [x] T45.2: Nothing off the road is cut off. A boot-time sweep (`fitAllArt`) measures every scenery piece, world prop and arch and grows its SVG box to its art without moving its ground point; 40 pieces, two props and five arches were drawing past their boxes (the pipe stack lost its top pipe, the crane its top, the volcano its foot). The chomper's box now holds its horns and chin. worlds-check: every piece and base sprite inside its box. [SPID]

## v13.24.0 (2026-10-10, user-directed: "the sign needs to be shrunk a bit so we can see the whole thing")

- [x] T44.1: The whole ZOOMIES sign is on the stage. The chains and flags were drawn above the SVG's top edge, so they could never show. The sign is 560 wide (was 680), its canvas runs 50 units higher, and a wooden rail at the top is what the chains hang from; rail, chains, both flags and the plank now sit inside the sky band above the skyline. docs/title.png regenerated. [SPID]

## v13.23.0 (2026-10-10, user-directed: "I have absolutely no clue what's going on here, make it the best damn album for a AAA Nintendo style game")

- [x] T43.1: The album is a scrapbook. Three framed, taped pages that pop in one after the other, each with a pictogram tab (paw, rosette, camera) and a found/total count that turns green when complete. The photo wall replaces the "last six finishes" strip (six replays of level 2 made six identical polaroids): 13 frames in a fixed order, one per world and a gold one for the parade. `keepPhoto` offers each finish to its world's frame, which only ever gets better (medal, then stars; the newest of equals). Empty frames show the world's icon as a ghost and deny a tap. Photo backdrops gain a sun or moon, a hill band and the road's dashes. Anything new since the last visit wears a pulsing gold star for that visit (`progress.albumSeen`, localStorage only). Older saves collapse to one photo per world on load. The stale 96 px buddy override and two duplicate CSS blocks are gone; every slot is 80 px or more. album-check 15 -> 20. [SPID]

## v13.22.0 (2026-10-10, user-directed: "gaps need proper lip and depth and absolutely fuck up the vehicle, pop the tires randomizer, the track in the future is not rendering fast enough")

- [x] T42.1: Holes with depth. Each gap is drawn through its ground-level opening as a clip: a near-black floor 90 deep, the far wall lit, the side walls that face the camera, a lip 10 proud of the tarmac all round with shaded faces and hazard-striped tops, three cracks into the road before it. The crest clip is anchored at the cracks, and the near lip's conditions now compare against the near plane (the old rim compared against the hole's own edge, so a near rim never drew). course-check: a pixel probe through the opening (floor, wall, tarmac). [SPID]
- [x] T42.2: The drop wrecks the car: 2 damage with the crash shake, a real fall (74 px, 9 degrees, .7 s), speed down to 15%, no stars lost. The dice (`gapRoll`, a suite seam) under 0.35 blow a tire: tread to 0 at once, a bang and a hiss, the car rides a flat (`#carWrap.flat`, `carLimp`; a still list under reduced motion) until new tires; `syncFlat` keeps the look on the tread at drive start, wear ticks and the workbench. course-check: the wreck, the blowout, no pop over the dice. [SPID]
- [x] T42.3: The road reaches the horizon. `ROAD_FAR` (14000) is the ground's own draw distance: the lateral offset table, the crest table, the far ground bands (400 units out to 4800, then growing with depth, a dozen bands), ramps, holes and the flags all run to it, so the tarmac bends and climbs into the haze a dozen px under the horizon instead of ending in a stub 4600 out. Sprites go out to 4200 (from 3400) with the same fade. Level 80 frame time unchanged (16.7 ms median, the vsync floor). polish-check: a pixel probe at HORIZON + 14. [SPID]

## v13.21.0 (2026-10-10, user-directed: "drove into the chomper again and went straight through him: needs to spit out and eat stars every single time")

- [x] T41.1: The beast never sleeps. Every approach re-arms the jaws; a car back in the mouth's lanes is bitten again (damage, stars, the backward throw) every time, and the spit shoves it into the open lane beside the mouth. Chompers now cover one lane or two, never all three, so an open lane always exists; the spat stars land in that open lane too, a consolation run of five stars waits past the beast in it, and jaws that snapped shut behind a miss stay shut for that approach. The fairness bots model the bite and the snap, the smart bot dodges the mouth. course-check: sizes, the shove, the trail, a second bite (30 -> 32). [SPID]

## Backlog (v2 candidates, from kid-testing)

- [ ] T2.1: Real-device iOS pass: audio unlock, multi-touch, add-to-home-screen icon.
