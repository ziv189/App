/* Léo Varin (id 'leo') — apprentice clockmaker, the player.
   Flat vector style, thick dark outlines, light from the upper left.
   draw(): facing RIGHT, origin = centre of the feet (the engine flips left-facing sprites).
   portrait(): 200x200 box centred on (0,0). Contract: game/AGENT_BRIEF.md, section "Art contract". */
(function () {
  const PAL = {
    scarf: '#1f2c55', scarfPale: '#cdd8ea',
    brass: '#d4a94e', brassDk: '#8a6a2a', brassHi: '#f3dc94', lens: '#9fd6e8',
    leather: '#6e4528', leatherLt: '#8a5a36', leatherDk: '#4a2c17',
    shirt: '#f3e7cf', shirtSh: '#d8c7a3',
    skin: '#f0c4a0', skinSh: '#d7a380',
    hair: '#4a3020', hairDk: '#3a2418',
    pants: '#3a3f52', boot: '#3b2616',
    mouth: '#7a2f2f', face: '#f6efe1', gear: '#2a1d12'
  };

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(k) { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); }
  function quad(P0, P1, P2, u) {
    const a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u;
    return [a * P0[0] + b * P1[0] + c * P2[0], a * P0[1] + b * P1[1] + c * P2[1]];
  }

  // Frozen statues: every colour goes to a flat grey.
  function greyOf(hex) {
    const n = parseInt(hex.slice(1), 16);
    const l = ((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11;
    const v = Math.round(clamp(60 + l * 0.6, 0, 255)).toString(16).padStart(2, '0');
    return '#' + v + v + v;
  }
  function palette(frozen) {
    const K = {};
    for (const k in PAL) K[k] = frozen ? greyOf(PAL[k]) : PAL[k];
    return K;
  }

  function blinkAt(T) {
    const k = ((T % 3.7) + 3.7) % 3.7;
    return k < 0.14 ? Math.sin((k / 0.14) * Math.PI) : 0;
  }

  // Pose parameters. Leg and back-arm angles: from straight down, + = forward.
  // wr = direction of the Dawn Wrench from the shoulder (0 = forward, + = down, - = up).
  function pose(p, s) {
    const T = p.time || 0;
    const t = p.t || 0;
    const q = {
      hipY: -19, lean: 0.02, legF: 0.12, legB: -0.12, bB: -0.15, wr: 0.85,
      blink: blinkAt(T), mouth: 0, brow: 0, trail: false, ghost: false
    };
    switch (s) {
      case 'frozen':
        q.blink = 0;
        return q;
      case 'dead':
        q.blink = 1; q.lean = -0.1; q.bB = -1.3; q.legF = 0.5; q.legB = -0.5; q.wr = 1.4;
        return q;
      case 'walk':
      case 'run': {
        const run = s === 'run';
        const ph = T * (run ? 15 : 9), sw = Math.sin(ph), A = run ? 0.9 : 0.5;
        q.legF = sw * A; q.legB = -sw * A;
        q.bB = sw * A * 0.8 - 0.1;                       // back arm swings with the front leg
        q.wr = 0.85 + sw * (run ? 0.3 : 0.15);           // weapon arm swings against it
        q.hipY = -19 - Math.abs(Math.cos(ph)) * (run ? 2.2 : 1);
        q.lean = run ? 0.2 : 0.04;
        break;
      }
      case 'jump':
        q.legF = 0.9; q.legB = -0.5; q.bB = -1.5; q.wr = -0.5; q.lean = 0.1; q.hipY = -18;
        break;
      case 'fall':
        q.legF = 0.45; q.legB = -0.6; q.bB = -1.1; q.wr = 0.6; q.lean = -0.06;
        break;
      case 'land': {
        const k = clamp(1 - t / 0.25, 0, 1);            // knees bend, then he straightens
        q.hipY = -19 + 4 * k; q.legF = 0.12 + 0.25 * k; q.legB = -0.12 - 0.25 * k;
        q.lean = 0.02 + 0.14 * k; q.bB = -0.15 + 0.4 * k;
        break;
      }
      case 'attack': {
        // anticipation (0-0.10 s), swing (0.10-0.22 s), follow-through (0.22-0.38 s)
        q.bB = t < 0.22 ? -1.0 : 0.3;
        if (t < 0.1) {
          const k = smooth(t / 0.1);
          q.wr = lerp(0.85, -2.6, k); q.lean = lerp(0.02, -0.14, k);
          q.legF = lerp(0.12, 0.05, k); q.legB = lerp(-0.12, -0.25, k); q.hipY = -19 + 1.2 * k;
        } else if (t < 0.22) {
          const k = smooth((t - 0.1) / 0.12);
          q.wr = lerp(-2.6, 0.35, k); q.lean = lerp(-0.14, 0.26, k);
          q.legF = lerp(0.05, 0.4, k); q.legB = lerp(-0.25, -0.4, k); q.hipY = lerp(-17.8, -19.5, k);
          q.trail = true;
        } else {
          const k = clamp((t - 0.22) / 0.16, 0, 1);
          q.wr = lerp(0.35, 1.0, k); q.lean = lerp(0.26, 0.16, k);
          q.legF = 0.4; q.legB = -0.4; q.hipY = -19.5;
          q.trail = true;
        }
        break;
      }
      case 'hurt': {
        const f = clamp(1 - t / 0.35, 0, 1);            // flinch back, then recover
        q.lean = 0.02 - 0.3 * f; q.wr = lerp(0.85, -0.6, f); q.bB = -0.1 - 1.2 * f;
        q.legF = 0.15 - 0.1 * f; q.legB = -0.1;
        q.mouth = 0.1 + 0.5 * f; q.blink = Math.max(q.blink, 0.7 * f); q.brow = -0.8 * f;
        break;
      }
      case 'dash':
        q.lean = 0.45; q.hipY = -16; q.legF = 0.9; q.legB = -1.0; q.bB = -1.5; q.wr = 0.25;
        q.ghost = true;
        break;
      case 'talk':
        q.mouth = 0.15 + 0.55 * (0.5 + 0.5 * Math.sin(T * 17));
        q.wr = 0.85 + Math.sin(T * 4.5) * 0.12;
        q.bB = -0.2 + Math.sin(T * 3) * 0.12;
        break;
      default: {
        // idle, slow (Pendule active) and unknown states: breathing
        const b = Math.sin(T * (s === 'slow' ? 1.2 : 2.6));
        q.hipY += b * 0.35; q.lean += b * 0.012; q.wr += Math.sin(T * 2) * 0.04;
      }
    }
    return q;
  }

  // Striped ribbon along a polyline: dark outline, then bands; every `every`-th band is pale.
  function ribbon(ctx, pts, w0, w1, cA, cB, every) {
    const n = pts.length - 1;
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = ART.OUT; ctx.lineWidth = w0 + 3;
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i <= n; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
    ctx.restore();
    for (let i = 0; i < n; i++) {
      const u = i / Math.max(1, n - 1);
      const c = i % every === every - 1 ? cB : cA;
      ART.limb(ctx, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], w0 + (w1 - w0) * u, c, { stroke: false });
    }
  }

  // Lower body, in world space with the hip at (hx, hy).
  function leg(ctx, hx, hy, a, K) {
    const s = Math.sin(a), c = Math.cos(a);
    const kx = hx + s * 9.5 + 1.2, ky = hy + c * 9.5;
    const fx = hx + s * 18.5, fy = hy + c * 18.5;
    ART.limb(ctx, hx, hy, kx, ky, 6.6, K.pants);
    ART.limb(ctx, kx, ky, fx, fy, 5.6, K.pants);
    ART.ell(ctx, fx + 1.6, fy - 1.2, 4.4, 2.6, K.boot);
    ART.ell(ctx, fx + 2.4, fy - 2, 1.4, 0.7, K.leatherLt, { stroke: false });
  }

  // Arm from shoulder to hand, elbow bent slightly backward and down.
  function arm(ctx, sx, sy, hx, hy, cloth, K) {
    const dx = hx - sx, dy = hy - sy, len = Math.hypot(dx, dy) || 1;
    const ex = (sx + hx) / 2 - (dy / len) * 2.4, ey = (sy + hy) / 2 + (dx / len) * 2.4;
    ART.limb(ctx, sx, sy, ex, ey, 5.2, cloth);
    ART.limb(ctx, ex, ey, hx, hy, 4.6, cloth);
    ART.ell(ctx, hx, hy, 2.6, 2.6, K.skin, { lw: 1.4 });
  }

  // Scarf tail: streams behind him. p.vx is scaled by facing so it always trails behind the motion.
  function scarfTail(ctx, p, K) {
    const f = p.facing === -1 ? -1 : 1;
    const T = p.time || 0;
    const v = clamp(((p.vx || 0) * f) / 20, -14, 14);
    const lift = clamp(-(p.vy || 0) / 35, -5, 5);
    const w = Math.sin(T * 9) * (1 + Math.abs(v) * 0.12);
    const back = -7 - 1.1 * v;
    const P0 = [-2.5, -15.2], P1 = [back * 0.45 - 1, -16 + lift * 0.4 - w * 0.4], P2 = [back, -10 + lift + w * 0.6];
    const pts = [];
    for (let i = 0; i <= 6; i++) pts.push(quad(P0, P1, P2, i / 6));
    ribbon(ctx, pts, 6.2, 3.4, K.scarf, K.scarfPale, 3);
  }

  // Waistcoat, cream shirt, belt, pocket watch on its chain (ticking again).
  function torso(ctx, K, T) {
    ART.rr(ctx, -6, 0.5, 12, 4, 2, K.pants, { lw: 1.6 });
    ART.rr(ctx, -6.5, -14, 13, 16, 4.5, K.leather);
    ART.rr(ctx, 2.2, -13.5, 4.2, 10, 1.6, K.shirt, { lw: 1.4 });
    ctx.save();
    ctx.strokeStyle = K.leatherLt; ctx.lineWidth = 0.8; ctx.setLineDash([1.2, 1.2]);
    ctx.beginPath(); ctx.moveTo(-4.5, -12); ctx.lineTo(-4.5, -1); ctx.stroke();
    ctx.restore();
    ART.ell(ctx, 3.4, -8.5, 0.9, 0.9, K.brass, { lw: 0.8 });
    ART.ell(ctx, 3.4, -2.5, 0.9, 0.9, K.brass, { lw: 0.8 });
    ART.rr(ctx, -7, -0.6, 14, 3, 1, K.leatherDk, { lw: 1.2 });
    ART.rr(ctx, 2.6, -0.2, 2.8, 2.2, 0.6, K.brass, { lw: 1 });
    ART.limb(ctx, 3.4, -8.5, 5.6, -2.5, 0.9, K.brass, { stroke: false });
    ART.ell(ctx, 6, 1.4, 2.3, 2.3, K.brass, { lw: 1.2 });
    ART.ell(ctx, 6, 1.4, 1.5, 1.5, K.face, { stroke: false });
    ART.limb(ctx, 6, 1.4, 6 + Math.cos(T * 2.2) * 1.1, 1.4 + Math.sin(T * 2.2) * 1.1, 0.6, K.hairDk, { stroke: false });
  }

  // Head with messy hair, goggles pushed up on the forehead, brow and mouth.
  function head(ctx, q, K) {
    ART.ell(ctx, -0.6, -18.5, 1.8, 2.5, K.skinSh);
    ART.ell(ctx, 1, -19, 7.4, 8.4, K.skin);
    ART.ell(ctx, 8.1, -18.6, 1.2, 1.5, K.skin);
    ART.poly(ctx, [[-7.4, -16.5], [-7.4, -24], [-3.2, -28.8], [1.6, -30.2], [5.4, -28.2], [7.5, -23.2],
      [5.6, -23.2], [3, -23.8], [-1, -23.2], [-4.6, -18.5]], K.hair, { lw: 1.6 });
    ART.poly(ctx, [[-1.5, -29.4], [0.2, -33.4], [2.4, -29.2]], K.hair, { lw: 1.4 });
    ART.poly(ctx, [[2.4, -29.2], [4.6, -32.4], [5, -27.8]], K.hair, { lw: 1.4 });
    ART.limb(ctx, -7, -21, 6.8, -25, 1.4, K.leatherDk, { stroke: false });       // goggle strap
    ART.limb(ctx, -2.6, -27.6, 4.2, -27.5, 1.6, K.brass, { stroke: false });    // goggle bridge
    ART.ell(ctx, -2.6, -27.8, 2.9, 2.9, K.brass, { lw: 1.4 });
    ART.ell(ctx, 4.2, -27.5, 3.2, 3.2, K.brass, { lw: 1.4 });
    ART.ell(ctx, -2.6, -27.8, 1.9, 1.9, K.lens, { lw: 0.8 });
    ART.ell(ctx, 4.2, -27.5, 2.2, 2.2, K.lens, { lw: 0.8 });
    ART.eye(ctx, 4.4, -17.8, 1.9, 0.5, 0, q.blink, { lw: 0.9 });
    ART.limb(ctx, 2.6, -22.6 - q.brow * 0.3, 6.4, -21.6 + q.brow * 1.1, 1.2, K.hairDk, { stroke: false });
    if (q.mouth > 0.08) ART.ell(ctx, 6.4, -14.6, 1.2, 0.3 + q.mouth * 1.4, K.mouth, { lw: 0.9 });
    else ART.limb(ctx, 5.4, -14.6, 7.6, -14.4, 0.9, K.mouth, { stroke: false });
  }

  // Scarf wrap under the chin, with two pale stripes.
  function wrap(ctx, K) {
    ART.ell(ctx, 0.6, -10.8, 5.6, 2.9, K.scarf, { lw: 1.3 });
    ART.limb(ctx, -4, -12.2, 4, -12.2, 0.9, K.scarfPale, { stroke: false });
    ART.limb(ctx, -4, -9.6, 4, -9.6, 0.9, K.scarfPale, { stroke: false });
  }

  function figure(ctx, p, q, K) {
    const hy = q.hipY;
    leg(ctx, 0, hy, q.legB, K);
    leg(ctx, 0, hy, q.legF, K);
    ctx.save();
    ctx.translate(0, hy);
    ctx.rotate(q.lean);
    arm(ctx, 0, -13, Math.sin(q.bB) * 11, -13 + Math.cos(q.bB) * 11, K.shirtSh, K);
    scarfTail(ctx, p, K);
    torso(ctx, K, p.time || 0);
    head(ctx, q, K);
    wrap(ctx, K);
    if (q.trail) {
      // Arc traced by the wrench head (radius 39 from the shoulder): the attack trail.
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(255,215,122,0.35)'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.arc(0, -13, 39, -2.6, q.wr); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,246,214,0.7)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, -13, 39, Math.max(-2.6, q.wr - 0.7), q.wr); ctx.stroke();
      ctx.restore();
    }
    // Front (weapon) arm and the Dawn Wrench: hand 9 px from the shoulder, handle 30 px long.
    const hx = Math.cos(q.wr) * 9, hz = -13 + Math.sin(q.wr) * 9;
    arm(ctx, 0, -13, hx, hz, K.shirt, K);
    const ex = hx + Math.cos(q.wr) * 30, ey = hz + Math.sin(q.wr) * 30;
    ART.limb(ctx, hx, hz, ex, ey, 4.4, K.brass, { lw: 1.4 });
    ART.limb(ctx, hx, hz, ex, ey, 1.2, K.brassHi, { stroke: false });
    ART.rr(ctx, ex - 6.2, ey - 5.8, 12.4, 11.6, 2.6, K.brass, { rot: q.wr, lw: 1.6 });
    ART.ell(ctx, ex + Math.cos(q.wr) * 3.4, ey + Math.sin(q.wr) * 3.4, 2.1, 2.1, PAL.gear, { stroke: false });
    ctx.restore();
  }

  function draw(ctx, p) {
    const s = p.state || 'idle';
    const K = palette(s === 'frozen');
    const q = pose(p, s);
    const dead = s === 'dead';
    const dt = p.t || 0;
    if (s === 'slow') ART.ell(ctx, 0, -23, 17, 29, PAL.lens, { stroke: false, alpha: 0.12 });
    ART.ell(ctx, 0, 0.5, 11, 2.6, '#000000', { stroke: false, alpha: dead ? 0.1 : 0.22 });
    if (dead) {
      // Falls backward around the feet and fades out.
      ctx.rotate(-Math.PI / 2 * smooth(dt / 0.45));
      ctx.globalAlpha *= 1 - smooth((dt - 0.9) / 1.1);
    }
    if (q.ghost) {
      ctx.save();
      ctx.globalAlpha *= 0.25;
      ctx.translate(-13, 0);
      figure(ctx, p, q, K);
      ctx.restore();
    }
    figure(ctx, p, q, K);
  }

  // Brow inner y, brow outer y, eye openness (1 = open), mouth curve (-1 frown .. 1 smile), mouth open (0..1)
  const EXPR = {
    neutral:   [-22, -24, 1.0, 0.0, 0.0],
    happy:     [-26, -28, 0.35, 1.0, 0.3],
    sad:       [-30, -20, 0.85, -0.9, 0.0],
    angry:     [-18, -27, 0.7, -0.5, 0.0],
    surprised: [-35, -37, 1.3, 0.0, 1.0],
    worried:   [-30, -24, 1.0, -0.5, 0.15]
  };

  function portrait(ctx, expr, t) {
    const E = Object.prototype.hasOwnProperty.call(EXPR, expr) ? EXPR[expr] : EXPR.neutral;
    const T = t || 0;
    const k = ((T % 3.9) + 3.9) % 3.9;
    const blink = Math.max(k < 0.14 ? Math.sin((k / 0.14) * Math.PI) : 0, 1 - E[2]);
    const K = PAL;

    const g = ctx.createLinearGradient(0, -100, 0, 100);
    g.addColorStop(0, '#2a3557');
    g.addColorStop(1, '#131a2c');
    ctx.fillStyle = g;
    ctx.fillRect(-100, -100, 200, 200);

    // Scarf tail streaming behind the left shoulder.
    const tail = [];
    for (let i = 0; i <= 6; i++) tail.push(quad([-30, 58], [-62, 46], [-98, 64], i / 6));
    ribbon(ctx, tail, 17, 10, K.scarf, K.scarfPale, 2);

    // Shoulders, waistcoat, cream shirt, lapels, buttons.
    ART.poly(ctx, [[-98, 100], [-94, 74], [-62, 58], [-22, 54], [22, 54], [62, 58], [94, 74], [98, 100]], K.leather, { lw: 2.5 });
    ART.poly(ctx, [[-16, 55], [16, 55], [0, 86]], K.shirt, { lw: 1.6 });
    ART.limb(ctx, -16, 55, -32, 88, 4, K.leatherDk, { stroke: false });
    ART.limb(ctx, 16, 55, 32, 88, 4, K.leatherDk, { stroke: false });
    ART.ell(ctx, 0, 72, 3, 3, K.brass, { lw: 1.2 });
    ART.ell(ctx, 0, 88, 3, 3, K.brass, { lw: 1.2 });

    // Open pocket watch on its chain.
    ctx.save();
    ctx.strokeStyle = K.brass; ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.setLineDash([2, 1.6]);
    ctx.beginPath(); ctx.moveTo(-16, 62); ctx.quadraticCurveTo(-34, 60, -44, 80); ctx.stroke();
    ctx.restore();
    ART.ell(ctx, -46, 86, 8, 8, K.brass, { lw: 2 });
    ART.ell(ctx, -46, 86, 5.4, 5.4, K.face, { stroke: false });
    ART.limb(ctx, -46, 86, -46 + Math.cos(T * 2.2 - 1) * 3.6, 86 + Math.sin(T * 2.2 - 1) * 3.6, 1, K.hairDk, { stroke: false });

    // Ears, face, hair.
    ART.ell(ctx, -44, -2, 7, 10, K.skinSh, { lw: 2.2 });
    ART.ell(ctx, 44, -2, 7, 10, K.skinSh, { lw: 2.2 });
    ART.ell(ctx, 0, -6, 44, 50, K.skin, { lw: 2.5 });
    ART.poly(ctx, [[-46, -10], [-50, -34], [-40, -58], [-14, -70], [14, -70], [40, -58], [50, -32], [46, -8],
      [40, -22], [30, -36], [12, -42], [-6, -43], [-22, -38], [-36, -26], [-42, -12]], K.hair, { lw: 2.5 });
    ART.poly(ctx, [[-12, -66], [-6, -84], [6, -68]], K.hair, { lw: 2 });
    ART.poly(ctx, [[8, -68], [18, -86], [26, -64]], K.hair, { lw: 2 });

    // Goggles pushed up on the forehead, on a leather strap.
    ctx.save();
    ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.moveTo(-46, -22); ctx.quadraticCurveTo(0, -78, 46, -22);
    ctx.strokeStyle = ART.OUT; ctx.lineWidth = 10; ctx.stroke();
    ctx.strokeStyle = K.leatherDk; ctx.lineWidth = 7; ctx.stroke();
    ctx.restore();
    ART.limb(ctx, -17, -52, 17, -52, 4, K.brass, { stroke: false });
    ART.ell(ctx, -17, -52, 15, 15, K.brass, { lw: 2.5 });
    ART.ell(ctx, 17, -52, 15, 15, K.brass, { lw: 2.5 });
    ART.ell(ctx, -17, -52, 10.5, 10.5, K.lens, { lw: 2 });
    ART.ell(ctx, 17, -52, 10.5, 10.5, K.lens, { lw: 2 });
    ART.ell(ctx, -20, -56, 3, 2, '#ffffff', { stroke: false, alpha: 0.7 });
    ART.ell(ctx, 14, -56, 3, 2, '#ffffff', { stroke: false, alpha: 0.7 });

    // Eyes, brows, nose, freckles.
    ART.eye(ctx, -17, -2, 8.5, 0.2, 0, blink, { lw: 2.2 });
    ART.eye(ctx, 17, -2, 8.5, 0.2, 0, blink, { lw: 2.2 });
    ART.limb(ctx, -34, E[1], -10, E[0], 6, K.hairDk, { stroke: false });
    ART.limb(ctx, 10, E[0], 34, E[1], 6, K.hairDk, { stroke: false });
    ART.ell(ctx, 1, 12, 6, 6.5, K.skinSh, { lw: 2.2 });
    [[-24, 14], [-30, 20], [-20, 22], [26, 14], [32, 20]].forEach(function (f) {
      ART.ell(ctx, f[0], f[1], 1.6, 1.6, '#b56e4a', { stroke: false, alpha: 0.7 });
    });

    // Mouth.
    const m = E[3], o = E[4];
    if (o > 0.12) {
      ART.ell(ctx, 0, 33, 12, 3 + o * 9, '#5a2232', { lw: 2.2 });
    } else {
      ctx.save();
      ctx.strokeStyle = K.mouth; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-13, 33 - m * 2.5);
      ctx.quadraticCurveTo(0, 33 + m * 8, 13, 33 - m * 2.5);
      ctx.stroke();
      ctx.restore();
    }

    // Expression details.
    if (expr === 'happy') {
      ART.ell(ctx, -30, 16, 7, 4.5, '#e8907a', { stroke: false, alpha: 0.45 });
      ART.ell(ctx, 30, 16, 7, 4.5, '#e8907a', { stroke: false, alpha: 0.45 });
    }
    if (expr === 'angry') {
      ART.limb(ctx, 34, 4, 40, 10, 2.4, '#b13a3a', { stroke: false });
      ART.limb(ctx, 40, 4, 34, 10, 2.4, '#b13a3a', { stroke: false });
    }
    if (expr === 'worried') ART.ell(ctx, 50, -14, 4, 6.5, K.lens, { lw: 1.6 });

    // Scarf wrap over the chin and shoulders, with pale stripes.
    ART.ell(ctx, 0, 58, 46, 12, K.scarf, { lw: 2.5 });
    ART.limb(ctx, -32, 50, 32, 50, 4, K.scarfPale, { stroke: false });
    ART.limb(ctx, -32, 62, 32, 62, 4, K.scarfPale, { stroke: false });
  }

  ART.register({ id: 'leo', w: 22, h: 46, draw: draw, portrait: portrait });
})();
