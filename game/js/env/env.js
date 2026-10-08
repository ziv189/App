/* ENV: backgrounds, tiles and foreground for the five themes. Contract: DESIGN.md section 6.
   All themes share the same tile language; only palettes and background art change. */
(function () {
  const TH = {
    station: {
      sky: ['#14122a', '#3a3152'], far: '#241f3d', mid: '#1a1730', fg: '#0d0b1a',
      stone: '#5a5266', mortar: '#3b3548', top: '#8c85a0', plat: '#6d6b78', platTop: '#a9a7b4',
      accent: '#f2c66d', rain: true,
    },
    market: {
      sky: ['#f08f63', '#7d3e5c'], far: '#b5654f', mid: '#6b3347', fg: '#3a1d2b',
      stone: '#b99470', mortar: '#8a6a4f', top: '#e2c08f', plat: '#7a4f2e', platTop: '#b07a48',
      accent: '#ffd27a', dust: true,
    },
    foundry: {
      sky: ['#1e0b08', '#6b2412'], far: '#3a1510', mid: '#2a0f0b', fg: '#140605',
      stone: '#4b4040', mortar: '#2c2424', top: '#7d6a64', plat: '#5a3a2a', platTop: '#8e5a3a',
      accent: '#ff8a3d', embers: true,
    },
    tower: {
      sky: ['#161c2a', '#3a4a5e'], far: '#2a3646', mid: '#1f2936', fg: '#0e131c',
      stone: '#6b6f7c', mortar: '#3e434f', top: '#9aa0ae', plat: '#7a5a3a', platTop: '#b08a5a',
      accent: '#8fd3e8', dust: true,
    },
    clockface: {
      sky: ['#2a2a52', '#e8b060'], far: '#c9a0a0', mid: '#a0708a', fg: '#4a3050',
      stone: '#e9e2d4', mortar: '#b9b0a0', top: '#ffffff', plat: '#c9a050', platTop: '#f2d27a',
      accent: '#ffe39a', light: true,
    },
  };
  const get = (t) => TH[t] || TH.station;

  function drawSky(ctx, th, W, H) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, th.sky[0]);
    g.addColorStop(1, th.sky[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function silhouetteRow(ctx, color, camX, factor, base, H, seed) {
    ctx.fillStyle = color;
    const period = 240;
    const off = -((camX * factor) % period);
    for (let i = -1; i < 6; i++) {
      const x = off + i * period;
      const h = 90 + ((i * 37 + seed * 13) % 110 + 110) % 110;
      ctx.fillRect(x, base - h, period * 0.62, h + (H - base));
      ctx.beginPath();
      ctx.moveTo(x - 6, base - h);
      ctx.lineTo(x + period * 0.31, base - h - 34);
      ctx.lineTo(x + period * 0.68, base - h);
      ctx.fill();
    }
  }

  function drawClock(ctx, cx, cy, r, color, hourA, minA) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(40,30,20,0.6)'; ctx.lineWidth = Math.max(2, r * 0.05);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(40,30,20,0.85)';
    ctx.lineWidth = r * 0.06; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(hourA) * r * 0.5, cy - Math.cos(hourA) * r * 0.5); ctx.stroke();
    ctx.lineWidth = r * 0.035;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(minA) * r * 0.8, cy - Math.cos(minA) * r * 0.8); ctx.stroke();
    ctx.restore();
  }

  // 23:47 frozen: hour hand just before 12 (near 11.8h), minute hand at 47 min.
  const HOUR_A = (11.78 / 12) * Math.PI * 2, MIN_A = (47 / 60) * Math.PI * 2;

  function drawBackground(ctx, theme, camX, camY, t, W, H) {
    const th = get(theme);
    drawSky(ctx, th, W, H);
    const cx = camX || 0;
    // far clock / sun
    if (theme === 'clockface') {
      ctx.globalAlpha = 0.9;
      drawClock(ctx, W * 0.72 - cx * 0.05, 150 - (camY || 0) * 0.05, 130, '#f6ecd6', HOUR_A, MIN_A);
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      for (let i = 0; i < 40; i++) ctx.fillRect((i * 97) % W, (i * 53) % 220, 2, 2);
    } else if (theme === 'station') {
      drawClock(ctx, W * 0.5 - cx * 0.12, 120, 78, '#e8e0cc', HOUR_A, MIN_A);
    }
    silhouetteRow(ctx, th.far, cx, 0.2, H * 0.62, H, 1);
    silhouetteRow(ctx, th.mid, cx, 0.45, H * 0.8, H, 2);
    if (theme === 'foundry') {
      const glow = 0.25 + 0.1 * Math.sin((t || 0) * 3);
      ctx.fillStyle = 'rgba(255,120,40,' + glow.toFixed(3) + ')';
      ctx.fillRect(0, H * 0.6, W, H * 0.4);
      for (let i = 0; i < 6; i++) {
        const x = ((i * 200 - cx * 0.3) % (W + 200) + W + 200) % (W + 200) - 100;
        ctx.fillStyle = 'rgba(200,190,180,0.14)';
        ctx.beginPath(); ctx.arc(x, H * 0.35 - ((t || 0) * 10 + i * 30) % 120, 40 + i * 4, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (theme === 'tower') {
      ctx.save();
      ctx.globalAlpha = 0.25;
      for (let i = 0; i < 3; i++) {
        const gx = W * (0.2 + i * 0.3) - cx * 0.15;
        ctx.strokeStyle = '#8fa8b8'; ctx.lineWidth = 8;
        ctx.beginPath(); ctx.arc(gx, H * 0.45 - (camY || 0) * 0.1, 90 + i * 20, 0, Math.PI * 2); ctx.stroke();
        for (let k = 0; k < 12; k++) {
          const a = k / 12 * Math.PI * 2;
          ctx.fillStyle = '#8fa8b8';
          ctx.fillRect(gx + Math.cos(a) * 92, H * 0.45 - (camY || 0) * 0.1 + Math.sin(a) * 92 - 4, 14, 8);
        }
      }
      ctx.restore();
    }
    if (theme === 'market') {
      // striped awnings along the top
      ctx.save();
      for (let i = 0; i < 12; i++) {
        const x = ((i * 90 - cx * 0.5) % 1080 + 1080) % 1080 - 60;
        ctx.fillStyle = i % 2 ? '#e8d5a0' : '#b8524a';
        ctx.beginPath(); ctx.moveTo(x, 40); ctx.lineTo(x + 90, 40); ctx.lineTo(x + 84, 88); ctx.lineTo(x + 45, 100); ctx.lineTo(x + 6, 88); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    // ground haze
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(0, H * 0.82, W, H * 0.18);
  }

  /* ---------- tiles ---------- */
  function brickPattern(ctx, x, y, th, s) {
    ctx.strokeStyle = th.mortar;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let row = 0; row < 4; row++) {
      const yy = y + row * 8 + 0.5;
      ctx.moveTo(x, yy); ctx.lineTo(x + s, yy);
      const off = row % 2 ? 0 : 8;
      for (let c = off; c < s; c += 16) { ctx.moveTo(x + c + 0.5, yy); ctx.lineTo(x + c + 0.5, yy + 8); }
    }
    ctx.stroke();
  }

  function drawTile(ctx, theme, chr, x, y, t, nb) {
    const th = get(theme);
    const n = nb || {};
    const S = 32;
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, S, S); ctx.clip();
    if (chr === '#') {
      ctx.fillStyle = th.stone; ctx.fillRect(x, y, S, S);
      brickPattern(ctx, x, y, th, S);
      ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(x, y, S, 3);
      if (!n.u) { ctx.fillStyle = th.top; ctx.fillRect(x, y, S, 5); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x, y + 5, S, 2); }
      if (!n.l) { ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(x, y, 2, S); }
      if (!n.r) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + S - 2, y, 2, S); }
    } else if (chr === '=') {
      ctx.fillStyle = th.plat; ctx.fillRect(x, y + 6, S, 10);
      ctx.fillStyle = th.platTop; ctx.fillRect(x, y + 4, S, 4);
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x + 3, y + 16, 3, 10); ctx.fillRect(x + S - 6, y + 16, 3, 10);
      ctx.fillStyle = th.accent; for (let i = 4; i < S; i += 10) ctx.fillRect(x + i, y + 8, 2, 2);
    } else if (chr === '^') {
      ctx.fillStyle = '#b8862e';
      for (let i = 0; i < 4; i++) {
        const sx = x + 2 + i * 8;
        ctx.beginPath(); ctx.moveTo(sx, y + S); ctx.lineTo(sx + 4, y + 8); ctx.lineTo(sx + 8, y + S); ctx.closePath();
        ctx.fill(); ctx.strokeStyle = '#1c1420'; ctx.lineWidth = 1; ctx.stroke();
      }
    } else if (chr === 'C') {
      const flick = 0.85 + 0.15 * Math.sin(t * 9 + x);
      const g = ctx.createRadialGradient(x + 16, y + 14, 2, x + 16, y + 14, 20);
      g.addColorStop(0, 'rgba(255,220,130,' + (0.7 * flick).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(255,220,130,0)');
      ctx.fillStyle = g; ctx.fillRect(x - 4, y - 6, S + 8, S + 8);
      ctx.fillStyle = '#2a2024'; ctx.fillRect(x + 14, y + 20, 4, 12);
      ctx.fillStyle = '#ffe39a';
      ctx.beginPath(); ctx.arc(x + 16, y + 14, 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#1c1420'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.strokeStyle = '#1c1420'; ctx.beginPath(); ctx.moveTo(x + 16, y + 14); ctx.lineTo(x + 16, y + 10); ctx.moveTo(x + 16, y + 14); ctx.lineTo(x + 19, y + 14); ctx.stroke();
    } else if (chr === 'X') {
      ctx.fillStyle = '#4a4a55'; ctx.fillRect(x + 2, y, S - 4, S);
      ctx.fillStyle = '#2a2a33'; ctx.fillRect(x + 6, y + 3, S - 12, S - 3);
      ctx.fillStyle = '#e8e0cc'; ctx.beginPath(); ctx.arc(x + 16, y + 14, 8, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#1c1420'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 16, y + 14); ctx.lineTo(x + 16, y + 8); ctx.moveTo(x + 16, y + 14); ctx.lineTo(x + 21, y + 14); ctx.stroke();
      ctx.fillStyle = th.accent; ctx.globalAlpha = 0.3 + 0.2 * Math.sin(t * 3); ctx.fillRect(x + 4, y + 26, S - 8, 3); ctx.globalAlpha = 1;
    } else if (chr === 'o') {
      const spin = t * 2.2 + x * 0.1;
      if (window.ART) ART.gear(ctx, x + 16, y + 16, 9, 8, spin, '#f2c66d', { lw: 1.4 });
      ctx.fillStyle = 'rgba(255,255,255,' + (0.4 + 0.4 * Math.sin(t * 6 + x)).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(x + 22, y + 9, 1.6, 0, Math.PI * 2); ctx.fill();
    } else if (chr === 'h') {
      const pulse = 0.7 + 0.3 * Math.sin(t * 4 + x);
      ctx.fillStyle = '#7d4a1c'; ctx.fillRect(x + 12, y + 6, 8, 4);
      ctx.fillStyle = 'rgba(255,170,60,' + pulse.toFixed(3) + ')';
      ctx.beginPath(); ctx.ellipse(x + 16, y + 20, 8, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#1c1420'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(x + 12, y + 16, 2, 5);
    } else if (chr === 'B') {
      ctx.fillStyle = 'rgba(40,36,44,0.92)'; ctx.fillRect(x, y, S, S);
      ctx.fillStyle = '#7a7480';
      for (let i = 2; i < S; i += 8) ctx.fillRect(x + i, y, 3, S);
      ctx.fillStyle = '#b8862e';
      for (let i = 3; i < S; i += 8) ctx.fillRect(x + i, y + 4, 1.5, 1.5);
      const glow = 0.3 + 0.2 * Math.sin(t * 5);
      ctx.fillStyle = 'rgba(255,90,60,' + glow.toFixed(3) + ')';
      ctx.fillRect(x, y, 2, S); ctx.fillRect(x + S - 2, y, 2, S);
    }
    ctx.restore();
  }

  function drawForeground(ctx, theme, camX, camY, t, W, H) {
    const th = get(theme);
    ctx.save();
    if (th.rain) {
      ctx.strokeStyle = 'rgba(190,200,230,0.22)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 90; i++) {
        const x = ((i * 137 + (t || 0) * 380 - (camX || 0) * 0.4) % (W + 60) + W + 60) % (W + 60) - 30;
        const y = ((i * 71 + (t || 0) * 900) % (H + 40)) - 20;
        ctx.moveTo(x, y); ctx.lineTo(x - 6, y + 14);
      }
      ctx.stroke();
    }
    if (th.embers) {
      ctx.fillStyle = 'rgba(255,160,70,0.5)';
      for (let i = 0; i < 24; i++) {
        const x = ((i * 91 - (camX || 0) * 0.6) % (W + 40) + W + 40) % (W + 40) - 20;
        const y = H - ((t || 0) * (30 + i * 3) + i * 37) % H;
        ctx.beginPath(); ctx.arc(x, y, 1.5 + (i % 3) * 0.6, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (th.dust) {
      ctx.fillStyle = 'rgba(255,240,210,0.22)';
      for (let i = 0; i < 30; i++) {
        const x = ((i * 113 - (camX || 0) * 0.3) % (W + 40) + W + 40) % (W + 40) - 20;
        const y = ((i * 67 + (t || 0) * 18) % (H + 20)) - 10;
        ctx.fillRect(x, y, 2, 2);
      }
    }
    if (th.light) {
      ctx.fillStyle = 'rgba(255,240,190,0.07)';
      for (let i = 0; i < 4; i++) {
        const x = i * 260 - (camX || 0) * 0.1;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 90, 0); ctx.lineTo(x + 240, H); ctx.lineTo(x + 170, H); ctx.closePath(); ctx.fill();
      }
    }
    ctx.restore();
  }

  window.ENV = { drawBackground, drawTile, drawForeground };
})();
