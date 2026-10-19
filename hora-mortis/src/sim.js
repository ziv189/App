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
  lvl.resetOver();
  const art = {
    tiles: buildTileLayer(lvl, th), fog: buildFog(th.fog), decal: mkCanvas(lvl.w * T, lvl.h * T),
    far: buildFar(th), decor: placeDecor(lvl, th), weak: buildWeakTile(th),
  };
  if (th.sky) {
    // the towers keep their own stonework, with arches open to the night sky
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
const isOneWay = (t) => t === 2 || t === 4;
const isSolidT = (t) => t === 1 || t === 5;
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
      if (isSolidT(t) || (isOneWay(t) && !drop && prevBottom <= ty * T + 0.5)) { e.y = ty * T; e.vy = 0; return 1; }
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
// does a line of sight pass through a curtain of falling sand?
function sandBlocks(lvl, x0, y0, x1, y1) {
  for (const s of lvl.sands) {
    const sx0 = s.x + 2, sx1 = s.x + s.w - 2;
    if (Math.max(x0, x1) < sx0 || Math.min(x0, x1) > sx1) continue;
    const xm = clamp((sx0 + sx1) / 2, Math.min(x0, x1), Math.max(x0, x1));
    const k = x1 === x0 ? 0 : (xm - x0) / (x1 - x0), y = y0 + (y1 - y0) * k;
    if (y > s.y0 && y < s.y1) return true;
  }
  return false;
}
function inSand(lvl, x, y) {
  for (const s of lvl.sands) if (x > s.x && x < s.x + s.w && y > s.y0 && y < s.y1) return true;
  return false;
}
function rayLen(lvl, x0, y0, a, max) {
  const c = Math.cos(a), s = Math.sin(a);
  for (let d = 0; d < max; d += 3) if (lvl.solidAt(Math.floor((x0 + c * d) / T), Math.floor((y0 + s * d) / T))) return d;
  return max;
}
// first floor (solid or a beam) straight below a point
function floorBelow(lvl, x, y, max = 160) {
  const tx = Math.floor(x / T);
  for (let ty = Math.floor(y / T); ty < Math.floor((y + max) / T) + 1; ty++) {
    const t = lvl.tile(tx, ty);
    if (t !== 0 && t !== 3) return ty * T;
    if (t === 3) return ty * T + 8;
  }
  return null;
}
const boxOf = (e) => [e.x - e.w / 2, e.y - e.h, e.w, e.h];
// What the player's blade and returned bolts can hit: sized to the sprites, a little larger than the physics box.
const HURT = {
  grunt: [18, 31], acolyte: [16, 34], priest: [18, 34], shield: [24, 32], gargoyle: [20, 24], bomb: [18, 31],
  inquisitor: [16, 32], herald: [16, 32], fallen: [16, 32], cherub: [18, 16],
};
function hurtBox(e) {
  const [hw, hh] = HURT[e.type] || [e.w, e.h];
  if (e.type === 'gargoyle') return [e.x - hw / 2 + e.face * 3, e.y - 22, hw, hh];
  if (e.type === 'cherub') return [e.x - hw / 2, e.y - 16, hw, hh];
  return [e.x - hw / 2, e.y - hh, hw, hh];
}

// Pilgrim: slower foes, one ward per life, and the verse remembers your progress.
// Penitent: the original hour, where one blow ends it.
const DIFF = {
  pilgrim: { react: [0.5, 0.72], aim: 1.35, bolt: 0.78, wind: 1.5, chase: 0.85, ward: 1, sight: 220, call: 130, spread: [-0.26, 0, 0.26], boss: 0.8 },
  penitent: { react: [0.3, 0.46], aim: 1, bolt: 1, wind: 1, chase: 1, ward: 0, sight: 250, call: 170, spread: [-0.3, -0.15, 0, 0.15, 0.3], boss: 1 },
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
    landT: 0, runPh: 0, t: 0, dead: false, invuln: 0, tail: [], pose: newPose(), _px: x, _py: y,
    item: null, throwT: 0, throwAng: 0, throwCD: 0, castT: 0, castAng: 0, chain: null, chainCD: 0, zip: null, zipAng: 0, zipT: 0,
    plunge: false, plungeHang: 0, plungeLag: 0, parryT: 0, hurtT: 0, stunT: 0, kneel: 0, dashPose: false, ward: 0, sandK: 0,
  };
  for (let i = 0; i < 8; i++) p.tail.push({ x: x - i * 3, y: y - 18, vx: 0, vy: 0 });
  return p;
}

function newWorld(li, seed) {
  R = mulberry32(seed);
  const lvl = LEVELS[li], art = levelArt(li), def = lvl.def;
  lvl.resetOver();
  art.decal.getContext('2d').clearRect(0, 0, art.decal.width, art.decal.height);
  const p = makePlayer(lvl.spawn.x, lvl.spawn.y);
  const abil = { plunge: false, chain: false };
  for (const a of def.abil || []) abil[a] = true;
  const w = {
    li, lvl, art, seed, t: 0, steps: 0, p, diff: DIFF[MODE], abil,
    enemies: lvl.ents.map((en) => makeEnemy(en, lvl)), bolts: [], parts: [], gibs: [], slashes: [], afters: [], rings: [],
    chans: lvl.chandeliers.map((c) => makeChandelier(c, lvl)), bells: lvl.bells.map((b) => makeBell(b, lvl)),
    doors: lvl.doors.map((d) => makeDoor(d, lvl)), beams: lvl.beams.map((b) => makeBeam(b, lvl)), pends: lvl.pends.map((pd) => makePend(pd)),
    planks: [], weak: [], items: lvl.items.map((it) => ({ type: it.type, x: it.x, y: it.y, got: false })),
    relics: lvl.relics.map((r) => ({ id: r.id, x: r.x, y: r.y, got: false })), beads: lvl.beads.map((b) => ({ n: b.n, x: b.x, y: b.y, got: false })),
    npcs: lvl.npcs.map((n) => makeNPC(n)), throws: [], fires: [], blasts: [], quakes: [], debris: [], lines: [], trig: {}, beadGot: [], relicGot: [],
    boss: null, camFocus: null, letterbox: 0, timeStop: 0, bellAnchor: 0, ended: false,
    cam: { x: 0, y: 0, _px: 0, _py: 0 }, shake: 0, hitstop: 0, ts: 1, tsS: 1, slowOn: false, slowK: 0, chronos: 1, chronosLock: false, chronosIdle: 0,
    killCam: 0, nearMiss: 0, flash: 0, fervour: def.fervour || 0, rite: null, riteCD: 0,
    kills: 0, deflects: 0, rites: 0, parries: 0, clearT: -1, doorOpen: 0, exited: false, noise: null, floats: [], zoom: 0,
    dg: art.decal.getContext('2d'), aimPX: lvl.spawn.x, aimPY: lvl.spawn.y, multiT: 0, multiN: 0, total: 0, dyingT: 0,
  };
  for (let ty = 0; ty < lvl.h; ty++) for (let tx = 0; tx < lvl.w; tx++) {
    const t = lvl.base(tx, ty);
    if (t === 4) w.planks.push({ tx, ty, state: 'solid', t: 0 });
    else if (t === 5) w.weak.push({ tx, ty, broken: false });
  }
  for (const d of w.doors) { lvl.setOver(d.tx, d.ty, 1); lvl.setOver(d.tx, d.ty - 1, 1); }
  if (lvl.boss) w.boss = makeBoss(w, lvl.boss);
  w.total = w.enemies.length;
  p.ward = w.diff.ward;
  w.cam.x = clamp(p.x - W / 2, 0, lvl.w * T - W);
  w.cam.y = clamp(p.y - 26 - H / 2, 0, lvl.h * T - H);
  w.cam._px = w.cam.x; w.cam._py = w.cam.y;
  world = w;
  return w;
}

