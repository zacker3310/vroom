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

## Polish round Doubt (T3.3)

Audited the uncommitted kid-UX polish diff on index.html (on top of cc3426d) against the AUDIT_PAYLOAD claims. All DELTA_MANIFEST items verified present and as described, with one undeclared extra: a WASD/arrows keyboard block (`keyOf` helper, W/S lane, D/space gas, A brake, index.html:1436-1450) landed in the working tree but is not in the manifest. It works and keeps the blur/visibility failsafes.

### Fixed (HIGH/MED)

- **HIGH — star magnet repelled instead of attracted, and left stars permanently displaced.** `PROP_HIT.star` drift used `-d * 0.3` with `d = carX - p.x`, so the horizontal drift pushed stars *away* from the approaching car (probe: at d=-120 the star moved +36px, away). And the inline transform was never cleared when the star wasn't collected (lane change away, or dy gate fail): probe showed `translate(36px, 0px)` still applied with the car 400px past in another lane — stars sat visibly shifted for the rest of the run. Fixed (index.html:1290-1304): sign corrected to `d * 0.3`, drift window gated to `d > -150 && d < 75` so a passed star never chases the car's tail, and a final `else` clears any leftover transform (the `.star` .4s transition makes it glide back). Collect path unchanged (clears transform before `.collected` so the scale(2.2) pop-out is not fought by an inline transform — that part was already correct).
- **MED — #previewLock padlock rendered 48px right of center.** `animation: pulse` keyframes animate `transform: scale(...)`, which *replaces* the base `translateX(-50%)` for the life of the infinite animation. Probe: computed transform `matrix(1.076,0,0,1.076,0,0)` (no translate), badge center offset +41 screen px from the preview center. Fixed with dedicated `lockPulse` keyframes composing `translateX(-50%) scale(...)` (index.html:56-70), same pattern the existing `bounce` keyframes use. Re-probe: offset 0.0px.
- **MED — stale gas-pedal nudge at level start.** `startDrive()` reset `idleT` but not the `nudge` class, so after any run that idled >4s, every subsequent level started with the pedal already pulsing (probe confirmed class present at t=0 of the new run). Fixed: `classList.remove("held", "nudge")` in startDrive (index.html:1250). Re-probe: clean start, pulse returns only after 4s idle.
- **MED (cosmetic but core affordance) — failed buy permanently killed the price-tag wiggle.** `#priceTag.deny { animation: denyShake ... }` overrides the infinite `tagWiggle`, and `.deny` is never removed, so after one failed tap the tag went static forever. Fixed by composing both animations on `.deny` with a .4s delay on the wiggle so it hands off cleanly after the shake (index.html:89).

### Hunted, audited clean (no bug found)

- **flyStar vs letterboxing:** `s = rd.width / 1200` is exact at any aspect ratio because `#road` is `inset: 0` inside the uniformly scaled `#stage` — the road rect *is* the stage rect. Probe at 1400x500 (heavy horizontal letterbox): star spawns at tally center dead-on (0.0px error) and lands at the wallet chip center dead-on, mid-flight sampling confirms the transition animates. The single-rAF transition start also gets a layout flush "for free" from the `void cWallet.offsetWidth` on the very next line of the tally interval.
- **flyStar z-order:** `.flyStar` z-index 40 vs sibling `#celebrate` z-index 30 — stars sail *above* the overlay as intended.
- **Headlight duplication/omission:** `carWrap.innerHTML = vehicleSVG(state)` rebuilds the car every `startDrive()`, and `buildLevel()` toggles `night` *before* the headlight check runs. Probe: double startDrive on level 25 = exactly 2 beam circles; day→night and night→day replays carry/remove beams correctly.
- **progDot across LEVEL_LEN changes:** LEVEL_LEN is reassigned in `buildLevel()` and the dot is recomputed from `pos / LEVEL_LEN` every tick with `pos = 0` at start, so no stale percentage survives a level switch (worst case one 16ms frame before the first tick, invisible).
- **celebrating class lifecycle:** removed in both `showScene()` and `startDrive()`; every exit from celebrate (home / replay / next) funnels through one of those. The lockedParts early-return in `drive()` can't strand it (parts can't become locked mid-run).
- **Idle nudge scope:** tick's else-branch clears the class the moment `finished` flips, and `.celebrating` hides the pedals anyway; rAF is cancelled outside the road scene, so no pulsing in garage/celebrate.

