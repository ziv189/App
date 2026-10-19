'use strict';
// ============================================================
//  HORA MORTIS — the four who keep the hour
//  Ezequiel the bell-ringer, Our Lady of the Seven Swords,
//  the First penitent, and the Confessor.
// ============================================================
const BOSS = {};
function makeBoss(w, def) {
  const B = BOSS[def.type];
  const b = {
    kind: 'boss', type: def.type, x: def.x, y: def.y, _px: def.x, _py: def.y, homeX: def.x, homeY: def.y, w: 20, h: 40, vx: 0, vy: 0, face: -1,
    hp: 1, maxHp: 1, phase: 1, state: 'dormant', st: 0, dur: 0, t: 0, flash: 0, inv: 0, dead: false, dying: 0, awake: false, alive: true,
    marked: false, doomed: false, riteAng: 0, cd: 1.4, onGround: true, waves: [], debris: [], seq: 0, turnT: 0, walkPh: 0, said: {},
  };
  B.init(w, b);
  return b;
}
const bossTargetable = (b) => b.awake && !b.dead && b.state !== 'intro' && b.state !== 'dormant' && !b.hidden;
const bossHurtBox = (b) => BOSS[b.type].box(b);
function bossSet(b, state, dur = 0) { b.state = state; b.st = 0; b.dur = dur; }
function bossWake(w, b) {
  if (b.awake) return;
  b.awake = true; bossSet(b, 'intro');
  const lines = w.introSeen ? STORY.bossIntro[b.type].slice(-1) : STORY.bossIntro[b.type];
  for (const [who, text] of lines) say(w, who === 'boss' ? 'boss' : 'p', text, 0.3);
  b.introEnd = w.lines.reduce((m, l) => Math.max(m, l.end), w.t) + 0.1;
  w.camFocus = { x: b.x, y: b.y - 40, k: 0 };
  w.letterbox = 1;
  if (BOSS[b.type].wake) BOSS[b.type].wake(w, b);
}
function bossRestore(w, b, ck) {
  b.awake = true; bossSet(b, BOSS[b.type].rest || 'idle'); b.cd = 1.6;
  b.hp = ck.hp; b.phase = ck.phase;
  w.trig[b.type + '_intro'] = true;
  if (BOSS[b.type].restore) BOSS[b.type].restore(w, b);
}
function bossHurt(w, b, src, ang) {
  if (b.dead || b.inv > 0 || !bossTargetable(b)) return false;
  const B = BOSS[b.type];
  if (B.beforeHurt && B.beforeHurt(w, b, src)) return true;
  b.hp--; b.inv = 0.5; b.flash = 0.3;
  const [hx, hy, hw, hh] = bossHurtBox(b);
  bloodBurst(w, hx + hw / 2, hy + hh * 0.4, ang === undefined ? -Math.PI / 2 : ang, 44, 340);
  w.hitstop = Math.max(w.hitstop, 8); w.shake = Math.max(w.shake, 9); w.killCam = Math.max(w.killCam, 0.3); w.flash = Math.max(w.flash, 0.15); w.zoom = 1;
  w.fervour = Math.min(100, w.fervour + 20);
  Sound.play('bossHit');
  if (b.hp <= 0) { bossDie(w, b, ang); return true; }
  const ph = B.phaseOf(b);
  if (ph !== b.phase) { b.phase = ph; const pl = STORY.bossPhase[b.type] && STORY.bossPhase[b.type][ph]; if (pl) say(w, 'boss', pl, 0.2); if (B.onPhase) B.onPhase(w, b); }
  if (B.onHurt) B.onHurt(w, b, src, ang);
  return true;
}
function bossDie(w, b, ang) {
  b.dead = true; bossSet(b, 'dying'); b.dying = 0; b.vx = 0;
  w.killCam = 1.8; w.flash = 0.6; w.shake = 14; w.hitstop = 10;
  Sound.play('bossDie');
  for (const bo of w.bolts) if (bo.owner === 'enemy') bo.dead = true;
  for (const [who, text] of STORY.bossDeath[b.type]) say(w, who === 'boss' ? 'boss' : 'p', text, 0.8);
  b.clearAt = w.lines.reduce((m, l) => Math.max(m, l.end), w.t) + 0.3;
  for (const e of w.enemies) if (e.alive && e.summoned) killEnemy(w, e, -Math.PI / 2, 'rite');
  if (BOSS[b.type].onDie) BOSS[b.type].onDie(w, b, ang);
}
function updateBoss(w, b, dt) {
  const B = BOSS[b.type];
  b.flash = Math.max(0, b.flash - dt); b.inv = Math.max(0, b.inv - dt);
  if (dt <= 0) return;
  b.t += dt; b.st += dt;
  if (b.state === 'dormant' || b.state === 'intro') {
    if (b.state === 'intro') {
      if (w.camFocus) w.camFocus.k = Math.min(0.55, w.camFocus.k + dt * 1.5);
      if (w.t >= b.introEnd) { bossSet(b, B.rest || 'idle'); b.cd = 0.8; w.camFocus = null; w.letterbox = 0; if (B.begin) B.begin(w, b); }
    }
    B.idle(w, b, dt);
  } else if (b.state === 'dying') {
    b.dying += dt;
    if (B.dyingUpdate) B.dyingUpdate(w, b, dt); else b.vx = approach(b.vx, 0, 600 * dt);
    if (!b.cleared && w.t >= b.clearAt) { b.cleared = true; if (B.cleared) B.cleared(w, b); else checkCleared(w); }
  } else B.update(w, b, dt);
  if (b.waves.length) updateWaves(w, b, dt);
  if (b.debris.length) updateDebris(w, b, dt);
  if (b.pose) poseAndCape(b, dt);
}

// ---------- the ways a boss can be struck ----------
function bossSlash(w, b, ox, oy, a) {
  if (!bossTargetable(b)) return;
  const [bx, by, bw, bh] = bossHurtBox(b);
  const d = dist(ox, oy, clamp(ox, bx, bx + bw), clamp(oy, by, by + bh));
  if (d > 33) return;
  if (d > 16 && Math.abs(angDiff(a, Math.atan2(by + bh / 2 - oy, bx + bw / 2 - ox))) > 1.45) return;
  w.p.hitSet.push(b);
  const B = BOSS[b.type];
  if (B.slash) B.slash(w, b, a, ox, oy); else bossHurt(w, b, 'slash', a);
}
function bossPlungeHit(w, b) {
  if (!bossTargetable(b)) return false;
  const p = w.p;
  if (!overlap(p.x - 9, p.y - 8, 18, 16, ...bossHurtBox(b))) return false;
  const B = BOSS[b.type];
  if (B.plunge) B.plunge(w, b); else bossHurt(w, b, 'plunge', Math.PI / 2);
  return true;
}
function bossBoltHit(w, b, bo) {
  if (!bossTargetable(b)) return false;
  const [bx, by, bw, bh] = bossHurtBox(b);
  if (!(bo.x > bx && bo.x < bx + bw && bo.y > by && bo.y < by + bh)) return false;
  const B = BOSS[b.type];
  if (B.bolt) return B.bolt(w, b, bo);
  bossHurt(w, b, 'bolt', Math.atan2(bo.vy, bo.vx));
  return true;
}
function bossThrowHit(w, b, t) {
  if (!bossTargetable(b)) return false;
  const [bx, by, bw, bh] = bossHurtBox(b);
  if (!(t.x > bx && t.x < bx + bw && t.y > by && t.y < by + bh)) return false;
  const B = BOSS[b.type];
  if (B.throwHit) B.throwHit(w, b, t);
  else { sparks(w, t.x, t.y, Math.atan2(-t.vy, -t.vx), 10, 180); b.flash = 0.08; }
  return true;
}
function bossFireHit(w, b, f) {
  if (!bossTargetable(b) || b.x < f.x - f.w / 2 || b.x > f.x + f.w / 2 || Math.abs(b.y - f.y) > 10) return false;
  bossHurt(w, b, 'fire', -Math.PI / 2);
  return true;
}
function bossBlast(w, b, x, y) {
  if (!bossTargetable(b)) return;
  const [bx, by, bw, bh] = bossHurtBox(b);
  if (dist(clamp(x, bx, bx + bw), clamp(y, by, by + bh), x, y) < 40) bossHurt(w, b, 'blast', Math.atan2(by + bh / 2 - y, bx + bw / 2 - x));
}
function bossCrush(w, b, c) {
  if (c.hitBoss || !bossTargetable(b)) return;
  if (overlap(c.x - 24, c.y - 8, 48, 18, ...bossHurtBox(b))) { c.hitBoss = true; bossHurt(w, b, 'crush', Math.PI / 2); }
}
function bossBell(w, b, bell) { if (BOSS[b.type].bell) BOSS[b.type].bell(w, b, bell); }
function bossQuake(w, b, fx, fy) { if (bossTargetable(b) && BOSS[b.type].quake) BOSS[b.type].quake(w, b, fx, fy); }
function bossChained(w, b) { if (BOSS[b.type].chained) BOSS[b.type].chained(w, b); }
function bossDeflectNear(w, b, ox, oy) { return !!(BOSS[b.type].deflectNear && BOSS[b.type].deflectNear(w, b, ox, oy)); }

