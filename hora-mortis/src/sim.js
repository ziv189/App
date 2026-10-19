'use strict';
// ============================================================
//  HORA MORTIS — deterministic simulation (fixed 60 Hz step)
//  Everything here uses the seeded RNG so replays re-simulate.
// ============================================================
const LEVELS = VERSES.map(buildLevel);
const ART = [];
function levelArt(li) {
  if (ART[li]) return ART[li];
  const lvl = LEVELS[li], th = lvl.theme;
  const art = {
    tiles: buildTileLayer(lvl, th), fog: buildFog(th.fog), decal: mkCanvas(lvl.w * T, lvl.h * T),
    far: buildFar(th), decor: placeDecor(lvl, th),
  };
  if (th.sky) {
    // the bell tower keeps its own stonework, with arches open to the night sky
    const bw = buildBackWall(lvl, th);
    cutSkyHoles(bw.canvas, lvl);
    art.back = bw.canvas;
    art.rays = buildRayLayer(lvl, bw.windows, th);
  } else art.ao = buildAO(lvl);
  ART[li] = art;
  return art;
}
function cutSkyHoles(cv, lvl) {
  const g = cv.getContext('2d');
  g.globalCompositeOperation = 'destination-out';
  for (let x = 40; x < cv.width; x += 160) {
    for (let y = 60; y < cv.height - 120; y += 230) {
      const w = 92, h = 150;
      g.fillStyle = 'rgba(0,0,0,1)';
      ppoly(g, [x, y + h, x + w, y + h, x + w, y + 40, x + w / 2, y, x, y + 40]);
    }
  }
  g.globalCompositeOperation = 'source-over';
}

// ---------- tile collision ----------
function rectSolid(lvl, x0, y0, x1, y1) {
  const tx0 = Math.floor(x0 / T), tx1 = Math.floor((x1 - 0.01) / T), ty0 = Math.floor(y0 / T), ty1 = Math.floor((y1 - 0.01) / T);
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) if (lvl.solidAt(tx, ty)) return true;
  return false;
}
function moveX(lvl, e, dx) {
  if (!dx) return 0;
  e.x += dx;
  const top = e.y - e.h + 0.5, bot = e.y - 0.5;
  const ty0 = Math.floor(top / T), ty1 = Math.floor(bot / T);
  if (dx > 0) {
    const tx = Math.floor((e.x + e.w / 2 - 0.01) / T);
    for (let ty = ty0; ty <= ty1; ty++) if (lvl.solidAt(tx, ty)) { e.x = tx * T - e.w / 2; e.vx = 0; return 1; }
  } else {
    const tx = Math.floor((e.x - e.w / 2) / T);
    for (let ty = ty0; ty <= ty1; ty++) if (lvl.solidAt(tx, ty)) { e.x = (tx + 1) * T + e.w / 2; e.vx = 0; return -1; }
  }
  return 0;
}
function moveY(lvl, e, dy, prevBottom, drop) {
  if (!dy) return 0;
  e.y += dy;
  const tx0 = Math.floor((e.x - e.w / 2 + 0.5) / T), tx1 = Math.floor((e.x + e.w / 2 - 0.5) / T);
  if (dy > 0) {
    const ty = Math.floor((e.y - 0.01) / T);
    for (let tx = tx0; tx <= tx1; tx++) {
      const t = lvl.tile(tx, ty);
      if (t === 1 || (t === 2 && !drop && prevBottom <= ty * T + 0.5)) { e.y = ty * T; e.vy = 0; return 1; }
    }
  } else {
    const ty = Math.floor((e.y - e.h) / T);
    for (let tx = tx0; tx <= tx1; tx++) if (lvl.solidAt(tx, ty)) { e.y = (ty + 1) * T + e.h; e.vy = 0; return -1; }
  }
  return 0;
}
function los(lvl, x0, y0, x1, y1) {
  const d = dist(x0, y0, x1, y1), n = Math.ceil(d / 5);
  for (let i = 1; i < n; i++) {
    const x = lerp(x0, x1, i / n), y = lerp(y0, y1, i / n);
    if (lvl.solidAt(Math.floor(x / T), Math.floor(y / T))) return false;
  }
  return true;
}
function rayLen(lvl, x0, y0, a, max) {
  const c = Math.cos(a), s = Math.sin(a);
  for (let d = 0; d < max; d += 3) if (lvl.solidAt(Math.floor((x0 + c * d) / T), Math.floor((y0 + s * d) / T))) return d;
  return max;
}
const boxOf = (e) => [e.x - e.w / 2, e.y - e.h, e.w, e.h];
// What the player's blade and returned bolts can hit: sized to the sprites, a little larger than the physics box.
const HURT = { grunt: [18, 31], acolyte: [16, 34], priest: [18, 34], shield: [24, 32], gargoyle: [20, 24] };
function hurtBox(e) {
  const [hw, hh] = HURT[e.type] || [e.w, e.h];
  if (e.type === 'gargoyle') return [e.x - hw / 2 + e.face * 3, e.y - 22, hw, hh];
  return [e.x - hw / 2, e.y - hh, hw, hh];
}

// Pilgrim: slower foes, one ward per life, and the verse remembers your progress.
// Penitent: the original hour, where one blow ends it.
const DIFF = {
  pilgrim: { react: [0.5, 0.72], aim: 1.35, bolt: 0.78, wind: 1.5, chase: 0.85, ward: 1, sight: 220, call: 130, spread: [-0.26, 0, 0.26] },
  penitent: { react: [0.3, 0.46], aim: 1, bolt: 1, wind: 1, chase: 1, ward: 0, sight: 250, call: 170, spread: [-0.3, -0.15, 0, 0.15, 0.3] },
};
let MODE = 'pilgrim';
const overlap = (ax, ay, aw, ah, bx, by, bw, bh) => ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
function segPointDist(ax, ay, bx, by, px, py) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  const t = l2 ? clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1) : 0;
  return dist(ax + dx * t, ay + dy * t, px, py);
}

// ---------- world ----------
let world = null;
function makePlayer(x, y) {
  const p = {
    kind: 'player', x, y, w: 10, h: 22, vx: 0, vy: 0, face: 1, onGround: true, coyT: 0, bufT: 0, atkBuf: 0, rollBuf: 0, jumping: false,
    wall: 0, wallTouch: 0, lockT: 0, rollT: 0, rollCD: 0, rollDir: 1, rollRot: 0, dropT: 0,
    atkT: 0, atkCD: 0, atkDur: 0.16, atkAng: 0, atkSide: 1, airLunges: 0, hitSet: [],
    landT: 0, runPh: 0, t: 0, dead: false, invuln: 0, crouch: false, tail: [], stepPh: 0,
  };
  for (let i = 0; i < 8; i++) p.tail.push({ x: x - i * 3, y: y - 18, vx: 0, vy: 0 });
  return p;
}
const ETYPE = { s: 'grunt', S: 'grunt', a: 'acolyte', A: 'acolyte', t: 'priest', b: 'shield', B: 'shield', g: 'gargoyle' };
const ESIZE = { grunt: [12, 24], acolyte: [12, 26], priest: [14, 24], shield: [16, 26], gargoyle: [16, 16] };
function makeEnemy(en, lvl) {
  const type = ETYPE[en.ch] || 'grunt';
  const [w, h] = ESIZE[type];
  let face = sign(lvl.spawn.x - en.x) || -1;
  if (en.ch === 'S' || en.ch === 'A' || en.ch === 'B') face = -face;
  const e = {
    kind: 'enemy', type, x: en.x, y: en.y, w, h, vx: 0, vy: 0, face, alive: true, state: 'idle', st: 0, t: rnd(10),
    alerted: false, reactT: 0, reactDur: 0.4, pendAlert: 0, alert: 0, flash: 0, onGround: true, walkPh: rnd(6),
    aimAng: face > 0 ? 0 : Math.PI, aimDur: 0.6, windDur: 0.3, turnT: 0, stunT: 0, staggerT: 0, lostT: 0,
    marked: false, doomed: false, riteAng: 0,
  };
  if (type === 'gargoyle') {
    e.face = lvl.solidAt(en.tx - 1, en.ty) ? 1 : -1;
    e.x = en.tx * T + (e.face > 0 ? 8 : 8);
    e.y = en.y - 2;
  }
  return e;
}
function makeChandelier(c, lvl) {
  let ty = Math.floor(c.y / T);
  while (ty > 0 && !lvl.solidAt(Math.floor(c.x / T), ty - 1)) ty--;
  const ay = ty * T;
  return { ax: c.x, ay, x: c.x, y: c.y, len: c.y - ay, state: 'hang', vy: 0, t: rnd(6) };
}
function makeBell(b, lvl) {
  let ty = Math.floor(b.y / T);
  while (ty > 0 && !lvl.solidAt(Math.floor(b.x / T), ty - 1)) ty--;
  return { x: b.x, y: b.y, ay: ty * T, swing: 0, sv: 0, cd: 0, rung: 0 };
}

