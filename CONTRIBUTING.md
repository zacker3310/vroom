# Contributing to Vroom

Thanks for wanting to help. Vroom is small on purpose: one `index.html`, no dependencies,
no build. Most contributions are content (a world, a body, a paint) or a fix to something
the test suite caught. This page covers how to run the game and its tests, the rules that
are not negotiable, and the pack anchors that make adding content a contained change.

## Running it

```bash
python3 -m http.server 4173        # from the repo root, then open http://localhost:4173/
```

Edit `index.html`, reload. The page is served, not opened from disk, because the save-code
QR and the new-version gate need `location` to be a real URL (the gate stays off on `file:`).

## Running the tests

```bash
npm ci                                   # devDependencies only: playwright-core, jsqr
npx playwright-core install chromium     # once; or point CHROMIUM at any Chrome/Chromium
npm test
```

`npm test` runs `tests/run-all.cjs`: it serves the repo root on a free port, runs
`verify.cjs` and every `*-check.cjs`, prints a summary table and exits non-zero if any check
fails. Useful flags:

| Flag / env | Effect |
|---|---|
| `--verbose` | stream every suite's output instead of only failures |
| `--only verify,shop-check` | run a subset |
| `--port 4190` | pin the built-in server's port |
| `CHROMIUM=/path/to/chrome` | use that browser instead of playwright-core's download |
| `VROOM_URL=http://host:port/index.html` | test a server you already run (skips the built-in one) |

Every suite can also run on its own: `cd tests && node shop-check.cjs`. Screenshots land in
`tests/shots/` (gitignored). `tests/level-report.cjs` is not a suite; it prints every level's
beat sequence and prop counts so you can eyeball that levels differ.

CI (`.github/workflows/test.yml`) runs exactly `npm test` on every push and pull request to
`main`. A pull request is mergeable when it is green and every check still counts: adding a
feature usually means adding a check for it to the suite that owns that area (see
[tests/README.md](tests/README.md)).

## The rules that are not negotiable

These come from `SPEC.md` and from watching a three-year-old play. The suite enforces most of
them; the rest are enforced in review.

1. **Zero required reading.** No words anywhere in the game. Icons, pictures and numerals
   only. `aria-label`s are fine (they are for screen readers and tests), on-screen text is not.
2. **Nothing to lose.** No fail states, no game-overs, no timers that punish. Stars only go up.
   An obstacle may stop the car and ding it; it may never end a run. Damage never blocks play.
3. **Every tap answers instantly** with motion and a synthesized sound. New UI gets a press
   squash and a `sfx.*` call.
4. **Every touch target is at least 64 px** rendered at 1024x768 landscape. `verify.cjs`
   measures every garage button and swatch; keep it that way in every scene.
5. **One file, zero dependencies, offline.** No external scripts, fonts, images or fetches
   other than the page re-fetching itself for the update gate. All art is inline SVG, all sound
   is Web Audio. Test tooling is the only place third-party code is allowed, and it never ships.
6. **Toybox look.** Cream surfaces, wood, warm putty for locked states (never cold gray), one
   amber for selection, one green for go/afford, flat unblurred shadows, the radius scale in
   `:root`. Navy is game-world art only, never chrome.
7. **Fair for a toddler.** `fairness-check.cjs` drives every level with a "lazy toddler" bot
   (middle lane, gas floored, never steers) that must finish and still find stars, and a
   "smart" bot that must finish with at least 45% of the stars and at most 4 hard hits. If
   your level content fails these, change the content, not the thresholds.
8. **Saves are forever.** Save-code lists (`CODE_*`, `BODY_ORDER`, `WHEEL_ORDER`, `COLORS`,
   `DECAL_ORDER`, `BUDDY_ORDER`) are append-only and never reordered, so every QR ever
   printed still decodes. Local storage keys (`vroom.v2.p<n>`, `vroom.meta`) migrate, never
   reset.

## Adding content through the pack anchors

