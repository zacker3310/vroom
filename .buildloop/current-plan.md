# Plan — T5 "go wild" worlds expansion (2026-07-10)

## Dependencies
Agent deliverables (scratchpad): worlds.js (WORLD_CSS/SCENERY/FAR/WEATHER/PROPS/ICONS/TINT), premium-vehicles.js (PREMIUM_BODIES/WHEELS/DECOR/HONKS), extras-pack.js (NEW_EXTRAS_*). T4.5 Doubt must land + commit first.

## Core refactor (index.html, main context)
1. `levelLen(n) = 3500 + min(n,20)*250 + max(0,n-20)*100` shared by buildLevel + timeTier. MAX_LEVEL 80.
2. Worlds: `worldOf(n) = ceil(n/10)`; themes: w1 day, w2 sunset (class kept), w3 night (kept), w4-w8 new classes. `applyTheme(w)` sets road classes + rebuilds scenery via WORLD_SCENERY/WORLD_FAR + spawns weather (#weather div, particle divs per WORLD_WEATHER) + setHeadlights(w===3||w===8).
3. Map scene v2: #worldTabs (8 x 96px icon buttons, tint per world, locked = gray+lock, unlocked if w==1 or levels[(w-1)*10]), #mapGrid renders selected world's 10 levels (5x2, 110px). selectedWorld defaults worldOf(current). Keep #freeBtn.
4. Difficulty: nObs = 3 + floor(min(n,40)*0.75) + floor(max(0,n-40)*0.3); sliding thresholds clamped (barrel ≥0.35, rock ≥0.6, tnt ≥0.8); world props injected into item mix for their worlds (ice/snowman w5, cactus/tumbleweed w6, sandcastle/crab w7, crater/alien w8; rain w4 = puddle weight x3).
5. Movers: props gain optional `mv` state; tick updates (tumbleweed p.x -= 130dt + spin class; crab lane hop each 1.4s w/ el top/laneLayer swap → simpler: crab updates p.lane + el.style.top, stays in ONE laneLayer visual... acceptable: move element top and update p.lane; zIndex layer stays original — minor visual layering slip, cartoon OK). Movers rendered via transform translate (store baseX).
6. Space physics: GRAVITY = world===8 ? 640 : 1500; vy launch unchanged (floaty jumps).
7. Rewards: world-clear (level%10===0 first completion) → +25 stars, triple confetti, sfx.tada x2; golden capsule PRIZE_TABLE + {bigstars 20 w1}; celebrate shows world-clear banner chip (trophy icon + 25).
8. Free drive: theme cycle через all 8 worlds (floor(pos/7000)%8), world props spawn per active theme.
9. Integrate premium bodies (prices 250/300/350/400), wheels glow 90 / star 120, purchasable extras (owned.extras + PRICES.extras + lockDot on extras buttons + GO gating includes extras + buy flow sums extras too). Extras grid → 3 cols x 2 rows 76px (fits 1189px total).
10. loadState: owned.extras validation; levels 1..80.

## Suite updates
verify.cjs map section → worlds UI; feel-check perfect() → levelLen; free-check l30fast 13→12, capsule loop stays; new worlds-check.cjs (80-level invariants, tabs/unlock, themes at L35/45/55/65/75, weather divs, movers move, space gravity, world-clear bonus, golden capsule, premium content presence + prices, extras buy/gate).

## Verification
All 6 suites green; screenshots per world; mega Doubt audit; commit feat(T5).