// Pilgrim checkpoints: put a fresh world into a remembered state.
function applyCheckpoint(w, ck) {
  if (!ck) return;
  for (const i of ck.dead) if (w.enemies[i]) w.enemies[i].alive = false;
  for (const c of ck.chans) { const ch = w.chans[c.i]; if (ch) { ch.state = 'down'; ch.x = c.x; ch.y = c.y; } }
  for (const i of ck.doors || []) if (w.doors[i]) forceOpenDoor(w, w.doors[i]);
  for (const i of ck.weak || []) if (w.weak[i]) breakWeak(w, w.weak[i], true);
  for (const i of ck.items || []) if (w.items[i]) w.items[i].got = true;
  for (const id of ck.relics || []) { const r = w.relics.find((q) => q.id === id); if (r) { r.got = true; if (id === 'chain') w.abil.chain = true; } }
  for (const n of ck.beads || []) { const b = w.beads.find((q) => q.n === n); if (b) { b.got = true; w.beadGot.push(n); } }
  for (const id of ck.talks || []) { const n = w.npcs.find((q) => q.id === id); if (n) { n.talked = true; n.state = 'dead'; } }
  for (const k of ck.trig || []) w.trig[k] = true;
  const p = w.p;
  p.x = ck.x; p.y = ck.y; p.face = ck.face; p._px = p.x; p._py = p.y; p.item = ck.item || null;
  for (const q of p.tail) { q.x = p.x - p.face * 3; q.y = p.y - 18; q.vx = q.vy = 0; }
  w.fervour = ck.fervour;
  w.kills = ck.kills; w.deflects = ck.deflects; w.rites = ck.rites; w.parries = ck.parries || 0;
  if (ck.boss && w.boss) bossRestore(w, w.boss, ck.boss);
  checkCleared(w);
  if (w.clearT >= 0) { w.clearT = 1; w.doorOpen = 1; w.killCam = 0; }
  w.cam.x = clamp(p.x - W / 2, 0, w.lvl.w * T - W);
  w.cam.y = clamp(p.y - 26 - H / 2, 0, w.lvl.h * T - H);
  w.cam._px = w.cam.x; w.cam._py = w.cam.y;
}

