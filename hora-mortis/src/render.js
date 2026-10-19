'use strict';
// ============================================================
//  HORA MORTIS — rendering, post-processing, HUD
// ============================================================
const screenCv = document.getElementById('screen');
const ctx = screenCv.getContext('2d');
const low = mkCanvas(W, H), g = low.getContext('2d');
const hud = mkCanvas(W, H), hg = hud.getContext('2d');
const chR = mkCanvas(W, H), chRg = chR.getContext('2d');
const chC = mkCanvas(W, H), chCg = chC.getContext('2d');
const VIGNETTE = buildVignette();
const GRAIN = buildGrain(4);
const F_TITLE = '"UnifrakturMaguntia", "Old English Text MT", "Times New Roman", serif';
const F_FELL = '"IM Fell English", Georgia, "Times New Roman", serif';
const F_FELLSC = '"IM Fell English SC", Georgia, "Times New Roman", serif';
const F_PIX = '"Silkscreen", "Courier New", monospace';
const motes = Array.from({ length: 50 }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 5, vy: -1 - Math.random() * 5, s: Math.random() < 0.2 ? 2 : 1, a: 0.15 + Math.random() * 0.45, ph: Math.random() * 6 }));
const eyeTrail = [];
let RT = 0; // real time (s)

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const r = screenCv.getBoundingClientRect();
  screenCv.width = Math.max(1, Math.round(r.width * dpr)); screenCv.height = Math.max(1, Math.round(r.height * dpr));
  view.dpr = dpr; view.cw = screenCv.width; view.ch = screenCv.height;
  let s = Math.min(view.cw / W, view.ch / H);
  if (s >= 1 && Math.floor(s) / s > 0.86) s = Math.floor(s);
  view.s = s;
  view.ox = Math.round((view.cw - W * s) / 2); view.oy = Math.round((view.ch - H * s) / 2);
}
function blit(src, cx, cy) { g.drawImage(src, cx, cy, W, H, 0, 0, W, H); }
function drawFar(art, lvl, th, cx, cy) {
  const far = art.far, sky = th.sky;
  const px = sky ? 0.12 : 0.3, py = sky ? 0.1 : 0.3;
  const cyMax = Math.max(0, lvl.h * T - H);
  const top = Math.round(-(cy * py) - (far.height - H - cyMax * py));
  const fw = far.width;
  for (let x = -Math.round((cx * px) % fw); x < W; x += fw) g.drawImage(far, x, top);
}
function drawDecor(art, cx, cy) {
  for (const d of art.decor) {
    const M = ASSET_META[d.name], drop = d.drop || 0;
    const x = Math.round(d.x - M.w / 2 - cx);
    const y = d.hang ? Math.round(d.y + drop - cy) : Math.round(d.y - M.h + 2 - cy);
    d._vis = !(x > W || x + M.w < 0 || y > H || y + M.h < -drop);
    if (!d._vis) continue;
    if (d.hang && drop) drawChain(g, d.x - cx, d.y - cy, d.x - cx, d.y + drop - cy);
    g.drawImage(shaded(d.name, '#b4a8b2'), x, y);
    d._sx = x; d._sy = y;
  }
}

// ---------- text on the hi-res display canvas ----------
function txt(str, x, y, size, font, col, align = 'center', a = 1, glow = null, base = 'middle') {
  if (a <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = clamp(a, 0, 1);
  ctx.font = `${Math.round(size * view.s)}px ${font}`;
  ctx.textAlign = align; ctx.textBaseline = base;
  const X = view.ox + x * view.s, Y = view.oy + y * view.s;
  if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 4 * view.s; }
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.fillText(str, X + Math.max(1, view.s * 0.5), Y + Math.max(1, view.s * 0.5));
  ctx.shadowBlur = 0;
  ctx.fillStyle = col;
  ctx.fillText(str, X, Y);
  ctx.restore();
}

