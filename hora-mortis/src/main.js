'use strict';
// ============================================================
//  HORA MORTIS — states, menus, replay/rewind, main loop
// ============================================================
const G = {
  state: 'title', li: 0, attempt: 0, deaths: 0, seed: 1, rec: null, rIdx: 0,
  introT: 0, deadT: 0, rwT: 0, rwDur: 0.9, exitT: 0, statsT: 0, titleT: 0, endT: 0,
  stats: null, totals: { time: 0, deaths: 0, kills: 0 }, best: {}, deathLine: '', onDeath: null, onExit: null, hover: -1,
};
const DEATH_LINES = [
  'No. That is not how it was written.',
  'No. The hour has not yet come.',
  'No. It did not happen this way.',
  'No. The verse is not yet sung.',
  'No. Try again, penitent.',
];
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const COARSE = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches && !matchMedia('(pointer: fine)').matches;
try { G.best = JSON.parse(localStorage.getItem('horaMortisBest') || '{}') || {}; } catch (e) { G.best = {}; }
function saveBest() { try { localStorage.setItem('horaMortisBest', JSON.stringify(G.best)); } catch (e) { /* storage unavailable */ } }
const fmtTime = (s) => { const m = Math.floor(s / 60), r = s - m * 60; return `${m}:${r < 10 ? '0' : ''}${r.toFixed(2)}`; };

// ---------- rewind ring buffer (half-res frames) ----------
const RW = { frames: null, idx: 0, count: 0, max: 96, tick: 0 };
function captureFrame() {
  if (!RW.frames) RW.frames = Array.from({ length: RW.max }, () => mkCanvas(W / 2, H / 2));
  if (++RW.tick % 2) return;
  const c = RW.frames[RW.idx], cg = c.getContext('2d');
  cg.imageSmoothingEnabled = true;
  cg.drawImage(low, 0, 0, W / 2, H / 2);
  RW.idx = (RW.idx + 1) % RW.max; RW.count = Math.min(RW.max, RW.count + 1);
}

// ---------- flow ----------
function startVerse(li) {
  G.li = li; G.attempt = 0; G.deaths = 0;
  levelArt(li);
  beginAttempt();
  G.state = 'intro'; G.introT = 0;
}
function beginAttempt() {
  G.attempt++;
  G.seed = (G.li + 1) * 7919 + G.attempt * 104729;
  newWorld(G.li, G.seed);
  G.rec = { li: G.li, seed: G.seed, d: [], p: [], x: [], y: [] };
  RW.count = 0; RW.idx = 0;
  Input.latched = 0; Input.prev = Input.down;
  eyeTrail.length = 0;
}
G.onDeath = () => {
  if (G.state !== 'play') return;
  G.state = 'dead'; G.deadT = 0; G.deaths++; G.totals.deaths++;
  G.deathLine = DEATH_LINES[(G.deaths - 1) % DEATH_LINES.length];
};
G.onExit = () => {
  if (G.state !== 'play') return;
  const w = world;
  G.state = 'exit'; G.exitT = 0;
  G.stats = { time: w.steps / 60, kills: w.kills, deflects: w.deflects, rites: w.rites, deaths: G.deaths, total: w.total };
  G.totals.time += G.stats.time; G.totals.kills += w.kills;
  const key = 'v' + G.li, prev = G.best[key];
  G.stats.record = !prev || G.stats.time < prev;
  if (G.stats.record) { G.best[key] = G.stats.time; saveBest(); }
  Sound.play('toll');
};
function startRewind(dur = 0.9) { G.state = 'rewind'; G.rwT = 0; G.rwDur = dur; Sound.play('rewind'); }
function startReplay() {
  G.state = 'replay'; G.rIdx = 0;
  newWorld(G.rec.li, G.rec.seed);
  eyeTrail.length = 0;
}
function endReplay() { G.state = 'stats'; G.statsT = 0; }
function nextVerse() {
  if (G.li + 1 < VERSES.length) startVerse(G.li + 1);
  else { G.state = 'end'; G.endT = 0; Sound.play('clear'); }
}
function aimWorld() { return [Input.mx + world.cam.x, Input.my + world.cam.y]; }

