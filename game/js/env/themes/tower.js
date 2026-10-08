/* ENV theme "tower": inside the Saint-Aube Clock Tower (DESIGN.md section 6, AGENT_BRIEF.md).
   Cold blue-grey stone, arches in the far layer, huge stopped gear rings in the mid layer,
   ropes and chains, a dim blue light from above. Every clock reads 23:47. */
(function () {
  window.ENV_THEMES = window.ENV_THEMES || {};

  const S = 32;
  const OUT = '#1c1420';
  const WOOD = '#6b5234', WOOD_HI = '#8c6d48', WOOD_LO = '#3e2e1f';
  const BRASS = '#c49a4e', BRASS_HI = '#f0d48a', BRASS_LO = '#7a5a2a';
  const HOUR_A = (11.78 / 12) * Math.PI * 2;  // 23:47
  const MIN_A = (47 / 60) * Math.PI * 2;

  const num = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);
  const mod = (v, m) => ((v % m) + m) % m;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const hash = (a, b) => { const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return n - Math.floor(n); };
  const rgb = (r, g, b) => 'rgb(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) + ')';

  // ART.gear when the art helpers are loaded, otherwise a plain disc with teeth
  function gear(ctx, x, y, r, teeth, rot, color, opts) {
    if (window.ART && typeof window.ART.gear === 'function') {
      window.ART.gear(ctx, x, y, r, teeth, rot, color, opts || {});
      return;
    }
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    for (let k = 0; k < teeth; k++) {
      const a = rot + (k / teeth) * Math.PI * 2;
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.14, 0, Math.PI * 2); ctx.fill();
    }
  }

  // hands frozen at 23:47 (hour just before XII, minute on the 47)
  function hands(ctx, x, y, len, lw, color) {
    ctx.strokeStyle = color; ctx.lineCap = 'round';
    ctx.lineWidth = lw * 1.3;
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.lineTo(x + Math.sin(HOUR_A) * len * 0.6, y - Math.cos(HOUR_A) * len * 0.6); ctx.stroke();
    ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.lineTo(x + Math.sin(MIN_A) * len, y - Math.cos(MIN_A) * len); ctx.stroke();
  }

  function dial(ctx, x, y, r, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#c8c1ae';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#343c4a'; ctx.lineWidth = r * 0.1; ctx.stroke();
    ctx.fillStyle = '#343c4a';
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      ctx.fillRect(x + Math.sin(a) * r * 0.8 - 1.5, y - Math.cos(a) * r * 0.8 - 1.5, 3, 3);
    }
    hands(ctx, x, y, r * 0.8, r * 0.06, '#2a2f38');
    ctx.restore();
  }

  function arch(ctx, x, top, w, H) {
    const r = w / 2;
    ctx.fillStyle = '#060a10';
    ctx.beginPath();
    ctx.moveTo(x, H); ctx.lineTo(x, top + r);
    ctx.arc(x + r, top + r, r, Math.PI, 0);
    ctx.lineTo(x + w, H); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(150,185,215,0.16)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x + r, top + r, r - 4, Math.PI, 0); ctx.stroke();
  }

  // a stopped gear ring: body, inner ring, fixed spokes, hub, cold highlight on the top rim
  function ringGear(ctx, x, y, r, teeth, rot) {
    gear(ctx, x, y, r, teeth, rot, '#243041', { stroke: false });
    ctx.strokeStyle = '#121a25'; ctx.lineWidth = Math.max(4, r * 0.06);
    ctx.beginPath(); ctx.arc(x, y, r * 0.72, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#1a2431'; ctx.lineWidth = r * 0.07;
    for (let k = 0; k < 6; k++) {
      const a = rot + (k * Math.PI) / 3;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * r * 0.18, y + Math.sin(a) * r * 0.18);
      ctx.lineTo(x + Math.cos(a) * r * 0.72, y + Math.sin(a) * r * 0.72);
      ctx.stroke();
    }
    ctx.fillStyle = '#121a25';
    ctx.beginPath(); ctx.arc(x, y, r * 0.16, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(160,190,220,0.14)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y, r - 6, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
  }

  function rope(ctx, x, H, t, i) {
    const sway = Math.sin(t * 0.6 + i * 1.3) * 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.quadraticCurveTo(x + 46 + sway, H * 0.5, x + 14 + sway, H * 0.86);
    ctx.strokeStyle = '#2f353f'; ctx.lineWidth = 6; ctx.stroke();
    ctx.strokeStyle = '#5c6572'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.stroke();
    ctx.setLineDash([]);
  }

  // hanging chain: alternating face-on and edge-on links, ending in a brass weight
  function chain(ctx, x, yEnd, t, i) {
    const sway = Math.sin(t * 0.5 + i) * 1.5;
    ctx.strokeStyle = '#56616f'; ctx.lineWidth = 2;
    for (let y = 0, k = 0; y < yEnd; y += 9, k++) {
      ctx.beginPath();
      ctx.ellipse(x + sway, y, k % 2 ? 1.8 : 3.6, 5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = BRASS_LO; ctx.strokeStyle = OUT; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(x + sway, yEnd + 10, 7, 11, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = BRASS;
    ctx.beginPath(); ctx.ellipse(x + sway - 2, yEnd + 6, 2, 4, 0, 0, Math.PI * 2); ctx.fill();
  }

  /* ---------- background (opaque, parallax 0.2x far / 0.45x mid) ---------- */
  function background(ctx, camX, camY, t, W, H) {
    W = num(W) || 960; H = num(H) || 540;
    const cx = num(camX), cy = num(camY), tt = num(t);
    ctx.save();
    // cold stone, lit from above
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#080d15'); g.addColorStop(0.5, '#152030'); g.addColorStop(1, '#0a1018');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // dim blue light falling from above
    const L = ctx.createRadialGradient(W * 0.5, -H * 0.1, 10, W * 0.5, -H * 0.1, W * 0.8);
    L.addColorStop(0, 'rgba(120,170,230,0.30)'); L.addColorStop(1, 'rgba(120,170,230,0)');
    ctx.fillStyle = L; ctx.fillRect(0, 0, W, H);

    // far layer: one faded 23:47 dial on the wall (wrapped), then the arches
    const far = cx * 0.2;
    const dx = mod(W * 0.5 - far, 1200);
    for (let k = -1; k <= 1; k++) dial(ctx, dx + k * 1200, H * 0.16, 56, 0.45);
    const AP = 240, aOff = -mod(far, AP);
    for (let i = -1; i < 6; i++) arch(ctx, aOff + i * AP, H * 0.36, 110, H);
    // pale shafts of blue light slanting down between the arches
    const SP = 380, sOff = -mod(far, SP);
    ctx.fillStyle = 'rgba(150,190,235,0.07)';
    for (let i = -1; i < 4; i++) {
      const x = sOff + i * SP + 120;
      ctx.beginPath();
      ctx.moveTo(x, 0); ctx.lineTo(x + 50, 0); ctx.lineTo(x + 190, H * 0.9); ctx.lineTo(x + 60, H * 0.9);
      ctx.closePath(); ctx.fill();
    }

    // mid layer: huge stopped gear rings, with ropes and chains in front
    const mid = cx * 0.45;
    const GP = 440, gOff = -mod(mid, GP);
    const GEARS = [[170, 28, 0.2], [125, 20, 1.1], [190, 30, 0.6]];
    for (let i = -1; i < 4; i++) {
      const G = GEARS[mod(i, 3)];
      ringGear(ctx, gOff + i * GP + GP * 0.5, H * 0.5 - cy * 0.1, G[0], G[1], G[2]);
    }
    const RP = 300, rOff = -mod(mid, RP);
    for (let i = -1; i < 5; i++) rope(ctx, rOff + i * RP + 150, H, tt, i);
    const CP = 520, cOff = -mod(mid, CP);
    for (let i = -1; i < 3; i++) chain(ctx, cOff + i * CP + 380, H * 0.62, tt, i);

    // top band: keeps ropes and chains from running behind the HUD
    const B = ctx.createLinearGradient(0, 0, 0, H * 0.2);
    B.addColorStop(0, 'rgba(8,13,21,0.7)'); B.addColorStop(1, 'rgba(8,13,21,0)');
    ctx.fillStyle = B; ctx.fillRect(0, 0, W, H * 0.2);

    // floor haze
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, H * 0.82, W, H * 0.18);
    ctx.restore();
  }

  /* ---------- tiles (each draws only inside its 32x32 cell) ---------- */
  // '#': dark stone blocks, two courses of 16 px, mortar lines between them
  function stone(ctx, x, y, n) {
    ctx.fillStyle = '#080c12';
    ctx.fillRect(x, y, S, S);
    for (let r = 0; r < 2; r++) {
      const ry = y + r * 16;
      const row = Math.round(ry / 16);
      const shift = row % 2 ? 8 : 0;
      const k0 = Math.floor((x - shift) / 16), k1 = Math.floor((x + S - 1 - shift) / 16);
      for (let k = k0; k <= k1; k++) {
        const bs = k * 16 + shift, be = bs + 16;
        const a = Math.max(bs, x), b = Math.min(be, x + S);
        const h = hash(k, row);
        ctx.fillStyle = rgb(70 + h * 18, 82 + h * 18, 98 + h * 20);
        const l = bs >= x ? 1 : 0, rr = be <= x + S ? 1 : 0;
        ctx.fillRect(a + l, ry + 1, b - rr - (a + l), 14);
      }
    }
    if (!n.u) { ctx.fillStyle = 'rgba(180,200,220,0.18)'; ctx.fillRect(x, y, S, 2); }
    if (!n.l) { ctx.fillStyle = 'rgba(200,220,240,0.10)'; ctx.fillRect(x, y, 2, S); }
    if (!n.r) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x + S - 2, y, 2, S); }
    if (!n.d) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x, y + S - 2, S, 2); }
  }

  function stud(ctx, x, y) {
    ctx.fillStyle = BRASS;
    ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.fillStyle = BRASS_HI; ctx.fillRect(x - 1, y - 1.2, 1.2, 1.2);
  }

  // '=': weathered wooden beam, plank surface on the tile's top edge (where the player lands), brass studs
  function beam(ctx, x, y, n) {
    ctx.fillStyle = WOOD; ctx.fillRect(x, y, S, 14);
    ctx.fillStyle = WOOD_HI; ctx.fillRect(x, y, S, 2);
    ctx.fillStyle = WOOD_LO; ctx.fillRect(x, y + 12, S, 2);
    ctx.strokeStyle = 'rgba(38,26,16,0.5)'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + 4.5); ctx.quadraticCurveTo(x + 16, y + 3, x + S, y + 5.5);
    ctx.moveTo(x, y + 7.5); ctx.lineTo(x + 10, y + 7.5);
    ctx.moveTo(x + 14, y + 7.5); ctx.lineTo(x + S, y + 7.5);
    ctx.stroke();
    const p = hash(Math.round(x / S), Math.round(y / S));
    ctx.fillStyle = 'rgba(120,145,170,0.2)';  // cold frost on the weathered wood
    ctx.beginPath(); ctx.ellipse(x + p * S, y + 6, 5 + p * 3, 3, 0, 0, Math.PI * 2); ctx.fill();
    stud(ctx, x + 8, y + 6);
    stud(ctx, x + 24, y + 6);
    if (!n.l) { ctx.fillStyle = WOOD_LO; ctx.fillRect(x, y, 2, 14); }
    if (!n.r) { ctx.fillStyle = WOOD_LO; ctx.fillRect(x + S - 2, y, 2, 14); }
  }

  // '^': brass spikes
  function spikes(ctx, x, y) {
    for (let i = 0; i < 4; i++) {
      const sx = x + 2 + i * 8;
      ctx.fillStyle = BRASS; ctx.strokeStyle = OUT; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sx, y + S); ctx.lineTo(sx + 4, y + 8); ctx.lineTo(sx + 8, y + S); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = BRASS_HI;
      ctx.beginPath(); ctx.moveTo(sx + 1, y + S - 1); ctx.lineTo(sx + 4, y + 10); ctx.lineTo(sx + 4, y + S - 1); ctx.closePath();
      ctx.fill();
    }
  }

  // 'C': lantern-clock on a pole, warm glow marks the save point
  function lantern(ctx, x, y, t) {
    const cx = x + 16, cy = y + 13;
    const flick = 0.85 + 0.15 * Math.sin(t * 9 + x);
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 18);
    g.addColorStop(0, 'rgba(255,225,150,' + (0.55 * flick).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(255,225,150,0)');
    ctx.fillStyle = g; ctx.fillRect(x, y, S, S);
    ctx.fillStyle = '#2a2a33'; ctx.fillRect(cx - 1.5, cy + 7, 3, 12);
    ctx.fillStyle = BRASS; ctx.strokeStyle = OUT; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, 7.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff1c8';
    ctx.beginPath(); ctx.arc(cx, cy, 5.5, 0, Math.PI * 2); ctx.fill();
    hands(ctx, cx, cy, 4.5, 1.2, OUT);
  }

  // 'X': iron exit door with a 23:47 dial and a brass threshold glow
  function door(ctx, x, y, t) {
    ctx.fillStyle = '#2b3442'; ctx.fillRect(x + 2, y, S - 4, S);
    ctx.fillStyle = '#3d4859'; ctx.fillRect(x + 6, y + 3, S - 12, S - 3);
    ctx.fillStyle = '#1b212b';
    ctx.fillRect(x + 3, y, 2, S); ctx.fillRect(x + S - 5, y, 2, S);
    ctx.fillStyle = '#c8c1ae';
    ctx.beginPath(); ctx.arc(x + 16, y + 12, 7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.stroke();
    hands(ctx, x + 16, y + 12, 5.5, 1.1, '#2a2f38');
    ctx.globalAlpha = 0.3 + 0.2 * Math.sin(t * 3);
    ctx.fillStyle = BRASS_HI; ctx.fillRect(x + 6, y + 27, S - 12, 3);
    ctx.globalAlpha = 1;
  }

  // 'o': golden rouage, turning
  function rouage(ctx, x, y, t) {
    const cx = x + 16, cy = y + 16;
    const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, 16);
    g.addColorStop(0, 'rgba(255,210,120,0.28)'); g.addColorStop(1, 'rgba(255,210,120,0)');
    ctx.fillStyle = g; ctx.fillRect(x, y, S, S);
    gear(ctx, cx, cy, 10, 9, t * 2.2 + x * 0.1, BRASS, { lw: 1.4 });
    ctx.fillStyle = BRASS_LO;
    ctx.beginPath(); ctx.arc(cx, cy, 2.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,' + (0.35 + 0.35 * Math.sin(t * 6 + x)).toFixed(3) + ')';
    ctx.beginPath(); ctx.arc(cx + 5, cy - 6, 1.4, 0, Math.PI * 2); ctx.fill();
  }

  // 'h': oil flask, glowing amber
  function oil(ctx, x, y, t) {
    const pulse = 0.7 + 0.3 * Math.sin(t * 4 + x);
    ctx.fillStyle = 'rgba(190,225,245,0.35)'; ctx.fillRect(x + 13, y + 8, 6, 5);
    ctx.fillStyle = BRASS_LO; ctx.fillRect(x + 12, y + 4, 8, 4);
    ctx.fillStyle = 'rgba(255,170,60,' + pulse.toFixed(3) + ')';
    ctx.beginPath(); ctx.ellipse(x + 16, y + 20, 8, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(x + 11, y + 16, 2, 5);
  }

  // 'B': iron grate of the arena, red-hot edges
  function grate(ctx, x, y, t) {
    ctx.fillStyle = 'rgba(30,38,50,0.92)'; ctx.fillRect(x, y, S, S);
    ctx.fillStyle = '#6d7989';
    for (let i = 2; i < S; i += 8) ctx.fillRect(x + i, y, 3, S);
    ctx.fillStyle = BRASS;
    for (let i = 3; i < S; i += 8) ctx.fillRect(x + i, y + 4, 1.5, 1.5);
    ctx.fillStyle = 'rgba(255,110,80,' + (0.5 + 0.3 * Math.sin(t * 5)).toFixed(3) + ')';
    ctx.fillRect(x, y, 4, S); ctx.fillRect(x + S - 4, y, 4, S);
  }

  function tile(ctx, ch, x, y, t, nb) {
    const n = nb || {};
    const X = num(x), Y = num(y), tt = num(t);
    ctx.save();
    ctx.beginPath(); ctx.rect(X, Y, S, S); ctx.clip();
    if (ch === '#') stone(ctx, X, Y, n);
    else if (ch === '=') beam(ctx, X, Y, n);
    else if (ch === '^') spikes(ctx, X, Y);
    else if (ch === 'C') lantern(ctx, X, Y, tt);
    else if (ch === 'X') door(ctx, X, Y, tt);
    else if (ch === 'o') rouage(ctx, X, Y, tt);
    else if (ch === 'h') oil(ctx, X, Y, tt);
    else if (ch === 'B') grate(ctx, X, Y, tt);
    ctx.restore();
  }

  /* ---------- foreground: slow dust motes, alpha 0.1-0.4 ---------- */
  function foreground(ctx, camX, camY, t, W, H) {
    W = num(W) || 960; H = num(H) || 540;
    const cx = num(camX), cy = num(camY), tt = num(t);
    ctx.save();
    ctx.fillStyle = '#d6ebff';
    for (let i = 0; i < 36; i++) {
      const x = mod(i * 97.7 - cx * 0.35 + Math.sin(tt * 0.25 + i) * 14, W + 40) - 20;
      const y = mod(i * 53.1 - tt * 4 - cy * 0.1, H + 20) - 10;
      ctx.globalAlpha = clamp(0.12 + 0.16 * (0.5 + 0.5 * Math.sin(tt * 0.8 + i * 1.7)), 0.1, 0.4);
      ctx.beginPath(); ctx.arc(x, y, 0.8 + (i % 3) * 0.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  window.ENV_THEMES.tower = { background: background, tile: tile, foreground: foreground };
})();
