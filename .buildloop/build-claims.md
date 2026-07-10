AUDIT_PAYLOAD::v1
AGENT: claude-fable-5/vroom
TARGET: /Users/zacker/Documents/dev/vroom

== DELTA_MANIFEST ==
FILES_CREATED: 5
  index.html | full game, single file | fit(), vehicleSVG(), wheelSVG(), BODIES{dump,digger,mixer,fire,monster}, WHEELS{normal,monster,racing}, sfx{pop,clank,splat,chime,boink,whee,splash,tada,honk}, engineStart/Set/Stop, renderPreview(), showGarage/showRoad, buildProps(), tick(), celebrate() | no deps, no build step
  SPEC.md | project spec | design rules, scenes, tech | -
  TASKS.md | task queue | T1.1, T1.2 pending checkboxes | mark done after Doubt
  .buildloop/scout-report.md | scout | - | -
  .buildloop/current-plan.md | plan | - | -
FILES_MODIFIED: 0

== SPEC ==
GAME: preschool (3-5) build-a-car; garage scene -> road scene loop
GARAGE: bodyBtn cycles 5 bodies | wheelBtn cycles 3 wheel sets | 6 swatches set --paint | 3 extraBtn toggles (horn,beacon,flag) | preview tap honks | goBtn -> road
ROAD: hold pedal/anywhere = accel to 700px/s, release = friction stop | props: 4 cones (tumble), puddle (splash+mud), ramp x=2600 (jump vy=v*0.9, g=1500, tilt), 5 stars (3+2 ground y=505, 1 air y=330), finish x=5200 (confetti 90 + overlay) | homeBtn + celebrateBtn -> garage
AUDIO: WebAudio synth only; ctx created+resumed on first pointerdown (capture) | engine sawtooth loop while driving
STATE: {body,wheels,color,extras} -> localStorage vroom.v1, validated on load
RENDER: SVG string gen; wheels nested <g translate><g.wheelrot> so JS rotate does not clobber position; stage 1200x700 scaled via transform to viewport

== BUG_FIXES ==
FIX:extras-touch-target | index.html .extraBtn CSS | 150x55 -> 92x92 | was: 46.9px rendered height < 64px minimum at 1024x768
FIX:wheels-detached | index.html wheelSVG() | nested rotation group inside translate group | was: style.transform rotate() overrode SVG translate attr, wheels rendered at svg origin (in the sky)
FIX:baseline-mismatch | index.html buildProps()/CAR_BASE_TOP | unified ground line y=585 for car, cones, puddle, ramp, finish | was: car ground 590, props ~508, car sank into road while props floated
FIX:cone-double-class | index.html tick() | single classList.add | was: same class added twice via redundant DOM walk

== KNOWN_GAPS ==
GAP:audio-on-real-ios | synth sounds verified error-free in headless Chromium only; real iPad Safari unlock path untested | needs a physical device; unlock uses documented pointerdown+resume pattern
GAP:no-portrait-layout | portrait letterboxes small; no rotate-device hint | acceptable v1, kid plays landscape
GAP:mixer-drum-spin | drum spins always (CSS), not speed-linked | cosmetic, cheap charm
GAP:single-level | one road layout, no variation between runs | v2 candidate

== VERIFICATION_MATRIX ==
CHECK:full-loop | /Users/zacker/Documents/dev/nexus/backend/.venv/bin/python3 -u <scratchpad>/verify_vroom.py against http://localhost:4173 (server: python3 -m http.server 4173 in project dir) | 22/22 PASS incl. touch targets >=64px, 5 bodies, 3 wheels, 6 colors, 3 extras, drive/coast, wheels attached, 4 cones, 5 stars, mud, 90 confetti, overlay, both return paths, persistence, console clean | PASS
CHECK:visual | screenshots 1_garage.png, 2b_mid_drive.png, 3_finish.png reviewed | wheels attached, unified baseline, readable icon UI | PASS
CHECK:real-device | open http://<mac-ip>:4173 on iPad | sound + touch + zoom-lock | UNTESTED
