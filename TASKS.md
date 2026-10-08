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

- [x] T17.3: Ghost race against yourself. Level runs are sampled every 0.2 s (`[pos, lane, jumpY]` as a flat int array) and the fastest run per level is kept as `progress.levels[n].ghost = { t, p }` (localStorage only, never in a save code; malformed traces dropped on load). A stored ghost rides the next run as the kid's own car at 45% with a dashed ring, projected through `placeSprite` so it sits right in bends and over hills, interpolated by its own clock, fading out after its own finish; it never collides. A ghost chip under the level chip shows the signed gap in seconds (green ahead, putty behind, hidden with no ghost and during the celebration). Beating the ghost pops the medal bigger and adds a ghost + check on the time chip; losing changes nothing. Suite ghost-check (16).

## Backlog (v2 candidates, from kid-testing)

- [ ] T2.1: Real-device iOS pass: audio unlock, multi-touch, add-to-home-screen icon.
- [ ] T2.3: Speed-linked mixer drum spin and idle engine putter in garage.
