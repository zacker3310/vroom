# Vroom test suites

Fifteen Playwright regression suites (237 checks) that drive the real game in headless
Chromium. They are the gate for every change: CI runs them on each push and pull request.

## Run everything

```bash
# one-time: npm i playwright-core (anywhere on NODE_PATH) and a chromium build
# profile-check also wants jsqr (in tests/ or the repo root)
python3 -m http.server 4173 &          # from the repo root
cd tests
for f in verify polish-check damage-check free-check feel-check worlds-check album-check profile-check washdecals-check parade-check update-check world-check-audio-events fairness-check paint-check shop-check garage-check upkeep-check number-check ghost-check; do node $f.cjs; done
```

`run-all.cjs` serves the repo root on a free port, runs every suite below in turn, prints a
summary table and exits non-zero on any failure. Flags: `--verbose` (stream all output),
`--only verify,shop-check`, `--port 4190`. Env: `CHROMIUM` (browser binary; defaults to
playwright-core's download), `VROOM_URL` (use a server you already run instead of the
built-in one, e.g. `python3 -m http.server 4173` then
`VROOM_URL=http://localhost:4173/index.html npm test`).

- `verify.cjs` — garage/shop/economy/levels/map/persistence core loop (35)
- `polish-check.cjs` — kid-UX round: locks, tags, magnet, headlights, celebrate (14)
- `damage-check.cjs` — damage/repair/upgrades/keyboard (20)
- `free-check.cjs` — capsules, free drive, time tiers (14)
- `feel-check.cjs` — game feel: dynamics, hit-stop, choreography, iPad shell (12)
- `worlds-check.cjs` — 12 worlds, movers, gravity, world map, premium content (21)
- `album-check.cjs` — sticker album: buddies, badges, photos with world backdrops + stamps, the peek card for photos and stickers, muddy flag (15)
- `profile-check.cjs` — 3 kid profiles, save codes, QR round-trip via jsQR (14)
- `washdecals-check.cjs` — wash mini-game and decal shop/persistence (11)
- `parade-check.cjs` — victory parade: unlock, finale level, jackpot, champ badge (12)
- `update-check.cjs` — new-version gate: detection, tap-proof hold-to-reload (5)
- `world-check-audio-events.cjs` — per-world jingles/ambience beds, star scales, live sky events, quiet mode, level-80 frame time (16; honours `VROOM_URL`)
- `paint-check.cjs` — pattern paint pack: 11 pattern tiles after the 12 colors in the one paint strip, arrows page to them, `<pattern>`/gradient defs in side + rear views, buying a pattern, v3 compact save code (count-prefixed colors + equipped paint) and legacy v2 decode, album photo re-render (22; honours `VROOM_URL`)
- `shop-check.cjs` — shop pack: 23-body / 13-wheel / 9-decal catalog, 23-tile body strip (every tile equips), arrow paging by 7, hover (no wheels in either view, floats + bobs, glow + trail), every new body x extras x buddy x decal in both views, new wheels / decals / buddies, 10-tile extras strip, hover at 999 denied / 1000 bought, v3 code round trip with new parts, frozen-width v2 legacy decode (21; honours `VROOM_URL`)
- `garage-check.cjs` — redesigned garage: <=16 controls at rest, six category tabs with 23/13/23/1+9/10/3(+repair/wash/fuel/tires) tiles, selection ring follows state, locked tile -> tag -> buy -> equipped, arrows page the strip, a swipe scrolls instead of equipping, speaker toggle in the grown-ups overlay persists, >=64px targets, zero text (19; honours `VROOM_URL`)
- `fairness-check.cjs` — two headless bots drive all 80 levels through the real collision code: a "smart" bot (one lane change per 350 units, toward stars, away from hard obstacles) must finish every level with ≥45% of the stars and ≤4 hard hits; a "lazy toddler" (middle lane, gas only) must finish every level and still find ≥15% of the stars on levels 1-20; world 1 stays gentle (9; `--table` prints the per-level table, `--hits` lists each hard hit; honours `VROOM_URL`)
- `number-check.cjs` — race number: the number tile leads the sticker tab (400, greyed when poor), keypad rules (two digits, leading zeros trimmed, backspace, clear), OK pays 400 and draws the roundel on the flank, sticker + number share the panel at 80% scale, rear view, same-number and broke-wallet rules, free removal, reload + v3 tail + 12.2 code decode, photo, malformed stored value dropped, 64px keys, the race car's painted slot (13; honours `VROOM_URL`)
- `ghost-check.cjs` — ghost race: a first run stores a sampled trace, a replay spawns the translucent twin that follows it through the projector (lane and depth match the recording at a known time), slower runs keep the old ghost and faster ones replace it with the new-best flourish, the signed gap chip (hidden with no ghost), the twin fades after its own finish, ghosts survive a reload, stay out of the full save code and malformed ones are dropped (16; honours `VROOM_URL`)
- `upkeep-check.cjs` — fuel + tires + shine: full gauges on a fresh save, HUD gauge column, burn per unit of road (tread at half rate), no burn in free drive or the parade, dry-tank crawl speeds, bald-tire lane lag, hit scuffs tread, shine bonus (+50%) and its sticker, muddy = no shine, workbench fill-up / tire tiles with per-unit prices, partial fills, deny shakes, v3 save-code tail + tail-less decode, reload + pre-12.2 save defaults, the dice/map/GO column geometry (20; honours `VROOM_URL`)

