# Vroom test suites

Fifteen Playwright regression suites (237 checks) covering the full game, plus a lint pass
over the inline script and a level report for eyeballing level variety.

## Run everything

```bash
# one-time: npm i playwright-core (anywhere on NODE_PATH, or symlink a node_modules into tests/)
# and a Chromium build; profile-check also wants jsqr (in tests/ or the repo root)
CHROMIUM=/path/to/chrome node tests/run-all.cjs            # serves the repo on a free port, runs all 15
CHROMIUM=/path/to/chrome node tests/run-all.cjs verify shop-check   # a subset
node tests/lint.cjs                                        # ESLint over the inline <script> (needs a global eslint)
```

`run-all.cjs` prints a summary table and exits non-zero when any suite fails. Set `VROOM_URL`
to test an already-running server instead of the built-in one, or `PORT` to pin the port.

## Run one suite by hand

Every suite honours `VROOM_URL` (default `http://localhost:4173/index.html`) and `CHROMIUM`
(default: a Playwright chromium under `~/Library/Caches/ms-playwright/`). Screenshots land in
`tests/shots/`.

```bash
python3 -m http.server 4173 &          # from the repo root
cd tests && CHROMIUM=/opt/pw-browsers/chromium-1194/chrome-linux/chrome VROOM_URL=http://localhost:4173/index.html node verify.cjs
```

## The suites

- `verify.cjs` — garage/shop/economy/levels/map/persistence core loop (35)
- `polish-check.cjs` — kid-UX round: locks, tags, magnet, headlights, celebrate (14)
- `damage-check.cjs` — damage/repair/upgrades/keyboard (20)
- `free-check.cjs` — capsules, free drive, time tiers (14)
- `feel-check.cjs` — game feel: dynamics, hit-stop, choreography, iPad shell (12)
- `worlds-check.cjs` — worlds, movers, gravity, world map, premium content (21)
- `album-check.cjs` — sticker album: buddies, badges, photos, muddy flag (11)
- `profile-check.cjs` — 3 kid profiles, save codes, QR round-trip via jsQR (14)
- `washdecals-check.cjs` — wash mini-game and decal shop/persistence (11)
- `parade-check.cjs` — victory parade: unlock, finale level, jackpot, champ badge (12)
- `update-check.cjs` — new-version gate: detection, tap-proof hold-to-reload (5)
- `world-check-audio-events.cjs` — per-world jingles/ambience beds, star scales, live sky events, quiet mode, frame time on the last level (16)
- `paint-check.cjs` — pattern paint pack: 11 pattern swatches on a second tray page, flip chip, `<pattern>`/gradient defs in side + rear views, buying a pattern, v3 compact save code (count-prefixed colors + equipped paint) and legacy v2 decode, album photo re-render (22)
- `shop-check.cjs` — shop pack: 23-body / 13-wheel / 9-decal catalog, tap-forward + long-press-back cycling with the dot row, hover (no wheels in either view, floats + bobs, glow + trail), every new body x extras x buddy x decal in both views, new wheels / decals / buddies, 3x3 two-page extras tray, hover at 999 denied / 1000 bought, v3 code round trip with new parts, frozen-width v2 legacy decode (21)
- `fairness-check.cjs` — two headless bots drive every level through the real collision code: a "smart" bot (one lane change per 350 units, toward stars, away from hard obstacles) must finish every level with ≥45% of the stars and ≤4 hard hits; a "lazy toddler" (middle lane, gas only) must finish every level and still find ≥15% of the stars on levels 1-20; world 1 stays gentle (9; `--table` prints the per-level table, `--hits` lists each hard hit)

## Tools, not suites

- `lint.cjs` — extracts the inline `<script>` to a temp file and runs ESLint (flat config in
  `../eslint.config.js`: `no-unused-vars`, `no-undef` with browser globals + every element id,
  `no-redeclare`, `no-dupe-keys`, `no-unreachable`, `eqeqeq`). Names used only from HTML
  handlers or the suites are listed separately with `--all`.
- `level-report.cjs` — builds every level and prints each one's beat sequence and prop counts
  (add `--shots` for mid-drive screenshots of a few levels). It is seeded, so its output is a
  byte-exact fingerprint of the level generator.
