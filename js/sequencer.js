/* =========================================================================
   SPATIAL RESONATOR · SEQUENCER
   -------------------------------------------------------------------------
   Stores the pattern and plays it step by step.
   The pattern is always the maximum size (maxNotes × maxSteps).
   The window only decides which part of it is VISIBLE and PLAYED.
   Notes outside the window are kept ("folded"), never deleted.
   ========================================================================= */
const SEQ = {
  onStep: null,        // callback(step, playedRows)
  timer: null,

  init() {
    const g = CONFIG.grid;
    STATE.pattern = Array.from({ length: g.maxNotes }, () => Array(g.maxSteps).fill(false));
  },

  // A starting melody so the first Play makes sound. Some notes sit far to
  // the right / high up, so a small window already has folded notes.
  seed() {
    const cells = [[0, 0], [2, 2], [3, 0], [4, 4], [6, 3], [8, 1], [10, 2], [11, 0], [12, 5], [14, 7]];
    for (const [step, row] of cells) {
      if (row < CONFIG.grid.maxNotes && step < CONFIG.grid.maxSteps) STATE.pattern[row][step] = true;
    }
  },

  // Toggle one note. Returns { ok, on } or { ok: false, waitMs } (cooldown rule).
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

  // Notes outside the visible grid (to the right or above).
  countFolded() {
    let n = 0;
    STATE.pattern.forEach((row, r) => row.forEach((on, s) => {
      if (on && (r >= STATE.notes || s >= STATE.steps)) n++;
    }));
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

  // The step length is read again every step, so light changes the tempo live.
  next() {
    this.tick();
    this.timer = setTimeout(() => { if (STATE.playing) this.next(); }, RULES.stepMs(STATE.light));
  },

  tick() {
    STATE.step = (STATE.step + 1) % STATE.steps;
    const played = [];
    for (let r = 0; r < STATE.notes; r++) {
      if (STATE.pattern[r][STATE.step]) {
        AUDIO.playNote(r);
        played.push(r);
      }
    }
    if (this.onStep) this.onStep(STATE.step, played);
  },
};
