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
  // IN-APP LIVE CODE EDITOR (Modeled on IMA Lab Code Panel)
  // ---------------------------------------------------------------------
  const DEFAULT_CONFIG = JSON.parse(JSON.stringify(CONFIG));
  const DEFAULT_RULES = Object.assign({}, RULES);

  const KNOB_SPECS = [
    { path: 'tempo.darkBpm', step: 4, min: 30, max: 240, note: 'BPM at 0% room light' },
    { path: 'tempo.brightBpm', step: 4, min: 30, max: 240, note: 'BPM at 100% room light' },
    { path: 'signals.gridLines', step: 0.05, min: 0, max: 2, note: 'hide Grid <55% light (0=always, 2=never)' },
    { path: 'signals.ripples', step: 0.05, min: 0, max: 2, note: 'hide Ripples <40% light' },
    { path: 'signals.playhead', step: 0.05, min: 0, max: 2, note: 'hide Playhead ▲ <25% light' },
    { path: 'signals.notes', step: 0.05, min: 0, max: 2, note: 'hide Note Pads <10% light' },
    { path: 'audio.narrowPitchMul', step: 0.05, min: 0.3, max: 2.5, note: 'narrow window pitch ×' },
    { path: 'audio.widePitchMul', step: 0.05, min: 0.3, max: 2.5, note: 'wide window pitch ×' },
    { path: 'audio.echoMixSmall', step: 0.05, min: 0, max: 0.95, note: 'small window echo (0..1)' },
    { path: 'audio.echoMixLarge', step: 0.05, min: 0, max: 0.95, note: 'large window echo (0..1)' },
    { path: 'audio.echoMaxSec', step: 0.05, min: 0.05, max: 1.5, note: 'large room echo delay (s)' },
    { path: 'audio.echoFeedbackLarge', step: 0.05, min: 0, max: 0.88, note: 'echo repeats (0..0.88)' },
    { path: 'audio.brightWave', type: 'choice', options: ['triangle', 'sine', 'square', 'sawtooth'], note: 'bright room wave' },
    { path: 'audio.darkWave', type: 'choice', options: ['sine', 'triangle', 'square', 'sawtooth'], note: 'dark room wave' },
    { path: 'audio.rootMidi', step: 1, min: 36, max: 72, note: 'base pitch (48=C3, 60=C4)' },
    { path: 'edits.cooldownMs', step: 100, min: 0, max: 5000, note: 'ms wait between clicks' },
  ];

  const DEFAULT_RULES_CODE = [
    '// Edit any rule function below & click [▶ APPLY CODE] (Ctrl+Enter):',
    'RULES.pitchMultiplier = function (gridW) {',
    '  // Narrow window → narrowPitchMul; Wide window → widePitchMul',
    '  return lerp(CONFIG.audio.narrowPitchMul, CONFIG.audio.widePitchMul, RULES.widthRatio(gridW));',
    '};',
    '',
    'RULES.echoMix = function (gridW, gridH) {',
    '  // Small window area → dry studio; Large window area → hall echo',
    '  return lerp(CONFIG.audio.echoMixSmall, CONFIG.audio.echoMixLarge, RULES.roomSizeRatio(gridW, gridH));',
    '};',
    '',
    'RULES.echoSeconds = function (gridW, gridH) {',
    '  return lerp(CONFIG.audio.echoMinSec, CONFIG.audio.echoMaxSec, RULES.roomSizeRatio(gridW, gridH));',
    '};',
    '',
    'RULES.bpmFromLight = function (light) {',
    '  // 0% light → darkBpm; 100% light → brightBpm',
    '  return Math.round(lerp(CONFIG.tempo.darkBpm, CONFIG.tempo.brightBpm, light));',
    '};',
    '',
    'RULES.waveFromLight = function (light) {',
    '  return light >= 0.5 ? CONFIG.audio.brightWave : CONFIG.audio.darkWave;',
    '};',
    '',
    'RULES.signalVisible = function (name, light) {',
    '  // Visual layer stays visible while room light >= threshold',
    '  return light >= CONFIG.signals[name];',
    '};',
    '',
    'RULES.midiForCell = function (row, step = 0) {',
    '  // Row A (0) = high octave, Row H (7) = low; steps 1→8 climb scale',
    '  const s = CONFIG.audio.scale;',
    '  const rowOffset = (CONFIG.grid.rows - 1 - row) * 3;',
    '  return CONFIG.audio.rootMidi + rowOffset + s[step % s.length];',
    '};',
  ].join('\n');

  function getByPath(obj, path) {
    const [g, k] = path.split('.');
    return obj[g][k];
  }

  function setByPath(obj, path, val) {
    const [g, k] = path.split('.');
    obj[g][k] = val;
  }

  let knobLineCount = 19;

  function setCodeStatus(msg, kind = '') {
    const el = $('code-status');
    if (!el) return;
    el.textContent = msg;
    el.className = 'code-status' + (kind ? ' ' + kind : '');
  }

  function playPreviewTone() {
    if (!STATE.playing) {
      AUDIO.init();
      AUDIO.playNote(3, 4);
      RENDER.addRipple(3, 4);
    }
  }

  function buildCodePanel() {
    const el = $('code-knobs');
    if (!el) return;
    const line = (n, html, path) =>
      `<span class="ln"${path ? ` data-knob-line="${path}"` : ''}><i>${n}</i><span>${html}</span></span>`;
    let n = 1;
    let html =
      line(n++, '<span class="c">// 1) DESIGN PARAMETERS (js/config.js) · change any value, test at once</span>') +
      line(n++, '<span class="k">const</span> CONFIG = {');

    KNOB_SPECS.forEach((k) => {
      let field;
      if (k.type === 'choice') {
        const opts = k.options.map((o) => `<option value="${o}">'${o}'</option>`).join('');
        field = `<select data-knob="${k.path}" aria-label="${k.path}">${opts}</select>`;
      } else {
        field = `<input type="number" data-knob="${k.path}" step="${k.step}" min="${k.min}" max="${k.max}" aria-label="${k.path}">`;
      }
      html += line(n++, `  ${k.path}: ${field}, <span class="c">// ${k.note}</span>`, k.path);
    });
    html += line(n++, '};');
    knobLineCount = n - 1;
    el.innerHTML = html;

    el.querySelectorAll('[data-knob]').forEach((input) => {
      input.addEventListener('input', () => {
        const path = input.dataset.knob;
        const spec = KNOB_SPECS.find((q) => q.path === path);
        if (input.type === 'number' && (input.value === '' || Number.isNaN(Number(input.value)))) return;
        const val = spec.type === 'choice' ? input.value : Number(input.value);
        setByPath(CONFIG, path, val);
        syncCodeKnobs();
        AUDIO.updateRoom();
        updatePanel();
        if (path.startsWith('audio.')) playPreviewTone();
        const msg = `LIVE CONFIG: ${path} = ${val} · ${RULES.bpmFromLight(STATE.light)} BPM · ${pitchDesc()} · ${echoDesc()}`;
        setCodeStatus(`✓ ${msg}`, 'ok');
        announce(msg);
        RENDER.showBadge([`CODE EDIT: ${path} = ${val}`, `${pitchDesc()} · ${echoDesc()}`]);
      });
    });

    const editor = $('rules-editor');
    if (editor) {
      editor.value = DEFAULT_RULES_CODE;
      editor.addEventListener('input', updateRulesGutter);
      editor.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          applyRulesCode();
        } else if (e.key === 'Tab') {
          e.preventDefault();
          const s = editor.selectionStart, end = editor.selectionEnd;
          editor.value = editor.value.substring(0, s) + '  ' + editor.value.substring(end);
          editor.selectionStart = editor.selectionEnd = s + 2;
        }
      });
    }
    syncCodeKnobs();
    updateRulesGutter();
  }

  function syncCodeKnobs() {
    const el = $('code-knobs');
    if (!el) return;
    el.querySelectorAll('[data-knob]').forEach((input) => {
      const path = input.dataset.knob;
      const curVal = getByPath(CONFIG, path);
      const defVal = getByPath(DEFAULT_CONFIG, path);
      if (document.activeElement !== input) input.value = curVal;
      const ln = input.closest('.ln');
      if (ln) ln.classList.toggle('changed', curVal !== defVal);
    });
  }

  function updateRulesGutter() {
    const editor = $('rules-editor');
    const gutter = $('rules-gutter');
    if (!editor || !gutter) return;
    const lines = editor.value.split('\n').length;
    const nums = [];
    for (let i = 1; i <= lines; i++) nums.push(knobLineCount + i);
    gutter.textContent = nums.join('\n');
    const h = Math.max(260, lines * 18 + 20);
    editor.style.height = `${h}px`;
  }

  function applyRulesCode() {
    const editor = $('rules-editor');
    if (!editor) return;
    const backup = Object.assign({}, RULES);
    try {
      const runner = new Function('CONFIG', 'RULES', 'STATE', 'clamp', 'lerp', editor.value);
      runner(CONFIG, RULES, STATE, clamp, lerp);
      // Smoke-test edited rules so a runtime bug never breaks the render/audio loop
      RULES.pitchMultiplier(STATE.gridW);
      RULES.echoMix(STATE.gridW, STATE.gridH);
      RULES.echoSeconds(STATE.gridW, STATE.gridH);
      RULES.bpmFromLight(STATE.light);
      RULES.waveFromLight(STATE.light);
      RULES.signalVisible('notes', STATE.light);
      RULES.midiForCell(0, 0);

      syncCodeKnobs();
      AUDIO.updateRoom();
      updatePanel();
      playPreviewTone();
      const summary = `✓ APPLIED rules.js · ${RULES.bpmFromLight(STATE.light)} BPM · ${pitchDesc()} · ${echoDesc()}`;
      setCodeStatus(summary, 'ok');
      announce(summary);
      RENDER.showBadge(['★ LIVE CODE APPLIED (rules.js)', `${pitchDesc()} · ${echoDesc()}`]);
    } catch (err) {
      Object.assign(RULES, backup);
      setCodeStatus(`✕ ERROR: ${err.message}`, 'err');
      announce(`CODE ERROR: ${err.message}`);
    }
  }

  function resetLiveCode() {
    const fresh = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    Object.keys(fresh).forEach((k) => { CONFIG[k] = fresh[k]; });
    Object.assign(RULES, DEFAULT_RULES);
    if ($('rules-editor')) $('rules-editor').value = DEFAULT_RULES_CODE;
    document.querySelectorAll('.preset-btn').forEach((b) => b.classList.remove('active'));
    syncCodeKnobs();
    updateRulesGutter();
    AUDIO.updateRoom();
    updatePanel();
    playPreviewTone();
    setCodeStatus('↺ RESET — All CONFIG parameters & RULES restored to defaults', 'ok');
    announce('LIVE CODE RESET TO DEFAULTS');
    RENDER.showBadge(['↺ CODE RESET TO DEFAULT', `${pitchDesc()} · ${echoDesc()}`]);
  }

  function applyPreset(name, btn) {
    document.querySelectorAll('.preset-btn').forEach((b) => b.classList.toggle('active', b === btn));
    if (name === 'echo2x') {
      CONFIG.audio.echoMixLarge = 0.78;
      CONFIG.audio.echoMaxSec = 0.52;
      CONFIG.audio.echoFeedbackLarge = 0.68;
      setCodeStatus('✓ PRESET: 2× Hall Echo (echoMixLarge=0.78, echoMaxSec=0.52s)', 'ok');
      RENDER.showBadge(['PRESET: 2× HALL ECHO', 'Large window echo increased to 78% (0.52s)']);
    } else if (name === 'invertTempo') {
      CONFIG.tempo.darkBpm = 156;
      CONFIG.tempo.brightBpm = 64;
      setCodeStatus('✓ PRESET: Fast in Dark (darkBpm=156, brightBpm=64)', 'ok');
      RENDER.showBadge(['PRESET: FAST IN DARK', '0% light = 156 BPM · 100% light = 64 BPM']);
    } else if (name === 'cooldown') {
      CONFIG.edits.cooldownMs = 1000;
      setCodeStatus('✓ PRESET: 1s Edit Cooldown (CONFIG.edits.cooldownMs = 1000)', 'ok');
      RENDER.showBadge(['PRESET: 1s EDIT COOLDOWN', 'Click pads rapidly to see × blocked flash']);
    } else if (name === 'keepPlayhead') {
      CONFIG.signals.playhead = 0;
      setCodeStatus('✓ PRESET: Playhead ▲ Always Visible (CONFIG.signals.playhead = 0)', 'ok');
      RENDER.showBadge(['PRESET: KEEP ▲ IN DARK', 'Playhead threshold set to 0% light']);
    } else if (name === 'invertPitch') {
      CONFIG.audio.narrowPitchMul = 0.68;
      CONFIG.audio.widePitchMul = 1.50;
      setCodeStatus('✓ PRESET: Inverted Pitch (Narrow=0.68× Bass, Wide=1.50× High)', 'ok');
      RENDER.showBadge(['PRESET: INVERTED PITCH RULE', 'Narrow window = Deep, Wide window = High']);
    } else if (name === 'synth8bit') {
      CONFIG.audio.brightWave = 'square';
      CONFIG.audio.darkWave = 'sawtooth';
      setCodeStatus('✓ PRESET: 8-Bit Chiptune Synth (square / sawtooth waves)', 'ok');
      RENDER.showBadge(['PRESET: 8-BIT SYNTH WAVE', 'Bright = square wave, Dark = sawtooth']);
    }
    syncCodeKnobs();
    AUDIO.updateRoom();
    updatePanel();
    playPreviewTone();
  }

  function toggleCodeWin(force) {
    const win = $('code-win');
    if (!win) return;
    const open = typeof force === 'boolean' ? force : win.hidden;
    win.hidden = !open;
    if ($('code-btn')) $('code-btn').setAttribute('aria-pressed', String(open));
    if ($('code-top-btn')) $('code-top-btn').setAttribute('aria-pressed', String(open));
    if (open) {
      syncCodeKnobs();
      updateRulesGutter();
      announce('LIVE CODE EDITOR OPENED — EDIT CONFIG KNOBS OR RULES.JS');
    } else {
      announce('LIVE CODE EDITOR CLOSED');
      canvas.focus({ preventScroll: true });
    }
  }
  window.toggleCodeWin = toggleCodeWin;

  // Allow dragging the code window by its Win95 titlebar
  (function initCodeDrag() {
    const handle = $('code-drag-handle');
    const win = $('code-win');
    if (!handle || !win) return;
    let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;
    handle.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      dragging = true;
      const r = win.getBoundingClientRect();
      sx = e.clientX; sy = e.clientY;
      ox = r.left; oy = r.top;
      win.style.left = `${ox}px`;
      win.style.top = `${oy}px`;
      win.style.right = 'auto';
      handle.setPointerCapture(e.pointerId);
    });
    handle.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const nx = clamp(ox + (e.clientX - sx), 4, window.innerWidth - 120);
      const ny = clamp(oy + (e.clientY - sy), 4, window.innerHeight - 80);
      win.style.left = `${nx}px`;
      win.style.top = `${ny}px`;
    });
    handle.addEventListener('pointerup', () => { dragging = false; });
  })();

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
    e: () => toggleCodeWin(),
  };

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && $('code-win') && !$('code-win').hidden) {
      e.preventDefault();
      toggleCodeWin(false);
      return;
    }
    if (e.target.closest && e.target.closest('#code-win input, #code-win select, #code-win textarea')) {
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
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
  if ($('code-btn')) $('code-btn').onclick = () => toggleCodeWin();
  if ($('code-top-btn')) $('code-top-btn').onclick = () => toggleCodeWin();
  if ($('code-close-btn')) $('code-close-btn').onclick = () => toggleCodeWin(false);
  if ($('code-run-btn')) $('code-run-btn').addEventListener('click', applyRulesCode);
  if ($('code-reset-btn')) $('code-reset-btn').addEventListener('click', resetLiveCode);
  document.querySelectorAll('[data-preset]').forEach((btn) => {
    btn.addEventListener('click', () => applyPreset(btn.dataset.preset, btn));
  });

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
  buildCodePanel();
  RENDER.draw();
})();
