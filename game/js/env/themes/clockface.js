/* ENV theme "clockface": the summit of the Tower (ch5). Contract: DESIGN.md section 6, AGENT_BRIEF.md.
   Dusk sky from violet to gold, the giant clock at 23:47 in the far layer, frozen clouds in soft layers,
   pale marble tiles, gold-trimmed plates, gold glints on gears, light shafts in the foreground. */
(function () {
  window.ENV_THEMES = window.ENV_THEMES || {};

  const TAU = Math.PI * 2;
  const S = 32;                                // tile size
  const HOUR_A = ((11 + 47 / 60) / 12) * TAU;  // 23:47: hour hand just short of XII
  const MIN_A = (47 / 60) * TAU;               // minute hand at 47
  const CLOCK_PERIOD = 1400;                   // world distance between two giant clocks

  function num(v, d) { return typeof v === 'number' && isFinite(v) ? v : d; }

  // Stable pseudo-random value in [0, 1) for a pair of numbers.
  function rnd(a, b) {
    const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
    return s - Math.floor(s);
  }

  // Calls fn(k, screenX) for each world-stable column of width P seen through a layer at factor f.
  function columns(camX, f, P, W, fn) {
    const base = Math.floor((camX * f) / P);
    const count = Math.ceil(W / P) + 2;
    for (let j = -2; j < count; j++) {
      const k = base + j;
      fn(k, k * P - camX * f);
    }
  }

  /* ---------- background ---------- */

  function stars(ctx, camX, t, W, H) {
    const P = 1200;
    columns(camX, 0.2, P, W, (k, sx) => {
      for (let s = 0; s < 8; s++) {
        const x = sx + rnd(k, s * 3 + 1) * P;
        if (x < -4 || x > W + 4) continue;
        const y = 16 + rnd(k, s * 3 + 2) * H * 0.4;
        ctx.globalAlpha = Math.max(0.1, 0.4 + 0.4 * Math.sin(t * (1 + rnd(s, k)) + s * 2.1));
        ctx.fillStyle = '#fff4d8';
        ctx.beginPath();
        ctx.arc(x, y, 0.9 + rnd(s, k) * 0.9, 0, TAU);
        ctx.fill();
      }
    });
    ctx.globalAlpha = 1;
  }

  // One frozen cloud: a body with a flat base. Lit tops come from a second, offset copy.
  function cloud(ctx, x, y, s, col, a) {
    ctx.globalAlpha = a;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(x + 22 * s, y, 22 * s, 0, TAU);
    ctx.arc(x + 52 * s, y - 13 * s, 30 * s, 0, TAU);
    ctx.arc(x + 84 * s, y - 2 * s, 22 * s, 0, TAU);
    ctx.arc(x + 104 * s, y + 6 * s, 14 * s, 0, TAU);
    ctx.rect(x + 20 * s, y, 84 * s, 16 * s);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function cloudLayer(ctx, camX, camY, L, W, seed) {
    columns(camX, L.f, L.P, W, (k, sx) => {
      const x = sx + rnd(k, seed) * L.P * 0.5;
      const y = L.y0 + rnd(k, seed + 1) * (L.y1 - L.y0) - camY * L.f * 0.15;
      const s = L.sc * (0.8 + rnd(k, seed + 2) * 0.45);
      cloud(ctx, x, y, s, L.body, L.a);
      cloud(ctx, x + 8 * s, y - 7 * s, s * 0.8, L.lit, L.a * 0.8);
    });
  }

  // The clock as seen from behind: iron back-plate with a gold toothed rim, then the cream face in front.
  function hand(ctx, cx, cy, a, len, w) {
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.sin(a) * len, cy - Math.cos(a) * len);
    ctx.stroke();
  }

  function clockFace(ctx, cx, cy, R) {
    ctx.fillStyle = '#3a2a40';
    ctx.beginPath();
    ctx.arc(cx, cy, R + 10, 0, TAU);
    ctx.fill();

    ctx.fillStyle = '#9c7430';
    ctx.beginPath();
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * TAU;
      const d = (TAU / 36) * 0.3;
      ctx.moveTo(cx + Math.cos(a - d) * (R + 10), cy + Math.sin(a - d) * (R + 10));
      ctx.lineTo(cx + Math.cos(a - d) * (R + 17), cy + Math.sin(a - d) * (R + 17));
      ctx.lineTo(cx + Math.cos(a + d) * (R + 17), cy + Math.sin(a + d) * (R + 17));
      ctx.lineTo(cx + Math.cos(a + d) * (R + 10), cy + Math.sin(a + d) * (R + 10));
      ctx.closePath();
    }
    ctx.fill();

    const face = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.1, cx, cy, R);
    face.addColorStop(0, '#fffaf0');
    face.addColorStop(0.75, '#f1e4c6');
    face.addColorStop(1, '#d9c39a');
    ctx.fillStyle = face;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#c9963c';
    ctx.lineWidth = R * 0.035;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.98, 0, TAU);
    ctx.stroke();

    ctx.strokeStyle = '#2a1f22';
    ctx.lineCap = 'butt';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      const big = i % 3 === 0;
      const r1 = R * (big ? 0.78 : 0.84);
      const r2 = R * 0.92;
      ctx.lineWidth = big ? R * 0.045 : R * 0.02;
      ctx.beginPath();
      ctx.moveTo(cx + Math.sin(a) * r1, cy - Math.cos(a) * r1);
      ctx.lineTo(cx + Math.sin(a) * r2, cy - Math.cos(a) * r2);
      ctx.stroke();
    }

    ctx.strokeStyle = '#14100f';
    ctx.lineCap = 'round';
    hand(ctx, cx, cy, HOUR_A, R * 0.5, R * 0.09);
    hand(ctx, cx, cy, MIN_A, R * 0.78, R * 0.055);

    ctx.fillStyle = '#d9a84a';
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.07, 0, TAU);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function giantClock(ctx, camX, camY, W) {
    const R = 160;
    const cy = 180 - camY * 0.1;
    const base = Math.round((camX * 0.25) / CLOCK_PERIOD);
    for (let k = base - 1; k <= base + 1; k++) {
      const cx = W * 0.5 + k * CLOCK_PERIOD - camX * 0.25;
      if (cx + R + 20 < 0 || cx - R - 20 > W) continue;
      clockFace(ctx, cx, cy, R);
    }
  }

  // Rooftop silhouettes of the Tower, with some pointed roofs.
  function spireRow(ctx, camX, f, base, col, seed, W, H, P) {
    ctx.fillStyle = col;
    columns(camX, f, P, W, (k, sx) => {
      const x0 = sx + rnd(k, seed) * P * 0.35;
      const w = P * (0.35 + rnd(k, seed + 1) * 0.25);
      const top = base - (20 + rnd(k, seed + 2) * 70);
      ctx.fillRect(x0, top, w, H - top);
      if (rnd(k, seed + 3) > 0.45) {
        const apex = 36 + rnd(k, seed + 4) * 50;
        ctx.beginPath();
        ctx.moveTo(x0 - 4, top);
        ctx.lineTo(x0 + w / 2, top - apex);
        ctx.lineTo(x0 + w + 4, top);
        ctx.closePath();
        ctx.fill();
      }
    });
  }

  function background(ctx, camX, camY, t, W, H) {
    const cx0 = num(camX, 0);
    const cy0 = num(camY, 0);
    const tt = num(t, 0);
    const w = num(W, 960);
    const h = num(H, 540);
    ctx.save();

    // dusk sky, opaque: violet at the top, gold at the horizon
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#24194a');
    sky.addColorStop(0.35, '#4b2c74');
    sky.addColorStop(0.6, '#9a4f8c');
    sky.addColorStop(0.8, '#e0805e');
    sky.addColorStop(1, '#ffc96b');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    const sun = ctx.createRadialGradient(w * 0.5, h * 0.95, 8, w * 0.5, h * 0.95, w * 0.55);
    sun.addColorStop(0, 'rgba(255,240,190,0.85)');
    sun.addColorStop(1, 'rgba(255,240,190,0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, w, h);

    stars(ctx, cx0, tt, w, h);
    cloudLayer(ctx, cx0, cy0, { f: 0.2, P: 560, y0: 50, y1: 190, sc: 1.2, body: '#7d5b9e', lit: '#eebb8c', a: 0.5 }, w, 11);
    giantClock(ctx, cx0, cy0, w);
    cloudLayer(ctx, cx0, cy0, { f: 0.3, P: 480, y0: 190, y1: 300, sc: 1.0, body: '#b07aa2', lit: '#f7cb92', a: 0.45 }, w, 31);
    spireRow(ctx, cx0, 0.3, h * 0.74, '#3b2862', 21, w, h, 190);
    spireRow(ctx, cx0, 0.45, h * 0.82, '#241839', 51, w, h, 230);
    cloudLayer(ctx, cx0, cy0, { f: 0.5, P: 420, y0: 320, y1: 420, sc: 0.8, body: '#e0968c', lit: '#ffe0a6', a: 0.42 }, w, 71);

    // summit edge with a thin gold rim light
    const gy = h * 0.86;
    const ground = ctx.createLinearGradient(0, gy, 0, h);
    ground.addColorStop(0, '#3e2858');
    ground.addColorStop(1, '#1b1130');
    ctx.fillStyle = ground;
    ctx.fillRect(0, gy, w, h - gy);
    ctx.fillStyle = 'rgba(255,206,120,0.45)';
    ctx.fillRect(0, gy, w, 2);

    ctx.restore();
  }

  /* ---------- tiles ---------- */

  // Pale marble block with grey and gold veins; the veins change per cell.
  function marble(ctx, x, y, n) {
    const g = ctx.createLinearGradient(x, y, x + S, y + S);
    g.addColorStop(0, '#f6f1e6');
    g.addColorStop(1, '#d9cfbd');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, S, S);

    const a = rnd(x, y);
    const b = rnd(y, x + 7);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(128,112,140,0.42)';
    ctx.beginPath();
    ctx.moveTo(x, y + a * S);
    ctx.bezierCurveTo(x + 9, y + b * S, x + 20, y + (1 - a) * S, x + S, y + b * S * 0.6 + 4);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(196,150,70,0.38)';
    ctx.beginPath();
    ctx.moveTo(x + b * S, y);
    ctx.quadraticCurveTo(x + (1 - b) * 12, y + 14, x + a * 12 + 12, y + S);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(120,104,118,0.22)';
    ctx.strokeRect(x + 0.5, y + 0.5, S - 1, S - 1);

    if (!n.u) {
      ctx.fillStyle = '#fffdf7';
      ctx.fillRect(x, y, S, 3);
      ctx.fillStyle = 'rgba(230,186,96,0.7)';
      ctx.fillRect(x, y + 4, S, 1);
    }
    if (!n.d) { ctx.fillStyle = 'rgba(86,66,96,0.28)'; ctx.fillRect(x, y + S - 3, S, 3); }
    if (!n.r) { ctx.fillStyle = 'rgba(86,66,96,0.22)'; ctx.fillRect(x + S - 2, y, 2, S); }
    if (!n.l) { ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(x, y, 2, S); }
  }

  // Thin marble plate with gold trim on top and below, rivets and short supports.
  function plate(ctx, x, y) {
    ctx.fillStyle = 'rgba(58,40,58,0.55)';
    ctx.fillRect(x + 5, y + 18, 3, 8);
    ctx.fillRect(x + S - 8, y + 18, 3, 8);

    ctx.fillStyle = '#e4dccb';
    ctx.fillRect(x, y + 8, S, 9);

    const g = ctx.createLinearGradient(0, y + 4, 0, y + 8);
    g.addColorStop(0, '#fff2bd');
    g.addColorStop(1, '#d4a24a');
    ctx.fillStyle = g;
    ctx.fillRect(x, y + 4, S, 4);
    ctx.fillStyle = '#b8862e';
    ctx.fillRect(x, y + 16, S, 2);

    ctx.strokeStyle = 'rgba(28,20,32,0.75)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 4.5, S - 1, 13);

    ctx.fillStyle = '#fff4c8';
    ctx.beginPath();
    ctx.arc(x + 5.5, y + 10.5, 1.2, 0, TAU);
    ctx.moveTo(x + S - 4.3, y + 10.5);
    ctx.arc(x + S - 5.5, y + 10.5, 1.2, 0, TAU);
    ctx.fill();
  }

  // Brass spikes standing on a solid tile or a plate.
  function spikes(ctx, x, y) {
    for (let i = 0; i < 4; i++) {
      const sx = x + 2 + i * 8;
      ctx.beginPath();
      ctx.moveTo(sx, y + S);
      ctx.lineTo(sx + 4, y + 7);
      ctx.lineTo(sx + 8, y + S);
      ctx.closePath();
      ctx.fillStyle = '#c99a3c';
      ctx.fill();
      ctx.strokeStyle = '#1c1420';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#fbe6a0';
      ctx.beginPath();
      ctx.moveTo(sx + 1, y + S - 1);
      ctx.lineTo(sx + 4, y + 9);
      ctx.lineTo(sx + 4.5, y + S - 1);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Lit lantern on a post; the glass holds a small dial showing 23:47.
  function lantern(ctx, x, y, t) {
    const flick = 0.85 + 0.15 * Math.sin(t * 9 + x);
    const g = ctx.createRadialGradient(x + 16, y + 13, 1, x + 16, y + 13, 15);
    g.addColorStop(0, 'rgba(255,220,140,' + (0.55 * flick).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(255,220,140,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, S, S);

    ctx.fillStyle = '#5a4630';
    ctx.fillRect(x + 14, y + 20, 4, 12);

    ctx.fillStyle = '#ffe9b0';
    ctx.beginPath();
    ctx.ellipse(x + 16, y + 13, 7, 8, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#1c1420';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#fbf3df';
    ctx.beginPath();
    ctx.arc(x + 16, y + 13, 4.6, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#14100f';
    ctx.lineCap = 'round';
    hand(ctx, x + 16, y + 13, HOUR_A, 2.4, 1.1);
    hand(ctx, x + 16, y + 13, MIN_A, 3.6, 0.8);

    ctx.fillStyle = '#d9a84a';
    ctx.fillRect(x + 12, y + 3, 8, 3);
  }

  // Exit: an iron arch with a gold frame and a cream dial showing 23:47.
  function exitDoor(ctx, x, y, t) {
    ctx.beginPath();
    ctx.moveTo(x + 3, y + S);
    ctx.lineTo(x + 3, y + 13);
    ctx.arc(x + 16, y + 13, 13, Math.PI, 0);
    ctx.lineTo(x + 29, y + S);
    ctx.closePath();
    ctx.fillStyle = '#3c3048';
    ctx.fill();
    ctx.strokeStyle = '#e0b865';
    ctx.lineWidth = 2;
    ctx.stroke();

    const cx = x + 16;
    const cy = y + 14;
    ctx.fillStyle = '#fbf3df';
    ctx.beginPath();
    ctx.arc(cx, cy, 8.5, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#c9963c';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.strokeStyle = '#14100f';
    ctx.lineCap = 'round';
    hand(ctx, cx, cy, HOUR_A, 5, 1.6);
    hand(ctx, cx, cy, MIN_A, 7, 1.1);

    ctx.fillStyle = 'rgba(255,210,120,' + (0.25 + 0.12 * Math.sin(t * 3)).toFixed(3) + ')';
    ctx.fillRect(x + 3, y + S - 3, 26, 3);
  }

  // Gold gear turning in place, with two glints that drift over its rim.
  function gear(ctx, x, y, t) {
    const cx = x + 16;
    const cy = y + 16;
    const ri = 8.5;
    const ro = 11.5;
    const N = 8;
    const step = TAU / N;
    const rot = t * 2.2 + x * 0.1;
    const pt = (r, a) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r];

    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const a = rot + i * step;
      const corners = [
        pt(ri, a - step * 0.3), pt(ro, a - step * 0.16),
        pt(ro, a + step * 0.16), pt(ri, a + step * 0.3),
      ];
      for (let j = 0; j < corners.length; j++) {
        if (i === 0 && j === 0) ctx.moveTo(corners[j][0], corners[j][1]);
        else ctx.lineTo(corners[j][0], corners[j][1]);
      }
    }
    ctx.closePath();
    const body = ctx.createRadialGradient(cx - 3, cy - 3, 1, cx, cy, ro);
    body.addColorStop(0, '#fff2b8');
    body.addColorStop(0.55, '#e0ad45');
    body.addColorStop(1, '#8c5e1e');
    ctx.fillStyle = body;
    ctx.fill();
    ctx.strokeStyle = '#2a1a0c';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = '#2a1f22';
    ctx.beginPath();
    ctx.arc(cx, cy, 3.2, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#fbe39a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 4.5, 0, TAU);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    for (let k = 0; k < 2; k++) {
      const ga = t * 0.9 + k * Math.PI + x * 0.05;
      const px = cx + Math.cos(ga) * 6.2;
      const py = cy + Math.sin(ga) * 6.2;
      const tw = 0.5 + 0.5 * Math.sin(t * 6 + k * 2.4 + x);
      ctx.globalAlpha = 0.35 + 0.55 * tw;
      ctx.beginPath();
      ctx.moveTo(px, py - 3.2);
      ctx.lineTo(px + 0.9, py - 0.9);
      ctx.lineTo(px + 3.2, py);
      ctx.lineTo(px + 0.9, py + 0.9);
      ctx.lineTo(px, py + 3.2);
      ctx.lineTo(px - 0.9, py + 0.9);
      ctx.lineTo(px - 3.2, py);
      ctx.lineTo(px - 0.9, py - 0.9);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Oil flask: amber glow around a brass-capped bottle.
  function oil(ctx, x, y, t) {
    const pulse = 0.7 + 0.3 * Math.sin(t * 4 + x);
    const g = ctx.createRadialGradient(x + 16, y + 20, 2, x + 16, y + 20, 15);
    g.addColorStop(0, 'rgba(255,190,80,' + (0.35 * pulse).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(255,190,80,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, S, S);

    ctx.fillStyle = '#b8862e';
    ctx.fillRect(x + 12, y + 6, 8, 4);
    ctx.fillStyle = '#f5a93a';
    ctx.beginPath();
    ctx.ellipse(x + 16, y + 20, 7.5, 8.5, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#1c1420';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillRect(x + 12, y + 16, 2, 5);
  }

  // Arena grille: violet iron bars with gold tips and a rose edge glow.
  function grille(ctx, x, y, t) {
    ctx.fillStyle = 'rgba(46,36,62,0.94)';
    ctx.fillRect(x, y, S, S);
    ctx.fillStyle = '#7e6f98';
    for (let i = 2; i < S; i += 8) ctx.fillRect(x + i, y, 3, S);
    ctx.fillStyle = '#e0b865';
    for (let i = 3; i < S; i += 8) {
      ctx.fillRect(x + i, y + 2, 1.5, 1.5);
      ctx.fillRect(x + i, y + S - 4, 1.5, 1.5);
    }
    const glow = 0.22 + 0.16 * Math.sin(t * 5 + x * 0.1);
    ctx.fillStyle = 'rgba(255,170,140,' + glow.toFixed(3) + ')';
    ctx.fillRect(x, y, 2, S);
    ctx.fillRect(x + S - 2, y, 2, S);
  }

  function tile(ctx, ch, x, y, t, nb) {
    const n = nb || {};
    const tx = num(x, 0);
    const ty = num(y, 0);
    const tt = num(t, 0);
    ctx.save();
    ctx.beginPath();
    ctx.rect(tx, ty, S, S);
    ctx.clip();
    switch (ch) {
      case '#': marble(ctx, tx, ty, n); break;
      case '=': plate(ctx, tx, ty); break;
      case '^': spikes(ctx, tx, ty); break;
      case 'C': lantern(ctx, tx, ty, tt); break;
      case 'X': exitDoor(ctx, tx, ty, tt); break;
      case 'o': gear(ctx, tx, ty, tt); break;
      case 'h': oil(ctx, tx, ty, tt); break;
      case 'B': grille(ctx, tx, ty, tt); break;
      default: break;
    }
    ctx.restore();
  }

  /* ---------- foreground ---------- */

  function foreground(ctx, camX, camY, t, W, H) {
    const cx0 = num(camX, 0);
    const tt = num(t, 0);
    const w = num(W, 960);
    const h = num(H, 540);
    ctx.save();

    // light shafts slanting down from the upper right
    columns(cx0, 0.3, 420, w, (k, sx) => {
      const x = sx + rnd(k, 11) * 420;
      const top = 40 + rnd(k, 12) * 60;
      const lean = 180 + rnd(k, 13) * 90;
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(255,236,190,0.13)');
      g.addColorStop(0.7, 'rgba(255,222,150,0.05)');
      g.addColorStop(1, 'rgba(255,222,150,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + top, 0);
      ctx.lineTo(x + top - lean, h);
      ctx.lineTo(x - lean, h);
      ctx.closePath();
      ctx.fill();
    });

    // slow dust motes in the gold light
    ctx.fillStyle = '#ffeeb8';
    for (let i = 0; i < 34; i++) {
      const x = (((rnd(i, 3) * w - cx0 * 0.45 + Math.sin(tt * 0.6 + i) * 10) % w) + w) % w;
      const y = (((rnd(i, 5) * h - tt * (6 + rnd(i, 4) * 10)) % h) + h) % h;
      ctx.globalAlpha = Math.min(0.4, 0.15 + 0.25 * rnd(i, 6) * (0.6 + 0.4 * Math.sin(tt * 2 + i)));
      ctx.beginPath();
      ctx.arc(x, y, 0.9 + rnd(i, 7) * 1.3, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  window.ENV_THEMES.clockface = {
    background(ctx, camX, camY, t, W, H) {
      try { background(ctx, camX, camY, t, W, H); } catch (e) { /* never throw into the game loop */ }
    },
    tile(ctx, ch, x, y, t, nb) {
      try { tile(ctx, ch, x, y, t, nb); } catch (e) { /* never throw into the game loop */ }
    },
    foreground(ctx, camX, camY, t, W, H) {
      try { foreground(ctx, camX, camY, t, W, H); } catch (e) { /* never throw into the game loop */ }
    },
  };
})();
