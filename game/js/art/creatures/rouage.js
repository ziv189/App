/* Rouage: clockwork crab of brass gears (creature). Plain browser script, contract in game/AGENT_BRIEF.md.
   Drawn facing right, origin (0,0) = centre of the feet, y negative is up. The engine flips it for left. */
(function () {
  const BRASS = '#c8963c';
  const BRASS_LT = '#ecc56e';
  const BRASS_DK = '#7d5219';
  const RED = '#d9372b';
  const RED_HOT = '#ff7a5c';
  const RED_DIM = '#6e1410';
  const GRAV = 40; // px/s^2, pulls the parts that fly apart on death

  // Rig, in px. Body centre (-1,-8), radius 6.5.
  const BODY = { x: -1, y: -8, r: 6.5 };
  const HIP = [[-5, -4.5], [-2, -2.2], [1.5, -2.2], [4.5, -4.5]]; // leg roots
  const FOOT = [-10, -5, 3.5, 8.5];                               // resting feet (y = 0)
  const LEG_PHASE = [0, Math.PI, Math.PI, 0];                      // diagonal gait
  const CLAW_UP = { base: [4.5, -10.5], wrist: [9.5, -13.5] };
  const CLAW_LO = { base: [5, -6], wrist: [10.5, -6.5] };
  const EYE = [2.6, -2.8];                                         // offset from body centre
  const ANTENNA = [
    { base: [-3.2, -13.8], coil: [-9.5, -16.6] },
    { base: [-0.5, -14.6], coil: [-6, -17.4] }
  ];
  // Death: main gear, three smaller gears, each with start position, launch speed and spin.
  const PARTS = [
    { x: -1, y: -8, r: 6.5, teeth: 9, vx: -12, vy: -34, spin: 5 },
    { x: 4, y: -10, r: 3.8, teeth: 7, vx: 22, vy: -30, spin: -8 },
    { x: -6, y: -5, r: 3.0, teeth: 6, vx: -26, vy: -12, spin: 9 },
    { x: 2, y: -3, r: 2.2, teeth: 5, vx: 8, vy: -40, spin: -11 },
    { x: -3, y: -14, r: 2.6, teeth: 6, vx: -6, vy: -26, spin: 7 }
  ];

  function num(v, d) { return typeof v === 'number' && isFinite(v) ? v : d; }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function easeOut(u) { const k = clamp01(u); return 1 - (1 - k) * (1 - k); }

  // Eye blink: a short close every 3.6 s.
  function blinkAt(time) {
    const ph = ((time % 3.6) + 3.6) % 3.6;
    return ph < 0.14 ? 1 - Math.abs(ph - 0.07) / 0.07 : 0;
  }

  // Two-pass stroke: dark outline first, then the coloured line on top.
  function wire(ctx, build, col) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath(); build();
    ctx.strokeStyle = ART.OUT; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); build();
    ctx.strokeStyle = col; ctx.lineWidth = 1.3; ctx.stroke();
  }

  // Spring leg: a zig-zag coil from the hip (x1,y1) to the foot (x2,y2).
  function spring(ctx, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    const pts = [];
    for (let i = 0; i <= 6; i++) {
      const u = i / 6;
      const o = i === 0 || i === 6 ? 0 : i % 2 ? 1.3 : -1.3;
      pts.push([x1 + dx * u + nx * o, y1 + dy * u + ny * o]);
    }
    wire(ctx, () => {
      pts.forEach((q, i) => { if (i === 0) ctx.moveTo(q[0], q[1]); else ctx.lineTo(q[0], q[1]); });
    }, BRASS);
  }

  // Coiled antenna: a curved stem ending in a spiral centred on (cx,cy).
  function antenna(ctx, bx, by, cx, cy) {
    const R = 1.8;
    const sx = cx + R, sy = cy;
    wire(ctx, () => {
      ctx.moveTo(bx, by);
      ctx.bezierCurveTo(bx - 1.5, by - 3.5, sx + 2.5, sy - 2.5, sx, sy);
    }, BRASS_LT);
    wire(ctx, () => {
      for (let i = 0; i <= 18; i++) {
        const an = i * 0.5, rr = R - i * 0.085;
        const x = cx + Math.cos(an) * rr, y = cy + Math.sin(an) * rr;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
    }, BRASS_LT);
  }

  // Pincer jaw: a tapered blade from the wrist (wx,wy) along angle a.
  function jaw(ctx, wx, wy, a) {
    const L = 5.2, c = Math.cos(a), s = Math.sin(a);
    const local = [[0, -1.5], [L * 0.7, -1.2], [L, 0], [L * 0.7, 0.9], [0, 1.5]];
    const pts = local.map((q) => [wx + q[0] * c - q[1] * s, wy + q[0] * s + q[1] * c]);
    ART.poly(ctx, pts, BRASS, { lw: 1.4 });
  }

  // Claw: arm from base to wrist, two jaws spread by `open` radians (0 = closed).
  function claw(ctx, bx, by, wx, wy, open) {
    const dir = Math.atan2(wy - by, wx - bx);
    ART.limb(ctx, bx, by, wx, wy, 3.2, BRASS_DK, { lw: 1 });
    jaw(ctx, wx, wy, dir - open / 2);
    jaw(ctx, wx, wy, dir + open / 2);
    ART.ell(ctx, wx, wy, 1.6, 1.6, BRASS_LT, { lw: 1 });
  }

  // Poses. Each returns the same fields, so one routine draws every state.
  function poseIdle(time) {
    return {
      bob: Math.sin(time * 2.4) * 0.5, breathe: Math.sin(time * 2.4) * 0.25,
      lunge: 0, tilt: 0, rot: time * 0.5,
      open: 0.5 + 0.25 * Math.sin(time * 1.6),
      feet: FOOT.map((x) => [x, 0]),
      eye: RED, glow: 0, blink: blinkAt(time),
      sway: Math.sin(time * 2) * 0.5
    };
  }

  function poseWalk(time) {
    const ph = time * 9;
    const feet = FOOT.map((x, i) => {
      const a = ph + LEG_PHASE[i];
      return [x + Math.sin(a) * 3.2, -Math.max(0, Math.cos(a)) * 2.6];
    });
    return {
      bob: -Math.abs(Math.sin(ph)) * 0.9, breathe: 0,
      lunge: 0, tilt: 0, rot: time * 1.5,
      open: 0.5 + 0.35 * Math.sin(time * 4),
      feet, eye: RED, glow: 0, blink: blinkAt(time),
      sway: Math.sin(time * 5) * 1.2
    };
  }

  // Attack: crouch and draw the pincers in, lunge with them flared wide, hold, recover.
  function poseAttack(a, time) {
    let bob, lunge, open;
    if (a < 0.15) {
      const u = a / 0.15;
      bob = 1.2 * u; lunge = -2 * u; open = 0.3 * (1 - u);
    } else if (a < 0.3) {
      const u = easeOut((a - 0.15) / 0.15);
      bob = 1.2 - 1.7 * u; lunge = -2 + 7 * u; open = 1.35 * u;
    } else if (a < 0.5) {
      bob = -0.5; lunge = 5; open = 1.35;
    } else {
      const u = clamp01((a - 0.5) / 0.35);
      bob = -0.5 * (1 - u); lunge = 5 * (1 - u); open = 1.35 + (0.3 - 1.35) * u;
    }
    return {
      bob, breathe: 0, lunge, tilt: 0,
      rot: time * 0.5 + a * 14, open,
      feet: FOOT.map((x) => [x, 0]),
      eye: RED_HOT, glow: 1, blink: 0,
      sway: -2 * clamp01(lunge / 5)
    };
  }

  // Hurt: flinch back and shake, pincers snap shut, eye flashes then dims.
  function poseHurt(a) {
    const dec = clamp01(1 - a / 0.45);
    return {
      bob: 0.3 * dec, breathe: 0,
      lunge: -2.5 * dec + Math.sin(a * 70) * 0.8 * dec,
      tilt: -0.22 * dec,
      rot: a * 4, open: 0,
      feet: FOOT.map((x) => [x * (1 + 0.15 * dec), 0]),
      eye: a < 0.1 ? '#ffe6d6' : RED,
      glow: 0,
      blink: a > 0.1 && a < 0.3 ? 1 : 0,
      sway: 3 * dec * Math.sin(a * 30)
    };
  }

  function drawCrab(ctx, s, alpha) {
    const bx = BODY.x + s.lunge;
    const by = BODY.y + s.bob;
    const r = BODY.r + s.breathe;
    ctx.save();
    ctx.globalAlpha *= alpha == null ? 1 : clamp01(alpha);
    if (s.tilt) ctx.rotate(s.tilt); // pivots on the feet

    for (let i = 0; i < 4; i++) { // spring legs, behind the body
      const f = s.feet[i];
      spring(ctx, HIP[i][0] + s.lunge, HIP[i][1] + s.bob, f[0], f[1]);
      ART.ell(ctx, f[0], f[1] - 0.6, 1.4, 1, BRASS_DK, { lw: 1 });
    }

    // Pincers: the lower claw opens a little less than the upper one.
    claw(ctx, CLAW_UP.base[0] + s.lunge, CLAW_UP.base[1] + s.bob,
         CLAW_UP.wrist[0] + s.lunge, CLAW_UP.wrist[1] + s.bob, s.open);
    claw(ctx, CLAW_LO.base[0] + s.lunge, CLAW_LO.base[1] + s.bob,
         CLAW_LO.wrist[0] + s.lunge, CLAW_LO.wrist[1] + s.bob, s.open * 0.9);

    for (let i = 0; i < ANTENNA.length; i++) {
      const a = ANTENNA[i];
      antenna(ctx, a.base[0] + s.lunge, a.base[1] + s.bob, a.coil[0] + s.sway, a.coil[1] + s.bob);
    }

    ART.gear(ctx, bx, by, r, 9, s.rot, BRASS, { lw: 1.6 });
    for (let i = 0; i < 3; i++) { // rivets turn with the gear
      const an = s.rot + i * 2.094 + 0.5;
      ART.ell(ctx, bx + Math.cos(an) * r * 0.62, by + Math.sin(an) * r * 0.62, 0.7, 0.7, BRASS_DK, { stroke: false });
    }
    // Light from the upper left.
    ART.ell(ctx, bx - r * 0.5, by - r * 0.52, 2.2, 0.9, BRASS_LT, { stroke: false, alpha: 0.7, rot: -0.6 });

    const ex = bx + EYE[0], ey = by + EYE[1];
    if (s.glow > 0) ART.ell(ctx, ex, ey, 3.6, 3.6, RED_HOT, { stroke: false, alpha: 0.3 * s.glow });
    const ry = Math.max(0.35, 2 * (1 - clamp01(s.blink)));
    ART.ell(ctx, ex, ey, 2, ry, s.eye, { lw: 1.2 });
    if (ry > 1) ART.ell(ctx, ex - 0.6, ey - 0.7, 0.6, 0.45, '#fff1ea', { stroke: false, alpha: 0.9 });
    ctx.restore();
  }

  // Death: legs and claws fall away first, then the gears fly apart, land and fade.
  function drawDead(ctx, t) {
    if (t < 0.3) drawCrab(ctx, poseIdle(0), 1 - t / 0.3);
    const a = clamp01(1 - (t - 0.3) / 1.0);
    const ea = clamp01(1 - (t - 0.1) / 0.6);
    if (a <= 0 && ea <= 0) return;
    ctx.save();
    if (a > 0) {
      for (let i = 0; i < PARTS.length; i++) {
        const q = PARTS[i];
        const x = q.x + q.vx * t;
        const y = Math.min(q.y + q.vy * t + 0.5 * GRAV * t * t, -q.r); // comes to rest on the ground
        ART.gear(ctx, x, y, q.r, q.teeth, q.spin * t, BRASS, { lw: 1.4, alpha: a });
      }
    }
    if (ea > 0) { // the red eye bead
      ART.ell(ctx, 1.6 + 14 * t, -10.8 - 22 * t + 0.5 * GRAV * t * t, 1.3, 1.3, RED_HOT, { stroke: false, alpha: ea });
    }
    ctx.restore();
  }

  function draw(ctx, pose) {
    const p = pose || {};
    const t = Math.max(0, num(p.t, 0));
    const time = num(p.time, 0);
    switch (p.state) {
      case 'walk': return drawCrab(ctx, poseWalk(time));
      case 'attack': return drawCrab(ctx, poseAttack(t, time));
      case 'hurt': return drawCrab(ctx, poseHurt(t));
      case 'dead': return drawDead(ctx, t);
      default: return drawCrab(ctx, poseIdle(time)); // idle, and any unknown state
    }
  }

  // Stub portrait: a brass gear with a red eye.
  function portrait(ctx, expr, t) {
    ART.gear(ctx, 0, 0, 64, 12, num(t, 0) * 0.3, BRASS, { lw: 3 });
    ART.ell(ctx, 0, 0, 26, 26, RED, { lw: 3 });
    ART.ell(ctx, -8, -9, 7, 4, '#fff1ea', { stroke: false, alpha: 0.8 });
  }

  ART.register({ id: 'rouage', w: 26, h: 18, draw: draw, portrait: portrait });
})();
