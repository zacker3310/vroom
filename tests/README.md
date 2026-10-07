# Vroom test suites

Fifteen Playwright regression suites (237 checks) that drive the real game in headless
Chromium. They are the gate for every change: CI runs them on each push and pull request.

## Run everything

```bash
npm ci                                   # from the repo root: playwright-core + jsqr (test-only)
npx playwright-core install chromium     # once; or export CHROMIUM=/path/to/chrome
npm test                                 # = node tests/run-all.cjs
```

`run-all.cjs` serves the repo root on a free port, runs every suite below in turn, prints a
summary table and exits non-zero on any failure. Flags: `--verbose` (stream all output),
`--only verify,shop-check`, `--port 4190`. Env: `CHROMIUM` (browser binary; defaults to
playwright-core's download), `VROOM_URL` (use a server you already run instead of the
built-in one, e.g. `python3 -m http.server 4173` then
`VROOM_URL=http://localhost:4173/index.html npm test`).

A single suite runs on its own too, with the same env:

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
| `album-check.cjs` | 11 | sticker album: buddies, badges, photos, muddy flag |
| `profile-check.cjs` | 14 | 3 kid profiles, save codes, scan-to-open QR decoded byte-exact with jsQR across version boundaries |
| `washdecals-check.cjs` | 11 | wash mini-game, decal shop and persistence |
| `parade-check.cjs` | 12 | victory parade: unlock, finale level, jackpot, champion badge |
| `update-check.cjs` | 5 | new-version gate: detection, tap-proof hold-to-reload |
| `world-check-audio-events.cjs` | 16 | per-world jingles, ambience beds, star scales, live sky events, quiet mode, deep-level frame time |
| `paint-check.cjs` | 22 | pattern paints: 11 swatches on the second tray page, defs in both views, buying, v3 save code round trip, v2 legacy decode, album re-render |
| `shop-check.cjs` | 21 | shop pack: 23-body / 13-wheel / 9-entry decal catalog, tap-forward + hold-back cycling, hover body, every body x extras x buddy x decal in both views, two-page extras tray, v3 round trip, frozen-width v2 decode |
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
