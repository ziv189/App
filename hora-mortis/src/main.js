'use strict';
// ============================================================
//  HORA MORTIS — the hour's order: menus, confessions, verses,
//  replay/rewind, saving, and the main loop
// ============================================================
const G = {
  state: 'title', li: 0, attempt: 0, deaths: 0, seed: 1, rec: null, rIdx: 0,
  introT: 0, deadT: 0, rwT: 0, rwDur: 0.9, exitT: 0, statsT: 0, titleT: 0, endT: 0,
  stats: null, totals: { time: 0, deaths: 0, kills: 0 }, best: {}, deathLine: '', onDeath: null, onExit: null, onRelic: null,
  mode: 'pilgrim', checkpoint: null, ckDead: 0, verseTime: 0,
  story: { refused: 0, took: 0, last: '' }, step: 0, reached: 0, campaign: true, sandNext: '', introSeen: {}, beads: [],
  menu: 'main', sel: 0, hover: -1, endKind: 'released', creditsT: 0,
};
const CAMPAIGN = [
  { cine: 'prologue' }, { conf: 'conf0' }, { verse: 0 }, { conf: 'conf1' }, { verse: 1 }, { conf: 'conf2' }, { verse: 2 }, { verse: 3 },
  { card: 'toll' }, { conf: 'conf3' }, { verse: 4 }, { conf: 'conf4' }, { verse: 5 }, { conf: 'conf5' }, { verse: 6 }, { conf: 'conf6' },
  { verse: 7 }, { verse: 8 }, { cine: 'vision' }, { verse: 9 }, { conf: 'conf7' }, { verse: 10 }, { ending: true },
];
const verseStep = (li) => CAMPAIGN.findIndex((s) => s.verse === li);
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
const bestKey = (li) => 'v' + li + (G.mode === 'penitent' ? 'p' : '');
const DEATH_LINES = [
  'No. That is not how it was written.',
  'No. The hour has not yet come.',
  'No. It did not happen this way.',
  'No. The verse is not yet sung.',
  'No. Try again, child.',
];
const CAUSE_LINES = {
  burn: 'No. The light does not burn the faithful.', fire: 'No. Holy water does not burn the hand that throws it.',
  pendulum: 'No. The pendulum swung, and missed.', blast: 'No. The fire never reached you.', spikes: 'No. You stepped over them.',
  cleave: 'No. The bell did not ring for you.', charge: 'No. The bell did not ring for you.', slam: 'No. The bell did not ring for you.', wave: 'No. You leapt the toll.', debris: 'No. The stone fell beside you.',
  embrace: 'No. She did not hold you. You knelt.', tears: 'No. Her tears did not touch you.', thorns: 'No. The thorns did not take root.',
  hands: 'No. The clock did not strike you.', crush: 'No. It fell behind you.', cherub: 'No. You saw it fall.',
};
const fmtTime = (s) => { const m = Math.floor(s / 60), r = s - m * 60; return `${m}:${r < 10 ? '0' : ''}${r.toFixed(2)}`; };

// ---------- saving ----------
const SAVE_KEY = 'horaMortisSave';
function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ step: G.step, reached: G.reached, story: G.story, mode: G.mode, beads: G.beads, totals: G.totals, sandNext: G.sandNext }));
    localStorage.setItem('horaMortisBest', JSON.stringify(G.best));
  } catch (e) { /* storage unavailable */ }
}
function loadGame() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (s) {
      G.step = s.step | 0; G.reached = Math.max(s.reached | 0, G.step); G.story = Object.assign({ refused: 0, took: 0, last: '' }, s.story || {});
      G.mode = s.mode === 'penitent' ? 'penitent' : 'pilgrim'; G.beads = Array.isArray(s.beads) ? s.beads : []; G.totals = s.totals || G.totals; G.sandNext = s.sandNext || '';
    }
    G.best = JSON.parse(localStorage.getItem('horaMortisBest') || '{}') || {};
  } catch (e) { /* storage unavailable */ }
}
loadGame();
const hasSave = () => G.step > 0 && G.step < CAMPAIGN.length;

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

