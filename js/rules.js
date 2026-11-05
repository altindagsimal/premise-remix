/* =========================================================================
   SPATIAL RESONATOR · RULES
   -------------------------------------------------------------------------
   How context becomes system behaviour. Every rule is one small function:
     CONTEXT IN  ─────────────►  SYSTEM OUT
     grid width        →  pitch shift (narrow = high/tiz, wide = deep/bas)
     grid width        →  ripple spread (narrow = tight, wide = wide waves)
     grid area         →  echo delay & echo level (small = dry, large = hall echo)
     light             →  tempo, note decay, waveform
     light             →  which feedback signals stay visible
   ========================================================================= */
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const lerp = (a, b, t) => a + (b - a) * t;

const RULES = {

  // ---- Alphabetical row & cell labels (top = A, bottom = H) -------------
  rowLabel(row) {
    return CONFIG.grid.rowLabels[row] || String.fromCharCode(65 + row);
  },
  cellLabel(row, step) {
    return `${RULES.rowLabel(row)}${step + 1}`;
  },

  // ---- Window geometry ratios (0 … 1) -----------------------------------
  widthRatio(gridW) {
    const g = CONFIG.grid;
    return clamp((gridW - g.minWidthPx) / (g.maxWidthPx - g.minWidthPx), 0, 1);
  },
  roomSizeRatio(gridW, gridH) {
    const g = CONFIG.grid;
    return clamp((gridW * gridH - g.minAreaPx) / (g.maxAreaPx - g.minAreaPx), 0, 1);
  },

  // ---- Window → Pitch & Ripple size -------------------------------------
  pitchMultiplier(gridW) {
    const a = CONFIG.audio;
    return lerp(a.narrowPitchMul, a.widePitchMul, RULES.widthRatio(gridW));
  },
  rippleMaxRadius(gridW) {
    return lerp(CONFIG.ripple.minRadius, CONFIG.ripple.maxRadius, RULES.widthRatio(gridW));
  },

  // ---- Window area → Acoustic Echo (small = dry, large = clear echo) ----
  echoSeconds(gridW, gridH) {
    const a = CONFIG.audio;
    return lerp(a.echoMinSec, a.echoMaxSec, RULES.roomSizeRatio(gridW, gridH));
  },
  echoMix(gridW, gridH) {
    const a = CONFIG.audio;
    return lerp(a.echoMixSmall, a.echoMixLarge, RULES.roomSizeRatio(gridW, gridH));
  },
  echoFeedback(gridW, gridH) {
    const a = CONFIG.audio;
    return lerp(a.echoFeedbackSmall, a.echoFeedbackLarge, RULES.roomSizeRatio(gridW, gridH));
  },

  // ---- Light → Sound ----------------------------------------------------
  bpmFromLight(light) {
    return Math.round(lerp(CONFIG.tempo.darkBpm, CONFIG.tempo.brightBpm, light));
  },
  stepMs(light) {
    return 60000 / RULES.bpmFromLight(light) / CONFIG.tempo.stepsPerBeat;
  },
  decayFromLight(light) {
    return lerp(CONFIG.audio.darkDecay, CONFIG.audio.brightDecay, light);
  },
  waveFromLight(light) {
    return light >= 0.5 ? CONFIG.audio.brightWave : CONFIG.audio.darkWave;
  },

  // ---- Light → Feedback visibility (Context × Feedback coupling) --------
  signalVisible(name, light) {
    return light >= CONFIG.signals[name];
  },

  // ---- Camera → Light ---------------------------------------------------
  lightFromLuma(luma) {
    const c = CONFIG.camera;
    return clamp((luma - c.darkLuma) / (c.brightLuma - c.darkLuma), 0, 1);
  },

  // ---- Row (A=0 top … H=7 bottom) → Frequency ---------------------------
  // Row A (top) is the highest note; Row H (bottom) is the lowest note.
  midiForRow(row) {
    const s = CONFIG.audio.scale;
    const idx = (CONFIG.grid.rows - 1 - row) % s.length;
    return CONFIG.audio.rootMidi + s[idx];
  },
  frequencyForRow(row, gridW = STATE.gridW) {
    const baseHz = 440 * Math.pow(2, (RULES.midiForRow(row) - 69) / 12);
    return baseHz * RULES.pitchMultiplier(gridW);
  },
};
