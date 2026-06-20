/*
 * main.js — Boots the Phaser game.
 *
 * Loaded last (after all the class files), so every class + CONFIG already
 * exists. We create ONE shared SoundManager (SFX) used everywhere, then start
 * Phaser with the Title and Game scenes.
 */

// Single shared sound engine, used by every scene.
const SFX = new SoundManager();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: CONFIG.width,
  height: CONFIG.height,
  backgroundColor: '#04050a',
  parent: 'game',
  pixelArt: false,
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },
  // Scale so it fits any window while keeping the aspect ratio.
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [TitleScene, GameScene],
});
