# Vroom test suites

Ten Playwright regression suites (161 checks) covering the full game.

## Run

```bash
# one-time: npm i playwright-core (anywhere on NODE_PATH) and a chromium build
# profile-check also wants jsqr (in tests/ or the repo root)
python3 -m http.server 4173 &          # from the repo root
cd tests
for f in verify polish-check damage-check free-check feel-check worlds-check album-check profile-check washdecals-check parade-check; do node $f.cjs; done
```

Each suite expects `http://localhost:4173/index.html` and a Chromium at
`~/Library/Caches/ms-playwright/chromium-1117/...` (edit `EXE` at the top
of each file for a different build). Screenshots land in `tests/shots/`.

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
