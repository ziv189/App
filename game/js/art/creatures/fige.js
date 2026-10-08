/* Creature "fige": a citizen of Vermeil turned to grey stone, frozen mid-step.
   Facing right; origin (0,0) = centre of the feet, y negative is up. Registered with ART (id 'fige', 26x48).
   idle: still, dim eyes. walk: stop-motion, snaps on a 0.25 s beat. attack: wind-up, arm sweep, eyes and
   cracks turn red-orange. hurt: flinch. dead: splits in two and crumbles to dust. Unknown states act as idle. */
(function () {
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const lerp2 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
  const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
  const easeOut = (x) => 1 - (1 - x) * (1 - x);
  const bez = (a, c, b, t) => {
    const u = 1 - t;
    return [
      u * u * a[0] + 2 * u * t * c[0] + t * t * b[0],
      u * u * a[1] + 2 * u * t * c[1] + t * t * b[1],
    ];
  };
  // deterministic pseudo-random in [0, 1) for the dust specks
  const rnd = (i, s) => {
    const v = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
    return v - Math.floor(v);
  };

  const C = {
    stoneLt: '#c4bdb1', stone: '#aaa398', stoneDk: '#756f66',
    coat: '#7b766d', coatDk: '#5d5951',
    hat: '#43474f', hatDk: '#30333b',
    crack: '#3b3730', dust: '#b8b1a5',
    eyeIdle: '#d9cf82', eyeWalk: '#fff1a8', eyeHot: '#ff5a1f', glow: '#ff6a2a',
  };

  // cracks in upper-body space (they move with the torso)
  const CRACKS = [
    [[-3.2, -49.5], [-1.1, -47.2], [-2.5, -44.2], [-0.6, -41.6]],   // head
    [[-4.6, -34], [-1.8, -29.5], [-3.4, -24.5], [-1.2, -20]],       // coat, back
    [[4.6, -33.5], [3.2, -29.5], [5.4, -25.5]],                     // coat, front
    [[-0.4, -21], [1.9, -16], [0.6, -12.5]],                        // coat, hem
    [[-1.2, -56], [0.3, -54.4], [-0.4, -52.2]],                     // hat crown
  ];

  const EYES = {
    dim:   { col: C.eyeIdle, alpha: 0.5, halo: 0 },
    pale:  { col: C.eyeWalk, alpha: 1, halo: 0.25 },
    hot:   { col: C.eyeHot, alpha: 1, halo: 0.5 },
    flash: { col: '#ffffff', alpha: 1, halo: 0.4 },
  };

  function crack(ctx, pts, col, lw, alpha) {
    ctx.save();
    ctx.globalAlpha *= clamp(alpha, 0, 1);
    ctx.strokeStyle = col;
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
    ctx.restore();
  }

  function glowCracks(ctx, k) {
    const shimmer = 0.75 + 0.25 * Math.sin(k.tm * 18);
    ctx.save();
    ctx.shadowColor = C.glow;
    ctx.shadowBlur = 6;
    for (const pts of CRACKS) crack(ctx, pts, C.glow, 1.3, clamp(k.glow * shimmer * 0.7, 0, 0.7));
    ctx.restore();
  }

  function eyes(ctx, k) {
    const e = k.eye === 'off' ? null : (EYES[k.eye] || EYES.dim);
    const spots = [[0.4, -45.4], [3.9, -45.2]];
    for (const [x, y] of spots) {
      if (!e) {
        ART.ell(ctx, x, y, 1.2, 0.9, C.crack, { stroke: false, alpha: 0.8 });   // empty sockets
        continue;
      }
      if (e.halo) ART.ell(ctx, x, y, 3, 2.6, e.col, { stroke: false, alpha: e.halo });
      ART.ell(ctx, x, y, 1.6, 1.4, e.col, { lw: 0.8, alpha: e.alpha });
    }
  }

  // one leg: the boot snaps to its spot; the hip stays put
  function leg(ctx, bx, lift, limbCol) {
    ART.limb(ctx, bx * 0.3, -15, bx, -4 - lift, 4.2, limbCol, { lw: 1.2 });
    ART.rr(ctx, bx - 3.5, -5 - lift, 8.5, 5, 1.6, C.hat, { lw: 1.3 });
  }

  function body(ctx, k) {
    ctx.save();
    leg(ctx, k.farX, k.farLift, C.stoneDk);
    leg(ctx, k.nearX, k.nearLift, C.stone);

    // upper body: lunge and bob, then lean around the hips
    ctx.translate(k.lunge, k.bob);
    ctx.translate(0, -14);
    ctx.rotate(k.lean);
    ctx.translate(0, 14);

    // far arm, behind the coat
    ART.limb(ctx, -5.5, -36, k.farHand[0], k.farHand[1], 4.2, C.coatDk, { lw: 1.2 });
    ART.ell(ctx, k.farHand[0], k.farHand[1], 2.3, 2.3, C.stone, { lw: 1.1 });

    // long coat with a flared hem
    ART.poly(ctx, [[-8, -38], [7.5, -38], [8, -27], [10.5, -10], [-10.5, -10], [-6.5, -27]], C.coat, { lw: 1.6 });
    ART.poly(ctx, [[-3.5, -38], [1.8, -38], [-0.2, -26]], C.coatDk, { lw: 1 });   // lapel
    ART.ell(ctx, 0.6, -31, 0.9, 0.9, C.stoneLt, { lw: 0.8 });                    // buttons
    ART.ell(ctx, 0.6, -23, 0.9, 0.9, C.stoneLt, { lw: 0.8 });
    ART.limb(ctx, 0.5, -38, 0.5, -41, 4, C.stone, { lw: 1 });                    // neck
    ART.poly(ctx, [[-4.5, -40], [5, -40], [5.5, -36.5], [-4.5, -36.5]], C.coatDk, { lw: 1 });   // collar

    // head, with light from the upper left
    ART.ell(ctx, 0.5, -44.5, 6.2, 6.6, C.stoneLt, { lw: 1.6 });
    ART.ell(ctx, -2.6, -47.4, 2, 1.1, '#ffffff', { stroke: false, alpha: 0.28 });
    eyes(ctx, k);

    // bowler hat: crown, then brim over the head
    ART.ell(ctx, 0.5, -53.6, 5.8, 4.2, C.hat, { lw: 1.3 });
    ART.ell(ctx, -2, -55.6, 2.2, 1.1, '#ffffff', { stroke: false, alpha: 0.12 });
    ART.ell(ctx, 0.5, -50.2, 8.4, 2, C.hatDk, { lw: 1.3 });

    // motion trail of the strike arm (attack only)
    for (const g of k.trail || []) ART.limb(ctx, 5.5, -36, g[0], g[1], 3, C.glow, { stroke: false, alpha: g[2] });

    // near arm, in front of the coat
    ART.limb(ctx, 5.5, -36, k.nearHand[0], k.nearHand[1], 4.4, C.coat, { lw: 1.3 });
    ART.ell(ctx, k.nearHand[0], k.nearHand[1], 2.4, 2.4, C.stoneLt, { lw: 1.1 });

    for (const pts of CRACKS) crack(ctx, pts, C.crack, 1.1, 0.9);
    if (k.glow > 0.02) glowCracks(ctx, k);
    ctx.restore();
  }

  // pose values for one frame; every state is computed from pose.t and pose.time
  function poseFor(pose, st) {
    const t = Math.max(0, num(pose.t, 0));
    const tm = num(pose.time, 0);
    const k = {
      tm, lean: 0, lunge: 0, bob: 0,
      nearX: 0, nearLift: 0, farX: 0, farLift: 0,
      nearHand: [9, -23], farHand: [-7, -23],
      eye: 'dim', glow: 0, trail: null,
    };
    if (st === 'walk') {
      // stop-motion: the pose changes only on each 0.25 s beat; four beats make one step
      const f = ((Math.floor(tm / 0.25) % 4) + 4) % 4;
      k.nearX = [3, 0, -3, 0][f];
      k.nearLift = [0, 0, 0, 2][f];
      k.farX = [-3, 0, 3, 0][f];
      k.farLift = [0, 2, 0, 0][f];
      k.nearHand = [9 - k.nearX * 0.8, -23];   // each arm swings against its own leg
      k.farHand = [-7 - k.farX * 0.8, -23];
      k.bob = f % 2 ? -1 : 0;
      k.lean = f % 2 ? 0.04 : -0.02;
      k.eye = 'pale';
    } else if (st === 'attack') {
      k.eye = 'hot';
      const start = [-5, -28], ctrl = [7, -20], end = [16, -33];
      if (t < 0.16) {                         // wind-up: rear back, cracks begin to warm
        const a = t / 0.16;
        k.lean = -0.2 * a;
        k.lunge = -2 * a;
        k.nearHand = lerp2([9, -23], start, a);
        k.farHand = lerp2([-7, -23], [-9, -33], a);
        k.glow = a;
      } else if (t < 0.28) {                  // strike: the arm sweeps forward along an arc
        const e = easeOut((t - 0.16) / 0.12);
        k.lean = -0.2 + 0.58 * e;
        k.lunge = -2 + 7 * e;
        k.nearHand = bez(start, ctrl, end, e);
        k.trail = [
          [...bez(start, ctrl, end, Math.max(0, e - 0.35)), 0.3 * e],
          [...bez(start, ctrl, end, Math.max(0, e - 0.7)), 0.15 * e],
        ];
        k.farHand = [-9, -33];
        k.glow = 1;
      } else {                                // recovery: the heat drains out
        const r = clamp((t - 0.28) / 0.6, 0, 1);
        k.lean = 0.38 * (1 - r);
        k.lunge = 7 * (1 - r);
        k.nearHand = lerp2(end, [9, -23], r);
        k.farHand = lerp2([-9, -33], [-7, -23], r);
        k.glow = 1 - r;
      }
    } else if (st === 'hurt') {
      const a = clamp(1 - t / 0.3, 0, 1);    // flinch that settles within 0.3 s
      k.lean = -0.28 * a;
      k.lunge = -5 * a;
      k.nearHand = lerp2([9, -23], [12, -28], a);
      k.farHand = lerp2([-7, -23], [-11, -27], a);
      k.eye = t < 0.1 ? 'flash' : 'dim';
      k.glow = 0.5 * a;
    }
    return k;
  }

  function dust(ctx, t) {
    const N = 22;
    ctx.save();
    const puff = clamp(t / 0.8, 0, 1) * (1 - clamp((t - 0.6) / 1.4, 0, 1));
    if (puff > 0.01) ART.ell(ctx, 0, -1.5, 4 + 8 * puff, 2 + 1.5 * puff, C.dust, { stroke: false, alpha: 0.45 * puff });
    for (let i = 0; i < N; i++) {
      const u = t - 0.4 - rnd(i, 1) * 0.5;   // each speck leaves at its own moment
      if (u <= 0) continue;
      const a = 1 - clamp(u / 1.5, 0, 1);
      if (a <= 0.01) continue;
      const x0 = (rnd(i, 2) - 0.5) * 16;
      const y0 = -6 - rnd(i, 3) * 38;
      const vx = (rnd(i, 4) - 0.5) * 14 + x0 * 0.4;
      const vy = -3 - rnd(i, 5) * 7;
      const x = x0 + vx * u;
      const y = Math.min(0, y0 + vy * u + 13 * u * u);   // gravity, settles on the ground
      ctx.globalAlpha = a;
      ctx.fillStyle = C.dust;
      ctx.beginPath();
      ctx.arc(x, y, 0.6 + rnd(i, 6) * 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawDead(ctx, pose) {
    const t = Math.max(0, num(pose.t, 0));
    const k = poseFor({ time: num(pose.time, 0) }, 'idle');
    k.eye = 'off';
    const split = easeOut(clamp(t / 0.45, 0, 1));     // 0..1: the two halves part
    const crumble = clamp((t - 0.45) / 1.0, 0, 1);    // 0..1: the stone gives way
    const fade = 1 - crumble;
    if (fade > 0.01) {
      if (split < 0.01) {
        ctx.save();
        ctx.globalAlpha *= fade;
        body(ctx, k);
        ctx.restore();
      } else {
        for (const side of [-1, 1]) {
          ctx.save();
          ctx.globalAlpha *= fade;
          ctx.translate(side * 4.5 * split, 6 * crumble);
          ctx.rotate(side * 0.2 * split);
          ctx.beginPath();
          ctx.rect(side < 0 ? -40 : 0, -70, 40, 80);   // this half only, in figure space
          ctx.clip();
          body(ctx, k);
          ctx.restore();
        }
      }
    }
    dust(ctx, t);
  }

  function draw(ctx, p) {
    const pose = p || {};
    const st = typeof pose.state === 'string' ? pose.state : 'idle';
    if (st === 'dead') {
      drawDead(ctx, pose);
      return;
    }
    body(ctx, poseFor(pose, st));
  }

  const BROWS = {
    neutral:   [[-36, -14, -12, -16], [12, -16, 36, -14]],
    happy:     [[-36, -16, -12, -18], [12, -18, 36, -16]],
    sad:       [[-34, -12, -12, -22], [12, -22, 34, -12]],
    angry:     [[-36, -28, -12, -16], [12, -16, 36, -28]],
    surprised: [[-36, -24, -12, -30], [12, -30, 36, -24]],
    worried:   [[-34, -12, -12, -24], [12, -24, 34, -12]],
  };

  function portrait(ctx, expr, t) {
    const e = BROWS[expr] ? expr : 'neutral';
    const blink = num(t, 0) % 4 < 0.12 ? 1 : 0;
    ART.poly(ctx, [[-98, 100], [-82, 64], [82, 64], [98, 100]], C.coat, { lw: 3 });   // shoulders
    ART.ell(ctx, 0, 6, 54, 62, C.stoneLt, { lw: 4 });                                  // head
    ART.eye(ctx, -20, 2, 9, 0, 0, blink, { white: C.eyeWalk, pupil: '#3a3320', lw: 2.5 });
    ART.eye(ctx, 20, 2, 9, 0, 0, blink, { white: C.eyeWalk, pupil: '#3a3320', lw: 2.5 });
    for (const [x1, y1, x2, y2] of BROWS[e]) ART.limb(ctx, x1, y1, x2, y2, 5, C.hatDk, { lw: 1.5 });
    crack(ctx, [[24, 22], [34, 30], [28, 44]], C.crack, 2.5, 0.8);
    ctx.save();
    ctx.strokeStyle = C.crack;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (e === 'surprised') {
      ctx.ellipse(0, 40, 7, 9, 0, 0, Math.PI * 2);
      ctx.fillStyle = C.crack;
      ctx.fill();
    } else if (e === 'happy') {
      ctx.moveTo(-14, 36); ctx.quadraticCurveTo(0, 52, 14, 36); ctx.stroke();
    } else if (e === 'sad' || e === 'worried') {
      ctx.moveTo(-14, 46); ctx.quadraticCurveTo(0, 34, 14, 46); ctx.stroke();
    } else if (e === 'angry') {
      ctx.moveTo(-12, 40); ctx.lineTo(12, 44); ctx.stroke();
    } else {
      ctx.moveTo(-13, 42); ctx.lineTo(13, 42); ctx.stroke();
    }
    ctx.restore();
    ART.ell(ctx, 0, -44, 66, 9, C.hatDk, { lw: 3.5 });   // bowler brim
    ART.ell(ctx, 0, -60, 42, 26, C.hat, { lw: 3.5 });    // bowler crown
  }

  ART.register({ id: 'fige', w: 26, h: 48, draw, portrait });
})();