// ---------- shared hazards ----------
function bossGroundMove(w, b, dt) {
  b.vy = Math.min(b.vy + 1200 * dt, 640);
  const prevB = b.y, was = b.onGround;
  b.hitX = moveX(w.lvl, b, b.vx * dt);
  b.onGround = moveY(w.lvl, b, b.vy * dt, prevB, false) > 0;
  b.landed = b.onGround && !was;
  if (Math.abs(b.vx) > 10 && b.onGround) b.walkPh += dt * Math.abs(b.vx) * 0.08;
}
function bossStrike(w, x, y, ww, hh, cause, ang) {
  const p = w.p;
  if (p.dead || playerSafe(w)) return false;
  if (overlap(x, y, ww, hh, ...boxOf(p))) { killPlayer(w, cause, ang); return true; }
  return false;
}
function bossClang(w, b, a, text) {
  const p = w.p;
  sparks(w, p.x + Math.cos(a) * 16, p.y - 12 + Math.sin(a) * 16, a + Math.PI, 18, 240);
  Sound.play('clash');
  p.vx = -Math.cos(a) * 230; p.vy = Math.min(p.vy, -120);
  w.hitstop = Math.max(w.hitstop, 4); w.shake = Math.max(w.shake, 4); b.flash = 0.08;
  if (text && !b.said.clang) { b.said.clang = true; floatText(w, b.x, b.y - b.h - 16, text, '#e8dcc0'); }
}
function updateWaves(w, b, dt) {
  const p = w.p;
  for (const q of b.waves) {
    q.life -= dt; q.x += q.dir * q.spd * dt;
    const ahead = Math.floor((q.x + q.dir * 5) / T);
    if (w.lvl.solidAt(ahead, Math.floor((q.y - 6) / T))) q.life = 0;
    if (R() < 0.7) part(w, q.x + rnd(-3, 3), q.y - rnd(0, q.h), q.dir * rnd(20, 90), -rnd(30, 110), rnd(0.2, 0.5), R() < 0.5 ? '#e8c070' : '#fff1c0', 1, 3, 300, 0.95);
    if (q.life > 0 && !p.dead && p.invuln <= 0 && !w.rite && overlap(q.x - 5, q.y - q.h, 10, q.h, ...boxOf(p))) killPlayer(w, 'wave', -Math.PI / 2);
    for (const e of w.enemies) if (e.alive && !e.summoned && overlap(q.x - 5, q.y - q.h, 10, q.h, ...boxOf(e))) killEnemy(w, e, -Math.PI / 2, 'quake');
  }
  b.waves = b.waves.filter((q) => q.life > 0);
}
function spawnDebris(w, b, n, x0, x1) {
  for (let i = 0; i < n; i++) {
    const x = rnd(x0, x1);
    let ty = Math.floor((b.y - 40) / T);
    while (ty > 0 && !w.lvl.solidAt(Math.floor(x / T), ty - 1)) ty--;
    b.debris.push({ x, y: ty * T + 4, vy: 0, warn: 0.6 + i * 0.13, fy: floorBelow(w.lvl, x, ty * T + 6, 400) || b.y, dead: false });
  }
}
function updateDebris(w, b, dt) {
  const p = w.p;
  for (const d of b.debris) {
    if (d.warn > 0) { d.warn -= dt; if (R() < 0.4) part(w, d.x + rnd(-3, 3), d.y, rnd(-5, 5), rnd(20, 60), 0.5, '#6a5e5a', 1, 4, 100, 0.95); continue; }
    d.vy = Math.min(d.vy + 900 * dt, 560); d.y += d.vy * dt;
    if (!p.dead && !playerSafe(w) && overlap(d.x - 6, d.y - 6, 12, 12, ...boxOf(p))) killPlayer(w, 'debris', Math.PI / 2);
    for (const e of w.enemies) if (e.alive && overlap(d.x - 6, d.y - 6, 12, 12, ...boxOf(e))) killEnemy(w, e, Math.PI / 2, 'crush');
    const t = w.lvl.tile(Math.floor(d.x / T), Math.floor((d.y + 6) / T));
    if (isSolidT(t) || isOneWay(t)) { d.dead = true; debrisBurst(w, d.x, d.y, 12, '#4a4040', 170); dust(w, d.x, d.y + 6, 5); Sound.play('crumble'); }
  }
  b.debris = b.debris.filter((d) => !d.dead);
}
function drawWaves(g, b, cx, cy) {
  for (const q of b.waves) {
    const x = Math.round(q.x - cx), y = Math.round(q.y - cy), h = Math.round(q.h * Math.min(1, q.life * 4));
    g.fillStyle = '#e8c070'; g.fillRect(x - 2, y - h, 5, h);
    g.fillStyle = '#fff1c0'; g.fillRect(x - 1, y - h, 2, h);
    g.fillStyle = 'rgba(255,200,110,0.4)'; g.fillRect(x - 6 - q.dir * 4, y - (h >> 1), 12, h >> 1);
  }
}
function drawDebris(g, b, cx, cy) {
  for (const d of b.debris) {
    const x = Math.round(d.x - cx);
    if (d.warn > 0) {
      const k = 1 - d.warn / 0.6;
      g.fillStyle = `rgba(20,10,10,${0.25 + 0.35 * clamp(k, 0, 1)})`; g.fillRect(x - 6, Math.round(d.fy - cy) - 1, 12, 2);
      continue;
    }
    const y = Math.round(d.y - cy);
    g.fillStyle = '#1a1414'; pcirc(g, x, y, 6);
    g.fillStyle = '#4a4040'; pcirc(g, x, y, 5);
    g.fillStyle = '#6a5e5a'; g.fillRect(x - 3, y - 4, 4, 2);
  }
}
function bossSprite(name, mul) { return rimmed(name, mul); }

