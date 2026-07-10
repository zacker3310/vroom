# Tasks

- [x] T1.1: Scaffold + garage scene: fixed-stage layout, SVG vehicle part system (5 bodies, 3 wheel sets, 6 colors, 3 extras), part-cycling UI with bounce/pop feedback, Web Audio synth module with iOS unlock, honk-on-tap, GO button, localStorage persistence. [SPID]
- [x] T1.2: Road scene: parallax construction site, hold-to-drive physics with engine sound and wheel spin, ramp jump, mud puddle, cones, stars, honk-on-tap, finish confetti celebration, return-to-garage loop. [SPID]

## v3 (2026-07-10, user-directed)

- [x] T3.1: Core systems rewrite: 3-lane road (swipe/arrows/keys), gas + brake pedals, seeded 30-level generator with soft/hard obstacles + day/sunset/night themes, star currency + HUD, level map scene, celebrate w/ tally + replay/next/garage, vroom.v2 persistence + v1 migration, mini-review fixes (engine audio ramps, fit() rotation, audio try/catch, whee gate, collision handler registry). [SPI-]
- [x] T3.2: Content + shop: 6 new bodies (police, race, tractor, icecream, rocket, ufo), 3 new wheels (gold, flower, tank), 6 new colors incl. rainbow gradient, per-body honks, garage shop flow (locked cycle, price tag, buy fanfare, GO gating). [SPI-]
- [x] T3.3: Polish + verify: Playwright full-loop regression, kid-UX pass (12-item punch list), Doubt audit. [SPID]

## v4 (2026-07-10, user-directed: hazards, damage, upgrades, roadtrip longevity)

- [x] T4.1: WASD + arrow keyboard controls (steer/gas/brake) alongside mouse pedals. [SPID:fast]
- [x] T4.2: Damage system: persistent 0-9 damage w/ scuff/crack/smoke tiers + 15% speed penalty at 5+, oil-slick spin-outs (L5+), TNT crates (L12+, 2 dmg), HUD + celebrate damage chips, clean-run +2 star bonus, star-paid repair (2/point), upgrade tracks engine/shield/magnet (3 levels each). [SPI-]
- [x] T4.3a: Surprise capsules (weighted star/gag prizes, 4 gag animations), free-drive endless cruise (map button, seamless parallax wrap, distance-gated difficulty, theme cycling, bank-on-exit), S/A/B/C time-trial medals (HUD timer, celebrate medal, map badges), steeper difficulty curve. [SPI-]
- [ ] T4.3b: Remaining longevity round A: tap-everything Easter eggs, magic dice randomizer, quiet mode, idle attract (assets ready in scratchpad/delight-assets.js).
- [ ] T4.4: Roadtrip longevity round B: finish-line photo keepsakes, sticker album scene, passenger buddies, decal slots, car wash.
- [x] T4.5: Nintendo-quality game-feel pass: body dynamics (accel lean / brake dive / lane bank), hit-stop + 2-axis quake, landing squash + dust, rising star-combo chimes, layered engine (detuned saws + swept filter + wind), speed lines at vmax, celebrate choreography (payoff first, buttons last, medal beat, damage only when relevant), iris scene transitions, iPad shell (rotate overlay, master compressor, touch-callout, metas, favicon), retuned medal curve (forgiving early, upgrade-tuned late), garage GO attract. [SPI-]

## v5 (2026-07-10, user-directed: "go wild" worlds expansion)

- [ ] T5.1: 80 levels across 8 themed worlds (construction/sunset/night/rain/snow/desert/beach/space): shared levelLen(), world-select map (8 tabs + 10-level pages), sequential world unlock, per-world CSS themes + scenery + weather particles (rain/snow), world-specific hazards incl. MOVING obstacles (tumbleweed, crab), low-gravity space physics, world-clear 25-star bonus, golden capsules, free-drive cycles all 8 themes.
- [ ] T5.2: Premium content: 4 endgame bodies (limo, dragon, train, royal 250-400 stars), 2 wheels (glow, star), 3 purchasable extras (wings, booster, party hat), capsule prize table v2.
- [ ] T5.3: Suite updates (80-level invariants, worlds map, movers) + mega Doubt + docs.

## Backlog (v2 candidates, from kid-testing)

- [ ] T2.1: Real-device iOS pass: audio unlock, multi-touch, add-to-home-screen icon.
- [ ] T2.2: Road variation between runs (shuffle prop layout) so replays stay fresh.
- [ ] T2.3: Speed-linked mixer drum spin and idle engine putter in garage.
