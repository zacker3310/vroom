# Vroom test suites

Twenty-three Playwright regression suites (475 checks) that drive the real game in headless
Chromium. They are the gate for every change: CI runs them on each push and pull request.

## Run everything

```bash
# one-time: npm i playwright-core (anywhere on NODE_PATH) and a chromium build
# profile-check also wants jsqr (in tests/ or the repo root)
python3 -m http.server 4173 &          # from the repo root
cd tests
export VROOM_URL=http://localhost:4173/index.html?garage   # ?garage boots past the title scene (title-check strips it itself)
for f in verify polish-check damage-check free-check feel-check worlds-check album-check profile-check washdecals-check parade-check update-check world-check-audio-events fairness-check paint-check shop-check garage-check upkeep-check number-check title-check ghost-check events-check life-check; do node $f.cjs; done
```

The game boots into a title scene (v12.5) unless the URL carries `?garage` or
`localStorage["vroom.skipTitle"]` is set. `run-all.cjs` appends `?garage` to the URL it hands
every suite, so the suites land in the garage as they always did; `title-check.cjs` removes it
again because the title is what it tests. When you run a suite by hand with `VROOM_URL`, add
`?garage` yourself.

`run-all.cjs` serves the repo root on a free port, runs every suite below in turn, prints a
summary table and exits non-zero on any failure. Flags: `--verbose` (stream all output),
`--only verify,shop-check`, `--port 4190`. Env: `CHROMIUM` (browser binary; defaults to
playwright-core's download), `VROOM_URL` (use a server you already run instead of the
built-in one, e.g. `python3 -m http.server 4173` then
`VROOM_URL=http://localhost:4173/index.html npm test`).