```bash
cd tests && CHROMIUM=... VROOM_URL=http://localhost:4173/index.html node shop-check.cjs
```

Screenshots land in `tests/shots/` (gitignored). The suites dispatch `pointerdown` events
directly because the game acts on `pointerdown` and animated targets fail Playwright's
click stability check.

## Suites

| Suite | Checks | Covers |
|---|---|---|
| `verify.cjs` | 35 | core loop: garage inventory and 64 px touch floor, shop/economy, level invariants, map, persistence |
| `polish-check.cjs` | 14 | kid-UX round: locks, price tags, magnet, headlights, celebrate choreography |
| `damage-check.cjs` | 20 | damage tiers, repair, upgrades, keyboard controls |
| `free-check.cjs` | 14 | capsules and prizes, free drive, time-medal tiers |
| `feel-check.cjs` | 12 | game feel: body dynamics, hit-stop, celebrate pacing, iPad shell metas |
| `worlds-check.cjs` | 21 | 12 worlds: level invariants, world hazards, movers, gravity, map, unlock chain, world bonus, golden capsule, premium shop, free-drive tour |
| `album-check.cjs` | 15 | sticker album: buddies, badges, world-backdrop photos, peek card, muddy flag |
| `profile-check.cjs` | 14 | 3 kid profiles, save codes, scan-to-open QR decoded byte-exact with jsQR across version boundaries |
| `washdecals-check.cjs` | 11 | wash mini-game, decal shop and persistence |
| `parade-check.cjs` | 12 | victory parade: unlock, finale level, jackpot, champion badge |
| `update-check.cjs` | 5 | new-version gate: detection, tap-proof hold-to-reload |
| `world-check-audio-events.cjs` | 16 | per-world jingles, ambience beds, star scales, live sky events, quiet mode, deep-level frame time |
| `paint-check.cjs` | 22 | pattern paints: 11 swatches on the second tray page, defs in both views, buying, v3 save code round trip, v2 legacy decode, album re-render |
| `shop-check.cjs` | 21 | shop pack: 23-body / 13-wheel / 9-entry decal catalog, tap-forward + hold-back cycling, hover body, every body x extras x buddy x decal in both views, two-page extras tray, v3 round trip, frozen-width v2 decode |
| `number-check.cjs` | 13 | race number: sticker-tab tile, keypad rules, 400-star change / free removal, roundel in both views beside a sticker, save-code tail, photos |
| `upkeep-check.cjs` | 20 | fuel and tire wear, dry-tank crawl, bald-tire grip, shine bonus, workbench fill-up and tire tiles, save-code tail, legacy defaults, garage column geometry |
| `ghost-check.cjs` | 16 | ghost race: trace recording, replay sprite follows the trace, slower keeps / faster replaces, gap chip, fade at the line, reload, save-code exclusion, malformed ghost dropped |
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
