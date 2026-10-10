# Zoomies architecture

A tour of how one `index.html` becomes a twelve-world driving game. Everything referenced
here is in that file; search for the quoted identifiers. Numbers are the shipped values as of
12.0.0 and the test suite pins most of them.

## Layout of the file

```
<head>      metas, manifest + icon links, <title> (the game's name lives here, in the apple-mobile-web-app-title meta, in manifest.webmanifest and in GAME_NAME; storage keys and save-code prefixes stay "vroom")
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
at 110), a mid tier at 150-200 (submarine 150, ufo 200) and, after the 13.6 audit lifted the premium
tier by half, pirate 270, dino 330, limo 375, unicorn 420, dragon 450, train 525, royal 600,
with the three aspirational accessories at `jetpack` 270, `disco` wheels 330 and the
`trophyrack` 390 that shows the kid's best five medals as cups, then the 400-star race number
and the 1000-star hover ship as the long goals. Upkeep is priced per unit (fuel 4 a unit, a
tire set 2 a unit, repairs 2 a point): a fill-up every twenty levels or so is about 3% of a
tour's income, a choice at the workbench rather than a formality. Every part in `PRICES` adds
up to about 7,900 stars (about 10,700 with the race number and the five workbench ladders:
engine 60/150/350, armor 50/120/300, magnet 40/100/250, tank 50/120/300, springs 50/120/300).

The payout rule (`finishLevel`, 13.6): a first clear or a run that sets a new star best for the
level pays every star collected, plus 3 for finishing, 2 for a run with no new dings, 25 the
first time a world's last level falls, and the shine bonus (+50% of the paid stars when the
truck crosses the line washed and undamaged). Beating the level's ghost pays the stars at
`GHOST_MULT` 1.5 with the same bonuses. A plain replay (no new best, ghost not beaten) pays
the stars at `REPEAT_MULT` 0.5 and skips the finish and clean bonuses, so a favourite level is
a treat but not a farm. The fairness bots measure 6,270 first-clear stars over all 120
levels for a good player (3,170 for the gas-only toddler), so owning everything takes the
whole tour plus ghost wins, free drive and the daily gift. Nothing ever takes stars away.

Free drive (the map's green button) is capped at `FREE_CAP = 100` stars per local day, counted across
runs in `progress.freeDay` / `progress.freeUsed` (localStorage only, never in a save code, like
`lastGift`). The HUD progress bar doubles as the day's star meter and the time slot counts the stars
left; reaching the cap ends the run (`finishFree`: flourish, then home, where `bankFreeRun` banks and
counts the stars) and `renderFreeBtn` greys the button with a moon badge until tomorrow.

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
| `CAM_D` | 520 (`CAM_D0`) | camera distance behind the car; scale 1 at the car. Per frame `renderWorld` sets `CAM_D = CAM_D0 / fovK` (the lens widens up to 7% at full speed, 13.3) and restores it |
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
25000), and opacity fading over the last `FADE` units. Each sprite wrapper also holds a blob
shadow (`div.shd`, radial gradient sized from `SHADOW_W` or the art width, smaller and fainter
with `h`, none for `NO_SHADOW` types) and a haze overlay (`div.hz`, the world's haze colour
masked by the sprite's own SVG through one shared stylesheet rule per art string, stepping from
35% of `DRAW_FAR` to 0.45 at the fade band); both ride the transform and the crest clip.

Camera dynamics (13.3): `camX` follows the lane target through a damped spring (`CAM_W`,
`CAM_Z`, settles in about 350 ms, so the car visibly swings ahead of the view), `fovK` eases
toward `1 + FOV_PUNCH` with speed, a landing dips the view (`DIP_*`, scaled by fall speed) and a
hit runs a decaying 2D shake (`startShake(dmg)`, applied by `applyCamFx` as one transform on
`#roadCanvas` and `#world`, never the HUD). `camTick(dt)` runs all of it before `renderWorld`;
under reduced motion it snaps the follow and zeroes the rest. The car itself yaws toward the
lane it heads for while `laneVis` glides (`tickYaw`, `carYaw` up to `YAW_MAX = 0.18`): `vp`
rotates car-space x/z about the rear axle (`vrot`) before the perspective, `faceVis` picks the
visible side faces from the real camera position, and the front tires steer with it;
`setCarView(q, ys)` caches views on a quarter-lane x yaw-step grid. No tilt, skew or roll.

