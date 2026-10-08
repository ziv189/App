/* Mireille Crow (id 'mireille'), thief and ally, 22. Plain browser script.
   Drawn facing right; origin (0,0) = centre of the feet; y negative is up.
   Look: two long red braids, short plum velvet jacket with brass buttons, fingerless
   black gloves, a lockpick tucked in her hair (twirled when idle), a short dagger.
   Canvas axes: pose.vx > 0 is moving right, so the braids stream back. */
(function () {
  const clamp = ART.clamp, lerp = ART.lerp;
  const TAU = Math.PI * 2;
  const SCALE = 0.94;              // a little smaller than Leo
  const GROUND = -2.2;             // ankle height when standing; the boot sole sits on y = 0
  const HIP = -17;                 // hip height when standing
  const THIGH = 7.6, SHIN = 7.2;   // hip to ankle = 14.8
  const UPPER = 6.2, FORE = 5.8;   // shoulder to elbow, elbow to wrist
  const SF = [3.2, -13.4], SB = [-3.2, -13.2];   // shoulder joints, upper-body frame
  const STATES = ['idle', 'walk', 'run', 'jump', 'fall', 'land', 'attack', 'dash', 'hurt', 'dead', 'talk', 'slow', 'frozen'];
  const FRINGE = [[-6.4, -21.0], [-6.8, -25.4], [-5.2, -28.6], [-1.4, -30.0], [2.6, -29.4], [5.4, -27.0],
    [6.0, -24.2], [4.2, -25.4], [1.2, -26.6], [-1.6, -26.8], [-4.2, -25.0], [-5.6, -22.4]];

  const PAL = {
    hair: '#d2402c', hairDk: '#8c2417', hairHi: '#ff8a62', skin: '#e9b796', skinDk: '#c28a6c',
    freckle: '#8d3b24', jacket: '#5d2149', jacketDk: '#3b1430', jacketHi: '#8a4b80',
    shirt: '#f3ebdb', brass: '#d8a94c', steel: '#d6dce4', belt: '#2a1a14',
    pants: '#2e2843', pantsDk: '#211d31', boot: '#3d2719', bootDk: '#2a1a11',
    glove: '#1b1820', brow: '#7f2a1c', eyeIris: '#2f5c48', lipLine: '#6e2f26', mouthIn: '#3a1420', teeth: '#f6efe1',
  };

  const num = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);
  const mod = (v, m) => ((v % m) + m) % m;
  const mix = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];

  function stone(hex) {
    const n = parseInt(hex.slice(1), 16);
    const L = 0.3 * ((n >> 16) & 255) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255);
    const h = (v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0');
    return '#' + h(L * 0.8 + 26) + h(L * 0.82 + 30) + h(L * 0.9 + 38);
  }
  const STONE = {};
  Object.keys(PAL).forEach((k) => { STONE[k] = stone(PAL[k]); });

  /* Two-bone IK: returns the middle joint (j) and the end point (e). Picks the bend closest to (px,py). */
  function ik(ax, ay, tx, ty, l1, l2, px, py) {
    const dx = tx - ax, dy = ty - ay;
    const len = Math.hypot(dx, dy) || 1e-4;
    const d = clamp(len, Math.abs(l1 - l2) + 0.05, l1 + l2 - 0.05);
    const base = Math.atan2(dy, dx);
    const A = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
    const c1 = [ax + l1 * Math.cos(base + A), ay + l1 * Math.sin(base + A)];
    const c2 = [ax + l1 * Math.cos(base - A), ay + l1 * Math.sin(base - A)];
    const first = Math.hypot(c1[0] - px, c1[1] - py) <= Math.hypot(c2[0] - px, c2[1] - py);
    return { j: first ? c1 : c2, e: [ax + d * Math.cos(base), ay + d * Math.sin(base)] };
  }

  function leg(ctx, hip, foot, P, front) {
    const k = ik(hip[0], hip[1], foot[0], foot[1], THIGH, SHIN, hip[0] + 3, (hip[1] + foot[1]) / 2);
    const c = front ? P.pants : P.pantsDk;
    ART.limb(ctx, hip[0], hip[1], k.j[0], k.j[1], 5, c);
    ART.limb(ctx, k.j[0], k.j[1], k.e[0], k.e[1], 4.2, c);
    ART.rr(ctx, k.e[0] - 2.4, k.e[1] - 0.5, 5.8, 2.5, 1.2, front ? P.boot : P.bootDk, { lw: 1.4 });
  }

  /* Arm in the upper-body frame. Returns the hand point and the forearm direction (for the dagger). */
  function arm(ctx, P, sh, hand, sleeve) {
    const k = ik(sh[0], sh[1], hand[0], hand[1], UPPER, FORE, sh[0] - 2.2, sh[1] + 5.5);
    const wx = k.e[0], wy = k.e[1];
    let ux = wx - k.j[0], uy = wy - k.j[1];
    const ul = Math.hypot(ux, uy) || 1;
    ux /= ul; uy /= ul;
    ART.limb(ctx, sh[0], sh[1], k.j[0], k.j[1], 5, sleeve);
    ART.limb(ctx, k.j[0], k.j[1], wx, wy, 4.4, sleeve);
    ART.limb(ctx, wx - ux * 1.8, wy - uy * 1.8, wx, wy, 3.4, P.glove, { lw: 1 });   // glove cuff
    const hx = wx + ux * 2, hy = wy + uy * 2, rot = Math.atan2(uy, ux);
    ART.ell(ctx, hx, hy, 1.9, 1.5, P.glove, { rot, lw: 1.2 });                      // fingerless glove
    ART.ell(ctx, hx + ux * 1.6, hy + uy * 1.6, 1.0, 0.8, P.skin, { rot, lw: 0.8 }); // exposed fingertips
    return { hand: [hx, hy], u: [ux, uy] };
  }

  /* One braid: a chain of plaited segments that sways with time and streams back with speed. */
  function braid(ctx, P, ax, ay, o) {
    const N = o.n, seg = o.seg, rad = o.rad;
    const pts = [[ax, ay]];
    let x = ax, y = ay;
    for (let i = 0; i < N; i++) {
      const a = o.base + 0.05 * i + o.sway * (0.4 + 0.12 * i) * Math.sin(o.t * 4.2 - i * 0.75 + o.ph);
      const L = seg * (1 - 0.04 * i);
      x += Math.sin(a) * L; y += Math.cos(a) * L;
      pts.push([x, y]);
    }
    for (let i = 0; i < N; i++) {
      const p0 = pts[i], p1 = pts[i + 1];
      const r = rad * (1 - 0.5 * i / N);
      ART.ell(ctx, (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, r, r * 1.3, i % 2 ? P.hair : P.hairDk,
        { lw: 1.1, rot: Math.atan2(p1[1] - p0[1], p1[0] - p0[0]) + Math.PI / 2 });
    }
    ART.ell(ctx, x, y, rad * 0.7, rad * 0.7, P.brass, { lw: 1 });
  }

  function sheath(ctx, P) {
    ART.limb(ctx, -4.6, -3.2, -7.4, 3.6, 2.2, P.belt, { lw: 0.9 });
    ART.ell(ctx, -4.4, -3.6, 1.1, 1.1, P.brass, { lw: 0.8 });
  }

  function cracks(ctx) {
    ctx.beginPath();
    ctx.moveTo(-2, -10); ctx.lineTo(0, -7); ctx.lineTo(-1.2, -4.5);
    ctx.moveTo(2.5, -15); ctx.lineTo(1.6, -12.5);
    ctx.strokeStyle = ART.OUT; ctx.lineWidth = 0.9; ctx.stroke();
  }

  function jacket(ctx, P, frozen) {
    ART.poly(ctx, [[-4.6, 1.8], [4.6, 1.8], [5.2, -4.2], [5.6, -10.2], [4.8, -14.2], [2.4, -16.0],
      [-2.4, -16.0], [-4.8, -14.2], [-5.6, -10.2], [-5.2, -4.2]], P.jacket, { lw: 1.6 });
    ART.poly(ctx, [[-4.0, -13.2], [-1.4, -14.4], [-2.2, -9.0], [-4.4, -8.0]], P.jacketHi, { stroke: false, alpha: 0.7 });
    ART.poly(ctx, [[-0.9, -15.6], [1.9, -15.6], [2.4, -4.2], [0.2, -4.2]], P.shirt, { lw: 1 });
    ART.poly(ctx, [[-2.8, -16.2], [2.8, -16.2], [1.4, -13.2], [-1.6, -13.2]], P.jacketDk, { lw: 1 });
    ART.ell(ctx, 2.6, -10.2, 0.9, 0.9, P.brass, { lw: 0.9 });
    ART.ell(ctx, 2.6, -6.2, 0.9, 0.9, P.brass, { lw: 0.9 });
    ART.limb(ctx, -4.4, 1.2, 4.4, 1.2, 1.1, P.brass, { stroke: false });
    ART.rr(ctx, -5.3, -4.8, 10.6, 2.2, 0.8, P.belt, { lw: 1 });
    ART.rr(ctx, 1.0, -5.0, 2.2, 2.6, 0.5, P.brass, { lw: 0.9 });
    if (frozen) cracks(ctx);
  }

  /* Lockpick in her hair. Twirls (full turn about its base) when idle; otherwise stays tucked.
     It is drawn behind the head while its tip points down, in front otherwise. */
  function pickPart(ctx, P, S, behind) {
    const a = S.twirl ? S.tm * 5.2 - 1.2 : -2.05;
    if ((Math.sin(a) > 0) !== behind) return;
    const bx = -3.2, by = -27, L = 6.4;
    const tx = bx + Math.cos(a) * L * 0.85, ty = by + Math.sin(a) * L;
    ART.limb(ctx, bx, by, tx, ty, 1.2, P.steel, { lw: 0.8 });
    ART.limb(ctx, tx, ty, tx + Math.cos(a + 1.5) * 1.3, ty + Math.sin(a + 1.5) * 1.3, 0.9, P.steel, { lw: 0.6 });
    ART.ell(ctx, bx, by, 1.2, 1.2, P.brass, { lw: 0.8 });
  }

  function head(ctx, P, S) {
    ctx.save();
    ctx.translate(0.2, -16.2); ctx.rotate(S.tilt); ctx.translate(-0.2, 16.2);
    ART.ell(ctx, -0.6, -22.4, 7, 7.2, P.hair, { lw: 1.6 });                       // hair volume behind the head
    ART.ell(ctx, 1.4, -29.0, 2.6, 0.8, P.hairHi, { stroke: false, alpha: 0.7, rot: -0.15 });
    pickPart(ctx, P, S, true);
    ART.ell(ctx, 0.4, -22.2, 5.8, 6.3, P.skin, { lw: 1.6 });
    ART.ell(ctx, -1.6, -21.4, 1.2, 1.7, P.skinDk, { lw: 0.9 });                   // ear
    ART.poly(ctx, FRINGE, P.hair, { lw: 1.4 });
    ctx.beginPath(); ctx.moveTo(-5.0, -22.4); ctx.quadraticCurveTo(-2.0, -27.5, 3.8, -27.6);
    ctx.strokeStyle = P.hairDk; ctx.lineWidth = 0.8; ctx.stroke();
    ART.eye(ctx, 3.0, -22.5, 1.5, S.lookX, S.lookY, S.blink, { lw: 0.9, pupil: P.eyeIris });
    ctx.beginPath(); ctx.moveTo(1.6, -25.6); ctx.quadraticCurveTo(3.0, -26.6, 4.8, -25.9);
    ctx.strokeStyle = P.brow; ctx.lineWidth = 0.9; ctx.lineCap = 'round'; ctx.stroke();
    if (S.mouth > 0.05) {
      ART.ell(ctx, 3.9, -18.6, 0.9, 0.3 + 0.9 * S.mouth, P.mouthIn, { lw: 0.7 });
    } else {
      ctx.beginPath(); ctx.moveTo(2.2, -18.8); ctx.quadraticCurveTo(3.9, -17.6, 5.2, -19.2);
      ctx.strokeStyle = P.lipLine; ctx.lineWidth = 0.8; ctx.stroke();
    }
    ART.ell(ctx, 5.6, -21.0, 0.7, 0.9, P.skinDk, { stroke: false });              // nose tip
    [[2.8, -19.2], [4.0, -18.3], [2.2, -17.9]].forEach(([x, y]) => ART.ell(ctx, x, y, 0.35, 0.35, P.freckle, { stroke: false }));
    pickPart(ctx, P, S, false);
    ctx.restore();
  }

  /* Short dagger in the hand: grip, brass guard, steel blade along the forearm direction. */
  function dagger(ctx, P, g, u) {
    const n = [-u[1], u[0]];
    const bx = g[0] + u[0] * 1.2, by = g[1] + u[1] * 1.2;
    ART.limb(ctx, g[0] - u[0] * 2.4, g[1] - u[1] * 2.4, bx, by, 1.6, P.belt, { lw: 0.8 });
    ART.limb(ctx, bx + n[0] * 2.3, by + n[1] * 2.3, bx - n[0] * 2.3, by - n[1] * 2.3, 1.3, P.brass, { lw: 0.8 });
    const sx = bx + u[0] * 0.8, sy = by + u[1] * 0.8;
    ART.poly(ctx, [[sx + n[0] * 1.3, sy + n[1] * 1.3], [sx + u[0] * 8.4, sy + u[1] * 8.4],
      [sx - n[0] * 1.3, sy - n[1] * 1.3]], P.steel, { lw: 1 });
  }

  function trail(ctx, pts) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    ctx.quadraticCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1]);
    ctx.strokeStyle = 'rgba(250,240,255,0.55)'; ctx.lineWidth = 2.4; ctx.stroke();
    ctx.restore();
  }

  function streaks(ctx, a) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(250,240,255,' + (0.5 * a).toFixed(2) + ')';
    ctx.lineWidth = 1.6;
    [[-9, -19, -6], [-15, -15, -5], [-21, -22, -8]].forEach(([y, x0, x1]) => {
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
    });
    ctx.restore();
  }

  /* Dagger hand path for the attack, in the upper-body frame: wind-up low behind, arc forward, follow through. */
  function strikeHand(a) {
    const R = [4.6, -2.0], K0 = [-5.2, -6.5], K1 = [13.2, -15.5], K2 = [11.0, -9.0];
    const q = clamp(a, 0, 1);
    if (q < 0.3) return mix(R, K0, q / 0.3);
    if (q < 0.6) {
      const u = (q - 0.3) / 0.3, m = mix(K0, K1, u);
      return [m[0], m[1] - 5 * Math.sin(Math.PI * u)];
    }
    return mix(K1, K2, (q - 0.6) / 0.4);
  }

  /* Walk and run: opposed arms and legs, a hip bob at double stride frequency. */
  function gait(S, c, stride, lift, lean, hipBase, armK, armY) {
    S.lean = lean;
    S.hy = hipBase + 0.8 * Math.cos(2 * c);
    S.ff = [0.8 + stride * Math.sin(c), GROUND - lift * Math.max(0, Math.cos(c))];
    S.bf = [0.8 - stride * Math.sin(c), GROUND - lift * Math.max(0, -Math.cos(c))];
    const dy = armY + 0.8 * Math.cos(2 * c);
    S.fa = [SF[0] - armK * Math.sin(c), SF[1] + dy];
    S.ba = [SB[0] + armK * Math.sin(c), SB[1] + dy];
  }

  /* Turns the pose into joint targets and flags. Unknown states behave like idle. */
  function pose(pz) {
    const p = pz || {};
    const st = STATES.indexOf(p.state) >= 0 ? p.state : 'idle';
    const time = num(p.time), t = Math.max(0, num(p.t)), vx = num(p.vx);
    const wind = clamp(vx * 0.0024, -0.6, 0.6);
    const S = {
      tm: time, hx: 0, hy: HIP, dy: 0, lean: 0.05, tilt: 0, sx: 1, sy: 1, rot: 0, alpha: 1,
      ff: [2.2, GROUND], bf: [-2.4, GROUND], fa: [4.6, -2.0], ba: [-4.4, -2.0],
      blink: mod(time, 3.6) < 0.12 ? 1 : 0, lookX: 0.4 + 0.4 * Math.sin(time * 0.6), lookY: -0.1,
      mouth: 0, twirl: false, dagger: false, frozen: false, streak: 0, aura: 0, trail: null,
      sway: 0.16 + Math.min(0.3, Math.abs(vx) * 0.0012), bb: -wind,
    };
    switch (st) {
      case 'walk': gait(S, time * 7.2, 3.8, 2.6, 0.06, -16.4, 3.2, 10.3); break;
      case 'run': gait(S, time * 11.5, 5, 4.4, 0.2, -15.2, 4, 6.6); S.sway *= 1.1; break;
      case 'jump':
        S.hy = -17.6; S.lean = 0.08; S.sy = 1.05; S.sx = 0.97;
        S.ff = [4.4, -7.4]; S.bf = [-3.8, -4.4]; S.fa = [7.6, -21.4]; S.ba = [-7, -15.2]; S.bb += 0.2;
        break;
      case 'fall':
        S.hy = -17.4; S.lean = -0.03; S.sy = 1.03;
        S.ff = [3.4, -3.6]; S.bf = [-2.8, -3]; S.fa = [13.4, -13.2]; S.ba = [-10.8, -15.4]; S.bb -= 0.05;
        break;
      case 'land': {
        const k = 1 - Math.min(1, t / 0.2);
        S.hy = HIP + 4.6 * k; S.lean = 0.28 * k; S.sx = 1 + 0.08 * k; S.sy = 1 - 0.1 * k;
        S.ff = [3.6, GROUND]; S.bf = [-3.6, GROUND]; S.fa = [5.4, -4.6]; S.ba = [-5, -4];
        break;
      }
      case 'attack': {
        const a = Math.min(1, t / 0.32);
        S.fa = strikeHand(a); S.ba = [-5.2, -4]; S.dagger = true;
        S.lean = a < 0.6 ? lerp(-0.08, 0.25, a / 0.6) : lerp(0.25, 0.12, (a - 0.6) / 0.4);
        S.hy = -16.2; S.ff = [5.6, GROUND]; S.bf = [-3.2, GROUND];
        S.bb += 0.25 * Math.sin(Math.PI * a);
        S.trail = a > 0.3 && a < 0.8 ? [strikeHand(a - 0.2), strikeHand(a - 0.1), strikeHand(a)] : null;
        break;
      }
      case 'dash':
        S.hy = -12.8; S.lean = 0.55; S.ff = [7.2, -2.6]; S.bf = [-8.6, -1.8];
        S.fa = [7.2, -6.2]; S.ba = [-5.2, -3.4]; S.bb = -1.05; S.sway = 0.08; S.streak = 1;
        break;
      case 'hurt': {
        const k = Math.max(0, 1 - t / 0.4);
        S.hy = -16.6; S.hx = 1.6 * Math.sin(t * 38) * k; S.lean = -0.34 * k; S.tilt = -0.28 * k;
        S.ff = [1.4, GROUND]; S.bf = [-2.2, GROUND]; S.fa = [-1.2, -19.2]; S.ba = [-7.2, -10.2];
        S.bb = 0.6 * k - wind; S.blink = 0.4 + 0.6 * k; S.mouth = 0.7 * k;
        break;
      }
      case 'dead': {
        const a = Math.min(1, t / 0.7), e = a * (2 - a);
        S.rot = -1.5 * e; S.hy = -16.6; S.ff = [2.4, GROUND]; S.bf = [-2.6, GROUND + 0.3];
        S.fa = [4.4, -2.2]; S.ba = [-4.4, -1.6]; S.blink = 1; S.sway = 0; S.bb = 0;
        S.alpha = 1 - clamp((t - 0.9) / 0.6, 0, 1);
        break;
      }
      case 'talk':
        S.lean = 0.04 + 0.02 * Math.sin(time * 1.6); S.tilt = 0.06 + 0.03 * Math.sin(time * 1.3);
        S.fa = [7.6 + 1.2 * Math.sin(time * 4.2), -7.6 + 1.2 * Math.cos(time * 3.1)];
        S.mouth = 0.5 + 0.5 * Math.sin(time * 16); S.lookX = 0.6;
        break;
      case 'slow':
        S.tm = time * 0.4; S.sway *= 0.6; S.aura = 0.12 + 0.05 * Math.sin(time * 2.5);
        break;
      case 'frozen':
        S.frozen = true; S.tm = 0; S.sway = 0; S.blink = 0.85; S.lookX = 0; S.lookY = 0; S.bb = -0.1;
        break;
      default:
        break;   // idle: breathing, sly glance, lockpick twirl
    }
    S.twirl = st === 'idle' || st === 'talk' || st === 'slow';
    if (st !== 'dead' && st !== 'frozen') S.dy = 0.3 * Math.sin(S.tm * 2.1) - 0.1;
    return S;
  }

  function draw(ctx, p) {
    const S = pose(p);
    const P = S.frozen ? STONE : PAL;
    ctx.save();
    ctx.globalAlpha *= S.alpha;
    ctx.scale(SCALE * S.sx, SCALE * S.sy);
    if (S.rot) ctx.rotate(S.rot);
    if (S.aura > 0) ART.ell(ctx, 0, -22, 13, 25, '#ffd98a', { stroke: false, alpha: S.aura });
    if (S.streak > 0) streaks(ctx, S.streak);
    const hip = [S.hx, S.hy];
    leg(ctx, hip, S.bf, P, false);
    ART.rr(ctx, S.hx - 4.4, S.hy - 2.6, 8.8, 5.4, 2.2, P.pants, { lw: 1.6 });
    leg(ctx, hip, S.ff, P, true);

    ctx.save();
    ctx.translate(S.hx, S.hy + S.dy);
    ctx.rotate(S.lean);
    braid(ctx, P, -5.0, -23.0, { t: S.tm, ph: 1.9, sway: S.sway, base: -0.5 + S.bb * 0.9, n: 7, seg: 3.3, rad: 2.2 });
    arm(ctx, P, SB, S.ba, P.jacketDk);
    jacket(ctx, P, S.frozen);
    if (!S.dagger) sheath(ctx, P);
    braid(ctx, P, -4.4, -19.4, { t: S.tm, ph: 0, sway: S.sway, base: -0.22 + S.bb, n: 7, seg: 3.3, rad: 2.2 });
    ART.limb(ctx, 0.4, -14.6, 0.4, -18, 4, P.skin, { lw: 1 });                  // neck
    head(ctx, P, S);
    if (S.trail) trail(ctx, S.trail);
    const fa = arm(ctx, P, SF, S.fa, P.jacket);
    if (S.dagger) dagger(ctx, P, fa.hand, fa.u);
    ctx.restore();
    ctx.restore();
  }

  const EXPR = {
    neutral: { bo: -29, bi: -31, lid: 0, mouth: 'smirk' },
    happy: { bo: -33, bi: -36, lid: 0, mouth: 'grin', arcs: true },
    sad: { bo: -28, bi: -38, lid: 0.25, mouth: 'frown' },
    angry: { bo: -33, bi: -25, lid: 0.4, mouth: 'tight' },
    surprised: { bo: -40, bi: -41, lid: 0, mouth: 'o', eye: 8 },
    worried: { bo: -30, bi: -36, lid: 0.1, mouth: 'wavy' },
  };

  function portrait(ctx, expr, t) {
    const E = EXPR[expr] || EXPR.neutral;
    const tm = num(t), blink = mod(tm, 3.6) < 0.12 ? 1 : 0;
    const bg = ctx.createLinearGradient(0, -100, 0, 100);
    bg.addColorStop(0, '#4a2440'); bg.addColorStop(1, '#1d1420');
    ctx.fillStyle = bg; ctx.fillRect(-100, -100, 200, 200);
    const glow = ctx.createRadialGradient(-50, -60, 6, -50, -60, 130);
    glow.addColorStop(0, 'rgba(255,190,140,0.3)'); glow.addColorStop(1, 'rgba(255,190,140,0)');
    ctx.fillStyle = glow; ctx.fillRect(-100, -100, 200, 200);

    ART.ell(ctx, 0, -22, 52, 56, PAL.hair, { lw: 2.5 });                       // hair volume
    ART.limb(ctx, -18, -62, -27, -80, 2.4, PAL.steel, { lw: 1 });              // lockpick
    ART.ell(ctx, -18, -62, 2.4, 2.4, PAL.brass, { lw: 1 });
    ART.rr(ctx, -14, 18, 28, 42, 6, PAL.skin, { lw: 2 });                      // neck
    ART.poly(ctx, [[-84, 100], [-80, 72], [-68, 54], [-40, 44], [-14, 46], [0, 60], [14, 46], [40, 44],
      [68, 54], [80, 72], [84, 100]], PAL.jacket, { lw: 2.5 });
    ART.poly(ctx, [[-70, 60], [-52, 50], [-44, 56], [-62, 74]], PAL.jacketHi, { stroke: false, alpha: 0.5 });
    ART.poly(ctx, [[-14, 45], [0, 66], [14, 45]], PAL.shirt, { lw: 1.5 });
    ART.ell(ctx, 0, 78, 3.2, 3.2, PAL.brass, { lw: 1.4 });
    ART.ell(ctx, 0, 93, 3.2, 3.2, PAL.brass, { lw: 1.4 });
    braid(ctx, PAL, -40, -4, { t: tm, ph: 0.6, sway: 0.05, base: -0.12, n: 8, seg: 10.5, rad: 5.4 });
    braid(ctx, PAL, 40, -4, { t: tm, ph: 0, sway: 0.05, base: 0.12, n: 8, seg: 10.5, rad: 5.4 });

    ART.ell(ctx, -37, -12, 6, 9, PAL.skin, { lw: 2 });
    ART.ell(ctx, 37, -12, 6, 9, PAL.skin, { lw: 2 });
    ART.ell(ctx, -37, 2, 2.4, 2.4, PAL.brass, { lw: 1 });                      // hoop earring
    ART.ell(ctx, 0, -14, 37, 42, PAL.skin, { lw: 2.5 });
    ctx.save();
    ctx.beginPath(); ctx.ellipse(0, -14, 37, 42, 0, 0, TAU); ctx.clip();
    ART.ell(ctx, 18, -6, 26, 46, '#b9765a', { stroke: false, alpha: 0.2 });   // shade on the right
    ctx.restore();
    ART.poly(ctx, [[-40, -14], [-42, -40], [-30, -62], [-4, -70], [20, -66], [41, -50], [41, -30],
      [30, -36], [14, -38], [-6, -40], [-24, -32], [-36, -20]], PAL.hair, { lw: 2 });
    ART.limb(ctx, -26, -52, 6, -60, 2.4, PAL.hairHi, { stroke: false, alpha: 0.6 });

    const r = E.eye || 6.2;
    [-14, 14].forEach((x) => {
      if (E.arcs) {
        ctx.save();
        ctx.beginPath(); ctx.arc(x, -13, 5.5, Math.PI * 1.2, Math.PI * 1.8);
        ctx.strokeStyle = ART.OUT; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.stroke();
        ctx.restore();
        return;
      }
      ART.eye(ctx, x, -14, r, 0.4, 0, blink, { lw: 2, pupil: PAL.eyeIris });
      if (E.lid) {
        const top = -14 - r - 1.5, h = (2 * r + 1.5) * E.lid;
        ctx.save();
        ctx.fillStyle = PAL.skin; ctx.fillRect(x - r - 2, top, 2 * r + 4, h);
        ctx.beginPath(); ctx.moveTo(x - r - 0.5, top + h); ctx.lineTo(x + r + 0.5, top + h);
        ctx.strokeStyle = ART.OUT; ctx.lineWidth = 1.8; ctx.stroke();
        ctx.restore();
      }
    });

    ctx.save();
    ctx.strokeStyle = PAL.brow; ctx.lineWidth = 3.6; ctx.lineCap = 'round';
    [-1, 1].forEach((s) => {
      ctx.beginPath();
      ctx.moveTo(s * 26, E.bo);
      ctx.quadraticCurveTo(s * 16, (E.bo + E.bi) / 2 - 3, s * 7, E.bi);
      ctx.stroke();
    });
    ctx.beginPath(); ctx.moveTo(3, -6); ctx.quadraticCurveTo(6, 2, 2, 7); ctx.quadraticCurveTo(0, 9, -3, 7.5);
    ctx.strokeStyle = PAL.skinDk; ctx.lineWidth = 2.2; ctx.stroke();
    ctx.restore();

    [[-22, 2], [-17, 5], [-11, 2], [11, 2], [17, 5], [22, 1]].forEach(([x, y]) => ART.ell(ctx, x, y, 1.1, 1.1, PAL.freckle, { stroke: false }));
    if (E.arcs) [-22, 22].forEach((x) => ART.ell(ctx, x, 10, 7, 4.5, '#e8837a', { stroke: false, alpha: 0.4 }));

    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const m = E.mouth;
    if (m === 'smirk') {
      ctx.beginPath(); ctx.moveTo(-11, 30); ctx.quadraticCurveTo(2, 36, 12, 26);
      ctx.strokeStyle = PAL.lipLine; ctx.lineWidth = 3; ctx.stroke();
    } else if (m === 'grin') {
      ctx.beginPath(); ctx.moveTo(-15, 24); ctx.quadraticCurveTo(0, 26, 15, 24); ctx.quadraticCurveTo(0, 46, -15, 24);
      ctx.closePath(); ctx.fillStyle = PAL.mouthIn; ctx.fill(); ctx.strokeStyle = ART.OUT; ctx.lineWidth = 2.4; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-11, 25.5); ctx.quadraticCurveTo(0, 28, 11, 25.5); ctx.quadraticCurveTo(0, 31, -11, 25.5);
      ctx.fillStyle = PAL.teeth; ctx.fill();
    } else if (m === 'frown') {
      ctx.beginPath(); ctx.moveTo(-11, 38); ctx.quadraticCurveTo(0, 28, 11, 38);
      ctx.strokeStyle = PAL.lipLine; ctx.lineWidth = 3; ctx.stroke();
    } else if (m === 'tight') {
      ctx.beginPath(); ctx.moveTo(-12, 31); ctx.lineTo(12, 31);
      ctx.moveTo(-12, 31); ctx.lineTo(-13.5, 34.5); ctx.moveTo(12, 31); ctx.lineTo(13.5, 34.5);
      ctx.strokeStyle = PAL.lipLine; ctx.lineWidth = 2.8; ctx.stroke();
    } else if (m === 'o') {
      ART.ell(ctx, 0, 32, 5.5, 7, PAL.mouthIn, { lw: 2.2 });
    } else if (m === 'wavy') {
      ctx.beginPath(); ctx.moveTo(-11, 34); ctx.quadraticCurveTo(-5.5, 28, 0, 34); ctx.quadraticCurveTo(5.5, 40, 11, 34);
      ctx.strokeStyle = PAL.lipLine; ctx.lineWidth = 2.8; ctx.stroke();
    }
    ctx.restore();
  }

  ART.register({ id: 'mireille', w: 22, h: 46, draw, portrait });
})();
