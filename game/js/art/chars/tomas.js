/* Tomas (8): Mireille's little brother, frozen mid-laugh with a bread roll.
   Drawn facing right; origin (0,0) = centre of the feet; y negative is up.
   Idle and frozen carry a slight grey stillness; moving states bring the colour back.
   Registers 'tomas' with ART. */
(function () {
  const OUT = ART.OUT;
  const clamp = ART.clamp;
  const lerp = ART.lerp;

  const PAL = {
    navy: '#2d3f6e', cream: '#f1e7d0', skin: '#f1c7a0', skinDk: '#d9a27a',
    hair: '#8c5a2e', hairLt: '#b98049', brow: '#3b2516', cheek: '#ef8a82', red: '#e0584f',
    mouth: '#4a1a24', tongue: '#e26a6c', teeth: '#fbf7ee', tear: '#8fd0ff',
    pants: '#6b4a2a', pantsDk: '#4e331c', boot: '#3a2a22', bootDk: '#2a1d17',
    crust: '#e6a95e', crumb: '#f8dfae', score: '#a86a2c'
  };

  // Rig in px. Legs hang from the pelvis (hip y = 0 in leg space); the upper body is drawn in pelvis space.
  const LEG1 = 4.6, LEG2 = 4.2, LEG_REST = LEG1 + LEG2;
  const ARM1 = 3.2, ARM2 = 2.8;
  const HIP_NEAR = 1.0, HIP_FAR = -1.0;
  const SH_NEAR = [2.0, -6.2], SH_FAR = [-1.8, -6.4];
  const HEAD = [0.5, -14.6];
  const HAIR_HEAD = [[-6.9, 0.4], [-6.5, -3.2], [-5.0, -5.6], [-4.0, -8.4], [-2.2, -6.4], [-0.8, -9.2], [0.8, -6.6],
    [2.6, -8.6], [3.6, -5.8], [5.2, -6.4], [6.2, -3.4], [6.9, -1.4], [5.4, -1.7], [3.4, -2.9], [1.4, -1.7],
    [-0.5, -2.6], [-2.8, -1.4], [-4.9, -1.8], [-6.1, 0.6]];

  const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
  const smooth = (x) => { const u = clamp(x, 0, 1); return u * u * (3 - 2 * u); };

  /* Mixes a '#rrggbb' colour toward its luminance by g (0 = untouched, 1 = grey). */
  function tone(hex, g) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m || !g) return hex;
    const n = parseInt(m[1], 16);
    const r = (n >> 16) & 255, gg = (n >> 8) & 255, b = n & 255;
    const L = 0.3 * r + 0.59 * gg + 0.11 * b;
    const f = clamp(g, 0, 1);
    const mix = (c) => Math.round(c + (L - c) * f);
    return '#' + [mix(r), mix(gg), mix(b)].map((v) => v.toString(16).padStart(2, '0')).join('');
  }

  function rrPath(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.lineTo(x + w - r, y);
    g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h - r);
    g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    g.lineTo(x + r, y + h);
    g.quadraticCurveTo(x, y + h, x, y + h - r);
    g.lineTo(x, y + r);
    g.quadraticCurveTo(x, y, x + r, y);
    g.closePath();
  }

  function strokePath(ctx, lw, color, build) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    build(ctx);
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.stroke();
    ctx.restore();
  }

  /* A jointed limb (polyline) with a dark outline, so joints do not show seams. */
  function bone(ctx, pts, w, color) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = w + 2.2;
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.stroke();
    ctx.restore();
  }

  /* Pose: angles are measured from straight down; positive = forward (toward the facing side). */
  function poseOf(p) {
    const st = typeof p.state === 'string' ? p.state : 'idle';
    const t = num(p.t, 0), time = num(p.time, 0);
    const q = {
      ground: true, lift: 0, bob: 0, lean: 0, tilt: -0.12, rot: 0, alpha: 1, grey: 0.2,
      nA: 1.1, nB: 1.1, fA: -0.9, fB: 0.6,          // arms: shoulder angle, elbow bend
      nL: 0.6, nF: 1.0, fL: -0.35, fF: 0.15,        // legs: hip angle, knee flex (one knee bent mid-run)
      mouth: 'laugh', eyes: 'happy', tears: false, trail: null, streaks: false
    };
    let ph, s, c;
    switch (st) {
      case 'frozen':
        q.grey = 0.3;
        break;
      case 'slow': {
        const br = Math.sin(time * 0.9);
        q.bob = 0.25 * br; q.nA += 0.02 * br; q.grey = 0.22;
        break;
      }
      case 'walk':
        ph = time * 6.5; s = Math.sin(ph); c = Math.cos(ph);
        q.nL = 0.42 * s; q.nF = 0.6 * Math.max(0, c) + 0.05;
        q.fL = -0.42 * s; q.fF = 0.6 * Math.max(0, -c) + 0.05;
        q.bob = -0.5 * Math.cos(2 * ph); q.lean = 0.03; q.tilt = -0.12 + 0.04 * Math.cos(2 * ph);
        q.nA = 0.9 - 0.5 * s; q.nB = 1.2; q.fA = 0.5 * s; q.fB = 0.6; q.grey = 0;
        break;
      case 'run':
        ph = time * 11.5; s = Math.sin(ph); c = Math.cos(ph);
        q.nL = 0.85 * s; q.nF = 1.0 * Math.max(0, c) + 0.25;
        q.fL = -0.85 * s; q.fF = 1.0 * Math.max(0, -c) + 0.25;
        q.bob = -0.7 * Math.cos(2 * ph); q.lean = 0.2; q.tilt = -0.3 + 0.08 * Math.sin(2 * ph);
        q.nA = 0.4 - 1.0 * s; q.nB = 1.7; q.fA = 0.4 + 1.0 * s; q.fB = 1.6; q.grey = 0;
        break;
      case 'jump':
        q.ground = false;
        q.nL = 0.95; q.nF = 1.5; q.fL = 0.45; q.fF = 1.4;
        q.nA = 2.6; q.nB = 0.3; q.fA = 2.3; q.fB = 0.25;
        q.lean = -0.05; q.tilt = -0.3; q.grey = 0;
        break;
      case 'fall':
        q.ground = false;
        q.nL = 0.2; q.nF = 0.35; q.fL = -0.25; q.fF = 0.4;
        q.nA = 2.3 + 0.25 * Math.sin(time * 10); q.nB = 0.35;
        q.fA = -2.1 + 0.25 * Math.cos(time * 10); q.fB = 0.25;
        q.lean = -0.1; q.tilt = -0.25; q.eyes = 'wide'; q.mouth = 'shout'; q.grey = 0;
        break;
      case 'land': {
        const k = clamp(1 - t / 0.22, 0, 1);
        q.nL = 0.3 * k; q.nF = 1.3 * k + 0.15; q.fL = -0.3 * k; q.fF = 1.3 * k + 0.15;
        q.nA = 1.2 + 0.9 * k; q.nB = 0.5; q.fA = -1.2 - 0.6 * k; q.fB = 0.3;
        q.lean = 0.1 * k; q.tilt = -0.15; q.eyes = k > 0.5 ? 'squeeze' : 'happy'; q.grey = 0;
        break;
      }
      case 'attack': {
        let a = 2.2, b = 0.8;
        if (t < 0.08) {                      // anticipation: the roll is pulled back
          const u = smooth(t / 0.08);
          a = lerp(2.2, -1.4, u); q.lean = -0.06 * u;
        } else if (t < 0.2) {                // the swing, with a trail
          const u = smooth((t - 0.08) / 0.12);
          a = lerp(-1.4, 2.5, u); b = lerp(0.8, 0.1, u); q.lean = lerp(-0.06, 0.25, u);
          q.trail = [-1.4, a];
        } else {                             // recovery
          const u = smooth((t - 0.2) / 0.2);
          a = lerp(2.5, 2.2, u); b = lerp(0.1, 0.8, u); q.lean = lerp(0.25, 0, u);
        }
        q.nA = a; q.nB = b;
        q.nL = 0.35; q.nF = 0.25; q.fL = -0.45; q.fF = 0.2; q.fA = -0.7; q.fB = 0.5;
        q.mouth = 'shout'; q.grey = 0;
        break;
      }
      case 'dash':
        q.lean = 0.55; q.tilt = -0.35;
        q.nL = -0.9; q.nF = 0.35; q.fL = -1.25; q.fF = 0.45;
        q.nA = -1.9; q.nB = 0.3; q.fA = -1.6; q.fB = 0.25;
        q.eyes = 'wide'; q.streaks = true; q.grey = 0;
        break;
      case 'hurt': {
        const k = clamp(1 - t / 0.4, 0, 1);
        q.lean = -0.12 - 0.25 * k; q.tilt = 0.25;
        q.nA = 2.4 + 0.2 * Math.sin(time * 20); q.nB = 0.3; q.fA = -2.2; q.fB = 0.2;
        q.nL = -0.25; q.nF = 0.45; q.fL = 0.3; q.fF = 0.35;
        q.eyes = 'squeeze'; q.mouth = 'ow'; q.tears = true; q.grey = 0;
        break;
      }
      case 'dead': {
        const k = clamp(t / 0.5, 0, 1);
        q.ground = false; q.rot = (Math.PI / 2) * k * k;
        q.alpha = 1 - clamp((t - 0.6) / 1.0, 0, 1);
        q.grey = 0.3 + 0.4 * clamp(t / 1.2, 0, 1);
        q.nL = 0.2; q.nF = 0.2; q.fL = -0.2; q.fF = 0.2;
        q.nA = 2.0; q.nB = 0.2; q.fA = -1.6; q.fB = 0.2; q.tilt = 0.4;
        q.eyes = 'closed'; q.mouth = 'none';
        break;
      }
      case 'talk':                           // happy hop, arms waving
        ph = time * 8.5; s = Math.sin(ph);
        q.lift = -3.0 * Math.abs(s); q.lean = 0.04 * s; q.tilt = -0.18 + 0.12 * s;
        q.nL = 0.25 * s; q.fL = -0.25 * s;
        q.nF = 0.45 + 0.8 * Math.abs(s); q.fF = q.nF;
        q.nA = 2.5 + 0.5 * Math.sin(time * 10); q.nB = 0.6 + 0.35 * Math.sin(time * 10 + 1);
        q.fA = 2.2 + 0.5 * Math.sin(time * 10 + Math.PI); q.fB = 0.6 + 0.35 * Math.sin(time * 10 + Math.PI + 1);
        q.grey = 0;
        break;
      default: {                             // idle, and any unknown state: breathing, frozen grin
        const br = Math.sin(time * 2.4);
        q.bob = 0.3 * br; q.lean = 0.02 * br; q.nA += 0.04 * br; q.tilt += 0.02 * br;
        q.grey = 0.2;
      }
    }
    return q;
  }

  function legGeom(hipX, a, f) {
    const kx = hipX + LEG1 * Math.sin(a), ky = LEG1 * Math.cos(a);
    const fx = kx + LEG2 * Math.sin(a - f), fy = ky + LEG2 * Math.cos(a - f);
    return { hip: [hipX, 0], knee: [kx, ky], foot: [fx, fy] };
  }

  function armPts(sh, a, b) {
    const ex = sh[0] + ARM1 * Math.sin(a), ey = sh[1] + ARM1 * Math.cos(a);
    const k = a + b;
    return [[sh[0], sh[1]], [ex, ey], [ex + ARM2 * Math.sin(k), ey + ARM2 * Math.cos(k)]];
  }

  function drawLeg(ctx, L, hipY, pants, boot, C) {
    const pts = [[L.hip[0], hipY], [L.knee[0], hipY + L.knee[1]], [L.foot[0], hipY + L.foot[1]]];
    bone(ctx, pts, 3.4, C(pants));
    ART.ell(ctx, L.foot[0] + 0.9, hipY + L.foot[1] - 1.1, 2.4, 1.35, C(boot), { lw: 1 });
  }

  function drawArm(ctx, pts, sleeve, hand, cuff, C) {
    bone(ctx, pts, 3.4, C(sleeve));
    if (cuff) {
      const wx = pts[1][0] + 0.8 * (pts[2][0] - pts[1][0]);
      const wy = pts[1][1] + 0.8 * (pts[2][1] - pts[1][1]);
      ART.ell(ctx, wx, wy, 1.7, 1.7, C(PAL.cream), { lw: 0.9 });
    }
    ART.ell(ctx, pts[2][0], pts[2][1], 1.4, 1.4, C(hand), { lw: 0.9 });
  }

  function drawTorso(ctx, C) {
    const x = -3.7, y = -7.6, w = 7.4, h = 8.6;
    ctx.save();
    rrPath(ctx, x, y, w, h, 3);
    ctx.fillStyle = C(PAL.navy);
    ctx.fill();
    ctx.clip();
    ctx.fillStyle = C(PAL.cream);
    [-5.8, -3.4, -1.0].forEach((sy) => ctx.fillRect(x - 1, sy, w + 2, 1.3));
    ctx.restore();
    strokePath(ctx, 1.2, OUT, (g) => rrPath(g, x, y, w, h, 3));
    ART.ell(ctx, 0.2, -7.4, 2.9, 1.2, C(PAL.cream), { lw: 0.9 });
  }

  function drawEye(ctx, x, y, e, mode) {
    if (mode === 'squeeze') {
      strokePath(ctx, 1.0, OUT, (g) => { g.moveTo(x - e, y - 0.2); g.quadraticCurveTo(x, y + e * 1.3, x + e, y - 0.2); });
    } else if (mode === 'closed') {
      strokePath(ctx, 1.0, OUT, (g) => { g.moveTo(x - e, y); g.lineTo(x + e, y); });
    } else if (mode === 'wide') {
      ART.eye(ctx, x, y, e * 0.9, 0.3, 0, 0, { lw: 0.9 });
    } else {                                 // happy: closed laughing crescent
      strokePath(ctx, 1.0, OUT, (g) => { g.moveTo(x - e, y + 0.4); g.quadraticCurveTo(x, y - e * 1.4, x + e, y + 0.4); });
    }
  }

  function drawMouth(ctx, q, C) {
    const m = q.mouth;
    if (m === 'laugh') {
      const path = (g) => {
        g.beginPath();
        g.moveTo(1.4, 2.4);
        g.quadraticCurveTo(3.6, 3.9, 5.6, 2.2);
        g.quadraticCurveTo(5.0, 6.6, 3.3, 6.6);
        g.quadraticCurveTo(1.6, 6.4, 1.4, 2.4);
        g.closePath();
      };
      ctx.save();
      path(ctx);
      ctx.fillStyle = C(PAL.mouth);
      ctx.fill();
      ctx.save();
      path(ctx);
      ctx.clip();
      ctx.fillStyle = C(PAL.teeth);
      ctx.fillRect(1, 1.4, 5, 1.1);
      ctx.beginPath();
      ctx.ellipse(3.5, 5.6, 1.7, 0.95, 0, 0, Math.PI * 2);
      ctx.fillStyle = C(PAL.tongue);
      ctx.fill();
      ctx.restore();
      path(ctx);
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 0.9;
      ctx.stroke();
      ctx.restore();
    } else if (m === 'shout') {
      ART.ell(ctx, 3.7, 4.0, 1.6, 2.0, C(PAL.mouth), { lw: 0.9 });
    } else if (m === 'ow') {
      ART.ell(ctx, 3.8, 3.8, 1.3, 1.9, C(PAL.mouth), { lw: 0.9 });
    } else if (m === 'none') {
      strokePath(ctx, 0.9, OUT, (g) => { g.moveTo(2.2, 3.6); g.quadraticCurveTo(3.6, 4.0, 5.2, 3.4); });
    }
  }

  function drawHead(ctx, q, C) {
    ART.ell(ctx, -1.5, 1.0, 1.4, 1.9, C(PAL.skinDk), { lw: 1 });                 // ear
    ART.ell(ctx, 0, 0, 6.6, 6.3, C(PAL.skin), { lw: 1.2 });                      // face
    ART.ell(ctx, 2.2, 1.6, 1.5, 0.9, C(PAL.cheek), { stroke: false, alpha: 0.85 }); // rosy cheek
    ART.ell(ctx, 5.9, 0.5, 0.6, 0.5, C(PAL.skinDk), { lw: 0.7 });                // nose
    drawEye(ctx, 3.6, -0.9, 1.3, q.eyes);
    drawEye(ctx, 1.0, -0.7, 1.0, q.eyes);
    drawMouth(ctx, q, C);
    if (q.tears) ART.ell(ctx, 4.9, 1.4, 0.7, 1.0, C(PAL.tear), { lw: 0.7 });
    ART.poly(ctx, HAIR_HEAD, C(PAL.hair), { lw: 1.1 });                          // short, messy hair
    strokePath(ctx, 0.9, C(PAL.hairLt), (g) => { g.moveTo(-4.4, -4.2); g.quadraticCurveTo(-2.6, -6.2, -0.6, -6.4); });
  }

  function drawTrail(ctx, trail) {
    const s0 = Math.PI / 2 - trail[0], s1 = Math.PI / 2 - trail[1];
    ctx.save();
    ctx.beginPath();
    ctx.arc(SH_NEAR[0], SH_NEAR[1], ARM1 + ARM2, s0, s1, s1 < s0);
    ctx.strokeStyle = 'rgba(255,250,235,0.55)';
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
  }

  function drawStreaks(ctx, time) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1.2;
    const off = (time * 60) % 8;
    for (let i = 0; i < 3; i++) {
      const y = -13 + i * 5;
      ctx.beginPath();
      ctx.moveTo(-14 - off + i, y);
      ctx.lineTo(-9 - off + i, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function bread(ctx, x, y, rot, C) {
    ART.ell(ctx, x, y, 3.0, 1.9, C(PAL.crust), { rot, lw: 1.1 });
    ART.ell(ctx, x - 0.3, y - 0.6, 2.0, 0.85, C(PAL.crumb), { rot, stroke: false });
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    strokePath(ctx, 0.9, C(PAL.score), (g) => { g.moveTo(-1.7, 0.2); g.quadraticCurveTo(0, -0.9, 1.7, 0.1); });
    ctx.restore();
  }

  function draw(ctx, p) {
    const q = poseOf(p);
    const time = num(p.time, 0);
    const legN = legGeom(HIP_NEAR, q.nL, q.nF);
    const legF = legGeom(HIP_FAR, q.fL, q.fF);
    const lowest = Math.max(legN.foot[1], legF.foot[1]);
    const hipY = (q.ground ? -lowest : -LEG_REST) + q.lift;   // grounded: the lowest foot sits on y = 0
    const upperY = hipY + q.bob;
    const C = (hex) => tone(hex, q.grey);

    if (q.alpha < 1) ctx.globalAlpha *= q.alpha;
    if (q.rot) ctx.rotate(q.rot);
    if (q.streaks) drawStreaks(ctx, time);

    drawLeg(ctx, legF, hipY, PAL.pantsDk, PAL.bootDk, C);
    drawLeg(ctx, legN, hipY, PAL.pants, PAL.boot, C);

    ctx.save();
    ctx.translate(0, upperY);
    ctx.rotate(q.lean);
    drawArm(ctx, armPts(SH_FAR, q.fA, q.fB), ART.shade(PAL.navy, -0.2), ART.shade(PAL.skin, -0.1), false, C);
    ART.rr(ctx, -0.9, -10.2, 2.8, 3.4, 1.0, C(PAL.skinDk), { lw: 0.9 });        // neck
    drawTorso(ctx, C);
    ctx.save();
    ctx.translate(HEAD[0], HEAD[1]);
    ctx.rotate(q.tilt);
    drawHead(ctx, q, C);
    ctx.restore();
    if (q.trail) drawTrail(ctx, q.trail);
    const near = armPts(SH_NEAR, q.nA, q.nB);
    drawArm(ctx, near, PAL.navy, PAL.skin, true, C);
    bread(ctx, near[2][0] + 0.6, near[2][1] - 0.6, -0.5, C);                    // the roll, held out in front
    ctx.restore();
  }

  /* ---------- portrait (200x200 box centred on 0,0) ---------- */

  const FRINGE = [[-54, -14], [-50, -46], [-30, -60], [-8, -54], [12, -64], [34, -58], [54, -44], [54, -14],
    [40, -30], [22, -38], [4, -46], [-12, -38], [-28, -42], [-40, -30], [-52, -14]];
  const SPIKES = [[-58, -30], [-70, -62], [-50, -64], [-46, -92], [-26, -74], [-12, -100], [8, -78], [24, -98],
    [36, -76], [60, -84], [60, -40], [0, -30]];

  const EXPR = {
    neutral: { brows: [[-36, -40, -12, -42], [12, -42, 36, -40]], eyes: 'happy', mouth: 'grin', cheek: 0.8 },
    happy: { brows: [[-36, -42, -12, -46], [12, -46, 36, -42]], eyes: 'happy', mouth: 'laugh', cheek: 1 },
    sad: { brows: [[-36, -30, -12, -40], [12, -40, 36, -30]], eyes: 'sad', mouth: 'frown', cheek: 0, tear: true },
    angry: { brows: [[-38, -46, -12, -32], [12, -32, 38, -46]], eyes: 'angry', mouth: 'shout', cheek: 0.55, red: true },
    surprised: { brows: [[-40, -44, -12, -52], [12, -52, 40, -44]], eyes: 'wide', mouth: 'o', cheek: 0 },
    worried: { brows: [[-36, -30, -12, -46], [12, -46, 36, -30]], eyes: 'worry', mouth: 'wobble', cheek: 0.2, sweat: true }
  };

  function jumperPath(g) {
    g.beginPath();
    g.moveTo(-100, 100);
    g.lineTo(-100, 80);
    g.quadraticCurveTo(-98, 52, -62, 46);
    g.quadraticCurveTo(-34, 38, 0, 38);
    g.quadraticCurveTo(34, 38, 62, 46);
    g.quadraticCurveTo(98, 52, 100, 80);
    g.lineTo(100, 100);
    g.closePath();
  }

  function portraitMouth(ctx, kind) {
    if (kind === 'laugh') {
      const path = (g) => {
        g.beginPath();
        g.moveTo(-32, 20);
        g.quadraticCurveTo(0, 34, 32, 20);
        g.quadraticCurveTo(30, 70, 0, 72);
        g.quadraticCurveTo(-30, 70, -32, 20);
        g.closePath();
      };
      ctx.save();
      path(ctx);
      ctx.fillStyle = PAL.mouth;
      ctx.fill();
      ctx.clip();
      ctx.fillStyle = PAL.teeth;
      ctx.fillRect(-32, 14, 64, 14);
      ctx.beginPath();
      ctx.ellipse(0, 60, 20, 11, 0, 0, Math.PI * 2);
      ctx.fillStyle = PAL.tongue;
      ctx.fill();
      ctx.restore();
      strokePath(ctx, 3, OUT, path);
    } else if (kind === 'grin') {
      const path = (g) => {
        g.beginPath();
        g.moveTo(-26, 30);
        g.quadraticCurveTo(0, 42, 26, 30);
        g.quadraticCurveTo(18, 56, 0, 56);
        g.quadraticCurveTo(-18, 56, -26, 30);
        g.closePath();
      };
      ctx.save();
      path(ctx);
      ctx.fillStyle = PAL.mouth;
      ctx.fill();
      ctx.clip();
      ctx.fillStyle = PAL.teeth;
      ctx.fillRect(-26, 26, 52, 9);
      ctx.restore();
      strokePath(ctx, 3, OUT, path);
    } else if (kind === 'frown') {
      strokePath(ctx, 4.5, OUT, (g) => { g.moveTo(-24, 58); g.quadraticCurveTo(0, 36, 24, 58); });
    } else if (kind === 'shout') {
      ART.rr(ctx, -26, 28, 52, 36, 14, PAL.mouth, { lw: 3 });
      ART.ell(ctx, 0, 56, 13, 5, PAL.tongue, { stroke: false });
      ART.rr(ctx, -20, 30, 40, 8, 3, PAL.teeth, { lw: 1.5 });
    } else if (kind === 'o') {
      ART.ell(ctx, 0, 44, 14, 18, PAL.mouth, { lw: 3 });
      ART.ell(ctx, 0, 54, 7, 5, PAL.tongue, { stroke: false });
    } else if (kind === 'wobble') {
      strokePath(ctx, 4, OUT, (g) => {
        g.moveTo(-26, 50);
        g.quadraticCurveTo(-16, 40, -8, 50);
        g.quadraticCurveTo(0, 60, 8, 50);
        g.quadraticCurveTo(16, 40, 26, 50);
      });
    }
  }

  function drawPortrait(ctx, expr, t) {
    const key = Object.prototype.hasOwnProperty.call(EXPR, expr) ? expr : 'neutral';
    const E = EXPR[key];
    const blink = num(t, 0) % 3.4 < 0.12 ? 1 : 0;
    const eyeY = -14;

    ctx.save();
    jumperPath(ctx);
    ctx.fillStyle = PAL.navy;
    ctx.fill();
    ctx.clip();
    ctx.fillStyle = PAL.cream;
    [60, 74, 88].forEach((y) => ctx.fillRect(-100, y, 200, 7));
    ctx.restore();
    strokePath(ctx, 3, OUT, jumperPath);

    ART.rr(ctx, -22, 14, 44, 36, 14, PAL.skinDk, { lw: 3 });                    // neck
    ART.ell(ctx, 0, 40, 34, 10, PAL.cream, { lw: 3 });                          // crew collar

    ART.ell(ctx, 0, -34, 62, 46, PAL.hair, { lw: 3 });                          // hair mass behind the head
    ART.poly(ctx, SPIKES, PAL.hair, { lw: 3 });
    ART.ell(ctx, -50, -8, 10, 14, PAL.skin, { lw: 3 });                         // ears
    ART.ell(ctx, 50, -8, 10, 14, PAL.skin, { lw: 3 });
    ART.ell(ctx, 0, -12, 50, 56, PAL.skin, { lw: 3 });                          // face
    ART.ell(ctx, 24, 18, 26, 22, PAL.skinDk, { stroke: false, alpha: 0.18 });  // jaw shade
    ART.poly(ctx, FRINGE, PAL.hair, { lw: 3 });                                 // messy fringe
    ART.ell(ctx, -22, -58, 18, 6, '#ffffff', { stroke: false, alpha: 0.18, rot: -0.3 });

    for (const [x1, y1, x2, y2] of E.brows) {
      strokePath(ctx, 4.5, PAL.brow, (g) => {
        g.moveTo(x1, y1);
        g.quadraticCurveTo((x1 + x2) / 2, (y1 + y2) / 2 - 3, x2, y2);
      });
    }

    if (E.cheek > 0) {
      const col = E.red ? PAL.red : PAL.cheek;
      ART.ell(ctx, -31, 8, 12, 8, col, { stroke: false, alpha: E.cheek });
      ART.ell(ctx, 31, 8, 12, 8, col, { stroke: false, alpha: E.cheek });
    }

    for (const x of [-19, 19]) {
      if (E.eyes === 'happy') {
        strokePath(ctx, 3.5, OUT, (g) => { g.moveTo(x - 13, eyeY + 3); g.quadraticCurveTo(x, eyeY - 14, x + 13, eyeY + 3); });
      } else if (E.eyes === 'wide') {
        ART.eye(ctx, x, eyeY, 11, 0, 0, 0, { lw: 2.4 });
      } else if (E.eyes === 'worry') {
        ART.eye(ctx, x, eyeY, 9.5, -0.4, -0.6, blink, { lw: 2.2 });
      } else if (E.eyes === 'angry') {
        ART.eye(ctx, x, eyeY, 9.5, 0, 0, Math.max(blink, 0.5), { lw: 2.2 });
      } else {
        ART.eye(ctx, x, eyeY, 9.5, 0, 0.5, blink, { lw: 2.2 });
      }
    }

    if (E.tear) ART.ell(ctx, -24, 4, 4, 6.5, PAL.tear, { lw: 2 });
    if (E.sweat) ART.ell(ctx, -58, -34, 5, 7, PAL.tear, { lw: 2 });
    strokePath(ctx, 2.4, OUT, (g) => { g.moveTo(4, -6); g.quadraticCurveTo(9, 4, 2, 6); });   // nose
    portraitMouth(ctx, E.mouth);
  }

  ART.register({
    id: 'tomas', w: 20, h: 32,
    draw(ctx, p) { draw(ctx, p || {}); },
    portrait(ctx, expr, t) { drawPortrait(ctx, expr, t); },
  });
})();