function onAnyKey(code) {
  Sound.init();
  if (code === 'KeyM') { Sound.toggleMute(); return; }
  if (code === 'KeyF' && G.state !== 'play') return;
  switch (G.state) {
    case 'title': {
      const n = parseInt(code.replace('Digit', ''), 10);
      if (n >= 1 && n <= VERSES.length) { Sound.play('ui'); startVerse(n - 1); break; }
      if (code === 'Mouse0' || code === 'Enter' || code === 'Space') { Sound.play('ui'); startVerse(G.hover >= 0 ? G.hover : 0); }
      break;
    }
    case 'intro':
      if (G.introT > 0.35 && (code === 'Mouse0' || code === 'Enter' || code === 'Space')) { G.state = 'play'; Input.latched = 0; }
      break;
    case 'play':
      if (code === 'KeyR') startRewind(0.45);
      else if (code === 'Escape' || code === 'KeyP') { G.state = 'paused'; Input.clear(); }
      break;
    case 'dead':
      if (G.deadT > 0.3 && code !== 'KeyM') startRewind();
      break;
    case 'replay':
      if (code === 'Mouse0' || code === 'Enter' || code === 'Space' || code === 'Escape') endReplay();
      break;
    case 'stats':
      if (G.statsT > 0.4) nextVerse();
      break;
    case 'paused':
      if (code === 'Escape' || code === 'KeyP' || code === 'Mouse0') { G.state = 'play'; Input.latched = 0; }
      else if (code === 'KeyR') { G.state = 'play'; startRewind(0.45); }
      else if (code === 'KeyT') { G.state = 'title'; }
      break;
    case 'end':
      if (G.endT > 1.2) { G.state = 'title'; G.totals = { time: 0, deaths: 0, kills: 0 }; }
      break;
  }
}

// ---------- fixed-step tick ----------
function tick() {
  switch (G.state) {
    case 'title': G.titleT += STEP; updateTail(TITLE_P, STEP); TITLE_P.t += STEP; break;
    case 'intro': G.introT += STEP; if (G.introT > 2.6) { G.state = 'play'; Input.latched = 0; } break;
    case 'play': case 'dead': case 'exit': {
      const s = Input.sample();
      const [ax, ay] = aimWorld();
      const live = G.state === 'play';
      if (live) { G.rec.d.push(s.down); G.rec.p.push(s.pressed); G.rec.x.push(ax); G.rec.y.push(ay); }
      simStep(world, { down: live ? s.down : 0, pressed: live ? s.pressed : 0, ax, ay });
      if (G.state === 'dead') G.deadT += STEP;
      if (G.state === 'exit') { G.exitT += STEP; if (G.exitT > 1.0) startReplay(); }
      break;
    }
    case 'rewind':
      G.rwT += STEP;
      if (G.rwT >= G.rwDur) { beginAttempt(); G.state = 'play'; }
      break;
    case 'replay': {
      const n = Input.down & B.S ? 3 : 1;
      for (let i = 0; i < n && G.state === 'replay'; i++) {
        if (G.rIdx >= G.rec.d.length) { endReplay(); break; }
        const k = G.rIdx++;
        simStep(world, { down: G.rec.d[k], pressed: G.rec.p[k], ax: G.rec.x[k], ay: G.rec.y[k] });
      }
      break;
    }
    case 'stats': G.statsT += STEP; break;
    case 'end': G.endT += STEP; break;
  }
}

