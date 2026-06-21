/*
 * Ghost.js — The hunter. A finite state machine with 5 behaviours:
 *
 *   PATROL      wanders between random points, slow and not aggressive
 *   INVESTIGATE walks to the last noise it heard
 *   STALK       approaches you slowly to build tension (it half-knows)
 *   CHASE       full speed straight at you (touch = game over)
 *   SEARCH      lost you — hunts around your last seen spot, checks hiding spots
 *
 * A "detection" meter (0..1) glues the states together: it climbs while the
 * ghost can see you and decays when it can't. Crossing thresholds promotes
 * the ghost from STALK -> CHASE, etc.
 *
 * Pathing uses the NavGrid (BFS). When it has clear line of sight it just
 * beelines toward you, which looks smoother than following waypoints.
 */

const GHOST_STATE = {
  PATROL: 'PATROL',
  INVESTIGATE: 'INVESTIGATE',
  STALK: 'STALK',
  CHASE: 'CHASE',
  SEARCH: 'SEARCH',
};

class Ghost extends Phaser.Physics.Arcade.Image {
  constructor(scene, x, y, nav) {
    super(scene, x, y, 'ghost');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.nav = nav;
    const g = CONFIG.ghost;
    this.setCircle(g.radius);
    this.setDepth(45);
    (this.body).setAllowGravity?.(false);

    this.state = GHOST_STATE.PATROL;
    this.detection = 0;

    // Path following
    this.path = [];
    this.pathIndex = 0;
    this.repathTimer = 0;

    // Memory / timers
    this.lastKnownPlayerPos = null;
    this.lastNoisePos = null;
    this.loseSightTimer = 0;
    this.searchTimer = 0;
    this.lookTimer = 0;
    this.patrolTarget = null;

    // Hiding-spot behaviour
    this.suspicion = 0;          // grows each time the player hides
    this.sawPlayerHide = false;  // did it watch you slip into a spot?
    this.targetHideSpot = null;

    // Set each frame by the scene: 1 normally, <1 when the beam is on it.
    this.lightSlow = 1;
  }

  // ----- helpers ---------------------------------------------------------

  _dist(o) { return Phaser.Math.Distance.Between(this.x, this.y, o.x, o.y); }

  // Can the ghost currently see the player? Needs range + clear line of sight.
  // A hidden player cannot be seen (the scene handles "I saw you hide" separately).
  canSeePlayer(player) {
    if (player.hidden) return false;
    const d = this._dist(player);
    if (d > CONFIG.ghost.sightRange) return false;
    return !this.nav.lineBlocked(this.x, this.y, player.x, player.y);
  }

  // The scene calls this when the player makes noise within hearing range.
  hearNoise(x, y) {
    this.lastNoisePos = { x, y };
    // Only react if we're not already locked onto the player.
    if (this.state === GHOST_STATE.PATROL || this.state === GHOST_STATE.SEARCH) {
      this._enter(GHOST_STATE.INVESTIGATE);
    }
  }

  _enter(state) {
    this.state = state;
    this.path = [];
    this.pathIndex = 0;
    this.repathTimer = 0;
    if (state === GHOST_STATE.SEARCH) {
      this.searchTimer = CONFIG.ghost.searchTime;
      this.targetHideSpot = null;
    }
    if (state === GHOST_STATE.INVESTIGATE) this.lookTimer = 0;
    if (state === GHOST_STATE.PATROL) this.patrolTarget = null;
  }

  // Move straight toward a point at a given speed.
  _seek(x, y, speed) {
    const a = Math.atan2(y - this.y, x - this.x);
    this.setVelocity(Math.cos(a) * speed, Math.sin(a) * speed);
  }

  // Follow a BFS path to (tx,ty), recomputing every repathInterval seconds.
  // Returns true when the destination has been reached.
  _followPathTo(tx, ty, speed, dt) {
    this.repathTimer -= dt;
    if (this.repathTimer <= 0 || this.path.length === 0) {
      this.path = this.nav.findPath(this.x, this.y, tx, ty);
      this.pathIndex = 0;
      this.repathTimer = CONFIG.ghost.repathInterval;
    }
    if (this.path.length === 0) { // nowhere to go
      this.setVelocity(0, 0);
      return true;
    }
    let wp = this.path[this.pathIndex];
    // Advance through waypoints we've basically reached.
    while (wp && Phaser.Math.Distance.Between(this.x, this.y, wp.x, wp.y) < CONFIG.cell * 0.45) {
      this.pathIndex++;
      wp = this.path[this.pathIndex];
    }
    if (!wp) { this.setVelocity(0, 0); return true; }
    this._seek(wp.x, wp.y, speed);
    return false;
  }

  // ----- main update -----------------------------------------------------

