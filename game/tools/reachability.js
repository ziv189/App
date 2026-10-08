/* Reachability check for a chapter map: can Leo reach the exit, the pickups, the NPCs and the scene triggers?
   Simulates the game's jump, dash, double-jump and acceleration rules (constants match game.js, in tiles).
   Usage: node game/tools/reachability.js game/js/chapters/ch2.js [abilities]
     abilities: comma list of dash,ressort (default follows the story: ch1 none, ch2-3 dash, ch4-5 dash+ressort)
   Exits 1 when the exit, a scene trigger, an NPC or the boss arena cannot be reached. */
const fs = require('fs');
const vm = require('vm');

const file = process.argv[2];
if (!file) { console.log('usage: node game/tools/reachability.js <chapter.js> [dash,ressort]'); process.exit(2); }

const CH = { list: {}, register(c) { this.list[c.id] = c; return c; } };
vm.runInNewContext(fs.readFileSync(file, 'utf8'), { CHAPTERS: CH, console });
const chapter = Object.values(CH.list)[0];

const STORY_ABILITIES = { ch1: [], ch2: ['dash'], ch3: ['dash'], ch4: ['dash', 'ressort'], ch5: ['dash', 'ressort'] };
const abilities = new Set(process.argv[3] !== undefined
  ? process.argv[3].split(',').filter(Boolean)
  : (STORY_ABILITIES[chapter.id] || []));

// Physics in tiles (game.js constants divided by 32 px per tile)
const DT = 1 / 120;
const G = 1700 / 32, VMAX = 880 / 32;
const RUN = 175 / 32, ACC = 1500 / 32, AIR_ACC = 1100 / 32, DEC = 1800 / 32;
const JUMP = 600 / 32, DOUBLE = 520 / 32;
const DASH_V = 470 / 32, DASH_T = 0.17;
const HW = 11 / 32, HT = 46 / 32;   // body half width and height

const map = chapter.map;
const rows = map.length, cols = map[0].length;
const at = (c, r) => (r < 0 || r >= rows || c < 0 || c >= cols) ? '.' : map[r][c];
const solidCell = (c, r) => {
  if (c < 0 || c >= cols) return true;          // level walls
  if (r < 0 || r >= rows) return false;         // sky and pits
  return at(c, r) === '#';                      // B (boss gate) is treated as open
};
const platCell = (c, r) => at(c, r) === '=';
const supportCell = (c, r) => solidCell(c, r) || platCell(c, r);

function bodyCols(x) { return [Math.floor(x - HW + 1e-6), Math.floor(x + HW - 1e-6)]; }
const approach = (v, target, step) => (Math.abs(target - v) <= step ? target : v + Math.sign(target - v) * step);

/* One action from a grounded start. Returns every grounded frame (x, y) along the way.
   action: { dir (-1|0|1), jump (bool), doubleFrame (frame or -1), dashFrame (frame or -1), dashDir (-1|1) } */
