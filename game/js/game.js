/* L'HEURE FIGÉE — moteur : physique, combats, IA, boss, dialogues, menus, fins.
   Dépend de ART (art/), ENV (env/), AUDIO (audio/), CHAPTERS (chapters/) et ENDINGS (story/).
   Contrat : game/DESIGN.md. Aucune dépendance externe. */
(function () {
  'use strict';

  const W = 960, H = 540, TS = 32;
  const GRAV = 1700, MAX_FALL = 880;
  const RUN = 175, ACC = 1500, AIR_ACC = 1100, DEC = 1800;
  const JUMP_V = 600, DOUBLE_V = 520;
  const DASH_V = 470, DASH_T = 0.17, DASH_CD = 0.5;
  const ATK_T = 0.26, ATK_CD = 0.12, ATK_REACH = 56;
  const MAX_HP = 5, INVULN = 1.1, HURT_T = 0.35, LAND_T = 0.12;
  const TALK_X = 52, TALK_Y = 64;
  const CPS = 46;                       // caractères par seconde (machine à écrire)
  const SAVE_KEY = 'lheure-figee-v1';
  const FONT = '22px Georgia, "Times New Roman", serif';
  const ITALIC = 'italic 22px Georgia, "Times New Roman", serif';
  const NAMES = {
    leo: 'Leo', juliette: 'Juliette', elias: 'Elias', mireille: 'Mireille Crow', gaspard: 'Gaspard',
    regent: 'The Regent', pivert: 'Mrs. Pivert', hugo: 'Old Hugo', bastien: 'Bastien', tomas: 'Tomas',
  };
  const ABILITY_TEXT = {
    dash: 'Glide (Shift / K)',
    pendule: 'Pendulum (hold C / L)',
    ressort: 'Spring (jump in midair)',
  };
  const CONTROLS = [
    ['Move', '← →  or  Q  D'],
    ['Jump (double jump with the Spring)', 'Space  ·  ↑  ·  Z'],
    ['Drop through a platform', '↓ then Jump'],
    ['Attack with the Dawn Wrench', 'X  ·  J'],
    ['Glide (chapter II)', 'Shift  ·  K'],
    ['Pendulum: slow time (chapter III)', 'hold C  ·  L'],
    ['Talk to people', 'E  ·  Enter'],
    ['Advance dialogue', 'Space  ·  Enter  ·  E'],
    ['Pause', 'Esc  ·  P'],
  ];

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  /* ---------- utilitaires ---------- */
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const sgn = (v) => (v < 0 ? -1 : 1);
  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const hasArt = (id) => !!(window.ART && ART.get && ART.get(id));

  function sfx(n) { try { if (window.AUDIO) AUDIO.sfx(n); } catch (e) { /* audio facultatif */ } }
  let wantMusic = null;
  function music(n) { wantMusic = n; try { if (window.AUDIO) AUDIO.music(n); } catch (e) { /* idem */ } }
  function drawActorAt(id, x, y, pose) {
    if (!window.ART) return;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ART.draw(ctx, id, pose);
    ctx.restore();
  }

  /* ---------- entrées clavier ---------- */
  const KEYS = {
    left: ['ArrowLeft', 'KeyQ', 'KeyA'],
    right: ['ArrowRight', 'KeyD'],
    up: ['ArrowUp', 'KeyZ', 'KeyW'],
    down: ['ArrowDown', 'KeyS'],
    jump: ['Space', 'ArrowUp', 'KeyZ', 'KeyW'],
    attack: ['KeyX', 'KeyJ'],
    dash: ['ShiftLeft', 'ShiftRight', 'KeyK'],
    slow: ['KeyC', 'KeyL'],
    ok: ['Enter', 'Space', 'KeyE'],
    talk: ['KeyE', 'Enter'],
    pause: ['Escape', 'KeyP'],
  };
  const held = new Set(), hitSet = new Set();
  const on = (a) => KEYS[a].some((k) => held.has(k));
  const hit = (a) => KEYS[a].some((k) => hitSet.has(k));
  let unlocked = false;
  function unlockAudio() {
    if (unlocked) return;
    unlocked = true;
    try { if (window.AUDIO) { AUDIO.unlock(); if (wantMusic) AUDIO.music(wantMusic); } } catch (e) { /* idem */ }
  }
  window.addEventListener('keydown', (e) => {
    const used = Object.values(KEYS).some((list) => list.includes(e.code));
    if (used) e.preventDefault();
    if (!e.repeat) hitSet.add(e.code);
    held.add(e.code);
    unlockAudio();
  });
  window.addEventListener('keyup', (e) => held.delete(e.code));
  window.addEventListener('pointerdown', unlockAudio);
  window.addEventListener('blur', () => held.clear());

  /* ---------- état global ---------- */
  let mode = 'title', time = 0;
  let titleSel = 0, pauseSel = 0, controlsBack = 'title';
  let ch = null, grid = [], rows = 0, cols = 0, gateCol = -1, gateClosed = false;
  let world = null, player = null;
  const cam = { x: 0, y: 0 };
  let particles = [], toasts = [];
  let shakeA = 0, flashT = 0, hitstop = 0;
  let slowGauge = 1, slowing = false;
  let transition = null, card = null, dlg = null, endKey = null, endCard = null, credits = null;
  let themeOverride = null;
  let debugSession = false;   // set by LHF.start: progress is then kept in memory only, never saved
  const story = { chapterId: 'ch1', unlocks: new Set(), flags: new Set(), progress: {} };

  function newStory() {
    story.chapterId = 'ch1';
    story.unlocks = new Set();
    story.flags = new Set();
    story.progress = {};
  }
  function progressOf(id) {
    if (!story.progress[id]) {
      story.progress[id] = { taken: new Set(), scenesDone: new Set(), npcTalked: new Set(), bossDead: false, checkpoint: null, gears: 0 };
    }
    return story.progress[id];
  }

  /* ---------- sauvegarde (localStorage, facultatif) ---------- */
  function saveGame() {
    if (debugSession) return;   // a debug start must not overwrite the real save
    try {
      const progress = {};
      for (const [id, p] of Object.entries(story.progress)) {
        progress[id] = {
          taken: [...p.taken], scenesDone: [...p.scenesDone], npcTalked: [...p.npcTalked],
          bossDead: p.bossDead, checkpoint: p.checkpoint, gears: p.gears,
        };
      }
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        chapterId: story.chapterId, unlocks: [...story.unlocks], flags: [...story.flags], progress,
      }));
    } catch (e) { /* stockage indisponible : on joue sans sauvegarde */ }
  }
  // Lit et valide la sauvegarde sans rien modifier ; renvoie null si elle est inutilisable.
  function readSave() {
    try {
      const d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      if (!d || typeof d !== 'object') return null;
      const chapterId = d.chapterId || 'ch1';
      if (!CHAPTERS.get(chapterId)) return null;
      const progress = {};
      for (const [id, p] of Object.entries(d.progress || {})) {
        if (!p || typeof p !== 'object') return null;
        progress[id] = {
          taken: new Set(p.taken || []), scenesDone: new Set(p.scenesDone || []), npcTalked: new Set(p.npcTalked || []),
          bossDead: !!p.bossDead, checkpoint: p.checkpoint || null, gears: p.gears || 0,
        };
      }
      return { chapterId, unlocks: new Set(d.unlocks || []), flags: new Set(d.flags || []), progress };
    } catch (e) { return null; }
  }
  function loadGame() {
    const s = readSave();
    if (!s) return false;
    story.chapterId = s.chapterId;
    story.unlocks = s.unlocks;
    story.flags = s.flags;
    story.progress = s.progress;
    return true;
  }
  function hasSave() {
    return !!readSave();
  }
  function eraseSave() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* rien à effacer */ }
  }

  /* ---------- construction du monde ---------- */
  function buildWorld(id) {
    ch = CHAPTERS.get(id);
    if (!ch) throw new Error('Chapitre introuvable : ' + id);
    const pr = progressOf(id);
    grid = ch.map.map((row) => row.split(''));
    rows = grid.length;
    cols = grid[0].length;
    gateCol = -1;
    gateClosed = false;
    world = { start: null, bossSpawn: null, boss: null, enemies: [], npcs: [], gearsTotal: 0 };
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const k = grid[r][c], key = c + ',' + r;
        const cx = c * TS + TS / 2, bottom = (r + 1) * TS;
        if (k === 'o') { world.gearsTotal++; if (pr.taken.has(key)) grid[r][c] = '.'; }
        else if (k === 'h') { if (pr.taken.has(key)) grid[r][c] = '.'; }
        else if (k === 'B') { if (gateCol < 0) gateCol = c; if (pr.bossDead) grid[r][c] = '.'; }
        else if (k === 'S') { world.start = { x: cx, y: bottom }; grid[r][c] = '.'; }
        else if (k === 'R') { world.bossSpawn = { x: cx, y: bottom }; grid[r][c] = '.'; }
        else if (k === 'r') { world.enemies.push(makeEnemy('rouage', cx, bottom)); grid[r][c] = '.'; }
        else if (k === 'f') { world.enemies.push(makeEnemy('fige', cx, bottom)); grid[r][c] = '.'; }
        else if (k === 's') { world.enemies.push(makeEnemy('sablier', cx, r * TS + TS / 2 + 14)); grid[r][c] = '.'; }
        else if (k >= '1' && k <= '9') { world.npcs.push(makeNpc(k, cx, bottom)); grid[r][c] = '.'; }
      }
    }
    if (!world.start) world.start = { x: 3 * TS + 16, y: (rows - 2) * TS };
    if (world.bossSpawn && !pr.bossDead) {
      world.boss = makeBoss(world.bossSpawn);
      // a fresh Regent starts in phase 1, so its phase lines play again on this attempt
      pr.scenesDone.delete('boss_phase2'); pr.scenesDone.delete('boss_phase3');
    }
  }

  function makeEnemy(kind, x, y) {
    const e = {
      kind, x, y, vx: 0, vy: 0, facing: -1, dir: -1, state: 'idle', st: 0, cd: rnd(0.3, 1.0),
      hp: kind === 'fige' ? 3 : kind === 'rouage' ? 2 : 1, dead: false, deadT: 0, hurtT: 0, inv: 0,
      homeX: x, homeY: y, gone: false, chasing: false,
    };
    if (kind === 'rouage') { e.w = 26; e.h = 18; e.gravity = true; }
    else if (kind === 'fige') { e.w = 26; e.h = 48; e.gravity = true; }
    else { e.w = 26; e.h = 34; e.gravity = false; }
    return e;
  }
  function makeNpc(marker, x, y) {
    const data = (ch.npcs && ch.npcs[marker]) || null;
    return { marker, who: data && data.who ? data.who : 'narrator', x, y, data, facing: -1, talking: false };
  }
  function makeBoss(pt) {
    return {
      id: 'regent', x: pt.x, y: pt.y, w: 60, h: 100, vx: 0, vy: 0, facing: -1,
      hp: 18, phase: 1, state: 'idle', st: 0, dur: 0.8, next: null, summonCd: 0,
      inv: 0, hurtT: 0, active: false, dead: false, defeatHandled: false, hitDone: false, summoned: false,
    };
  }

  /* ---------- collisions tuiles ---------- */
  function solid(c, r) {
    if (c < 0 || c >= cols) return true;
    if (r < 0 || r >= rows) return false;
    const k = grid[r][c];
    return k === '#' || (k === 'B' && gateClosed);
  }
  function plat(c, r) {
    return c >= 0 && c < cols && r >= 0 && r < rows && grid[r][c] === '=';
  }
  // Déplace un corps (x,y = centre des pieds, w,h) avec collisions. Renvoie {landed, hitWall}.
  function moveBody(b, dt, ignorePlat) {
    const hw = b.w / 2, h = b.h;
    let landed = false, hitWall = 0;
    // axe X
    b.x += b.vx * dt;
    const top = b.y - h + 2, bot = b.y - 2;
    const r0 = Math.floor(top / TS), r1 = Math.floor(bot / TS);
    if (b.vx > 0) {
      const c = Math.floor((b.x + hw) / TS);
      for (let r = r0; r <= r1; r++) if (solid(c, r)) { b.x = c * TS - hw; b.vx = 0; hitWall = 1; break; }
    } else if (b.vx < 0) {
      const c = Math.floor((b.x - hw) / TS);
      for (let r = r0; r <= r1; r++) if (solid(c, r)) { b.x = (c + 1) * TS + hw; b.vx = 0; hitWall = -1; break; }
    }
    // axe Y
    const prevBot = b.y;
    b.y += b.vy * dt;
    const cl = Math.floor((b.x - hw + 1) / TS), cr = Math.floor((b.x + hw - 1) / TS);
    if (b.vy >= 0) {
      const rA = Math.floor(prevBot / TS), rB = Math.floor(b.y / TS);
      outer: for (let r = rA; r <= rB; r++) {
        const edge = r * TS;
        if (prevBot > edge + 0.5 || b.y < edge) continue;
        for (let c = cl; c <= cr; c++) {
          if (solid(c, r) || (!ignorePlat && plat(c, r))) { b.y = edge; b.vy = 0; landed = true; break outer; }
        }
      }
    } else {
      const prevTop = prevBot - h, newTop = b.y - h;
      const rA = Math.floor(newTop / TS), rB = Math.floor(prevTop / TS);
      outer2: for (let r = rA; r <= rB; r++) {
        const under = (r + 1) * TS;
        if (prevTop < under - 0.5 || newTop > under) continue;
        for (let c = cl; c <= cr; c++) {
          if (solid(c, r)) { b.y = under + h; b.vy = 0; break outer2; }
        }
      }
    }
    b.onGround = landed;
    return { landed, hitWall };
  }
  function touchesTile(box, chars) {
    const c0 = Math.floor(box.x / TS), c1 = Math.floor((box.x + box.w - 1) / TS);
    const r0 = Math.floor(box.y / TS), r1 = Math.floor((box.y + box.h - 1) / TS);
    for (let r = Math.max(0, r0); r <= Math.min(rows - 1, r1); r++) {
      for (let c = Math.max(0, c0); c <= Math.min(cols - 1, c1); c++) {
        if (chars.includes(grid[r][c])) return true;
      }
    }
    return false;
  }

  /* ---------- joueur ---------- */
  function newPlayer(pt) {
    return {
      x: pt.x, y: pt.y, w: 22, h: 46, vx: 0, vy: 0, facing: 1, onGround: false, wasGround: true,
      coyote: 0, jumpBuf: 0, atkBuf: 0, dashBuf: 0, jumpsLeft: 0, cutJump: false, hp: MAX_HP, inv: 0,
      dashT: 0, dashCd: 0, atkT: 0, atkCd: 0, atkDone: new Set(), hurtT: 0, landT: 0, dropT: 0,
      dead: false, deadT: 0, st: 0,
    };
  }
  const playerBox = () => ({ x: player.x - 11, y: player.y - 46, w: 22, h: 46 });

  function updatePlayer(dt) {
    const p = player;
    p.st += dt;
    p.inv = Math.max(0, p.inv - dt);
    p.dashCd = Math.max(0, p.dashCd - dt);
    p.atkCd = Math.max(0, p.atkCd - dt);
    p.hurtT = Math.max(0, p.hurtT - dt);
    p.landT = Math.max(0, p.landT - dt);
    p.dropT = Math.max(0, p.dropT - dt);
    p.atkT = Math.max(0, p.atkT - dt);
    const locked = p.hurtT > 0;
    const ax = locked ? 0 : (on('right') ? 1 : 0) - (on('left') ? 1 : 0);
    if (ax !== 0 && p.atkT <= 0) p.facing = ax;

    if (p.onGround) { p.coyote = 0.1; p.jumpsLeft = story.unlocks.has('ressort') ? 1 : 0; }
    else p.coyote = Math.max(0, p.coyote - dt);
    p.jumpBuf = hit('jump') && !locked ? 0.12 : Math.max(0, p.jumpBuf - dt);

    // descendre à travers une plateforme : bas + saut
    // every column the body stands on counts, the same columns moveBody uses to land
    const fr = Math.floor(p.y / TS);
    let onPlat = false, onSolid = false;
    for (let c = Math.floor((p.x - 10) / TS); c <= Math.floor((p.x + 10) / TS); c++) {
      if (plat(c, fr)) onPlat = true;
      if (solid(c, fr)) onSolid = true;
    }
    if (hit('jump') && on('down') && p.onGround && onPlat && !onSolid) { p.dropT = 0.25; p.jumpBuf = 0; p.coyote = 0; }

    // dash and attack presses are buffered until their lock or cooldown ends; the +dt keeps the
    // buffer alive for the frame the cooldown reaches zero (both count down by the same dt)
    p.dashBuf = hit('dash') ? Math.max(0.12, p.dashCd + dt) : Math.max(0, p.dashBuf - dt);
    if (p.dashBuf > 0 && story.unlocks.has('dash') && p.dashCd <= 0 && p.dashT <= 0 && p.atkT <= 0 && !locked) {
      p.dashBuf = 0;
      p.dashT = DASH_T; p.dashCd = DASH_CD; p.vx = p.facing * DASH_V; p.vy = 0;
      p.inv = Math.max(p.inv, DASH_T);
      puff(p.x, p.y - 4, 7, '#e9dcc0');
      sfx('dash');
    }
    p.atkBuf = hit('attack') ? Math.max(0.12, p.atkCd + dt) : Math.max(0, p.atkBuf - dt);
    if (p.atkBuf > 0 && p.atkCd <= 0 && p.atkT <= 0 && p.dashT <= 0 && !locked) {
      p.atkBuf = 0;
      p.atkT = ATK_T; p.atkCd = ATK_T + ATK_CD; p.atkDone = new Set();
      sfx('attack');
    }

    if (p.jumpBuf > 0) {
      if (p.coyote > 0) {
        p.vy = -JUMP_V; p.coyote = 0; p.jumpBuf = 0; p.cutJump = true; p.dashT = 0;
        puff(p.x, p.y, 5, '#cfc3a8'); sfx('jump');
      } else if (story.unlocks.has('ressort') && p.jumpsLeft > 0) {
        p.vy = -DOUBLE_V; p.jumpsLeft--; p.jumpBuf = 0; p.cutJump = true; p.dashT = 0;
        ring(p.x, p.y - 2); sfx('jump');
      }
    }
    // saut court si on relâche tôt
    if (p.cutJump && !on('jump')) {
      if (p.vy < -120) p.vy *= 0.45;
      p.cutJump = false;
    }
    if (p.vy >= 0) p.cutJump = false;

    if (p.dashT > 0) {
      p.dashT = Math.max(0, p.dashT - dt);
      p.vy = 0;
    } else {
      const target = ax * RUN * (p.atkT > 0 ? 0.35 : 1);
      const rate = ax !== 0 ? (p.onGround ? ACC : AIR_ACC) : DEC;
      const d = target - p.vx;
      p.vx += Math.abs(d) <= rate * dt ? d : sgn(d) * rate * dt;
      p.vy = Math.min(MAX_FALL, p.vy + GRAV * dt);
    }

    const wasG = p.wasGround;
    moveBody(p, dt, p.dropT > 0);
    p.wasGround = p.onGround;
    if (p.onGround && !wasG) { p.landT = LAND_T; puff(p.x, p.y, 4, '#cfc3a8'); sfx('land'); }

    if (p.y > rows * TS + 80) { killPlayer(); return; }
    const box = playerBox();
    if (p.inv <= 0 && touchesTile(box, ['^'])) hurtPlayer(1, p.x - p.facing * 10);
    pickups(box);
  }

  function playerPose() {
    const p = player;
    let state = 'idle', t = p.st;
    if (p.dead) { state = 'dead'; t = p.deadT; }
    else if (p.hurtT > 0) { state = 'hurt'; t = HURT_T - p.hurtT; }
    else if (p.dashT > 0) { state = 'dash'; t = DASH_T - p.dashT; }
    else if (p.atkT > 0) { state = 'attack'; t = ATK_T - p.atkT; }
    else if (!p.onGround) { state = p.vy < 0 ? 'jump' : 'fall'; }
    else if (p.landT > 0) { state = 'land'; t = LAND_T - p.landT; }
    else if (Math.abs(p.vx) > 150) state = 'run';
    else if (Math.abs(p.vx) > 15) state = 'walk';
    else if (slowing) state = 'slow';
    else if (dlg && dlg.cur && dlg.cur.who === 'leo') state = 'talk';
    return { state, t, time, vx: p.vx, vy: p.vy, facing: p.facing, phase: 1 };
  }

  function pickups(box) {
    const pr = progressOf(story.chapterId);
    const c0 = Math.floor(box.x / TS), c1 = Math.floor((box.x + box.w - 1) / TS);
    const r0 = Math.floor(box.y / TS), r1 = Math.floor((box.y + box.h - 1) / TS);
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
        const k = grid[r][c], key = c + ',' + r;
        if (k === 'o') {
          grid[r][c] = '.'; pr.taken.add(key); pr.gears++;
          burst(c * TS + 16, r * TS + 16, 10, '#f2c66d', 120, 0.5, 2.5);
          sfx('gear');
        } else if (k === 'h' && player.hp < MAX_HP) {
          grid[r][c] = '.'; pr.taken.add(key); player.hp++;
          burst(c * TS + 16, r * TS + 16, 12, '#ffb84d', 110, 0.5, 2.5);
          sfx('heal');
        } else if (k === 'C') {
          const cp = { x: c * TS + 16, y: (r + 1) * TS };
          if (!pr.checkpoint || pr.checkpoint.x !== cp.x || pr.checkpoint.y !== cp.y) {
            pr.checkpoint = cp;
            ring(c * TS + 16, r * TS + 16);
            sfx('checkpoint');
            toast('Checkpoint');
            saveGame();
          }
        } else if (k === 'X' && !transition && !gateClosed) {
          exitChapter();
          return;
        }
      }
    }
  }

  function hurtPlayer(dmg, fromX) {
    const p = player;
    if (!p || p.dead || p.inv > 0) return;
    p.hp -= dmg;
    p.inv = INVULN; p.hurtT = HURT_T; p.dashT = 0; p.atkT = 0;
    p.vx = (p.x < fromX ? -1 : 1) * 210; p.vy = -260;
    shakeA = Math.max(shakeA, 6);
    sfx('hurt');
    burst(p.x, p.y - 26, 10, '#e0664c', 160, 0.5, 2.5);
    if (p.hp <= 0) killPlayer();
  }
  function killPlayer() {
    const p = player;
    if (!p || p.dead) return;
    p.dead = true; p.deadT = 0; p.hp = 0; p.vx = 0;
    sfx('death');
    burst(p.x, p.y - 20, 18, '#f3ead8', 180, 0.8, 3);
  }

  /* ---------- combat ---------- */
  const enemyBox = (e) => ({ x: e.x - e.w / 2, y: e.y - e.h, w: e.w, h: e.h });
  const bossBox = (b) => ({ x: b.x - 30, y: b.y - 100, w: 60, h: 100 });
  function attackBox() {
    const p = player;
    const x0 = p.facing > 0 ? p.x + 4 : p.x - ATK_REACH;
    return { x: x0, y: p.y - 44, w: ATK_REACH - 4, h: 36 };
  }

  function updateCombat() {
    const p = player;
    const active = p.atkT > 0.04 && p.atkT <= 0.2;
    if (!active) return;
    const hb = attackBox();
    for (const e of world.enemies) {
      if (e.gone || e.dead || e.inv > 0 || p.atkDone.has(e)) continue;
      if (!overlap(hb, enemyBox(e))) continue;
      p.atkDone.add(e);
      e.hp--; e.inv = 0.25; e.hurtT = 0.22;
      e.vx = p.facing * 210;
      if (e.gravity) e.vy = -200;
      burst(e.x, e.y - 24, 9, '#fff1c9', 170, 0.35, 2.5);
      sfx('hit');
      hitstop = 0.05;
      shakeA = Math.max(shakeA, 3);
      if (e.hp <= 0) { e.dead = true; e.deadT = 0; e.vx *= 0.5; sfx('hurt'); }
    }
    const b = world.boss;
    if (b && b.active && b.state !== 'intro' && !b.dead && b.inv <= 0 && !p.atkDone.has(b) && overlap(hb, bossBox(b))) {
      p.atkDone.add(b);
      bossHit(b);
    }
  }

  /* ---------- ennemis ---------- */
  function setE(e, state) {
    if (e.state !== state) { e.state = state; e.st = 0; }
  }
  function aiRouage(e) {
    const p = player;
    const dx = p.x - e.x, dy = p.y - e.y, dist = Math.hypot(dx, dy);
    const chase = dist < 190 && Math.abs(dy) < 80;
    e.chasing = chase;
    if (e.state === 'attack') { if (e.st > 0.35) setE(e, 'walk'); return; }
    const dir = chase ? sgn(dx) : e.dir;
    e.facing = dir;
    if (chase && dist < 44 && e.cd <= 0) {
      setE(e, 'attack'); e.cd = 1.3; e.vx = dir * 270; e.vy = -140;
      return;
    }
    setE(e, 'walk');
    e.vx = dir * (chase ? 105 : 50);
    if (!chase) {
      const ahead = Math.floor((e.x + dir * 16) / TS), foot = Math.floor((e.y - 1) / TS);
      if (!solid(ahead, foot) && !plat(ahead, foot) && !solid(ahead, foot + 1) && !plat(ahead, foot + 1)) e.dir = -e.dir;
    }
  }
  function aiFige(e) {
    const p = player;
    const dx = p.x - e.x, dy = p.y - e.y, dist = Math.hypot(dx, dy);
    if (e.state === 'attack') { if (e.st > 0.4) setE(e, 'walk'); return; }
    const awake = dist < 200 && Math.abs(dy) < 90;
    if (!awake) { setE(e, 'idle'); e.vx = 0; return; }
    const dir = sgn(dx);
    e.facing = dir;
    if (dist < 56 && e.cd <= 0) { setE(e, 'attack'); e.cd = 1.6; e.vx = dir * 230; return; }
    setE(e, 'walk');
    const stepping = Math.floor(e.st * 3.2) % 2 === 0;   // déplacement saccadé « tic-tac »
    e.vx = stepping ? dir * 52 : 0;
  }
  function aiSablier(e) {
    const p = player;
    const tx = p.x, ty = p.y - 24;
    const dx = tx - e.x, dy = ty - e.y, dist = Math.hypot(dx, dy);
    if (e.state === 'attack') {
      if (e.st < 0.6) {
        const d = Math.max(1, dist);
        e.vx = dx / d * 200; e.vy = dy / d * 200;
      } else {
        setE(e, 'return');
      }
      return;
    }
    if (e.state === 'return') {
      const hx = e.homeX - e.x, hy = e.homeY - e.y, d = Math.hypot(hx, hy);
      if (d < 6) { setE(e, 'walk'); e.x = e.homeX; e.y = e.homeY; e.vx = 0; e.vy = 0; }
      else { e.vx = hx / d * 100; e.vy = hy / d * 100; }
      return;
    }
    setE(e, 'walk');
    e.vx = 0; e.vy = 0;
    e.x = e.homeX + Math.sin(time * 1.3 + e.homeX * 0.05) * 26;
    e.y = e.homeY + Math.sin(time * 2.2 + e.homeX * 0.1) * 8;
    e.facing = dx < 0 ? -1 : 1;
    if (dist < 230 && e.cd <= 0) { setE(e, 'attack'); e.cd = 2.2; }
  }

  function updateEnemies(dt, sdt) {
    for (const e of world.enemies) {
      if (e.gone) continue;
      e.inv = Math.max(0, e.inv - dt);
      e.hurtT = Math.max(0, e.hurtT - dt);
      e.cd = Math.max(0, e.cd - sdt);
      e.st += sdt;
      if (e.dead) {
        e.deadT += sdt;
        e.vx *= 0.9;
        if (e.gravity) { e.vy = Math.min(MAX_FALL, e.vy + GRAV * sdt); moveBody(e, sdt, false); }
        if (e.deadT > 0.9) e.gone = true;
        continue;
      }
      // hurt: keep the knockback slide, AI does not overwrite vx during the stun
      if (e.hurtT > 0 && e.gravity) e.vx *= 0.9;
      else if (e.kind === 'rouage') aiRouage(e);
      else if (e.kind === 'fige') aiFige(e);
      else aiSablier(e);
      if (e.gravity) {
        e.vy = Math.min(MAX_FALL, e.vy + GRAV * sdt);
        const res = moveBody(e, sdt, false);
        if (e.kind === 'rouage' && res.hitWall && !e.chasing && e.state === 'walk') e.dir = -res.hitWall;
      } else if (e.state === 'attack' || e.state === 'return') {
        e.x += e.vx * sdt; e.y += e.vy * sdt;
      }
      if (Math.abs(e.vx) > 5) e.facing = sgn(e.vx);
      if (e.y > rows * TS + 120) e.gone = true;
      if (!e.gone && !e.dead && player.inv <= 0 && !player.dead && overlap(enemyBox(e), playerBox())) {
        hurtPlayer(1, e.x);
      }
    }
    world.enemies = world.enemies.filter((e) => !e.gone);
  }
  function enemyPose(e) {
    return {
      state: e.dead ? 'dead' : e.hurtT > 0 ? 'hurt' : e.state,
      t: e.dead ? e.deadT : e.st, time, vx: e.vx, vy: e.vy, facing: e.facing, phase: 1,
    };
  }

  /* ---------- le Régent (boss) ---------- */
  const ATTACK_DUR = { slam: 0.45, beam: 1.0, charge: 0.9 };
  function setBoss(b, state, dur) {
    b.state = state; b.st = 0; b.dur = dur; b.hitDone = false; b.summoned = false;
  }
  function bossChoose(b) {
    const dist = Math.abs(player.x - b.x);
    const opts = dist > 140 ? ['walk', 'beam', 'charge'] : ['slam', 'walk', 'charge'];
    if (b.phase >= 2 && b.summonCd <= 0) opts.push('summon');
    const pick = opts[Math.floor(Math.random() * opts.length)];
    if (pick === 'walk') setBoss(b, 'walk', 1.0);
    else if (pick === 'summon') { b.summonCd = b.phase === 3 ? 6 : 9; setBoss(b, 'summon', 1.0); }
    else { b.next = pick; setBoss(b, 'telegraph', b.phase === 3 ? 0.4 : 0.55); }
  }
  function updateBoss(dt, sdt) {
    const b = world.boss;
    if (!b || !(b.active || b.dead)) return;
    b.st += sdt;
    if (b.dead) {
      b.vx *= 0.9;
      b.vy = Math.min(MAX_FALL, b.vy + GRAV * sdt);
      moveBody(b, sdt, false);
      if (b.st > 2.0 && !b.defeatHandled) { b.defeatHandled = true; defeatBoss(); }
      return;
    }
    b.inv = Math.max(0, b.inv - dt);
    b.hurtT = Math.max(0, b.hurtT - dt);
    b.summonCd = Math.max(0, b.summonCd - sdt);
    b.vy = Math.min(MAX_FALL, b.vy + GRAV * sdt);
    if (b.state !== 'walk' && b.state !== 'charge') b.vx = 0;
    const dx = player.x - b.x;
    if (b.state === 'idle' || b.state === 'walk' || b.state === 'telegraph') b.facing = dx < 0 ? -1 : 1;
    switch (b.state) {
      case 'intro':
        if (b.st > 1.6) setBoss(b, 'idle', b.phase === 3 ? 0.4 : 0.7);
        break;
      case 'idle':
        if (b.st > b.dur) bossChoose(b);
        break;
      case 'walk':
        b.vx = b.facing * 70;
        if (b.st > b.dur || Math.abs(dx) < 110) setBoss(b, 'idle', 0.5);
        break;
      case 'telegraph':
        if (b.st > b.dur) setBoss(b, b.next, ATTACK_DUR[b.next] || 0.9);
        break;
      case 'slam':
        if (!b.hitDone && b.st > 0.25 && b.st < 0.42 && Math.abs(dx) < 130 && player.onGround) {
          b.hitDone = true; shakeA = Math.max(shakeA, 10); hurtPlayer(1, b.x);
        }
        if (b.st > b.dur) setBoss(b, 'idle', 0.5);
        break;
      case 'beam': {
        if (b.st > 0.2 && b.st < 0.9) {
          const beam = b.facing > 0
            ? { x: b.x + 20, y: b.y - 92, w: 330, h: 26 }
            : { x: b.x - 350, y: b.y - 92, w: 330, h: 26 };
          if (overlap(beam, playerBox())) hurtPlayer(1, b.x);
        }
        if (b.st > b.dur) setBoss(b, 'idle', 0.5);
        break;
      }
      case 'charge':
        b.vx = b.facing * 280;
        if (b.st > b.dur) setBoss(b, 'idle', 0.6);
        break;
      case 'summon':
        if (!b.summoned && b.st > 0.5) { b.summoned = true; spawnSummons(b); }
        if (b.st > b.dur) setBoss(b, 'idle', 0.5);
        break;
      default:
        setBoss(b, 'idle', 0.6);
    }
    if (b.state !== 'intro' && overlap(bossBox(b), playerBox())) hurtPlayer(1, b.x);
    moveBody(b, sdt, false);
  }
  // a fige is 26 wide and 48 tall, feet at y: it must not overlap a wall or the closed gate
  function figeFits(x, y) {
    const c0 = Math.floor((x - 13) / TS), c1 = Math.ceil((x + 13) / TS) - 1;
    const r0 = Math.floor((y - 48) / TS), r1 = Math.ceil(y / TS) - 1;
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (solid(c, r)) return false;
    return true;
  }
  function spawnSummons(b) {
    // keep summoned figes inside the arena: between the gate and the far wall
    const lo = (gateCol + 1) * TS + 13, hi = (cols - 1) * TS - 13;
    const placed = [];
    for (const sx of [-110, 110]) {
      // own side first, then the opposite side; a fige with no clear spot is dropped
      const x = [b.x + sx, b.x - sx].map((v) => clamp(v, lo, hi)).find((v) => !placed.includes(v) && figeFits(v, b.y));
      if (x === undefined) continue;
      placed.push(x);
      world.enemies.push(makeEnemy('fige', x, b.y));
    }
    sfx('pendule');
  }
  function bossPose(b) {
    return {
      state: b.dead ? 'dead' : b.hurtT > 0 && b.state === 'idle' ? 'hurt' : b.state,
      t: b.st, time, vx: b.vx, vy: b.vy, facing: b.facing, phase: b.phase,
    };
  }
  function bossHit(b) {
    b.hp--; b.inv = 0.4; b.hurtT = 0.3;
    burst(b.x, b.y - 60, 14, '#ffd27a', 200, 0.5, 3);
    sfx('boss_hit');
    hitstop = 0.07;
    shakeA = Math.max(shakeA, 6);
    if (b.hp <= 0) { killBoss(b); return; }
    if (b.phase === 1 && b.hp <= 12) { b.phase = 2; playScene('boss_phase2', null); }
    else if (b.phase === 2 && b.hp <= 6) { b.phase = 3; playScene('boss_phase3', null); }
  }
  function killBoss(b) {
    b.dead = true; b.st = 0; b.defeatHandled = false; b.vx = 0;
    // commit the kill now, so a death during the defeat delay does not revive the boss
    progressOf(story.chapterId).bossDead = true;
    saveGame();
    sfx('boss_die');
    shakeA = Math.max(shakeA, 12);
    flashT = 0.5;
    burst(b.x, b.y - 60, 40, '#ffd27a', 260, 1.2, 3.5);
  }
  function checkGate() {
    const b = world.boss;
    if (!b || b.active || b.dead || gateClosed || gateCol < 0) return;
    if (player.x - player.w / 2 > (gateCol + 1) * TS) {
      gateClosed = true;
      b.active = true; b.state = 'intro'; b.st = 0; b.dur = 1.6;
      sfx('door'); sfx('boss_intro');
      music('boss');
      shakeA = Math.max(shakeA, 6);
    }
  }
  function defeatBoss() {
    world.boss = null;
    progressOf(story.chapterId).bossDead = true;
    playScene('boss_defeated', () => { openGate(); music(ch.music); saveGame(); });
  }
  // The Regent fell but its defeat scene never played (quit or reload during the delay or the dialogue,
  // or a death during the delay): play it now. Returns true when a dialogue was started.
  function replayDefeatIfNeeded() {
    const pr = progressOf(story.chapterId);
    if (!pr.bossDead || pr.scenesDone.has('boss_defeated')) return false;
    return playScene('boss_defeated', () => { openGate(); music(ch.music); saveGame(); });
  }
  function openGate() {
    gateClosed = false;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (grid[r][c] === 'B') grid[r][c] = '.';
  }

  /* ---------- scènes et dialogues ---------- */
  function playScene(id, cb) {
    const s = (ch.scenes || []).find((x) => x.id === id);
    const pr = progressOf(story.chapterId);
    if (!s || !s.lines || pr.scenesDone.has(id)) { if (cb) cb(); return false; }
    pr.scenesDone.add(id);
    startDialog(s.lines, cb);
    return true;
  }
  function triggerScenes() {
    if (mode !== 'play') return;
    const pr = progressOf(story.chapterId);
    for (const s of ch.scenes || []) {
      if (!s.id || s.id.indexOf('boss_') === 0 || pr.scenesDone.has(s.id)) continue;
      if (player.x >= s.col * TS) {
        pr.scenesDone.add(s.id);
        startDialog(s.lines || [], null);
        return;
      }
    }
  }
  function nearNpc() {
    if (!world) return null;
    for (const n of world.npcs) {
      if (!n.talking && Math.abs(n.x - player.x) < TALK_X && Math.abs(n.y - player.y) < TALK_Y) return n;
    }
    return null;
  }
  function talkTo(n) {
    const pr = progressOf(story.chapterId);
    const again = pr.npcTalked.has(n.marker) && n.data && n.data.again;
    pr.npcTalked.add(n.marker);
    n.talking = true;
    const lines = again || (n.data && n.data.lines) || [];
    startDialog(lines, () => { n.talking = false; saveGame(); });
  }

  function startDialog(lines, onEnd) {
    dlg = { lines: lines || [], i: 0, cur: null, wrapped: [], chars: 0, choice: null, onEnd: onEnd || null };
    slowing = false;   // no slow time during a dialogue: it would keep the tint and the slow pose on
    mode = 'dialog';
    dialogStep();
  }
  function dialogStep() {
    while (dlg && dlg.i < dlg.lines.length) {
      const L = dlg.lines[dlg.i++];
      if (L.act === 'choice') {
        const options = (L.options || []).slice(0, 3);   // the dialogue box has room for three choices
        if (!options.length) continue;
        dlg.cur = null;
        dlg.choice = { options, sel: 0 };
        return;
      }
      if (L.act === 'end') { closeDialogRaw(); startEnding(L.value); return; }
      if (L.act) { doAct(L); continue; }
      const narr = L.who === 'narrator' || !hasArt(L.who);
      dlg.cur = Object.assign({}, L, { text: String(L.text || '') });
      dlg.chars = 0;
      dlg.wrapped = wrapText(dlg.cur.text, narr ? 820 : 660, narr ? ITALIC : FONT);
      return;
    }
    closeDialog();
  }
  function closeDialogRaw() {
    const cb = dlg ? dlg.onEnd : null;
    dlg = null;
    mode = 'play';
    return cb;
  }
  function closeDialog() {
    const cb = closeDialogRaw();
    if (cb) cb();
  }
  function doAct(L) {
    switch (L.act) {
      case 'unlock': unlockAbility(L.value); break;
      case 'flag': story.flags.add(L.value); break;
      case 'shake': shakeA = Math.max(shakeA, 9); break;
      case 'flash': flashT = 0.5; break;
      case 'sfx': sfx(L.value); break;
      default: break;
    }
  }
  function unlockAbility(name) {
    if (story.unlocks.has(name)) return;
    story.unlocks.add(name);
    sfx('unlock');
    toast('New ability: ' + (ABILITY_TEXT[name] || name));
    saveGame();
  }
  function updateDialog(dt) {
    if (!dlg) { mode = 'play'; return; }
    if (dlg.choice) {
      const n = dlg.choice.options.length;
      if (hit('up')) dlg.choice.sel = (dlg.choice.sel + n - 1) % n;
      if (hit('down')) dlg.choice.sel = (dlg.choice.sel + 1) % n;
      if (hit('ok')) {
        const o = dlg.choice.options[dlg.choice.sel];
        if (!o) { dlg.choice = null; dialogStep(); return; }
        if (o.flag) story.flags.add(o.flag);
        sfx('choice');
        dlg.choice = null;
        if (o.end) { closeDialogRaw(); startEnding(o.end); }
        else dialogStep();
      }
      return;
    }
    if (!dlg.cur) { dialogStep(); return; }
    const len = dlg.cur.text.length;
    if (dlg.chars < len) {
      const before = Math.floor(dlg.chars);
      dlg.chars = Math.min(len, dlg.chars + CPS * dt);
      if (Math.floor(dlg.chars) !== before && Math.floor(dlg.chars) % 3 === 0 && dlg.cur.who !== 'narrator') sfx('talk');
    }
    if (hit('ok')) {
      if (dlg.chars < len) dlg.chars = len;
      else dialogStep();
    }
  }

  /* ---------- fins ---------- */
  function endData(key) {
    const E = window.ENDINGS && window.ENDINGS[key];
    if (E) return E;
    return {
      title: 'THE END', subtitle: '', theme: 'clockface', music: key === 'good' ? 'ending_good' : 'ending_bad',
      lines: [{ who: 'narrator', text: 'THE END' }], credits: 'Thanks for playing.',
    };
  }
  function startEnding(key) {
    endKey = key;
    const E = endData(key);
    themeOverride = E.theme || 'clockface';
    music(E.music || (key === 'good' ? 'ending_good' : 'ending_bad'));
    endCard = { t: 0 };
    mode = 'endcard';
  }
  function beginEndingDialog() {
    const E = endData(endKey);
    startDialog(E.lines || [], () => {
      credits = { t: 0 };
      mode = 'credits';
    });
  }
  function finishGame() {
    eraseSave();
    newStory();
    themeOverride = null;
    endKey = null;
    credits = null;
    mode = 'title';
    titleSel = 0;
    music('title');
  }

  /* ---------- transitions, chapitres ---------- */
  function startTransition(fn) {
    transition = { t: 0, stage: 0, fn };
  }
  function updateTransition(dt) {
    const tr = transition;
    tr.t += dt;
    if (tr.stage === 0 && tr.t >= 0.4) { tr.stage = 1; tr.t = 0; tr.fn(); }
    else if (tr.stage === 1 && tr.t >= 0.4) transition = null;
  }
  function enterChapter(id, debug) {
    story.chapterId = id;
    buildWorld(id);
    player = newPlayer(progressOf(id).checkpoint || world.start);
    snapCamera();
    particles = []; slowGauge = 1; slowing = false; hitstop = 0;
    card = { t: 0, kicker: ch.kicker || '', title: ch.title || '' };
    themeOverride = null;
    endKey = null;
    mode = 'card';
    music(ch.music);
    if (!debug) saveGame();   // debug starts (LHF.start) do not overwrite the real save
  }
  function respawn() {
    const id = story.chapterId;
    buildWorld(id);
    player = newPlayer(progressOf(id).checkpoint || world.start);
    player.inv = 1.2;
    snapCamera();
    particles = []; slowGauge = 1; slowing = false; hitstop = 0;
    mode = 'play';
    music(ch.music);
    replayDefeatIfNeeded();
  }
  function exitChapter() {
    const next = ch.next;
    if (!next) return;
    startTransition(() => enterChapter(next));
  }

  /* ---------- caméra, particules, toasts ---------- */
  function snapCamera() {
    cam.x = clamp(player.x - W * 0.5, 0, Math.max(0, cols * TS - W));
    cam.y = clamp(player.y - H * 0.62, 0, Math.max(0, rows * TS - H));
  }
  function updateCamera(dt) {
    const tx = clamp(player.x - W * 0.5, 0, Math.max(0, cols * TS - W));
    const ty = clamp(player.y - H * 0.62, 0, Math.max(0, rows * TS - H));
    const k = 1 - Math.exp(-dt * 6);
    cam.x += (tx - cam.x) * k;
    cam.y += (ty - cam.y) * k;
  }
  function burst(x, y, n, color, speed, life, size) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = speed * (0.3 + Math.random() * 0.7);
      particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - speed * 0.3, life, max: life,
        size: size * (0.6 + Math.random() * 0.8), color, g: 500, ring: false,
      });
    }
    if (particles.length > 350) particles.splice(0, particles.length - 350);
  }
  function puff(x, y, n, color) { burst(x, y, n, color, 60, 0.35, 3); }
  function ring(x, y) {
    particles.push({ x, y, vx: 0, vy: 0, life: 0.4, max: 0.4, size: 6, color: '#f2c66d', g: 0, ring: true });
  }
  function updateParticles(dt) {
    for (const p of particles) {
      p.life -= dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt;
    }
    particles = particles.filter((p) => p.life > 0);
  }
  function drawParticles() {
    for (const p of particles) {
      const a = Math.max(0, p.life / p.max);
      ctx.globalAlpha = a;
      if (p.ring) {
        ctx.strokeStyle = p.color; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size + (1 - a) * 22, 0, Math.PI * 2); ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * a + 0.5, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
  function toast(text) {
    toasts.push({ text, t: 0 });
    if (toasts.length > 3) toasts.shift();
  }
  function updateToasts(dt) {
    for (const t of toasts) t.t += dt;
    toasts = toasts.filter((t) => t.t < 2.6);
  }

  /* ---------- texte ---------- */
  function wrapText(text, maxW, font) {
    ctx.save();
    ctx.font = font || FONT;
    const words = String(text).split(' ');
    const lines = [];
    let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (cur && ctx.measureText(test).width > maxW) { lines.push(cur); cur = w; }
      else cur = test;
    }
    if (cur) lines.push(cur);
    ctx.restore();
    return lines;
  }
  function panel(x, y, w, h, r) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h);
    ctx.fillStyle = 'rgba(14,10,20,0.9)';
    ctx.fill();
    ctx.strokeStyle = '#c99a3b'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  }

  /* ---------- mise à jour ---------- */
  function update(dt) {
    time += dt;
    shakeA *= Math.exp(-dt * 9);
    if (shakeA < 0.05) shakeA = 0;
    flashT = Math.max(0, flashT - dt);
    if (mode !== 'pause') updateToasts(dt);
    updateParticles(dt);
    if (transition) { updateTransition(dt); return; }
    switch (mode) {
      case 'title': updateTitle(); break;
      case 'controls': if (hit('ok') || hit('pause')) mode = controlsBack; break;
      case 'card':
        card.t += dt;
        if (hit('ok')) card.t = 99;
        // a catch-up defeat scene starts here, after the card, so the card does not cut it short
        if (card.t > 3.0 && !replayDefeatIfNeeded()) mode = 'play';
        break;
      case 'play': updatePlay(dt); break;
      case 'pause': updatePause(); break;
      case 'dialog': updateDialog(dt); break;
      case 'endcard':
        endCard.t += dt;
        if (hit('ok') || endCard.t > 3.6) beginEndingDialog();
        break;
      case 'credits':
        credits.t += dt;
        if (credits.t > 2 && hit('ok')) finishGame();
        break;
      default: break;
    }
  }

  function updatePlay(dt) {
    if (hit('pause')) { mode = 'pause'; pauseSel = 0; slowing = false; return; }
    if (player.dead) {
      slowing = false;
      player.vy = Math.min(MAX_FALL, player.vy + GRAV * dt);   // the body keeps falling during the death fade
      moveBody(player, dt, false);
      player.deadT += dt;
      if (player.deadT > 1.1 && !transition) startTransition(respawn);
      return;
    }
    if (hitstop > 0) {
      hitstop -= dt;
      if (hit('jump')) player.jumpBuf = 0.12;   // presses during hitstop are buffered, not lost
      if (hit('attack')) player.atkBuf = Math.max(0.12, player.atkCd + dt);
      if (hit('dash')) player.dashBuf = Math.max(0.12, player.dashCd + dt);
      return;
    }
    slowing = story.unlocks.has('pendule') && on('slow') && slowGauge > 0.02;
    if (slowing) slowGauge = Math.max(0, slowGauge - 0.4 * dt);
    else slowGauge = Math.min(1, slowGauge + 0.15 * dt);
    const sdt = slowing ? dt * 0.35 : dt;

    updatePlayer(dt);
    if (player.dead || transition) { updateCamera(dt); return; }
    updateEnemies(dt, sdt);
    updateCombat();
    updateBoss(dt, sdt);
    checkGate();
    if (player.dead || mode !== 'play') { updateCamera(dt); return; }
    const near = nearNpc();
    if (near && hit('talk')) { talkTo(near); updateCamera(dt); return; }
    triggerScenes();
    updateCamera(dt);
  }

  function updatePause() {
    if (hit('pause')) { mode = 'play'; return; }
    if (hit('up')) pauseSel = (pauseSel + 2) % 3;
    if (hit('down')) pauseSel = (pauseSel + 1) % 3;
    if (hit('ok')) {
      if (pauseSel === 0) mode = 'play';
      else if (pauseSel === 1) { controlsBack = 'pause'; mode = 'controls'; }
      else { mode = 'title'; titleSel = 0; music('title'); }
    }
  }

  function titleItems() {
    const items = [{ id: 'new', label: 'New Game' }];
    if (hasSave()) items.push({ id: 'continue', label: 'Continue' });
    items.push({ id: 'controls', label: 'Controls' });
    return items;
  }
  function updateTitle() {
    const items = titleItems();
    if (titleSel >= items.length) titleSel = 0;
    if (hit('up')) titleSel = (titleSel + items.length - 1) % items.length;
    if (hit('down')) titleSel = (titleSel + 1) % items.length;
    if (hit('ok')) {
      const id = items[titleSel].id;
      if (id === 'new') { debugSession = false; newStory(); enterChapter('ch1'); }
      else if (id === 'continue') { debugSession = false; if (loadGame()) enterChapter(story.chapterId); }
      else { controlsBack = 'title'; mode = 'controls'; }
    }
  }

  /* ---------- rendu ---------- */
  function render() {
    ctx.save();
    if (shakeA > 0.2) ctx.translate(rnd(-shakeA, shakeA), rnd(-shakeA, shakeA));
    switch (mode) {
      case 'title': drawTitle(); break;
      case 'controls': drawControls(); break;
      case 'credits': drawCredits(); break;
      case 'endcard': drawEndCard(); break;
      case 'dialog':
        // ending narration: the ENDINGS backdrop only, no live level or HUD behind it
        if (endKey) {
          if (window.ENV) ENV.drawBackground(ctx, endData(endKey).theme || 'clockface', time * 6, 0, time, W, H);
          break;
        }
        drawGame(); break;
      default: drawGame(); break;
    }
    ctx.restore();
    if (mode === 'card') drawCard();
    if (mode === 'pause') drawPause();
    if (mode === 'dialog') drawDialog();
    if (flashT > 0) {
      ctx.fillStyle = 'rgba(255,248,230,' + (flashT / 0.5 * 0.75).toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);
    }
    if (transition) {
      const a = transition.stage === 0 ? transition.t / 0.4 : 1 - transition.t / 0.4;
      ctx.fillStyle = 'rgba(6,4,10,' + clamp(a, 0, 1).toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);
    }
  }

  function drawTiles(theme) {
    const c0 = Math.max(0, Math.floor(cam.x / TS)), c1 = Math.min(cols - 1, Math.floor((cam.x + W) / TS) + 1);
    const r0 = Math.max(0, Math.floor(cam.y / TS)), r1 = Math.min(rows - 1, Math.floor((cam.y + H) / TS) + 1);
    const solidTile = (c, r) => r >= 0 && r < rows && c >= 0 && c < cols && (grid[r][c] === '#' || grid[r][c] === 'B');
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const k = grid[r][c];
        if (k === '.' || !window.ENV) continue;
        const nb = { u: solidTile(c, r - 1), d: solidTile(c, r + 1), l: solidTile(c - 1, r), r: solidTile(c + 1, r) };
        ENV.drawTile(ctx, theme, k, c * TS, r * TS, time, nb);
      }
    }
  }

  function drawGame() {
    const theme = themeOverride || (ch && ch.theme) || 'station';
    if (window.ENV) ENV.drawBackground(ctx, theme, cam.x, cam.y, time, W, H);
    if (!world) return;
    ctx.save();
    ctx.translate(-Math.round(cam.x), -Math.round(cam.y));
    drawTiles(theme);
    for (const e of world.enemies) if (!e.gone) drawActorAt(e.kind, e.x, e.y, enemyPose(e));
    for (const n of world.npcs) drawNpc(n);
    const b = world.boss;
    if (b && (b.active || b.dead)) drawActorAt('regent', b.x, b.y, Object.assign(bossPose(b), { facing: b.facing }));
    if (!(player.inv > 0 && !player.dead && Math.floor(time * 18) % 2 === 0)) {
      drawActorAt('leo', player.x, player.y, playerPose());
    }
    drawParticles();
    drawPrompt();
    ctx.restore();
    if (window.ENV) ENV.drawForeground(ctx, theme, cam.x, cam.y, time, W, H);
    if (slowing) { ctx.fillStyle = 'rgba(70,150,210,0.1)'; ctx.fillRect(0, 0, W, H); }
    if (mode !== 'card') drawHUD();
    drawToasts();
  }

  function drawNpc(n) {
    const talking = dlg && dlg.cur && dlg.cur.who === n.who;
    n.facing = player.x < n.x ? -1 : 1;
    drawActorAt(n.who, n.x, n.y, { state: talking ? 'talk' : 'idle', t: time, time, vx: 0, vy: 0, facing: n.facing, phase: 1 });
  }

  function drawPrompt() {
    if (mode !== 'play' || player.dead) return;
    const n = nearNpc();
    if (!n) return;
    const y = n.y - 84 + Math.sin(time * 4) * 2;
    ctx.save();
    ctx.font = 'bold 15px Georgia, serif';
    const label = 'E  ·  Talk';
    const tw = ctx.measureText(label).width + 22;
    ctx.fillStyle = 'rgba(14,10,20,0.9)';
    ctx.strokeStyle = '#c99a3b'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(n.x - tw / 2, y - 14, tw, 24, 8) : ctx.rect(n.x - tw / 2, y - 14, tw, 24);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f0d68a';
    ctx.textAlign = 'center';
    ctx.fillText(label, n.x, y + 3);
    ctx.restore();
  }

  function drawHeart(x, y, s, color, stroke = '#1c1420') {
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.8);
    ctx.bezierCurveTo(x - s * 1.2, y + s * 0.1, x - s * 0.6, y - s * 0.9, x, y - s * 0.3);
    ctx.bezierCurveTo(x + s * 0.6, y - s * 0.9, x + s * 1.2, y + s * 0.1, x, y + s * 0.8);
    ctx.closePath();
    ctx.fillStyle = color; ctx.fill();
    ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke();
  }

  function drawHUD() {
    ctx.save();
    for (let i = 0; i < MAX_HP; i++) {
      if (i < player.hp) drawHeart(34 + i * 30, 30, 11, '#e0664c');
      else drawHeart(34 + i * 30, 30, 11, 'rgba(20,16,26,0.5)', 'rgba(243,234,216,0.45)');
    }
    // the Regent's health, with ticks at the phase 2 and phase 3 thresholds
    const b = world && world.boss;
    if (b && b.active && !b.dead && mode !== 'dialog') {
      const bx = W / 2 - 150;
      ctx.font = '13px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#f3ead8';
      ctx.fillText(NAMES.regent, W / 2, 16);
      ctx.fillStyle = 'rgba(20,16,26,0.85)'; ctx.fillRect(bx, 20, 300, 10);
      ctx.fillStyle = '#e0664c'; ctx.fillRect(bx, 20, 300 * Math.max(0, b.hp) / 18, 10);
      ctx.fillStyle = 'rgba(243,234,216,0.7)';
      ctx.fillRect(bx + 199, 17, 2, 16); ctx.fillRect(bx + 99, 17, 2, 16);
    }
    const pr = progressOf(story.chapterId);
    ctx.font = 'bold 18px Georgia, serif';
    ctx.textAlign = 'right';
    const gearTxt = pr.gears + ' / ' + (world ? world.gearsTotal : 0);
    // the icon sits just left of the measured counter, so a long count never covers it
    if (window.ART && ART.gear) ART.gear(ctx, W - 30 - ctx.measureText(gearTxt).width - 22, 30, 11, 9, time * 2, '#d9b35a');
    ctx.fillStyle = '#f3ead8';
    ctx.fillText(gearTxt, W - 30, 36);
    if (story.unlocks.has('pendule')) {
      ctx.fillStyle = 'rgba(243,234,216,0.18)'; ctx.fillRect(26, 52, 130, 10);
      ctx.fillStyle = '#7fd0e8'; ctx.fillRect(26, 52, 130 * slowGauge, 10);
      ctx.strokeStyle = 'rgba(243,234,216,0.4)'; ctx.lineWidth = 1; ctx.strokeRect(26, 52, 130, 10);
      ctx.font = '14px Georgia, serif'; ctx.textAlign = 'left';
      ctx.fillStyle = '#cbe9f2';
      ctx.fillText('Pendulum · hold C / L', 26, 74);
    }
    const chips = [];
    if (mode !== 'dialog' && story.unlocks.has('dash')) chips.push('Glide · Shift / K');
    if (mode !== 'dialog' && story.unlocks.has('ressort')) chips.push('Spring · jump in midair');
    ctx.font = '14px Georgia, serif'; ctx.textAlign = 'left';
    chips.forEach((t, i) => {
      const y = H - 16 - (chips.length - 1 - i) * 28;
      const tw = ctx.measureText(t).width + 28;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(26, y - 15, tw, 22, 8) : ctx.rect(26, y - 15, tw, 22);
      ctx.fillStyle = 'rgba(14,10,20,0.9)'; ctx.strokeStyle = '#c99a3b'; ctx.lineWidth = 1;
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f3ead8';
      ctx.fillText(t, 40, y);
    });
    ctx.restore();
  }
  function drawToasts() {
    ctx.save();
    ctx.font = 'bold 17px Georgia, serif';
    ctx.textAlign = 'center';
    toasts.forEach((t, i) => {
      const a = clamp(Math.min((2.6 - t.t) * 2, t.t * 4), 0, 1);
      const tw = ctx.measureText(t.text).width + 36;
      const y = 92 + i * 36;
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(14,10,20,0.9)';
      ctx.strokeStyle = '#c99a3b'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(W / 2 - tw / 2, y - 20, tw, 30, 9) : ctx.rect(W / 2 - tw / 2, y - 20, tw, 30);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f0d68a';
      ctx.fillText(t.text, W / 2, y);
    });
    ctx.restore();
  }

  function drawCard() {
    const t = card.t;
    const a = clamp(Math.min(t / 0.6, (3.0 - t) / 0.5), 0, 1);
    ctx.save();
    ctx.fillStyle = 'rgba(8,6,12,' + (0.85 * a).toFixed(3) + ')';
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    if (window.ART && ART.gear) ART.gear(ctx, W / 2, H / 2 - 92, 26, 12, time, '#c99a3b');
    ctx.fillStyle = '#c99a3b';
    ctx.font = '600 18px Georgia, serif';
    ctx.fillText(card.kicker.toUpperCase(), W / 2, H / 2 - 30);
    ctx.fillStyle = '#f3ead8';
    ctx.font = 'bold 52px Georgia, serif';
    ctx.fillText(card.title, W / 2, H / 2 + 36);
    ctx.restore();
  }

  function drawPanelText(lines, x, y, lh, color, font) {
    ctx.save();
    ctx.font = font || FONT;
    ctx.fillStyle = color || '#f3ead8';
    lines.forEach((l, i) => ctx.fillText(l, x, y + i * lh));
    ctx.restore();
  }

  function drawDialog() {
    const bx = 40, by = 372, bw = 880, bh = 140;
    panel(bx, by, bw, bh, 14);
    if (dlg.choice) {
      ctx.save();
      ctx.font = FONT;
      ctx.fillStyle = '#f3ead8';
      ctx.fillText('What will you do?', 226, by + 30);
      dlg.choice.options.forEach((o, i) => {
        const sel = i === dlg.choice.sel;
        ctx.fillStyle = sel ? '#f0d68a' : '#cbbfa6';
        ctx.fillText((sel ? '▸ ' : '   ') + o.text, 226, by + 62 + i * 34);
      });
      ctx.restore();
      return;
    }
    const L = dlg.cur;
    if (!L) return;
    const narr = L.who === 'narrator' || !hasArt(L.who);
    if (!narr) {
      ctx.save();
      ctx.fillStyle = '#2a2233';
      ctx.strokeStyle = '#c99a3b'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(46, 256, 156, 156, 12) : ctx.rect(46, 256, 156, 156);
      ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.rect(46, 256, 156, 156); ctx.clip();
      ctx.translate(124, 336); ctx.scale(0.8, 0.8);
      if (window.ART) ART.portrait(ctx, L.who, L.expr || 'neutral', time);
      ctx.restore();
      ctx.save();
      ctx.font = 'bold 20px Georgia, serif';
      ctx.fillStyle = '#f0d68a';
      ctx.fillText(NAMES[L.who] || L.who, 226, by + 26);
      ctx.restore();
    }
    const tx = narr ? 64 : 226;
    const font = narr ? ITALIC : FONT;
    ctx.save();
    ctx.font = font;
    ctx.fillStyle = narr ? '#e4d7bd' : '#f3ead8';
    let remaining = Math.floor(dlg.chars);
    dlg.wrapped.forEach((line, i) => {
      if (remaining <= 0) return;
      const shown = line.slice(0, remaining);
      ctx.fillText(shown, tx, by + 56 + i * 30);
      remaining -= line.length + 1;
    });
    ctx.restore();
    if (dlg.chars >= L.text.length) {
      const bob = Math.sin(time * 6) * 3;
      ctx.save();
      ctx.fillStyle = '#f0d68a';
      ctx.beginPath();
      ctx.moveTo(bx + bw - 34, by + bh - 24 + bob);
      ctx.lineTo(bx + bw - 22, by + bh - 24 + bob);
      ctx.lineTo(bx + bw - 28, by + bh - 16 + bob);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }

  function drawMenuItems(items, sel, y0, gap) {
    ctx.save();
    ctx.textAlign = 'center';
    items.forEach((it, i) => {
      const on = i === sel, y = y0 + i * gap;
      ctx.font = (on ? 'bold ' : '') + '26px Georgia, serif';
      ctx.fillStyle = on ? '#f0d68a' : '#cbbfa6';
      ctx.fillText(it.label, W / 2, y);
      if (on) {
        // the arrow hangs to the left of the label, so the label itself never shifts
        ctx.textAlign = 'right';
        ctx.fillText('▸', W / 2 - ctx.measureText(it.label).width / 2 - 14, y);
        ctx.textAlign = 'center';
      }
    });
    ctx.restore();
  }
  function drawTitle() {
    if (window.ENV) ENV.drawBackground(ctx, 'station', time * 8, 0, time, W, H);
    ctx.fillStyle = 'rgba(8,6,12,0.55)';
    ctx.fillRect(0, 0, W, H);
    // soft scrim behind the title lettering; squashed vertically so the falloff ends above the subtitle band
    ctx.save();
    ctx.translate(W / 2, 200); ctx.scale(1, 0.45);
    const scrim = ctx.createRadialGradient(0, 0, 40, 0, 0, 290);
    scrim.addColorStop(0, 'rgba(8,6,12,0.7)'); scrim.addColorStop(1, 'rgba(8,6,12,0)');
    ctx.fillStyle = scrim;
    ctx.fillRect(-W / 2, -200 / 0.45, W, 330 / 0.45);
    ctx.restore();
    // dims the station clock dial behind the logo, so its hands and bright rim stay quiet under the lettering
    const dial = ctx.createRadialGradient(W / 2, 150, 0, W / 2, 150, 180);
    dial.addColorStop(0, 'rgba(8,6,12,0.6)'); dial.addColorStop(0.75, 'rgba(8,6,12,0.5)'); dial.addColorStop(1, 'rgba(8,6,12,0)');
    ctx.fillStyle = dial;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(8,6,12,0.7)';
    ctx.fillRect(0, 486, W, 54);
    drawActorAt('leo', 250, 492, { state: 'idle', t: time, time, vx: 0, vy: 0, facing: 1, phase: 1 });
    drawActorAt('gaspard', 640, 492, { state: 'idle', t: time, time, vx: 0, vy: 0, facing: -1, phase: 1 });
    drawActorAt('juliette', 800, 420 + Math.sin(time * 1.5) * 8,{ state: 'idle', t: time, time, vx: 0, vy: 0, facing: 1, phase: 1 });
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'italic 24px Georgia, serif';
    ctx.fillStyle = '#c99a3b';
    ctx.fillText('THE', W / 2, 112);
    ctx.font = 'bold 84px Georgia, serif';
    ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#f0d68a';
    ctx.fillText('FROZEN', W / 2, 180);
    ctx.fillText('HOUR', W / 2, 262);
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    // soft dark band under the subtitle, so the brass clock plate behind "where a whole city" does not cut through the italic
    const band = ctx.createLinearGradient(0, 274, 0, 322);
    band.addColorStop(0, 'rgba(8,6,16,0)'); band.addColorStop(0.2, 'rgba(8,6,16,0.6)');
    band.addColorStop(0.8, 'rgba(8,6,16,0.6)'); band.addColorStop(1, 'rgba(8,6,16,0)');
    ctx.fillStyle = band;
    ctx.fillRect(0, 274, W, 48);
    ctx.font = 'italic 22px Georgia, serif';
    ctx.fillStyle = '#e4d7bd';
    ctx.fillText('A story from Vermeil, where a whole city waits for a minute that never ends', W / 2, 306);
    ctx.restore();
    drawMenuItems(titleItems(), titleSel, 380, 46);
    ctx.save();
    ctx.font = '14px Georgia, serif'; ctx.fillStyle = 'rgba(243,234,216,0.55)'; ctx.textAlign = 'center';
    ctx.fillText('Up / Down to choose  ·  Enter or Space to confirm', W / 2, 522);
    ctx.restore();
  }
  function drawPause() {
    ctx.save();
    ctx.fillStyle = 'rgba(6,4,10,0.6)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.font = 'bold 48px Georgia, serif';
    ctx.fillStyle = '#f0d68a';
    ctx.fillText('Pause', W / 2, 190);
    ctx.restore();
    drawMenuItems([{ label: 'Resume' }, { label: 'Controls' }, { label: 'Main Menu' }], pauseSel, 270, 46);
  }
  function drawControls() {
    if (window.ENV) ENV.drawBackground(ctx, 'station', time * 4, 0, time, W, H);
    ctx.fillStyle = 'rgba(8,6,12,0.6)';
    ctx.fillRect(0, 0, W, H);
    panel(150, 80, 660, 380, 16);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 34px Georgia, serif';
    ctx.fillStyle = '#f0d68a';
    ctx.fillText('Controls', W / 2, 136);
    ctx.textAlign = 'left';
    CONTROLS.forEach(([label, keys], i) => {
      const y = 186 + i * 32;
      ctx.font = '19px Georgia, serif';
      ctx.fillStyle = '#f3ead8';
      ctx.fillText(label, 186, y);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#c99a3b';
      ctx.fillText(keys, 774, y);
      ctx.textAlign = 'left';
    });
    ctx.textAlign = 'center';
    ctx.font = '16px Georgia, serif';
    ctx.fillStyle = 'rgba(243,234,216,0.7)';
    ctx.fillText('Enter or Esc to go back', W / 2, 452);
    ctx.restore();
  }
  function drawEndCard() {
    const E = endData(endKey);
    if (window.ENV) ENV.drawBackground(ctx, E.theme || 'clockface', time * 6, 0, time, W, H);
    const a = clamp(Math.min(endCard.t / 0.8, (3.6 - endCard.t) / 0.6), 0, 1);
    ctx.save();
    ctx.fillStyle = 'rgba(8,6,12,' + (0.6 * (1 - a * 0.3)).toFixed(3) + ')';
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#c99a3b';
    ctx.font = '600 18px Georgia, serif';
    ctx.fillText((E.subtitle || '').toUpperCase(), W / 2, H / 2 - 30);
    ctx.fillStyle = '#f3ead8';
    ctx.font = 'bold 52px Georgia, serif';
    ctx.fillText(E.title || 'THE END', W / 2, H / 2 + 36);
    ctx.restore();
  }
  function drawCredits() {
    const E = endData(endKey);
    if (window.ENV) ENV.drawBackground(ctx, E.theme || 'clockface', time * 3, 0, time, W, H);
    ctx.fillStyle = 'rgba(8,6,12,0.7)';
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f0d68a';
    ctx.font = 'bold 40px Georgia, serif';
    ctx.fillText(E.title || 'THE END', W / 2, 150);
    ctx.font = 'italic 20px Georgia, serif';
    ctx.fillStyle = '#e4d7bd';
    ctx.fillText(E.subtitle || '', W / 2, 190);
    ctx.font = '20px Georgia, serif';
    ctx.fillStyle = '#f3ead8';
    wrapText(E.credits || '', 640, '20px Georgia, serif').forEach((l, i) => ctx.fillText(l, W / 2, 260 + i * 30));
    if (credits && credits.t > 2) {
      ctx.font = '16px Georgia, serif';
      ctx.fillStyle = 'rgba(243,234,216,0.7)';
      ctx.fillText('Press Enter to return to the menu', W / 2, 480);
    }
    ctx.restore();
  }

  /* ---------- boucle ---------- */
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    try {
      update(dt);
      render();
    } catch (e) {
      console.error(e);
    }
    hitSet.clear();
    requestAnimationFrame(frame);
  }

  // Accès de test (console / navigateur sans-tête) : LHF.start('ch2'), LHF.state(), etc.
  window.LHF = {
    // Dev only: drops any running dialogue or transition. Saving is off until the title menu starts or continues a game.
    start(id) {
      const target = id || 'ch1';
      if (!CHAPTERS.get(target)) throw new Error('Chapitre introuvable : ' + target);
      dlg = null; transition = null;
      debugSession = true;
      newStory(); if (id !== 'ch1') story.unlocks = new Set(['dash', 'pendule', 'ressort']);
      enterChapter(target, true);
    },
    skipCard() { if (mode === 'card') mode = 'play'; },
    teleport(x, y) { if (player) { player.x = x; player.y = y; player.vx = 0; player.vy = 0; } },
    state() {
      return {
        mode, chapter: story.chapterId, hp: player && player.hp, x: player && player.x, y: player && player.y,
        dead: !!(player && player.dead), onGround: !!(player && player.onGround),
        gears: progressOf(story.chapterId).gears, gearsTotal: world ? world.gearsTotal : 0,
        unlocks: [...story.unlocks], flags: [...story.flags],
        dialog: dlg && dlg.cur ? dlg.cur.text : null, choice: !!(dlg && dlg.choice),
        boss: world && world.boss ? { hp: world.boss.hp, phase: world.boss.phase, state: world.boss.state, active: world.boss.active } : null,
        enemies: world ? world.enemies.length : 0, transition: !!transition, gateClosed, endKey,
      };
    },
    advance() { if (mode === 'dialog') { hitSet.add('Enter'); } },
    // Test hook: deal n hits to the active boss through the normal bossHit path.
    hitBoss(n) {
      const b = world && world.boss;
      if (!b || !b.active || b.dead) return false;
      for (let i = 0; i < n && !b.dead; i++) { b.inv = 0; bossHit(b); }
      return true;
    },
  };

  music('title');
  requestAnimationFrame(frame);
})();
