# Vroom

Build-a-car garage game for a 3-5 year old. Browser, single `index.html`, no dependencies, no build step.

## Design rules (non-negotiable)

- Zero required reading. Icons, pictures, and numerals only.
- No fail states, no timers. Nothing to lose: stars only go up, obstacles bonk-and-stop but never end a run.
- Every interactive element >= 64px rendered at iPad landscape (1024x768).
- Every tap gives instant feedback: animation + synthesized sound.
- Loop: build -> drive -> collect stars -> celebrate -> unlock cooler stuff -> build again.

## v3 amendment (2026-07-10, user-directed)

v1's "no scores" rule is amended: stars are now collected and kept as the game's
only currency. There is still no way to lose stars or fail a level.

## Scene 1: Garage

Kid assembles a vehicle from big picture buttons:

- **Body** (tap cycles, 15): dump truck, digger, cement mixer, fire truck, monster truck + unlockable police car, race car, tractor, ice cream truck, rocket car, UFO + premium limo (250), dragon (300), train (350), royal carriage (400)
- **Wheels** (tap cycles, 8): normal, monster, racing + unlockable gold, flower, tank + premium glow (90), star (120)
- **Extras** (6 toggles): horn, beacon, flag free + purchasable wings (40), rocket booster (60), party hat (25)
- **Paint**: 12 color swatches (6 free + purple, teal, lime, white, black, rainbow unlockable), instant repaint with splat sound
- **Extras** (toggles): horn, spinning beacon light, flag
- Tapping the vehicle honks (per-body honk voice)
- **Shop, no reading**: locked parts show grayed in the cycle with a star price tag under the preview. Tap the tag: enough stars = fanfare + confetti unlock; not enough = boink + wallet shake. GO is disabled while a locked part is selected.
- Star wallet chip always visible
- Big green GO arrow -> drive current level. Map button -> level map.

Any owned combination is valid. Vehicle preview updates live with bounce + pop.

## Scene 2: World map (v5)

80 levels across 8 themed worlds of 10: construction day, sunset, night, rain,
snow, desert, beach, space. A row of 8 themed world tabs (locked until the
previous world's last level is beaten) selects a page of 10 big level buttons.
Finished level N unlocks N+1. Locked = gray + padlock. Done = number + 1-3 star
rating + S/A/B/C medal badge. Free-drive button up top. House returns to garage.

World flavor: rain (particles, puddles everywhere), snow (flakes, ice slicks,
snowmen, slush), desert (giant sun, cacti, rolling tumbleweeds), beach (waves,
palms, sandcastles, lane-hopping crabs), space (starfield, moon road, craters,
friendly aliens, LOW GRAVITY floaty jumps, headlights). Tumbleweeds and crabs
MOVE — the first moving obstacles. First clear of a world's last level banks a
+25 star trophy bonus.

## Scene 3: Road

Side-scrolling construction site, now 3 lanes. The exact vehicle built in the garage drives it.

- **Gas pedal** (green, bottom-right): hold to drive. **Brake pedal** (red): squeal stop.
  Holding anywhere on the road also drives (v1 muscle memory).
- **Lanes**: swipe up/down (or side arrow buttons, or arrow keys) to change lane.
  Steer INTO stars, AWAY from obstacles.
- Tap vehicle = honk
- Mud puddle -> splash, muddy wheels (lane-specific)
- Ramp -> jump with "whee" arpeggio (spans all lanes; high stars float over ramps)
- Traffic cones -> tumble with boinks (soft: fun, no penalty)
- Barrels / rocks -> bonk, car stops and wobbles, +1 damage (hard: never a fail, just a stop)
- Oil slicks (level 5+) -> spin-out, half speed, no damage
- TNT crates (level 12+) -> cartoon boom, +2 damage
- **Damage** (v4): persists 0-9 (wrench chip in HUD + celebrate). Truck shows scuffs at 1+,
  cracked glass at 3+, smoke + 15% slower at 5+. Jumping clears hazards. Shield upgrade soaks
  damage. Finish a run with no new dings -> +2 star clean bonus. Never blocks play.
- **Garage repair**: pulsing wrench button when dinged, costs 2 stars per damage point.
- **Garage upgrades** (star-paid, 3 pips each): engine (+80 top speed/level),
  shield (soaks 1 damage per hit/level), star magnet (wider pull/level).
- **Keyboard**: WASD or arrows steer (W/S = lanes), D/->/space = gas, A/<- = brake.
- **Surprise capsules** (v4.3): wrapped gift boxes on the road (1-2 per level from level 2,
  common in free drive). Driving into one pops it: weighted prize roll of +3 stars, +8 stars,
  or a one-off gag animation (duck parade, ball burst, rainbow bloom, bird banner).
- **Time medals** (v4.3): every level records best time; S/A/B/C medal by par curve
  (S = near-clean full-throttle run; engine upgrades matter late). Small timer in the HUD
  progress chip, medal pops on celebrate, badge on the level map. Best medal is kept —
  time never punishes, only rewards.
- **Free drive** (v4.3): big road button on the map starts an endless cruise — no finish,
  no timer, kid-paced. Difficulty rises gently with distance, day/sunset/night cycle every
  stretch, stars bank automatically when heading home.
- Stars -> chime + burst, +1 to run counter, banked to wallet at the finish (+3 finish bonus)
- Finish flag -> confetti, star tally, next level unlocked; buttons: replay / next / garage
- House button (top-left) returns to garage anytime
- Levels are seeded-random: longer and denser as the number grows. Day sky 1-10,
  sunset 11-20, night 21-30.

## Tech

- SVG vehicle built from part groups, recolored via CSS var `--paint`. Same SVG in both scenes.
- Web Audio API, all sounds synthesized. Audio unlocked on first pointer event (iOS).
- Pointer events only (touch + mouse unified). `touch-action: none`, pinch-zoom locked.
- Fixed 1200x700 stage, scaled to fit viewport (letterbox). Landscape-first.
- State `vroom.v2` = `{build, wallet, owned, levels, current}` persisted to localStorage; v1 build migrated.
- Levels generated from a seeded PRNG (level number = seed) so each level is stable across plays.

## Feel (v4.5)

- The car is a character: leans back accelerating, dives braking, banks through lane
  changes, squashes + kicks dust on landing. Crashes hit-stop for 90ms then shake on
  both axes. Speed lines at ~top speed. Star streaks climb a coin-combo pitch ladder.
- Engine = two detuned saws through a speed-swept filter + wind layer at speed; every
  sound routes through one master compressor so stacked sfx never clip iPad speakers.
- Scene changes iris-reveal. Celebrations pace the payoff: tally, rating stars, time
  medal, then the buttons slide in.
- Portrait shows a rotate-me overlay (the 64px touch floor only holds in landscape).

## Verify

- `python3 -m http.server 4173` and open http://localhost:4173
- Playwright: full loop (cycle all parts, GO, drive to finish, confetti, return), console clean, touch targets >= 64px at 1024x768.