// ---------- title ----------
let ROSE = null;
const TITLE_P = makePlayer(338, 236);
TITLE_P.face = -1;
function buildRose(r) {
  const c = mkCanvas(r * 2 + 6, r * 2 + 6), cg = c.getContext('2d');
  const cx = r + 3, cy = r + 3;
  const pal = ['#b0202c', '#2c4f9c', '#e0a83e', '#6a2a8a', '#c0402a', '#1f6a7a', '#8a1a30'];
  const rings = [0.18, 0.36, 0.58, 0.8, 1.0], secs = [1, 6, 12, 18, 24];
  for (let y = -r - 2; y <= r + 2; y++) for (let x = -r - 2; x <= r + 2; x++) {
    const d = Math.sqrt(x * x + y * y) / r;
    if (d > 1.03) continue;
    let col;
    if (d > 0.97) col = '#3a3036';
    else {
      let ri = 0; while (ri < rings.length - 1 && d > rings[ri]) ri++;
      const inner = ri ? rings[ri - 1] : 0, rr = (d - inner) / (rings[ri] - inner);
      const a = (Math.atan2(y, x) + Math.PI) / TAU, sec = secs[ri], si = Math.floor(a * sec + (ri % 2) * 0.5);
      const lead = (rr < 0.07 || rr > 0.93) && ri > 0 || Math.abs(((a * sec + (ri % 2) * 0.5) % 1) - 0.5) > 0.47 && ri > 0;
      if (lead) col = '#120c10';
      else {
        const base = ri === 0 ? '#f2d48f' : pal[Math.floor(hash2(ri, si, 7) * pal.length)];
        const [rr0, gg0, bb0] = hex(base), k = 0.75 + hash2(x, y, 3) * 0.35 + (1 - d) * 0.25;
        col = `rgb(${clamp(rr0 * k, 0, 255) | 0},${clamp(gg0 * k, 0, 255) | 0},${clamp(bb0 * k, 0, 255) | 0})`;
      }
    }
    cg.fillStyle = col; cg.fillRect(cx + x, cy + y, 1, 1);
  }
  return c;
}
const ash = Array.from({ length: 70 }, () => ({ x: Math.random() * W, y: Math.random() * H, v: 6 + Math.random() * 16, s: Math.random() < 0.25 ? 2 : 1, ph: Math.random() * 6, ember: Math.random() < 0.3 }));
function renderTitle(dtR) {
  if (!ROSE) ROSE = buildRose(66);
  const grd = g.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, '#08060b'); grd.addColorStop(0.65, '#1a0b12'); grd.addColorStop(1, '#060407');
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  // nave arcades
  for (let i = 0; i < 6; i++) {
    const x = 200 + i * 52 - 26, sh = 0.35 + 0.1 * (i % 2);
    g.fillStyle = `rgba(30,18,26,${sh})`;
    g.fillRect(x, 40, 16, 200);
    g.fillStyle = 'rgba(70,50,60,0.25)'; g.fillRect(x + 5, 40, 2, 200);
  }
  const rx = 338, ry = 96;
  drawGlow(g, rx, ry, 150, '#ff8a40', 0.28 + Math.sin(RT * 0.7) * 0.04, true);
  drawGlow(g, rx, ry, 90, '#ffd27a', 0.22, true);
  g.drawImage(ROSE, rx - ROSE.width / 2, ry - ROSE.height / 2);
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 4; i++) {
    const a = 0.25 + Math.sin(RT * 0.5 + i) * 0.06;
    const gr = g.createLinearGradient(0, ry, 0, 250);
    gr.addColorStop(0, `rgba(255,190,110,${a * 0.5})`); gr.addColorStop(1, 'rgba(255,170,90,0)');
    g.fillStyle = gr;
    g.beginPath();
    const w0 = 14 + i * 4, off = (i - 1.5) * 30;
    g.moveTo(rx + off * 0.5 - w0, ry + 20); g.lineTo(rx + off * 0.5 + w0, ry + 20); g.lineTo(rx + off * 1.4 + w0 * 2, 250); g.lineTo(rx + off * 1.4 - w0 * 2, 250);
    g.closePath(); g.fill();
  }
  g.globalCompositeOperation = 'source-over';
  // floor
  g.fillStyle = '#0d080b'; g.fillRect(0, 236, W, H - 236);
  g.fillStyle = '#b98f5a'; g.fillRect(150, 236, 330, 1);
  g.fillStyle = '#4a3428'; g.fillRect(150, 237, 330, 1);
  for (let i = 0; i < 9; i++) {
    const x = 196 + i * 33 + (i % 2) * 6;
    for (let k = 0; k < 3; k++) drawCandle(g, x + k * 3, 236, 4 + ((i * 3 + k * 5) % 7), RT, i * 5 + k);
  }
  // the penitent
  TITLE_P.onGround = true; TITLE_P.vx = 0; TITLE_P.vy = 0;
  drawCape(g, TITLE_P, 0, 0, null);
  drawPlayerBody(g, TITLE_P, 338, 236, null);
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i++) drawGlow(g, 196 + i * 33 + (i % 2) * 6 + 3, 228, 26, '#ff9a40', 0.45 + Math.sin(RT * 8 + i) * 0.05);
  drawGlow(g, TITLE_P._eyeX || 336, TITLE_P._eyeY || 214, 6, '#ffcf6b', 0.9);
  g.globalCompositeOperation = 'source-over';
  for (const a of ash) {
    a.y += a.v * dtR; a.x += Math.sin(RT + a.ph) * 6 * dtR;
    if (a.y > H) { a.y = -4; a.x = Math.random() * W; }
    g.fillStyle = a.ember ? (((RT * 5 + a.ph) | 0) % 2 ? '#ffb347' : '#ff6a1f') : '#8a7f7a';
    g.globalAlpha = a.ember ? 0.8 : 0.45;
    g.fillRect(Math.round(a.x), Math.round(a.y), a.s, a.s);
  }
  g.globalAlpha = 1;
  g.drawImage(VIGNETTE, 0, 0);
  // menu hit boxes (low-res coords)
  G.hover = -1;
  if (Input.mouseSeen) {
    for (let i = 0; i < VERSES.length; i++) { const bx = 40 + i * 26; if (Input.mx > bx - 10 && Input.mx < bx + 12 && Input.my > 208 && Input.my < 226) G.hover = i; }
  }
}
function titleText() {
  const a = clamp(G.titleT / 1.2, 0, 1);
  txt('Hora', 40, 62, 46, F_TITLE, '#ead7b0', 'left', a, 'rgba(160,20,30,0.9)');
  txt('Mortis', 60, 106, 46, F_TITLE, '#ead7b0', 'left', a, 'rgba(160,20,30,0.9)');
  txt('nunc et in hora mortis nostrae', 44, 140, 10, F_FELL, '#b8956a', 'left', a * 0.9);
  const pulse = 0.65 + Math.sin(RT * 3) * 0.35;
  txt(G.hover >= 0 ? `begin at verse ${ROMAN[G.hover]}` : 'click to begin', 42, 186, 13, F_FELLSC, '#f2d48f', 'left', a * pulse, 'rgba(255,140,60,0.6)');
  for (let i = 0; i < VERSES.length; i++) {
    const best = G.best['v' + i];
    txt(ROMAN[i], 40 + i * 26, 217, 11, F_FELLSC, G.hover === i ? '#fff1c0' : best ? '#d9a441' : '#7d6a58', 'center', a);
  }
  txt('verses', 40 + VERSES.length * 26 + 2, 217, 8, F_FELL, '#6d5a4a', 'left', a);
  txt('A D move   W leap   S roll   CLICK strike   SHIFT / RIGHT-CLICK chronos   E last rites   R retry   M mute', W / 2, 258, 5.5, F_PIX, '#8a7660', 'center', a * 0.9);
  if (!Sound.ready) txt('sound begins on your first click', 44, 160, 7, F_FELL, '#6d5a4a', 'left', a * 0.8);
  if (COARSE) txt('best played with a keyboard and mouse', 44, 170, 7, F_FELL, '#9a6a5a', 'left', a * 0.9);
}

