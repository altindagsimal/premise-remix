/* =========================================================================
   SPATIAL RESONATOR · CONTEXT
   -------------------------------------------------------------------------
   Reads the world outside the grid:
     1. the size of the browser window (and the keyboard "frame" alternative)
     2. the light in the room (camera brightness, or slider / keys)
   The 8×8 grid (01–08 × A–H) stays intact at every size; window dimensions
   reshape the cell geometry, pitch register, ripple radius, and room echo.
   ========================================================================= */
const STATE = {
  // window context
  winW: 0, winH: 0,          // browser window in px
  stageW: 0, stageH: 0,      // the canvas area in px
  frameW: 1, frameH: 1,      // keyboard/button frame (1 = full stage)
  gridW: 0, gridH: 0,        // active grid area in px
  steps: CONFIG.grid.cols,   // 8 columns (01 – 08)
  notes: CONFIG.grid.rows,   // 8 rows (A – H, top → bottom)

  // light context
  light: CONFIG.light.start, // 0 … 1
  lightSource: 'manual',     // 'manual' (slider / keys) or 'camera'
  luma: null,                // last raw camera brightness 0 … 1
  cameraOn: false,

  // sequencer
  pattern: [],               // pattern[row][step] = true / false
  playing: false,
  step: -1,                  // current playhead step
  lastEdit: 0,               // time of the last note edit (for cooldown)
  cursor: { row: 0, step: 0 },
  cursorVisible: false,
};

const CONTEXT = {
  stage: null,
  onMeasure: null,           // callback(changed, before)
  onLight: null,             // callback(prevLight, signalChanges)
  stream: null,
  camTimer: null,

  // ---- 1. WINDOW ---------------------------------------------------------
  measure() {
    const rect = this.stage.getBoundingClientRect();
    const before = { gridW: STATE.gridW, gridH: STATE.gridH };
    STATE.winW = window.innerWidth;
    STATE.winH = window.innerHeight;
    STATE.stageW = rect.width;
    STATE.stageH = rect.height;
    STATE.gridW = Math.round(rect.width * STATE.frameW);
    STATE.gridH = Math.round(rect.height * STATE.frameH);
    STATE.steps = CONFIG.grid.cols;
    STATE.notes = CONFIG.grid.rows;

    const changed = Math.abs(before.gridW - STATE.gridW) > 4 || Math.abs(before.gridH - STATE.gridH) > 4;
    if (this.onMeasure) this.onMeasure(changed, before);
  },

  changeFrame(dw, dh) {
    const f = CONFIG.frame;
    STATE.frameW = clamp(Math.round((STATE.frameW + dw) * 100) / 100, f.min, f.max);
    STATE.frameH = clamp(Math.round((STATE.frameH + dh) * 100) / 100, f.min, f.max);
    this.measure();
  },

  resetFrame() {
    STATE.frameW = 1;
    STATE.frameH = 1;
    this.measure();
  },

  // ---- 2. LIGHT ----------------------------------------------------------
  setLight(value, source) {
    const prev = STATE.light;
    STATE.light = clamp(value, 0, 1);
    STATE.lightSource = source;

    const changes = [];
    for (const name of Object.keys(CONFIG.signals)) {
      const was = RULES.signalVisible(name, prev);
      const now = RULES.signalVisible(name, STATE.light);
      if (was !== now) changes.push({ name, visible: now });
    }
    if (this.onLight) this.onLight(prev, changes);
  },

  // ---- 3. CAMERA (optional; slider + keys are the alternative) ----------
  async startCamera(video, preview) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('This browser cannot use a camera.');
    }
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 160, height: 120, facingMode: 'user' },
      audio: false,
    });
    video.srcObject = this.stream;
    await video.play();
    STATE.cameraOn = true;
    this.camTimer = setInterval(() => this.sampleCamera(video, preview), CONFIG.camera.sampleMs);
    this.sampleCamera(video, preview);
  },

  sampleCamera(video, preview) {
    if (!video.videoWidth) return;
    const pctx = preview.getContext('2d', { willReadFrequently: true });
    const w = preview.width, h = preview.height;
    pctx.drawImage(video, 0, 0, w, h);
    const img = pctx.getImageData(0, 0, w, h);
    const d = img.data;
    let sum = 0;
    for (let i = 0; i < d.length; i += 4) {
      const y = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      sum += y;
      d[i] = d[i + 1] = d[i + 2] = y;
    }
    pctx.putImageData(img, 0, 0);
    STATE.luma = sum / (d.length / 4) / 255;

    const target = RULES.lightFromLuma(STATE.luma);
    const smoothed = lerp(STATE.light, target, CONFIG.camera.smoothing);
    this.setLight(smoothed, 'camera');
  },

  stopCamera(video) {
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    clearInterval(this.camTimer);
    this.stream = null;
    video.srcObject = null;
    STATE.cameraOn = false;
    STATE.luma = null;
    STATE.lightSource = 'manual';
  },
};
