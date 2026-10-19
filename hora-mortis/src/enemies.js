'use strict';
// ============================================================
//  HORA MORTIS — the condemned: creation and behaviour
// ============================================================
const ETYPE = { s: 'grunt', S: 'grunt', a: 'acolyte', A: 'acolyte', t: 'priest', b: 'shield', B: 'shield', g: 'gargoyle', c: 'cherub', k: 'bomb', i: 'inquisitor', h: 'herald', f: 'fallen', F: 'fallen' };
const ESIZE = { grunt: [12, 24], acolyte: [12, 26], priest: [14, 24], shield: [16, 26], gargoyle: [16, 16], cherub: [12, 12], bomb: [12, 24], inquisitor: [12, 26], herald: [12, 26], fallen: [12, 26] };
const RIG_TYPES = { inquisitor: 1, herald: 1, fallen: 1 };
function makeEnemy(en, lvl) {
  const type = ETYPE[en.ch] || 'grunt';
  const [w, h] = ESIZE[type];
  let face = sign(lvl.spawn.x - en.x) || -1;
  if ('SABF'.includes(en.ch)) face = -face;
  const e = {
    kind: 'enemy', type, x: en.x, y: en.y, w, h, vx: 0, vy: 0, face, alive: true, state: 'idle', st: 0, t: rnd(10),
    alerted: false, reactT: 0, reactDur: 0.4, pendAlert: 0, alert: 0, flash: 0, onGround: true, walkPh: rnd(6),
    aimAng: face > 0 ? 0 : Math.PI, aimDur: 0.6, windDur: 0.3, turnT: 0, stunT: 0, staggerT: 0, lostT: 0,
    marked: false, doomed: false, riteAng: 0, _px: en.x, _py: en.y,
    shieldDown: 0, yankT: 0, zeal: 0, blocks: 0, blockT: 0, doorT: 0, homeX: en.x, homeY: en.y, falling: false, ringT: 0,
  };
  if (type === 'gargoyle') {
    e.face = lvl.solidAt(en.tx - 1, en.ty) ? 1 : -1;
    e.x = en.tx * T + 8;
    e.y = en.y - 2;
  }
  if (type === 'cherub') { e.y = en.y - 14; e.homeY = e.y; e.onGround = false; }
  if (RIG_TYPES[type]) {
    e.pose = newPose(); e.tail = [];
    for (let i = 0; i < 6; i++) e.tail.push({ x: e.x - face * i * 3, y: e.y - 18, vx: 0, vy: 0 });
  }
  return e;
}

