/* =========================================================================
   SPATIAL RESONATOR · CONFIG
   -------------------------------------------------------------------------
   Every number that shapes the experience lives in this one object.
   Change a value → save → reload the page.
   Sections:  1 GRID & WINDOW   2 LIGHT   3 FEEDBACK SIGNALS
              4 SOUND & ECHO    5 RULES / LIMITS   6 VISUALS
   ========================================================================= */
const CONFIG = {

  // ---------- 1. CONTEXT · FIXED 8×8 GRID RESHAPED BY WINDOW -------------
  grid: {
    cols: 8,               // columns 01 – 08 (never disappear when resizing)
    rows: 8,               // rows A – H in alphabetical order (top → bottom)
    rowLabels: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
    resizeAnnounceMs: 300, // wait this long after resizing before announcing
    minWidthPx: 360,       // narrow window reference (high pitch, tight ripples)
    maxWidthPx: 1300,      // wide window reference (deep bass pitch, wide ripples)
    minAreaPx: 360 * 240,  // small window area (dry room, almost no echo)
    maxAreaPx: 1200 * 650, // large window area (spacious hall echo)
  },
  // Keyboard / button alternative to dragging the window edges.
  frame: {
    step: 0.12,            // N/W/S/T change the frame by 12 %
    min: 0.35,             // the frame can shrink to 35 % of the stage
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
    darkBpm: 68,           // tempo when the room is dark
    brightBpm: 132,        // tempo when the room is bright
    stepsPerBeat: 2,       // 2 = each step is an eighth note
  },

  // ---------- 3. FEEDBACK · WHICH SIGNALS SURVIVE AT WHICH LIGHT ---------
  // A signal is drawn only while light >= its threshold.
  // Set a value to 0 to keep it always, or 2 to remove it completely.
  signals: {
    gridLines: 0.55,       // grid lines + A–H / 01–08 labels
    ripples:   0.40,       // rings when a note plays
    playhead:  0.25,       // the moving column ▲
    notes:     0.10,       // stored note pads
  },
  flashMs: 380,            // how long a clicked cell flashes (acknowledgement)
  badgeMs: 1500,           // how long the context-change popup stays visible

  // ---------- 4. SOUND & WINDOW-DRIVEN ECHO ------------------------------
  audio: {
    rootMidi: 57,                 // base pitch (A3 = 220 Hz)
    scale: [0, 2, 4, 7, 9, 12, 14, 16], // 8 pleasant pentatonic notes for rows H → A
    volume: 0.24,
    narrowPitchMul: 1.45,         // narrow window → higher, brighter pitch
    widePitchMul: 0.72,           // wide window → deeper, lower bass pitch
    brightDecay: 0.18,            // crisp note length in bright light
    darkDecay: 0.48,              // warmer note length in the dark
    brightWave: 'triangle',
    darkWave: 'sine',
    // Window size → Echo (small window = dry studio, large window = clear echo)
    echoMinSec: 0.09,             // small window echo delay (seconds)
    echoMaxSec: 0.30,             // large window echo delay (seconds)
    echoMixSmall: 0.03,           // small window: almost no echo (3 %)
    echoMixLarge: 0.42,           // large window: clearly audible clean echo (42 %)
    echoFeedbackSmall: 0.05,      // small window: 1 tiny reflection
    echoFeedbackLarge: 0.48,      // large window: 3–4 clean acoustic repeats
  },

  // ---------- 5. RULES / LIMITS -----------------------------------------
  edits: {
    cooldownMs: 0,         // minimum time between two note edits (0 = no limit)
  },

  // ---------- 6. VISUALS (Win95 / Winamp / Y2K palette) ------------------
  ripple: { minRadius: 45, maxRadius: 140, growPx: 2.6, fade: 0.032 },
  colors: {
    darkRoom:   [6, 10, 22],      // canvas background at 0 % light
    brightRoom: [25, 42, 92],     // canvas background at 100 % light
    // Vibrant Y2K / Winamp spectrum color for rows A → H
    rows: [
      '#ff2a85', // A: hot pink
      '#ff5c2b', // B: coral orange
      '#ffb800', // C: cyber gold
      '#ffe600', // D: lemon star
      '#b8ff01', // E: Yahooligans lime
      '#00f59b', // F: mint neon
      '#00e1ff', // G: cyan
      '#6875ff', // H: electric indigo
    ],
  },
};
