/* Mrs. Pivert, the baker stuck in her loop (ch1-ch5). Plump and rosy-cheeked, brick-red dress,
   flour-stained white apron, blue headscarf with yellow polka dots, hair pinned up with a pencil,
   a round loaf held in both hands. Drawn facing right; origin (0,0) = centre of the feet; y negative is up.
   Overrides the base drawing for id 'pivert' (loaded after humanoid.js). */
(function () {
  'use strict';

  const OUT = ART.OUT;
  const clamp = ART.clamp;
  const lerp = ART.lerp;

  const BASE = {
    skin: '#f2c3a0', skinDark: '#d99a72', blush: '#ec7467',
    hair: '#6b4a33', dress: '#b0473a', apron: '#f6f0e2', flour: '#d3c5a6',
    scarf: '#2f5ea8', dot: '#f3cc4f', shoe: '#3a2a22', stocking: '#4b3a33',
    bread: '#c98a3d', crust: '#9c5a24', breadHi: '#e9b76c', dust: '#f7efdc',
    pencil: '#f2c94c', wood: '#e0b08a', mouth: '#8a3b33', mouthIn: '#6b2a2a',
    tongue: '#e8706a', brow: '#5b3e2b', drop: '#8fc3e8'
  };
  const FROST = '#a9bfd0';
  const STATES = ['idle', 'walk', 'run', 'jump', 'fall', 'land', 'attack', 'dash', 'hurt', 'dead', 'talk', 'slow', 'frozen'];
  const EXPRS = ['neutral', 'happy', 'sad', 'angry', 'surprised', 'worried'];
  const BROWS = {
    neutral: [[-27, -30, -9, -31], [9, -31, 27, -30]],
    happy: [[-27, -33, -9, -35], [9, -35, 27, -33]],
    sad: [[-27, -28, -9, -36], [9, -36, 27, -28]],
    angry: [[-27, -36, -9, -30], [9, -30, 27, -36]],
    surprised: [[-27, -35, -9, -39], [9, -39, 27, -35]],
    worried: [[-27, -29, -9, -40], [9, -40, 27, -29]]
  };

  const num = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);
  const smooth = (u) => u * u * (3 - 2 * u);

  function rgb(h) {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mix(a, b, k) {
    const A = rgb(a), B = rgb(b);
    return '#' + A.map((v, i) => Math.round(lerp(v, B[i], k)).toString(16).padStart(2, '0')).join('');
  }
  /* fz > 0 frosts the colours toward grey-blue (frozen NPC, slowed time). */
  function palette(fz) {
    const c = {};
    for (const k in BASE) c[k] = fz > 0 ? mix(BASE[k], FROST, fz) : BASE[k];
    c.dressDark = ART.shade(c.dress, -0.22);
    c.dressLight = ART.shade(c.dress, 0.16);
    c.apronShade = ART.shade(c.apron, -0.14);
    return c;
  }

  /* ---------- pose: turns the engine pose into body parameters ---------- */
  function pose(p) {
    const st = STATES.indexOf(p.state) >= 0 ? p.state : 'idle';
    const t = Math.max(0, num(p.t));
    const time = num(p.time);
    const m = {
      st, t, time,
      lean: 0, sx: 1, sy: 1, bob: 0, fz: 0, alpha: 1,
      feet: [[-3.6, 0], [3.6, 0]],                        // ground contact of each foot
      loaf: { x: 2, y: -17, rx: 6.6, ry: 4.6 },
      swing: null, behind: false, dash: false,
      blink: ((time % 3.4) + 3.4) % 3.4 < 0.12 ? 1 : 0,
      squint: 0, mouth: 0, mouthO: false,
      flutter: Math.sin(time * 2.2) * 0.7                  // scarf tails
    };
    switch (st) {
      case 'talk':
        m.sy = 1 + 0.012 * Math.sin(time * 2.4);
        m.lean = 0.03 * Math.sin(time * 2);
        m.loaf.y = -17 - 1.4 * Math.abs(Math.sin(time * 5.5));
        m.mouth = 0.5 + 0.5 * Math.sin(time * 18);
        break;
      case 'slow':
        m.sy = 1 + 0.015 * Math.sin(time * 0.9);
        m.lean = 0.01 * Math.sin(time * 0.5);
        m.fz = 0.2;
        break;
      case 'frozen':
        m.fz = 0.5;
        m.blink = 0;
        break;
      case 'walk':
      case 'run': {
        const run = st === 'run';
        const ph = time * (run ? 13 : 8.5);
        const s = Math.sin(ph), co = Math.cos(ph);
        const amp = run ? 4.6 : 3.2, lift = run ? 3 : 2;
        m.lean = (run ? 0.09 : 0) + (run ? 0.03 : 0.035) * s;   // waddle, forward lean when running
        m.bob = -(run ? 2.2 : 1.3) * Math.abs(s);              // two bounces per stride
        m.feet = [
          [-3.6 + amp * s, -lift * Math.max(0, co)],
          [3.6 - amp * s, -lift * Math.max(0, -co)]
        ];
        m.loaf.x = 2 - 0.8 * s;                                // the loaf sways against the stride
        break;
      }
      case 'jump':
        m.sx = 0.97; m.sy = 1.05; m.lean = 0.04;
        m.feet = [[-2.8, -4.2], [2.8, -4.6]];                  // tucked knees
        m.loaf.y = -20.5;
        break;
      case 'fall':
        m.sy = 1.02; m.lean = -0.02;
        m.feet = [[-4.4, -2.2], [4.2, -1.6]];
        m.loaf.y = -20;
        m.flutter = -1.2 + Math.sin(time * 9) * 0.5;
        break;
      case 'land': {
        const k = clamp(1 - t / 0.22, 0, 1);
        m.sx = 1 + 0.12 * k; m.sy = 1 - 0.16 * k;
        m.feet = [[-3.6 - 1.5 * k, 0], [3.6 + 1.5 * k, 0]];
        m.loaf.y = -17 + 1.5 * k;
        break;
      }
      case 'attack': {
        // wind-up behind her, then a wide arc forward with a trail; the loaf is the weapon
        const u = clamp(t / 0.45, 0, 1);
        const CX = 4, CY = -21, R = 14;
        let th;
        if (u < 0.3) th = lerp(-0.4, -2.7, smooth(u / 0.3));
        else if (u < 0.6) { const q = (u - 0.3) / 0.3; th = lerp(-2.7, 0.25, q * q); }
        else th = 0.25;
        m.lean = u < 0.3 ? -0.1 * (u / 0.3) : u < 0.6 ? lerp(-0.1, 0.2, (u - 0.3) / 0.3) : lerp(0.2, 0.05, (u - 0.6) / 0.4);
        m.loaf.x = CX + R * Math.cos(th);
        m.loaf.y = CY + R * Math.sin(th);
        m.behind = th < -1.2;
        if (u >= 0.3 && u < 0.75) m.swing = { cx: CX, cy: CY, R, from: Math.max(-2.7, th - 1.5), to: th };
        break;
      }
      case 'dash':
        m.sx = 1.04; m.sy = 0.96; m.lean = 0.24; m.dash = true;
        m.feet = [[-6.5, -0.8], [5.2, -0.4]];
        m.loaf.x = 6; m.loaf.y = -18;
        m.flutter = 0.6;
        break;
      case 'hurt': {
        const k = clamp(1 - t / 0.4, 0, 1);
        m.lean = -0.16 * k;
        m.loaf.rx = 6.6 * (1 + 0.15 * k);
        m.loaf.ry = 4.6 * (1 - 0.25 * k);
        m.loaf.x = 2 - 1.5 * k;
        m.squint = t < 0.6 ? 0.7 : 0.3;
        m.mouthO = true;
        break;
      }
      case 'dead': {
        const f = clamp(t / 0.5, 0, 1);
        m.lean = -(Math.PI / 2) * smooth(f);                  // falls backward
        m.alpha = 1 - clamp((t - 0.6) / 1.0, 0, 1);           // then fades out
        m.squint = 1;
        break;
      }
      default: { // idle: slow breathing, gentle sway
        const br = Math.sin(time * 2.4);
        m.sy = 1 + 0.018 * br;
        m.lean = 0.012 * Math.sin(time * 1.3);
        m.loaf.y = -17 - 0.5 * br;
      }
    }
    return m;
  }

  /* ---------- body parts (full figure, feet at 0,0) ---------- */
  function handsAt(m) {
    const L = m.loaf;
    return [[L.x - L.rx * 0.8, L.y + 1.2], [L.x + L.rx * 0.85, L.y + 1.4]];
  }

  function drawLegs(ctx, m, c) {
    const hips = [-3.4, 3.4];
    for (let i = 0; i < 2; i++) {
      const fx = m.feet[i][0], fy = m.feet[i][1];
      ART.limb(ctx, hips[i], -8, fx, fy - 3.2, 3.4, c.stocking, { lw: 1 });
      ART.ell(ctx, fx + 0.9, fy - 1.6, 3.7, 2.1, c.shoe, { lw: 1.3 });
    }
  }

  /* Bun at the nape, scarf knot and tails (behind the head). The pencil pokes out from under the scarf. */
  function drawTails(ctx, m, c) {
    const f = m.flutter;
    ART.ell(ctx, -8.8, -40.5, 3.2, 3.2, c.hair, { lw: 1.2 });
    ART.limb(ctx, -8.6, -41, -15.2, -48.2, 1.9, c.pencil, { lw: 0.8 });
    ART.limb(ctx, -15.2, -48.2, -16.8, -50, 1.9, c.wood, { lw: 0.6 });
    ART.poly(ctx, [[-8.5, -40], [-15.6, -36 + f], [-16.2, -28 + f], [-8, -33]], c.scarf, { lw: 1.4 });
    ART.poly(ctx, [[-9, -37.5], [-16.8, -42.6 - f], [-15.6, -46.8 - f], [-8.5, -41]], c.scarf, { lw: 1.4 });
    ART.ell(ctx, -12.4, -32 + f * 0.6, 0.9, 0.9, c.dot, { stroke: false });
  }

  function dressPath(ctx) {
    ctx.beginPath();
    ctx.moveTo(-6.5, -25.5);
    ctx.quadraticCurveTo(-12.6, -22, -12.9, -14);
    ctx.quadraticCurveTo(-13.8, -8, -14.6, -5.5);
    ctx.quadraticCurveTo(0, -3.6, 14.6, -5.5);
    ctx.quadraticCurveTo(13.8, -8, 12.9, -14);
    ctx.quadraticCurveTo(12.6, -22, 6.5, -25.5);
    ctx.closePath();
  }

  function drawDress(ctx, c) {
    dressPath(ctx);
    ctx.fillStyle = c.dress;
    ctx.fill();
    ctx.save();
    dressPath(ctx);
    ctx.clip();
    // light comes from the upper left: the right side of the skirt is in shade
    ART.poly(ctx, [[3, -26], [11, -20], [13.5, -13], [15.5, -4], [5, -4], [1, -14]], c.dressDark, { stroke: false, alpha: 0.85 });
    ART.ell(ctx, -7.5, -18, 2.2, 3.4, c.dressLight, { stroke: false, alpha: 0.5 });
    ART.limb(ctx, -7.8, -14, -9.6, -7, 1, c.dressDark, { stroke: false });
    ART.limb(ctx, 8.2, -15, 9.8, -8, 1, c.dressDark, { stroke: false });
    ctx.restore();
    dressPath(ctx);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.8;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }

  function drawApron(ctx, c) {
    ART.poly(ctx, [[-5.5, -24.8], [5.5, -24.8], [6.8, -19], [9.4, -12.5], [10.4, -7], [-10.4, -7], [-9.4, -12.5], [-6.8, -19]], c.apron, { lw: 1.4 });
    ART.limb(ctx, -6.6, -19, 6.6, -19, 1.1, c.apronShade, { stroke: false });
    ART.ell(ctx, -4.2, -12.5, 1.5, 0.9, c.flour, { stroke: false, rot: 0.4 });
    ART.ell(ctx, 5.4, -10, 1.2, 0.8, c.flour, { stroke: false });
    ART.ell(ctx, -7.8, -9.2, 1, 0.7, c.flour, { stroke: false });
  }

  /* Two-segment sleeve from shoulder to hand, elbow pushed outward. */
  function arm(ctx, sx, sy, hx, hy, side, color) {
    const ex = (sx + hx) / 2 + side * 3.2, ey = (sy + hy) / 2 + 2.2;
    ART.limb(ctx, sx, sy, ex, ey, 4.6, color, { lw: 1.4 });
    ART.limb(ctx, ex, ey, hx, hy, 4.2, color, { lw: 1.4 });
  }

  function drawArms(ctx, m, c) {
    const h = handsAt(m);
    arm(ctx, -7.8, -23.5, h[0][0], h[0][1], -1, c.dress);
    arm(ctx, 7.8, -23.5, h[1][0], h[1][1], 1, c.dress);
  }

  function drawTrail(ctx, m) {
    const s = m.swing;
    if (!s) return;
    ctx.save();
    ctx.beginPath();
    ctx.arc(s.cx, s.cy, s.R, s.from, s.to);
    ctx.strokeStyle = 'rgba(255, 244, 220, 0.55)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
  }

  function drawLoaf(ctx, m, c) {
    const L = m.loaf;
    ART.ell(ctx, L.x, L.y, L.rx, L.ry, c.bread, { lw: 1.5 });
    ART.ell(ctx, L.x + 0.8, L.y + 1.9, L.rx * 0.7, L.ry * 0.25, c.crust, { stroke: false, alpha: 0.35 });
    ART.ell(ctx, L.x - 1.2, L.y - 2.2, L.rx * 0.45, L.ry * 0.25, c.breadHi, { stroke: false, alpha: 0.9, rot: -0.15 });
    [-0.4, 0.05, 0.5].forEach((k) => {
      const x = L.x + k * L.rx;
      ART.limb(ctx, x - 1.3, L.y - 1.2, x + 0.9, L.y - 3, 0.9, c.crust, { stroke: false });
    });
    [[L.x + 2.6, L.y - 3.4], [L.x - 3.6, L.y + 0.6], [L.x + 4.2, L.y + 1.2]]
      .forEach(([x, y]) => ART.ell(ctx, x, y, 0.6, 0.6, c.dust, { stroke: false }));
  }

  function drawHands(ctx, m, c) {
    handsAt(m).forEach(([x, y]) => ART.ell(ctx, x, y, 2.3, 2.0, c.skin, { lw: 1.1 }));
  }

  function drawMouth(ctx, m, c) {
    if (m.st === 'dead') return;
    if (m.st === 'talk') ART.ell(ctx, 0.4, -25.6, 1.6, 0.5 + 1.1 * m.mouth, c.mouthIn, { lw: 0.8 });
    else if (m.mouthO) ART.ell(ctx, 0.4, -25.6, 1.3, 1.5, c.mouthIn, { lw: 0.8 });
    else ART.limb(ctx, -1.8, -26.4, 2.6, -26.4, 1, c.mouth, { stroke: false });
  }

  /* Head: face, then the headscarf cap with its polka dots. */
  function drawHead(ctx, m, c) {
    const shut = Math.max(m.blink, m.squint);
    ART.ell(ctx, 0, -34, 9.6, 10.2, c.skin, { lw: 1.8 });
    ART.ell(ctx, -5.4, -28.6, 2.6, 1.8, c.blush, { stroke: false, alpha: 0.75 });
    ART.ell(ctx, 5.4, -28.6, 2.6, 1.8, c.blush, { stroke: false, alpha: 0.75 });
    ART.limb(ctx, 0.8, -30.6, 1.6, -29.2, 0.9, c.skinDark, { stroke: false });
    ART.eye(ctx, -3.2, -31.8, 2.1, 0.3, 0, shut, { lw: 0.9 });
    ART.eye(ctx, 3.4, -31.8, 2.1, 0.3, 0, shut, { lw: 0.9 });
    drawMouth(ctx, m, c);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-10.6, -35);
    ctx.bezierCurveTo(-12.6, -52, 12.6, -52, 10.6, -35);
    ctx.bezierCurveTo(7, -40.5, -7, -40.5, -10.6, -35);
    ctx.closePath();
    ctx.fillStyle = c.scarf;
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.6;
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();
    [[-5.2, -43.6], [0.2, -45.8], [5.4, -43.6], [-7.9, -40.8]]
      .forEach(([x, y]) => ART.ell(ctx, x, y, 1.1, 1.1, c.dot, { lw: 0.6 }));
  }

  function draw(ctx, p) {
    const m = pose(p || {});
    const c = palette(m.fz);
    ctx.save();
    if (m.alpha < 1) ctx.globalAlpha *= clamp(m.alpha, 0, 1);
    ctx.rotate(m.lean);              // pivot at the feet
    ctx.scale(m.sx, m.sy);
    if (m.dash) ART.limb(ctx, -17, -30, -27, -30, 1.4, 'rgba(255, 255, 255, 0.5)', { stroke: false });
    drawLegs(ctx, m, c);             // legs stay on the ground while the body bobs
    ctx.translate(0, m.bob);
    drawTails(ctx, m, c);
    drawDress(ctx, c);
    drawApron(ctx, c);
    drawArms(ctx, m, c);
    drawTrail(ctx, m);
    // the loaf goes behind her head during a wind-up, otherwise in front of it
    const front = m.behind ? [drawLoaf, drawHands, drawHead] : [drawHead, drawLoaf, drawHands];
    front.forEach((fn) => fn(ctx, m, c));
    ctx.restore();
  }

  /* ---------- portrait: head and shoulders filling the 200x200 box ---------- */
  function bodicePath(ctx) {
    ctx.beginPath();
    ctx.moveTo(-100, 100);
    ctx.lineTo(-100, 78);
    ctx.quadraticCurveTo(-98, 50, -62, 46);
    ctx.quadraticCurveTo(-30, 62, 0, 62);
    ctx.quadraticCurveTo(30, 62, 62, 46);
    ctx.quadraticCurveTo(98, 50, 100, 78);
    ctx.lineTo(100, 100);
    ctx.closePath();
  }

  function drawPortraitMouth(ctx, e, c) {
    ctx.save();
    if (e === 'happy') {
      ctx.beginPath();
      ctx.moveTo(-18, 26);
      ctx.quadraticCurveTo(0, 32, 18, 26);
      ctx.quadraticCurveTo(14, 50, 0, 50);
      ctx.quadraticCurveTo(-14, 50, -18, 26);
      ctx.closePath();
      ctx.fillStyle = c.mouthIn;
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 2.6;
      ctx.stroke();
      ART.ell(ctx, 1, 42, 7, 3.4, c.tongue, { stroke: false });
    } else if (e === 'surprised') {
      ART.ell(ctx, 0, 34, 7.5, 9.5, c.mouthIn, { lw: 2.6 });
    } else if (e === 'angry') {
      ART.rr(ctx, -13, 31, 26, 7, 3.5, c.mouth, { lw: 1.6 });
    } else {
      ctx.beginPath();
      if (e === 'sad') {
        ctx.moveTo(-13, 40);
        ctx.quadraticCurveTo(0, 28, 13, 40);
      } else if (e === 'worried') {
        ctx.moveTo(-13, 36);
        ctx.quadraticCurveTo(-6.5, 30, 0, 36);
        ctx.quadraticCurveTo(6.5, 42, 13, 36);
      } else {
        ctx.moveTo(-12, 31);
        ctx.quadraticCurveTo(0, 37, 12, 31);
      }
      ctx.strokeStyle = c.mouth;
      ctx.lineWidth = 3.2;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
    ctx.restore();
  }

  function portrait(ctx, expr, t) {
    const e = EXPRS.indexOf(expr) >= 0 ? expr : 'neutral';
    const time = num(t);
    const c = palette(0);
    const blink = ((time % 3.4) + 3.4) % 3.4 < 0.12 ? 1 : 0;
    const sway = Math.sin(time * 2.2) * 3;
    const happy = e === 'happy';
    ctx.save();
    ctx.translate(0, Math.sin(time * 2) * 0.8);

    // neck, dress with shoulder shade, apron bib, sleeves, loaf and hands
    ART.rr(ctx, -17, 22, 34, 36, 10, c.skin, { lw: 2.5 });
    bodicePath(ctx);
    ctx.fillStyle = c.dress;
    ctx.fill();
    ctx.save();
    bodicePath(ctx);
    ctx.clip();
    ART.poly(ctx, [[30, 50], [62, 44], [100, 60], [100, 100], [44, 100]], c.dressDark, { stroke: false, alpha: 0.8 });
    ctx.restore();
    bodicePath(ctx);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.stroke();
    ART.poly(ctx, [[-36, 62], [36, 62], [42, 100], [-42, 100]], c.apron, { lw: 2.2 });
    ART.ell(ctx, -20, 88, 4.5, 2.6, c.flour, { stroke: false });
    ART.ell(ctx, 22, 94, 3.4, 2.2, c.flour, { stroke: false });
    ART.ell(ctx, -30, 74, 2.6, 1.6, c.flour, { stroke: false });
    ART.limb(ctx, -74, 66, -42, 82, 16, c.dress, { lw: 2.4 });
    ART.limb(ctx, 74, 66, 42, 82, 16, c.dress, { lw: 2.4 });
    ART.ell(ctx, 0, 80, 36, 19, c.bread, { lw: 3 });
    ART.ell(ctx, 0, 91, 30, 5, c.crust, { stroke: false, alpha: 0.25 });
    ART.ell(ctx, -8, 70, 15, 5.5, c.breadHi, { stroke: false, alpha: 0.85, rot: -0.12 });
    [[-18, 73, -9, 68], [-1, 75, 7, 70], [13, 78, 21, 73]]
      .forEach((s) => ART.limb(ctx, s[0], s[1], s[2], s[3], 3.4, c.crust, { stroke: false }));
    [[-22, 85], [10, 88], [26, 80]].forEach(([x, y]) => ART.ell(ctx, x, y, 1.6, 1.6, c.dust, { stroke: false }));
    ART.ell(ctx, -40, 80, 9, 8.5, c.skin, { lw: 2.4 });
    ART.ell(ctx, 40, 81, 9, 8.5, c.skin, { lw: 2.4 });
    ART.limb(ctx, -44, 76, -43, 84, 1.2, c.skinDark, { stroke: false });
    ART.limb(ctx, 44, 77, 43, 85, 1.2, c.skinDark, { stroke: false });

    // scarf knot and tails behind the head
    ART.poly(ctx, [[-44, -30], [-84, -18 + sway], [-86, 10 + sway], [-48, -4]], c.scarf, { lw: 2.4 });
    ART.poly(ctx, [[-46, -46], [-92, -54 - sway], [-86, -28 - sway * 0.5], [-44, -30]], c.scarf, { lw: 2.4 });
    ART.ell(ctx, -70, -10 + sway * 0.4, 3.2, 3.2, c.dot, { lw: 1.4 });
    ART.ell(ctx, -78, -40 - sway * 0.3, 3, 3, c.dot, { lw: 1.4 });

    // head: rosy cheeks, nose, eyes, mouth
    ART.ell(ctx, 0, -6, 50, 52, c.skin, { lw: 3 });
    const blush = happy ? 0.85 : (e === 'sad' || e === 'worried') ? 0.4 : 0.6;
    ART.ell(ctx, -31, 8, 12, 7.5, c.blush, { stroke: false, alpha: blush });
    ART.ell(ctx, 33, 8, 12, 7.5, c.blush, { stroke: false, alpha: blush });
    ctx.beginPath();
    ctx.moveTo(3, -4);
    ctx.quadraticCurveTo(9, 6, 4, 10);
    ctx.strokeStyle = c.skinDark;
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.stroke();
    if (happy) {
      [-18, 18].forEach((x) => {
        ctx.beginPath();
        ctx.arc(x, -11, 8.5, Math.PI * 1.18, Math.PI * 1.82);
        ctx.strokeStyle = OUT;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.stroke();
      });
    } else {
      const surprised = e === 'surprised';
      const shut = surprised ? 0 : Math.max(blink, e === 'sad' ? 0.25 : e === 'angry' ? 0.45 : 0);
      const r = surprised ? 10.5 : e === 'worried' ? 9 : 8.5;
      const lx = e === 'worried' ? -0.3 : 0.2;
      const ly = e === 'worried' ? -0.6 : e === 'sad' ? 0.5 : 0;
      ART.eye(ctx, -18, -11, r, lx, ly, shut, { lw: 2 });
      ART.eye(ctx, 18, -11, r, lx, ly, shut, { lw: 2 });
    }
    drawPortraitMouth(ctx, e, c);

    // headscarf: blue dome, forehead edge, yellow polka dots
    ctx.beginPath();
    ctx.moveTo(-60, -20);
    ctx.bezierCurveTo(-72, -112, 72, -112, 60, -20);
    ctx.bezierCurveTo(30, -52, -30, -52, -60, -20);
    ctx.closePath();
    ctx.fillStyle = c.scarf;
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.stroke();
    [[-44, -44], [-22, -64], [0, -80], [22, -64], [44, -44], [0, -55]]
      .forEach(([x, y]) => ART.ell(ctx, x, y, 5.2, 5.2, c.dot, { lw: 1.8 }));

    // brows, and a sweat drop when worried
    BROWS[e].forEach((b) => ART.limb(ctx, b[0], b[1], b[2], b[3], 4.6, c.brow, { stroke: false }));
    if (e === 'worried') {
      ART.poly(ctx, [[72, -30], [66, -18], [78, -18]], c.drop, { lw: 1.8 });
      ART.ell(ctx, 72, -16, 5.5, 6, c.drop, { lw: 1.8 });
    }
    ctx.restore();
  }

  ART.register({
    id: 'pivert', w: 28, h: 48,
    draw(ctx, p) { draw(ctx, p); },
    portrait(ctx, expr, t) { portrait(ctx, expr, t); }
  });
})();