### Reported only (LOW, not fixed)

- Undeclared WASD keyboard block (above) — works, but the manifest should have listed it.
- `keyOf` lowercases any single-char key, so e.g. Cmd+D while driving also gasses; irrelevant for the target user.
- Magnet lane gate uses `Math.abs(laneVis - p.lane)` but carCY uses `Math.round(laneVis)` — at laneVis exactly x.5 the collect window references the rounded lane's Y; forgiveness windows absorb the 65px discrepancy.
- `#previewLock` overlaps the preview truck's cab at top:150px on tall bodies (icecream cone); cosmetic, reads fine.

### Suite results (post-fix)

- CHECK:main — node verify.cjs — **35/35 PASS**
- CHECK:polish — node polish-check.cjs — **14/14 PASS**
- doubt-probe.cjs (scratchpad, ad-hoc): magnet attract + stale-clear, previewLock centering, nudge reset, flyStar letterbox geometry, headlight idempotency — all confirmed fixed/clean.

## Damage round Doubt (T4)

Audited the uncommitted T4 damage/hazards/repair/upgrades diff on index.html (vs 0d8a151) against the AUDIT_PAYLOAD. Every DELTA_MANIFEST claim verified present and accurate: progress gains damage 0-9 + upgrades{engine,armor,magnet} 0-3 with clamped loadState validation (index.html:529-532); UPG prices engine/armor [20,40,80] magnet [15,30,60] (index.html:491-494); REPAIR_RATE 2 (index.html:496); sfx crunch/slip/boom/fixed; dmgScuff>=1 / dmgCrack>=3 / dmgSmoke>=5 with animated puffUp keyframes embedded in vehicleSVG; applyDamage soaks armor, caps at MAX_DAMAGE 9, saves, updates visuals + HUD (index.html:1493-1501); vmaxEff = (700 + engine*80) * (damage>=5 ? .85 : 1) used in tick; oil (spin, v*=.45, no damage, n>=5, roll (0.42,0.55]) and tnt (2 dmg, boomSVG swap, n>=12, counts as hard for the lane rule); magnet widens all three star windows; hudDamage chip (hurt>=5, hidden while celebrating); celebrateDamage chip + clean class; clean-run bonus +2 when runDamage===0; garage upgrade buttons (pips/price/maxed/cant/deny) + repairBtn (show when damage>0, price 2*damage). WASD keyboard is the prior round's work, already in 0d8a151.

### Fixed (MED)

