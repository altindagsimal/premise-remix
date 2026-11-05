/* =========================================================================
   SPATIAL RESONATOR · MAIN (Win95 / Winamp / Y2K Edition)
   -------------------------------------------------------------------------
   Wires inputs (pointer, keyboard, buttons, camera) to the system and
   updates the compact Winamp LED deck + status bar.
   KEYS (change them in KEYMAP below):
     arrows move · Space/Enter add/remove · P play · D/B darker/brighter
     N/W narrower/wider · S/T shorter/taller · R reset frame · C camera
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
    gridLines: 'GRID',
    ripples: 'WAVE',
    playhead: 'HEAD',
    notes: 'PADS',
  };

  // ---------------------------------------------------------------------
  // COMPACT LED FEEDBACK
  // ---------------------------------------------------------------------
  function announce(msg) {
    $('live').textContent = msg;         // screen readers
    $('last-change').textContent = msg;  // LED ticker
  }

  function playbackText() {
    if (STATE.playing) return `▶ PLAY ${String(STATE.step + 1).padStart(2, '0')}/${String(STATE.steps).padStart(2, '0')}`;
    if (SEQ.countStored() === 0) return '■ EMPTY';
    if (STATE.step < 0) return '■ READY';
    return '❚❚ PAUSED';
  }

  let lastFolded = 0;
  function updatePanel() {
    const pct = Math.round(STATE.light * 100);
    const wave = RULES.waveFromLight(STATE.light) === 'triangle' ? 'TRI' : 'SINE';
    const stored = SEQ.countStored(), folded = SEQ.countFolded();
    lastFolded = folded;

    // Desktop teal dims with room light
    const r = Math.round(lerp(4, 0, STATE.light));
    const g = Math.round(lerp(18, 128, STATE.light));
    const b = Math.round(lerp(28, 128, STATE.light));
    document.body.style.setProperty('--desktop', `rgb(${r},${g},${b})`);

    // Winamp LED chips
    $('s-play').textContent = playbackText();
    $('s-tempo').textContent = `${RULES.bpmFromLight(STATE.light)} BPM · ${wave}`;
    $('s-grid').textContent = `${STATE.steps}×${STATE.notes} GRID`;
    $('s-echo').textContent = `ECHO ${RULES.echoSeconds(STATE.gridW, STATE.gridH).toFixed(2)}s`;
    $('s-pattern').textContent = `${stored - folded} ACTIVE · →${folded} FOLDED`;

    // Bottom status bar cells
    $('s-window').textContent = `WIN: ${STATE.winW}×${STATE.winH}`;
    $('s-frame').textContent = `FRAME: ${Math.round(STATE.frameW * 100)}%×${Math.round(STATE.frameH * 100)}%`;
    $('s-range').textContent = `PITCH: ${RULES.noteName(0)}–${RULES.noteName(STATE.notes - 1)}`;
    $('s-light').textContent = STATE.cameraOn
      ? `LIGHT: ${pct}% (CAM)`
      : `LIGHT: ${pct}%`;
    if ($('s-cam-luma')) {
      $('s-cam-luma').textContent = STATE.luma == null ? 'CAM' : `${Math.round(STATE.luma * 100)}%`;
    }

    // 4 Signal LED pills
    document.querySelectorAll('[data-signal]').forEach((li) => {
      const name = li.dataset.signal, t = CONFIG.signals[name];
      const on = RULES.signalVisible(name, STATE.light);
      li.classList.toggle('off', !on);
      li.querySelector('.mark').textContent = on ? '✓' : '✕';
      li.querySelector('.need').textContent = t > 1 ? 'OFF' : t <= 0 ? 'ON' : `≥${Math.round(t * 100)}%`;
    });

    slider.value = pct;
    slider.setAttribute('aria-valuetext', `${pct}% light`);
    $('light-out').textContent = `${pct}%`;
  }

  // ---------------------------------------------------------------------
  // CONTEXT → FEEDBACK
  // ---------------------------------------------------------------------
  let resizeSource = 'WINDOW';
  let burstFrom = null, burstTimer = null;
  let ready = false;

  CONTEXT.onMeasure = (changed, before) => {
    RENDER.resize();
    AUDIO.updateRoom();
    if (changed && before.steps && ready) {
      if (!burstFrom) burstFrom = { steps: before.steps, notes: before.notes, folded: lastFolded, source: resizeSource };
      RENDER.showBadge([`${before.steps} × ${before.notes}  →  ${STATE.steps} × ${STATE.notes}`, 'STEPS × NOTES']);
      clearTimeout(burstTimer);
      burstTimer = setTimeout(() => { describeGridChange(burstFrom); burstFrom = null; }, CONFIG.grid.resizeAnnounceMs);
    }
    resizeSource = 'WINDOW';
    updatePanel();
  };

  function describeGridChange(from) {
    const parts = [];
    if (STATE.steps !== from.steps) {
      parts.push(`${from.steps}→${STATE.steps} STEPS`);
    }
    if (STATE.notes !== from.notes) {
      parts.push(`${from.notes}→${STATE.notes} NOTES (${RULES.noteName(0)}–${RULES.noteName(STATE.notes - 1)})`);
    }
    const df = SEQ.countFolded() - from.folded;
    if (df > 0) parts.push(`+${df} FOLDED (KEPT)`);
    if (df < 0) parts.push(`${-df} UNFOLDED`);
    if (parts.length) announce(`${from.source}: ${parts.join(' · ')}`);
  }

  CONTEXT.onLight = (prev, changes) => {
    AUDIO.updateRoom();
    if (changes.length) {
      const off = changes.filter((c) => !c.visible).map((c) => SIGNAL_LABELS[c.name]);
      const on = changes.filter((c) => c.visible).map((c) => SIGNAL_LABELS[c.name]);
      const pct = Math.round(STATE.light * 100);
      const detail = off.length ? `HIDDEN: ${off.join(', ')}` : `SHOWN: ${on.join(', ')}`;
      announce(`LIGHT ${pct}% · ${detail} · AUDIO & LED STAY ON`);
      RENDER.showBadge([
        STATE.light < prev ? `LIGHT ${pct}% ↓` : `LIGHT ${pct}% ↑`,
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
    if (!res.ok) {
      RENDER.addFlash(row, step, 'blocked');
      announce(`WAIT ${(res.waitMs / 1000).toFixed(1)}s BEFORE NEXT EDIT`);
      return;
    }
    RENDER.addFlash(row, step, res.on ? 'on' : 'off');
    if (res.on) AUDIO.playNote(row);
    const hidden = res.on && !RULES.signalVisible('notes', STATE.light) ? ' (DARK MODE: LISTEN)' : '';
    announce(`${res.on ? '+ ADDED' : '− REMOVED'} ${RULES.noteName(row)} @ STEP ${step + 1}${hidden}`);
    updatePanel();
  }

  function clampCursor() {
    STATE.cursor.row = clamp(STATE.cursor.row, 0, STATE.notes - 1);
    STATE.cursor.step = clamp(STATE.cursor.step, 0, STATE.steps - 1);
  }

  function moveCursor(dRow, dStep) {
    STATE.cursorVisible = true;
    clampCursor();
    STATE.cursor.row = clamp(STATE.cursor.row + dRow, 0, STATE.notes - 1);
    STATE.cursor.step = clamp(STATE.cursor.step + dStep, 0, STATE.steps - 1);
    const { row, step } = STATE.cursor;
    announce(`CURSOR: ${RULES.noteName(row)} · STEP ${step + 1} [${STATE.pattern[row][step] ? 'ON' : 'EMPTY'}]`);
  }

  function togglePlay() {
    AUDIO.init();
    if (STATE.playing) {
      SEQ.pause();
      announce(`PAUSED · ${SEQ.countStored()} NOTES KEPT`);
    } else {
      SEQ.play();
      announce(`PLAYING @ ${RULES.bpmFromLight(STATE.light)} BPM`);
    }
    playBtn.setAttribute('aria-pressed', String(STATE.playing));
    playBtn.firstChild.textContent = STATE.playing ? '❚❚ PAUSE ' : '▶ PLAY ';
    updatePanel();
  }

  function nudgeLight(dir) {
    if (STATE.cameraOn) {
      announce('CAM ACTIVE — PRESS [C] TO USE SLIDER OR D/B KEYS');
      return;
    }
    CONTEXT.setLight(STATE.light + dir * CONFIG.light.keyStep, 'manual');
  }

  function changeFrame(dw, dh) {
    ready = true;
    resizeSource = 'FRAME';
    CONTEXT.changeFrame(dw * CONFIG.frame.step, dh * CONFIG.frame.step);
  }

  function resetFrame() {
    ready = true;
    resizeSource = 'FRAME';
    CONTEXT.resetFrame();
    announce('FRAME RESET TO 100% WINDOW');
  }

  function updateCameraUI() {
    camBtn.setAttribute('aria-pressed', String(STATE.cameraOn));
    camBtn.firstChild.textContent = STATE.cameraOn ? '■ STOP CAM ' : '◉ CAM ';
    slider.disabled = STATE.cameraOn;
    $('cam-figure').hidden = !STATE.cameraOn;
  }

  async function toggleCamera() {
    if (STATE.cameraOn) {
      CONTEXT.stopCamera(video);
      announce('CAMERA OFF · SLIDER / D-B KEYS ACTIVE');
      updateCameraUI();
      updatePanel();
      return;
    }
    camBtn.disabled = true;
    announce('REQUESTING CAMERA PERMISSION…');
    try {
      await CONTEXT.startCamera(video, preview);
      announce('CAMERA ON · MEASURING ROOM BRIGHTNESS');
    } catch (err) {
      announce(`CAMERA UNAVAILABLE · USE SLIDER OR D/B KEYS`);
    } finally {
      camBtn.disabled = false;
      updateCameraUI();
      updatePanel();
    }
  }

  function restoreDemo() {
    SEQ.clear();
    SEQ.seed();
    announce('DEMO MELODY LOADED');
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
    arrowup: () => moveCursor(1, 0),
    arrowdown: () => moveCursor(-1, 0),
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
  $('clear-btn').addEventListener('click', () => { SEQ.clear(); announce('PATTERN CLEARED'); updatePanel(); });
  $('demo-btn').addEventListener('click', restoreDemo);
  if ($('demo-top-btn')) $('demo-top-btn').addEventListener('click', restoreDemo);

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
