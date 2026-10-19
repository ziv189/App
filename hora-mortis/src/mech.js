'use strict';
// ============================================================
//  HORA MORTIS — the cathedral's machinery: projectiles, props,
//  doors, light, blades, rotten wood, and the dead who still talk
// ============================================================

// ---------- bolts ----------
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
        const d = b.owner === 'player' ? w.doors.find((q) => !q.isOpen && Math.floor(b.x / T) === q.tx && (Math.floor(b.y / T) === q.ty || Math.floor(b.y / T) === q.ty - 1)) : null;
        if (d) { openDoor(w, d, sign(b.vx) || 1, 'player'); b.dead = true; break; }
        if (b.owner === 'player' && b.bounces > 0) {
          b.bounces--;
          const hx = lvl.solidAt(Math.floor(b.x / T), Math.floor(oy / T)), hy = lvl.solidAt(Math.floor(ox / T), Math.floor(b.y / T));
          if (hx || !hy) b.vx = -b.vx;
          if (hy || !hx) b.vy = -b.vy;
          b.x = ox; b.y = oy; b.bounced = true;
          sparks(w, ox, oy, Math.atan2(b.vy, b.vx), 8, 160, '#ffd27a');
          Sound.play('wall');
        } else { b.dead = true; sparks(w, ox, oy, Math.atan2(-b.vy, -b.vx), 7, 130, b.owner === 'player' ? '#ffd27a' : b.kind === 'sand' ? '#e8c890' : '#ff6a50'); continue; }
      }
      if (b.owner === 'enemy') {
        if (!p.dead) {
          const [px, py, pw, ph] = boxOf(p);
          if (b.x > px - 1 && b.x < px + pw + 1 && b.y > py - 1 && b.y < py + ph + 1) {
            if (playerSafe(w)) { if (!b.nm) { b.nm = true; sparks(w, b.x, b.y, 0, 3, 50, '#ffffff', 3); } }
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
            const blocks = (e.type === 'shield' && e.stunT <= 0 && e.shieldDown <= 0 && b.vx * e.face < 0) || guardCheck(e, b.x - b.vx * 0.05, b.y) === 'block';
            if (blocks) {
              b.dead = true; sparks(w, b.x, b.y, Math.atan2(-b.vy, -b.vx), 12, 200); Sound.play(e.type === 'fallen' ? 'clash' : 'block'); break;
            }
            killEnemy(w, e, Math.atan2(b.vy, b.vx), b.bounced ? 'ricochet' : 'deflect');
            if (!b.pierce) { b.dead = true; break; }
          }
        }
        if (!b.dead && w.boss && bossBoltHit(w, w.boss, b)) { b.dead = true; break; }
        for (const c of w.chans) if (c.state === 'hang' && segPointDist(c.ax, c.ay, c.x, c.y, b.x, b.y) < 5) { dropChandelier(w, c); }
        for (const bl of w.bells) if (dist(b.x, b.y, bl.x, bl.y + 24) < 17) { strikeBell(w, bl, sign(b.vx)); b.dead = true; }
      }
    }
  }
  if (w.bolts.some((b) => b.dead)) w.bolts = w.bolts.filter((b) => !b.dead);
}

