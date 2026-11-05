/* =========================================================================
   SPATIAL RESONATOR · RENDER
   -------------------------------------------------------------------------
   Draws the grid on the canvas. Each feedback signal is drawn only if
   RULES.signalVisible(name, light) says so — the room decides what the
   system shows. Click flash, keyboard cursor and badges are always drawn.
   Meaning never relies on colour alone: shapes, arrows and text are used.
   ========================================================================= */
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

function roundRectPath(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

const RENDER = {
  canvas: null,
  ctx: null,
  dpr: 1,
  geo: null,
  ripples: [],
  flashes: [],
  badge: null,
  PAD: { left: 44, top: 22, right: 30, bottom: 22 },

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

  // Where the grid sits inside the stage (centred inside the frame).
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

  // Row 0 is the lowest note, drawn at the bottom.
  cellRect(row, step) {
    const g = this.geo;
    return { x: g.x0 + step * g.cellW, y: g.y0 + (STATE.notes - 1 - row) * g.cellH, w: g.cellW, h: g.cellH };
  },

  cellAt(px, py) {
    const g = this.geo;
    const step = Math.floor((px - g.x0) / g.cellW);
    const fromTop = Math.floor((py - g.y0) / g.cellH);
    if (step < 0 || step >= STATE.steps || fromTop < 0 || fromTop >= STATE.notes) return null;
    return { row: STATE.notes - 1 - fromTop, step };
  },

  addRipple(row, step) { this.ripples.push({ row, step, r: 6, alpha: 1 }); },
  addFlash(row, step, kind) { this.flashes.push({ row, step, kind, t: performance.now() }); },
  showBadge(lines) { this.badge = { lines, t: performance.now() }; },

  // Stage colour follows the room light; ink flips to stay readable.
  colors() {
    const a = CONFIG.colors.darkRoom, b = CONFIG.colors.brightRoom;
    const bg = a.map((v, i) => Math.round(lerp(v, b[i], STATE.light)));
    const lum = (0.2126 * bg[0] + 0.7152 * bg[1] + 0.0722 * bg[2]) / 255;
    const brightBg = lum > 0.42;
    return {
      bg,
      ink: brightBg ? [18, 19, 24] : [242, 239, 230],
      accent: brightBg ? [150, 60, 10] : [242, 165, 65],
    };
  },

  draw() {
    const c = this.ctx, g = this.geo, L = STATE.light, col = this.colors(), now = performance.now();
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.fillStyle = `rgb(${col.bg})`;
    c.fillRect(0, 0, STATE.stageW, STATE.stageH);

    // 0. FRAME — hatch the area outside the frame (keyboard alternative to resizing)
    if (STATE.frameW < 1 || STATE.frameH < 1) {
      c.save();
      c.beginPath();
      c.rect(0, 0, STATE.stageW, STATE.stageH);
      c.rect(g.gx, g.gy, STATE.gridW, STATE.gridH);
      c.clip('evenodd');
      c.strokeStyle = rgba(col.ink, 0.14);
      c.lineWidth = 1;
      c.beginPath();
      for (let x = -STATE.stageH; x < STATE.stageW; x += 12) {
        c.moveTo(x, 0);
        c.lineTo(x + STATE.stageH, STATE.stageH);
      }
      c.stroke();
      c.restore();
      c.setLineDash([6, 4]);
      c.strokeStyle = rgba(col.ink, 0.55);
      c.strokeRect(g.gx + 0.5, g.gy + 0.5, STATE.gridW - 1, STATE.gridH - 1);
      c.setLineDash([]);
    }

    // 1. GRID LINES + NOTE NAMES (signal: gridLines)
    if (RULES.signalVisible('gridLines', L)) {
      c.strokeStyle = rgba(col.ink, 0.2);
      c.lineWidth = 1;
      c.beginPath();
      for (let s = 0; s <= STATE.steps; s++) {
        const x = Math.round(g.x0 + s * g.cellW) + 0.5;
        c.moveTo(x, g.y0);
        c.lineTo(x, g.y0 + g.h);
      }
      for (let r = 0; r <= STATE.notes; r++) {
        const y = Math.round(g.y0 + r * g.cellH) + 0.5;
        c.moveTo(g.x0, y);
        c.lineTo(g.x0 + g.w, y);
      }
      c.stroke();
      c.fillStyle = rgba(col.ink, 0.65);
      c.font = `11px ${MONO}`;
      c.textAlign = 'right';
      c.textBaseline = 'middle';
      for (let r = 0; r < STATE.notes; r++) {
        const rc = this.cellRect(r, 0);
        c.fillText(RULES.noteName(r), g.x0 - 8, rc.y + rc.h / 2);
      }
    }

    // 2. PLAYHEAD (signal: playhead) — filled ▲ = playing, outline △ = paused
    if (STATE.step >= 0 && STATE.step < STATE.steps && RULES.signalVisible('playhead', L)) {
      const rc = this.cellRect(0, STATE.step);
      if (STATE.playing) {
        c.fillStyle = rgba(col.ink, 0.12);
        c.fillRect(rc.x, g.y0, rc.w, g.h);
      }
      const cx = rc.x + rc.w / 2, by = g.y0 + g.h + 5;
      c.beginPath();
      c.moveTo(cx, by);
      c.lineTo(cx - 7, by + 12);
      c.lineTo(cx + 7, by + 12);
      c.closePath();
      c.lineWidth = 2;
      c.strokeStyle = c.fillStyle = rgba(col.ink, 0.9);
      if (STATE.playing) c.fill(); else c.stroke();
    }

    // 3. STORED NOTES + FOLDED ARROWS (signal: notes)
    if (RULES.signalVisible('notes', L)) {
      const size = Math.min(g.cellW, g.cellH) * 0.56;
      for (let r = 0; r < STATE.notes; r++) {
        for (let s = 0; s < STATE.steps; s++) {
          if (!STATE.pattern[r][s]) continue;
          const rc = this.cellRect(r, s), cx = rc.x + rc.w / 2, cy = rc.y + rc.h / 2;
          const sounding = STATE.playing && s === STATE.step;
          const k = sounding ? size * 1.2 : size;
          roundRectPath(c, cx - k / 2, cy - k / 2, k, k, 5);
          c.fillStyle = sounding ? rgba(col.accent, 1) : rgba(col.ink, 0.9);
          c.fill();
          if (sounding) {                     // shape change, not only colour
            roundRectPath(c, cx - k / 2 - 5, cy - k / 2 - 5, k + 10, k + 10, 8);
            c.strokeStyle = rgba(col.ink, 0.9);
            c.lineWidth = 2;
            c.stroke();
          }
        }
      }
      // →n : notes kept to the right of the window, ↑n : notes kept above it
      c.font = `12px ${MONO}`;
      c.fillStyle = rgba(col.ink, 0.9);
      c.textAlign = 'left';
      c.textBaseline = 'middle';
      for (let r = 0; r < STATE.notes; r++) {
        let n = 0;
        for (let s = STATE.steps; s < STATE.pattern[r].length; s++) if (STATE.pattern[r][s]) n++;
        if (n) {
          const rc = this.cellRect(r, 0);
          c.fillText('→' + n, g.x0 + g.w + 4, rc.y + rc.h / 2);
        }
      }
      c.textAlign = 'center';
      c.textBaseline = 'bottom';
      for (let s = 0; s < STATE.steps; s++) {
        let n = 0;
        for (let r = STATE.notes; r < STATE.pattern.length; r++) if (STATE.pattern[r][s]) n++;
        if (n) {
          const rc = this.cellRect(0, s);
          c.fillText('↑' + n, rc.x + rc.w / 2, g.y0 - 4);
        }
      }
    }

    // 4. RIPPLES (signal: ripples) — they keep ageing even when hidden
    const showRipples = RULES.signalVisible('ripples', L);
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const p = this.ripples[i];
      if (showRipples && p.row < STATE.notes && p.step < STATE.steps) {
        const rc = this.cellRect(p.row, p.step);
        c.strokeStyle = rgba(col.accent, p.alpha);
        c.lineWidth = 2;
        c.beginPath();
        c.arc(rc.x + rc.w / 2, rc.y + rc.h / 2, p.r, 0, Math.PI * 2);
        c.stroke();
      }
      p.r += CONFIG.ripple.growPx;
      p.alpha -= CONFIG.ripple.fade;
      if (p.alpha <= 0 || p.r > CONFIG.ripple.maxRadius) this.ripples.splice(i, 1);
    }

    // 5. CLICK FLASH — always (acknowledges the action, even in the dark)
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i];
      const age = (now - f.t) / CONFIG.flashMs;
      if (age >= 1) { this.flashes.splice(i, 1); continue; }
      if (f.row >= STATE.notes || f.step >= STATE.steps) continue;
      const rc = this.cellRect(f.row, f.step), a = 1 - age;
      const cx = rc.x + rc.w / 2, cy = rc.y + rc.h / 2;
      c.strokeStyle = rgba(col.ink, a);
      c.lineWidth = 2;
      c.strokeRect(rc.x + 2, rc.y + 2, rc.w - 4, rc.h - 4);
      c.fillStyle = rgba(col.ink, a);
      c.font = `bold 20px ${MONO}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(f.kind === 'on' ? '+' : f.kind === 'off' ? '−' : '×', cx, cy - Math.min(rc.h * 0.3, 14));
    }

    // 6. KEYBOARD CURSOR — always, once the keyboard is used
    if (STATE.cursorVisible) {
      const rc = this.cellRect(STATE.cursor.row, STATE.cursor.step);
      c.setLineDash([4, 3]);
      c.strokeStyle = rgba(col.ink, 1);
      c.lineWidth = 2;
      c.strokeRect(rc.x + 4, rc.y + 4, rc.w - 8, rc.h - 8);
      c.setLineDash([]);
    }

    // 7. BADGE — always; tells what a context change just did
    if (this.badge) {
      const age = (now - this.badge.t) / CONFIG.badgeMs;
      if (age >= 1) this.badge = null;
      else {
        const a = Math.min(1, (1 - age) * 3);
        const [big, small] = this.badge.lines;
        c.font = `600 22px ${MONO}`;
        const wBig = c.measureText(big).width;
        c.font = `12px ${MONO}`;
        const wSmall = small ? c.measureText(small).width : 0;
        const bw = Math.max(wBig, wSmall) + 36, bh = small ? 66 : 46;
        const bx = (STATE.stageW - bw) / 2, by = (STATE.stageH - bh) / 2;
        roundRectPath(c, bx, by, bw, bh, 10);
        c.fillStyle = rgba(col.ink, 0.92 * a);
        c.fill();
        c.fillStyle = rgba(col.bg, a);
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.font = `600 22px ${MONO}`;
        c.fillText(big, STATE.stageW / 2, by + 24);
        if (small) {
          c.font = `12px ${MONO}`;
          c.fillText(small, STATE.stageW / 2, by + 48);
        }
      }
    }

    requestAnimationFrame(() => this.draw());
  },
};