// ---------- senses ----------
function canSee(w, e, p) {
  const ex = e.x, ey = e.type === 'cherub' ? e.y - 8 : e.y - e.h * 0.8, px = p.x, py = p.y - 14;
  const dx = px - ex, dy = py - ey, ad = Math.abs(dx);
  const range = e.type === 'gargoyle' ? 360 : e.type === 'inquisitor' ? 420 : 320;
  if (ad > range || Math.abs(dy) > (e.type === 'cherub' ? 220 : 150)) return false;
  if (e.type === 'gargoyle' && dx * e.face < 0) return false;
  if (!e.alerted && dx * e.face < 0 && ad > 36) return false;
  if (!e.alerted && ad > w.diff.sight) return false;
  if (ad > 40 && sandBlocks(w.lvl, ex, ey, px, py)) return false;
  return los(w.lvl, ex, ey, px, py);
}
function alertEnemy(w, e) {
  if (e.alerted) return;
  e.alerted = true;
  const D = w.diff;
  e.reactT = e.reactDur = e.type === 'gargoyle' ? 0.5 * D.aim : rnd(D.react[0], D.react[1]) * (e.zeal > 0 ? 0.5 : 1);
  Sound.play('alert');
  for (const o of w.enemies) if (o !== e && o.alive && !o.alerted && o.pendAlert <= 0 && dist(o.x, o.y, e.x, e.y) < D.call) o.pendAlert = 0.35;
}
function ledgeAhead(w, e) {
  const fx = e.x + e.face * (e.w / 2 + 3);
  const t = w.lvl.tile(Math.floor(fx / T), Math.floor((e.y + 2) / T));
  return t === 0 || t === 3;
}
function wallAhead(w, e) { return w.lvl.solidAt(Math.floor((e.x + e.face * (e.w / 2 + 2)) / T), Math.floor((e.y - 8) / T)); }
function doorAhead(w, e) {
  const tx = Math.floor((e.x + e.face * (e.w / 2 + 2)) / T), ty = Math.floor((e.y - 8) / T);
  return w.doors.find((d) => !d.isOpen && d.tx === tx && (d.ty === ty || d.ty - 1 === ty)) || null;
}
// walk toward tg (a velocity), stopping at ledges and walls, and opening doors in the way
function walk(w, e, tg, acc, dt, careful = true) {
  if (tg) {
    const f0 = e.face; e.face = sign(tg);
    const d = doorAhead(w, e);
    if (d) { e.doorT += dt; tg = 0; if (e.doorT > 0.85) { openDoor(w, d, e.face, 'enemy'); e.doorT = 0; } }
    else if ((careful && e.onGround && ledgeAhead(w, e) && Math.abs(w.p.y - e.y) < 10) || wallAhead(w, e)) tg = 0;
    e.face = f0;
  }
  e.vx = approach(e.vx, tg, acc * dt);
}
function enemyPhysics(w, e, dt) {
  if (e.type === 'gargoyle' || dt <= 0) return;
  const lvl = w.lvl;
  if (e.yankT > 0) { moveX(lvl, e, e.vx * dt); moveY(lvl, e, e.vy * dt, e.y, true); return; }
  if (e.type === 'cherub' && !e.falling) {
    e.hitX = moveX(lvl, e, e.vx * dt); e.hitY = moveY(lvl, e, e.vy * dt, e.y, true);
    return;
  }
  const sl = inSand(lvl, e.x, e.y - 10) ? 0.45 : 1;
  e.vy = Math.min(e.vy + 1200 * dt, 520);
  const prevB = e.y;
  moveX(lvl, e, e.vx * dt * sl);
  e.onGround = moveY(lvl, e, e.vy * dt, prevB, false) > 0;
  if (e.onGround && e.falling && e.stunT <= 0) e.falling = false;
  if (Math.abs(e.vx) > 10) e.walkPh += dt * Math.abs(e.vx) * 0.1;
  const ty = Math.floor((e.y - 1) / T);
  if (lvl.tile(Math.floor(e.x / T), ty) === 3 && e.y > ty * T + 7) killEnemy(w, e, -Math.PI / 2, 'spikes');
}
function handPos(e) { const G = EGEO[e.type]; return [e.x + e.face * (G.ax - G.ex), e.y + (G.ey - G.ay)]; }
function aimAt(e, p) { const [hx, hy] = handPos(e); return Math.atan2(p.y - 11 - hy, p.x - hx); }
function fireBolt(w, x, y, ang, spd, owner, life = 3, kind = 'blood') {
  w.bolts.push({ x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, owner, life, bounces: 0, pierce: false, perfect: false, trail: [], nm: false, dead: false, kind });
}
function enemyFire(w, e) {
  const [hx, hy] = handPos(e);
  if (e.type === 'priest') {
    for (const o of w.diff.spread) fireBolt(w, hx, hy, e.aimAng + o, 255 * w.diff.bolt, 'enemy', 0.85 / w.diff.bolt);
    Sound.play('shotgun');
  } else if (e.type === 'inquisitor') {
    fireBolt(w, hx, hy, e.aimAng, 560 * w.diff.bolt, 'enemy', 2, 'heavy');
    Sound.play('snipe');
    e.vx = -e.face * 60;
  } else {
    fireBolt(w, hx, hy, e.aimAng, (e.type === 'gargoyle' ? 300 : 335) * w.diff.bolt, 'enemy');
    Sound.play('bolt');
  }
  sparks(w, hx, hy, e.aimAng, 8, 160, e.type === 'inquisitor' ? '#ffe2a0' : '#ff5a4a', 0.5);
  w.noise = { x: e.x, y: e.y, r: 140 };
}
// the strike box in front of a melee foe; deadly unless the player rolls through it
function meleeHit(w, e, reach, h, ang) {
  const p = w.p;
  if (p.dead || playerSafe(w)) return;
  if (overlap(e.x + e.face * (reach / 2) - reach / 2 + e.face * 2, e.y - h, reach, h, ...boxOf(p))) killPlayer(w, 'blade', ang);
}

