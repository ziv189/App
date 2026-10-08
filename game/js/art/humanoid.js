/* Shared rig for every person in the game: player, NPCs, Regent, Juliette, Gaspard, Elias.
   Drawn facing right; origin (0,0) = centre of the feet; y negative is up. Registers all people with ART. */
(function () {
  const OUT = ART.OUT;
  const clamp = ART.clamp;
  const lerp = ART.lerp;

  const SPEC = {
    leo: { k: 1, skin: '#f1c7a0', hair: '#3a2a22', hairStyle: 'short', coat: '#7a4a2b', shirt: '#efe6d2',
      pants: '#3b3f4e', boots: '#2a1d17', scarf: '#2d4a7a', scarfStripe: '#d9c27a', goggles: true,
      weapon: 'wrench', metal: '#c99a3b', hat: 'none' },
    mireille: { k: 0.96, skin: '#e8b89a', hair: '#b8462b', hairStyle: 'braids', coat: '#5b2a4e', trim: '#c99a3b',
      shirt: '#f4efe6', pants: '#2f2a3a', boots: '#4a2e1d', weapon: 'dagger', metal: '#cfd5dc', hat: 'none' },
    gaspard: { k: 1.25, robot: true, brass: '#c9963f', skin: '#c9963f', hair: '#7a5222', coat: '#1f3a33', trim: '#2d5a4d',
      collar: '#f4efe6', glass: '#6fd3ff', pants: '#1a2b26', boots: '#5a3d1d', hat: 'none', weapon: 'none', hairStyle: 'none' },
    regent: { k: 2.05, skin: '#e6c3a5', hair: '#c9c4cc', hairStyle: 'swept', coat: '#1a1a24', lining: '#3d1f4f',
      gold: '#d9b35a', porcelain: '#efe9dc', crack: '#8a7f6e', mask: true, pants: '#15151d', boots: '#0e0e12',
      weapon: 'cane', metal: '#d9b35a', hat: 'none' },
    juliette: { k: 0.82, ghost: true, skin: '#fbe7c8', hair: '#5a3b26', hairStyle: 'floating', dress: '#f4ead0',
      trim: '#d9b35a', glow: '#ffe9a8', hat: 'none', weapon: 'none' },
    elias: { k: 1.12, skin: '#e8c3a0', hair: '#8a8580', hairStyle: 'short', coat: '#4a3626', shirt: '#dfd8c8',
      pants: '#2d2a33', boots: '#2a1d17', brassHalf: true, glasses: true, brass: '#c9963f', gear: '#d9b35a',
      weapon: 'none', hat: 'none' },
    pivert: { k: 1, skin: '#f0c49b', hair: '#6b4a33', hairStyle: 'bun', dress: '#c25a4e', apron: '#f7f1e4',
      hat: 'headscarf', scarf: '#2b3f6e', dots: '#e8b84d', pants: '#4e3b2e', boots: '#3a2a22', carry: 'bread',
      weapon: 'none' },
    hugo: { k: 0.86, skin: '#e2b08c', hair: '#b8b2a8', hairStyle: 'bald', beard: '#b8b2a8', coat: '#3c5e8b',
      hat: 'cap', capColor: '#4a3b2a', glasses: true, pants: '#3a3a40', boots: '#2a2018', carry: 'loupe', weapon: 'none' },
    bastien: { k: 1, skin: '#f0c9a5', hair: '#3a2a22', hairStyle: 'short', coat: '#1f2d4a', trim: '#d9b35a',
      pants: '#1f2d4a', boots: '#1a1a1a', hat: 'peaked', capColor: '#1f2d4a', moustache: true, carry: 'clipboard',
      weapon: 'none' },
    tomas: { k: 0.68, skin: '#f1c7a0', hair: '#8c5a2e', hairStyle: 'short', coat: '#2d3e6b', stripes: '#efe6d2',
      pants: '#6b4a2a', boots: '#3a2a22', laugh: true, carry: 'bread', hat: 'none', weapon: 'none' },
  };

  const seg = (x, y, a, len) => [x + Math.sin(a) * len, y + Math.cos(a) * len];
  const blinkAt = (t) => ((t % 3.4) < 0.12 ? 1 : 0);

  /* ---------- head (origin = head centre, radius R) ---------- */
  function backHair(ctx, sp, R, o) {
    const hair = sp.hair;
    const st = sp.hairStyle;
    if (st === 'long' || st === 'braids') {
      ART.rr(ctx, -R * 1.02, -0.2 * R, R * 2.04, R * 1.4, R * 0.6, hair);
    }
    if (st === 'braids') {
      const sway = Math.sin((o.t || 0) * 9) * 0.12 * R;
      ART.limb(ctx, -0.6 * R, 0.4 * R, -1.25 * R, 1.9 * R + sway, 0.42 * R, hair, { lw: 1.2 });
      ART.limb(ctx, -0.9 * R, 0.4 * R, -1.65 * R, 1.6 * R - sway, 0.4 * R, hair, { lw: 1.2 });
    }
    if (st === 'bun') ART.ell(ctx, -0.55 * R, -0.95 * R, 0.55 * R, 0.55 * R, hair);
    if (st === 'swept') ART.rr(ctx, -R * 1.0, -0.6 * R, R * 1.6, R * 1.2, R * 0.5, hair, { lw: 1.4 });
    if (st === 'floating') {
      const tm = o.time || 0;
      for (let i = 0; i < 4; i++) {
        const x0 = (i - 1.5) * 0.45 * R;
        const w = Math.sin(tm * 2 + i) * 0.25 * R;
        ART.limb(ctx, x0, -0.7 * R, x0 + w, -1.8 * R - i * 0.25 * R, 0.25 * R, hair, { lw: 1 });
      }
    }
  }
  function frontHair(ctx, sp, R) {
    const st = sp.hairStyle;
    if (st === 'none' || st === 'bald') return;
    if (st === 'curly') {
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI * 0.9 + (i / 6) * Math.PI * 0.9;
        ART.ell(ctx, Math.cos(a) * R * 0.85, -0.3 * R + Math.sin(a) * R * 0.85, 0.36 * R, 0.36 * R, sp.hair, { lw: 1.2 });
      }
      return;
    }
    const ry = st === 'floating' ? 0.62 * R : 0.74 * R;
    ART.ell(ctx, -0.05 * R, -0.3 * R, R * 1.02, ry, sp.hair);
    if (st === 'swept') ART.limb(ctx, -0.2 * R, -0.75 * R, 0.5 * R, -0.5 * R, 0.14 * R, '#ffffff', { lw: 0, alpha: 0.5 });
  }
  function hat(ctx, sp, R) {
    const h = sp.hat;
    if (!h || h === 'none') return;
    if (h === 'cap' || h === 'peaked') {
      const len = h === 'peaked' ? 1.6 : 1.4;
      ART.ell(ctx, 0, -0.85 * R, R * 1.0, R * 0.55, sp.capColor || '#4a3b2a');
      ART.poly(ctx, [[0.45 * R, -0.72 * R], [len * R, -0.55 * R], [len * R - 0.1 * R, -0.4 * R], [0.42 * R, -0.5 * R]], sp.capColor || '#4a3b2a');
      if (h === 'peaked') ART.ell(ctx, 0.05 * R, -0.98 * R, 0.16 * R, 0.16 * R, '#d9b35a', { lw: 1.2 });
    } else if (h === 'bowler') {
      ART.ell(ctx, 0, -0.9 * R, 1.35 * R, 0.22 * R, '#2b2420');
      ART.rr(ctx, -0.8 * R, -2.0 * R, 1.6 * R, 1.25 * R, 0.5 * R, '#2b2420');
    } else if (h === 'headscarf') {
      const c = sp.scarf || '#2b3f6e';
      ART.poly(ctx, [[-1.08 * R, -0.1 * R], [-0.95 * R, -1.15 * R], [0.35 * R, -1.3 * R], [1.08 * R, -0.35 * R], [0.62 * R, -0.52 * R], [-0.5 * R, -0.62 * R]], c);
      for (let i = 0; i < 6; i++) ART.ell(ctx, -0.8 * R + i * 0.32 * R, -0.85 * R + (i % 2) * 0.22 * R, 0.07 * R, 0.07 * R, sp.dots || '#e8b84d', { stroke: false });
    }
  }
  function goggles(ctx, sp, R, front) {
    const gy = -0.78 * R;
    ART.limb(ctx, -1.02 * R, -0.5 * R, 1.0 * R, -0.55 * R, 0.14 * R, '#5a3b22', { lw: 1 });
    if (front) {
      ART.ell(ctx, -0.4 * R, gy, 0.38 * R, 0.34 * R, sp.metal || '#c99a3b');
      ART.ell(ctx, 0.4 * R, gy, 0.38 * R, 0.34 * R, sp.metal || '#c99a3b');
      ART.ell(ctx, -0.4 * R, gy, 0.24 * R, 0.22 * R, '#7fd0e8', { lw: 1.2 });
      ART.ell(ctx, 0.4 * R, gy, 0.24 * R, 0.22 * R, '#7fd0e8', { lw: 1.2 });
    } else {
      ART.ell(ctx, 0.25 * R, gy, 0.38 * R, 0.34 * R, sp.metal || '#c99a3b');
      ART.ell(ctx, 0.25 * R, gy, 0.24 * R, 0.22 * R, '#7fd0e8', { lw: 1.2 });
    }
  }
  function brows(ctx, x, by, expr, dirIn) {
    let yIn = by, yOut = by;
    if (expr === 'angry') { yIn = by + 0.16 * 1; yOut = by - 0.1; }
    if (expr === 'sad' || expr === 'worried') { yIn = by - 0.12; yOut = by + 0.04; }
    if (expr === 'happy') { yIn = by - 0.04; yOut = by - 0.04; }
    if (expr === 'surprised') { yIn = by - 0.1; yOut = by - 0.1; }
    return [[x - 0.26 * dirIn, yOut], [x + 0.26 * dirIn, yIn]];
  }
  function face(ctx, sp, R, o) {
    const front = !!o.front;
    const expr = o.expr || 'neutral';
    const ey = -0.12 * R;
    const eyeR = (expr === 'surprised' || sp.ghost ? 0.23 : 0.17) * R;
    const xs = front ? [-0.38 * R, 0.38 * R] : [0.38 * R];
    xs.forEach((x, i) => {
      const dirIn = front ? (x < 0 ? 1 : -1) : -1;
      if (sp.brassHalf && !front) {
        // one dial eye instead of a real eye
        ART.ell(ctx, x, ey, eyeR * 1.05, eyeR * 1.05, '#f7f3e8', { lw: 1.5 });
        const a = (o.time || 0) * 0.8;
        ART.limb(ctx, x, ey, x + Math.sin(a) * eyeR * 0.7, ey - Math.cos(a) * eyeR * 0.7, 1.4, '#222', { stroke: false });
        ART.limb(ctx, x, ey, x + Math.sin(a * 0.1) * eyeR * 0.9, ey + Math.cos(a * 0.1) * eyeR * 0.9, 1, '#222', { stroke: false });
      } else if (expr === 'happy') {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, ey + 0.05 * R, eyeR, Math.PI * 1.12, Math.PI * 1.88);
        ctx.strokeStyle = OUT; ctx.lineWidth = 2.2; ctx.stroke();
        ctx.restore();
      } else {
        ART.eye(ctx, x, ey, eyeR, o.look || 0, 0, o.blink || 0, { lw: 1.4 });
      }
      const [b1, b2] = brows(ctx, x, ey - 0.42 * R, expr, dirIn);
      ART.limb(ctx, b1[0], b1[1], b2[0], b2[1], 0.09 * R, sp.hairStyle === 'none' ? OUT : (sp.hair || OUT), { lw: 0.6 });
      if (sp.glasses) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, ey, 0.34 * R, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(190,225,240,0.25)'; ctx.fill();
        ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.restore();
      }
    });
    if (sp.beard) ART.ell(ctx, front ? 0 : 0.2 * R, 0.62 * R, 0.82 * R, 0.5 * R, sp.beard);
    if (sp.moustache) ART.limb(ctx, front ? -0.25 * R : 0.1 * R, 0.36 * R, front ? 0.25 * R : 0.6 * R, 0.3 * R, 0.16 * R, '#2a2220', { lw: 0.8 });
    mouth(ctx, sp, R, expr, front, o);
  }
  function mouth(ctx, sp, R, expr, front, o) {
    const mx = front ? 0 : 0.36 * R, my = 0.44 * R;
    const w = front ? 0.36 * R : 0.26 * R;
    if (sp.laugh || (expr === 'happy' && sp.laugh !== false && o.big)) {
      ART.ell(ctx, mx, my, w * 0.5, w * 0.36, '#3a1a1a', { lw: 1 });
      ART.rr(ctx, mx - w * 0.4, my - w * 0.28, w * 0.8, w * 0.22, 2, '#ffffff', { lw: 0.8 });
      return;
    }
    const talking = o.talk ? Math.abs(Math.sin((o.time || 0) * 16)) : 0;
    ctx.save();
    ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath();
    if (talking > 0.2) {
      ctx.fillStyle = '#4a1f22';
      ctx.ellipse(mx, my, w * 0.28, w * 0.2 * talking, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    } else if (expr === 'happy') {
      ctx.moveTo(mx - w / 2, my - 0.02 * R);
      ctx.quadraticCurveTo(mx, my + 0.2 * R, mx + w / 2, my - 0.02 * R);
      ctx.stroke();
    } else if (expr === 'sad') {
      ctx.moveTo(mx - w / 2, my + 0.06 * R);
      ctx.quadraticCurveTo(mx, my - 0.12 * R, mx + w / 2, my + 0.06 * R);
      ctx.stroke();
    } else if (expr === 'surprised') {
      ctx.fillStyle = '#4a1f22';
      ctx.ellipse(mx, my, w * 0.22, w * 0.27, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    } else if (expr === 'worried') {
      ctx.moveTo(mx - w / 2, my);
      ctx.quadraticCurveTo(mx - w * 0.2, my - 0.08 * R, mx, my);
      ctx.quadraticCurveTo(mx + w * 0.2, my + 0.08 * R, mx + w / 2, my);
      ctx.stroke();
    } else if (expr === 'angry') {
      ctx.moveTo(mx - w / 2, my + 0.03 * R);
      ctx.lineTo(mx + w / 2, my - 0.03 * R);
      ctx.stroke();
    } else {
      ctx.moveTo(mx - w / 2, my);
      ctx.lineTo(mx + w / 2, my);
      ctx.stroke();
    }
    ctx.restore();
  }

  function robotHead(ctx, sp, R, o) {
    const front = !!o.front;
    ART.rr(ctx, -0.95 * R, -1.1 * R, 1.9 * R, 2.1 * R, 0.6 * R, sp.brass);
    ART.rr(ctx, -0.55 * R, -0.75 * R, 1.1 * R, 0.95 * R, 0.25 * R, '#2a2a30', { lw: 1.4 });
    const glow = 0.6 + 0.4 * Math.sin((o.time || 0) * 3);
    const gx = front ? 0 : 0.2 * R;
    const eyes = front ? [-0.25 * R, 0.25 * R] : [gx];
    eyes.forEach((ex) => {
      ctx.save();
      ctx.shadowColor = sp.glass; ctx.shadowBlur = 12 * glow;
      ART.ell(ctx, ex, -0.3 * R, 0.2 * R, 0.2 * R, sp.glass, { lw: 1.2 });
      ctx.restore();
    });
    for (let i = 0; i < 3; i++) ART.limb(ctx, -0.4 * R + i * 0.4 * R, 0.5 * R, -0.4 * R + i * 0.4 * R, 0.78 * R, 1.4, '#3a2a18', { lw: 0.4 });
  }
  function maskHalf(ctx, sp, R, o) {
    ctx.save();
    ctx.beginPath(); ctx.rect(-0.1 * R, -R * 1.2, R * 1.4, R * 2.4); ctx.clip();
    ART.ell(ctx, 0, 0, R, R * 1.05, sp.porcelain, { lw: 1.4 });
    const cr = sp.crack;
    ART.limb(ctx, 0.35 * R, -0.6 * R, 0.85 * R, -0.05 * R, 1.2, cr, { stroke: false });
    ART.limb(ctx, 0.5 * R, 0.1 * R, 0.1 * R, 0.6 * R, 1.2, cr, { stroke: false });
    ART.limb(ctx, 0.4 * R, -0.1 * R, 0.85 * R, 0.3 * R, 1.0, cr, { stroke: false });
    ctx.restore();
    ART.ell(ctx, 0.4 * R, -0.12 * R, 0.2 * R, 0.14 * R, '#2a2228', { lw: 1 });
    ART.limb(ctx, 0.15 * R, -0.42 * R, 0.6 * R, -0.45 * R, 0.07 * R, sp.gold, { lw: 0.6 });
  }
  function brassHalf(ctx, sp, R, o) {
    ctx.save();
    ctx.beginPath(); ctx.rect(-0.05 * R, -R * 1.2, R * 1.4, R * 2.4); ctx.clip();
    ART.ell(ctx, 0, 0, R, R * 1.05, sp.brass, { lw: 1.4 });
    ctx.restore();
    ART.gear(ctx, 0.5 * R, 0.25 * R, 0.34 * R, 7, (o.time || 0) * 2, sp.gear, { lw: 1 });
  }

  function drawHead(ctx, sp, R, o) {
    backHair(ctx, sp, R, o);
    if (sp.robot) {
      robotHead(ctx, sp, R, o);
    } else {
      ART.ell(ctx, 0, 0, R, R * 1.05, sp.skin || '#f1c7a0');
      if (sp.mask) maskHalf(ctx, sp, R, o);
      if (sp.brassHalf) brassHalf(ctx, sp, R, o);
      frontHair(ctx, sp, R);
      hat(ctx, sp, R);
      if (sp.goggles) goggles(ctx, sp, R, !!o.front);
      if (sp.ghost) ART.ell(ctx, 0.35 * R, 0.3 * R, 0.18 * R, 0.12 * R, '#f2a8a0', { alpha: 0.5, stroke: false });
      face(ctx, sp, R, o);
      return;
    }
    hat(ctx, sp, R);
    face(ctx, sp, R, o);
  }

  /* ---------- body ---------- */
  function drawLegs(ctx, sp, k, hipY, th1, sh1, th2, sh2) {
    const legW = 6.2 * k;
    const legs = [
      { th: th2, sh: sh2, col: ART.shade(sp.pants || '#333', -0.25) },
      { th: th1, sh: sh1, col: sp.pants || '#333' },
    ];
    for (const L of legs) {
      const [kx, ky] = seg(0, hipY, L.th, 10.5 * k);
      const [fx, fy] = seg(kx, ky, L.th + L.sh, 10.5 * k);
      ART.limb(ctx, 0, hipY, kx, ky, legW, L.col, { lw: 1.6 });
      ART.limb(ctx, kx, ky, fx, fy, legW * 0.9, L.col, { lw: 1.6 });
      ART.ell(ctx, fx + 1.5 * k, fy - 1.5 * k, 3.6 * k, 2.6 * k, sp.boots || '#2a1d17', { lw: 1.4 });
    }
  }

  function drawFigure(ctx, sp, p) {
    const k = sp.k || 1;
    const st = p.state || 'idle';
    const t = p.t || 0, tm = p.time || 0;
    const moving = st === 'walk' || st === 'run';
    const ph = tm * (st === 'run' ? 13 : 8);
    const amp = st === 'run' ? 0.85 : 0.5;
    const idleSway = Math.sin(tm * 2.6);
    let th1 = 0, sh1 = 0, th2 = 0, sh2 = 0, au1 = 0.12, af1 = 0.25, au2 = -0.12, af2 = 0.2, lean = 0;
    let bob = idleSway * 0.6 * k;
    switch (st) {
      case 'walk':
      case 'run':
        th1 = Math.sin(ph) * amp; th2 = Math.sin(ph + Math.PI) * amp;
        sh1 = 0.2 * th1 - 0.4 * Math.max(0, Math.cos(ph));
        sh2 = 0.2 * th2 - 0.4 * Math.max(0, Math.cos(ph + Math.PI));
        au1 = -Math.sin(ph) * 0.7; au2 = Math.sin(ph) * 0.7; af1 = 0.3; af2 = 0.3;
        lean = st === 'run' ? 0.18 : 0.05;
        bob = -Math.abs(Math.sin(ph)) * 2.2 * k;
        break;
      case 'jump':
        th1 = 0.95; sh1 = -0.8; th2 = 0.55; sh2 = -1.3; au1 = 2.7; af1 = 0.25; au2 = 2.3; af2 = 0.45; lean = -0.06; bob = 0;
        break;
      case 'fall':
        th1 = 0.35; sh1 = 0.1; th2 = -0.35; sh2 = -0.15; au1 = 1.9; af1 = 0.2; au2 = -1.5; af2 = 0.2; lean = 0.05; bob = 0;
        break;
      case 'land':
        th1 = 0.5; sh1 = -0.9; th2 = 0.5; sh2 = -0.9; au1 = 0.8; af1 = 0.3; au2 = 0.6; af2 = 0.3; lean = 0.22;
        bob = -3 * k;
        break;
      case 'attack': {
        const u = clamp(t / 0.26, 0, 1);
        const e = 1 - Math.pow(1 - u, 3);
        th1 = 0.22; sh1 = 0.05; th2 = -0.22; sh2 = 0; lean = 0.14;
        au1 = lerp(2.5, -0.5, e); af1 = lerp(0.2, 0.1, e);
        au2 = 0.6; af2 = 0.5;
        break;
      }
      case 'dash':
        th1 = -0.5; sh1 = -0.2; th2 = -0.95; sh2 = -0.5; au1 = -2.2; af1 = 0.15; au2 = -1.7; af2 = 0.2; lean = 1.15; bob = 0;
        break;
      case 'hurt':
        lean = -0.28; au1 = 2.2; af1 = 0.6; au2 = 1.6; af2 = 0.8; bob = 0;
        break;
      case 'talk':
        au1 = 1.15; af1 = 2.0; au2 = 0.1; af2 = 0.2; lean = 0.02;
        break;
      case 'slow':
        au1 = 0.12 + idleSway * 0.05; au2 = -0.12 - idleSway * 0.05;
        break;
      case 'dead':
        au1 = 0.4; af1 = 0.6; au2 = -0.5; af2 = 0.5; lean = -0.3;
        break;
      default:
        break;
    }
    if (sp.hat === 'peaked' && st === 'idle') lean = 0;

    const hipY = -21 * k + bob;
    ctx.save();
    if (st === 'dead') {
      const u = Math.min(1, t / 0.5);
      ctx.rotate(-u * Math.PI / 2 * 0.95);
      if (t > 0.6) ctx.globalAlpha *= Math.max(0, 1 - (t - 0.6) / 0.5);
    }
    drawLegs(ctx, sp, k, hipY, th1, sh1, th2, sh2);

    // upper body, rotated around the hip
    ctx.save();
    ctx.translate(0, hipY);
    ctx.rotate(lean);
    const arm = (a, af, col, w) => {
      const [ex, ey] = seg(0, -14 * k, a, 7.5 * k);
      const [hx, hy] = seg(ex, ey, a + af, 7 * k);
      ART.limb(ctx, 0, -14 * k, ex, ey, w * k, col, { lw: 1.4 });
      ART.limb(ctx, ex, ey, hx, hy, w * 0.85 * k, sp.skin || '#f1c7a0', { lw: 1.4 });
      return [hx, hy];
    };
    const sleeve = sp.robot ? sp.brass : sp.coat || sp.dress || '#444';
    arm(au2, af2, ART.shade(sleeve, -0.25), 5.2);

    // tails / dress / apron
    if (sp.dress && !sp.ghost) {
      ART.poly(ctx, [[-8 * k, -4 * k], [8 * k, -4 * k], [11 * k, 14 * k], [-11 * k, 14 * k]], sp.dress);
    }
    if (sp.lining) ART.poly(ctx, [[-8 * k, -2 * k], [8 * k, -2 * k], [10 * k, 17 * k], [-10 * k, 17 * k]], sp.coat);
    if (sp.lining) ART.poly(ctx, [[-2 * k, 0], [8 * k, 0], [9 * k, 16 * k], [0, 16 * k]], sp.lining, { stroke: false });
    if (sp.robot) ART.poly(ctx, [[-8 * k, -4 * k], [8 * k, -4 * k], [9 * k, 14 * k], [-9 * k, 14 * k]], sp.coat);
    // torso
    ART.rr(ctx, -7 * k, -18 * k, 14 * k, 17 * k, 4 * k, sp.robot ? sp.brass : (sp.coat || sp.dress || '#444'));
    if (sp.robot) {
      ART.rr(ctx, -7.2 * k, -18 * k, 14.4 * k, 5 * k, 3 * k, sp.coat);
      ART.gear(ctx, 0, -10 * k, 3.2 * k, 8, tm * 2, sp.brass, { lw: 1 });
    }
    if (sp.trim) ART.rr(ctx, -1.2 * k, -18 * k, 2.4 * k, 16 * k, 1, sp.trim, { lw: 0.8 });
    if (sp.shirt) ART.poly(ctx, [[-2.5 * k, -18 * k], [2.5 * k, -18 * k], [0, -10 * k]], sp.shirt, { lw: 1 });
    if (sp.stripes) for (let i = 0; i < 4; i++) ART.rr(ctx, -7 * k, -16 * k + i * 4 * k, 14 * k, 1.8 * k, 0, sp.stripes, { stroke: false });
    if (sp.apron) ART.poly(ctx, [[-6 * k, -8 * k], [6 * k, -8 * k], [7 * k, 12 * k], [-7 * k, 12 * k]], sp.apron, { lw: 1 });
    if (sp.scarf && !sp.dress) {
      const drag = clamp(-p.vx * 0.04, -8, 8) * k;
      const w = Math.sin(tm * 8) * 1.2 * k;
      ART.poly(ctx, [[-4 * k, -20 * k], [4 * k, -20 * k], [5 * k + drag, -15 * k], [-12 * k + drag, -14 * k + w], [-13 * k + drag, -11 * k + w], [4 * k, -15 * k]], sp.scarf, { lw: 1.4 });
      if (sp.scarfStripe) ART.limb(ctx, -10 * k + drag, -15.5 * k + w, 3 * k, -17 * k, 1.4 * k, sp.scarfStripe, { stroke: false });
    }
    if (sp.collar) ART.poly(ctx, [[-4 * k, -18 * k], [4 * k, -18 * k], [0, -14 * k]], sp.collar, { lw: 1 });

    // head
    ctx.save();
    ctx.translate(0, -23 * k + (st === 'hurt' ? 1.2 * k : 0));
    const R = 8.8 * k;
    drawHead(ctx, sp, R, { expr: st === 'hurt' ? 'worried' : (sp.expr || 'neutral'), blink: blinkAt(tm), look: 0.4, talk: st === 'talk', time: tm, t: tm });
    ctx.restore();

    // front arm + weapon
    const hand = arm(au1, af1, sp.robot ? sp.brass : ART.shade(sleeve, 0.05), 5.4);
    const wAng = au1 + af1;
    const wx = hand[0], wy = hand[1];
    if (st === 'attack') {
      const start = 2.5, cur = au1;
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, -14 * k, 17 * k, Math.PI / 2 - start, Math.PI / 2 - cur, false);
      ctx.strokeStyle = 'rgba(255,241,201,0.45)'; ctx.lineWidth = 6 * k; ctx.stroke();
      ctx.restore();
    }
    if (sp.weapon === 'wrench') {
      const [ex, ey] = seg(wx, wy, wAng, 13 * k);
      ART.limb(ctx, wx, wy, ex, ey, 3 * k, sp.metal || '#c99a3b', { lw: 1 });
      ART.gear(ctx, ex, ey, 4.8 * k, 6, tm * 4, sp.metal || '#c99a3b', { lw: 1 });
    } else if (sp.weapon === 'dagger') {
      const [ex, ey] = seg(wx, wy, wAng, 8 * k);
      ART.limb(ctx, wx, wy, ex, ey, 2 * k, sp.metal || '#cfd5dc', { lw: 1 });
    } else if (sp.weapon === 'cane') {
      const [ex, ey] = seg(wx, wy, wAng, 30 * k);
      ART.limb(ctx, wx, wy, ex, ey, 2.2 * k, '#2a2228', { lw: 1 });
      ART.ell(ctx, ex, ey, 3.6 * k, 3.6 * k, sp.gold, { lw: 1 });
    }
    if (sp.carry === 'bread') ART.ell(ctx, wx - 2 * k, wy + 2 * k, 4.6 * k, 3.4 * k, '#d9a35a', { lw: 1.2 });
    if (sp.carry === 'clipboard') ART.rr(ctx, wx - 2 * k, wy - 6 * k, 6 * k, 8 * k, 1, '#c9a86a', { lw: 1 });
    ctx.restore(); // upper body
    ctx.restore(); // figure
  }

  function drawGhost(ctx, sp, p) {
    const k = sp.k || 0.82;
    const tm = p.time || 0;
    const st = p.state || 'idle';
    const bob = Math.sin(tm * 2) * 3 * k;
    const float = -6 * k + bob;
    ctx.save();
    ctx.globalAlpha *= 0.86;
    if (st === 'dead') { ctx.globalAlpha *= Math.max(0, 1 - (p.t || 0) / 1.0); }
    ART.ell(ctx, 0, -20 * k + float, 22 * k, 26 * k, sp.glow, { stroke: false, alpha: 0.22 });
    ctx.translate(0, float);
    const sway = Math.sin(tm * 3) * 2 * k;
    ART.poly(ctx, [[-6 * k, -22 * k], [6 * k, -22 * k], [11 * k + sway, 0], [-11 * k + sway, 0]], sp.dress, { lw: 1.2, alpha: 0.95 });
    ART.rr(ctx, -6.5 * k, -24 * k, 13 * k, 4 * k, 2 * k, sp.trim, { lw: 1 });
    const R = 8.8 * k;
    ctx.save();
    ctx.translate(0, -33 * k);
    drawHead(ctx, sp, R, { expr: st === 'hurt' ? 'worried' : (sp.expr || 'happy'), blink: blinkAt(tm), look: 0.5, talk: st === 'talk', time: tm, t: tm });
    ctx.restore();
    ART.ell(ctx, -1 * k, -18 * k, 2.2 * k, 2.2 * k, sp.trim, { lw: 1 });
    ctx.restore();
  }

  function drawBoss(ctx, sp, p) {
    // The Regent: tall, the coat is the body; the cane and the sand beam are drawn here.
    const st = p.state || 'idle';
    const t = p.t || 0, tm = p.time || 0;
    const phase = p.phase || 1;
    const k = sp.k;
    if (st === 'beam') {
      const pulse = 0.7 + 0.3 * Math.sin(tm * 30);
      ctx.save();
      ctx.globalAlpha = 0.85;
      ART.rr(ctx, 14 * k, -92, 330, 26 * pulse, 12, '#ffd27a', { lw: 1.5, alpha: 0.85 });
      ART.rr(ctx, 14 * k, -84, 330, 10, 5, '#fff3c4', { stroke: false, alpha: 0.9 });
      ctx.restore();
    }
    drawFigure(ctx, sp, { state: st === 'beam' ? 'telegraph' : st, t, time: tm, vx: p.vx, vy: p.vy });
    if (phase >= 2) {
      ART.rr(ctx, -6 * k, -110, 12 * k, 2, 0, sp.gold, { stroke: false, alpha: 0.0 });
    }
    if (phase >= 3) {
      for (let i = 0; i < 4; i++) {
        const a = tm * 1.5 + i * Math.PI / 2;
        ART.gear(ctx, Math.cos(a) * 42, -62 + Math.sin(a) * 40, 9, 9, tm * 3 + i, sp.gold, { lw: 1 });
      }
    }
    if (st === 'summon') {
      for (let i = 0; i < 6; i++) {
        const a = tm * 2 + i * Math.PI / 3;
        ART.gear(ctx, Math.cos(a) * 60, -60 + Math.sin(a) * 25, 6, 8, tm * 4, sp.gold, { lw: 1 });
      }
    }
  }

  function drawPortrait(ctx, sp, expr, t) {
    const blink = blinkAt(t);
    const coat = sp.coat || sp.dress || sp.jumper || sp.smock || '#3b3b4a';
    ART.rr(ctx, -86, 50, 172, 120, 28, coat);
    if (sp.trim) ART.limb(ctx, -20, 62, 0, 110, 3, sp.trim, { lw: 0.5 });
    if (sp.collar) ART.poly(ctx, [[-22, 52], [22, 52], [0, 80]], sp.collar);
    if (sp.scarf && !sp.dress) ART.rr(ctx, -40, 50, 80, 14, 6, sp.scarf);
    if (sp.stripes) for (let i = 0; i < 3; i++) ART.rr(ctx, -86, 62 + i * 16, 172, 6, 0, sp.stripes, { stroke: false });
    ART.rr(ctx, -15, 26, 30, 34, 8, sp.skin || '#f1c7a0');
    ctx.save();
    ctx.translate(0, -16);
    drawHead(ctx, sp, 50, { front: true, expr, blink, look: 0, talk: false, time: t, t });
    ctx.restore();
  }

  /* ---------- registration ---------- */
  function reg(id, w, h, ghost) {
    const sp = SPEC[id];
    ART.register({
      id, w, h,
      draw(ctx, p) {
        if (sp.ghost) drawGhost(ctx, sp, p);
        else if (id === 'regent') drawBoss(ctx, sp, p);
        else drawFigure(ctx, sp, p);
      },
      portrait(ctx, expr, t) { drawPortrait(ctx, sp, expr, t); },
    });
  }
  reg('leo', 22, 46);
  reg('mireille', 22, 46);
  reg('gaspard', 34, 62);
  reg('regent', 60, 100);
  reg('juliette', 22, 42);
  reg('elias', 30, 64);
  reg('pivert', 28, 48);
  reg('hugo', 24, 40);
  reg('bastien', 26, 50);
  reg('tomas', 20, 32);
  window.HUMANOID_SPEC = SPEC;
})();
