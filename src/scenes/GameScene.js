/*
 * GameScene.js — The actual game.
 *
 * Responsibilities:
 *  - build procedural textures (no art assets needed)
 *  - build the house (walls), keys, hiding spots, exit
 *  - create the player + ghost and the navigation grid
 *  - run the darkness/flashlight lighting every frame
 *  - drive fear, noise, hiding, paranormal events, heartbeat, screen shake
 *  - decide win (3 keys + exit) and lose (ghost touches you)
 *
 * Read this top-to-bottom: create() sets everything up, update() runs the loop.
 */

class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  create() {
    this.sfx = SFX;
    this.ended = false;
    this.won = false;
    this.chasing = false;

    // --- gameplay state ---
    this.keysCollected = 0;
    this.fear = 0;
    this.heartbeatTimer = 0;
    this.lockedMsgCooldown = 0;
    this.shadowCooldown = 0;

    this._makeTextures();
    this._buildWorld();

    // Navigation grid (used by the ghost for pathing + line of sight).
    this.nav = new NavGrid(MAP.world.width, MAP.world.height, CONFIG.cell, MAP.walls, 14);

    // --- actors ---
    this.player = new Player(this, MAP.playerStart.x, MAP.playerStart.y);
    this.ghost = new Ghost(this, MAP.ghostStart.x, MAP.ghostStart.y, this.nav);

    this.physics.add.collider(this.player, this.wallGroup);
    this.physics.add.collider(this.ghost, this.wallGroup);
    this.physics.add.overlap(this.player, this.keysGroup, (pl, key) => {
      if (!key.collected) { key.collect(); this._onKeyCollected(); }
    });

    // --- camera ---
    this.cameras.main.setBounds(0, 0, MAP.world.width, MAP.world.height);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setBackgroundColor('#04050a');

    this._setupLighting();
    this._setupInput();

    this.hud = new HUD(this, () => this.scene.restart());
    this.touch = new TouchControls(this, {
      onFlashlight: () => this._toggleFlashlight(),
      onInteract: () => this._interact(),
    });

    this._scheduleParanormal();

