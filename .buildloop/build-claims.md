AUDIT_PAYLOAD::v1
AGENT: claude-fable-5/vroom
TARGET: /Users/zacker/Documents/dev/vroom
ROUND: v3 (T3.1 + T3.2) 2026-07-10

== DELTA_MANIFEST ==
FILES_CREATED: 0
FILES_MODIFIED: 3
  index.html | v3 rewrite ~719->~1350 lines | fit(+orientationchange/visualViewport), loadState/save(vroom.v2 + v1 migration), unlockAudio(try/catch), sfx{tick,thud,squeal,whoosh,deny,buy}, HONKS{police,race,tractor,icecream,rocket,ufo}, engineSet(setTargetAtTime), WHEELS+3(gold,flower,tank), WHEEL_DECOR registry, BODIES+6(police,race,tractor,icecream,rocket,ufo), vehicleSVG(rainbow gradient w/ unique id), renderWallets/walletDeny, lockedParts/renderShop/priceTag buy flow, renderSwatchLocks, showScene/showGarage/showMap, renderMap(30 lvls), mulberry32, buildLevel(seeded gen), buildScenery(dynamic width + night skyStars), rampElev(multi), PROP_HIT registry{cone,barrel,rock,puddle,star,ramp,finish}, hardHit, tick(lane lerp/scale/zIndex, gas/brake), setLane, drive(n)/startDrive/stopDrive, bindPedal, swipe laneChange(60px), keys, confettiBurst, finishLevel(bank+rating+unlock+tally)
  SPEC.md | v3 amendment: stars=currency kept, lanes/pedals/shop/30 levels documented
  TASKS.md | added T3.1-T3.3

== SPEC ==
LANES: 3, ground Y {520,585,650}, car scale .88/1/1.12, zIndex car=11+2*lane between laneLayer z {10,12,14}; input: swipe(60px stage), #laneUp/#laneDown, ArrowUp/Down; collision lane = Math.round(laneVis)
PEDALS: #gasPedal(ACCEL 900->VMAX 700), #brakePedal(BRAKE 1600 + squeal>120), road-hold also gas, COAST 350
ECONOMY: stars=wallet; finish banks runStars+3; rating 1-3 by collected/totalStars (.34/.8); PRICES body{25..200} wheels{30,50,70} color{10..60}; buy=sum of locked selected parts; GO gated while locked
LEVELS: 30; len=3500+n*250; ramps 1+(n>8)+(n>20) all-lane + high bonus star at ramp+460; nObs=3+floor(n*.6) {cone soft, barrel n>=3, rock n>=8 hard, puddle}; nStars=6+floor(n/3); adaptive spacing (endX-x)/(remaining), min 170; hard-block rule: skip if 2 hard within 260px; themes day/sunset(11-20)/night(21-30)
STATE: vroom.v2 {build,wallet,owned{body,wheels,color},levels{n:{best,rating}},current}; v1 build migrated; owned filtered to priced ids; build falls back to free parts if unowned
MAP: 6x5 grid, unlocked(n)=n==1||levels[n-1]; states locked/open/done+miniStars/current
CELEBRATE: tally count-up w/ ticks, 3 rating stars staggered, replay/next(hidden at 30)/home

== BUG_FIXES ==
FIX:whee-gate | tick airborne launch | whee plays on every launch | was: only v>260
FIX:engine-zipper | engineSet | setTargetAtTime(.06) ramps | was: per-frame .value writes
FIX:ios-rotate | fit wiring | +orientationchange(+350ms retry) +visualViewport resize | was: resize only
FIX:audio-ctor | unlockAudio | try/catch | was: unguarded constructor
FIX:collision-registry | PROP_HIT map | handler per type | was: if-chain
FIX:touch-64 | swatches 76px, controls 244px | 76*.853=64.8 rendered | was: 64px would violate at 12 colors
FIX:star-dropout | adaptive slot spacing | all items fit road | was: fixed step overran endX, L1 placed 4/6 stars
FIX:swipe-chain | threshold 60 (~lane height 65) | 1 change per lane of drag | was: 45px, long swipe skipped 2 lanes

== KNOWN_GAPS ==
GAP:hard-hit-l1 | Playwright hard-obstacle check auto-skips on L1 (barrels start L3) | only exercised when present; severity LOW
GAP:ramp-visual | 3 stacked per-lane wedges at same x look stair-like | cartoon-acceptable, no physics impact; severity LOW
GAP:sun-chip-overlap | #sun sits under top-right chip | z-order correct, cosmetic; severity LOW
GAP:no-multitouch-test | gas+swipe simultaneously untested in harness | pointer sets are per-id, logic reviewed; severity MED
GAP:performance | ~60-90 prop divs at L30 untested on real iPad | transform-only animation; severity MED

== VERIFICATION_MATRIX ==
CHECK:suite | node /private/tmp/claude-501/-Users-zacker-Documents-dev-vroom/ece5a294-0b4b-45a6-aba6-879f1850b067/scratchpad/verify.cjs (server: python3 -m http.server 4173 in repo, already running) | 35/35 | PASS
CHECK:console | suite asserts zero console errors at load and end | clean | PASS
CHECK:touch | suite: all #garage buttons+swatches >=64px rendered @1024x768 | none smaller | PASS
CHECK:gen-invariants | suite: 30 levels — 1 finish, no 3-lane wall(<240px), in-bounds, scaling | all hold | PASS
CHECK:econ | suite: buy police 25, rainbow 60, deny at 0, bank 4+3, rating recorded | exact values | PASS
CHECK:migration | suite: v1 localStorage -> v2 preserves build | fire/monster/green/horn | PASS
CHECK:screenshots | scratchpad/shots/*.png (garage, road day/sunset/night, map, celebrate) | visually correct | PASS (eyeballed by main agent)
