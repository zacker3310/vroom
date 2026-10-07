# Vroom test suites

Fifteen Playwright regression suites (234 checks) covering the full game.

## Run

```bash
# one-time: npm i playwright-core (anywhere on NODE_PATH) and a chromium build
# profile-check also wants jsqr (in tests/ or the repo root)
python3 -m http.server 4173 &          # from the repo root
cd tests
for f in verify polish-check damage-check free-check feel-check worlds-check album-check profile-check washdecals-check parade-check update-check world-check-audio-events fairness-check paint-check shop-check garage-check; do node $f.cjs; done
```

Each suite expects `http://localhost:4173/index.html` and a Chromium at
`~/Library/Caches/ms-playwright/chromium-1117/...`, or wherever the `CHROMIUM`
env var points (e.g. `CHROMIUM=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`). Screenshots land in `tests/shots/`.

- `verify.cjs` — garage/shop/economy/levels/map/persistence core loop (35)
- `polish-check.cjs` — kid-UX round: locks, tags, magnet, headlights, celebrate (14)
- `damage-check.cjs` — damage/repair/upgrades/keyboard (20)
- `free-check.cjs` — capsules, free drive, time tiers (14)
- `feel-check.cjs` — game feel: dynamics, hit-stop, choreography, iPad shell (12)
- `worlds-check.cjs` — 8 worlds, movers, gravity, world map, premium content (18)
- `album-check.cjs` — sticker album: buddies, badges, photos, muddy flag (11)
- `profile-check.cjs` — 3 kid profiles, save codes, QR round-trip via jsQR (14)
- `washdecals-check.cjs` — wash mini-game and decal shop/persistence (11)
- `parade-check.cjs` — victory parade: unlock, finale level, jackpot, champ badge (12)
- `update-check.cjs` — new-version gate: detection, tap-proof hold-to-reload (5)
- `world-check-audio-events.cjs` — per-world jingles/ambience beds, star scales, live sky events, quiet mode, level-80 frame time (16; honours `VROOM_URL`)
- `paint-check.cjs` — pattern paint pack: 11 pattern tiles after the 12 colors in the one paint strip, arrows page to them, `<pattern>`/gradient defs in side + rear views, buying a pattern, v3 compact save code (count-prefixed colors + equipped paint) and legacy v2 decode, album photo re-render (22; honours `VROOM_URL`)
- `shop-check.cjs` — shop pack: 23-body / 13-wheel / 9-decal catalog, 23-tile body strip (every tile equips), arrow paging by 7, hover (no wheels in either view, floats + bobs, glow + trail), every new body x extras x buddy x decal in both views, new wheels / decals / buddies, 10-tile extras strip, hover at 999 denied / 1000 bought, v3 code round trip with new parts, frozen-width v2 legacy decode (21; honours `VROOM_URL`)
- `garage-check.cjs` — redesigned garage: <=16 controls at rest, six category tabs with 23/13/23/9/10/3(+repair/wash) tiles, selection ring follows state, locked tile -> tag -> buy -> equipped, arrows page the strip, a swipe scrolls instead of equipping, speaker toggle in the grown-ups overlay persists, >=64px targets, zero text (19; honours `VROOM_URL`)
- `fairness-check.cjs` — two headless bots drive all 80 levels through the real collision code: a "smart" bot (one lane change per 350 units, toward stars, away from hard obstacles) must finish every level with ≥45% of the stars and ≤4 hard hits; a "lazy toddler" (middle lane, gas only) must finish every level and still find ≥15% of the stars on levels 1-20; world 1 stays gentle (9; `--table` prints the per-level table, `--hits` lists each hard hit; honours `VROOM_URL`)

Not a suite: `level-report.cjs` builds all 80 levels and prints each one's beat
sequence and prop counts (add `--shots` for mid-drive screenshots of a few levels).
