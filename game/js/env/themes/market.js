/* ENV theme "market": the Frozen Market of Vermeil at dusk, everyone stopped mid-gesture.
   Contract: DESIGN.md section 6 and AGENT_BRIEF.md (environment theme contract).
   Plain browser script: no import/export. Every method saves and restores its own canvas state. */
(function () {
  window.ENV_THEMES = window.ENV_THEMES || {};

  const SZ = 32;                                          // tile size (px)
  const SKY = [[0, '#f29a58'], [0.4, '#d2705a'], [0.75, '#8c4262'], [1, '#4e2a4e']];
  const FAR = '#5a2846';                                  // far rooftops and tower (parallax 0.2)
  const MID = '#3a1834';                                  // near rooftops (parallax 0.4)
  const CREAM = '#f3e5c6', RED = '#b5373d';               // awning stripes
  const STONE = ['#8b6f5e', '#9c7e68', '#7a6150', '#a48a70'];
  // 23:47, frozen: hour hand just before 12, minute hand at 47 (same maths as env.js).
  const HOUR_A = (11.78 / 12) * Math.PI * 2;
  const MIN_A = (47 / 60) * Math.PI * 2;

  function num(v, d) { return typeof v === 'number' && isFinite(v) ? v : (d || 0); }
  function wrap(v, p) { return ((v % p) + p) % p; }
  // Deterministic pseudo-random value in [0,1): same inputs, same result (no flicker between frames).
  function hash2(a, b) { const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return s - Math.floor(s); }

  // Clock hands frozen at 23:47, centred on (cx, cy), radius r.
  function hands(ctx, cx, cy, r, color) {
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1, r * 0.12);
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.sin(HOUR_A) * r * 0.5, cy - Math.cos(HOUR_A) * r * 0.5); ctx.stroke();
    ctx.lineWidth = Math.max(1, r * 0.07);
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.sin(MIN_A) * r * 0.8, cy - Math.cos(MIN_A) * r * 0.8); ctx.stroke();
  }

  /* ---------- background ---------- */

  function drawSky(ctx, W, H) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    SKY.forEach(function (s) { g.addColorStop(s[0], s[1]); });
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // low pale sun; the sky does not scroll, so it stays put
    const sx = W * 0.7, sy = H * 0.3;
    const glow = ctx.createRadialGradient(sx, sy, 6, sx, sy, 240);
    glow.addColorStop(0, 'rgba(255,220,150,0.5)');
    glow.addColorStop(1, 'rgba(255,220,150,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffe2a8';
    ctx.beginPath(); ctx.arc(sx, sy, 20, 0, Math.PI * 2); ctx.fill();
  }

  // Buildings of one repeating period. Keyed on the global period index g, so the pattern
  // stays put while the camera moves.
  function blocks(g, seed, P) {
    const a = 60 + hash2(g * 3.1, seed) * 50;
    const b = 50 + hash2(g * 5.7, seed * 2.3) * 50;
    const parts = [[0, a], [a, b], [a + b, P - a - b]];
    return parts.map(function (p, j) {
      const k = g * 7.3 + j * 4.1 + seed * 3.7;
      return {
        k: k,
        x: p[0],
        w: p[1],
        h: 24 + hash2(k, 1.3) * 60,                                   // roof line above base
        gable: hash2(k, 2.9) > 0.35 ? 12 + hash2(k, 4.7) * 16 : 0,    // 0 = flat roof
        chimney: hash2(k, 6.1) > 0.45
      };
    });
  }

  // Saint-Aube style clock tower in the far layer. Its dial shows 23:47.
  function drawTower(ctx, tx, base, H) {
    ctx.fillStyle = FAR;
    ctx.fillRect(tx + 2, base - 280, 32, H - (base - 280));          // shaft
    ctx.fillRect(tx - 4, base - 302, 44, 24);                       // belfry
    ctx.beginPath();
    ctx.moveTo(tx - 4, base - 302); ctx.lineTo(tx + 18, base - 352); ctx.lineTo(tx + 40, base - 302);
    ctx.closePath(); ctx.fill();
    const dx = tx + 18, dy = base - 250;
    const glow = ctx.createRadialGradient(dx, dy, 4, dx, dy, 26);
    glow.addColorStop(0, 'rgba(255,200,120,0.35)');
    glow.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(dx - 26, dy - 26, 52, 52);
    ctx.beginPath(); ctx.arc(dx, dy, 11, 0, Math.PI * 2);
    ctx.fillStyle = '#f6e2b0'; ctx.fill();
    ctx.strokeStyle = '#1c1420'; ctx.lineWidth = 1; ctx.stroke();
    hands(ctx, dx, dy, 9, '#3a1834');
  }

  // One parallax row of rooftops: silhouettes, chimneys with frozen smoke, optional lit windows.
  function rooftopRow(ctx, o, cx, W, H) {
    const s = -cx * o.f;
    const gStart = Math.floor(-s / o.P);
    const x0 = gStart * o.P + s;                                     // screen x of first period, in (-P, 0]
    for (let k = 0; x0 + k * o.P < W; k++) {
      const g = gStart + k, px = x0 + k * o.P;
      if (o.tower && ((g % 3) + 3) % 3 === 1) drawTower(ctx, px + 150, o.base, H);
      ctx.fillStyle = o.color;
      blocks(g, o.seed, o.P).forEach(function (b) {
        const top = o.base - b.h - b.gable;
        ctx.fillRect(px + b.x, top, b.w, H - top);
        if (b.gable) {
          ctx.beginPath();
          ctx.moveTo(px + b.x - 3, top);
          ctx.lineTo(px + b.x + b.w / 2, top - b.gable);
          ctx.lineTo(px + b.x + b.w + 3, top);
          ctx.closePath(); ctx.fill();
        }
        if (b.chimney) {
          const chx = px + b.x + b.w * 0.7, chTop = top - b.gable * 0.6 - 16;
          ctx.fillRect(chx, chTop, 7, top - chTop + 4);
          if (hash2(b.k, 8.8) > 0.5) {                               // frozen smoke puffs
            ctx.fillStyle = 'rgba(240,186,170,0.14)';
            for (let i = 0; i < 3; i++) {
              ctx.beginPath(); ctx.arc(chx + 3 + i * 3, chTop - 8 - i * 10, 5 + i * 3, 0, Math.PI * 2); ctx.fill();
            }
            ctx.fillStyle = o.color;
          }
        }
      });
    }
    if (!o.lit) return;
    for (let k = 0; x0 + k * o.P < W; k++) {                         // lit windows, drawn over the bodies
      const g = gStart + k, px = x0 + k * o.P;
      blocks(g, o.seed, o.P).forEach(function (b) {
        const top = o.base - b.h - b.gable;
        const cols = Math.floor((b.w - 10) / 12);
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < cols; c++) {
            if (hash2(b.k + r * 1.9, c * 2.3 + 0.5) < 0.6) continue;
            const wy = top + 14 + r * 16;
            if (wy > H - 20) continue;
            ctx.fillStyle = 'rgba(255,190,110,0.75)';
            ctx.fillRect(px + b.x + 6 + c * 12, wy, 5, 7);
          }
        }
      });
    }
  }

  // Hanging lanterns on static strings from the awning rail (parallax 0.5).
  function drawLantern(ctx, x, y, t, i) {
    const f = 0.85 + 0.15 * Math.sin(t * 2.5 + i);
    const g = ctx.createRadialGradient(x, y, 2, x, y, 34);
    g.addColorStop(0, 'rgba(255,200,110,' + (0.4 * f).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(255,200,110,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 34, y - 34, 68, 68);
    ctx.strokeStyle = 'rgba(30,14,26,0.75)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, 46); ctx.lineTo(x, y - 10); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x, y, 6, 8, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ffcd72'; ctx.fill();
    ctx.strokeStyle = '#1c1420'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#2a1420';
    ctx.fillRect(x - 4, y - 11, 8, 3);
    ctx.fillRect(x - 3, y + 7, 6, 2);
  }

  function drawLanterns(ctx, cx, W, t) {
    const P = 170, s = -cx * 0.5;
    const gStart = Math.floor(-s / P), x0 = gStart * P + s;
    for (let k = 0; x0 + k * P < W; k++) {
      const g = gStart + k;
      for (let j = 0; j < 2; j++) {
        const x = x0 + k * P + (j ? 125 : 40);
        const y = 96 + hash2(g * 2.3 + j, 3.3) * 34;
        drawLantern(ctx, x, y, t, g * 2 + j);
      }
    }
  }

  // Striped cream and red awning along the top, scalloped edge, parallax 0.5.
  function drawAwnings(ctx, cx, W, H) {
    const SW = 40, s = -cx * 0.5, gStart = Math.floor(-s / SW), x0 = gStart * SW + s;
    // shadow the awning throws on the sky below
    const sh = ctx.createLinearGradient(0, 46, 0, 80);
    sh.addColorStop(0, 'rgba(60,16,36,0.22)');
    sh.addColorStop(1, 'rgba(60,16,36,0)');
    ctx.fillStyle = sh;
    ctx.fillRect(0, 46, W, 34);
    for (let k = 0; x0 + k * SW < W; k++) {
      const g = gStart + k, x = x0 + k * SW;
      ctx.fillStyle = Math.abs(g) % 2 ? CREAM : RED;
      ctx.fillRect(x, 0, SW, 26);
      ctx.beginPath();
      ctx.moveTo(x, 26); ctx.lineTo(x + SW, 26);
      ctx.arc(x + SW / 2, 26, SW / 2, 0, Math.PI, false);
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#4a2030';                                       // top rail
    ctx.fillRect(0, 0, W, 3);
  }

  /* ---------- tiles ---------- */

  // '#': cobblestones on a 8px grid (aligned so neighbouring tiles join), sandy highlights.
  function tCobble(ctx, x, y, n) {
    ctx.fillStyle = '#4e3a31';
    ctx.fillRect(x, y, SZ, SZ);
    for (let r = 0; r < 4; r++) {
      const row = y + r * 8, off = r % 2 ? 4 : 0;
      for (let c = -1; c < 4; c++) {
        const sx = x + off + c * 8;
        const x0 = Math.max(x, sx), x1 = Math.min(x + SZ, sx + 7);
        if (x1 <= x0) continue;
        ctx.fillStyle = STONE[Math.floor(hash2(sx, row) * STONE.length) % STONE.length];
        ctx.fillRect(x0, row, x1 - x0, 7);
        ctx.fillStyle = 'rgba(240,214,160,0.35)';
        ctx.fillRect(x0, row, x1 - x0, 1);
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(x0, row + 6, x1 - x0, 1);
      }
    }
    ctx.fillStyle = 'rgba(246,222,170,0.6)';
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(x + Math.floor(hash2(x + i, y) * 30), y + Math.floor(hash2(y + i, x) * 30), 2, 1);
    }
    if (!n.u) {                                                      // exposed top: sand drift
      ctx.fillStyle = '#dcb77c'; ctx.fillRect(x, y, SZ, 3);
      ctx.fillStyle = '#f4dca8'; ctx.fillRect(x, y, SZ, 1);
      ctx.fillStyle = '#c9a26a';
      for (let i = 0; i < SZ; i += 4) ctx.fillRect(x + i, y + 3, 3, 1 + Math.floor(hash2(x + i, y + 7) * 3));
    }
    ctx.fillStyle = 'rgba(30,18,20,0.35)';
    if (!n.l) ctx.fillRect(x, y, 2, SZ);
    if (!n.r) ctx.fillRect(x + SZ - 2, y, 2, SZ);
  }

  // '=': a wooden board with seams and nails; a crate under it where nothing solid is below.
  function tPlank(ctx, x, y, n) {
    const top = y + 4, bh = 10;
    ctx.fillStyle = '#6e4628'; ctx.fillRect(x, top, SZ, bh);
    ctx.fillStyle = '#8f5e36'; ctx.fillRect(x, top, SZ, 2);
    ctx.fillStyle = 'rgba(255,226,170,0.35)'; ctx.fillRect(x, top, SZ, 1);
    ctx.fillStyle = 'rgba(30,14,6,0.55)';
    ctx.fillRect(x + 10, top, 1, bh); ctx.fillRect(x + 21, top, 1, bh);
    ctx.fillStyle = 'rgba(40,20,8,0.25)';
    ctx.fillRect(x + 2, top + 5, 6, 1); ctx.fillRect(x + 13, top + 4, 7, 1); ctx.fillRect(x + 24, top + 6, 5, 1);
    ctx.fillStyle = '#c9a050';
    ctx.fillRect(x + 5, top + 3, 2, 2); ctx.fillRect(x + 26, top + 3, 2, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x, top + bh - 1, SZ, 1);
    if (!n.d && hash2(x, y) > 0.4) {
      const cy0 = top + bh;
      ctx.fillStyle = '#6a4628'; ctx.fillRect(x + 3, cy0, SZ - 6, y + SZ - cy0);
      ctx.fillStyle = 'rgba(20,10,4,0.5)';
      for (let i = cy0 + 4; i < y + SZ; i += 5) ctx.fillRect(x + 3, i, SZ - 6, 1);
      ctx.fillStyle = '#b08a4a';
      ctx.fillRect(x + 4, cy0 + 1, 3, 3); ctx.fillRect(x + SZ - 7, cy0 + 1, 3, 3);
    }
  }

  // '^': tarnished brass spikes standing on the ground.
  function tSpikes(ctx, x, y) {
    for (let i = 0; i < 4; i++) {
      const sx = x + 2 + i * 8;
      ctx.beginPath();
      ctx.moveTo(sx, y + SZ); ctx.lineTo(sx + 4, y + 7); ctx.lineTo(sx + 8, y + SZ);
      ctx.closePath();
      ctx.fillStyle = '#c9a04a'; ctx.fill();
      ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = 'rgba(255,240,200,0.5)';
      ctx.fillRect(sx + 2, y + 14, 1, SZ - 14);
    }
  }

  // 'C': lit lantern-clock on a bracket, dial at 23:47.
  function tLantern(ctx, x, y, t) {
    const cx = x + 16, cy = y + 13, f = 0.85 + 0.15 * Math.sin(t * 9 + x);
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 22);
    g.addColorStop(0, 'rgba(255,210,120,' + (0.6 * f).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(255,210,120,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, SZ, SZ);
    ctx.fillStyle = '#2a2024';
    ctx.fillRect(cx - 1.5, cy + 7, 3, 12);
    ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd98a'; ctx.fill();
    ctx.strokeStyle = '#1c1420'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = '#fff4d6'; ctx.fill();
    hands(ctx, cx, cy, 4.5, '#2a1420');
  }

  // 'X': iron exit door with a clock dial at 23:47 and a pulsing light along the threshold.
  function tExit(ctx, x, y, t) {
    const cx = x + 16, L = x + 5, R = x + 27, f = 0.3 + 0.2 * Math.sin(t * 3);
    ctx.beginPath();
    ctx.moveTo(L, y + SZ); ctx.lineTo(L, y + 10);
    ctx.arc(cx, y + 10, 11, Math.PI, 0, false);
    ctx.lineTo(R, y + SZ); ctx.closePath();
    ctx.fillStyle = '#3f3c4a'; ctx.fill();
    ctx.strokeStyle = '#1c1420'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#2a2833'; ctx.fillRect(L + 3, y + 19, R - L - 6, SZ - 19);
    ctx.fillStyle = '#1c1820'; ctx.fillRect(cx - 0.5, y + 19, 1, SZ - 19);
    ctx.beginPath(); ctx.arc(cx, y + 12, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#f1e6cc'; ctx.fill(); ctx.stroke();
    hands(ctx, cx, y + 12, 6, '#2a1420');
    ctx.fillStyle = 'rgba(255,200,110,' + f.toFixed(3) + ')';
    ctx.fillRect(L + 2, y + SZ - 5, R - L - 4, 3);
  }

  // 'o': golden gear that turns.
  function tGear(ctx, x, y, t) {
    if (window.ART && typeof window.ART.gear === 'function') {
      window.ART.gear(ctx, x + 16, y + 16, 9, 8, t * 2.2 + x * 0.1, '#f2c66d', { lw: 1.4 });
    } else {
      ctx.beginPath(); ctx.arc(x + 16, y + 16, 9, 0, Math.PI * 2);
      ctx.fillStyle = '#f2c66d'; ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + 0.3 * Math.sin(t * 6 + x)).toFixed(3) + ')';
    ctx.beginPath(); ctx.arc(x + 22, y + 9, 1.6, 0, Math.PI * 2); ctx.fill();
  }

  // 'h': oil flask with an amber glow.
  function tOil(ctx, x, y, t) {
    const p = 0.7 + 0.3 * Math.sin(t * 4 + x);
    ctx.fillStyle = '#7d4a1c'; ctx.fillRect(x + 12, y + 5, 8, 4);
    ctx.beginPath(); ctx.ellipse(x + 16, y + 20, 8, 9, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,170,60,' + p.toFixed(3) + ')'; ctx.fill();
    ctx.strokeStyle = '#1c1420'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(x + 12, y + 16, 2, 5);
  }

  // 'B': iron grate of the arena, with an ember glow on both edges.
  function tGrate(ctx, x, y, t) {
    ctx.fillStyle = 'rgba(38,34,44,0.92)'; ctx.fillRect(x, y, SZ, SZ);
    ctx.fillStyle = '#7a7480';
    for (let i = 2; i < SZ; i += 8) ctx.fillRect(x + i, y, 3, SZ);
    ctx.fillStyle = '#c9a050';
    for (let i = 3; i < SZ; i += 8) ctx.fillRect(x + i, y + 4, 1.5, 1.5);
    ctx.fillStyle = 'rgba(255,120,70,' + (0.3 + 0.2 * Math.sin(t * 5)).toFixed(3) + ')';
    ctx.fillRect(x, y, 2, SZ); ctx.fillRect(x + SZ - 2, y, 2, SZ);
  }

  window.ENV_THEMES.market = {
    background(ctx, camX, camY, t, W, H) {
      const w = num(W, 960), h = num(H, 540), cx = num(camX), tt = num(t);
      ctx.save();
      drawSky(ctx, w, h);
      rooftopRow(ctx, { f: 0.2, P: 260, base: h * 0.70, color: FAR, seed: 1, lit: false, tower: true }, cx, w, h);
      rooftopRow(ctx, { f: 0.4, P: 210, base: h * 0.86, color: MID, seed: 7, lit: true, tower: false }, cx, w, h);
      drawLanterns(ctx, cx, w, tt);
      drawAwnings(ctx, cx, w, h);
      const hz = ctx.createLinearGradient(0, h * 0.8, 0, h);            // plum dusk shadow at the bottom
      hz.addColorStop(0, 'rgba(40,14,40,0)');
      hz.addColorStop(1, 'rgba(40,14,40,0.4)');
      ctx.fillStyle = hz;
      ctx.fillRect(0, h * 0.8, w, h * 0.2);
      ctx.restore();
    },

    tile(ctx, ch, x, y, t, nb) {
      const n = nb || {}, X = num(x), Y = num(y), tt = num(t);
      ctx.save();
      ctx.beginPath(); ctx.rect(X, Y, SZ, SZ); ctx.clip();
      switch (ch) {
        case '#': tCobble(ctx, X, Y, n); break;
        case '=': tPlank(ctx, X, Y, n); break;
        case '^': tSpikes(ctx, X, Y); break;
        case 'C': tLantern(ctx, X, Y, tt); break;
        case 'X': tExit(ctx, X, Y, tt); break;
        case 'o': tGear(ctx, X, Y, tt); break;
        case 'h': tOil(ctx, X, Y, tt); break;
        case 'B': tGrate(ctx, X, Y, tt); break;
        default: break;
      }
      ctx.restore();
    },

    // Drifting dust motes: low alpha only (0.12 to 0.32).
    foreground(ctx, camX, camY, t, W, H) {
      const w = num(W, 960), h = num(H, 540), cx = num(camX), cy = num(camY), tt = num(t);
      ctx.save();
      for (let i = 0; i < 36; i++) {
        const r1 = hash2(i * 1.13, 2.7), r2 = hash2(i * 0.71, 5.3), r3 = hash2(i * 2.9, 1.1);
        const sway = Math.sin(tt * 0.6 + i * 1.7) * (6 + r3 * 8);
        const x = wrap(r1 * (w + 60) - cx * 0.35 + sway, w + 60) - 30;
        const y = wrap(r2 * (h + 40) - tt * (4 + r3 * 6) - cy * 0.1, h + 40) - 20;
        ctx.fillStyle = 'rgba(255,236,200,' + (0.12 + r3 * 0.2).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(x, y, r3 > 0.7 ? 2 : 1.2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  };
})();