// ============================================================
//  I. EZEQUIEL, who rings for the dead
//  Iron hide at the front. Strike his back, catch him spent,
//  or strike the great bell he worships.
// ============================================================
BOSS.ezequiel = {
  name: 'Ezequiel', title: 'who rings for the dead', rest: 'walk',
  init(w, b) { b.w = 28; b.h = 60; b.maxHp = b.hp = MODE === 'pilgrim' ? 6 : 8; b.face = -1; },
  box(b) { return [b.x - 17, b.y - 62, 34, 62]; },
  phaseOf(b) { return b.hp <= b.maxHp / 2 ? 2 : 1; },
  open(b) { return b.state === 'cleaveRec' || b.state === 'slamRec' || b.state === 'stunned' || b.state === 'bellStun'; },
  idle(w, b, dt) { b.vx = approach(b.vx, 0, 400 * dt); bossGroundMove(w, b, dt); b.face = sign(w.p.x - b.x) || b.face; },
  wake(w) { Sound.play('roar'); w.shake = Math.max(w.shake, 6); },
  slash(w, b, a, ox) {
    const front = (ox - b.x) * b.face > 0;
    if (front && !this.open(b)) { bossClang(w, b, a, 'his hide is iron'); return; }
    bossHurt(w, b, 'slash', a);
  },
  plunge(w, b) { bossHurt(w, b, 'plunge', Math.PI / 2); },
  bolt(w, b, bo) {
    if ((bo.x - b.x) * b.face > 0 && !this.open(b)) { sparks(w, bo.x, bo.y, Math.atan2(-bo.vy, -bo.vx), 10, 180); Sound.play('block'); return true; }
    bossHurt(w, b, 'bolt', Math.atan2(bo.vy, bo.vx)); return true;
  },
  bell(w, b, bell) {
    if (b.dead || !bossTargetable(b) || dist(bell.x, bell.y + 24, b.x, b.y - 30) > 320 || b.state === 'roar') return;
    bossSet(b, 'bellStun', 2.6); b.vx = 0;
    floatText(w, b.x, b.y - 74, 'the bell remembers', '#f2d48f');
    if (!b.said.bell) { b.said.bell = true; say(w, 'boss', STORY.bossLine.ezequielBell, 0.1, 1.6); }
  },
  onHurt(w, b) {
    if (b.state === 'walk') b.cd = Math.min(b.cd, 0.3);
    if (b.state === 'stunned' || b.state === 'bellStun') { // two blows, then he shrugs the daze off
      b.openHits = (b.openHits || 0) + 1;
      if (b.openHits >= 2) { bossSet(b, 'shrug', 0.55); b.openHits = 0; }
    }
  },
  onPhase(w, b) { bossSet(b, 'roar', 1.5); b.vx = 0; b.waves.length = 0; },
  update(w, b, dt) {
    const p = w.p, D = w.diff, ph = b.phase, spd = ph === 2 ? 1.22 : 1, wind = Math.sqrt(D.wind) / spd;
    const dx = p.x - b.x, ad = Math.abs(dx);
    b.cd -= dt;
    switch (b.state) {
      case 'idle': case 'walk': {
        b.state = 'walk';
        if (sign(dx) !== b.face && ad > 6) { b.turnT += dt; if (b.turnT > 0.4 / spd) { b.face = -b.face; b.turnT = 0; } } else b.turnT = 0;
        b.vx = approach(b.vx, ad > 54 && sign(dx) === b.face ? b.face * 54 * spd : 0, 300 * dt);
        if (b.cd <= 0 && !p.dead) {
          if (ad < 84 && Math.abs(p.y - b.y) < 70 && sign(dx) === b.face) { bossSet(b, 'cleaveWind', 0.62 * wind); Sound.play('windup'); }
          else {
            const pick = ['charge', 'slam', 'charge', 'slam', 'slam'][b.seq++ % 5];
            if (pick === 'charge') { b.face = sign(dx) || b.face; bossSet(b, 'chargeWind', 0.8 * wind); Sound.play('roar'); }
            else { bossSet(b, 'slamWind', 0.85 * wind); Sound.play('windup'); }
          }
        }
        break;
      }
      case 'cleaveWind':
        b.vx = approach(b.vx, 0, 600 * dt);
        if (b.st >= b.dur) { bossSet(b, 'cleave', 0.2); b.vx = b.face * 170; Sound.play('swing'); w.shake = Math.max(w.shake, 4); }
        break;
      case 'cleave':
        b.vx = approach(b.vx, 0, 800 * dt);
        bossStrike(w, b.face > 0 ? b.x : b.x - 66, b.y - 54, 66, 54, 'cleave', b.face > 0 ? -0.3 : Math.PI + 0.3);
        if (b.st >= b.dur) {
          bossSet(b, 'cleaveRec', 0.85 / spd);
          if (ph === 2) b.waves.push({ x: b.x + b.face * 40, y: b.y, dir: b.face, spd: 230, life: 1.6, h: 12 });
        }
        break;
      case 'cleaveRec': b.vx = approach(b.vx, 0, 600 * dt); if (b.st >= b.dur) { bossSet(b, 'walk'); b.cd = 0.7 / spd; } break;
      case 'chargeWind':
        b.vx = approach(b.vx, -b.face * 30, 300 * dt);
        if (R() < 0.5) dust(w, b.x - b.face * 10, b.y, 1, -b.face);
        if (b.st >= b.dur) { bossSet(b, 'charge', 2.4); Sound.play('dash'); }
        break;
      case 'charge':
        b.vx = b.face * 330 * Math.sqrt(spd);
        if (w.steps % 3 === 0) dust(w, b.x - b.face * 12, b.y, 2, -b.face);
        bossStrike(w, b.x - 16, b.y - 46, 32, 46, 'charge', b.face > 0 ? -0.4 : Math.PI + 0.4);
        if (b.hitX) {
          bossSet(b, 'stunned', 1.9); b.vx = -b.face * 120; b.vy = -160;
          Sound.play('slam'); w.shake = Math.max(w.shake, 14); w.flash = Math.max(w.flash, 0.2);
          debrisBurst(w, b.x + b.face * 18, b.y - 40, 16, '#5a5048', 220);
          spawnDebris(w, b, ph === 2 ? 7 : 4, 48, w.lvl.w * T - 48);
        } else if (b.st >= b.dur) { bossSet(b, 'walk'); b.cd = 0.5; }
        break;
      case 'stunned': b.vx = approach(b.vx, 0, 400 * dt); if (b.st >= b.dur) { bossSet(b, 'walk'); b.cd = 0.4; b.openHits = 0; } break;
      case 'bellStun': b.vx = approach(b.vx, 0, 400 * dt); if (b.st >= b.dur) { bossSet(b, 'walk'); b.cd = 0.3; b.openHits = 0; } break;
      case 'shrug':
        b.vx = approach(b.vx, 0, 600 * dt);
        if (b.st >= 0.15 && !b.shrugged) {
          b.shrugged = true; Sound.play('roar'); w.shake = Math.max(w.shake, 8); ring(w, b.x, b.y - 30, 90, 0.4, '#ffb090', 2);
          if (Math.abs(p.x - b.x) < 90 && !p.dead) { p.vx = sign(p.x - b.x) * 280; p.vy = -180; p.onGround = false; }
        }
        if (b.st >= b.dur) { bossSet(b, 'walk'); b.cd = 0.5; b.shrugged = false; }
        break;
      case 'slamWind': b.vx = approach(b.vx, 0, 600 * dt); if (b.st >= b.dur) { bossSet(b, 'slam', 0.12); } break;
      case 'slam':
        if (b.st >= b.dur) {
          Sound.play('slam'); w.shake = Math.max(w.shake, 12);
          ring(w, b.x, b.y, 70, 0.4, '#e8c070', 2); dust(w, b.x, b.y, 16);
          const sp = ph === 2 ? 250 : 210;
          b.waves.push({ x: b.x + 22, y: b.y, dir: 1, spd: sp, life: 2.4, h: 14 }, { x: b.x - 22, y: b.y, dir: -1, spd: sp, life: 2.4, h: 14 });
          bossStrike(w, b.x - 30, b.y - 30, 60, 30, 'slam', -Math.PI / 2);
          if (ph === 2) spawnDebris(w, b, 3, b.x - 160, b.x + 160);
          bossSet(b, 'slamRec', 0.8 / spd);
        }
        break;
      case 'slamRec': if (b.st >= b.dur) { bossSet(b, 'walk'); b.cd = 0.6 / spd; } break;
      case 'roar':
        b.inv = Math.max(b.inv, 0.1);
        if (b.st >= 0.35 && !b.roared) {
          b.roared = true; Sound.play('roar'); w.shake = Math.max(w.shake, 12); ring(w, b.x, b.y - 30, 140, 0.6, '#ffb090', 3);
          if (Math.abs(p.x - b.x) < 130 && !p.dead) { p.vx = sign(p.x - b.x) * 320; p.vy = -220; p.onGround = false; }
          for (const [tx, ty] of [[4, 10], [35, 10]]) {
            const e = makeEnemy({ ch: 'a', x: tx * T + 8, y: (ty + 1) * T, tx, ty }, w.lvl);
            e.summoned = true; e.alerted = true; e.reactT = e.reactDur = 0.9; e.face = sign(b.x - e.x) || 1;
            w.enemies.push(e);
            ring(w, e.x, e.y - 14, 24, 0.5, '#ff3a3a', 1); dust(w, e.x, e.y, 8);
          }
        }
        if (b.st >= b.dur) { bossSet(b, 'walk'); b.cd = 0.5; }
        break;
    }
    bossGroundMove(w, b, dt);
  },
  dyingUpdate(w, b, dt) { b.vx = approach(b.vx, 0, 400 * dt); bossGroundMove(w, b, dt); if (b.dying > 1.2 && !b.fell) { b.fell = true; Sound.play('slam'); w.shake = Math.max(w.shake, 10); dust(w, b.x, b.y, 20); } },
  draw(g, w, b, X, Y, tint) {
    const A = { lean: 0, rock: 0, sx: 1, sy: 1, oy: 0, ox: 0 };
    const k = b.dur ? clamp(b.st / b.dur, 0, 1) : 0, s = b.state;
    const br = Math.sin(b.t * 2); A.sy = 1 + br * 0.015;
    if (s === 'walk' && Math.abs(b.vx) > 8) { A.rock = Math.sin(b.walkPh) * 0.06; A.oy = -Math.abs(Math.sin(b.walkPh)) * 2; }
    if (s === 'cleaveWind') { A.lean = -0.25 * easeOut(k); A.sy = 1 - 0.06 * k; if (k > 0.8) A.ox = Math.sin(b.t * 70) > 0 ? 1 : -1; }
    if (s === 'cleave') { A.lean = 0.3; A.sx = 1.1; A.sy = 0.94; A.ox = 3; }
    if (s === 'cleaveRec' || s === 'slamRec') A.lean = 0.2 * (1 - k);
    if (s === 'chargeWind') { A.lean = -0.12; A.ox = Math.sin(b.t * 60) > 0 ? 1 : -1; }
    if (s === 'charge') { A.lean = 0.32; A.sx = 1.08; }
    if (s === 'slamWind') { A.sy = 1 + 0.08 * easeOut(k); A.sx = 1 - 0.05 * k; A.lean = -0.1; }
    if (s === 'slam' || (s === 'slamRec' && k < 0.2)) { A.sy = 0.86; A.sx = 1.12; }
    if (s === 'stunned' || s === 'bellStun') { A.rock = Math.sin(b.t * 7) * 0.12; A.sy = 0.9; A.lean = -0.1; }
    if (s === 'roar' || s === 'shrug') { A.sy = 1.06; A.ox = Math.sin(b.t * 50) > 0 ? 1 : -1; }
    if (s === 'dying') { const d = clamp(b.dying / 1.2, 0, 1); A.sy = 1 - 0.35 * easeInOut(d); A.lean = -0.3 * d; A.rock = 0; }
    const M = ASSET_META.e_grunt, ax = Math.round(M.foot[0]), ay = M.foot[1] + 1;
    const flash = b.flash > 0 && ((b.flash * 30) | 0) % 2 === 0;
    const img = tint ? tinted('e_grunt', tint) : flash ? tinted('e_grunt', '#fff6e0') : bossSprite('e_grunt', '#c4a088');
    const off = tint || flash ? 0 : 1;
    if (s === 'cleave' && !tint) { g.globalAlpha = 0.3; drawSpriteAnim(g, tinted('e_grunt', '#ff6a5a'), X - b.face * 10, Y, b.face, ax, ay, A, 2); g.globalAlpha = 1; }
    drawSpriteAnim(g, img, X, Y, b.face, ax + off, ay + off, A, 2);
    if (tint) return;
    // the bell on his back, and the rope he rings it with
    const bx = Math.round(X - b.face * 15 + (A.ox || 0)), by = Math.round(Y - 52 + (A.oy || 0));
    g.fillStyle = '#2a1c10'; g.fillRect(bx - 1, by - 4, 2, 4);
    g.fillStyle = '#6a4a1c'; ppoly(g, [bx - 4, by, bx + 4, by, bx + 6, by + 9, bx - 6, by + 9]);
    g.fillStyle = '#b8902e'; g.fillRect(bx - 4, by + 1, 2, 7); g.fillStyle = '#3a2410'; g.fillRect(bx - 6, by + 9, 12, 1);
    // eyes under the hood
    const eyeOn = s !== 'dying' || b.dying < 1.2;
    if (eyeOn) {
      const ex = Math.round(X + b.face * 4 + (A.ox || 0)), ey = Math.round(Y - 54 + (A.oy || 0));
      g.fillStyle = s === 'chargeWind' || s === 'roar' || s === 'shrug' || s === 'cleaveWind' ? '#ffffff' : '#ff3a2a';
      g.fillRect(ex, ey, 2, 1); g.fillRect(ex + b.face * 4, ey, 2, 1);
    }
    if (s === 'cleaveWind' && k > 0.7) { g.fillStyle = '#ffffff'; const gx = Math.round(X - b.face * 18), gy = Math.round(Y - 66); g.fillRect(gx - 4, gy, 9, 1); g.fillRect(gx, gy - 4, 1, 9); }
    if (s === 'cleave') pcrescent(g, X + b.face * 20, Y - 28, 36, 10 * (1 - k) + 2, b.face > 0 ? 0.3 : Math.PI - 0.3, 1.4, ['#ffffff', '#ff6a5a', '#8a0e19']);
    if (s === 'stunned' || s === 'bellStun') {
      g.fillStyle = PAL.goldHi;
      for (let i = 0; i < 4; i++) { const a = RT * 5 + i * 1.6; g.fillRect(Math.round(X + Math.cos(a) * 14), Math.round(Y - 70 + Math.sin(a) * 3), 2, 2); }
    }
  },
  drawFx(g, w, b, cx, cy) { drawWaves(g, b, cx, cy); drawDebris(g, b, cx, cy); },
};

