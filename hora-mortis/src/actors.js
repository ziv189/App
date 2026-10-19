'use strict';
// ============================================================
//  HORA MORTIS — actors: animated sprites, new creatures, new props
// ============================================================

// Sprite geometry for the enemy lineup (the sprites face left).
// (ax, ay): the feet, or the wall mount for the gargoyle. (ex, ey): where its blood-bolts leave.
const EGEO = (() => {
  const out = {};
  for (const [type, name] of [['grunt', 'e_grunt'], ['acolyte', 'e_acolyte'], ['priest', 'e_priest'], ['shield', 'e_shield'], ['gargoyle', 'e_gargoyle'], ['bomb', 'e_grunt']]) {
    const M = ASSET_META[name];
    let ax = Math.round(M.foot[0]), ay = M.foot[1] + 1;
    let em = M.glow && M.glow.length ? M.glow[0] : [M.top[0], 12];
    if (type === 'gargoyle') { ax = M.w - 8; ay = 28; }
    if (type === 'priest') em = [M.top[0] + 1, 12];
    out[type] = { name, ax, ay, ex: em[0], ey: em[1] };
  }
  // drawn figures: anchor at the feet, bolts leave from the hand
  out.inquisitor = { ax: 0, ay: 0, ex: -9, ey: -17 };
  out.herald = { ax: 0, ay: 0, ex: -6, ey: -18 };
  out.fallen = { ax: 0, ay: 0, ex: -8, ey: -14 };
  out.cherub = { ax: 0, ay: 0, ex: -3, ey: -8 };
  return out;
})();

// a 1px rim of cold light so dark robes read against dark walls
const _rimCache = new Map();
function rimmed(name, mul) {
  const key = name + (mul || '');
  let c = _rimCache.get(key);
  if (c) return c;
  const im = mul ? shaded(name, mul) : IMG[name];
  c = mkCanvas(im.width + 2, im.height + 2);
  const x = c.getContext('2d');
  const rim = tinted(name, '#8a6470');
  x.globalAlpha = 0.55;
  x.drawImage(rim, 0, 1); x.drawImage(rim, 2, 1); x.drawImage(rim, 1, 0);
  x.globalAlpha = 1;
  x.drawImage(im, 1, 1);
  _rimCache.set(key, c);
  return c;
}

// Draw a sprite row by row so it can lean, rock, squash and stretch about its feet.
function drawSpriteAnim(g, img, X, Y, face, ax, ay, A, scale = 1) {
  const h = img.height, w = img.width;
  const sx = (A.sx || 1) * scale, sy = (A.sy || 1) * scale, lean = (A.lean || 0) + (A.rock || 0);
  g.save();
  g.translate(Math.round(X + (A.ox || 0) * face), Math.round(Y + (A.oy || 0)));
  if (face > 0) g.scale(-1, 1);
  if (Math.abs(lean) < 0.004 && Math.abs(sx - scale) < 0.004 && Math.abs(sy - scale) < 0.004) {
    g.drawImage(img, Math.round(-ax * scale), Math.round(-ay * scale), Math.round(w * scale), Math.round(h * scale));
  } else {
    const rowH = Math.max(1, Math.ceil(sy)), dw = Math.round(w * sx);
    for (let r = 0; r < h; r++) {
      const dy = r - ay;
      g.drawImage(img, 0, r, w, 1, Math.round(-ax * sx + dy * sy * lean), Math.round(dy * sy), dw, rowH);
    }
  }
  g.restore();
}

