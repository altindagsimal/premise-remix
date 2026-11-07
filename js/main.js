/* =========================================================================
   SPATIAL RESONATOR · MAIN (Win95 / Winamp / Y2K Edition)
   -------------------------------------------------------------------------
   Wires inputs (pointer, keyboard, buttons, camera) to the system and
   updates the self-explanatory LED deck + theory/rules bar.
   ========================================================================= */
(function () {
  const $ = (id) => document.getElementById(id);
  const canvas = $('stage');
  const video = $('cam-video');
  const preview = $('cam-preview');
  const slider = $('light-slider');
  const playBtn = $('play-btn');
  const camBtn = $('cam-btn');

  const SIGNAL_LABELS = {
    gridLines: 'Grid Lines & Labels',
    ripples: 'Wave Ripples',
    playhead: 'Playhead Bar (▲)',
    notes: 'Note Pads (A1–H8)',
  };

  function announce(msg) {
    $('live').textContent = msg;
    $('last-change').textContent = msg;
  }

  function playbackText() {
    if (STATE.playing) return `▶ PLAYING (Step ${STATE.step + 1}/8)`;
    if (SEQ.countStored() === 0) return '■ EMPTY GRID (Click pads A1–H8)';
    if (STATE.step < 0) return '■ STOPPED (Press PLAY [P])';
    return `❚❚ PAUSED (Step ${STATE.step + 1}/8)`;
  }

  function pitchDesc() {
    const m = RULES.pitchMultiplier(STATE.gridW);
    const tag = m > 1.15 ? 'High / Narrow' : m < 0.9 ? 'Deep / Wide' : 'Normal';
    return `Pitch ×${m.toFixed(2)} (${tag})`;
  }

  function echoDesc() {
    const mixPct = Math.round(RULES.echoMix(STATE.gridW, STATE.gridH) * 100);
    const sec = RULES.echoSeconds(STATE.gridW, STATE.gridH).toFixed(2);
    return `Room Echo ${mixPct}% (${sec}s)`;
  }

  function updatePanel() {
    const pct = Math.round(STATE.light * 100);
    const tone = RULES.waveFromLight(STATE.light) === 'triangle' ? 'Bright tone' : 'Warm tone';
    const stored = SEQ.countStored();
    const areaPct = Math.round(RULES.roomSizeRatio(STATE.gridW, STATE.gridH) * 100);
    const lightSrc = STATE.cameraOn ? `Camera ${pct}%` : `Room Light ${pct}%`;

    // Desktop teal dims with room light
    const r = Math.round(lerp(4, 0, STATE.light));
    const g = Math.round(lerp(18, 128, STATE.light));
    const b = Math.round(lerp(28, 128, STATE.light));
    document.body.style.setProperty('--desktop', `rgb(${r},${g},${b})`);

    // Self-explanatory Cause → Effect LED chips
    $('s-play').textContent = playbackText();
    $('s-tempo').textContent = `☀ ${lightSrc} → Tempo ${RULES.bpmFromLight(STATE.light)} BPM (${tone})`;
    $('s-grid').textContent = `↔ Width ${STATE.gridW}px → ${pitchDesc()}`;
    $('s-echo').textContent = `□ Room Size ${areaPct}% → ${echoDesc()}`;
    $('s-pattern').textContent = `♪ Stored Notes: ${stored} / 64 Pads`;

    if ($('s-cam-luma')) {
      $('s-cam-luma').textContent = STATE.luma == null ? 'CAM' : `CAM ${Math.round(STATE.luma * 100)}%`;
    }

    // 4 Self-Explanatory Visual Feedback Layer Pills
    document.querySelectorAll('[data-signal]').forEach((li) => {
      const name = li.dataset.signal;
      const t = CONFIG.signals[name];
      const pctNeed = Math.round(t * 100);
      const on = RULES.signalVisible(name, STATE.light);
      li.classList.toggle('off', !on);
      li.querySelector('.mark').textContent = on ? '✓' : '✕';
      if (t > 1) {
        li.querySelector('.need').textContent = 'DISABLED IN CONFIG';
      } else if (t <= 0) {
        li.querySelector('.need').textContent = 'ALWAYS VISIBLE';
      } else {
        li.querySelector('.need').textContent = on
          ? `VISIBLE (Light ≥${pctNeed}%)`
          : `HIDDEN (Needs ≥${pctNeed}% Light)`;
      }
    });

    slider.value = pct;
    slider.setAttribute('aria-valuetext', `${pct}% room light`);
    $('light-out').textContent = `${pct}%`;
  }

  // ---------------------------------------------------------------------
  // CONTEXT → FEEDBACK
  // ---------------------------------------------------------------------
  let resizeSource = 'WINDOW';
  let burstTimer = null;
  let ready = false;

  CONTEXT.onMeasure = (changed, before) => {
    RENDER.resize();
    AUDIO.updateRoom();
    if (changed && before.gridW && ready) {
      const src = resizeSource;
      RENDER.showBadge([
        `WINDOW ${STATE.gridW}×${STATE.gridH}px → ${pitchDesc()}`,
        `${echoDesc()}  [Dey 2001 Sensor Rule]`,
      ]);
      clearTimeout(burstTimer);
      burstTimer = setTimeout(() => {
        announce(`${src} RESIZED (${STATE.gridW}×${STATE.gridH}px) → ${pitchDesc()} · ${echoDesc()}`);
        // If paused, play a reference note so the user hears the new pitch & echo immediately!
        if (!STATE.playing && AUDIO.ctx) {
          AUDIO.playNote(3, 3);
          RENDER.addRipple(3, 3);
        }
      }, CONFIG.grid.resizeAnnounceMs);
    }
    resizeSource = 'WINDOW';
    updatePanel();
  };

  CONTEXT.onLight = (prev, changes) => {
    AUDIO.updateRoom();
    if (changes.length) {
      const off = changes.filter((c) => !c.visible).map((c) => SIGNAL_LABELS[c.name]);
      const on = changes.filter((c) => c.visible).map((c) => SIGNAL_LABELS[c.name]);
      const pct = Math.round(STATE.light * 100);
      const detail = off.length ? `HIDDEN IN DARK: ${off.join(', ')}` : `RESTORED: ${on.join(', ')}`;
      announce(`ROOM LIGHT ${pct}% → TEMPO ${RULES.bpmFromLight(STATE.light)} BPM · ${detail}`);
      RENDER.showBadge([
        STATE.light < prev ? `ROOM LIGHT ${pct}% ↓ (${RULES.bpmFromLight(STATE.light)} BPM)` : `ROOM LIGHT ${pct}% ↑ (${RULES.bpmFromLight(STATE.light)} BPM)`,
        detail,
      ]);
    }
    updatePanel();
  };

  SEQ.onStep = (step, rows) => {
    rows.forEach((r) => RENDER.addRipple(r, step));
    $('s-play').textContent = playbackText();
  };

  // ---------------------------------------------------------------------
  // ACTIONS
  // ---------------------------------------------------------------------
  function editCell(row, step) {
    AUDIO.init();
    const res = SEQ.toggle(row, step);
    const label = RULES.cellLabel(row, step);
    if (!res.ok) {
      RENDER.addFlash(row, step, 'blocked');
      announce(`WAIT ${(res.waitMs / 1000).toFixed(1)}s BEFORE NEXT EDIT`);
      return;
    }
    RENDER.addFlash(row, step, res.on ? 'on' : 'off');
    if (res.on) {
      AUDIO.playNote(row, step);
      RENDER.addRipple(row, step);
    }
    const hz = Math.round(RULES.frequencyForCell(row, step, STATE.gridW));
    const hidden = res.on && !RULES.signalVisible('notes', STATE.light) ? ' (PADS HIDDEN <10% LIGHT — LISTEN TO SOUND)' : '';
    announce(`${res.on ? '+ ADDED' : '− REMOVED'} PAD ${label} (${hz} Hz)${hidden} · ${echoDesc()}`);
    updatePanel();
  }

  function clampCursor() {
    STATE.cursor.row = clamp(STATE.cursor.row, 0, STATE.notes - 1);
    STATE.cursor.step = clamp(STATE.cursor.step, 0, STATE.steps - 1);
  }

  // Row 0 ('A') is at the top and row 7 ('H') is at the bottom
  function moveCursor(dRow, dStep) {
    STATE.cursorVisible = true;
    clampCursor();
    STATE.cursor.row = clamp(STATE.cursor.row + dRow, 0, STATE.notes - 1);
    STATE.cursor.step = clamp(STATE.cursor.step + dStep, 0, STATE.steps - 1);
    const { row, step } = STATE.cursor;
    announce(`CURSOR: PAD ${RULES.cellLabel(row, step)} [${STATE.pattern[row][step] ? 'ON' : 'EMPTY'}]`);
  }

  function togglePlay() {
    AUDIO.init();
    if (STATE.playing) {
      SEQ.pause();
      announce(`PAUSED · ${SEQ.countStored()} PADS KEPT ON GRID`);
    } else {
      SEQ.play();
      announce(`PLAYING @ ${RULES.bpmFromLight(STATE.light)} BPM · ${pitchDesc()} · ${echoDesc()}`);
    }
    playBtn.setAttribute('aria-pressed', String(STATE.playing));
    playBtn.firstChild.textContent = STATE.playing ? '❚❚ PAUSE ' : '▶ PLAY ';
    updatePanel();
  }

  function nudgeLight(dir) {
    if (STATE.cameraOn) {
      announce('CAMERA ACTIVE — PRESS [C] TO USE SLIDER OR D/B KEYS');
      return;
    }
    CONTEXT.setLight(STATE.light + dir * CONFIG.light.keyStep, 'manual');
  }

  function changeFrame(dw, dh) {
    AUDIO.init();
    ready = true;
    resizeSource = 'FRAME';
    CONTEXT.changeFrame(dw * CONFIG.frame.step, dh * CONFIG.frame.step);
  }

  function resetFrame() {
    AUDIO.init();
    ready = true;
    resizeSource = 'FRAME';
    CONTEXT.resetFrame();
    announce(`WINDOW FRAME RESET TO 100% · ${pitchDesc()} · ${echoDesc()}`);
  }

  function updateCameraUI() {
    camBtn.setAttribute('aria-pressed', String(STATE.cameraOn));
    camBtn.firstChild.textContent = STATE.cameraOn ? '■ STOP CAMERA ' : '◉ CAMERA SENSOR ';
    slider.disabled = STATE.cameraOn;
    $('cam-figure').hidden = !STATE.cameraOn;
  }

  async function toggleCamera() {
    if (STATE.cameraOn) {
      CONTEXT.stopCamera(video);
      announce('CAMERA SENSOR OFF · SLIDER / D-B KEYS ACTIVE');
      updateCameraUI();
      updatePanel();
      return;
    }
    camBtn.disabled = true;
    announce('REQUESTING WEBCAM PERMISSION TO MEASURE ROOM LIGHT…');
    try {
      await CONTEXT.startCamera(video, preview);
      announce('CAMERA SENSOR ON · MEASURING REAL ROOM BRIGHTNESS (64×48 PREVIEW)');
    } catch (err) {
      announce('CAMERA UNAVAILABLE · USE ROOM LIGHT SLIDER OR D/B KEYS');
    } finally {
      camBtn.disabled = false;
      updateCameraUI();
      updatePanel();
    }
  }

  function restoreDemo() {
    SEQ.clear();
    SEQ.seed();
    announce('DEMO MELODY LOADED (8 NOTES ACROSS A1–H8)');
    updatePanel();
  }

  // ---------------------------------------------------------------------
  // INPUTS
  // ---------------------------------------------------------------------
  canvas.addEventListener('pointerdown', (e) => {
    ready = true;
    const r = canvas.getBoundingClientRect();
    const cell = RENDER.cellAt(e.clientX - r.left, e.clientY - r.top);
    if (!cell) return;
    STATE.cursor = { row: cell.row, step: cell.step };
    STATE.cursorVisible = false;
    editCell(cell.row, cell.step);
  });

  const KEYMAP = {
    arrowleft: () => moveCursor(0, -1),
    arrowright: () => moveCursor(0, 1),
    arrowup: () => moveCursor(-1, 0),
    arrowdown: () => moveCursor(1, 0),
    ' ': () => { STATE.cursorVisible = true; clampCursor(); editCell(STATE.cursor.row, STATE.cursor.step); },
    enter: () => KEYMAP[' '](),
    p: togglePlay,
    d: () => nudgeLight(-1),
    b: () => nudgeLight(1),
    n: () => changeFrame(-1, 0),
    w: () => changeFrame(1, 0),
    s: () => changeFrame(0, -1),
    t: () => changeFrame(0, 1),
    r: resetFrame,
    c: toggleCamera,
  };

  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey) return;
    const tag = e.target.tagName;
    const key = e.key.toLowerCase();
    if (tag === 'INPUT' && key.startsWith('arrow')) return;
    if ((tag === 'BUTTON' || tag === 'A') && (key === ' ' || key === 'enter')) return;
    const action = KEYMAP[key];
    if (!action) return;
    e.preventDefault();
    action();
  });

  playBtn.addEventListener('click', togglePlay);
  camBtn.addEventListener('click', toggleCamera);
  $('clear-btn').addEventListener('click', () => { SEQ.clear(); announce('ALL PADS CLEARED'); updatePanel(); });
  $('demo-btn').addEventListener('click', restoreDemo);
  if ($('demo-top-btn')) $('demo-top-btn').addEventListener('click', restoreDemo);
  if ($('dark-btn')) $('dark-btn').addEventListener('click', () => nudgeLight(-1));
  if ($('bright-btn')) $('bright-btn').addEventListener('click', () => nudgeLight(1));

  document.querySelectorAll('[data-frame]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.frame === 'reset') return resetFrame();
      const [dw, dh] = btn.dataset.frame.split(',').map(Number);
      changeFrame(dw, dh);
    });
  });
  slider.addEventListener('input', () => CONTEXT.setLight(slider.value / 100, 'manual'));

  let firstObserve = true;
  new ResizeObserver(() => {
    CONTEXT.measure();
    if (firstObserve) { firstObserve = false; ready = true; }
  }).observe(canvas);

  // ---------------------------------------------------------------------
  // START
  // ---------------------------------------------------------------------
  SEQ.init();
  SEQ.seed();
  RENDER.setup(canvas);
  CONTEXT.stage = canvas;
  CONTEXT.measure();
  CONTEXT.setLight(CONFIG.light.start, 'manual');
  updateCameraUI();
  RENDER.draw();
})();
