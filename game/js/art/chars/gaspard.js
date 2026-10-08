/* Gaspard: brass automaton, nanny and butler built by Elias. Faces right; origin (0,0) = centre of the feet.
   Loaded after humanoid.js, so this registration replaces the generic gaspard rig. Contract: DESIGN.md section 5. */
(function () {
  'use strict';

  const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
  const clamp01 = (v) => ART.clamp(v, 0, 1);
  const lerp = ART.lerp;
  const ease = (x) => {
    const k = clamp01(x);
    return k * k * (3 - 2 * k);
  };

  const STATES = ['idle', 'walk', 'run', 'jump', 'fall', 'land', 'attack', 'dash', 'hurt', 'dead', 'talk', 'slow', 'frozen'];

  const BASE = {
    brass: '#c9963f', brassD: '#8a6428', brassL: '#ecc878', brassX: '#4a3418',
    coat: '#1f3d34', coatL: '#2f5c4d', coatD: '#122820',
    collar: '#f4efe6', trouser: '#17261f', boot: '#3a2818',
    glass: '#6fd3ff', bronze: '#8c6a3a', visor: '#231a1e', steam: '#eef3f5'
  };

  const COAT = [[-11, -37], [-6, -40.5], [0, -40], [6, -40.5], [11, -37], [11.5, -31], [9.5, -25], [10.5, -20],
    [-10.5, -20], [-9.5, -25], [-11.5, -31]];

  /* ---------- colour helpers ---------- */

  function rgb(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex);
    const n = m ? parseInt(m[1], 16) : 0x808080;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function desat(hex, amt) {
    const c = rgb(hex);
    const l = c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
    return '#' + c.map((v) => Math.round(v + (l - v) * amt).toString(16).padStart(2, '0')).join('');
  }

  function palette(frozen) {
    const out = {};
    Object.keys(BASE).forEach((k) => { out[k] = frozen ? desat(BASE[k], 0.8) : BASE[k]; });
    return out;
  }

  /* ---------- pose ---------- */

  // Blink as a short triangle every 4.4 s; 0 = open, 1 = shut.
  function blinkAt(t) {
    const k = ((t % 4.4) + 4.4) % 4.4;
    if (k > 0.16) return 0;
    return k < 0.08 ? k / 0.08 : (0.16 - k) / 0.08;
  }

  // Striking-arm angle over the attack: anticipation back, strike forward, recovery.
  function swing(T) {
    if (T < 0.12) return lerp(0.08, -1.1, ease(T / 0.12));
    if (T < 0.24) return lerp(-1.1, 1.3, ease((T - 0.12) / 0.12));
    return lerp(1.3, 0.08, ease((T - 0.24) / 0.3));
  }

  // Heavy alternating gait. Arms swing opposite to the leg on their own side.
  function gait(P, ph, o) {
    const s = Math.sin(ph), c = Math.cos(ph);
    P.legs = [
      { a: o.amp * s, bend: o.bend * Math.max(0, c), lift: o.lift * Math.max(0, c) },
      { a: -o.amp * s, bend: o.bend * Math.max(0, -c), lift: o.lift * Math.max(0, -c) }
    ];
    P.armB = -o.arm * s;
    P.armF = o.arm * s;
    P.bendB = 0.2;
    P.bendF = 0.25;
    P.dy = o.dy * Math.abs(s);
    P.tail = 0.1 * s;
  }

  function pose(p) {
    const st = STATES.indexOf(p.state) >= 0 ? p.state : 'idle';
    const T = Math.max(0, num(p.t, 0));
    const time = num(p.time, 0);
    const k = st === 'slow' ? 0.35 : 1;          // Pendule: everything runs at a third speed
    const br = Math.sin(time * 1.7 * k);         // breathing
    const P = {
      st, time, T, jet: false, dy: 0, lean: 0, tilt: 0, tail: 0, rot: 0, alpha: 1,
      legs: [{ a: 0, bend: 0.04, lift: 0 }, { a: 0, bend: 0.04, lift: 0 }],
      armB: 0.06, bendB: 0.1, armF: 0.06, bendF: 0.1,
      gear: 1, glow: 0.8, blink: blinkAt(time), mouth: 0.12, steam: 0.7,
      sparks: 0, trail: null, frozen: false, ring: false
    };
    switch (st) {
      case 'walk':
        gait(P, time * 5, { amp: 0.42, bend: 0.55, lift: 3, arm: 0.32, dy: 1.2 });
        P.lean = 0.05; P.steam = 0.8;
        break;
      case 'run':
        gait(P, time * 9, { amp: 0.6, bend: 0.9, lift: 4, arm: 0.55, dy: 2.2 });
        P.lean = 0.14; P.gear = 2.2; P.steam = 1.6;
        break;
      case 'jump':
        P.legs = [{ a: -0.25, bend: 0.1, lift: 0 }, { a: 0.4, bend: 1.0, lift: 0 }];
        P.armB = -1.5; P.armF = 1.9; P.bendB = 0.2; P.bendF = 0.2;
        P.lean = 0.04; P.tail = 0.35; P.gear = 1.6;
        break;
      case 'fall':
        P.legs = [{ a: -0.3, bend: 0.2, lift: 0 }, { a: 0.3, bend: 0.2, lift: 0 }];
        P.armB = -1.4; P.armF = 1.4; P.bendB = 0.1; P.bendF = 0.1;
        P.lean = -0.06; P.tail = -0.25; P.gear = 2; P.steam = 1.2;
        break;
      case 'land': {
        const e = clamp01(1 - T / 0.28);
        P.dy = 4.5 * e;
        P.legs = [{ a: 0.15, bend: 0.1 + 0.9 * e, lift: 0 }, { a: -0.15, bend: 0.1 + 0.9 * e, lift: 0 }];
        P.armB = -0.5 * e; P.armF = 0.5 * e; P.lean = 0.12 * e; P.steam = 1.5 + 2 * e;
        break;
      }
      case 'attack':
        P.legs = [{ a: -0.2, bend: 0.05, lift: 0 }, { a: 0.25, bend: 0.25, lift: 0 }];
        P.armF = swing(T); P.bendF = 0.3; P.armB = -0.25; P.bendB = 0.2;
        P.lean = T > 0.12 && T < 0.3 ? 0.16 : 0.03; P.gear = 2.5; P.steam = 1.2;
        if (T >= 0.12 && T < 0.42) {
          P.trail = { from: swing(Math.max(0, T - 0.08)), to: swing(T), a: 1 - (T - 0.12) / 0.3 };
        }
        break;
      case 'dash':
        P.legs = [{ a: 0.5, bend: 0.7, lift: 0 }, { a: -0.5, bend: 0.5, lift: 0 }];
        P.armB = -1.1; P.bendB = 0.25; P.armF = -0.5; P.bendF = 0.5;
        P.lean = 0.3; P.dy = 0.5; P.tail = 0.7; P.gear = 3; P.steam = 3.2; P.jet = true;
        break;
      case 'hurt': {
        const e = clamp01(1 - T / 0.5);
        P.lean = -0.22 * e; P.tilt = -0.3 * e; P.armB = -0.9 * e; P.armF = 0.9 * e; P.bendF = 0.3 * e;
        P.sparks = e; P.glow = 0.35 + 0.65 * Math.abs(Math.sin(time * 30)); P.steam = 1 + 2 * e;
        break;
      }
      case 'dead': {
        const f = clamp01(T / 0.7);
        P.rot = -1.45 * (1 - (1 - f) * (1 - f));        // topples backwards about the feet
        P.alpha = 1 - clamp01((T - 0.8) / 0.9);
        P.legs = [{ a: 0.25, bend: 0.2, lift: 0 }, { a: -0.35, bend: 0.1, lift: 0 }];
        P.armB = -0.3; P.armF = 0.9; P.bendF = 0.4;
        P.glow = 0.3 * clamp01(1 - T); P.gear = 0; P.steam = T < 0.5 ? 2.5 : 0;
        break;
      }
      case 'talk':
        P.dy = 0.5 + 0.5 * br; P.lean = 0.02; P.tilt = 0.05 * Math.sin(time * 2.2);
        P.armF = 0.3 + 0.07 * Math.sin(time * 4); P.bendF = 2.1 + 0.15 * Math.sin(time * 4);
        P.mouth = clamp01(0.5 + 0.5 * Math.sin(time * 15)); P.glow = 0.9;
        break;
      case 'frozen':
        P.frozen = true; P.gear = 0; P.steam = 0; P.glow = 0.45; P.blink = 0;
        break;
      default: {
        // idle, slow (Pendule) and unknown states
        const moving = st === 'slow' && Math.abs(num(p.vx, 0)) > 8;
        if (moving) {
          gait(P, time * 5 * k, { amp: 0.42, bend: 0.55, lift: 3, arm: 0.32, dy: 1.2 });
          P.lean = 0.05;
        } else {
          P.dy = 0.5 + 0.5 * br;
          P.armB = 0.06 - 0.02 * br;
          P.armF = 0.06 + 0.02 * br;
        }
        P.glow = 0.8 + 0.15 * Math.sin(time * 2 * k);
      }
    }
    if (st === 'slow') { P.ring = true; P.gear = 0.35; P.steam = 0.3; }
    return P;
  }

  /* ---------- drawing ---------- */

  function ringAt(ctx, time) {
    ctx.save();
    ctx.strokeStyle = 'rgba(111,211,255,0.6)';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([3, 4]);
    ctx.lineDashOffset = -time * 4;
    ctx.beginPath();
    ctx.ellipse(0, 0.5, 19, 5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Hip pivot for the upper body: bob, lean forward or back.
  function lean(ctx, P) {
    ctx.translate(0, P.dy);
    ctx.translate(0, -28);
    ctx.rotate(P.lean);
    ctx.translate(0, 28);
  }

  function drawLeg(ctx, hx, hy, L, c, far) {
    const kx = hx + Math.sin(L.a) * 12, ky = hy + Math.cos(L.a) * 12;
    const a2 = L.a - L.bend;
    const ax = kx + Math.sin(a2) * 11.5, ay = ky + Math.cos(a2) * 11.5 - L.lift;
    ART.limb(ctx, hx, hy, kx, ky, 7.4, far ? ART.shade(c.trouser, -0.2) : c.trouser, { lw: 1.6 });
    ART.limb(ctx, kx, ky, ax, ay, 4.6, far ? c.brassD : c.brass, { lw: 1.4 });
    ART.ell(ctx, kx, ky, 2.4, 2.4, c.brassL, { lw: 1.1 });
    ART.ell(ctx, ax + 1.6, ay + 2, 5.2, 2.2, c.boot, { lw: 1.6 });
  }

  function drawTails(ctx, P, c) {
    ctx.translate(-4, -22); ctx.rotate(P.tail); ctx.translate(4, 22);
    ART.poly(ctx, [[-14, -23], [2, -23], [3, -13], [0, -5], [-5, -2.5], [-12.5, -7], [-15, -15]], c.coatD, { lw: 1.8 });
    ART.poly(ctx, [[-9, -22], [-1.5, -22], [-1, -13], [-4, -7.5], [-8.5, -10], [-10, -16]], c.coat, { lw: 1.2 });
  }

  function drawArm(ctx, sx, sy, aa, bend, c, far) {
    const ex = sx + Math.sin(aa) * 11, ey = sy + Math.cos(aa) * 11;
    const a2 = aa + bend;
    const wx = ex + Math.sin(a2) * 10, wy = ey + Math.cos(a2) * 10;
    ART.limb(ctx, sx, sy, ex, ey, 7.4, far ? ART.shade(c.coat, -0.15) : c.coat, { lw: 1.6 });
    ART.limb(ctx, ex, ey, wx, wy, 4.4, far ? c.brassD : c.brass, { lw: 1.4 });
    ART.limb(ctx, wx - Math.sin(a2) * 1.5, wy - Math.cos(a2) * 1.5, wx, wy, 5.6, c.collar, { lw: 1 });
    ART.ell(ctx, wx + Math.sin(a2) * 2.4, wy + Math.cos(a2) * 2.4, 2.6, 2.6, c.brassL, { lw: 1.2 });
  }

  function drawChest(ctx, P, c) {
    const g = P.time * P.gear;
    ART.ell(ctx, 0, -31, 5.6, 5.6, c.brassD, { lw: 1.6 });
    ART.ell(ctx, 0, -31, 4.4, 4.4, '#1a120c', { stroke: false });
    ART.gear(ctx, -1.2, -31.4, 3, 8, g * 1.2, c.brassL, { lw: 1 });
    ART.gear(ctx, 2.2, -29.8, 1.9, 6, -g * 1.6 + 0.3, c.brass, { lw: 0.9 });
  }

  function drawUpper(ctx, P, c) {
    drawArm(ctx, -8, -37, P.armB, P.bendB, c, true);
    ART.poly(ctx, COAT, c.coat, { lw: 2 });
    ART.poly(ctx, [[-2.6, -38.5], [2.6, -38.5], [3.2, -21], [-3.2, -21]], c.collar, { lw: 1.2 });
    ART.poly(ctx, [[-7, -40.2], [-2.2, -38], [-3.4, -21], [-8.8, -25]], c.coatL, { lw: 1.2 });
    ART.poly(ctx, [[7, -40.2], [2.2, -38], [3.4, -21], [8.8, -25]], c.coatL, { lw: 1.2 });
    ART.rr(ctx, -9.6, -27.6, 19.2, 2.6, 1, c.brassD, { lw: 1 });
    drawChest(ctx, P, c);
    [[-8, -34], [-8, -22], [8, -34], [8, -22]].forEach((b) => ART.ell(ctx, b[0], b[1], 1.3, 1.3, c.brassL, { lw: 0.9 }));
    ART.limb(ctx, 0, -43, 0, -37, 5.6, c.brassD, { lw: 1.4 });
    ART.poly(ctx, [[-6.8, -42.5], [6.8, -42.5], [7.8, -37], [0, -34.6], [-7.8, -37]], c.collar, { lw: 1.4 });
    ctx.save();
    ctx.translate(0, -42); ctx.rotate(P.tilt); ctx.translate(0, 42);
    drawHead(ctx, P, c);
    ctx.restore();
    drawArm(ctx, 8, -37, P.armF, P.bendF, c, false);
    if (P.trail) drawTrail(ctx, P.trail);
    if (P.sparks > 0.01) drawSparks(ctx, P, c);
    drawSteam(ctx, P, c);
  }

  function drawHead(ctx, P, c) {
    ART.ell(ctx, -8, -52, 1.9, 3.1, c.brassD, { lw: 1.1 });
    ART.ell(ctx, 1, -53, 9, 10.5, c.brass, { lw: 2 });
    ctx.save();
    ctx.globalAlpha *= 0.4;
    ctx.fillStyle = '#fff3c8';
    ctx.beginPath();
    ctx.ellipse(-3.2, -59, 3.4, 1.8, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ART.rr(ctx, -5, -57, 12, 9, 3.5, c.visor, { lw: 1.4 });
    glassEye(ctx, 3.8, -53, 2.5, P.glow, P.blink, c);
    dialEye(ctx, -2.2, -53, 2.1, P.time * P.gear, c);
    // grille mouth of small slats, opening while talking
    const h = 3 + 1.4 * P.mouth;
    ART.rr(ctx, -1, -47.5, 9.5, h, 1.2, c.brassX, { lw: 1 });
    ctx.save();
    ctx.strokeStyle = c.brassL;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const x = 0.6 + i * 2.4;
      ctx.moveTo(x, -46.5);
      ctx.lineTo(x, -47.5 + h - 1);
    }
    ctx.stroke();
    ctx.restore();
  }

  // The lit cyan lens: halo, disc (squashed by blink), small highlight.
  function glassEye(ctx, x, y, r, glow, blink, c) {
    const g = clamp01(glow);
    ctx.save();
    const grad = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 2.8);
    grad.addColorStop(0, 'rgba(111,211,255,' + (0.6 * g).toFixed(3) + ')');
    grad.addColorStop(1, 'rgba(111,211,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r * 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ART.ell(ctx, x, y, r, Math.max(0.5, r * (1 - clamp01(blink))), ART.shade(c.glass, -0.05 + 0.3 * g), { lw: 1.1 });
    if (blink < 0.6) ART.ell(ctx, x - r * 0.35, y - r * 0.35, r * 0.26, r * 0.2, '#ffffff', { stroke: false, alpha: 0.85 });
  }

  // The dim bronze dial with a slowly turning needle.
  function dialEye(ctx, x, y, r, t, c) {
    ART.ell(ctx, x, y, r, r, ART.shade(c.bronze, -0.2), { lw: 1.1 });
    const a = t * 0.4 + 0.8;
    ctx.save();
    ctx.strokeStyle = c.brassX;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.7, 0, Math.PI * 2);
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * r * 0.65, y + Math.sin(a) * r * 0.65);
    ctx.stroke();
    ctx.restore();
  }

  function drawTrail(ctx, tr) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,240,200,' + (0.75 * clamp01(tr.a)).toFixed(3) + ')';
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let i = 0; i <= 8; i++) {
      const a = lerp(tr.from, tr.to, i / 8);
      const x = 8 + Math.sin(a) * 21, y = -37 + Math.cos(a) * 21;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawSparks(ctx, P, c) {
    for (let i = 0; i < 3; i++) {
      const ang = 0.6 + i * 1.1;
      const d = 6 + P.T * 26;
      ART.ell(ctx, Math.cos(ang) * d * 0.6 + 1, -30 + Math.sin(ang) * d * 0.6, 1.4, 1.4, c.brassL,
        { stroke: false, alpha: clamp01(P.sparks) });
    }
  }

  // Three puffs rising from the back of the neck (wider and longer when dashing).
  function drawSteam(ctx, P, c) {
    if (P.steam <= 0.02) return;
    const a0 = Math.min(0.6, 0.5 * P.steam);
    for (let i = 0; i < 3; i++) {
      const u = ((P.time * 0.5 + i / 3) % 1 + 1) % 1;
      const r = 1.6 + u * (2.8 + (P.jet ? 1.2 : 0));
      const x = -4 + Math.sin(u * 5 + i) * 1.5 - u * (P.jet ? 14 : 4);
      const y = -46 - u * 22;
      ART.ell(ctx, x, y, r, r * 0.9, c.steam, { stroke: false, alpha: a0 * (1 - u) });
    }
  }

  function draw(ctx, p) {
    const P = pose(p || {});
    const c = palette(P.frozen);
    ctx.save();
    if (P.alpha < 1) ctx.globalAlpha *= Math.max(0, P.alpha);
    if (P.rot) ctx.rotate(P.rot);
    if (P.ring) ringAt(ctx, P.time);
    if (!P.rot) ART.ell(ctx, 0, 0.5, 13, 2.6, '#000000', { stroke: false, alpha: 0.2 });
    drawLeg(ctx, -4, -28, P.legs[0], c, true);
    ctx.save(); lean(ctx, P); drawTails(ctx, P, c); ctx.restore();
    drawLeg(ctx, 3, -28, P.legs[1], c, false);
    ctx.save(); lean(ctx, P); drawUpper(ctx, P, c); ctx.restore();
    ctx.restore();
  }

  /* ---------- portrait (200 x 200 box centred on 0,0) ---------- */

  const EXPR = {
    neutral:   { bo: -62, bi: -62, arch: 0,  ci: 0,    co: 0,    r: 1,    glow: 0.8,  mb: 0,  mh: 11, mode: 'bar' },
    happy:     { bo: -66, bi: -66, arch: 5,  ci: 0.12, co: 0.12, r: 1,    glow: 0.95, mb: -7, mh: 10, mode: 'bar' },
    sad:       { bo: -62, bi: -74, arch: 0,  ci: 0.16, co: 0.36, r: 0.95, glow: 0.55, mb: 6,  mh: 9,  mode: 'bar' },
    angry:     { bo: -72, bi: -54, arch: 0,  ci: 0.46, co: 0.2,  r: 1,    glow: 1,    mb: 1,  mh: 6,  mode: 'bar' },
    surprised: { bo: -78, bi: -78, arch: 8,  ci: 0,    co: 0,    r: 1.2,  glow: 1,    mb: 0,  mh: 0,  mode: 'o' },
    worried:   { bo: -64, bi: -76, arch: -2, ci: 0.06, co: 0.28, r: 1,    glow: 0.6,  mb: 3,  mh: 10, mode: 'bar' }
  };

  // Eyelid: a visor-coloured cover over the top of an eye. cIn/cOut = how far it covers at inner/outer corner.
  function lid(ctx, cx, cy, r, cIn, cOut, innerLeft, bl) {
    const ci = clamp01(Math.max(cIn, bl)), co = clamp01(Math.max(cOut, bl));
    if (ci <= 0 && co <= 0) return;
    const yIn = cy - r + 2 * r * ci, yOut = cy - r + 2 * r * co;
    const yL = innerLeft ? yIn : yOut, yR = innerLeft ? yOut : yIn;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx - r - 5, cy - r - 6);
    ctx.lineTo(cx + r + 5, cy - r - 6);
    ctx.lineTo(cx + r + 5, yR);
    ctx.lineTo(cx - r - 5, yL);
    ctx.closePath();
    ctx.fillStyle = BASE.visor;
    ctx.fill();
    ctx.strokeStyle = ART.OUT;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - r - 5, yL);
    ctx.lineTo(cx + r + 5, yR);
    ctx.stroke();
    ctx.restore();
  }

  function portrait(ctx, expr, t) {
    const e = EXPR[expr] || EXPR.neutral;
    const tt = num(t, 0);
    const bl = blinkAt(tt);
    const c = BASE;

    const bg = ctx.createRadialGradient(0, -10, 10, 0, -10, 120);
    bg.addColorStop(0, 'rgba(236,200,120,0.3)');
    bg.addColorStop(1, 'rgba(236,200,120,0)');
    ctx.fillStyle = bg;
    ctx.fillRect(-100, -100, 200, 200);

    for (let i = 0; i < 3; i++) {
      const u = ((tt * 0.4 + i / 3) % 1 + 1) % 1;
      ART.ell(ctx, -12 - u * 28 + Math.sin(u * 5 + i) * 4, 36 - u * 80, 4 + u * 7, 3.5 + u * 6, c.steam,
        { stroke: false, alpha: 0.35 * (1 - u) });
    }

    // shoulders, collar, shirt front, chest window
    ART.poly(ctx, [[-98, 100], [-97, 64], [-72, 46], [-34, 40], [0, 42], [34, 40], [72, 46], [97, 64], [98, 100]], c.coat, { lw: 3 });
    ART.poly(ctx, [[-10, 58], [10, 58], [12, 100], [-12, 100]], c.collar, { lw: 2.4 });
    ART.poly(ctx, [[-24, 42], [24, 42], [12, 70], [0, 62], [-12, 70]], c.collar, { lw: 2.4 });
    ART.ell(ctx, 0, 84, 13, 13, c.brassD, { lw: 2.4 });
    ART.ell(ctx, 0, 84, 10.4, 10.4, '#1a120c', { stroke: false });
    ART.gear(ctx, -3, 83.5, 6.2, 9, tt * 0.9, c.brassL, { lw: 1.6 });
    ART.gear(ctx, 5.2, 81, 4.2, 7, -tt * 1.2, c.brass, { lw: 1.4 });
    [[-40, 76], [40, 76], [-40, 96], [40, 96]].forEach((b) => ART.ell(ctx, b[0], b[1], 3.2, 3.2, c.brassL, { lw: 1.6 }));

    // neck and oval brass head
    ART.rr(ctx, -15, 32, 30, 22, 6, c.brassD, { lw: 2.4 });
    ART.ell(ctx, 0, -24, 56, 62, c.brass, { lw: 3 });
    ctx.save();
    ctx.globalAlpha *= 0.4;
    ctx.fillStyle = '#fff3c8';
    ctx.beginPath();
    ctx.ellipse(-26, -62, 16, 8, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ART.ell(ctx, -48, -10, 3.2, 3.2, c.brassD, { lw: 1.4 });
    ART.ell(ctx, 48, -10, 3.2, 3.2, c.brassD, { lw: 1.4 });
    ART.rr(ctx, -50, -46, 100, 46, 16, c.visor, { lw: 2.4 });

    // brows
    ctx.save();
    ctx.strokeStyle = ART.OUT;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    [-1, 1].forEach((s) => {
      const ox = s * 44, ix = s * 14;
      ctx.beginPath();
      ctx.moveTo(ox, e.bo);
      ctx.quadraticCurveTo((ox + ix) / 2, (e.bo + e.bi) / 2 - e.arch, ix, e.bi);
      ctx.stroke();
    });
    ctx.restore();

    // eyes: cyan lens on the right, bronze dial on the left
    glassEye(ctx, 22, -24, 13 * e.r, e.glow, 0, c);
    lid(ctx, 22, -24, 13 * e.r, e.ci, e.co, true, bl);
    dialEye(ctx, -22, -24, 12 * e.r, tt * 0.5, c);
    lid(ctx, -22, -24, 12 * e.r, e.ci, e.co, false, bl);

    // grille mouth
    if (e.mode === 'o') {
      ART.ell(ctx, 0, 24, 13, 11, c.brassX, { lw: 2.6 });
      ctx.save();
      ctx.strokeStyle = c.brassL;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 24, 6.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else {
      const xs = [-26, -13, 0, 13, 26];
      const topY = (x) => 12 + e.mb * (x / 26) * (x / 26);
      const top = xs.map((x) => [x, topY(x)]);
      const bot = xs.slice().reverse().map((x) => [x, topY(x) + e.mh]);
      ART.poly(ctx, top.concat(bot), c.brassX, { lw: 2.6 });
      ctx.save();
      ctx.strokeStyle = c.brassL;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      [-18, -9, 0, 9, 18].forEach((x) => {
        ctx.moveTo(x, topY(x) + 2);
        ctx.lineTo(x, topY(x) + e.mh - 2);
      });
      ctx.stroke();
      ctx.restore();
    }
  }

  ART.register({
    id: 'gaspard', w: 34, h: 62,
    draw(ctx, p) { draw(ctx, p); },
    portrait(ctx, expr, t) { portrait(ctx, expr, t); }
  });
})();
