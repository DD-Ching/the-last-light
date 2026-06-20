/*
 * SoundManager.js — Tiny WebAudio sound engine.
 *
 * The first prototype has NO audio files. Instead we synthesize simple
 * sounds with the browser's Web Audio API so the game is not silent.
 *
 * Every game sound has its own method below. If you later want to use
 * real audio files, just replace the body of each method with
 * `this.scene.sound.play('your-key')` and load the files in GameScene.
 *
 * NOTE: Browsers block audio until the user interacts with the page.
 * We create/resume the AudioContext on the first call to `unlock()`,
 * which the title screen triggers on "click to start".
 */

class SoundManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
  }

  // Call once after a user gesture (click / key press) to enable audio.
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return; // very old browser: just stay silent
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.6;
    this.master.connect(this.ctx.destination);
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.6;
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  // Internal helper: play a single oscillator "blip".
  _tone(freq, dur, type = 'sine', vol = 0.5, slideTo = null) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  // Internal helper: short noise burst (for thuds / creaks).
  _noise(dur, vol = 0.4, filterFreq = 800) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = this.ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t);
  }

  // ---------------------------------------------------------------
  // Game sound hooks. Call these from gameplay code.
  // ---------------------------------------------------------------

  // HEARTBEAT — one thump. Scene calls this repeatedly; rate scales with danger.
  heartbeat(intensity = 1) {
    this._tone(60, 0.16, 'sine', 0.45 * intensity, 40);
    setTimeout(() => this._tone(52, 0.18, 'sine', 0.32 * intensity, 34), 150);
  }

  // CHASE STING — plays when a chase begins.
  chase() {
    this._tone(220, 0.5, 'sawtooth', 0.3, 110);
    this._noise(0.5, 0.25, 1200);
  }

  // GHOST WHISPER — eerie airy sweep used by paranormal events.
  whisper() {
    this._tone(900, 0.6, 'triangle', 0.12, 300);
    this._noise(0.6, 0.08, 2500);
  }

  // KEY PICKUP — bright pleasant chime.
  keyPickup() {
    this._tone(880, 0.12, 'square', 0.3);
    setTimeout(() => this._tone(1320, 0.18, 'square', 0.28), 90);
  }

  // DOOR — low wooden creak / thud.
  door() {
    this._noise(0.35, 0.4, 600);
    this._tone(140, 0.25, 'sawtooth', 0.15, 90);
  }

  // FLASHLIGHT click + flicker buzz.
  flashlightClick() {
    this._tone(1200, 0.05, 'square', 0.18);
  }
  flicker() {
    this._tone(2000, 0.04, 'square', 0.08);
  }

  // VICTORY / GAME OVER stings.
  win() {
    [523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => this._tone(f, 0.25, 'triangle', 0.35), i * 130));
  }
  lose() {
    this._tone(160, 0.8, 'sawtooth', 0.4, 50);
    this._noise(0.8, 0.3, 500);
  }
}
