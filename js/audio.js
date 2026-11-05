/* =========================================================================
   SPATIAL RESONATOR · AUDIO
   -------------------------------------------------------------------------
   Web Audio. Every note goes to the speakers directly AND into an echo.
   Echo time follows the grid area (window = room size).
   Echo repeats, note length and waveform follow the light.
   ========================================================================= */
const AUDIO = {
  ctx: null,
  master: null,
  delay: null,
  feedback: null,

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

    // echo loop: delay → feedback gain → back into delay
    this.delay = this.ctx.createDelay(2.0);
    this.feedback = this.ctx.createGain();
    this.delay.connect(this.feedback);
    this.feedback.connect(this.delay);
    this.delay.connect(this.master);

    this.updateRoom();
  },

  // Called whenever the window or the light changes.
  updateRoom() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.delay.delayTime.setTargetAtTime(RULES.echoSeconds(STATE.gridW, STATE.gridH), t, 0.1);
    this.feedback.gain.setTargetAtTime(RULES.echoFeedbackFromLight(STATE.light), t, 0.1);
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
    env.gain.exponentialRampToValueAtTime(1, t + 0.01);          // quick attack
    env.gain.exponentialRampToValueAtTime(0.0001, t + decay);    // light-dependent decay

    osc.connect(env);
    env.connect(this.master);  // dry sound
    env.connect(this.delay);   // into the echo
    osc.start(t);
    osc.stop(t + decay + 0.05);
  },
};