// ---------- particles / effects ----------
function part(w, x, y, vx, vy, life, c, s = 1, k = 0, g = 0, d = 1) {
  if (w.parts.length > 1300) return;
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
function debrisBurst(w, x, y, n, col = '#3a2e2a', spd = 200) {
  for (let i = 0; i < n; i++) part(w, x + rnd(-8, 8), y + rnd(-4, 4), rnd(-spd, spd) * 0.6, -rnd(spd * 0.3, spd), rnd(0.5, 1.1), i % 3 ? col : '#6a5a50', R() < 0.4 ? 2 : 1, 0, 800, 0.99);
}
function ring(w, x, y, r1, life, col, th = 1) { w.rings.push({ x, y, r: 2, r1, life, max: life, col, th }); }
function floatText(w, x, y, text, col = '#f2d48f') { w.floats.push({ x, y, text, col, life: 1.2, max: 1.2 }); }
// a line of speech over someone's head ('p', 'boss' or an npc id), timed in world time
function say(w, who, text, delay = 0, dur = 0) {
  const last = w.lines.filter((l) => l.who === who).reduce((m, l) => Math.max(m, l.end), 0);
  const start = Math.max(w.t + delay, last + 0.15);
  w.lines.push({ who, text, start, end: start + (dur || 1.0 + text.length * 0.04) });
}
function snapshot(p) {
  return { x: p.x, y: p.y, face: p.face, vx: p.vx, vy: p.vy, onGround: p.onGround, rollT: p.rollT, rollRot: p.rollRot, t: p.t, pose: p.pose.slice() };
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
  const hh = e.type === 'cherub' ? 10 : e.h;
  const cx = fx, cy = fy - hh * 0.55;
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
  const wx = e.x, wy = e.y - hh * 0.55;
  const spd = killerIsPlayer ? 260 : 140;
  const ca = Math.cos(ang), sa = Math.sin(ang);
  w.gibs.push({ c: A, x: wx, y: wy, px: cx, py: cy, vx: ca * spd + nx * 60, vy: sa * spd + ny * 60 - 110, a: 0, va: rnd(5, 12) * rsgn(), bleed: 1.4, toss: killerIsPlayer, life: 0 });
  w.gibs.push({ c: Bc, x: wx, y: wy, px: cx, py: cy, vx: ca * spd * 0.35 - nx * 40, vy: sa * spd * 0.35 - ny * 40 - 50, a: 0, va: rnd(2, 6) * rsgn(), bleed: 1.0, toss: false, life: 0 });
  if (w.gibs.length > 60) w.gibs.splice(0, 2);
}

// ---------- combat ----------
const KILL_LABEL = {
  gib: 'corpse toss', crush: 'crushed', ricochet: 'ricochet', burn: 'consecrated', fire: 'holy fire', blast: 'immolated',
  skull: 'memento mori', pendulum: 'the pendulum', quake: 'the toll', plunge: 'the toll', yank: null, door: 'the door', spikes: 'impaled',
};
function killEnemy(w, e, ang, cause) {
  if (!e.alive) return;
  const p = w.p;
  e.alive = false; e.doomed = false; e.marked = false;
  spawnGibs(w, e, ang, cause !== 'crush' && cause !== 'burn');
  const cx = e.x, cy = e.y - (e.type === 'cherub' ? 8 : e.h * 0.55);
  bloodBurst(w, cx, cy, ang, cause === 'rite' ? 70 : 46, cause === 'rite' ? 420 : 340);
  if (cause === 'burn' || cause === 'fire') for (let i = 0; i < 24; i++) part(w, cx + rnd(-6, 6), cy + rnd(-10, 10), rnd(-40, 40), -rnd(40, 160), rnd(0.4, 1), i % 2 ? '#ffd27a' : '#fff1c0', 1, 2, -60, 0.96);
  w.hitstop = Math.max(w.hitstop, cause === 'rite' ? 0 : cause === 'slash' ? 5 : 3);
  w.shake = Math.max(w.shake, cause === 'slash' ? 7 : 6);
  w.kills++;
  let gain = cause === 'slash' || cause === 'plunge' || cause === 'quake' ? 22 : 34;
  if (w.multiT > 0) w.multiN++; else w.multiN = 0;
  w.multiT = 1.1; gain += w.multiN * 12;
  w.cam.x += Math.cos(ang) * 5; w.cam.y += Math.sin(ang) * 3; w.zoom = 1;
  const label = KILL_LABEL[cause] || null;
  if (label) floatText(w, cx, cy - 18, label);
  if (cause !== 'rite' && w.multiN >= 1) floatText(w, cx, cy - (label ? 28 : 18), ['double', 'triple', 'massacre', 'massacre'][Math.min(3, w.multiN - 1)], '#ff7a6a');
  if (!w.rite) w.fervour = Math.min(100, w.fervour + gain);
  if (cause === 'slash' || cause === 'gib' || cause === 'plunge') { p.airLunges = 0; p.atkCD = Math.min(p.atkCD, 0.05); }
  if (e.type === 'bomb') w.blasts.push({ x: e.x, y: e.y - 14, t: cause === 'self' ? 0 : cause === 'blast' ? 0.12 : cause === 'slash' || cause === 'plunge' ? 0.55 : 0.06 });
  Sound.play('kill');
  w.noise = { x: e.x, y: e.y, r: 120 };
  checkCleared(w);
}
function checkCleared(w) {
  if (w.clearT >= 0) return;
  if (w.enemies.some((q) => q.alive)) return;
  if (w.boss && !w.boss.dead) return;
  onCleared(w);
}
function onCleared(w) {
  if (w.clearT >= 0) return;
  w.clearT = 0; w.killCam = Math.max(w.killCam, 0.8);
  if (!w.lvl.exit) return;
  Sound.play('clear');
  setTimeout(() => Sound.play('doorOpen'), 450);
}
function killPlayer(w, cause, ang) {
  const p = w.p;
  if (p.dead || w.rite || p.invuln > 0 || w.exited) return;
  if (p.ward > 0) { // the ward takes the blow instead
    p.ward--;
    p.invuln = 1.2; p.hurtT = 0.3; p.stunT = 0;
    p.vx = Math.cos(ang) * 210; p.vy = Math.min(-160, Math.sin(ang) * 200 - 120);
    p.onGround = false; p.rollT = 0; p.h = 22; p.zip = null; p.plunge = false;
    for (const b of w.bolts) if (b.owner === 'enemy' && dist(b.x, b.y, p.x, p.y - 12) < 60) b.dead = true;
    sparks(w, p.x, p.y - 14, ang + Math.PI, 26, 300, '#ffe2a0');
    ring(w, p.x, p.y - 12, 46, 0.5, '#fff1c0', 2);
    w.shake = Math.max(w.shake, 9); w.hitstop = Math.max(w.hitstop, 6); w.flash = Math.max(w.flash, 0.35); w.killCam = Math.max(w.killCam, 0.5);
    floatText(w, p.x, p.y - 38, 'the ward shatters', '#fff1c0');
    Sound.play('deflect', true); Sound.play('block');
    return;
  }
  p.dead = true; p.deathCause = cause;
  spawnGibs(w, p, ang, true);
  bloodBurst(w, p.x, p.y - 12, ang, 60, 360);
  w.shake = 12; w.hitstop = 7; w.flash = 0.5;
  Sound.play('death');
  if (G.onDeath) G.onDeath(cause);
}
// rolling slips under steel and through blood; a ward or a rite protects outright
const playerSafe = (w) => w.p.rollT > 0.05 || w.p.invuln > 0 || !!w.rite || w.p.dead;
// who guards against a blade from this side: 'block' (clash), 'parry' (caught mid-strike) or null (the cut lands)
function guardCheck(e, ox, oy) {
  const front = (ox - e.x) * e.face > 0, above = oy < e.y - e.h - 2;
  if (e.type === 'shield') return e.stunT <= 0 && e.shieldDown <= 0 && front && !above ? 'block' : null;
  if (e.type === 'fallen') {
    if (e.stunT > 0 || e.staggerT > 0 || above || !front || e.state === 'recover') return null;
    return e.state === 'lunge' ? 'parry' : 'block';
  }
  return null;
}
function blockHit(w, e, ang) {
  const p = w.p;
  sparks(w, e.x + e.face * 8, e.y - 14, ang + Math.PI, 16, 220);
  Sound.play(e.type === 'fallen' ? 'clash' : 'block');
  p.vx = e.face * 230; p.vy = Math.min(p.vy, -110);
  e.vx = -e.face * 70; e.flash = 0.12;
  if (e.type === 'shield') e.staggerT = 0.3;
  if (e.type === 'fallen') { e.blocks = (e.blockT > 0 ? e.blocks : 0) + 1; e.blockT = 1.2; }
  w.hitstop = Math.max(w.hitstop, 4); w.shake = Math.max(w.shake, 4);
}
function parryHit(w, e, ang) {
  const p = w.p;
  e.staggerT = 1.15; e.state = 'stagger'; e.st = 0; e.vx = -e.face * 150; e.flash = 0.2;
  const x = (p.x + e.x) / 2, y = e.y - 16;
  sparks(w, x, y, ang, 34, 380, '#fff4c8', 1.6);
  ring(w, x, y, 44, 0.45, '#fff1c0', 2);
  w.hitstop = Math.max(w.hitstop, 8); w.shake = Math.max(w.shake, 6); w.flash = Math.max(w.flash, 0.22); w.killCam = Math.max(w.killCam, 0.35);
  floatText(w, x, y - 22, 'parried', '#fff1c0');
  w.fervour = Math.min(100, w.fervour + 12); w.parries++;
  p.atkCD = 0.04; p.parryT = 0.18;
  Sound.play('clash');
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

// ---------- player ----------
const PH = { run: 168, jumpV: 392, grav: 1200, wjx: 220, wjy: 355, slide: 78, fall: 470, lunge: 255, rollT: 0.34, zip: 430, chainR: 175 };
function canStand(lvl, p) { return !rectSolid(lvl, p.x - p.w / 2, p.y - 22, p.x + p.w / 2, p.y); }
function onOneWay(lvl, p) {
  const ty = Math.floor((p.y + 1) / T);
  const a = lvl.tile(Math.floor((p.x - p.w / 2 + 1) / T), ty), b = lvl.tile(Math.floor((p.x + p.w / 2 - 1) / T), ty);
  return (isOneWay(a) || a === 0) && (isOneWay(b) || b === 0) && (isOneWay(a) || isOneWay(b)) && Math.abs(p.y - ty * T) < 1;
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
  if (w.boss && bossDeflectNear(w, w.boss, ox, oy)) return null;
  let best = null, bestScore = 1e9;
  const consider = (hx, hy, hw, hh) => {
    const d = dist(ox, oy, clamp(ox, hx, hx + hw), clamp(oy, hy, hy + hh));
    if (d > 44) return;
    const tx = hx + hw / 2, ty = hy + hh / 2;
    const ea = Math.atan2(ty - oy, tx - ox), off = Math.abs(angDiff(ang0, ea));
    if (d > 20 && off > 1.2) return;
    if (!los(w.lvl, ox, oy, tx, ty)) return;
    const score = d + off * 16;
    if (score < bestScore) { bestScore = score; best = ea; }
  };
  for (const e of w.enemies) if (e.alive) consider(...hurtBox(e));
  if (w.boss && bossTargetable(w.boss)) consider(...bossHurtBox(w.boss));
  if (best === null) return null;
  const ax = ox + Math.cos(ang0) * 20, ay = oy + Math.sin(ang0) * 20; // a swing at a chain, a bell or a door keeps its aim
  for (const c of w.chans) if (c.state === 'hang' && segPointDist(c.ax, c.ay, c.x, c.y, ax, ay) < 16) return null;
  for (const b of w.bells) if (dist(ax, ay, b.x, b.y + 24) < 24) return null;
  return best;
}
function startAttack(w, inp) {
  const p = w.p, lvl = w.lvl;
  if (p.rollT > 0) { if (canStand(lvl, p)) { p.rollT = 0; p.h = 22; } else return false; }
  if (p.zip) endZip(w, 0.6);
  const ox = p.x, oy = p.y - 12;
  let ang = Math.atan2(inp.ay - oy, inp.ax - ox);
  if (wantsPlunge(w, inp, ang)) { startPlunge(w); return true; }
  const lock = lockTarget(w, ang);
  if (lock !== null) ang = lock;
  p.atkAng = ang; p.atkT = p.atkDur = 0.16; p.atkCD = 0.3; p.atkSide = -p.atkSide;
  p.face = Math.cos(ang) >= 0 ? 1 : -1;
  p.throwT = 0; p.castT = 0;
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
    const gd = guardCheck(e, ox, oy);
    if (gd === 'block') { blockHit(w, e, a); continue; }
    if (gd === 'parry') { parryHit(w, e, a); continue; }
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
  for (const d of w.doors) {
    if (d.isOpen || p.hitSet.includes(d)) continue;
    const dd = dist(ox, oy, clamp(ox, d.x - 5, d.x + 5), clamp(oy, d.y - 32, d.y));
    if (dd < 26) { p.hitSet.push(d); openDoor(w, d, sign(d.x - p.x) || p.face, 'player'); }
  }
  if (w.boss && !p.hitSet.includes(w.boss)) bossSlash(w, w.boss, ox, oy, a);
}

// ----- the Toll: a plunging strike from the air -----
function wantsPlunge(w, inp, ang) {
  const p = w.p;
  if (!w.abil.plunge || p.onGround || p.zip || p.plungeLag > 0) return false;
  if (!(inp.down & B.D) && Math.sin(ang) < 0.94) return false;
  return rayLen(w.lvl, p.x, p.y, Math.PI / 2, 40) >= 18;
}
function startPlunge(w) {
  const p = w.p;
  p.plunge = true; p.plungeHang = 0.07; p.vx *= 0.15; p.vy = -70; p.atkT = 0; p.hitSet.length = 0;
  p.rollT = 0; p.h = 22; p.throwT = 0; p.castT = 0;
  Sound.play('plunge');
  ring(w, p.x, p.y - 12, 16, 0.2, '#fff1c0', 1);
}
function plungeImpactEnemies(w) {
  const p = w.p;
  for (const e of w.enemies) {
    if (!e.alive || p.hitSet.includes(e)) continue;
    const [bx, by, bw, bh] = hurtBox(e);
    if (!overlap(p.x - 9, p.y - 8, 18, 16, bx, by, bw, bh)) continue;
    p.hitSet.push(e);
    killEnemy(w, e, Math.PI / 2, 'plunge');
    plungeBounce(w);
    return true;
  }
  if (w.boss && bossPlungeHit(w, w.boss)) { plungeBounce(w); return true; }
  return false;
}
function plungeBounce(w) {
  const p = w.p;
  p.plunge = false; p.vy = -330; p.airLunges = 0; p.atkCD = 0; p.jumping = false;
  w.hitstop = Math.max(w.hitstop, 4);
  ring(w, p.x, p.y, 26, 0.3, '#ffe2a0', 1);
}
function plungeLand(w) {
  const p = w.p, lvl = w.lvl;
  const fx = p.x, fy = p.y;
  Sound.play('plungeLand');
  w.shake = Math.max(w.shake, 9); w.hitstop = Math.max(w.hitstop, 3);
  ring(w, fx, fy - 2, 58, 0.45, '#fff1c0', 2); ring(w, fx, fy - 2, 34, 0.3, '#ffd27a', 1);
  dust(w, fx, fy, 16); debrisBurst(w, fx, fy - 2, 10, lvl.theme.stone[3], 160);
  w.quakes.push({ x: fx, y: fy, r: 0, life: 0.3 });
  // the floor beneath may give way
  let broke = false;
  const ty = Math.floor((fy + 1) / T);
  for (const wf of w.weak) if (!wf.broken && wf.ty === ty && Math.abs(wf.tx * T + 8 - fx) < 22) { breakWeak(w, wf, false); broke = true; }
  for (const e of w.enemies) {
    if (!e.alive || Math.abs(e.x - fx) > 50 || Math.abs(e.y - fy) > 22 || e.type === 'gargoyle') continue;
    if (e.type === 'cherub' && e.y < fy - 20) continue;
    if (e.type === 'shield') { e.stunT = 1.3; e.shieldDown = 2.2; e.state = 'stun'; e.vx = sign(e.x - fx) * 120; continue; }
    if (e.type === 'fallen') { e.staggerT = 1.1; e.state = 'stagger'; e.vx = sign(e.x - fx) * 120; continue; }
    killEnemy(w, e, -Math.PI / 2 + sign(e.x - fx) * 0.6, 'quake');
  }
  for (const d of w.doors) if (!d.isOpen && Math.abs(d.x - fx) < 40 && Math.abs(d.y - fy) < 20) openDoor(w, d, sign(d.x - fx) || 1, 'player');
  if (w.boss) bossQuake(w, w.boss, fx, fy);
  if (broke) { p.vy = 120; p.onGround = false; return; } // keep falling into the dark
  p.plunge = false; p.plungeLag = 0.2; p.vx = 0;
}

// ----- the Chain of the Seventh -----
function chainTargets(w) {
  const p = w.p, out = [];
  for (const h of w.lvl.hooks) out.push({ kind: 'hook', ref: h, x: h.x, y: h.y });
  for (const e of w.enemies) if (e.alive && !e.doomed) { const [hx, hy, hw, hh] = hurtBox(e); out.push({ kind: 'enemy', ref: e, x: hx + hw / 2, y: hy + hh / 2 }); }
  if (w.boss && bossTargetable(w.boss)) { const [hx, hy, hw, hh] = bossHurtBox(w.boss); out.push({ kind: 'boss', ref: w.boss, x: hx + hw / 2, y: hy + hh / 2 }); }
  for (const c of w.chans) if (c.state === 'hang') out.push({ kind: 'chan', ref: c, x: (c.ax + c.x) / 2, y: (c.ay + c.y) / 2 });
  for (const b of w.bells) out.push({ kind: 'bell', ref: b, x: b.x, y: b.y + 22 });
  if (!p.item) for (const it of w.items) if (!it.got) out.push({ kind: 'item', ref: it, x: it.x, y: it.y - 4 });
  return out;
}
function castChain(w, inp) {
  const p = w.p, ox = p.x, oy = p.y - 15;
  let ang = Math.atan2(inp.ay - oy, inp.ax - ox);
  const ex = ox + Math.cos(ang) * PH.chainR, ey = oy + Math.sin(ang) * PH.chainR;
  let best = null, bs = 1e9;
  for (const t of chainTargets(w)) {
    const d = dist(ox, oy, t.x, t.y);
    if (d > PH.chainR + 8 || d < 8) continue;
    const off = segPointDist(ox, oy, ex, ey, t.x, t.y);
    if (off > 30) continue;
    if (!los(w.lvl, ox, oy, t.x, t.y)) continue;
    const s = off * 2 + d * 0.15 + (t.kind === 'hook' ? -6 : 0);
    if (s < bs) { bs = s; best = t; }
  }
  if (best) ang = Math.atan2(best.y - oy, best.x - ox);
  p.chain = { state: 'out', d: 0, ang, x: ox, y: oy, target: null, t: 0 };
  p.castT = 0.2; p.castAng = ang; p.face = Math.cos(ang) >= 0 ? 1 : -1;
  Sound.play('hook');
}
function updateChain(w, dt) {
  const p = w.p, ch = p.chain;
  if (!ch || dt <= 0) return;
  ch.t += dt;
  const ox = p.x, oy = p.y - 15;
  if (ch.state === 'out') {
    const c = Math.cos(ch.ang), s = Math.sin(ch.ang);
    const n = Math.ceil((900 * dt) / 4);
    for (let i = 0; i < n && ch.state === 'out'; i++) {
      ch.d += (900 * dt) / n;
      const hx = ox + c * ch.d, hy = oy + s * ch.d;
      ch.x = hx; ch.y = hy;
      if (w.lvl.solidAt(Math.floor(hx / T), Math.floor(hy / T))) { sparks(w, hx, hy, ch.ang + Math.PI, 6, 120); Sound.play('wall'); ch.state = 'back'; break; }
      if (chainHit(w, ch, hx, hy)) break;
      if (ch.d >= PH.chainR) ch.state = 'back';
    }
  } else if (ch.state === 'back') {
    ch.d -= 1300 * dt;
    const tg = ch.target;
    if (tg && tg.kind === 'item') { tg.ref.x = ox + Math.cos(ch.ang) * Math.max(0, ch.d); tg.ref.y = oy + Math.sin(ch.ang) * Math.max(0, ch.d) + 4; }
    ch.x = ox + Math.cos(ch.ang) * Math.max(0, ch.d); ch.y = oy + Math.sin(ch.ang) * Math.max(0, ch.d);
    if (tg && tg.kind === 'enemy' && tg.ref.alive && tg.ref.yankT > 0) { ch.x = tg.ref.x; ch.y = tg.ref.y - 14; ch.d = dist(ox, oy, ch.x, ch.y); ch.ang = Math.atan2(ch.y - oy, ch.x - ox); }
    if (ch.d <= 0 || (tg && tg.kind === 'enemy' && !(tg.ref.yankT > 0) && ch.d <= 6)) {
      if (tg && tg.kind === 'item') { tg.ref.got = true; if (!p.item) { p.item = tg.ref.type; Sound.play('pickup'); } }
      p.chain = null; p.chainCD = 0.3;
    }
  } else if (ch.state === 'hold') { // anchored: the player is being pulled along it
    if (!p.zip) { ch.state = 'back'; return; }
    ch.x = p.zip.x; ch.y = p.zip.y; ch.d = dist(ox, oy, ch.x, ch.y); ch.ang = Math.atan2(ch.y - oy, ch.x - ox);
  }
}
function chainHit(w, ch, hx, hy) {
  const p = w.p;
  for (const h of w.lvl.hooks) if (dist(hx, hy, h.x, h.y) < 10) {
    ch.state = 'hold'; ch.x = h.x; ch.y = h.y;
    startZip(w, h.x, h.y + 12, 'hook');
    Sound.play('hookHit'); sparks(w, h.x, h.y, ch.ang + Math.PI, 8, 140, '#ffe2a0');
    return true;
  }
  for (const e of w.enemies) {
    if (!e.alive || e.doomed) continue;
    const [bx, by, bw, bh] = hurtBox(e);
    if (!overlap(hx - 4, hy - 4, 8, 8, bx, by, bw, bh)) continue;
    ch.target = { kind: 'enemy', ref: e };
    if (e.type === 'shield' && e.shieldDown <= 0) { // tear the shield away
      e.shieldDown = 3.2; e.staggerT = 0.6; e.vx = -e.face * 60; e.flash = 0.15;
      sparks(w, e.x + e.face * 8, e.y - 14, ch.ang + Math.PI, 14, 200); floatText(w, e.x, e.y - 40, 'disarmed');
      Sound.play('yank'); Sound.play('block');
      ch.state = 'back';
    } else if (e.type === 'fallen') {
      e.staggerT = 1.0; e.state = 'stagger'; e.st = 0; e.vx = -sign(e.x - p.x) * 90; e.flash = 0.15;
      sparks(w, e.x, e.y - 18, ch.ang + Math.PI, 14, 220); floatText(w, e.x, e.y - 40, 'disarmed');
      Sound.play('yank'); Sound.play('clash');
      ch.state = 'back';
    } else if (e.type === 'gargoyle') {
      e.stunT = 1.6; e.state = 'stun'; Sound.play('yank'); ch.state = 'back';
    } else {
      e.yankT = 0.3; e.state = 'stun'; e.alerted = true; e.reactT = 0;
      Sound.play('yank'); ch.state = 'back';
    }
    w.hitstop = Math.max(w.hitstop, 3);
    return true;
  }
  if (w.boss && bossTargetable(w.boss)) {
    const [bx, by, bw, bh] = bossHurtBox(w.boss);
    if (overlap(hx - 4, hy - 4, 8, 8, bx, by, bw, bh)) {
      ch.state = 'hold'; ch.target = { kind: 'boss', ref: w.boss };
      const tx = hx - Math.cos(ch.ang) * 14, ty = hy - Math.sin(ch.ang) * 6 + 10;
      startZip(w, tx, ty, 'boss');
      bossChained(w, w.boss);
      Sound.play('hookHit');
      return true;
    }
  }
  for (const c of w.chans) if (c.state === 'hang' && segPointDist(c.ax, c.ay, c.x, c.y, hx, hy) < 6) { dropChandelier(w, c); ch.state = 'back'; return true; }
  for (const b of w.bells) if (dist(hx, hy, b.x, b.y + 22) < 18) { strikeBell(w, b, sign(Math.cos(ch.ang)) || 1); ch.state = 'back'; return true; }
  if (!p.item) for (const it of w.items) if (!it.got && dist(hx, hy, it.x, it.y - 4) < 10) { ch.target = { kind: 'item', ref: it }; ch.state = 'back'; Sound.play('hook'); return true; }
  return false;
}
function startZip(w, x, y, kind) {
  const p = w.p;
  p.zip = { x, y, kind, stuck: 0 }; p.zipT = 0;
  p.rollT = 0; p.h = 22; p.atkT = 0; p.plunge = false; p.onGround = false; p.jumping = false;
  Sound.play('zip');
}
function endZip(w, keep = 1, pop = true) {
  const p = w.p;
  if (!p.zip) return;
  const dx = p.zip.x - p.x, dy = p.zip.y - p.y, d = Math.hypot(dx, dy) || 1;
  p.vx = (dx / d) * 300 * keep; p.vy = Math.min((dy / d) * 300 * keep, pop ? -170 : 0);
  p.zip = null; p.airLunges = 0;
  if (p.chain) { p.chain.state = 'back'; p.chain.target = null; }
}

function updatePlayer(w, inp, dt) {
  const p = w.p, lvl = w.lvl;
  if (p.dead || dt <= 0) { if (!p.dead && dt <= 0) poseAndCape(p, 0); return; }
  p.t += dt;
  const ctrl = p.stunT <= 0 && p.kneel <= 0;
  const down = ctrl ? inp.down : 0;
  const ix = ((down & B.R) ? 1 : 0) - ((down & B.L) ? 1 : 0);
  p.atkCD -= dt; p.rollCD -= dt; p.landT = Math.max(0, p.landT - dt); p.invuln -= dt; p.dropT -= dt;
  p.throwCD -= dt; p.chainCD -= dt; p.throwT = Math.max(0, p.throwT - dt); p.castT = Math.max(0, p.castT - dt);
  p.plungeLag = Math.max(0, p.plungeLag - dt); p.parryT = Math.max(0, p.parryT - dt); p.hurtT = Math.max(0, p.hurtT - dt);
  p.stunT = Math.max(0, p.stunT - dt); p.kneel = Math.max(0, p.kneel - dt);
  if (p.onGround) { p.coyT = 0.11; p.airLunges = 0; } else p.coyT -= dt;
  p.sandK = approach(p.sandK, inSand(lvl, p.x, p.y - 10) || (w.sandFloorY && p.y > w.sandFloorY + 3) ? 1 : 0, dt * 6);
  if (p.sandK > 0.5 && R() < 0.3) part(w, p.x + rnd(-6, 6), p.y - rnd(0, 20), rnd(-20, 20), rnd(20, 60), 0.4, '#d8b878', 1, 4, 80, 0.95);

  if (ctrl) {
    // abilities (buffered)
    if (p.atkBuf > 0 && p.atkCD <= 0 && !p.plunge && p.plungeLag <= 0) { if (startAttack(w, inp)) p.atkBuf = 0; }
    if ((inp.pressed & B.T) && p.item && p.throwCD <= 0 && !p.plunge) throwItem(w, inp);
    if ((inp.pressed & B.C) && w.abil.chain && !p.chain && p.chainCD <= 0 && !p.plunge) castChain(w, inp);
    else if ((inp.pressed & B.C) && !w.abil.chain) w.chainDeny = 0.5;
  }
  updateChain(w, dt);

  // zipping along the chain
  if (p.zip) {
    p.zipT += dt;
    const dx = p.zip.x - p.x, dy = p.zip.y - p.y, d = Math.hypot(dx, dy);
    p.zipAng = Math.atan2(dy, dx); p.face = dx >= 0 ? 1 : -1;
    if ((p.bufT > 0 && ctrl) || d < 12 || p.zipT > 1.2 || p.zip.stuck > 0.12) {
      const jumped = p.bufT > 0;
      endZip(w, jumped ? 1.1 : 0.85, true);
      if (jumped) { p.vy = -PH.jumpV * 0.92; p.bufT = 0; p.jumping = true; Sound.play('jump'); }
      p.lockT = 0.1;
    } else {
      const sp = Math.min(PH.zip, d / dt);
      p.vx = (dx / d) * sp; p.vy = (dy / d) * sp;
      const bx = p.x, by = p.y;
      moveX(lvl, p, p.vx * dt); moveY(lvl, p, p.vy * dt, p.y, true);
      if (Math.abs(p.x - bx) + Math.abs(p.y - by) < sp * dt * 0.3) p.zip.stuck += dt; else p.zip.stuck = 0;
      p.onGround = false;
      if (w.steps % 2 === 0) afterimage(w, '#5c5566', 0.16);
      poseAndCape(p, dt);
      return;
    }
  }

  // the Toll: hang an instant, then fall like a bell-clapper
  if (p.plunge) {
    if (p.plungeHang > 0) { p.plungeHang -= dt; p.vy = approach(p.vy, 0, 900 * dt); }
    else p.vy = Math.min(p.vy + 3200 * dt, 640);
    p.vx = approach(p.vx, 0, 600 * dt);
    const prevB = p.y;
    moveX(lvl, p, p.vx * dt);
    if (!plungeImpactEnemies(w)) {
      const hy = moveY(lvl, p, p.vy * dt, prevB, false);
      if (hy > 0) { p.onGround = true; plungeLand(w); }
      else if (hy < 0) p.plunge = false;
    }
    if (w.steps % 2 === 0) afterimage(w, '#e8c070', 0.2);
    spikeCheck(w);
    poseAndCape(p, dt);
    return;
  }

  // roll / drop-through
  if (ctrl && p.rollBuf > 0 && p.onGround && p.rollT <= 0 && p.rollCD <= 0 && p.atkT <= 0 && p.plungeLag <= 0) {
    p.rollBuf = 0;
    if (onOneWay(lvl, p) && !ix) { p.dropT = 0.22; p.onGround = false; p.y += 2; p.vy = 40; }
    else {
      p.rollT = PH.rollT; p.rollDir = ix || p.face; p.face = p.rollDir; p.rollRot = 0;
      Sound.play('roll'); dust(w, p.x, p.y, 6, -p.rollDir);
    }
  }
  const sandMul = 1 - p.sandK * 0.55;
  if (p.rollT > 0) {
    p.rollT -= dt;
    const k = clamp(p.rollT / PH.rollT, 0, 1);
    p.vx = p.rollDir * (125 + 205 * k) * sandMul;
    p.rollRot = TAU * (1 - k) * p.rollDir;
    if (p.rollT <= 0) { if (!canStand(lvl, p)) p.rollT = 0.04; else p.rollCD = 0.1; }
    if (!p.onGround && p.rollT < PH.rollT - 0.1 && canStand(lvl, p)) p.rollT = 0;
  } else {
    let acc;
    if (p.onGround) acc = ix ? (p.vx * ix < 0 ? 3400 : 2100) : 2700;
    else acc = ix ? 1350 : 420;
    if (p.lockT > 0) { p.lockT -= dt; acc *= 0.22; }
    if (p.plungeLag > 0 || p.stunT > 0) acc = 2700;
    const target = (p.plungeLag > 0 || !ctrl ? 0 : ix) * PH.run * sandMul;
    if (Math.abs(p.vx) > PH.run * sandMul && (ix === sign(p.vx) || !p.onGround)) p.vx = approach(p.vx, target, (p.onGround ? 1000 : 240) * dt);
    else p.vx = approach(p.vx, target, acc * dt);
    if (ix && p.atkT <= 0 && p.throwT <= 0 && p.castT <= 0) p.face = ix;
  }
  p.h = p.rollT > 0 ? 12 : 22;

  // jump / wall jump
  if (ctrl && p.bufT > 0 && p.plungeLag <= 0) {
    if (p.coyT > 0 && (p.rollT <= 0 || canStand(lvl, p))) {
      p.rollT = 0; p.h = 22;
      p.vy = -PH.jumpV * (1 - p.sandK * 0.2); p.jumping = true; p.onGround = false; p.coyT = 0; p.bufT = 0;
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
    standOnPlanks(w);
  }
  if (spikeCheck(w)) return;

  // anim
  if (p.onGround && Math.abs(p.vx) > 20 && p.rollT <= 0) {
    const before = Math.floor(p.runPh / Math.PI);
    p.runPh += dt * Math.abs(p.vx) * 0.078;
    if (Math.floor(p.runPh / Math.PI) !== before) { Sound.play('step'); if (R() < 0.5) dust(w, p.x - p.face * 3, p.y, 1); }
  }
  poseAndCape(p, dt);
}
function spikeCheck(w) {
  const p = w.p, lvl = w.lvl;
  const sx0 = Math.floor((p.x - p.w / 2 + 1) / T), sx1 = Math.floor((p.x + p.w / 2 - 1) / T), sty = Math.floor((p.y - 1) / T);
  for (let tx = sx0; tx <= sx1; tx++) if (lvl.tile(tx, sty) === 3 && p.y > sty * T + 7) { killPlayer(w, 'spikes', -Math.PI / 2); return true; }
  return false;
}
// blend toward the pose this state wants, then let the cape follow the shoulders
function poseAndCape(a, dt) {
  if (dt > 0) {
    const rate = a.kind === 'player' ? playerPose(a) : a.kind === 'boss' ? BOSS[a.type].pose(a) : rigEnemyPose(a);
    blendPose(a.pose, a.kind === 'player' ? _tp : _ep, 1 - Math.pow(1 - rate, dt * 60));
  }
  const rot = a.rollT > 0 ? a.rollRot : 0, s = a.s || 1;
  const [lx, ly] = rigCapeAnchor(a.pose, rot);
  updateCapeTail(a, dt, a.x + lx * s * a.face, a.y + ly * s);
}

// ---------- throwing ----------
function throwItem(w, inp) {
  const p = w.p, type = p.item;
  const ox = p.x + p.face * 3, oy = p.y - 17;
  const ang = Math.atan2(inp.ay - oy, inp.ax - ox);
  const spd = type === 'skull' ? 540 : 330;
  const vx = Math.cos(ang) * spd, vy = Math.sin(ang) * spd - (type === 'flask' ? 150 : 0); // holy water is lobbed
  w.throws.push({ type, x: ox, y: oy, vx, vy, rot: 0, life: 2.5, trail: [] });
  p.item = null; p.throwCD = 0.2; p.throwT = 0.22; p.throwAng = Math.atan2(vy, vx); p.face = vx >= 0 ? 1 : -1;
  Sound.play('throw');
  w.noise = { x: p.x, y: p.y, r: 60 };
}

// ---------- the Last Rites ----------
function freeSpot(lvl, x, y, pw, ph) {
  const offs = [[0, 0], [0, -4], [7, 0], [-7, 0], [14, 0], [-14, 0], [0, -12], [9, -12], [-9, -12], [22, 0], [-22, 0], [0, -24]];
  for (const [ox, oy] of offs) if (!rectSolid(lvl, x + ox - pw / 2, y + oy - ph, x + ox + pw / 2, y + oy)) return { x: x + ox, y: y + oy };
  return null;
}
function riteTargets(w) {
  const out = w.enemies.filter((e) => e.alive);
  if (w.boss && bossTargetable(w.boss)) out.push(w.boss);
  return out;
}
function startRite(w) {
  w.rite = { phase: 'mark', t: 0, marks: [], sx: w.p.x, sy: w.p.y };
  const p = w.p;
  p.atkT = 0; p.zip = null; p.chain = null; p.plunge = false;
  Sound.play('riteIn');
}
function updateRite(w, inp) {
  const r = w.rite, p = w.p;
  if (r.phase === 'mark') {
    r.t += STEP;
    const last = r.marks[r.marks.length - 1];
    const lx = last ? last.x : p.x, ly = last ? last.y - last.h / 2 : p.y - 12;
    for (const e of riteTargets(w)) {
      if (e.marked || r.marks.length >= 7) continue;
      const ecx = e.x, ecy = e.y - e.h / 2;
      if (segPointDist(w.aimPX, w.aimPY, inp.ax, inp.ay, ecx, ecy) > (e.kind === 'boss' ? 24 : 15)) continue;
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
    p.dashPose = true;
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
    p.dashPose = false;
    if (r.t >= 0.5 && !r.sheathed) { r.sheathed = true; Sound.play('sheath'); }
    if (r.t >= 0.66) {
      Sound.play('gong');
      w.flash = 1; w.shake = 15;
      const marks = r.marks;
      w.rite = { phase: 'done' };
      let n = 0;
      for (const e of marks) {
        if (e.kind === 'boss') { bossHurt(w, e, 'rite', e.riteAng); n++; }
        else if (e.alive) { killEnemy(w, e, e.riteAng, 'rite'); n++; }
      }
      if (n >= 2) floatText(w, p.x, p.y - 40, `last rites  ${n} absolved`, '#ff9a8a');
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
  const regen = w.sandRegen || 1;
  if (w.slowOn) { w.chronos -= STEP / (w.timeStop > 0 ? 1.6 : 4.4); w.chronosIdle = 0; if (w.chronos <= 0) { w.chronos = 0; w.chronosLock = true; } }
  else { w.chronosIdle += STEP; if (w.chronosIdle > 0.5) w.chronos = Math.min(1, w.chronos + (STEP / 7.5) * regen); if (w.chronosLock && w.chronos > 0.25) w.chronosLock = false; }
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
  let tx = p.x + clamp((inp.ax - p.x) * 0.2, -64, 64) - W / 2;
  let ty = p.y - 26 + clamp((inp.ay - (p.y - 12)) * 0.16, -42, 42) - H / 2;
  if (w.camFocus) { const f = w.camFocus; tx = lerp(tx, f.x - W / 2, f.k); ty = lerp(ty, f.y - H / 2, f.k); }
  const k = w.rite && w.rite.phase !== 'mark' ? 0.22 : p.zip ? 0.16 : 0.11;
  c.x += (tx - c.x) * k; c.y += (ty - c.y) * k;
  c.x = clamp(c.x, 0, lvl.w * T - W); c.y = clamp(c.y, 0, lvl.h * T - H);
}

// ---------- one simulation step ----------
// inp: { down, pressed, ax, ay }  (aim in world coordinates)
function simStep(w, inp) {
  const p = w.p;
  w.steps++;
  // remember where everything was, so the renderer can draw between steps
  p._px = p.x; p._py = p.y; w.cam._px = w.cam.x; w.cam._py = w.cam.y;
  for (const e of w.enemies) { e._px = e.x; e._py = e.y; }
  if (w.boss) { w.boss._px = w.boss.x; w.boss._py = w.boss.y; }
  // buffered presses wait out hit-stop instead of expiring inside it
  const held = w.hitstop > 0 ? 0 : STEP;
  if (inp.pressed & B.J) p.bufT = 0.13; else p.bufT -= held;
  if (inp.pressed & B.A) p.atkBuf = 0.11; else p.atkBuf -= held;
  if (inp.pressed & B.D) p.rollBuf = 0.1; else p.rollBuf -= held;
  w.riteCD -= STEP;
  const anyTarget = w.enemies.some((e) => e.alive) || (w.boss && bossTargetable(w.boss));
  if (!w.rite && (inp.pressed & B.E) && w.fervour >= 100 && !p.dead && w.clearT < 0 && w.riteCD <= 0 && anyTarget && w.timeStop <= 0) startRite(w);
  else if (!w.rite && (inp.pressed & B.E) && w.fervour < 100 && !p.dead) w.riteDeny = 0.6;
  w.riteDeny = Math.max(0, (w.riteDeny || 0) - STEP);
  w.chainDeny = Math.max(0, (w.chainDeny || 0) - STEP);
  computeTimeScale(w, inp);
  let dt = STEP * w.ts;
  let pdt = w.rite ? (w.rite.phase === 'mark' ? dt : 0) : w.slowOn && w.ts > 0 ? STEP * Math.sqrt(w.ts) : dt;
  // the Confessor's stopped hour: only he moves, unless you spend your own hour against it
  let bdt = dt;
  if (w.timeStop > 0 && w.hitstop <= 0) {
    w.timeStop -= STEP;
    bdt = STEP; dt = 0;
    pdt = w.slowOn ? STEP * 0.6 : 0;
    if (w.timeStop <= 0) { Sound.play('timeGo'); w.flash = Math.max(w.flash, 0.3); }
  }
  w.t += dt;
  w.bt = (w.bt || 0) + bdt;
  if (w.rite) updateRite(w, inp);
  if (!w.rite || w.rite.phase === 'mark') {
    updatePlayer(w, inp, pdt);
    if (p.atkT > 0 && pdt > 0) { p.atkT -= pdt; if (p.atkT > p.atkDur - 0.11) attackHits(w); }
  } else poseAndCape(p, STEP * 0.5);
  if (!w.rite || w.rite.phase === 'mark') {
    if ((w.slowOn || w.killCam > 0) && w.steps % 3 === 0 && !p.dead) afterimage(w, w.steps % 6 ? '#b3203a' : '#e0a848', 0.3);
    else if ((p.rollT > 0 || Math.abs(p.vx) > 215 || p.atkT > 0) && w.steps % 2 === 0 && !p.dead) afterimage(w, '#7a1424', 0.18);
  }
  updateEnemies(w, dt);
  if (w.boss) updateBoss(w, w.boss, bdt);
  updateBolts(w, dt);
  updateThrows(w, dt);
  updateFires(w, dt);
  updateBlasts(w, dt);
  updateChans(w, dt);
  updateBells(w, dt);
  updateDoors(w, dt);
  updateBeams(w, dt);
  updatePends(w, dt);
  updatePlanks(w, dt);
  updatePickups(w);
  updateNPCs(w, dt);
  updateTriggers(w);
  updateGibs(w, dt);
  updateParts(w, dt);
  for (const s of w.slashes) s.t += s.kind === 'rite' ? STEP : pdt > 0 ? pdt : dt;
  if (w.slashes.length) w.slashes = w.slashes.filter((s) => s.t < s.dur);
  for (const a of w.afters) a.life -= STEP;
  if (w.afters.length) w.afters = w.afters.filter((a) => a.life > 0);
  for (const r of w.rings) { r.life -= STEP; r.r += (r.r1 - r.r) * 0.16; }
  if (w.rings.length) w.rings = w.rings.filter((r) => r.life > 0);
  for (const q of w.quakes) { q.life -= STEP; q.r += STEP * 260; }
  if (w.quakes.length) w.quakes = w.quakes.filter((q) => q.life > 0);
  w.shake *= 0.86; w.flash = Math.max(0, w.flash - STEP * 2.5); w.zoom *= 0.84;
  for (const f of w.floats) { f.life -= STEP; f.y -= 12 * STEP; }
  if (w.floats.length) w.floats = w.floats.filter((f) => f.life > 0);
  if (w.lines.length) w.lines = w.lines.filter((l) => l.end > w.t - 0.1);
  w.multiT -= STEP;
  w.bellAnchor = Math.max(0, w.bellAnchor - dt);
  w.rewindFx = Math.max(0, (w.rewindFx || 0) - STEP);
  w.letterK = approach(w.letterK || 0, w.letterbox ? 1 : 0, STEP * 3);
  if (w.clearT >= 0) { w.clearT += STEP; if (w.clearT > 0.5) w.doorOpen = Math.min(1, w.doorOpen + STEP * 1.4); }
  if (p.dead) w.dyingT += STEP;
  const ex = w.lvl.exit;
  if (ex && w.doorOpen > 0.35 && !p.dead && !w.exited && !w.npcs.some((n) => n.state === 'talk') && overlap(ex.x - 12, ex.y - 44, 24, 44, ...boxOf(p))) {
    w.exited = true;
    if (G.onExit) G.onExit();
  }
  updateCamera(w, inp);
  w.aimPX = inp.ax; w.aimPY = inp.ay;
}