`index.html` has four comment-marked anchors where content registers itself by assigning
into the live tables. Nothing above an anchor needs editing; your pack is a contained block
that can be reviewed and reverted on its own.

| Anchor comment in `index.html` | What registers there |
|---|---|
| `SHOP PACK anchor` | bodies, wheels, extras, buddies, decals |
| `PAINT PACK anchor` | pattern paints (`p:*` ids) |
| `WORLD PACK anchor A` / `anchor B` | whole worlds: physics, palette, CSS, scenery, hazards, road character, beats, audio, sky events |
| `Object.assign(CAR3D, SHOP_CAR3D)` | rear-view bodies join `CAR3D` here (it is a `const` defined after the shop anchor) |

Every pack must register **before `loadState()` runs** so a saved build validates against the
full catalog. The anchors are placed so that is already true.

### A body

A body is art in two views plus an `anchors` block in each. Read the two contract comments
in full before drawing; this is the summary.

**Side view** (comment above `const BODIES`; viewBox `0 0 320 230`, ground at `y=200`, car
faces right). `BODIES[id] = { anchors, svg: () => \`...\` }`, painted areas use
`fill="var(--paint)"`. `anchors` is the **only** thing that positions accessories, so fill in
every field, in viewBox px measured on the art as drawn:

| Field | Meaning |
|---|---|
| `hat: [x, y]` | party-hat base when no buddy rides: the highest flat roof point. With a buddy the hat moves to its head automatically |
| `horn: [x, y]` | the cab roof's front top corner; tube sits behind it, bell overhangs the cab face |
| `beacon: [x, y]` | base-plate centre on the cab roof (plate 28 wide, dome 26 tall) |
| `flag: [x, y, h?]` | pole foot at a rear top corner; `h` = pole height (default 52) |
| `wings: [x, y]` | wing root on the flank at the body's vertical midline, usually just behind the cab |
| `booster: [x, y]` | nozzle attach point on the rear bumper; keep `x >= 38` so the flame stays in frame |
| `decal: [x, y, k]` | sticker centre and scale on the largest flat flank panel (~72x72 at k=1; 0.3-0.5 for doors, 0.7-0.8 for van/bed panels) |
| `buddy: [x, y, k?, f?]` | the edge the critter peeks over; `k` = scale, `f = 1` draws the buddy in front of the body (glass cockpits) |

Rules: no accessory may overlap another or cover a window; roof slots from the front run
horn, beacon, buddy/hat. `roof` and `rear` are derived by `deriveBodyPoints()` from `beacon`
and `flag` for the damage and smoke code; never hand-write them. Two optional flags:
`noWheels: true` (tracks, hover ring: the body owns its ground contact) and `hover: h` (floats
`h` px and gets the bob animation).

**Rear view** (comment above `const CAR3D`). Each body is boxes, cylinders and hulls in car
space (`x` lateral, `y` up from the ground, `z` forward from the rear bumper), built with the
`box`/`cbox`/`cyl`/`hullP`/`spr`/`poly3` constructors and projected through the road camera.
Painter's order is far `z0` first, then low `y0`; parts resting on another share its `z0`;
`late` parts draw last. The art is authored at full size and `CAR_K = 0.5` halves it on the
road. `anchors` here are `[x, y, z]` in car space with the same eight names plus `win`
(rear-window centre for the damage crack) and `smoke` (damage-smoke origin). Keep `z` small
(0-60) for anything on the rear face so overlays draw over it. `roof`/`mount`/`deco` are
derived; do not hand-write them.

Then register: `Object.assign(BODIES, ...)`, `deriveBodyPoints(...)`, append the id to
`BODY_ORDER` and `CODE_BODIES` (the shop pack does this through `SHOP_BODY_IDS`), add a
price to `PRICES.body`, a honk to `HONKS`, and the rear body to `SHOP_CAR3D`. Finish by
checking the contact sheet: `shop-check.cjs` renders every body x extras x buddy x decal in
both views.

### A wheel, decal, buddy or extra