- `verify.cjs`: garage/shop/economy/levels/map/persistence core loop, steering yaw (40)
- `polish-check.cjs`: kid-UX round: the road to the horizon (13.22), locks, tags, magnet, headlights, celebrate, `prefers-reduced-motion` (decorative keyframes off, no confetti pieces, short iris) (19)
- `damage-check.cjs`: damage/repair/upgrades/keyboard (20)
- `free-check.cjs`: capsules, free drive (the daily 100-star cap, the star meter, the spent map button), time tiers (15)
- `feel-check.cjs`: game feel: dynamics, hit-stop, choreography, iPad shell (18)
- `worlds-check.cjs`: 12 worlds, every piece of roadside art inside its box (13.25), movers, gravity, world map, premium content, the 13.3 ground painter (shoulder + field tones, road crown on all 12 worlds, ramp side walls, quad budget), the deep sea rebuild (tunnel ribs outside twists, caustic overlay, whale + scenery, palette + dune swells, reduced motion) (31)
- `album-check.cjs`: sticker album: buddies, badges, the photo wall (13.23: 13 frames, one per world and the parade, a frame only gets better, the ghost icon and deny on an empty one, tab counts, the fresh stars for one visit, albumSeen out of the share code, 76 px targets), world backdrops + stamps, the peek card for photos and stickers, muddy flag (20)
- `profile-check.cjs`: 3 kid profiles, the slot card and hold-to-erase, save codes, QR round-trip via jsQR, the in-app QR scanner and its pure-JS decoder, the share / scan flow (scan button, import preview, welcome pop) (32)
- `washdecals-check.cjs`: wash mini-game and decal shop/persistence (11)
- `parade-check.cjs`: victory parade: unlock, finale level, jackpot, champ badge (12)
- `update-check.cjs`: new-version gate on the title's PLAY pill (13.26): detection, the amber update face in place of PLAY, a tap that lets go, the hold that loads, PLAY back on the fresh page (6)
- `world-check-audio-events.cjs`: per-world jingles/ambience beds, star scales, live sky events, quiet mode, engine gears + body voices, music beds (scheduler, intensity, duck, teardown), pass-by whoosh, level-80 frame time (26; honours `VROOM_URL`)
- `paint-check.cjs`: pattern paint pack: 11 pattern tiles after the 12 colors in the one paint strip, arrows page to them, `<pattern>`/gradient defs in side + rear views, buying a pattern, v3 compact save code (count-prefixed colors + equipped paint) and legacy v2 decode, album photo re-render (22; honours `VROOM_URL`)
- `shop-check.cjs`: shop pack: 23-body / 14-wheel / 9-decal catalog, 23-tile body strip (every tile equips), arrow paging by 7, hover (no wheels in either view, floats + bobs, glow + trail), every new body x extras x buddy x decal in both views, new wheels / decals / buddies, the 12.5 mid-tier items (jetpack 180 / disco 220 / trophy rack 260: both views on four bodies, medal cups, buddy and hat stacking, a 660 tag denied at 659 and bought at 700), 12-tile extras strip, hover at 999 denied / 1000 bought, v3 code round trip with new parts (94 bytes), frozen-width v2 legacy decode (23; honours `VROOM_URL`)
- `garage-check.cjs`: redesigned garage: <=16 controls at rest, six category tabs with 23/14/23/1+9/12/3(+repair/wash/fuel/tires) tiles, selection ring follows state, locked tile -> tag -> buy -> equipped, arrows page the strip, a swipe scrolls instead of equipping, speaker toggle in the grown-ups overlay persists, >=64px targets, zero text (19; honours `VROOM_URL`)
- `fairness-check.cjs`: two headless bots drive all 80 levels through the real collision code: a "smart" bot (one lane change per 350 units, toward stars, away from hard obstacles) must finish every level with ≥45% of the stars and ≤4 hard hits; a "lazy toddler" (middle lane, gas only) must finish every level and still find ≥15% of the stars on levels 1-20; world 1 stays gentle (9; `--table` prints the per-level table, `--hits` lists each hard hit; honours `VROOM_URL`)
- `number-check.cjs`: race number: the number tile leads the sticker tab (400, greyed when poor), keypad rules (two digits, leading zeros trimmed, backspace, clear), OK pays 400 and draws the roundel on the flank, sticker + number share the panel at 80% scale, rear view, same-number and broke-wallet rules, free removal, reload + v3 tail + 12.2 code decode, photo, malformed stored value dropped, 64px keys, the race car's painted slot (13; honours `VROOM_URL`)
- `title-check.cjs`: start screen + daily gift: title scene active on boot (the play pill >= 88 stage px tall, car + emblem, avatar, zero text), pulsing gift badge on GO while unclaimed, car honk, GO to the garage, the capsule on the wall above the dice (88px at x=1086 / top 180), opening pays 15..40 stars or an unowned buddy with confetti and stamps `progress.lastGift`, a second open gives nothing, reload keeps it claimed, lastGift = yesterday brings it back, `?garage` and `vroom.skipTitle` skip the title, lastGift never rides in a save code; the moving world (parallax strips, dashes, wheels, balloons, glint, play pulse; the wordmark has no SVG text) runs only while the title is active and holds still under reduced motion, the shadow sits on the tire line, the title has its own update gate (17; honours `VROOM_URL`)
- `ghost-check.cjs`: ghost race: a first run stores a sampled trace, a replay spawns the translucent twin that follows it through the projector (lane and depth match the recording at a known time), slower runs keep the old ghost and faster ones replace it with the new-best flourish, the signed gap chip (hidden with no ghost), the twin fades after its own finish, ghosts survive a reload, stay out of the full save code and malformed ones are dropped (19; honours `VROOM_URL`)
- `upkeep-check.cjs`: fuel + tires + shine: full gauges on a fresh save, the combined HUD chip that splits into red singles when a gauge is low, burn per unit of road (tread at half rate), no burn in free drive or the parade, dry-tank crawl speeds, bald-tire lane lag, hit scuffs tread, shine bonus (+50%) and its sticker, muddy = no shine, workbench fill-up / tire tiles with per-unit prices, partial fills, deny shakes, v3 save-code tail + tail-less decode, reload + pre-12.2 save defaults, the dice/map/GO column geometry (24; honours `VROOM_URL`)
- `events-check.cjs`: surprise events on the map: a frozen calendar (`window.__today`) gives the same three picks across reloads and other dates move them; the sleeping dino sits on an unlocked, non-frontier level, naps mid-lane on that road (not hard, not soft), wakes on a bump or a honk with no damage and drops 5 bonus stars outside the level total; rainbow day only after level 30, finishing the marked level awards `p:rainbowshine` once (second finish no duplicate), the paint renders in both views, grows a 24th strip tile, rides the v3 save code and a reload; weather day forces the borrowed particles on every level of the badged world and nowhere else; the today chip shows the day number; no date = no events (23; honours `VROOM_URL`)
- `course-check.cjs`: wild courses (v12.9): chompers on every world's chomper level and every finale from world 2 (the monster at its mouth, a trail of >= 5 stars, a clear spit zone, no blockers, no other arch), the two sizes (13.21: one-lane and two-lane monsters, never full, each at least a fifth of the 33, two different sizes on a two-monster level, the trail in the monster's lanes only, the monster centred on its lanes at its scale), the drive-past (a car in a lane a one-lane monster does not cover: jaws gape then snap, no shut stage, no stars dropped, not eaten), the spit numbers, the bite driven at speed (jaws open within 1100 with a growl, the stage shut under the HUD, the car held, min(3, run stars) tossed back onto the road in the open lane, the backward spit that shoves the car into that lane, every star back, the consolation run past the beast, a second drive-in bitten again), hard turns (chevrons outside, squeal at speed), rollers (>= 3 big hills; the opaque-crest veil on the run-up, gone on the crest), jumps (mega, hop chains, run-up to touchdown clear of chompers and blockers), the mixer drum, reduced motion, the gap wreck and blowout (13.22: 2 damage, 15% speed kept, the dice pinned both ways, the flat), the hole's depth as drawn (a pixel probe: floor, far wall, tarmac) (34)
- `life-check.cjs`: garage life + buddy reactions: the idle putter node (52 Hz square, 2 Hz LFO) runs only while the garage is active and follows quiet mode, buddy blink / yawn hooks on all 10 buddies, beacon / flag / booster / hover idle animations, wheel settle wobble on a new body or wheels, hood tap (opens, clank via a `tone` spy, closes, buddy hops, no honk), wheel tap spin, body tap still honks, >= 64px hit regions, chase-cam buddy cheer / duck / wave from the star-streak, `applyDamage` and `finishLevel` hooks, no-buddy no-ops, `prefers-reduced-motion` stops every idle animation (17; honours `VROOM_URL`)