// ---------- the campaign ----------
function newHour() {
  G.step = 0; G.reached = 0; G.story = { refused: 0, took: 0, last: '' }; G.beads = []; G.sandNext = '';
  G.totals = { time: 0, deaths: 0, kills: 0 }; G.introSeen = {};
  G.campaign = true;
  runStep();
}
function runStep() {
  G.reached = Math.max(G.reached, G.step);
  saveGame();
  const s = CAMPAIGN[G.step];
  if (!s) { G.state = 'title'; G.menu = 'main'; return; }
  const next = () => { G.step++; runStep(); };
  if (s.cine) startTalk('cine', s.cine, next);
  else if (s.conf) startTalk('conf', s.conf, next);
  else if (s.card) startTalk('card', s.card, next);
  else if (s.verse !== undefined) startVerse(s.verse);
  else if (s.ending) {
    G.endKind = G.story.refused >= 3 ? 'released' : 'kept';
    startTalk('cine', G.endKind, () => { G.state = 'end'; G.endT = 0; G.step = CAMPAIGN.length; saveGame(); Sound.play(G.endKind === 'released' ? 'clear' : 'toll'); });
  }
}
function startTalk(kind, id, then) { G.state = 'talk'; Input.clear(); Talk.start(kind, id, then); }

// ---------- verses ----------
function startVerse(li) {
  G.li = li; G.attempt = 0; G.deaths = 0;
  G.checkpoint = null; G.ckDead = 0; G.verseTime = 0;
  levelArt(li);
  beginAttempt();
  G.state = 'intro'; G.introT = 0;
}
function prepWorld(r) {
  MODE = r.mode;
  newWorld(r.li, r.seed);
  const w = world;
  w.sandRegen = r.sandRegen; w.introSeen = r.introSeen;
  w.fervour = Math.min(100, w.fervour + r.bonus);
  applyCheckpoint(w, r.ckpt);
  eyeTrail.length = 0; bladeTrail.length = 0;
}
function beginAttempt() {
  G.attempt++;
  G.seed = (G.li + 1) * 7919 + G.attempt * 104729;
  const sandRegen = G.campaign ? (G.sandNext === 'took' ? 1.7 : G.sandNext === 'refused' ? 0.55 : 1) : 1;
  G.rec = { li: G.li, seed: G.seed, mode: G.mode, ckpt: G.checkpoint, sandRegen, bonus: G.beads.length * 4, introSeen: !!G.introSeen[G.li], d: [], p: [], x: [], y: [] };
  prepWorld(G.rec);
  RW.count = 0; RW.idx = 0;
  Input.latched = 0; Input.prev = Input.down;
}
G.onDeath = (cause) => {
  if (G.state !== 'play') return;
  G.state = 'dead'; G.deadT = 0; G.deaths++; G.totals.deaths++;
  if (world.boss && world.boss.awake) G.introSeen[G.li] = true;
  if (G.mode === 'pilgrim') G.verseTime += world.steps / 60; // a pilgrimage is timed whole; a penitent's run must be clean
  G.deathLine = CAUSE_LINES[cause] || DEATH_LINES[(G.deaths - 1) % DEATH_LINES.length];
  if (world.boss && world.boss.type === 'confessor' && !CAUSE_LINES[cause]) G.deathLine = 'No. That is not how it happens.';
};
G.onExit = () => {
  if (G.state !== 'play') return;
  const w = world;
  G.state = 'exit'; G.exitT = 0;
  const slain = w.enemies.filter((e) => !e.alive).length;
  G.stats = { time: G.verseTime + w.steps / 60, kills: slain, deflects: w.deflects, rites: w.rites, parries: w.parries, deaths: G.deaths, total: w.enemies.length, beads: w.beadGot.length };
  G.totals.time += G.stats.time; G.totals.kills += slain;
  for (const n of w.beadGot) if (!G.beads.includes(n)) G.beads.push(n);
  const key = bestKey(G.li), prev = G.best[key];
  G.stats.record = !prev || G.stats.time < prev;
  G.stats.rank = G.deaths === 0 ? 'Sanctus' : G.deaths <= 2 ? 'Beatus' : G.deaths <= 6 ? 'Fidelis' : 'Peccator';
  if (G.stats.record) G.best[key] = G.stats.time;
  saveGame();
  Sound.play('toll');
};
G.onRelic = (id) => {
  if (G.state !== 'play') return;
  if (G.mode === 'pilgrim') maybeCheckpoint(true);
  G.state = 'talk'; Input.clear();
  Talk.start('card', id, () => { G.state = 'play'; Input.latched = 0; Input.prev = Input.down; });
};
function startRewind(dur = 0.9) { G.state = 'rewind'; G.rwT = 0; G.rwDur = dur; Sound.play('rewind'); }
function startReplay() { G.state = 'replay'; G.rIdx = 0; prepWorld(G.rec); }
function endReplay() { G.state = 'stats'; G.statsT = 0; }
function finishVerse() {
  G.sandNext = '';
  if (G.campaign) { G.step++; runStep(); }
  else { G.state = 'title'; G.menu = 'verses'; }
}
function aimWorld() { return [Input.mx + world.cam.x, Input.my + world.cam.y]; }
// Pilgrim: once the foes nearby are slain and you stand on firm ground, the verse remembers.
function baseCk(w, x, y) {
  const p = w.p;
  return {
    x, y, face: p.face, fervour: w.fervour, kills: w.kills, deflects: w.deflects, rites: w.rites, parries: w.parries, item: p.item,
    dead: w.enemies.map((e, i) => (e.alive || i >= w.total ? -1 : i)).filter((i) => i >= 0),
    chans: w.chans.map((c, i) => ({ i, x: c.x, y: c.y, s: c.state })).filter((c) => c.s !== 'hang'),
    doors: w.doors.map((d, i) => (d.isOpen ? i : -1)).filter((i) => i >= 0),
    weak: w.weak.map((q, i) => (q.broken ? i : -1)).filter((i) => i >= 0),
    items: w.items.map((q, i) => (q.got ? i : -1)).filter((i) => i >= 0),
    relics: w.relics.filter((r) => r.got).map((r) => r.id), beads: w.beadGot.slice(),
    talks: w.npcs.filter((n) => n.talked).map((n) => n.id), trig: Object.keys(w.trig),
  };
}
function maybeCheckpoint(force) {
  if (G.mode !== 'pilgrim') return;
  const w = world, p = w.p, b = w.boss;
  if (p.dead || w.rite || w.exited) return;
  if (b && b.awake) {
    if (b.dead || b.state === 'intro' || (G.checkpoint && G.checkpoint.boss && G.checkpoint.boss.phase >= b.phase)) return;
    const tr = w.lvl.triggers.find((t) => t.id === b.type + '_intro');
    const x = tr ? tr.x + tr.w / 2 : w.lvl.spawn.x;
    const y = (tr && floorBelow(w.lvl, x, tr.y + 4, 400)) || w.lvl.spawn.y;
    G.checkpoint = baseCk(w, x, y);
    G.checkpoint.boss = { phase: b.phase, hp: b.hp };
    G.checkpoint.item = null;
    floatText(w, p.x, p.y - 38, 'the verse remembers', '#f2d48f');
    return;
  }
  const dead = w.enemies.reduce((n, e, i) => n + (e.alive || i >= w.total ? 0 : 1), 0);
  if (!force && dead <= G.ckDead) return;
  if (!p.onGround || p.rollT > 0 || p.zip || p.plunge) return;
  if (w.enemies.some((e) => e.alive && e.alerted && dist(e.x, e.y, p.x, p.y) < 240)) return;
  if (w.bolts.some((q) => q.owner === 'enemy') || w.chans.some((c) => c.state === 'fall') || w.blasts.length || w.fires.length) return;
  if (w.enemies.some((e, i) => i < w.total && e.alive && dist(w.lvl.ents[i].x, w.lvl.ents[i].y, p.x, p.y) < 110)) return; // a foe would wake beside you
  if (w.beams.some((q) => Math.abs(q.x - p.x) < 24) || w.pends.some((q) => Math.abs(q.px - p.x) < 60 && Math.abs(q.py + q.len - p.y) < 60)) return;
  if (w.planks.some((q) => Math.abs(q.tx * T + 8 - p.x) < 20 && Math.abs(q.ty * T - p.y) < 4)) return;
  G.checkpoint = baseCk(w, p.x, p.y);
  G.ckDead = dead;
  floatText(w, p.x, p.y - 38, 'the verse remembers', '#f2d48f');
}

