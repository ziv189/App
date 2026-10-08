/* ENV theme "station": Vermeil Station, rainy night, frozen at 23:47.
   Contract: game/DESIGN.md section 6 and game/AGENT_BRIEF.md (environment theme contract).
   Plain browser script (no import/export). Each method saves and restores its own context state.
   Defensive: unknown tile characters draw nothing and bad numbers fall back to 0. */
(function () {
  window.ENV_THEMES = window.ENV_THEMES || {};

  const S = 32;                                       // tile size (px)
  const OUT = '#1c1420';                              // outline colour used across the game
  const TAU = Math.PI * 2;
  const HOUR_A = (11 + 47 / 60) / 12 * TAU;           // 23:47: hour hand just short of 12
  const MIN_A = (47 / 60) * TAU;                      // minute hand on the 47 mark
  const BRICK_TONES = ['#66627c', '#6d6886', '#5d5870', '#716c88'];

  const num = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);
  const wrap = (v, m) => ((v % m) + m) % m;
  // deterministic pseudo-random value in [0, 1): a given brick always keeps its tone
  const rnd = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };

  /* ---------- clocks frozen at 23:47 ---------- */
  function clockFace(ctx, cx, cy, r, faceIn, faceOut, rim) {
    ctx.lineCap = 'round';
    ctx.fillStyle = rim;
    ctx.beginPath(); ctx.arc(cx, cy, r * 1.1, 0, TAU); ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = Math.max(1, r * 0.06); ctx.stroke();
    const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
    g.addColorStop(0, faceIn); g.addColorStop(1, faceOut);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(38,30,56,0.75)';
    for (let k = 0; k < 12; k++) {
      const a = k / 12 * TAU;
      ctx.lineWidth = Math.max(0.8, r * (k % 3 ? 0.035 : 0.07));
      ctx.beginPath();
      ctx.moveTo(cx + Math.sin(a) * r * 0.76, cy - Math.cos(a) * r * 0.76);
      ctx.lineTo(cx + Math.sin(a) * r * 0.9, cy - Math.cos(a) * r * 0.9);
      ctx.stroke();
    }
    ctx.strokeStyle = '#231d3a';
    ctx.lineWidth = Math.max(0.9, r * 0.08);
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.sin(HOUR_A) * r * 0.5, cy - Math.cos(HOUR_A) * r * 0.5);
    ctx.stroke();
    ctx.lineWidth = Math.max(0.8, r * 0.05);
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.sin(MIN_A) * r * 0.75, cy - Math.cos(MIN_A) * r * 0.75);
    ctx.stroke();
    ctx.fillStyle = '#c9953a';
    ctx.beginPath(); ctx.arc(cx, cy, Math.max(1, r * 0.09), 0, TAU); ctx.fill();
  }

  // Huge sky clock for the far layer: warm halo, iron rim, brass ring, lit face. It is stopped:
  // a hairline crack runs in from the rim, frost sits just inside the ring, a brass plate reads 23:47.
  function skyClock(ctx, cx, cy, r) {
    const halo = ctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, r * 1.9);
    halo.addColorStop(0, 'rgba(255,205,135,0.22)');
    halo.addColorStop(1, 'rgba(255,205,135,0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(cx, cy, r * 1.9, 0, TAU); ctx.fill();
    clockFace(ctx, cx, cy, r, '#e8dcc0', '#d8c79c', '#262244');
    ctx.strokeStyle = '#b7863f'; ctx.lineWidth = r * 0.025;
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.97, 0, TAU); ctx.stroke();
    // frost: a dotted white arc just inside the brass ring
    const fr = Math.max(0.6, r * 0.008);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    for (let k = 0; k < 48; k++) {
      const a = k / 48 * TAU, fx = cx + Math.sin(a) * r * 0.935, fy = cy - Math.cos(a) * r * 0.935;
      ctx.moveTo(fx + fr, fy); ctx.arc(fx, fy, fr, 0, TAU);
    }
    ctx.fill();
    // hairline crack from the rim toward the pivot, in two segments
    ctx.strokeStyle = 'rgba(35,29,58,0.6)'; ctx.lineWidth = Math.max(0.8, r * 0.012);
    ctx.beginPath();
    ctx.moveTo(cx + Math.sin(2.3) * r * 0.9, cy - Math.cos(2.3) * r * 0.9);
    ctx.lineTo(cx + Math.sin(2.45) * r * 0.55, cy - Math.cos(2.45) * r * 0.55);
    ctx.lineTo(cx + Math.sin(2.2) * r * 0.22, cy - Math.cos(2.2) * r * 0.22);
    ctx.stroke();
    // brass plate under the dial, engraved 23:47 in the game's serif face
    const pw = r * 0.7, ph = r * 0.17, px = cx - pw / 2, py = cy + r * 1.16;
    ctx.fillStyle = '#b7863f'; ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = OUT; ctx.lineWidth = 1; ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);
    ctx.font = 'bold ' + Math.max(8, Math.round(r * 0.09)) + 'px Georgia, "Times New Roman", serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,236,170,0.5)'; ctx.fillText('23:47', cx, py + ph / 2 + 1);
    ctx.fillStyle = '#2a1f0c'; ctx.fillText('23:47', cx, py + ph / 2);
  }

  /* ---------- background layers ---------- */
  // Iron train-shed arches: cold glass tint, ribs, legs, a tie beam and a king post.
  // Two passes around the sky clocks: 'glass' before the dials, 'ribs' after them. The ribs stay off
  // the dial faces and cross them faintly, so the hands keep their edge. dials = [x, y, r] per clock.
  function archRow(ctx, cx, f, H, pass, W, dials) {
    const P = 230, spring = H * 0.44, top = H * 0.16, floor = H * 0.84;
    const off = -((cx * f) % P);
    const archPath = (x0, x1, xm) => {
      ctx.beginPath();
      ctx.moveTo(x0, floor); ctx.lineTo(x0, spring);
      ctx.quadraticCurveTo(x0, top, xm, top);
      ctx.quadraticCurveTo(x1, top, x1, spring);
      ctx.lineTo(x1, floor);
    };
    if (pass === 'glass') {
      ctx.fillStyle = 'rgba(78,68,140,0.28)';
      for (let i = -1; i < 7; i++) {
        const x0 = off + i * P, x1 = x0 + P, xm = x0 + P / 2;
        archPath(x0, x1, xm); ctx.closePath(); ctx.fill();
      }
      return;
    }
    const ribs = (ink) => {
      ctx.strokeStyle = ink; ctx.lineCap = 'butt';
      for (let i = -1; i < 7; i++) {
        const x0 = off + i * P, x1 = x0 + P, xm = x0 + P / 2;
        archPath(x0, x1, xm); ctx.lineWidth = 6; ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x0, spring + 46); ctx.lineTo(x1, spring + 46);
        ctx.moveTo(xm, top); ctx.lineTo(xm, spring + 46);
        ctx.lineWidth = 2.5; ctx.stroke();
      }
    };
    const dialDisc = () => {
      ctx.beginPath();
      for (const [dx, dy, dr] of dials) { ctx.moveTo(dx + dr * 1.2, dy); ctx.arc(dx, dy, dr * 1.2, 0, TAU); }
    };
    ctx.save(); dialDisc(); ctx.rect(0, 0, W, H); ctx.clip('evenodd'); ribs('#1b1838'); ctx.restore();   // off the dials
    ctx.save(); dialDisc(); ctx.clip(); ribs('rgba(27,24,56,0.3)'); ctx.restore();                       // faint across them
  }

  // Gabled station roofs with chimneys; some windows lit warm.
  function roofRow(ctx, cx, f, H) {
    const P = 210, base = H * 0.62;
    const off = -((cx * f) % P);
    const q = Math.trunc((cx * f) / P);
    for (let i = -1; i < 7; i++) {
      const x0 = off + i * P, k = i + q;
      const ridge = base - rnd(k, 3) * 30, eave = ridge + 34;
      ctx.fillStyle = '#15122e';
      ctx.beginPath();
      ctx.moveTo(x0, H); ctx.lineTo(x0, eave);
      ctx.lineTo(x0 + P / 2, ridge);
      ctx.lineTo(x0 + P, eave); ctx.lineTo(x0 + P, H);
      ctx.closePath(); ctx.fill();
      ctx.fillRect(x0 + P * 0.72, ridge - 6, 12, 30);              // chimney
      if (rnd(k, 7) > 0.35) {                                       // a lit window
        ctx.fillStyle = 'rgba(255,196,110,0.5)';
        ctx.fillRect(x0 + P * 0.28, eave + 16, 12, 16);
      }
    }
  }

  // Warm lamp posts: iron pole, lamp head, glow, a pool of light and a reflection on the wet ground.
  // The ground is the walkway top, so the posts stand at floor depth.
  function lampRow(ctx, cx, f, H) {
    const P = 240, ground = H * 0.88, topY = H * 0.36;
    const off = -((cx * f) % P);
    for (let i = -1; i < 6; i++) {
      const x = off + i * P + 60, hx = x + 19, hy = topY + 12;
      ctx.fillStyle = '#0c0a1e';
      ctx.fillRect(x - 2, topY, 4, ground - topY);                  // pole
      ctx.fillRect(x - 7, ground - 6, 14, 6);                        // plinth
      ctx.fillRect(x, topY, 18, 3);                                  // arm
      ctx.beginPath();
      ctx.moveTo(x + 12, topY + 3); ctx.lineTo(x + 26, topY + 3);
      ctx.lineTo(x + 22, hy); ctx.lineTo(x + 16, hy); ctx.closePath(); ctx.fill();   // lamp head
      const glow = ctx.createRadialGradient(hx, hy + 2, 2, hx, hy + 2, 90);
      glow.addColorStop(0, 'rgba(255,190,100,0.45)');
      glow.addColorStop(0.4, 'rgba(255,170,80,0.12)');
      glow.addColorStop(1, 'rgba(255,170,80,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(hx - 90, hy - 88, 180, 180);
      ctx.fillStyle = '#ffd792';
      ctx.beginPath(); ctx.arc(hx, hy, 3, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,190,100,0.12)';
      ctx.beginPath(); ctx.ellipse(hx, ground - 2, 70, 8, 0, 0, TAU); ctx.fill();
      const refl = ctx.createLinearGradient(0, ground, 0, H);
      refl.addColorStop(0, 'rgba(255,190,100,0.1)');
      refl.addColorStop(1, 'rgba(255,190,100,0)');
      ctx.fillStyle = refl;
      ctx.fillRect(hx - 4, ground, 8, H - ground);
    }
  }

  function background(ctx, camX, camY, t, W, H) {
    const cx = num(camX), time = num(t);
    ctx.save();
    // sky: deep blue-violet, opaque
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#080a22');
    sky.addColorStop(0.5, '#1a1a4c');
    sky.addColorStop(0.85, '#2b2766');
    sky.addColorStop(1, '#3a2f74');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    // far layer (0.2x): faint twinkling stars and a low cloud deck
    for (let i = 0; i < 28; i++) {
      const sx = wrap(i * 97.3 - cx * 0.2, W), sy = 16 + (i * 53) % (H * 0.36);
      const a = 0.22 + 0.18 * Math.sin(time * 1.3 + i * 2.1);
      ctx.fillStyle = 'rgba(225,230,255,' + a.toFixed(3) + ')';
      ctx.fillRect(sx, sy, 1.5, 1.5);
    }
    ctx.fillStyle = 'rgba(38,34,92,0.55)';
    for (let i = 0; i < 5; i++) {
      const clx = wrap(i * 260 - cx * 0.2, W + 320) - 160;
      const cly = 54 + (i * 37) % 46;
      ctx.beginPath(); ctx.ellipse(clx, cly, 150 - (i % 2) * 40, 22 + (i % 3) * 5, 0, 0, TAU); ctx.fill();
    }
    // far layer: the sky clocks, always 23:47, one every 1100 px of parallax
    const P = 1100, dials = [];
    for (let x = wrap(W * 0.5 - cx * 0.2, P) - P; x < W + 240; x += P) dials.push([x, 150, 118]);
    // mid layer: iron arches (0.35x), glass tint under the dials and ribs over them; then roof silhouettes (0.45x)
    archRow(ctx, cx, 0.35, H, 'glass', W, dials);
    for (const [x, y, r] of dials) skyClock(ctx, x, y, r);
    archRow(ctx, cx, 0.35, H, 'ribs', W, dials);
    roofRow(ctx, cx, 0.45, H);
    // wet platform edge under a violet haze
    const haze = ctx.createLinearGradient(0, H * 0.6, 0, H * 0.84);
    haze.addColorStop(0, 'rgba(120,110,200,0)');
    haze.addColorStop(1, 'rgba(120,110,200,0.16)');
    ctx.fillStyle = haze; ctx.fillRect(0, H * 0.6, W, H * 0.24);
    ctx.fillStyle = '#0b0a1f'; ctx.fillRect(0, H * 0.84, W, H * 0.16);
    ctx.fillStyle = '#3a3470'; ctx.fillRect(0, H * 0.84, W, 2);
    // warm lamp posts (0.5x), nearest to the world
    lampRow(ctx, cx, 0.5, H);
    ctx.restore();
  }

  /* ---------- tiles (each draws only inside its 32x32 cell) ---------- */
  // Grey stone bricks; exposed faces get a lighter top lip and darker sides.
  function tileStone(ctx, x, y, n) {
    ctx.fillStyle = '#2e2a42'; ctx.fillRect(x, y, S, S);            // mortar
    for (let row = 0; row < 4; row++) {
      const by = y + row * 8, off = row % 2 ? 8 : 0;
      for (let bx = off - 16; bx < S; bx += 16) {
        const l = Math.max(0, bx), r = Math.min(S, bx + 15);
        if (r <= l) continue;
        const k = Math.floor(rnd(Math.floor((x + bx) / 16), Math.floor(y / 8) + row) * BRICK_TONES.length);
        ctx.fillStyle = BRICK_TONES[Math.min(k, BRICK_TONES.length - 1)];
        ctx.fillRect(x + l, by, r - l, 7);
        ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fillRect(x + l, by, r - l, 1);
        ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(x + l, by + 6, r - l, 1);
      }
    }
    if (!n.u) {                                                       // exposed top: lighter lip
      ctx.fillStyle = '#a7a2bf'; ctx.fillRect(x, y, S, 4);
      ctx.fillStyle = '#d6d1e8'; ctx.fillRect(x, y, S, 1);
      ctx.fillStyle = 'rgba(20,16,36,0.35)'; ctx.fillRect(x, y + 4, S, 1);
    }
    if (!n.l) { ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(x, y, 2, S); }
    if (!n.r) { ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(x + S - 2, y, 2, S); }
    if (!n.d) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x, y + S - 2, S, 2); }
  }

  // Iron plank with brass studs, iron brackets and a little rust.
  function tilePlank(ctx, x, y) {
    ctx.fillStyle = '#1a1d2c'; ctx.fillRect(x, y + 13, S, 3);       // underside shadow
    ctx.fillStyle = '#5e6882'; ctx.fillRect(x, y + 5, S, 8);        // iron plank
    ctx.fillStyle = '#8a93ab'; ctx.fillRect(x, y + 4, S, 2);        // lit top edge
    ctx.strokeStyle = OUT; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 3.5, S - 1, 9);   // 1px outline
    ctx.fillStyle = '#2a2f3e'; ctx.fillRect(x + 11, y + 6, 1, 7);   // plank seam
    ctx.fillStyle = 'rgba(160,90,50,0.3)'; ctx.fillRect(x + 20, y + 9, 6, 2);   // rust
    ctx.fillStyle = '#23283a';                                      // brackets
    ctx.beginPath(); ctx.moveTo(x + 4, y + 16); ctx.lineTo(x + 11, y + 16); ctx.lineTo(x + 4, y + 23); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + S - 4, y + 16); ctx.lineTo(x + S - 11, y + 16); ctx.lineTo(x + S - 4, y + 23); ctx.closePath(); ctx.fill();
    for (const sx of [5, 18, 28]) {                                 // brass studs
      ctx.fillStyle = '#c9953a'; ctx.strokeStyle = OUT; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.arc(x + sx, y + 8.5, 2, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffe49a'; ctx.fillRect(x + sx - 0.8, y + 7.2, 1, 1);
    }
  }

  // Brass spikes standing on the cell floor.
  function tileSpikes(ctx, x, y) {
    ctx.strokeStyle = OUT; ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const sx = x + 2 + i * 8;
      ctx.fillStyle = '#c9953a';
      ctx.beginPath(); ctx.moveTo(sx, y + S); ctx.lineTo(sx + 4, y + 7); ctx.lineTo(sx + 8, y + S); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,236,170,0.55)';
      ctx.beginPath(); ctx.moveTo(sx + 4, y + 8); ctx.lineTo(sx + 2, y + S - 1); ctx.lineTo(sx + 4, y + S - 1); ctx.closePath(); ctx.fill();
    }
  }

  // Lit lantern-clock: warm flickering glow, iron post, dial showing 23:47.
  function tileLantern(ctx, x, y, t) {
    const flick = 0.88 + 0.12 * Math.sin(t * 9 + x);
    const g = ctx.createRadialGradient(x + 16, y + 12, 2, x + 16, y + 12, 22);
    g.addColorStop(0, 'rgba(255,196,110,' + (0.6 * flick).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(255,196,110,0)');
    ctx.fillStyle = g; ctx.fillRect(x, y, S, S);
    ctx.fillStyle = '#26223a';
    ctx.fillRect(x + 14, y + 20, 4, 12);
    ctx.beginPath(); ctx.moveTo(x + 10, y + 32); ctx.lineTo(x + 22, y + 32); ctx.lineTo(x + 20, y + 28); ctx.lineTo(x + 12, y + 28); ctx.closePath(); ctx.fill();
    clockFace(ctx, x + 16, y + 12, 7.5, '#fff1cf', '#e2c98e', '#2a2440');
  }

  // Iron exit door with a dial at 23:47 and a warm light along the foot.
  function tileDoor(ctx, x, y, t) {
    ctx.fillStyle = '#1f1d2c'; ctx.fillRect(x, y, S, S);            // frame
    ctx.fillStyle = '#4a4a5e'; ctx.fillRect(x + 3, y + 1, S - 6, S - 1);   // iron leaf
    ctx.fillStyle = '#383850'; ctx.fillRect(x + 6, y + 17, S - 12, 12);    // lower panel
    ctx.fillStyle = '#c9953a';                                      // brass rivets
    for (const [rx, ry] of [[6, 4], [26, 4], [6, 28], [26, 28]]) { ctx.beginPath(); ctx.arc(x + rx, y + ry, 1.1, 0, TAU); ctx.fill(); }
    clockFace(ctx, x + 16, y + 11, 6.2, '#efe4c6', '#c8b47f', '#2a2440');
    const pulse = 0.35 + 0.15 * Math.sin(t * 3);
    ctx.fillStyle = 'rgba(242,198,109,' + pulse.toFixed(3) + ')';
    ctx.fillRect(x + 4, y + 30, S - 8, 2);
  }

  // Golden clockwork gear, spinning, with a small glint.
  function tileGear(ctx, x, y, t) {
    const spin = t * 2.2 + x * 0.1;
    if (window.ART && typeof ART.gear === 'function') {
      ART.gear(ctx, x + 16, y + 16, 9, 8, spin, '#e0b054', { lw: 1.4 });
    } else {
      ctx.fillStyle = '#e0b054'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(x + 16, y + 16, 8, 0, TAU); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,' + (0.4 + 0.4 * Math.sin(t * 6 + x)).toFixed(3) + ')';
    ctx.beginPath(); ctx.arc(x + 23, y + 9, 1.6, 0, TAU); ctx.fill();
  }

  // Oil flask with a pulsing amber glow.
  function tileOil(ctx, x, y, t) {
    const pulse = 0.7 + 0.3 * Math.sin(t * 4 + x);
    const g = ctx.createRadialGradient(x + 16, y + 20, 2, x + 16, y + 20, 16);
    g.addColorStop(0, 'rgba(255,170,60,' + (0.35 * pulse).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(255,170,60,0)');
    ctx.fillStyle = g; ctx.fillRect(x, y, S, S);
    ctx.fillStyle = '#b8862e'; ctx.fillRect(x + 12, y + 5, 8, 4);  // brass cap
    ctx.fillStyle = 'rgba(255,170,60,' + pulse.toFixed(3) + ')';
    ctx.beginPath(); ctx.ellipse(x + 16, y + 20, 7, 8, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(x + 12, y + 16, 2, 5);
  }

  // Iron grille (arena barrier) with rails, brass rivets and a warning glow at both edges.
  function tileGrille(ctx, x, y, t) {
    ctx.fillStyle = 'rgba(30,26,46,0.94)'; ctx.fillRect(x, y, S, S);
    ctx.fillStyle = '#6f6a84';
    for (let i = 2; i < S; i += 8) ctx.fillRect(x + i, y, 3, S);
    ctx.fillStyle = '#4a4660';
    ctx.fillRect(x, y + 3, S, 3); ctx.fillRect(x, y + S - 6, S, 3);
    ctx.fillStyle = '#c9953a';
    for (let i = 3; i < S; i += 8) ctx.fillRect(x + i, y + 4, 1.5, 1.5);
    const glow = 0.3 + 0.2 * Math.sin(t * 5);
    ctx.fillStyle = 'rgba(255,90,60,' + glow.toFixed(3) + ')';
    ctx.fillRect(x, y, 2, S); ctx.fillRect(x + S - 2, y, 2, S);
  }

  function tile(ctx, ch, x, y, t, nb) {
    const X = num(x), Y = num(y), time = num(t), n = nb || {};
    ctx.save();
    ctx.beginPath(); ctx.rect(X, Y, S, S); ctx.clip();
    switch (ch) {
      case '#': tileStone(ctx, X, Y, n); break;
      case '=': tilePlank(ctx, X, Y); break;
      case '^': tileSpikes(ctx, X, Y); break;
      case 'C': tileLantern(ctx, X, Y, time); break;
      case 'X': tileDoor(ctx, X, Y, time); break;
      case 'o': tileGear(ctx, X, Y, time); break;
      case 'h': tileOil(ctx, X, Y, time); break;
      case 'B': tileGrille(ctx, X, Y, time); break;
      default: break;
    }
    ctx.restore();
  }

  /* ---------- foreground: slanted rain, low alpha only ---------- */
  function rainLayer(ctx, cam, time, W, H, n, speed, alpha, lw, dx) {
    ctx.strokeStyle = 'rgba(190,200,235,' + alpha + ')';
    ctx.lineWidth = lw;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = wrap(i * 137.5 - time * speed - cam, W + 60) - 30;
      const y = wrap(i * 71.3 + time * speed * 2.2, H + 40) - 20;
      ctx.moveTo(x + dx, y - dx * 2.2);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  function foreground(ctx, camX, camY, t, W, H) {
    const cx = num(camX), time = num(t);
    ctx.save();
    ctx.lineCap = 'round';
    rainLayer(ctx, cx * 0.3, time, W, H, 64, 380, 0.14, 1, 5);      // far drops: thin, faint
    rainLayer(ctx, cx * 0.6, time, W, H, 34, 520, 0.3, 1.6, 7);     // near drops: longer, brighter
    ctx.restore();
  }

  window.ENV_THEMES.station = { background, tile, foreground };
})();