function newWorld(li, seed) {
  R = mulberry32(seed);
  const lvl = LEVELS[li], art = levelArt(li);
  art.decal.getContext('2d').clearRect(0, 0, art.decal.width, art.decal.height);
  const p = makePlayer(lvl.spawn.x, lvl.spawn.y);
  const w = {
    li, lvl, art, seed, t: 0, steps: 0, p, diff: DIFF[MODE],
    enemies: lvl.ents.map((en) => makeEnemy(en, lvl)), bolts: [], parts: [], gibs: [], slashes: [], afters: [], rings: [],
    chans: lvl.chandeliers.map((c) => makeChandelier(c, lvl)), bells: lvl.bells.map((b) => makeBell(b, lvl)),
    cam: { x: 0, y: 0 }, shake: 0, hitstop: 0, ts: 1, tsS: 1, slowOn: false, slowK: 0, chronos: 1, chronosLock: false, chronosIdle: 0,
    killCam: 0, nearMiss: 0, flash: 0, fervour: lvl.def.fervour || 0, rite: null, riteCD: 0,
    kills: 0, deflects: 0, rites: 0, clearT: -1, doorOpen: 0, exited: false, noise: null, floats: [], zoom: 0,
    dg: art.decal.getContext('2d'), aimPX: lvl.spawn.x, aimPY: lvl.spawn.y, multiT: 0, multiN: 0, total: 0, dyingT: 0,
  };
  w.total = w.enemies.length;
  p.ward = w.diff.ward;
  w.cam.x = clamp(p.x - W / 2, 0, lvl.w * T - W);
  w.cam.y = clamp(p.y - 26 - H / 2, 0, lvl.h * T - H);
  world = w;
  return w;
}

// Pilgrim checkpoints: put a fresh world into a remembered state.
function applyCheckpoint(w, ck) {
  if (!ck) return;
  for (const i of ck.dead) if (w.enemies[i]) w.enemies[i].alive = false;
  for (const c of ck.chans) { const ch = w.chans[c.i]; if (ch) { ch.state = 'down'; ch.x = c.x; ch.y = c.y; } }
  const p = w.p;
  p.x = ck.x; p.y = ck.y; p.face = ck.face;
  for (const q of p.tail) { q.x = p.x - p.face * 3; q.y = p.y - 18; q.vx = q.vy = 0; }
  w.fervour = ck.fervour;
  w.kills = ck.kills; w.deflects = ck.deflects; w.rites = ck.rites;
  if (w.enemies.every((e) => !e.alive)) { w.clearT = 1; w.doorOpen = 1; }
  w.cam.x = clamp(p.x - W / 2, 0, w.lvl.w * T - W);
  w.cam.y = clamp(p.y - 26 - H / 2, 0, w.lvl.h * T - H);
}

// ---------- particles / effects ----------
function part(w, x, y, vx, vy, life, c, s = 1, k = 0, g = 0, d = 1) {
  if (w.parts.length > 1100) return;
  w.parts.push({ x, y, vx, vy, life, max: life, c, s, k, g, d });
}
const BLOODC = ['#8a0e19', '#a3121f', '#6e0a14', '#c81e28', '#4f060c'];
function bloodBurst(w, x, y, ang, n, spd, spread = 0.7) {
  for (let i = 0; i < n; i++) {
    const a = ang + rnd(-spread, spread), s = rnd(spd * 0.25, spd);
    part(w, x + rnd(-3, 3), y + rnd(-4, 4), Math.cos(a) * s, Math.sin(a) * s - rnd(30, 90), rnd(0.5, 1.4), BLOODC[i % 5], R() < 0.25 ? 2 : 1, 1, 700, 0.985);
  }
  for (let i = 0; i < n / 3; i++) {
    const a = rnd(TAU), s = rnd(10, 60);
    part(w, x, y, Math.cos(a) * s, Math.sin(a) * s, rnd(0.3, 0.8), '#5a0710', 2, 4, -10, 0.92);
  }
}
function sparks(w, x, y, ang, n, spd, col = '#ffe2a0', spread = 1.2) {
  for (let i = 0; i < n; i++) {
    const a = ang + rnd(-spread, spread), s = rnd(spd * 0.3, spd);
    part(w, x, y, Math.cos(a) * s, Math.sin(a) * s, rnd(0.12, 0.35), i % 3 ? col : '#ffffff', 1, 3, 300, 0.94);
  }
}
function dust(w, x, y, n, dir = 0, col = '#6a5e5a') {
  for (let i = 0; i < n; i++) part(w, x + rnd(-5, 5), y - rnd(0, 2), rnd(-40, 40) + dir * rnd(20, 70), -rnd(5, 40), rnd(0.25, 0.6), col, R() < 0.3 ? 2 : 1, 4, -20, 0.9);
}
function ring(w, x, y, r1, life, col, th = 1) { w.rings.push({ x, y, r: 2, r1, life, max: life, col, th }); }
function floatText(w, x, y, text, col = '#f2d48f') { w.floats.push({ x, y, text, col, life: 1.2, max: 1.2 }); }
function snapshot(p) {
  return {
    x: p.x, y: p.y, face: p.face, vx: p.vx, vy: p.vy, onGround: p.onGround, wall: p.wall, rollT: p.rollT, rollRot: p.rollRot,
    atkT: p.atkT, atkDur: p.atkDur, atkAng: p.atkAng, atkSide: p.atkSide, runPh: p.runPh, t: p.t, landT: p.landT, crouch: p.crouch, dead: false,
  };
}
function afterimage(w, col, life = 0.28) { w.afters.push({ s: snapshot(w.p), life, max: life, col }); }

// ---------- gibs: render the body, slice it along the blade ----------
function spawnGibs(w, e, ang, killerIsPlayer) {
  const cw = 72, ch = 72, fx = 36, fy = 68;
  const c = mkCanvas(cw, ch), cg = c.getContext('2d');
  const sf = e.flash, sr = e.reactT; e.flash = 0; e.reactT = 0;
  if (e.kind === 'player') { drawPlayerBody(cg, e, fx, fy, null); }
  else drawEnemyBody(cg, e, fx, fy, null);
  e.flash = sf; e.reactT = sr;
  const cx = fx, cy = fy - e.h * 0.55;
  const src = cg.getImageData(0, 0, cw, ch).data;
  const A = mkCanvas(cw, ch), Bc = mkCanvas(cw, ch);
  const ia = A.getContext('2d').createImageData(cw, ch), ib = Bc.getContext('2d').createImageData(cw, ch);
  const nx = -Math.sin(ang), ny = Math.cos(ang);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const i = (y * cw + x) * 4;
    if (!src[i + 3]) continue;
    const side = (x + 0.5 - cx) * nx + (y + 0.5 - cy) * ny;
    const dst = side >= 0 ? ia.data : ib.data;
    const edge = Math.abs(side) < 1.2;
    dst[i] = edge ? 200 : src[i]; dst[i + 1] = edge ? 20 : src[i + 1]; dst[i + 2] = edge ? 32 : src[i + 2]; dst[i + 3] = 255;
  }
  A.getContext('2d').putImageData(ia, 0, 0); Bc.getContext('2d').putImageData(ib, 0, 0);
  const wx = e.x, wy = e.y - e.h * 0.55;
  const spd = killerIsPlayer ? 260 : 140;
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const up = ny < 0 ? 1 : -1; // which half is the upper one
  w.gibs.push({ c: A, x: wx, y: wy, px: cx, py: cy, vx: ca * spd + nx * 60, vy: sa * spd + ny * 60 - 110, a: 0, va: rnd(5, 12) * rsgn(), bleed: 1.4, toss: killerIsPlayer, life: 0 });
  w.gibs.push({ c: Bc, x: wx, y: wy, px: cx, py: cy, vx: ca * spd * 0.35 - nx * 40, vy: sa * spd * 0.35 - ny * 40 - 50, a: 0, va: rnd(2, 6) * rsgn(), bleed: 1.0, toss: false, life: 0 });
  if (w.gibs.length > 60) w.gibs.splice(0, 2);
  void up;
}