// how a sprite enemy moves this instant, from its state
function enemyAnim(e) {
  const A = { lean: 0, rock: 0, sx: 1, sy: 1, oy: 0, ox: 0 };
  const t = e.t;
  if (e.type === 'gargoyle') {
    if (e.state === 'aim') { const k = clamp(e.st / e.aimDur, 0, 1); A.ox = -Math.round(k * 2); A.oy = Math.round(Math.sin(t * 40) * k); }
    if (e.state === 'cool' && e.st < 0.15) A.ox = 2;
    return A;
  }
  const br = Math.sin(t * 2.3);
  A.sy = 1 + br * 0.02; A.sx = 1 - br * 0.014;
  if (Math.abs(e.vx) > 10 && e.onGround) {
    A.rock = Math.sin(e.walkPh) * 0.07;
    A.oy = -Math.abs(Math.sin(e.walkPh)) * 1.6;
    A.lean = 0.07 * Math.min(1, Math.abs(e.vx) / 110);
  }
  if (!e.onGround) { A.sy = e.vy < 0 ? 1.08 : 0.96; A.sx = e.vy < 0 ? 0.94 : 1.04; }
  if (e.reactT > 0) { const k = 1 - e.reactT / e.reactDur; A.oy -= Math.sin(Math.min(1, k * 2.5) * Math.PI) * 3; }
  switch (e.state) {
    case 'windup': { const k = clamp(e.st / e.windDur, 0, 1); A.lean = -0.26 * easeOut(k); A.sy = 1 - 0.07 * k; A.sx = 1 + 0.05 * k; if (k > 0.75) A.ox = Math.sin(t * 70) > 0 ? 1 : -1; break; }
    case 'strike': case 'bash': { const k = clamp(e.st / 0.14, 0, 1); A.lean = 0.34 * (1 - k * 0.4); A.sx = 1.13; A.sy = 0.92; A.ox = 2; break; }
    case 'recover': { const k = clamp(e.st / 0.42, 0, 1); A.lean = 0.22 * (1 - easeOut(k)); break; }
    case 'aim': { const k = clamp(e.st / e.aimDur, 0, 1); A.lean = -0.06 - 0.05 * k; if (k > 0.8) A.ox = Math.sin(t * 50) > 0 ? 0.6 : -0.6; break; }
    case 'cool': { const k = clamp(e.st / 0.3, 0, 1); A.lean = -0.18 * (1 - k); A.sx = 1 - 0.04 * (1 - k); break; }
    case 'fuse': { A.sy = 1 + Math.sin(t * 40) * 0.05; A.sx = 1 - Math.sin(t * 40) * 0.05; break; }
  }
  if (e.stunT > 0) { A.rock = Math.sin(t * 9) * 0.15; A.oy = 0; }
  if (e.staggerT > 0) { A.lean = -0.24; A.ox = Math.sin(t * 50) > 0 ? 1 : -1; }
  if (e.yankT > 0) { A.lean = 0.3; A.sy = 0.94; }
  return A;
}

// rig-drawn enemies pick their pose from their state
const _ep = newPose();
function rigEnemyPose(e) {
  const o = _ep;
  let rate = 0.25;
  if (e.stunT > 0 || e.staggerT > 0) { POSE.hurt(o); rate = 0.3; }
  else if (e.type === 'fallen') {
    if (e.state === 'windup') { POSE.windup(o, clamp(e.st / e.windDur, 0, 1)); rate = 0.45; }
    else if (e.state === 'lunge') { POSE.lunge(o); rate = 0.7; }
    else if (e.state === 'recover') { POSE.attack(o, 0.9, 0.3, 1, false); rate = 0.3; }
    else if (!e.onGround) { POSE.air(o, e.vy); }
    else if (Math.abs(e.vx) > 15) { POSE.run(o, e.walkPh, Math.abs(e.vx) / 150); o[14] = 0; o[12] = -0.6; o[4] = 1.0; o[5] = 1.0; rate = 0.35; }
    else if (e.alerted) { POSE.guard(o, e.t); rate = 0.3; }
    else POSE.idle(o, e.t);
  } else if (e.type === 'inquisitor') {
    if (e.state === 'aim' || e.state === 'cool') { POSE.aimBow(o); o[12] = angDiff(0, e.face > 0 ? e.aimAng : Math.PI - e.aimAng); o[4] = armToward(o[12]); o[6] = armToward(o[12]) - 0.15; rate = 0.4; }
    else if (Math.abs(e.vx) > 15) { POSE.run(o, e.walkPh, Math.abs(e.vx) / 150); o[14] = 0; o[12] = 0.3; rate = 0.35; }
    else POSE.idle(o, e.t), o[12] = 0.5;
  } else if (e.type === 'herald') {
    if (e.state === 'ring') { POSE.ring(o, e.t); rate = 0.5; }
    else if (Math.abs(e.vx) > 15) { POSE.run(o, e.walkPh, Math.abs(e.vx) / 150); o[14] = 0; o[12] = PI / 2; rate = 0.35; }
    else { POSE.idle(o, e.t); o[12] = PI / 2; o[4] = 0.5; o[5] = 0.6; }
  }
  if (e.yankT > 0) { POSE.hurt(o); rate = 0.5; }
  return rate;
}
const RIG_ENEMY_PAL = { fallen: 'fallen', inquisitor: 'inquisitor', herald: 'herald' };

