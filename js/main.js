/* =========================================================================
   SPATIAL RESONATOR · MAIN
   -------------------------------------------------------------------------
   Wires inputs (pointer, keyboard, buttons, camera) to the system and
   writes the system's state in words (status panel + announcements).
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
    gridLines: 'grid lines',
    ripples: 'ripples',
    playhead: 'playhead',
    notes: 'note markers',
  };

  // ---------------------------------------------------------------------
  // FEEDBACK IN WORDS
  // ---------------------------------------------------------------------
  function announce(msg) {
    $('live').textContent = msg;         // screen readers
    $('last-change').textContent = msg;  // everyone
  }

  function playbackText() {
    if (STATE.playing) return `▶ Playing · step ${STATE.step + 1} / ${STATE.steps}`;
    if (SEQ.countStored() === 0) return '■ Stopped · pattern is empty';
    if (STATE.step < 0) return '■ Ready · press Play';
    return '❚❚ Paused · notes are kept';
  }

  let lastFolded = 0;
  function updatePanel() {
    const pct = Math.round(STATE.light * 100);
    $('s-window').textContent = `${STATE.winW} × ${STATE.winH} px`;
    $('s-frame').textContent = `${Math.round(STATE.frameW * 100)}% × ${Math.round(STATE.frameH * 100)}%`;
    $('s-grid').textContent = `${STATE.steps} steps × ${STATE.notes} notes`;
    $('s-range').textContent = `${RULES.noteName(0)} – ${RULES.noteName(STATE.notes - 1)}`;
    $('s-light').textContent = STATE.cameraOn
      ? `${pct}% · camera (raw ${STATE.luma == null ? '–' : Math.round(STATE.luma * 100) + '%'})`
      : `${pct}% · slider / keys`;
    $('s-tempo').textContent =
      `${RULES.bpmFromLight(STATE.light)} BPM · ${RULES.waveFromLight(STATE.light)} · rings ${RULES.decayFromLight(STATE.light).toFixed(2)} s`;
    $('s-echo').textContent =
      `${RULES.echoSeconds(STATE.gridW, STATE.gridH).toFixed(2)} s · ${Math.round(RULES.echoFeedbackFromLight(STATE.light) * 100)}% repeats`;
    const stored = SEQ.countStored(), folded = SEQ.countFolded();
    lastFolded = folded;
    $('s-pattern').textContent = `${stored} stored · ${stored - folded} playing · ${folded} folded`;
    $('s-play').textContent = playbackText();

    document.querySelectorAll('[data-signal]').forEach((li) => {
      const name = li.dataset.signal, t = CONFIG.signals[name];
      const on = RULES.signalVisible(name, STATE.light);
      li.classList.toggle('off', !on);
      li.querySelector('.mark').textContent = on ? '✓' : '✕';
      li.querySelector('.need').textContent = t > 1 ? 'removed' : t <= 0 ? 'always' : `needs ≥ ${Math.round(t * 100)}%`;
    });

    slider.value = pct;
    slider.setAttribute('aria-valuetext', `${pct}% light`);
    $('light-out').textContent = `${pct}%`;
  }

  // ---------------------------------------------------------------------
  // CONTEXT → FEEDBACK
  // ---------------------------------------------------------------------
  let resizeSource = 'Window';
  let burstFrom = null, burstTimer = null;
  let ready = false;

  CONTEXT.onMeasure = (changed, before) => {
    RENDER.resize();
    AUDIO.updateRoom();
    if (changed && before.steps && ready) {
      if (!burstFrom) burstFrom = { steps: before.steps, notes: before.notes, folded: lastFolded, source: resizeSource };
      RENDER.showBadge([`${before.steps} × ${before.notes}  →  ${STATE.steps} × ${STATE.notes}`, 'steps × notes']);
      clearTimeout(burstTimer);
      burstTimer = setTimeout(() => { describeGridChange(burstFrom); burstFrom = null; }, CONFIG.grid.resizeAnnounceMs);
    }
    resizeSource = 'Window';
    updatePanel();
  };

  function describeGridChange(from) {
    const parts = [];
    if (STATE.steps !== from.steps) {
      parts.push(STATE.steps > from.steps
        ? `wider: ${from.steps} → ${STATE.steps} steps, longer loop`
        : `narrower: ${from.steps} → ${STATE.steps} steps, shorter loop`);
    }
    if (STATE.notes !== from.notes) {
      parts.push(STATE.notes > from.notes
        ? `taller: ${from.notes} → ${STATE.notes} notes, up to ${RULES.noteName(STATE.notes - 1)}`
        : `shorter: ${from.notes} → ${STATE.notes} notes, up to ${RULES.noteName(STATE.notes - 1)}`);
    }
    const df = SEQ.countFolded() - from.folded;
    if (df > 0) parts.push(`${df} note${df > 1 ? 's' : ''} folded outside (kept, not deleted)`);
    if (df < 0) parts.push(`${-df} folded note${df < -1 ? 's' : ''} came back`);
    if (parts.length) announce(`${from.source} ${parts.join('; ')}.`);
  }

  CONTEXT.onLight = (prev, changes) => {
    AUDIO.updateRoom();
    if (changes.length) {
      const off = changes.filter((c) => !c.visible).map((c) => SIGNAL_LABELS[c.name]);
      const on = changes.filter((c) => c.visible).map((c) => SIGNAL_LABELS[c.name]);
      const pct = Math.round(STATE.light * 100);
      let msg = `Light ${pct}%: `;
      if (off.length) msg += `${off.join(', ')} faded out`;
      if (on.length) msg += `${off.length ? '; ' : ''}${on.join(', ')} came back`;
      announce(msg + '. Sound and text stay.');
      RENDER.showBadge([
        STATE.light < prev ? `darker · ${pct}%` : `brighter · ${pct}%`,
        off.length ? `− ${off.join(', ')}` : `+ ${on.join(', ')}`,
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
      announce(`Too fast: wait ${(res.waitMs / 1000).toFixed(1)} s before the next edit.`);
      return;
    }
    RENDER.addFlash(row, step, res.on ? 'on' : 'off');
    if (res.on) AUDIO.playNote(row); // immediate preview
    const hidden = res.on && !RULES.signalVisible('notes', STATE.light) ? ' Too dark to show it: listen.' : '';
    announce(`${res.on ? 'Added' : 'Removed'} ${RULES.noteName(row)} at step ${step + 1}.${hidden}`);
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
    announce(`Cursor: ${RULES.noteName(row)}, step ${step + 1}, ${STATE.pattern[row][step] ? 'has a note' : 'empty'}.`);
  }

  function togglePlay() {
    AUDIO.init();
    if (STATE.playing) {
      SEQ.pause();
      announce(`Paused. ${SEQ.countStored()} notes are kept.`);
    } else {
      SEQ.play();
      announce(`Playing at ${RULES.bpmFromLight(STATE.light)} BPM.`);
    }
    playBtn.setAttribute('aria-pressed', String(STATE.playing));
    playBtn.firstChild.textContent = STATE.playing ? '❚❚ Pause ' : '▶ Play ';
    updatePanel();
  }

  function nudgeLight(dir) {
    if (STATE.cameraOn) {
      announce('The camera is measuring the light. Stop the camera (C) to use the slider or keys.');
      return;
    }
    CONTEXT.setLight(STATE.light + dir * CONFIG.light.keyStep, 'manual');
  }

  function changeFrame(dw, dh) {
    resizeSource = 'Frame';
    CONTEXT.changeFrame(dw * CONFIG.frame.step, dh * CONFIG.frame.step);
  }

  function resetFrame() {
    resizeSource = 'Frame';
    CONTEXT.resetFrame();
    announce('Frame reset to the full window.');
  }

  function updateCameraUI() {
    camBtn.setAttribute('aria-pressed', String(STATE.cameraOn));
    camBtn.firstChild.textContent = STATE.cameraOn ? '■ Stop camera ' : '◉ Measure light with camera ';
    slider.disabled = STATE.cameraOn;
    $('cam-figure').hidden = !STATE.cameraOn;
  }

  async function toggleCamera() {
    if (STATE.cameraOn) {
      CONTEXT.stopCamera(video);
      announce('Camera off. Use the slider or D / B keys for light.');
      updateCameraUI();
      updatePanel();
      return;
    }
    camBtn.disabled = true;
    announce('Asking for camera permission…');
    try {
      await CONTEXT.startCamera(video, preview);
      announce('Camera on. Only the average brightness is used; the video never leaves your device.');
    } catch (err) {
      announce(`Camera unavailable (${err.name || err.message}). Use the slider or D / B keys instead.`);
    } finally {
      camBtn.disabled = false;
      updateCameraUI();
      updatePanel();
    }
  }

  // ---------------------------------------------------------------------
  // INPUTS
  // ---------------------------------------------------------------------
  // Pointer / touch
  canvas.addEventListener('pointerdown', (e) => {
    const r = canvas.getBoundingClientRect();
    const cell = RENDER.cellAt(e.clientX - r.left, e.clientY - r.top);
    if (!cell) return;
    STATE.cursor = { row: cell.row, step: cell.step };
    STATE.cursorVisible = false;
    editCell(cell.row, cell.step);
  });

  // Keyboard (alternative to pointer, window dragging and camera)
  const KEYMAP = {
    arrowleft: () => moveCursor(0, -1),
    arrowright: () => moveCursor(0, 1),
    arrowup: () => moveCursor(1, 0),
    arrowdown: () => moveCursor(-1, 0),
    ' ': () => { STATE.cursorVisible = true; clampCursor(); editCell(STATE.cursor.row, STATE.cursor.step); },
    enter: () => KEYMAP[' '](),
    p: togglePlay,
    d: () => nudgeLight(-1),    // darker
    b: () => nudgeLight(1),     // brighter
    n: () => changeFrame(-1, 0), // narrower
    w: () => changeFrame(1, 0),  // wider
    s: () => changeFrame(0, -1), // shorter
    t: () => changeFrame(0, 1),  // taller
    r: resetFrame,
    c: toggleCamera,
  };

  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey) return;
    const tag = e.target.tagName;
    const key = e.key.toLowerCase();
    if (tag === 'INPUT' && key.startsWith('arrow')) return;                     // let the slider use arrows
    if ((tag === 'BUTTON' || tag === 'A') && (key === ' ' || key === 'enter')) return; // native click
    const action = KEYMAP[key];
    if (!action) return;
    e.preventDefault();
    action();
  });

  // Buttons
  playBtn.addEventListener('click', togglePlay);
  camBtn.addEventListener('click', toggleCamera);
  $('clear-btn').addEventListener('click', () => { SEQ.clear(); announce('Pattern cleared.'); updatePanel(); });
  $('demo-btn').addEventListener('click', () => { SEQ.clear(); SEQ.seed(); announce('Demo melody restored.'); updatePanel(); });
  document.querySelectorAll('[data-frame]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.frame === 'reset') return resetFrame();
      const [dw, dh] = btn.dataset.frame.split(',').map(Number);
      changeFrame(dw, dh);
    });
  });
  slider.addEventListener('input', () => CONTEXT.setLight(slider.value / 100, 'manual'));

  // Window size → measure (also catches phone rotation and layout changes)
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
