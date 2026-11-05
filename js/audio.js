/* =========================================================================
   SPATIAL RESONATOR · AUDIO
   -------------------------------------------------------------------------
   Web Audio. Window size shapes both the PITCH (narrow = high/tiz,
   wide = deep/bas) and the ROOM ECHO (small window = dry studio with
   almost no echo; large window = spacious hall with clear acoustic echo).
   ========================================================================= */
const AUDIO = {
  ctx: null,
  master: null,
  delay: null,
  feedback: null,
  wet: null,
  filter: null,

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();

    this.master = this.ctx.createGain();
    this.master.gain.value = CONFIG.audio.volume;
    this.master.connect(this.ctx.destination);

    // Echo loop controlled by window area (room size)
    this.delay = this.ctx.createDelay(2.0);
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 1800;

    this.feedback = this.ctx.createGain();
    this.wet = this.ctx.createGain();

    this.delay.connect(this.filter);
    this.filter.connect(this.feedback);
    this.feedback.connect(this.delay);
    this.filter.connect(this.wet);
    this.wet.connect(this.master);

    this.updateRoom();
  },

  // Called whenever the window/frame size or light changes.
  updateRoom() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.delay.delayTime.setTargetAtTime(RULES.echoSeconds(STATE.gridW, STATE.gridH), t, 0.06);
    this.feedback.gain.setTargetAtTime(RULES.echoFeedback(STATE.gridW, STATE.gridH), t, 0.06);
    this.wet.gain.setTargetAtTime(RULES.echoMix(STATE.gridW, STATE.gridH), t, 0.06);
  },

  playNote(row) {
    this.init();
    if (!this.ctx) return;
    this.updateRoom();
    const t = this.ctx.currentTime;
    const decay = RULES.decayFromLight(STATE.light);

    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = RULES.waveFromLight(STATE.light);
    osc.frequency.setValueAtTime(RULES.frequencyForRow(row, STATE.gridW), t);

    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(1, t + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, t + decay);

    osc.connect(env);
    env.connect(this.master);  // dry note
    env.connect(this.delay);   // window-size echo
    osc.start(t);
    osc.stop(t + decay + 0.04);
  },
};