// ---------- world ----------
function renderWorld(w, mode) {
  const lvl = w.lvl, art = w.art, th = lvl.theme, p = w.p;
  const sh = w.shake > 0.4 ? w.shake : 0;
  const cx = Math.round(w.cam.x + (Math.random() * 2 - 1) * sh), cy = Math.round(w.cam.y + (Math.random() * 2 - 1) * sh * 0.8);
  w._cx = cx; w._cy = cy;
  const t = w.t;
  const rite = w.rite;
  const ink = rite && rite.phase !== 'mark';
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  g.fillStyle = th.deep; g.fillRect(0, 0, W, H);
  drawFar(art, lvl, th, cx, cy);
  if (art.back) {
    blit(art.back, cx, cy);
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.8 + Math.sin(RT * 0.6) * 0.14 + Math.sin(RT * 1.9) * 0.05;
    blit(art.rays, cx, cy);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  } else blit(art.ao, cx, cy);
  drawDecor(art, cx, cy);
  if (lvl.exit) drawDoor(g, lvl.exit.x - cx, lvl.exit.y - cy, easeOut(w.doorOpen));
  for (const c of lvl.candles) {
    const x = c.x - cx, y = c.y - cy;
    if (x < -30 || x > W + 30 || y < -30 || y > H + 30) continue;
    for (let i = 0; i < c.n; i++) drawCandle(g, x + i * 3 - c.n, y, 3 + ((c.seed * 7 + i * 5) % 7), RT, c.seed + i);
  }
  blit(art.tiles, cx, cy);
  blit(art.decal, cx, cy);
  // bells
  for (const b of w.bells) {
    const ax = b.x - cx, ay = b.ay - cy, bx = b.x - cx, by = b.y - cy;
    g.fillStyle = '#2a2016'; g.fillRect(ax - 14, ay, 28, 4);
    drawChain(g, ax, ay + 4, bx, by);
    const im = IMG.bell;
    g.save(); g.translate(Math.round(bx), Math.round(by)); g.rotate(b.swing); g.drawImage(im, -Math.round(im.width / 2), 0); g.restore();
    if (b.rung > 0) drawGlow(g, bx, by + 24, 30 + b.rung * 30, '#ffd27a', b.rung * 0.8);
  }
  // chandeliers
  for (const c of w.chans) {
    const x = Math.round(c.x - cx), y = Math.round(c.y - cy);
    if (c.state === 'hang') drawChain(g, c.ax - cx, c.ay - cy, x, y - CH_RING);
    else drawChain(g, c.ax - cx, c.ay - cy, c.ax - cx, c.ay - cy + 10);
    drawChandelier(g, c, x, y);
  }
  // corpses
  for (const gb of w.gibs) {
    const x = gb.x - cx, y = gb.y - cy;
    if (x < -30 || x > W + 30 || y < -30 || y > H + 30) continue;
    g.save(); g.translate(Math.round(x), Math.round(y)); g.rotate(gb.a); g.drawImage(gb.c, -gb.px, -gb.py); g.restore();
  }
  // enemies + telegraphs
  for (const e of w.enemies) {
    if (!e.alive) continue;
    const X = Math.round(e.x - cx), Y = Math.round(e.y - cy);
    if (X < -40 || X > W + 40 || Y < -60 || Y > H + 60) continue;
    if (e.state === 'aim' && e.stunT <= 0 && !ink) {
      const [hx, hy] = handPos(e);
      const k = e.st / e.aimDur, locked = e.st >= e.aimDur - 0.16;
      const angs = e.type === 'priest' ? [e.aimAng - 0.3, e.aimAng, e.aimAng + 0.3] : [e.aimAng];
      for (const a of angs) {
        const len = Math.min(rayLen(lvl, hx, hy, a, 420), e.type === 'priest' ? 215 : 420);
        const ca = Math.cos(a), sa = Math.sin(a);
        g.fillStyle = locked ? (((RT * 24) | 0) % 2 ? '#ffffff' : '#ff2a2a') : `rgba(230,30,40,${0.2 + k * 0.55})`;
        for (let d = 5; d < len; d += locked ? 1 : 3) g.fillRect(Math.round(hx - cx + ca * d), Math.round(hy - cy + sa * d), 1, 1);
      }
    }
    if (ink && e.doomed) continue;
    drawEnemyBody(g, e, X, Y, null);
    if (e.stunT > 0) {
      g.fillStyle = PAL.goldHi;
      for (let i = 0; i < 3; i++) { const a = RT * 6 + i * 2.1; g.fillRect(Math.round(X + Math.cos(a) * 7), Math.round(Y - EGEO[e.type].ay - 2 + Math.sin(a) * 2), 1, 1); }
    }
    if ((e.type === 'grunt' && e.state === 'strike') || (e.type === 'shield' && e.state === 'bash')) {
      const k = clamp(e.st / (e.type === 'grunt' ? 0.12 : 0.17), 0, 1);
      pcrescent(g, X + e.face * 9, Y - 13, 17, 7 * (1 - k) + 1, e.face > 0 ? 0.2 : Math.PI - 0.2, 1.15, ['#ffffff', '#ff6a5a', '#8a0e19']);
    }
  }
  // ---- colour grading (world only; the player & blood-bolts stay vivid) ----
  grade(w);
  // the condemned, frozen as ink silhouettes
  if (ink) {
    for (const e of w.enemies) {
      if (!e.alive || !e.doomed) continue;
      const X = Math.round(e.x - cx), Y = Math.round(e.y - cy);
      for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) drawEnemyBody(g, e, X + ox, Y + oy, '#c0102a');
      drawEnemyBody(g, e, X, Y, '#0a0608');
    }
  }
  // rite marks
  if (rite && rite.marks) {
    let lx = p.x - cx, ly = p.y - 12 - cy;
    for (const e of rite.marks) {
      const ex = e.x - cx, ey = e.y - e.h / 2 - cy;
      if (rite.phase === 'mark') {
        g.fillStyle = '#c0102a';
        const n = Math.max(1, Math.floor(dist(lx, ly, ex, ey) / 6));
        for (let i = 0; i <= n; i++) { const x = lerp(lx, ex, i / n), y = lerp(ly, ey, i / n); g.fillRect(Math.round(x), Math.round(y), i % 2 ? 1 : 2, i % 2 ? 1 : 2); }
        g.fillStyle = '#ff3a3a'; pring(g, ex, ey, 9, 1);
        g.fillStyle = '#ffe0d0'; g.fillRect(Math.round(ex) - 1, Math.round(ey) - 4, 2, 9); g.fillRect(Math.round(ex) - 3, Math.round(ey) - 2, 6, 2);
      }
      lx = ex; ly = ey;
    }
  }
  if (rite && rite.phase === 'mark') {
    // living targets glow faintly so they read in the dark
    for (const e of w.enemies) {
      if (!e.alive || e.marked) continue;
      const ex = Math.round(e.x - cx), ey = Math.round(e.y - cy);
      g.globalAlpha = 0.55 + Math.sin(RT * 10) * 0.2;
      drawEnemyBody(g, e, ex, ey, '#5a0c16');
      g.globalAlpha = 1;
    }
  }
  // player afterimages + body
  for (const a of w.afters) {
    g.globalAlpha = (a.life / a.max) * (ink ? 0.9 : 0.5);
    drawPlayerBody(g, a.s, Math.round(a.s.x - cx), Math.round(a.s.y - cy), a.col);
  }
  g.globalAlpha = 1;
  if (!p.dead) {
    const blink = p.invuln > 0 && !ink && ((RT * 18) | 0) % 2 === 0 ? '#fff1c0' : null;
    drawCape(g, p, cx, cy, ink ? '#c0102a' : blink);
    drawPlayerBody(g, p, Math.round(p.x - cx), Math.round(p.y - cy), ink ? '#0a0608' : blink);
    // amber eye trail (Katana-style streak in slow time)
    if (p._eyeX !== undefined) {
      eyeTrail.push(p._eyeX + cx, p._eyeY + cy);
      if (eyeTrail.length > 18) eyeTrail.splice(0, 2);
      if (w.slowK > 0.2 || Math.abs(p.vx) > 200) {
        for (let i = 0; i + 3 < eyeTrail.length; i += 2) {
          g.globalAlpha = (i / eyeTrail.length) * 0.9;
          g.fillStyle = i > eyeTrail.length - 6 ? '#fff0c0' : '#ffb347';
          pline(g, eyeTrail[i] - cx, eyeTrail[i + 1] - cy, eyeTrail[i + 2] - cx, eyeTrail[i + 3] - cy, 1);
        }
        g.globalAlpha = 1;
      }
    }
  }
  // bolts
  for (const b of w.bolts) {
    const x = b.x - cx, y = b.y - cy;
    const mine = b.owner === 'player';
    g.fillStyle = mine ? (b.perfect ? '#e8c070' : '#a8701e') : '#8a0e19';
    for (let i = 0; i + 3 < b.trail.length; i += 2) pline(g, b.trail[i] - cx, b.trail[i + 1] - cy, b.trail[i + 2] - cx, b.trail[i + 3] - cy, i > b.trail.length - 6 ? 2 : 1);
    g.fillStyle = mine ? (b.perfect ? '#fff8e0' : '#ffc14a') : '#ff3030';
    pcirc(g, x, y, w.slowK > 0.3 ? 2 : 1);
    g.fillStyle = '#ffffff'; g.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
  // slashes
  for (const s of w.slashes) {
    const k = s.t / s.dur;
    let x, y;
    if (s.follow) { x = p.x + Math.cos(s.ang) * 7 - cx; y = p.y - 12 + Math.sin(s.ang) * 7 - cy; }
    else { x = s.x - cx; y = s.y - cy; }
    if (s.kind === 'p') {
      const th2 = 11 * (1 - k * k);
      if (th2 < 1) continue;
      const cols = k < 0.3 ? ['#ffffff', '#fff3d0', '#f2c46a'] : k < 0.65 ? ['#fff3d0', '#e8a848', '#b3242c'] : ['#e8a848', '#b3242c', '#5a0a14'];
      pcrescent(g, x, y, s.r, th2, s.ang, 1.3, cols);
    } else {
      const c = Math.cos(s.ang), sn = Math.sin(s.ang);
      const L = 30 * Math.min(1, k / 0.08);
      if (ink) {
        g.fillStyle = '#c0102a'; pline(g, x - c * L, y - sn * L, x + c * L, y + sn * L, 3);
        g.fillStyle = '#0a0608'; pline(g, x - c * L * 1.1, y - sn * L * 1.1, x + c * L * 1.1, y + sn * L * 1.1, 1);
      } else {
        g.fillStyle = k < 0.4 ? '#ffffff' : '#ff3a3a';
        pline(g, x - c * L, y - sn * L, x + c * L, y + sn * L, k < 0.25 ? 3 : 1);
      }
      if (k < 0.35) pcrescent(g, x, y, 20, 6 * (1 - k / 0.35), s.ang + Math.PI / 2 * s.side, 1.1, ink ? ['#0a0608', '#c0102a', '#5a0a14'] : ['#ffffff', '#ff6a5a', '#c0102a']);
    }
  }
  // particles
  for (const q of w.parts) {
    const x = Math.round(q.x - cx), y = Math.round(q.y - cy);
    if (x < -4 || y < -4 || x > W + 4 || y > H + 4) continue;
    if (q.k === 3) { g.fillStyle = q.c; pline(g, x, y, x - q.vx * 0.025, y - q.vy * 0.025, 1); }
    else if (q.k === 4 || q.k === 5) { g.globalAlpha = Math.min(1, (q.life / q.max) * 1.2) * (q.k === 4 ? 0.6 : 0.9); g.fillStyle = q.c; g.fillRect(x, y, q.s, q.s); g.globalAlpha = 1; }
    else if (q.k === 2) { g.fillStyle = q.life / q.max > 0.5 ? q.c : '#a8401a'; g.fillRect(x, y, 1, 1); }
    else { g.fillStyle = q.c; g.fillRect(x, y, q.s, q.s); }
  }
  // shockwave rings
  for (const r of w.rings) { g.globalAlpha = r.life / r.max; g.fillStyle = r.col; pring(g, r.x - cx, r.y - cy, Math.round(r.r), r.th); }
  g.globalAlpha = 1;
  // ---- light ----
  if (!ink) {
    for (const c of lvl.candles) {
      const x = c.x - cx, y = c.y - cy;
      if (x < -60 || x > W + 60 || y < -60 || y > H + 60) continue;
      const fl = Math.sin(RT * 9 + c.seed) * 0.06 + Math.sin(RT * 23 + c.seed * 2) * 0.04;
      drawGlow(g, x, y - 10, 34, th.light, 0.5 + fl);
      drawGlow(g, x, y - 9, 10, '#ffe0a0', 0.5 + fl);
    }
    const cm = ASSET_META.chandelier;
    for (const c of w.chans) {
      drawGlow(g, c.x - cx, c.y - cy - 10, 54, '#ff9a40', c.state === 'down' ? 0.3 : 0.55);
      if (c._sx !== undefined) for (let i = 0; i < cm.flames.length; i++) drawGlow(g, c._sx + cm.flames[i][0], c._sy + cm.flames[i][1], 7, '#ffd27a', 0.45 + Math.sin(RT * 11 + i * 2) * 0.12);
    }
    for (const d of art.decor) {
      const M = ASSET_META[d.name];
      if (!d._vis || !M.flames || !M.flames.length || d.name.startsWith('statue')) continue;
      for (let i = 0; i < M.flames.length; i++) drawGlow(g, d._sx + M.flames[i][0], d._sy + M.flames[i][1], 9, th.light, 0.4 + Math.sin(RT * 9 + i * 1.7 + d.x) * 0.1);
      drawGlow(g, d._sx + M.w / 2, d._sy + M.h * 0.3, 30, th.light, 0.3);
    }
    if (lvl.exit && w.doorOpen < 1) drawGlow(g, lvl.exit.x - cx, lvl.exit.y - cy - 30, 14, '#ff2a2a', (1 - w.doorOpen) * (0.35 + Math.sin(RT * 3) * 0.15));
    for (const e of w.enemies) if (e.alive && e.type === 'acolyte' && e.state !== 'aim') { const [hx, hy] = handPos(e); drawGlow(g, hx - cx, hy - cy, 6, '#ff3030', 0.35); }
    for (const b of w.bolts) drawGlow(g, b.x - cx, b.y - cy, b.owner === 'player' ? 12 : 10, b.owner === 'player' ? '#ffc14a' : '#ff2a2a', 0.85);
    for (const e of w.enemies) if (e.alive && e.state === 'aim') { const [hx, hy] = handPos(e); drawGlow(g, hx - cx, hy - cy, 8 + (e.st / e.aimDur) * 8, '#ff3030', 0.7); }
    if (!p.dead && p._eyeX !== undefined) drawGlow(g, p._eyeX + 1, p._eyeY, 6, '#ffcf6b', 0.8);
    for (const s of w.slashes) if (s.kind === 'p') { const k = s.t / s.dur; drawGlow(g, p.x + Math.cos(s.ang) * 18 - cx, p.y - 12 + Math.sin(s.ang) * 18 - cy, 26, '#ffd890', (1 - k) * 0.45); }
    if (lvl.exit && w.doorOpen > 0) drawGlow(g, lvl.exit.x - cx, lvl.exit.y - 24 - cy, 70, '#ffc870', w.doorOpen * 0.9);
    for (const q of w.parts) if (q.k === 2 && q.life / q.max > 0.4) drawGlow(g, q.x - cx, q.y - cy, 4, '#ff9a40', 0.5);
  }
  // fog + motes
  if (!ink) {
    const fw = art.fog.width;
    g.globalAlpha = 0.45;
    let fx = -(((cx * 0.7 + RT * 7) % fw) + fw) % fw;
    for (let x = fx; x < W; x += fw) g.drawImage(art.fog, x, H - 120 + Math.sin(RT * 0.3) * 4);
    g.globalAlpha = 0.25;
    fx = -(((cx * 0.4 + RT * 3) % fw) + fw) % fw;
    for (let x = fx; x < W; x += fw) g.drawImage(art.fog, x, 30, fw, 140);
    g.globalAlpha = 1;
    g.fillStyle = '#ffd9a0';
    for (const m of motes) {
      g.globalAlpha = m.a * (0.6 + 0.4 * Math.sin(RT * 2 + m.ph));
      g.fillRect(Math.round(m.x), Math.round(m.y), m.s, m.s);
    }
    g.globalAlpha = 1;
  }
  g.drawImage(VIGNETTE, 0, 0);
  if (w.flash > 0) { g.globalAlpha = Math.min(1, w.flash); g.fillStyle = '#fff6e6'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  // rite exec: ink vignette bands
  if (ink) {
    g.fillStyle = '#000000'; g.fillRect(0, 0, W, 22); g.fillRect(0, H - 22, W, 22);
    g.fillStyle = '#7a0c18'; g.fillRect(0, 22, W, 1); g.fillRect(0, H - 23, W, 1);
  }
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
}
function grade(w) {
  const k = w.slowK, r = w.rite;
  if (r && r.phase !== 'mark') {
    g.globalCompositeOperation = 'saturation'; g.fillStyle = '#808080'; g.globalAlpha = 1; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'difference'; g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'multiply'; g.fillStyle = '#efe0c4'; g.fillRect(0, 0, W, H);
  } else if (r) {
    g.globalCompositeOperation = 'saturation'; g.fillStyle = '#808080'; g.globalAlpha = 0.95; g.fillRect(0, 0, W, H);
    g.globalAlpha = 1; g.globalCompositeOperation = 'multiply'; g.fillStyle = '#6a4a54'; g.fillRect(0, 0, W, H);
  } else if (k > 0.02) {
    g.globalCompositeOperation = 'saturation'; g.fillStyle = '#808080'; g.globalAlpha = 0.65 * k; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'multiply'; g.fillStyle = '#b07a92'; g.globalAlpha = 0.55 * k; g.fillRect(0, 0, W, H);
  }
  if (w.p.dead) {
    const d = Math.min(1, w.dyingT * 2.5);
    g.globalCompositeOperation = 'saturation'; g.fillStyle = '#808080'; g.globalAlpha = 0.75 * d; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'multiply'; g.fillStyle = '#c86a6a'; g.globalAlpha = 0.6 * d; g.fillRect(0, 0, W, H);
  }
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
}
function filmFilter(strength) {
  g.globalCompositeOperation = 'saturation'; g.fillStyle = '#808080'; g.globalAlpha = strength; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'screen'; g.fillStyle = '#3a2614'; g.globalAlpha = strength * (0.85 + Math.random() * 0.3); g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'multiply'; g.fillStyle = '#f4d8a8'; g.globalAlpha = strength; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  g.drawImage(GRAIN[(Math.random() * GRAIN.length) | 0], 0, 0);
  g.drawImage(GRAIN[(Math.random() * GRAIN.length) | 0], 0, 0);
  if (Math.random() < 0.5) { g.fillStyle = 'rgba(255,240,210,0.18)'; g.fillRect((Math.random() * W) | 0, 0, 1, H); }
  if (Math.random() < 0.2) { g.fillStyle = 'rgba(20,10,5,0.4)'; g.fillRect((Math.random() * W) | 0, 0, 1, H); }
  g.drawImage(VIGNETTE, 0, 0);
  g.fillStyle = 'rgba(0,0,0,0.07)';
  for (let y = 0; y < H; y += 3) g.fillRect(0, y, W, 1);
}

// ---------- present to the display canvas (with chromatic split) ----------
function present(ca, zoom = 0) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const z = 1 + zoom * 0.045, sw = W / z, sh = H / z, sx = (W - sw) / 2, sy = (H - sh) / 2;
  ctx.imageSmoothingEnabled = false;
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  ctx.fillStyle = '#030204'; ctx.fillRect(0, 0, view.cw, view.ch);
  const dw = W * view.s, dh = H * view.s;
  if (ca > 0.08) {
    chRg.globalCompositeOperation = 'source-over'; chRg.drawImage(low, 0, 0);
    chRg.globalCompositeOperation = 'multiply'; chRg.fillStyle = '#ff0000'; chRg.fillRect(0, 0, W, H);
    chCg.globalCompositeOperation = 'source-over'; chCg.drawImage(low, 0, 0);
    chCg.globalCompositeOperation = 'multiply'; chCg.fillStyle = '#00ffff'; chCg.fillRect(0, 0, W, H);
    const off = Math.max(1, Math.round(view.s * ca * 1.2));
    ctx.drawImage(chC, sx, sy, sw, sh, view.ox, view.oy, dw, dh);
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(chR, sx, sy, sw, sh, view.ox + off, view.oy, dw, dh);
    ctx.globalCompositeOperation = 'source-over';
  } else ctx.drawImage(low, sx, sy, sw, sh, view.ox, view.oy, dw, dh);
  ctx.drawImage(hud, view.ox, view.oy, dw, dh);
}

