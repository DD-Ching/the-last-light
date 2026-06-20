/*
 * HUD.js — All the on-screen UI, drawn fixed to the camera (scrollFactor 0).
 *
 * Shows: key count, stamina bar, flashlight battery, fear meter, the ghost's
 * current state (debug), a message line, an interaction prompt, and the
 * game-over / victory overlay with a restart button.
 *
 * It sits at a high depth so the darkness overlay never hides it.
 */

class HUD {
  constructor(scene, onRestart) {
    this.scene = scene;
    this.onRestart = onRestart;
    const W = CONFIG.width;

    const FIX = { scrollFactor: 0 };
    const font = 'monospace';

    // Bars are redrawn every frame on this graphics object.
    this.g = scene.add.graphics().setScrollFactor(0).setDepth(3000);

    this.keysText = scene.add.text(16, 12, '', { fontFamily: font, fontSize: '18px', color: '#ffe27a' })
      .setScrollFactor(0).setDepth(3001);

    this.staLabel = scene.add.text(16, 44, 'STA', { fontFamily: font, fontSize: '11px', color: '#9ad' })
      .setScrollFactor(0).setDepth(3001);
    this.batLabel = scene.add.text(16, 66, 'BAT', { fontFamily: font, fontSize: '11px', color: '#9ad' })
      .setScrollFactor(0).setDepth(3001);
    this.fearLabel = scene.add.text(16, 88, 'FEAR', { fontFamily: font, fontSize: '11px', color: '#9ad' })
      .setScrollFactor(0).setDepth(3001);

    this.stateText = scene.add.text(W - 12, 12, '', { fontFamily: font, fontSize: '12px', color: '#8f8' })
      .setOrigin(1, 0).setScrollFactor(0).setDepth(3001);

    this.muteText = scene.add.text(W - 12, CONFIG.height - 22, '', { fontFamily: font, fontSize: '11px', color: '#777' })
      .setOrigin(1, 0).setScrollFactor(0).setDepth(3001);

    // Centre message (e.g. "The door is locked").
    this.message = scene.add.text(W / 2, CONFIG.height - 96, '', {
      fontFamily: font, fontSize: '18px', color: '#fff', align: 'center',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(3001).setAlpha(0);

    // Interaction prompt (e.g. "Press E to hide").
    this.prompt = scene.add.text(W / 2, CONFIG.height - 64, '', {
      fontFamily: font, fontSize: '15px', color: '#ffe27a', align: 'center',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(3001).setAlpha(0);

    this._msgTimer = 0;
  }

  setMessage(text, seconds = 2.2) {
    this.message.setText(text).setAlpha(1);
    this._msgTimer = seconds;
  }

  setPrompt(text) {
    if (text) this.prompt.setText(text).setAlpha(1);
    else this.prompt.setAlpha(0);
  }

  _bar(x, y, w, h, pct, color) {
    pct = Phaser.Math.Clamp(pct, 0, 1);
    this.g.fillStyle(0x000000, 0.55); this.g.fillRect(x - 1, y - 1, w + 2, h + 2);
    this.g.fillStyle(0x222831, 1);    this.g.fillRect(x, y, w, h);
    this.g.fillStyle(color, 1);       this.g.fillRect(x, y, w * pct, h);
  }

  update(s, dt) {
    // s = { keys, keysToWin, stamina, staminaMax, battery, batteryMax,
    //       fear, fearMax, ghostState, debug, muted }
    this.keysText.setText(`KEYS  ${s.keys} / ${s.keysToWin}`);

    this.g.clear();
    const x = 58, w = 150, h = 12;
    // Stamina: green, turns orange when low / exhausted.
    const staPct = s.stamina / s.staminaMax;
    this._bar(x, 44, w, h, staPct, staPct < 0.25 ? 0xffa033 : 0x53d769);
    // Battery: yellow, red when nearly dead.
    const batPct = s.battery / s.batteryMax;
    this._bar(x, 66, w, h, batPct, batPct < 0.25 ? 0xff5050 : 0xffe27a);
    // Fear: red, the fuller the worse.
    const fearPct = s.fear / s.fearMax;
    this._bar(x, 88, w, h, fearPct, 0xff3b3b);

    if (s.debug) this.stateText.setText(`ghost: ${s.ghostState}`).setVisible(true);
    else this.stateText.setVisible(false);

    this.muteText.setText(s.muted ? '[M] sound: off' : '[M] sound: on');

    // Fade the centre message out over time.
    if (this._msgTimer > 0) {
      this._msgTimer -= dt;
      if (this._msgTimer <= 0) this.message.setAlpha(0);
      else if (this._msgTimer < 0.5) this.message.setAlpha(this._msgTimer / 0.5);
    }
  }

  // Big end screen for win/lose with a clickable restart button.
  showEnd(win) {
    const W = CONFIG.width, H = CONFIG.height;
    const layer = [];

    const dim = this.scene.add.rectangle(0, 0, W, H, 0x000000, 0.78)
      .setOrigin(0).setScrollFactor(0).setDepth(4000);
    layer.push(dim);

    const title = this.scene.add.text(W / 2, H / 2 - 70, win ? 'YOU ESCAPED' : 'IT GOT YOU', {
      fontFamily: 'monospace', fontSize: '46px',
      color: win ? '#8ef0a0' : '#ff4d4d', stroke: '#000', strokeThickness: 6,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(4001);
    layer.push(title);

    const sub = this.scene.add.text(W / 2, H / 2 - 18,
      win ? 'You found the light beyond the door.' : 'The Last Light went out.', {
      fontFamily: 'monospace', fontSize: '16px', color: '#cccccc',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(4001);
    layer.push(sub);

    // Restart button.
    const btn = this.scene.add.rectangle(W / 2, H / 2 + 50, 220, 52, 0x2b3a4a)
      .setStrokeStyle(2, 0x6fa8c7).setScrollFactor(0).setDepth(4001)
      .setInteractive({ useHandCursor: true });
    const btnText = this.scene.add.text(W / 2, H / 2 + 50, 'RESTART', {
      fontFamily: 'monospace', fontSize: '20px', color: '#ffffff',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(4002);
    layer.push(btn, btnText);

    btn.on('pointerover', () => btn.setFillStyle(0x3c5266));
    btn.on('pointerout', () => btn.setFillStyle(0x2b3a4a));
    btn.on('pointerdown', () => this.onRestart());

    const hint = this.scene.add.text(W / 2, H / 2 + 96, 'or press R', {
      fontFamily: 'monospace', fontSize: '13px', color: '#888',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(4001);
    layer.push(hint);

    this.endLayer = layer;
  }
}
