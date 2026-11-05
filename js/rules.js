/* =========================================================================
   SPATIAL RESONATOR · RULES
   -------------------------------------------------------------------------
   How context becomes system behaviour. Each rule is one small function,
   so a mapping can be swapped or changed in one place during a live demo.
     CONTEXT IN  ─────────────►  SYSTEM OUT
     grid width        →  steps (loop length)
     grid height       →  notes (pitch range)
     grid area         →  echo time ("size of the room")
     light             →  tempo, decay, waveform, echo repeats
     light             →  which feedback signals stay visible
   ========================================================================= */
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const lerp = (a, b, t) => a + (b - a) * t;
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const RULES = {

  // ---- Window → grid ----------------------------------------------------
  stepsFromWidth(px) {
    const g = CONFIG.grid;
    return clamp(Math.floor(px / g.pxPerStep), g.minSteps, g.maxSteps);
  },
  notesFromHeight(px) {
    const g = CONFIG.grid;
    return clamp(Math.floor(px / g.pxPerNote), g.minNotes, g.maxNotes);
  },
  // Bigger grid area = bigger "room" = longer echo.
  echoSeconds(gridW, gridH) {
    const a = CONFIG.audio;
    const size = clamp((gridW * gridH) / a.referenceArea, 0, 1);
    return lerp(a.echoMinSec, a.echoMaxSec, size);
  },

  // ---- Light → sound ----------------------------------------------------
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
  echoFeedbackFromLight(light) {
    return lerp(CONFIG.audio.echoFeedbackDark, CONFIG.audio.echoFeedbackBright, light);
  },

  // ---- Light → feedback (the Context × Feedback coupling) ----------------
  signalVisible(name, light) {
    return light >= CONFIG.signals[name];
  },

  // ---- Camera → light ---------------------------------------------------
  lightFromLuma(luma) {
    const c = CONFIG.camera;
    return clamp((luma - c.darkLuma) / (c.brightLuma - c.darkLuma), 0, 1);
  },

  // ---- Rows → pitch -----------------------------------------------------
  midiForRow(row) {
    const s = CONFIG.audio.scale;
    const octave = Math.floor(row / s.length);
    return CONFIG.audio.rootMidi + s[row % s.length] + 12 * octave;
  },
  frequencyForRow(row) {
    return 440 * Math.pow(2, (RULES.midiForRow(row) - 69) / 12);
  },
  noteName(row) {
    const m = RULES.midiForRow(row);
    return NOTE_NAMES[m % 12] + (Math.floor(m / 12) - 1);
  },
};