### Curves

`COURSE` is a list of stretches `{x0, x1, k}` with signed curvature `k` (px of lateral drift
per unit² of depth) from `CURVE = { gentle: 0.0001, medium: 0.00018, tight: 0.0003 }`.
`curvAt(x)` sums the stretches covering `x`, each eased linearly in and out over
`CURVE_EASE = 320` units. Once per frame `buildOffsets(carX)` integrates curvature twice
outward from the car (`z = 0`, road dead ahead) in `OFF_STEP = 40` steps into the
`Float32Array OFF`, forward to `DRAW_FAR` and backward to `DRAW_NEAR`; `offAt(z)` interpolates
it. The car always drives the centreline, so the road, every sprite and the roadside all
add `offAt(z)`. `headingAt(x)` (a flat approximation of the eased integral) drives the
skyline parallax. The car itself stays square to the road (v12.6 removed the skew and bank), only squatting on the gas and lifting on the brake; in a side lane it is composed for the camera's real lateral offset (`vpOff`, quarter-lane views cached by `setCarView`), so the inner flank shows and the far end leans toward the vanishing point. Chase-cam parts are lit by shared object-bounding-box gradients (`V3D_DEFS`: top sheen, side fall-off, back-face ambient occlusion, a bevel hairline, a tire ramp) layered over the fill so pattern paints keep working, and a blurred footprint polygon grounds the car on the tarmac.

`buildCourse(n, rng, len)` authors a level's bends from its world's **road character**
`WORLD_ROAD[w] = { k, hp, len, gap, order }` (base curvature, hairpin strength, bend-length
and straight multipliers) and a fixed ten-entry `order` of shapes for the ten levels:
`sweeper`, `esses`, `twin`, `bookends`, `drag`, `wiggle`, `spiral`, `chicanes`, `hairpins`
and the finale `tour` (sweeper, chicane, hairpin, esses back to back). Later levels in a
world bend 15% harder (`k·(0.85 + 0.3·i/9)`). Bends stay out of the first 950 and last 1020
units.

v12.9 added four wilder shapes, two or three per world's order: `switchback` (alternating
hard turns), `zigzag` (sharp kinks on a straight), `corkscrew` (one twist, two rolling opposite
ways from world 3) and `roller` (a train of big short hills whatever the world's own hill
setting); finales from world 2 add a twist to their `tour`. A **hard turn** is a stretch at
`CURVE.hard = 0.00075` (anything at `HARD_K` or sharper): `addChevrons()` stands red boards with
white chevrons on its outside verge, splitting the road at the midpoint between close kinks so
every board stands nearest its own turn, and the tires squeal through it above 450.

### Corkscrews

