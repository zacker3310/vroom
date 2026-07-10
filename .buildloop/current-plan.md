# Current Plan — T1.1 + T1.2 (single file)

## Dependencies
None. Vanilla HTML/CSS/JS, Web Audio API, SVG.

## File Operations (in order)
1. CREATE `index.html`:
   - `<head>`: viewport locked (`user-scalable=no`), all CSS inline.
   - `#stage` (1200x700, absolute-centered, JS `fit()` scales on resize).
   - `#garage` scene: preview area + bottom control bar:
     - `cycleBody()`, `cycleWheels()` — advance index, `renderVehicle()`, pop sound, bounce class.
     - `setColor(c)` — 6 swatches, splat sound.
     - `toggleExtra(name)` — horn/beacon/flag, clank sound, `.on` class.
     - `#goBtn` — green circle, play-arrow SVG, switches to road.
   - Vehicle system:
     - `BODIES` map: `{svg(): string, roof:[x,y], rear:[x,y], honk: fn}` for dump/digger/mixer/fire/monster.
     - `WHEELS` map: normal r26 / monster r40 / racing r22; `wheelSVG(type, cx)`.
     - `vehicleSVG(state)` — viewBox 0 0 320 230, ground y=200, axles x=85/235, body group lifted by `max(0, r-26)`, `--paint` CSS var, hidden `.mudSpots` group, `.wheelSpin` groups.
   - Audio module: lazy `AudioContext`, `unlock()` on first pointerdown; `pop, clank, splat, chime, boink, whee, splash, tada, honk(body)`, engine loop (`engineStart/engineSet(v)/engineStop`).
   - `#road` scene: sky/far/mid/ground layers; props from `PROPS` array (cones x3, puddle, ramp, stars x5 incl. one airborne, finish flag at 5200); car wrap at screen x=300.
     - rAF loop: hold accel 900/s to vmax 700, friction 600/s; `pos += v*dt`; layers translate at 0.25/0.55/1.0.
     - Ramp: y follows slope over footprint; leaving end with v>260 sets vy, projectile until ground; whee sound.
     - Cones: knock when passed (CSS tumble + boink). Puddle: splash + show mudSpots. Stars: chime + collect anim.
     - Finish: stop, tada, confetti (~90 divs), celebrate overlay with giant garage button.
     - `#homeBtn` top-left (72px) back to garage. Tap car = honk. Hold anywhere else = drive.
   - State `{body,wheels,color,extras}` -> localStorage `vroom.v1`.

## Verification
- `python3 -m http.server 4173` in project dir.
- Playwright at 1024x768 (touch): cycle every part, paint, toggle extras, GO, hold-drive to finish, confetti visible, return to garage. Console: zero errors.
- Touch-target audit: measure rendered bounding boxes of all buttons/swatches >= 64px.

## Constraints
- No text required for play (decorative sign only). No external assets. No dependencies.
- All sounds synthesized. Everything must work with pointer events (mouse + touch).
