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
npm run playtest          # 11 checks
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
  world/
    MapData.js              # the house layout (edit to redesign rooms)
    NavGrid.js              # ghost pathfinding + line-of-sight
  entities/
    Player.js               # movement, stamina, flashlight battery, noise
    Ghost.js                # 5-state AI: patrol/investigate/stalk/chase/search
    CollectibleKey.js       # a key
    HidingSpot.js           # a closet/bed
  input/TouchControls.js    # mobile joystick + buttons
  ui/HUD.js                 # bars, prompts, messages, win/lose screen
  scenes/
    TitleScene.js           # title + controls
    GameScene.js            # the game loop
```

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