`TWISTS` is a list of `{x0, x1, dir}` (`TWIST_LEN = 2200`); `rollAt(x)` is the road's roll,
`dir·2π·smootherstep`. The road itself twists: every road-space point (the tarmac bands, shoulders,
dashes, road props, the ghost) goes through `rollPt(rollAt(x), lx, h)`, a turn about the hoop axis
`HOOP_C` above the deck, so the ribbon ahead climbs the wall, goes over the top inside the hoops and
comes back down. The ground plane, fields, hoops and roadside are painted in flat world space
(`groundSpace` flag in `proj`). The car follows the ribbon (13.12, the loop): its lane spot turned by
`rollAt(carX)` is where it draws (`carRibDX`, `carRibY`), turned about its own contact point, so it
climbs the wall, hangs under the ribbon upside down at the top and comes back. The camera never
rolls: it stays level and follows the car part of the way up (`LOOP_FOLLOW = 0.6` of the climb goes
into `camWX / camWY`), so the car visibly rises on screen while sky, ground, hoops and roadside stay
the right way up. Each road band is shaded by how far its surface has turned from the sky (`lit` in
`drawRoad`, down to 70% upside down) so the ribbon reads as a tube. Inside a twist the ribbon is painted in
half-bands (80 units) so it curves, without shoulders, its deck at `LOOP_DECK` (0.55) alpha with solid rumble
edges (a glass road: the stretch standing on edge beside the camera is a tinted sheet, not a wall), and the
stretch behind the car dissolves over 120 units. The 13.4 to 13.11 corkscrew
rolled `#view` with the car (camera on the tube, a 1500 px overscan canvas, the car counter-rolled)
and read as the whole world flipping; the loop keeps only the ribbon and lets the car do the turning.
`drawHoops()` rings the twist with
striped hoops every 150 units (only the arc above the deck). Twists carry stars only: the helix
(three stars a lane, `[1, 2, 1, 0]`) is laid before any formation, `put` and `spotFor` refuse
blockers within 150, overhead arches stay 700 away, and a ramp beat whose run-up-to-touchdown
would cross one is taken back whole (`tryRamp`) and flown after it. `tryRamp` also takes back any ramp beat
that would touch down past `landLimit` (the last 600 before the flags, or a finale's star shower), retrying
it as a plain ramp; when not even that fits, the rest of the road is star trails, never new hazards.
World 1's corkscrew is level 9: a shorter road cannot hold a 2200 twist and a jump. Reduced motion keeps the
hoops and drops the roll (`rollOK`).

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
horizon, grass bands alternating every `SEG = 160` units, lateral field strips in two extra
tones (`fields` extents mirrored both sides: crop rows on the farm, dune ridges, drifts, lava
cracks), a dirt shoulder outside each rumble strip, asphalt with a crown highlight down the
centre and faint wheel-track wear in the outer lanes, lane dashes, sloped ramps with a
camera-facing side wall and a lip shadow, the checkered finish stripe with a near edge, and the
ground shadow under a jumping car, all as `quad()`s (batched into one fill per tone where they
share a colour; `roadQuadN` counts subpaths, budget 700) of four `proj()`ed corners with the
world's `ROAD_PAL[w]` palette. `groundTones(P)` derives the new keys (`shoulder`, `field`,
`fields`, `crown`, `wear`) from the base palette once per world when a pack does not set them. The road paints back to
front, so a crest hides the road behind it on its own; everything else is clipped against `OCC`, a per-frame
running minimum of the ground's screen y by depth (`buildOcc`, `occAt(z)`): `placeSprite` cuts a sprite at the
crest line with a `clip-path` in its own pre-transform pixels, and ramps, the finish stripe and the hoops draw
inside `occClip` (a canvas clip rect). A thing on the crest itself is never cut: `OCC[i]` only counts ground
strictly nearer than its depth.

Opaque crests (13.12). The camera sits 360 above the road and hills top out near 220, so every crest is below
the eye and, geometrically, the plain beyond shows above it; the renderer used to draw that plain in full, props
and all, and every hill read as glass. `buildOcc` now also marks hidden ground (`OCCH`): once the ground ahead
has turned its back to the camera (`zTurn`, the first step past the car whose screen y rises), anything farther
that lies lower than the highest crest so far is hidden. `drawRoad` veils those bands and the strip from the
visible ground's top (`occTop`) to the horizon with haze (`mixHex(haze, ground)` under a haze gradient), at
strength `occA`, which fades from 1 to 0 over the last 280..60 units to the crest so the far side comes through
instead of popping; `placeSprite` and `occClip` keep sprites, ramps and hoops on hidden ground out until the
veil is under 0.15. A dip keeps its far side (same height as its near lip) and a taller hill behind keeps its
head. In a twist nothing is hidden or clipped: the ribbon has left the ground.

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
40 beats ship: 8 star beats (`trailStraight`, `snake`, `rainbow`, `arc`, `doubleRow`,
`starGate`, `starShower`, `stairway`), 6 obstacle beats (`slalom`, `gate`, `closingWalls`,
`coneForest`, `bowling`, `minefield`), 4 rhythm beats (`capsuleAlley`, `puddleParty`,
`oilSlalom`, `breather`), 6 ramp beats (`ramp`, `rampArc`, `rampStairway`, `rampShower`, `megaRamp`, `hopChain`) and
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

