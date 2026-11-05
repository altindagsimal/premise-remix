/* =========================================================================
   SPATIAL RESONATOR · CONFIG
   -------------------------------------------------------------------------
   Every number that shapes the experience lives in this one object.
   Change a value → save → reload the page.
   Sections:  1 WINDOW → GRID   2 LIGHT   3 FEEDBACK SIGNALS
              4 SOUND           5 RULES / LIMITS   6 VISUALS
   ========================================================================= */
const CONFIG = {

  // ---------- 1. CONTEXT · WINDOW → GRID --------------------------------
  grid: {
    pxPerStep: 100,        // every 100 px of width adds one step (time)
    pxPerNote: 60,         // every 60 px of height adds one note row (pitch)
    minSteps: 4,  maxSteps: 16,
    minNotes: 3,  maxNotes: 10,
    resizeAnnounceMs: 350, // wait this long after resizing before announcing
  },
  // Keyboard / button alternative to dragging the window edges.
  frame: {
    step: 0.1,             // [ ] and - = change the frame by 10 %
    min: 0.3,              // the frame can shrink to 30 % of the stage
    max: 1,
  },

  // ---------- 2. CONTEXT · LIGHT -----------------------------------------
  light: {
    start: 0.7,            // 0 = dark room, 1 = bright room
    keyStep: 0.1,          // how much , and . change the light
  },
  camera: {
    sampleMs: 400,         // how often the camera brightness is measured
    smoothing: 0.3,        // 0 = frozen, 1 = jumps straight to each reading
    darkLuma: 0.08,        // camera brightness that counts as 0 % light
    brightLuma: 0.55,      // camera brightness that counts as 100 % light
  },
  tempo: {
    darkBpm: 66,           // tempo when the room is dark
    brightBpm: 132,        // tempo when the room is bright
    stepsPerBeat: 2,       // 2 = each step is an eighth note
  },

  // ---------- 3. FEEDBACK · WHICH SIGNALS SURVIVE AT WHICH LIGHT ---------
  // A signal is drawn only while light >= its threshold.
  // Set a value to 0 to keep it always, or 2 to remove it completely.
  // Status text, sound and the click flash are never removed.
  signals: {
    gridLines: 0.55,       // grid lines + note names
    ripples:   0.40,       // rings when a note plays
    playhead:  0.25,       // the moving column
    notes:     0.10,       // stored note markers + folded-note arrows
  },
  flashMs: 380,            // how long a clicked cell flashes (acknowledgement)
  badgeMs: 1800,           // how long the "8 × 5 → 11 × 6" badge stays visible

  // ---------- 4. SOUND ---------------------------------------------------
  audio: {
    rootMidi: 55,                 // bottom row = G3 (MIDI note number)
    scale: [0, 2, 4, 7, 9],       // major pentatonic, in semitones
    volume: 0.22,
    brightDecay: 0.25,            // seconds a note rings in bright light
    darkDecay: 1.4,               // seconds a note rings in the dark
    brightWave: 'triangle',
    darkWave: 'sine',
    referenceArea: 1600 * 900,    // grid area that counts as a "large room"
    echoMinSec: 0.08,             // small window → short echo
    echoMaxSec: 0.45,             // large window → long echo
    echoFeedbackBright: 0.15,     // echo repeats in bright light
    echoFeedbackDark: 0.55,       // echo repeats in the dark (more resonance)
  },

  // ---------- 5. RULES / LIMITS -----------------------------------------
  edits: {
    cooldownMs: 0,         // minimum time between two note edits (0 = no limit)
  },

  // ---------- 6. VISUALS -------------------------------------------------
  ripple: { maxRadius: 120, growPx: 2.2, fade: 0.03 },
  colors: {
    darkRoom:  [6, 7, 10],        // stage background at 0 % light (RGB)
    brightRoom: [214, 208, 194],  // stage background at 100 % light (RGB)
  },
};
