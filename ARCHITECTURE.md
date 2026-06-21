# Architecture

How **The Last Light** is put together, and why. Read this once before you touch
the code; it should save you from guessing.

## The big idea: engine vs. data

The project is split in two:

- **The engine** — scenes, entities, and systems (`src/scenes`, `src/entities`,
  `src/world`, `src/ui`, `src/input`, `src/audio`, plus `config.js`). This is the
  generic horror-tag machine: it builds a world, runs the lighting and fear,
  drives the ghost AI, and decides win/lose. It knows *nothing* about any
  specific map.
- **The data** — levels (`src/levels`). Each level is a plain description of a
  place: world size, walls, furniture, where the keys/exit/hiding spots/spawns
  go. A level is **content**, not code you have to wire in.

The whole point: **you add content without touching the engine.** The
`GameScene` reads one object — `this.level` — and builds everything from it. To
add a new map you write one data file and add one `<script>` tag. Nothing in
`src/scenes`, `src/entities`, etc. changes.

```
          DATA                         ENGINE
  ┌────────────────────┐      ┌──────────────────────────┐
  │ src/levels/*.js     │      │ GameScene reads this.level│
  │  defineLevel({...}) │ ───► │  → walls, keys, exit,    │
  │  LEVELS.register()  │      │    spawns, patrols,      │
  │                     │      │    lighting, fear, AI    │
  └────────────────────┘      └──────────────────────────┘
```

## Module map

Every file in `src/` and its single responsibility:

```
src/
  config.js                 # global CONFIG — every tunable number, all commented
  main.js                   # boot: makes the shared SFX, starts Phaser.Game

  audio/
    SoundManager.js         # synthesized WebAudio SFX (no files); one shared SFX instance

  world/
    NavGrid.js              # grid pathfinding (BFS + string-pull) and line-of-sight

  levels/                   # === DATA ===
    LevelBuilder.js         # roomGrid(): turn dividers+gaps into wall rectangles
    Levels.js               # LEVELS registry + defineLevel() normalizer
    houseLevel.js           # Level: "The Abandoned House" (the reference example)
    cabinLevel.js           # Level: "The Lakeside Cabin" (reference example file)
    asylumLevel.js          # Level: "St. Mary Asylum" (reference example file)

  entities/
    Player.js               # movement, sprint/stamina, flashlight battery, noise, aim
    Ghost.js                # 5-state AI FSM + detection meter (defines GHOST_STATE)
    CollectibleKey.js       # one bobbing/glowing key; collect() on overlap
    HidingSpot.js           # a closet/bed; visual + position (rules live in GameScene)

  input/
    TouchControls.js        # mobile joystick + buttons; getState() merged into input

  ui/
    HUD.js                  # bars, key count, ghost-state debug, prompts, win/lose screen

  scenes/
    TitleScene.js           # title + level picker built from the LEVELS registry
    GameScene.js            # the game: builds world from this.level, runs the loop
```

> The three `*Level.js` files are interchangeable reference examples. Whichever
> ones have a `<script>` tag in `index.html` (see the LEVELS block) self-register
> and appear on the title screen; the rest just sit in the repo as templates.

## How "classic-script globals" work here

There is **no bundler and no ES modules**. Every file is a plain
`<script src="...">` loaded by `index.html`. The rules that fall out of that:

- Each file defines **one global** that the others use directly: `config.js`
  defines `const CONFIG`, `Ghost.js` defines `class Ghost` (and `const
  GHOST_STATE`), `Levels.js` defines `const LEVELS` + `function defineLevel`,
  and so on. No `import`/`export` anywhere.
- A top-level `const`, `let`, `class`, or `function` in one `<script>` is
  visible to every script that runs **after** it. So `config.js` can be read by
  everything, and `main.js` (loaded last) can see every class.
- **Load order in `index.html` matters.** A file may only reference globals that
  earlier scripts already defined. The order is: helpers (`config`, audio, nav)
  → level system (`LevelBuilder`, `Levels`) → the level files → entities → input
  → ui → scenes → `main.js`. `main.js` is last because it constructs everything.
