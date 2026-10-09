/* Environment theme "foundry": the iron foundry under the Saint-Aube Tower.
   Furnaces that never went out, frozen steam, sparks hanging in the air.
   Contract: DESIGN.md section 6 and AGENT_BRIEF.md (environment theme contract). */
(function () {
  window.ENV_THEMES = window.ENV_THEMES || {};

  const S = 32;                       // tile size
  const TAU = Math.PI * 2;
  const HOUR_A = (11.78 / 12) * TAU;  // every clock in the sky reads 23:47
  const MIN_A = (47 / 60) * TAU;

  const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : (d || 0));
  const mod = (a, m) => ((a % m) + m) % m;
  const f3 = (v) => Math.max(0, Math.min(1, v)).toFixed(3);
  const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

  // Parallax row: calls fn(k, screenX) for each world element k.
  // k is a stable world index, so the content does not shuffle as the camera moves.
  function row(camX, factor, period, W, fn) {
    const a = camX * factor;
    const k0 = Math.floor(a / period) - 1;
    const n = Math.ceil(W / period) + 3;
    for (let j = 0; j < n; j++) fn(k0 + j, (k0 + j) * period - a);
  }

  function rrPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Clock hands frozen at 23:47.
  function hands(ctx, cx, cy, r, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1, r * 0.14);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.sin(HOUR_A) * r * 0.5, cy - Math.cos(HOUR_A) * r * 0.5);
    ctx.stroke();
    ctx.lineWidth = Math.max(1, r * 0.08);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.sin(MIN_A) * r * 0.8, cy - Math.cos(MIN_A) * r * 0.8);
    ctx.stroke();
    ctx.restore();
  }

  function gear(ctx, cx, cy, r, teeth, rot, color) {
    ctx.beginPath();
    const n = teeth * 2;
    for (let i = 0; i < n; i++) {
      const a = rot + (i * Math.PI) / teeth;
      const rr = i % 2 === 0 ? r : r * 0.7;
      const px = cx + Math.cos(a) * rr;
      const py = cy + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#1c1420';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  /* ---------- background ---------- */

  function drawSky(ctx, W, H, tt) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#1b0805');
    g.addColorStop(0.45, '#3a1610');
    g.addColorStop(0.8, '#5b2513');
    g.addColorStop(1, '#2a0f09');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // dull furnace glow low on the horizon
    const hz = ctx.createRadialGradient(W * 0.5, H * 0.82, 10, W * 0.5, H * 0.82, W * 0.65);
    hz.addColorStop(0, 'rgba(255,120,50,' + f3(0.12 + 0.04 * Math.sin(tt * 0.8)) + ')');
    hz.addColorStop(1, 'rgba(255,120,50,0)');
    ctx.fillStyle = hz;
    ctx.fillRect(0, 0, W, H);
  }

  // Frozen steam bank: it never moves, it only parallaxes with the camera.
  function steamBank(ctx, x, P, y, k) {
    const cxm = x + P * 0.5 + (hash(k) - 0.5) * 90;
    const s = 0.8 + hash(k + 2) * 0.6;
    const puffs = [[0, 0, 30], [28, -12, 38], [60, -2, 28], [-26, 6, 24], [34, 12, 24]];
    ctx.fillStyle = 'rgba(200,205,215,0.08)';
    for (let i = 0; i < puffs.length; i++) {
      const p = puffs[i];
      ctx.beginPath();
      ctx.arc(cxm + p[0] * s, y + p[1] * s, p[2] * s, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(225,230,240,0.05)';
    for (let i = 0; i < puffs.length; i++) {
      const p = puffs[i];
      ctx.beginPath();
      ctx.arc(cxm + p[0] * s, y + p[1] * s - 4, p[2] * s * 0.6, 0, TAU);
      ctx.fill();
    }
  }

  // Chimney stack with a frozen steam plume; some carry a clock reading 23:47.
  function chimney(ctx, x, P, base, k) {
    const hgt = 120 + hash(k) * 150;
    const wd = 26 + hash(k + 0.5) * 14;
    const cxm = x + P * (0.25 + hash(k + 1.5) * 0.5);
    const bx = cxm - wd / 2;
    const top = base - hgt;
    ctx.fillStyle = '#2a100b';
    ctx.fillRect(bx, top, wd, hgt);
    ctx.fillRect(bx - 5, top - 4, wd + 10, 8);
    for (let p = 0; p < 3; p++) {
      ctx.fillStyle = 'rgba(232,214,206,' + f3(0.15 - p * 0.04) + ')';
      ctx.beginPath();
      ctx.arc(cxm + (hash(k + p * 3) - 0.5) * 12 + p * 5, top - 16 - p * 20, 11 + p * 6, 0, TAU);
      ctx.fill();
    }
    if (hash(k + 9) < 0.3) {
      const r = 9;
      const cy = top + 24;
      ctx.fillStyle = 'rgba(255,150,70,0.16)';
      ctx.beginPath(); ctx.arc(cxm, cy, r * 1.8, 0, TAU); ctx.fill();
      ctx.fillStyle = '#c9a474';
      ctx.beginPath(); ctx.arc(cxm, cy, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#1a0a06';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      hands(ctx, cxm, cy, r, '#2a100b');
    }
  }

  // Sparks frozen in mid-air, twinkling in place.
  function sparks(ctx, x, P, H, k, tt) {
    for (let j = 0; j < 2; j++) {
      const sx = x + hash(k * 3 + j) * P;
      const sy = H * (0.12 + hash(k * 7 + j + 3) * 0.55);
      const a = 0.35 + 0.3 * (0.5 + 0.5 * Math.sin(tt * 2.1 + k + j * 2));
      ctx.fillStyle = 'rgba(255,140,60,0.14)';
      ctx.beginPath(); ctx.arc(sx, sy, 4.5, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,200,120,' + f3(a) + ')';
      ctx.beginPath(); ctx.arc(sx, sy, 1.3, 0, TAU); ctx.fill();
    }
  }

  // Cooling pipes with frost on top, and a few vertical drops.
  function pipes(ctx, x, P, H, k) {
    const bars = [[H * 0.47, 10], [H * 0.53, 7]];
    for (let i = 0; i < bars.length; i++) {
      const y = bars[i][0];
      const th = bars[i][1];
      ctx.fillStyle = '#3b1a12';
      ctx.fillRect(x, y, P + 1, th);
      ctx.fillStyle = 'rgba(220,200,195,0.18)';
      ctx.fillRect(x, y, P + 1, 2);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(x, y + th - 2, P + 1, 2);
      ctx.fillStyle = '#2a120c';
      ctx.fillRect(x - 2, y - 3, 5, th + 6);
    }
    if (hash(k + 0.2) < 0.45) {
      const vx = x + 30 + hash(k + 4) * (P - 60);
      const y0 = H * 0.47;
      const len = H * 0.82 - y0;
      ctx.fillStyle = '#3b1a12';
      ctx.fillRect(vx, y0, 8, len);
      ctx.fillStyle = 'rgba(220,200,195,0.16)';
      ctx.fillRect(vx, y0, 2, len);
    }
  }

  // Furnace house with an arched mouth that spills orange light.
  function furnace(ctx, x, P, base, k, tt) {
    if (hash(k) < 0.2) return; // some bays are cold
    const bw = 110, bh = 150;
    const bx = x + (P - bw) / 2 + (hash(k + 4) - 0.5) * 30;
    const top = base - bh;
    ctx.fillStyle = '#2a0f0a';
    ctx.fillRect(bx, top, bw, bh);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 1; i < 5; i++) { ctx.moveTo(bx, top + i * 30); ctx.lineTo(bx + bw, top + i * 30); }
    ctx.stroke();
    const ow = 56, oh = 62;
    const ox = bx + (bw - ow) / 2;
    const mouth = base - 16;
    const oy = mouth - oh;
    const flick = 0.85 + 0.15 * Math.sin(tt * 3.1 + k * 1.7);
    const sp = ctx.createRadialGradient(ox + ow / 2, mouth, 4, ox + ow / 2, mouth, 110);
    sp.addColorStop(0, 'rgba(255,130,40,' + f3(0.12 * flick) + ')');
    sp.addColorStop(1, 'rgba(255,130,40,0)');
    ctx.fillStyle = sp;
    ctx.fillRect(ox - 110, mouth - 110, ow + 220, 220);
    ctx.beginPath();
    ctx.moveTo(ox, mouth);
    ctx.lineTo(ox, oy + ow / 2);
    ctx.arc(ox + ow / 2, oy + ow / 2, ow / 2, Math.PI, 0);
    ctx.lineTo(ox + ow, mouth);
    ctx.closePath();
    const fire = ctx.createLinearGradient(0, oy, 0, mouth);
    fire.addColorStop(0, '#d9874a');
    fire.addColorStop(0.5, '#b84a1c');
    fire.addColorStop(1, '#6e2410');
    ctx.fillStyle = fire;
    ctx.fill();
    ctx.strokeStyle = '#120706';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Glow bands along the floor, then the dark iron plates in front.
  function floorGlow(ctx, W, H, tt) {
    const gy = H * 0.74;
    const g = ctx.createLinearGradient(0, gy, 0, H);
    g.addColorStop(0, 'rgba(255,110,40,0)');
    g.addColorStop(0.5, 'rgba(255,110,40,0.14)');
    g.addColorStop(1, 'rgba(255,90,30,0.32)');
    ctx.fillStyle = g;
    ctx.fillRect(0, gy, W, H - gy);
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = 'rgba(255,190,100,' + f3(0.1 + 0.05 * Math.sin(tt * 1.6 + i * 2)) + ')';
      ctx.fillRect(0, H * (0.9 + i * 0.065), W, 2 + i);
    }
    ctx.fillStyle = 'rgba(14,5,4,0.85)';
    ctx.fillRect(0, H * 0.93, W, H * 0.07);
    ctx.fillStyle = '#0a0302';
    for (let x = 0; x < W; x += 96) ctx.fillRect(x, H * 0.93, 2, H * 0.07);
  }

  function background(ctx, camX, camY, t, W, H) {
    const cx = num(camX), tt = num(t), w = num(W, 960), h = num(H, 540);
    const base = h * 0.82;
    ctx.save();
    drawSky(ctx, w, h, tt);
    // cool dark band behind the play height, so the gameplay reads against it
    const band = ctx.createLinearGradient(0, h * 0.5, 0, h * 0.8);
    band.addColorStop(0, 'rgba(12,6,10,0)');
    band.addColorStop(1, 'rgba(12,6,10,0.08)');
    ctx.fillStyle = band;
    ctx.fillRect(0, h * 0.5, w, h * 0.5);
    row(cx, 0.3, 360, w, (k, x) => steamBank(ctx, x, 360, h * (0.16 + hash(k + 11) * 0.2), k));
    row(cx, 0.2, 230, w, (k, x) => chimney(ctx, x, 230, base, k));
    row(cx, 0.35, 160, w, (k, x) => sparks(ctx, x, 160, h, k, tt));
    row(cx, 0.45, 150, w, (k, x) => pipes(ctx, x, 150, h, k));
    row(cx, 0.45, 240, w, (k, x) => furnace(ctx, x, 240, base, k, tt));
    floorGlow(ctx, w, h, tt);
    ctx.restore();
  }

  /* ---------- tiles ---------- */

  // Glowing orange seam; the pulse phase is shared per row so neighbours line up.
  function seam(ctx, x1, y1, x2, y2, tt, phase) {
    const pulse = 0.4 + 0.2 * Math.sin(tt * 2 + phase);
    ctx.strokeStyle = 'rgba(255,100,30,0.14)';
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,170,80,' + f3(pulse) + ')';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }

  function plate(ctx, x, y, n, seed, tt) {
    const s = mod(seed, 8);
    const g = ctx.createLinearGradient(x, y, x, y + S);
    g.addColorStop(0, '#4a4650');
    g.addColorStop(1, '#2a282f');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, S, S);
    if (s % 3 === 0) {
      ctx.fillStyle = 'rgba(150,70,30,0.22)';
      ctx.beginPath(); ctx.ellipse(x + 20, y + 12, 7, 4, 0.3, 0, TAU); ctx.fill();
    }
    if (s < 2) seam(ctx, x, y + 16, x + S, y + 16, tt, y / S);
    else if (s === 5) seam(ctx, x + 16, y, x + 16, y + S, tt, (x + y) / S);
    ctx.strokeStyle = '#120c0d';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, S - 1, S - 1);
    ctx.fillStyle = 'rgba(255,220,200,0.07)';
    ctx.fillRect(x + 1, y + 1, S - 2, 2);
    const rv = [[6, 8], [26, 8], [6, 24], [26, 24]];
    for (let i = 0; i < rv.length; i++) {
      ctx.beginPath();
      ctx.arc(x + rv[i][0], y + rv[i][1], 1.8, 0, TAU);
      ctx.fillStyle = '#716056';
      ctx.fill();
      ctx.strokeStyle = '#120c0c';
      ctx.stroke();
    }
    // exposed sides: rusted lip on top, shade on the others
    if (!n.u) {
      ctx.fillStyle = '#9a909a'; ctx.fillRect(x, y, S, 4);
      ctx.fillStyle = 'rgba(235,225,235,0.35)'; ctx.fillRect(x, y, S, 1);
    }
    if (!n.d) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x, y + S - 3, S, 3); }
    if (!n.l) { ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(x, y, 2, S); }
    if (!n.r) { ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(x + S - 2, y, 2, S); }
  }

  // Rusty grate platform, lit from the furnace below.
  function grate(ctx, x, y, tt) {
    ctx.fillStyle = '#2a140c';
    ctx.fillRect(x, y + 14, S, 14);
    const gl = ctx.createLinearGradient(0, y + 16, 0, y + S);
    gl.addColorStop(0, 'rgba(255,120,40,0)');
    gl.addColorStop(1, 'rgba(255,120,40,' + f3(0.15 + 0.05 * Math.sin(tt * 2.4)) + ')');
    ctx.fillStyle = gl;
    ctx.fillRect(x, y + 16, S, S - 16);
    ctx.fillStyle = '#7a4128';
    for (let i = 0; i < S; i += 4) ctx.fillRect(x + i, y + 9, 2, 10);
    ctx.fillStyle = '#c77a45';
    ctx.fillRect(x, y + 6, S, 4);
    ctx.fillStyle = 'rgba(255,200,140,0.25)';
    ctx.fillRect(x, y + 6, S, 1);
    ctx.strokeStyle = '#1a0b05';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 6.5, S - 1, 4);
    ctx.fillStyle = 'rgba(90,40,20,0.7)';
    ctx.fillRect(x + 9, y + 20, 2, 2);
    ctx.fillRect(x + 21, y + 26, 2, 2);
  }

  // Rusty spikes with hot tips.
  function spikes(ctx, x, y, tt) {
    for (let i = 0; i < 4; i++) {
      const sx = x + 2 + i * 8;
      ctx.beginPath();
      ctx.moveTo(sx, y + S); ctx.lineTo(sx + 4, y + 6); ctx.lineTo(sx + 8, y + S);
      ctx.closePath();
      ctx.fillStyle = '#4d2d22';
      ctx.fill();
      ctx.strokeStyle = '#120706';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sx, y + S); ctx.lineTo(sx + 4, y + 6);
      ctx.strokeStyle = 'rgba(220,150,110,0.35)';
      ctx.stroke();
      ctx.beginPath(); ctx.arc(sx + 4, y + 6, 6, 0, TAU);
      ctx.fillStyle = 'rgba(255,140,50,0.22)';
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(sx + 2.4, y + 15); ctx.lineTo(sx + 4, y + 6); ctx.lineTo(sx + 5.6, y + 15);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,150,60,' + f3(0.75 + 0.25 * Math.sin(tt * 5 + i)) + ')';
      ctx.fill();
    }
  }

  // Lit lantern-clock, dial at 23:47.
  function lantern(ctx, x, y, tt) {
    const cx = x + 16, cy = y + 13;
    const flick = 0.85 + 0.15 * Math.sin(tt * 9 + x);
    const hg = ctx.createRadialGradient(cx, cy, 2, cx, cy, 15);
    hg.addColorStop(0, 'rgba(255,160,70,' + f3(0.6 * flick) + ')');
    hg.addColorStop(1, 'rgba(255,160,70,0)');
    ctx.fillStyle = hg;
    ctx.fillRect(x, y, S, S);
    ctx.fillStyle = '#1f1718';
    ctx.fillRect(cx - 1.5, cy + 8, 3, 24);
    rrPath(ctx, cx - 7, cy - 8, 14, 18, 4);
    ctx.fillStyle = '#ffae55';
    ctx.fill();
    ctx.strokeStyle = '#120706';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#f4e4c0';
    ctx.beginPath(); ctx.arc(cx, cy + 1, 4.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#1c1420';
    ctx.lineWidth = 1;
    ctx.stroke();
    hands(ctx, cx, cy + 1, 4.5, '#2a100b');
  }

  // Exit: riveted iron door with a dial at 23:47 and a glowing slit at the foot.
  function exitDoor(ctx, x, y, tt) {
    ctx.fillStyle = '#1e1a1d';
    ctx.fillRect(x, y, S, S);
    rrPath(ctx, x + 3, y + 1, S - 6, S - 1, 3);
    ctx.fillStyle = '#4a4448';
    ctx.fill();
    ctx.strokeStyle = '#120c0c';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    rrPath(ctx, x + 6, y + 4, S - 12, S - 8, 2);
    ctx.fillStyle = '#2c2729';
    ctx.fill();
    const cx = x + 16, cy = y + 12;
    ctx.fillStyle = '#e6d8b8';
    ctx.beginPath(); ctx.arc(cx, cy, 7, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#1c1420';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    hands(ctx, cx, cy, 7, '#2a100b');
    ctx.fillStyle = 'rgba(255,130,50,' + f3(0.45 + 0.3 * Math.sin(tt * 3)) + ')';
    ctx.fillRect(x + 7, y + 24, S - 14, 3);
  }

  // Golden cog, turning.
  function cog(ctx, x, y, tt) {
    const cx = x + 16, cy = y + 16;
    gear(ctx, cx, cy, 10, 8, tt * 2.2 + x * 0.1, '#d59a3c');
    ctx.fillStyle = '#7a4a1c';
    ctx.beginPath(); ctx.arc(cx, cy, 3, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,200,0.5)';
    ctx.beginPath(); ctx.arc(cx + 5, cy - 6, 1.5, 0, TAU); ctx.fill();
  }

  // Oil flask with a glowing belly.
  function oil(ctx, x, y, tt) {
    ctx.fillStyle = '#7d4a1c';
    ctx.fillRect(x + 12, y + 6, 8, 4);
    const pulse = 0.7 + 0.3 * Math.sin(tt * 4 + x);
    ctx.beginPath();
    ctx.ellipse(x + 16, y + 20, 8, 9, 0, 0, TAU);
    ctx.fillStyle = 'rgba(255,150,60,' + f3(pulse) + ')';
    ctx.fill();
    ctx.strokeStyle = '#1c1420';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillRect(x + 12, y + 16, 2, 5);
  }

  // Arena bars: iron grille with hot edges.
  function bars(ctx, x, y, tt) {
    ctx.fillStyle = '#1e181c';
    ctx.fillRect(x, y, S, S);
    ctx.fillStyle = '#5e5458';
    for (let i = 2; i < S; i += 8) ctx.fillRect(x + i, y, 3, S);
    ctx.fillStyle = '#3a3034';
    ctx.fillRect(x, y + 4, S, 2);
    ctx.fillRect(x, y + S - 6, S, 2);
    ctx.fillStyle = 'rgba(255,110,50,' + f3(0.3 + 0.2 * Math.sin(tt * 5)) + ')';
    ctx.fillRect(x, y, 2, S);
    ctx.fillRect(x + S - 2, y, 2, S);
  }

  function tile(ctx, ch, x, y, t, nb) {
    const px = num(x), py = num(y), tt = num(t), n = nb || {};
    ctx.save();
    ctx.beginPath();
    ctx.rect(px, py, S, S);
    ctx.clip();
    switch (ch) {
      case '#': plate(ctx, px, py, n, Math.floor(px / S) * 31 + Math.floor(py / S) * 17, tt); break;
      case '=': grate(ctx, px, py, tt); break;
      case '^': spikes(ctx, px, py, tt); break;
      case 'C': lantern(ctx, px, py, tt); break;
      case 'X': exitDoor(ctx, px, py, tt); break;
      case 'o': cog(ctx, px, py, tt); break;
      case 'h': oil(ctx, px, py, tt); break;
      case 'B': bars(ctx, px, py, tt); break;
      default: break;
    }
    ctx.restore();
  }

  /* ---------- foreground ---------- */

  // Embers rising slowly, alpha kept within 0.14-0.39 (contract: 0.1-0.4).
  function foreground(ctx, camX, camY, t, W, H) {
    const cx = num(camX), tt = num(t), w = num(W, 960), h = num(H, 540);
    ctx.save();
    for (let i = 0; i < 30; i++) {
      const r0 = hash(i * 3.1 + 1), r1 = hash(i * 5.7 + 2), r2 = hash(i * 9.3 + 4);
      const speed = 12 + r0 * 24;
      const span = h + 40;
      const y = h + 20 - mod(tt * speed + r2 * span, span);
      const sway = Math.sin(tt * 0.9 + i * 1.7) * (6 + r1 * 8);
      const x = mod(r1 * w - cx * 0.6 + sway, w + 60) - 30;
      const a = 0.14 + 0.25 * (0.5 + 0.5 * Math.sin(tt * 3 + i));
      const r = 1 + r0 * 1.6;
      ctx.fillStyle = 'rgba(255,150,60,' + f3(a) + ')';
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,230,170,0.35)';
      ctx.beginPath(); ctx.arc(x, y, r * 0.4, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  window.ENV_THEMES.foundry = {
    background(ctx, camX, camY, t, W, H) { background(ctx, camX, camY, t, W, H); },
    tile(ctx, ch, x, y, t, nb) { tile(ctx, ch, x, y, t, nb); },
    foreground(ctx, camX, camY, t, W, H) { foreground(ctx, camX, camY, t, W, H); }
  };
})();
