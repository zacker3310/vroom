# Scout Report — vroom

## Tech Stack
Greenfield. Single-file static HTML/CSS/JS game, no dependencies, no build step. Matches vault static-web pattern (personal/assets/brand): preview via `python3 -m http.server 4173`.

## Relevant Files
None yet. Deliverable: `index.html`. Spec: `SPEC.md`. Approved design plan: `~/.claude/plans/i-need-to-make-fluttering-barto.md`.

## Architecture Notes
- Fixed 1200x700 stage div, `transform: scale()` to fit viewport.
- Two scene divs (garage, road), toggled. One state object, persisted to localStorage.
- Vehicle = generated SVG string from part definitions; paint via CSS var; reused in both scenes.
- Audio = Web Audio synth module, ctx created/resumed on first pointerdown (iOS unlock).
- Drive loop = requestAnimationFrame; world scrolls via layer translateX at parallax factors; car screen-x fixed.

## Risks
- iOS audio unlock: must resume AudioContext inside a user gesture.
- SVG wheel rotation needs `transform-box: fill-box; transform-origin: center`.
- Double-tap zoom / scroll on iPad: `touch-action: none` + viewport meta.
- Playwright cannot verify actual sound; verify no console errors + audio ctx state instead.

## Suggested Approach
Both tasks land in one `index.html`; build garage first, then road, verify with Playwright at 1024x768.
