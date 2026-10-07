<p align="center">
  <img src="docs/icons/icon-192.png" width="96" height="96" alt="Vroom icon: a toy dump truck with a star badge">
</p>

<h1 align="center">Vroom</h1>

<p align="center">
  A build-a-car driving game for a 3 to 5 year old. One HTML file, zero dependencies, works offline, made for an iPad in a car seat.
</p>

<p align="center">
  <a href="https://zacker3310.github.io/vroom/"><strong>Play it: zacker3310.github.io/vroom</strong></a>
</p>

<p align="center">
  <a href="https://github.com/zacker3310/vroom/actions/workflows/test.yml"><img src="https://github.com/zacker3310/vroom/actions/workflows/test.yml/badge.svg" alt="tests"></a>
  <img src="https://img.shields.io/badge/dependencies-0-74c465" alt="zero dependencies">
  <img src="https://img.shields.io/badge/one%20file-index.html-ffd66e" alt="one file">
  <img src="https://img.shields.io/badge/version-12.0.0-6fc0df" alt="version 12.0.0">
</p>

![The garage: a pirate-ship car with a fox buddy, the body strip open below](docs/garage.png)

## Highlights

- **Build it, then drive it.** 23 bodies, 13 wheel sets, 23 paints, 8 flank decals, 10 bolt-on extras and 10 buddies, every one of them drawn in code. The exact car you build in the garage is the car you see from behind on the road, party hat and all.
- **Twelve worlds, 120 levels.** Construction, sunset, night, rain, snow, desert, beach, space, volcano, candy land, deep sea and sky kingdom. Each is a place with its own roadside, weather, hazards, hills, jingle, ambience and star-chime scale.
- **A road that bends and rolls.** An OutRun-style chase cam with eased curvature stretches and cosine hills, three lanes, a gas pedal, a brake pedal and a three-stop steering slider.
- **Levels with a signature.** Every level is sequenced from a library of 38 formations so level 7 feels like "the snake-trail level" and level 8 like "the barrel-bowling level". Two headless bots drive all of them in the test suite to prove each is fair.
- **Nothing to read, nothing to lose.** Icons, pictures and numerals only. Stars only go up. Crashes are comedy.
- **Grown-up friendly.** Three kid profiles, scan-to-open QR save codes, a quiet mode for the car, home-screen install, and a toddler-proof update badge.
- **One file.** No frameworks, no build step, no assets, no network calls. All art is inline SVG, all sound is Web Audio synthesis.

## Screenshots

| Garage | Road |
|---|---|
| ![Garage](docs/garage.png) | ![Space world: driving the moon road under a starfield with headlights on](docs/space.png) |

| Worlds | |
|---|---|
| ![Deep Sea: a glass tunnel on the seabed under a whale-bone arch, dolphins overhead](docs/sea.png) | ![Sky Kingdom: the cloud causeway with floating castles under a rainbow](docs/sky.png) |
| ![Rain world: a rainbow over the city after the lightning, driving under a sign gantry](docs/rain.png) | ![The world map: a winding path of level nodes across a meadow](docs/map.png) |

| Album | Results |
|---|---|
| ![The sticker album: buddies, badges, and finish-line polaroids](docs/album.png) | ![The results card: star tally, rating stars, time medal](docs/celebrate.png) |

## How to play

**The garage.** Six category tabs (body, wheels, paint, stickers, extras, workbench) open one
scrollable strip of big picture tiles; tap a tile to equip it, swipe or use the arrows to see more. Locked parts show in full colour with a star price tag: collect stars, tap, own it. The sticker tab also holds a race number: tap the roundel tile, type up to two digits on a big keypad, and 400 stars paints it on both sides of the car (taking it off is free). The workbench tab holds the engine, shield and star magnet upgrades and the upkeep: fix crash damage with the wrench, wash off real mud with your finger, fill the tank, fit new tires. Fuel burns and tires wear as you drive; a dry tank crawls and bald tires slide, but nothing ever stops you. Cross the line spotless and ding-free and your stars pay a shine bonus. The dice builds you a surprise. Tap the car to honk.

**The road.** Hold the gas, steer into stars and away from barrels, rocks, TNT, tumbleweeds and crabs. Ramps jump, puddles splash, capsules pop open with prizes (and sometimes a buddy). The finish gantry brings confetti, a star tally, a 1 to 3 star rating and an S/A/B/C time medal.

**The map.** A winding road of level nodes. Beat a world's last level to unlock the next and bank a trophy bonus. The free-drive wheel tours every world with no finish line and no timer. Beat all 120 levels and the Victory Parade appears: a rainbow road finale with fireworks and every buddy you have found cheering from the roadside.

**The album.** Buddies you have found, "first!" sticker badges, and a polaroid of every finish.

| | Touch (the real way) | Keyboard (desktop) |
|---|---|---|
| Drive | hold the green gas pedal, or anywhere on the road | W, up arrow, or space |
| Brake | red brake pedal | S or down arrow |
| Steer | tap or drag the steering slider (left / middle / right), or swipe left/right | A/D or left/right arrows |
| Honk | tap your car | |

## For grown-ups