function drawEnemyBody(g, e, X, Y, tint) {
  const flash = e.flash > 0 && ((e.flash * 30) | 0) % 2 === 0;
  const tcol = tint || (flash ? '#fff6e0' : null);
  switch (e.type) {
    case 'cherub': drawCherub(g, e, X, Y, tcol); break;
    case 'fallen': case 'inquisitor': case 'herald': {
      const pal = RIGPAL[e.elite ? 'first' : RIG_ENEMY_PAL[e.type]];
      if (e.tail && !tint) drawCape(g, e.tail, e.x - X, e.y - Y, pal, flash ? '#fff6e0' : null);
      drawRig(g, e.pose, X, Y, e.face, pal, { tint: tcol, out: e._out || (e._out = {}), t: e.t, drag: e.type === 'fallen' ? clamp(Math.abs(e.vx) / 90, 0, 2) : 0 });
      if (e.type === 'fallen' && e.state === 'windup' && !tint && e._out.tipX !== undefined) {
        const k = clamp(e.st / e.windDur, 0, 1);
        if (k > 0.45) { g.fillStyle = '#ffffff'; const r = Math.round(1 + (k - 0.45) * 6); g.fillRect(Math.round(e._out.tipX) - r, Math.round(e._out.tipY), r * 2 + 1, 1); g.fillRect(Math.round(e._out.tipX), Math.round(e._out.tipY) - r, 1, r * 2 + 1); }
      }
      break;
    }
    case 'bomb': {
      const G = EGEO.bomb, A = enemyAnim(e);
      const img = tcol ? tinted(G.name, tcol) : rimmed(G.name, '#a86a58');
      drawSpriteAnim(g, img, X, Y, e.face, G.ax + (tcol ? 0 : 1), G.ay + (tcol ? 0 : 1), A);
      if (!tint) { // the brazier on his back
        const bx = Math.round(X - e.face * 6), by = Math.round(Y - 27 + (A.oy || 0));
        g.fillStyle = '#2a2420'; g.fillRect(bx - 4, by, 8, 4); g.fillStyle = '#5a4a3a'; g.fillRect(bx - 4, by, 8, 1);
        const lit = e.state === 'fuse' || e.state === 'run';
        for (let i = 0; i < 4; i++) {
          const fh = 3 + ((Math.sin(e.t * 17 + i * 1.9) + 1) * (lit ? 3 : 1.5)) | 0;
          g.fillStyle = i % 2 ? PAL.flame : PAL.flameLo; g.fillRect(bx - 3 + i * 2, by - fh, 2, fh);
        }
        g.fillStyle = PAL.flameHi; g.fillRect(bx - 1, by - 3, 2, 2);
        if (e.state === 'fuse' && ((e.t * 16) | 0) % 2) { g.fillStyle = '#ffffff'; g.fillRect(bx - 5, by - 9, 10, 2); }
      }
      break;
    }
    default: {
      const G = EGEO[e.type];
      const A = enemyAnim(e);
      if ((e.state === 'strike' || e.state === 'bash') && !tint) { // smear: two fading echoes behind the swing
        const echo = tinted(G.name, '#ff6a5a');
        g.globalAlpha = 0.28; drawSpriteAnim(g, echo, X - e.face * 7, Y, e.face, G.ax, G.ay, A);
        g.globalAlpha = 0.14; drawSpriteAnim(g, echo, X - e.face * 13, Y, e.face, G.ax, G.ay, A);
        g.globalAlpha = 1;
      }
      const img = tcol ? tinted(G.name, tcol) : rimmed(G.name, e.shieldDown > 0 ? '#c0a0a0' : null);
      drawSpriteAnim(g, img, X, Y, e.face, G.ax + (tcol ? 0 : 1), G.ay + (tcol ? 0 : 1), A);
      if (e.type === 'shield' && e.shieldDown > 0 && !tint) { // shield knocked aside
        g.fillStyle = '#2a1c14'; g.fillRect(Math.round(X - e.face * 12) - 2, Math.round(Y - 12), 5, 12);
        g.fillStyle = '#7d8494'; g.fillRect(Math.round(X - e.face * 12) - 2, Math.round(Y - 12), 5, 1);
      }
    }
  }
  if (e.zeal > 0 && !tint && ((e.t * 10) | 0) % 3 === 0) { g.fillStyle = '#ff3a2a'; g.fillRect(Math.round(X + Math.sin(e.t * 7) * 6), Math.round(Y - 26 - (e.t * 30) % 10), 1, 2); }
  if (e.reactT > 0 && e.alive && !tint) {
    const k = 1 - e.reactT / e.reactDur;
    g.fillStyle = PAL.bloodHi;
    const yy = Math.round(Y - actorHeight(e) - 8 - k * 3);
    g.fillRect(X - 1, yy, 2, 5); g.fillRect(X - 1, yy + 6, 2, 2);
  }
}
function actorHeight(e) {
  if (EGEO[e.type] && EGEO[e.type].name) return EGEO[e.type].ay;
  return e.type === 'cherub' ? 14 : 32;
}