// ---------- thrown things: skulls fly true, holy water burns where it breaks ----------
function updateThrows(w, dt) {
  if (dt <= 0) return;
  const lvl = w.lvl;
  for (const t of w.throws) {
    if (t.dead) continue;
    t.life -= dt;
    if (t.life <= 0) { shatter(w, t, t.x, t.y); continue; }
    t.trail.push(t.x, t.y); if (t.trail.length > 10) t.trail.splice(0, 2);
    t.vy += (t.type === 'skull' ? 240 : 760) * dt;
    t.rot += dt * (t.type === 'skull' ? 24 : 14) * (t.vx >= 0 ? 1 : -1);
    const n = Math.max(1, Math.ceil((Math.hypot(t.vx, t.vy) * dt) / 4));
    for (let i = 0; i < n && !t.dead; i++) {
      const ox = t.x, oy = t.y;
      t.x += (t.vx * dt) / n; t.y += (t.vy * dt) / n;
      const tx = Math.floor(t.x / T), ty = Math.floor(t.y / T), tl = lvl.tile(tx, ty);
      const door = w.doors.find((d) => !d.isOpen && d.tx === tx && (d.ty === ty || d.ty - 1 === ty));
      if (door) { openDoor(w, door, sign(t.vx) || 1, 'player'); shatter(w, t, ox, oy); break; }
      if (isSolidT(tl) || (isOneWay(tl) && t.vy > 0 && oy <= ty * T)) { shatter(w, t, ox, oy); break; }
      let hit = false;
      for (const e of w.enemies) {
        if (!e.alive) continue;
        const [ex, ey, ew, eh] = hurtBox(e);
        if (t.x > ex && t.x < ex + ew && t.y > ey && t.y < ey + eh) { throwHits(w, t, e); hit = true; break; }
      }
      if (hit) break;
      if (w.boss && bossThrowHit(w, w.boss, t)) { shatter(w, t, t.x, t.y); break; }
      for (const c of w.chans) if (c.state === 'hang' && segPointDist(c.ax, c.ay, c.x, c.y, t.x, t.y) < 6) { dropChandelier(w, c); shatter(w, t, t.x, t.y); hit = true; break; }
      if (hit) break;
      for (const bl of w.bells) if (dist(t.x, t.y, bl.x, bl.y + 24) < 18) { strikeBell(w, bl, sign(t.vx) || 1); shatter(w, t, t.x, t.y); hit = true; break; }
      if (hit) break;
    }
  }
  if (w.throws.some((t) => t.dead)) w.throws = w.throws.filter((t) => !t.dead);
}
function throwHits(w, t, e) {
  const ang = Math.atan2(t.vy, t.vx);
  if (t.type === 'skull') {
    if (e.type === 'shield' && e.stunT <= 0 && e.shieldDown <= 0 && t.vx * e.face < 0) {
      sparks(w, t.x, t.y, ang + Math.PI, 12, 200); Sound.play('block'); e.staggerT = 0.3;
    } else if (guardCheck(e, t.x - t.vx * 0.05, t.y) === 'block') {
      e.staggerT = 1.0; e.state = 'stagger'; e.st = 0; e.vx = sign(t.vx) * 120; e.flash = 0.15;
      sparks(w, t.x, t.y, ang + Math.PI, 14, 220); floatText(w, e.x, e.y - 40, 'staggered'); Sound.play('clash');
    } else killEnemy(w, e, ang, 'skull');
  }
  shatter(w, t, t.x, t.y);
}
function shatter(w, t, x, y) {
  if (t.dead) return;
  t.dead = true;
  if (t.type === 'skull') {
    for (let i = 0; i < 14; i++) part(w, x, y, rnd(-140, 140), -rnd(30, 190), rnd(0.5, 1.1), i % 3 ? '#d8ccb0' : '#8a7e66', R() < 0.3 ? 2 : 1, 0, 700, 0.99);
    Sound.play('bone');
  } else {
    for (let i = 0; i < 18; i++) part(w, x, y, rnd(-160, 160), -rnd(40, 220), rnd(0.3, 0.8), i % 3 ? '#8ac0ff' : '#e8f4ff', 1, 3, 600, 0.97);
    const fy = floorBelow(w.lvl, x, y - 2, 220);
    if (fy !== null) { w.fires.push({ x, y: fy, w: 52, life: 3.2, max: 3.2, hitBoss: false }); Sound.play('fire'); }
    Sound.play('shatter');
  }
  w.noise = { x, y, r: 110 };
}
function updateFires(w, dt) {
  if (dt <= 0) return;
  const p = w.p;
  for (const f of w.fires) {
    f.life -= dt;
    if (R() < 0.6) part(w, f.x + rnd(-f.w / 2, f.w / 2), f.y - rnd(0, 6), rnd(-10, 10), -rnd(30, 90), rnd(0.3, 0.7), R() < 0.5 ? '#ffd27a' : '#ff6a1f', 1, 2, -40, 0.97);
    if (f.life < 0.25) continue;
    const x0 = f.x - f.w / 2;
    for (const e of w.enemies) if (e.alive && e.type !== 'gargoyle' && e.x > x0 && e.x < x0 + f.w && Math.abs(e.y - f.y) < 8) killEnemy(w, e, -Math.PI / 2, 'fire');
    if (!p.dead && p.x + p.w / 2 > x0 + 3 && p.x - p.w / 2 < x0 + f.w - 3 && Math.abs(p.y - f.y) < 6) killPlayer(w, 'fire', -Math.PI / 2);
    if (w.boss && !f.hitBoss && bossFireHit(w, w.boss, f)) f.hitBoss = true;
  }
  if (w.fires.some((f) => f.life <= 0)) w.fires = w.fires.filter((f) => f.life > 0);
}
// ---------- the censer-bearers' fire ----------
function updateBlasts(w, dt) {
  if (dt <= 0 || !w.blasts.length) return;
  for (const b of w.blasts) { b.t -= dt; if (b.t <= 0 && !b.done) { b.done = true; explode(w, b.x, b.y); } }
  w.blasts = w.blasts.filter((b) => !b.done);
}
function explode(w, x, y) {
  const p = w.p;
  Sound.play('explode');
  w.shake = Math.max(w.shake, 12); w.flash = Math.max(w.flash, 0.35); w.hitstop = Math.max(w.hitstop, 3);
  ring(w, x, y, 56, 0.4, '#fff1c0', 3); ring(w, x, y, 40, 0.5, '#ff6a1f', 2);
  for (let i = 0; i < 46; i++) { const a = rnd(TAU), s = rnd(60, 300); part(w, x, y, Math.cos(a) * s, Math.sin(a) * s - 40, rnd(0.3, 0.9), i % 3 ? '#ff6a1f' : i % 2 ? '#ffd27a' : '#fff1c0', R() < 0.4 ? 2 : 1, 2, 200, 0.94); }
  for (let i = 0; i < 18; i++) part(w, x + rnd(-14, 14), y + rnd(-14, 14), rnd(-30, 30), -rnd(10, 50), rnd(0.8, 1.6), '#2a2224', 2, 4, -20, 0.95);
  const dg = w.dg; dg.fillStyle = 'rgba(10,6,6,0.55)';
  for (let i = 0; i < 40; i++) { const a = rnd(TAU), r = rnd(4, 26); dg.fillRect(Math.floor(x + Math.cos(a) * r), Math.floor(y + Math.sin(a) * r), 2, 2); }
  for (const e of w.enemies) if (e.alive && dist(e.x, e.y - e.h / 2, x, y) < 48) killEnemy(w, e, Math.atan2(e.y - e.h / 2 - y, e.x - x), 'blast');
  if (!p.dead && dist(p.x, p.y - 11, x, y) < 40) killPlayer(w, 'blast', Math.atan2(p.y - 11 - y, p.x - x));
  for (const wf of w.weak) if (!wf.broken && dist(wf.tx * T + 8, wf.ty * T + 8, x, y) < 40) breakWeak(w, wf, false);
  for (const d of w.doors) if (!d.isOpen && dist(d.x, d.y - 16, x, y) < 46) openDoor(w, d, sign(d.x - x) || 1, 'blast');
  for (const c of w.chans) if (c.state === 'hang' && dist(c.x, c.y, x, y) < 60) dropChandelier(w, c);
  for (const pk of w.planks) if (pk.state === 'solid' && dist(pk.tx * T + 8, pk.ty * T, x, y) < 40) { pk.state = 'shake'; pk.t = 0.05; }
  if (w.boss) bossBlast(w, w.boss, x, y);
  w.noise = { x, y, r: 200 };
}