The deep sea (world 11, section 29) is the one world that is drawn as water rather than sky.
`#road.w11` is a water column gradient that lands on `ROAD_PAL[11].haze` exactly at `HORIZON`,
and the palette's `hazeH`/`hazeA` keys deepen `drawRoad`'s horizon veil (150 px at near full
strength) so the far reef silhouettes, the haze and the sandy-teal seabed melt together with no
line. The palette's `tunnel` key switches on `drawTunnel`: a pale rib every `TUN_GAP` (320)
units from z 100 to `DRAW_FAR`, each one stroke in `groundSpace` about the road's axis
(`TUN_R`, `TUN_C`), clipped by `occClip` and fading with the far fade, never within
`inTwist(x, 150)` because the corkscrew's hoops own those stretches (`tunnelRibN` counts them
for the suite). `#seaCaustic`, a div inside `#view` shown only under `.w11`, is the light
dapple on the seabed: a tilted repeating radial-gradient plane drifting by `transform` alone,
masked out toward the horizon, blended `soft-light`, still under `prefers-reduced-motion`.
`WORLD_WEATHER.w11` adds a slow whale silhouette (`.seaWhale`, an inline SVG data URL crossing
the far water once a minute) to the swaying light shafts and the bubbles. The palette sets an
explicit `shoulder` a hair lighter than the seabed and `fields: []` so a slope reads as a dune,
and `WORLD_META[11].roller` (`len`, `amp`) stretches and lowers the roller train into long
swells that still clear course-check's big-hill bar.

## Audio

Everything is synthesized in one `AudioContext`, unlocked on the first `pointerdown` (iOS).
Every voice routes through `masterBus`, a `DynamicsCompressor` (threshold −14 dB, knee 20,
ratio 8) so stacked sfx never clip iPad speakers. `tone(type, f0, f1, dur, vol, delay)` is the
workhorse (an oscillator with a frequency glide and an exponential decay); `noiseBurst` is
filtered noise. `sfx.*` are the UI/world sounds, `HONKS[body]` the per-body horn voices.
Quiet mode multiplies every voice by `volScale() = 0.22`.

The engine (`engineStart`/`engineSet(v, gas, brake)`) is a voice from `ENGINE_VOICES` picked
by body family (`ENGINE_FAMILY`: trucks, race cars, tractors, whining rockets and UFOs, a
default): a sine sub, two detuned saws through a resonant low-pass (the growl, with a chug LFO
for tractors), a high harmonic and wind from the shared noise buffer. Speed runs through 3-4
virtual gears with hysteresis (`GEAR_HYST`): a shift drops the pitch back with a throttle dip
and a clunk, braking shifts down, the gas opens the filter. `sfx.passby` plays a panned falling
whoosh when a sizeable prop passes the bumper at speed (`passByTick`, rate-limited). All
parameters move with `setTargetAtTime` to avoid zipper noise.

Music: `MUSIC[w]` is a per-world bed (bpm, root, bass / arp / percussion step strings in the
jingle's note vocabulary) scheduled with lookahead on the audio clock (`musicPump` every
`MUSIC_PUMP_MS`, `MUSIC_LOOKAHEAD` ahead, first note after the jingle). The bass always plays;
the arp and percussion fade in above about 60% speed; a riser sweeps while airborne or in a
corkscrew; the bed ducks to `MUSIC_DUCK` at the finish, stops in `worldAudioStop`, and is silent
in quiet mode. Ambience beds drop to `AMB_UNDER_MUSIC` while it plays. The `MIX` comment in the
audio section documents every gain stage.

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


### Moving a save (13.8)

The profile panel shows the QR and two buttons, share and scan. `sendSaveCode()` hands the share sheet the
hosted link (`SAVE_URL_PREFIX + code`) and the plain code, or writes the clipboard on a desktop,
always inside the tap (WebKit grants neither after an await), with the gzip code pre-built when the
panel opens and a synchronous plain code as the fallback. Receiving goes through the slot card (13.8.2): a
tap on any face opens `openSlotCard(i)` with that save's car (`carOfSave`), wallet and flags, a play
button (`switchProfile`, hidden for the active kid, creates the kid on an empty slot), a scan button
and the hold-to-erase ring; on an empty slot the face itself is a paste button (`readClipboardText()`, the
clipboard read inside the tap so iOS shows its paste bubble, then `importSaveCode` aimed at that slot, a shake on
anything that is not a code). The scan button calls `scanSaveQR()`, section 17b: a viewfinder with `BarcodeDetector` where a
browser has it and `qrDecodeImage`, a pure-JS decoder for the game's own byte-mode ECC-L v1 to v10
symbols, since WebKit never shipped the native detector; a picture picker reads a screenshot of a QR.
Both paths end in `importSaveCode(code, slot)` (`pendingSlot`: the card's slot, or the active one for a link), which decodes (`decodeSaveCode` picks the `VROOM`
token out of any surrounding text) and shows the preview card: the incoming car via `vehicleSVG`,
its wallet, its beaten levels, the avatar a full code carries, and a warning triangle when the
slot would lose beaten levels, and `importYes` writes that slot's key, gives an empty slot a free face
and makes it the active kid. Scanning inside the app matters on iOS: a Home Screen app has its own
storage, so a QR read by the camera app opens Safari and lands the save in the wrong place.
Profiles are erased from the same card: a 1.2 s hold with a fill ring (`deleteProfile`) removes the save key and avatar; erasing
the active kid hops to the lowest used slot or restarts slot 0 fresh.

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
| 2, 2 | tail (12.7): tank and springs pips; absent on older codes |