- **MED — oil spin permanently shadowed the crash wobble, and hit classes replayed at spawn.** `#carWrap.spin svg` is declared after `#carWrap.wobble svg` with equal specificity, and neither class was ever removed. After one oil slick, every later hard-hit wobble lost the cascade to the stale `spin` rule and never animated (probe: computedStyle animationName stayed `spin360` after shakeCar). Worse, `startDrive()` replaces the inner svg while classes persist on the wrapper div, so a leftover `spin`/`wobble` restarted its animation on the fresh svg — the truck did a full 360 at the start line. Fixed three ways: `shakeCar()` drops both classes before adding wobble (index.html:1484-1485), the oil handler drops both before adding spin (index.html:1441), and `startDrive()` clears both before rebuilding the car (index.html:1381). Re-probe: spin→hard hit now animates `carWobble`; leftover class at startDrive computes `animationName: none`.
- **MED — tnt explosion rendered off-center and sunk into the road.** The prop element was positioned for the 70x72 crate (offsets -35,-68 → crate center at x, gy-32); swapping innerHTML to the 120x120 boomSVG left the burst center at (x+25, gy-8) — 25px right, 24px low, bottom edge 52px below the ground line, visible for the opening frames of the propAway fling. Fixed by repositioning the element on swap to (x-60, gy-92) so the boom center lands exactly on the crate center (index.html:1428-1431). Probe: centered within <1px, damage 2 applied.
- **MED — repair left upgrade affordability stale.** The repair handler spends up to 18 stars but never called `renderUpgrades()`, so upgrade buttons kept their pre-repair `cant` (dimmed price) state until a scene change — the only garage wallet-spend path that skipped the refresh (priceTag buy calls it). Fixed (index.html:1087). Probe: wallet 33, repair 18 → engine button flips to `cant`.

### Hunted, audited clean (no bug found)

