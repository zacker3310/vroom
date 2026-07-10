# Vroom test suites

Six Playwright regression suites (113 checks) covering the full game.

## Run

```bash
# one-time: npm i playwright-core (anywhere on NODE_PATH) and a chromium build
python3 -m http.server 4173 &          # from the repo root
cd tests
for f in verify polish-check damage-check free-check feel-check worlds-check; do node $f.cjs; done
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