// ---------- combat ----------
function killEnemy(w, e, ang, cause) {
  if (!e.alive) return;
  const p = w.p;
  e.alive = false; e.doomed = false; e.marked = false;
  spawnGibs(w, e, ang, cause !== 'crush');
  const cx = e.x, cy = e.y - e.h * 0.55;
  bloodBurst(w, cx, cy, ang, cause === 'rite' ? 70 : 46, cause === 'rite' ? 420 : 340);
  w.hitstop = Math.max(w.hitstop, cause === 'rite' ? 0 : cause === 'slash' ? 5 : 3);
  w.shake = Math.max(w.shake, cause === 'slash' ? 7 : 6);
  w.kills++;
  let gain = cause === 'slash' ? 22 : 34;
  if (w.multiT > 0) w.multiN++; else w.multiN = 0;
  w.multiT = 1.1; gain += w.multiN * 12;
  w.cam.x += Math.cos(ang) * 5; w.cam.y += Math.sin(ang) * 3; w.zoom = 1;
  const label = cause === 'gib' ? 'corpse toss' : cause === 'crush' ? 'crushed' : cause === 'ricochet' ? 'ricochet' : null;
  if (label) floatText(w, cx, cy - 18, label);
  if (cause !== 'rite' && w.multiN >= 1) floatText(w, cx, cy - (label ? 28 : 18), ['double', 'triple', 'massacre', 'massacre'][Math.min(3, w.multiN - 1)], '#ff7a6a');
  if (!w.rite) w.fervour = Math.min(100, w.fervour + gain);
  if (cause === 'slash' || cause === 'gib') { p.airLunges = 0; p.atkCD = Math.min(p.atkCD, 0.05); }
  Sound.play('kill');
  w.noise = { x: e.x, y: e.y, r: 120 };
  if (w.enemies.every((q) => !q.alive)) onCleared(w);
}
function onCleared(w) {
  if (w.clearT >= 0) return;
  w.clearT = 0; w.killCam = 0.8;
  Sound.play('clear');
  setTimeout(() => Sound.play('doorOpen'), 450);
}
function killPlayer(w, cause, ang) {
  const p = w.p;
  if (p.dead || w.rite || p.invuln > 0 || w.exited) return;
  if (p.ward > 0) { // the ward takes the blow instead
    p.ward--;
    p.invuln = 1.2;
    p.vx = Math.cos(ang) * 210; p.vy = Math.min(-160, Math.sin(ang) * 200 - 120);
    p.onGround = false; p.rollT = 0; p.h = 22;
    for (const b of w.bolts) if (b.owner === 'enemy' && dist(b.x, b.y, p.x, p.y - 12) < 60) b.dead = true;
    sparks(w, p.x, p.y - 14, ang + Math.PI, 26, 300, '#ffe2a0');
    ring(w, p.x, p.y - 12, 46, 0.5, '#fff1c0', 2);
    w.shake = Math.max(w.shake, 9); w.hitstop = Math.max(w.hitstop, 6); w.flash = Math.max(w.flash, 0.35); w.killCam = Math.max(w.killCam, 0.5);
    floatText(w, p.x, p.y - 38, 'the ward shatters', '#fff1c0');
    Sound.play('deflect', true); Sound.play('block');
    return;
  }
  p.dead = true;
  spawnGibs(w, p, ang, true);
  bloodBurst(w, p.x, p.y - 12, ang, 60, 360);
  w.shake = 12; w.hitstop = 7; w.flash = 0.5;
  Sound.play('death');
  if (G.onDeath) G.onDeath(cause);
}
function shieldBlocks(e, ox, oy) {
  if (e.type !== 'shield' || e.stunT > 0) return false;
  const fromFront = (ox - e.x) * e.face > 0;
  const fromAbove = oy < e.y - e.h - 2;
  return fromFront && !fromAbove;
}
function blockHit(w, e, ang) {
  const p = w.p;
  sparks(w, e.x + e.face * 8, e.y - 14, ang + Math.PI, 16, 220);
  Sound.play('block');
  p.vx = e.face * 230; p.vy = Math.min(p.vy, -110);
  e.vx = -e.face * 70; e.flash = 0.12; e.staggerT = 0.3;
  w.hitstop = Math.max(w.hitstop, 4); w.shake = Math.max(w.shake, 4);
}
function deflect(w, b, ang) {
  const p = w.p;
  const d = dist(b.x, b.y, p.x, p.y - 11), spd0 = Math.hypot(b.vx, b.vy);
  const perfect = d / Math.max(1, spd0) < 0.075;
  b.owner = 'player';
  const spd = perfect ? 640 : Math.max(spd0 * 1.5, 470);
  b.vx = Math.cos(ang) * spd; b.vy = Math.sin(ang) * spd;
  b.life = 2.2; b.bounces = perfect ? 3 : 1; b.pierce = perfect; b.perfect = perfect; b.trail.length = 0;
  sparks(w, b.x, b.y, ang, perfect ? 26 : 14, perfect ? 380 : 260, perfect ? '#fff4c8' : '#ffd27a');
  ring(w, b.x, b.y, perfect ? 40 : 20, perfect ? 0.45 : 0.25, perfect ? '#fff1c0' : '#e8b04a', perfect ? 2 : 1);
  w.hitstop = Math.max(w.hitstop, perfect ? 7 : 3);
  w.shake = Math.max(w.shake, perfect ? 6 : 3);
  if (perfect) { w.killCam = Math.max(w.killCam, 0.45); w.flash = Math.max(w.flash, 0.25); floatText(w, b.x, b.y - 10, 'perfect return', '#fff1c0'); }
  w.chronos = Math.min(1, w.chronos + 0.06);
  w.fervour = Math.min(100, w.fervour + (perfect ? 10 : 4));
  w.deflects++;
  Sound.play('deflect', perfect);
}
function dropChandelier(w, c) {
  if (c.state !== 'hang') return;
  c.state = 'fall'; c.vy = 0;
  Sound.play('chain');
  sparks(w, c.ax, c.ay + 4, Math.PI / 2, 8, 120, '#ffe2a0');
}
function strikeBell(w, b, dir) {
  if (b.cd > 0) return;
  b.cd = 3.5; b.sv += 2.6 * (dir || 1); b.rung = 1;
  Sound.play('toll'); Sound.play('stun');
  const bx = b.x, by = b.y + 24;
  ring(w, bx, by, 320, 1.1, '#e8c070', 3); ring(w, bx, by, 220, 0.8, '#fff1c0', 1);
  w.shake = Math.max(w.shake, 10); w.flash = Math.max(w.flash, 0.4); w.hitstop = Math.max(w.hitstop, 6);
  for (const e of w.enemies) if (e.alive && dist(bx, by, e.x, e.y) < 330) { e.stunT = 2.4; e.state = 'stun'; e.alerted = true; e.reactT = 0; }
  for (const bo of w.bolts) if (bo.owner === 'enemy' && dist(bx, by, bo.x, bo.y) < 330) {
    bo.owner = 'player'; bo.vx *= -1.4; bo.vy *= -1.4; bo.life = 2; bo.bounces = 1; bo.trail.length = 0;
  }
}