// ---------- menus ----------
function menuItems() {
  if (G.menu === 'verses') {
    const out = VERSES.map((v, i) => ({ id: 'v' + i, li: i, label: `${ROMAN[i]}   ${v.name}`, locked: verseStep(i) > G.reached }));
    out.push({ id: 'back', label: 'back' });
    return out;
  }
  const out = [];
  if (hasSave()) out.push({ id: 'continue', label: 'Continue the hour' });
  out.push({ id: 'new', label: hasSave() ? 'Begin the hour anew' : 'Begin the hour' });
  out.push({ id: 'verses', label: 'Verses' });
  out.push({ id: 'mode', label: G.mode === 'pilgrim' ? 'Pilgrim' : 'Penitent' });
  return out;
}
function menuPick(it) {
  if (!it || it.locked) return;
  Sound.play('ui');
  if (it.id === 'continue') { G.campaign = true; runStep(); }
  else if (it.id === 'new') newHour();
  else if (it.id === 'verses') { G.menu = 'verses'; G.sel = 0; }
  else if (it.id === 'back') { G.menu = 'main'; G.sel = 0; }
  else if (it.id === 'mode') { G.mode = G.mode === 'pilgrim' ? 'penitent' : 'pilgrim'; saveGame(); }
  else if (it.li !== undefined) { G.campaign = false; startVerse(it.li); }
}