```bash
cd tests && CHROMIUM=... VROOM_URL=http://localhost:4173/index.html node shop-check.cjs
```

Screenshots land in `tests/shots/` (gitignored). The suites dispatch `pointerdown` events
directly because the game acts on `pointerdown` and animated targets fail Playwright's
click stability check.

## Suites

| Suite | Checks | Covers |
|---|---|---|
| `verify.cjs` | 40 | core loop: garage inventory and 64 px touch floor, shop/economy, level invariants, map, persistence, steering yaw views and bindings |
| `garage-check.cjs` | 19 | redesigned garage: control budget, category tabs and the shuffle at the tab row end, workbench strip order (wash first), GO and map, gift on the rhythm |
| `polish-check.cjs` | 21 | kid-UX round: locks, price tags, magnet, headlights, celebrate choreography, the road reaching the horizon (13.22), the crest veil (13.25) |
| `damage-check.cjs` | 20 | damage tiers, repair, upgrades, keyboard controls |
| `free-check.cjs` | 15 | capsules and prizes, free drive, time-medal tiers |
| `feel-check.cjs` | 19 | game feel: body dynamics, hit-stop, the lane change and landing speed scrubs, celebrate pacing, iPad shell metas |
| `worlds-check.cjs` | 31 | 12 worlds: level invariants, world hazards, movers, gravity, map, unlock chain, world bonus, golden capsule, premium shop, free-drive tour, ground painter (shoulder and field tones, crowned road on every world, ramp side walls, quad budget), the deep sea rebuild (glass tunnel ribs, caustics, whale, second roadside set, palette, roller swells, reduced motion) |
| `album-check.cjs` | 20 | sticker album: buddies, badges, the per-world photo wall and its keep rule, tab counts, fresh stars, peek card, muddy flag |
| `profile-check.cjs` | 33 | the in-app QR scanner (viewfinder, BarcodeDetector or the pure-JS decoder, the picture picker), the slot card (play, scan into the slot, hold-to-erase), 3 kid profiles, save codes, scan-to-open QR decoded byte-exact with jsQR across version boundaries, the send / receive flow: receiver sheet (clipboard, paste box, camera scan when stubbed), the import preview card with its warning triangle, the welcome pop after a confirmed import |
| `washdecals-check.cjs` | 11 | wash mini-game, decal shop and persistence |
| `parade-check.cjs` | 12 | victory parade: unlock, finale level, jackpot, champion badge |
| `update-check.cjs` | 6 | new-version gate on the PLAY pill: detection, the update face, tap lets go, hold loads, PLAY returns |
| `world-check-audio-events.cjs` | 26 | per-world jingles, ambience beds, star scales, live sky events, quiet mode, engine gears and voices, music beds, pass-by, deep-level frame time |
| `paint-check.cjs` | 22 | pattern paints: 11 swatches on the second tray page, defs in both views, buying, v3 save code round trip, v2 legacy decode, album re-render |
| `shop-check.cjs` | 23 | shop pack: 23-body / 14-wheel / 9-entry decal catalog, tap-forward + hold-back cycling, hover body, every body x extras x buddy x decal in both views, the mid-tier jetpack / disco / trophy rack, two-page extras tray, v3 round trip, frozen-width v2 decode |
| `number-check.cjs` | 13 | race number: sticker-tab tile, keypad rules, 400-star change / free removal, roundel in both views beside a sticker, save-code tail, photos |
| `course-check.cjs` | 34 | wild courses: chompers (one per world, one lane or two, the monster at the mouth with its trail in its lanes, the bite that holds the car, tosses run stars into the open lane and throws the car back into it, the bite again on the next drive-in, the consolation run, the drive-past in another lane), ramps in three widths with their stars in the deck's lanes and the off-lane roll-past, track gaps (counts, widths, beats, placement rules, boards, the full-width ramp before a full hole, the drop that wrecks and may blow a tire, the hole drawn deep), opaque crests, hard turns, rollers, jumps, the mixer drum, reduced motion |
| `title-check.cjs` | 17 | start screen: title scene on boot, 88 px play pill, gift badge, honk, the moving world and its reduced-motion stop, the title update gate; daily gift: once-a-day capsule above the dice, 15..40 stars or an unowned buddy, claimed state across reloads, next-day return, the `?garage` / `vroom.skipTitle` skips, reduced motion |
| `ghost-check.cjs` | 20 | ghost race: trace recording, replay sprite follows the trace, slower keeps / faster replaces, gap chip, fade at the line, reload, save-code exclusion, malformed ghost dropped |
| `upkeep-check.cjs` | 24 | fuel and tire wear, the combined HUD chip and its low-gauge split, dry-tank crawl, bald-tire grip, shine bonus, workbench fill-up and tire tiles, save-code tail, legacy defaults, garage column geometry |
| `events-check.cjs` | 23 | surprise events: date-seeded picks, sleeping dino marker + road prop (wake, 5 bonus stars, no damage), rainbow day + the secret rainbow-shine paint (once, both views, save code, reload), weather day particles, today chip, no-date fallback |
| `life-check.cjs` | 17 | garage life: idle putter lifecycle and quiet mode, buddy blink / yawn, animated extras, wheel settle, hood and wheel tap toys, road buddy cheer / duck / wave hooks, reduced motion |
| `fairness-check.cjs` | 9 | two headless bots drive all 120 levels through the real collision code: "smart" must finish every level with ≥45% of the stars and ≤4 hard hits; "lazy toddler" (centre lane, gas only) must finish every level and find ≥15% of the stars on levels 1-20; world 1 stays gentle. `--table` prints per-level results, `--hits` each hard hit |

Not a suite: `level-report.cjs` builds every level and prints its beat sequence and prop
counts (`--shots` adds mid-drive screenshots of a few levels).

## Adding a check

Each suite is a flat script: `check(name, ok, detail)` pushes a result and the script ends
with `N/M passed` and a non-zero exit on failure, which is the contract `run-all.cjs` parses.
Add your check to the suite that owns the area, keep it deterministic (levels are seeded, so
assert exact values where you can), and update the count in the table above.

## Lint

`node tests/lint.cjs` extracts the inline script and runs ESLint (`eslint.config.js`:
no-unused-vars, no-undef with browser globals, no-redeclare, no-dupe-keys, no-unreachable, eqeqeq).
It should report zero findings; `lastBeats` and `eventsFired` are referenced only by the suites.