// ---------- overlays ----------
function renderRewind() {
  g.fillStyle = '#05040a'; g.fillRect(0, 0, W, H);
  const k = clamp(G.rwT / G.rwDur, 0, 1);
  const n = RW.count;
  if (n > 0) {
    const idx = Math.min(n - 1, Math.floor(easeInOut(k) * (n - 1)));
    const fi = (RW.idx - 1 - idx + RW.max * 2) % RW.max;
    const fr0 = RW.frames[fi];
    g.imageSmoothingEnabled = true;
    for (let y = 0; y < H; y += 4) {
      const off = (Math.random() < 0.08 ? (Math.random() - 0.5) * 30 : 0) + Math.sin(y * 0.13 + RT * 40) * 1.5;
      g.drawImage(fr0, 0, y / 2, W / 2, 2, off, y, W, 4);
    }
    g.imageSmoothingEnabled = false;
  }
  g.globalCompositeOperation = 'saturation'; g.fillStyle = '#808080'; g.globalAlpha = 0.5; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'multiply'; g.fillStyle = '#b0a0d0'; g.globalAlpha = 0.6; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'lighter'; g.fillStyle = '#160a26'; g.globalAlpha = 0.5; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.18})`; g.fillRect(0, (Math.random() * H) | 0, W, 1 + ((Math.random() * 2) | 0)); }
  const by = ((RT * 160) % (H + 30)) - 15;
  g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(0, by, W, 10);
  g.drawImage(GRAIN[(Math.random() * GRAIN.length) | 0], 0, 0);
  g.fillStyle = 'rgba(0,0,0,0.18)'; for (let y = 0; y < H; y += 2) g.fillRect(0, y, W, 1);
  g.drawImage(VIGNETTE, 0, 0);
  // ◀◀ glyph
  g.fillStyle = '#f4ece0';
  const gx = 18, gy = 18;
  for (let i = 0; i < 6; i++) { g.fillRect(gx + 6 - i, gy + i, 1 + 0, 1); g.fillRect(gx + 6 - i, gy + 11 - i, 1, 1); g.fillRect(gx + 6 - i, gy + i, i + 1, 12 - i * 2); g.fillRect(gx + 13 - i, gy + i, i + 1, 12 - i * 2); }
}

// ---------- frame ----------
let last = performance.now(), acc = 0;
function frame(now) {
  const dtR = Math.min(0.1, (now - last) / 1000);
  last = now; RT += dtR;
  acc += dtR;
  let n = 0;
  while (acc >= STEP && n < 5) { acc -= STEP; tick(); n++; }
  if (n >= 5) acc = 0;
  draw(dtR);
  if (Sound.ready) {
    const w = world;
    Sound.setSlow(w && (G.state === 'play' || G.state === 'dead') ? clamp(w.slowK * (w.rite ? 1.2 : 1), 0, 1) : 0);
    Sound.setReplay(G.state === 'replay' || G.state === 'stats' || G.state === 'rewind' ? 1 : 0);
    let tension = 0;
    if (w && G.state === 'play') tension = w.enemies.some((e) => e.alive && e.alerted) ? 1 : 0;
    Sound.setTension(tension);
    Sound.update(dtR);
  }
  requestAnimationFrame(frame);
}
function draw(dtR) {
  for (const m of motes) { m.x += m.vx * dtR; m.y += m.vy * dtR; if (m.y < -2) { m.y = H + 2; m.x = Math.random() * W; } if (m.x < -2) m.x = W + 2; if (m.x > W + 2) m.x = -2; }
  const st = G.state;
  if (st === 'title') {
    renderTitle(dtR);
    drawHUD(null); drawCursor('menu');
    present(0);
    titleText();
    return;
  }
  if (st === 'end') {
    renderTitle(dtR);
    g.fillStyle = 'rgba(4,2,5,0.7)'; g.fillRect(0, 0, W, H);
    drawHUD(null); drawCursor('menu');
    present(0);
    const a = clamp(G.endT / 1.5, 0, 1);
    txt('Amen.', W / 2, 78, 44, F_TITLE, '#ead7b0', 'center', a, 'rgba(160,20,30,0.9)');
    txt('nunc et in hora mortis nostrae', W / 2, 116, 12, F_FELL, '#b8956a', 'center', a);
    txt(`five verses sung   ${fmtTime(G.totals.time)}   ${G.totals.kills} slain   ${G.totals.deaths} deaths`, W / 2, 150, 8, F_FELLSC, '#d9a441', 'center', a);
    txt('click to return to the beginning', W / 2, 200, 9, F_FELLSC, '#f2d48f', 'center', a * (0.6 + Math.sin(RT * 3) * 0.4));
    return;
  }
  if (st === 'rewind') {
    renderRewind();
    drawHUD(null);
    present(0.9);
    txt('rewinding the hour', W - 18, 24, 8, F_PIX, '#f4ece0', 'right', 0.85);
    return;
  }
  const w = world;
  const mode = st === 'replay' || st === 'stats' ? 'replay' : 'play';
  renderWorld(w, mode);
  if (mode === 'replay') filmFilter(0.9);
  if (st === 'exit') { g.globalAlpha = clamp(G.exitT / 0.9, 0, 1); g.fillStyle = '#fff3d8'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  if (st === 'play' || st === 'dead') captureFrame();
  drawHUD(w, st === 'play' || st === 'paused' ? 'play' : 'none');
  if (st === 'play' || st === 'paused' || st === 'intro') drawCursor('play');
  const ca = (st === 'play' || st === 'dead') ? Math.max(w.slowK * 0.9, w.flash, w.p.dead ? 0.7 : 0) : st === 'replay' ? 0.3 : 0;
  present(ca, st === 'play' || st === 'replay' ? w.zoom : 0);
  // ---- text layers ----
  const cx = w._cx, cy = w._cy;
  if (st === 'play' || st === 'intro' || st === 'dead') {
    for (const h of w.lvl.hints) {
      const sx = h.x - cx, sy = h.y - cy;
      if (sx < -260 || sx > W + 20 || sy < -10 || sy > H + 10) continue;
      const d = Math.abs(w.p.x - (h.x + 70)) + Math.abs(w.p.y - h.y) * 0.5;
      txt(h.text, sx, sy, 6.5, F_PIX, '#ead7b0', 'left', clamp(1.5 - d / 200, 0, 0.9));
    }
  }
  if (st === 'play' || st === 'dead' || st === 'replay') {
    for (const f of w.floats) txt(f.text, f.x - cx, f.y - cy, 7.5, F_FELLSC, f.col, 'center', Math.min(1, (f.life / f.max) * 2.5), 'rgba(120,10,20,0.9)');
  }
  if (st === 'play' || st === 'paused') {
    const v = VERSES[G.li];
    txt(`${ROMAN[G.li]} · ${v.name}`, W - 10, 24, 8, F_FELLSC, '#b8956a', 'right', 0.75);
    txt(fmtTime(w.steps / 60), W - 10, 34, 6.5, F_PIX, '#8a7660', 'right', 0.7);
    if (w.fervour >= 100 && !w.rite) txt('E  the last rites', 86, 21, 6, F_PIX, '#ff7a6a', 'left', 0.6 + Math.sin(RT * 6) * 0.4);
    if (w.rite && w.rite.phase === 'mark') {
      txt(w.rite.marks.length ? `${w.rite.marks.length} condemned · release E` : 'sweep the cursor across the condemned', W / 2, H - 14, 8, F_FELLSC, '#ff9a8a', 'center', 0.9);
    }
    if (w.clearT > 0.6 && !w.exited) txt('the door is open', W / 2, H - 16, 9, F_FELLSC, '#f2d48f', 'center', clamp((w.clearT - 0.6) * 2, 0, 1) * (0.7 + Math.sin(RT * 4) * 0.3));
  }
  if (st === 'intro') {
    const k = G.introT, a = clamp(Math.min(k / 0.4, (2.6 - k) / 0.5), 0, 1);
    ctx.fillStyle = `rgba(3,2,4,${clamp((2.3 - k) / 0.6, 0, 0.82)})`;
    ctx.fillRect(0, 0, view.cw, view.ch);
    txt(`Verse ${ROMAN[G.li]}`, W / 2, 98, 16, F_TITLE, '#c9a46a', 'center', a);
    txt(VERSES[G.li].name, W / 2, 128, 22, F_FELLSC, '#ead7b0', 'center', a, 'rgba(150,20,30,0.8)');
    txt(VERSES[G.li].latin, W / 2, 152, 9, F_FELL, '#9a7d5a', 'center', a * 0.9);
  }
  if (st === 'dead') {
    const a = clamp(G.deadT / 0.25, 0, 1);
    txt(G.deathLine, W / 2, H / 2 - 8, 15, F_FELL, '#f1e2c4', 'center', a, 'rgba(180,10,20,0.9)');
    if (G.deadT > 0.3) txt('click to rewind', W / 2, H / 2 + 14, 7, F_PIX, '#d9a441', 'center', 0.55 + Math.sin(RT * 5) * 0.35);
  }
  if (st === 'replay' || st === 'stats') {
    txt(`Verse ${ROMAN[G.li]}  as it was written`, 14, 18, 9, F_FELLSC, '#f1e2c4', 'left', 0.85);
    if (((RT * 2) | 0) % 2 === 0 && st === 'replay') txt('▶', 14, 32, 8, F_PIX, '#f1e2c4', 'left', 0.8);
    if (st === 'replay') txt('click to continue   hold shift to hasten', W - 12, H - 12, 6, F_PIX, '#e8d6b0', 'right', 0.7);
  }
  if (st === 'stats') {
    const a = clamp(G.statsT / 0.4, 0, 1), s = G.stats;
    ctx.fillStyle = `rgba(6,3,5,${0.72 * a})`; ctx.fillRect(0, 0, view.cw, view.ch);
    txt('So it was written.', W / 2, 74, 22, F_FELL, '#ead7b0', 'center', a, 'rgba(160,20,30,0.8)');
    txt(VERSES[G.li].name, W / 2, 100, 10, F_FELLSC, '#b8956a', 'center', a);
    const rows = [['time', fmtTime(s.time) + (s.record ? '   new best' : '')], ['slain', `${s.kills} of ${s.total}`], ['blood returned', String(s.deflects)], ['last rites', String(s.rites)], ['deaths', String(s.deaths)]];
    rows.forEach(([k2, v2], i) => {
      txt(k2, W / 2 - 8, 128 + i * 14, 8, F_FELLSC, '#9a7d5a', 'right', a);
      txt(v2, W / 2 + 8, 128 + i * 14, 8, F_PIX, i === 0 && s.record ? '#ffd27a' : '#ead7b0', 'left', a);
    });
    txt(G.li + 1 < VERSES.length ? 'click for the next verse' : 'click to end the hour', W / 2, 212, 9, F_FELLSC, '#f2d48f', 'center', a * (0.6 + Math.sin(RT * 3) * 0.4));
  }
  if (st === 'paused') {
    ctx.fillStyle = 'rgba(4,2,5,0.7)'; ctx.fillRect(0, 0, view.cw, view.ch);
    txt('Paused', W / 2, 100, 28, F_TITLE, '#ead7b0', 'center', 1, 'rgba(160,20,30,0.8)');
    txt('ESC  resume      R  restart verse      T  title      M  mute', W / 2, 140, 7, F_PIX, '#d9a441', 'center', 0.9);
  }
}

// ---------- boot ----------
function boot(data) {
  resize();
  window.addEventListener('resize', resize);
  bindInput(screenCv, onAnyKey);
  document.addEventListener('visibilitychange', () => { if (document.hidden && G.state === 'play') { G.state = 'paused'; Input.clear(); } });
  if (data && typeof data.li === 'number' && data.state === 'play') { startVerse(clamp(data.li, 0, VERSES.length - 1)); }
  window.claude?.hot?.snapshot?.(() => ({ li: G.li, state: G.state === 'title' ? 'title' : 'play' }));
  requestAnimationFrame((t) => { last = t; requestAnimationFrame(frame); });
}
window.__HM = { G, get world() { return world; }, startVerse, simStep, Input, LEVELS, levelArt };
window.claude?.hot?.ready ? window.claude.hot.ready(boot) : boot(window.claude?.hot?.data ?? {});