- **Profiles.** The avatar button (top left of the garage) holds up to three kids, each with their own save. No typing, just faces.
- **Save codes and QR.** The same panel shows a scan-to-open QR: point another device's camera at it and the game opens with the save ready to import (a wordless tick/cross asks first). The copy and paste buttons carry a full save code as text, and opening `https://zacker3310.github.io/vroom/#save=<code>` imports one directly.
- **Quiet mode.** The speaker button drops every sound to car-friendly volume. It sticks.
- **Offline and home screen.** From Safari, Share, then Add to Home Screen. It installs with its own icon, launches full-screen in landscape and runs with no connection.
- **Updates.** When a new version is live, a green refresh badge appears beside the avatar in the garage. Press and hold it until the ring fills (about a second and a half, so stray toddler taps do nothing) and the game reloads into the new version. Progress is kept. The version number sits in the corner of the profile panel.
- **Where progress lives.** In the browser's local storage on the device. Clearing Safari website data erases it, so export a save code first if it matters.

## Design principles

These are the rules the game was built on and the test suite enforces. They are not up for debate in a pull request.

1. **Zero required reading.** Icons, pictures and numerals only. No words in the game.
2. **Nothing to lose.** No fail states, no game-overs, no timers that punish. Stars only go up; obstacles bonk-and-stop but never end a run.
3. **Every tap answers instantly** with motion and a synthesized sound.
4. **Every touch target is at least 64 px** rendered on an iPad in landscape (1024x768). Portrait politely asks you to rotate.
5. **One warm design language** everywhere ("Toybox"): cream paper, wood, warm putty for locked states, one amber for selection, one green for go, flat unblurred shadows, staggered pop-in entrances.
6. **Fair for a toddler.** A kid who sits in the middle lane with the gas floored must always reach the finish and still find stars.

## Architecture

Everything is in `index.html`: a `<style>` block, the markup for five scenes (garage, map, road, album, celebrate) and one `<script>`. The deeper tour is in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md); the short version:

- **Stage.** A fixed 1200x700 stage scaled to fit the viewport. Vehicles are SVG part groups recoloured through the `--paint` CSS variable; the same build renders in a side view (garage, album) and a projected rear view (road).
- **Chase-cam projector.** World coordinates keep the side-scroller's `x` (distance along the road) so the level, physics and collision code never changed; the renderer adds a lateral offset and a height and projects through one camera (`HORIZON`, `CAM_D`, `CAM_H`). Curves are eased curvature stretches integrated into a per-frame lateral offset table; hills are cosine bumps the camera rides, so a crest lifts the far road into the sky. Rear-view cars are chunky 3D toy blocks (boxes, cylinders, hulls) painter-sorted and projected through the same camera.
- **Beat sequencer.** A level is a seeded sequence of formations: a signature beat (never one of the last four levels' signatures), one or two contrasts and breathers in one of three rhythms, ramps dropped in on cue, then guarantee passes that enforce ingredients, hard-obstacle and star budgets, clean ramp run-ups and landings, and "a stray barrel never sits inside a star trail".
- **World packs.** Worlds 9 to 12 register themselves at anchor comments by assigning into the live tables (`WORLD_META`, `ROAD_PAL`, scenery pools, hazards, `WORLD_ROAD`, beats, jingles, ambience, star scales, sky events). Shop and paint packs do the same for the catalog.
- **Save codes.** Format v3 is a count-prefixed bit-packed save (about 91 bytes with today's catalog) rendered as a real QR by a hand-rolled encoder (byte mode, ECC L, versions 1 to 10 with multi-block Reed-Solomon interleaving), verified byte-exact against jsQR. v1 and v2 codes still decode.
- **Audio.** Every sound is synthesized: oscillators and filtered noise through one master compressor. The engine is two detuned saws through a speed-swept low-pass plus a wind layer; each world has a jingle, an ambience bed and its own star-chime scale.
- **Update gate.** The page fingerprints its own `<style>` and `<script>` text at boot (FNV-1a) and re-fetches itself with `cache: "no-store"` on boot, on return to foreground and every ten minutes. A difference shows the badge; a 1.6 s hold saves and reloads through a cache-busting URL.

## Development

```bash
git clone https://github.com/zacker3310/vroom.git
cd vroom
python3 -m http.server 4173     # then open http://localhost:4173/
```

There is no build. Edit `index.html`, reload.

The test suite is 18 Playwright suites (290 checks) that drive the real game in headless Chromium: economy, physics, worlds, album, profiles, save codes, the wash, fuel and tires, the race number, the update gate, and the fairness bots that drive all 120 levels.

```bash
npm ci                                   # playwright-core + jsqr, test-only
npx playwright-core install chromium     # or: export CHROMIUM=/path/to/chrome
npm test                                 # serves index.html on a free port, runs everything, prints a table
```

`npm test` runs `tests/run-all.cjs`; `--verbose` streams each suite, `--only verify,shop-check` runs a subset, and `VROOM_URL` points it at a server you already have running. CI runs the same command on every push and pull request to `main`. See [tests/README.md](tests/README.md) for what each suite covers and [CONTRIBUTING.md](CONTRIBUTING.md) for how to add a world, body or paint.

## Project history

The game grew in twelve user-directed versions over a few months, from a five-body garage to twelve worlds. [TASKS.md](TASKS.md) is the version-by-version log; [SPEC.md](SPEC.md) is the living design spec. It was built with Claude Code in an agentic build loop: design and content generated by parallel subagents, every round audited by an adversarial reviewer with fix authority before merge. The audit trail is in `.buildloop/`.

## Credits

Designed and directed by Zac Acker for one particular kid. Built with Claude. All art and sound are original and generated in code; the only third-party code anywhere in the project is the test tooling (`playwright-core`, `jsqr`), and none of it ships.

If it keeps your kid busy on a road trip too, it did its job.
