/* Enemies: rouage (clockwork crab), fige (frozen citizen), sablier (flying hourglass).
   Facing right; origin = contact point (feet / bottom). Registered with ART. */
(function () {
  const clamp = ART.clamp;
  const P = {
    brass: '#c9963f', brassDark: '#7a5222', eye: '#ff5a3c',
    stone: '#b9b2a6', stoneDark: '#7e776d', crack: '#4a4640', glow: '#ffe27a', glowRed: '#ff7a3c',
    glass: 'rgba(200,235,255,0.55)', sand: '#ffd27a', paper: '#f4efe6', ink: '#3a3a44',
  };

  /* ---- rouage: clockwork crab ---- */
  function drawRouage(ctx, p) {
    const st = p.state || 'idle';
    const t = p.t || 0, tm = p.time || 0;
    const walking = st === 'walk' || st === 'attack';
    const spin = walking ? tm * 9 : tm * 0.6;
    let lunge = 0, open = 0.25 + 0.1 * Math.sin(tm * 3);
    if (st === 'attack') { lunge = Math.min(1, t / 0.12) * 4; open = 0.9; }
    if (st === 'attack' && t > 0.2) lunge = 4 - (t - 0.2) * 14;
    const bodyY = -12 + (walking ? Math.abs(Math.sin(tm * 9)) * -1.5 : 0);
    ctx.save();
    if (st === 'dead') {
      const u = Math.min(1, t / 0.5);
      ctx.globalAlpha *= t > 0.5 ? Math.max(0, 1 - (t - 0.5) / 0.4) : 1;
      ART.gear(ctx, -4 - u * 6, -6 - u * 8, 5, 7, spin, P.brass, { lw: 1 });
      ART.gear(ctx, 6 + u * 4, -4 - u * 4, 3.5, 6, -spin, P.brassDark, { lw: 1 });
      ART.gear(ctx, 1, -16 - u * 10, 2.5, 5, spin * 2, P.brass, { lw: 1 });
      ctx.restore();
      return;
    }
    // legs (4 thin springs)
    for (let i = 0; i < 4; i++) {
      const side = i < 2 ? 1 : -1;
      const fx = -6 + (i % 2) * 8 + side * 0;
      const step = walking ? Math.sin(tm * 14 + i * 1.6) * 3 : 0;
      ART.limb(ctx, fx, bodyY + 2, fx + 6 + step, -1, 1.6, P.brassDark, { lw: 0.8 });
    }
    // body gear
    ART.gear(ctx, lunge, bodyY, 9.5, 8, spin, P.brass, { lw: 1.6 });
    ART.ell(ctx, lunge, bodyY, 3, 3, P.brassDark, { lw: 1 });
    // pincers
    const pincer = (side) => {
      const x0 = lunge + side * 9, y0 = bodyY - 2;
      const ang = side * (0.55 + open * 0.8);
      const x1 = x0 + side * 9 * Math.cos(ang), y1 = y0 - 7 * Math.sin(ang * 0.6) - 2;
      ART.limb(ctx, x0, y0, x1, y1, 3.5, P.brass, { lw: 1 });
      ART.limb(ctx, x1, y1, x1 + side * 3.5, y1 - 3.2, 3, P.brass, { lw: 1 });
      ART.limb(ctx, x1, y1, x1 + side * 3.5, y1 + 2.5, 2.5, P.brass, { lw: 1 });
    };
    pincer(1); pincer(-1);
    // antenna springs
    ART.limb(ctx, lunge + 3, bodyY - 8, lunge + 7, bodyY - 15, 1.4, P.brassDark, { lw: 0.6 });
    ART.limb(ctx, lunge - 3, bodyY - 8, lunge - 6, bodyY - 14, 1.4, P.brassDark, { lw: 0.6 });
    ART.ell(ctx, lunge + 7, bodyY - 16, 1.8, 1.8, P.eye, { lw: 0.6 });
    ART.ell(ctx, lunge - 6, bodyY - 15, 1.6, 1.6, P.eye, { lw: 0.6 });
    ctx.restore();
  }

  /* ---- fige: frozen citizen in stone ---- */
  function drawFige(ctx, p) {
    const st = p.state || 'idle';
    const t = p.t || 0, tm = p.time || 0;
    const active = st !== 'idle';
    const snap = Math.floor(tm * 4) / 4;   // stop-motion "tic-tac"
    let lean = 0, lunge = 0, armUp = 0.2;
    if (st === 'walk') { lean = Math.sin(snap * 12) * 0.05; armUp = 0.4; }
    if (st === 'attack') { lean = 0.35; lunge = Math.min(10, t * 40); armUp = 1.1; }
    if (st === 'hurt') { lean = -0.2; }
    ctx.save();
    if (st === 'dead') {
      const u = Math.min(1, t / 0.6);
      ctx.globalAlpha *= Math.max(0, 1 - Math.max(0, t - 0.5) / 0.5);
      ART.poly(ctx, [[-8, -20], [1, -22], [-3, -36], [-9, -34]], P.stone, { lw: 1.2 });
      ART.poly(ctx, [[3, -22], [10, -24], [8, -30], [2, -28]], P.stoneDark, { lw: 1.2 });
      for (let i = 0; i < 3; i++) ART.ell(ctx, (i - 1) * 6 * u, -4 - u * 6 * i, 1.6, 1.6, P.stoneDark, { stroke: false, alpha: 0.7 });
      ctx.restore();
      return;
    }
    ctx.translate(lunge, 0);
    ctx.rotate(lean);
    // legs
    const stepL = active && st === 'walk' ? (Math.floor(tm * 3.2) % 2 ? 2 : -2) : 0;
    ART.rr(ctx, -6, -22, 5, 22, 2, P.stoneDark, { lw: 1.4 });
    ART.rr(ctx, 1 + stepL, -22, 5, 22, 2, P.stone, { lw: 1.4 });
    ART.rr(ctx, -8 + stepL, -3, 9, 4, 1.5, P.stoneDark, { lw: 1.2 });
    ART.rr(ctx, 0 - stepL, -3, 9, 4, 1.5, P.stone, { lw: 1.2 });
    // coat
    ART.poly(ctx, [[-9, -40], [9, -40], [11, -20], [-11, -20]], P.stone, { lw: 1.6 });
    ART.limb(ctx, -4, -30, 4, -28, 1, P.crack, { stroke: false });
    ART.limb(ctx, 2, -36, -3, -26, 1, P.crack, { stroke: false });
    // arms
    ART.limb(ctx, -7, -37, -11, -27 + armUp * 4, 4.6, P.stoneDark, { lw: 1.2 });
    ART.limb(ctx, 7, -37, 12 + lunge * 0.5, -30 - armUp * 9, 4.6, P.stone, { lw: 1.2 });
    // head
    ART.ell(ctx, 0, -46, 7.5, 8, P.stone, { lw: 1.6 });
    ART.poly(ctx, [[-9, -48], [-6, -58], [6, -58], [9, -49]], '#2b2a33', { lw: 1.2 });   // bowler hat
    ART.ell(ctx, 0, -55, 6.5, 2.5, '#2b2a33', { lw: 1 });
    const glowing = st === 'attack' || st === 'hurt';
    const eyeCol = glowing ? P.glowRed : P.glow;
    const flick = active ? 0.5 + 0.5 * Math.sin(tm * 20) : 0.25;
    ART.ell(ctx, 2.5, -47, 1.9, 1.7, eyeCol, { lw: 0.6, alpha: 0.6 + flick * 0.4 });
    ART.ell(ctx, -2.5, -47, 1.9, 1.7, eyeCol, { lw: 0.6, alpha: 0.6 + flick * 0.4 });
    // cracks glow when attacking
    if (glowing) {
      ART.limb(ctx, -6, -28, -2, -18, 1, P.glowRed, { stroke: false, alpha: 0.9 });
      ART.limb(ctx, 5, -34, 9, -26, 1, P.glowRed, { stroke: false, alpha: 0.9 });
    }
    ART.limb(ctx, -4, -38, -2, -30, 1, P.crack, { lw: 0 });
    ART.limb(ctx, 4, -24, 6, -14, 1, P.crack, { lw: 0 });
    ctx.restore();
  }

  /* ---- sablier: flying hourglass ---- */
  function drawSablier(ctx, p) {
    const st = p.state || 'idle';
    const t = p.t || 0, tm = p.time || 0;
    ctx.save();
    if (st === 'dead') {
      const u = Math.min(1, t / 0.6);
      ctx.translate(0, u * 40);
      ctx.rotate(u * 2.5);
      ctx.globalAlpha *= Math.max(0, 1 - Math.max(0, t - 0.3) / 0.5);
    }
    const flap = st === 'dead' ? 0 : Math.sin(tm * (st === 'attack' ? 30 : 14));
    const wingSpan = st === 'dead' ? 0.2 : 1;
    // paper wings
    ART.poly(ctx, [[-2, -20], [-14 - wingSpan * 6 * flap, -26 - flap * 4], [-12, -14]], P.paper, { lw: 1 });
    ART.poly(ctx, [[2, -20], [14 + wingSpan * 6 * flap, -26 - flap * 4], [12, -14]], P.paper, { lw: 1 });
    ART.limb(ctx, -12 - wingSpan * 3 * flap, -21, -5, -17, 0.6, P.ink, { stroke: false });
    ART.limb(ctx, 12 + wingSpan * 3 * flap, -21, 5, -17, 0.6, P.ink, { stroke: false });
    // glass bulbs
    ART.poly(ctx, [[-7, -32], [7, -32], [1.5, -22], [7, -12], [-7, -12], [-1.5, -22]], P.glass, { lw: 1.4 });
    // brass caps
    ART.rr(ctx, -8.5, -35, 17, 4, 1.5, P.brass, { lw: 1.2 });
    ART.rr(ctx, -8.5, -11, 17, 4, 1.5, P.brass, { lw: 1.2 });
    // sand
    const drop = (tm * 40) % 10;
    ART.limb(ctx, 0, -22, 0, -15 + 0, 1.2, P.sand, { stroke: false });
    ART.ell(ctx, 0, -17 + drop * 0.1, 1.2, 1.4, P.sand, { stroke: false });
    ART.poly(ctx, [[-5, -13], [5, -13], [0, -17]], P.sand, { stroke: false });
    // falling grains trail
    for (let i = 0; i < 3; i++) {
      const y = -8 + ((tm * 30 + i * 9) % 18);
      ART.ell(ctx, Math.sin(tm * 3 + i) * 2, y, 0.9, 0.9, P.sand, { stroke: false, alpha: 0.7 });
    }
    ctx.restore();
  }

  function portraitStub(ctx) {
    ART.ell(ctx, 0, 0, 60, 60, '#333', { lw: 2 });
  }

  const reg = (id, w, h, draw) => ART.register({ id, w, h, draw, portrait: portraitStub });
  reg('rouage', 26, 18, drawRouage);
  reg('fige', 26, 48, drawFige);
  reg('sablier', 26, 34, drawSablier);
})();