// ---------- player ----------
const PH = { run: 168, jumpV: 392, grav: 1200, wjx: 220, wjy: 355, slide: 78, fall: 470, lunge: 255, rollT: 0.34 };
function canStand(lvl, p) { return !rectSolid(lvl, p.x - p.w / 2, p.y - 22, p.x + p.w / 2, p.y); }
function onOneWay(lvl, p) {
  const ty = Math.floor((p.y + 1) / T);
  const a = lvl.tile(Math.floor((p.x - p.w / 2 + 1) / T), ty), b = lvl.tile(Math.floor((p.x + p.w / 2 - 1) / T), ty);
  return (a === 2 || a === 0) && (b === 2 || b === 0) && (a === 2 || b === 2) && Math.abs(p.y - ty * T) < 1;
}
function touchWall(lvl, p, dir) {
  const x = dir > 0 ? p.x + p.w / 2 + 1 : p.x - p.w / 2 - 1;
  const tx = Math.floor(x / T);
  return lvl.solidAt(tx, Math.floor((p.y - p.h + 3) / T)) && lvl.solidAt(tx, Math.floor((p.y - 4) / T));
}
// Soft lock: a swing snaps to a foe within reach, and to one touching you even if he is behind your back.
function lockTarget(w, ang0) {
  const p = w.p, ox = p.x, oy = p.y - 12;
  for (const b of w.bolts) if (b.owner === 'enemy' && dist(b.x, b.y, ox, oy) < 50) return null; // keep an aimed deflection
  let best = null, bestScore = 1e9;
  for (const e of w.enemies) {
    if (!e.alive) continue;
    const [hx, hy, hw, hh] = hurtBox(e);
    const d = dist(ox, oy, clamp(ox, hx, hx + hw), clamp(oy, hy, hy + hh));
    if (d > 44) continue;
    const tx = hx + hw / 2, ty = hy + hh / 2;
    const ea = Math.atan2(ty - oy, tx - ox), off = Math.abs(angDiff(ang0, ea));
    if (d > 20 && off > 1.2) continue;
    if (!los(w.lvl, ox, oy, tx, ty)) continue;
    const score = d + off * 16;
    if (score < bestScore) { bestScore = score; best = ea; }
  }
  if (best === null) return null;
  const ax = ox + Math.cos(ang0) * 20, ay = oy + Math.sin(ang0) * 20; // a swing at a chain or the bell keeps its aim
  for (const c of w.chans) if (c.state === 'hang' && segPointDist(c.ax, c.ay, c.x, c.y, ax, ay) < 16) return null;
  for (const b of w.bells) if (dist(ax, ay, b.x, b.y + 24) < 24) return null;
  return best;
}
function startAttack(w, inp) {
  const p = w.p, lvl = w.lvl;
  if (p.rollT > 0) { if (canStand(lvl, p)) { p.rollT = 0; p.h = 22; } else return false; }
  const ox = p.x, oy = p.y - 12;
  let ang = Math.atan2(inp.ay - oy, inp.ax - ox);
  const lock = lockTarget(w, ang);
  if (lock !== null) ang = lock;
  p.atkAng = ang; p.atkT = p.atkDur = 0.16; p.atkCD = 0.3; p.atkSide = -p.atkSide;
  p.face = Math.cos(ang) >= 0 ? 1 : -1;
  let L = PH.lunge;
  if (!p.onGround) { L = p.airLunges < 1 ? PH.lunge : 85; p.airLunges++; }
  const lx = Math.cos(ang) * L, ly = Math.sin(ang) * L;
  if (p.onGround) {
    p.vx = lx * 1.05;
    if (ly < -90) { p.vy = ly * 0.95; p.onGround = false; p.jumping = false; }
  } else {
    p.vx = lx;
    p.vy = ly < 0 ? Math.min(p.vy, 0) * 0.15 + ly * 0.92 : Math.max(p.vy, ly * 0.9);
  }
  p.hitSet.length = 0;
  w.slashes.push({ ang, side: p.atkSide, t: 0, dur: 0.17, follow: true, r: 31, kind: 'p', x: 0, y: 0 });
  w.cam.x += Math.cos(ang) * 3; w.cam.y += Math.sin(ang) * 2;
  Sound.play('slash');
  w.noise = { x: p.x, y: p.y, r: 90 };
  return true;
}
function attackHits(w) {
  const p = w.p, ox = p.x, oy = p.y - 12, a = p.atkAng;
  for (const e of w.enemies) {
    if (!e.alive || p.hitSet.includes(e)) continue;
    const [bx, by, bw, bh] = hurtBox(e);
    const cx = clamp(ox, bx, bx + bw), cy = clamp(oy, by, by + bh);
    const d = dist(ox, oy, cx, cy);
    if (d > 33) continue;
    const ea = Math.atan2(by + bh / 2 - oy, bx + bw / 2 - ox);
    if (d > 16 && Math.abs(angDiff(a, ea)) > 1.45) continue;
    p.hitSet.push(e);
    if (shieldBlocks(e, ox, oy)) { blockHit(w, e, a); continue; }
    killEnemy(w, e, a, 'slash');
  }
  for (const b of w.bolts) {
    if (b.owner !== 'enemy' || b.dead) continue;
    const d = dist(ox, oy, b.x, b.y);
    if (d > 46) continue;
    if (d > 20 && Math.abs(angDiff(a, Math.atan2(b.y - oy, b.x - ox))) > 1.9) continue;
    deflect(w, b, a);
  }
  for (const c of w.chans) {
    if (c.state !== 'hang' || p.hitSet.includes(c)) continue;
    const d = Math.min(segPointDist(c.ax, c.ay, c.x, c.y, ox, oy), dist(ox, oy, c.x, c.y));
    if (d < 30) { p.hitSet.push(c); dropChandelier(w, c); }
  }
  for (const b of w.bells) {
    if (p.hitSet.includes(b)) continue;
    if (dist(ox, oy, b.x, b.y + 24) < 36) { p.hitSet.push(b); strikeBell(w, b, Math.cos(a) >= 0 ? 1 : -1); }
  }
}
function updateTail(p, dt) {
  const t = p.tail;
  t[0].x = p.x - p.face * 3; t[0].y = p.y - (p.rollT > 0 ? 8 : 18) + (p.landT > 0 ? 2 : 0);
  if (dt <= 0) return;
  const damp = Math.pow(0.9, dt * 60);
  for (let i = 1; i < t.length; i++) {
    const q = t[i], pr = t[i - 1];
    q.vx = (q.vx + (-p.vx * 2.6 - p.face * 26 + Math.sin(p.t * 7 + i * 0.8) * 16) * dt) * damp;
    q.vy = (q.vy + (240 - p.vy * 1.4 + Math.cos(p.t * 9 + i) * 30) * dt) * damp;
    q.x += q.vx * dt; q.y += q.vy * dt;
    const dx = q.x - pr.x, dy = q.y - pr.y, d = Math.hypot(dx, dy) || 1, L = 2.6;
    if (d > L) { q.x = pr.x + (dx / d) * L; q.y = pr.y + (dy / d) * L; }
  }
}
function updatePlayer(w, inp, dt) {
  const p = w.p, lvl = w.lvl;
  if (p.dead || dt <= 0) { if (!p.dead) updateTail(p, 0); return; }
  p.t += dt;
  const down = inp.down;
  const ix = ((down & B.R) ? 1 : 0) - ((down & B.L) ? 1 : 0);
  p.atkCD -= dt; p.rollCD -= dt; p.landT = Math.max(0, p.landT - dt); p.invuln -= dt; p.dropT -= dt;
  if (p.onGround) { p.coyT = 0.11; p.airLunges = 0; } else p.coyT -= dt;

  // attack (buffered in real time)
  if (p.atkBuf > 0 && p.atkCD <= 0) { if (startAttack(w, inp)) p.atkBuf = 0; }

  // roll / drop-through
  if (p.rollBuf > 0 && p.onGround && p.rollT <= 0 && p.rollCD <= 0 && p.atkT <= 0) {
    p.rollBuf = 0;
    if (onOneWay(lvl, p) && !ix) { p.dropT = 0.22; p.onGround = false; p.y += 2; p.vy = 40; }
    else {
      p.rollT = PH.rollT; p.rollDir = ix || p.face; p.face = p.rollDir; p.rollRot = 0;
      Sound.play('roll'); dust(w, p.x, p.y, 6, -p.rollDir);
    }
  }
  if (p.rollT > 0) {
    p.rollT -= dt;
    const k = clamp(p.rollT / PH.rollT, 0, 1);
    p.vx = p.rollDir * (125 + 205 * k);
    p.rollRot += p.rollDir * dt * 21;
    if (p.rollT <= 0) { if (!canStand(lvl, p)) p.rollT = 0.04; else p.rollCD = 0.1; }
    if (!p.onGround && p.rollT < PH.rollT - 0.1 && canStand(lvl, p)) p.rollT = 0;
  } else {
    let acc;
    if (p.onGround) acc = ix ? (p.vx * ix < 0 ? 3400 : 2100) : 2700;
    else acc = ix ? 1350 : 420;
    if (p.lockT > 0) { p.lockT -= dt; acc *= 0.22; }
    const target = ix * PH.run;
    if (Math.abs(p.vx) > PH.run && (ix === sign(p.vx) || !p.onGround)) p.vx = approach(p.vx, target, (p.onGround ? 1000 : 240) * dt);
    else p.vx = approach(p.vx, target, acc * dt);
    if (ix && p.atkT <= 0) p.face = ix;
  }
  p.h = p.rollT > 0 ? 12 : 22;

  // jump / wall jump
  if (p.bufT > 0) {
    if (p.coyT > 0 && (p.rollT <= 0 || canStand(lvl, p))) {
      p.rollT = 0; p.h = 22;
      p.vy = -PH.jumpV; p.jumping = true; p.onGround = false; p.coyT = 0; p.bufT = 0;
      Sound.play('jump'); dust(w, p.x, p.y, 5);
    } else if (!p.onGround && p.wallTouch) {
      p.vx = -p.wallTouch * PH.wjx; p.vy = -PH.wjy; p.face = -p.wallTouch; p.lockT = 0.13;
      p.jumping = true; p.bufT = 0; p.airLunges = 0;
      Sound.play('jump'); dust(w, p.x + p.wallTouch * 5, p.y - 10, 6, -p.wallTouch);
    }
  }
  if (p.jumping && !(down & B.J) && p.vy < -110) { p.vy *= 0.45; p.jumping = false; }
  if (p.vy >= 0) p.jumping = false;

  // gravity / wall slide
  let grav = PH.grav;
  if (Math.abs(p.vy) < 55 && (down & B.J) && !p.onGround) grav *= 0.55;
  p.vy += grav * dt;
  p.wallTouch = 0;
  if (!p.onGround && p.rollT <= 0) { if (touchWall(lvl, p, -1)) p.wallTouch = -1; else if (touchWall(lvl, p, 1)) p.wallTouch = 1; }
  p.wall = p.wallTouch && ix === p.wallTouch && p.vy > 0 ? p.wallTouch : 0;
  if (p.wall) {
    p.vy = Math.min(p.vy, PH.slide); p.face = p.wall; p.airLunges = 0;
    if (R() < 0.25) part(w, p.x + p.wall * 5, p.y - 16, -p.wall * rnd(10, 30), rnd(-10, 10), 0.3, '#7a6e6a', 1, 4, 30, 0.9);
  }
  if ((down & B.D) && !p.onGround && p.rollT <= 0 && p.dropT <= 0) p.vy = Math.min(p.vy + 1500 * dt, 600);
  p.vy = Math.min(p.vy, p.wall ? PH.slide : (down & B.D) ? 600 : PH.fall);

  // integrate
  const wasGround = p.onGround, prevB = p.y, vyIn = p.vy;
  moveX(lvl, p, p.vx * dt);
  p.onGround = false;
  const hy = moveY(lvl, p, p.vy * dt, prevB, p.dropT > 0);
  if (hy > 0) {
    p.onGround = true;
    if (!wasGround) {
      p.landT = clamp(vyIn / 420, 0.2, 1) * 0.12;
      if (vyIn > 150) { Sound.play('land'); dust(w, p.x, p.y, Math.round(vyIn / 60)); }
    }
  }
  // spikes
  const sx0 = Math.floor((p.x - p.w / 2 + 1) / T), sx1 = Math.floor((p.x + p.w / 2 - 1) / T), sty = Math.floor((p.y - 1) / T);
  for (let tx = sx0; tx <= sx1; tx++) if (lvl.tile(tx, sty) === 3 && p.y > sty * T + 7) { killPlayer(w, 'spikes', -Math.PI / 2); return; }

  // anim
  if (p.onGround && Math.abs(p.vx) > 20 && p.rollT <= 0) {
    const before = Math.floor(p.runPh / Math.PI);
    p.runPh += dt * Math.abs(p.vx) * 0.078;
    if (Math.floor(p.runPh / Math.PI) !== before) { Sound.play('step'); if (R() < 0.5) dust(w, p.x - p.face * 3, p.y, 1); }
  }
  updateTail(p, dt);
}

