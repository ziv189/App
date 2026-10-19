'use strict';
// ============================================================
//  HORA MORTIS — graphics: pixel primitives, procedural art
// ============================================================
function mkCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0);
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  return c;
}
const hex = (s) => { const n = parseInt(s.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgba = (c, a) => { const [r, g, b] = hex(c); return `rgba(${r},${g},${b},${a})`; };
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const packc = (c, a = 255) => ((a << 24) | (clamp(c[2] | 0, 0, 255) << 16) | (clamp(c[1] | 0, 0, 255) << 8) | clamp(c[0] | 0, 0, 255)) >>> 0;

// ---------- crisp primitives (no anti-aliasing) ----------
function pline(g, x0, y0, x1, y1, th = 1) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy; const o = (th / 2) | 0;
  for (let n = 0; n < 400; n++) {
    g.fillRect(x0 - o, y0 - o, th, th);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}
const _xs = [];
function ppoly(g, p) {
  const n = p.length >> 1;
  let y0 = Infinity, y1 = -Infinity;
  for (let i = 1; i < p.length; i += 2) { if (p[i] < y0) y0 = p[i]; if (p[i] > y1) y1 = p[i]; }
  y0 = Math.floor(y0); y1 = Math.ceil(y1);
  for (let y = y0; y < y1; y++) {
    const yc = y + 0.5; _xs.length = 0;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, ax = p[i * 2], ay = p[i * 2 + 1], bx = p[j * 2], by = p[j * 2 + 1];
      if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) _xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax));
    }
    _xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < _xs.length; k += 2) {
      const xa = Math.round(_xs[k]), xb = Math.round(_xs[k + 1]);
      if (xb > xa) g.fillRect(xa, y, xb - xa, 1);
    }
  }
}
function pcirc(g, cx, cy, r) {
  cx = Math.round(cx); cy = Math.round(cy);
  const rr = (r + 0.5) * (r + 0.5);
  for (let y = -Math.ceil(r); y <= Math.ceil(r); y++) {
    const w = Math.floor(Math.sqrt(Math.max(0, rr - y * y)));
    if (rr - y * y >= 0) g.fillRect(cx - w, cy + y, w * 2 + 1, 1);
  }
}
function pring(g, cx, cy, r, th = 1) {
  cx = Math.round(cx); cy = Math.round(cy);
  const ro = r + 0.5, ri = Math.max(0, r - th + 0.5);
  for (let y = -Math.ceil(ro); y <= Math.ceil(ro); y++) {
    const wo = Math.sqrt(Math.max(0, ro * ro - y * y)), wi = ri * ri - y * y > 0 ? Math.sqrt(ri * ri - y * y) : -1;
    if (wi < 0) { const w = Math.floor(wo); g.fillRect(cx - w, cy + y, w * 2 + 1, 1); }
    else {
      const a = Math.floor(wo), b = Math.ceil(wi);
      if (a >= b) { g.fillRect(cx - a, cy + y, a - b + 1, 1); g.fillRect(cx + b, cy + y, a - b + 1, 1); }
    }
  }
}
// Crescent sword arc: band between radii, thick in the middle, tapering at the ends.
function pcrescent(g, cx, cy, r, thick, ang, spread, cols, prog = 1) {
  const R0 = Math.ceil(r + 1);
  cx = Math.round(cx); cy = Math.round(cy);
  for (let y = -R0; y <= R0; y++) {
    let run = -1, runC = null;
    for (let x = -R0; x <= R0 + 1; x++) {
      let c = null;
      if (x <= R0) {
        const d = Math.sqrt(x * x + y * y);
        if (d <= r && d > 2) {
          const a = angDiff(ang, Math.atan2(y, x));
          const u = a / spread; // -1..1 along the arc
          if (u > -1 && u < 1 && (u + 1) / 2 <= prog) {
            const tk = thick * Math.cos(u * Math.PI / 2) * (0.35 + 0.65 * (1 - Math.abs(u)));
            const inner = r - tk;
            if (d >= inner) {
              const k = (d - inner) / Math.max(1, tk);
              c = k > 0.72 ? cols[0] : k > 0.35 ? cols[1] : cols[2];
            }
          }
        }
      }
      if (c !== runC) {
        if (runC) { g.fillStyle = runC; g.fillRect(cx + run, cy + y, x - run, 1); }
        run = x; runC = c;
      }
    }
  }
}

// Pen: local-space drawing that mirrors by facing (around x + 0.5)
const Pen = {
  g: null, x: 0, y: 0, f: 1, tint: null,
  set(g, x, y, f, tint) { this.g = g; this.x = Math.round(x); this.y = Math.round(y); this.f = f < 0 ? -1 : 1; this.tint = tint || null; return this; },
  c(col) { this.g.fillStyle = this.tint || col; return this; },
  rect(lx, ly, w, h) { const X = this.f > 0 ? this.x + lx : this.x - lx - w + 1; this.g.fillRect(Math.round(X), Math.round(this.y + ly), w, h); return this; },
  px(lx, ly) { return this.rect(Math.round(lx), Math.round(ly), 1, 1); },
  line(ax, ay, bx, by, th = 1) { pline(this.g, this.x + Math.round(ax) * this.f, this.y + ay, this.x + Math.round(bx) * this.f, this.y + by, th); return this; },
  poly(pts) {
    const q = _polyBuf; q.length = pts.length;
    for (let i = 0; i < pts.length; i += 2) { q[i] = this.f > 0 ? this.x + pts[i] : this.x + 1 - pts[i]; q[i + 1] = this.y + pts[i + 1]; }
    ppoly(this.g, q); return this;
  },
  circ(lx, ly, r) { pcirc(this.g, this.x + Math.round(lx) * this.f, this.y + ly, r); return this; },
};
const _polyBuf = [];