function simulate(start, action) {
  let x = start.x, y = start.y, vx = 0, vy = 0, dashT = 0, grounded = true, doubleUsed = false;
  const dir = action.dir || 0;
  const frames = [];
  const maxFrames = Math.round(2.6 / DT);
  for (let f = 0; f < maxFrames; f++) {
    // events, in the order the game applies them: dash, then jump (a jump cancels a dash on the same frame)
    if (f === action.dashFrame && abilities.has('dash')) {
      vx = action.dashDir * DASH_V;
      if (!(f === 0 && action.jump)) { vy = 0; dashT = DASH_T; }
    }
    if (f === 0 && action.jump && grounded) { vy = -JUMP; grounded = false; dashT = 0; }
    if (f === action.doubleFrame && !grounded && !doubleUsed && abilities.has('ressort')) {
      vy = -DOUBLE; doubleUsed = true;
    }
    // horizontal and vertical velocity for this frame
    if (dashT > 0) { dashT -= DT; vy = 0; }
    else {
      const target = dir * RUN;
      const rate = dir !== 0 ? (grounded ? ACC : AIR_ACC) : DEC;
      vx = approach(vx, target, rate * DT);
      vy = Math.min(VMAX, vy + G * DT);
    }
    // horizontal move with wall clamp
    let nx = x + vx * DT;
    const rowsBody = [];
    for (let r = Math.floor(y - HT + 0.05); r <= Math.floor(y - 0.05); r++) rowsBody.push(r);
    if (vx > 0) {
      const c = Math.floor(nx + HW - 1e-6);
      if (rowsBody.some((r) => solidCell(c, r))) { nx = c - HW; vx = 0; dashT = 0; }
    } else if (vx < 0) {
      const c = Math.floor(nx - HW + 1e-6);
      if (rowsBody.some((r) => solidCell(c, r))) { nx = c + 1 + HW; vx = 0; dashT = 0; }
    }
    x = nx;
    // vertical move
    const prevY = y;
    let ny = y + vy * DT;
    const [cl, cr] = bodyCols(x);
    grounded = false;
    if (vy >= 0) {
      const rA = Math.ceil(prevY - 1e-9), rB = Math.floor(ny + 1e-9);
      outer: for (let r = rA; r <= rB; r++) {
        if (prevY > r + 1e-6 || ny < r - 1e-6) continue;
        for (let c = cl; c <= cr; c++) {
          if (supportCell(c, r) && !(platCell(c, r) && !solidCell(c, r) && prevY > r + 0.5)) {
            ny = r; vy = 0; grounded = true; break outer;
          }
        }
      }
      if (!grounded && vy === 0 && dashT <= 0) {
        // standing exactly on a boundary with support underfoot
        const r = Math.round(ny);
        if (Math.abs(ny - r) < 1e-6) {
          for (let c = cl; c <= cr; c++) if (supportCell(c, r)) { grounded = true; break; }
        }
      }
    } else {
      const newTop = ny - HT, prevTop = prevY - HT;
      const rA = Math.floor(newTop), rB = Math.floor(prevTop - 1e-9);
      outer2: for (let r = rA; r <= rB; r++) {
        const under = r + 1;
        if (prevTop < under - 1e-6 || newTop > under) continue;
        for (let c = cl; c <= cr; c++) if (solidCell(c, r)) { ny = under + HT; vy = 0; break outer2; }
      }
    }
    y = ny;
    if (y > rows + 2) break;                       // fell out of the level
    if (grounded) frames.push({ x, y });
  }
  return frames;
}

/* Find the spawn and the collectible cells, then search over grounded standing positions. */
let S = null;
const targets = { exit: [], checkpoints: [], gears: [], oil: [], npcs: [], boss: [] };
for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
  const k = at(c, r);
  if (k === 'S') S = { c, r };
  if (k === 'X') targets.exit.push({ c, r });
  if (k === 'C') targets.checkpoints.push({ c, r });
  if (k === 'o') targets.gears.push({ c, r });
  if (k === 'h') targets.oil.push({ c, r });
  if (k >= '1' && k <= '9') targets.npcs.push({ c, r, k });
  if (k === 'R') targets.boss.push({ c, r });
}
if (!S) { console.log('ERROR: no S start'); process.exit(1); }

const visited = new Set();                         // standing cells "c,r" (feet rest on row r+1)
const frameHits = [];                              // grounded positions, de-duplicated, for overlap checks
const seenPos = new Set();
const queue = [];
function addFrames(frames) {
  for (const f of frames) {
    const c = Math.floor(f.x), r = Math.round(f.y) - 1;
    const pk = Math.round(f.x * 16) + ',' + Math.round(f.y * 16);
    if (!seenPos.has(pk)) { seenPos.add(pk); frameHits.push(f); }
    const key = c + ',' + r;
    if (!visited.has(key) && !solidCell(c, r)) { visited.add(key); queue.push({ x: f.x, y: f.y }); }
  }
}
const startState = { x: S.c + 0.5, y: S.r };
addFrames([startState]);

