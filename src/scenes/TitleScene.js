/*
 * TitleScene.js — Simple atmospheric title screen (Milestone 3).
 *
 * Shows the title, the controls, and waits for a click / key press.
 * That first interaction also unlocks Web Audio (browsers require a gesture),
 * then we start the GameScene.
 */

class TitleScene extends Phaser.Scene {
  constructor() { super('TitleScene'); }

  create() {
    const W = CONFIG.width, H = CONFIG.height;
    this.cameras.main.setBackgroundColor('#05060a');

    const title = this.add.text(W / 2, H / 2 - 110, 'THE LAST LIGHT', {
      fontFamily: 'monospace', fontSize: '52px', color: '#e8e8f0',
      stroke: '#000', strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(W / 2, H / 2 - 60, 'a horror game of hide and seek', {
      fontFamily: 'monospace', fontSize: '15px', color: '#8a8aa0',
    }).setOrigin(0.5);

    this.add.text(W / 2, H / 2 + 10,
      'WASD / Arrows — move      Shift — sprint\n' +
      'Space — flashlight        E — hide / interact\n' +
      'M — sound on/off          R — restart',
      { fontFamily: 'monospace', fontSize: '14px', color: '#b8b8c8', align: 'center', lineSpacing: 8 }
    ).setOrigin(0.5);

    this.add.text(W / 2, H / 2 + 100,
      'Collect 3 keys. Avoid the ghost. Reach the exit.', {
      fontFamily: 'monospace', fontSize: '14px', color: '#cfcf66',
    }).setOrigin(0.5);

    const start = this.add.text(W / 2, H - 70, '> click or press any key to enter <', {
      fontFamily: 'monospace', fontSize: '16px', color: '#ffffff',
    }).setOrigin(0.5);

    // Flicker the title + prompt for mood.
    this.tweens.add({ targets: title, alpha: 0.65, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.tweens.add({ targets: start, alpha: 0.2, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    const begin = () => {
      SFX.unlock(); // user gesture: enable audio
      this.scene.start('GameScene');
    };
    this.input.once('pointerdown', begin);
    this.input.keyboard.once('keydown', begin);
  }
}