// ---------- the step ----------
function updateEnemies(w, dt) {
  for (const e of w.enemies) {
    if (!e.alive) continue;
    e.flash = Math.max(0, e.flash - dt);
    if (dt <= 0) continue;
    e.t += dt;
    stepEnemy(w, e, dt);
    if (!e.alive) continue;
    enemyPhysics(w, e, dt);
    if (e.pose && e.alive) poseAndCape(e, dt);
  }
  w.noise = null;
}
function stepEnemy(w, e, dt) {
  const p = w.p, D = w.diff;
  e.zeal = Math.max(0, e.zeal - dt); e.blockT -= dt; e.shieldDown = Math.max(0, e.shieldDown - dt);
  const Z = e.zeal > 0 ? 0.75 : 1, Zs = e.zeal > 0 ? 1.35 : 1;
  // dragged by the chain
  if (e.yankT > 0) {
    e.yankT -= dt;
    const side = sign(e.x - p.x) || -p.face;
    const tx = p.x + side * 15, ty = p.y - (e.type === 'cherub' ? 6 : 0);
    const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy) || 1;
    e.vx = (dx / d) * 430; e.vy = (dy / d) * 430;
    e.face = sign(p.x - e.x) || e.face;
    if (d < 9 || e.yankT <= 0) {
      e.yankT = 0; e.stunT = 0.95; e.state = 'stun'; e.vx *= 0.15; e.vy = -70; e.alerted = true; e.reactT = 0;
      if (e.type === 'cherub') e.falling = true;
      dust(w, e.x, e.y, 6);
    }
    return;
  }
  if (e.stunT > 0) {
    e.stunT -= dt; e.vx = approach(e.vx, 0, 600 * dt);
    if (e.type === 'cherub') { e.falling = true; }
    if (e.stunT <= 0) { e.state = 'chase'; e.st = 0; if (e.type === 'cherub') e.falling = false; }
    return;
  }
  if (e.staggerT > 0 && e.type !== 'shield') {
    e.staggerT -= dt; e.vx = approach(e.vx, 0, 500 * dt);
    if (e.staggerT <= 0) { e.state = 'chase'; e.st = 0; e.blocks = 0; }
    return;
  }
  const sees = !p.dead && canSee(w, e, p);
  if (!e.alerted) {
    if (e.pendAlert > 0) { e.pendAlert -= dt; if (e.pendAlert <= 0) alertEnemy(w, e); }
    if (sees) alertEnemy(w, e);
    else if (w.noise && dist(w.noise.x, w.noise.y, e.x, e.y) < w.noise.r) alertEnemy(w, e);
  }
  e.alert = approach(e.alert, e.alerted ? 1 : 0, dt * 4);
  if (!e.alerted || e.reactT > 0 || p.dead) {
    if (e.reactT > 0) { e.reactT -= dt * (e.zeal > 0 ? 2 : 1); if (e.type !== 'gargoyle') e.face = sign(p.x - e.x) || e.face; }
    e.vx = approach(e.vx, 0, 600 * dt);
    if (e.type === 'cherub') { e.vy = (e.homeY + Math.sin(e.t * 2) * 4 - e.y) * 3; e.vx = 0; }
    return;
  }
  const dx = p.x - e.x, dy = p.y - e.y, ad = Math.abs(dx);
  switch (e.type) {
    case 'grunt': {
      if (e.state === 'idle' || e.state === 'chase' || e.state === 'stun') {
        e.state = 'chase'; e.face = sign(dx) || e.face;
        if (ad < 30 && Math.abs(dy) < 30) { e.state = 'windup'; e.st = 0; e.windDur = 0.27 * D.wind * Z; e.flash = e.windDur; Sound.play('windup'); }
        else walk(w, e, e.face * 122 * D.chase * Zs, 900, dt);
      } else if (e.state === 'windup') {
        e.st += dt; e.vx = approach(e.vx, 0, 900 * dt);
        if (e.st >= e.windDur) { e.state = 'strike'; e.st = 0; e.vx = ledgeAhead(w, e) ? 0 : e.face * 190; Sound.play('swing'); }
      } else if (e.state === 'strike') {
        e.st += dt;
        meleeHit(w, e, 28, 26, e.face > 0 ? -0.2 : Math.PI + 0.2);
        if (e.st > 0.12) { e.state = 'recover'; e.st = 0; }
      } else if (e.state === 'recover') {
        e.st += dt; e.vx = approach(e.vx, 0, 700 * dt);
        if (e.st > 0.42 * Z) e.state = 'chase';
      }
      break;
    }
    case 'acolyte': case 'priest': {
      const isP = e.type === 'priest';
      if (e.state === 'idle' || e.state === 'chase' || e.state === 'stun') {
        e.state = 'chase'; e.face = sign(dx) || e.face;
        let tg = 0;
        if (sees && ad < (isP ? 210 : 330)) { e.state = 'aim'; e.st = 0; e.aimDur = (isP ? 0.72 : 0.6) * D.aim * Z; e.aimAng = aimAt(e, p); e.lostT = 0; }
        else if (ad > (isP ? 110 : 150)) tg = e.face * (isP ? 75 : 62) * Zs;
        if (ad < 56 && !isP) tg = -(sign(dx) || e.face) * 85;
        if (e.state === 'chase') { const f = e.face; walk(w, e, tg, 600, dt); e.face = f; }
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
        if (e.st > (isP ? 1.45 : 0.95) * D.aim * Z) e.state = 'chase';
      }
      break;
    }
    case 'inquisitor': { // aims long and true: a heavy bolt down a burning line
      if (e.state === 'idle' || e.state === 'chase' || e.state === 'stun') {
        e.state = 'chase'; e.face = sign(dx) || e.face;
        let tg = 0;
        if (sees && ad < 400) { e.state = 'aim'; e.st = 0; e.aimDur = 1.15 * D.aim * Z; e.aimAng = aimAt(e, p); e.lostT = 0; Sound.play('windup'); }
        else if (ad > 220) tg = e.face * 58 * Zs;
        if (ad < 90) tg = -(sign(dx) || e.face) * 70;
        if (e.state === 'chase') { const f = e.face; walk(w, e, tg, 600, dt); e.face = f; }
      } else if (e.state === 'aim') {
        e.st += dt; e.vx = approach(e.vx, 0, 800 * dt);
        e.face = sign(dx) || e.face;
        if (e.st < e.aimDur - 0.3) {
          e.aimAng = aimAt(e, p);
          if (!sees) { e.lostT += dt; if (e.lostT > 0.4) { e.state = 'chase'; e.st = 0; } } else e.lostT = 0;
        }
        if (e.state === 'aim' && e.st >= e.aimDur) { enemyFire(w, e); e.state = 'cool'; e.st = 0; }
      } else if (e.state === 'cool') {
        e.st += dt; e.vx = approach(e.vx, 0, 400 * dt);
        if (e.st > 1.6 * D.aim * Z) e.state = 'chase';
      }
      break;
    }
    case 'herald': { // rings his bell: every sinner within earshot wakes in a fury
      e.ringT -= dt;
      if (e.state === 'ring') {
        e.st += dt; e.vx = approach(e.vx, 0, 800 * dt);
        if (e.st >= 0.32 && !e.rang) {
          e.rang = true;
          Sound.play('herald');
          ring(w, e.x, e.y - 24, 300, 0.9, '#e8c070', 1); ring(w, e.x, e.y - 24, 120, 0.5, '#fff1c0', 2);
          for (const o of w.enemies) if (o.alive && o !== e && dist(o.x, o.y, e.x, e.y) < 300) {
            o.zeal = 7; if (!o.alerted) { o.alerted = true; o.reactT = o.reactDur = 0.25; }
          }
          floatText(w, e.x, e.y - 44, 'zeal', '#ff7a6a');
        }
        if (e.st >= 0.9) { e.state = 'flee'; e.st = 0; e.ringT = 6; e.rang = false; }
      } else {
        e.state = 'flee';
        const away = -(sign(dx) || e.face);
        let tg = ad < 140 ? away * 82 : ad > 220 ? -away * 50 : 0;
        const f = e.face; walk(w, e, tg, 700, dt); e.face = sign(dx) || f;
        if (e.ringT <= 0 && w.enemies.some((o) => o.alive && o !== e && o.zeal <= 0 && dist(o.x, o.y, e.x, e.y) < 300)) { e.state = 'ring'; e.st = 0; e.rang = false; }
      }
      break;
    }
    case 'fallen': { // penitents who failed before you: they guard, and strike back
      if (e.state === 'idle' || e.state === 'chase' || e.state === 'stun' || e.state === 'stagger') {
        e.state = 'chase';
        if (sign(dx) !== e.face && ad > 4) { e.turnT += dt; if (e.turnT > 0.2 * Z) { e.face = -e.face; e.turnT = 0; } } else e.turnT = 0;
        const riposte = e.blocks >= 2 && e.blockT > 0;
        if ((ad < 52 && Math.abs(dy) < 26 && sign(dx) === e.face) || riposte) {
          e.state = 'windup'; e.st = 0; e.windDur = (riposte ? 0.2 : 0.42 * D.wind) * Z; e.blocks = 0; Sound.play('windup');
        } else {
          const tg = sign(dx) === e.face && ad > 40 ? e.face * 78 * D.chase * Zs : 0;
          const f = e.face; walk(w, e, tg, 700, dt); e.face = f;
        }
      } else if (e.state === 'windup') {
        e.st += dt; e.vx = approach(e.vx, 0, 900 * dt);
        if (e.st >= e.windDur) { e.state = 'lunge'; e.st = 0; e.vx = ledgeAhead(w, e) ? e.face * 60 : e.face * 340; Sound.play('swing'); }
      } else if (e.state === 'lunge') {
        e.st += dt; e.vx = approach(e.vx, 0, 900 * dt);
        meleeHit(w, e, 30, 26, e.face > 0 ? -0.15 : Math.PI + 0.15);
        if (e.st > 0.18) { e.state = 'recover'; e.st = 0; }
      } else if (e.state === 'recover') {
        e.st += dt; e.vx = approach(e.vx, 0, 700 * dt);
        if (e.st > 0.55 * Z) e.state = 'chase';
      }
      break;
    }
    case 'bomb': { // a pilgrim carrying the coals of the censer: he runs at you and gives himself to the fire
      if (e.state === 'idle' || e.state === 'chase' || e.state === 'stun' || e.state === 'run') {
        e.state = 'run'; e.face = sign(dx) || e.face;
        if (ad < 30 && Math.abs(dy) < 24) { e.state = 'fuse'; e.st = 0; Sound.play('fuse'); }
        else walk(w, e, e.face * 96 * D.chase * Zs, 800, dt);
      } else if (e.state === 'fuse') {
        e.st += dt; e.vx = approach(e.vx, 0, 900 * dt);
        if (e.st >= 0.75 * (MODE === 'pilgrim' ? 1.2 : 1)) killEnemy(w, e, -Math.PI / 2, 'self');
      }
      break;
    }
    case 'cherub': { // circles above, then falls on you like a stone
      const lvl = w.lvl;
      if (e.state === 'idle' || e.state === 'chase' || e.state === 'stun') { e.state = 'hover'; e.st = 0; }
      if (e.state === 'hover') {
        e.st += dt;
        const side = e.x < p.x ? -1 : 1;
        const hx = p.x + side * 46, hy = p.y - 74 + Math.sin(e.t * 2.4) * 6;
        e.vx = approach(e.vx, clamp((hx - e.x) * 2.2, -110, 110), 400 * dt);
        e.vy = approach(e.vy, clamp((hy - e.y) * 2.2, -110, 110), 400 * dt);
        e.face = sign(dx) || e.face;
        if (e.st > 1.1 * D.aim * Z && sees) { e.state = 'aim'; e.st = 0; e.aimDur = 0.55 * D.aim * Z; Sound.play('windup'); }
      } else if (e.state === 'aim') {
        e.st += dt; e.vx = approach(e.vx, 0, 500 * dt); e.vy = approach(e.vy, -20, 500 * dt);
        if (e.st < e.aimDur - 0.15) { e.tx = p.x; e.ty = p.y - 10; }
        e.face = sign(e.tx - e.x) || e.face;
        if (e.st >= e.aimDur) {
          e.state = 'dive'; e.st = 0;
          const a = Math.atan2(e.ty - (e.y - 8), e.tx - e.x);
          e.vx = Math.cos(a) * 330 * D.bolt; e.vy = Math.sin(a) * 330 * D.bolt;
          Sound.play('dive');
        }
      } else if (e.state === 'dive') {
        e.st += dt;
        if (!p.dead && !playerSafe(w) && overlap(e.x - 6, e.y - 14, 12, 12, ...boxOf(p))) killPlayer(w, 'cherub', Math.atan2(e.vy, e.vx));
        if (e.hitX || e.hitY || e.st > 0.9) { e.state = 'recover'; e.st = 0; e.vx *= 0.2; e.vy = -30; if (e.hitX || e.hitY) { dust(w, e.x, e.y, 6); Sound.play('wall'); } }
      } else if (e.state === 'recover') {
        e.st += dt; e.vx = approach(e.vx, 0, 300 * dt); e.vy = approach(e.vy, -70, 300 * dt);
        if (e.st > 0.7 * Z || lvl.solidAt(Math.floor(e.x / T), Math.floor((e.y - 20) / T))) { e.state = 'hover'; e.st = 0; }
      }
      break;
    }
    case 'shield': {
      if (e.staggerT > 0) { e.staggerT -= dt; e.vx = approach(e.vx, 0, 500 * dt); break; }
      if (e.state === 'idle' || e.state === 'chase' || e.state === 'stun') {
        e.state = 'chase';
        if (sign(dx) !== e.face && ad > 4) { e.turnT += dt; if (e.turnT > 0.38 * Z) { e.face = -e.face; e.turnT = 0; } } else e.turnT = 0;
        const tg = sign(dx) === e.face && ad > 28 ? e.face * 58 * D.chase * Zs : 0;
        const f = e.face; walk(w, e, tg, 500, dt); e.face = f;
        if (ad < 38 && Math.abs(dy) < 26 && sign(dx) === e.face) { e.state = 'windup'; e.st = 0; e.windDur = 0.4 * D.wind * Z; e.flash = e.windDur; Sound.play('windup'); }
      } else if (e.state === 'windup') {
        e.st += dt; e.vx = approach(e.vx, 0, 800 * dt);
        if (e.st >= e.windDur) { e.state = 'bash'; e.st = 0; e.vx = e.face * 245; Sound.play('swing'); }
      } else if (e.state === 'bash') {
        e.st += dt;
        meleeHit(w, e, 22, 26, e.face > 0 ? -0.3 : Math.PI + 0.3);
        if (e.st > 0.17) { e.state = 'recover'; e.st = 0; }
      } else if (e.state === 'recover') {
        e.st += dt; e.vx = approach(e.vx, 0, 600 * dt);
        if (e.st > 0.5 * Z) e.state = 'chase';
      }
      break;
    }
    case 'gargoyle': {
      if (e.state === 'idle' || e.state === 'chase' || e.state === 'stun') { e.state = 'chase'; if (sees) { e.state = 'aim'; e.st = 0; e.aimDur = 0.8 * D.aim * Z; } }
      else if (e.state === 'aim') {
        e.st += dt;
        if (e.st < e.aimDur - 0.18) e.aimAng = aimAt(e, p);
        if (e.st >= e.aimDur) { enemyFire(w, e); e.state = 'cool'; e.st = 0; }
      } else if (e.state === 'cool') { e.st += dt; if (e.st > 1.5 * D.aim * Z) e.state = 'chase'; }
      break;
    }
  }
}
