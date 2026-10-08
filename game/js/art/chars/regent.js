/* The Regent (Aurelien Vantard), final boss of chapter 4. Art only, no game logic.
   Drawn facing right; origin (0,0) = centre of the feet; y negative is up. About 121 px tall.
   Loads after js/art/humanoid.js, so this registration replaces the generic boss rig for id 'regent'. */
(function () {
  const OUT = ART.OUT;
  const clamp = ART.clamp;
  const lerp = ART.lerp;

  const C = {
    coat: '#1a1a24', coatLift: '#2a2a36', lining: '#3d1f4f', liningLo: '#24102f',
    gold: '#d9b35a', goldHi: '#f6e1a0', goldLo: '#7d5e24',
    porcelain: '#efe9dc', crack: '#4a4048', ink: '#2a2230',
    skin: '#e6c3a5', hair: '#c9c4cc', hairLo: '#8f8a99', glove: '#f4f1ea',
    trouser: '#15151d', boot: '#0e0e12',
    sand: '#ffd27a', sandHi: '#fff3c4', sandLo: '#b5761f',
  };
  const STATES = ['intro', 'idle', 'walk', 'telegraph', 'slam', 'beam', 'charge', 'summon', 'hurt', 'dead'];
  const EXPRS = ['neutral', 'happy', 'sad', 'angry', 'surprised', 'worried'];
  const HIP = [2, -62];
  const HEAD = [3, -109];
  const SH_NEAR = [8, -91];
  const SH_FAR = [-9, -89];
  // Cracks on the mask (figure space). Phase 1 shows 2, phase 2 shows 5, phase 3 shows all 8.
  const CRACKS = [
    [[16.5, -117], [13, -115.5], [13.5, -112.5], [9.5, -110.5]],
    [[7, -121.5], [9, -119], [5, -117.5]],
    [[17, -106], [13.5, -104.5], [12, -101.5], [8.5, -100.5]],
    [[2.8, -112], [5, -109], [3.5, -106]],
    [[15, -112], [17.5, -109]],
    [[11.5, -115], [7.5, -113.5], [4.5, -115.5]],
    [[13.5, -101], [10.5, -98]],
    [[8, -108], [6.5, -104], [9.5, -102]],
  ];

  function num(v) { const n = Number(v); return isFinite(n) ? n : 0; }
  function stateOf(p) { return STATES.indexOf(p && p.state) >= 0 ? p.state : 'idle'; }
  function phaseOf(p) { return clamp(Math.round(num(p && p.phase)) || 1, 1, 3); }
  function easeOut(k) { return 1 - (1 - k) * (1 - k); }
  function blinkAt(t) { const c = ((t % 3.8) + 3.8) % 3.8; return c < 0.14 ? Math.sin(c / 0.14 * Math.PI) : 0; }

  // Closed filled shape with the dark outline. build(ctx) adds the sub-path.
  function shape(ctx, color, build, lw) {
    ctx.save();
    ctx.beginPath();
    build(ctx);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = lw || 2;
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();
  }

  // Open polyline. pts = [[x, y], ...].
  function polyline(ctx, pts, color, w) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.strokeStyle = color;
    ctx.lineWidth = w || 1.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();
  }

  // Elbow between shoulder S and hand H, pushed sideways by bend (negative = forward).
  function elbow(S, H, bend) {
    const dx = H[0] - S[0], dy = H[1] - S[1];
    const len = Math.hypot(dx, dy) || 1;
    return [(S[0] + H[0]) / 2 - dy / len * bend, (S[1] + H[1]) / 2 + dx / len * bend];
  }

  function arm(ctx, S, H, bend, sleeve) {
    const E = elbow(S, H, bend);
    ART.limb(ctx, S[0], S[1], E[0], E[1], 8.5, sleeve, { lw: 1.6 });
    ART.limb(ctx, E[0], E[1], H[0], H[1], 7, sleeve, { lw: 1.6 });
    ART.ell(ctx, E[0] + (H[0] - E[0]) * 0.82, E[1] + (H[1] - E[1]) * 0.82, 3, 3, C.gold, { lw: 1 });
    ART.ell(ctx, H[0], H[1], 3.6, 3.1, C.glove, { lw: 1.2 });
  }

  function leg(ctx, hip, foot, col) {
    const kx = (hip[0] + foot[0]) / 2 + 1.5, ky = -30 + foot[1] * 0.5;
    ART.limb(ctx, hip[0], hip[1], kx, ky, 10, col, { lw: 1.6 });
    ART.limb(ctx, kx, ky, foot[0], foot[1] - 4, 7.5, col, { lw: 1.6 });
    ART.rr(ctx, foot[0] - 4, foot[1] - 6, 15, 6, 2.5, C.boot, { lw: 1.6 });
  }

  // Cane: B = ferrule (on the ground, or in the air when raised), P = top of the shaft, clock-face pommel.
  function cane(ctx, c, glow) {
    const B = c.B, P = c.P;
    ART.limb(ctx, B[0], B[1], P[0], P[1], 2.8, C.gold, { lw: 1.2 });
    ART.ell(ctx, B[0], B[1] - 1, 2.2, 1.5, C.ink, { lw: 1 });
    const kx = P[0], ky = P[1] - 3.5, gr = 4 + 20 * glow;
    if (glow > 0) {
      ctx.save();
      const g = ctx.createRadialGradient(kx, ky, 1, kx, ky, gr);
      g.addColorStop(0, 'rgba(255,236,170,0.95)');
      g.addColorStop(1, 'rgba(255,210,122,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(kx, ky, gr, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ART.ell(ctx, kx, ky, 4, 4, C.gold, { lw: 1.3 });
    polyline(ctx, [[kx, ky], [kx, ky - 2.6]], '#4a3414', 0.9);
    polyline(ctx, [[kx, ky], [kx + 2.2, ky + 0.6]], '#4a3414', 0.9);
  }

  // Phase 3: four gears orbit the torso. front=false draws the ones behind him, front=true the ones in front.
  function orbit(ctx, tm, front) {
    for (let i = 0; i < 4; i++) {
      const a = tm * 1.4 + i * Math.PI / 2, depth = Math.sin(a);
      if ((depth > 0) !== front) continue;
      ART.gear(ctx, 2 + Math.cos(a) * 40, -72 + depth * 26, 6.5, 8, tm * 2 + i, C.gold, { lw: 1.2 });
    }
  }

  // Joint targets, cane and body offsets for each boss state (upper-body space, feet at 0,0).
  function pose(st, t, tm) {
    const s = {
      alpha: 1, dy: 0, fall: 0, lean: 0, br: Math.sin(tm * 2.2) * 0.9, gl: 0, o: 0, headDx: 0, headDy: 0,
      nearH: [13.2, -58], nearBend: -2, farH: [-17, -58], farBend: 2,
      cane: { B: [14, 0], P: [13, -70], hand: 'near' },
      nearFoot: [8, 0], farFoot: [-6, 0],
    };
    if (st === 'intro') {                       // rises out of the clock, then bows
      s.alpha = clamp(t, 0, 1);
      s.dy = (1 - s.alpha) * -14;
      s.lean = 0.22 * Math.sin(clamp((t - 1.2) / 0.9, 0, 1) * Math.PI);
    } else if (st === 'walk') {
      const ph = tm * 7, sw = Math.sin(ph), cs = Math.cos(ph);
      s.br = -Math.abs(sw) * 1.2;
      s.lean = 0.03;
      s.nearH = [13 + sw * 3, -58];
      s.farH = [-17 - sw * 3, -58];
      s.cane = { B: [14 + sw * 4, 0], P: [13 + sw * 3, -70], hand: 'near' };
      s.nearFoot = [8 + sw * 9, -Math.max(0, cs) * 4];
      s.farFoot = [-6 - sw * 9, -Math.max(0, -cs) * 4];
    } else if (st === 'telegraph') {            // cane raised, glow builds, head trembles
      const g = clamp(t, 0, 1);
      s.lean = -0.04;
      s.gl = g;
      s.headDx = Math.sin(tm * 70) * 0.7 * g;
      s.nearBend = -3;
      s.nearH = [16.2, -118];
      s.cane = { B: [15.5, -100], P: [17, -138], hand: 'near' };
      s.farH = [-17, -62];
      s.farBend = 4;
    } else if (st === 'slam') {                 // cane comes down onto the ground
      const k0 = clamp(t / 0.22, 0, 1), k = k0 * k0;
      s.lean = lerp(-0.04, 0.16, k);
      s.nearBend = -3 - k;
      s.nearH = [lerp(16.2, 18, k), lerp(-118, -56, k)];
      s.cane = { B: [lerp(15.5, 24, k), lerp(-100, 0, k)], P: [lerp(17, 15.9, k), lerp(-138, -75.6, k)], hand: 'near' };
      s.farH = [-17 + 2 * k, -62 + 4 * k];
      s.farBend = 4 - 2 * k;
    } else if (st === 'beam') {                 // palm open toward the beam, cane held behind in the far hand
      s.lean = 0.05;
      s.nearH = [20, -79];
      s.nearBend = 1;
      s.farH = [-19.3, -60];
      s.cane = { B: [-21, 0], P: [-19, -72], hand: 'far' };
    } else if (st === 'charge') {               // lean-in dash, cane levelled like a lance
      const sw = Math.sin(tm * 14), cs = Math.cos(tm * 14);
      s.lean = 0.32;
      s.br = 0;
      s.nearH = [24, -72];
      s.nearBend = 3;
      s.farH = [-20 + sw * 2, -60];
      s.cane = { B: [-12, -66], P: [36, -74], hand: 'near' };
      s.nearFoot = [18 + sw * 6, -Math.max(0, cs) * 5];
      s.farFoot = [-12 - sw * 6, -Math.max(0, -cs) * 5];
    } else if (st === 'summon') {               // arms open wide, coat parts, gears rise
      const o = easeOut(clamp(t / 0.7, 0, 1));
      s.o = o;
      s.lean = -0.05 * o;
      s.nearH = [lerp(13.2, 34, o), lerp(-58, -98, o)];
      s.nearBend = -4 * o;
      s.farH = [lerp(-17, -30, o), lerp(-58, -98, o)];
      s.farBend = 4 * o;
      s.cane = null;
    } else if (st === 'hurt') {                 // recoil, decaying
      const k = 1 - clamp(t / 0.45, 0, 1);
      s.lean = -0.22 * k;
      s.headDx = -1.6 * k;
      s.headDy = 0.9 * k;
      s.gl = k;
    } else if (st === 'dead') {                 // topples forward and fades
      s.fall = 1.5 * easeOut(clamp(t / 0.9, 0, 1));
      s.alpha = 1 - clamp((t - 1.5) / 1.2, 0, 1);
      s.br = 0;
    }
    return s;
  }

  function coatPath(c, tail) {
    c.moveTo(-7, -98);
    c.lineTo(-13, -91);
    c.bezierCurveTo(-17, -84, -15, -76, -13, -70);
    c.bezierCurveTo(-16, -60, -19, -50, -19 - tail, -40);
    c.quadraticCurveTo(-14 - tail * 0.5, -30, -9 - tail * 0.4, -36);
    c.quadraticCurveTo(-4, -30, 0, -37);
    c.quadraticCurveTo(5, -30, 9, -36);
    c.quadraticCurveTo(13, -32, 16, -38);
    c.bezierCurveTo(14, -52, 12, -62, 10, -70);
    c.bezierCurveTo(12, -78, 13, -86, 11, -92);
    c.quadraticCurveTo(8, -97, 4, -99);
  }

  // Filled polygon from a list of points (used for coat shards and summon flaps).
  function poly(ctx, pts, color, lw) {
    shape(ctx, color, (c) => {
      c.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    }, lw);
  }

  function slit(ctx, pts) {
    polyline(ctx, pts, OUT, 4.4);
    polyline(ctx, pts, C.lining, 2.2);
  }

  function drawCoat(ctx, st, ph, tm) {
    const tail = st === 'charge' ? 9 : 0;
    shape(ctx, C.coat, (c) => coatPath(c, tail), 2);
    polyline(ctx, [[-7, -74], [-9, -58], [-9 - tail * 0.4, -40]], ART.shade(C.coat, 0.16), 1.2);
    polyline(ctx, [[-12, -88], [-15, -80], [-13, -72]], '#4a4a60', 1.6); // light from the upper left
    poly(ctx, [[4, -98], [9, -92], [10, -70], [13, -42], [8, -42], [6, -70]], C.lining, 1.4);
    [[7.5, -84], [8.2, -73], [9, -61], [10, -49]].forEach((b, i) => {
      ART.gear(ctx, b[0], b[1], 2.2, 6, i * 0.4, C.gold, { lw: 1 });
    });
    if (ph >= 2) slit(ctx, [[-15, -62], [-11, -58], [-14, -53], [-10, -48], [-13, -45]]);
    if (ph >= 3) {
      slit(ctx, [[1, -56], [4, -51], [2, -46], [6, -42]]);
      const w = Math.sin(tm * 3) * 1.5;
      poly(ctx, [[-17, -40], [-22 + w, -28], [-16, -26], [-13, -36]], C.coat, 1.6);
      poly(ctx, [[-3, -34], [-4 - w, -23], [1, -27], [2, -33]], C.coat, 1.6);
      poly(ctx, [[11, -35], [16 + w, -25], [13, -23], [9, -33]], C.coat, 1.6);
    }
  }

  // Summon: the front panels part, a purple cavity opens and gears rise out of it.
  function chestOpen(ctx, o, tm) {
    if (o <= 0.02) return;
    poly(ctx, [[10, -92], [10 + 12 * o, -86], [12 + 15 * o, -50], [10, -40]], C.coat, 1.6);
    ART.ell(ctx, 8, -80, 1.5 + 4 * o, 2 + 8 * o, C.liningLo, { lw: 1.4 });
    for (let i = 0; i < 3; i++) {
      ART.gear(ctx, 8 + o * (7 + i * 5), -86 + i * 8 - o * 4, 5.4 - i * 0.6, 7, tm * (2 + i), C.gold, { lw: 1.2 });
    }
  }

  function drawHead(ctx, st, ph, t, tm, s) {
    ctx.save();
    ctx.translate(s.headDx, s.headDy);
    ART.ell(ctx, -1, -113, 9, 8, C.hairLo, { rot: 0.25, lw: 1.6 });   // swept-back hair
    ART.ell(ctx, -4, -102, 2.2, 2.8, C.skin, { lw: 1.2 });            // ear
    ART.ell(ctx, HEAD[0], HEAD[1], 9.5, 11.5, C.skin, { lw: 1.6 });
    ART.ell(ctx, HEAD[0] - 1, HEAD[1] - 8.5, 8.5, 4.6, C.hair, { rot: -0.12, lw: 1.4 });

    // Porcelain clock mask over the front half of the face, clipped to the head.
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(HEAD[0], HEAD[1], 9.5, 11.5, 0, 0, Math.PI * 2);
    ctx.clip();
    const mx = HEAD[0] + 6.5, my = HEAD[1] - 1;
    ctx.beginPath();
    ctx.ellipse(mx, my, 7.5, 11.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = C.porcelain;
    ctx.fill();
    ctx.strokeStyle = C.gold;
    ctx.lineWidth = 1.3;
    ctx.stroke();
    [[0, -9.5], [6, 0], [0, 9.5], [-5.5, 0]].forEach((d) => ART.ell(ctx, mx + d[0], my + d[1], 0.7, 0.7, C.gold, { stroke: false }));
    polyline(ctx, [[mx, my], [mx - 0.6, my - 4.5]], C.ink, 1.2);   // hour hand: 23:47
    polyline(ctx, [[mx, my], [mx - 5.9, my - 1.3]], C.ink, 0.9);   // minute hand
    ART.ell(ctx, mx, my, 0.9, 0.9, C.gold, { lw: 0.6 });
    const n = ph >= 3 ? 8 : ph === 2 ? 5 : 2;
    for (let i = 0; i < n; i++) {
      polyline(ctx, CRACKS[i], C.crack, 0.9);
      if (ph >= 2) polyline(ctx, CRACKS[i], 'rgba(255,210,122,0.8)', 0.4);
    }
    ctx.restore();

    ctx.beginPath();                                                  // head outline over the mask edge
    ctx.ellipse(HEAD[0], HEAD[1], 9.5, 11.5, 0, 0, Math.PI * 2);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.6;
    ctx.stroke();

    if (ph >= 3) ART.ell(ctx, -1.5, -110.5, 4, 4, C.goldHi, { stroke: false, alpha: 0.4 });
    ART.eye(ctx, -1.5, -110.5, 2.1, 0.8, 0.1, blinkAt(tm), { lw: 1 });
    polyline(ctx, [[-6, -114.5], [0, -115.6]], '#8a8590', 1.1);

    if (st === 'hurt' && t < 0.3) {                                   // sparks off the mask
      ctx.save();
      ctx.globalAlpha *= clamp(1 - t / 0.3, 0, 1);
      for (let i = 0; i < 5; i++) {
        const a = -1.2 + i * 0.45, r0 = 9, r1 = 13 + (i % 2) * 3;
        polyline(ctx, [[12 + Math.cos(a) * r0, -110 + Math.sin(a) * r0],
          [12 + Math.cos(a) * r1, -110 + Math.sin(a) * r1]], C.goldHi, 1.2);
      }
      ctx.restore();
    }
    ctx.restore();
  }

  // Sand beam from the palm: x +20..+350, y -92..-66 (the engine's beam hitbox).
  function beam(ctx, tm) {
    const x0 = 20, x1 = 350, y0 = -92, y1 = -66, yc = -79;
    const pulse = 0.85 + 0.15 * Math.sin(tm * 30);
    ctx.save();
    const base = ctx.globalAlpha;
    // Three layers (outer glow, body, white core), each fading toward the end of the beam.
    const layer = (col0, col1, y, h, alpha) => {
      const g = ctx.createLinearGradient(x0, 0, x1, 0);
      g.addColorStop(0, col0);
      g.addColorStop(1, col1);
      ctx.fillStyle = g;
      ctx.globalAlpha = base * alpha;
      ctx.fillRect(x0, y, x1 - x0, h);
    };
    layer('rgba(255,190,90,0.55)', 'rgba(255,190,90,0)', y0 - 6, (y1 - y0) + 12, pulse);
    layer('rgba(255,211,122,0.95)', 'rgba(255,211,122,0.12)', y0, y1 - y0, 1);
    layer('rgba(255,250,225,1)', 'rgba(255,250,225,0)', yc - 2.5, 5, 1);
    for (let i = 0; i < 24; i++) {                                    // sand streaming along the beam
      const x = x0 + 8 + ((tm * (120 + (i % 5) * 30) + i * 61) % (x1 - x0 - 16));
      const y = y0 + 4 + ((i * 37) % (y1 - y0 - 8));
      ctx.globalAlpha = base * 0.9 * (1 - (x - x0) / (x1 - x0));
      ctx.fillStyle = i % 2 ? C.sandHi : C.sandLo;
      ctx.beginPath();
      ctx.arc(x, y, 1.2 + (i % 3) * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    const g = ctx.createRadialGradient(x0, yc, 1, x0, yc, 16);        // glow at the palm
    g.addColorStop(0, 'rgba(255,240,190,0.95)');
    g.addColorStop(1, 'rgba(255,240,190,0)');
    ctx.globalAlpha = base;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x0, yc, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Charge: sand streaks trailing behind him.
  function speedLines(ctx, tm) {
    ctx.save();
    ctx.globalAlpha *= 0.5;
    ctx.strokeStyle = C.sand;
    ctx.lineCap = 'round';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const y = -100 + i * 11 + Math.sin(tm * 9 + i) * 2, xEnd = -26 - (i % 3) * 12;
      ctx.beginPath();
      ctx.moveTo(xEnd - 30 - (i % 2) * 18, y);
      ctx.lineTo(xEnd, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Slam: a ground wave from the cane tip, with cracks.
  function shockwave(ctx, t) {
    const u = t - 0.22;
    if (u <= 0) return;
    const r = 8 + u * 140;
    ctx.save();
    ctx.globalAlpha *= clamp(1 - u / 0.9, 0, 1);
    ctx.lineCap = 'round';
    ctx.strokeStyle = C.gold;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(24, 0, r, r * 0.14, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = C.goldHi;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(24, 0, r * 0.82, r * 0.11, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = C.crack;
    ctx.lineWidth = 1.4;
    for (let d = -1; d <= 1; d += 2) {
      for (let i = 0; i < 3; i++) {
        const x0 = 24 + d * (5 + i * 6), x1 = x0 + d * Math.min(18, u * 60);
        ctx.beginPath();
        ctx.moveTo(x0, 1.5);
        ctx.lineTo(x1, 1 + i * 0.6);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function draw(ctx, p) {
    p = p || {};
    const st = stateOf(p);
    const t = Math.max(0, num(p.t));
    const tm = num(p.time);
    const ph = phaseOf(p);
    const s = pose(st, t, tm);
    if (s.alpha <= 0.01) return;

    ctx.save();
    ctx.globalAlpha *= clamp(s.alpha, 0, 1);
    if (st === 'beam') beam(ctx, tm);
    if (st === 'charge') speedLines(ctx, tm);
    ART.ell(ctx, 3, 0.5, 22 - s.fall * 5, 4.2, '#000000', { stroke: false, alpha: 0.28 * (1 - s.fall / 2) });

    ctx.save();
    if (s.fall) ctx.rotate(s.fall);
    ctx.translate(0, s.dy);
    leg(ctx, [-2, -62], s.farFoot, ART.shade(C.trouser, 0.06));
    leg(ctx, [4, -62], s.nearFoot, C.trouser);

    // Upper body pivots at the hip: lean, then breathing offset.
    ctx.save();
    ctx.translate(HIP[0], HIP[1]);
    ctx.rotate(s.lean);
    ctx.translate(-HIP[0], -HIP[1] + s.br);
    arm(ctx, SH_FAR, s.farH, s.farBend, ART.shade(C.coat, 0.08));
    if (s.cane && s.cane.hand === 'far') cane(ctx, s.cane, 0);
    if (ph >= 3) orbit(ctx, tm, false);
    drawCoat(ctx, st, ph, tm);
    if (st === 'summon') chestOpen(ctx, s.o, tm);
    ART.rr(ctx, -6.5, -104, 13, 8, 3, C.coat, { lw: 1.8 });            // high collar
    ART.rr(ctx, -4, -98.5, 9, 2.4, 1, C.lining, { stroke: false });
    drawHead(ctx, st, ph, t, tm, s);
    arm(ctx, SH_NEAR, s.nearH, s.nearBend, C.coat);
    if (s.cane && s.cane.hand === 'near') cane(ctx, s.cane, s.gl);
    if (ph >= 3) orbit(ctx, tm, true);
    ctx.restore();

    ctx.restore();
    if (st === 'slam') shockwave(ctx, t);
    ctx.restore();
  }

  /* ---------- portrait: head and shoulders, 200x200 box centred on (0,0) ---------- */
  function portrait(ctx, expr, t) {
    const ex = EXPRS.indexOf(expr) >= 0 ? expr : 'neutral';
    const bl = ex === 'happy' ? Math.max(0.35, blinkAt(num(t))) : blinkAt(num(t));

    const glow = ctx.createRadialGradient(0, -20, 8, 0, -20, 120);
    glow.addColorStop(0, 'rgba(120,70,165,0.42)');
    glow.addColorStop(1, 'rgba(120,70,165,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-100, -100, 200, 200);

    shape(ctx, C.coat, (c) => {                                       // coat and shoulders
      c.moveTo(-98, 100); c.lineTo(-98, 78);
      c.quadraticCurveTo(-96, 56, -66, 48);
      c.lineTo(-30, 40); c.lineTo(30, 40);
      c.lineTo(66, 48); c.quadraticCurveTo(96, 56, 98, 78);
      c.lineTo(98, 100);
    }, 2.2);
    polyline(ctx, [[-88, 76], [-84, 62], [-68, 52]], '#4b4664', 2);
    ART.rr(ctx, -8, 54, 16, 50, 3, C.lining, { lw: 1.4 });
    ART.gear(ctx, 0, 70, 3.4, 6, 0.2, C.gold, { lw: 1.2 });
    ART.gear(ctx, 0, 88, 3.4, 6, 0.5, C.gold, { lw: 1.2 });

    ART.ell(ctx, -4, -34, 50, 56, C.hairLo, { lw: 2 });               // silver mass behind the head
    ART.rr(ctx, -15, 20, 30, 26, 6, C.skin, { lw: 1.6 });             // neck
    ART.rr(ctx, -28, 30, 56, 18, 8, C.coat, { lw: 2 });               // high collar
    ART.rr(ctx, -20, 34, 40, 4, 2, C.lining, { stroke: false });
    ART.ell(ctx, -43, -16, 6.5, 9, C.skin, { lw: 1.8 });              // ears
    ART.ell(ctx, 43, -16, 6.5, 9, C.skin, { lw: 1.8 });
    ART.ell(ctx, 0, -18, 44, 52, C.skin, { lw: 2 });                  // head

    // Porcelain mask on the viewer's right half of the face, clock hands at 23:47.
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, -18, 44, 52, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.beginPath();
    ctx.ellipse(26, -20, 26, 58, 0, 0, Math.PI * 2);
    ctx.fillStyle = C.porcelain;
    ctx.fill();
    ctx.strokeStyle = C.gold;
    ctx.lineWidth = 2.4;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(26, -20, 22, 0, Math.PI * 2);
    ctx.strokeStyle = C.goldLo;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    for (let i = 0; i < 12; i++) {                                    // tick marks
      const a = i * Math.PI / 6, r0 = i % 3 === 0 ? 15 : 18.5, r1 = 21;
      polyline(ctx, [[26 + Math.sin(a) * r0, -20 - Math.cos(a) * r0],
        [26 + Math.sin(a) * r1, -20 - Math.cos(a) * r1]], C.gold, i % 3 === 0 ? 2 : 1);
    }
    polyline(ctx, [[26, -20], [24.4, -31.9]], C.ink, 2.6);            // hour hand
    polyline(ctx, [[26, -20], [7.4, -24]], C.ink, 1.8);               // minute hand
    ART.ell(ctx, 26, -20, 2.4, 2.4, C.gold, { lw: 1 });
    polyline(ctx, [[14, -62], [20, -52], [17, -45], [24, -36]], C.crack, 1.4);
    polyline(ctx, [[4, -6], [10, 2], [6, 10]], C.crack, 1.2);
    polyline(ctx, [[30, -74], [27, -64], [33, -58]], C.crack, 1.2);
    ctx.restore();
    ctx.beginPath();
    ctx.ellipse(0, -18, 44, 52, 0, 0, Math.PI * 2);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2;
    ctx.stroke();

    shape(ctx, C.hair, (c) => {                                       // swept fringe, visible half
      c.moveTo(-46, -16); c.quadraticCurveTo(-50, -66, -4, -74);
      c.quadraticCurveTo(-18, -60, -26, -52); c.quadraticCurveTo(-36, -42, -42, -20);
    }, 2);

    polyline(ctx, [[-2, -14], [-6, 4], [0, 7]], '#b98b72', 1.6);     // nose
    ART.eye(ctx, -18, -22, ex === 'surprised' ? 10 : 8.5, 0.2, 0, bl, { lw: 1.8 });
    if (ex === 'angry') {                                             // lowered lid
      shape(ctx, C.skin, (c) => {
        c.moveTo(-28, -37); c.lineTo(-6, -31); c.lineTo(-6, -23); c.lineTo(-28, -28);
      }, 1.4);
    }

    const brows = {
      neutral: [[-34, -42], [-21, -42], [-8, -42]],
      happy: [[-34, -43], [-21, -48], [-8, -44]],
      sad: [[-34, -40], [-21, -41], [-8, -49]],
      angry: [[-34, -46], [-21, -44], [-8, -37]],
      surprised: [[-34, -52], [-21, -60], [-8, -53]],
      worried: [[-34, -43], [-21, -46], [-8, -52]],
    };
    polyline(ctx, brows[ex], '#6e6672', 3.2);

    if (ex === 'surprised') {
      ART.ell(ctx, -10, 25, 5.5, 7.5, '#3a1b2a', { lw: 1.4 });
    } else {
      const mouths = {
        neutral: [[-26, 22], [-10, 24], [6, 20]],
        happy: [[-26, 18], [-10, 28], [6, 14]],
        sad: [[-26, 28], [-10, 16], [6, 26]],
        angry: [[-24, 21], [-9, 21], [6, 21]],
        worried: [[-26, 24], [-18, 17], [-10, 23], [-2, 28], [6, 20]],
      };
      polyline(ctx, mouths[ex], '#3a1b2a', 2.6);
    }
  }

  ART.register({ id: 'regent', w: 60, h: 100, draw: draw, portrait: portrait });
})();