// ---------- chandeliers & bells ----------
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
function dropChandelier(w, c) {
  if (c.state !== 'hang') return;
  c.state = 'fall'; c.vy = 0;
  Sound.play('chain');
  sparks(w, c.ax, c.ay + 4, Math.PI / 2, 8, 120, '#ffe2a0');
}
function strikeBell(w, b, dir) {
  if (b.cd > 0) return;
  b.cd = w.boss ? 2.2 : 3.5; b.sv += 2.6 * (dir || 1); b.rung = 1;
  Sound.play('toll'); Sound.play('stun');
  const bx = b.x, by = b.y + 24;
  ring(w, bx, by, 320, 1.1, '#e8c070', 3); ring(w, bx, by, 220, 0.8, '#fff1c0', 1);
  w.shake = Math.max(w.shake, 10); w.flash = Math.max(w.flash, 0.4); w.hitstop = Math.max(w.hitstop, 6);
  for (const e of w.enemies) if (e.alive && dist(bx, by, e.x, e.y) < 330) { e.stunT = 2.4; e.state = 'stun'; e.alerted = true; e.reactT = 0; e.yankT = 0; }
  for (const bo of w.bolts) if (bo.owner === 'enemy' && dist(bx, by, bo.x, bo.y) < 330) {
    bo.owner = 'player'; bo.vx *= -1.4; bo.vy *= -1.4; bo.life = 2; bo.bounces = 1; bo.trail.length = 0;
  }
  w.bellAnchor = 5;
  if (w.boss) bossBell(w, w.boss, b);
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
      if (w.boss) bossCrush(w, w.boss, c);
      const ty = Math.floor((c.y + 7) / T), t1 = w.lvl.tile(Math.floor(c.x / T), ty);
      if (isSolidT(t1) || isOneWay(t1)) {
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

// ---------- doors: struck open, they flatten whoever waits behind ----------
function makeDoor(d) { return { tx: d.tx, ty: d.ty, x: d.x, y: d.y, isOpen: false, swing: 0, dir: 1, shake: 0 }; }
function forceOpenDoor(w, d) {
  d.isOpen = true; d.swing = 1; d.dir = 1;
  w.lvl.setOver(d.tx, d.ty, 0); w.lvl.setOver(d.tx, d.ty - 1, 0);
}
function openDoor(w, d, dir, by) {
  if (d.isOpen) return;
  d.isOpen = true; d.dir = dir || 1; d.swing = 0;
  w.lvl.setOver(d.tx, d.ty, 0); w.lvl.setOver(d.tx, d.ty - 1, 0);
  Sound.play('door');
  w.shake = Math.max(w.shake, by === 'enemy' ? 2 : 6);
  for (let i = 0; i < 10; i++) part(w, d.x + d.dir * 6, d.y - rnd(2, 30), d.dir * rnd(40, 160), rnd(-60, 20), rnd(0.3, 0.7), i % 2 ? '#5a3a20' : '#3a2414', 1, 0, 600, 0.98);
  dust(w, d.x, d.y, 8, d.dir);
  w.noise = { x: d.x, y: d.y, r: 150 };
  if (by === 'enemy') return;
  for (const e of w.enemies) {
    if (!e.alive || e.type === 'gargoyle' || e.type === 'cherub') continue;
    const dx = (e.x - d.x) * d.dir;
    if (dx < -6 || dx > 46 || Math.abs(e.y - d.y) > 28) continue;
    if (dx < 24 && e.type !== 'shield' && e.type !== 'fallen') { killEnemy(w, e, d.dir > 0 ? -0.2 : Math.PI + 0.2, 'door'); continue; }
    e.stunT = 1.6; e.state = 'stun'; e.vx = d.dir * 210; e.vy = -90; e.alerted = true; e.reactT = 0; e.flash = 0.15;
    floatText(w, e.x, e.y - 40, 'stunned', '#e8dcc0');
  }
}
function updateDoors(w, dt) {
  for (const d of w.doors) { if (d.isOpen) d.swing = Math.min(1, d.swing + dt * 7); d.shake = Math.max(0, d.shake - dt); }
}

// ---------- light through the high windows ----------
function makeBeam(b, lvl) {
  const tx = Math.floor(b.x / T);
  let ty = b.ty + 1;
  while (ty < lvl.h && (lvl.base(tx, ty) === 0 || lvl.base(tx, ty) === 3)) ty++;
  return { x: b.x, y: (b.ty + 1) * T, y1: ty * T, on: b.on, off: b.off, phase: b.phase, active: false, warn: false };
}
function updateBeams(w, dt) {
  const p = w.p;
  for (const b of w.beams) {
    const per = b.on + b.off, c = (((w.t + b.phase) % per) + per) % per;
    const was = b.active;
    b.active = c < b.on; b.warn = !b.active && c > per - 0.55;
    if (b.active && !was && Math.abs(b.x - p.x) < 300 && Math.abs(b.y1 - p.y) < 200) Sound.play('beamOn');
    if (!b.active || dt <= 0) continue;
    if (R() < 0.5) part(w, b.x + rnd(-3, 3), b.y1 - rnd(0, 4), rnd(-20, 20), -rnd(20, 60), rnd(0.2, 0.5), '#fff1c0', 1, 2, -30, 0.95);
    const bx = b.x - 4, by = b.y, bh = b.y1 - b.y;
    if (!p.dead && overlap(bx, by, 8, bh, ...boxOf(p))) { Sound.play('burn'); killPlayer(w, 'burn', -Math.PI / 2); }
    for (const e of w.enemies) if (e.alive && overlap(bx, by, 8, bh, ...hurtBox(e))) { Sound.play('burn'); killEnemy(w, e, -Math.PI / 2, 'burn'); }
  }
}

// ---------- the pendulums of the vaults ----------
function makePend(pd) { return { px: pd.px, py: pd.py, len: pd.len, amp: pd.amp, period: pd.period, phase: pd.phase, a: 0, va: 0, bx: pd.px, by: pd.py + pd.len }; }
function pendHits(pd, x, y, w2, h2) {
  const ca = Math.cos(pd.a), sa = Math.sin(pd.a);
  for (const k of [-13, -7, 0, 7, 13]) {
    const kk = Math.abs(k) > 10 ? 3 : 0; // the blade's tips curl up toward the rod
    const px = pd.bx + ca * k - sa * kk, py = pd.by - sa * k - ca * kk;
    if (px > x - 2 && px < x + w2 + 2 && py > y - 2 && py < y + h2 + 2) return true;
  }
  return false;
}
function updatePends(w, dt) {
  const p = w.p;
  for (const pd of w.pends) {
    const a0 = pd.a;
    pd.a = pd.amp * Math.sin((w.t / pd.period + pd.phase) * TAU);
    if (dt > 0) pd.va = (pd.a - a0) / dt;
    pd.bx = pd.px + Math.sin(pd.a) * pd.len; pd.by = pd.py + Math.cos(pd.a) * pd.len;
    if (dt <= 0) continue;
    if (Math.sign(a0) !== Math.sign(pd.a) && Math.abs(pd.px - p.x) < 260) Sound.play('pendulum');
    if (!p.dead && pendHits(pd, ...boxOf(p))) killPlayer(w, 'pendulum', pd.va > 0 ? 0 : Math.PI);
    for (const e of w.enemies) if (e.alive && pendHits(pd, ...hurtBox(e))) killEnemy(w, e, pd.va > 0 ? 0 : Math.PI, 'pendulum');
  }
}

// ---------- rotten planks and cracked floors ----------
function standOnPlanks(w) {
  const p = w.p, ty = Math.floor((p.y + 1) / T);
  for (const pk of w.planks) {
    if (pk.state !== 'solid' || pk.ty !== ty) continue;
    if (pk.tx * T < p.x + p.w / 2 && (pk.tx + 1) * T > p.x - p.w / 2) { pk.state = 'shake'; pk.t = 0.4; Sound.play('creak'); }
  }
}
function updatePlanks(w, dt) {
  if (dt <= 0) return;
  for (const pk of w.planks) {
    if (pk.state === 'solid') continue;
    pk.t -= dt;
    if (pk.state === 'shake') {
      if (R() < 0.3) part(w, pk.tx * T + rnd(2, 14), pk.ty * T + 4, rnd(-10, 10), rnd(10, 40), 0.4, '#4a3420', 1, 0, 400, 0.99);
      if (pk.t <= 0) {
        pk.state = 'gone'; pk.t = 3.2; w.lvl.setOver(pk.tx, pk.ty, 0);
        for (let i = 0; i < 8; i++) part(w, pk.tx * T + rnd(0, 16), pk.ty * T + rnd(0, 4), rnd(-40, 40), rnd(-30, 30), rnd(0.6, 1.2), i % 2 ? '#4a3420' : '#6a4a2a', 2, 0, 700, 0.99);
        Sound.play('crumble');
      }
    } else if (pk.state === 'gone' && pk.t <= 0) {
      pk.state = 'solid'; w.lvl.setOver(pk.tx, pk.ty, 255);
      for (let i = 0; i < 4; i++) part(w, pk.tx * T + rnd(0, 16), pk.ty * T, 0, -rnd(5, 20), 0.4, '#8a6a4a', 1, 4, 0, 0.9);
    }
  }
}
function breakWeak(w, wf, silent) {
  if (wf.broken) return;
  wf.broken = true; w.lvl.setOver(wf.tx, wf.ty, 0);
  if (silent) return;
  const x = wf.tx * T + 8, y = wf.ty * T + 6;
  debrisBurst(w, x, y, 16, w.lvl.theme.stone[2], 200);
  dust(w, x, y, 8);
  Sound.play('breakFloor');
  w.shake = Math.max(w.shake, 8);
  for (const o of w.weak) if (!o.broken && o.ty === wf.ty && Math.abs(o.tx - wf.tx) === 1) breakWeak(w, o, false);
}

// ---------- pickups, relics, beads ----------
function updatePickups(w) {
  const p = w.p;
  if (p.dead) return;
  const [px, py, pw, ph] = boxOf(p);
  for (const it of w.items) {
    if (it.got || p.item || !overlap(px, py, pw, ph, it.x - 6, it.y - 10, 12, 10)) continue;
    it.got = true; p.item = it.type;
    Sound.play('pickup');
    floatText(w, it.x, it.y - 16, it.type === 'skull' ? 'a skull   Q to throw' : 'holy water   Q to throw', '#e8dcc0');
  }
  for (const r of w.relics) {
    if (r.got || !overlap(px, py, pw, ph, r.x - 8, r.y - 24, 16, 24)) continue;
    r.got = true; w.relicGot.push(r.id);
    if (r.id === 'chain') w.abil.chain = true;
    Sound.play('relic');
    w.flash = Math.max(w.flash, 0.3);
    ring(w, r.x, r.y - 10, 60, 0.6, '#f2d48f', 2);
    if (G.onRelic) G.onRelic(r.id);
  }
  for (const b of w.beads) {
    if (b.got || !overlap(px, py, pw, ph, b.x - 7, b.y - 20, 14, 20)) continue;
    b.got = true; w.beadGot.push(b.n);
    Sound.play('pickup'); Sound.play('mark', b.n);
    ring(w, b.x, b.y - 8, 26, 0.5, '#ff6a5a', 1);
    floatText(w, b.x, b.y - 24, 'a bead of the rosary', '#ff9a8a');
  }
}

// ---------- the ones who only talk ----------
function makeNPC(n) {
  const o = { kind: 'npc', id: n.id, type: n.kind, x: n.x, y: n.y, face: -1, pose: newPose(), t: 0, state: 'sit', talked: false, endAt: 0, vx: 0, vy: 0 };
  setPose(o.pose, POSE.sit(newPose()));
  return o;
}
function updateNPCs(w, dt) {
  const p = w.p;
  for (const n of w.npcs) {
    n.t += dt;
    if (dt > 0) {
      const tg = n.state === 'dead' ? POSE.slump(_ep) : POSE.sit(_ep);
      if (n.state === 'talk') tg[3] += Math.sin(n.t * 3) * 0.08;
      blendPose(n.pose, tg, 1 - Math.pow(0.92, dt * 60));
    }
    if (!n.talked && !p.dead && Math.abs(p.x - n.x) < 74 && Math.abs(p.y - n.y) < 40 && !w.enemies.some((e) => e.alive && e.alerted && dist(e.x, e.y, n.x, n.y) < 170)) {
      n.talked = true; n.state = 'talk';
      Sound.play('whisper');
      const lines = (STORY.npc[n.id] || []);
      for (const [who, text] of lines) say(w, who === 'npc' ? n.id : who, text, 0.2);
      n.endAt = w.lines.reduce((m, l) => Math.max(m, l.end), w.t);
    }
    if (n.state === 'talk' && w.t > n.endAt) n.state = 'dead';
  }
}
function updateTriggers(w) {
  const p = w.p;
  if (p.dead) return;
  for (const tr of w.lvl.triggers) {
    if (w.trig[tr.id] || !overlap(tr.x, tr.y, tr.w, tr.h, ...boxOf(p))) continue;
    w.trig[tr.id] = true;
    if (w.boss && tr.id === w.boss.type + '_intro') bossWake(w, w.boss);
  }
}

// ---------- gibs & particles ----------
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
    if (g.vy > 0 && (isSolidT(t) || (isOneWay(t) && g.y + 5 <= ty * T + 1))) {
      g.y = ty * T - 5; g.vy *= -0.28; g.vx *= 0.6; g.va *= 0.5;
      if (Math.abs(g.vy) < 40) g.vy = 0;
    } else if (g.vy < 0 && lvl.solidAt(Math.floor(g.x / T), Math.floor((ny - 5) / T))) g.vy = 0;
    else g.y = ny;
    g.a += g.va * dt;
    if (g.vy === 0) {
      g.vx = approach(g.vx, 0, 400 * dt); g.va = approach(g.va, 0, 20 * dt);
      const below = lvl.tile(Math.floor(g.x / T), Math.floor((g.y + 6) / T));
      if (!isSolidT(below) && !isOneWay(below)) g.vy = 1; // the floor fell away
    }
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
      if (isSolidT(t) || (isOneWay(t) && oy <= ty * T && q.vy > 0) || t === 3) {
        if (lvl.base(tx, ty) === t && t !== 4 && t !== 5) { // blood stays on stone, not on what may fall away
          dg.fillStyle = q.c;
          const sx = t === 1 ? (lvl.solidAt(Math.floor(ox / T), ty) ? q.x : ox) : q.x;
          const sy = isOneWay(t) ? ty * T : (lvl.solidAt(tx, Math.floor(oy / T)) ? oy : q.y);
          dg.fillRect(Math.floor(sx), Math.floor(sy), q.s + (R() < 0.3 ? 1 : 0), q.s);
          if (R() < 0.15 && t === 1) dg.fillRect(Math.floor(sx), Math.floor(sy) + 1, 1, 1 + ((R() * 3) | 0));
        }
        continue;
      }
    }
    w.parts[j++] = q;
  }
  w.parts.length = j;
}
