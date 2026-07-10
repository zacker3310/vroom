# Vroom

Build-a-car garage game for a 3-5 year old. Browser, single `index.html`, no dependencies, no build step.

## Design rules (non-negotiable)

- Zero required reading. Icons and pictures only.
- No fail states, no scores, no timers. Nothing to lose.
- Every interactive element >= 64px rendered at iPad landscape (1024x768).
- Every tap gives instant feedback: animation + synthesized sound.
- Loop: build -> drive -> celebrate -> build again.

## Scene 1: Garage

Kid assembles a vehicle from big picture buttons:

- **Body** (tap cycles): dump truck, digger, cement mixer, fire truck, monster truck
- **Wheels** (tap cycles): normal, monster, racing
- **Paint**: 6 color swatches, instant repaint with splat sound
- **Extras** (toggles): horn, spinning beacon light, flag
- Tapping the vehicle honks (per-body honk voice)
- Big green GO arrow -> drive scene

Any combination is valid. Vehicle preview updates live with bounce + pop.

## Scene 2: Road

Side-scrolling construction site. The exact vehicle built in the garage drives it.

- Hold anywhere = drive. Release = coast to stop. Only control.
- Tap vehicle = honk
- Mud puddle -> splash, muddy wheels
- Ramp -> jump with "whee" arpeggio
- Traffic cones -> tumble with boinks
- Stars -> chime + burst (no score kept)
- Finish flag -> confetti, celebration, big button back to garage
- House button (top-left) returns to garage anytime

## Tech

- SVG vehicle built from part groups, recolored via CSS var `--paint`. Same SVG in both scenes.
- Web Audio API, all sounds synthesized. Audio unlocked on first pointer event (iOS).
- Pointer events only (touch + mouse unified). `touch-action: none`, pinch-zoom locked.
- Fixed 1200x700 stage, scaled to fit viewport (letterbox). Landscape-first.
- State `{body, wheels, color, extras}` in one object, persisted to localStorage.

## Verify

- `python3 -m http.server 4173` and open http://localhost:4173
- Playwright: full loop (cycle all parts, GO, drive to finish, confetti, return), console clean, touch targets >= 64px at 1024x768.
