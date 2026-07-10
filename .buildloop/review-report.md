# Doubt Review: vroom

Audit of `.buildloop/build-claims.md` against `index.html`, re-run of runnable checks, and an independent bug hunt. Reviewer: Doubt sub-agent, 2026-07-09.

## Verdict: PASS (after 5 fixes applied)

Build claims were substantially accurate. All 22 automated checks passed before and after review. However, the independent bug hunt found 2 HIGH and 3 MEDIUM issues the claims did not mention, all centered on exactly the audience profile (a 3-5 year old mashing with multiple fingers). All five were reproduced in headless Chromium, fixed in `index.html`, and re-verified: full suite 22/22 PASS plus 9/9 targeted regression checks PASS.

## 1. DELTA_MANIFEST audit

| Claim | Verdict |
|---|---|
| index.html: fit(), vehicleSVG(), wheelSVG(), BODIES x5, WHEELS x3, sfx x9, engineStart/Set/Stop, renderPreview(), showGarage/showRoad, buildProps(), tick(), celebrate() | VERIFIED, all present, no deps, no build step |
| SPEC.md, TASKS.md, .buildloop/scout-report.md, .buildloop/current-plan.md exist | VERIFIED |
| FILES_MODIFIED: 0 | VERIFIED (no other files in project) |

## 2. SPEC claims audit

| Claim | Verdict |
|---|---|
| bodyBtn cycles 5, wheelBtn cycles 3, 6 swatches, 3 extras, preview honk, goBtn | VERIFIED (index.html:452-506) |
| accel to 700px/s, friction release | VERIFIED (index.html:616-617: cap 700, +900/s, -600/s) |
| 4 cones, puddle, ramp x=2600, jump vy=v*0.9 g=1500, tilt, finish x=5200, confetti 90, overlay, both return paths | VERIFIED |
| 5 stars "(3+2 ground y=505, 1 air y=330)" | **INACCURATE BREAKDOWN.** Actual: 4 ground (1200, 1800, 3800, 4200 at y=505) + 1 air (2950 at y=330). Total of 5 is correct; "3+2 ground" + 1 air would be 6. Doc error only. |
| Audio: synth only, ctx created+resumed on first pointerdown capture, engine sawtooth | VERIFIED (index.html:246-250, 297-316) |
| State "validated on load" | **OVERSTATED, was a real bug.** Only `body` and `wheels` were validated; `color` and `extras` were taken as-is. See finding F2. Now accurate after fix. |
| Wheels nested translate/rotate groups; 1200x700 stage scaled | VERIFIED (index.html:335, 225-230) |

## 3. BUG_FIXES audit

| Claimed fix | Verdict |
|---|---|
| extras-touch-target 92x92 | VERIFIED (index.html:78). 92px * 0.853 scale at 1024x768 = 78.5px rendered, >= 64px |
| wheels-detached, nested rotation group | VERIFIED in code and screenshot; wheel centers measured at x=75/207, y=153 inside carWrap |
| baseline-mismatch, unified ground y=585 | VERIFIED by arithmetic: car 379 + 206.25 = 585.25; cones 505+80=585; ramp 490+95=585; finish 355+230=585; puddle center 533+52=585 |
| cone-double-class single classList.add | VERIFIED (index.html:642) |

## 4. KNOWN_GAPS validation

All four gaps are accurately described and correctly scoped:

- **audio-on-real-ios**: accurate. Unlock uses the documented pointerdown-capture + resume pattern (index.html:246-250). Still untested on hardware; remains open.
- **no-portrait-layout**: accurate. fit() letterboxes, no rotate hint.
- **mixer-drum-spin**: accurate. `class="spinner"` with fixed 3.5s CSS animation, not speed-linked.
- **single-level**: accurate. One static `defs` array in buildProps().

## 5. VERIFICATION_MATRIX re-run