function onAnyKey(code) {
  Sound.init();
  if (code === 'KeyM') { Sound.toggleMute(); return; }
  switch (G.state) {
    case 'title': {
      const items = menuItems();
      if (code === 'KeyW' || code === 'ArrowUp') { G.sel = (G.sel + items.length - 1) % items.length; Sound.play('ui'); break; }
      if (code === 'KeyS' || code === 'ArrowDown') { G.sel = (G.sel + 1) % items.length; Sound.play('ui'); break; }
      if (code === 'Escape' && G.menu === 'verses') { G.menu = 'main'; G.sel = 0; break; }
      if (code === 'Mouse0') { if (G.hover >= 0) menuPick(items[G.hover]); break; }
      if (code === 'Enter' || code === 'Space') menuPick(items[G.sel]);
      break;
    }
    case 'talk': Talk.press(code); break;
    case 'intro':
      if (G.introT > 0.35 && (code === 'Mouse0' || code === 'Enter' || code === 'Space')) { G.state = 'play'; Input.latched = 0; }
      break;
    case 'play':
      if (code === 'KeyR') { if (G.mode === 'pilgrim') G.verseTime += world.steps / 60; startRewind(0.45); }
      else if (code === 'Escape' || code === 'KeyP') { G.state = 'paused'; Input.clear(); }
      break;
    case 'dead':
      if (G.deadT > 0.3 && code !== 'KeyM') startRewind();
      break;
    case 'replay':
      if (code === 'Mouse0' || code === 'Enter' || code === 'Space' || code === 'Escape') endReplay();
      break;
    case 'stats':
      if (G.statsT > 0.4) finishVerse();
      break;
    case 'paused':
      if (code === 'Escape' || code === 'KeyP' || code === 'Mouse0') { G.state = 'play'; Input.latched = 0; }
      else if (code === 'KeyR') { G.checkpoint = null; G.ckDead = 0; G.verseTime = 0; G.state = 'play'; startRewind(0.45); }
      else if (code === 'KeyT') { G.state = 'title'; G.menu = 'main'; G.sel = 0; saveGame(); }
      break;
    case 'end':
      if (G.endT < 6.2) G.endT = 6.2; // first click finishes the camera tilt
      else if (G.endT > 7.2) { G.state = 'credits'; G.creditsT = 0; }
      break;
    case 'credits':
      if (G.creditsT > 2) { G.state = 'title'; G.menu = 'main'; G.sel = 0; }
      break;
  }
}

