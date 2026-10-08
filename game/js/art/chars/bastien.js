/* Bastien, station master of Vermeil: tall, thin, nervous, lives by the timetable.
   Drawn facing right; origin (0,0) = centre of the feet; y negative is up.
   Loaded after humanoid.js, so this sprite replaces its 'bastien' fallback. */
(function () {
  const clamp = ART.clamp;
  const PI = Math.PI;
  const num = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);
  const easeOut = (k) => 1 - Math.pow(1 - k, 3);

  const C = {
    navy: '#1f2d4a', navyDeep: '#152039', navyDark: '#101a2e',
    red: '#b8362e', brass: '#d9b35a', brassDark: '#9c7a2e',
    skin: '#f0c9a5', skinShade: '#d9a983', hair: '#3a2a22', browInk: '#2a1f1a',
    boot: '#1a1a1a', wood: '#8a5a34', paper: '#f7f1e0', ink: '#7d8aa0',
    shirt: '#f4efe6', mouth: '#3a1f22', lens: '#f6efe1', tear: '#9fd8ff',
  };
  const STATES = ['idle', 'walk', 'run', 'jump', 'fall', 'land', 'attack', 'dash', 'hurt', 'dead', 'talk', 'slow', 'frozen'];
  const EXPRS = ['neutral', 'happy', 'sad', 'angry', 'surprised', 'worried'];
  const HIP_Y = -24;                 // hip height above the feet
  const LEG_A = 12.5, LEG_B = 12;    // thigh, shin
  const ARM_A = 8.5, ARM_B = 8;      // upper arm, forearm
  const HEAD_X = 0.8, HEAD_Y = -22.5;
  const SHOULDER_N = [1.2, -14.8], SHOULDER_F = [-1.2, -14.8];

  // Two-bone IK: returns the knee/elbow joint between root a and target b. `side` picks the bend.
  function ik(ax, ay, bx, by, la, lb, side) {
    const dx = bx - ax, dy = by - ay;
    const len = Math.hypot(dx, dy) || 0.0001;
    const ux = dx / len, uy = dy / len;
    const d = clamp(len, Math.abs(la - lb) + 0.01, la + lb - 0.01);
    const a = (la * la - lb * lb + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, la * la - a * a));
    return {
      j: [ax + ux * a + uy * side * h, ay + uy * a - ux * side * h],
      e: [ax + ux * d, ay + uy * d],
    };
  }

  const blinkAt = (t) => (t % 3.4 < 0.12 ? 1 : 0);

  function stroke(ctx, pts, color, w) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();
  }

  /* ---------- body parts (sprite) ---------- */

  function drawLeg(ctx, hip, L, far) {
    const col = far ? C.navyDeep : C.navy;
    const j = L.j, e = L.e;
    ART.limb(ctx, hip[0], hip[1], j[0], j[1], 4.4, col, { lw: 1 });
    ART.limb(ctx, j[0], j[1], e[0], e[1], 4, col, { lw: 1 });
    if (!far) ART.limb(ctx, hip[0], hip[1], j[0], j[1], 0.9, C.red, { stroke: false });
    ART.ell(ctx, e[0] + 1, e[1] - 1.6, 3.2, 2, far ? '#111111' : C.boot, { lw: 1 });
  }

  function drawArm(ctx, sh, A, far) {
    const sleeve = far ? C.navyDeep : C.navy;
    const j = A.j, h = A.e;
    ART.limb(ctx, sh[0], sh[1], j[0], j[1], 3.8, sleeve, { lw: 1 });
    ART.limb(ctx, j[0], j[1], h[0], h[1], 3.4, sleeve, { lw: 1 });
    const c0 = [j[0] + (h[0] - j[0]) * 0.8, j[1] + (h[1] - j[1]) * 0.8];
    const c1 = [j[0] + (h[0] - j[0]) * 0.86, j[1] + (h[1] - j[1]) * 0.86];
    ART.limb(ctx, c0[0], c0[1], c1[0], c1[1], 3.6, C.red, { stroke: false });
    ART.ell(ctx, h[0], h[1], 1.7, 1.7, far ? C.skinShade : C.skin, { lw: 0.9 });
  }

  function drawTorso(ctx, up) {
    const P = (pts) => pts.map((q) => up(q[0], q[1]));
    ART.poly(ctx, P([[-5.5, 1], [5.5, 1], [5, -6], [6.5, -11], [6, -15], [3.5, -16.4],
      [-3.5, -16.4], [-6, -15], [-6.5, -11], [-5, -6]]), C.navy, { lw: 2 });
    stroke(ctx, P([[3.5, -16.4], [6, -15], [6.5, -11], [5, -6], [5.5, 1]]), C.red, 1.2);
    stroke(ctx, P([[-3.5, -16.4], [-6, -15], [-6.5, -11], [-5, -6], [-5.5, 1]]), C.red, 1.2);
    ART.poly(ctx, P([[-2.6, -16.4], [2.6, -16.4], [0, -12.6]]), C.shirt, { lw: 1 });
    ART.poly(ctx, P([[-1.8, -15], [1.8, -15], [1.8, -19], [-1.8, -19]]), C.skin, { lw: 1 });
    for (const y of [-11.5, -6.5, -1.5]) {
      const b = up(2.3, y);
      ART.ell(ctx, b[0], b[1], 0.9, 0.9, C.brass, { lw: 0.6 });
    }
  }

  // Head centred on h. Peaked cap with red band piping, brass badge, thin moustache.
  function drawHead(ctx, h, k) {
    const x = h[0], y = h[1];
    ART.ell(ctx, x, y, 6.6, 7.2, C.skin, { lw: 1.6 });
    ART.ell(ctx, x - 5.9, y + 0.8, 1.4, 2, C.skinShade, { lw: 0.9 });
    ART.poly(ctx, [[x - 6.2, y - 4.4], [x - 5, y + 1.6], [x - 3.2, y + 2.6], [x - 3.6, y - 4.6]], C.hair, { lw: 1 });
    ART.rr(ctx, x - 6.9, y - 12.4, 13.8, 7.8, 3.4, C.navy, { lw: 1.5 });
    stroke(ctx, [[x - 6.6, y - 4.6], [x + 6.4, y - 4.6]], C.red, 1.1);
    ART.poly(ctx, [[x + 1.2, y - 4.8], [x + 10.2, y - 4.2], [x + 10.8, y - 2.4], [x + 1.2, y - 2.2]], C.navyDark, { lw: 1.2 });
    ART.ell(ctx, x + 2.4, y - 8.4, 1.5, 1.5, C.brass, { lw: 0.8 });
    ART.eye(ctx, x + 3.4, y - 0.4, 1.5, k.look[0], k.look[1], k.blink, { lw: 1 });
    ART.ell(ctx, x + 6.1, y + 0.9, 0.9, 1.2, C.skinShade, { lw: 0.8 });
    stroke(ctx, [[x + 2.4, y + 2.7], [x + 4.6, y + 1.7], [x + 7, y + 2.5]], C.hair, 1.3);
    if (k.mouth > 0.05) ART.ell(ctx, x + 4.4, y + 4.7, 1.2, 0.3 + k.mouth * 1.1, C.mouth, { stroke: false });
    else stroke(ctx, [[x + 3.2, y + 4.7], [x + 5.4, y + 4.5]], C.mouth, 0.8);
  }

  // Pocket watch, held up while he glances at it.
  function drawWatch(ctx, h, g) {
    const x = h[0], y = h[1] - 1.2;
    ART.ell(ctx, x, y, 2.4, 2.4, C.brass, { lw: 0.9 });
    ART.ell(ctx, x, y, 1.6, 1.6, C.lens, { lw: 0.5 });
    const a = -PI / 2 + g * 0.6;
    stroke(ctx, [[x, y], [x + Math.cos(a) * 1.2, y + Math.sin(a) * 1.2]], C.navyDark, 0.7);
  }

  // Clipboard held by the hand (its bottom edge sits in the fist).
  function drawClipboard(ctx, h) {
    ctx.save();
    ctx.translate(h[0] + 0.8, h[1] - 4.4);
    ctx.rotate(-0.15);
    ART.rr(ctx, -4.2, -5.6, 8.4, 11.2, 1.2, C.wood, { lw: 1.2 });
    ART.rr(ctx, -3.2, -4.3, 6.4, 9, 0.6, C.paper, { lw: 0.6 });
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (const y of [-2, 0.4, 2.6]) { ctx.moveTo(-2.2, y); ctx.lineTo(2.2, y); }
    ctx.stroke();
    ART.rr(ctx, -1.7, -6.3, 3.4, 2.2, 0.6, C.brassDark, { lw: 0.8 });
    ctx.restore();
  }

  // Sweep of the clipboard swing (attack trail), drawn from the shoulder.
  function drawTrail(ctx, sh, arc, lean) {
    ctx.save();
    ctx.translate(sh[0], sh[1]);
    ctx.rotate(lean);
    const t1 = PI / 2 - arc.a0, t2 = PI / 2 - arc.a1;
    ctx.strokeStyle = 'rgba(255,240,200,0.55)';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, 14, Math.min(t1, t2), Math.max(t1, t2));
    ctx.stroke();
    ctx.restore();
  }

  // Speed lines behind him while dashing.
  function drawSpeed(ctx) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 3; i++) {
      const y = -17 - i * 8;
      ctx.beginPath();
      ctx.moveTo(-15 - i, y);
      ctx.lineTo(-8 - i * 2, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ---------- person states ---------- */

  function drawBastien(ctx, p) {
    const src = p || {};
    const st = STATES.indexOf(src.state) >= 0 ? src.state : 'idle';
    const t = Math.max(0, num(src.t));
    let tm = num(src.time);
    if (st === 'frozen') tm = 0;
    if (st === 'slow') tm *= 0.5;

    const k = {
      bob: 0, lean: 0, squash: 0, dip: 0, look: [0, 0], blink: blinkAt(tm), mouth: 0,
      fN: [1.6, 0], fF: [-1.6, 0],        // feet (absolute, near / far)
      hN: [5, 8], hF: [-0.5, 12],         // hands relative to their shoulder
      glance: 0, fall: 0, fade: 1, shake: 0, speed: false, arc: null,
    };

    // Idle family: breathing, tapping the clipboard, glancing at the pocket watch every 6 s.
    if (st === 'idle' || st === 'slow' || st === 'frozen') {
      const cyc = tm % 6;
      const g = cyc > 3.6 && cyc < 5 ? Math.sin(PI * (cyc - 3.6) / 1.4) : 0;
      const tap = Math.pow(Math.max(0, Math.sin(tm * 7.5)), 4);
      k.squash = Math.sin(tm * 2.6) * 0.015;
      k.hN = [5, 8 + tap * 1.6];
      k.hF = [-0.5 - g, 12 - 8 * g];
      k.glance = g;
      k.dip = g;
      k.look = [0.2 * g, 0.9 * g];
    }

    switch (st) {
      case 'walk':
      case 'run':
      case 'dash': {
        const ph = tm * (st === 'walk' ? 9 : st === 'run' ? 14 : 18);
        const S = st === 'walk' ? 3.4 : st === 'run' ? 5 : 6.2;
        const lift = st === 'walk' ? 2.6 : st === 'run' ? 4.2 : 5;
        const A = st === 'walk' ? 3.2 : st === 'run' ? 5 : 6;
        k.fN = [1.6 + Math.sin(ph) * S, -Math.max(0, Math.cos(ph)) * lift];
        k.fF = [-1.6 + Math.sin(ph + PI) * S, -Math.max(0, Math.cos(ph + PI)) * lift];
        k.bob = Math.abs(Math.sin(ph)) * (st === 'walk' ? 1.4 : st === 'run' ? 2.4 : 3);
        k.lean = st === 'walk' ? 0.05 : st === 'run' ? 0.16 : 0.3;
        k.hN = [Math.sin(ph + PI) * A, 10.5];   // arms swing against the legs
        k.hF = [Math.sin(ph) * A, 10.5];
        k.speed = st === 'dash';
        break;
      }
      case 'jump':
        k.fN = [3.6, -6.5]; k.fF = [-1.6, -12]; k.lean = -0.04;
        k.hN = [5, -8]; k.hF = [-3.5, -7];
        break;
      case 'fall':
        k.fN = [2.2, -2]; k.fF = [-1.2, -4]; k.lean = 0.06;
        k.hN = [8, -1.5]; k.hF = [-7.5, -1.5];
        break;
      case 'land': {
        const c = 1 - clamp(t / 0.22, 0, 1);
        k.bob = 4.5 * c; k.lean = 0.12 * c; k.squash = -0.1 * c;
        k.hN = [7, 2]; k.hF = [-7, 2];
        break;
      }
      case 'attack': {
        // windup back, then a swing through an arc with a trail
        const wind = clamp(t / 0.1, 0, 1);
        const swing = clamp((t - 0.1) / 0.28, 0, 1);
        const e = easeOut(swing);
        const a = swing > 0 ? -0.9 + 2.8 * e : -0.9 * wind;
        k.hN = [Math.sin(a) * 14, Math.cos(a) * 14];
        k.hF = [-4, 8];
        k.fN = [4, 0]; k.fF = [-3.4, 0];
        k.bob = 1.2 * e;
        k.lean = 0.08 + 0.14 * e;
        k.arc = { a0: -0.9, a1: a, on: swing > 0 && swing < 1 };
        break;
      }
      case 'hurt': {
        const f = clamp(1 - t / 0.5, 0, 1);
        k.lean = -0.28 * f; k.shake = Math.sin(t * 50) * 1.3 * f; k.bob = 0.8 * f;
        k.dip = -0.6 * f; k.hN = [4, -4]; k.hF = [-4, -1];
        k.blink = 0.85; k.mouth = 0.6;
        break;
      }
      case 'dead': {
        const f = clamp(t / 0.6, 0, 1);
        k.fall = -(PI / 2) * f * f;                       // tips backwards onto the platform
        k.fade = 1 - clamp((t - 0.5) / 0.9, 0, 1);
        k.hN = [6, 9]; k.hF = [-3, 9];
        k.blink = 1;
        break;
      }
      case 'talk':
        k.hN = [5 + Math.sin(tm * 6) * 1.5, 9 + Math.sin(tm * 11) * 0.8];
        k.dip = Math.sin(tm * 9) * 0.3;
        k.look = [0.3, 0];
        k.mouth = 0.25 + 0.75 * Math.max(0, Math.sin(tm * 14));
        break;
      default:
        break;
    }
    if (st === 'frozen') k.blink = 0;

    /* geometry */
    const hipY = HIP_Y + k.bob;
    const cl = Math.cos(k.lean), sl = Math.sin(k.lean);
    const up = (x, y) => {
      const yy = y * (1 + k.squash);
      return [x * cl - yy * sl, hipY + x * sl + yy * cl];
    };
    const rot = (v) => [v[0] * cl - v[1] * sl, v[0] * sl + v[1] * cl];
    const legN = ik(1.6, hipY, k.fN[0], k.fN[1], LEG_A, LEG_B, 1);
    const legF = ik(-1.6, hipY, k.fF[0], k.fF[1], LEG_A, LEG_B, 1);
    const shN = up(SHOULDER_N[0], SHOULDER_N[1]);
    const shF = up(SHOULDER_F[0], SHOULDER_F[1]);
    const rN = rot(k.hN), rF = rot(k.hF);
    const armN = ik(shN[0], shN[1], shN[0] + rN[0], shN[1] + rN[1], ARM_A, ARM_B, -1);
    const armF = ik(shF[0], shF[1], shF[0] + rF[0], shF[1] + rF[1], ARM_A, ARM_B, -1);

    /* drawing, back to front */
    ctx.save();
    if (k.shake) ctx.translate(k.shake, 0);
    if (k.fall) ctx.rotate(k.fall);
    ctx.globalAlpha *= clamp(k.fade, 0, 1);
    if (st === 'frozen' && 'filter' in ctx) ctx.filter = 'grayscale(0.8) brightness(1.08)';
    if (k.speed) drawSpeed(ctx);
    drawLeg(ctx, [-1.6, hipY], legF, true);
    if (k.glance <= 0.3) drawArm(ctx, shF, armF, true);
    drawLeg(ctx, [1.6, hipY], legN, false);
    drawTorso(ctx, up);
    drawHead(ctx, up(HEAD_X, HEAD_Y + k.dip), k);
    if (k.glance > 0.3) {
      drawArm(ctx, shF, armF, true);
      drawWatch(ctx, armF.e, k.glance);
    }
    drawArm(ctx, shN, armN, false);
    drawClipboard(ctx, armN.e);
    if (k.arc && k.arc.on) drawTrail(ctx, shN, k.arc, k.lean);
    if (st === 'slow') ART.ell(ctx, 0, -1, 12, 3, C.tear, { stroke: false, alpha: 0.3 });
    ctx.restore();
  }

  /* ---------- portrait (200 x 200 box, bust centred on 0,0) ---------- */

  function drawPortrait(ctx, expr, t) {
    const e = EXPRS.indexOf(expr) >= 0 ? expr : 'neutral';
    const OUT = ART.OUT;
    const blink = e !== 'happy' && e !== 'surprised' && blinkAt(num(t)) === 1;
    const gaze = {
      neutral: [0.3, 0], happy: [0.3, 0], sad: [0, 0.6],
      angry: [0, 0], surprised: [0, -0.2], worried: [-0.6, -0.5],
    }[e];

    // jacket, shirt panel with red piping, brass buttons
    ART.poly(ctx, [[-96, 100], [-88, 70], [-62, 54], [-30, 46], [30, 46], [62, 54], [88, 70], [96, 100]], C.navy, { lw: 2.4 });
    ART.poly(ctx, [[-15, 46], [15, 46], [22, 100], [-22, 100]], C.shirt, { lw: 1.4 });
    stroke(ctx, [[-15, 46], [-22, 100]], C.red, 3);
    stroke(ctx, [[15, 46], [22, 100]], C.red, 3);
    ART.ell(ctx, 0, 70, 3.4, 3.4, C.brass, { lw: 1.4 });
    ART.ell(ctx, 0, 88, 3.4, 3.4, C.brass, { lw: 1.4 });

    // neck, collar, ears, head
    ART.rr(ctx, -14, 22, 28, 30, 8, C.skin, { lw: 2 });
    ART.poly(ctx, [[-16, 46], [16, 46], [9, 58], [0, 64], [-9, 58]], C.shirt, { lw: 1.6 });
    ART.ell(ctx, -41, -4, 7, 11, C.skinShade, { lw: 2 });
    ART.ell(ctx, 41, -4, 7, 11, C.skinShade, { lw: 2 });
    ART.ell(ctx, 0, -6, 40, 46, C.skin, { lw: 2.4 });
    for (const s of [-1, 1]) {
      ART.poly(ctx, [[s * 37, -30], [s * 41, -4], [s * 36, 8], [s * 32, -14]], C.hair, { lw: 1.6 });
    }

    // peaked cap: crown, band with piping, visor, brass badge
    ART.rr(ctx, -46, -100, 92, 56, 24, C.navy, { lw: 2.4 });
    ART.rr(ctx, -47, -51, 94, 9, 3, C.navyDark, { lw: 2 });
    stroke(ctx, [[-44, -51], [44, -51]], C.red, 2);
    stroke(ctx, [[-45, -42], [45, -42]], C.red, 2);
    ART.poly(ctx, [[-52, -42], [52, -42], [60, -32], [-60, -32]], C.navyDark, { lw: 2.4 });
    stroke(ctx, [[-58, -32], [58, -32]], C.red, 2);
    ART.ell(ctx, 0, -72, 9.5, 9.5, C.brass, { lw: 2 });
    ART.ell(ctx, 0, -72, 4.8, 4.8, C.navyDark, { lw: 1.2 });

    // brows
    const BROW = {
      neutral: [[28, -12], [18, -16], [8, -13]],
      happy: [[28, -10], [18, -21], [8, -12]],
      sad: [[28, -9], [18, -13], [8, -19]],
      angry: [[28, -22], [18, -15], [8, -10]],
      surprised: [[28, -18], [18, -30], [8, -22]],
      worried: [[28, -10], [18, -12], [8, -20]],
    }[e];
    ctx.save();
    ctx.strokeStyle = C.browInk;
    ctx.lineWidth = 4.2;
    ctx.lineCap = 'round';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * BROW[0][0], BROW[0][1]);
      ctx.quadraticCurveTo(s * BROW[1][0], BROW[1][1], s * BROW[2][0], BROW[2][1]);
      ctx.stroke();
    }
    ctx.restore();

    // eyes
    for (const s of [-1, 1]) {
      const ex = s * 17, ey = 2;
      if (e === 'happy') {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(ex - 7, ey + 2);
        ctx.quadraticCurveTo(ex, ey - 9, ex + 7, ey + 2);
        ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();
      } else if (blink) {
        stroke(ctx, [[ex - 7, ey], [ex + 7, ey]], OUT, 2.4);
      } else {
        const r = e === 'surprised' ? 9 : 7.5;
        const lid = e === 'sad' ? 0.35 : e === 'angry' ? 0.5 : 0;
        ART.eye(ctx, ex, ey, r, gaze[0], gaze[1], lid, { lw: 2.2 });
      }
    }

    // nose and thin moustache
    stroke(ctx, [[4, 6], [8, 14], [2, 18], [-3, 18]], OUT, 2);
    ctx.save();
    ctx.strokeStyle = C.hair; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * 2, 26);
      ctx.quadraticCurveTo(s * 14, 19, s * 28, 25);
      ctx.quadraticCurveTo(s * 33, 26, s * 31, 31);
      ctx.stroke();
    }
    ctx.restore();

    // mouth
    ctx.save();
    ctx.strokeStyle = C.mouth; ctx.fillStyle = C.mouth; ctx.lineCap = 'round'; ctx.lineWidth = 2.8;
    ctx.beginPath();
    if (e === 'happy') {
      ctx.moveTo(-14, 34); ctx.quadraticCurveTo(0, 50, 14, 34); ctx.stroke();
    } else if (e === 'sad') {
      ctx.moveTo(-12, 46); ctx.quadraticCurveTo(0, 31, 12, 46); ctx.stroke();
    } else if (e === 'angry') {
      ctx.lineWidth = 3.6; ctx.moveTo(-11, 41); ctx.lineTo(11, 37); ctx.stroke();
    } else if (e === 'worried') {
      ctx.moveTo(-12, 41); ctx.quadraticCurveTo(-6, 34, 0, 41); ctx.quadraticCurveTo(6, 48, 12, 41); ctx.stroke();
    } else if (e === 'surprised') {
      ctx.ellipse(0, 41, 6, 8, 0, 0, PI * 2); ctx.fill();
    } else {
      ctx.moveTo(-9, 39); ctx.lineTo(9, 39); ctx.stroke();
    }
    ctx.restore();

    // expression extras: blush, sweat, tear
    if (e === 'happy' || e === 'angry') {
      for (const s of [-1, 1]) {
        ART.ell(ctx, s * 27, 18, 7, 4.2, e === 'angry' ? '#d4483c' : '#e8836f', { stroke: false, alpha: 0.45 });
      }
    }
    if (e === 'worried') {
      ART.poly(ctx, [[-50, -26], [-55, -16], [-45, -16]], C.tear, { lw: 1.6 });
      ART.ell(ctx, -50, -14, 5, 5, C.tear, { lw: 1.6 });
    }
    if (e === 'sad') ART.ell(ctx, -17, 13, 2.4, 3.4, C.tear, { lw: 1.2 });
  }

  ART.register({
    id: 'bastien', w: 26, h: 50,
    draw(ctx, p) { drawBastien(ctx, p); },
    portrait(ctx, expr, t) { drawPortrait(ctx, expr, t); },
  });
})();
