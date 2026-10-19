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
const bladeTrail = [];
let RT = 0; // real time (s)
let RA = 1; // how far between the last two simulation steps this frame is drawn
const ix = (o) => (o._px === undefined ? o.x : o._px + (o.x - o._px) * RA);
const iy = (o) => (o._py === undefined ? o.y : o._py + (o.y - o._py) * RA);

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
function camPos(w) {
  const sh = w.shake > 0.4 ? w.shake : 0;
  return [Math.round(lerp(w.cam._px, w.cam.x, RA) + (Math.random() * 2 - 1) * sh), Math.round(lerp(w.cam._py, w.cam.y, RA) + (Math.random() * 2 - 1) * sh * 0.8)];
}
function renderWorld(w, mode) {
  const lvl = w.lvl, art = w.art, th = lvl.theme, p = w.p;
  const [cx, cy] = camPos(w);
  w._cx = cx; w._cy = cy;
  const rite = w.rite;
  const ink = rite && rite.phase !== 'mark';
  const px = ix(p), py = iy(p);
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
  for (const b of w.beams) drawBeam(g, b, cx, cy);
  blit(art.tiles, cx, cy);
  blit(art.decal, cx, cy);
  for (const wf of w.weak) drawWeak(g, wf, cx, cy, art.weak);
  for (const pk of w.planks) drawPlank(g, pk, cx, cy);
  for (const d of w.doors) drawWoodDoor(g, d, d.x - cx, d.y - cy);
  // rings for the chain; they glint when the chain could reach them
  for (const hk of lvl.hooks) {
    const x = hk.x - cx, y = hk.y - cy;
    if (x < -20 || x > W + 20 || y < -20 || y > H + 20) continue;
    const hot = w.abil.chain && !p.dead && dist(p.x, p.y - 15, hk.x, hk.y) < PH.chainR + 8;
    drawHook(g, hk, cx, cy, hot);
    if (hot) drawGlow(g, x, y, 10, '#f2d48f', 0.3 + Math.sin(RT * 5) * 0.1);
  }
  // bells
  for (const b of w.bells) {
    const ax = b.x - cx, ay = b.ay - cy, bx = b.x - cx, by = b.y - cy;
    g.fillStyle = '#2a2016'; g.fillRect(ax - 14, ay, 28, 4);
    drawChain(g, ax, ay + 4, bx, by);
    const im = IMG.bell;
    g.save(); g.translate(Math.round(bx), Math.round(by)); g.rotate(b.swing); g.drawImage(im, -Math.round(im.width / 2), 0); g.restore();
    if (b.rung > 0) drawGlow(g, bx, by + 24, 30 + b.rung * 30, '#ffd27a', b.rung * 0.8);
    const cf = w.boss && w.boss.type === 'confessor' ? w.boss : null;
    if (cf && (cf.final || (!cf.dead && cf.rewinds > 0 && w.bellAnchor <= 0))) drawGlow(g, bx, by + 22, 40, '#ffe2a0', 0.35 + Math.sin(RT * 4) * 0.2);
  }
  // chandeliers
  for (const c of w.chans) {
    const x = Math.round(c.x - cx), y = Math.round(c.y - cy);
    if (c.state === 'hang') drawChain(g, c.ax - cx, c.ay - cy, x, y - CH_RING);
    else drawChain(g, c.ax - cx, c.ay - cy, c.ax - cx, c.ay - cy + 10);
    drawChandelier(g, c, x, y);
  }
  for (const pd of w.pends) drawPendulum(g, pd, cx, cy);
  // what lies on the floor to be taken
  for (const it of w.items) if (!it.got) {
    const x = it.x - cx, y = it.y - cy - 4 + Math.sin(RT * 3 + it.x) * 1;
    drawGlow(g, x, y, 9, '#e8dcc0', 0.25);
    drawItemIcon(g, it.type, x, y);
  }
  for (const r of w.relics) if (!r.got) { drawGlow(g, r.x - cx, r.y - cy - 10, 30, '#f2d48f', 0.4 + Math.sin(RT * 2) * 0.1, true); drawRelicItem(g, r, cx, cy); }
  for (const b of w.beads) if (!b.got) { drawGlow(g, b.x - cx, b.y - cy - 8, 14, '#ff5a4a', 0.4); drawBead(g, b, cx, cy); }
  // corpses
  for (const gb of w.gibs) {
    const x = gb.x - cx, y = gb.y - cy;
    if (x < -30 || x > W + 30 || y < -30 || y > H + 30) continue;
    g.save(); g.translate(Math.round(x), Math.round(y)); g.rotate(gb.a); g.drawImage(gb.c, -gb.px, -gb.py); g.restore();
  }
  for (const n of w.npcs) drawNPC(g, n, Math.round(n.x - cx), Math.round(n.y - cy));
  // enemies + telegraphs
  for (const e of w.enemies) {
    if (!e.alive) continue;
    const X = Math.round(ix(e) - cx), Y = Math.round(iy(e) - cy);
    if (X < -40 || X > W + 40 || Y < -60 || Y > H + 60) continue;
    if (e.state === 'aim' && e.stunT <= 0 && !ink && e.type !== 'cherub') {
      const [hx, hy] = handPos(e);
      const k = e.st / e.aimDur, locked = e.st >= e.aimDur - (e.type === 'inquisitor' ? 0.3 : 0.16);
      const angs = e.type === 'priest' ? [e.aimAng - 0.3, e.aimAng, e.aimAng + 0.3] : [e.aimAng];
      for (const a of angs) {
        const len = Math.min(rayLen(lvl, hx, hy, a, 460), e.type === 'priest' ? 215 : 460);
        const ca = Math.cos(a), sa = Math.sin(a);
        if (e.type === 'inquisitor') {
          g.fillStyle = locked ? (((RT * 24) | 0) % 2 ? '#ffffff' : '#ffd27a') : `rgba(255,210,120,${0.15 + k * 0.5})`;
          pline(g, hx - cx + ca * 6, hy - cy + sa * 6, hx - cx + ca * len, hy - cy + sa * len, locked ? 2 : 1);
          continue;
        }
        g.fillStyle = locked ? (((RT * 24) | 0) % 2 ? '#ffffff' : '#ff2a2a') : `rgba(230,30,40,${0.2 + k * 0.55})`;
        for (let d = 5; d < len; d += locked ? 1 : 3) g.fillRect(Math.round(hx - cx + ca * d), Math.round(hy - cy + sa * d), 1, 1);
      }
    }
    if (e.type === 'cherub' && e.state === 'aim' && !ink && e.tx !== undefined) {
      const tx = Math.round(e.tx - cx), ty = Math.round(e.ty - cy), r = 8 - Math.round((e.st / e.aimDur) * 4);
      g.fillStyle = ((RT * 16) | 0) % 2 ? '#ff2a2a' : '#ffffff'; pring(g, tx, ty, r, 1);
      g.fillStyle = 'rgba(230,30,40,0.5)'; pline(g, X, Y - 8, tx, ty, 1);
    }
    if (e.type === 'bomb' && e.state === 'fuse' && !ink) { g.fillStyle = `rgba(255,120,40,${0.2 + 0.2 * Math.sin(RT * 30)})`; pring(g, X, Y - 14, 44, 1); }
    if (ink && e.doomed) continue;
    drawEnemyBody(g, e, X, Y, null);
    if (e.stunT > 0) {
      g.fillStyle = PAL.goldHi;
      for (let i = 0; i < 3; i++) { const a = RT * 6 + i * 2.1; g.fillRect(Math.round(X + Math.cos(a) * 7), Math.round(Y - actorHeight(e) - 2 + Math.sin(a) * 2), 1, 1); }
    }
    if (e.staggerT > 0 && e.type === 'fallen') {
      g.fillStyle = '#fff1c0';
      for (let i = 0; i < 3; i++) { const a = RT * 8 + i * 2.1; g.fillRect(Math.round(X + Math.cos(a) * 8), Math.round(Y - 36 + Math.sin(a) * 2), 1, 1); }
    }
    if ((e.type === 'grunt' && e.state === 'strike') || (e.type === 'shield' && e.state === 'bash') || (e.type === 'fallen' && e.state === 'lunge')) {
      const k = clamp(e.st / (e.type === 'grunt' ? 0.12 : e.type === 'fallen' ? 0.18 : 0.17), 0, 1);
      pcrescent(g, X + e.face * 9, Y - 13, 17, 7 * (1 - k) + 1, e.face > 0 ? 0.2 : Math.PI - 0.2, 1.15, e.type === 'fallen' ? ['#ffffff', '#c8d0dc', '#5a6270'] : ['#ffffff', '#ff6a5a', '#8a0e19']);
    }
  }
  // the one who keeps this verse
  const boss = w.boss;
  if (boss) {
    drawBossFx(g, w, boss, cx, cy);
    if (!(ink && boss.doomed)) drawBoss(g, w, boss, Math.round(ix(boss) - cx), Math.round(iy(boss) - cy), null);
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
    if (boss && boss.doomed) {
      const X = Math.round(boss.x - cx), Y = Math.round(boss.y - cy);
      for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) drawBoss(g, w, boss, X + ox, Y + oy, '#c0102a');
      drawBoss(g, w, boss, X, Y, '#0a0608');
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
    if (a.boss) drawRig(g, a.boss.pose, Math.round(a.boss.x - cx), Math.round(a.boss.y - cy), a.boss.face, RIGPAL.confessor, { s: 1.8, tint: a.col });
    else drawPlayerBody(g, a.s, Math.round(a.s.x - cx), Math.round(a.s.y - cy), a.col);
  }
  g.globalAlpha = 1;
  const pout = p._out || (p._out = {});
  if (!p.dead) {
    const blink = p.invuln > 0 && !ink && ((RT * 18) | 0) % 2 === 0 ? '#fff1c0' : null;
    const X = Math.round(px - cx), Y = Math.round(py - cy);
    drawCape(g, p.tail, cx + (p.x - px), cy + (p.y - py), RIGPAL.thirteenth, ink ? '#c0102a' : blink);
    drawPlayerBody(g, p, X, Y, ink ? '#0a0608' : blink, pout);
    if (p.item && !ink && pout.hbx !== undefined) drawItemIcon(g, p.item, pout.hbx, pout.hby, p.t * 3);
    // the chain from the casting hand
    if (p.chain && pout.hbx !== undefined) {
      const hx = pout.hbx, hy = pout.hby, ex = p.chain.x - cx + (px - p.x), ey = p.chain.y - cy + (py - p.y);
      const n = Math.max(1, Math.floor(dist(hx, hy, ex, ey) / 3));
      for (let i = 0; i <= n; i++) { g.fillStyle = i % 2 ? '#5c5566' : '#9a92a0'; g.fillRect(Math.round(lerp(hx, ex, i / n)), Math.round(lerp(hy, ey, i / n)), 2, 2); }
      g.fillStyle = '#c9973a'; pring(g, ex, ey, 2, 1);
    }
    // amber eye trail (Katana-style streak in slow time)
    if (pout.eyeX !== undefined) {
      eyeTrail.push(pout.eyeX + cx, pout.eyeY + cy);
      if (eyeTrail.length > 18) eyeTrail.splice(0, 2);
      if (w.slowK > 0.2 || Math.abs(p.vx) > 200 || p.zip) {
        for (let i = 0; i + 3 < eyeTrail.length; i += 2) {
          g.globalAlpha = (i / eyeTrail.length) * 0.9;
          g.fillStyle = i > eyeTrail.length - 6 ? '#fff0c0' : '#ffb347';
          pline(g, eyeTrail[i] - cx, eyeTrail[i + 1] - cy, eyeTrail[i + 2] - cx, eyeTrail[i + 3] - cy, 1);
        }
        g.globalAlpha = 1;
      }
    }
    // the blade's ribbon through a swing
    if ((p.atkT > 0 || p.plunge) && pout.tipX !== undefined && !ink) {
      bladeTrail.push({ tx: pout.tipX + cx, ty: pout.tipY + cy, hx: pout.hiltX + cx, hy: pout.hiltY + cy, life: 1 });
      if (bladeTrail.length > 7) bladeTrail.shift();
    }
  }
  for (const s of bladeTrail) s.life -= 0.16;
  while (bladeTrail.length && bladeTrail[0].life <= 0) bladeTrail.shift();
  for (let i = 0; i + 1 < bladeTrail.length; i++) {
    const a = bladeTrail[i], b = bladeTrail[i + 1];
    g.globalAlpha = clamp(a.life, 0, 1) * 0.85;
    g.fillStyle = i > bladeTrail.length - 3 ? '#fff6dc' : i > bladeTrail.length - 5 ? '#f2c46a' : '#b3242c';
    ppoly(g, [a.tx - cx, a.ty - cy, b.tx - cx, b.ty - cy, lerp(b.hx, b.tx, 0.45) - cx, lerp(b.hy, b.ty, 0.45) - cy, lerp(a.hx, a.tx, 0.45) - cx, lerp(a.hy, a.ty, 0.45) - cy]);
  }
  g.globalAlpha = 1;
  // bolts
  for (const b of w.bolts) {
    const x = b.x - cx, y = b.y - cy;
    const mine = b.owner === 'player';
    if (b.kind === 'sword' || b.kind === 'ghost') {
      g.fillStyle = mine ? '#e8c070' : b.kind === 'ghost' ? 'rgba(200,176,255,0.5)' : 'rgba(255,255,255,0.5)';
      for (let i = 0; i + 3 < b.trail.length; i += 2) pline(g, b.trail[i] - cx, b.trail[i + 1] - cy, b.trail[i + 2] - cx, b.trail[i + 3] - cy, 1);
      if (b.kind === 'ghost') { g.globalAlpha = 0.6; drawSword(g, x, y, Math.atan2(b.vy, b.vx), 1, '#c8b0ff'); g.globalAlpha = 1; }
      else drawSword(g, x, y, Math.atan2(b.vy, b.vx), 1, mine ? '#fff1c0' : null);
      continue;
    }
    const cols = b.kind === 'sand' ? ['#c8a060', '#f2dca8'] : b.kind === 'dagger' ? ['#8a94a8', '#eef1f6'] : b.kind === 'heavy' ? ['#c06a1a', '#ffd27a'] : ['#8a0e19', '#ff3030'];
    g.fillStyle = mine ? (b.perfect ? '#e8c070' : '#a8701e') : cols[0];
    for (let i = 0; i + 3 < b.trail.length; i += 2) pline(g, b.trail[i] - cx, b.trail[i + 1] - cy, b.trail[i + 2] - cx, b.trail[i + 3] - cy, i > b.trail.length - 6 ? (b.kind === 'heavy' ? 3 : 2) : 1);
    g.fillStyle = mine ? (b.perfect ? '#fff8e0' : '#ffc14a') : cols[1];
    if (b.kind === 'dagger') { const a = Math.atan2(b.vy, b.vx); pline(g, x - Math.cos(a) * 4, y - Math.sin(a) * 4, x + Math.cos(a) * 3, y + Math.sin(a) * 3, 1); }
    else pcirc(g, x, y, w.slowK > 0.3 || b.kind === 'heavy' ? 2 : 1);
    g.fillStyle = '#ffffff'; g.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
  // thrown things
  for (const t of w.throws) {
    g.fillStyle = t.type === 'skull' ? 'rgba(232,220,192,0.4)' : 'rgba(138,192,255,0.4)';
    for (let i = 0; i + 3 < t.trail.length; i += 2) pline(g, t.trail[i] - cx, t.trail[i + 1] - cy, t.trail[i + 2] - cx, t.trail[i + 3] - cy, 1);
    drawItemIcon(g, t.type, t.x - cx, t.y - cy, t.rot);
  }
  for (const f of w.fires) drawFirePool(g, f, cx, cy);
  // slashes
  for (const s of w.slashes) {
    const k = s.t / s.dur;
    let x, y;
    if (s.follow) { x = px + Math.cos(s.ang) * 7 - cx; y = py - 12 + Math.sin(s.ang) * 7 - cy; }
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
  // the toll's shockwave
  for (const q of w.quakes) {
    const k = 1 - q.life / 0.3, x = q.x - cx, y = q.y - cy;
    g.globalAlpha = 1 - k; g.fillStyle = '#fff1c0';
    g.fillRect(Math.round(x - q.r), Math.round(y - 2), 3, 2); g.fillRect(Math.round(x + q.r - 3), Math.round(y - 2), 3, 2);
    g.fillStyle = '#e8c070'; g.fillRect(Math.round(x - q.r), Math.round(y - 1), Math.round(q.r * 2), 1);
    g.globalAlpha = 1;
  }
  // curtains of sand hide whoever stands in them
  for (const s of lvl.sands) drawSandfall(g, s, cx, cy);
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
    for (const b of w.beams) if (b.active) { drawGlow(g, b.x - cx, b.y1 - cy - 4, 26, '#ffe2a0', 0.6); drawGlow(g, b.x - cx, (b.y + b.y1) / 2 - cy, 40, '#ffc870', 0.25, true); }
    for (const f of w.fires) drawGlow(g, f.x - cx, f.y - cy - 6, 40, '#ff9a40', 0.6 * Math.min(1, f.life));
    if (lvl.exit && w.doorOpen < 1) drawGlow(g, lvl.exit.x - cx, lvl.exit.y - cy - 30, 14, '#ff2a2a', (1 - w.doorOpen) * (0.35 + Math.sin(RT * 3) * 0.15));
    for (const e of w.enemies) if (e.alive && e.type === 'acolyte' && e.state !== 'aim') { const [hx, hy] = handPos(e); drawGlow(g, hx - cx, hy - cy, 6, '#ff3030', 0.35); }
    for (const e of w.enemies) if (e.alive && e.type === 'bomb') drawGlow(g, e.x - cx - e.face * 6, e.y - cy - 30, e.state === 'fuse' ? 26 : 14, '#ff8a3a', e.state === 'fuse' ? 0.7 : 0.4);
    for (const b of w.bolts) drawGlow(g, b.x - cx, b.y - cy, b.owner === 'player' ? 12 : 10, b.owner === 'player' ? '#ffc14a' : b.kind === 'sand' ? '#e8c890' : b.kind === 'heavy' ? '#ffb050' : b.kind === 'dagger' || b.kind === 'sword' ? '#c8d0dc' : '#ff2a2a', 0.85);
    for (const e of w.enemies) if (e.alive && e.state === 'aim' && e.type !== 'cherub') { const [hx, hy] = handPos(e); drawGlow(g, hx - cx, hy - cy, 8 + (e.st / e.aimDur) * 8, e.type === 'inquisitor' ? '#ffd27a' : '#ff3030', 0.7); }
    if (!p.dead && pout.eyeX !== undefined) drawGlow(g, pout.eyeX + 1, pout.eyeY, 6, '#ffcf6b', 0.8);
    for (const s of w.slashes) if (s.kind === 'p') { const k = s.t / s.dur; drawGlow(g, px + Math.cos(s.ang) * 18 - cx, py - 12 + Math.sin(s.ang) * 18 - cy, 26, '#ffd890', (1 - k) * 0.45); }
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
  // the stopped hour: everything turns to ash but him (and you, if you spend your own hour)
  if (w.timeStop > 0) {
    g.globalCompositeOperation = 'saturation'; g.fillStyle = '#808080'; g.globalAlpha = 1; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'multiply'; g.fillStyle = '#c8b898'; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'source-over';
    if (boss) drawBoss(g, w, boss, Math.round(ix(boss) - cx), Math.round(iy(boss) - cy), null);
    if (w.slowOn && !p.dead) drawPlayerBody(g, p, Math.round(px - cx), Math.round(py - cy), null);
    g.fillStyle = 'rgba(242,212,143,0.5)';
    for (let i = 0; i < 40; i++) g.fillRect((i * 53 + 7) % W, (i * 97 + 11) % H, 1, 1);
  }
  g.drawImage(VIGNETTE, 0, 0);
  if (w.flash > 0) { g.globalAlpha = Math.min(1, w.flash); g.fillStyle = '#fff6e6'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  if (w.rewindFx > 0) { // the hour folding back on itself
    const k = w.rewindFx / 0.7;
    for (let y = 0; y < H; y += 6) { const off = Math.round(Math.sin(y * 0.2 + RT * 50) * 8 * k); g.drawImage(low, 0, y, W, 3, off, y, W, 3); }
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.25 * k; g.fillStyle = '#c8a060'; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  }
  // rite exec / boss introduction: ink bands
  const lb = ink ? 1 : easeInOut(w.letterK || 0);
  if (lb > 0) {
    const hh = Math.round(22 * lb);
    g.fillStyle = '#000000'; g.fillRect(0, 0, W, hh); g.fillRect(0, H - hh, W, hh);
    g.fillStyle = '#7a0c18'; g.fillRect(0, hh, W, 1); g.fillRect(0, H - hh - 1, W, 1);
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
  const iX = fx + 9, iY = fy + 10, iw = fr.width - 18, ih = 6;
  const full = w.fervour >= 100;
  hg.fillStyle = '#120a0c'; hg.fillRect(iX, iY, iw, ih);
  hg.fillStyle = full ? (((RT * 6) | 0) % 2 ? '#ff4a3a' : '#d42a2a') : '#8a0e19';
  hg.fillRect(iX, iY, Math.round((iw * w.fervour) / 100), ih);
  if (full) drawGlow(hg, iX + iw / 2, iY + 3, 26, '#ff3a2a', 0.35 + Math.sin(RT * 6) * 0.15);
  hg.drawImage(fr, fx, fy);
  if (w.riteDeny > 0) { hg.fillStyle = `rgba(255,60,60,${w.riteDeny * 0.6})`; hg.fillRect(iX - 2, iY - 2, iw + 4, ih + 4); }
  // what you carry, and the chain
  let sx = fx + fr.width + 4;
  const slot = (filled) => { hg.fillStyle = '#0b080e'; hg.fillRect(sx, fy + 6, 15, 15); hg.fillStyle = filled ? 'rgba(201,151,58,0.8)' : 'rgba(201,151,58,0.3)'; hg.fillRect(sx, fy + 6, 15, 1); hg.fillRect(sx, fy + 20, 15, 1); hg.fillRect(sx, fy + 6, 1, 15); hg.fillRect(sx + 14, fy + 6, 1, 15); };
  w._slotQ = -1; w._slotF = -1;
  if (w.p.item || w.items.length) { slot(!!w.p.item); if (w.p.item) drawItemIcon(hg, w.p.item, sx + 7, fy + 14); w._slotQ = sx; sx += 18; }
  if (w.abil.chain) {
    slot(true);
    const ready = !w.p.chain && w.p.chainCD <= 0;
    hg.fillStyle = ready ? '#9a92a0' : '#4a4452'; pring(hg, sx + 5, fy + 11, 2, 1); pring(hg, sx + 9, fy + 16, 2, 1);
    hg.fillStyle = '#c9973a'; hg.fillRect(sx + 6, fy + 13, 2, 1);
    w._slotF = sx; sx += 18;
  }
  if (w.chainDeny > 0) { hg.fillStyle = `rgba(255,60,60,${w.chainDeny})`; hg.fillRect(sx, fy + 6, 15, 15); }
  // the condemned
  if (!w.boss) {
    const sk = IMG.ui_skull;
    for (let i = 0; i < w.enemies.length; i++) {
      hg.globalAlpha = w.enemies[i].alive ? 1 : 0.22;
      hg.drawImage(sk, W - 14 - i * 9, 6);
    }
    hg.globalAlpha = 1;
  }
  // the keeper of the verse
  const b = w.boss;
  if (b && b.awake && b.state !== 'intro' && !(b.dead && b.dying > 2)) {
    const bw = 200, bx2 = Math.round(W / 2 - bw / 2), by2 = H - 22;
    hg.fillStyle = 'rgba(6,3,5,0.8)'; hg.fillRect(bx2 - 3, by2 - 3, bw + 6, 10);
    const seg = bw / b.maxHp;
    for (let i = 0; i < b.maxHp; i++) {
      const on = i < b.hp;
      hg.fillStyle = on ? (b.flash > 0 && i === b.hp - 1 ? '#ffffff' : '#a3121f') : '#2a0e10';
      hg.fillRect(Math.round(bx2 + i * seg + 1), by2, Math.round(seg - 2), 4);
      if (on) { hg.fillStyle = '#e0362e'; hg.fillRect(Math.round(bx2 + i * seg + 1), by2, Math.round(seg - 2), 1); }
    }
    hg.fillStyle = '#c9973a'; hg.fillRect(bx2 - 3, by2 - 3, bw + 6, 1); hg.fillRect(bx2 - 3, by2 + 6, bw + 6, 1);
    if (b.type === 'confessor' && w.bellAnchor > 0) { // the anchor's sand running out
      hg.fillStyle = '#f2d48f'; hg.fillRect(bx2, by2 + 8, Math.round(bw * (w.bellAnchor / 5)), 2);
    }
  }
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
// speech: dark boxes on the HUD layer, words on the display canvas
const _bubbleWrap = new Map();
function bubbleAnchor(w, who) {
  if (who === 'p') return [ix(w.p), iy(w.p) - 44];
  if (who === 'boss' && w.boss) { const [bx, by, bw] = bossHurtBox(w.boss); return [bx + bw / 2, by - 10]; }
  const n = w.npcs.find((q) => q.id === who);
  return n ? [n.x, n.y - 32] : null;
}
function speechLines(w) {
  const out = [];
  for (const l of w.lines) {
    if (w.t < l.start || w.t >= l.end) continue;
    const at = bubbleAnchor(w, l.who);
    if (!at) continue;
    let wr = _bubbleWrap.get(l.text);
    if (!wr) { wr = wrapRich(l.text, 170, 7.5, F_FELL); _bubbleWrap.set(l.text, wr); }
    const wd = Math.max(...wr.map((ln) => measureLow(ln.map((q) => q.c).join(''), 7.5, F_FELL)));
    const hh = wr.length * 7.5 * 1.4;
    const x = clamp(at[0] - w._cx, wd / 2 + 6, W - wd / 2 - 6), y = clamp(at[1] - w._cy - hh, 30, H - 40);
    out.push({ l, wr, wd, hh, x, y, reveal: (w.t - l.start) * 45 });
  }
  return out;
}
function drawSpeechBoxes(list) {
  for (const s of list) {
    const x0 = Math.round(s.x - s.wd / 2 - 5), y0 = Math.round(s.y - 7), wd = Math.round(s.wd + 10), hh = Math.round(s.hh + 6);
    hg.fillStyle = 'rgba(6,3,5,0.82)'; hg.fillRect(x0, y0, wd, hh);
    hg.fillStyle = s.l.who === 'boss' ? 'rgba(192,32,42,0.8)' : s.l.who === 'p' ? 'rgba(232,90,74,0.8)' : 'rgba(201,151,58,0.7)';
    hg.fillRect(x0, y0, wd, 1); hg.fillRect(x0, y0 + hh - 1, wd, 1);
  }
}
function drawSpeechText(list) {
  for (const s of list) drawRich(s.wr, s.x, s.y, 7.5, F_FELL, s.l.who === 'boss' ? '#ffd0c0' : '#ead7b0', 'center', 1, s.reveal, 1.4);
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
