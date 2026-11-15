// audio.js — synthesized WebAudio sounds. No audio files, no network.
// Everything is built from oscillators and filtered noise, created lazily
// on the first user gesture so the browser's autoplay policy is happy.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
  }

  /** Call from a user gesture. Safe to call repeatedly. */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.32;
      this.master.connect(this.ctx.destination);
    } catch { /* audio is optional */ }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.32;
    return this.muted;
  }

  _tone(freq0, freq1, dur, type, vol, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq0, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freq1), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(this.master);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }

  _noise(dur, vol, filterFreq, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter); filter.connect(g); g.connect(this.master);
    src.start(t0);
  }

  shoot() { this._tone(880, 220, 0.09, 'square', 0.10); }
  enemyShoot() { this._tone(320, 140, 0.14, 'sawtooth', 0.06); }
  explosion(big = false) {
    this._noise(big ? 0.7 : 0.35, big ? 0.5 : 0.28, big ? 900 : 1400);
    this._tone(big ? 160 : 110, 32, big ? 0.6 : 0.3, 'sine', 0.4);
  }
  hit() { this._tone(200, 60, 0.18, 'sawtooth', 0.3); this._noise(0.12, 0.2, 2400); }
  powerup() {
    this._tone(523, 523, 0.09, 'sine', 0.2);
    this._tone(659, 659, 0.09, 'sine', 0.2, 0.08);
    this._tone(784, 784, 0.14, 'sine', 0.22, 0.16);
  }
  waveClear() {
    this._tone(392, 392, 0.12, 'triangle', 0.22);
    this._tone(523, 523, 0.12, 'triangle', 0.22, 0.1);
    this._tone(659, 659, 0.2, 'triangle', 0.24, 0.2);
  }
  waveStart() { this._tone(196, 392, 0.25, 'triangle', 0.18); }
  /** The nova detonation: a deep boom under a rising shimmer. */
  nova() {
    this._noise(0.8, 0.55, 700);
    this._tone(90, 28, 0.7, 'sine', 0.5);
    this._tone(1047, 2093, 0.4, 'sine', 0.14, 0.05);
  }
  /** A surge wave's horn: two low brass-ish calls. */
  surge() {
    this._tone(147, 147, 0.22, 'sawtooth', 0.16);
    this._tone(196, 196, 0.3, 'sawtooth', 0.16, 0.2);
  }
  gameOver() {
    this._tone(392, 392, 0.22, 'sawtooth', 0.2);
    this._tone(311, 311, 0.22, 'sawtooth', 0.2, 0.2);
    this._tone(233, 110, 0.55, 'sawtooth', 0.22, 0.4);
  }
  victory() {
    [523, 659, 784, 1047].forEach((f, i) => this._tone(f, f, 0.22, 'triangle', 0.22, i * 0.13));
  }
}