// ---------- the cherubs: stone putti that weep blood ----------
function drawCherub(g, e, X, Y, tint) {
  const cx = Math.round(X), cy = Math.round(Y - 8 + (e.state === 'dive' ? 0 : Math.sin(e.t * 3) * 1.5));
  const dive = e.state === 'dive', aim = e.state === 'aim';
  const flap = dive ? -0.6 : Math.sin(e.t * 26);
  const P = Pen.set(g, cx, cy, e.face, tint);
  const wy = Math.round(flap * 3.5);
  P.c('#9a8e86').poly([-2, -1, -10, -5 - wy, -12, -1 - wy, -9, 2, -3, 2]);
  P.c('#6e645e').poly([-3, 1, -9, 2, -11, 0 - wy * 0.5, -7, 3]);
  P.c('#d8cec4').circ(0, 0, 5);
  P.c('#b4a89c').poly([-5, 0, -2, 5, 2, 5, 4, 3, 0, 2, -3, -2]);
  P.c('#e8e0d6').px(1, -3).px(2, -3).px(-1, -4);
  P.c('#8a7e76').px(-3, -5).px(-1, -6).px(1, -6).px(3, -5).px(-4, -3).px(4, -3);
  const ec = aim || dive ? '#ff2a2a' : '#2a1a1a';
  P.c(ec).px(2, -1).px(-1, -1);
  P.c('#8a0e19').px(2, 0).px(2, 1).px(-1, 0);
  P.c('#3a1a1a').px(1, 2);
  P.c('#e8e0d6').poly([2, -1, 10, -5 - wy, 11, -1 - wy, 8, 2, 3, 2]);
  P.c('#b4a89c').line(4, 1, 9, 1 - Math.round(wy * 0.6), 1);
  if (!tint) {
    g.fillStyle = aim || dive ? '#ff6a4a' : '#f2d48f';
    for (let i = -3; i <= 3; i++) { g.fillRect(cx + i, cy - 9 - (Math.abs(i) === 3 ? 0 : 1), 1, 1); }
    g.fillRect(cx - 2, cy - 8, 1, 1); g.fillRect(cx + 2, cy - 8, 1, 1);
  }
}