// ============================================================
//  II. OUR LADY OF THE SEVEN SWORDS
//  Stone does not bleed. Only her own swords, returned, can
//  wound her - or a blade when the embrace has spent her.
// ============================================================
BOSS.lady = {
  name: 'Our Lady of the Seven Swords', title: 'mater dolorosa', rest: 'float',
  init(w, b) {
    b.w = 24; b.h = 76; b.maxHp = b.hp = MODE === 'pilgrim' ? 5 : 7; b.hoverY = b.y; b.face = -1;
    b.swords = []; for (let i = 0; i < 7; i++) b.swords.push({ i, state: i < b.hp ? 'orbit' : 'heart', x: b.x, y: b.y - 46, ang: 0, t: 0, bolt: null });
    b.tears = []; b.thorns = []; b.ghosts = [];
  },
  box(b) { return [b.x - 12, b.y - 78, 24, 78]; },
  heart(b) { return [b.x, b.y - 46]; },
  phaseOf(b) { return b.hp > 4 ? 1 : b.hp > 2 ? 2 : 3; },
  open(b) { return b.state === 'weary'; },
  idle(w, b, dt) { b.y = b.hoverY + Math.sin(b.t * 1.3) * 5; b.face = sign(w.p.x - b.x) || b.face; this.orbit(w, b, dt); },
  wake() { Sound.play('sorrow'); },
  slash(w, b, a) { if (this.open(b)) bossHurt(w, b, 'slash', a); else bossClang(w, b, a, 'stone does not bleed'); },
  plunge(w, b) { if (this.open(b)) bossHurt(w, b, 'plunge', Math.PI / 2); else bossClang(w, b, Math.PI / 2, null); },
  bolt(w, b, bo) {
    if (bo.kind === 'sword' && bo.sword) { bo.sword.state = 'heart'; bo.sword.bolt = null; b.inv = 0; bossHurt(w, b, 'sword', Math.atan2(bo.vy, bo.vx)); return true; }
    sparks(w, bo.x, bo.y, Math.atan2(-bo.vy, -bo.vx), 8, 140); return true;
  },
  beforeHurt(w, b, src) {
    if (src === 'sword') return false;
    if (src !== 'slash' && src !== 'plunge' && src !== 'rite') { b.flash = 0.06; return true; } // fire, stone and blood do not touch her
    const s = b.swords.find((q) => q.state === 'orbit') || b.swords.find((q) => q.state !== 'heart');
    if (s) { if (s.bolt) s.bolt.dead = true; s.state = 'heart'; s.bolt = null; }
    return false;
  },
  deflectNear(w, b, ox, oy) { return b.swords.some((s) => s.state === 'aim' && dist(s.x, s.y, ox, oy) < 60); },
  onPhase(w, b) { Sound.play('sorrow'); w.flash = Math.max(w.flash, 0.25); },
  restore(w, b) { b.swords.forEach((s, i) => { s.state = i < b.hp ? 'orbit' : 'heart'; }); },
  onHurt(w, b) { if (b.state === 'weary') { b.wearyHits = (b.wearyHits || 0) + 1; if (b.wearyHits >= 2) { bossSet(b, 'rise', 0.9); b.wearyHits = 0; } } },
  onDie(w, b) { for (const s of b.swords) { if (s.bolt) s.bolt.dead = true; s.state = 'heart'; } for (const bo of w.bolts) if (bo.kind === 'ghost') bo.dead = true; b.tears.length = 0; b.thorns.length = 0; },
  // the swords that still circle her
  orbit(w, b, dt) {
    const [hx, hy] = this.heart(b);
    const free = b.swords.filter((s) => s.state === 'orbit');
    free.forEach((s, j) => {
      const a = b.t * 1.2 + (j / Math.max(1, free.length)) * TAU;
      const tx = hx + Math.cos(a) * 28, ty = hy + Math.sin(a) * 18;
      s.x += (tx - s.x) * Math.min(1, dt * 8); s.y += (ty - s.y) * Math.min(1, dt * 8);
      s.ang = Math.atan2(hy - s.y, hx - s.x);
    });
    for (const s of b.swords) {
      if (s.state === 'heart') { s.x = hx; s.y = hy; }
      else if (s.state === 'fly') {
        const bo = s.bolt;
        if (!bo || bo.dead) { // it struck stone, or was lost
          s.state = 'stuck'; s.t = 0; if (bo) { s.x = bo.x; s.y = bo.y; s.ang = Math.atan2(bo.vy, bo.vx); } s.bolt = null;
          sparks(w, s.x, s.y, s.ang + Math.PI, 8, 140);
        } else {
          s.x = bo.x; s.y = bo.y; s.ang = Math.atan2(bo.vy, bo.vx);
          if (bo.owner === 'player') { // a returned sword seeks the heart it came from
            const a = Math.atan2(hy - bo.y, hx - bo.x), sp = Math.max(520, Math.hypot(bo.vx, bo.vy));
            const cur = Math.atan2(bo.vy, bo.vx), na = cur + clamp(angDiff(cur, a), -dt * 9, dt * 9);
            bo.vx = Math.cos(na) * sp; bo.vy = Math.sin(na) * sp; bo.life = Math.max(bo.life, 0.5); bo.bounces = Math.max(bo.bounces, 1);
          }
        }
      } else if (s.state === 'stuck') { s.t += dt; if (s.t > 1.1) { s.state = 'recall'; s.t = 0; } }
      else if (s.state === 'recall') {
        const dx = hx - s.x, dy = hy - s.y, d = Math.hypot(dx, dy) || 1, sp = Math.min(d, 300 * dt);
        s.x += (dx / d) * sp; s.y += (dy / d) * sp; s.ang = Math.atan2(dy, dx);
        if (d < 30) s.state = 'orbit';
      }
    }
  },
  launch(w, b, s, spd, kind = 'sword') {
    const p = w.p, a = Math.atan2(p.y - 12 - s.y, p.x - s.x);
    w.bolts.push({ x: s.x, y: s.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, owner: 'enemy', life: 3, bounces: 0, pierce: false, perfect: false, trail: [], nm: false, dead: false, kind, sword: s });
    s.bolt = w.bolts[w.bolts.length - 1]; s.state = 'fly';
    Sound.play('swordThrow');
  },
  update(w, b, dt) {
    const p = w.p, D = w.diff, ph = b.phase;
    const floorY = w.lvl.spawn.y, xMin = 3 * T + 12, xMax = (w.lvl.w - 3) * T - 12;
    b.cd -= dt;
    this.orbit(w, b, dt);
    const drift = (to, k) => { b.x += (to - b.x) * Math.min(1, dt * k); };
    switch (b.state) {
      case 'idle': case 'float': {
        b.state = 'float';
        drift(b.homeX + Math.sin(b.t * 0.55) * 120, 1.2);
        b.y += (b.hoverY + Math.sin(b.t * 1.3) * 5 - b.y) * Math.min(1, dt * 3);
        b.face = sign(p.x - b.x) || b.face;
        if (b.cd <= 0 && !p.dead) {
          const seq = ph === 1 ? ['throw', 'throw', 'tears', 'embrace', 'throw', 'thorns'] : ph === 2 ? ['throw', 'thorns', 'tears', 'embrace', 'throw', 'tears'] : ['sorrows', 'throw', 'embrace', 'thorns', 'tears'];
          let pick = seq[b.seq++ % seq.length];
          const avail = b.swords.filter((s) => s.state === 'orbit');
          if ((pick === 'throw' || pick === 'sorrows') && !avail.length) pick = 'tears';
          if (pick === 'throw') {
            const n = Math.min(avail.length, ph === 1 ? 1 : 2);
            b.aiming = avail.slice(0, n); for (const s of b.aiming) { s.state = 'aim'; s.t = 0; }
            bossSet(b, 'throw', 0.8 * D.aim); Sound.play('windup');
          } else if (pick === 'tears') { bossSet(b, 'tears', ph === 1 ? 2.2 : 3); b.tearT = 0; Sound.play('sorrow'); }
          else if (pick === 'thorns') { bossSet(b, 'thorns', 0.75); b.thornSide = p.x < (xMin + xMax) / 2 ? 1 : -1; Sound.play('creak'); }
          else if (pick === 'embrace') { bossSet(b, 'descend', 0.95); b.side = p.x < (xMin + xMax) / 2 ? 1 : -1; Sound.play('sorrow'); }
          else if (pick === 'sorrows') { bossSet(b, 'sorrows', 1.3); b.ringA = 0; Sound.play('sorrow'); for (const s of avail) s.state = 'ring'; for (let i = 0; i < 6; i++) b.ghosts.push({ i, a: (i / 6) * TAU }); }
        }
        break;
      }
      case 'throw': {
        drift(b.x, 1);
        const n = b.aiming.length;
        b.aiming.forEach((s, j) => {
          const a = Math.atan2(p.y - 12 - (b.y - 46), p.x - b.x), off = n > 1 ? (j ? 1 : -1) * 26 : 0;
          const tx = b.x + Math.cos(a) * 34 - Math.sin(a) * off, ty = b.y - 46 + Math.sin(a) * 34 + Math.cos(a) * off;
          s.x += (tx - s.x) * Math.min(1, dt * 10); s.y += (ty - s.y) * Math.min(1, dt * 10);
          if (b.st < b.dur - 0.15) s.ang = Math.atan2(p.y - 12 - s.y, p.x - s.x);
        });
        if (b.st >= b.dur) { for (const s of b.aiming) if (s.state === 'aim') this.launch(w, b, s, 390 * D.bolt); b.aiming = []; bossSet(b, 'float'); b.cd = ph === 3 ? 0.7 : 1.1; }
        break;
      }
      case 'tears': {
        b.tearT -= dt;
        if (b.tearT <= 0) { b.tearT = ph === 1 ? 0.2 : 0.15; const x = rnd(xMin, xMax); b.tears.push({ x, y: 3 * T + 2, vy: 0, warn: 0.5, fy: floorBelow(w.lvl, x, 3 * T + 4, 400) || floorY }); }
        if (b.st >= b.dur) { bossSet(b, 'float'); b.cd = 0.9; }
        break;
      }
      case 'thorns': {
        if (b.st >= b.dur) {
          const cols = [];
          for (let tx = 2; tx < w.lvl.w - 2; tx++) {
            const ty = Math.floor((floorY - 1) / T);
            if (w.lvl.tile(tx, ty) === 0 && w.lvl.solidAt(tx, ty + 1)) cols.push(tx);
          }
          if (b.thornSide < 0) cols.reverse();
          cols.forEach((tx, j) => b.thorns.push({ x: tx * T + 8, y: floorY, delay: j * 0.045, t: 0 }));
          bossSet(b, 'float'); b.cd = 1.4;
        }
        break;
      }
      case 'descend': {
        const tx = b.side > 0 ? xMax - 6 : xMin + 6;
        drift(tx, 4); b.y += (floorY - 16 - b.y) * Math.min(1, dt * 5);
        b.face = -b.side;
        if (b.st >= b.dur) { bossSet(b, 'embrace', 3); Sound.play('dash'); }
        break;
      }
      case 'embrace': {
        b.x += -b.side * 300 * Math.sqrt(D.bolt) * dt; b.y = floorY - 16;
        b.face = -b.side;
        if (w.steps % 2 === 0) part(w, b.x + b.side * 10, b.y - rnd(10, 60), b.side * rnd(20, 60), rnd(-10, 10), 0.4, '#c0202a', 1, 4, 0, 0.95);
        const [bx, by, bw, bh] = this.box(b);
        bossStrike(w, bx, by, bw, bh, 'embrace', b.side > 0 ? Math.PI : 0);
        if ((b.side > 0 && b.x <= xMin + 4) || (b.side < 0 && b.x >= xMax - 4) || b.st > 2.6) { bossSet(b, 'weary', 1.6); b.wearyHits = 0; Sound.play('stun'); }
        break;
      }
      case 'weary': b.y = floorY - 16 + Math.sin(b.t * 5) * 1; if (b.st >= b.dur) bossSet(b, 'rise', 0.9); break;
      case 'rise': b.y += (b.hoverY - b.y) * Math.min(1, dt * 3); drift(b.homeX, 1.5); if (b.st >= b.dur) { bossSet(b, 'float'); b.cd = 0.8; } break;
      case 'sorrows': { // every sword she has left, and the ghosts of the others, close around you
        b.ringA += dt * 2.2;
        const reals = b.swords.filter((s) => s.state === 'ring');
        const k = clamp(b.st / 0.5, 0, 1), R0 = lerp(140, 92, k);
        const all = [...reals.map((s) => ({ s })), ...b.ghosts.map((g2) => ({ g: g2 }))];
        all.forEach((o, j) => {
          const a = b.ringA + (j / all.length) * TAU, tx = p.x + Math.cos(a) * R0, ty = p.y - 12 + Math.sin(a) * R0 * 0.8;
          if (o.s) { o.s.x += (tx - o.s.x) * Math.min(1, dt * 10); o.s.y += (ty - o.s.y) * Math.min(1, dt * 10); o.s.ang = Math.atan2(p.y - 12 - o.s.y, p.x - o.s.x); }
          else { o.g.x = tx; o.g.y = ty; o.g.ang = Math.atan2(p.y - 12 - ty, p.x - tx); }
        });
        if (b.st >= b.dur) {
          for (const s of reals) this.launch(w, b, s, 300 * D.bolt);
          for (const g2 of b.ghosts) {
            const a = Math.atan2(p.y - 12 - g2.y, p.x - g2.x);
            w.bolts.push({ x: g2.x, y: g2.y, vx: Math.cos(a) * 300 * D.bolt, vy: Math.sin(a) * 300 * D.bolt, owner: 'enemy', life: 1.4, bounces: 0, pierce: false, perfect: false, trail: [], nm: false, dead: false, kind: 'ghost' });
          }
          b.ghosts.length = 0;
          bossSet(b, 'float'); b.cd = 1.6;
        }
        break;
      }
    }
    // tears of blood fall where her shadow marks
    for (const t of b.tears) {
      if (t.warn > 0) { t.warn -= dt; continue; }
      t.vy = Math.min(t.vy + 1400 * dt, 420); t.y += t.vy * dt;
      if (!p.dead && !playerSafe(w) && overlap(t.x - 2, t.y - 4, 4, 8, ...boxOf(p))) killPlayer(w, 'tears', Math.PI / 2);
      const tl = w.lvl.tile(Math.floor(t.x / T), Math.floor((t.y + 2) / T));
      if (isSolidT(tl) || isOneWay(tl)) { t.dead = true; for (let i = 0; i < 6; i++) part(w, t.x, t.y, rnd(-60, 60), -rnd(20, 90), rnd(0.3, 0.8), BLOODC[i % 5], 1, 1, 600, 0.99); }
    }
    b.tears = b.tears.filter((t) => !t.dead);
    for (const th of b.thorns) {
      if (th.delay > 0) { th.delay -= dt; continue; }
      th.t += dt;
      const h = th.t < 0.08 ? (th.t / 0.08) * 22 : th.t < 0.36 ? 22 : Math.max(0, 22 - ((th.t - 0.36) / 0.15) * 22);
      th.h = h;
      if (th.t < 0.02) { dust(w, th.x, th.y, 2); if (Math.abs(th.x - p.x) < 140 && ((th.x / T) | 0) % 3 === 0) Sound.play('crumble'); }
      if (h > 6 && !p.dead && p.invuln <= 0 && !w.rite && overlap(th.x - 7, th.y - h, 14, h, ...boxOf(p))) killPlayer(w, 'thorns', -Math.PI / 2);
    }
    b.thorns = b.thorns.filter((th) => th.delay > 0 || th.t < 0.52);
  },
  dyingUpdate(w, b, dt) {
    b.y = Math.min(b.y + dt * 20, w.lvl.spawn.y - 4);
    if (b.dying > 0.4 && w.steps % 3 === 0 && b.dying < 2.4) debrisBurst(w, b.x + rnd(-10, 10), b.y - rnd(10, 70), 2, '#8a7e86', 140);
    this.orbit(w, b, dt);
  },
  draw(g, w, b, X, Y, tint) {
    const im = IMG.statue_virgin, M = ASSET_META.statue_virgin, crop = 74;
    const flash = b.flash > 0 && ((b.flash * 30) | 0) % 2 === 0;
    const src = tint ? tinted('statue_virgin', tint) : flash ? tinted('statue_virgin', '#fff6e0') : im;
    const crack = b.state === 'dying' ? clamp(b.dying / 2.4, 0, 1) : 0;
    if (!tint) {
      drawGlow(g, X, Y - 40, 70, b.state === 'embrace' || b.state === 'descend' ? '#ff4a4a' : '#ffb8a0', 0.25 + Math.sin(RT * 2) * 0.06, true);
      if (b.state === 'dying') g.globalAlpha = 1 - clamp((b.dying - 1.6) / 1.0, 0, 1);
    }
    g.save(); g.translate(X, Math.round(Y - crop)); if (b.face > 0) g.scale(-1, 1);
    const jit = crack > 0 ? Math.round(Math.sin(RT * 60) * crack * 2) : 0;
    g.drawImage(src, 0, 0, M.w, crop, Math.round(-M.w / 2) + jit, 0, M.w, crop);
    g.restore();
    g.globalAlpha = 1;
    if (tint) return;
    // blood tears from the eyes
    const ex = X - b.face * 1, ey = Y - crop + 9;
    g.fillStyle = '#a3121f'; const tl = 3 + ((RT * 6) | 0) % 8;
    g.fillRect(ex - 2, ey, 1, tl); g.fillRect(ex + 2, ey, 1, Math.max(2, tl - 3));
    if (b.state === 'weary') { g.fillStyle = PAL.goldHi; for (let i = 0; i < 4; i++) { const a = RT * 5 + i * 1.6; g.fillRect(Math.round(X + Math.cos(a) * 12), Math.round(Y - 84 + Math.sin(a) * 3), 2, 2); } }
    // the swords in her heart
    const [hx, hy] = [X, Y - 46];
    b.swords.forEach((s, j) => { if (s.state === 'heart') drawSword(g, hx + Math.cos(j * 0.9 - 2.4) * 14, hy + Math.sin(j * 0.9 - 2.4) * 12, Math.atan2(Math.sin(j * 0.9 - 2.4), Math.cos(j * 0.9 - 2.4)) + Math.PI, 0.8); });
  },
  drawFx(g, w, b, cx, cy) {
    const p = w.p;
    for (const s of b.swords) {
      if (s.state === 'heart' || s.state === 'fly') continue;
      if (s.state === 'aim') {
        const len = Math.min(rayLen(w.lvl, s.x, s.y, s.ang, 420), 420), ca = Math.cos(s.ang), sa = Math.sin(s.ang);
        const locked = b.st >= b.dur - 0.15;
        g.fillStyle = locked ? (((RT * 24) | 0) % 2 ? '#ffffff' : '#ff2a2a') : 'rgba(230,40,50,0.5)';
        for (let d = 10; d < len; d += locked ? 1 : 3) g.fillRect(Math.round(s.x - cx + ca * d), Math.round(s.y - cy + sa * d), 1, 1);
      }
      drawSword(g, s.x - cx, s.y - cy, s.ang, s.state === 'stuck' ? 0.7 : 1);
    }
    if (b.state === 'sorrows') for (const g2 of b.ghosts) { if (g2.x === undefined) continue; g.globalAlpha = 0.55; drawSword(g, g2.x - cx, g2.y - cy, g2.ang, 1, '#c8b0ff'); g.globalAlpha = 1; }
    for (const t of b.tears) {
      const x = Math.round(t.x - cx);
      if (t.warn > 0) { g.fillStyle = `rgba(160,20,30,${0.3 + 0.4 * (1 - t.warn / 0.5)})`; g.fillRect(x - 3, Math.round(t.fy - cy) - 1, 7, 1); g.fillRect(x - 1, Math.round(t.y - cy), 2, 3); continue; }
      const y = Math.round(t.y - cy);
      g.fillStyle = '#c81e28'; g.fillRect(x - 1, y - 3, 2, 5); g.fillStyle = '#ff6a5a'; g.fillRect(x - 1, y - 3, 1, 1);
      g.fillStyle = 'rgba(200,30,40,0.4)'; g.fillRect(x, y - 10, 1, 7);
    }
    for (const th of b.thorns) {
      const x = Math.round(th.x - cx), y = Math.round(th.y - cy);
      if (th.delay > 0) { if (th.delay < 0.3) { g.fillStyle = `rgba(255,80,60,${0.5 - th.delay})`; g.fillRect(x - 7, y - 1, 14, 1); } continue; }
      const h = Math.round(th.h || 0); if (h < 1) continue;
      g.fillStyle = '#2a0e10'; ppoly(g, [x - 7, y, x - 3, y - h, x, y - Math.round(h * 0.4), x + 3, y - h + 3, x + 7, y]);
      g.fillStyle = '#6a1a1a'; ppoly(g, [x - 5, y, x - 3, y - h + 2, x - 1, y]);
      g.fillStyle = '#c0303a'; g.fillRect(x - 3, y - h, 1, 2); g.fillRect(x + 3, y - h + 3, 1, 2);
    }
    void p;
  },
};
function drawSword(g, x, y, ang, k = 1, col) {
  const c = Math.cos(ang), s = Math.sin(ang), L = 15 * k;
  g.fillStyle = '#4a4e58'; pline(g, x - c * L * 0.5 + 0.5, y - s * L * 0.5 + 0.5, x + c * L * 0.6 + 0.5, y + s * L * 0.6 + 0.5, 1);
  g.fillStyle = col || '#eef1f6'; pline(g, x - c * L * 0.5, y - s * L * 0.5, x + c * L * 0.6, y + s * L * 0.6, 1);
  g.fillStyle = col ? col : '#d9a441'; const gx = x - c * L * 0.5, gy = y - s * L * 0.5;
  pline(g, gx - s * 3, gy + c * 3, gx + s * 3, gy - c * 3, 1);
  g.fillStyle = col ? col : '#5a1a14'; pline(g, gx, gy, gx - c * 4, gy - s * 4, 1);
}