  update(dt, player, scene) {
    const g = CONFIG.ghost;
    const canSee = this.canSeePlayer(player);
    const d = this._dist(player);

    // --- detection meter ---
    if (canSee) {
      this.lastKnownPlayerPos = { x: player.x, y: player.y };
      let gain = g.detectGainBase * (0.55 + 0.85 * (1 - d / g.sightRange));
      if (player.flashlightOn) gain *= 1.5;   // the light gives you away
      if (player.sprinting) gain *= 1.3;       // movement is obvious
      this.detection = Math.min(1, this.detection + gain * dt);
    } else {
      this.detection = Math.max(0, this.detection - g.detectDecay * dt);
    }
    // Shining the beam ON the ghost pushes its certainty back down.
    if (this.lightSlow < 1) this.detection = Math.max(0, this.detection - g.detectDecay * dt);

    // --- promotion to STALK / CHASE happens from any "aware" situation ---
    if (canSee && this.detection >= g.detectChase) {
      if (this.state !== GHOST_STATE.CHASE) { this._enter(GHOST_STATE.CHASE); scene.onChaseStart(); }
    } else if (canSee && this.detection >= g.detectStalk &&
               this.state !== GHOST_STATE.CHASE) {
      if (this.state !== GHOST_STATE.STALK) this._enter(GHOST_STATE.STALK);
    }

    // --- per-state behaviour ---
    switch (this.state) {
      case GHOST_STATE.PATROL:      this._patrol(dt); break;
      case GHOST_STATE.INVESTIGATE: this._investigate(dt, canSee); break;
      case GHOST_STATE.STALK:       this._stalk(dt, player, d, canSee); break;
      case GHOST_STATE.CHASE:       this._chase(dt, player, canSee, scene); break;
      case GHOST_STATE.SEARCH:      this._search(dt, scene); break;
    }
  }

  _patrol(dt) {
    if (!this.patrolTarget ||
        Phaser.Math.Distance.Between(this.x, this.y, this.patrolTarget.x, this.patrolTarget.y) < 40) {
      const pts = this.scene.level.patrolPoints;
      this.patrolTarget = pts[Phaser.Math.Between(0, pts.length - 1)];
    }
    this._followPathTo(this.patrolTarget.x, this.patrolTarget.y, CONFIG.ghost.patrolSpeed, dt);
  }

  _investigate(dt, canSee) {
    if (!this.lastNoisePos) { this._enter(GHOST_STATE.PATROL); return; }
    const reached = this._followPathTo(this.lastNoisePos.x, this.lastNoisePos.y,
                                       CONFIG.ghost.investigateSpeed, dt);
    if (reached) {
      // Look around briefly, then search the area.
      this.lookTimer += dt;
      this.setVelocity(0, 0);
      if (this.lookTimer > 1.2) this._enter(GHOST_STATE.SEARCH);
    }
  }

  _stalk(dt, player, d, canSee) {
    // Keep a creepy distance instead of pouncing immediately.
    const keep = 130;
    if (!canSee) {
      // Lost sight while stalking -> go search the last spot.
      this._enter(GHOST_STATE.SEARCH);
      return;
    }
    if (d > keep) {
      this._followPathTo(player.x, player.y, CONFIG.ghost.stalkSpeed, dt);
    } else {
      this.setVelocity(0, 0); // hover just out of reach, building dread
    }
  }

  _chase(dt, player, canSee, scene) {
    const speed = CONFIG.ghost.chaseSpeed * this.lightSlow;
    if (canSee) {
      this.loseSightTimer = 0;
      this._seek(player.x, player.y, speed);          // beeline
    } else {
      this.loseSightTimer += dt;
      // Keep charging the last seen spot for a moment.
      if (this.lastKnownPlayerPos) {
        this._followPathTo(this.lastKnownPlayerPos.x, this.lastKnownPlayerPos.y, speed, dt);
      }
      if (this.loseSightTimer >= CONFIG.ghost.loseSightTime) {
        this._enter(GHOST_STATE.SEARCH);
        scene.onChaseEnd();
      }
    }
  }

  _search(dt, scene) {
    this.searchTimer -= dt;
    const center = this.lastKnownPlayerPos || this.lastNoisePos || { x: this.x, y: this.y };

    // Occasionally check a nearby hiding spot the player might be in.
    if (!this.targetHideSpot && Math.random() < 0.012) {
      const spot = scene.nearestHidingSpot(center.x, center.y, 360);
      if (spot) this.targetHideSpot = spot;
    }

    const goal = this.targetHideSpot || center;
    const reached = this._followPathTo(goal.x, goal.y, CONFIG.ghost.searchSpeed, dt);
    if (reached) {
      if (this.targetHideSpot) this.targetHideSpot = null; // looked there, move on
      // small pause then keep searching
      this.setVelocity(0, 0);
    }

    if (this.searchTimer <= 0) {
      this.sawPlayerHide = false;
      this._enter(GHOST_STATE.PATROL);
      scene.onChaseEnd();
    }
  }
}