    this.hud.setMessage('Find 3 keys. Reach the exit. Don’t let it touch you.', 3.5);
  }

  // ===================================================================
  //  SETUP
  // ===================================================================

  _makeTextures() {
    // Pale player orb.
    this._circleTexture('player', CONFIG.player.radius, 0x7fe0d4, 0xffffff);
    // Ghost: sickly pale with two dark eyes.
    this._circleTexture('ghost', CONFIG.ghost.radius, 0xdfe4ea, 0xffffff, true);

    // Key (golden) + soft halo so it's findable in the dark.
    const kg = this.make.graphics({ add: false });
    kg.fillStyle(0xffd24a, 1);
    kg.fillCircle(9, 7, 6);
    kg.fillRect(7, 11, 4, 9);
    kg.fillRect(11, 16, 5, 3);
    kg.generateTexture('key', 20, 22);
    kg.destroy();
    this._radialTexture('keyHalo', 70, '255,210,90');

    // Hiding spots.
    this._rectTexture('closet', 54, 64, 0x5a3d2b, 0x301f14);
    this._rectTexture('bed', 78, 52, 0x394b63, 0x202b3a);
    this._strokeTexture('closetGlow', 62, 72, 0xffe27a);
    this._strokeTexture('bedGlow', 86, 60, 0xffe27a);

    // Light brushes (canvas radial + cone).
    this._radialTexture('glow', 256, '255,255,255');
    this._coneTexture('cone');
    this._vignetteTexture('vignette');
  }

  // Edge vignette: transparent in the middle, red toward the screen edges.
  _vignetteTexture(key) {
    if (this.textures.exists(key)) return;
    const w = CONFIG.width, h = CONFIG.height;
    const tex = this.textures.createCanvas(key, w, h);
    const ctx = tex.getContext();
    const cx = w / 2, cy = h / 2;
    const grd = ctx.createRadialGradient(cx, cy, Math.min(w, h) * 0.28, cx, cy, Math.hypot(w, h) / 2);
    grd.addColorStop(0, 'rgba(130,0,0,0)');
    grd.addColorStop(0.65, 'rgba(130,0,0,0.22)');
    grd.addColorStop(1, 'rgba(160,0,0,0.82)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);
    tex.refresh();
  }

  _circleTexture(key, r, fill, stroke, eyes = false) {
    const pad = 2, size = (r + pad) * 2, c = r + pad;
    const g = this.make.graphics({ add: false });
    g.fillStyle(fill, 1);
    g.fillCircle(c, c, r);
    g.lineStyle(2, stroke, 0.85);
    g.strokeCircle(c, c, r);
    if (eyes) {
      g.fillStyle(0x101014, 1);
      g.fillCircle(c - r * 0.35, c - r * 0.1, r * 0.18);
      g.fillCircle(c + r * 0.35, c - r * 0.1, r * 0.18);
    }
    g.generateTexture(key, size, size);
    g.destroy();
  }

  _rectTexture(key, w, h, fill, stroke) {
    const g = this.make.graphics({ add: false });
    g.fillStyle(fill, 1); g.fillRect(0, 0, w, h);
    g.lineStyle(3, stroke, 1); g.strokeRect(1, 1, w - 2, h - 2);
    g.lineStyle(2, stroke, 1); g.lineBetween(w / 2, 4, w / 2, h - 4); // door split
    g.generateTexture(key, w, h);
    g.destroy();
  }

  _strokeTexture(key, w, h, color) {
    const g = this.make.graphics({ add: false });
    g.lineStyle(3, color, 1); g.strokeRect(1, 1, w - 2, h - 2);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  // Soft radial gradient via a real canvas (Graphics can't do gradients).
  _radialTexture(key, size, rgb) {
    if (this.textures.exists(key)) return;
    const tex = this.textures.createCanvas(key, size, size);
    const ctx = tex.getContext();
    const grd = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grd.addColorStop(0, `rgba(${rgb},1)`);
    grd.addColorStop(0.55, `rgba(${rgb},0.65)`);
    grd.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, size, size);
    tex.refresh();
  }

  // Flashlight cone texture: apex on the left, pointing right.
  _coneTexture(key) {
    if (this.textures.exists(key)) return;
    const ha = Phaser.Math.DegToRad(CONFIG.flashlight.halfAngleDeg);
    const L = CONFIG.flashlight.range;
    const halfW = Math.tan(ha) * L;
    const cw = Math.ceil(L) + 4, ch = Math.ceil(halfW * 2) + 4, cy = ch / 2;
    const tex = this.textures.createCanvas(key, cw, ch);
    const ctx = tex.getContext();
    const grd = ctx.createLinearGradient(0, 0, L, 0);
    grd.addColorStop(0, 'rgba(255,255,235,1)');
    grd.addColorStop(0.5, 'rgba(255,255,235,0.7)');
    grd.addColorStop(1, 'rgba(255,255,235,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(L, cy - halfW);
    ctx.lineTo(L, cy + halfW);
    ctx.closePath();
    ctx.fill();
    tex.refresh();
  }

  _buildWorld() {
    const { width, height } = MAP.world;
    // Floor.
    this.add.rectangle(0, 0, width, height, 0x14171c).setOrigin(0).setDepth(-10);
    // Faint room labels.
    MAP.roomLabels.forEach(r =>
      this.add.text(r.x, r.y, r.text, {
        fontFamily: 'monospace', fontSize: '14px', color: '#2c3340',
      }).setOrigin(0.5).setDepth(-5));

    // Walls (solid). Furniture is just differently coloured.
    this.wallGroup = this.physics.add.staticGroup();
    MAP.walls.forEach(w => {
      const isFurn = w.type === 'furniture';
      const rect = this.add.rectangle(w.x, w.y, w.w, w.h, isFurn ? 0x2a2118 : 0x363c47)
        .setOrigin(0).setDepth(isFurn ? 11 : 10);
      if (!isFurn) rect.setStrokeStyle(1, 0x4a515f);
      this.physics.add.existing(rect, true); // static body
      this.wallGroup.add(rect);
    });

    // Exit door panel (locked until 3 keys).
    const ex = MAP.exit.panel;
    this.exitPanel = this.add.rectangle(ex.x, ex.y, ex.w, ex.h, 0x5a2222)
      .setOrigin(0).setDepth(12).setStrokeStyle(3, 0x8a3333);
    this.exitLabel = this.add.text(ex.x + ex.w / 2, ex.y - 12, 'EXIT', {
      fontFamily: 'monospace', fontSize: '13px', color: '#c87070',
    }).setOrigin(0.5).setDepth(12);

    // Keys.
    this.keysGroup = this.physics.add.group();
    MAP.keys.forEach(k => this.keysGroup.add(new CollectibleKey(this, k.x, k.y)));

    // Hiding spots.
    this.hidingSpots = MAP.hidingSpots.map(h => new HidingSpot(this, h.x, h.y, h.type));
  }

  _setupLighting() {
    // Screen-fixed black overlay we punch holes in each frame.
    this.darkness = this.add.renderTexture(0, 0, CONFIG.width, CONFIG.height)
      .setOrigin(0).setScrollFactor(0).setDepth(1000);

    // Reusable brushes (not added to the display list; only used to erase).
    this.glowImg = this.make.image({ key: 'glow', add: false }).setOrigin(0.5);
    this.coneImg = this.make.image({ key: 'cone', add: false }).setOrigin(0, 0.5);

    // Red danger vignette (transparent centre, red edges) for chases / high fear.
    this.vignette = this.add.image(CONFIG.width / 2, CONFIG.height / 2, 'vignette')
      .setScrollFactor(0).setDepth(1500).setAlpha(0);
  }

  _setupInput() {
    const kb = this.input.keyboard;
    this.cursors = kb.createCursorKeys();
    this.wasd = kb.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D' });

    kb.on('keydown-SPACE', () => this._toggleFlashlight());
    kb.on('keydown-E', () => this._interact());
    kb.on('keydown-M', () => {
      const muted = this.sfx.toggleMute();
      this.hud.setMessage(muted ? 'Sound off' : 'Sound on', 1);
    });
    kb.on('keydown-R', () => this.scene.restart());
  }

  // ===================================================================
  //  ACTIONS
  // ===================================================================

  _toggleFlashlight() {
    if (this.ended) return;
    if (this.player.toggleFlashlight()) this.sfx.flashlightClick();
    else this.hud.setMessage('The battery is dead', 1.4);
  }

  _interact() {
    if (this.ended) return;
    const p = this.player;
    if (p.hidden) { this._leaveHiding(); return; }
    const spot = this.nearestHidingSpot(p.x, p.y, CONFIG.hiding.interactRange);
    if (spot) this._enterHiding(spot);
  }

  _enterHiding(spot) {
    const p = this.player;
    p.hidden = true;
    p.hidingSpot = spot;
    spot.occupied = true;
    p.setPosition(spot.x, spot.y);
    p.setAlpha(0.25);
    this.sfx.door();

    // The ghost gets more suspicious every time you hide.
    this.ghost.suspicion = Math.min(8, this.ghost.suspicion + 1);

    // Did it see you climb in? Then it knows EXACTLY where you are.
    if (this.ghost.canSeePlayer(p) || this.ghost.detection >= CONFIG.ghost.detectStalk) {
      this.ghost.sawPlayerHide = true;
      this.ghost.targetHideSpot = spot;
      this.ghost.lastKnownPlayerPos = { x: spot.x, y: spot.y };
      this.ghost._enter(GHOST_STATE.SEARCH);
      this.hud.setMessage('It saw you...', 1.5);
    } else {
      this.hud.setMessage('Hiding', 1);
    }
  }

  _leaveHiding() {
    const p = this.player;
    p.hidden = false;
    if (p.hidingSpot) p.hidingSpot.occupied = false;
    p.hidingSpot = null;
    p.setAlpha(1);
  }

  _onKeyCollected() {
    this.keysCollected++;
    this.sfx.keyPickup();
    const left = CONFIG.keysToWin - this.keysCollected;
    if (left > 0) this.hud.setMessage(`Key found! ${left} to go.`, 2);
    else {
      this.hud.setMessage('All keys! The exit is unlocked.', 2.6);
      this.exitPanel.setFillStyle(0x2f6a3a); // turns green
      this.exitPanel.setStrokeStyle(3, 0x5fd07a);
      this.exitLabel.setColor('#7fe0a0');
    }
  }

  // Called by the Ghost when a chase begins / ends.
  onChaseStart() {
    if (this.chasing || this.ended) return;
    this.chasing = true;
    this.sfx.chase();
    this.cameras.main.flash(160, 60, 0, 0);
  }
  onChaseEnd() { this.chasing = false; }

  // ===================================================================
  //  HELPERS
  // ===================================================================

  nearestHidingSpot(x, y, maxDist) {
    let best = null, bestD = maxDist;
    for (const s of this.hidingSpots) {
      const d = Phaser.Math.Distance.Between(x, y, s.x, s.y);
      if (d <= bestD) { bestD = d; best = s; }
    }
    return best;
  }

  _gatherInput() {
    const c = this.cursors, w = this.wasd, t = this.touch.getState();
    return {
      up: c.up.isDown || w.up.isDown || t.up,
      down: c.down.isDown || w.down.isDown || t.down,
      left: c.left.isDown || w.left.isDown || t.left,
      right: c.right.isDown || w.right.isDown || t.right,
      sprint: c.shift.isDown || t.sprint,
    };
  }

  // ===================================================================
  //  MAIN LOOP
  // ===================================================================

  update(time, delta) {
    const dt = Math.min(delta / 1000, 0.05); // clamp for stability
    if (this.ended) { this._renderDarkness(); return; }

    const p = this.player, ghost = this.ghost;

    p.update(dt, this._gatherInput());

    // Flashlight repels / slows the ghost when the beam is on it.
    ghost.lightSlow = this._beamHitsGhost() ? CONFIG.flashlight.ghostSlow : 1;
    ghost.update(dt, p, this);

    this._handleNoise();
    this._handleHidingChecks(dt);
    this._checkCatch();
    this._checkExit();
    this._updateHidingPrompt();
    this._updateFear(dt);
    this._updateEffects(dt);
    this._renderDarkness();

    this.hud.update({
      keys: this.keysCollected, keysToWin: CONFIG.keysToWin,
      stamina: p.stamina, staminaMax: CONFIG.player.staminaMax,
      battery: p.battery, batteryMax: CONFIG.flashlight.batteryMax,
      fear: this.fear, fearMax: CONFIG.fear.max,
      ghostState: ghost.state, debug: CONFIG.debug, muted: this.sfx.muted,
    }, dt);

    if (this.lockedMsgCooldown > 0) this.lockedMsgCooldown -= dt;
  }

  // Is the flashlight beam currently on the ghost?
  _beamHitsGhost() {
    const p = this.player, g = this.ghost;
    if (!p.flashlightOn) return false;
    const d = Phaser.Math.Distance.Between(p.x, p.y, g.x, g.y);
    if (d > CONFIG.flashlight.repelRange) return false;
    const ang = Math.atan2(g.y - p.y, g.x - p.x);
    const diff = Math.abs(Phaser.Math.Angle.Wrap(ang - p.aim));
    if (diff > Phaser.Math.DegToRad(CONFIG.flashlight.halfAngleDeg)) return false;
    return !this.nav.lineBlocked(p.x, p.y, g.x, g.y);
  }

  _handleNoise() {
    const p = this.player;
    if (p.noiseRadius <= 0) return;
    const d = Phaser.Math.Distance.Between(p.x, p.y, this.ghost.x, this.ghost.y);
    if (d <= p.noiseRadius) this.ghost.hearNoise(p.x, p.y);
  }

  // Hiding is not always safe: the ghost can find you.
  _handleHidingChecks(dt) {
    const p = this.player, g = this.ghost, H = CONFIG.hiding;
    // Reset per-visit check flags for spots the ghost has wandered away from.
    for (const s of this.hidingSpots) {
      if (Phaser.Math.Distance.Between(g.x, g.y, s.x, s.y) > H.interactRange * 1.7) {
        s.checkedThisVisit = false;
      }
    }
    if (!p.hidden || !p.hidingSpot) return;
    const spot = p.hidingSpot;
    const gd = Phaser.Math.Distance.Between(g.x, g.y, spot.x, spot.y);

    // It watched you hide -> it comes and gets you.
    if (g.sawPlayerHide && gd <= H.seenCatchRange) { this._lose('It dragged you out of your hiding spot.'); return; }

    // While hunting nearby, it may inspect the spot (more likely the more you hide).
    const hunting = g.state === GHOST_STATE.SEARCH || g.state === GHOST_STATE.STALK || g.state === GHOST_STATE.CHASE;
    if (hunting && gd <= H.interactRange && !spot.checkedThisVisit) {
      spot.checkedThisVisit = true;
      const chance = H.checkBaseChance + g.suspicion * H.checkPerHide;
      if (Math.random() < chance) { this._lose('It found you hiding.'); }
    }
  }

  _checkCatch() {
    const p = this.player;
    if (p.hidden) return; // handled by hiding checks
    const d = Phaser.Math.Distance.Between(p.x, p.y, this.ghost.x, this.ghost.y);
    if (d <= CONFIG.ghost.catchRange) this._lose('The ghost caught you.');
  }

  _checkExit() {
    const z = MAP.exit.zone;
    const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, z.x, z.y);
    if (d > z.r) return;
    if (this.keysCollected >= CONFIG.keysToWin) {
      this._win();
    } else if (this.lockedMsgCooldown <= 0) {
      const need = CONFIG.keysToWin - this.keysCollected;
      this.hud.setMessage(`The door is locked. ${need} key${need > 1 ? 's' : ''} left.`, 1.8);
      this.sfx.door();
      this.lockedMsgCooldown = 2;
    }
  }

  _updateHidingPrompt() {
    const p = this.player;
    let near = null;
    for (const s of this.hidingSpots) {
      const on = Phaser.Math.Distance.Between(p.x, p.y, s.x, s.y) <= CONFIG.hiding.interactRange;
      s.setHighlight(on && !p.hidden);
      if (on) near = s;
    }
    if (p.hidden) this.hud.setPrompt('Press E to leave');
    else if (near) this.hud.setPrompt('Press E to hide');
    else this.hud.setPrompt('');
  }

  _updateFear(dt) {
    const F = CONFIG.fear, p = this.player, g = this.ghost;
    const d = Phaser.Math.Distance.Between(p.x, p.y, g.x, g.y);
    let change = 0;
    let safe = true;

    if (this.chasing) { change += F.chased; safe = false; }
    if (d < F.nearGhostRange) { change += F.nearGhost * (1 - d / F.nearGhostRange); safe = false; }
    if (!p.flashlightOn) change += F.inDarkness;
    if (p.battery < F.lowBatteryAt) change += F.lowBattery;
    if (p.hidden) { change += F.hiding; safe = false; }

    // Calm down when genuinely safe (light on, ghost far, not chased).
    if (safe && p.flashlightOn && d > F.nearGhostRange) change -= F.calm;

    this.fear = Phaser.Math.Clamp(this.fear + change * dt, 0, F.max);
  }

  _updateEffects(dt) {
    const fearPct = this.fear / CONFIG.fear.max;
    const cam = this.cameras.main;

    // Screen shake: continuous + stronger with fear / during a chase.
    const intensity = (this.chasing ? 0.006 : 0) + fearPct * 0.006;
    if (intensity > 0.0008 && !cam.shakeEffect.isRunning) {
      cam.shake(180, intensity, true);
    }

    // Red danger vignette (only really shows when chased or very afraid).
    const targetVig = Math.min(0.85, (this.chasing ? 0.55 : 0) + Math.max(0, fearPct - 0.4) * 0.7);
    this.vignette.setAlpha(Phaser.Math.Linear(this.vignette.alpha, targetVig, 0.08));

    // Heartbeat: faster + louder as danger rises.
    const danger = Math.max(fearPct, this.chasing ? 1 : 0);
    this.heartbeatTimer -= dt;
    if (danger > 0.25 && this.heartbeatTimer <= 0) {
      this.sfx.heartbeat(0.4 + danger * 0.8);
      this.heartbeatTimer = Phaser.Math.Linear(1.1, 0.34, danger); // interval shrinks
    }

    // Fake ghost shadow flickers at the edge of vision when terrified.
    this.shadowCooldown -= dt;
    if (fearPct > 0.7 && this.shadowCooldown <= 0 && Math.random() < 0.35) {
      this._fakeShadow();
      this.shadowCooldown = 2.5;
    }
  }

  _fakeShadow() {
    const W = CONFIG.width, H = CONFIG.height;
    const edge = Phaser.Math.Between(0, 3);
    const x = edge < 2 ? (edge === 0 ? 40 : W - 40) : Phaser.Math.Between(40, W - 40);
    const y = edge >= 2 ? (edge === 2 ? 40 : H - 40) : Phaser.Math.Between(40, H - 40);
    const s = this.add.image(x, y, 'ghost').setScrollFactor(0).setDepth(1600)
      .setScale(2).setAlpha(0).setTint(0x222233);
    this.tweens.add({
      targets: s, alpha: 0.5, duration: 120, yoyo: true, hold: 60,
      onComplete: () => s.destroy(),
    });
    this.sfx.whisper();
  }

  // The lighting: fill the screen black, then erase soft holes for vision.
  _renderDarkness() {
    const cam = this.cameras.main, p = this.player;
    const sx = p.x - cam.scrollX, sy = p.y - cam.scrollY;

    this.darkness.clear();
    this.darkness.fill(0x000000, CONFIG.vision.darkness);

    // Always-on personal vision circle; shrinks with fear.
    const fearPct = this.fear / CONFIG.fear.max;
    const r = Phaser.Math.Linear(CONFIG.vision.baseRadius, CONFIG.vision.minRadius, fearPct);
    this.glowImg.setPosition(sx, sy).setScale((r * 2) / 256);
    this.darkness.erase(this.glowImg);

    // Flashlight cone (with flicker when the ghost is close).
    if (p.flashlightOn) {
      const gd = Phaser.Math.Distance.Between(p.x, p.y, this.ghost.x, this.ghost.y);
      const flicker = gd < 280 && Math.random() < 0.16;
      if (!flicker) {
        this.coneImg.setPosition(sx, sy).setRotation(p.aim);
        this.darkness.erase(this.coneImg);
      } else if (Math.random() < 0.5) {
        this.sfx.flicker();
      }
    }
  }

  // ===================================================================
  //  PARANORMAL EVENTS
  // ===================================================================

  _scheduleParanormal() {
    const { minDelay, maxDelay } = CONFIG.paranormal;
    this.time.delayedCall(Phaser.Math.Between(minDelay, maxDelay) * 1000, () => {
      if (!this.ended) this._paranormalEvent();
      this._scheduleParanormal();
    });
  }

  _paranormalEvent() {
    this.fear = Phaser.Math.Clamp(this.fear + CONFIG.fear.eventBump, 0, CONFIG.fear.max);
    const type = Phaser.Math.Between(0, 4);
    switch (type) {
      case 0: this._fakeShadow(); break;                       // shadow flash
      case 1: this._whisperText(); break;                      // whisper
      case 2: this.cameras.main.shake(220, 0.012); this.sfx.door(); break; // door/bump
      case 3: this._distortion(); break;                       // screen distortion
      case 4: this._lightsFlicker(); break;                    // lights flicker
    }
  }

  _whisperText() {
    const lines = ['behind you', 'don’t look', 'so cold', 'stay', 'it’s here', 'run'];
    const msg = lines[Phaser.Math.Between(0, lines.length - 1)];
    const t = this.add.text(
      Phaser.Math.Between(120, CONFIG.width - 120),
      Phaser.Math.Between(120, CONFIG.height - 150),
      msg, { fontFamily: 'monospace', fontSize: '22px', color: '#9a3030' }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(1700).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 0.8, duration: 500, yoyo: true, hold: 400,
      onComplete: () => t.destroy() });
    this.sfx.whisper();
  }

  _distortion() {
    const o = this.add.rectangle(0, 0, CONFIG.width, CONFIG.height, 0x6a00aa, 0.25)
      .setOrigin(0).setScrollFactor(0).setDepth(1700).setBlendMode(Phaser.BlendModes.ADD);
    this.cameras.main.shake(160, 0.006);
    this.tweens.add({ targets: o, alpha: 0, duration: 350, onComplete: () => o.destroy() });
    this.sfx.whisper();
  }

  _lightsFlicker() {
    // A quick black blink overlay + flicker ticks for sound.
    this.time.addEvent({ delay: 90, repeat: 5, callback: () => this.sfx.flicker() });
    const o = this.add.rectangle(0, 0, CONFIG.width, CONFIG.height, 0x000000, 0)
      .setOrigin(0).setScrollFactor(0).setDepth(1650);
    this.tweens.add({ targets: o, alpha: 0.5, duration: 80, yoyo: true, repeat: 3,
      onComplete: () => o.destroy() });
  }

  // ===================================================================
  //  END STATES
  // ===================================================================

  _win() {
    if (this.ended) return;
    this.ended = true; this.won = true;
    this.chasing = false;
    this.player.setVelocity(0, 0);
    this.ghost.setVelocity(0, 0);
    this.vignette.setAlpha(0);
    this.sfx.win();
    this.hud.setPrompt('');
    this.hud.showEnd(true);
  }

  _lose(reason) {
    if (this.ended) return;
    this.ended = true; this.won = false;
    this.chasing = false;
    this.player.setVelocity(0, 0);
    this.ghost.setVelocity(0, 0);
    this.sfx.lose();
    this.cameras.main.shake(400, 0.02);
    this.hud.setPrompt('');
    if (reason) this.hud.setMessage(reason, 3);
    this.hud.showEnd(false);
  }
}
