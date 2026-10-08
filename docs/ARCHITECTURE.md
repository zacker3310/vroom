# Vroom architecture

A tour of how one `index.html` becomes a twelve-world driving game. Everything referenced
here is in that file; search for the quoted identifiers. Numbers are the shipped values as of
12.0.0 and the test suite pins most of them.

## Layout of the file

```
<head>      metas, manifest + icon links, <title>
<style>     ~1100 lines: scenes, chips, Toybox design tokens (:root), per-world themes
<body>
  #stage    1200x700, six scenes: #title #garage #map #road #album #celebrate, plus overlays
  <script>  ~6700 lines, in this order:
            version, stage scaling, catalog + economy, state + persistence, audio,
            side-view bodies (BODIES) + accessories + buddies, premium pack, shop pack,
            paint pack, garage UI, profiles + save codes + QR, road scene (projector,
            course, CAR3D rear bodies, props, beat sequencer), world tables, physics loop,
            celebrate, map, album, world audio, world packs A and B, update gate
```

Packs register by assignment into tables defined earlier; the anchor comments
(`SHOP PACK anchor`, `PAINT PACK anchor`, `WORLD PACK anchor A/B`) mark where. See
[CONTRIBUTING.md](../CONTRIBUTING.md) for the pack contracts.

## Stage and scenes

`#stage` is a fixed 1200x700 box; `fit()` scales it with
`min(innerWidth/1200, innerHeight/700)` on resize, orientation change and visual-viewport
change, so every layout number in the game is in stage px. Scenes are absolutely positioned
`.scene` divs toggled with `.active`; transitions iris through `#iris`. Portrait shows
`#rotateOverlay` because the 64 px touch floor only holds in landscape (1024x768 is the
reference iPad frame the tests measure at).

Input is pointer events only (`touch-action: none`). The game acts on `pointerdown`, which is
why the suites dispatch `PointerEvent('pointerdown')` directly instead of Playwright's
click (animated elements fail its stability check).

## State and persistence

`state` is the build (`body`, `wheels`, `color`, `decal`, `number`, `buddy`, `extras{}`); `progress` is
everything earned (`wallet`, `current`, `levels{n: {best, rating, tier}}`, `owned{}`,
`upgrades`, `damage`, `muddy`, `fuel`, `tread`, `quiet`, `badges`, `photos` (last 6), `buddy`...). `save()`
writes `{ build: state, ...progress }` to `localStorage["vroom.v2.p<n>"]` where `n` is the
active profile from `vroom.meta` (up to 3). `loadState()` migrates the single-profile
`vroom.v2` key into profile 0 and the v1 build before that, and validates every saved id
against the catalog, which is why packs must register before it runs.

## Economy