- Phaser itself loads first, from a CDN, and attaches `window.Phaser`. If that
  fails (e.g. offline), `index.html` shows a fallback message.

Trade-off: this keeps the project zero-build (you can literally double-click
`index.html`) and beginner-readable, at the cost of a global namespace and a
hand-maintained load order.

## Data flow at boot

1. **`index.html`** loads Phaser, then the game scripts in dependency order.
2. Each **level file** runs `LEVELS.register(defineLevel({...}))`, so it
   *self-registers* into the `LEVELS` registry as it loads. No central list to
   edit.
3. **`main.js`** runs last: it creates the one shared `SFX = new SoundManager()`
   and a `Phaser.Game` whose scene list is `[TitleScene, GameScene]`. Phaser
   starts the first scene, `TitleScene`.
4. **`TitleScene`** asks the registry for `LEVELS.all()` and draws a picker row
   per level. Picking one calls `scene.start('GameScene', { levelId })`.
5. **`GameScene.create(data)`** does `this.level = LEVELS.get(data.levelId)`
   (falling back to the first registered level), then builds the entire world
   from `this.level`: walls, keys, exit, hiding spots, the NavGrid, the player,
   the ghost, camera, lighting, HUD.

The engine never reads a global level — only `this.level`. Swap the data, get a
new game.

## The level system in detail

### `LevelBuilder.roomGrid()` — geometry without hand-math

The tedious part of a map is the walls. `roomGrid()` does it for you. You
declare **dividers** (single straight interior walls) and the **gaps**
(doorways) in them; it returns the solid wall rectangles, plus the four outer
border walls.

```js
LevelBuilder.roomGrid({
  world: { width: 1600, height: 1200 }, wall: 24,
  vDividers: [ { x: 520, gaps: [[250, 360], [840, 950]] } ], // vertical walls
  hDividers: [ { y: 600, gaps: [[230, 340]] } ],             // horizontal walls
}) // -> { walls: [ {x,y,w,h}, ... ] }
```

- `vDividers` are vertical walls at a given `x`, running top↔bottom between the
  border walls. `hDividers` are horizontal walls at a given `y`, running
  left↔right.
- A `gap` is an open span `[from, to]` along that wall — i.e. a doorway. The
  helper `solidSegments(start, end, gaps)` removes the gaps and returns the solid
  segments, which become the wall rectangles. Everything is in world pixels with
  a top-left origin.
- `wall` is the wall thickness (default 24).

See `LevelBuilder.js` for the implementation and `houseLevel.js` for a complete
worked example.

### `defineLevel(spec)` — normalize + merge

A level file passes a loose `spec`; `defineLevel()` fills in defaults and merges
the geometry into the **one uniform shape** the `GameScene` understands. In
particular it builds the final `walls` array from up to three sources, in order:

1. `spec.layout.walls` (the `roomGrid()` output), then
2. `spec.walls` (any explicit extra wall rectangles), then
3. `spec.furniture` — each item is pushed as a wall **tagged `type: 'furniture'`**
   (drawn warmer, but it still collides and still blocks the NavGrid).

The normalized level always has:
`{ id, name, world, walls, roomLabels, playerStart, ghostStart, exit, keys,
hidingSpots, patrolPoints }`, with sensible empty defaults for the optional
arrays. It throws if `id` or `world` is missing.

### `LEVELS` registry

A tiny object in `Levels.js`:

- `register(level)` — adds a level; throws on a duplicate `id`.
- `get(id)` — look up by id, or fall back to the first registered level.
- `all()` — the list (TitleScene uses this to build the picker).
- `defaultId()` — id of the first registered level.

Because each level file calls `register()` as it loads, the registry is the
single source of truth for "what levels exist," and both the title screen and
the playtest iterate it.

## The systems, briefly

### Darkness / lighting