// ============================================================
//  III. THE FIRST
//  He guards as you were taught to guard. Make him strike,
//  catch the strike, and cut what opens.
// ============================================================
BOSS.first = {
  name: 'The First', title: 'penitent of the sand', rest: 'stance',
  init(w, b) {
    b.w = 12; b.h = 28; b.maxHp = b.hp = MODE === 'pilgrim' ? 4 : 5; b.face = -1; b.s = 1.15; b.blocks = 0; b.blockT = 0; b.dashes = 0;
    b.pose = newPose(); b.tail = []; for (let i = 0; i < 8; i++) b.tail.push({ x: b.x + i * 3, y: b.y - 20, vx: 0, vy: 0 });
  },
  box(b) { return [b.x - 9, b.y - 35, 18, 35]; },
  phaseOf(b) { return b.hp <= 2 ? 2 : 1; },
  guarding(b) { return b.state === 'stance' || b.state === 'dashWind' || b.state === 'throwWind' || b.state === 'leapWind' || b.state === 'riposte' || b.state === 'intro'; },
  idle(w, b, dt) { b.face = sign(w.p.x - b.x) || b.face; b.vx = approach(b.vx, 0, 500 * dt); bossGroundMove(w, b, dt); },
  wake(w, b) { Sound.play('sheath'); void b; },
  slash(w, b, a, ox) {
    const front = (ox - b.x) * b.face > 0;
    if (b.state === 'dash' && front) { this.parried(w, b, a); return; }
    if (front && this.guarding(b)) {
      bossClang(w, b, a, null);
      b.blocks = (b.blockT > 0 ? b.blocks : 0) + 1; b.blockT = 1.1;
      if (b.blocks >= 2) { bossSet(b, 'riposte', 0.17); b.blocks = 0; Sound.play('windup'); }
      return;
    }
    bossHurt(w, b, 'slash', a);
  },
  parried(w, b, a) {
    bossSet(b, 'stagger', 1.3); b.vx = -b.face * 170;
    const x = (w.p.x + b.x) / 2, y = b.y - 18;
    sparks(w, x, y, a, 34, 380, '#fff4c8', 1.6); ring(w, x, y, 46, 0.45, '#fff1c0', 2);
    w.hitstop = Math.max(w.hitstop, 9); w.shake = Math.max(w.shake, 7); w.flash = Math.max(w.flash, 0.25); w.killCam = Math.max(w.killCam, 0.45);
    floatText(w, x, y - 24, 'parried', '#fff1c0'); w.parries++;
    w.p.atkCD = 0.04; w.p.parryT = 0.2;
    Sound.play('clash');
  },
  plunge(w, b) {
    if (b.state === 'stagger') { bossHurt(w, b, 'plunge', Math.PI / 2); return; }
    bossSet(b, 'stagger', 0.85); b.vx = sign(b.x - w.p.x) * 120; Sound.play('clash');
    floatText(w, b.x, b.y - 44, 'guard broken', '#fff1c0');
  },
  bolt(w, b, bo) {
    const front = (bo.x - b.x) * b.face > 0;
    if (front && this.guarding(b)) { sparks(w, bo.x, bo.y, Math.atan2(-bo.vy, -bo.vx), 12, 200); Sound.play('clash'); return true; }
    bossHurt(w, b, 'bolt', Math.atan2(bo.vy, bo.vx)); return true;
  },
  throwHit(w, b, t) {
    if ((t.x - b.x) * b.face > 0 && this.guarding(b)) { sparks(w, t.x, t.y, Math.atan2(-t.vy, -t.vx), 12, 200); Sound.play('clash'); return; }
    if (t.type === 'skull') { bossSet(b, 'stagger', 0.9); b.vx = sign(t.vx) * 100; Sound.play('clash'); floatText(w, b.x, b.y - 44, 'staggered'); }
  },
  chained(w, b) {
    const p = w.p;
    if (this.guarding(b)) { // he catches the chain, and pulls
      if (p.zip) { p.zip = null; } if (p.chain) { p.chain.state = 'back'; p.chain.target = null; }
      p.vx = sign(b.x - p.x) * 260; p.vy = -120;
      sparks(w, b.x, b.y - 20, 0, 12, 200); Sound.play('clash');
      floatText(w, b.x, b.y - 44, 'caught', '#ff9a8a');
      bossSet(b, 'dashWind', 0.3 * Math.sqrt(w.diff.wind)); b.face = sign(p.x - b.x) || b.face;
      return;
    }
    if (p.zip) p.zip = null;
    if (p.chain) { p.chain.state = 'back'; p.chain.target = null; }
    bossSet(b, 'stagger', 1.0); b.vx = sign(p.x - b.x) * 140; Sound.play('yank');
    floatText(w, b.x, b.y - 44, 'disarmed', '#fff1c0');
  },
  quake(w, b, fx, fy) { if (b.onGround && Math.abs(b.x - fx) < 50 && Math.abs(b.y - fy) < 24 && b.state !== 'stagger') { bossSet(b, 'stagger', 0.7); b.vx = sign(b.x - fx) * 140; } },
  onHurt(w, b) { bossSet(b, 'hurt', 0.35); b.vx = -b.face * 200; b.vy = -120; b.cd = 0.4; },
  onPhase(w, b) { bossSet(b, 'flourish', 0.9); b.vx = 0; Sound.play('slowIn'); for (let i = 0; i < 30; i++) part(w, b.x + rnd(-10, 10), b.y - rnd(0, 34), rnd(-80, 80), -rnd(20, 120), rnd(0.5, 1.2), '#d8b878', 1, 2, 60, 0.96); },
  update(w, b, dt) {
    const p = w.p, D = w.diff, ph = b.phase, fast = ph === 2 ? 0.72 : 1;
    const dx = p.x - b.x, ad = Math.abs(dx);
    b.cd -= dt; b.blockT -= dt;
    switch (b.state) {
      case 'idle': case 'stance': {
        b.state = 'stance';
        b.face = sign(dx) || b.face;
        let tg = 0;
        if (ad < 60) tg = -b.face * 95; else if (ad > 140) tg = b.face * 100;
        tg += Math.sin(b.t * 2.3) * 35;
        const f = b.face; b.face = sign(tg) || f;
        if (wallAhead(w, b) || (b.onGround && ledgeAhead(w, b))) tg = 0;
        b.face = f;
        b.vx = approach(b.vx, tg, 600 * dt);
        if (b.cd <= 0 && !p.dead && b.onGround) {
          const r = R();
          if (ad < 150 && r < 0.5) { bossSet(b, 'dashWind', 0.42 * D.wind * fast); Sound.play('windup'); }
          else if (ad > 80 && r < 0.8) { bossSet(b, 'throwWind', 0.38 * fast); }
          else { bossSet(b, 'leapWind', 0.4 * fast); }
        }
        break;
      }
      case 'riposte': b.vx = approach(b.vx, 0, 900 * dt); b.face = sign(dx) || b.face; if (b.st >= b.dur) this.dash(w, b); break;
      case 'dashWind': b.vx = approach(b.vx, 0, 900 * dt); b.face = sign(dx) || b.face; if (b.st >= b.dur) this.dash(w, b); break;
      case 'dash':
        b.vx = b.face * 430;
        if (w.steps % 2 === 0) part(w, b.x, b.y - rnd(4, 30), -b.face * rnd(10, 40), 0, 0.3, '#e8dcc0', 1, 4, 0, 0.9);
        bossStrike(w, b.x - 10 + b.face * 6, b.y - 30, 20, 30, 'blade', b.face > 0 ? -0.15 : Math.PI + 0.15);
        if (b.st >= b.dur || b.hitX) {
          if (ph === 2 && b.dashes < 1) { b.dashes++; bossSet(b, 'dashWind', 0.2); b.face = -b.face; }
          else { b.dashes = 0; bossSet(b, 'dashRec', 0.55); }
        }
        break;
      case 'dashRec': b.vx = approach(b.vx, 0, 1200 * dt); if (b.st >= b.dur) { bossSet(b, 'stance'); b.cd = 0.5 * fast + R() * 0.4; } break;
      case 'throwWind':
        b.vx = approach(b.vx, 0, 900 * dt); b.face = sign(dx) || b.face;
        if (b.st >= b.dur) {
          const n = ph === 2 ? 5 : 3, a0 = Math.atan2(p.y - 12 - (b.y - 22), p.x - b.x);
          for (let i = 0; i < n; i++) fireBolt(w, b.x + b.face * 6, b.y - 22, a0 + (i - (n - 1) / 2) * 0.2, 330 * D.bolt, 'enemy', 1.8, 'dagger');
          Sound.play('swordThrow');
          bossSet(b, 'throwRec', 0.65);
        }
        break;
      case 'throwRec': b.vx = approach(b.vx, 0, 900 * dt); if (b.st >= b.dur) { bossSet(b, 'stance'); b.cd = 0.6 * fast + R() * 0.4; } break;
      case 'leapWind':
        b.vx = approach(b.vx, 0, 900 * dt); b.face = sign(dx) || b.face;
        if (b.st >= b.dur) { bossSet(b, 'leap', 2); b.vy = -430; b.vx = clamp(dx / 0.72, -320, 320); b.onGround = false; Sound.play('jump'); }
        break;
      case 'leap':
        if (b.vy > 0) bossStrike(w, b.x - 9, b.y - 30, 18, 34, 'blade', Math.PI / 2);
        if (b.onGround && b.st > 0.1) {
          Sound.play('plungeLand'); w.shake = Math.max(w.shake, 8); ring(w, b.x, b.y, 40, 0.3, '#fff1c0', 1); dust(w, b.x, b.y, 10);
          b.waves.push({ x: b.x + 12, y: b.y, dir: 1, spd: 190, life: 0.45, h: 9 }, { x: b.x - 12, y: b.y, dir: -1, spd: 190, life: 0.45, h: 9 });
          bossSet(b, 'leapRec', 0.6); b.vx = 0;
        }
        break;
      case 'leapRec': if (b.st >= b.dur) { bossSet(b, 'stance'); b.cd = 0.5 * fast; } break;
      case 'stagger': b.vx = approach(b.vx, 0, 500 * dt); if (b.st >= b.dur) { bossSet(b, 'stance'); b.cd = 0.35; } break;
      case 'hurt': b.vx = approach(b.vx, 0, 500 * dt); if (b.st >= b.dur) { bossSet(b, 'stance'); b.cd = 0.3; } break;
      case 'flourish': b.inv = Math.max(b.inv, 0.1); if (b.st >= b.dur) { bossSet(b, 'stance'); b.cd = 0.3; } break;
    }
    bossGroundMove(w, b, dt);
  },
  dash(w, b) { bossSet(b, 'dash', 0.21); b.vx = b.face * 430; Sound.play('dash'); },
  dyingUpdate(w, b, dt) { b.vx = approach(b.vx, 0, 500 * dt); bossGroundMove(w, b, dt); if (b.dying > 2.8 && w.steps % 2 === 0) part(w, b.x + rnd(-8, 8), b.y - rnd(0, 30), rnd(-20, 20), -rnd(10, 40), 1, '#d8b878', 1, 2, 40, 0.97); },
  pose(b) {
    const o = _ep; let rate = 0.3;
    const k = b.dur ? clamp(b.st / b.dur, 0, 1) : 0;
    switch (b.state) {
      case 'dashWind': case 'riposte': POSE.windup(o, k); rate = 0.5; break;
      case 'dash': POSE.lunge(o); rate = 0.75; break;
      case 'dashRec': case 'leapRec': POSE.attack(o, 0.95, 0.35, 1, false); rate = 0.35; break;
      case 'throwWind': POSE.throw(o, k * 0.39, 0); rate = 0.5; break;
      case 'throwRec': POSE.throw(o, 0.85, -0.1); rate = 0.5; break;
      case 'leapWind': POSE.kneel(o, b.t); o[1] = -8; rate = 0.4; break;
      case 'leap': if (b.vy > 0) POSE.plunge(o); else POSE.air(o, b.vy); rate = 0.4; break;
      case 'stagger': case 'hurt': POSE.hurt(o); rate = 0.4; break;
      case 'flourish': POSE.attack(o, k, -1.2, 1, false); rate = 0.5; break;
      case 'dying': if (b.dying < 2.6) POSE.kneel(o, b.t); else POSE.slump(o); rate = 0.1; break;
      default:
        POSE.guard(o, b.t);
        if (Math.abs(b.vx) > 25 && b.onGround) { const s = Math.sin(b.walkPh * 1.6); o[8] += s * 0.4; o[10] -= s * 0.4; o[9] += Math.max(0, s) * 0.5; o[11] += Math.max(0, -s) * 0.5; }
    }
    return rate;
  },
  draw(g, w, b, X, Y, tint) {
    const flash = b.flash > 0 && ((b.flash * 30) | 0) % 2 === 0;
    const pal = RIGPAL.first;
    if (b.tail && !tint) drawCape(g, b.tail, b.x - X, b.y - Y, pal, flash ? '#fff6e0' : null);
    drawRig(g, b.pose, X, Y, b.face, pal, { s: b.s, tint: tint || (flash ? '#fff6e0' : null), out: b._out || (b._out = {}), t: b.t, drag: clamp(Math.abs(b.vx) / 90, 0, 2) });
    if (tint) return;
    if ((b.state === 'dashWind' || b.state === 'riposte') && b._out.tipX !== undefined) {
      const k = clamp(b.st / b.dur, 0, 1);
      if (k > 0.4) { g.fillStyle = '#ffffff'; const r = Math.round(1 + (k - 0.4) * 8); g.fillRect(Math.round(b._out.tipX) - r, Math.round(b._out.tipY), r * 2 + 1, 1); g.fillRect(Math.round(b._out.tipX), Math.round(b._out.tipY) - r, 1, r * 2 + 1); }
    }
    if (b.state === 'dash') pcrescent(g, X + b.face * 10, Y - 18, 20, 6, b.face > 0 ? 0 : Math.PI, 1.0, ['#ffffff', '#f2d48f', '#8a5f22']);
    if (b.state === 'stagger') { g.fillStyle = PAL.goldHi; for (let i = 0; i < 3; i++) { const a = RT * 6 + i * 2.1; g.fillRect(Math.round(X + Math.cos(a) * 8), Math.round(Y - 44 + Math.sin(a) * 2), 1, 1); } }
  },
  drawFx(g, w, b, cx, cy) { drawWaves(g, b, cx, cy); },
};

