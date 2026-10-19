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
const INTRO_CARD = ['window2', 'window1', 'window3', 'window4', 'window5']; // stained glass shown before each verse
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
      if (G.endT < 6.2) G.endT = 6.2; // first click finishes the camera tilt
      else if (G.endT > 7.2) { G.state = 'title'; G.totals = { time: 0, deaths: 0, kills: 0 }; }
      break;
  }
}

// ---------- fixed-step tick ----------
function tick() {
  switch (G.state) {
    case 'title': G.titleT += STEP; break;
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
const ash = Array.from({ length: 70 }, () => ({ x: Math.random() * W, y: Math.random() * H, v: 6 + Math.random() * 16, s: Math.random() < 0.25 ? 2 : 1, ph: Math.random() * 6, ember: Math.random() < 0.3 }));
function renderTitle(dtR) {
  g.fillStyle = '#05030a'; g.fillRect(0, 0, W, H);
  const ti = IMG.title, M = ASSET_META.title, tx = W - ti.width;
  g.drawImage(ti, tx, 0);
  const gr = g.createLinearGradient(tx, 0, tx + 64, 0);
  gr.addColorStop(0, '#05030a'); gr.addColorStop(1, 'rgba(5,3,10,0)');
  g.fillStyle = gr; g.fillRect(tx, 0, 64, H);
  drawGlow(g, tx + 225, 46, 84, '#ff7040', 0.14 + Math.sin(RT * 0.8) * 0.05, true);
  for (let i = 0; i < M.flames.length; i++) {
    const [fx, fy] = M.flames[i];
    if (fy < 150) continue;
    drawGlow(g, tx + fx, fy, 6, '#ffb347', 0.28 + Math.sin(RT * 9 + i * 1.7) * 0.12);
  }
  for (const a of ash) {
    a.y += a.v * dtR; a.x += Math.sin(RT + a.ph) * 6 * dtR;
    if (a.y > H) { a.y = -4; a.x = Math.random() * W; }
    g.fillStyle = a.ember ? (((RT * 5 + a.ph) | 0) % 2 ? '#ffb347' : '#ff6a1f') : '#8a7f7a';
    g.globalAlpha = a.ember ? 0.8 : 0.45;
    g.fillRect(Math.round(a.x), Math.round(a.y), a.s, a.s);
  }
  g.globalAlpha = 1;
  g.drawImage(IMG.logo, 26, 4);
  g.drawImage(VIGNETTE, 0, 0);
  G.hover = -1;
  if (Input.mouseSeen) {
    for (let i = 0; i < VERSES.length; i++) { const bx = 40 + i * 26; if (Input.mx > bx - 10 && Input.mx < bx + 12 && Input.my > 214 && Input.my < 234) G.hover = i; }
  }
}
function titleText() {
  const a = clamp(G.titleT / 1.2, 0, 1);
  txt('nunc et in hora mortis nostrae', 40, 178, 10, F_FELL, '#b8956a', 'left', a * 0.9);
  const pulse = 0.65 + Math.sin(RT * 3) * 0.35;
  txt(G.hover >= 0 ? `begin at verse ${ROMAN[G.hover]}` : 'click to begin', 40, 201, 13, F_FELLSC, '#f2d48f', 'left', a * pulse, 'rgba(255,140,60,0.6)');
  for (let i = 0; i < VERSES.length; i++) {
    const best = G.best['v' + i];
    txt(ROMAN[i], 40 + i * 26, 224, 11, F_FELLSC, G.hover === i ? '#fff1c0' : best ? '#d9a441' : '#7d6a58', 'center', a);
  }
  txt('verses', 40 + VERSES.length * 26 + 2, 224, 8, F_FELL, '#6d5a4a', 'left', a);
  if (!Sound.ready) txt('sound begins on your first click', 40, 242, 6.5, F_FELL, '#6d5a4a', 'left', a * 0.8);
  txt('A D move   W leap   S roll   CLICK strike   SHIFT / RIGHT-CLICK chronos   E last rites   R retry   M mute', W / 2, 260, 5.5, F_PIX, '#8a7660', 'center', a * 0.9);
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
    // the camera rises from the kneeling penitent to the shattered window at dawn
    const im = IMG.ending;
    const k = easeInOut(clamp(G.endT / 7, 0, 1));
    const y = Math.round(-(1 - k) * (im.height - H));
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    g.drawImage(im, 0, y);
    drawGlow(g, 305, 129 + y, 110, '#ffd890', 0.16 + Math.sin(RT * 0.7) * 0.05, true);
    g.fillStyle = '#ffe8c0';
    for (const m of motes) { g.globalAlpha = m.a * 0.8; g.fillRect(Math.round(m.x), Math.round(m.y), m.s, m.s); }
    g.globalAlpha = 1;
    g.drawImage(VIGNETTE, 0, 0);
    const a = clamp((G.endT - 6.2) / 1.5, 0, 1);
    if (a > 0) {
      const gr = g.createLinearGradient(0, 0, 0, 120);
      gr.addColorStop(0, `rgba(10,6,4,${0.6 * a})`); gr.addColorStop(1, 'rgba(10,6,4,0)');
      g.fillStyle = gr; g.fillRect(0, 0, W, 120);
      g.fillStyle = `rgba(6,3,5,${0.6 * a})`; g.fillRect(0, H - 34, W, 34);
    }
    drawHUD(null); drawCursor('menu');
    present(0);
    txt('Amen.', W / 2, 44, 40, F_TITLE, '#ead7b0', 'center', a, 'rgba(160,20,30,0.9)');
    txt('nunc et in hora mortis nostrae', W / 2, 78, 11, F_FELL, '#f1e2c4', 'center', a);
    txt(`five verses sung   ${fmtTime(G.totals.time)}   ${G.totals.kills} slain   ${G.totals.deaths} deaths`, W / 2, 96, 8, F_FELLSC, '#f2d48f', 'center', a);
    txt('click to return to the beginning', W / 2, H - 16, 9, F_FELLSC, '#f2d48f', 'center', a * (0.6 + Math.sin(RT * 3) * 0.4));
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
  if (st === 'intro') {
    const k = G.introT, a = clamp((2.35 - k) / 0.55, 0, 1);
    g.globalAlpha = a; g.fillStyle = '#040206'; g.fillRect(0, 0, W, H);
    const im = IMG[INTRO_CARD[G.li]];
    const x = Math.round(112 - im.width / 2), y = Math.round((H - im.height) / 2);
    drawGlow(g, x + im.width / 2, y + im.height * 0.45, 120, '#ff9a50', 0.22, true);
    g.drawImage(im, x, y);
    g.globalAlpha = 1;
  }
  const statsA = st === 'stats' ? clamp(G.statsT / 0.4, 0, 1) : 0;
  if (st === 'stats') { g.fillStyle = `rgba(6,3,5,${0.72 * statsA})`; g.fillRect(0, 0, W, H); }
  if (st === 'paused') { g.fillStyle = 'rgba(4,2,5,0.7)'; g.fillRect(0, 0, W, H); }
  drawHUD(w, st === 'play' || st === 'paused' ? 'play' : 'none');
  if (st === 'stats') {
    hg.globalAlpha = statsA;
    drawPanel(W / 2 - 140, 46, 280, 180);
    hg.drawImage(IMG.ui_seal, Math.round(W / 2 - IMG.ui_seal.width / 2), 214);
    hg.globalAlpha = 1;
  }
  if (st === 'paused') drawPanel(W / 2 - 148, 66, 296, 98);
  if (st === 'play' || st === 'paused' || st === 'intro') drawCursor('play');
  const ca = (st === 'play' || st === 'dead') ? Math.max(w.slowK * 0.9, w.flash, w.p.dead ? 0.7 : 0) : st === 'replay' ? 0.3 : 0;
  present(ca, st === 'play' || st === 'replay' ? w.zoom : 0);
  // ---- text layers ----
  const cx = w._cx, cy = w._cy;
  if (st === 'play' || st === 'dead' || (st === 'intro' && G.introT > 2.2)) {
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
    if (w.fervour >= 100 && !w.rite) txt('E  the last rites', 86, 32, 6, F_PIX, '#ff7a6a', 'left', 0.6 + Math.sin(RT * 6) * 0.4);
    if (w.rite && w.rite.phase === 'mark') {
      txt(w.rite.marks.length ? `${w.rite.marks.length} condemned · release E` : 'sweep the cursor across the condemned', W / 2, H - 14, 8, F_FELLSC, '#ff9a8a', 'center', 0.9);
    }
    if (w.clearT > 0.6 && !w.exited) txt('the door is open', W / 2, H - 16, 9, F_FELLSC, '#f2d48f', 'center', clamp((w.clearT - 0.6) * 2, 0, 1) * (0.7 + Math.sin(RT * 4) * 0.3));
  }
  if (st === 'intro') {
    const k = G.introT, a = clamp(Math.min(k / 0.4, (2.6 - k) / 0.5), 0, 1);
    txt(`Verse ${ROMAN[G.li]}`, 330, 100, 16, F_TITLE, '#c9a46a', 'center', a);
    txt(VERSES[G.li].name, 330, 130, 20, F_FELLSC, '#ead7b0', 'center', a, 'rgba(150,20,30,0.8)');
    txt(VERSES[G.li].latin, 330, 154, 9, F_FELL, '#9a7d5a', 'center', a * 0.9);
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
    const a = statsA, s = G.stats;
    txt('So it was written.', W / 2, 74, 22, F_FELL, '#ead7b0', 'center', a, 'rgba(160,20,30,0.8)');
    txt(VERSES[G.li].name, W / 2, 100, 10, F_FELLSC, '#b8956a', 'center', a);
    const rows = [['time', fmtTime(s.time) + (s.record ? '   new best' : '')], ['slain', `${s.kills} of ${s.total}`], ['blood returned', String(s.deflects)], ['last rites', String(s.rites)], ['deaths', String(s.deaths)]];
    rows.forEach(([k2, v2], i) => {
      txt(k2, W / 2 - 8, 128 + i * 14, 8, F_FELLSC, '#9a7d5a', 'right', a);
      txt(v2, W / 2 + 8, 128 + i * 14, 8, F_PIX, i === 0 && s.record ? '#ffd27a' : '#ead7b0', 'left', a);
    });
    txt(G.li + 1 < VERSES.length ? 'click for the next verse' : 'click to end the hour', W / 2, 250, 9, F_FELLSC, '#f2d48f', 'center', a * (0.6 + Math.sin(RT * 3) * 0.4));
  }
  if (st === 'paused') {
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
const assetsReady = loadAssets();
window.__HM = { G, get world() { return world; }, startVerse, simStep, Input, LEVELS, levelArt, ready: assetsReady };
const start = (data) => assetsReady.then(() => boot(data));
window.claude?.hot?.ready ? window.claude.hot.ready(start) : start(window.claude?.hot?.data ?? {});
