/* =========================================================================
   SPATIAL RESONATOR · SEQUENCER
   -------------------------------------------------------------------------
   Stores the 8×8 pattern (rows A–H × steps 01–08) and plays it step by step.
   Every cell stays visible at all window sizes so clicked squares never
   disappear or shift to another coordinate.
   ========================================================================= */
const SEQ = {
  onStep: null,
  timer: null,

  init() {
    const g = CONFIG.grid;
    STATE.pattern = Array.from({ length: g.rows }, () => Array(g.cols).fill(false));
  },

  // Default 8×8 melody across rows A–H and steps 01–08
  seed() {
    const cells = [
      [0, 7], // H1 (step 1, row H)
      [1, 5], // F2 (step 2, row F)
      [2, 3], // D3 (step 3, row D)
      [3, 1], // B4 (step 4, row B)
      [4, 4], // E5 (step 5, row E)
      [5, 2], // C6 (step 6, row C)
      [6, 0], // A7 (step 7, row A)
      [7, 5], // F8 (step 8, row F)
    ];
    for (const [step, row] of cells) {
      if (row < CONFIG.grid.rows && step < CONFIG.grid.cols) STATE.pattern[row][step] = true;
    }
  },

  toggle(row, step) {
    const now = performance.now();
    const wait = CONFIG.edits.cooldownMs - (now - STATE.lastEdit);
    if (wait > 0) return { ok: false, waitMs: Math.ceil(wait) };
    STATE.lastEdit = now;
    STATE.pattern[row][step] = !STATE.pattern[row][step];
    return { ok: true, on: STATE.pattern[row][step] };
  },

  clear() {
    for (const row of STATE.pattern) row.fill(false);
  },

  countStored() {
    let n = 0;
    for (const row of STATE.pattern) for (const on of row) if (on) n++;
    return n;
  },

  play() {
    if (STATE.playing) return;
    STATE.playing = true;
    this.next();
  },

  pause() {
    STATE.playing = false;
    clearTimeout(this.timer);
  },

  next() {
    this.tick();
    this.timer = setTimeout(() => { if (STATE.playing) this.next(); }, RULES.stepMs(STATE.light));
  },

  tick() {
    STATE.step = (STATE.step + 1) % STATE.steps;
    const played = [];
    for (let r = 0; r < STATE.notes; r++) {
      if (STATE.pattern[r][STATE.step]) {
        AUDIO.playNote(r, STATE.step);
        played.push(r);
      }
    }
    if (this.onStep) this.onStep(STATE.step, played);
  },
};
