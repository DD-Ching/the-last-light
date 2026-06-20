# assets/

Placeholder folder.

Version 0.1 uses **no external art or audio files** — all graphics are drawn
with simple shapes at runtime, and all sounds are synthesized in the browser
(see `src/audio/SoundManager.js`).

When you want real art/audio later, drop the files here and load them in
`GameScene.preload()`, e.g.:

```js
preload() {
  this.load.image('wall', 'assets/wall.png');
  this.load.audio('heartbeat', 'assets/heartbeat.mp3');
}
```