// ---------- enemies ----------
function canSee(w, e, p) {
  const ex = e.x, ey = e.y - e.h * 0.8, px = p.x, py = p.y - 14;
  const dx = px - ex, dy = py - ey, ad = Math.abs(dx);
  const range = e.type === 'gargoyle' ? 360 : 320;
  if (ad > range || Math.abs(dy) > 150) return false;
  if (e.type === 'gargoyle' && dx * e.face < 0) return false;
  if (!e.alerted && dx * e.face < 0 && ad > 36) return false;
  if (!e.alerted && ad > w.diff.sight) return false;
  return los(w.lvl, ex, ey, px, py);
}
function alertEnemy(w, e) {
  if (e.alerted) return;
  e.alerted = true;
  const D = w.diff;
  e.reactT = e.reactDur = e.type === 'gargoyle' ? 0.5 * D.aim : rnd(D.react[0], D.react[1]);
  Sound.play('alert');
  for (const o of w.enemies) if (o !== e && o.alive && !o.alerted && o.pendAlert <= 0 && dist(o.x, o.y, e.x, e.y) < D.call) o.pendAlert = 0.35;
}
function ledgeAhead(w, e) {
  const fx = e.x + e.face * (e.w / 2 + 3);
  const t = w.lvl.tile(Math.floor(fx / T), Math.floor((e.y + 2) / T));
  return t === 0 || t === 3;
}
function wallAhead(w, e) { return w.lvl.solidAt(Math.floor((e.x + e.face * (e.w / 2 + 2)) / T), Math.floor((e.y - 8) / T)); }
function enemyPhysics(w, e, dt) {
  if (e.type === 'gargoyle' || dt <= 0) return;
  e.vy = Math.min(e.vy + 1200 * dt, 520);
  const prevB = e.y;
  moveX(w.lvl, e, e.vx * dt);
  e.onGround = moveY(w.lvl, e, e.vy * dt, prevB, false) > 0;
  if (Math.abs(e.vx) > 10) e.walkPh += dt * Math.abs(e.vx) * 0.1;
}
function handPos(e) { const G = EGEO[e.type]; return [e.x + e.face * (G.ax - G.ex), e.y + (G.ey - G.ay)]; }
function aimAt(e, p) { const [hx, hy] = handPos(e); return Math.atan2(p.y - 11 - hy, p.x - hx); }
function fireBolt(w, x, y, ang, spd, owner, life = 3) {
  w.bolts.push({ x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, owner, life, bounces: 0, pierce: false, perfect: false, trail: [], nm: false, dead: false });
}
function enemyFire(w, e) {
  const [hx, hy] = handPos(e);
  if (e.type === 'priest') {
    for (const o of w.diff.spread) fireBolt(w, hx, hy, e.aimAng + o, 255 * w.diff.bolt, 'enemy', 0.85 / w.diff.bolt);
    Sound.play('shotgun');
  } else {
    fireBolt(w, hx, hy, e.aimAng, (e.type === 'gargoyle' ? 300 : 335) * w.diff.bolt, 'enemy');
    Sound.play('bolt');
  }
  sparks(w, hx, hy, e.aimAng, 8, 160, '#ff5a4a', 0.5);
  w.noise = { x: e.x, y: e.y, r: 140 };
}
function updateEnemies(w, dt) {
  const p = w.p;
  for (const e of w.enemies) {
    if (!e.alive) continue;
    e.flash = Math.max(0, e.flash - dt);
    if (dt <= 0) continue;
    e.t += dt;
    if (e.stunT > 0) {
      e.stunT -= dt; e.vx = approach(e.vx, 0, 600 * dt);
      enemyPhysics(w, e, dt);
      if (e.stunT <= 0) { e.state = 'chase'; e.st = 0; }
      continue;
    }
    const sees = !p.dead && canSee(w, e, p);
    if (!e.alerted) {
      if (e.pendAlert > 0) { e.pendAlert -= dt; if (e.pendAlert <= 0) alertEnemy(w, e); }
      if (sees) alertEnemy(w, e);
      else if (w.noise && dist(w.noise.x, w.noise.y, e.x, e.y) < w.noise.r) alertEnemy(w, e);
    }
    e.alert = approach(e.alert, e.alerted ? 1 : 0, dt * 4);
    if (!e.alerted || e.reactT > 0 || p.dead) {
      if (e.reactT > 0) { e.reactT -= dt; if (e.type !== 'gargoyle') e.face = sign(p.x - e.x) || e.face; }
      e.vx = approach(e.vx, 0, 600 * dt);
      enemyPhysics(w, e, dt);
      continue;
    }
    const dx = p.x - e.x, dy = p.y - e.y, ad = Math.abs(dx), D = w.diff;
    switch (e.type) {
      case 'grunt': {
        if (e.state === 'idle' || e.state === 'chase') {
          e.state = 'chase'; e.face = sign(dx) || e.face;
          if (ad < 30 && Math.abs(dy) < 30) { e.state = 'windup'; e.st = 0; e.windDur = 0.27 * D.wind; e.flash = e.windDur; Sound.play('windup'); }
          else {
            let tg = e.face * 122 * D.chase;
            if ((e.onGround && ledgeAhead(w, e) && dy < 10) || wallAhead(w, e)) tg = 0;
            e.vx = approach(e.vx, tg, 900 * dt);
          }
        } else if (e.state === 'windup') {
          e.st += dt; e.vx = approach(e.vx, 0, 900 * dt);
          if (e.st >= e.windDur) { e.state = 'strike'; e.st = 0; e.vx = ledgeAhead(w, e) ? 0 : e.face * 190; Sound.play('swing'); }
        } else if (e.state === 'strike') {
          e.st += dt;
          if (!p.dead && !(p.rollT > 0.05) && overlap(e.x + e.face * 12 - 14, e.y - 26, 28, 26, ...boxOf(p))) killPlayer(w, 'blade', e.face > 0 ? -0.2 : Math.PI + 0.2);
          if (e.st > 0.12) { e.state = 'recover'; e.st = 0; }
        } else if (e.state === 'recover') {
          e.st += dt; e.vx = approach(e.vx, 0, 700 * dt);
          if (e.st > 0.42) e.state = 'chase';
        }
        break;
      }
      case 'acolyte': case 'priest': {
        const isP = e.type === 'priest';
        if (e.state === 'idle' || e.state === 'chase' || e.state === 'stun') {
          e.state = 'chase'; e.face = sign(dx) || e.face;
          let tg = 0;
          if (sees && ad < (isP ? 210 : 330)) { e.state = 'aim'; e.st = 0; e.aimDur = (isP ? 0.72 : 0.6) * D.aim; e.aimAng = aimAt(e, p); e.lostT = 0; }
          else if (ad > (isP ? 110 : 150)) tg = e.face * (isP ? 75 : 62);
          if (ad < 56 && !isP) { e.face = sign(dx) || e.face; tg = -e.face * 85; }
          const f0 = e.face; e.face = sign(tg) || e.face;
          if (tg && ((e.onGround && ledgeAhead(w, e)) || wallAhead(w, e))) tg = 0;
          e.face = f0;
          e.vx = approach(e.vx, tg, 600 * dt);
        } else if (e.state === 'aim') {
          e.st += dt; e.vx = approach(e.vx, 0, 800 * dt);
          e.face = sign(dx) || e.face;
          if (e.st < e.aimDur - 0.16) {
            e.aimAng = aimAt(e, p);
            if (!sees) { e.lostT += dt; if (e.lostT > 0.25) { e.state = 'chase'; e.st = 0; } } else e.lostT = 0;
          }
          if (e.state === 'aim' && e.st >= e.aimDur) { enemyFire(w, e); e.state = 'cool'; e.st = 0; }
        } else if (e.state === 'cool') {
          e.st += dt; e.vx = approach(e.vx, 0, 600 * dt);
          if (e.st > (isP ? 1.45 : 0.95) * D.aim) e.state = 'chase';
        }
        break;
      }
      case 'shield': {
        if (e.staggerT > 0) { e.staggerT -= dt; e.vx = approach(e.vx, 0, 500 * dt); break; }
        if (e.state === 'idle' || e.state === 'chase' || e.state === 'stun') {
          e.state = 'chase';
          if (sign(dx) !== e.face && ad > 4) { e.turnT += dt; if (e.turnT > 0.38) { e.face = -e.face; e.turnT = 0; } } else e.turnT = 0;
          let tg = sign(dx) === e.face && ad > 28 ? e.face * 58 * D.chase : 0;
          if (tg && ((e.onGround && ledgeAhead(w, e) && dy < 10) || wallAhead(w, e))) tg = 0;
          e.vx = approach(e.vx, tg, 500 * dt);
          if (ad < 38 && Math.abs(dy) < 26 && sign(dx) === e.face) { e.state = 'windup'; e.st = 0; e.windDur = 0.4 * D.wind; e.flash = e.windDur; Sound.play('windup'); }
        } else if (e.state === 'windup') {
          e.st += dt; e.vx = approach(e.vx, 0, 800 * dt);
          if (e.st >= e.windDur) { e.state = 'bash'; e.st = 0; e.vx = e.face * 245; Sound.play('swing'); }
        } else if (e.state === 'bash') {
          e.st += dt;
          if (!p.dead && !(p.rollT > 0.05) && overlap(e.x + e.face * 10 - 11, e.y - 26, 22, 26, ...boxOf(p))) killPlayer(w, 'shield', e.face > 0 ? -0.3 : Math.PI + 0.3);
          if (e.st > 0.17) { e.state = 'recover'; e.st = 0; }
        } else if (e.state === 'recover') {
          e.st += dt; e.vx = approach(e.vx, 0, 600 * dt);
          if (e.st > 0.5) e.state = 'chase';
        }
        break;
      }
      case 'gargoyle': {
        if (e.state === 'idle' || e.state === 'chase' || e.state === 'stun') { e.state = 'chase'; if (sees) { e.state = 'aim'; e.st = 0; e.aimDur = 0.8 * D.aim; } }
        else if (e.state === 'aim') {
          e.st += dt;
          if (e.st < e.aimDur - 0.18) e.aimAng = aimAt(e, p);
          if (e.st >= e.aimDur) { enemyFire(w, e); e.state = 'cool'; e.st = 0; }
        } else if (e.state === 'cool') { e.st += dt; if (e.st > 1.5 * D.aim) e.state = 'chase'; }
        break;
      }
    }
    enemyPhysics(w, e, dt);
  }
  w.noise = null;
}

