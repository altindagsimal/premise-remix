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
    pxPerStep: 90,         // every 90 px of width adds one step (time)
    pxPerNote: 52,         // every 52 px of height adds one note row (pitch)
    minSteps: 4,  maxSteps: 16,
    minNotes: 3,  maxNotes: 10,
    resizeAnnounceMs: 350, // wait this long after resizing before announcing
  },
  // Keyboard / button alternative to dragging the window edges.
  frame: {
    step: 0.1,             // N/W/S/T change the frame by 10 %
    min: 0.3,              // the frame can shrink to 30 % of the stage
    max: 1,
  },

  // ---------- 2. CONTEXT · LIGHT -----------------------------------------
  light: {
    start: 0.75,           // 0 = dark room, 1 = bright room
    keyStep: 0.1,          // how much D and B change the light
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
  badgeMs: 1600,           // how long the "10 × 8 → 6 × 8" badge stays visible

  // ---------- 4. SOUND ---------------------------------------------------
  audio: {
    rootMidi: 55,                 // bottom row = G3 (MIDI note number)
    scale: [0, 2, 4, 7, 9],       // major pentatonic, in semitones
    volume: 0.22,
    brightDecay: 0.25,            // seconds a note rings in bright light
    darkDecay: 1.4,               // seconds a note rings in the dark
    brightWave: 'triangle',
    darkWave: 'sine',
    referenceArea: 1400 * 700,    // grid area that counts as a "large room"
    echoMinSec: 0.08,             // small window → short echo
    echoMaxSec: 0.45,             // large window → long echo
    echoFeedbackBright: 0.15,     // echo repeats in bright light
    echoFeedbackDark: 0.55,       // echo repeats in the dark (more resonance)
  },

  // ---------- 5. RULES / LIMITS -----------------------------------------
  edits: {
    cooldownMs: 0,         // minimum time between two note edits (0 = no limit)
  },

  // ---------- 6. VISUALS (Win95 / Winamp / Y2K palette) ------------------
  ripple: { maxRadius: 110, growPx: 2.5, fade: 0.032 },
  colors: {
    darkRoom:   [6, 10, 22],      // canvas background at 0 % light (deep CRT night)
    brightRoom: [25, 42, 92],     // canvas background at 100 % light (electric cobalt)
    // Vibrant Y2K / Winamp spectrum color per pitch row (low → high)
    rows: [
      '#ff2a85', // hot pink
      '#ff5c2b', // coral orange
      '#ffb800', // cyber gold
      '#ffe600', // lemon star
      '#b8ff01', // Yahooligans lime
      '#00f59b', // mint neon
      '#00e1ff', // cyan
      '#3b82ff', // electric blue
      '#9b5cff', // violet
      '#ff66e5', // bubblegum
    ],
  },
};
