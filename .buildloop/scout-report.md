# Scout Report — v3 enhancement round (2026-07-10)

## Tech Stack
Single `index.html`, zero deps, no build step. SVG vehicles recolored via `--paint` CSS var, Web Audio synth, pointer events, fixed 1200x700 stage scaled to viewport. Serve with `python3 -m http.server 4173`.

## Current Architecture (719 lines)
- CSS: garage + road + celebrate scenes, `.bigBtn` pattern, keyframe anims (bounce, spin, pulse, fall)
- State: `{body, wheels, color, extras}` → `localStorage vroom.v1`
- Audio: `tone()`, `noiseBurst()`, `sfx.*`, engine = persistent sawtooth osc
- Vehicle SVG: `BODIES{dump,digger,mixer,fire,monster}` each `{roof:[x,y], rear:[x,y], svg:()=>string}`, viewBox 0 0 320 230, ground y=200, axles x=85/235. `WHEELS{normal:r26, monster:r40, racing:r22}`. `wheelSVG(type,cx)`, `extrasSVG()`, `vehicleSVG(st)`
- Garage UI: cycle buttons (body/wheels), 6 swatches, 3 extra toggles, GO
- Road: 3 parallax layers (6400px), single track, hold-anywhere-or-pedal = gas, coast on release. Props array `{type,x,el,done}`, collision by `carX - p.x` window in `tick()`. Ramp elevation fn, jump physics (vy, gravity 1500), finish → confetti → celebrate overlay
- Key constants: CAR_SCREEN_X=300, CAR_BASE_TOP=379 (ground line stage y=585), vmax=700, accel=900, coast=600

## Risks
- Single file growing ~3x: keep section banners, no parallel edits to this file
- Rainbow paint needs SVG gradient defs; per-SVG unique ids to avoid cross-SVG id collisions with display:none scenes
- Lane transitions vs collision: use rounded visual lane, not target lane
- Level scenery width must scale with level length (currently hardcoded 6400)
- localStorage migration v1 → v2 (preserve kid's build)

## Suggested Approach
Implement core in main context (single file = no parallel edits). Delegate: new vehicle body SVGs to a design agent (conventions above), review/doubt/verify to agents. Verify with Playwright against http.server.