// ---------- bolts, props, gibs, particles ----------
function updateBolts(w, dt) {
  const p = w.p, lvl = w.lvl;
  for (const b of w.bolts) {
    if (b.dead) continue;
    if (dt <= 0) continue;
    b.life -= dt;
    if (b.life <= 0) { b.dead = true; continue; }
    b.trail.push(b.x, b.y); if (b.trail.length > 14) b.trail.splice(0, 2);
    const n = Math.max(1, Math.ceil((Math.hypot(b.vx, b.vy) * dt) / 4));
    for (let i = 0; i < n && !b.dead; i++) {
      const ox = b.x, oy = b.y;
      b.x += (b.vx * dt) / n; b.y += (b.vy * dt) / n;
      if (lvl.solidAt(Math.floor(b.x / T), Math.floor(b.y / T))) {
        if (b.owner === 'player' && b.bounces > 0) {
          b.bounces--;
          const hx = lvl.solidAt(Math.floor(b.x / T), Math.floor(oy / T)), hy = lvl.solidAt(Math.floor(ox / T), Math.floor(b.y / T));
          if (hx || !hy) b.vx = -b.vx;
          if (hy || !hx) b.vy = -b.vy;
          b.x = ox; b.y = oy; b.bounced = true;
          sparks(w, ox, oy, Math.atan2(b.vy, b.vx), 8, 160, '#ffd27a');
          Sound.play('wall');
        } else { b.dead = true; sparks(w, ox, oy, Math.atan2(-b.vy, -b.vx), 7, 130, b.owner === 'player' ? '#ffd27a' : '#ff6a50'); continue; }
      }
      if (b.owner === 'enemy') {
        if (!p.dead) {
          const [px, py, pw, ph] = boxOf(p);
          if (b.x > px - 1 && b.x < px + pw + 1 && b.y > py - 1 && b.y < py + ph + 1) {
            if (p.rollT > 0.05 || w.rite || p.invuln > 0) { if (!b.nm) { b.nm = true; sparks(w, b.x, b.y, 0, 3, 50, '#ffffff', 3); } }
            else { killPlayer(w, 'bolt', Math.atan2(b.vy, b.vx)); b.dead = true; break; }
          } else if (!b.nm && dist(b.x, b.y, p.x, p.y - 11) < 17) {
            b.nm = true;
            if (!w.slowOn && w.nearMiss <= 0) w.nearMiss = 0.2;
          }
        }
      } else {
        for (const e of w.enemies) {
          if (!e.alive) continue;
          const [ex, ey, ew, eh] = hurtBox(e);
          if (b.x > ex && b.x < ex + ew && b.y > ey && b.y < ey + eh) {
            if (e.type === 'shield' && e.stunT <= 0 && b.vx * e.face < 0) {
              b.dead = true; sparks(w, b.x, b.y, Math.atan2(-b.vy, -b.vx), 12, 200); Sound.play('block'); break;
            }
            killEnemy(w, e, Math.atan2(b.vy, b.vx), b.bounced ? 'ricochet' : 'deflect');
            if (!b.pierce) { b.dead = true; break; }
          }
        }
        for (const c of w.chans) if (c.state === 'hang' && segPointDist(c.ax, c.ay, c.x, c.y, b.x, b.y) < 5) { dropChandelier(w, c); }
        for (const bl of w.bells) if (dist(b.x, b.y, bl.x, bl.y + 24) < 17) { strikeBell(w, bl, sign(b.vx)); b.dead = true; }
      }
    }
  }
  if (w.bolts.some((b) => b.dead)) w.bolts = w.bolts.filter((b) => !b.dead);
}
function updateChans(w, dt) {
  for (const c of w.chans) {
    if (dt <= 0) continue;
    if (c.state === 'hang') {
      c.t += dt;
      const a = Math.sin(c.t * 1.3) * 0.05;
      c.x = c.ax + Math.sin(a) * c.len; c.y = c.ay + Math.cos(a) * c.len;
    } else if (c.state === 'fall') {
      c.vy = Math.min(c.vy + 950 * dt, 700);
      c.y += c.vy * dt;
      for (const e of w.enemies) if (e.alive && overlap(c.x - 28, c.y - 8, 56, 18, ...boxOf(e))) killEnemy(w, e, Math.PI / 2 + (e.x - c.x) * 0.02, 'crush');
      if (!w.p.dead && overlap(c.x - 18, c.y - 8, 36, 14, ...boxOf(w.p))) killPlayer(w, 'crush', Math.PI / 2);
      const ty = Math.floor((c.y + 7) / T), t1 = w.lvl.tile(Math.floor(c.x / T), ty);
      if (t1 === 1 || t1 === 2) {
        c.y = ty * T - 7; c.state = 'down';
        Sound.play('crash'); w.shake = Math.max(w.shake, 10);
        for (let i = 0; i < 26; i++) part(w, c.x + rnd(-18, 18), c.y, rnd(-120, 120), -rnd(60, 260), rnd(0.5, 1.4), i % 2 ? '#ffb347' : '#ffe2a0', 1, 2, 500, 0.97);
        dust(w, c.x, c.y + 7, 14);
      }
    }
  }
}
function updateBells(w, dt) {
  for (const b of w.bells) {
    b.cd -= STEP;
    if (dt <= 0) continue;
    b.sv += -b.swing * 26 * dt; b.sv *= Math.pow(0.985, dt * 60); b.swing += b.sv * dt;
    b.rung = Math.max(0, b.rung - dt * 0.8);
  }
}
function updateGibs(w, dt) {
  if (dt <= 0) return;
  const lvl = w.lvl;
  for (const g of w.gibs) {
    g.life += dt;
    g.vy = Math.min(g.vy + 900 * dt, 600);
    const nx = g.x + g.vx * dt;
    if (lvl.solidAt(Math.floor(nx / T), Math.floor((g.y - 2) / T))) { g.vx *= -0.35; g.va *= 0.6; } else g.x = nx;
    const ny = g.y + g.vy * dt;
    const ty = Math.floor((ny + 5) / T), t = lvl.tile(Math.floor(g.x / T), ty);
    if (g.vy > 0 && (t === 1 || (t === 2 && g.y + 5 <= ty * T + 1))) {
      g.y = ty * T - 5; g.vy *= -0.28; g.vx *= 0.6; g.va *= 0.5;
      if (Math.abs(g.vy) < 40) g.vy = 0;
    } else if (g.vy < 0 && lvl.solidAt(Math.floor(g.x / T), Math.floor((ny - 5) / T))) g.vy = 0;
    else g.y = ny;
    g.a += g.va * dt;
    if (g.vy === 0) { g.vx = approach(g.vx, 0, 400 * dt); g.va = approach(g.va, 0, 20 * dt); }
    const spd = Math.hypot(g.vx, g.vy);
    if (g.bleed > 0) { g.bleed -= dt; if (R() < 0.7 && spd > 20) part(w, g.x, g.y, g.vx * 0.2 + rnd(-20, 20), g.vy * 0.2, rnd(0.4, 0.9), BLOODC[(R() * 5) | 0], 1, 1, 650, 0.99); }
    if (g.toss && spd > 230 && g.life > 0.03) {
      for (const e of w.enemies) if (e.alive && overlap(g.x - 6, g.y - 6, 12, 12, ...hurtBox(e))) { killEnemy(w, e, Math.atan2(g.vy, g.vx), 'gib'); g.toss = false; g.vx *= 0.3; break; }
    }
  }
}
function updateParts(w, dt) {
  if (dt <= 0) return;
  const lvl = w.lvl, dg = w.dg;
  let j = 0;
  for (let i = 0; i < w.parts.length; i++) {
    const q = w.parts[i];
    q.life -= dt;
    if (q.life <= 0) continue;
    q.vy += q.g * dt;
    if (q.d !== 1) { const f = Math.pow(q.d, dt * 60); q.vx *= f; q.vy *= f; }
    const ox = q.x, oy = q.y;
    q.x += q.vx * dt; q.y += q.vy * dt;
    if (q.k === 1) {
      const tx = Math.floor(q.x / T), ty = Math.floor(q.y / T), t = lvl.tile(tx, ty);
      if (t === 1 || (t === 2 && oy <= ty * T && q.vy > 0) || t === 3) {
        dg.fillStyle = q.c;
        const sx = t === 1 ? (lvl.solidAt(Math.floor(ox / T), ty) ? q.x : ox) : q.x;
        const sy = t === 2 ? ty * T : (lvl.solidAt(tx, Math.floor(oy / T)) ? oy : q.y);
        dg.fillRect(Math.floor(sx), Math.floor(sy), q.s + (R() < 0.3 ? 1 : 0), q.s);
        if (R() < 0.15 && t === 1) dg.fillRect(Math.floor(sx), Math.floor(sy) + 1, 1, 1 + ((R() * 3) | 0));
        continue;
      }
    }
    w.parts[j++] = q;
  }
  w.parts.length = j;
}

