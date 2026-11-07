/* =========================================================================
   SPATIAL RESONATOR · RENDER (Win95 / Winamp / Y2K Edition)
   -------------------------------------------------------------------------
   Draws the 8×8 sequencer stage (rows A–H top-to-bottom, steps 1–8
   left-to-right). Cells never disappear when resizing; instead, the cells,
   ripples, pitch and echo reshape with the window.
   ========================================================================= */
const MONO = '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

function drawBevelBox(c, x, y, w, h, fill, raised = true) {
  c.fillStyle = fill;
  c.fillRect(x, y, w, h);
  c.lineWidth = 2;
  c.strokeStyle = raised ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.75)';
  c.beginPath();
  c.moveTo(x, y + h);
  c.lineTo(x, y);
  c.lineTo(x + w, y);
  c.stroke();
  c.strokeStyle = raised ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.45)';
  c.beginPath();
  c.moveTo(x, y + h);
  c.lineTo(x + w, y + h);
  c.lineTo(x + w, y);
  c.stroke();
}

const RENDER = {
  canvas: null,
  ctx: null,
  dpr: 1,
  geo: null,
  ripples: [],
  flashes: [],
  badge: null,
  PAD: { left: 46, top: 26, right: 16, bottom: 24 },

  setup(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  },

  resize() {
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(STATE.stageW * this.dpr);
    this.canvas.height = Math.round(STATE.stageH * this.dpr);
    this.layout();
  },

  layout() {
    const P = this.PAD;
    const gx = (STATE.stageW - STATE.gridW) / 2;
    const gy = (STATE.stageH - STATE.gridH) / 2;
    const w = Math.max(10, STATE.gridW - P.left - P.right);
    const h = Math.max(10, STATE.gridH - P.top - P.bottom);
    this.geo = {
      gx, gy, w, h,
      x0: gx + P.left, y0: gy + P.top,
      cellW: w / STATE.steps, cellH: h / STATE.notes,
    };
  },

  // Top-to-bottom indexing: row 0 = 'A' (top), row 7 = 'H' (bottom).
  // Every cell (A1 … H8) always stays in its exact row & column!
  cellRect(row, step) {
    const g = this.geo;
    return { x: g.x0 + step * g.cellW, y: g.y0 + row * g.cellH, w: g.cellW, h: g.cellH };
  },

  cellAt(px, py) {
    const g = this.geo;
    const step = Math.floor((px - g.x0) / g.cellW);
    const row = Math.floor((py - g.y0) / g.cellH);
    if (step < 0 || step >= STATE.steps || row < 0 || row >= STATE.notes) return null;
    return { row, step };
  },

  rowColor(row) {
    const palette = CONFIG.colors.rows;
    return palette[row % palette.length];
  },

  addRipple(row, step) { this.ripples.push({ row, step, r: 8, alpha: 1 }); },
  addFlash(row, step, kind) { this.flashes.push({ row, step, kind, t: performance.now() }); },
  showBadge(lines) { this.badge = { lines, t: performance.now() }; },

  draw() {
    const c = this.ctx, g = this.geo, L = STATE.light, now = performance.now();
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    // Stage background shifts with room light
    const a = CONFIG.colors.darkRoom, b = CONFIG.colors.brightRoom;
    const bg = a.map((v, i) => Math.round(lerp(v, b[i], L)));
    c.fillStyle = `rgb(${bg})`;
    c.fillRect(0, 0, STATE.stageW, STATE.stageH);

    // Subtle CRT scanlines
    c.fillStyle = 'rgba(0, 0, 0, 0.18)';
    for (let y = 0; y < STATE.stageH; y += 4) c.fillRect(0, y, STATE.stageW, 1);

    // 0. FRAME — diagonal cyber hatch outside the active frame
    if (STATE.frameW < 1 || STATE.frameH < 1) {
      c.save();
      c.beginPath();
      c.rect(0, 0, STATE.stageW, STATE.stageH);
      c.rect(g.gx, g.gy, STATE.gridW, STATE.gridH);
      c.clip('evenodd');
      c.fillStyle = 'rgba(0, 0, 0, 0.48)';
      c.fillRect(0, 0, STATE.stageW, STATE.stageH);
      c.strokeStyle = 'rgba(0, 240, 255, 0.22)';
      c.lineWidth = 1;
      c.beginPath();
      for (let x = -STATE.stageH; x < STATE.stageW; x += 12) {
        c.moveTo(x, 0);
        c.lineTo(x + STATE.stageH, STATE.stageH);
      }
      c.stroke();
      c.restore();
      c.setLineDash([6, 4]);
      c.strokeStyle = '#ffe600';
      c.lineWidth = 2;
      c.strokeRect(g.gx + 1, g.gy + 1, STATE.gridW - 2, STATE.gridH - 2);
      c.setLineDash([]);
    }

    // 1. GRID LINES + ALPHABETICAL ROW LABELS (A–H) & COLUMN NUMBERS (1–8)
    if (RULES.signalVisible('gridLines', L)) {
      for (let r = 0; r < STATE.notes; r++) {
        const rowCol = this.rowColor(r);
        for (let s = 0; s < STATE.steps; s++) {
          const rc = this.cellRect(r, s);
          c.fillStyle = s % 2 === 0 ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.18)';
          c.fillRect(rc.x + 2, rc.y + 2, rc.w - 4, rc.h - 4);
          c.strokeStyle = 'rgba(140, 195, 255, 0.24)';
          c.lineWidth = 1;
          c.strokeRect(Math.round(rc.x) + 0.5, Math.round(rc.y) + 0.5, Math.round(rc.w), Math.round(rc.h));
        }
        // Left row badge: A, B, C, D, E, F, G, H (top → bottom)
        const rc0 = this.cellRect(r, 0);
        const cy = rc0.y + rc0.h / 2;
        c.fillStyle = rowCol;
        c.fillRect(g.x0 - 38, cy - 10, 30, 20);
        c.strokeStyle = '#000';
        c.lineWidth = 1.5;
        c.strokeRect(g.x0 - 38, cy - 10, 30, 20);
        c.fillStyle = '#000';
        c.font = `900 12px ${MONO}`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(RULES.rowLabel(r), g.x0 - 23, cy + 0.5);
      }
      // Column numbers 1 – 8 along top
      c.font = `900 11px ${MONO}`;
      c.fillStyle = '#ffe600';
      c.textAlign = 'center';
      c.textBaseline = 'bottom';
      for (let s = 0; s < STATE.steps; s++) {
        const rc = this.cellRect(0, s);
        c.fillText(String(s + 1), rc.x + rc.w / 2, g.y0 - 5);
      }
    }

    // 2. PLAYHEAD (signal: playhead) — neon lime column + ▲ (playing) / △ (paused)
    if (STATE.step >= 0 && STATE.step < STATE.steps && RULES.signalVisible('playhead', L)) {
      const rc = this.cellRect(0, STATE.step);
      if (STATE.playing) {
        c.fillStyle = 'rgba(184, 255, 1, 0.18)';
        c.fillRect(rc.x, g.y0, rc.w, g.h);
        c.strokeStyle = '#b8ff01';
        c.lineWidth = 2;
        c.strokeRect(rc.x + 1, g.y0 + 1, rc.w - 2, g.h - 2);
      }
      const cx = rc.x + rc.w / 2, by = g.y0 + g.h + 4;
      c.beginPath();
      c.moveTo(cx, by);
      c.lineTo(cx - 8, by + 14);
      c.lineTo(cx + 8, by + 14);
      c.closePath();
      c.lineWidth = 2;
      c.strokeStyle = '#b8ff01';
      c.fillStyle = '#b8ff01';
      if (STATE.playing) c.fill(); else c.stroke();
    }

    // 3. STORED NOTE PADS (signal: notes)
    if (RULES.signalVisible('notes', L)) {
      for (let r = 0; r < STATE.notes; r++) {
        const rowCol = this.rowColor(r);
        for (let s = 0; s < STATE.steps; s++) {
          if (!STATE.pattern[r][s]) continue;
          const rc = this.cellRect(r, s);
          const sounding = STATE.playing && s === STATE.step;
          const padM = sounding ? 3 : 5;
          const px = rc.x + padM, py = rc.y + padM;
          const pw = Math.max(10, rc.w - padM * 2), ph = Math.max(10, rc.h - padM * 2);

          drawBevelBox(c, px, py, pw, ph, sounding ? '#ffffff' : rowCol, true);

          if (sounding) {
            c.strokeStyle = '#ffe600';
            c.lineWidth = 3;
            c.strokeRect(px - 2, py - 2, pw + 4, ph + 4);
          }

          // Coordinate label (A1 … H8) inside pad so meaning is never color-only
          const coord = RULES.cellLabel(r, s);
          c.fillStyle = '#000';
          c.font = `900 ${pw > 44 ? 11 : 9}px ${MONO}`;
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          const text = pw > 52 ? (sounding ? `★ ${coord}` : coord) : coord;
          c.fillText(text, rc.x + rc.w / 2, rc.y + rc.h / 2 + 0.5);
        }
      }
    }

    // 4. RIPPLES (signal: ripples) — radius scales with window width
    const showRipples = RULES.signalVisible('ripples', L);
    const maxR = RULES.rippleMaxRadius(STATE.gridW);
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const p = this.ripples[i];
      if (showRipples && p.row < STATE.notes && p.step < STATE.steps) {
        const rc = this.cellRect(p.row, p.step);
        const cx = rc.x + rc.w / 2, cy = rc.y + rc.h / 2;
        c.save();
        c.globalAlpha = Math.max(0, p.alpha);
        c.strokeStyle = this.rowColor(p.row);
        c.lineWidth = 2.5;
        c.beginPath();
        c.arc(cx, cy, p.r, 0, Math.PI * 2);
        c.stroke();
        c.strokeStyle = '#ffe600';
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(cx - p.r - 4, cy); c.lineTo(cx - p.r + 4, cy);
        c.moveTo(cx + p.r - 4, cy); c.lineTo(cx + p.r + 4, cy);
        c.moveTo(cx, cy - p.r - 4); c.lineTo(cx, cy - p.r + 4);
        c.moveTo(cx, cy + p.r - 4); c.lineTo(cx, cy + p.r + 4);
        c.stroke();
        c.restore();
      }
      p.r += CONFIG.ripple.growPx * (maxR / 90);
      p.alpha -= CONFIG.ripple.fade;
      if (p.alpha <= 0 || p.r > maxR) this.ripples.splice(i, 1);
    }

    // 4b. DARK-ROOM EXPLANATION BANNER — explains why visual layers are hidden
    const hiddenLayers = [];
    if (!RULES.signalVisible('gridLines', L)) hiddenLayers.push('Grid Lines (<55%)');
    if (!RULES.signalVisible('ripples', L)) hiddenLayers.push('Wave Ripples (<40%)');
    if (!RULES.signalVisible('playhead', L)) hiddenLayers.push('Playhead ▲ (<25%)');
    if (!RULES.signalVisible('notes', L)) hiddenLayers.push('Note Pads (<10%)');
    if (hiddenLayers.length > 0) {
      const pct = Math.round(L * 100);
      const msg = `☀ ROOM LIGHT ${pct}% — HIDDEN: ${hiddenLayers.join(', ')} · Follow by listening`;
      c.save();
      c.font = `800 11px ${MONO}`;
      const tw = Math.min(STATE.stageW - 16, c.measureText(msg).width + 18);
      const bx = Math.round((STATE.stageW - tw) / 2), by = 4;
      c.fillStyle = 'rgba(7, 11, 18, 0.88)';
      c.fillRect(bx, by, tw, 20);
      c.strokeStyle = '#ff2a85';
      c.lineWidth = 1.5;
      c.strokeRect(bx + 0.5, by + 0.5, tw - 1, 19);
      c.fillStyle = '#ffe600';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(msg, STATE.stageW / 2, by + 10.5);
      c.restore();
    }

    // 5. CLICK FLASH — always visible (acknowledges action even in 0% light)
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i];
      const age = (now - f.t) / CONFIG.flashMs;
      if (age >= 1) { this.flashes.splice(i, 1); continue; }
      const rc = this.cellRect(f.row, f.step), a = 1 - age;
      const cx = rc.x + rc.w / 2, cy = rc.y + rc.h / 2;
      c.save();
      c.globalAlpha = a;
      c.strokeStyle = f.kind === 'blocked' ? '#ff2a85' : '#b8ff01';
      c.lineWidth = 3;
      c.strokeRect(rc.x + 2, rc.y + 2, rc.w - 4, rc.h - 4);
      c.fillStyle = '#ffe600';
      c.font = `900 20px ${MONO}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(f.kind === 'on' ? '+' : f.kind === 'off' ? '−' : '×', cx, cy);
      c.restore();
    }

    // 6. KEYBOARD CURSOR — bright yellow dashed box
    if (STATE.cursorVisible) {
      const rc = this.cellRect(STATE.cursor.row, STATE.cursor.step);
      c.setLineDash([5, 3]);
      c.strokeStyle = '#ffe600';
      c.lineWidth = 2.5;
      c.strokeRect(rc.x + 3, rc.y + 3, rc.w - 6, rc.h - 6);
      c.setLineDash([]);
    }

    // 7. WIN95 POPUP BADGE — shows context changes right on the stage
    if (this.badge) {
      const age = (now - this.badge.t) / CONFIG.badgeMs;
      if (age >= 1) this.badge = null;
      else {
        const a = Math.min(1, (1 - age) * 3);
        const [big, small] = this.badge.lines;
        c.save();
        c.globalAlpha = a;
        c.font = `900 18px ${MONO}`;
        const wBig = c.measureText(big).width;
        c.font = `800 12px ${MONO}`;
        const wSmall = small ? c.measureText(small).width : 0;
        const bw = Math.max(wBig, wSmall) + 40, bh = small ? 68 : 48;
        const bx = (STATE.stageW - bw) / 2, by = (STATE.stageH - bh) / 2;

        drawBevelBox(c, bx, by, bw, bh, '#cfd0d4', true);
        c.fillStyle = '#00089c';
        c.fillRect(bx + 3, by + 3, bw - 6, 16);
        c.fillStyle = '#ffe600';
        c.font = `900 10px ${MONO}`;
        c.textAlign = 'left';
        c.textBaseline = 'middle';
        c.fillText('★ CONTEXT CHANGE', bx + 8, by + 11);

        c.fillStyle = '#000';
        c.textAlign = 'center';
        c.font = `900 17px ${MONO}`;
        c.fillText(big, STATE.stageW / 2, by + 34);
        if (small) {
          c.fillStyle = '#00089c';
          c.font = `800 11px ${MONO}`;
          c.fillText(small, STATE.stageW / 2, by + 54);
        }
        c.restore();
      }
    }

    requestAnimationFrame(() => this.draw());
  },
};
