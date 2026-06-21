/*
 * TitleScene.js — Title screen + level picker.
 *
 * The level list is built straight from the LEVELS registry, so any level file
 * that calls LEVELS.register() shows up here automatically — no edits needed.
 *
 * Navigate with ↑/↓ (or W/S), start with Enter/Space, or click a level.
 * The first interaction also unlocks Web Audio (browsers require a gesture).
 */

class TitleScene extends Phaser.Scene {
  constructor() { super('TitleScene'); }

  create() {
    const W = CONFIG.width, H = CONFIG.height;
    this.cameras.main.setBackgroundColor('#05060a');

    const title = this.add.text(W / 2, 70, 'THE LAST LIGHT', {
      fontFamily: 'monospace', fontSize: '50px', color: '#e8e8f0',
      stroke: '#000', strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(W / 2, 112, 'a horror game of hide and seek', {
      fontFamily: 'monospace', fontSize: '14px', color: '#8a8aa0',
    }).setOrigin(0.5);

    this.add.text(W / 2, 175,
      'WASD / Arrows — move      Shift — sprint\n' +
      'Space — flashlight        E — hide / interact\n' +
      'M — sound on/off          R — restart',
      { fontFamily: 'monospace', fontSize: '13px', color: '#b8b8c8', align: 'center', lineSpacing: 7 }
    ).setOrigin(0.5);

    this.add.text(W / 2, 250, 'Collect the keys. Avoid the ghost. Reach the exit.', {
      fontFamily: 'monospace', fontSize: '13px', color: '#cfcf66',
    }).setOrigin(0.5);

    // --- Level picker (built from the registry) ---
    this.add.text(W / 2, 300, '— SELECT LEVEL —', {
      fontFamily: 'monospace', fontSize: '14px', color: '#6fd6ff',
    }).setOrigin(0.5);

    this.levels = LEVELS.all();
    this.selected = 0;
    this.rows = this.levels.map((lvl, i) => {
      const y = 332 + i * 30;
      const row = this.add.text(W / 2, y, lvl.name, {
        fontFamily: 'monospace', fontSize: '18px', color: '#ffffff',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      row.on('pointerover', () => { this.selected = i; this._refresh(); });
      row.on('pointerdown', () => this._begin(this.levels[i].id));
      return row;
    });
    this._refresh();

    const hint = this.add.text(W / 2, H - 44,
      this.levels.length > 1 ? '↑ / ↓  choose   ·   Enter  play' : '> press Enter to play <', {
      fontFamily: 'monospace', fontSize: '15px', color: '#ffffff',
    }).setOrigin(0.5);

    this.tweens.add({ targets: title, alpha: 0.7, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.tweens.add({ targets: hint, alpha: 0.25, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    // --- input ---
    const kb = this.input.keyboard;
    kb.on('keydown-UP', () => this._move(-1));
    kb.on('keydown-W', () => this._move(-1));
    kb.on('keydown-DOWN', () => this._move(1));
    kb.on('keydown-S', () => this._move(1));
    kb.on('keydown-ENTER', () => this._begin(this.levels[this.selected].id));
    kb.on('keydown-SPACE', () => this._begin(this.levels[this.selected].id));
  }

  _move(d) {
    this.selected = (this.selected + d + this.levels.length) % this.levels.length;
    this._refresh();
  }

  _refresh() {
    this.rows.forEach((row, i) => {
      const on = i === this.selected;
      row.setColor(on ? '#6fd6ff' : '#9a9aae');
      row.setText((on ? '▶ ' : '   ') + this.levels[i].name);
    });
  }

  _begin(levelId) {
    if (this._started) return;
    this._started = true;
    SFX.unlock(); // user gesture: enable audio
    this.scene.start('GameScene', { levelId });
  }
}