- **CHECK:full-loop**: re-run against http://localhost:4173 (server verified serving current disk content). Result before fixes: 22/22 PASS, matching the claim. Result after fixes: 22/22 PASS.
- **CHECK:visual**: screenshots regenerated and reviewed. Wheels attached, unified baseline, icon UI readable. PASS.
- **CHECK:real-device**: not runnable here (needs physical iPad). Remains UNTESTED, correctly declared.

## 6. New findings (not in claims), all reproduced then fixed

### F1. HIGH: partial/corrupted localStorage bricked the entire game
`state = saved` accepted any object passing the body/wheels check. A saved value missing `extras` (e.g. `{"body":"dump","wheels":"normal"}`) threw `Cannot read properties of undefined (reading 'horn')` during initial script execution, killing every listener below it: no GO button, no drive scene, permanently broken until storage cleared. Reproduced (pageerror captured). **Fix:** field-by-field merge into defaults; `color` checked against COLORS, `extras` coerced to booleans (index.html:239-246). Regression: partial and garbage saves now load clean with defaults.

### F2. HIGH: two fingers on GO spawned a second rAF loop that survived forever
`startDrive()` never cancelled an existing loop. Two pointerdowns on goBtn (trivial for a toddler with two fingers) ran `startDrive()` twice; `stopDrive()` could only cancel the last rafId, so one orphan tick loop kept running in the garage forever, one more per mash. Physics did not double (shared `lastT` gives the second same-frame callback dt=0), but it is a permanent CPU/battery drain on an iPad and each GO mash adds another. Reproduced (`rafId` non-null 300ms after returning to garage). **Fix:** `startDrive()` now calls `stopDrive()` first (index.html:595). Regression: `rafId === null` after double showRoad + home.

### F3. MEDIUM: celebrate overlay leaked into the next drive
`celebrate()` armed an unhandled 700ms setTimeout to show the overlay. Finishing then tapping HOME inside that window let the timer fire while the road was hidden, so the next GO started with the "build another truck" overlay already covering the screen. Reproduced. **Fix:** timer handle stored in `celebrateTimer`, cleared in `stopDrive()`, plus `startDrive()` strips the `active` class defensively (index.html:598, 612-613, 715). Regression: overlay no longer present on the next drive.

### F4. MEDIUM: lifting one of two fingers stopped the car
Global `pointerup` called `pressOff()` unconditionally. A kid holding the road with two fingers who lifts one had the car stop while still holding. Reproduced with synthetic multi-pointer events. **Fix:** `drivePointers` Set keyed by pointerId; `held` releases only when the last driving pointer lifts; set cleared on each startDrive (index.html:597, 687-696). Regression: held stays true with one finger remaining, false after the last lifts.

### F5. MEDIUM: slow ramp crest teleported the car down 95px
Airborne launch required `v > 260`; a car cresting the ramp slower snapped instantly from jumpY=95 to 0 in a single frame, a visible glitch. **Fix:** any crest-off goes airborne with vy = v*0.9 and falls under gravity; the "whee" arpeggio still only plays above 260 so the claimed jump behavior is unchanged (index.html:635-640). Regression: max single-frame drop at v=150 is now 8.6px, smooth fall, clean landing.

Also audited and found sound (no action needed): event listeners are all attached once, props/confetti/mud state fully reset on scene switch, dt clamped at 0.05 for background-tab resume, celebrate overlay blocks drive input via `closest('#celebrate')`, honk guarded against null AudioContext, `touch-action: none` + viewport meta lock pinch/double-tap zoom, SVG `transform-box: fill-box` used correctly for wheel and beacon rotation.

## 7. Verification after fixes

- Full-loop suite: **22/22 PASS** (touch targets, 5 bodies, 3 wheels, 6 colors, 3 extras, drive/coast, wheels attached, 4 cones, 5 stars, mud, 90 confetti, overlay, both return paths, persistence, console clean).
- Targeted regressions for F1-F5: **9/9 PASS**.
- Not verified: real iOS hardware (audio unlock, actual multi-touch). CHECK:real-device stays open as claimed.

## Final verdict: PASS