// ============================================================
//  IV. THE CONFESSOR, keeper of the hour
//  Every wound he takes, he takes back - unless the great
//  bell has rung, and the hour is anchored.
// ============================================================
BOSS.confessor = {
  name: 'The Confessor', title: 'keeper of the hour', rest: 'float',
  init(w, b) {
    b.per = MODE === 'pilgrim' ? 2 : 3; b.maxHp = b.hp = b.per * 3; b.w = 20; b.h = 50; b.s = 1.8; b.face = -1;
    b.pose = newPose(); b.tail = []; for (let i = 0; i < 9; i++) b.tail.push({ x: b.x + i * 3, y: b.y - 34, vx: 0, vy: 0 });
    b.hist = []; b.histT = 0; b.hands = null; b.flood = 0; b.sandN = 0; b.rewinds = 0;
  },
  box(b) { return [b.x - 13, b.y - 58, 26, 58]; },
  phaseOf(b) { return b.hp > b.per * 2 ? 1 : b.hp > b.per ? 2 : 3; },
  floorHp(b) { return (3 - b.phase) * b.per; },
  idle(w, b, dt) { b.face = sign(w.p.x - b.x) || b.face; b.y = b.homeY - 4 + Math.sin(b.t * 2) * 2; },
  wake() { Sound.play('timeStop'); },
  begin(w) { w.flash = Math.max(w.flash, 0.3); },
  restore(w, b) { if (b.phase >= 3) this.startHands(w, b); },
  bolt(w, b, bo) { if (b.state === 'blinkOut' || b.state === 'blinkIn') return false; bossHurt(w, b, 'bolt', Math.atan2(bo.vy, bo.vx)); return true; },
  beforeHurt(w, b, src) {
    if (b.state === 'phaseShift') return true;
    if (b.hp - 1 > this.floorHp(b) || w.bellAnchor > 0) return false;
    // the hour returns to him
    const h = b.hist.length > 20 ? b.hist[b.hist.length - 20] : b.hist[0] || { x: b.homeX, y: b.homeY };
    for (let i = 0; i < 6; i++) w.afters.push({ s: null, boss: { x: lerp(b.x, h.x, i / 6), y: lerp(b.y, h.y, i / 6), face: b.face, pose: b.pose.slice() }, life: 0.5, max: 0.5, col: '#e8c890' });
    b.x = h.x; b.y = h.y; b._px = b.x; b._py = b.y;
    b.inv = 0.9; bossSet(b, 'float'); b.cd = 0.9;
    for (const bo of w.bolts) if (bo.kind === 'sand') bo.dead = true;
    w.flash = Math.max(w.flash, 0.4); w.shake = Math.max(w.shake, 6); w.rewindFx = 0.7;
    Sound.play('rewindBoss');
    b.rewinds++;
    say(w, 'boss', STORY.bossLine.confessorRewind[(b.rewinds - 1) % STORY.bossLine.confessorRewind.length], 0, 1.4);
    if (b.rewinds === 1 || b.rewinds % 3 === 0) floatText(w, w.p.x, w.p.y - 44, 'strike the great bell to anchor the hour', '#f2d48f');
    return true;
  },
  bell(w, b) {
    if (b.dead && b.final && !w.ended) { w.ended = true; w.exited = true; Sound.play('relic'); if (G.onExit) G.onExit(); return; }
    if (!b.dead && bossTargetable(b)) floatText(w, b.x, b.y - 80, 'the hour is anchored', '#f2d48f');
  },
  onPhase(w, b) {
    bossSet(b, 'phaseShift', 1.5); b.vx = 0;
    for (const bo of w.bolts) if (bo.owner === 'enemy') bo.dead = true;
    Sound.play('timeStop'); w.flash = Math.max(w.flash, 0.5); w.shake = Math.max(w.shake, 10);
    if (b.phase === 2) for (const x of [5 * T + 8, (w.lvl.w - 6) * T + 8]) {
      const e = makeEnemy({ ch: 'f', x, y: w.lvl.spawn.y, tx: Math.floor(x / T), ty: 22 }, w.lvl);
      e.summoned = true; e.alerted = true; e.reactT = e.reactDur = 1.2; e.face = sign(w.p.x - x) || 1;
      w.enemies.push(e);
      for (let i = 0; i < 20; i++) part(w, x + rnd(-8, 8), e.y - rnd(0, 30), rnd(-40, 40), -rnd(20, 100), rnd(0.5, 1), '#d8b878', 1, 2, 80, 0.96);
    }
    if (b.phase === 3) this.startHands(w, b);
  },
  startHands(w, b) { b.hands = { a1: -Math.PI / 2, a2: Math.PI / 2, k: 0, cx: (w.lvl.w * T) / 2, cy: 13 * T }; },
  onDie(w, b) { b.final = false; b.hands = null; for (const bo of w.bolts) if (bo.kind === 'sand') bo.dead = true; },
  cleared(w, b) { b.final = true; say(w, 'p', '...', 0, 0.8); },
  update(w, b, dt) {
    const p = w.p, D = w.diff, ph = b.phase, fast = ph === 1 ? 1 : ph === 2 ? 0.85 : 0.75;
    const dx = p.x - b.x, ad = Math.abs(dx), floorY = w.lvl.spawn.y;
    b.cd -= dt;
    b.histT += dt; if (b.histT >= 0.1) { b.histT = 0; b.hist.push({ x: b.x, y: b.y }); if (b.hist.length > 40) b.hist.shift(); }
    const float = () => { b.y += (floorY - 4 + Math.sin(b.t * 2) * 2 - b.y) * Math.min(1, dt * 4); };
    switch (b.state) {
      case 'idle': case 'float': {
        b.state = 'float'; b.hidden = false;
        b.face = sign(dx) || b.face;
        const want = ad < 70 ? -b.face * 70 : ad > 130 ? b.face * 80 : 0;
        b.vx = approach(b.vx, want, 300 * dt); b.x += b.vx * dt; b.x = clamp(b.x, 3 * T + 12, (w.lvl.w - 3) * T - 12);
        float();
        if (b.cd <= 0 && !p.dead) {
          const seq = ph === 1 ? ['sand', 'sweep', 'blink', 'sand', 'sweep'] : ph === 2 ? ['stop', 'sand', 'blink', 'sweep', 'sand', 'blink'] : ['stop', 'blink', 'sand', 'sweep', 'blink', 'sand'];
          let pick = seq[b.seq++ % seq.length];
          if (pick === 'sweep' && ad > 110) pick = 'blink';
          if (pick === 'sweep') { bossSet(b, 'sweepWind', 0.75 * Math.sqrt(D.wind) * fast); Sound.play('windup'); }
          else if (pick === 'sand') { bossSet(b, 'sand', 0.95); b.sandN = 0; }
          else if (pick === 'blink') { bossSet(b, 'blinkOut', 0.35); Sound.play('sand'); }
          else if (pick === 'stop') { bossSet(b, 'stopWind', 1.0); b.ticks = 0; }
        }
        break;
      }
      case 'sweepWind': b.vx = 0; float(); b.face = sign(dx) || b.face; if (b.st >= b.dur) { bossSet(b, 'sweep', 0.3); Sound.play('swing'); } break;
      case 'sweep': {
        float();
        const u = clamp(b.st / b.dur, 0, 1), a = this.sweepAng(u);
        const sx = b.x + b.face * 8, sy = b.y - 38;
        for (let d = 8; d <= 68; d += 6) {
          const x = sx + Math.cos(a) * d * b.face, y = sy + Math.sin(a) * d;
          if (bossStrike(w, x - 3, y - 3, 6, 6, 'blade', b.face > 0 ? a : Math.PI - a)) break;
        }
        if (b.st >= b.dur) { bossSet(b, 'sweepRec', 0.6); }
        break;
      }
      case 'sweepRec': float(); if (b.st >= b.dur) { bossSet(b, 'float'); b.cd = 0.5 * fast; } break;
      case 'sand': {
        float(); b.face = sign(dx) || b.face;
        const n = ph === 1 ? 3 : 4;
        if (b.sandN < n && b.st >= 0.2 + b.sandN * 0.22) {
          b.sandN++;
          const hx = b.x + b.face * 14, hy = b.y - 30, a = Math.atan2(p.y - 12 - hy, p.x - hx);
          fireBolt(w, hx, hy, a, 290 * D.bolt, 'enemy', 3, 'sand');
          Sound.play('sand'); sparks(w, hx, hy, a, 6, 120, '#e8c890', 0.5);
        }
        if (b.st >= b.dur) { bossSet(b, 'float'); b.cd = 0.8 * fast; }
        break;
      }
      case 'blinkOut':
        if (w.steps % 2 === 0) for (let i = 0; i < 3; i++) part(w, b.x + rnd(-10, 10), b.y - rnd(0, 50), rnd(-40, 40), -rnd(10, 60), rnd(0.4, 0.8), '#d8b878', 1, 2, 40, 0.96);
        if (b.st >= b.dur) {
          b.hidden = true;
          const tx = clamp(p.x - p.face * 46, 3 * T + 12, (w.lvl.w - 3) * T - 12);
          b.tx = tx; b.ty = floorBelow(w.lvl, tx, p.y - 30, 200) || floorY;
          bossSet(b, 'blinkIn', 0.5 * Math.sqrt(D.aim));
        }
        break;
      case 'blinkIn':
        if (w.steps % 2 === 0) for (let i = 0; i < 3; i++) { const a = rnd(TAU); part(w, b.tx + Math.cos(a) * 18, b.ty - 24 + Math.sin(a) * 18, -Math.cos(a) * 50, -Math.sin(a) * 50, 0.35, '#e8c890', 1, 2, 0, 0.9); }
        if (b.st >= b.dur) {
          b.hidden = false; b.x = b.tx; b.y = b.ty - 4; b._px = b.x; b._py = b.y; b.face = sign(p.x - b.x) || b.face;
          Sound.play('sand'); ring(w, b.x, b.y - 26, 30, 0.3, '#e8c890', 1);
          bossSet(b, 'sweepWind', 0.32 * Math.sqrt(D.wind));
        }
        break;
      case 'stopWind': {
        float(); b.face = sign(dx) || b.face;
        const tk = Math.floor(b.st / 0.33);
        if (tk > b.ticks && tk <= 3) { b.ticks = tk; Sound.play('tick'); ring(w, b.x, b.y - 30, 40 + tk * 10, 0.3, '#f2d48f', 1); }
        if (b.st >= b.dur) {
          w.timeStop = 1.7; Sound.play('timeStop'); w.flash = Math.max(w.flash, 0.3);
          b.tx = p.x; b.ty = p.y; bossSet(b, 'stopped', 1.7);
          if (!b.said.stop) { b.said.stop = true; say(w, 'boss', STORY.bossLine.confessorStop, 0, 1.2); floatText(w, p.x, p.y - 46, 'hold SHIFT  your hour is your own', '#f2d48f'); }
        }
        break;
      }
      case 'stopped': {
        const gx = b.tx - (sign(b.tx - b.x) || b.face) * 26;
        b.x += clamp(gx - b.x, -260 * dt, 260 * dt); float(); b.face = sign(b.tx - b.x) || b.face;
        if (w.timeStop <= 0) { bossSet(b, 'sweep', 0.22); Sound.play('swing'); }
        break;
      }
      case 'phaseShift': b.inv = Math.max(b.inv, 0.1); float(); if (b.st >= b.dur) { bossSet(b, 'float'); b.cd = 0.6; } break;
    }
    // the great hands of the clock turn through the room
    const hd = b.hands;
    if (hd) {
      hd.k = Math.min(1, hd.k + dt / 2.2);
      hd.a1 += dt * 0.42; hd.a2 -= dt * 0.75;
      if (hd.k >= 1 && !p.dead) {
        for (const [a, L] of [[hd.a1, 120], [hd.a2, 165]]) {
          for (let d = 16; d <= L; d += 8) {
            const x = hd.cx + Math.cos(a) * d, y = hd.cy + Math.sin(a) * d;
            if (bossStrike(w, x - 3, y - 3, 6, 6, 'hands', a)) break;
          }
        }
      }
      b.flood = Math.min(14, b.flood + dt * 3);
      w.sandFloorY = floorY - b.flood;
    }
  },
  sweepAng(u) { return lerp(-2.3, 1.25, easeOut(u)); },
  dyingUpdate(w, b, dt) { b.y += (w.lvl.spawn.y - b.y) * Math.min(1, dt * 2); if (b.hands) b.hands.k = Math.max(0, b.hands.k - dt); w.sandFloorY = Math.min(w.lvl.spawn.y, (w.sandFloorY || w.lvl.spawn.y) + dt * 6); },
  pose(b) {
    const o = _ep; let rate = 0.2;
    const k = b.dur ? clamp(b.st / b.dur, 0, 1) : 0;
    switch (b.state) {
      case 'sweepWind': POSE.windup(o, k); o[12] = lerp(1.3, -2.3, easeOut(k)); o[4] = armToward(o[12]); rate = 0.35; break;
      case 'sweep': case 'stopped': {
        const u = b.state === 'sweep' ? k : 0;
        POSE.attack(o, 0.2 + u * 0.4, 0.3, 1, true); o[12] = this.sweepAng(u); o[4] = armToward(o[12]); o[5] = 0.1; rate = b.state === 'sweep' ? 0.85 : 0.3;
        if (b.state === 'stopped') { POSE.windup(o, 1); o[12] = -2.3; o[4] = armToward(o[12]); }
        break;
      }
      case 'sand': POSE.cast(o, -0.15); o[12] = -2.3; o[4] = 0.9; o[5] = 2.2; o[14] = 0; rate = 0.4; break;
      case 'stopWind': POSE.ring(o, b.t * 0.2); o[12] = -PI / 2; o[4] = PI - 0.2; rate = 0.3; break;
      case 'phaseShift': POSE.hurt(o); o[2] = -0.6; rate = 0.3; break;
      case 'dying': POSE.kneel(o, b.t); o[12] = 1.4; rate = 0.1; break;
      default: POSE.idle(o, b.t); o[12] = -2.3; o[4] = 0.9; o[5] = 2.2; // the minute hand rests on his shoulder
    }
    if (b.state !== 'dying') { o[13] = 0.6 + Math.sin(b.t * 3) * 0.2; o[8] = 0.3; o[9] = 0.5; o[10] = 0.05; o[11] = 0.7; o[1] -= 1; }
    o[14] = 0;
    return rate;
  },
  draw(g, w, b, X, Y, tint) {
    if (b.hidden) return;
    const flash = b.flash > 0 && ((b.flash * 30) | 0) % 2 === 0;
    const pal = RIGPAL.confessor;
    const fade = b.state === 'blinkOut' ? 1 - clamp(b.st / b.dur, 0, 1) : 1;
    if (!tint) {
      drawGlow(g, X, Y - 36, 50, w.bellAnchor > 0 ? '#ffe2a0' : '#8a6a3a', w.bellAnchor > 0 ? 0.5 : 0.25, true);
      g.globalAlpha = fade;
    }
    if (b.tail && !tint) drawCape(g, b.tail, b.x - X, b.y - Y, pal, flash ? '#fff6e0' : null);
    drawRig(g, b.pose, X, Y, b.face, pal, { s: b.s, tint: tint || (flash ? '#fff6e0' : null), out: b._out || (b._out = {}), t: b.t });
    g.globalAlpha = 1;
    if (tint) return;
    if (b.state === 'sweepWind' && b._out.tipX !== undefined && clamp(b.st / b.dur, 0, 1) > 0.5) { g.fillStyle = '#ffffff'; const tx = Math.round(b._out.tipX), ty = Math.round(b._out.tipY); g.fillRect(tx - 5, ty, 11, 1); g.fillRect(tx, ty - 5, 1, 11); }
    if (b.state === 'sweep') {
      const u = clamp(b.st / b.dur, 0, 1), a0 = this.sweepAng(Math.max(0, u - 0.35)), a1 = this.sweepAng(u);
      const am = b.face > 0 ? (a0 + a1) / 2 : Math.PI - (a0 + a1) / 2;
      pcrescent(g, X + b.face * 8, Y - 38, 62, 9 * (1 - u) + 2, am, Math.abs(a1 - a0) / 2 + 0.2, ['#fff8e0', '#f2d48f', '#8a5f22']);
    }
    if (b.state === 'stopWind') { // the clock face blooms around him
      const k = clamp(b.st / b.dur, 0, 1), r = Math.round(18 + k * 14);
      g.fillStyle = 'rgba(242,212,143,0.7)'; pring(g, X, Y - 34, r, 1);
      for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; g.fillRect(Math.round(X + Math.cos(a) * r), Math.round(Y - 34 + Math.sin(a) * r), 2, 2); }
      g.fillStyle = '#fff1c0'; pline(g, X, Y - 34, X + Math.cos(-PI / 2 + k * TAU) * (r - 4), Y - 34 + Math.sin(-PI / 2 + k * TAU) * (r - 4), 1);
    }
  },
  drawFx(g, w, b, cx, cy) {
    if (b.state === 'blinkIn') {
      const k = clamp(b.st / b.dur, 0, 1), x = Math.round(b.tx - cx), y = Math.round(b.ty - cy);
      g.fillStyle = `rgba(232,200,144,${0.3 + k * 0.5})`; pring(g, x, y - 24, Math.round(22 - k * 12), 1);
      g.fillStyle = '#e8c890'; g.fillRect(x - 1, y - 40, 2, 34);
    }
    const hd = b.hands;
    if (hd) {
      const x0 = hd.cx - cx, y0 = hd.cy - cy;
      g.globalAlpha = hd.k < 1 ? 0.25 + 0.25 * Math.sin(RT * 20) : 1;
      for (const [a, L, th] of [[hd.a1, 120, 4], [hd.a2, 165, 3]]) {
        const x1 = x0 + Math.cos(a) * L, y1 = y0 + Math.sin(a) * L;
        g.fillStyle = '#3a2810'; pline(g, x0 + 1, y0 + 1, x1 + 1, y1 + 1, th + 1);
        g.fillStyle = '#d9a441'; pline(g, x0, y0, x1, y1, th);
        g.fillStyle = '#fff1c0'; pline(g, x0, y0, x0 + Math.cos(a) * L * 0.85, y0 + Math.sin(a) * L * 0.85, 1);
        g.fillStyle = '#d9a441'; ppoly(g, [x1 + Math.cos(a) * 10, y1 + Math.sin(a) * 10, x1 - Math.sin(a) * 6, y1 + Math.cos(a) * 6, x1 + Math.sin(a) * 6, y1 - Math.cos(a) * 6]);
      }
      g.fillStyle = '#d9a441'; pcirc(g, x0, y0, 6); g.fillStyle = '#3a2810'; pcirc(g, x0, y0, 3);
      g.globalAlpha = 1;
    }
    if (w.sandFloorY && w.sandFloorY < w.lvl.spawn.y) {
      const y = Math.round(w.sandFloorY - cy), h = Math.round(w.lvl.spawn.y - w.sandFloorY);
      g.fillStyle = 'rgba(200,170,110,0.75)'; g.fillRect(0, y, W, h);
      g.fillStyle = '#e8cc90'; for (let x = 0; x < W; x += 3) g.fillRect(x, y + Math.round(Math.sin(RT * 2 + (x + cx) * 0.1)), 2, 1);
    }
  },
};

// ---------- drawing entry points ----------
function drawBoss(g, w, b, X, Y, tint) { BOSS[b.type].draw(g, w, b, X, Y, tint); }
function drawBossFx(g, w, b, cx, cy) { if (BOSS[b.type].drawFx) BOSS[b.type].drawFx(g, w, b, cx, cy); }
