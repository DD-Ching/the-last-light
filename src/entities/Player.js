/*
 * Player.js — The person trying to escape.
 *
 * The player is weak: they can only move, sprint, hide, and use a flashlight.
 * This class owns movement, stamina, flashlight battery, facing direction
 * (for aiming the beam), and how much NOISE the player is making.
 *
 * GameScene reads `noiseRadius` to decide whether the ghost can hear you,
 * and reads `aim` to draw + aim the flashlight cone.
 */

class Player extends Phaser.Physics.Arcade.Image {
  constructor(scene, x, y) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    const p = CONFIG.player;
    this.setCircle(p.radius);          // round collision body
    this.setCollideWorldBounds(true);
    this.setDepth(50);

    // Resources
    this.stamina = p.staminaMax;
    this.tired = false;                // true after stamina hits 0
    this.battery = CONFIG.flashlight.batteryMax;
    this.flashlightOn = false;

    // State
    this.aim = 0;                      // facing direction in radians (for the beam)
    this.sprinting = false;
    this.moving = false;
    this.hidden = false;
    this.hidingSpot = null;
    this.noiseRadius = 0;              // how far the ghost can hear you right now
  }

  // Try to flip the flashlight. Returns true if it actually changed.
  toggleFlashlight() {
    if (!this.flashlightOn && this.battery <= 0) return false; // dead battery
    this.flashlightOn = !this.flashlightOn;
    return true;
  }

  // input = { up, down, left, right, sprint } (booleans), already merged
  // from keyboard + touch by the scene.
  update(dt, input) {
    // Always tick the flashlight battery, even while hiding.
    this._updateBattery(dt);

    if (this.hidden) {
      // Frozen in place while hiding; stamina recovers a little.
      this.setVelocity(0, 0);
      this.stamina = Math.min(CONFIG.player.staminaMax, this.stamina + CONFIG.player.staminaRegen * dt * 0.5);
      this.noiseRadius = 0;
      return;
    }

    const p = CONFIG.player;
    let vx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    let vy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    this.moving = vx !== 0 || vy !== 0;

    // Decide sprint: must be moving, hold sprint, have stamina, not exhausted.
    const wantsSprint = input.sprint && this.moving && this.stamina > 0 && !this.tired;
    this.sprinting = wantsSprint;
    const speed = wantsSprint ? p.sprintSpeed : p.walkSpeed;

    if (this.moving) {
      const len = Math.hypot(vx, vy);
      vx /= len; vy /= len;            // normalise so diagonals aren't faster
      this.setVelocity(vx * speed, vy * speed);
      this.aim = Math.atan2(vy, vx);   // beam follows movement direction
    } else {
      this.setVelocity(0, 0);
    }

    this._updateStamina(dt);
    this._updateNoise();
  }

  _updateStamina(dt) {
    const p = CONFIG.player;
    if (this.sprinting) {
      this.stamina = Math.max(0, this.stamina - p.staminaDrain * dt);
      if (this.stamina <= 0) this.tired = true; // forced to recover
    } else {
      this.stamina = Math.min(p.staminaMax, this.stamina + p.staminaRegen * dt);
      if (this.tired && this.stamina >= p.staminaTired) this.tired = false;
    }
  }

  _updateBattery(dt) {
    const f = CONFIG.flashlight;
    if (this.flashlightOn) {
      this.battery = Math.max(0, this.battery - f.drain * dt);
      if (this.battery <= 0) this.flashlightOn = false; // ran out
    } else {
      this.battery = Math.min(f.batteryMax, this.battery + f.recharge * dt);
    }
  }

  _updateNoise() {
    const p = CONFIG.player;
    if (!this.moving) this.noiseRadius = p.noiseIdle;
    else if (this.sprinting) this.noiseRadius = p.noiseSprint;
    else this.noiseRadius = p.noiseWalk;
  }
}
