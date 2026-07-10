# Tasks

- [x] T1.1: Scaffold + garage scene: fixed-stage layout, SVG vehicle part system (5 bodies, 3 wheel sets, 6 colors, 3 extras), part-cycling UI with bounce/pop feedback, Web Audio synth module with iOS unlock, honk-on-tap, GO button, localStorage persistence. [SPID]
- [x] T1.2: Road scene: parallax construction site, hold-to-drive physics with engine sound and wheel spin, ramp jump, mud puddle, cones, stars, honk-on-tap, finish confetti celebration, return-to-garage loop. [SPID]

## v3 (2026-07-10, user-directed)

- [x] T3.1: Core systems rewrite: 3-lane road (swipe/arrows/keys), gas + brake pedals, seeded 30-level generator with soft/hard obstacles + day/sunset/night themes, star currency + HUD, level map scene, celebrate w/ tally + replay/next/garage, vroom.v2 persistence + v1 migration, mini-review fixes (engine audio ramps, fit() rotation, audio try/catch, whee gate, collision handler registry). [SPI-]
- [x] T3.2: Content + shop: 6 new bodies (police, race, tractor, icecream, rocket, ufo), 3 new wheels (gold, flower, tank), 6 new colors incl. rainbow gradient, per-body honks, garage shop flow (locked cycle, price tag, buy fanfare, GO gating). [SPI-]
- [ ] T3.3: Polish + verify: Playwright full-loop regression, kid-UX pass, performance pass, Doubt audit.

## Backlog (v2 candidates, from kid-testing)

- [ ] T2.1: Real-device iOS pass: audio unlock, multi-touch, add-to-home-screen icon.
- [ ] T2.2: Road variation between runs (shuffle prop layout) so replays stay fresh.
- [ ] T2.3: Speed-linked mixer drum spin and idle engine putter in garage.
