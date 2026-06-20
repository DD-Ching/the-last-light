/*
 * config.js — All tunable game settings live here.
 * Beginners: change numbers in this file to re-balance the game.
 * Nothing in here is "magic"; every value is commented.
 *
 * This is a classic <script> (no import/export). It defines a single
 * global `CONFIG` object that every other file can read.
 */

const CONFIG = {
  // --- Canvas / camera (the visible window) ---
  width: 960,
  height: 600,

  // --- The world is BIGGER than the camera, so the camera scrolls ---
  world: {
    width: 1600,
    height: 1200,
  },

  // Navigation grid cell size (pixels). Smaller = smarter ghost but heavier.
  cell: 32,

  // Show the ghost state + extra info on the HUD (set false to hide).
  debug: true,

  // --- Player ---
  player: {
    radius: 11,
    walkSpeed: 175,     // normal movement (pixels/sec)
    sprintSpeed: 300,   // movement while holding Shift
    // Stamina (0..100)
    staminaMax: 100,
    staminaDrain: 28,   // per second while sprinting
    staminaRegen: 18,   // per second while not sprinting
    staminaTired: 12,   // must climb back above this before sprinting again
    // Noise: how far the ghost can "hear" the player (world pixels)
    noiseWalk: 70,
    noiseSprint: 240,
    noiseIdle: 0,
  },

  // --- Flashlight ---
  flashlight: {
    batteryMax: 100,
    drain: 9,           // per second while ON
    recharge: 4,        // per second while OFF
    range: 360,         // beam length (world pixels)
    halfAngleDeg: 26,   // beam cone half-angle
    repelRange: 320,    // distance at which the beam affects the ghost
    ghostSlow: 0.45,    // ghost speed multiplier while lit by the beam
  },

  // --- Vision / darkness ---
  vision: {
    baseRadius: 120,    // soft circle you always see around yourself
    minRadius: 92,      // shrinks this small when fear is maxed
    darkness: 0.94,     // 0 = bright, 1 = pitch black overlay
  },

  // --- Ghost ---
  ghost: {
    radius: 14,
    patrolSpeed: 72,
    investigateSpeed: 96,
    stalkSpeed: 90,
    chaseSpeed: 184,    // a touch faster than your walk — you must sprint or hide
    searchSpeed: 104,
    sightRange: 420,    // how far it can see you (with line of sight)
    catchRange: 22,     // touching distance = game over
    // Detection meter (0..1): builds when it can see you, decays otherwise.
    detectStalk: 0.34,  // above this -> STALK
    detectChase: 0.78,  // above this -> CHASE
    detectGainBase: 0.55, // per second base gain when visible
    detectDecay: 0.42,  // per second decay when not visible
    loseSightTime: 2.2, // seconds of no sight before CHASE drops to SEARCH
    searchTime: 6.0,    // seconds spent searching a last-known area
    repathInterval: 0.35, // how often the ghost recomputes its path (sec)
  },

  // --- Fear meter (0..100) ---
  fear: {
    max: 100,
    nearGhost: 18,      // gain/sec when ghost is close
    nearGhostRange: 260,
    inDarkness: 3.5,    // gain/sec when flashlight is off
    lowBattery: 6,      // gain/sec when battery is low
    lowBatteryAt: 25,
    chased: 30,         // gain/sec while being chased
    hiding: 4,          // gain/sec while hiding (claustrophobia)
    eventBump: 9,       // instant gain when a paranormal event fires
    calm: 13,           // loss/sec when safe (flashlight on, ghost far)
  },

  // --- Hiding ---
  hiding: {
    interactRange: 56,  // how close you must be to a spot to hide
    seenCatchRange: 60, // if ghost saw you hide, it catches within this range
    checkBaseChance: 0.18, // base chance the ghost inspects a spot it passes
    checkPerHide: 0.07, // added suspicion each time you hide (ghost learns)
  },

  // --- Paranormal events ---
  paranormal: {
    minDelay: 9,        // seconds (min) between random events
    maxDelay: 20,       // seconds (max) between random events
  },

  // How many keys to escape.
  keysToWin: 3,
};