const doubleFrames = abilities.has('ressort') ? [-1, 12, 24, 36, 48, 60, 72] : [-1];
const dashFrames = abilities.has('dash') ? [0, 8, 16, 24] : [];
while (queue.length) {
  const st = queue.shift();
  const actions = [];
  for (const dir of [-1, 1]) actions.push({ dir, dashFrame: -1, doubleFrame: -1 });    // walk / fall off a ledge
  for (const dir of [-1, 0, 1]) {
    for (const df of doubleFrames) actions.push({ dir, jump: true, doubleFrame: df, dashFrame: -1 });
    for (const dd of [-1, 1]) {
      for (const df of dashFrames) {
        actions.push({ dir, jump: true, doubleFrame: -1, dashFrame: df, dashDir: dd });   // dash, with or without a jump
        actions.push({ dir, jump: false, doubleFrame: -1, dashFrame: df, dashDir: dd });
      }
    }
  }
  for (const a of actions) addFrames(simulate(st, a));
}

/* Check each target against the grounded positions the player actually reaches. */
const near = (fx, fy, c, r, dx, dy) => Math.abs(fx - (c + 0.5)) < dx && Math.abs(fy - (r + 1)) < dy;
const reached = (t, dx = 0.9, dy = 1.4) => frameHits.some((f) => near(f.x, f.y, t.c, t.r, dx, dy));
const exitOk = targets.exit.length === 0 ? null : targets.exit.some((t) => reached(t, 1.0, 1.6));
const unreachedGears = targets.gears.filter((t) => !reached(t, 0.9, 1.6));
const unreachedOil = targets.oil.filter((t) => !reached(t, 0.9, 1.6));
const unreachedCheckpoints = targets.checkpoints.filter((t) => !reached(t, 0.9, 1.6));
const unreachedNpcs = targets.npcs.filter((t) => !frameHits.some((f) => Math.abs(f.x - (t.c + 0.5)) < 2.2 && Math.abs(f.y - (t.r + 1)) < 2.0));
let maxX = 0;
for (const f of frameHits) if (f.x > maxX) maxX = f.x;
const sceneCols = (chapter.scenes || []).filter((s) => s.id && s.id.indexOf('boss_') !== 0);
const unreachedScenes = sceneCols.filter((s) => frameHits.every((f) => f.x < s.col + 0.2));

const result = {
  chapter: chapter.id,
  abilities: [...abilities],
  exitReachable: exitOk,
  furthestColumn: Math.round(maxX * 10) / 10,
  mapWidth: cols,
  unreachedGears: unreachedGears.map((t) => `${t.c},${t.r}`),
  unreachedOil: unreachedOil.map((t) => `${t.c},${t.r}`),
  unreachedCheckpoints: unreachedCheckpoints.map((t) => `${t.c},${t.r}`),
  unreachedNpcs: unreachedNpcs.map((t) => t.k),
  unreachedScenes: unreachedScenes.map((s) => `${s.id}@${s.col}`),
  bossArenaReachable: targets.boss.length ? targets.boss.some((t) => reached(t, 6, 2)) : null,
  gearsTotal: targets.gears.length,
  gearsReachable: targets.gears.length - unreachedGears.length,
};
console.log(JSON.stringify(result, null, 2));

const problems = [];
if (exitOk === false) problems.push('exit unreachable');
if (unreachedNpcs.length) problems.push('NPC unreachable: ' + unreachedNpcs.map((t) => t.k).join(','));
if (unreachedScenes.length) problems.push('scene trigger unreachable: ' + unreachedScenes.map((s) => s.id).join(','));
if (targets.boss.length && result.bossArenaReachable === false) problems.push('boss arena unreachable');
if (problems.length) { console.log('PROBLEMS: ' + problems.join(' | ')); process.exit(1); }
console.log('OK : all exits, NPCs and scene triggers are reachable with abilities [' + [...abilities].join(',') + ']');
