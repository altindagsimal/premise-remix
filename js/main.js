/* =========================================================================
   SPATIAL RESONATOR · MAIN (Win95 / Winamp / Y2K Edition)
   -------------------------------------------------------------------------
   Wires inputs (pointer, keyboard, buttons, camera) to the system and
   updates the compact Winamp LED deck + status bar.
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

  function announce(msg) {
    $('live').textContent = msg;
    $('last-change').textContent = msg;
  }

  function playbackText() {
    if (STATE.playing) return `▶ PLAY ${STATE.step + 1}/8`;
    if (SEQ.countStored() === 0) return '■ EMPTY';
    if (STATE.step < 0) return '■ READY';
    return '❚❚ PAUSED';
  }

  function pitchDesc() {
    const m = RULES.pitchMultiplier(STATE.gridW);
    const tag = m > 1.15 ? 'HIGH/TİZ' : m < 0.9 ? 'DEEP/BAS' : 'MID';
    return `PITCH ×${m.toFixed(2)} (${tag})`;
  }

  function echoDesc() {
    const mixPct = Math.round(RULES.echoMix(STATE.gridW, STATE.gridH) * 100);
    const sec = RULES.echoSeconds(STATE.gridW, STATE.gridH).toFixed(2);
    return `ECHO ${mixPct}% · ${sec}s`;
  }

  function updatePanel() {
    const pct = Math.round(STATE.light * 100);
    const wave = RULES.waveFromLight(STATE.light) === 'triangle' ? 'TRI' : 'SINE';
    const stored = SEQ.countStored();

    // Desktop teal dims with room light
    const r = Math.round(lerp(4, 0, STATE.light));
    const g = Math.round(lerp(18, 128, STATE.light));
    const b = Math.round(lerp(28, 128, STATE.light));
    document.body.style.setProperty('--desktop', `rgb(${r},${g},${b})`);

    // Winamp LED chips
    $('s-play').textContent = playbackText();
    $('s-tempo').textContent = `${RULES.bpmFromLight(STATE.light)} BPM · ${wave}`;
    $('s-grid').textContent = pitchDesc();
    $('s-echo').textContent = echoDesc();
    $('s-pattern').textContent = `${stored} ACTIVE PADS (A1–H8)`;

    // Bottom status bar cells
    $('s-window').textContent = `SPACE: ${STATE.gridW}×${STATE.gridH}px`;
    $('s-frame').textContent = `FRAME: ${Math.round(STATE.frameW * 100)}%×${Math.round(STATE.frameH * 100)}%`;
    $('s-range').textContent = `GRID: A–H × 1–8`;
    $('s-light').textContent = STATE.cameraOn ? `LIGHT: ${pct}% (CAM)` : `LIGHT: ${pct}%`;
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
  let burstTimer = null;
  let ready = false;

  CONTEXT.onMeasure = (changed, before) => {
    RENDER.resize();
    AUDIO.updateRoom();
    if (changed && before.gridW && ready) {
      const src = resizeSource;
      RENDER.showBadge([
        `${pitchDesc()}`,
        `${echoDesc()}  ·  SPACE ${STATE.gridW}×${STATE.gridH}px`,
      ]);
      clearTimeout(burstTimer);
      burstTimer = setTimeout(() => {
        announce(`${src} RESIZED → ${pitchDesc()} · ${echoDesc()}`);
        // If paused, play a reference note so the user hears the new pitch & echo immediately!
        if (!STATE.playing && AUDIO.ctx) {
          AUDIO.playNote(3);
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
    const label = RULES.cellLabel(row, step);
    if (!res.ok) {
      RENDER.addFlash(row, step, 'blocked');
      announce(`WAIT ${(res.waitMs / 1000).toFixed(1)}s BEFORE NEXT EDIT`);
      return;
    }
    RENDER.addFlash(row, step, res.on ? 'on' : 'off');
    if (res.on) {
      AUDIO.playNote(row);
      RENDER.addRipple(row, step);
    }
    const hidden = res.on && !RULES.signalVisible('notes', STATE.light) ? ' (DARK MODE: LISTEN)' : '';
    announce(`${res.on ? '+ ADDED' : '− REMOVED'} PAD ${label}${hidden} · ${echoDesc()}`);
    updatePanel();
  }

  function clampCursor() {
    STATE.cursor.row = clamp(STATE.cursor.row, 0, STATE.notes - 1);
    STATE.cursor.step = clamp(STATE.cursor.step, 0, STATE.steps - 1);
  }

  // Since row 0 ('A') is at the top and row 7 ('H') is at the bottom:
  // ArrowUp moves up (dRow = -1), ArrowDown moves down (dRow = +1).
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
      announce(`PAUSED · ${SEQ.countStored()} PADS KEPT`);
    } else {
      SEQ.play();
      announce(`PLAYING @ ${RULES.bpmFromLight(STATE.light)} BPM · ${echoDesc()}`);
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
    announce(`FRAME RESET TO 100% · ${pitchDesc()} · ${echoDesc()}`);
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
    announce('DEMO MELODY LOADED (A1–H8)');
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
