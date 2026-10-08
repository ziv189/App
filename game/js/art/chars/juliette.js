/* Juliette Varin: six-year-old memory-ghost, Leo's little sister.
   Translucent, golden-lit and floating (no legs). Contract: game/AGENT_BRIEF.md (section 5), game/DESIGN.md.
   Loaded after js/art/humanoid.js, so this replaces the 'juliette' entry registered there. */
(function () {
  'use strict';

  const EXPRS = ['neutral', 'happy', 'sad', 'angry', 'surprised', 'worried'];
  const STATES = ['idle', 'walk', 'run', 'jump', 'fall', 'land', 'attack', 'dash', 'hurt', 'dead', 'talk', 'slow', 'frozen'];
  const LINE = '#4a2f12';   // warm dark outline for the ghost (softer than ART.OUT)
  const HAIR_DK = '#33200f';

  const LIVE = {
    dress: '#f4ead0', dressSh: '#d6c49c', gold: '#e8b84a', goldLt: '#fff1b8', goldDk: '#9a6b1a',
    hair: '#5a3b26', hairHi: '#8f6742', skin: '#fbe7c8', skinSh: '#ecc9a3', ribbon: '#8a4f66',
    brass: '#c9a24a', brassLt: '#f5dc8e', brassDk: '#6e4f17',
    alpha: 0.84, shim: 0.45, glow: 1
  };
  // 'frozen' reads as a grey statue of her: same shapes, no float, no shimmer.
  const FROZEN = {
    dress: '#d9d3c4', dressSh: '#aca592', gold: '#bba870', goldLt: '#ece6cf', goldDk: '#6e6242',
    hair: '#4f4a44', hairHi: '#7d766c', skin: '#e4dccd', skinSh: '#cbc2b0', ribbon: '#6f6269',
    brass: '#a99c7c', brassLt: '#d6cba9', brassDk: '#4d4636',
    alpha: 0.7, shim: 0, glow: 0.35
  };

  const BROWS = {
    neutral:   [[-34, -30, -10, -33], [10, -33, 34, -30]],
    happy:     [[-34, -33, -12, -38], [12, -38, 34, -33]],
    sad:       [[-34, -28, -10, -40], [10, -40, 34, -28]],
    angry:     [[-34, -40, -10, -26], [10, -26, 34, -40]],
    surprised: [[-34, -41, -12, -47], [12, -47, 34, -41]],
    worried:   [[-34, -30, -10, -37], [10, -37, 34, -30]]
  };

  // Body geometry, facing right, feet at (0,0). The dress is a size too big and its hem is wispy.
  const DRESS_TOP = [[-3.6, -20.4], [-6.4, -18.4], [-7.8, -13], [-9.8, -7], [-12.2, -2.4]];
  const HEM = [[-10.6, 0.6], [-8.6, -1.4], [-6.6, 0.4], [-4.4, -1.4], [-2.2, 0.8], [0, -0.8],
               [2.2, 0.8], [4.4, -1.2], [6.6, 0.4], [8.6, -1.4], [10.6, 0.6]];
  const DRESS_RIGHT = [[12.2, -2.4], [9.8, -7], [7.8, -13], [6.4, -18.4], [3.6, -20.4]];
  const HEAD = { x: 0, y: -31, rx: 8, ry: 8.8 };
  // Curls: [x, y, radius, motion weight]. Weight 1 = loose end of the hair, it drifts most.
  const CURLS_BACK = [[-7.2, -35.5, 3.0, 1.0], [-9.2, -29.8, 2.8, 1.0], [-7.6, -24.6, 2.5, 0.9],
                      [-4.6, -41, 2.9, 0.5], [-0.6, -42.6, 2.9, 0.3], [3.8, -41.6, 2.6, 0.2], [7.2, -38.2, 2.4, 0.1]];
  const CURLS_FRONT = [[-3.6, -37.8, 2.1, 0.3], [0.6, -38.8, 2.1, 0.2], [4.4, -37, 1.9, 0.15]];

  /* ---------- small helpers ---------- */
  function N(v, d) { return typeof v === 'number' && isFinite(v) ? v : d; }
  function C(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function ease(k) { const c = C(k, 0, 1); return 1 - Math.pow(1 - c, 3); }
  function rnd(i, k) { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); }
  // Eyes close for 0.3 s every 3.6 s. Returns 0 (open) .. 1 (shut).
  function blinkAt(tt) {
    const c = ((N(tt, 0) % 3.6) + 3.6) % 3.6;
    return c > 3.3 ? Math.sin(((c - 3.3) / 0.3) * Math.PI) : 0;
  }
  function tracePoly(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
  }
  function readPose(p) {
    const s = p && typeof p.state === 'string' ? p.state : 'idle';
    const state = STATES.indexOf(s) >= 0 ? s : 'idle';
    const time = N(p && p.time, 0);
    return {
      state: state,
      t: Math.max(0, N(p && p.t, 0)),
      time: time,
      tm: state === 'frozen' ? 0 : state === 'slow' ? time * 0.4 : time,   // motion clock
      vx: N(p && p.vx, 0),
      frozen: state === 'frozen',
      slow: state === 'slow'
    };
  }

  /* ---------- pose rig: numbers per state ---------- */
  // Arm angles: 0 = hanging, +PI/2 = forward, -PI/2 = back, PI = raised overhead.
  function rig(P) {
    const tm = P.tm;
    const idle = Math.sin(tm * 1.6);
    const R = {
      lift: -5 + Math.sin(tm * 2.2) * 1.4,            // hovering, bobbing on the clock
      lean: 0, sx: 1, sy: 1 + Math.sin(tm * 2.2) * 0.012, recoil: 0,   // sy = breathing
      near: [0.5 + idle * 0.06, 0.75 + idle * 0.05],  // [upper arm, forearm]
      far: [-0.42 - idle * 0.04, -0.6],
      hemSwing: 0, hemDy: 0, drag: 0, hairLift: 0,
      blink: blinkAt(tm), mouth: 0, alpha: 1, trail: null, afterimg: false
    };
    let s = P.state;
    if (s === 'slow') s = Math.abs(P.vx) > 20 ? 'walk' : 'idle';
    switch (s) {
      case 'walk': {
        // Opposed arms, and the skirt scissors like legs would.
        const sn = Math.sin(tm * 7);
        R.near = [0.2 + sn * 0.7, 0.45 + sn * 0.7];
        R.far = [0.2 - sn * 0.7, 0.45 - sn * 0.7];
        R.lean = 0.05; R.lift -= Math.abs(sn) * 1.0; R.hemSwing = 2.4 * sn;
        break;
      }
      case 'run': {
        const sn = Math.sin(tm * 11);
        R.near = [0.4 + sn * 1.0, 1.0 + sn * 1.0];
        R.far = [0.4 - sn * 1.0, 1.0 - sn * 1.0];
        R.lean = 0.14; R.lift -= Math.abs(sn) * 1.6; R.hemSwing = 3.4 * sn; R.drag = -3;
        break;
      }
      case 'jump':
        R.near = [2.5, 2.9]; R.far = [-2.2, -2.5];
        R.lean = -0.04; R.sy = 1.06; R.sx = 0.95;
        R.hairLift = -2.5; R.hemDy = -1.2; R.hemSwing = 0.6 * Math.sin(tm * 4);
        break;
      case 'fall':
        R.near = [1.25, 1.5]; R.far = [-1.25, -1.5];
        R.lean = -0.05; R.hairLift = -3.5; R.hemDy = -2.5; R.hemSwing = Math.sin(tm * 9);
        break;
      case 'land': {
        // Squash on touch-down, then springs back up.
        const a = 1 - C(P.t / 0.22, 0, 1);
        R.sx = 1 + 0.13 * a; R.sy = 1 - 0.13 * a; R.lift += 3 * a;
        R.near = [0.2 + a, 0.45 + a]; R.far = [-0.2 - a, -0.45 - a];
        R.hemDy = 1.5 * a;
        break;
      }
      case 'attack': {
        // Wind-up (anticipation), swing with a gold arc, recover.
        const t = P.t;
        let th;
        if (t < 0.08) th = lerp(0.3, -1.6, t / 0.08);
        else if (t < 0.3) th = lerp(-1.6, 1.9, ease((t - 0.08) / 0.22));
        else th = lerp(1.9, 0.5, C((t - 0.3) / 0.25, 0, 1));
        R.near = [th, th + 0.15]; R.far = [-0.5, -0.7];
        R.lean = t < 0.08 ? -0.06 : 0.12 * C((t - 0.08) / 0.22, 0, 1) * C(1 - (t - 0.3) / 0.25, 0, 1);
        if (t >= 0.08) R.trail = { from: -1.6, to: th, a: 0.7 * C((t - 0.08) / 0.05, 0, 1) * C(1 - (t - 0.3) / 0.2, 0, 1) };
        R.blink = 0.25;
        break;
      }
      case 'dash':
        R.lean = 0.26; R.sx = 1.18; R.sy = 0.9;
        R.near = [-1.7, -2.0]; R.far = [-1.3, -1.6];
        R.drag = -4; R.hairLift = 0.5; R.hemDy = -0.5; R.afterimg = true; R.alpha = 0.9;
        break;
      case 'hurt': {
        // Flinch back, squint, flicker for the first 0.45 s.
        const r = 1 - C(P.t / 0.45, 0, 1);
        R.lean = -0.22 * r; R.recoil = -3.2 * r + Math.sin(P.t * 60) * 0.6 * r;
        R.near = [1.5 + 0.4 * r, 1.9]; R.far = [-1.5 - 0.3 * r, -1.8];
        R.blink = 0.65; R.mouth = 0.45;
        R.alpha = P.t < 0.45 && Math.floor(P.t * 18) % 2 === 0 ? 0.5 : 1;
        break;
      }
      case 'talk': {
        const g = Math.sin(tm * 4.5);
        R.near = [1.0 + 0.35 * g, 1.4 + 0.25 * g]; R.far = [-0.3, -0.5];
        R.lean = 0.04 * Math.sin(tm * 1.7);
        R.mouth = 0.5 + 0.5 * Math.sin(tm * 14);
        break;
      }
      default:
        break;   // idle, unknown states, frozen (tm = 0 keeps it still)
    }
    return R;
  }

  /* ---------- drawing pieces ---------- */
  function puff(ctx, x, y, r, pal) {
    ART.ell(ctx, x, y, r, r * 0.86, pal.hair, { lw: 1.1, outline: HAIR_DK });
    ctx.save();
    ctx.strokeStyle = pal.hairHi; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(x, y, r * 0.55, 3.4, 4.8); ctx.stroke();
    ctx.restore();
  }

  function curls(ctx, list, R, tm, pal, phase) {
    for (let i = 0; i < list.length; i++) {
      const c = list[i], w = c[3];
      const x = c[0] + Math.sin(tm * 1.4 + i * 1.1 + phase) * 0.5 + R.drag * w;
      const y = c[1] + Math.sin(tm * 1.8 + i * 1.7 + phase) * 0.9 + (R.hairLift - 0.5) * w;
      puff(ctx, x, y, c[2], pal);
    }
  }

  // Dress outline. Hem points swing (scissor), drag, and shimmer with a sine offset.
  function dressPoints(R, tm, amp) {
    const all = DRESS_TOP.concat(HEM, DRESS_RIGHT);
    const h0 = DRESS_TOP.length, h1 = h0 + HEM.length;
    const out = [];
    for (let i = 0; i < all.length; i++) {
      let x = all[i][0], y = all[i][1];
      if (i >= h0 && i < h1) {
        x += -R.hemSwing * x / 12.2 + R.drag * 0.8;
        y += R.hemDy;
      }
      if (amp) {
        x += Math.sin(tm * 5.2 + i * 1.7) * amp;
        y += Math.cos(tm * 4.4 + i * 2.1) * amp * 0.7;
      }
      out.push([x, y]);
    }
    return out;
  }

  function arm(ctx, sx, sy, th, pal, far) {
    const L1 = 5.2, L2 = 4.8;
    const ex = sx + Math.sin(th[0]) * L1, ey = sy + Math.cos(th[0]) * L1;
    const hx = ex + Math.sin(th[1]) * L2, hy = ey + Math.cos(th[1]) * L2;
    const cloth = far ? pal.dressSh : pal.dress;
    ART.limb(ctx, sx, sy, ex, ey, 3.4, cloth, { lw: 1.2, outline: LINE });
    ART.limb(ctx, ex, ey, hx, hy, 3.0, cloth, { lw: 1.2, outline: LINE });
    ART.ell(ctx, hx, hy, 1.6, 1.6, far ? pal.skinSh : pal.skin, { lw: 1.0, outline: LINE });
  }

  function face(ctx, R) {
    ART.eye(ctx, -1.2, -31.6, 1.7, 0.6, 0, R.blink, { lw: 1.1, white: '#fffdf4', pupil: '#2d2030' });
    ART.eye(ctx, 3.2, -31.4, 2.0, 0.6, 0, R.blink, { lw: 1.2, white: '#fffdf4', pupil: '#2d2030' });
    ART.ell(ctx, 4.8, -27.6, 1.9, 1.2, '#f0a08c', { stroke: false, alpha: 0.5 });
    if (R.mouth > 0.15) {
      ctx.beginPath();
      ctx.ellipse(2.5, -25.4, 1.1, 0.4 + R.mouth * 1.1, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#6b2f3c'; ctx.fill();
    } else {
      ctx.save();
      ctx.strokeStyle = LINE; ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.arc(2.8, -26.4, 1.6, 0.2, 1.2); ctx.stroke();
      ctx.restore();
    }
  }

  function ribbonAndPendant(ctx, pal, tm) {
    ART.limb(ctx, 0, -20.5, 0, -16.2, 1.2, pal.ribbon, { lw: 0.8, outline: LINE });
    ctx.save();
    ctx.translate(0, -16.2);
    ctx.rotate(Math.sin(tm * 2.2) * 0.12);   // the watch swings gently
    ctx.translate(0, 16.2);
    ART.ell(ctx, 0, -16.8, 1.1, 0.9, pal.brass, { lw: 0.8, outline: pal.brassDk });
    ART.ell(ctx, 0, -13.2, 2.9, 2.9, pal.brass, { lw: 1.0, outline: pal.brassDk });
    ART.ell(ctx, 0, -13.2, 2.1, 2.1, pal.brassLt, { stroke: false });
    ctx.beginPath();
    ctx.strokeStyle = pal.brassDk; ctx.lineWidth = 0.6;
    ctx.moveTo(0, -13.2); ctx.lineTo(0, -14.7);
    ctx.moveTo(0, -13.2); ctx.lineTo(0.9, -12.7);
    ctx.stroke();
    ctx.fillStyle = '#fffbe8';
    ctx.beginPath(); ctx.arc(-1, -14.5, 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // One full figure (or a silhouette for afterimages and the dissolve). Origin = feet, facing right.
  function drawFigure(ctx, R, pal, simple, tm) {
    const shim = simple ? 0 : pal.shim;
    const off = [Math.sin(tm * 6) * 0.8 * (shim ? 1 : 0), Math.cos(tm * 5) * 0.4 * (shim ? 1 : 0)];
    if (!simple) arm(ctx, -3.6, -17.6, R.far, pal, true);

    // Hair behind the head: a volume disc plus floating back curls.
    ART.ell(ctx, -0.8, -34, 8.8, 9, pal.hair, { lw: 1.2, outline: HAIR_DK });
    curls(ctx, CURLS_BACK, R, tm, pal, 0);

    // Dress.
    const dpts = dressPoints(R, tm, shim);
    ART.poly(ctx, dpts, pal.dress, { lw: 1.4, outline: LINE });
    if (!simple) {
      ctx.save();
      tracePoly(ctx, dpts); ctx.clip();
      ctx.globalAlpha *= 0.55; ctx.fillStyle = pal.dressSh;
      ctx.beginPath();
      ctx.moveTo(1, -21); ctx.lineTo(13, -14); ctx.lineTo(13, 2); ctx.lineTo(1, 2);
      ctx.closePath(); ctx.fill();
      ctx.restore();

      // Gold embroidery: neckline stitching and hem beads.
      ctx.save();
      ctx.strokeStyle = pal.gold; ctx.lineWidth = 0.9; ctx.setLineDash([1, 1]);
      ctx.beginPath(); ctx.moveTo(-5.4, -18.6); ctx.quadraticCurveTo(0, -13.6, 5.4, -18.6); ctx.stroke();
      ctx.restore();
      for (const x of [-8, -4, 0, 4, 8]) ART.ell(ctx, x, -3.6, 0.7, 0.7, pal.gold, { stroke: false });
    }
    // Shimmering edge: a faint gold copy offset by a sine.
    if (!simple && shim) {
      ctx.save();
      ctx.strokeStyle = pal.goldLt; ctx.globalAlpha *= 0.5; ctx.lineWidth = 0.9;
      tracePoly(ctx, dpts.map(function (q) { return [q[0] + off[0], q[1] + off[1]]; }));
      ctx.stroke();
      ctx.restore();
    }

    // Neck, head, fringe.
    ART.limb(ctx, 0, -23, 0, -18.5, 4, pal.skin, { lw: 1.1, outline: LINE });
    ART.ell(ctx, HEAD.x, HEAD.y, HEAD.rx, HEAD.ry, pal.skin, { lw: 1.5, outline: LINE });
    if (!simple && shim) {
      ctx.save();
      ctx.strokeStyle = pal.goldLt; ctx.globalAlpha *= 0.5; ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.ellipse(HEAD.x + off[0], HEAD.y + off[1], HEAD.rx + 0.4, HEAD.ry + 0.4, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    curls(ctx, CURLS_FRONT, R, tm, pal, 2);

    if (!simple) {
      face(ctx, R);
      ribbonAndPendant(ctx, pal, tm);
      arm(ctx, 3.6, -17.6, R.near, pal, false);
      if (R.trail && R.trail.a > 0.01) {
        // Gold arc traced by the swinging hand.
        const a0 = Math.PI / 2 - R.trail.from, a1 = Math.PI / 2 - R.trail.to;
        ctx.save();
        ctx.globalAlpha *= R.trail.a;
        ctx.strokeStyle = pal.gold; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(3.6, -17.6, 12, a0, a1, a1 < a0); ctx.stroke();
        ctx.restore();
      }
    }
  }

  function drawGlow(ctx, cy, pulse, strength) {
    const r = 28 + pulse;
    const g = ctx.createRadialGradient(0, cy, 2, 0, cy, r);
    g.addColorStop(0, 'rgba(255,230,150,0.55)');
    g.addColorStop(0.55, 'rgba(255,200,95,0.2)');
    g.addColorStop(1, 'rgba(255,200,95,0)');
    ctx.save();
    ctx.globalAlpha *= strength;
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // 'dead': she thins out and rises while gold particles drift up and fade over about 2.4 s.
  function drawDissolve(ctx, P) {
    const LIFE = 2.4, t = P.t;
    if (t >= LIFE) return;
    drawGlow(ctx, -22, 0, 0.8 * (1 - C(t / LIFE, 0, 1)));
    const f = 1 - C(t / 1.1, 0, 1);
    if (f > 0) {
      const R = {
        lift: -5 - t * 3, lean: 0, sx: 1 + t * 0.05, sy: 1 - t * 0.02, recoil: 0,
        hemSwing: 0, hemDy: 0, drag: 0, hairLift: -t * 4,
        near: [0.5, 0.75], far: [-0.42, -0.6], blink: 0, mouth: 0, alpha: 1, trail: null, afterimg: false
      };
      ctx.save();
      ctx.translate(0, R.lift);
      ctx.translate(0, -2); ctx.scale(R.sx, R.sy); ctx.translate(0, 2);
      ctx.globalAlpha = LIVE.alpha * f;
      drawFigure(ctx, R, LIVE, true, P.time);
      ctx.restore();
    }
    for (let i = 0; i < 26; i++) {
      const r1 = rnd(i, 1), r2 = rnd(i, 2), r3 = rnd(i, 3);
      const d = r3 * 0.6;                     // staggered release
      const pt = t - d;
      if (pt <= 0) continue;
      const a = C(1 - pt / (LIFE - d), 0, 1) * C(pt / 0.15, 0, 1);
      const x = (r1 - 0.5) * 16 + (r1 - 0.5) * pt * 5 + Math.sin(pt * 2.4 + i) * 2;
      const y = -22 - r2 * 14 - pt * (6 + r3 * 8);
      const rad = 0.8 + r3 * 1.3;
      ctx.beginPath(); ctx.arc(x, y, rad * 2.4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,214,107,' + (0.3 * a).toFixed(3) + ')'; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,243,196,' + a.toFixed(3) + ')'; ctx.fill();
    }
  }

  function draw(ctx, p) {
    const P = readPose(p);
    if (P.state === 'dead') { drawDissolve(ctx, P); return; }
    const pal = P.frozen ? FROZEN : LIVE;
    const R = rig(P);
    drawGlow(ctx, R.lift - 22, Math.sin(P.tm * 1.5) * 1.8, pal.glow);

    ctx.save();
    ctx.translate(0, R.lift);
    ctx.translate(0, -12); ctx.rotate(R.lean); ctx.translate(0, 12);   // lean pivots at the waist
    ctx.translate(R.recoil, 0);
    ctx.translate(0, -2); ctx.scale(R.sx, R.sy); ctx.translate(0, 2);  // squash and stretch about the hem
    ctx.globalAlpha = pal.alpha * R.alpha;
    if (R.afterimg) {
      const ghosts = [[-7, 0.28], [-14, 0.12]];
      for (let i = 0; i < ghosts.length; i++) {
        ctx.save();
        ctx.translate(ghosts[i][0], 0);
        ctx.globalAlpha = pal.alpha * ghosts[i][1];
        drawFigure(ctx, R, pal, true, P.tm);
        ctx.restore();
      }
      ctx.globalAlpha = pal.alpha * R.alpha;
    }
    drawFigure(ctx, R, pal, false, P.tm);
    ctx.restore();

    if (P.slow) {
      // Brass ring: the Pendule is slowing time around her.
      ctx.save();
      ctx.globalAlpha *= 0.35; ctx.strokeStyle = pal.brass; ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 3]); ctx.lineDashOffset = -P.tm * 8;
      ctx.beginPath(); ctx.arc(0, R.lift - 20, 19, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }

  /* ---------- portrait (200 x 200 box centred on 0,0) ---------- */
  function portraitCurl(ctx, x, y, r) {
    ART.ell(ctx, x, y, r, r * 0.9, LIVE.hair, { lw: 2.4, outline: HAIR_DK });
    ctx.save();
    ctx.strokeStyle = LIVE.hairHi; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(x, y, r * 0.5, 3.5, 4.9); ctx.stroke();
    ctx.restore();
  }

  function portrait(ctx, expr, t) {
    const E = EXPRS.indexOf(expr) >= 0 ? expr : 'neutral';
    const tt = N(t, 0);
    const bl = blinkAt(tt);
    const shim = Math.sin(tt * 3.1) * 0.9;
    ctx.save();
    ctx.translate(0, Math.sin(tt * 1.6) * 0.5);

    // Golden aura.
    const gl = ctx.createRadialGradient(0, -8, 24, 0, -8, 100);
    gl.addColorStop(0, 'rgba(255,226,140,0.55)');
    gl.addColorStop(0.6, 'rgba(255,200,95,0.18)');
    gl.addColorStop(1, 'rgba(255,200,95,0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, 0, 100, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.94;

    // Hair: curls around the head, drifting outward; hair mass behind the face.
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * (0.95 + i * 0.134);
      const x = Math.cos(a) * (56 + Math.sin(tt * 1.2 + i) * 1.8);
      const y = -26 + Math.sin(a) * 52 + Math.cos(tt * 1.1 + i * 0.7) * 1.4;
      portraitCurl(ctx, x, y, 14 + (i % 3) * 2);
    }
    ART.ell(ctx, 0, -22, 50, 48, LIVE.hair, { lw: 2.5, outline: HAIR_DK });

    // Neck, dress shoulders, gold stitching.
    ART.limb(ctx, 0, 30, 0, 62, 26, LIVE.skin, { lw: 3 });
    ctx.beginPath();
    ctx.moveTo(-96, 98);
    ctx.quadraticCurveTo(-92, 66, -54, 56);
    ctx.quadraticCurveTo(-26, 50, -14, 52);
    ctx.quadraticCurveTo(0, 66, 14, 52);
    ctx.quadraticCurveTo(26, 50, 54, 56);
    ctx.quadraticCurveTo(92, 66, 96, 98);
    ctx.closePath();
    ctx.fillStyle = LIVE.dress; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = LINE; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.save();
    ctx.strokeStyle = LIVE.gold; ctx.lineWidth = 2.2; ctx.setLineDash([3, 3.5]);
    ctx.beginPath(); ctx.moveTo(-13, 55); ctx.quadraticCurveTo(0, 69, 13, 55); ctx.stroke();
    ctx.restore();
    const beads = [[-62, 74], [-74, 86], [-82, 96], [-38, 80], [62, 74], [74, 86], [82, 96], [38, 80]];
    for (let i = 0; i < beads.length; i++) ART.ell(ctx, beads[i][0], beads[i][1], 2.6, 2.6, LIVE.gold, { lw: 1.1, outline: LIVE.goldDk });

    // Ribbon and brass pocket-watch pendant.
    ART.limb(ctx, 0, 56, 0, 70, 2.6, LIVE.ribbon, { lw: 1.6, outline: LINE });
    ctx.save();
    ctx.translate(0, 70); ctx.rotate(Math.sin(tt * 2.2) * 0.1); ctx.translate(0, -70);
    ART.ell(ctx, 0, 69, 3.6, 3.2, LIVE.brass, { lw: 2, outline: LIVE.brassDk });
    ART.ell(ctx, 0, 84, 13, 13, LIVE.brass, { lw: 2.6, outline: LIVE.brassDk });
    ART.ell(ctx, 0, 84, 9.5, 9.5, LIVE.brassLt, { stroke: false });
    ctx.beginPath();
    ctx.strokeStyle = LIVE.brassDk; ctx.lineWidth = 2;
    ctx.moveTo(0, 84); ctx.lineTo(0, 76.5); ctx.moveTo(0, 84); ctx.lineTo(5.5, 87);
    ctx.stroke();
    ctx.fillStyle = '#fffbe8';
    ctx.beginPath(); ctx.arc(-4.5, 79, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Head.
    ART.ell(ctx, 0, -6, 44, 50, LIVE.skin, { lw: 3 });
    for (const x of [-30, -12, 8, 28]) portraitCurl(ctx, x, -48 + Math.sin(tt * 1.7 + x) * 1.2, 12);
    ctx.save();
    ctx.strokeStyle = 'rgba(255,246,210,0.7)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(shim, -6 + shim * 0.6, 44.5, 50.5, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    // Eyes.
    if (E === 'happy') {
      ctx.save();
      ctx.strokeStyle = LINE; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
      for (const x of [-18, 18]) { ctx.beginPath(); ctx.arc(x, -10, 8.5, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke(); }
      ctx.restore();
    } else {
      const r = E === 'surprised' ? 12 : 10.5;
      const lx = E === 'worried' ? -0.5 : 0.3;
      const ly = E === 'sad' ? 0.5 : E === 'worried' ? -0.4 : 0;
      const b = E === 'angry' ? 0.5 : E === 'sad' ? Math.max(0.3, bl) : bl;
      for (const x of [-18, 18]) ART.eye(ctx, x, -12, r, lx, ly, b, { lw: 2.6, white: '#fffdf4', pupil: '#2d2030' });
    }

    // Brows, nose, blush.
    const brows = BROWS[E];
    for (let i = 0; i < brows.length; i++) {
      const q = brows[i];
      ART.limb(ctx, q[0], q[1], q[2], q[3], 4.2, HAIR_DK, { stroke: false });
    }
    ctx.save();
    ctx.strokeStyle = LINE; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(4, 2, 3, 0.3, 1.2); ctx.stroke();
    ctx.restore();
    const blush = E === 'happy' ? 0.6 : 0.35;
    ART.ell(ctx, -31, 8, 9, 5.5, '#f09a88', { stroke: false, alpha: blush });
    ART.ell(ctx, 31, 8, 9, 5.5, '#f09a88', { stroke: false, alpha: blush });

    // Mouth.
    ctx.save();
    ctx.strokeStyle = LINE; ctx.fillStyle = '#5a2233'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath();
    if (E === 'happy') {
      ctx.moveTo(-20, 22); ctx.quadraticCurveTo(0, 50, 20, 22); ctx.quadraticCurveTo(0, 30, -20, 22);
      ctx.closePath(); ctx.fill(); ctx.lineWidth = 2.4; ctx.stroke();
    } else if (E === 'sad') {
      ctx.moveTo(-14, 38); ctx.quadraticCurveTo(0, 22, 14, 38); ctx.stroke();
    } else if (E === 'angry') {
      ctx.moveTo(-13, 30); ctx.lineTo(13, 30); ctx.lineTo(9, 36); ctx.lineTo(-9, 36);
      ctx.closePath(); ctx.fill(); ctx.lineWidth = 2.4; ctx.stroke();
    } else if (E === 'surprised') {
      ctx.ellipse(0, 30, 8, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 2.4; ctx.stroke();
    } else if (E === 'worried') {
      ctx.moveTo(-14, 30); ctx.quadraticCurveTo(-7, 24, 0, 30); ctx.quadraticCurveTo(7, 36, 14, 29); ctx.stroke();
    } else {
      ctx.moveTo(-11, 30); ctx.quadraticCurveTo(0, 35, 11, 29); ctx.stroke();
    }
    ctx.restore();

    ctx.restore();
  }

  ART.register({ id: 'juliette', w: 22, h: 42, draw: draw, portrait: portrait });
})();