// ---------- HUD (pixel art, low-res) ----------
function drawHUD(w, mode) {
  hg.clearRect(0, 0, W, H);
  if (!w || mode !== 'play') return;
  const x = 6, y = 5;
  if (w.slowOn) drawGlow(hg, x + 6, y + 14, 16, '#ffd27a', 0.5);
  hg.drawImage(IMG.ui_hourglass, x, y);
  if (w.diff.ward) { // the ward: a small gold cross while it holds
    const wx = x + 3, wy = y + 31, held = w.p.ward > 0;
    hg.globalAlpha = held ? 1 : 0.3;
    hg.fillStyle = '#0b080e'; hg.fillRect(wx + 1, wy - 1, 4, 11); hg.fillRect(wx - 1, wy + 1, 8, 4);
    hg.fillStyle = held ? '#f2d48f' : '#6a5a40'; hg.fillRect(wx + 2, wy, 2, 9); hg.fillRect(wx, wy + 2, 6, 2);
    hg.globalAlpha = 1;
  }
  const bx = x + 17, by = y + 3;
  for (let i = 0; i < 11; i++) {
    const f = w.chronos * 11 > i + 0.02;
    hg.fillStyle = '#120c0a'; hg.fillRect(bx + i * 5, by, 5, 9);
    hg.fillStyle = f ? (w.chronosLock ? '#6a1a1a' : w.slowOn ? '#fff4d0' : '#d9b46a') : '#2a1d1d';
    hg.fillRect(bx + 1 + i * 5, by + 1, 3, 7);
  }
  // fervour, held in a frame of thorns
  const fr = IMG.ui_frame, fx = x + 13, fy = y + 12;
  const ix = fx + 9, iy = fy + 10, iw = fr.width - 18, ih = 6;
  const full = w.fervour >= 100;
  hg.fillStyle = '#120a0c'; hg.fillRect(ix, iy, iw, ih);
  hg.fillStyle = full ? (((RT * 6) | 0) % 2 ? '#ff4a3a' : '#d42a2a') : '#8a0e19';
  hg.fillRect(ix, iy, Math.round((iw * w.fervour) / 100), ih);
  if (full) drawGlow(hg, ix + iw / 2, iy + 3, 26, '#ff3a2a', 0.35 + Math.sin(RT * 6) * 0.15);
  hg.drawImage(fr, fx, fy);
  if (w.riteDeny > 0) { hg.fillStyle = `rgba(255,60,60,${w.riteDeny * 0.6})`; hg.fillRect(ix - 2, iy - 2, iw + 4, ih + 4); }
  // the condemned
  const sk = IMG.ui_skull;
  for (let i = 0; i < w.enemies.length; i++) {
    hg.globalAlpha = w.enemies[i].alive ? 1 : 0.22;
    hg.drawImage(sk, W - 14 - i * 9, 6);
  }
  hg.globalAlpha = 1;
  // door arrow
  const ex = w.lvl.exit;
  if (ex && w.doorOpen > 0.3 && !w.p.dead) {
    const dx = ex.x - w._cx, dy = ex.y - 30 - w._cy;
    const onScreen = dx > 10 && dx < W - 10 && dy > 10 && dy < H - 10;
    const bob = Math.round(Math.sin(RT * 6) * 2);
    hg.fillStyle = ((RT * 3) | 0) % 2 ? '#ffd27a' : '#fff1c0';
    if (onScreen) { const X = Math.round(dx), Y = Math.round(dy - 26 + bob); hg.fillRect(X - 3, Y, 7, 1); hg.fillRect(X - 2, Y + 1, 5, 1); hg.fillRect(X - 1, Y + 2, 3, 1); hg.fillRect(X, Y + 3, 1, 1); }
    else {
      const a = Math.atan2(dy - H / 2, dx - W / 2);
      const X = Math.round(W / 2 + Math.cos(a) * (W / 2 - 18)), Y = Math.round(clamp(H / 2 + Math.sin(a) * (H / 2 - 18), 30, H - 18));
      for (let i = 0; i < 6; i++) { const r2 = 6 - i; hg.fillRect(Math.round(X + Math.cos(a) * i - Math.cos(a + Math.PI / 2) * r2 * 0.6), Math.round(Y + Math.sin(a) * i - Math.sin(a + Math.PI / 2) * r2 * 0.6), Math.max(1, Math.round(r2 * 1.2)), 1); }
    }
  }
}
function drawCursor(mode) {
  const mx = Math.round(Input.mx), my = Math.round(Input.my);
  if (mx < 0 || my < 0 || mx > W || my > H) return;
  const rite = mode === 'play' && world && world.rite && world.rite.phase === 'mark';
  if (rite) { hg.fillStyle = '#ff3a3a'; pring(hg, mx, my, 7 + Math.round(Math.sin(RT * 12)), 1); }
  const im = rite ? tinted('ui_reticle', '#ff4a3a') : IMG.ui_reticle;
  hg.drawImage(im, mx - (im.width >> 1), my - (im.height >> 1));
}
// gold-cornered frame for the stats and pause screens
function drawPanel(x, y, w, h) {
  const c = IMG.ui_corner;
  hg.fillStyle = 'rgba(201,151,58,0.5)';
  hg.fillRect(x + c.width, y + 1, w - c.width * 2, 1); hg.fillRect(x + c.width, y + h - 2, w - c.width * 2, 1);
  const put = (px, py, sx, sy) => { hg.save(); hg.translate(px, py); hg.scale(sx, sy); hg.drawImage(c, 0, 0); hg.restore(); };
  put(x, y, 1, 1); put(x + w, y, -1, 1); put(x, y + h, 1, -1); put(x + w, y + h, -1, -1);
}
