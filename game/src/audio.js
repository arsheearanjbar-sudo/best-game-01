// Every sound in LUMENFALL is synthesized live with WebAudio: no audio
// files, nothing to download. Short envelopes, quiet mixes, and a slow
// ambient pad under play. The context starts on the first user gesture,
// as browsers require, and every call is safe before that.

const MASTER = 0.5;

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.muted = false;
    this.lastShoot = 0;
    this.lastHit = 0;
    this.musicTimer = 0;
    this.musicStep = 0;
    this.musicOn = false;
  }

  /** Create the context on a gesture. Safe to call repeatedly. */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    try {
      this.ctx = new Ctor();
    } catch {
      return;
    }
    this.master = this.ctx.createGain();
    // Fade the master in over a tenth of a second so the first sound never clicks.
    this.master.gain.setValueAtTime(0, this.ctx.currentTime);
    this.master.gain.linearRampToValueAtTime(this.muted ? 0 : MASTER, this.ctx.currentTime + 0.1);
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.16;
    this.musicGain.connect(this.master);
    this._startPad();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : MASTER, this.ctx.currentTime, 0.02);
    }
    return this.muted;
  }

  _tone({ freq, freqEnd, type = 'sine', dur = 0.12, vol = 0.2, delay = 0, attack = 0.004 }) {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  _noise({ dur = 0.15, vol = 0.2, filterFreq = 1200, delay = 0, type = 'lowpass' }) {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = filterFreq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t0);
  }

  shoot() {
    if (!this.ctx) return;
    const now = performance.now();
    if (now - this.lastShoot < 55) return;
    this.lastShoot = now;
    this._tone({ freq: 880 + Math.random() * 120, freqEnd: 320, type: 'triangle', dur: 0.07, vol: 0.10 });
  }

  enemyHit() {
    if (!this.ctx) return;
    const now = performance.now();
    if (now - this.lastHit < 45) return;
    this.lastHit = now;
    this._tone({ freq: 240, freqEnd: 120, type: 'square', dur: 0.05, vol: 0.07 });
  }

  enemyDie(big = false) {
    this._tone({ freq: big ? 300 : 520, freqEnd: 70, type: 'sawtooth', dur: big ? 0.35 : 0.18, vol: big ? 0.22 : 0.12 });
    this._noise({ dur: big ? 0.3 : 0.14, vol: big ? 0.2 : 0.09, filterFreq: big ? 700 : 1600 });
  }

  pickup(combo = 0) {
    const base = 660 * Math.pow(1.059463, Math.min(combo, 12));
    this._tone({ freq: base, type: 'sine', dur: 0.09, vol: 0.14 });
    this._tone({ freq: base * 1.5, type: 'sine', dur: 0.12, vol: 0.10, delay: 0.05 });
  }

  heal() {
    this._tone({ freq: 520, freqEnd: 780, type: 'sine', dur: 0.22, vol: 0.16 });
    this._tone({ freq: 780, freqEnd: 1040, type: 'sine', dur: 0.25, vol: 0.12, delay: 0.08 });
  }

  levelUp() {
    [523, 659, 784, 1047].forEach((f, i) => {
      this._tone({ freq: f, type: 'triangle', dur: 0.3, vol: 0.16, delay: i * 0.07 });
    });
  }

  nova() {
    this._tone({ freq: 140, freqEnd: 40, type: 'sine', dur: 0.5, vol: 0.3 });
    this._noise({ dur: 0.45, vol: 0.22, filterFreq: 900 });
    this._tone({ freq: 1200, freqEnd: 2400, type: 'sine', dur: 0.3, vol: 0.08, delay: 0.05 });
  }

  hurt() {
    this._tone({ freq: 160, freqEnd: 60, type: 'sawtooth', dur: 0.22, vol: 0.25 });
    this._noise({ dur: 0.12, vol: 0.14, filterFreq: 500 });
  }

  dash() {
    this._noise({ dur: 0.16, vol: 0.1, filterFreq: 2600, type: 'bandpass' });
  }

  click() {
    this._tone({ freq: 740, type: 'sine', dur: 0.06, vol: 0.12 });
  }

  waveStart() {
    this._tone({ freq: 392, type: 'triangle', dur: 0.25, vol: 0.16 });
    this._tone({ freq: 523, type: 'triangle', dur: 0.35, vol: 0.16, delay: 0.12 });
  }

  bossRoar() {
    this._tone({ freq: 90, freqEnd: 55, type: 'sawtooth', dur: 0.9, vol: 0.3 });
    this._tone({ freq: 135, freqEnd: 82, type: 'sawtooth', dur: 0.9, vol: 0.2, delay: 0.08 });
    this._noise({ dur: 0.7, vol: 0.12, filterFreq: 300 });
  }

  victory() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => {
      this._tone({ freq: f, type: 'triangle', dur: 0.45, vol: 0.18, delay: i * 0.11 });
    });
  }

  defeat() {
    [392, 370, 330, 262].forEach((f, i) => {
      this._tone({ freq: f, type: 'triangle', dur: 0.5, vol: 0.16, delay: i * 0.16 });
    });
  }

  /** A slow two-oscillator pad that sits under everything. */
  _startPad() {
    if (!this.ctx || !this.musicGain) return;
    const t0 = this.ctx.currentTime;
    for (const [freq, detune] of [[110, -4], [110, 5], [164.8, 0]]) {
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      osc.detune.value = detune;
      const g = this.ctx.createGain();
      g.gain.value = 0.05;
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.07 + Math.random() * 0.05;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 0.02;
      lfo.connect(lfoGain);
      lfoGain.connect(g.gain);
      osc.connect(g);
      g.connect(this.musicGain);
      osc.start(t0);
      lfo.start(t0);
    }
  }

  /** A gentle pentatonic pluck pattern while playing. Call with dt each frame. */
  updateMusic(dt, playing) {
    if (!this.ctx || !this.musicGain || !playing) return;
    this.musicTimer += dt;
    if (this.musicTimer < 0.42) return;
    this.musicTimer = 0;
    const scale = [220, 261.6, 293.7, 329.6, 392, 440, 523.3];
    const step = this.musicStep++;
    if (step % 2 === 0 || Math.random() < 0.35) {
      const f = scale[Math.floor(Math.random() * scale.length)];
      const t0 = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f * 2;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.05, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
      osc.connect(g);
      g.connect(this.musicGain);
      osc.start(t0);
      osc.stop(t0 + 0.55);
    }
  }
}