// ---------- glow sprites (posterised radial light, very pixel-art) ----------
const _glowCache = new Map();
function glowSprite(r, col, bands = 5, soft = false) {
  r = Math.max(2, Math.round(r));
  const key = r + col + bands + soft;
  let c = _glowCache.get(key);
  if (c) return c;
  c = mkCanvas(r * 2, r * 2);
  const g = c.getContext('2d');
  const [R, G, Bc] = hex(col);
  if (soft) {
    const gr = g.createRadialGradient(r, r, 0, r, r, r);
    gr.addColorStop(0, `rgba(${R},${G},${Bc},1)`); gr.addColorStop(0.35, `rgba(${R},${G},${Bc},0.45)`); gr.addColorStop(1, `rgba(${R},${G},${Bc},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, r * 2, r * 2);
  } else {
    for (let i = 0; i < bands; i++) {
      const k = 1 - i / bands;
      g.fillStyle = `rgba(${R},${G},${Bc},${0.16 + 0.1 * (i / bands)})`;
      pcirc(g, r, r, Math.max(1, r * k - 1));
    }
  }
  _glowCache.set(key, c);
  return c;
}
function drawGlow(g, x, y, r, col, a = 1, soft = false) {
  const s = glowSprite(r, col, 5, soft);
  const prevA = g.globalAlpha, prevO = g.globalCompositeOperation;
  g.globalCompositeOperation = 'lighter'; g.globalAlpha = prevA * a;
  g.drawImage(s, Math.round(x - s.width / 2), Math.round(y - s.height / 2));
  g.globalAlpha = prevA; g.globalCompositeOperation = prevO;
}

// ---------- palettes / themes ----------
const PAL = {
  ink: '#07060a', void: '#0b090e',
  gold: '#d9a441', goldHi: '#f6dc9a', goldLo: '#8a5f22',
  blood: '#a3121f', bloodHi: '#e0362e', bloodLo: '#4f060c', bloodDark: '#2c0307',
  bone: '#d4c4a0', boneLo: '#8e7d60', flame: '#ffb347', flameHi: '#fff1b8', flameLo: '#ff6a1f',
  steel: '#c9ced8', steelLo: '#6c7280', white: '#fff8ea',
};
const THEMES = {
  ossuary: { name: 'ossuary', wall: '#221a1b', wall2: '#2d2324', stone: ['#1d1718', '#2c2324', '#3d3132', '#54443f', '#6c5a50'], rim: '#b98f5a', rimHi: '#f1d39c', deep: '#0b0809', glass: ['#9b1f24', '#d39a3c', '#3a4f86', '#5a1530'], light: '#ffb25a', fog: '#4a3530', amb: '#2a1612', bones: true },
  nave: { name: 'nave', wall: '#181624', wall2: '#211e30', stone: ['#14121d', '#211e2d', '#2f2a3e', '#433b52', '#5b5068'], rim: '#bf9a62', rimHi: '#f4dda8', deep: '#08070c', glass: ['#b0202c', '#2c4f9c', '#e0a83e', '#6a2a8a', '#1f7a6a'], light: '#ffc46b', fog: '#2c2a44', amb: '#1a1430' },
  tower: { name: 'tower', wall: '#161a26', wall2: '#1e2332', stone: ['#11141d', '#1b2030', '#283043', '#3a445a', '#536078'], rim: '#9fb3d6', rimHi: '#e6eefc', deep: '#07080d', glass: ['#3a5aa0', '#c4d4f0', '#8a2030'], light: '#bcd2ff', fog: '#28324c', amb: '#121a30', sky: true },
  choir: { name: 'choir', wall: '#24131a', wall2: '#2f1820', stone: ['#1c0f14', '#2b161d', '#3d1f28', '#552c35', '#6e3c42'], rim: '#d6a24c', rimHi: '#ffe2a0', deep: '#0c0507', glass: ['#c0202a', '#e8b040', '#7a1030', '#d05a20'], light: '#ff9a4a', fog: '#45202a', amb: '#2a0c14' },
  altar: { name: 'altar', wall: '#1d1612', wall2: '#2a2018', stone: ['#191310', '#271e18', '#3a2c22', '#54402e', '#73583c'], rim: '#e8b850', rimHi: '#fff0b8', deep: '#0b0806', glass: ['#d4a030', '#b01828', '#f0d080', '#5a1a40'], light: '#ffd27a', fog: '#4a3020', amb: '#2c1a0c' },
  belfry: { name: 'belfry', bg: 'tower', wall: '#1a1a24', wall2: '#22222e', stone: ['#13121a', '#1e1c28', '#2c2a3a', '#403c52', '#58526c'], rim: '#c8a870', rimHi: '#f4e0b0', deep: '#07070c', glass: ['#3a5aa0', '#c4d4f0', '#8a2030'], light: '#ffc87a', fog: '#2a2a40', amb: '#14142a', sky: true },
  scriptorium: { name: 'scriptorium', bg: 'nave', farMul: '#b89a78', wall: '#221a14', wall2: '#2c221a', stone: ['#1a140f', '#281f17', '#3a2d21', '#52402e', '#6e573e'], rim: '#d8b070', rimHi: '#fbe6b4', deep: '#0b0806', glass: ['#c0902a', '#8a2a1a', '#e8c070', '#3a5a7a'], light: '#ffcf80', fog: '#4a3a2a', amb: '#2a1c10' },
  vaults: { name: 'vaults', bg: 'altar', farMul: '#7a6a5a', wall: '#17120f', wall2: '#1f1814', stone: ['#120e0b', '#1d1612', '#2c221a', '#423226', '#5c4632'], rim: '#c8963a', rimHi: '#f2d48f', deep: '#060404', glass: ['#d4a030', '#7a1020', '#e0c060'], light: '#ffb05a', fog: '#3a2618', amb: '#1e1208', bones: true },
  sorrows: { name: 'sorrows', bg: 'altar', farMul: '#b08a8a', wall: '#22121a', wall2: '#2c1820', stone: ['#1a0e14', '#28161e', '#3c202c', '#54303c', '#704450'], rim: '#e8b0a0', rimHi: '#fff0e8', deep: '#0a0507', glass: ['#c0202a', '#f0d0c0', '#7a1030', '#e8b850'], light: '#ffb8a0', fog: '#4a2030', amb: '#2a0c16' },
  cloister: { name: 'cloister', bg: 'nave', farMul: '#d8b888', wall: '#2a2218', wall2: '#342a1e', stone: ['#1e1912', '#2c241a', '#3e3224', '#584834', '#76624a'], rim: '#f0d090', rimHi: '#fff4d0', deep: '#0c0a07', glass: ['#e8c070', '#c09040', '#8a5a2a'], light: '#ffe0a0', fog: '#5a4a30', amb: '#2c2210' },
  hour: { name: 'hour', bg: 'tower', wall: '#16141e', wall2: '#1e1c28', stone: ['#100f16', '#1a1822', '#282534', '#3a364a', '#544e66'], rim: '#e8c070', rimHi: '#fff0c0', deep: '#060509', glass: ['#e8c070', '#c4d4f0', '#8a2030'], light: '#ffe2a0', fog: '#2a2638', amb: '#121020', sky: true },
};

// ---------- level art: tiles ----------
function buildTileLayer(lvl, th) {
  const w = lvl.w * T, h = lvl.h * T;
  const cv = mkCanvas(w, h), g = cv.getContext('2d');
  const img = g.createImageData(w, h), buf = new Uint32Array(img.data.buffer);
  const S = th.stone.map(hex), rim = hex(th.rim), rimHi = hex(th.rimHi), deep = hex(th.deep);
  const solid = (x, y) => lvl.solidAt(x, y);
  // distance (in px) from each solid tile pixel to the nearest open tile, up to 48
  for (let ty = 0; ty < lvl.h; ty++) for (let tx = 0; tx < lvl.w; tx++) {
    const t = lvl.base(tx, ty);
    if (t !== 1) continue;
    const open = [];
    for (let oy = -3; oy <= 3; oy++) for (let ox = -3; ox <= 3; ox++) {
      const nx = tx + ox, ny = ty + oy;
      if (nx < 0 || ny < 0 || nx >= lvl.w || ny >= lvl.h) continue;
      if (!solid(nx, ny)) open.push(nx * T, ny * T);
    }
    const upOpen = !solid(tx, ty - 1) && ty > 0, dnOpen = !solid(tx, ty + 1) && ty < lvl.h - 1;
    const lOpen = !solid(tx - 1, ty) && tx > 0, rOpen = !solid(tx + 1, ty) && tx < lvl.w - 1;
    for (let py = 0; py < T; py++) for (let px = 0; px < T; px++) {
      const X = tx * T + px, Y = ty * T + py;
      let dmin = 99;
      for (let k = 0; k < open.length; k += 2) {
        const ox = open[k], oy = open[k + 1];
        const dx = X < ox ? ox - X : X > ox + T - 1 ? X - (ox + T - 1) : 0;
        const dy = Y < oy ? oy - Y : Y > oy + T - 1 ? Y - (oy + T - 1) : 0;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < dmin) dmin = d;
      }
      // masonry
      const row = Math.floor(Y / 8), off = (row & 1) * 8 + ((hash2(row, 7) * 4) | 0);
      const bw = 16, bx = Math.floor((X + off) / bw), lx = (X + off) % bw, ly = Y % 8;
      const bh = hash2(bx, row, 3);
      let si = bh < 0.3 ? 1 : bh < 0.85 ? 2 : 3;
      const n = hash2(X, Y, 11);
      if (n < 0.12) si--; else if (n > 0.93) si++;
      if (lx === 0 || ly === 0) si = 0;
      else if (ly === 1 || lx === 1) si += 1;
      else if (ly === 7 || lx === bw - 1) si -= 1;
      if (hash2(bx, row, 9) < 0.12 && ((lx + ly * 3 + (bx & 3)) % 7 === 0)) si = 0; // cracks
      let c = S[clamp(si, 0, S.length - 1)];
      let fade = clamp(1 - (dmin - 2) / 34, 0, 1);
      fade = fade * fade;
      c = mixc(deep, c, 0.12 + 0.88 * fade);
      // exposed edges
      if (upOpen && py <= 2) {
        const chip = hash2(X >> 1, ty, 5) < 0.12;
        if (py === 0) c = chip ? S[3] : rimHi;
        else if (py === 1) c = chip ? S[2] : rim;
        else c = mixc(S[0], deep, 0.4);
      } else if (dnOpen && py >= T - 2) {
        c = py === T - 1 ? mixc(S[0], deep, 0.6) : mixc(c, deep, 0.4);
      }
      if (lOpen && px === 0 && !(upOpen && py <= 1)) c = mixc(c, S[3], 0.6);
      if (rOpen && px === T - 1 && !(upOpen && py <= 1)) c = mixc(c, deep, 0.5);
      buf[Y * w + X] = packc(c);
    }
    // ossuary: skulls set into the walls
    if (th.bones && !upOpen && hash2(tx, ty, 21) < 0.16) {
      const sx = tx * T + 4 + ((hash2(tx, ty, 22) * 6) | 0), sy = ty * T + 4 + ((hash2(tx, ty, 23) * 6) | 0);
      const skull = ['.###.', '#####', '#.#.#', '#####', '.#.#.'];
      const fadeK = clamp(1 - (Math.min(...[0]) / 40), 0, 1);
      for (let yy = 0; yy < 5; yy++) for (let xx = 0; xx < 5; xx++) {
        const ch = skull[yy][xx];
        const X = sx + xx, Y = sy + yy;
        if (X >= w || Y >= h) continue;
        const cur = buf[Y * w + X];
        const curc = [cur & 255, (cur >> 8) & 255, (cur >> 16) & 255];
        const lum = (curc[0] + curc[1] + curc[2]) / 3;
        if (lum < 14) continue;
        const bone = hex('#a89778'), boneHi = hex('#cdbd98'), hole = hex('#120c0c');
        const k = clamp(lum / 70, 0.25, 1) * fadeK;
        if (ch === '#') buf[Y * w + X] = packc(mixc(curc, yy === 0 || xx === 0 ? boneHi : bone, k));
        else if (yy === 2) buf[Y * w + X] = packc(mixc(curc, hole, k));
      }
    }
  }
  g.putImageData(img, 0, 0);
  // one-way beams & spikes
  for (let ty = 0; ty < lvl.h; ty++) for (let tx = 0; tx < lvl.w; tx++) {
    const t = lvl.tile(tx, ty), X = tx * T, Y = ty * T;
    if (t === 2) {
      g.fillStyle = '#2a1a10'; g.fillRect(X, Y, T, 6);
      g.fillStyle = '#5c3d22'; g.fillRect(X, Y + 1, T, 3);
      g.fillStyle = '#8a6136'; g.fillRect(X, Y, T, 1);
      g.fillStyle = '#3e2816';
      for (let i = 0; i < T; i += 1) if (hash2(X + i, Y, 4) < 0.25) g.fillRect(X + i, Y + 2, 1, 1);
      if (lvl.tile(tx - 1, ty) !== 2) { g.fillStyle = '#6f6a74'; g.fillRect(X, Y, 2, 6); g.fillStyle = '#2a262e'; g.fillRect(X + 1, Y + 6, 1, 4); }
      if (lvl.tile(tx + 1, ty) !== 2) { g.fillStyle = '#6f6a74'; g.fillRect(X + T - 2, Y, 2, 6); g.fillStyle = '#2a262e'; g.fillRect(X + T - 2, Y + 6, 1, 4); }
    } else if (t === 3) {
      g.fillStyle = '#16131a'; g.fillRect(X, Y + T - 3, T, 3);
      for (let i = 0; i < 4; i++) {
        const sx = X + i * 4, hgt = 9 + ((hash2(tx, i, 2) * 4) | 0);
        g.fillStyle = '#2b2730'; ppoly(g, [sx, Y + T - 2, sx + 4, Y + T - 2, sx + 2, Y + T - 2 - hgt]);
        g.fillStyle = '#5d5763'; g.fillRect(sx + 1, Y + T - 2 - hgt + 3, 1, hgt - 4);
        g.fillStyle = '#b8b0bc'; g.fillRect(sx + 2, Y + T - 2 - hgt, 1, 2);
        if (hash2(tx, i, 8) < 0.5) { g.fillStyle = '#6e0c14'; g.fillRect(sx + 1, Y + T - 2 - hgt + 2, 2, 2 + ((hash2(tx, i, 9) * 3) | 0)); }
      }
    }
  }
  return cv;
}

// ---------- level art: back wall, windows, niches ----------
function stainedGlass(g, x, y, w, h, pal, seed) {
  // pointed lancet arch window with lead lines
  const top = y + Math.round(w * 0.75);
  const inside = (px, py) => {
    if (px < x || px >= x + w || py >= y + h) return false;
    if (py >= top) return true;
    // pointed arch: two circle arcs
    const r = w * 0.95, cxl = x + w - r, cxr = x + r, cy = top;
    const dl = Math.hypot(px + 0.5 - cxl, py + 0.5 - cy), dr = Math.hypot(px + 0.5 - cxr, py + 0.5 - cy);
    return dl <= r && dr <= r && py >= y;
  };
  // frame
  g.fillStyle = '#0a080c';
  for (let py = y - 2; py < y + h + 2; py++) for (let px = x - 2; px < x + w + 2; px++) {
    let near = false;
    for (let oy = -2; oy <= 2 && !near; oy++) for (let ox = -2; ox <= 2; ox++) if (inside(px + ox, py + oy)) { near = true; break; }
    if (near && !inside(px, py)) g.fillRect(px, py, 1, 1);
  }
  const cells = 5;
  for (let py = y; py < y + h; py++) for (let px = x; px < x + w; px++) {
    if (!inside(px, py)) continue;
    const lx = px - x, ly = py - y;
    const cx = Math.floor(lx / cells), cy = Math.floor((ly + (cx & 1) * 2) / 6);
    const lead = lx % cells === 0 || (ly + (cx & 1) * 2) % 6 === 0 || lx === Math.floor(w / 2);
    if (lead) { g.fillStyle = '#120e14'; g.fillRect(px, py, 1, 1); continue; }
    const hcell = hash2(cx + seed, cy, 31);
    const base = pal[Math.floor(hcell * pal.length)];
    const [r, gg, b] = hex(base);
    const k = 0.75 + hash2(px, py, seed) * 0.35 + (ly / h) * -0.2;
    g.fillStyle = `rgb(${clamp(r * k, 0, 255) | 0},${clamp(gg * k, 0, 255) | 0},${clamp(b * k, 0, 255) | 0})`;
    g.fillRect(px, py, 1, 1);
  }
  // rose at the top
  const rx = x + w / 2, ry = y + Math.round(w * 0.55), rr = Math.max(3, Math.floor(w / 4));
  g.fillStyle = '#120e14'; pring(g, rx - 0.5, ry, rr + 1, 1);
  g.fillStyle = pal[0]; pcirc(g, rx - 0.5, ry, rr - 1);
  g.fillStyle = PAL.goldHi; pcirc(g, rx - 0.5, ry, 1);
  g.fillStyle = '#120e14';
  for (let i = 0; i < 6; i++) { const a = i * TAU / 6; pline(g, rx - 0.5, ry, rx - 0.5 + Math.cos(a) * rr, ry + Math.sin(a) * rr); }
  return inside;
}

function drawStatue(g, x, y, th) {
  // weeping hooded figure in an arched niche (x = center, y = floor of niche)
  const nw = 22, nh = 46;
  g.fillStyle = '#0a080b'; ppoly(g, [x - nw / 2, y, x + nw / 2, y, x + nw / 2, y - nh + 10, x, y - nh, x - nw / 2, y - nh + 10]);
  g.fillStyle = mixHex(th.wall, '#000000', 0.5); ppoly(g, [x - nw / 2 + 2, y, x + nw / 2 - 2, y, x + nw / 2 - 2, y - nh + 11, x, y - nh + 3, x - nw / 2 + 2, y - nh + 11]);
  const s0 = th.stone[2], s1 = th.stone[3], s2 = th.stone[4];
  g.fillStyle = s0; ppoly(g, [x - 7, y, x + 7, y, x + 4, y - 26, x + 3, y - 33, x, y - 36, x - 4, y - 33, x - 5, y - 26]);
  g.fillStyle = s1; ppoly(g, [x - 6, y, x - 1, y, x - 1, y - 30, x - 4, y - 32, x - 5, y - 24]);
  g.fillStyle = s2; g.fillRect(x - 3, y - 33, 2, 6); g.fillRect(x - 5, y - 20, 1, 14);
  g.fillStyle = '#0a080b'; g.fillRect(x - 1, y - 31, 3, 4); // face shadow
  g.fillStyle = s1; g.fillRect(x - 2, y - 24, 6, 3); // hands in prayer
  g.fillStyle = '#7a0c14'; g.fillRect(x + 1, y - 27, 1, 5); g.fillRect(x + 1, y - 21, 1, 1); // blood tear
  g.fillStyle = s0; g.fillRect(x - 9, y, 18, 3);
  g.fillStyle = s2; g.fillRect(x - 9, y, 18, 1);
}
function mixHex(a, b, t) { const c = mixc(hex(a), hex(b), t); return `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`; }

function buildBackWall(lvl, th) {
  const w = lvl.w * T, h = lvl.h * T;
  const cv = mkCanvas(w, h), g = cv.getContext('2d');
  const img = g.createImageData(w, h), buf = new Uint32Array(img.data.buffer);
  const c0 = hex(th.wall), c1 = hex(th.wall2), deep = hex(th.deep), amb = hex(th.amb);
  // ambient occlusion field (tile resolution, blurred)
  const occ = new Float32Array(lvl.w * lvl.h);
  for (let ty = 0; ty < lvl.h; ty++) for (let tx = 0; tx < lvl.w; tx++) {
    let s = 0, n = 0;
    for (let oy = -2; oy <= 2; oy++) for (let ox = -2; ox <= 2; ox++) { s += lvl.solidAt(tx + ox, ty + oy) ? 1 : 0; n++; }
    occ[ty * lvl.w + tx] = s / n;
  }
  const occAt = (X, Y) => {
    const fx = X / T - 0.5, fy = Y / T - 0.5, x0 = Math.floor(fx), y0 = Math.floor(fy), ax = fx - x0, ay = fy - y0;
    const o = (x, y) => occ[clamp(y, 0, lvl.h - 1) * lvl.w + clamp(x, 0, lvl.w - 1)];
    return lerp(lerp(o(x0, y0), o(x0 + 1, y0), ax), lerp(o(x0, y0 + 1), o(x0 + 1, y0 + 1), ax), ay);
  };
  const bay = 160;
  for (let Y = 0; Y < h; Y++) for (let X = 0; X < w; X++) {
    const row = Math.floor(Y / 16), off = (row & 1) * 16;
    const bx = Math.floor((X + off) / 32), lx = (X + off) % 32, ly = Y % 16;
    let k = 0.82 + hash2(bx, row, 41) * 0.25 + (hash2(X, Y, 43) - 0.5) * 0.1;
    if (lx === 0 || ly === 0) k = 0.55;
    else if (ly === 1) k += 0.12;
    let c = mixc(c0, c1, hash2(bx, row, 44));
    c = [c[0] * k, c[1] * k, c[2] * k];
    // column pillars between bays
    const cx = (X % bay + bay) % bay;
    if (cx < 22) {
      const u = cx / 21;
      const shade = 0.55 + Math.sin(u * Math.PI) * 0.75 - (cx % 5 === 0 ? 0.25 : 0);
      c = mixc(c0, hex(th.stone[3]), 0.5);
      c = [c[0] * shade, c[1] * shade, c[2] * shade];
      if (Y % 128 < 6) c = mixc(c, hex(th.stone[4]), Y % 128 < 2 ? 0.7 : 0.3);
    }
    const o = occAt(X, Y);
    c = mixc(c, deep, clamp(o * 1.3 - 0.1, 0, 0.85));
    c = mixc(c, amb, 0.25);
    buf[Y * w + X] = packc(c);
  }
  g.putImageData(img, 0, 0);
  // windows / niches in open spans of each bay
  const windows = [], statues = [];
  for (let bx0 = 0; bx0 < w; bx0 += bay) {
    const ctx = Math.floor((bx0 + bay / 2 + 11) / T);
    if (ctx >= lvl.w - 1) continue;
    let ty = 0;
    while (ty < lvl.h) {
      if (lvl.solidAt(ctx, ty) || lvl.solidAt(ctx - 1, ty) || lvl.solidAt(ctx + 1, ty)) { ty++; continue; }
      let t2 = ty;
      while (t2 < lvl.h && !lvl.solidAt(ctx, t2) && !lvl.solidAt(ctx - 1, t2) && !lvl.solidAt(ctx + 1, t2)) t2++;
      const run = t2 - ty;
      if (run >= 7) {
        const ww = run >= 11 ? 30 : 24, wh = Math.min(96, run * T - 56);
        const wx = ctx * T + 8 - ww / 2, wy = ty * T + 18;
        if (wh > 30) {
          const pal = th.glass;
          stainedGlass(g, wx, wy, ww, wh, pal, bx0);
          windows.push({ x: wx, y: wy, w: ww, h: wh, col: th.light });
        }
        if (run >= 9 && hash2(bx0, ty, 5) < 0.75 && th.name !== 'tower') statues.push([ctx * T + 8 + (hash2(bx0, 1, 2) < 0.5 ? -44 : 44), t2 * T]);
      }
      ty = t2;
    }
  }
  for (const [sx, sy] of statues) {
    const tx = Math.floor(sx / T);
    if (lvl.solidAt(tx, Math.floor(sy / T) - 1) || !lvl.solidAt(tx, Math.floor(sy / T))) continue;
    drawStatue(g, sx, sy, th);
  }
  // hanging banners
  for (let bx0 = 80; bx0 < w; bx0 += bay * 2) {
    const tx = Math.floor((bx0 + 36) / T);
    let ty = 1;
    while (ty < lvl.h && lvl.solidAt(tx, ty)) ty++;
    if (ty >= lvl.h - 6 || !lvl.solidAt(tx, ty - 1)) continue;
    const x = tx * T, y = ty * T, bh = 40 + ((hash2(tx, ty, 6) * 20) | 0);
    let free = true;
    for (let k = 0; k < bh / T + 1; k++) if (lvl.solidAt(tx, ty + k)) free = false;
    if (!free) continue;
    g.fillStyle = '#3a0a12'; ppoly(g, [x, y, x + 14, y, x + 14, y + bh, x + 7, y + bh - 6, x, y + bh]);
    g.fillStyle = '#5e1220'; g.fillRect(x + 2, y, 10, bh - 6);
    g.fillStyle = PAL.goldLo; g.fillRect(x, y + 2, 14, 1); g.fillRect(x + 6, y + 10, 2, 14); g.fillRect(x + 3, y + 14, 8, 2);
    g.fillStyle = '#2a060c'; g.fillRect(x + 12, y, 2, bh - 3);
  }
  return { canvas: cv, windows };
}

// light layer: god rays from windows (static, drawn additively each frame with flicker)
function buildRayLayer(lvl, windows, th) {
  const w = lvl.w * T, h = lvl.h * T;
  const cv = mkCanvas(w, h), g = cv.getContext('2d');
  const [r, gg, b] = hex(th.light);
  for (const wd of windows) {
    const sl = 0.42, len = Math.min(260, h - wd.y);
    const x0 = wd.x + 2, x1 = wd.x + wd.w - 2, y0 = wd.y + wd.h * 0.3;
    const grd = g.createLinearGradient(0, y0, 0, y0 + len);
    grd.addColorStop(0, `rgba(${r},${gg},${b},0.20)`); grd.addColorStop(0.5, `rgba(${r},${gg},${b},0.07)`); grd.addColorStop(1, `rgba(${r},${gg},${b},0)`);
    g.fillStyle = grd;
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y0); g.lineTo(x1 + len * sl + 10, y0 + len); g.lineTo(x0 + len * sl - 10, y0 + len); g.closePath(); g.fill();
    // narrow bright core
    const grd2 = g.createLinearGradient(0, y0, 0, y0 + len * 0.7);
    grd2.addColorStop(0, `rgba(${r},${gg},${b},0.14)`); grd2.addColorStop(1, `rgba(${r},${gg},${b},0)`);
    g.fillStyle = grd2;
    const mx = (x0 + x1) / 2;
    g.beginPath(); g.moveTo(mx - 3, y0); g.lineTo(mx + 3, y0); g.lineTo(mx + 3 + len * 0.7 * sl, y0 + len * 0.7); g.lineTo(mx - 3 + len * 0.7 * sl, y0 + len * 0.7); g.closePath(); g.fill();
    // window bloom
    const gl = g.createRadialGradient(wd.x + wd.w / 2, wd.y + wd.h / 2, 2, wd.x + wd.w / 2, wd.y + wd.h / 2, wd.h * 0.8);
    gl.addColorStop(0, `rgba(${r},${gg},${b},0.16)`); gl.addColorStop(1, `rgba(${r},${gg},${b},0)`);
    g.fillStyle = gl; g.fillRect(wd.x - wd.h, wd.y - wd.h * 0.5, wd.w + wd.h * 2, wd.h * 2);
  }
  return cv;
}

// ---------- generated art (src/assets.js) ----------
const IMG = {};
function loadAssets() {
  const src = typeof ASSET_SRC === 'object' ? ASSET_SRC : {};
  return Promise.all(Object.keys(src).map((k) => new Promise((res) => {
    const im = new Image();
    im.onload = () => { IMG[k] = im; res(); };
    im.onerror = () => res();
    im.src = src[k];
  })));
}
const _tintCache = new Map();
function tinted(name, col) { // flat silhouette in one colour
  const key = name + col;
  let c = _tintCache.get(key);
  if (c) return c;
  const im = IMG[name];
  c = mkCanvas(im.width, im.height);
  const x = c.getContext('2d');
  x.drawImage(im, 0, 0);
  x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height);
  _tintCache.set(key, c);
  return c;
}
function shaded(name, mul) { // darkened copy, so set dressing sits behind the action
  const key = name + '*' + mul;
  let c = _tintCache.get(key);
  if (c) return c;
  const im = IMG[name];
  c = mkCanvas(im.width, im.height);
  const x = c.getContext('2d');
  x.drawImage(im, 0, 0);
  x.globalCompositeOperation = 'multiply'; x.fillStyle = mul; x.fillRect(0, 0, c.width, c.height);
  x.globalCompositeOperation = 'destination-in'; x.drawImage(im, 0, 0);
  _tintCache.set(key, c);
  return c;
}

// procedural set dressing for the verses the paintings did not cover
function addDecorAsset(name, c) { IMG[name] = c; ASSET_META[name] = { w: c.width, h: c.height, flames: [] }; }
function buildProceduralDecor() {
  { // bookshelf
    const c = mkCanvas(30, 46), x = c.getContext('2d');
    x.fillStyle = '#1a0f09'; x.fillRect(0, 0, 30, 46);
    x.fillStyle = '#3a2414'; x.fillRect(1, 1, 28, 44);
    const cols = ['#5a1a14', '#1e3a4a', '#4a3a14', '#2a1a2a', '#6a4a1a', '#3a1010', '#20302a'];
    for (let r = 0; r < 4; r++) {
      const y0 = 3 + r * 11;
      x.fillStyle = '#120a06'; x.fillRect(2, y0, 26, 9);
      let bx = 3;
      while (bx < 27) {
        const bw = 2 + ((hash2(bx, r, 3) * 3) | 0), bh = 6 + ((hash2(bx, r, 4) * 3) | 0);
        if (bx + bw > 27) break;
        x.fillStyle = cols[(hash2(bx, r, 5) * cols.length) | 0]; x.fillRect(bx, y0 + 9 - bh, bw, bh);
        x.fillStyle = 'rgba(232,200,120,0.5)'; x.fillRect(bx, y0 + 9 - bh + 2, bw, 1);
        bx += bw + (hash2(bx, r, 6) < 0.2 ? 2 : 0);
      }
      x.fillStyle = '#5a3a1e'; x.fillRect(1, y0 + 9, 28, 2);
    }
    x.fillStyle = '#6a4626'; x.fillRect(0, 0, 30, 2);
    addDecorAsset('bookshelf', c);
  }
  { // lectern with an open book
    const c = mkCanvas(20, 30), x = c.getContext('2d');
    x.fillStyle = '#2a1a10'; x.fillRect(8, 10, 4, 18); x.fillRect(4, 27, 12, 3);
    x.fillStyle = '#4a2e18'; ppoly(x, [1, 9, 19, 5, 19, 9, 1, 13]);
    x.fillStyle = '#e8dcc0'; ppoly(x, [3, 8, 10, 6, 10, 9, 3, 11]); x.fillStyle = '#d4c4a0'; ppoly(x, [10, 6, 17, 4, 17, 7, 10, 9]);
    x.fillStyle = '#8a1a14'; x.fillRect(9, 9, 1, 6);
    addDecorAsset('lectern', c);
  }
  { // reliquary jars
    const c = mkCanvas(34, 22), x = c.getContext('2d');
    for (const [jx, jh, col] of [[1, 18, '#7a2a1a'], [11, 21, '#4a5a3a'], [22, 16, '#6a4a2a']]) {
      x.fillStyle = '#1a120c'; x.fillRect(jx, 22 - jh, 10, jh);
      x.fillStyle = col; x.fillRect(jx + 1, 22 - jh + 3, 8, jh - 4);
      x.fillStyle = 'rgba(255,230,180,0.35)'; x.fillRect(jx + 2, 22 - jh + 4, 1, jh - 7);
      x.fillStyle = '#c9973a'; x.fillRect(jx, 22 - jh, 10, 2);
      x.fillStyle = '#d8c8a0'; x.fillRect(jx + 3, 22 - jh + 7, 4, 3);
    }
    addDecorAsset('jars', c);
  }
  { // a great gear for the clock
    const R = 34, c = mkCanvas(R * 2 + 2, R * 2 + 2), x = c.getContext('2d');
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU, cx = R + 1 + Math.cos(a) * (R - 4), cy = R + 1 + Math.sin(a) * (R - 4);
      x.fillStyle = '#3a2c1a'; pcirc(x, cx, cy, 4);
    }
    x.fillStyle = '#3a2c1a'; pcirc(x, R + 1, R + 1, R - 5);
    x.fillStyle = '#54401f'; pring(x, R + 1, R + 1, R - 6, 2);
    x.fillStyle = '#1a140c'; pcirc(x, R + 1, R + 1, R - 13);
    x.fillStyle = '#3a2c1a';
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; pline(x, R + 1, R + 1, R + 1 + Math.cos(a) * (R - 12), R + 1 + Math.sin(a) * (R - 12), 3); }
    x.fillStyle = '#6a5228'; pcirc(x, R + 1, R + 1, 5);
    addDecorAsset('gear', c);
  }
}

// far parallax layer: the verse's painting, mirrored so it tiles seamlessly
function buildFar(th) {
  const im = IMG['bg_' + (th.bg || th.name)];
  const w = im.width, h = im.height;
  const c = mkCanvas(w * 2, h), x = c.getContext('2d');
  x.drawImage(im, 0, 0);
  x.save(); x.translate(w * 2, 0); x.scale(-1, 1); x.drawImage(im, 0, 0); x.restore();
  x.globalCompositeOperation = 'multiply';
  x.fillStyle = th.farMul || (th.sky ? '#dcd8e8' : '#9a8ea2');
  x.fillRect(0, 0, w * 2, h);
  x.globalCompositeOperation = 'source-over';
  const gr = x.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, 'rgba(6,4,8,0.5)'); gr.addColorStop(0.45, 'rgba(6,4,8,0.08)'); gr.addColorStop(1, 'rgba(6,4,8,0.35)');
  x.fillStyle = gr; x.fillRect(0, 0, w * 2, h);
  return c;
}
// soft shadow cast by the rock onto the far layer
function buildAO(lvl) {
  const w = lvl.w * T, h = lvl.h * T;
  const cv = mkCanvas(w, h), g = cv.getContext('2d');
  const img = g.createImageData(w, h), d = img.data;
  const occ = new Float32Array(lvl.w * lvl.h);
  for (let ty = 0; ty < lvl.h; ty++) for (let tx = 0; tx < lvl.w; tx++) {
    let s = 0;
    for (let oy = -2; oy <= 2; oy++) for (let ox = -2; ox <= 2; ox++) s += lvl.solidAt(tx + ox, ty + oy) ? 1 : 0;
    occ[ty * lvl.w + tx] = s / 25;
  }
  const o = (x, y) => occ[clamp(y, 0, lvl.h - 1) * lvl.w + clamp(x, 0, lvl.w - 1)];
  for (let Y = 0; Y < h; Y++) {
    const fy = Y / T - 0.5, y0 = Math.floor(fy), ay = fy - y0;
    for (let X = 0; X < w; X++) {
      const fx = X / T - 0.5, x0 = Math.floor(fx), ax = fx - x0;
      const v = lerp(lerp(o(x0, y0), o(x0 + 1, y0), ax), lerp(o(x0, y0 + 1), o(x0 + 1, y0 + 1), ax), ay);
      const i = (Y * w + X) * 4;
      d[i] = 7; d[i + 1] = 5; d[i + 2] = 9; d[i + 3] = clamp((v * 1.4 - 0.1) * 255, 0, 230) | 0;
    }
  }
  g.putImageData(img, 0, 0);
  return cv;
}

// set dressing: statues, ossuary heaps, organs on the floors; banners, cages and censers from the vaults
const DECOR = {
  ossuary: { floor: ['skullpile', 'statue_virgin', 'skullpile', 'candles', 'statue_penitent'], hang: ['cage', 'banner', 'cage'] },
  nave: { floor: ['statue_virgin', 'candles', 'statue_angel', 'statue_penitent'], hang: ['banner', 'censer'] },
  tower: { floor: ['candles'], hang: ['cage', 'censer'] },
  choir: { floor: ['organ', 'statue_angel', 'candles', 'organ'], hang: ['banner', 'censer'] },
  altar: { floor: ['statue_angel', 'candles', 'statue_virgin', 'skullpile'], hang: ['censer', 'banner'] },
  belfry: { floor: ['candles'], hang: ['cage'] },
  scriptorium: { floor: ['bookshelf', 'lectern', 'bookshelf', 'candles', 'bookshelf'], hang: ['censer', 'banner'] },
  vaults: { floor: ['jars', 'skullpile', 'jars', 'statue_penitent', 'candles'], hang: ['cage', 'censer'] },
  sorrows: { floor: ['statue_angel', 'candles'], hang: ['banner'] },
  cloister: { floor: ['statue_angel', 'statue_virgin', 'candles', 'statue_penitent'], hang: ['censer'] },
  hour: { floor: ['candles'], hang: [] },
};
function placeDecor(lvl, th) {
  const set = DECOR[th.name], out = [];
  if (!set) return out;
  const keep = [[lvl.spawn.x, lvl.spawn.y]];
  if (lvl.exit) keep.push([lvl.exit.x, lvl.exit.y]);
  for (const c of lvl.candles) keep.push([c.x, c.y]);
  const free = (x, y) => keep.every(([kx, ky]) => Math.abs(kx - x) > 40 || Math.abs(ky - y) > 40);
  const open = (tx, ty) => lvl.tile(tx, ty) === 0;
  const floors = [], ceils = [];
  for (let ty = 1; ty < lvl.h; ty++) for (let tx = 2; tx < lvl.w - 2; tx++) {
    if (lvl.tile(tx, ty) === 1 && lvl.tile(tx - 1, ty) === 1 && lvl.tile(tx + 1, ty) === 1 && open(tx - 1, ty - 1) && open(tx, ty - 1) && open(tx + 1, ty - 1)) {
      let head = 0;
      while (head < 9 && open(tx - 1, ty - 1 - head) && open(tx, ty - 1 - head) && open(tx + 1, ty - 1 - head)) head++;
      floors.push({ x: tx * T + 8, y: ty * T, head });
    }
    if (lvl.tile(tx, ty - 1) === 1 && open(tx, ty)) {
      let depth = 0;
      while (depth < 9 && open(tx, ty + depth)) depth++;
      if (depth >= 7) ceils.push({ x: tx * T + 8, y: ty * T });
    }
  }
  const order = (a, b) => hash2(a.x, a.y, 7) - hash2(b.x, b.y, 7);
  floors.sort(order); ceils.sort(order);
  const maxFloor = Math.max(2, Math.round((lvl.w * T) / 220)), maxHang = Math.max(1, Math.round((lvl.w * T) / 300));
  let k = 0, nf = 0, nh = 0;
  for (const s of floors) {
    if (nf >= maxFloor) break;
    if (!free(s.x, s.y) || out.some((d) => !d.hang && Math.abs(d.x - s.x) < 130 && Math.abs(d.y - s.y) < 48)) continue;
    let name = set.floor[k % set.floor.length];
    if (Math.ceil(ASSET_META[name].h / T) + 1 > s.head) name = s.head >= 4 ? 'candles' : null;
    if (!name) continue;
    out.push({ name, x: s.x, y: s.y, hang: false }); k++; nf++;
  }
  let j = 0;
  for (const s of ceils) {
    if (nh >= maxHang) break;
    if (out.some((d) => d.hang && Math.abs(d.x - s.x) < 170)) continue;
    if (lvl.chandeliers.some((c) => Math.abs(c.x - s.x) < 56) || lvl.bells.some((b) => Math.abs(b.x - s.x) < 56)) continue;
    if (!set.hang.length) break;
    const name = set.hang[j % set.hang.length];
    out.push({ name, x: s.x, y: s.y, hang: true, drop: name === 'banner' ? 0 : 6 + ((hash2(s.x, 3, 9) * 22) | 0) }); j++; nh++;
  }
  return out;
}

// ---------- screen-space overlays ----------
function buildVignette() {
  const c = mkCanvas(W, H), g = c.getContext('2d');
  const gr = g.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.95);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.6, 'rgba(4,2,6,0.35)'); gr.addColorStop(1, 'rgba(4,2,6,0.85)');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  return c;
}
function buildFog(col) {
  const w = 512, h = 128, c = mkCanvas(w, h), g = c.getContext('2d');
  const [r, gg, b] = hex(col);
  for (let i = 0; i < 70; i++) {
    const x = hash2(i, 5, 7) * w, y = 30 + hash2(i, 6, 7) * 80, rad = 20 + hash2(i, 8, 7) * 50;
    for (const ox of [-w, 0, w]) {
      const gr = g.createRadialGradient(x + ox, y, 0, x + ox, y, rad);
      gr.addColorStop(0, `rgba(${r},${gg},${b},0.18)`); gr.addColorStop(1, `rgba(${r},${gg},${b},0)`);
      g.fillStyle = gr; g.fillRect(x + ox - rad, y - rad, rad * 2, rad * 2);
    }
  }
  return c;
}
function buildGrain(n = 4) {
  const arr = [];
  for (let k = 0; k < n; k++) {
    const c = mkCanvas(W, H), g = c.getContext('2d');
    const img = g.createImageData(W, H), d = img.data;
    for (let i = 0; i < d.length; i += 4) { const v = Math.random() * 255; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = Math.random() < 0.5 ? 18 : 0; }
    g.putImageData(img, 0, 0);
    arr.push(c);
  }
  return arr;
}

// ---------- props ----------
const CH_RING = 42; // chandelier sprite: rows from its top down to the ring
function drawChandelier(g, c, X, Y) {
  const im = IMG.chandelier;
  if (!im) return;
  const top = c.state === 'down' ? Y + 7 - im.height + 6 : Y - CH_RING;
  c._sx = Math.round(X - im.width / 2); c._sy = Math.round(top);
  g.drawImage(im, c._sx, c._sy);
}
function drawChain(g, x0, y0, x1, y1) {
  const n = Math.max(1, Math.floor(dist(x0, y0, x1, y1) / 3));
  for (let i = 0; i <= n; i++) {
    const x = lerp(x0, x1, i / n), y = lerp(y0, y1, i / n);
    g.fillStyle = i % 2 ? '#2e2a33' : '#5c5566';
    g.fillRect(Math.round(x) - (i % 2 ? 0 : 1), Math.round(y), i % 2 ? 1 : 2, 2);
  }
}
function drawCandle(g, x, y, h, t, seed, lit = true) {
  g.fillStyle = '#cdbb94'; g.fillRect(x, y - h, 2, h);
  g.fillStyle = '#8e7d60'; g.fillRect(x + 1, y - h, 1, h);
  g.fillStyle = '#e8dcc0'; g.fillRect(x, y - h, 1, 1);
  if (!lit) return;
  const fl = Math.sin(t * 11 + seed * 3.1) + Math.sin(t * 17.3 + seed);
  g.fillStyle = PAL.flameLo; g.fillRect(x, y - h - 3, 2, 2);
  g.fillStyle = PAL.flame; g.fillRect(x, y - h - 4 - (fl > 0.8 ? 1 : 0), 2, 3);
  g.fillStyle = PAL.flameHi; g.fillRect(x + (fl > 0 ? 1 : 0), y - h - 3, 1, 2);
}
function drawDoor(g, X, Y, open) {
  // X,Y = bottom centre of the doorway
  const c = IMG.door_closed, o = IMG.door_open;
  if (!c) return;
  g.drawImage(c, Math.round(X - c.width / 2), Math.round(Y - c.height + 2));
  if (open > 0) {
    g.globalAlpha = open;
    g.drawImage(o, Math.round(X - o.width / 2), Math.round(Y - o.height + 2));
    g.globalAlpha = 1;
  }
}