Because every list is count-prefixed, a pack may **append** to any catalog list and older
codes still decode (shorter lists read fewer bits); reordering would silently swap parts.
With today's catalog a code is exactly 95 bytes (the layout is fixed-size once the catalog
is), 127 base64url characters after the prefix; the hosted URL plus the code is 175 bytes
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

## The title scene

Section 30. `buildTitleWorld()` fills six parallax strips once at boot: clouds, a far band
(desert mesas and arch, snow peaks with a waterfall, the volcano, the sky kingdom's floating
castle), a mid band (the construction crane, the rain city, candy-land lollipops, the beach
palms with the deep sea's whale), a hill band, a near band at the road's top edge (fences,
bushes, cactus, paw signposts) and the verge below the road. Each is a 1200 px SVG tile drawn
twice inside a 2400 px `.tLayer`, and a `tScroll` keyframe slides the strip exactly one tile
per loop, so the wrap is seamless as long as no shape crosses a tile edge. `#tSky` is static:
the space corner (an SVG radial fade, stars, a ringed planet, the night's moon, a rocket that
crosses now and then) and two sunset balloons bobbing. The road dashes are a 140 px repeating
gradient slid one period per loop (`tDash`, 0.32 s, about 437 px/s), and the car's `.wheelrot`
groups turn at the matching rate (`tWheel`, 0.5 s per revolution for a 70 px tire).
`placeTitleGround()` measures the tire line after the scene is up and writes it to `--tGround`
on `#titleCar`, which the shadow and the exhaust puffs hang off (tracks and hover rings use
their art's lowest point).

The sign (`#titleLogo`) hangs from two chains: a plank with grain and nails, a star pennant and
a checkered flag on poles, leaves, and the ZOOMIES wordmark. The letters are SVG paths (gold
gradient, navy outline via `paint-order: stroke`, a paw in the first O), never `<text>`, so the
title stays free of text nodes; it is the one word in the game, a brand mark rather than a
thing to read. The entrance is pure CSS: the sign drops on its chains (`tDrop`), swings to rest
(`tSwing`) and then sways (`tSway`), the car drives in from off-stage (`tDrive`), the play pill
pops last and then pulses with a halo (`tGoPulse`, `tHalo`). The pill is built like a toy
button (a lit top edge, a shaded lower lip, a thick base and a ground shadow, sinking onto its
base when pressed); its face is a white play chip and PLAY, also paths. Every keyframe is scoped to
`#title.active`, so the garage never pays for it, and the reduced-motion block turns all of it
off and hides the glint.

## The update gate

At boot the page concatenates the text of its first `<style>` and `<script>` and hashes it
with FNV-1a (`bootHash`). `checkForUpdate()` fetches `location.pathname + "?v=" + Date.now()`
with `cache: "no-store"`, parses the response with `DOMParser`, hashes the same two blocks and
arms both gates (`updateGates`: `#titleUpdateBtn` on the title and `#updateBtn` in the garage,
one `.updateGate` style) when they differ. It runs 2.5 s after boot, on `visibilitychange` back to
visible and every 10 minutes, rate-limited to one check per 30 s, never on `file:`, and any
network error is swallowed (offline in the car keeps playing). The badge needs a 1.6 s hold
(`UPDATE_HOLD_MS`, a ring fills) before it saves and navigates to a cache-busting URL, so a
stray toddler tap does nothing. Only the style and script blocks are fingerprinted:
`<head>` changes (metas, manifest, icons) do not trigger it, `APP_VERSION` is informational.

## Tests

Twenty-three Playwright suites (393 checks) in `tests/`, driving the real page in headless
Chromium through `playwright-core`; `tests/run-all.cjs` is the runner behind `npm test` and
`.github/workflows/test.yml` runs it in CI. See [tests/README.md](../tests/README.md) for the
map of what each suite owns.