Stars are the only currency and only ever go up during a run. The catalog has 23 bodies, 14
wheels, 23 paints (12 colours + 11 patterns), 9 stickers plus the race number, 12 extras (3
free, 9 paid) and 10 capsule buddies, and `PRICES` is the one table of what costs what. Prices
form three bands so the garage always holds something just out of reach: everyday parts at
20-120 stars (horn-grade extras, the first wheels and paints, most bodies up to the ambulance
at 110), a mid tier at 150-300 (submarine 150, pirate 180, ufo 200, dino 220, limo 250,
unicorn 280, dragon 300, and from 12.5 the three aspirational accessories: `jetpack` 180,
`disco` wheels 220 and the `trophyrack` 260 that shows the kid's best five medals as cups),
then the 400-star race number and the 1000-star hover ship as the long goals. Upkeep (fuel,
tires, repairs) is priced per unit so a few stars always fix something. Every part in
`PRICES` adds up to 6,715 stars (7,500 with the race number and the three upgrade ladders),
and a level pays out its collected stars plus the finish and shine bonuses, so owning
everything is roughly a tour of all twelve worlds.

## Vehicles: two views, one build

**Side view** (`vehicleSVG`, viewBox `0 0 320 230`, ground `y=200`, car faces right) is used
by the garage, wash bay, album photos and map. Each `BODIES[id]` is an SVG string with
`fill="var(--paint)"` on the painted panels; pattern paints swap `--paint` for a
`url(#p:...)` def emitted by the paint pack for that view. Wheels are `wheelSVG(type, cx)`
with per-type rim decor; big wheels lift the whole body group. Accessories, decals, mud,
damage scuffs and the buddy are placed at the body's `anchors`, the only positioning data a
body carries (`roof`/`rear` are derived from `beacon`/`flag` by `deriveBodyPoints`).

**Rear view** (`vehicleRearSVG`) is what drives. Each `CAR3D[id]` lists parts in **car
space**: `x` lateral (+ right as seen from behind), `y` up from the ground, `z` forward from
the rear bumper, authored at full size and shrunk by `CAR_K = 0.5`. Part constructors are
`box`/`cbox` (axis-aligned boxes with optional front-face slope `y1f`), `cyl` (cylinders along
z), `hullP` (convex hull of rings, for saucers and domes), `poly3` (free polygons, dragon
wings) and `spr` (a sprite at a point). Each face is projected with

```
vp(x, y, z) = [ x·CAR_K·s,  (CAM_H − y·CAR_K)·s − CAM_H ]   where s = CAM_D / (z·CAR_K + CAM_D)
```

so the SVG origin is the rear bumper's ground point (stage 600, 650) and the hood runs off
toward the horizon. Painter's order: far `z0` first, then low `y0`, `late` parts last. Rear
anchors `[x, y, z]` place the same accessories plus `win` (damage crack) and `smoke`.

## The chase-cam projector

World coordinates kept the side-scroller's `x` (distance along the road) when the game went
head-on in v10, so the level generator, physics and collision code never changed. A prop has
`x`, `lane` (0 left, 1 centre, 2 right), `lx = laneX(lane) = (lane − 1)·LANE_W` and height
`h`. The camera constants:

| Constant | Value | Meaning |
|---|---|---|
| `HORIZON` | 290 | vanishing line on the stage |
| `CAM_D` | 520 | camera distance behind the car; scale 1 at the car |
| `CAM_H` | 360 | camera height; the car's ground line lands at y=650 |
| `LANE_W` | 240 | lane spacing at the car's depth |
| `CAM_FOLLOW` | 0.6 | how far the camera slides with a lane change (the car moves the other 40%) |
| `DRAW_FAR` / `DRAW_NEAR` / `FADE` | 3400 / −260 / 500 | depth window and the far fade |

A point at depth `z = p.x − carX` projects to

```
s  = CAM_D / (z + CAM_D)
sx = 600 + (lx + offAt(z) − camX) · s
sy = HORIZON + (CAM_H + camElev − elevAt(carX + z) − h) · s
```

(`proj()` for the canvas ground plane, the same math inline for sprites). Sprites get
`translate(sx, sy) scale(s·k)`, a z-index of `20000 − z` (hit things pop over the car at
25000), and opacity fading over the last `FADE` units.

### Curves

`COURSE` is a list of stretches `{x0, x1, k}` with signed curvature `k` (px of lateral drift
per unit² of depth) from `CURVE = { gentle: 0.0001, medium: 0.00018, tight: 0.0003 }`.
`curvAt(x)` sums the stretches covering `x`, each eased linearly in and out over
`CURVE_EASE = 320` units. Once per frame `buildOffsets(carX)` integrates curvature twice
outward from the car (`z = 0`, road dead ahead) in `OFF_STEP = 40` steps into the
`Float32Array OFF`, forward to `DRAW_FAR` and backward to `DRAW_NEAR`; `offAt(z)` interpolates
it. The car always drives the centreline, so the road, every sprite and the roadside all
add `offAt(z)`. `headingAt(x)` (a flat approximation of the eased integral) drives the
skyline parallax. The car itself stays square to the road (v12.6 removed the skew and bank), only squatting on the gas and lifting on the brake. Chase-cam parts are lit by shared object-bounding-box gradients (`V3D_DEFS`: top sheen, side fall-off, back-face ambient occlusion, a bevel hairline, a tire ramp) layered over the fill so pattern paints keep working, and a blurred footprint polygon grounds the car on the tarmac.

`buildCourse(n, rng, len)` authors a level's bends from its world's **road character**
`WORLD_ROAD[w] = { k, hp, len, gap, order }` (base curvature, hairpin strength, bend-length
and straight multipliers) and a fixed ten-entry `order` of shapes for the ten levels:
`sweeper`, `esses`, `twin`, `bookends`, `drag`, `wiggle`, `spiral`, `chicanes`, `hairpins`
and the finale `tour` (sweeper, chicane, hairpin, esses back to back). Later levels in a
world bend 15% harder (`k·(0.85 + 0.3·i/9)`). Bends stay out of the first 950 and last 1020
units.

### Hills

`HILLS` is a list of `{x0, x1, amp}`; `elevAt(x)` sums `amp·(1 − cos(2π·t))/2` over the hills
covering `x`, a smooth bump that starts and ends flat. `buildCourse` lays them from
`x = 600..1200` to `len − 1400` with lengths 1100-2400, amplitude
`WORLD_META[w].hill · (0.7 + 0.3·i/9) · (0.5..1)`, 30% of them dips at −0.6. The camera rides
the road at the car (`camElev = elevAt(carX)`), so a crest ahead lifts the far road toward
the sky and a dip hides it. World amplitudes: 0 for construction, rain and beach; 70 sunset;
40 night and deep sea; 110 snow; 80 desert; 130 moon; 120 volcano and sky; 60 candy.

### The ground plane

`drawRoad(carX)` repaints `#roadCanvas` (2x backing store) every frame: sky haze at the
horizon, grass bands alternating every `SEG = 160` units, asphalt, rumble strips, lane
dashes, sloped ramps, the checkered finish stripe and the ground shadow under a jumping car,
all as `quad()`s of four `proj()`ed corners with the world's `ROAD_PAL[w]` palette.

## Physics

`VMAX = 700`, `ACCEL = 900`, `COAST = 350`, `BRAKE = 1600` (units/s and units/s²); the engine
upgrade adds 80 top speed per level (`vmaxEff()`), damage at 5+ takes 15% off, a low tank
(`fuel <= 2`) 20% and a dry one 45% (the car crawls, it never stops), bald tires (`tread <= 2`)
10%. Lane changes ease `laneVis` toward `targetLane`, at 60% rate on bald tires (`gripK()`).
`burnUpkeep(d)` runs from `tick()` in levels only (not free drive or the parade): a unit of
fuel per 15600 units of road (`FUEL_PER_UNIT`, about three levels), a unit of tread per
31200, plus a sixth of a unit of tread per soaked hard hit (`HIT_TREAD`) in `applyDamage`.
A tank lasts about 24 levels, a set of tires about 48. Both gauges are 0-8 floats shown rounded up on
the HUD; the wrench tab in the garage wears a pulsing dot while anything is low, dinged or
muddy, and the workbench tab grows a fill-up tile (1 star a unit, partial fills allowed) and
a tire tile (1 star a unit, the whole set). `finishLevel` adds the shine bonus, +50% of the
collected stars rounded up, when the truck crosses the line with no mud and zero damage. Jumps use the world's gravity: 1500 on earth, 640 on the
moon, 1100 in the deep sea, 900 in the sky kingdom; `flightLen(w)` interpolates ramp
flight distance from gravity (950 units on earth, 1850 on the moon) so the level generator
can keep landings clean. Collisions run in `tick()`: every live prop's `PROP_HIT[type](p, d)`
handler is called with `d = carX − p.x` and decides its own hit window (typically a few
dozen units around the car and within 0.65 lanes; `CAR_HIT_Z = 100` puts the contact point
up by the hood rather than the bumper). Stars chime up a combo ladder, cones tumble,
barrels/rocks/TNT hit-stop for 90 ms and add damage, oil spins, puddles muddy a wheel,
capsules roll a prize. `HARD_T(type)` is the single definition of "hard" the budgets, bots
and world packs all use.

### The ghost race

A level run (never free drive or the parade) is sampled every `GHOST_DT = 0.2` s of `runTime` as
`[round(pos), round(laneVis x 100), round(jumpY)]`, appended to one flat int array. At the line,
`finishLevel` keeps the run as `progress.levels[n].ghost = { t, p }` (`t` the run time to 0.01 s,
`p` the array; about 60-150 samples, 1-2 KB a level) when the level had no ghost or this run was
faster; a slower run leaves the old ghost alone. Ghosts live in localStorage only: `loadState()`
drops anything that is not `{ t > 0, p: ints, length a multiple of 3, at least 2 samples }` and
`exportFullCode` strips them, so no save code ever carries one and `packCompact` is untouched.
On the next run `ghostStart` spawns one `makeSprite("ghost")` holding `vehicleRearSVG(state)`
minus mud, damage and hitbox, placed each frame by `ghostPlace` through the same `placeSprite`
projector as every prop at `x = pos_g + CAR_SCREEN_X - CAR_HIT_Z`, `lx = (lane_g - 1) * LANE_W`,
`h = jumpY_g`, where `ghostAt(ghostT)` interpolates linearly between samples (and extrapolates
past the last one). `ghostT` is the ghost's own clock, advanced in `tick` alongside `runTime`, so
the twin keeps rolling after the kid finishes and fades out `GHOST_FADE = 0.8` s after its own
line. The sprite is never in `props`, so no `PROP_HIT` or mover sees it. `#hudGhost` shows
`round(ghostTimeAt(pos) - runTime)` signed: positive means the kid reached this point sooner.

## The beat sequencer

A level is a seeded sequence of **formations** ("beats"). `defBeat(name, kind, minLvl, fn)`
registers one; `fn(b, x)` places props from `x` using the beat context `b` (safe placement:
`put`, `star`, `high`, `capsule`; lane helpers `inside`/`outside` read `curvAt` so star trails
hug the inside of a bend and obstacles crowd the outside; `pickLane` gives the middle lane a
30% share so a toddler who never steers still finds stars) and returns where it ended.
38 beats ship: 8 star beats (`trailStraight`, `snake`, `rainbow`, `arc`, `doubleRow`,
`starGate`, `starShower`, `stairway`), 6 obstacle beats (`slalom`, `gate`, `closingWalls`,
`coneForest`, `bowling`, `minefield`), 4 rhythm beats (`capsuleAlley`, `puddleParty`,
`oilSlalom`, `breather`), 4 ramp beats (`ramp`, `rampArc`, `rampStairway`, `rampShower`) and
two per world for worlds 5-12 (`snowmanChoir`, `icePatch`, `cactusCanyon`, `tumbleweeds`,
`crabCrossing`, `sandcastles`, `craterField`, `alienWelcome`, `lavaHop`, `geyserRow`,
`gumdropGarden`, `donutRoll`, `jellyBloom`, `crabCourt`, `stormFront`, `kiteFestival`).

`buildLevel(n)` (seed `mulberry32(n·7919 + 13)`; the course uses its own seed):

1. **Length.** `levelLen(n) = 3500 + min(n,20)·250 + max(0, n−20)·100`, capped at level 80
   so deep worlds get harder, not longer (runs stay under ~25 s).
2. **Signature.** `signatureOf(n)`: odd levels are star-led, even levels obstacle-led; the
   pool is every beat of that kind (plus the world's own beats) unlocked by `n`; the pick is
   seeded and skips any beat the previous four levels led with.
3. **Rhythm.** One contrast of the opposite kind, one rhythm beat, and one of three templates
   such as `[sig, con1, sig, breather, sig, con2, sig]`. Finales (level 10 of a world) drop
   the breathers. Cameos: level 2 gets `puddleParty`, levels 3-30 a `capsuleAlley`, worlds
   5-12 both of their world beats.
4. **Ramps.** 1-4 (one more on a finale, capped at 3/4 on the moon) at evenly spread target
   x's, each a different ramp beat from the last. Every road opens with stars, never a wall;
   an obstacle beat straight after a ramp gets a 350-unit run-up; nothing sits in the first
   1000 units; a finale reserves its last 560 for `starShower`.
5. **Guarantee passes.** Remove blockers from ramp zones (the ramp, its tail and 200 before).
   Ensure ingredients: a puddle from level 2, a capsule from 3, oil and a barrel from 5, TNT
   from 12 (swapped in for a barrel), both world hazards, at most 2 capsules. Enforce the hard
   budget `minHard(n) = floor(1 + min(n,50)·0.3)` .. `maxHard(n) = floor(2 + n·0.45)` by
   demoting extras to cones or promoting cones to barrels/rocks, never closing all three lanes
   within 240 units (`hardLanesNear`), never placing a hard prop in a star trail's lane, and
   keeping barrels/rocks at least half the hard count even on a TNT-heavy level.

`tests/level-report.cjs` prints the resulting beat sequence per level; `fairness-check.cjs`
drives every level with two bots through the real `PROP_HIT` code (the smart bot: one lane
change per 350 units toward stars and away from hard props, must take ≥45% of the stars with
≤4 hard hits; the lazy toddler: centre lane, gas only, must finish every level and find ≥15%
of the stars on levels 1-20).

## Worlds

`WORLD_COUNT = 12`, `WORLD_SIZE = 10`, so `MAX_LEVEL = 120` and `PARADE_LEVEL = 121`.
`worldOf(n)` picks the tables: `WORLD_META` (headlights, gravity, hills), `ROAD_PAL`
(canvas palette), `WORLD_CSS`/injected styles (sky, sun, clouds, weather), `WORLD_SET`
(roadside pool), `WORLD_ARCH` (the structure you drive under), `WORLD_LANDMARK` and
`WORLD_FAR` (horizon), `WORLD_WEATHER` (particles), `WORLD_ITEMS` + `EXTRA_PROPS` + `PROP_HIT`
(the two hazards, some with an `mv` mover spec: tumbleweeds, crabs, jellyfish, kites),
`WORLD_ROAD`, the world beats, and the audio tables below. Worlds 1-8 live in the main body
of the script; 9-10 and 11-12 are packs registered at anchors A and B. Free drive
(`freeMode`) tours the worlds with no finish and distance-gated difficulty; the Victory
Parade (`paradeMode`) is a one-off level at `PARADE_LEVEL` with its own jingle, events and
fans.

## Audio

Everything is synthesized in one `AudioContext`, unlocked on the first `pointerdown` (iOS).
Every voice routes through `masterBus`, a `DynamicsCompressor` (threshold −14 dB, knee 20,
ratio 8) so stacked sfx never clip iPad speakers. `tone(type, f0, f1, dur, vol, delay)` is the
workhorse (an oscillator with a frequency glide and an exponential decay); `noiseBurst` is
filtered noise. `sfx.*` are the UI/world sounds, `HONKS[body]` the per-body horn voices.
Quiet mode multiplies every voice by `volScale() = 0.22`.

The engine (`engineStart`/`engineSet`) is two sawtooth oscillators detuned 9 cents through a
low-pass swept from 260 Hz to 1360 Hz with speed, plus a looping noise buffer through a
band-pass at 1100 Hz that fades in over the top 40% of the speed range as wind; all
parameters move with `setTargetAtTime` to avoid zipper noise.

Per world: `JINGLES[w]` (a start sting), `AMBIENCE[w]` (a looping bed built from `ambNoise`,
`ambLFO`, `ambEvery`, `ambPing`), `STAR_SCALES[w]` + `STAR_BASE[w]` (the ratio ladder each
star-combo step climbs: major pentatonic for construction, minor for night, blues for the
desert, whole tone for the moon, dorian for the deep sea, lydian for the sky) and
`WORLD_EVENTS[w]` (seeded live sky events with their own sounds: lightning, owl, whale,
UFO, volcano burp, airship...).

## Save codes and the QR

Three code formats share the `VROOMn.` prefix plus base64url:

- **`VROOM1.`** compact bit-packed save (everything but photos and best times), the one the
  QR carries. `packCompact()` always writes layout version **3**; `unpackCompact()` reads 1, 2
  and 3.
- **`VROOM2.`** the full save as gzip JSON (`CompressionStream`), for the copy/paste buttons.
- **`VROOM3.`** the full save as plain JSON, the fallback where `CompressionStream` is missing.

### Compact layout, version 3 (current)

MSB-first bit fields, in order:

| Bits | Field |
|---|---|
| 8 | layout version = 3 |
| 16 | wallet (capped at 65535) |
| 8 | current level |
| 4 | damage (0-9) |
| 1, 1 | quiet, muddy |
| 2, 2, 2 | upgrades: engine, armor, magnet |
| 8 + n | owned bodies: count `n` then one flag per `CODE_BODIES` entry (18 today) |
| 8 + n | owned wheels over `CODE_WHEELS` (11) |
| 8 + n | owned paints over `CODE_COLORS` (6 colours + 11 patterns) |
| 8 + n | owned paid extras over `CODE_EXTRAS` (9) |
| 8 + n | owned decals over `CODE_DECALS` (8) |
| 8 + n | found buddies over `BUDDY_ORDER` (10) |
| 8 + n | badges over `BADGES` (8) |
| 8, 8, 8, 8, 8 | the build: indices into `BODY_ORDER`, `WHEEL_ORDER`, `COLORS`, `DECAL_ORDER`, buddy index + 1 (0 = none) |
| 8 + n | equipped extras over all extras incl. horn/beacon/flag (12) |
| pad | to a byte boundary |
| 8 | level count (`MAX_LEVEL` = 120) |
| 4 × levels | per level: rating (2 bits, 0 = unplayed) and medal rank (2 bits: C B A S) |
| 4, 4 | tail (12.2): fuel and tread, whole units rounded up; a code that ends before it reads as full |
| 7 | tail (12.3): race number + 1, 0 = none; absent on older codes |

Because every list is count-prefixed, a pack may **append** to any catalog list and older
codes still decode (shorter lists read fewer bits); reordering would silently swap parts.
With today's catalog a code is exactly 94 bytes (the layout is fixed-size once the catalog
is), 126 base64url characters after the prefix; the hosted URL plus the code is 174 bytes
and lands in QR version 8 (49x49 modules).

### Versions 1 and 2 (read-only)

Same first 37 bits (version, wallet, current, damage, quiet), then: buddy index (3), upgrades
(2, 2, 2), 2 spare bits, then **fixed-width** flag runs for the catalog as it stood when v3
shipped (`CODE_V2 = { body: 10, wheels: 5, extras: 3, buddy: 6, decals: 5 }`,
`CODE_COLORS_V2 = 6`), badges over the frozen `CODE_BADGES` (6: champ travels only in full
codes), pad, then exactly 80 levels x 4 bits. Version 2 appended 5 decal flags, a 3-bit
equipped decal and the muddy bit. A code whose reads run past its payload is rejected.

### The QR encoder

`qrEncode(text)` is a from-scratch QR writer: byte mode, error-correction level L, versions
1-10 chosen by capacity (`BLOCKS` holds the data-codeword block sizes per version, `ECPB`
the EC codewords per block). Data codewords get the mode/length header, terminator and the
0xEC/0x11 pad pattern; Reed-Solomon over GF(256) with the QR generator polynomial produces
each block's EC codewords; versions 6-10 interleave data and EC codewords across blocks per
the spec; the matrix gets finder, timing and alignment patterns (`ALIGN`), zigzag data
placement under a fixed mask 0 (`(r + c) % 2 === 0` flips), the format bits (BCH(15,5) over
level L + mask 0, XOR 0x5412) and, for version 7+, the 18-bit version-info blocks. (A fixed
mask skips the penalty-score pass; decoders do not care which mask was used.) `renderQR()` encodes
`SAVE_URL_PREFIX + packCompact()` (`https://zacker3310.github.io/vroom/#save=...`) so a
phone camera opens the hosted game with the save queued; `importSaveCode` then raises the
wordless tick/cross confirm. `profile-check.cjs` decodes the rendered canvas with jsQR and
checks the payload byte-exact, and exercises every version boundary.

## The update gate

At boot the page concatenates the text of its first `<style>` and `<script>` and hashes it
with FNV-1a (`bootHash`). `checkForUpdate()` fetches `location.pathname + "?v=" + Date.now()`
with `cache: "no-store"`, parses the response with `DOMParser`, hashes the same two blocks and
shows `#updateBtn` when they differ. It runs 2.5 s after boot, on `visibilitychange` back to
visible and every 10 minutes, rate-limited to one check per 30 s, never on `file:`, and any
network error is swallowed (offline in the car keeps playing). The badge needs a 1.6 s hold
(`UPDATE_HOLD_MS`, a ring fills) before it saves and navigates to a cache-busting URL, so a
stray toddler tap does nothing. Only the style and script blocks are fingerprinted:
`<head>` changes (metas, manifest, icons) do not trigger it, `APP_VERSION` is informational.

## Tests

Twenty-two Playwright suites (368 checks) in `tests/`, driving the real page in headless
Chromium through `playwright-core`; `tests/run-all.cjs` is the runner behind `npm test` and
`.github/workflows/test.yml` runs it in CI. See [tests/README.md](../tests/README.md) for the
map of what each suite owns.