// ---------- fixed-step tick ----------
function tick() {
  switch (G.state) {
    case 'title': G.titleT += STEP; break;
    case 'talk': Talk.update(STEP); break;
    case 'intro': G.introT += STEP; if (G.introT > 2.8) { G.state = 'play'; Input.latched = 0; } break;
    case 'play': case 'dead': case 'exit': {
      const s = Input.sample();
      const [ax, ay] = aimWorld();
      const live = G.state === 'play';
      if (live) { G.rec.d.push(s.down); G.rec.p.push(s.pressed); G.rec.x.push(ax); G.rec.y.push(ay); }
      simStep(world, { down: live ? s.down : 0, pressed: live ? s.pressed : 0, ax, ay });
      if (G.state === 'play') maybeCheckpoint();
      if (G.state === 'dead') G.deadT += STEP;
      if (G.state === 'exit') {
        G.exitT += STEP;
        if (G.exitT > 1.0) { if (VERSES[G.li].boss === 'confessor') finishVerse(); else startReplay(); }
      }
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
    case 'credits': G.creditsT += STEP; break;
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
  if (G.menu === 'main') g.drawImage(IMG.logo, 26, 4);
  else { g.fillStyle = 'rgba(5,3,10,0.75)'; g.fillRect(0, 0, 250, H); }
  g.drawImage(VIGNETTE, 0, 0);
  // menu hover
  G.hover = -1;
  const items = menuItems();
  if (Input.mouseSeen) items.forEach((it, i) => { const [x, y] = menuPos(i); if (Input.mx > x - 6 && Input.mx < x + 190 && Input.my > y - 7 && Input.my < y + 7) G.hover = i; });
  if (G.hover >= 0) G.sel = G.hover;
  const [sx, sy] = menuPos(G.sel);
  g.fillStyle = 'rgba(160,20,30,0.35)'; g.fillRect(sx - 8, sy - 7, 196, 14);
  g.fillStyle = '#c0202a'; g.fillRect(sx - 8, sy - 7, 2, 14);
}
function menuPos(i) { return G.menu === 'verses' ? [32, 30 + i * 18] : [40, 172 + i * 17]; }
function titleText() {
  const a = clamp(G.titleT / 1.2, 0, 1);
  const items = menuItems();
  if (G.menu === 'main') {
    txt('nunc et in hora mortis nostrae', 40, 156, 9, F_FELL, '#b8956a', 'left', a * 0.9);
    items.forEach((it, i) => {
      const [x, y] = menuPos(i), on = i === G.sel;
      let label = it.label;
      if (it.id === 'continue') { const s = CAMPAIGN[G.step]; label += s && s.verse !== undefined ? `   · verse ${ROMAN[s.verse]}` : ''; }
      txt(label, x, y, 11, F_FELLSC, on ? '#fff1c0' : '#c9a46a', 'left', a, on ? 'rgba(255,140,60,0.6)' : null);
      if (it.id === 'mode') txt(G.mode === 'pilgrim' ? 'gentler foes, one ward a life, the verse remembers' : 'one blow and you fall. no remembering', x + 76, y + 1, 6.5, F_FELLSC, G.mode === 'pilgrim' ? '#8a7a5a' : '#c05a4a', 'left', a);
    });
    if (G.beads.length) txt(`rosary  ${G.beads.length} / 8`, W - 14, 14, 7, F_FELLSC, '#ff9a8a', 'right', a * 0.8);
  } else {
    txt('The Verses', 32, 14, 12, F_TITLE, '#c9a46a', 'left', a);
    items.forEach((it, i) => {
      const [x, y] = menuPos(i), on = i === G.sel;
      if (it.id === 'back') { txt('back', x, y, 9, F_FELLSC, on ? '#fff1c0' : '#9a7d5a', 'left', a); return; }
      const best = G.best[bestKey(it.li)];
      txt(it.locked ? `${ROMAN[it.li]}   · · ·` : it.label, x, y, 8.5, F_FELLSC, it.locked ? '#4a3a30' : on ? '#fff1c0' : best ? '#d9a441' : '#b8956a', 'left', a);
      if (best && !it.locked) txt(fmtTime(best), x + 196, y, 6, F_PIX, '#8a7660', 'right', a);
    });
  }
  txt('A D move   W leap   S roll   CLICK strike   SHIFT chronos   E last rites   Q throw   F chain   R retry   M mute', W / 2, 262, 5, F_PIX, '#8a7660', 'center', a * 0.85);
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
  for (let i = 0; i < 6; i++) { g.fillRect(gx + 6 - i, gy + i, i + 1, 12 - i * 2); g.fillRect(gx + 13 - i, gy + i, i + 1, 12 - i * 2); }
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
  const st = G.state;
  RA = st === 'play' || st === 'dead' || st === 'exit' || st === 'replay' ? clamp(acc / STEP, 0, 1) : 1;
  draw(dtR);
  if (Sound.ready) {
    const w = world;
    const inVerse = w && (st === 'play' || st === 'dead' || st === 'intro' || st === 'paused' || st === 'exit');
    Sound.setSlow(w && (st === 'play' || st === 'dead') ? clamp(w.slowK * (w.rite ? 1.2 : 1), 0, 1) : 0);
    Sound.setReplay(st === 'replay' || st === 'stats' || st === 'rewind' ? 1 : 0);
    Sound.setTension(w && st === 'play' && w.enemies.some((e) => e.alive && e.alerted) ? 1 : 0);
    Sound.setScene(st === 'talk' ? (Talk.kind === 'conf' || Talk.kind === 'card' ? 'confession' : 'title') : inVerse ? (w.boss && w.boss.awake && !w.boss.dead ? 'boss' : 'level') : st === 'replay' || st === 'stats' ? 'level' : 'title');
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
  if (st === 'talk') {
    Talk.draw();
    drawHUD(null); drawCursor('menu');
    present(0);
    Talk.text();
    return;
  }
  if (st === 'end') {
    const k = easeInOut(clamp(G.endT / 7, 0, 1));
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    if (G.endKind === 'released') {
      // the camera rises from the kneeling penitent to the shattered window at dawn
      const im = IMG.ending;
      const y = Math.round(-(1 - k) * (im.height - H));
      g.drawImage(im, 0, y);
      drawGlow(g, 305, 129 + y, 110, '#ffd890', 0.16 + Math.sin(RT * 0.7) * 0.05, true);
      g.fillStyle = '#ffe8c0';
      for (const m of motes) { g.globalAlpha = m.a * 0.8; g.fillRect(Math.round(m.x), Math.round(m.y), m.s, m.s); }
      g.globalAlpha = 1;
    } else {
      // the confessional again, and a new penitent kneeling in it
      drawConfessional({ node: null, jar: 0, shown: 0, total: 0, choices: () => null, intOpen: () => false });
      g.globalAlpha = 1 - k * 0.6; g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.globalAlpha = 1;
    }
    g.drawImage(VIGNETTE, 0, 0);
    const a = clamp((G.endT - 6.2) / 1.5, 0, 1);
    if (a > 0) { g.fillStyle = `rgba(6,3,5,${0.6 * a})`; g.fillRect(0, 0, W, 120); g.fillRect(0, H - 34, W, 34); }
    drawHUD(null); drawCursor('menu');
    present(0);
    if (G.endKind === 'released') {
      txt('Amen.', W / 2, 44, 40, F_TITLE, '#ead7b0', 'center', a, 'rgba(160,20,30,0.9)');
      txt('nunc et in hora mortis nostrae', W / 2, 78, 11, F_FELL, '#f1e2c4', 'center', a);
    } else {
      txt('It is always the same hour.', W / 2, 52, 22, F_FELL, '#ead7b0', 'center', a, 'rgba(160,20,30,0.9)');
      txt(`you refused the sand ${G.story.refused} times. it was not enough.`, W / 2, 80, 8.5, F_FELLSC, '#9a7d5a', 'center', a);
    }
    txt(`${fmtTime(G.totals.time)}   ${G.totals.kills} absolved   ${G.totals.deaths} deaths   rosary ${G.beads.length}/8`, W / 2, 98, 8, F_FELLSC, '#f2d48f', 'center', a);
    txt('click', W / 2, H - 16, 9, F_FELLSC, '#f2d48f', 'center', a * (0.6 + Math.sin(RT * 3) * 0.4));
    return;
  }
  if (st === 'credits') {
    g.fillStyle = '#030204'; g.fillRect(0, 0, W, H);
    drawGlow(g, W / 2, H / 2, 160, '#8a2a1a', 0.12, true);
    g.drawImage(VIGNETTE, 0, 0);
    drawHUD(null);
    present(0);
    const lines = [['HORA MORTIS', 22, F_TITLE, '#c9a46a'], ['', 8], ['a gothic action game of the stopped hour', 8.5, F_FELL, '#b8956a'], ['', 8],
      ['design, code, sound and words', 7, F_FELLSC, '#8a7660'], ['Claude', 10, F_FELLSC, '#ead7b0'], ['', 6],
      ['paintings', 7, F_FELLSC, '#8a7660'], ['made for this hour by the one who asked for it', 9, F_FELL, '#ead7b0'], ['', 8],
      ['thank you for keeping the hour with us', 9, F_FELL, '#f2d48f']];
    let y = H + 10 - Math.min(G.creditsT * 22, H - 50);
    for (const [s, size, font, col] of lines) { if (s) txt(s, W / 2, y, size, font, col, 'center', 1); y += size * 1.8 + 4; }
    if (G.creditsT > 2) txt('click to return', W / 2, H - 12, 6, F_PIX, '#8a7660', 'center', 0.5 + Math.sin(RT * 3) * 0.3);
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
    const k = G.introT, a = clamp((2.55 - k) / 0.55, 0, 1);
    g.globalAlpha = a; g.fillStyle = '#040206'; g.fillRect(0, 0, W, H);
    const im = IMG[VERSES[G.li].card] || IMG.window2;
    const x = Math.round(112 - im.width / 2), y = Math.round((H - im.height) / 2);
    drawGlow(g, x + im.width / 2, y + im.height * 0.45, 120, '#ff9a50', 0.22, true);
    g.drawImage(im, x, y);
    g.globalAlpha = 1;
  }
  const statsA = st === 'stats' ? clamp(G.statsT / 0.4, 0, 1) : 0;
  if (st === 'stats') { g.fillStyle = `rgba(6,3,5,${0.72 * statsA})`; g.fillRect(0, 0, W, H); }
  if (st === 'paused') { g.fillStyle = 'rgba(4,2,5,0.7)'; g.fillRect(0, 0, W, H); }
  drawHUD(w, st === 'play' || st === 'paused' ? 'play' : 'none');
  const speech = st === 'play' || st === 'dead' || st === 'replay' ? speechLines(w) : [];
  drawSpeechBoxes(speech);
  if (st === 'stats') {
    hg.globalAlpha = statsA;
    drawPanel(W / 2 - 140, 40, 280, 196);
    hg.drawImage(IMG.ui_seal, Math.round(W / 2 - IMG.ui_seal.width / 2), 222);
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
  drawSpeechText(speech);
  if (st === 'play' || st === 'dead' || st === 'replay') {
    for (const f of w.floats) txt(f.text, f.x - cx, f.y - cy, 7.5, F_FELLSC, f.col, 'center', Math.min(1, (f.life / f.max) * 2.5), 'rgba(120,10,20,0.9)');
  }
  if (st === 'play' || st === 'paused') {
    const v = VERSES[G.li];
    if (!w.boss || !w.boss.awake) {
      txt(`${ROMAN[G.li]} · ${v.name}`, W - 10, w.boss ? 14 : 24, 8, F_FELLSC, '#b8956a', 'right', 0.75);
      txt(fmtTime(G.verseTime + w.steps / 60), W - 10, w.boss ? 24 : 34, 6.5, F_PIX, '#8a7660', 'right', 0.7);
    }
    if (w.fervour >= 100 && !w.rite) txt('E  the last rites', 86, 32, 6, F_PIX, '#ff7a6a', 'left', 0.6 + Math.sin(RT * 6) * 0.4);
    if (w._slotQ >= 0) txt('Q', w._slotQ + 7, 45, 5, F_PIX, '#8a7660', 'center', 0.8);
    if (w._slotF >= 0) txt('F', w._slotF + 7, 45, 5, F_PIX, '#8a7660', 'center', 0.8);
    if (w.rite && w.rite.phase === 'mark') {
      txt(w.rite.marks.length ? `${w.rite.marks.length} condemned · release E` : 'sweep the cursor across the condemned', W / 2, H - 14, 8, F_FELLSC, '#ff9a8a', 'center', 0.9);
    }
    const b = w.boss;
    if (b && b.awake && b.state !== 'intro' && !(b.dead && b.dying > 2)) {
      txt(BOSS[b.type].name, W / 2, H - 30, 9, F_FELLSC, '#ead7b0', 'center', 0.9, 'rgba(160,20,30,0.8)');
      txt(BOSS[b.type].title, W / 2, H - 9, 5.5, F_PIX, '#8a7660', 'center', 0.7);
    }
    if (b && b.type === 'confessor' && b.final && !w.ended) txt('strike the great bell', W / 2, H - 16, 9, F_FELLSC, '#f2d48f', 'center', 0.7 + Math.sin(RT * 4) * 0.3);
    if (w.clearT > 0.6 && !w.exited && w.lvl.exit) txt('the door is open', W / 2, H - 16, 9, F_FELLSC, '#f2d48f', 'center', clamp((w.clearT - 0.6) * 2, 0, 1) * (0.7 + Math.sin(RT * 4) * 0.3));
  }
  if (st === 'intro') {
    const k = G.introT, a = clamp(Math.min(k / 0.4, (2.8 - k) / 0.5), 0, 1);
    const v = VERSES[G.li];
    txt(`Verse ${ROMAN[G.li]}`, 330, 100, 16, F_TITLE, '#c9a46a', 'center', a);
    txt(v.name, 330, 130, 20, F_FELLSC, '#ead7b0', 'center', a, 'rgba(150,20,30,0.8)');
    txt(v.latin, 330, 154, 9, F_FELL, '#9a7d5a', 'center', a * 0.9);
    if (G.campaign && G.sandNext) txt(G.sandNext === 'took' ? 'the sand is in your blood. your hour mends quickly' : 'you refused the sand. your hour mends slowly', 330, 180, 6, F_PIX, G.sandNext === 'took' ? '#d9a441' : '#9a8a70', 'center', a * 0.8);
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
    txt('So it was written.', W / 2, 66, 22, F_FELL, '#ead7b0', 'center', a, 'rgba(160,20,30,0.8)');
    txt(VERSES[G.li].name, W / 2, 90, 10, F_FELLSC, '#b8956a', 'center', a);
    const rows = [['time', fmtTime(s.time) + (s.record ? '   new best' : '')], ['absolved', `${s.kills} of ${s.total}`], ['blood returned', String(s.deflects)], ['parried', String(s.parries)], ['last rites', String(s.rites)], ['deaths', String(s.deaths)]];
    if (s.beads) rows.push(['rosary', `a bead found  (${G.beads.length} / 8)`]);
    rows.forEach(([k2, v2], i) => {
      txt(k2, W / 2 - 8, 112 + i * 13, 8, F_FELLSC, '#9a7d5a', 'right', a);
      txt(v2, W / 2 + 8, 112 + i * 13, 8, F_PIX, i === 0 && s.record ? '#ffd27a' : '#ead7b0', 'left', a);
    });
    txt(s.rank, W / 2, 112 + rows.length * 13 + 12, 14, F_TITLE, s.rank === 'Sanctus' ? '#fff1c0' : s.rank === 'Peccator' ? '#c05a4a' : '#d9a441', 'center', a, 'rgba(160,20,30,0.7)');
    txt(G.campaign ? 'click to continue' : 'click to return', W / 2, 252, 9, F_FELLSC, '#f2d48f', 'center', a * (0.6 + Math.sin(RT * 3) * 0.4));
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
  buildProceduralDecor();
  if (data && typeof data.li === 'number' && data.state === 'play') { G.campaign = false; startVerse(clamp(data.li, 0, VERSES.length - 1)); }
  window.claude?.hot?.snapshot?.(() => ({ li: G.li, state: G.state === 'play' ? 'play' : 'title' }));
  requestAnimationFrame((t) => { last = t; requestAnimationFrame(frame); });
}
const assetsReady = loadAssets();
window.__HM = { G, get world() { return world; }, startVerse, simStep, Input, LEVELS, levelArt, ready: assetsReady, Talk, runStep, CAMPAIGN, newHour };
const start = (data) => assetsReady.then(() => boot(data));
window.claude?.hot?.ready ? window.claude.hot.ready(start) : start(window.claude?.hot?.data ?? {});