Same anchor. Wheels are `WHEELS[id] = { r, hub }` plus optional `WHEEL_DECOR[id](r)` rim art
and a `PRICES.wheels` entry; append to `WHEEL_ORDER` and `CODE_WHEELS`. Decals are a `<g>`
centred on the origin in `DECAL_SVG`, priced in `PRICES.decal`, appended to `DECAL_ORDER` and
`CODE_DECALS`. Buddies are head art in `BUDDY_SVG`, appended to `BUDDY_ORDER` (they are
found in capsules, never bought). Extras are side art taking the anchor point, rear art
taking the projected point, a tray button, a price, and an append to `CODE_EXTRAS`; the four
shop extras show how to derive a placement from existing anchors when a body does not
provide a dedicated one (`anchors.spoiler`, `.antenna`, ... are optional overrides).

### A paint

At the `PAINT PACK anchor`, a pattern is one `PATTERNS["p:name"] = { name, price, def }`
entry where `def(id, v)` emits an SVG `<pattern>` (through `paintTile`) or gradient (through
`paintBand`) for a view band `v = { x0, y0, w, h, k }`. Three views call it: side, rear and
the 64 px swatch; `k` scales the tile so the pattern reads at the road car's size. The id
goes into `COLORS` and `PRICES.color` automatically. Patterns ride in v3 save codes because
`CODE_COLORS` spreads `Object.keys(PATTERNS)`, so, again, append only.

### A world

Worlds register at `WORLD PACK anchor A/B` inside an IIFE, by assignment. Everything above
the anchor is defined by then. A complete world provides:

| Table | What |
|---|---|
| `WORLD_META[w]` | `{ dark, gravity, hill }`: headlights, jump gravity (1500 earth, 640 moon), hill amplitude |
| `WORLD_TINT.w<w>`, `WORLD_ICONS.w<w>` | map tab colour and icon |
| `ROAD_PAL[w]` | canvas ground palette: `ground`, `ground2`, `road`, `road2`, `dash`, `rumA`, `rumB`, `haze` |
| a `<style>` injection | `#road.w<w>` sky, sun, clouds, weather and prop animations (flat SVG, ground at `y=0`, no gradients/filters/ids in scenery) |
| `WORLD_SET[w]`, `WORLD_ARCH[w]`, `WORLD_LANDMARK[w]`, `WORLD_FAR[w]`, `WORLD_WEATHER[w]` | roadside pool (5-8 pieces), the overhead structure, the horizon landmark, the far skyline, the particle weather |
| `WORLD_ITEMS[w]`, `EXTRA_PROPS[type]`, `PROP_HIT[type]` | the two hazards: art, `hard` flag, optional `mv` mover spec, and the collision handler |
| `WORLD_ROAD[w]` | road character: `k`, `hp`, `len`, `gap` and the ten-entry `order` of level shapes |
| `defBeat(name, "world<w>", firstLevel, fn)` | two beats; the sequencer forces both into every level of the world |
| `JINGLES[w]`, `AMBIENCE[w]`, `STAR_SCALES[w]`, `STAR_BASE[w]`, `WORLD_EVENTS[w]` | start jingle, ambience bed, star-chime scale and base pitch, live sky events |

`WORLD_COUNT` and `WORLD_SIZE` derive `MAX_LEVEL`, `PARADE_LEVEL` and the map tabs, so a
thirteenth world is a bump to `WORLD_COUNT` plus a pack. Level length caps at level 80, so
deeper worlds get harder, not longer. Run `fairness-check.cjs` and `level-report.cjs` before
opening the PR; `world-check-audio-events.cjs` and `worlds-check.cjs` have per-world checks
to extend.

## Pull requests

- Keep `index.html` edits to the block you are changing; the file is large and several things
  land at once. Content packs live between their anchor comments.
- Run `npm test` locally. Mention the table's bottom line in the PR.
- Numerals are allowed on screen, words are not. If you need to explain something to the
  kid, draw it.
- Screenshots in `docs/` are curated by hand; do not regenerate them in a content PR.
