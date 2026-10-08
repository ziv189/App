/* Old Hugo (id hugo): grumpy toymaker who knew Elias. Short and a little hunched, big grey bushy beard,
   round wire spectacles, blue work smock with a pencil in the pocket, flat cap, loupe in one hand.
   Drawn facing right; origin (0,0) = centre of the feet; y negative is up. Slow, stubborn gait. */
(function () {
  const A = window.ART;
  if (!A) return;
  const OUT = A.OUT;
  const clamp = A.clamp;
  const TAU = Math.PI * 2;
  const STONE = '#8c8a94';

  const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
  const ease = (k) => k * k * (3 - 2 * k);
  const ang = (a) => Math.atan2(Math.cos(a), Math.sin(a)); // gait angle -> canvas angle

  const BASE = {
    smock: '#3c5e8b', smockHi: '#5a7fae', smockLo: '#2b4568', stitch: '#8fb0d8',
    skin: '#e2b08c', skinLo: '#c28f6b', nose: '#d99a7b',
    beard: '#b8b2a8', beardHi: '#e2dfd7', beardLo: '#8c867c', hair: '#b8b2a8',
    cap: '#4a3b2a', capLo: '#2f2519',
    pants: '#3a3a40', pantsLo: '#2a2a31', boot: '#2a2018', bootLo: '#1d150f',
    brass: '#c9963f', wood: '#6b4a2a', loupe: '#cdeef7', lens: '#d6eef0',
    pencil: '#e8b84d', pencilTip: '#ecd2a4', shirt: '#efe6d2',
    ink: '#2b1a1a', crack: '#4b4a52', tear: '#9fd3ef',
  };

  const TORSO = [[-5.9, 1.5], [5.6, 1.5], [6.4, -5.5], [5.2, -11.0], [2.8, -14.2], [-0.4, -14.9],
    [-4.2, -14.2], [-7.2, -11.0], [-7.6, -5.0], [-6.8, 0.0]];
  const TUFTS = [[-5.4, 3.8, 2.2], [-3.4, 9.8, 2.6], [0.8, 11.6, 2.6], [5.0, 10.4, 2.5], [7.4, 6.0, 2.3]];
  const GLASSES = [[0.6, -0.6], [5.0, -0.6]];

  /* ---------- palette (stone colours when frozen) ---------- */
  function mix(hex, to, k) {
    const a = parseInt(hex.slice(1), 16), b = parseInt(to.slice(1), 16);
    let out = '#';
    for (const sh of [16, 8, 0]) {
      const x = (a >> sh) & 255, y = (b >> sh) & 255;
      out += Math.round(x + (y - x) * k).toString(16).padStart(2, '0');
    }
    return out;
  }
  const palCache = {};
  function pal(stone) {
    const key = stone ? 'stone' : 'live';
    if (!palCache[key]) {
      const o = {};
      for (const k in BASE) o[k] = stone ? mix(BASE[k], STONE, 0.6) : BASE[k];
      palCache[key] = o;
    }
    return palCache[key];
  }

  /* ---------- pose ---------- */
  function blinkAt(t) { return ((t % 3.8) + 3.8) % 3.8 < 0.12 ? 1 : 0; }

  // Angles are measured from straight down: 0 = down, +PI/2 = forward, PI = up.
  function rest() {
    return {
      lean: 0.16, crouch: 0, dy: 0, hx: 0, hy: 0, hrot: 0, rot: 0, alpha: 1,
      legF: 0.05, legB: -0.05, liftF: 0, liftB: 0,
      aF1: 0.15, aF2: 0.66, aB1: -0.1, aB2: 0.45,
      peek: 0, mouth: 0, blink: 0, squint: 0, stone: false, streaks: false, trail: null,
    };
  }

  function idle(v, T) {
    const br = Math.sin(T * 2.2);
    v.lean += 0.012 * br;
    v.aF1 += 0.03 * br;
    v.hrot = 0.02 * br;
    const cyc = ((T % 7) + 7) % 7; // every 7 s he lifts the loupe to his eye for a moment
    v.peek = cyc < 1.6 ? Math.sin((cyc / 1.6) * Math.PI) : 0;
    v.blink = blinkAt(T);
  }

  function poseFor(p) {
    const st = typeof p.state === 'string' ? p.state : 'idle';
    const t = Math.max(0, num(p.t, 0));
    const T = num(p.time, 0);
    const v = rest();
    switch (st) {
      case 'walk': {
        const s = Math.sin(T * 5.0);
        v.lean = 0.2;
        v.legF = 0.34 * s; v.legB = -0.34 * s;
        v.liftF = Math.max(0, s) * 1.4; v.liftB = Math.max(0, -s) * 1.4;
        v.dy = 0.55 * Math.abs(s);
        v.aF1 = 0.15 - 0.12 * s; v.aB1 = -0.1 + 0.22 * s;
        v.hrot = -0.04 * s;
        v.blink = blinkAt(T);
        break;
      }
      case 'run': {
        const s = Math.sin(T * 8.5);
        v.lean = 0.34;
        v.legF = 0.55 * s; v.legB = -0.55 * s;
        v.liftF = Math.max(0, s) * 2.4; v.liftB = Math.max(0, -s) * 2.4;
        v.dy = 0.9 * Math.abs(s);
        v.aF1 = 0.25 - 0.4 * s; v.aF2 = 1.0; v.aB1 = -0.25 + 0.45 * s; v.aB2 = 0.8;
        v.hrot = 0.06; v.mouth = 0.35;
        break;
      }
      case 'jump': {
        v.lean = 0.14;
        v.legF = 0.35; v.legB = -0.2;
        v.aF1 = 2.2; v.aF2 = 2.0; v.aB1 = -1.9; v.aB2 = -2.1;
        v.mouth = 0.5;
        break;
      }
      case 'fall': {
        const w = Math.sin(T * 12);
        v.lean = 0.02;
        v.legF = 0.2; v.legB = -0.35;
        v.aF1 = 1.5 + 0.12 * w; v.aF2 = 1.2; v.aB1 = -1.4 - 0.12 * w; v.aB2 = -1.1;
        v.mouth = 0.35; v.squint = 0.4;
        break;
      }
      case 'land': {
        const k = clamp(1 - t / 0.2, 0, 1);
        v.crouch = 2.2 * k; v.lean = 0.16 + 0.1 * k;
        v.legF = 0.22 * k; v.legB = -0.22 * k;
        v.aF1 = 0.15 + 0.35 * k; v.aB1 = -0.1 - 0.25 * k;
        v.mouth = 0.6 * k; v.squint = 0.6 * k;
        break;
      }
      case 'attack': {
        const u = clamp(t / 0.42, 0, 1);
        let a1, a2, lean;
        if (u < 0.3) { // anticipation: loupe arm pulled back, weight on the heels
          const k = ease(u / 0.3);
          a1 = A.lerp(0.15, -1.2, k); a2 = A.lerp(0.66, 0.2, k); lean = A.lerp(0.16, -0.04, k);
        } else if (u < 0.6) { // strike: arc forward and down, leaning in
          const k = ease((u - 0.3) / 0.3);
          a1 = A.lerp(-1.2, 2.0, k); a2 = A.lerp(0.2, 1.1, k); lean = A.lerp(-0.04, 0.36, k);
        } else { // recovery: grumbling back to rest
          const k = ease((u - 0.6) / 0.4);
          a1 = A.lerp(2.0, 0.15, k); a2 = A.lerp(1.1, 0.66, k); lean = A.lerp(0.36, 0.16, k);
        }
        v.lean = lean; v.aF1 = a1; v.aF2 = a2;
        v.legF = 0.2; v.legB = -0.25;
        if (u > 0.3 && u < 0.6) { v.mouth = 0.9; v.squint = 0.5; }
        if (u > 0.25 && u < 0.7) v.trail = [-1.2, a1];
        break;
      }
      case 'dash': {
        const s = Math.sin(T * 16);
        v.lean = 0.42;
        v.legF = 0.6 * s; v.legB = -0.6 * s;
        v.liftF = Math.max(0, s) * 2; v.liftB = Math.max(0, -s) * 2;
        v.aF1 = -0.5; v.aF2 = 0.3; v.aB1 = -0.9; v.aB2 = -0.4;
        v.mouth = 0.5; v.streaks = true;
        break;
      }
      case 'hurt': {
        const k = clamp(1 - t / 0.4, 0, 1);
        v.lean = 0.16 - 0.32 * k; v.hrot = -0.3 * k; v.hx = -1 * k;
        v.aF1 = A.lerp(0.15, 1.5, k); v.aF2 = A.lerp(0.66, 1.2, k);
        v.aB1 = A.lerp(-0.1, -1.4, k); v.aB2 = A.lerp(0.45, -1.0, k);
        v.rot = Math.sin(t * 48) * 0.04 * k;
        v.mouth = 0.9 * k; v.squint = k; v.blink = k > 0.5 ? 1 : 0;
        break;
      }
      case 'dead': {
        const f = clamp(t / 0.7, 0, 1);
        v.rot = (-f * Math.PI) / 2; // topples backwards, feet stay put
        v.alpha = 1 - clamp((t - 0.6) / 0.8, 0, 1);
        v.aF1 = A.lerp(0.15, 1.2, f); v.aF2 = A.lerp(0.66, 0.9, f);
        v.aB1 = A.lerp(-0.1, -1.0, f); v.aB2 = A.lerp(0.45, -0.6, f);
        v.legF = 0.2 * f; v.legB = -0.25 * f;
        v.blink = 1; v.squint = 1;
        break;
      }
      case 'talk': {
        v.lean = 0.18;
        v.peek = 0.25 + 0.12 * Math.sin(T * 4.2); // loupe waggles while he lectures
        v.mouth = clamp(0.5 + 0.6 * Math.sin(T * 17) + 0.3 * Math.sin(T * 9.1), 0, 1);
        v.hrot = 0.05 * Math.sin(T * 3);
        v.blink = blinkAt(T);
        break;
      }
      case 'frozen': {
        v.stone = true; v.lean = 0.14; v.aF1 = 0.12; v.squint = 0.5;
        break;
      }
      case 'slow': {
        idle(v, T * 0.45); // Pendule active: everything, Hugo included, moves at half speed
        break;
      }
      default: {
        idle(v, T);
      }
    }
    return v;
  }

  /* ---------- drawing helpers ---------- */

  // Feet-frame point of a local point on the body (origin at the hip, rotated by the lean).
  function xf(lx, ly, lean, hipY) {
    const c = Math.cos(lean), s = Math.sin(lean);
    return [lx * c - ly * s, hipY + lx * s + ly * c];
  }

  // Closed smooth outline through pts (Catmull-Rom to Bezier), filled, with the dark contour.
  function smooth(ctx, pts, fill) {
    const n = pts.length;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      ctx.bezierCurveTo(
        p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6,
        p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6,
        p2[0], p2[1]);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();
  }

  // Leg from hip to ankle, with a boot. `lift` raises the ankle while the foot swings.
  function leg(ctx, hip, a, lift, Lg, pants, boot) {
    const ax = hip[0] + Math.sin(a) * Lg;
    const ay = hip[1] + Math.cos(a) * Lg - lift;
    A.limb(ctx, hip[0], hip[1], ax, ay, 4.2, pants);
    A.rr(ctx, ax - 2.4, ay - 0.2, 6.6, 2.4, 1.2, boot);
  }

  // Arm from a shoulder point; returns the hand position.
  function arm(ctx, root, a1, a2, sleeve, skin) {
    const e = [root[0] + Math.sin(a1) * 6.2, root[1] + Math.cos(a1) * 6.2];
    const h = [e[0] + Math.sin(a2) * 5.6, e[1] + Math.cos(a2) * 5.6];
    A.limb(ctx, root[0], root[1], e[0], e[1], 3.9, sleeve);
    A.limb(ctx, e[0], e[1], h[0], h[1], 3.4, sleeve);
    A.ell(ctx, h[0], h[1], 1.9, 1.9, skin);
    return h;
  }

  function streaks(ctx) {
    ctx.save();
    ctx.strokeStyle = 'rgba(220,235,255,0.55)';
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-10, -8); ctx.lineTo(-18, -8);
    ctx.moveTo(-12, -17); ctx.lineTo(-22, -17);
    ctx.moveTo(-9, -27); ctx.lineTo(-16, -27);
    ctx.stroke();
    ctx.restore();
  }

  function eyeDot(ctx, g, v, P) {
    const x = g[0] + 0.3, y = g[1];
    if (v.blink) {
      ctx.save();
      ctx.strokeStyle = P.ink;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(x - 0.9, y); ctx.lineTo(x + 0.9, y);
      ctx.stroke();
      ctx.restore();
    } else {
      A.ell(ctx, x, y, 0.75, 0.75 * (1 - 0.5 * v.squint), P.ink, { stroke: false });
    }
  }

  // Head in its own frame: origin at the centre of the skull, facing right.
  function drawHead(ctx, v, P) {
    ctx.save();
    ctx.strokeStyle = P.beardLo; ctx.lineWidth = 1.1; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-5.2, -2.2); ctx.quadraticCurveTo(-7.6, 0.8, -5.6, 3.6); ctx.stroke();
    ctx.restore();
    A.ell(ctx, 0, 0, 6.4, 6.6, P.skin);
    A.ell(ctx, -1.4, 0.9, 1.5, 2.2, P.skinLo);
    A.ell(ctx, -0.3, -6.6, 6.8, 2.8, P.cap);                       // cap crown
    A.ell(ctx, 3.4, -4.6, 5.4, 1.2, P.capLo, { rot: 0.12 });       // cap peak
    A.ell(ctx, 0.6, -2.4, 2.6, 0.9, P.beardLo, { rot: 0.28 });     // grumpy brows
    A.ell(ctx, 5.0, -2.4, 2.4, 0.9, P.beardLo, { rot: -0.28 });

    ctx.save();
    ctx.fillStyle = P.lens; ctx.globalAlpha *= 0.45;
    ctx.beginPath();
    for (const g of GLASSES) { ctx.moveTo(g[0] + 1.8, g[1]); ctx.arc(g[0], g[1], 1.8, 0, TAU); }
    ctx.fill();
    ctx.restore();
    for (const g of GLASSES) eyeDot(ctx, g, v, P);
    ctx.save();
    ctx.strokeStyle = P.brass; ctx.lineWidth = 0.9;
    ctx.beginPath();
    for (const g of GLASSES) { ctx.moveTo(g[0] + 1.8, g[1]); ctx.arc(g[0], g[1], 1.8, 0, TAU); }
    ctx.moveTo(2.4, -0.6); ctx.lineTo(3.2, -0.6);                 // bridge
    ctx.stroke();
    ctx.restore();

    // big grey beard hangs under the spectacles
    for (const q of TUFTS) A.ell(ctx, q[0], q[1], q[2], q[2], P.beard, { lw: 1.6 });
    A.ell(ctx, 0.4, 7.2, 6.6, 5.6, P.beard, { lw: 1.6 });
    A.ell(ctx, -1.8, 3.8, 2.6, 1.2, P.beardHi, { stroke: false, rot: -0.35 });

    A.ell(ctx, 5.8, 2.0, 1.5, 1.6, P.nose);
    A.ell(ctx, 3.2, 4.8, 3.9, 1.5, P.beardHi, { rot: 0.06 });     // moustache
    A.ell(ctx, 3.8, 6.6, 1.4, 0.35 + 1.1 * v.mouth, P.ink, { stroke: false });
  }

  function drawFigure(ctx, v, P) {
    const hipY = -13 + v.crouch + v.dy;
    const Lg = 11 - v.crouch;
    const sF = xf(4.8, -11.5, v.lean, hipY);
    const sB = xf(-5.0, -11.5, v.lean, hipY);
    const H = xf(3.6 + v.hx, -20.0 + v.hy, v.lean, hipY);

    ctx.save();
    ctx.globalAlpha *= v.alpha;
    if (v.rot) ctx.rotate(v.rot);
    if (v.streaks) streaks(ctx);

    leg(ctx, [-2.2, hipY], v.legB, v.liftB, Lg, P.pantsLo, P.bootLo);
    leg(ctx, [2.0, hipY], v.legF, v.liftF, Lg, P.pants, P.boot);
    arm(ctx, sB, v.aB1, v.aB2, P.smockLo, P.skinLo);

    // body: hunched smock with a rounded back
    smooth(ctx, TORSO.map((q) => xf(q[0], q[1], v.lean, hipY)), P.smock);
    const hl = xf(-3.6, -8.0, v.lean, hipY);
    A.ell(ctx, hl[0], hl[1], 1.8, 3.4, P.smockHi, { stroke: false, rot: v.lean });
    const s0 = xf(-6.0, 0.4, v.lean, hipY), s1 = xf(5.0, 0.4, v.lean, hipY);
    ctx.save();
    ctx.strokeStyle = P.stitch; ctx.lineWidth = 0.8; ctx.setLineDash([1.2, 1.1]);
    ctx.beginPath(); ctx.moveTo(s0[0], s0[1]); ctx.lineTo(s1[0], s1[1]); ctx.stroke();
    ctx.restore();
    if (v.stone) {
      const k = [[-2.6, -9.0], [0.4, -5.6], [-1.2, -2.4]].map((q) => xf(q[0], q[1], v.lean, hipY));
      ctx.save();
      ctx.strokeStyle = P.crack; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(k[0][0], k[0][1]); ctx.lineTo(k[1][0], k[1][1]); ctx.lineTo(k[2][0], k[2][1]);
      ctx.stroke();
      ctx.restore();
    }

    // pencil standing in the breast pocket, then the pocket flap over its foot
    const pc = xf(5.6, -3.6, v.lean, hipY);
    ctx.save();
    ctx.translate(pc[0], pc[1]);
    ctx.rotate(v.lean + 0.35);
    A.rr(ctx, -1.0, -3.2, 2.0, 6.4, 0.6, P.pencil);
    A.poly(ctx, [[-1.0, -3.2], [1.0, -3.2], [0, -5.0]], P.pencilTip);
    ctx.restore();
    A.poly(ctx, [[2.0, -4.8], [7.0, -4.8], [7.0, -0.4], [2.0, -0.4]].map((q) => xf(q[0], q[1], v.lean, hipY)), P.smockLo, { lw: 1.4 });

    ctx.save();
    ctx.translate(H[0], H[1]);
    ctx.rotate(v.hrot + v.lean * 0.6);
    drawHead(ctx, v, P);
    ctx.restore();

    if (v.trail) { // faint arc behind the loupe on a strike
      const t0 = ang(v.trail[0]), t1 = ang(v.trail[1]);
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(sF[0], sF[1], 12, Math.min(t0, t1), Math.max(t0, t1)); ctx.stroke();
      ctx.restore();
    }

    // near arm holds the loupe; lifted to his eye every few seconds
    const hF = arm(ctx, sF, v.aF1 + v.peek * 2.25, v.aF2 + v.peek * 1.24, P.smock, P.skin);
    const lx = hF[0] + A.lerp(1.5, 1.2, v.peek), ly = hF[1] + A.lerp(3.5, -0.5, v.peek);
    A.limb(ctx, hF[0], hF[1], lx, ly, 1.4, P.wood);
    A.ell(ctx, lx, ly, 3.3, 3.3, P.brass);
    A.ell(ctx, lx, ly, 2.3, 2.3, P.loupe);
    ctx.save();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(lx - 0.9, ly - 0.9, 0.6, 0, TAU); ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  function draw(ctx, p) {
    const v = poseFor(p || {});
    ctx.save();
    ctx.translate(-4, 0); // the sprite's visible mass sits a little right of centre; hitbox is centred
    drawFigure(ctx, v, pal(v.stone));
    ctx.restore();
  }

  /* ---------- portrait (200 x 200, centred on 0,0) ---------- */
  const EXPR = {
    neutral: { bt: 0, bi: 0, sq: 0, ey: 1, mo: 'line' },
    happy: { bt: -2, bi: 0, sq: 0.55, ey: 1, mo: 'smile' },
    sad: { bt: -1, bi: -1, sq: 0, ey: 1, mo: 'frown' },
    angry: { bt: 3, bi: 1, sq: 0.35, ey: 0.95, mo: 'tight' },
    surprised: { bt: -6, bi: 0, sq: 0, ey: 1.25, mo: 'o' },
    worried: { bt: -1, bi: -1.2, sq: 0, ey: 1, mo: 'wave' },
  };

  function drawPortrait(ctx, expr, t) {
    const e = EXPR[expr] || EXPR.neutral;
    const P = pal(false);
    const blink = blinkAt(num(t, 0));
    ctx.save();
    ctx.beginPath(); ctx.rect(-100, -100, 200, 200); ctx.clip();

    // shoulders in the smock, pencil and breast pocket at the right
    A.rr(ctx, -98, 60, 196, 84, 36, P.smock);
    ctx.save();
    ctx.translate(72, 62); ctx.rotate(0.21);
    A.rr(ctx, -3.5, -20, 7, 36, 2, P.pencil);
    A.poly(ctx, [[-3.5, -20], [3.5, -20], [0, -29]], P.pencilTip);
    ctx.restore();
    A.rr(ctx, 56, 74, 30, 26, 4, P.smockLo);
    A.poly(ctx, [[-24, 60], [24, 60], [0, 84]], P.shirt);

    // ears, head, grey hair at the temples, flat cap
    A.ell(ctx, -45, -8, 8, 13, P.skin);
    A.ell(ctx, 45, -8, 8, 13, P.skin);
    A.ell(ctx, 0, -10, 46, 52, P.skin);
    A.ell(ctx, -40, -44, 10, 6, P.hair, { rot: -0.4 });
    A.ell(ctx, 40, -44, 10, 6, P.hair, { rot: 0.4 });
    A.ell(ctx, 0, -66, 49, 25, P.cap);
    A.ell(ctx, 0, -49, 56, 6.5, P.capLo);

    // brows: angry tilts the inner ends down, sad and worried lift them
    const by = -33 + e.bt;
    A.ell(ctx, -20, by, 11, 3.6, P.beardLo, { rot: e.bi * 0.25 });
    A.ell(ctx, 20, by, 11, 3.6, P.beardLo, { rot: -e.bi * 0.25 });

    // spectacles, lenses and eyes
    ctx.save();
    ctx.fillStyle = P.lens; ctx.globalAlpha *= 0.4;
    ctx.beginPath();
    ctx.arc(-19, -14, 13, 0, TAU);
    ctx.moveTo(32, -14); ctx.arc(19, -14, 13, 0, TAU);
    ctx.fill();
    ctx.restore();
    A.eye(ctx, -19, -14, 6.5 * e.ey, 0.3, 0, Math.max(blink, e.sq));
    A.eye(ctx, 19, -14, 6.5 * e.ey, 0.3, 0, Math.max(blink, e.sq));
    ctx.save();
    ctx.strokeStyle = P.brass; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-6, -14); ctx.arc(-19, -14, 13, 0, TAU);
    ctx.moveTo(32, -14); ctx.arc(19, -14, 13, 0, TAU);
    ctx.moveTo(-6, -15.5); ctx.quadraticCurveTo(0, -20, 6, -15.5);
    ctx.moveTo(-32, -15); ctx.lineTo(-44, -12);
    ctx.moveTo(32, -15); ctx.lineTo(44, -12);
    ctx.stroke();
    ctx.restore();

    // big bushy grey beard
    const tufts = [[-50, 22, 9], [50, 22, 9], [-42, 40, 15], [42, 40, 15], [-28, 66, 17], [28, 66, 17], [0, 80, 18]];
    for (const q of tufts) A.ell(ctx, q[0], q[1], q[2], q[2], P.beard);
    A.ell(ctx, 0, 46, 56, 42, P.beard);
    A.ell(ctx, -20, 26, 16, 7, P.beardHi, { stroke: false, rot: -0.3 });
    ctx.save();
    ctx.strokeStyle = P.beardLo; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-30, 44); ctx.quadraticCurveTo(-24, 58, -30, 72);
    ctx.moveTo(30, 44); ctx.quadraticCurveTo(24, 58, 30, 72);
    ctx.moveTo(-8, 68); ctx.quadraticCurveTo(0, 76, 8, 68);
    ctx.stroke();
    ctx.restore();

    // nose and moustache over the beard, then the mouth
    A.ell(ctx, 0, 6, 9, 9, P.nose);
    A.ell(ctx, 0, 14, 22, 7, P.beardHi);
    A.ell(ctx, -22, 12, 5, 5, P.beardHi);
    A.ell(ctx, 22, 12, 5, 5, P.beardHi);

    if (e.mo === 'o') {
      A.ell(ctx, 0, 27, 6, 8, P.ink, { stroke: false });
    } else {
      ctx.save();
      ctx.strokeStyle = P.ink; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
      ctx.beginPath();
      if (e.mo === 'smile') { ctx.moveTo(-12, 22); ctx.quadraticCurveTo(0, 34, 12, 22); }
      else if (e.mo === 'frown') { ctx.moveTo(-10, 31); ctx.quadraticCurveTo(0, 20, 10, 31); }
      else if (e.mo === 'tight') { ctx.moveTo(-9, 27); ctx.lineTo(9, 27); }
      else if (e.mo === 'wave') { ctx.moveTo(-11, 27); ctx.quadraticCurveTo(-5.5, 21, 0, 27); ctx.quadraticCurveTo(5.5, 33, 11, 27); }
      else { ctx.moveTo(-9, 26); ctx.quadraticCurveTo(0, 28, 9, 26); }
      ctx.stroke();
      ctx.restore();
    }

    if (expr === 'worried') { // sweat drop
      A.poly(ctx, [[-60, -40], [-64.5, -29], [-55.5, -29]], P.tear, { lw: 1.4 });
      A.ell(ctx, -60, -27, 4.5, 4.5, P.tear, { lw: 1.4 });
    }
    ctx.restore();
  }

  A.register({
    id: 'hugo', w: 24, h: 40,
    draw(ctx, p) { draw(ctx, p); },
    portrait(ctx, expr, t) { drawPortrait(ctx, expr, t); },
  });
})();
