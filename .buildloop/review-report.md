# Review Report — v3 audit (T3.1 + T3.2)

**VERDICT: PASS** — after fixes. Suite 35/35 before and after; 4 MED issues found and fixed, 2 LOW fixed opportunistically, 5 LOW reported only. No HIGH issues. One BUG_FIXES claim (star-dropout) was materially overstated; everything else in the audit payload verified against the code. Reviewer: Doubt sub-agent, 2026-07-10.

## Verification matrix re-run

| CHECK | Result |
|---|---|
| suite (verify.cjs) | 35/35 baseline, 35/35 after fixes |
| console | clean at load and end, both runs |
| touch >= 64px | pass (swatches render 64.8px at 1024x768) |
| gen-invariants (30 levels) | pass, incl. after generator fix (1 finish, no 3-lane wall, in-bounds, min x-gap 170 held) |
| econ (police 25, rainbow 60, deny at 0, bank 4+3) | exact values, pass |
| migration v1 -> v2 | pass (fire/monster/green/horn) |
| screenshots | regenerated and eyeballed (road-day, celebrate); visually correct |

KNOWN_GAPS: all 5 accurately described. hard-hit-l1 skip observed live in suite output ("no hard obstacle on L1"); sun-chip overlap and stair-step ramps confirmed cosmetic in screenshots; multitouch and iPad perf remain untested as stated.

## Findings

### Fixed

- **MED — shop gate bypassed via the level map.** `goBtn` was gated on locked parts, but `renderMap`'s level buttons called `drive(n)` directly, so a kid could equip unpaid parts (reproduced: rocket + gold + rainbow, wallet 0) and drive them from the map. Fixed with a `lockedParts()` guard + `walletDeny()` at the top of `drive()` (index.html:1154), which also covers replay/next.
- **MED — FIX:star-dropout claim overstated; generator still dropped items.** Claimed "adaptive slot spacing | all items fit road", but the ramp-zone `x += 300` push consumed shared road the adaptive step didn't account for: 47 stars + 38 obstacles dropped across the 30 levels (L15 placed 9 of 13 stars, L1 5 of 7). Fixed by budgeting the step on usable road (`zoneAhead`, index.html:1065) and capping each advance so queued items still fit before endX (index.html:1073-1074). Now L1 places 7/7; only 9 of 30 levels are short, by exactly 1 star each; min 170px spacing and the no-3-lane-wall invariant verified intact. Side effect: suite's L1 rating check now records 2 instead of 3 (4 collected of 7 placed < 0.8) — correct per the rating formula, check tolerates it.
- **MED — celebrate rating-star timeouts leaked on scene exit.** `stopDrive()` cleared `celebrateTimer`/`tallyTimer` but not the three staggered `setTimeout`s that light the rating stars, so pressing home (or replay/next) during the tally count-up played stray `sfx.chime()` in the garage up to ~1.3s later. Fixed: `rateTimers` array (index.html:1143, 1415) cleared in `stopDrive()` (index.html:1184). Verified live: home mid-tally leaves tallyTimer null, rateTimers empty, rafId null, no errors.
- **MED — engine drone in hidden tab + stuck keyboard gas on window blur.** Hiding the tab freezes rAF with the engine gain parked at 0.07 (endless sawtooth drone on desktop); cmd-tab while holding ArrowRight loses the keyup and the car drives itself on return. Fixed: `blur` handler drops gasKey/brakeKey; `visibilitychange` also calls `engineSet(0)` (index.html:1351-1355).
- **LOW — no pointer capture on pedals/road swipe.** A mouse released outside the window never delivered pointerup, leaving the pedal held (self-heals on next click since mouse pointerId is constant; touch has implicit capture). Fixed: `setPointerCapture` in `bindPedal` (index.html:1307) and the road swipe handler (index.html:1317), try/catch-wrapped for synthetic events.
- **LOW — non-integer `saved.current` accepted from corrupt storage** (e.g. 1.5 → `drive(1.5)` runs, map "current" ring never matches). Fixed with `Math.floor` (index.html:410).

### Reported only (LOW, not fixed)

- `held` is dead state — declared/reset/read (index.html:1140, 1162, 1237) but never set true; road-hold gas moved to `roadPointers` and this vestige remains.
- Tapping a level on the map sets `progress.current = n` permanently, so replaying an early level moves the GO shortcut pointer back to `n+1` on finish (e.g. 20 → 4). Looks intentional ("current = last picked") but worth a design double-check.
- HUD chips (`#hudLevel`, `#hudStars`) are not excluded from road-hold, so tapping them counts as gas. Harmless for ages 3-5 (whole road is the pedal).
- `engineStop()` writes `gain.value = 0` and stops the oscillator immediately — can click audibly; cosmetic.
- Ground stars may spawn inside a ramp's x-range and sit visually buried in the wedge (same layer, drawn on top; still collectible since jumpY on a ramp maxes at 95 < the 115 window).

### Priorities audited clean (no bug found)

- Drive loop: laneVis mid-glide collision is consistent (`Math.round(laneVis)` everywhere, incl. zIndex); airborne + lane change safe; finish while airborne lands correctly with `finished` freezing v; `drive()` re-entry idempotent (double `stopDrive`); next after level 30 hidden and clamped; wallet never double-banks (`p.done` gate on the finish prop).
- Shop: multi-part buy sums correctly and pushes each part once; cycling recomputes the tag; wallet cannot go negative; corrupt JSON, string wallet, NaN, non-array `owned`, and junk `levels` entries all handled by the existing guards.
- Pointers: pointerId Set/Map add/delete symmetric; `startDrive()` clears all input state, so pedals held across home→garage→GO recover.
- Audio: all sfx guard on null `actx`; `HONKS` is defined before any call site executes; `unlockAudio` try/catch verified; capture-phase unlock runs before any button handler that plays sfx.
- Rendering: rainbow gradient ids unique per render (`svgUid`) and replaced nodes take their ids with them; car z 11/13/15 interleaves lane layers 10/12/14 correctly; all props append to their own laneLayer (finish in lane0 is intentional backdrop).
- DELTA_MANIFEST/SPEC constants all verified exact in code (LANE_Y, scales, ACCEL/VMAX/BRAKE/COAST, squeal >120, prices, rating thresholds .34/.8, level formulas, themes, vroom.v2 schema, 6x5 map, unlock rule).

## Final suite result

35/35 passed (node verify.cjs, post-fix run). Bypass repro re-tested: map tap with 3 locked parts now denies (road stays inactive). index.html is 1423 lines, single file, no new dependencies.