// ---------- the Last Rites ----------
function freeSpot(lvl, x, y, pw, ph) {
  const offs = [[0, 0], [0, -4], [7, 0], [-7, 0], [14, 0], [-14, 0], [0, -12], [9, -12], [-9, -12], [22, 0], [-22, 0], [0, -24]];
  for (const [ox, oy] of offs) if (!rectSolid(lvl, x + ox - pw / 2, y + oy - ph, x + ox + pw / 2, y + oy)) return { x: x + ox, y: y + oy };
  return null;
}
function startRite(w) {
  w.rite = { phase: 'mark', t: 0, marks: [], sx: w.p.x, sy: w.p.y };
  w.p.atkT = 0;
  Sound.play('riteIn');
}
function updateRite(w, inp) {
  const r = w.rite, p = w.p;
  if (r.phase === 'mark') {
    r.t += STEP;
    const last = r.marks[r.marks.length - 1];
    const lx = last ? last.x : p.x, ly = last ? last.y - last.h / 2 : p.y - 12;
    for (const e of w.enemies) {
      if (!e.alive || e.marked || r.marks.length >= 7) continue;
      const ecx = e.x, ecy = e.y - e.h / 2;
      if (segPointDist(w.aimPX, w.aimPY, inp.ax, inp.ay, ecx, ecy) > 15) continue;
      if (dist(lx, ly, ecx, ecy) > 290 || !los(w.lvl, lx, ly, ecx, ecy)) continue;
      e.marked = true; r.marks.push(e);
      Sound.play('mark', r.marks.length - 1);
      ring(w, ecx, ecy, 22, 0.4, '#ff3a3a', 1);
      break;
    }
    if (!(inp.down & B.E) || r.t > 3.4) {
      if (r.marks.length) { r.phase = 'exec'; r.i = 0; r.k = 0; r.fx = p.x; r.fy = p.y; r.pause = 0.06; Sound.play('dash'); }
      else { w.rite = null; w.riteCD = 0.25; }
    }
  } else if (r.phase === 'exec') {
    if (r.pause > 0) { r.pause -= STEP; return; }
    const e = r.marks[r.i];
    r.k += STEP / 0.065;
    const k = Math.min(1, r.k), ek = easeInOut(k);
    const tx = e.x, ty = e.y;
    const nx = lerp(r.fx, tx, ek), ny = lerp(r.fy, ty, ek);
    for (let s = 0; s < 4; s++) part(w, lerp(p.x, nx, s / 4) + rnd(-2, 2), lerp(p.y - 12, ny - 12, s / 4) + rnd(-6, 6), rnd(-10, 10), rnd(-10, 10), rnd(0.4, 0.9), R() < 0.3 ? '#c0102a' : '#0a0608', R() < 0.4 ? 2 : 1, 5, 0, 1);
    p.x = nx; p.y = ny; p.vx = 0; p.vy = 0; p.face = tx >= r.fx ? 1 : -1; p.rollT = 0; p.atkT = 0; p.h = 22;
    afterimage(w, '#0b0609', 0.5);
    if (k >= 1) {
      const ang = Math.atan2(ty - r.fy, tx - r.fx || 0.0001);
      e.doomed = true; e.riteAng = Math.abs(ang) < 0.01 && tx === r.fx ? 0 : ang;
      w.slashes.push({ x: e.x, y: e.y - e.h / 2, ang: e.riteAng, side: r.i % 2 ? 1 : -1, t: 0, dur: 0.75, follow: false, r: 24, kind: 'rite' });
      Sound.play('dash'); w.shake = Math.max(w.shake, 4);
      r.fx = tx; r.fy = ty; r.i++; r.k = 0; r.pause = 0.04;
      if (r.i >= r.marks.length) {
        const spot = freeSpot(w.lvl, tx + (p.face * 4), ty, p.w, 22) || { x: r.sx, y: r.sy };
        p.x = spot.x; p.y = spot.y; p.onGround = false;
        p.atkAng = ang; p.atkSide = 1;
        r.phase = 'finale'; r.t = 0; p.landT = 0.12;
      }
    }
  } else if (r.phase === 'finale') {
    r.t += STEP;
    if (r.t >= 0.5 && !r.sheathed) { r.sheathed = true; Sound.play('sheath'); }
    if (r.t >= 0.66) {
      Sound.play('gong');
      w.flash = 1; w.shake = 15;
      const marks = r.marks;
      w.rite = { phase: 'done' };
      for (const e of marks) if (e.alive) killEnemy(w, e, e.riteAng, 'rite');
      if (marks.length >= 2) floatText(w, p.x, p.y - 40, `last rites  ${marks.length} absolved`, '#ff9a8a');
      for (const e of marks) { e.doomed = false; e.marked = false; }
      w.rite = null;
      w.fervour = 0; w.rites++; w.killCam = Math.max(w.killCam, 0.9); p.invuln = 0.5;
    }
  }
}

