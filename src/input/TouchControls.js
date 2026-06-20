/*
 * TouchControls.js — On-screen controls for phones/tablets (Milestone 3).
 *
 * Left side  : a virtual thumb-stick for movement (drag from anywhere on the
 *              left half of the screen).
 * Right side : SPRINT (hold), LIGHT (tap to toggle), USE (tap to hide/interact).
 *
 * These only appear on touch-capable devices. On desktop the class still
 * exists but stays invisible; keyboard handles everything.
 *
 * getState() returns { up, down, left, right, sprint } merged into the
 * keyboard input by GameScene.
 */

class TouchControls {
  constructor(scene, callbacks) {
    this.scene = scene;
    this.enabled = scene.sys.game.device.input.touch ||
                   ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    this.state = { up: false, down: false, left: false, right: false, sprint: false };
    this.cb = callbacks || {};
    if (!this.enabled) return;

    const W = CONFIG.width, H = CONFIG.height, D = 3500;
    scene.input.addPointer(2); // allow up to 3 simultaneous touches

    // --- Virtual joystick ---
    this.baseX = 100; this.baseY = H - 100; this.radius = 62;
    this.jsActive = false; this.jsId = null;
    this.base = scene.add.circle(this.baseX, this.baseY, this.radius, 0xffffff, 0.07)
      .setStrokeStyle(2, 0xffffff, 0.2).setScrollFactor(0).setDepth(D);
    this.knob = scene.add.circle(this.baseX, this.baseY, 26, 0xffffff, 0.18)
      .setScrollFactor(0).setDepth(D + 1);

    // Left-half zone captures joystick drags.
    this.zone = scene.add.zone(0, 0, W / 2, H).setOrigin(0).setScrollFactor(0)
      .setInteractive();
    this.zone.on('pointerdown', (p) => this._jsStart(p));
    scene.input.on('pointermove', (p) => this._jsMove(p));
    scene.input.on('pointerup', (p) => this._jsEnd(p));

    // --- Buttons ---
    this._button(W - 78, H - 150, 38, 'LIGHT', 0x3a3a16, () => this.cb.onFlashlight && this.cb.onFlashlight());
    this._button(W - 78, H - 64, 38, 'USE', 0x163a2a, () => this.cb.onInteract && this.cb.onInteract());
    const sprint = this._button(W - 168, H - 64, 40, 'RUN', 0x3a1616, null);
    sprint.zone.on('pointerdown', () => { this.state.sprint = true; });
    sprint.zone.on('pointerup', () => { this.state.sprint = false; });
    sprint.zone.on('pointerout', () => { this.state.sprint = false; });
  }

  _button(x, y, r, label, color, onTap) {
    const D = 3500;
    const circle = this.scene.add.circle(x, y, r, color, 0.5)
      .setStrokeStyle(2, 0xffffff, 0.25).setScrollFactor(0).setDepth(D);
    this.scene.add.text(x, y, label, {
      fontFamily: 'monospace', fontSize: '12px', color: '#fff',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 1);
    const zone = this.scene.add.circle(x, y, r).setScrollFactor(0).setDepth(D + 2)
      .setInteractive({ useHandCursor: true });
    if (onTap) zone.on('pointerdown', onTap);
    return { circle, zone };
  }

  _jsStart(p) {
    if (this.jsActive) return;
    this.jsActive = true;
    this.jsId = p.id;
    this.baseX = p.x; this.baseY = p.y;
    this.base.setPosition(p.x, p.y);
    this.knob.setPosition(p.x, p.y);
  }

  _jsMove(p) {
    if (!this.jsActive || p.id !== this.jsId) return;
    let dx = p.x - this.baseX, dy = p.y - this.baseY;
    const len = Math.hypot(dx, dy);
    if (len > this.radius) { dx = dx / len * this.radius; dy = dy / len * this.radius; }
    this.knob.setPosition(this.baseX + dx, this.baseY + dy);
    const dead = 14;
    this.state.left = dx < -dead;
    this.state.right = dx > dead;
    this.state.up = dy < -dead;
    this.state.down = dy > dead;
  }

  _jsEnd(p) {
    if (p.id !== this.jsId) return;
    this.jsActive = false; this.jsId = null;
    this.knob.setPosition(this.baseX, this.baseY);
    this.state.left = this.state.right = this.state.up = this.state.down = false;
  }

  getState() { return this.state; }
}