// ---------- props ----------
function drawWoodDoor(g, d, X, Y) {
  // X,Y = bottom of the doorway cell; the door fills a 1x2 tile column
  const x0 = Math.round(X - 5), y0 = Math.round(Y - 32);
  if (d.isOpen) {
    const k = clamp(d.swing, 0, 1), lw = Math.max(2, Math.round(10 * (1 - k)));
    const hx = d.dir > 0 ? x0 + 10 - lw : x0;
    g.fillStyle = '#2a1a10'; g.fillRect(d.dir > 0 ? x0 + 9 : x0, y0, 2, 32);
    g.fillStyle = '#5a3a20'; g.fillRect(hx, y0 + 1, lw, 30);
    g.fillStyle = '#3a2414'; g.fillRect(hx, y0 + 1, 1, 30);
    return;
  }
  g.fillStyle = '#1a0f08'; g.fillRect(x0 - 1, y0 - 1, 12, 33);
  g.fillStyle = '#5a3a20'; g.fillRect(x0, y0, 10, 32);
  g.fillStyle = '#6e4a2a'; g.fillRect(x0 + 1, y0 + 1, 3, 30); g.fillRect(x0 + 5, y0 + 1, 3, 30);
  g.fillStyle = '#3a2414'; g.fillRect(x0 + 4, y0, 1, 32); g.fillRect(x0 + 8, y0, 1, 32);
  g.fillStyle = '#5c5662'; g.fillRect(x0, y0 + 6, 10, 2); g.fillRect(x0, y0 + 22, 10, 2);
  g.fillStyle = '#8a8494'; g.fillRect(x0, y0 + 6, 10, 1); g.fillRect(x0, y0 + 22, 10, 1);
  g.fillStyle = PAL.gold; g.fillRect(x0 + 7, y0 + 15, 2, 2);
  if (d.shake > 0) { g.fillStyle = 'rgba(255,240,210,0.5)'; g.fillRect(x0, y0, 10, 32); }
}
function drawBeam(g, b, cx, cy) {
  const x = Math.round(b.x - cx), y0 = Math.round(b.y - cy), y1 = Math.round(b.y1 - cy);
  // the window that lets the light in
  g.fillStyle = '#0a080c'; pcirc(g, x, y0 + 2, 5);
  g.fillStyle = b.active ? '#fff1c0' : b.warn ? '#e8b850' : '#8a5a2a'; pcirc(g, x, y0 + 2, 3);
  g.fillStyle = '#c0202a'; g.fillRect(x - 1, y0 + 1, 3, 1); g.fillRect(x, y0, 1, 3);
  if (b.active) {
    const wob = Math.sin(RT * 30) > 0 ? 1 : 0;
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = 'rgba(255,200,110,0.22)'; g.fillRect(x - 5 - wob, y0 + 5, 11 + wob * 2, y1 - y0 - 5);
    g.fillStyle = 'rgba(255,230,170,0.5)'; g.fillRect(x - 2, y0 + 5, 5, y1 - y0 - 5);
    g.fillStyle = 'rgba(255,255,240,0.9)'; g.fillRect(x, y0 + 5, 1, y1 - y0 - 5);
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#fff1c0';
    for (let i = 0; i < 5; i++) g.fillRect(x - 4 + ((i * 37 + (RT * 60) | 0) % 9), y1 - 1 - ((i * 13 + (RT * 40) | 0) % 6), 1, 1);
  } else {
    g.fillStyle = b.warn ? (((RT * 20) | 0) % 2 ? 'rgba(255,220,140,0.55)' : 'rgba(255,220,140,0.15)') : 'rgba(255,200,120,0.12)';
    for (let yy = y0 + 6; yy < y1; yy += 4) g.fillRect(x, yy, 1, 2);
  }
}
function drawPendulum(g, pd, cx, cy) {
  const px = pd.px - cx, py = pd.py - cy, bx = pd.bx - cx, by = pd.by - cy;
  g.fillStyle = '#2a2530'; g.fillRect(Math.round(px) - 3, Math.round(py), 7, 3);
  g.fillStyle = '#4a4452'; pline(g, px, py + 2, bx, by, 1);
  const a = Math.atan2(by - py, bx - px); // rod direction
  const sweep = Math.sign(pd.va || 1);
  // motion streak
  g.globalAlpha = 0.25; g.fillStyle = '#c8d0dc';
  pcrescent(g, px, py, pd.len + 6, 6, a - sweep * 0.12, 0.16, ['#e8eef6', '#a8b0bc', '#6a7280']);
  g.globalAlpha = 1;
  pcrescent(g, bx - Math.cos(a) * 10, by - Math.sin(a) * 10, 16, 6, a, 0.95, ['#eef1f6', '#a8b0bc', '#4a4e58']);
  g.fillStyle = '#7a0e18'; g.fillRect(Math.round(bx) - 1, Math.round(by) + 3, 2, 2);
}
function drawHook(g, hk, cx, cy, hot) {
  const x = Math.round(hk.x - cx), y = Math.round(hk.y - cy);
  g.fillStyle = '#1a161e'; g.fillRect(x - 1, y - 8, 3, 5);
  g.fillStyle = hot ? '#f2d48f' : '#6a6270'; pring(g, x, y, 4, 2);
  g.fillStyle = hot ? '#fff1c0' : '#9a92a0'; g.fillRect(x - 2, y - 4, 2, 1);
}
function drawPlank(g, pk, cx, cy) {
  if (pk.state === 'gone') return;
  const sh = pk.state === 'shake' ? (Math.sin(RT * 80) > 0 ? 1 : -1) : 0;
  const X = pk.tx * T - cx + sh, Y = pk.ty * T - cy;
  g.fillStyle = '#1e140c'; g.fillRect(X, Y, T, 5);
  g.fillStyle = '#4a3420'; g.fillRect(X, Y + 1, T, 2);
  g.fillStyle = '#6a4a2a'; g.fillRect(X, Y, T, 1);
  g.fillStyle = '#120a06'; g.fillRect(X + 5, Y, 1, 4); g.fillRect(X + 11, Y + 1, 1, 3);
  if (pk.state === 'shake') { g.fillStyle = '#2a1a0e'; g.fillRect(X + 2, Y + 3, 3, 2); g.fillRect(X + 9, Y + 3, 4, 2); }
}
function drawWeak(g, wf, cx, cy, tex) {
  if (wf.broken) return;
  g.drawImage(tex, wf.tx * T - cx, wf.ty * T - cy);
}
function buildWeakTile(th) {
  const c = mkCanvas(16, 16), x = c.getContext('2d');
  const S = th.stone;
  x.fillStyle = S[2]; x.fillRect(0, 0, 16, 16);
  for (let i = 0; i < 40; i++) { x.fillStyle = hash2(i, 3, 3) < 0.5 ? S[1] : S[3]; x.fillRect((hash2(i, 1, 3) * 16) | 0, (hash2(i, 2, 3) * 16) | 0, 1, 1); }
  x.fillStyle = th.rimHi; x.fillRect(0, 0, 16, 1); x.fillStyle = th.rim; x.fillRect(0, 1, 16, 1);
  x.fillStyle = '#060406';
  pline(x, 2, 2, 6, 7); pline(x, 6, 7, 5, 12); pline(x, 6, 7, 11, 9); pline(x, 11, 9, 14, 14); pline(x, 11, 9, 13, 3);
  x.fillStyle = S[4]; x.fillRect(7, 6, 1, 1); x.fillRect(12, 8, 1, 1);
  return c;
}
function drawItemIcon(g, type, x, y, ang = 0) {
  x = Math.round(x); y = Math.round(y);
  if (type === 'skull') {
    g.fillStyle = '#1a1210'; g.fillRect(x - 3, y - 3, 7, 6);
    g.fillStyle = '#d8ccb0'; g.fillRect(x - 2, y - 3, 5, 4); g.fillRect(x - 1, y + 1, 3, 1);
    g.fillStyle = '#8a7e66'; g.fillRect(x - 2, y + 1, 5, 1);
    g.fillStyle = '#1a1210'; g.fillRect(x - 1, y - 1, 1, 1); g.fillRect(x + 1, y - 1, 1, 1);
    if (Math.abs(Math.sin(ang)) > 0.7) { g.fillStyle = '#f4ecd8'; g.fillRect(x - 2, y - 3, 2, 1); }
  } else if (type === 'flask') {
    g.fillStyle = '#0e0a10'; g.fillRect(x - 3, y - 2, 7, 6); g.fillRect(x - 1, y - 5, 3, 3);
    g.fillStyle = '#3a6ab0'; g.fillRect(x - 2, y - 1, 5, 4);
    g.fillStyle = '#8ac0ff'; g.fillRect(x - 1, y, 1, 2);
    g.fillStyle = '#c9973a'; g.fillRect(x - 1, y - 5, 3, 1);
    g.fillStyle = '#e8e0d0'; g.fillRect(x, y - 4, 1, 2);
  }
}
function drawFirePool(g, f, cx, cy) {
  const x0 = Math.round(f.x - f.w / 2 - cx), y = Math.round(f.y - cy), k = Math.min(1, f.life / 0.6);
  for (let i = 0; i < f.w; i += 2) {
    const h = Math.max(1, ((Math.sin(RT * 14 + i * 1.7) + Math.sin(RT * 23 + i * 0.6) + 2.2) * 3 * k) | 0);
    g.fillStyle = '#ff6a1f'; g.fillRect(x0 + i, y - h, 2, h);
    g.fillStyle = '#ffd27a'; g.fillRect(x0 + i, y - Math.max(1, h >> 1), 2, Math.max(1, h >> 1));
    if (h > 5) { g.fillStyle = '#fff1c0'; g.fillRect(x0 + i, y - 2, 1, 2); }
  }
  g.fillStyle = '#3a6ab0'; g.fillRect(x0, y - 1, f.w, 1);
}
function drawSandfall(g, s, cx, cy) {
  const x = Math.round(s.x - cx), y0 = Math.round(s.y0 - cy), y1 = Math.round(s.y1 - cy);
  if (x < -20 || x > W + 4) return;
  g.fillStyle = 'rgba(200,170,110,0.22)'; g.fillRect(x + 2, y0, 12, y1 - y0);
  for (let i = 0; i < 26; i++) {
    const sx = x + 2 + ((i * 7) % 12), sy = y0 + (((i * 53) + RT * (90 + (i % 5) * 18)) % (y1 - y0));
    g.fillStyle = i % 3 ? '#d8b878' : '#f2dca8'; g.fillRect(sx, Math.round(sy), 1, 3);
  }
  g.fillStyle = 'rgba(216,184,120,0.5)'; ppoly(g, [x - 4, y1, x + 20, y1, x + 12, y1 - 4, x + 4, y1 - 4]);
}
function drawRelicItem(g, r, cx, cy) {
  const x = Math.round(r.x - cx), y = Math.round(r.y - cy - 10 + Math.sin(RT * 2) * 2);
  if (r.id === 'chain') {
    g.fillStyle = '#5c5566';
    for (let i = 0; i < 7; i++) { const a = i * 0.9; g.fillRect(Math.round(x + Math.cos(a) * (2 + i * 0.6)), Math.round(y + Math.sin(a) * (2 + i * 0.6)), 2, 2); }
    g.fillStyle = '#c9973a'; pring(g, x, y, 2, 1);
  } else if (r.id === 'page') {
    g.fillStyle = '#e8dcc0'; g.fillRect(x - 4, y - 5, 8, 10);
    g.fillStyle = '#8a1a14'; for (let i = 0; i < 4; i++) g.fillRect(x - 3, y - 3 + i * 2, 5 - (i % 2) * 2, 1);
    g.fillStyle = '#c9973a'; g.fillRect(x - 4, y - 5, 8, 1);
  }
}
function drawBead(g, b, cx, cy) {
  const x = Math.round(b.x - cx), y = Math.round(b.y - cy - 8 + Math.sin(RT * 2.4 + b.n) * 2);
  g.fillStyle = '#2a0408'; pcirc(g, x, y, 3);
  g.fillStyle = '#c0202a'; pcirc(g, x, y, 2);
  g.fillStyle = '#ff8a7a'; g.fillRect(x - 1, y - 1, 1, 1);
  g.fillStyle = '#c9973a'; g.fillRect(x, y - 5, 1, 2);
}
// the dying penitent in the nave, and other souls who only talk
function drawNPC(g, n, X, Y) {
  const pal = RIGPAL.fallen;
  drawRig(g, n.pose, X, Y, n.face, pal, { t: n.t });
  if (n.kind === 'sit' && !n.talked && Math.sin(RT * 3) > 0) { g.fillStyle = '#f2d48f'; g.fillRect(Math.round(X) - 1, Math.round(Y) - 26, 2, 2); }
}