// ---------- time & camera ----------
function computeTimeScale(w, inp) {
  const p = w.p;
  const want = (inp.down & B.S) && !w.chronosLock && w.chronos > 0.01 && !p.dead && !w.rite && !w.exited;
  if (want && !w.slowOn) Sound.play('slowIn');
  if (!want && w.slowOn) Sound.play('slowOut');
  w.slowOn = want;
  if (w.slowOn) { w.chronos -= STEP / 4.4; w.chronosIdle = 0; if (w.chronos <= 0) { w.chronos = 0; w.chronosLock = true; } }
  else { w.chronosIdle += STEP; if (w.chronosIdle > 0.5) w.chronos = Math.min(1, w.chronos + STEP / 7.5); if (w.chronosLock && w.chronos > 0.25) w.chronosLock = false; }
  let target = 1;
  if (w.slowOn) target = 0.28;
  if (w.killCam > 0) { w.killCam -= STEP; target = Math.min(target, 0.24); }
  if (w.nearMiss > 0) { w.nearMiss -= STEP; target = Math.min(target, 0.42); }
  if (p.dead) target = Math.min(target, 0.2);
  w.tsS += (target - w.tsS) * (target < w.tsS ? 0.4 : 0.1);
  let ts = w.tsS;
  if (w.rite) ts = w.rite.phase === 'mark' ? 0.035 : 0;
  if (w.hitstop > 0) { w.hitstop--; ts = 0; }
  w.ts = ts;
  const vis = w.rite ? 1 : w.slowOn ? 1 : w.killCam > 0 ? 0.7 : w.nearMiss > 0 ? 0.5 : 0;
  w.slowK += (vis - w.slowK) * 0.15;
}
function updateCamera(w, inp) {
  const p = w.p, c = w.cam, lvl = w.lvl;
  const tx = p.x + clamp((inp.ax - p.x) * 0.2, -64, 64) - W / 2;
  const ty = p.y - 26 + clamp((inp.ay - (p.y - 12)) * 0.16, -42, 42) - H / 2;
  const k = w.rite && w.rite.phase !== 'mark' ? 0.22 : 0.11;
  c.x += (tx - c.x) * k; c.y += (ty - c.y) * k;
  c.x = clamp(c.x, 0, lvl.w * T - W); c.y = clamp(c.y, 0, lvl.h * T - H);
}

// ---------- one simulation step ----------
// inp: { down, pressed, ax, ay }  (aim in world coordinates)
function simStep(w, inp) {
  const p = w.p;
  w.steps++;
  if (inp.pressed & B.J) p.bufT = 0.13; else p.bufT -= STEP;
  if (inp.pressed & B.A) p.atkBuf = 0.11; else p.atkBuf -= STEP;
  if (inp.pressed & B.D) p.rollBuf = 0.1; else p.rollBuf -= STEP;
  w.riteCD -= STEP;
  if (!w.rite && (inp.pressed & B.E) && w.fervour >= 100 && !p.dead && w.clearT < 0 && w.riteCD <= 0 && w.enemies.some((e) => e.alive)) startRite(w);
  else if (!w.rite && (inp.pressed & B.E) && w.fervour < 100 && !p.dead) w.riteDeny = 0.6;
  w.riteDeny = Math.max(0, (w.riteDeny || 0) - STEP);
  computeTimeScale(w, inp);
  const dt = STEP * w.ts;
  const pdt = w.rite ? (w.rite.phase === 'mark' ? dt : 0) : w.slowOn && w.ts > 0 ? STEP * Math.sqrt(w.ts) : dt;
  w.t += dt;
  if (w.rite) updateRite(w, inp);
  if (!w.rite || w.rite.phase === 'mark') {
    updatePlayer(w, inp, pdt);
    if (p.atkT > 0 && pdt > 0) { p.atkT -= pdt; if (p.atkT > p.atkDur - 0.11) attackHits(w); }
  }
  if (!w.rite || w.rite.phase === 'mark') {
    if ((w.slowOn || w.killCam > 0) && w.steps % 3 === 0 && !p.dead) afterimage(w, w.steps % 6 ? '#b3203a' : '#e0a848', 0.3);
    else if ((p.rollT > 0 || Math.abs(p.vx) > 215 || p.atkT > 0) && w.steps % 2 === 0 && !p.dead) afterimage(w, '#7a1424', 0.18);
  }
  updateEnemies(w, dt);
  updateBolts(w, dt);
  updateChans(w, dt);
  updateBells(w, dt);
  updateGibs(w, dt);
  updateParts(w, dt);
  for (const s of w.slashes) s.t += s.kind === 'rite' ? STEP : pdt > 0 ? pdt : dt;
  if (w.slashes.length) w.slashes = w.slashes.filter((s) => s.t < s.dur);
  for (const a of w.afters) a.life -= STEP;
  if (w.afters.length) w.afters = w.afters.filter((a) => a.life > 0);
  for (const r of w.rings) { r.life -= STEP; r.r += (r.r1 - r.r) * 0.16; }
  if (w.rings.length) w.rings = w.rings.filter((r) => r.life > 0);
  w.shake *= 0.86; w.flash = Math.max(0, w.flash - STEP * 2.5); w.zoom *= 0.84;
  for (const f of w.floats) { f.life -= STEP; f.y -= 12 * STEP; }
  if (w.floats.length) w.floats = w.floats.filter((f) => f.life > 0);
  w.multiT -= STEP;
  if (w.clearT >= 0) { w.clearT += STEP; if (w.clearT > 0.5) w.doorOpen = Math.min(1, w.doorOpen + STEP * 1.4); }
  if (p.dead) w.dyingT += STEP;
  const ex = w.lvl.exit;
  if (ex && w.doorOpen > 0.35 && !p.dead && !w.exited && overlap(ex.x - 12, ex.y - 44, 24, 44, ...boxOf(p))) {
    w.exited = true;
    if (G.onExit) G.onExit();
  }
  updateCamera(w, inp);
  w.aimPX = inp.ax; w.aimPY = inp.ay;
}
