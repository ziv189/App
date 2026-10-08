/* elias: Elias Varin, master clockmaker, half machine, keeper of the balance wheel at the top of the Tower.
   Look: tall and lean, long brown workshop coat with rolled sleeves, grey waistcoat, spectacles pushed down,
   neat grey hair. The LEFT half of his face is brass (cheek gear, clock-dial eye); his left arm is partly brass.
   Drawn facing right; origin (0,0) = centre of the feet. Character sheet: game/characters/elias.md */
(function () {
  if (!window.ART) return;
  const ART = window.ART;
  const TAU = Math.PI * 2;

  const STATES = { idle: 1, walk: 1, run: 1, jump: 1, fall: 1, land: 1, attack: 1, dash: 1,
    hurt: 1, dead: 1, talk: 1, slow: 1, frozen: 1 };

  // Portrait expressions: bo/bi = brow height at the outer/inner end, lid = eyelid closing, mouth = mouth shape.
  const EXPR = {
    neutral: { bo: -24, bi: -25, lid: 0, mouth: 'flat' },
    happy: { bo: -27, bi: -27, lid: 0.3, mouth: 'smile' },
    sad: { bo: -20, bi: -31, lid: 0.28, mouth: 'frown', look: 0.6 },
    angry: { bo: -31, bi: -19, lid: 0.36, mouth: 'tight' },
    surprised: { bo: -34, bi: -34, lid: 0, mouth: 'open', big: true },
    worried: { bo: -22, bi: -30, lid: 0.12, mouth: 'wave' }
  };

  const BASE = {
    skin: '#e8c3a0', skinShade: '#c99c79',
    hair: '#aaa7a2', hairLight: '#dcd9d3', hairDark: '#6d6962',
    coat: '#6b4a2e', coatDark: '#4a3220', coatLight: '#8a6240',
    shirt: '#efe6d2', waist: '#8f959d',
    trousers: '#3b3d4a', trousersDark: '#2a2c36', boot: '#2a1d17',
    brass: '#c9963f', brassLight: '#e6c26d', brassDark: '#7a5620',
    seam: '#4a3416', dial: '#f6efe1', ink: '#2a2024', mouth: '#5a2e2a'
  };

  const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d || 0);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, k) => a + (b - a) * k;
  const easeOut = (k) => 1 - Math.pow(1 - k, 3);
  const blinkAt = (t) => (((t % 3.4) + 3.4) % 3.4 < 0.12 ? 1 : 0);

  function mixHex(a, b, k) {
    const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
    let out = '#';
    for (const sh of [16, 8, 0]) {
      const x = (A >> sh) & 255, y = (B >> sh) & 255;
      out += Math.round(x + (y - x) * k).toString(16).padStart(2, '0');
    }
    return out;
  }

  // Frozen state greys every colour out (statue look).
  function palette(frozen) {
    const K = {};
    for (const key in BASE) K[key] = frozen ? mixHex(BASE[key], '#7d7f86', 0.55) : BASE[key];
    return K;
  }

  function fillStroke(ctx, path, fill, lw) {
    path();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = ART.OUT;
    ctx.lineWidth = lw;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }

  /* ---------- pose solver: angles are from straight down, positive = forward (+x) ---------- */
  function solve(st, t, time) {
    const s = {
      lean: 0, hipDy: 0, breath: 0.7 * Math.sin(time * 2.4), gear: time * 0.9, dial: time * 0.5,
      legN: 0.02, legNb: 0, legF: -0.03, legFb: 0,
      armN: 0.06 + 0.03 * Math.sin(time * 2.4), foN: 0.3, armF: -0.04, foF: 0.2,
      headTilt: 0, mouth: 0, blink: blinkAt(time), alpha: 1, spin: 0, key: false,
      streaks: false, ring: false, trail: false, trailFrom: 0, trailTo: 0
    };
    switch (st) {
      case 'walk': {
        const ph = time * 7, S = Math.sin(ph), C = Math.cos(ph);
        s.legN = 0.42 * S; s.legNb = 0.6 * Math.max(0, C);
        s.legF = -0.42 * S; s.legFb = 0.6 * Math.max(0, -C);
        s.armN = -0.5 * S; s.foN = s.armN + 0.3;
        s.armF = 0.5 * S; s.foF = s.armF + 0.3;
        s.hipDy = -1.2 * Math.abs(S);
        break;
      }
      case 'run': {
        const ph = time * 11, S = Math.sin(ph), C = Math.cos(ph);
        s.lean = 0.12;
        s.legN = 0.75 * S; s.legNb = Math.max(0, C);
        s.legF = -0.75 * S; s.legFb = Math.max(0, -C);
        s.armN = -0.9 * S; s.foN = s.armN + 1.2;
        s.armF = 0.9 * S; s.foF = s.armF + 1.2;
        s.hipDy = -2.2 * Math.abs(S);
        break;
      }
      case 'jump':
        if (t < 0.07) { // crouch before the push
          s.hipDy = 2.5; s.legN = 0.1; s.legNb = 0.6; s.legF = -0.1; s.legFb = 0.5;
          s.armN = -0.9; s.foN = -0.6; s.armF = -0.6; s.foF = -0.2;
        } else { // rising, legs tucked, arms up
          s.legN = 0.9; s.legNb = 1.6; s.legF = 0.35; s.legFb = 1.8;
          s.armN = 2.6; s.foN = 2.8; s.armF = 2.0; s.foF = 2.5; s.lean = -0.04;
        }
        break;
      case 'fall':
        s.legN = 0.3; s.legNb = 0.2; s.legF = -0.25; s.legFb = 0.1;
        s.armN = 1.5; s.foN = 1.6; s.armF = -0.9; s.foF = -0.7; s.lean = -0.03;
        break;
      case 'land': {
        const k = 1 - clamp(t / 0.18, 0, 1);
        s.hipDy = 6 * k; s.lean = 0.08 * k;
        s.legN = 0.2; s.legNb = 0.1 + 0.5 * k; s.legF = -0.15; s.legFb = 0.5 * k;
        s.armN = 0.1 + 0.8 * k; s.foN = s.armN + 0.4; s.armF = -0.6 * k; s.foF = s.armF + 0.3;
        break;
      }
      case 'attack': {
        const W = 0.09, A = 0.2;
        let sw;
        if (t < W) sw = lerp(0, -1.5, clamp(t / W, 0, 1)); // anticipation: arm winds back
        else if (t < W + A) sw = lerp(-1.5, 2.1, easeOut(clamp((t - W) / A, 0, 1)));
        else sw = lerp(2.1, 0.3, clamp((t - W - A) / 0.2, 0, 1));
        const striking = t >= W && t < W + A;
        s.armN = sw; s.foN = sw + (striking ? 0.1 : 0.7); s.key = true;
        s.lean = striking ? 0.14 : t < W ? -0.06 : 0;
        s.armF = -0.45 * sw; s.foF = s.armF + 0.3;
        s.trail = t >= W && t < W + A + 0.12; s.trailFrom = -1.5; s.trailTo = sw;
        break;
      }
      case 'dash':
        s.lean = 0.34; s.streaks = true; s.hipDy = -1;
        s.legN = -0.95; s.legNb = 0.1; s.legF = 0.45; s.legFb = 0.7;
        s.armN = -1.35; s.foN = -1.5; s.armF = -1.1; s.foF = -1.3;
        break;
      case 'hurt': {
        const k = clamp(t / 0.45, 0, 1);
        s.lean = lerp(-0.24, 0, k); s.headTilt = lerp(-0.3, 0, k); s.blink = 0.85;
        s.armN = lerp(-2.0, s.armN, k); s.foN = lerp(-2.3, 0.3, k);
        s.armF = lerp(2.1, -0.04, k); s.foF = lerp(2.4, 0.2, k);
        s.alpha = t < 0.3 && Math.floor(t * 24) % 2 === 0 ? 0.55 : 1;
        break;
      }
      case 'dead': {
        const k = clamp(t / 0.5, 0, 1);
        s.spin = -(Math.PI / 2) * k * k * (3 - 2 * k); // falls backwards, around the feet
        s.alpha = 1 - clamp((t - 0.6) / 0.9, 0, 1);
        s.legN = 0.15; s.legF = -0.1; s.armN = 1.2; s.foN = 1.4; s.armF = -1.0; s.foF = -0.8;
        s.headTilt = 0.4 * k; s.blink = 1;
        break;
      }
      case 'talk':
        s.armN = 0.35 + 0.05 * Math.sin(time * 3); s.foN = 1.5 + 0.35 * Math.sin(time * 5);
        s.armF = -0.1; s.foF = 0.2; s.headTilt = 0.06 * Math.sin(time * 4);
        s.mouth = 0.5 + 0.5 * Math.sin(time * 14);
        break;
      case 'slow': { // Pendule active: everything slows, a ring of ticks appears
        const S = Math.sin(time * 2.5);
        s.lean = 0.04 * Math.sin(time * 1.4);
        s.legN = 0.2 * S; s.legF = -0.2 * S;
        s.armN = -0.25 * S; s.foN = s.armN + 0.2; s.armF = 0.25 * S; s.foF = s.armF + 0.2;
        s.gear = time * 0.3; s.dial = time * 0.2; s.ring = true;
        break;
      }
      case 'frozen':
        s.breath = 0; s.gear = 0; s.dial = 0; s.blink = 0;
        s.armN = 0.06; s.armF = -0.04;
        break;
      default:
        break;
    }
    return s;
  }

  /* ---------- body parts (hip frame: origin = hip, y down) ---------- */
  function leg(ctx, K, x0, y0, a, bend, col) {
    const kx = x0 + Math.sin(a) * 14.5, ky = y0 + Math.cos(a) * 14.5;
    const b = a - bend; // knee flexes backwards
    const ax = kx + Math.sin(b) * 14.5, ay = ky + Math.cos(b) * 14.5;
    ART.limb(ctx, x0, y0, kx, ky, 5.4, col, { lw: 1 });
    ART.limb(ctx, kx, ky, ax, ay, 4.8, col, { lw: 1 });
    ART.ell(ctx, ax + 1.3, ay + 0.8, 3.9, 2.1, K.boot, { lw: 1 });
  }

  function neck(ctx, K) {
    ART.rr(ctx, -1.9, -24, 3.8, 8, 1.2, K.skinShade, { lw: 0.8 });
  }

  function torso(ctx, K) {
    const body = () => {
      ctx.beginPath();
      ctx.moveTo(-6.6, -18.2);
      ctx.quadraticCurveTo(0, -19.9, 6.6, -18.2);
      ctx.quadraticCurveTo(8.6, -12.5, 6.2, -6.5);
      ctx.quadraticCurveTo(8.4, 4, 9.4, 16.2);
      ctx.quadraticCurveTo(0, 18.8, -9.4, 16.2);
      ctx.quadraticCurveTo(-8.4, 4, -6.2, -6.5);
      ctx.quadraticCurveTo(-8.6, -12.5, -6.6, -18.2);
      ctx.closePath();
    };
    fillStroke(ctx, body, K.coat, 1.6);
    ctx.save(); // far side of the long coat in shade
    body();
    ctx.clip();
    ctx.globalAlpha *= 0.4;
    ctx.fillStyle = K.coatDark;
    ctx.fillRect(-10, -20, 5, 40);
    ctx.restore();
    ctx.save(); // hem stitching
    ctx.setLineDash([1, 1.1]);
    ctx.strokeStyle = K.coatDark; ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(-8, 12.5); ctx.lineTo(8, 12.5); ctx.stroke();
    ctx.restore();
    fillStroke(ctx, () => { // grey waistcoat in the open front
      ctx.beginPath();
      ctx.moveTo(-2.8, -17.8); ctx.lineTo(2.8, -17.8);
      ctx.quadraticCurveTo(3.4, -6, 2.6, 6); ctx.lineTo(-2.6, 6);
      ctx.quadraticCurveTo(-3.4, -6, -2.8, -17.8);
      ctx.closePath();
    }, K.waist, 0.9);
    for (const y of [-9, -3, 3]) ART.ell(ctx, 0.2, y, 0.6, 0.6, K.brassLight, { lw: 0.4 });
    ctx.strokeStyle = K.brassDark; ctx.lineWidth = 0.6; // watch chain and pocket watch
    ctx.beginPath(); ctx.moveTo(-2.5, -13); ctx.quadraticCurveTo(-0.6, -10.5, -1.6, -6.2); ctx.stroke();
    ART.ell(ctx, -1.6, -4.8, 1.4, 1.4, K.brass, { lw: 0.5 });
    fillStroke(ctx, () => { // shirt collar
      ctx.beginPath(); ctx.moveTo(-2.6, -18.6); ctx.lineTo(0, -15.4); ctx.lineTo(2.6, -18.6); ctx.closePath();
    }, K.shirt, 0.7);
    fillStroke(ctx, () => { // right lapel
      ctx.beginPath(); ctx.moveTo(2.6, -18.4); ctx.lineTo(5.8, -15.6); ctx.lineTo(3.4, -9); ctx.closePath();
    }, K.coatLight, 0.6);
    ctx.strokeStyle = K.coatDark; ctx.lineWidth = 0.7; // coat front edge
    ctx.beginPath(); ctx.moveTo(3.1, -15); ctx.lineTo(3.5, 5); ctx.stroke();
  }

  // Attack trail: the arc the arm sweeps through.
  function trail(ctx, K, s) {
    ctx.save();
    ctx.globalAlpha *= 0.4;
    ctx.strokeStyle = K.dial; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 8; i++) {
      const th = lerp(s.trailFrom, s.trailTo, i / 8);
      const x = 5 + Math.sin(th) * 22, y = -16 + Math.cos(th) * 22;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  // Arm from shoulder (sx, sy). brass = his left arm: coat sleeve, brass forearm and hand with visible joints.
  function arm(ctx, K, sx, sy, th, fo, brass, s) {
    const ex = sx + Math.sin(th) * 10, ey = sy + Math.cos(th) * 10;
    const wx = ex + Math.sin(fo) * 9, wy = ey + Math.cos(fo) * 9;
    const hx = wx + Math.sin(fo) * 2.4, hy = wy + Math.cos(fo) * 2.4;
    if (brass) {
      ART.limb(ctx, sx, sy, ex, ey, 4.4, K.coatDark, { lw: 1 });
      ART.limb(ctx, ex, ey, wx, wy, 3.2, K.brass, { lw: 1 });
      ART.limb(ctx, wx, wy, hx, hy, 2.8, K.brassDark, { lw: 0.8 });
      ART.ell(ctx, sx, sy, 2.2, 2.2, K.brassLight, { lw: 0.8 });          // shoulder joint
      ART.gear(ctx, ex, ey, 2.0, 6, s.gear, K.brassLight, { lw: 0.6 });   // elbow joint
      ART.ell(ctx, wx, wy, 1.4, 1.4, K.brassLight, { lw: 0.6 });          // wrist ring
      return;
    }
    ART.limb(ctx, sx, sy, ex, ey, 4.6, K.coat, { lw: 1 });
    ART.limb(ctx, ex, ey, wx, wy, 3.4, K.shirt, { lw: 1 });                // shirt sleeve
    ART.limb(ctx, ex, ey, ex + (wx - ex) * 0.35, ey + (wy - ey) * 0.35, 5.0, K.coatLight, { lw: 1 }); // rolled cuff
    ART.ell(ctx, hx, hy, 1.7, 1.9, K.skin, { lw: 0.8 });
    if (s.key) ART.gear(ctx, hx + Math.sin(fo) * 2.2, hy + Math.cos(fo) * 2.2, 2.1, 6, s.gear, K.brass, { lw: 0.6 });
  }

  function streaks(ctx, K) { // dash motion lines behind him
    ctx.save();
    ctx.globalAlpha *= 0.35;
    ctx.strokeStyle = K.dial; ctx.lineCap = 'round'; ctx.lineWidth = 1.4;
    for (const [x0, y, x1] of [[-13, -34, -25], [-11, -26, -28], [-15, -18, -24]]) {
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
    }
    ctx.restore();
  }

  function ring(ctx) { // Pendule: a faint ring of ticks around him
    ctx.save();
    ctx.globalAlpha *= 0.22;
    ctx.strokeStyle = '#bfe6ff'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(0, -30, 25, 0, TAU); ctx.stroke();
    for (let i = 0; i < 12; i++) {
      const a = i * TAU / 12;
      ctx.beginPath();
      ctx.moveTo(Math.sin(a) * 22, -30 - Math.cos(a) * 22);
      ctx.lineTo(Math.sin(a) * 25, -30 - Math.cos(a) * 25);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Head, origin at the head centre. His left half (screen right) is brass.
  function head(ctx, K, s) {
    ctx.save();
    ctx.translate(0, -26.5);
    ctx.rotate(s.headTilt);
    ART.ell(ctx, -0.4, -1.2, 5.9, 6.1, K.hair, { lw: 1 });                 // back hair
    ART.ell(ctx, -4.9, 0.8, 1.1, 1.6, K.skinShade, { lw: 0.6 });           // near ear
    ART.ell(ctx, 5.0, 0.8, 1.1, 1.6, K.brass, { lw: 0.6 });                // brass ear
    ART.ell(ctx, 0, 0.3, 5.1, 6.1, K.skin, { stroke: false });             // face
    ctx.save();
    ctx.beginPath(); ctx.ellipse(0, 0.3, 5.1, 6.1, 0, 0, TAU); ctx.clip();
    ctx.fillStyle = K.brass; ctx.fillRect(0.7, -7, 6, 14);                 // brass half
    ctx.strokeStyle = K.seam; ctx.lineWidth = 0.4;
    ctx.beginPath(); ctx.moveTo(0.7, -7); ctx.lineTo(0.7, 7); ctx.moveTo(2.4, -3.6); ctx.lineTo(5.8, -3.9); ctx.stroke();
    ART.gear(ctx, 3.4, 2.6, 1.7, 6, s.gear, K.brassLight, { lw: 0.5 });    // cheek gear
    ctx.restore();
    ctx.beginPath(); ctx.ellipse(0, 0.3, 5.1, 6.1, 0, 0, TAU);
    ctx.strokeStyle = ART.OUT; ctx.lineWidth = 0.9; ctx.stroke();
    // clock-dial eye: hands fixed at 23:47; the seconds hand moves only while he does
    ART.ell(ctx, 2.9, -1.4, 1.6, 1.6, K.brassLight, { lw: 0.5 });
    ctx.beginPath(); ctx.arc(2.9, -1.4, 1.1, 0, TAU); ctx.fillStyle = K.dial; ctx.fill();
    const hand = (a, len, col, w) => {
      ctx.beginPath(); ctx.moveTo(2.9, -1.4);
      ctx.lineTo(2.9 + Math.sin(a) * len, -1.4 - Math.cos(a) * len);
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke();
    };
    hand(6.156, 0.7, K.ink, 0.4);   // hour, 11
    hand(4.921, 0.95, K.ink, 0.3);  // minute, 47
    hand(s.dial, 1.0, '#a3361f', 0.25);
    // human eye, spectacles pushed down so the eye looks over the lens
    ART.eye(ctx, -2.2, -1.3, 1.25, 0, 0.2, s.blink, { lw: 0.6 });
    ctx.strokeStyle = K.brassDark; ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.ellipse(-2.2, 0.9, 2.0, 1.6, 0, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-0.2, 0.2); ctx.lineTo(1.3, -0.2); ctx.moveTo(-4.2, 0.3); ctx.lineTo(-5.4, -0.4); ctx.stroke();
    ART.ell(ctx, -0.4, -4.4, 5.3, 2.0, K.hair, { lw: 0.6 });               // neat grey hair on top
    ctx.strokeStyle = K.ink; ctx.lineWidth = 0.5;                          // mouth
    if (s.mouth > 0.05) ART.ell(ctx, 0.6, 3.5, 0.9, 0.25 + 0.6 * s.mouth, K.mouth, { lw: 0.4 });
    else { ctx.beginPath(); ctx.moveTo(-0.6, 3.6); ctx.lineTo(1.8, 3.4); ctx.stroke(); }
    ctx.restore();
  }

  function draw(ctx, p) {
    const pp = p || {};
    let st = STATES[pp.state] ? pp.state : 'idle';
    if (st === 'jump' && num(pp.vy) > 60) st = 'fall'; // descending
    const t = num(pp.t), time = num(pp.time);
    const K = palette(st === 'frozen');
    const s = solve(st, t, time);
    const hipY = -32 + s.hipDy;
    ctx.save();
    ctx.globalAlpha *= s.alpha;
    if (s.spin) ctx.rotate(s.spin);
    if (s.ring) ring(ctx);
    if (s.streaks) streaks(ctx, K);
    leg(ctx, K, -1, hipY, s.legF, s.legFb, K.trousersDark);   // far leg
    leg(ctx, K, 1.5, hipY, s.legN, s.legNb, K.trousers);      // near leg
    ctx.translate(0, hipY);
    ctx.rotate(s.lean);
    ctx.translate(0, s.breath);
    neck(ctx, K);
    torso(ctx, K);
    if (s.trail) trail(ctx, K, s);
    arm(ctx, K, -6, -16, s.armF, s.foF, true, s);    // his left arm (brass)
    head(ctx, K, s);
    arm(ctx, K, 5, -16, s.armN, s.foN, false, s);    // his right arm (flesh, rolled sleeve)
    ctx.restore();
  }

  /* ---------- portrait: 200x200 box centred on (0,0); his left (brass) side is on the viewer's right ---------- */
  function dialEye(ctx, x, y, r, sec, close) {
    ART.ell(ctx, x, y, r + 2.4, r + 2.4, BASE.brassLight, { lw: 2 });
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = BASE.dial; ctx.fill();
    ctx.strokeStyle = BASE.ink; ctx.lineCap = 'round';
    for (let i = 0; i < 12; i++) {
      const a = i * TAU / 12;
      ctx.lineWidth = i % 3 ? 1 : 1.6;
      ctx.beginPath();
      ctx.moveTo(x + Math.sin(a) * r * 0.76, y - Math.cos(a) * r * 0.76);
      ctx.lineTo(x + Math.sin(a) * r * 0.9, y - Math.cos(a) * r * 0.9);
      ctx.stroke();
    }
    const hand = (a, len, w, col) => {
      ctx.beginPath(); ctx.moveTo(x, y);
      ctx.lineTo(x + Math.sin(a) * r * len, y - Math.cos(a) * r * len);
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke();
    };
    hand(6.156, 0.5, 3, BASE.ink);   // hour hand: 11
    hand(4.921, 0.78, 2, BASE.ink);  // minute hand: 47 (it reads 23:47)
    hand(sec, 0.86, 1, '#a3361f');   // seconds
    ctx.beginPath(); ctx.arc(x, y, 1.6, 0, TAU); ctx.fillStyle = BASE.ink; ctx.fill();
    if (close > 0.01) { // brass lid closing from the top
      const top = y - r - 4, h = (2 * r + 8) * clamp(close, 0, 1), edge = top + h;
      ctx.save();
      ctx.beginPath(); ctx.arc(x, y, r + 2.4, 0, TAU); ctx.clip();
      ctx.fillStyle = BASE.brass; ctx.fillRect(x - r - 4, top, 2 * r + 8, h);
      ctx.strokeStyle = BASE.seam; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(x - r - 4, edge); ctx.lineTo(x + r + 4, edge); ctx.stroke();
      ctx.restore();
    }
  }

  function portrait(ctx, expr, t) {
    const E = EXPR[expr] || EXPR.neutral;
    const tt = num(t), blink = blinkAt(tt), K = BASE;
    const close = Math.max(blink, E.lid);

    // workshop backdrop with a faint clock face
    ctx.fillStyle = '#2b2119';
    ctx.fillRect(-100, -100, 200, 200);
    ctx.strokeStyle = 'rgba(201,150,63,0.25)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, -8, 84, 0, TAU); ctx.stroke();
    for (let i = 0; i < 12; i++) {
      const a = i * TAU / 12;
      ctx.beginPath();
      ctx.moveTo(Math.sin(a) * 74, -8 - Math.cos(a) * 74);
      ctx.lineTo(Math.sin(a) * 82, -8 - Math.cos(a) * 82);
      ctx.stroke();
    }

    ART.ell(ctx, 0, -18, 46, 52, K.hair, { lw: 2.5 });       // back hair
    ART.ell(ctx, -42, -2, 8, 13, K.skinShade, { lw: 2 });    // near ear
    ART.ell(ctx, 42, -2, 8, 13, K.brass, { lw: 2 });         // brass ear
    ART.rr(ctx, -17, 14, 34, 34, 8, K.skinShade, { lw: 2 }); // neck

    fillStroke(ctx, () => { // long brown coat, shoulders to the box edge
      ctx.beginPath();
      ctx.moveTo(-100, 100); ctx.lineTo(-100, 74);
      ctx.quadraticCurveTo(-98, 48, -70, 42); ctx.quadraticCurveTo(-44, 36, -22, 36);
      ctx.lineTo(22, 36); ctx.quadraticCurveTo(44, 36, 70, 42);
      ctx.quadraticCurveTo(98, 48, 100, 74); ctx.lineTo(100, 100); ctx.closePath();
    }, K.coat, 2.5);
    fillStroke(ctx, () => { // grey waistcoat
      ctx.beginPath(); ctx.moveTo(-16, 38); ctx.lineTo(16, 38); ctx.lineTo(22, 100); ctx.lineTo(-22, 100); ctx.closePath();
    }, K.waist, 2);
    for (const y of [64, 78, 92]) ART.ell(ctx, 0, y, 2.2, 2.2, K.brassLight, { lw: 1 });
    ctx.strokeStyle = K.brassDark; ctx.lineWidth = 1.6; // watch chain and pocket watch
    ctx.beginPath(); ctx.moveTo(-14, 54); ctx.quadraticCurveTo(-4, 64, -10, 72); ctx.stroke();
    ART.ell(ctx, -10, 78, 6.5, 6.5, K.brass, { lw: 1.5 });
    ART.ell(ctx, -10, 78, 4.5, 4.5, K.dial, { lw: 0.8 });
    fillStroke(ctx, () => { // shirt collar
      ctx.beginPath(); ctx.moveTo(-16, 38); ctx.lineTo(0, 58); ctx.lineTo(16, 38); ctx.closePath();
    }, K.shirt, 2);
    fillStroke(ctx, () => { // lapels
      ctx.beginPath(); ctx.moveTo(-22, 36); ctx.lineTo(-6, 74); ctx.lineTo(-24, 100); ctx.lineTo(-50, 100); ctx.lineTo(-42, 56); ctx.closePath();
    }, K.coatLight, 2);
    fillStroke(ctx, () => {
      ctx.beginPath(); ctx.moveTo(22, 36); ctx.lineTo(6, 74); ctx.lineTo(24, 100); ctx.lineTo(50, 100); ctx.lineTo(42, 56); ctx.closePath();
    }, K.coatLight, 2);

    // face: skin, then the brass half (clipped to the face), then the outline
    ART.ell(ctx, 0, -6, 42, 50, K.skin, { stroke: false });
    ctx.save();
    ctx.beginPath(); ctx.ellipse(0, -6, 42, 50, 0, 0, TAU); ctx.clip();
    const g = ctx.createLinearGradient(2, -56, 44, 40);
    g.addColorStop(0, K.brassLight); g.addColorStop(0.55, K.brass); g.addColorStop(1, K.brassDark);
    ctx.fillStyle = g;
    ctx.fillRect(2, -60, 50, 120);
    ctx.strokeStyle = K.seam; ctx.lineWidth = 1.3; // seam down the nose
    ctx.beginPath(); ctx.moveTo(2, -60); ctx.lineTo(2, 50); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(16, -46); ctx.lineTo(28, -30); ctx.lineTo(22, -12);
    ctx.moveTo(30, 6); ctx.lineTo(40, 10);
    ctx.stroke();
    for (const [x, y] of [[8, -44], [8, -26], [8, -8], [10, 8]]) {
      ctx.beginPath(); ctx.arc(x, y, 1.5, 0, TAU); ctx.fillStyle = K.brassDark; ctx.fill();
    }
    ART.gear(ctx, 24, 22, 10, 10, tt * 0.6, K.brassLight, { lw: 1.4 }); // cheek gear, turning
    ctx.restore();
    ctx.beginPath(); ctx.ellipse(0, -6, 42, 50, 0, 0, TAU);
    ctx.strokeStyle = ART.OUT; ctx.lineWidth = 2.5; ctx.stroke();

    // nose, spectacles pushed down, temple
    ctx.strokeStyle = K.skinShade; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -4); ctx.quadraticCurveTo(4.5, 7, -1, 13); ctx.stroke();
    ART.ell(ctx, -1.2, 13.4, 2.4, 1.6, K.skinShade, { lw: 1 });
    ctx.strokeStyle = K.brassDark; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(-22, 2, 13, 9.5, 0, 0, TAU); ctx.stroke();
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(-9, 0); ctx.quadraticCurveTo(0, -3, 9.6, -2); ctx.stroke();
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(-35, -1); ctx.lineTo(-44, -4); ctx.stroke();

    // neat grey hair swept across the forehead
    ctx.beginPath();
    ctx.moveTo(-44, -6);
    ctx.bezierCurveTo(-48, -60, -8, -70, 10, -64);
    ctx.bezierCurveTo(34, -58, 48, -38, 44, -6);
    ctx.bezierCurveTo(40, -24, 30, -34, 18, -36);
    ctx.bezierCurveTo(2, -38, -20, -40, -30, -30);
    ctx.bezierCurveTo(-38, -24, -42, -14, -44, -6);
    ctx.closePath();
    ctx.fillStyle = K.hair; ctx.fill();
    ctx.strokeStyle = ART.OUT; ctx.lineWidth = 2.2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-30, -52); ctx.quadraticCurveTo(-6, -62, 22, -56);
    ctx.strokeStyle = K.hairLight; ctx.lineWidth = 3; ctx.stroke();

    // brows
    const brow = (xo, yo, xi, yi) => {
      ctx.beginPath(); ctx.moveTo(xo, yo);
      ctx.quadraticCurveTo((xo + xi) / 2, Math.min(yo, yi) - 4, xi, yi);
      ctx.stroke();
    };
    ctx.strokeStyle = K.hairDark; ctx.lineWidth = 4.2;
    brow(-38, E.bo, -9, E.bi);
    brow(38, E.bo, 9, E.bi);

    // eyes: human eye on his right, clock-dial eye on his left (brass)
    ART.eye(ctx, -22, -4, E.big ? 7.2 : 6.4, 0, E.look || 0, close, { lw: 1.8 });
    dialEye(ctx, 24, -2, 12, tt * 0.5, close);

    // mouth
    ctx.strokeStyle = K.ink; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath();
    switch (E.mouth) {
      case 'smile': ctx.moveTo(-14, 26); ctx.quadraticCurveTo(0, 40, 14, 26); ctx.stroke(); break;
      case 'frown': ctx.moveTo(-12, 37); ctx.quadraticCurveTo(0, 27, 12, 37); ctx.stroke(); break;
      case 'tight': ctx.moveTo(-11, 32); ctx.lineTo(11, 32); ctx.stroke(); break;
      case 'wave':
        ctx.moveTo(-13, 32); ctx.quadraticCurveTo(-6.5, 26, 0, 32);
        ctx.quadraticCurveTo(6.5, 38, 13, 31); ctx.stroke();
        break;
      case 'open': ART.ell(ctx, 0, 34, 7, 9, K.mouth, { lw: 2 }); break;
      default: ctx.moveTo(-12, 30); ctx.quadraticCurveTo(0, 32, 12, 29); ctx.stroke();
    }
  }

  ART.register({ id: 'elias', w: 30, h: 64, draw: draw, portrait: portrait });
})();
