# The Last Light

A 2D top-down **horror ghost-tag** game for the browser, built with
[Phaser 3](https://phaser.io/). You're trapped in a dark abandoned house with a
ghost hunting you. You can't fight — you can only **run, hide, and manage your
flashlight**. Collect **3 keys**, avoid the ghost, and escape through the
locked exit.

> Horror version of tag: the ghost is "it", you're weak, and the dread comes
> from darkness, sound, and the chase — not from fancy graphics.

## Controls

| Action | Keys |
| --- | --- |
| Move | `WASD` or arrow keys |
| Sprint | `Shift` (drains stamina, makes noise) |
| Flashlight | `Space` (drains battery; slows the ghost when aimed at it) |
| Hide / Interact | `E` (near a closet or bed) |
| Sound on/off | `M` |
| Restart | `R` |

On touch devices, an on-screen joystick and buttons appear automatically.

**Reading the dark:** the house is pitch black, but a few things glow faintly
through it so you're never stuck on something you can't see — **cyan** beacons
mark hiding spots, the **red** beacon (turns **green** when unlocked) marks the
exit, and furniture has a faint gold outline. Keys still must be found with your
flashlight.

## Run it locally

The game uses plain `<script>` tags, so it works **even by double-clicking
`index.html`**. For the most reliable experience (and audio), run a tiny local
server from this folder:

```bash
# Python 3
python -m http.server 8000
# then open http://localhost:8000
```

or

```bash
npx serve .
```

> You need an internet connection the first time, because Phaser loads from a CDN.

## Automated playtest

An automated Playwright harness boots the game in a headless browser and checks
movement, collision, ghost AI/navigation, pathfinding cost, reachability, and
per-frame CPU. See [PLAYTEST.md](PLAYTEST.md) for the latest results.

```bash
npm install && npx playwright install chromium
npm start                 # serve on :8000 (separate terminal)
npm run playtest          # 13 checks (incl. per-level reachability validation)
```

## Deploy to GitHub Pages

1. Push this folder to a GitHub repository.
2. Repo **Settings → Pages → Build and deployment**.
3. Source: **Deploy from a branch**, Branch: **main**, Folder: **/ (root)**.
4. Wait a minute, then open `https://<user>.github.io/<repo>/`.

A `.nojekyll` file is included so GitHub serves the files as-is.

## Project structure

```
index.html                  # loads Phaser + all scripts
.nojekyll                   # tell GitHub Pages not to run Jekyll
assets/                     # (empty for v0.1 — see assets/README.md)
src/
  config.js                 # ALL tunable numbers live here
  main.js                   # boots Phaser
  audio/SoundManager.js     # synthesized placeholder sounds + clear hooks
  levels/                   # LEVEL DATA — add a file here to add a level
    LevelBuilder.js         # roomGrid(): dividers + doorway gaps -> walls
    Levels.js               # the LEVELS registry + defineLevel()
    houseLevel.js           # level 1 — the abandoned house (reference example)
    asylumLevel.js          # level 2 — St. Mary Asylum
    cabinLevel.js           # level 3 — The Lakeside Cabin
  world/
    NavGrid.js              # ghost pathfinding + line-of-sight
  entities/
    Player.js               # movement, stamina, flashlight battery, noise
    Ghost.js                # 5-state AI: patrol/investigate/stalk/chase/search
    CollectibleKey.js       # a key
    HidingSpot.js           # a closet/bed
  input/TouchControls.js    # mobile joystick + buttons
  ui/HUD.js                 # bars, prompts, messages, win/lose screen
  scenes/
    TitleScene.js           # title + level picker (built from the registry)
    GameScene.js            # the game loop (reads the active level as data)
```

> The engine reads levels as **data** from `src/levels/`. See
> [ARCHITECTURE.md](ARCHITECTURE.md) for how the engine and the level data are
> separated.

## Creating a level

Levels are **data**, not engine code. You add a map without touching the scenes,
entities, or systems. Each level file describes a place and registers itself, so
it auto-appears on the title screen and is auto-validated by the playtest.

### Steps

1. **Copy the reference level.** Duplicate `src/levels/houseLevel.js` to
   `src/levels/<yourId>Level.js` and change the `id`, `name`, and the
   coordinates (world size, dividers/gaps, furniture, keys, hiding spots,
   spawns, exit, patrol points).
2. **Load it.** Add one line inside the **LEVELS block** in `index.html`:

   ```html
   <script src="src/levels/<yourId>Level.js"></script>
   ```

   (Order within the LEVELS block doesn't matter — each level self-registers.)
3. **Done.** It auto-appears on the title screen's level picker and is
   auto-validated by `npm run playtest`.

### Copy-paste template

```js
/*
 * <yourId>Level.js — "<Your Level Name>".
 *
 * A level is pure data. Declare the dividers + their doorway gaps; the builder
 * turns them into walls. Then drop furniture / keys / hiding spots / spawns on
 * top and register it. All numbers are world pixels (top-left origin).
 */

LEVELS.register(defineLevel({
  id: 'yourId',                 // unique, no spaces (must differ from other levels)
  name: 'Your Level Name',      // shown on the title screen
  world: { width: 1600, height: 1200 },

  // Walls: declare interior dividers + their doorway gaps; the builder adds the
  // outer border for you. vDividers = vertical walls at an x; hDividers =
  // horizontal walls at a y. Each gap [from, to] is an open doorway.
  layout: LevelBuilder.roomGrid({
    world: { width: 1600, height: 1200 }, wall: 24,
    vDividers: [
      { x: 520,  gaps: [[250, 360], [840, 950]] },
      { x: 1056, gaps: [[250, 360], [840, 950]] },
    ],
    hDividers: [
      { y: 600, gaps: [[230, 340], [760, 870], [1230, 1340]] },
    ],
  }),

  // Furniture = solid cover. It collides and blocks pathing — keep it OFF
  // doorways, keys, hiding spots, and spawns.
  furniture: [
    { x: 760, y: 280, w: 90, h: 58 },   // example: a table
  ],

  // Faint room names, drawn above the darkness so you can orient yourself.
  roomLabels: [
    { x: 272, y: 312, text: 'ROOM A' },
  ],

  playerStart: { x: 180, y: 150 },      // where you spawn (open floor)
  ghostStart:  { x: 660, y: 460 },      // where the ghost spawns (open floor)

  exit: {
    panel: { x: 1500, y: 850, w: 76, h: 110 }, // the door art (may hug a wall)
    zone:  { x: 1538, y: 905, r: 46 },         // reach this with 3 keys to win
  },

  keys: [                               // EXACTLY 3 keys
    { x: 1330, y: 175 },
    { x: 175,  y: 1040 },
    { x: 800,  y: 1045 },
  ],

  hidingSpots: [                        // 'closet' or 'bed'
    { x: 1490, y: 120, type: 'closet' },
    { x: 110,  y: 880, type: 'closet' },
    { x: 970,  y: 1095, type: 'bed' },
  ],

  patrolPoints: [                       // ghost wander targets (open floor)
    { x: 272, y: 160 }, { x: 800, y: 160 }, { x: 1328, y: 300 },
    { x: 272, y: 900 }, { x: 800, y: 940 }, { x: 1328, y: 900 },
  ],
}));
```

### Validity rules

The playtest (`npm run playtest`) checks these for **every** registered level,
so a bad map fails the build:

- **Doorway gaps ≥ 110px wide** so the player (and ghost) can fit through.
- **Keys, hiding spots, patrol points, and both spawns must sit on open floor**
  — at least ~45px clear of any wall or furniture — and be **reachable** from
  the player start. (The NavGrid pads walls, so things crammed against a wall
  read as "blocked.")
- **Exactly 3 keys** (`CONFIG.keysToWin` is 3).
- **The exit zone may hug an outer wall.** It's reached by proximity (radius
  `zone.r`), not by standing on a nav cell, so it's allowed to sit on a blocked
  cell — it only has to be reachable.
- **Furniture must not block doorways** (or any key / hiding spot / spawn) —
  furniture is solid cover and blocks both collision and pathing.

If any of these fail, `npm run playtest` reports the offending level by `id` and
which point (e.g. `key2`, `patrol6`) is the problem.

## Features

- **Player:** responsive movement, sprint + stamina, noise generation.
- **Ghost AI:** Patrol → Investigate (noise) → Stalk → Chase → Search, with a
  detection meter and grid-based pathfinding/line-of-sight.
- **Flashlight:** limited battery, cone of light, slows the ghost when aimed at
  it, flickers when the ghost is near.
- **Darkness:** a personal vision circle + flashlight cone carved out of a black
  overlay; vision shrinks as fear rises.
- **Fear meter:** rises near the ghost, in the dark, on low battery, during
  chases and paranormal events; drives screen shake, heartbeat, vignette, and
  fake-shadow scares.
- **Hiding:** closets/beds you can hide in — but it's not always safe (the ghost
  remembers if it saw you, and grows suspicious the more you hide).
- **Paranormal events:** random shadow flashes, whispers, distortion, door
  bumps, light flickers.
- **UI:** key count, stamina/battery/fear bars, ghost-state debug readout,
  messages, win/lose screens with a restart button.
- **Audio:** all sounds synthesized via Web Audio (no files). Hooks for
  heartbeat, chase, whisper, key pickup, door, and flashlight are in
  `SoundManager.js`.

## Tweaking the game

Open `src/config.js` — every gameplay number (speeds, drain rates, ranges,
thresholds) is there with a comment. To redesign the house, edit the rectangles
in `src/world/MapData.js`.