The world is rendered, then covered by a screen-fixed black `RenderTexture`
(`this.darkness`) filled to `CONFIG.vision.darkness` opacity. Each frame
`GameScene._renderDarkness()` **erases holes** in it: a soft personal vision
circle around the player (radius lerps from `vision.baseRadius` down to
`vision.minRadius` as fear rises) and, when the flashlight is on, a cone texture
rotated to the player's `aim` (it flickers when the ghost is near). Markers for
hiding spots, the exit, and furniture edges are drawn at a *higher* depth than
the darkness so you can always orient yourself. Details in `GameScene._setupLighting`
/ `_renderDarkness` and the `_radialTexture` / `_coneTexture` builders.

### Fear

A 0–100 meter in `GameScene._updateFear()`. It rises near the ghost, in the
dark, on low battery, while chased, while hiding, and on paranormal events; it
falls (`fear.calm`) only when genuinely safe (light on, ghost far, not chased).
Fear drives the shrinking vision circle, screen shake, the red vignette,
heartbeat tempo, and fake-shadow scares. All rates live under `CONFIG.fear`.

### Ghost state machine

A 5-state FSM in `Ghost.js` (`PATROL → INVESTIGATE → STALK → CHASE → SEARCH`)
glued together by a `detection` meter (0..1) that climbs with line-of-sight and
decays without it. Crossing `detectStalk` / `detectChase` promotes the state;
losing sight drops CHASE to SEARCH after `loseSightTime`. Pathing uses the
NavGrid (BFS) when line-of-sight is blocked and a straight beeline when it's
clear. Hiding-spot suspicion and "it saw you hide" memory also live here. All
thresholds/speeds are under `CONFIG.ghost`; full behaviour is in `Ghost.js`.

## The world-bounds gotcha

Arcade physics defaults its world bounds to the **game canvas** size
(960×600), **not** the level's world size. The player has
`collideWorldBounds = true`, so without a fix the player is trapped in the
top-left 960×600 quarter of the map — they can't cross into the lower/right
rooms or reach the exit. `GameScene.create()` fixes this immediately after
building the world:

```js
this.physics.world.setBounds(0, 0, this.level.world.width, this.level.world.height);
```

This is easy to regress, so the playtest guards it directly: the **traversal**
scenario asserts `physics bounds = world size` and that the player can actually
walk from the entrance down into the kitchen (crossing y=600).

## Running the playtest

The automated harness is `test/playtest.mjs` (Playwright, headless Chromium). It
boots the real game, drives the real systems, prints a telemetry report, then
gates on a set of pass/fail verdicts.

```bash
npm install
npx playwright install chromium
npm start            # serve on :8000 (separate terminal)
npm run playtest
```

### The 13 checks it guards

| # | Verdict | What it protects |
| --- | --- | --- |
| 1 | no console / page errors | nothing throws on boot or during play |
| 2 | fear rises in the dark | the fear system actually runs |
| 3 | JS frame logic < 1ms CPU | per-frame script cost stays tiny |
| 4 | render queue < 2ms (sw-GL) | lighting queue cost stays bounded |
| 5 | pathfind < 1ms/call | worst-case BFS path stays cheap |
| 6 | moves on key press | input → movement works |
| 7 | blocked by wall | wall collision works |
| 8 | line-of-sight triggers CHASE | detection meter promotes to CHASE |
| 9 | all targets reachable/valid | **every registered level**: spawns, keys, hiding spots, and patrol points sit on open floor and are reachable from the player start (the exit may hug a wall, so it only has to be reachable) |
| 10 | ghost crosses the house | ghost can navigate end-to-end |
| 11 | ghost never stalls | no pathing dead-stops |
| 12 | physics bounds = world size | the world-bounds gotcha above |
| 13 | player can reach the kitchen | the player can cross y=600 |

Check #9 iterates `LEVELS.all()`, so **any level you add is automatically
validated** — if your keys, spawns, hiding spots, or patrol points land inside a
wall or in an unreachable pocket, the playtest fails for that level by id.