1. **Save spam:** `applyDamage` is only reachable from `hardHit` and `PROP_HIT.tnt`, both of which set `p.done = true` in the same branch, so each prop saves at most once per run (a handful per level, not per-frame). No save() in the tick path.
2. **Damage visual staleness:** `startDrive()` rebuilds carWrap from `vehicleSVG(state)` which embeds display styles from live `progress.damage`, so smoke shows immediately when starting a drive at damage>=5 and vmaxEff() reads live state in tick. Repair and buys in the garage both call `renderPreview()`. No stale path found (the class-residue bug above was the only startDrive leak).
3. **Armor 3 vs tnt:** `soaked = max(0, 2-3) = 0` → early return with `sfx.clank()` shield ping; progress.damage and runDamage untouched, never negative. Probe confirmed damage stays 0. Note: full armor preserves the clean-run bonus even through a tnt hit — reads as intended (armor = clean).
4. **Spin vs wobble:** bug found and fixed, above.
5. **Boom offset:** bug found and fixed, above.
6. **Kid-legibility:** repairBtn at damage 9 shows 18 — probe-verified textContent "18"; curve tops out affordable (one level's haul). celebrateDamage shows the persistent total while tally counts run stars — see LOW note below.
7. **loadState hostile values:** damage NaN/Infinity/negative/huge all clamped via Number.isFinite + floor + min/max clamp to [0,9]; upgrades clamped to [0,3] per key; non-object `saved.upgrades` (number/string/null) falls through harmlessly. v1 saves have neither field so migration path defaults both to 0 — damage-check reload test stays green.
8. **Economy:** stars per level = 6 + floor(n/3) placed + 1-3 ramp stars (~7 at L1, ~19 at L30), banked = collected + 3 (or +5 clean). One 30-level pass at decent collection yields roughly 350-450 stars vs a 385 total upgrade sink — all upgrades earnable in one playthrough without grinding, cosmetics (805) push replays. Repairs (max 18) are pocket change against a ~12-15 star level. No flag.

### Reported only (LOW, not fixed)

- celebrateDamage shows *total* accumulated damage while the `clean` green border keys off *run* damage — a kid can see a green-bordered "4". Defensible ("no new dings this run") but the mixed signal is real; showing runDamage or hiding the chip when clean-but-dinged would be tighter.
- tnt still zeroes velocity and detonates when armor fully soaks it — thud+clank with no crunch. Reads fine (the shield ate it), just noting the sfx layering.
- Garage `#upgrades` column (left 84px) and `#repairBtn` (right 96px) coexist with priceTag/preview at 1024-wide stage without overlap per suite screenshots; untested at extreme aspect ratios, but the stage letterboxes uniformly so positions scale together.

### Suite results (post-fix)

- CHECK:main — node verify.cjs — **35/35 PASS**
- CHECK:polish — node polish-check.cjs — **14/14 PASS**
- CHECK:damage — node damage-check.cjs — **20/20 PASS**
- doubt-t4.cjs (scratchpad, ad-hoc): spin/wobble cascade + spawn residue, boom recentering, repair→upgrade refresh + price 18 at damage 9, armor-3 tnt soak — **6/6 PASS**

## Capsules/free-drive/tiers Doubt (T4.3)

Audited the uncommitted T4.3 diff on index.html (vs 2736785) against the AUDIT_PAYLOAD. Every DELTA_MANIFEST claim verified present and accurate: capsuleSVG/capsulePopSVG props with nCaps = (n>=2) + (n>8) (index.html:1333); PRIZE_TABLE weighted roll stars3 w5 / stars8 w2 / gag w3 (index.html:1561-1565); 4 GAGS (duckParade/ballBurst/rainbowBloom/birdBanner) with lazily injected CSS via injectedGagCSS Set, gagTimers cleared in stopDrive (index.html:1497), .gagWrap swept in showScene (index.html:1151) + startDrive (index.html:1472); sfx.capsuleOpen/.quack; PROP_HIT.capsule lane-forgiving |laneVis-lane|<=0.65, |d|<75, no speed/jump gate (index.html:1661-1669); free drive via #freeBtn -> driveFree/buildFree/spawnFreeItem with pos-gated difficulty (oil 2500 / barrel 3500 / rock 9000 / tnt 16000), freeHard 3-lane-wall guard, tickFree spawn-ahead/prune-behind/theme cycle every 7000px + setHeadlights swap; FAR_WRAP 6240 = 12x520, MID_WRAP 6300 = 7x900, FREE_W 8400 (max wrap offset + 1200px stage fits: 7440/7500 <= 8400); bankFreeRun on showGarage + drive(), cruise hudLevel icon, hudProgress hidden; runTime in tick + #hudTime, timeTier S/A/B/C par curves matching LEVEL_LEN = 3500+250n, TIER_RANK best-keeping, bestTime rounded 0.1s, medalSVG on celebrateDamage chip (medalPop) + map tierBadge, loadState validates bestTime/tier; difficulty nObs 3+floor(.75n) with sliding hard thresholds exactly as claimed. One undeclared micro-change: oil roll window tightened (0.42,0.55] -> (0.42,0.52], consistent with the sliding barrel band — fine.

### Hunted, audited clean (no bug found)

1. **Parallax wrap seams:** far tile is two Q-humps per 520px starting at x=0; mid tiles at 150+900k — both wrap lengths are exact period multiples. Pixel probe at stage scale 1.0 (viewport 1200x700): far offset 0 vs 6240 differs by 1451 px all with channel delta <= 25 confined to the hill-silhouette band y 382-459 (rasterizer AA jitter at large float coords); mid 0 vs 6300 differs by 6 px (maxd 34). Negative control at off-period 6000 shows a real seam (14677 px, maxd 73), proving probe sensitivity. Seam invisible in motion; no fix needed. Live crossing of the pos 24960 far boundary stays finite and error-free.
2. **Long-run stability:** teleport to pos 60000 + gas: props array and DOM .prop both bounded at ~6-8, RAMPS pruned, rAF median 16.7ms / p95 17.1ms; still bounded and alive at pos 1e6. Transforms stay well inside float precision (wrapped layers never exceed 6300; lane layers at -1e6 are exact).
3. **runTime vs hidden tab:** dt clamp at index.html:1770 holds — a 60s-stale lastT added 0.067s across two frames (one clamped 0.05 frame + one real). Hidden tab cannot inflate times.
4. **Tier fairness (analytic):** perfect run = 700/900 accel + (LEVEL_LEN-310-272)/700 cruise (finish trips at pos > len-310). Perfect vs S par: L1 5.30 vs 6.20 (margin 0.90s), L5 6.73/8.41, L10 8.52/11.18, L15 10.30/13.94, L20 12.09/16.71, L30 15.66/22.24 (margin 6.58s). S is earnable on every level with no upgrades — tight on L1 (~0.9s of slack ≈ reaction time + 2 soft hits), progressively more forgiving late as obstacle density (25 at L30, each full stop costs ~0.39s) eats the slack; damage-capped vmax (595) still S-able at L30 (18.3 vs 22.24). Shape intact, constants kept.
5. **Capsule spawn/interplay:** min generated capsule x across L2-30 is 878 (car center 300, window 75 — no auto-pop at level start, verified by 600ms idle probe: runStars 0); free mode first spawn at 1000. Mid-jump collection works (no jumpY gate — forgiving pickup, by design). Magnet doesn't touch the capsule window (fixed 0.65) — fine, capsules are already lane-forgiving.
6. **medalSVG <text> (first SVG text in codebase):** renders with a real glyph box (22.7x39.2 at 64-unit viewBox), legible on both the celebrate chip (68px, medalPop) and the map badge (34px) — screenshot-verified.
7. **bankFreeRun double-bank:** none. Free run +7 banks exactly once on home tap; repeat showGarage, drive(), and normal-level exit all leave the wallet unchanged (freeMode zeroed on first bank, runStars reset in startDrive, drive()'s bankFreeRun is a no-op by then). Level-mode exits never bank runStars.

### Reported only (LOW, not fixed)

- Closing/refreshing the tab mid-free-drive loses unbanked run stars ("nothing is ever lost" comment overstates); banking on beforeunload would cover it but is out of scope.
- openCapsule's gag prize awards 0 stars — a pure show. Reads as intended surprise-box variance (weights 7:3 stars:gag).
- Free-mode capsule pops while the car idles next to one (any-speed window) — reads as a friendly pickup, not a bug.

### Suite results

- CHECK:main — node verify.cjs — **35/35 PASS**
- CHECK:polish — node polish-check.cjs — **14/14 PASS**
- CHECK:damage — node damage-check.cjs — **20/20 PASS**
- CHECK:free — node free-check.cjs — **14/14 PASS**
- doubt-t43.cjs (scratchpad, ad-hoc): wrap-seam pixel probes + control, long-run 60k/1e6, dt clamp, tier table, capsule spawn/jump/idle, medal legibility shots, double-bank, free HUD — **23/23 PASS**

No HIGH/MED findings; no source changes made this round.

## Game-feel Doubt (T4.5)

Audited the uncommitted T4.5 diff (game-feel + iPad shell, index.html vs e124815). All manifest claims verified against the diff: master compressor bus (-14/20/8) with tone/noiseBurst/engine/wind all routed through it, dual detuned saws (+9c) + speed-swept lowpass (260->1360) + looping bandpass wind above 60% vmaxEff, bodyTilt lerp folded into carWrap rotate, 90ms hit-stop, 2-axis quake, landSquash + spawnDust, starCombo 0-8 @1.5s window, speed lines >0.9 vmaxEff, celebrateTime chip + gated celebrateRow.ready, iris on every showScene, rotate overlay, shell metas + favicon, hudTime integer-gated writes, garage GO nudge @8s, retuned timeTier.

Findings and probes (feel-doubt.cjs / feel-doubt2.cjs, scratchpad):

- **MED (fixed): landing-squash restart was a no-op reflow.** `void svg.getBBox` reads the method reference without calling it — no layout flush, so a landing 400-450ms after the previous one would not restart the squash animation. Changed to the file's own idiom `void carWrap.offsetWidth` (index.html:1961).
- **MED (fixed): stacked tilt could reach 36 deg.** Airborne descent clamp (20) + brake dive (8) + two-lane bank (8) stack after `tilt -= bodyTilt`. Probe measured 25.7 deg in a forced worst case (acceptable), but the full stack would pierce the road. Added final clamp `Math.max(-24, Math.min(28, tilt))` (index.html:1999).
- Hit-stop: early-return only delays engineSet/visuals 90ms; input is listener-driven; celebrate path uses setTimeout — unaffected. freezeUntil unreachable while finished (v forced to 0 before the prop loop; hardHit/tnt need v>25; hazards end 600px before the finish line). PASS.
- Landing at level start: no spurious .land/.dust in the first 600ms of startDrive (probed). Dust ground-accuracy: lane 0 puffs at y=516-518 vs ground 520, lane 2 at 644-652 vs 650 — on the road at both extremes. PASS.
- Engine wind leak: drive(1) hammered 10x with instrumented Oscillator/BufferSource start/stop — 20 osc started/18 stopped, 10 buf/9 stopped = exactly one live engine (2 saws + 1 wind loop), engine singular, zero errors. PASS.
- Iris: mid-anim clip-path circle(73%) w/ opacity 1, settles to opacity 0; 6 rapid showScene calls restart cleanly (offsetWidth flush), no errors. finishLevel never calls showScene, so the z-60 iris never covers the z-30 celebrate overlay. PASS.
- Combo ladder: capsule bigstars path bypasses combo (intended); startDrive resets combo state; combo-8 chime = 2179Hz + 3268Hz overtone, 0.15s sine through the compressor — bright but short; judged acceptable, no change.
- Rotate overlay at exactly square viewport (800x800): CSS `orientation: portrait` matches height >= width, so the overlay SHOWS at square — the "hidden at square" premise is inverted. Harmless (iPads are never square); noted, no change.
- timeTier margins (computed in-page): L30 engine-3 perfect run 12.22s vs S cutoff 14.86s = **2.64s margin** (~2-3 full-stop crashes of headroom); stock L30 perfect 16.10s — misses S (14.86) but clears A (18.97). Matches the "stock near-perfect = A, engine-3 = S" claim.
- LOW (noted, not changed): dead CSS — `#celebrateDamage .medal` rules (index.html:315-316) are orphaned now that the medal lives in #celebrateTime; celebrate screenshot confirms time chip + medal render and the damage chip hides on clean runs.

Verification after fixes: verify 35/35, polish-check 14/14, damage-check 20/20, free-check 14/14, feel-check 12/12 — **95/95 PASS**, no console errors. Screenshots: doubt2-brake-bank.png, doubt2-air-brake.png, doubt2-celebrate.png (scratchpad/shots).

## Worlds expansion Doubt (T5)

Audited the uncommitted T5 diff (8-worlds expansion, index.html vs b6b7dde, +811/-51). All manifest claims verified against the diff: MAX_LEVEL 80 with worldOf()/levelLen() shared (timeTier uses levelLen), three spliced content packs (worlds w4-w8 CSS/scenery/far/weather/props/icons/tints, premium bodies limo/dragon/train/royal 250-400 + glow/star wheels, extras wings/booster/partyhat), wiring block before loadState, per-world buildScenery/applyTheme/buildWeather, EXTRA_PROPS + addWorldProp + WORLD_ITEMS in buildLevel, tickMovers (tumbleweed vx -130 + spin, crab laneHop 1.4s), PROP_HIT registry extensions, gravityNow() 640 in w8, map v2 world tabs + 5x2 grid, 8-theme free-drive tour, world-clear +25 bonus w/ fast tally, golden 20-star capsule, extras as 4th shop kind, w5 slush recolor, difficulty caps, loadState extras validation. Sink math confirmed: 525+1300+150+210+130+125+385 = 2825.

Findings and probes (doubt-t5.cjs, iris-probe.cjs / iris-probe2.cjs, scratchpad):

- **MED (fixed): iris keyframes were inverted — every scene switch ended on a full-dark frame.** `irisReveal` animated the #023047 cover from circle(8%) to circle(120%), i.e. the dark GREW over the new scene and snapped to transparent at 450ms — the root cause of the batch screenshots catching full-#023047 frames "at odd times" (any capture in the back half of a transition was mostly dark; the final animation frame was 100% dark). Reversed to circle(120%) -> circle(0%) so the cover shrinks away as the comment intends (index.html:402-405). Verified: iris never sticks — getAnimations() shows the run finishing, computed opacity settles to 0 after 6 rapid drive() calls, and `.go` removal is indeed not needed (fill-mode none returns to base opacity 0).
- **MED (fixed): crab lane-hop left its element in the spawn lane's layer.** tickMovers updated p.lane and top but not the DOM parent, so a crab logically in lane 2 (z14) could render in lane0's layer (z10) — wrong depth vs the car (z 11/13/15) after every 1.4s hop. Added `laneLayers[p.lane].appendChild(p.el)` on hop (index.html:2210). Probe confirms the element now lands in the matching layer.
- Save compat: 30-era v2 save (levels 1-30, current 30, ufo/gold build, wallet 77) loads clean — wallet/owned/levels/current preserved, new extras keys default false/unowned. Finishing L30 sets current 31, opens the world-4 tab (world 5 stays locked), and banks the +25 world bonus (77+5+3+2+25=112). current=80 save: finishing L80 keeps current=80, records the level, hides nextBtn — no current=81, no crash. Garbage save (current 999, level 999) rejected cleanly. PASS.
- Movers vs pruning (free mode): tumbleweeds rolling left past a parked car are pruned by the `x < pos-700` sweep (p.x is live) and detached — 25s parked-car sim leaves nothing lingering; crab just inside the edge stays, just past goes. Level mode: a missed tumbleweed rolls left until the run ends (~25s bound) — harmless, LOW, no change. PASS.
- Space gravity in free mode: themeIdx 7 gives 640; crossing the 56000 boundary mid-air flips to 1500 instantly — position/velocity stay continuous, car lands normally. Reads as "heavier planet ahead", not a glitch. No change. PASS.
- Weather: 20 rapid buildLevel switches — style-tag count stable (WORLD_WEATHER_CSS injected exactly once in the wiring block), particle divs bounded at the spec count (26 snow), zero strays outside #weather, desert/beach/space clear to 0. No leak. PASS.
- Premium on the road: dragon + wings + booster render driving at night with headlight beams (doubt-dragon-night.png); royal + partyhat in w8 — hat anchors at roof (226,90), clear of the crown at x122-178 (doubt-royal-hat.png). Hit feel: alien fades via .collected, crab/tumbleweed softBonk with .hit and transforms folded/cleared — no stuck transforms, no errors. PASS.
- Economy: 1285 placed stars + 124 capsules (EV 4.64) across 80 levels; first playthrough ~1450 (50% collection) / ~1822 (70%) / ~2194 (90%) + 200 world bonuses + per-level clean bonuses vs 2825 total sink = **everything owned in ~1.5 playthroughs at 70% collection**; individual premium bodies (250-400) land mid-first-playthrough. Neither unreachable nor trivial. PASS.
- Pack hygiene: no duplicate top-level declarations (sorted-uniq scan), window global diff shows only the expected top-level function declarations (no leaked loop vars or pack data), eye/tone/noiseBurst all defined before pack call sites, single `typeof module` guard and `module` is undefined in-browser. PASS.
- LOW (noted, not changed): dead CSS from map v2 (`.lvlBtn.locked.sunset/.night`, `.bandIcon` rules); base mud puddles still spawn in desert/space worlds via the roll<0.18 path (w5 gets the slush recolor; w6/w8 read as plain mud — acceptable).

Verification after fixes: verify 35/35, polish-check 14/14, damage-check 20/20, free-check 14/14, feel-check 12/12, worlds-check 18/18 = **113/113 PASS**, plus doubt-t5 16/16, no console errors. Screenshots: doubt-dragon-night.png, doubt-royal-hat.png (scratchpad/shots).
