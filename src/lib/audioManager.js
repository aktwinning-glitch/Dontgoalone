/**
 * Ambient Horror Audio Manager
 * Uses Web Audio API to layer wind, creaks, and whispers.
 * No external dependencies — pure browser APIs.
 *
 * Usage:
 *   audioManager.start();
 *   audioManager.update({ act, fear, threat }); // call on state changes
 *   audioManager.stop();
 */

class AudioManager {
  constructor() {
    this._ctx = null;
    this._master = null;
    this._layers = {};   // { wind, creak, whisper }
    this._started = false;
    this._creak_timer = null;
    this._muted = false;
  }

  _getCtx() {
    if (!this._ctx) {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
      this._master = this._ctx.createGain();
      this._master.gain.value = 0.0;
      this._master.connect(this._ctx.destination);
    }
    return this._ctx;
  }

  // Create a looping band-pass filtered white noise node
  _makeNoise(freq = 400, q = 1.0, volume = 0.0) {
    const ctx = this._getCtx();
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = freq;
    filter.Q.value = q;

    const gain = ctx.createGain();
    gain.gain.value = volume;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this._master);
    source.start();

    return { source, filter, gain };
  }

  _setGain(gainNode, value, rampTime = 1.5) {
    if (!gainNode) return;
    gainNode.gain.cancelScheduledValues(this._ctx.currentTime);
    gainNode.gain.setTargetAtTime(
      Math.max(0, Math.min(1, value)),
      this._ctx.currentTime,
      rampTime
    );
  }

  start() {
    if (this._started) return;
    const ctx = this._getCtx();

    // Wind layer — low rumble
    this._layers.wind = this._makeNoise(120, 0.8, 0.0);
    // Mid wind — howl
    this._layers.windMid = this._makeNoise(340, 0.5, 0.0);
    // Whisper layer — high filtered noise
    this._layers.whisper = this._makeNoise(2200, 3.5, 0.0);

    // Master fade in
    this._master.gain.setTargetAtTime(0.6, ctx.currentTime, 0.5);
    this._started = true;

    // Schedule random creaks via oscillator pings
    this._scheduleCreak();
  }

  _scheduleCreak() {
    if (!this._started) return;
    const delay = 6000 + Math.random() * 14000; // 6–20s between creaks
    this._creak_timer = setTimeout(() => {
      if (!this._started || !this._ctx) return;
      this._playCreak();
      this._scheduleCreak();
    }, delay);
  }

  _playCreak() {
    const ctx = this._ctx;
    if (!ctx || ctx.state !== "running") return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = "sawtooth";
    osc.frequency.value = 180 + Math.random() * 60;
    osc.frequency.setTargetAtTime(80, ctx.currentTime, 0.08);

    filter.type = "lowpass";
    filter.frequency.value = 600;

    gain.gain.setValueAtTime(0.0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(this._creak_vol || 0.04, ctx.currentTime + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this._master);

    osc.start();
    osc.stop(ctx.currentTime + 0.85);
  }

  /**
   * Scene-specific ambient profile.
   * Adjusts filter frequencies to match location texture.
   * @param {string} scene - zone id: woods | basement | kitchen | upstairs | porch | living
   */
  updateScene(scene) {
    if (!this._started || !this._ctx) return;
    const profiles = {
      woods:    { windFreq: 200,  windMidFreq: 420, whisperFreq: 1800, creak: 0.045 },
      basement: { windFreq: 80,   windMidFreq: 160, whisperFreq: 2800, creak: 0.07  },
      kitchen:  { windFreq: 300,  windMidFreq: 500, whisperFreq: 2000, creak: 0.025 },
      upstairs: { windFreq: 180,  windMidFreq: 300, whisperFreq: 2400, creak: 0.055 },
      porch:    { windFreq: 250,  windMidFreq: 460, whisperFreq: 1600, creak: 0.030 },
      living:   { windFreq: 140,  windMidFreq: 260, whisperFreq: 2100, creak: 0.035 },
    };
    const p = profiles[scene] || profiles.living;
    const now = this._ctx.currentTime;
    if (this._layers.wind?.filter)    this._layers.wind.filter.frequency.setTargetAtTime(p.windFreq, now, 2.0);
    if (this._layers.windMid?.filter) this._layers.windMid.filter.frequency.setTargetAtTime(p.windMidFreq, now, 2.5);
    if (this._layers.whisper?.filter) this._layers.whisper.filter.frequency.setTargetAtTime(p.whisperFreq, now, 2.0);
    this._creak_vol_override = p.creak;
  }

  /**
   * Update audio layers based on game state.
   * @param {{ act: number, fear: number, threat: number }} state
   */
  update({ act = 1, fear = 0, threat = 0 } = {}) {
    if (!this._started || !this._ctx) return;
    if (this._ctx.state === "suspended") this._ctx.resume();

    const f = Math.min(100, Math.max(0, fear));
    const t = Math.min(100, Math.max(0, threat));
    const fearRatio = f / 100;
    const threatRatio = t / 100;

    const windBase = 0.06 + (act - 1) * 0.02;
    const windFear = fearRatio * 0.12;
    this._setGain(this._layers.wind?.gain, windBase + windFear, 2.0);

    const windMidVol = act >= 3 ? 0.04 + fearRatio * 0.10 : fearRatio * 0.03;
    this._setGain(this._layers.windMid?.gain, windMidVol, 2.5);

    const whisperVol = Math.max(0, (fearRatio - 0.5) * 0.12 + (threatRatio - 0.4) * 0.08);
    this._setGain(this._layers.whisper?.gain, whisperVol, 3.0);

    this._creak_vol = this._creak_vol_override
      ? this._creak_vol_override + fearRatio * 0.02
      : 0.025 + (act - 1) * 0.008 + fearRatio * 0.025;

    const masterVol = 0.45 + fearRatio * 0.3;
    this._setGain(this._master, masterVol, 2.0);
  }

  mute() {
    if (!this._master) return;
    this._muted = true;
    this._setGain(this._master, 0, 0.5);
  }

  unmute() {
    if (!this._master) return;
    this._muted = false;
    this._setGain(this._master, 0.6, 0.5);
  }

  stop() {
    this._started = false;
    clearTimeout(this._creak_timer);
    if (this._ctx) {
      this._setGain(this._master, 0, 0.4);
      setTimeout(() => {
        try { this._ctx?.close(); } catch {}
        this._ctx = null;
        this._master = null;
        this._layers = {};
      }, 600);
    }
  }
}

// Singleton
export const audioManager = new AudioManager();