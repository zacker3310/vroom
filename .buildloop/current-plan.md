# Plan — Vroom v3: lanes, pedals, points, 30 levels, unlock shop

## Dependencies
None (zero-dep single file). Agent deliverable: scratchpad/new-vehicles.js (6 bodies, 3 wheels, honks) — integrate when ready.

## Design decisions
- **No fail states preserved**: hitting a hard obstacle = bonk + stop + wobble, never game-over. Cones stay knockable-for-fun (soft). Points only go up. SPEC amended: stars ARE now kept (user-directed v3 change).
- **Currency = stars.** Collected stars bank into a persistent wallet. +3 finish bonus per run. Level rating 1-3 by % of placed stars collected (≥34% → 2, ≥80% → 3).
- **Economy**: bodies police 25 / race 40 / tractor 60 / icecream 80 / rocket 120 / ufo 200; wheels gold 30 / flower 50 / tank 70; colors purple 10 / teal 10 / lime 15 / white 15 / black 20 / rainbow 60. Starters (5 bodies, 3 wheels, 6 colors) free.
- **Shop is implicit in the garage**: cycling includes locked items; locked selection = grayed preview + price-tag button under it, GO disabled. Tap tag: enough stars → unlock (fanfare + confetti), else boink + wallet shake.
- **Flow**: garage → GO drives `current` level. Map button (next to GO) → level-map scene (6x5 grid of 30). Win → next level unlocks and becomes current; celebrate offers replay / next / garage.
- **Lanes**: 3 lanes on a widened road. Lane ground Y = 520/585/650, car scale .88/1/1.12, zIndex by lane. Swipe up/down on road OR side arrow buttons OR arrow keys. Collision uses rounded visual lane.
- **Pedals**: green gas (bottom right), red brake (left of it, squeal + fast decel). Hold-road-to-drive kept; vertical drag ≥45px mid-hold = lane change.
- **Levels**: seeded mulberry32(level). length = 3500 + level*250. hard/soft obstacles = 3 + floor(level*.8) from {cone(soft), barrel(hard), rock(hard), puddle(splash)}, stars = 6 + floor(level/2), 1-3 all-lane ramps, high stars over ramps. Guarantee: within any 260px window ≤2 lanes hard-blocked. Themes: day (1-10), sunset (11-20), night (21-30) via CSS class on #road.
- **Persistence**: `vroom.v2` = { build, wallet, owned{body[],wheels[],color[]}, levels{n:{best,rating}}, current }. Migrate v1 build.

## Review fixes folded in (from mini-review)
- engineSet: setTargetAtTime ramps, no per-frame .value writes
- fit(): + orientationchange + visualViewport resize
- unlockAudio: try/catch
- whee on every airborne launch (no speed gate)
- prop collision → handler registry keyed by type
- comment magic hitbox constants

## File operations (all MODIFY /Users/zacker/Documents/dev/vroom/index.html; MODIFY SPEC.md, TASKS.md)
1. CSS: 3-lane road strip (two dashed separators), lane arrow buttons, gas/brake pedals, HUD (wallet chip, level badge), map scene grid, price tag, locked preview, theme classes, star-row celebrate, garage wallet chip.
2. HTML: #map scene, HUD in #road, brake pedal, lane arrows, price tag in garage, wallet chips, map button, celebrate 3-button row.
3. JS state: PRICES, owned defaults, wallet, levels progress, current; load/save v2 + v1 migration.
4. JS vehicles: merge NEW_BODIES/NEW_WHEELS/NEW_WHEEL_DECOR/NEW_HONKS; rainbow paint via per-SVG unique gradient id; wheelSVG decoration hook.
5. JS garage: cycle-through-locked, locked preview + price tag, buy flow, GO gating, wallet render.
6. JS map: render 30 buttons (lock / number / rating); tap unlocked → currentLevel + showRoad.
7. JS road: buildLevel(n) seeded gen; scenery width from level length; barrel/rock SVGs; car lane lerp + scale + z; swipe/arrows/keys; gas+brake; per-lane collision soft/hard; HUD star counter; finish → bank, rating, unlock next, celebrate.
8. JS audio: brake squeal, buy fanfare, sad-bonk (soft), new honks.

## Verification
- `python3 -m http.server 4173` + Playwright: cycle all 11 bodies incl locked, buy flow (seeded wallet), GO, lane change hits star / barrel stops car, brake works, finish level 1, wallet banked, level 2 unlocked, console clean, targets ≥64px.
- Doubt sub-agent audit per build-loop skill.

## Constraints
- SPEC design rules stay: zero required reading (numerals OK), ≥64px targets, instant feedback, no fail states.
- Single file, no deps, section banners kept.
