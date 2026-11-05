/* =========================================================================
   SPATIAL RESONATOR · AUDIO
   -------------------------------------------------------------------------
   Web Audio. Every note goes to the speakers directly (crisp dry signal)
   AND into a soft, filtered room echo so the window size is audible
   without muddying the melody.
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

    // Soft, clean echo loop: delay → warm lowpass filter → feedback & low wet mix
    this.delay = this.ctx.createDelay(2.0);
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 1500;

    this.feedback = this.ctx.createGain();
    this.wet = this.ctx.createGain();
    this.wet.gain.value = CONFIG.audio.echoMix;

    this.delay.connect(this.filter);
    this.filter.connect(this.feedback);
    this.feedback.connect(this.delay);
    this.filter.connect(this.wet);
    this.wet.connect(this.master);

    this.updateRoom();
  },

  // Called whenever the window or the light changes.
  updateRoom() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.delay.delayTime.setTargetAtTime(RULES.echoSeconds(STATE.gridW, STATE.gridH), t, 0.08);
    this.feedback.gain.setTargetAtTime(RULES.echoFeedbackFromLight(STATE.light), t, 0.08);
    this.wet.gain.setTargetAtTime(CONFIG.audio.echoMix, t, 0.08);
  },

  playNote(row) {
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const decay = RULES.decayFromLight(STATE.light);

    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = RULES.waveFromLight(STATE.light);
    osc.frequency.setValueAtTime(RULES.frequencyForRow(row), t);

    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(1, t + 0.008);         // clean attack
    env.gain.exponentialRampToValueAtTime(0.0001, t + decay);    // crisp decay

    osc.connect(env);
    env.connect(this.master);  // clear dry note
    env.connect(this.delay);   // subtle room reflection
    osc.start(t);
    osc.stop(t + decay + 0.04);
  },
};
