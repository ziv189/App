'use strict';
// ============================================================
//  HORA MORTIS — the Verses (levels). Built by carving rock.
//  Tiles: 0 open, 1 stone, 2 one-way beam, 3 spikes, 4 rotten plank (crumbles), 5 cracked floor (the Toll breaks it)
//  Reach: a jump clears 4 tiles (3 is comfortable); the Chain reaches 170 px.
// ============================================================
const VERSES = [
  {
    name: 'The Ossuary', latin: 'Memento mori', theme: 'ossuary', w: 78, h: 22, card: 'window2',
    build(L) {
      L.carve(1, 4, 18, 13);            // spawn hall, floor row 17
      L.fill(15, 14, 4, 3);             // step up
      L.carve(19, 7, 15, 7);            // raised corridor, floor row 14
      L.fill(11, 16, 2, 1, 3);          // a few spikes
      L.carve(34, 11, 1, 3);            // corridor -> shaft
      L.carve(35, 3, 3, 11);            // wall-jump shaft
      L.carve(38, 3, 23, 3);            // low upper corridor, floor row 6
      L.carve(61, 3, 16, 16);           // drop into the exit chamber, floor row 19
      L.fill(62, 9, 5, 1, 2);
      L.fill(69, 13, 6, 1, 2);
      L.fill(4, 14, 3, 1, 2); L.fill(1, 11, 3, 1, 2); L.fill(4, 8, 3, 1, 2); // a climb to a forgotten bead
      L.spawn(3, 16);
      L.ent('S', 27, 13);
      L.ent('s', 50, 5); L.ent('s', 57, 5);
      L.ent('s', 66, 18); L.ent('s', 72, 12);
      L.exit(75, 18);
      L.bead(1, 5, 7);
      for (const [x, y] of [[2, 16], [13, 16], [20, 13], [32, 13], [62, 18], [70, 18], [40, 5]]) L.candles(x, y);
      L.hint(3, 12, 'A / D  walk      W / SPACE  leap');
      L.hint(20, 9, 'CLICK  strike toward the cursor');
      L.hint(27, 8, 'leap into a wall, then leap again');
      L.hint(41, 4, 'S  roll through their steel');
      L.hint(63, 15, 'slay them all. then leave.');
    },
  },
  {
    name: 'The Nave of Weeping Glass', latin: 'Lacrimosa dies illa', theme: 'nave', w: 90, h: 24, card: 'window1',
    build(L) {
      L.carve(1, 10, 14, 10);           // entry, floor row 20
      L.carve(15, 3, 50, 17);           // the great nave
      L.fill(31, 17, 4, 1, 2);          // steps to the balcony
      L.fill(36, 14, 8, 1, 2);          // balcony
      L.fill(45, 18, 2, 2);             // low wall for cover
      L.carve(65, 12, 24, 8);           // sacristy corridor
      L.fill(70, 17, 4, 1, 2);
      L.spawn(3, 19);
      L.ent('a', 27, 19);
      L.ent('a', 40, 13);
      L.chandelier(53, 8);
      L.ent('s', 52, 19); L.ent('S', 54, 19);
      L.ent('t', 75, 19);
      L.ent('a', 80, 19);
      L.npc('twelfth', 85, 19, 'sit');
      L.exit(88, 19);
      L.bead(2, 42, 13);
      for (const [x, y] of [[2, 19], [12, 19], [17, 19], [33, 19], [48, 19], [62, 19], [67, 19], [80, 19]]) L.candles(x, y);
      L.hint(3, 14, 'strike their blood back at them');
      L.hint(16, 11, 'hold SHIFT or RIGHT-CLICK  chronos');
      L.hint(44, 11, 'some sins hang by a thread');
      L.hint(66, 14, 'the thorn-priest scatters his blood');
    },
  },
  {
    name: 'The Bell Tower', latin: 'Pro quibus campana pulsat', theme: 'tower', w: 40, h: 62, card: 'window3',
    build(L) {
      L.carve(4, 2, 32, 58);            // the shaft, floor row 60
      L.fill(18, 59, 5, 1, 3);
      L.fill(27, 57, 7, 1, 2);
      L.fill(17, 54, 7, 1, 2);
      L.fill(4, 51, 9, 1);
      L.fill(16, 48, 7, 1, 2);
      L.fill(27, 45, 9, 1, 2);
      L.fill(15, 42, 8, 1, 2);
      L.fill(4, 39, 7, 1);
      L.fill(15, 36, 7, 1, 2);
      L.fill(26, 33, 10, 1);
      L.fill(14, 30, 7, 1, 2);
      L.fill(4, 27, 9, 1);
      L.fill(16, 24, 7, 1, 2);
      L.fill(26, 21, 7, 1, 2);
      L.fill(14, 18, 7, 1, 2);
      L.fill(4, 15, 9, 1);
      L.fill(16, 12, 8, 1, 2);
      L.fill(27, 9, 9, 1);              // the summit
      L.spawn(6, 59);
      L.ent('g', 35, 53);
      L.ent('a', 8, 50);
      L.ent('t', 31, 44);
      L.ent('g', 4, 43);
      L.ent('s', 7, 38);
      L.ent('a', 31, 32);
      L.ent('s', 8, 26);
      L.ent('g', 35, 23);
      L.ent('a', 29, 20);
      L.ent('s', 7, 14);
      L.bell(20, 7);
      L.exit(33, 8);
      L.bead(3, 34, 26);
      for (const [x, y] of [[5, 59], [10, 59], [5, 50], [30, 32], [5, 38], [29, 8]]) L.candles(x, y);
      L.hint(7, 56, 'climb. the bell remembers every sin.');
      L.hint(13, 9, 'strike the great bell');
    },
  },
  {
    name: 'The Belfry', latin: 'Vivos voco, mortuos plango', theme: 'belfry', w: 40, h: 20, card: 'window3', boss: 'ezequiel', fervour: 30,
    build(L) {
      L.carve(2, 3, 36, 14);            // floor row 17
      L.fill(9, 14, 4, 1, 2); L.fill(27, 14, 4, 1, 2);
      L.fill(2, 11, 6, 1, 2); L.fill(32, 11, 6, 1, 2);
      L.fill(17, 11, 7, 1, 2);          // under the great bell
      L.spawn(4, 16);
      L.boss('ezequiel', 28, 16);
      L.bell(20, 6);
      L.exit(36, 16);
      L.trigger('ezequiel_intro', 6, 3, 2, 14);
      for (const [x, y] of [[3, 16], [14, 16], [25, 16], [37, 16]]) L.candles(x, y);
    },
  },
  {
    name: 'The Choir of Ash', latin: 'Agnus Dei', theme: 'choir', w: 86, h: 24, fervour: 100, card: 'window4', abil: ['plunge'],
    build(L) {
      L.carve(1, 4, 84, 15);            // floor row 19
      L.fill(30, 16, 6, 1, 2);
      L.fill(48, 16, 5, 1, 2);
      L.fill(54, 13, 7, 1, 2);
      L.fill(63, 16, 3, 3);
      L.fill(78, 16, 5, 1, 2);
      L.fill(44, 19, 3, 1, 5);          // cracked choir floor over a crypt
      L.carve(42, 20, 7, 2);
      L.spawn(3, 18);
      L.ent('b', 14, 18);
      L.ent('s', 26, 18); L.ent('a', 32, 15); L.ent('s', 39, 18);
      L.ent('b', 50, 18); L.ent('t', 57, 12);
      L.door(61, 18);
      L.ent('a', 68, 18); L.chandelier(72, 8); L.ent('s', 71, 18); L.ent('s', 73, 18);
      L.ent('b', 79, 18); L.ent('a', 80, 15);
      L.exit(83, 18);
      L.bead(4, 45, 21);
      for (const [x, y] of [[2, 18], [9, 18], [21, 18], [41, 18], [58, 18], [76, 18]]) L.candles(x, y);
      L.hint(4, 12, 'shields guard the front. strike from behind, or from above');
      L.hint(18, 13, 'fervour full: hold E  the last rites');
      L.hint(18, 14, 'sweep the cursor across the condemned, then let go');
      L.hint(36, 11, 'in the air, hold S and strike  the toll');
      L.hint(55, 15, 'strike a door to throw it open');
    },
  },
  {
    name: 'The Scriptorium', latin: 'Liber scriptus proferetur', theme: 'scriptorium', w: 96, h: 30, card: 'window2', abil: ['plunge', 'throw'],
    build(L) {
      L.carve(1, 20, 24, 6);            // hall of copyists, floor row 26
      L.fill(10, 23, 4, 1, 2);          // a high shelf
      L.carve(25, 12, 26, 14);          // the great reading room
      L.fill(25, 23, 3, 1, 2);
      L.fill(27, 20, 22, 1, 2);         // mezzanine
      L.carve(51, 18, 20, 8);           // the press room
      L.fill(51, 18, 1, 6);             // only the door leads in
      L.carve(71, 6, 4, 20);            // the stair-well
      L.carve(75, 6, 19, 5);            // the upper gallery, floor row 11
      L.spawn(3, 25);
      L.item('skull', 7, 25); L.item('skull', 9, 25);
      L.door(16, 25);
      L.ent('s', 19, 25); L.ent('s', 22, 25);
      L.item('flask', 30, 19); L.item('flask', 30, 25);
      L.beam(33, 11, 1.4, 1.6, 0); L.beam(41, 11, 1.4, 1.6, 1.5);
      L.ent('a', 36, 25); L.ent('h', 44, 25); L.ent('i', 47, 19);
      L.door(51, 25);
      L.item('flask', 48, 25);
      L.ent('s', 55, 25); L.ent('s', 58, 25); L.ent('t', 62, 25); L.ent('b', 66, 25);
      L.ent('g', 74, 14);
      L.beam(80, 5, 1.0, 1.0, 0); L.beam(87, 5, 1.0, 1.0, 1.0);
      L.ent('a', 84, 10); L.ent('i', 91, 10);
      L.relic('page', 89, 10);
      L.exit(92, 10);
      L.bead(5, 11, 22);
      for (const [x, y] of [[2, 25], [13, 25], [26, 25], [39, 25], [53, 25], [69, 25], [77, 10]]) L.candles(x, y);
      L.hint(3, 21, 'Q  throw what you carry. a skull flies true');
      L.hint(27, 14, 'holy water burns. the light of the windows burns hotter');
      L.hint(52, 15, 'the inquisitor aims long. do not stand in his line');
      L.hint(37, 22, 'the herald\'s bell stirs the rest to fury. silence him first');
    },
  },
  {
    name: 'The Reliquary Vaults', latin: 'Ossa humiliata', theme: 'vaults', w: 104, h: 30, card: 'window4', abil: ['plunge', 'throw'],
    build(L) {
      L.carve(1, 12, 14, 9);            // the Seventh's rest, floor row 21
      L.carve(15, 8, 20, 20);           // the first pit
      L.fill(15, 27, 20, 1, 3);
      L.fill(21, 18, 2, 1, 4); L.fill(28, 17, 2, 1, 4);
      L.carve(35, 15, 22, 6);           // the corridor of pendulums
      L.carve(57, 4, 18, 17);           // the gallery of cherubs
      L.fill(59, 16, 4, 1, 2); L.fill(65, 12, 5, 1, 2); L.fill(59, 8, 4, 1, 4);
      L.carve(75, 8, 20, 20);           // the last pit
      L.fill(75, 27, 20, 1, 3);
      L.fill(82, 18, 2, 1, 4); L.fill(88, 17, 2, 1, 4);
      L.carve(95, 12, 8, 9);            // the reliquary
      L.spawn(3, 20);
      L.relic('chain', 9, 20);
      L.hook(19, 12); L.hook(25, 11); L.hook(31, 12);
      L.pend(39, 15, 80, 1.0, 2.2, 0); L.pend(44, 15, 80, 1.0, 2.2, 0.33); L.pend(49, 15, 80, 1.0, 2.2, 0.66);
      L.ent('s', 54, 20); L.ent('S', 56, 20);
      L.hook(66, 6); L.hook(72, 10);
      L.ent('c', 63, 9); L.ent('c', 70, 7); L.ent('c', 61, 14);
      L.ent('k', 68, 20); L.ent('k', 72, 20);
      L.hook(78, 14); L.hook(84, 11); L.hook(90, 12);
      L.ent('a', 97, 20); L.ent('a', 100, 20);
      L.item('skull', 37, 20);
      L.exit(101, 20);
      L.bead(6, 66, 5);
      for (const [x, y] of [[2, 20], [11, 20], [36, 20], [58, 20], [96, 20]]) L.candles(x, y);
      L.hint(3, 15, 'F  cast the chain at a ring. let go to fly');
      L.hint(36, 17, 'the pendulums do not care whom they cut');
      L.hint(58, 18, 'the chain drags light sinners to you');
      L.hint(58, 15, 'cherubs fall on the still. keep moving');
      L.hint(66, 17, 'the censer-bearers burn. strike from afar, or run');
    },
  },
  {
    name: 'The Sanctuary', latin: 'Lux perpetua luceat eis', theme: 'altar', w: 64, h: 27, fervour: 50, card: 'window5', abil: ['plunge', 'throw', 'chain'],
    build(L) {
      L.carve(1, 3, 62, 21);            // floor row 24
      L.fill(27, 21, 10, 3);            // the altar, top row 21
      L.fill(21, 18, 5, 1, 2); L.fill(38, 18, 5, 1, 2);
      L.fill(14, 15, 6, 1, 2); L.fill(44, 15, 6, 1, 2);
      L.fill(22, 12, 4, 1, 2); L.fill(38, 12, 4, 1, 2);
      L.fill(1, 12, 7, 1, 2); L.fill(56, 12, 7, 1, 2);
      L.fill(4, 21, 7, 1, 2); L.fill(53, 21, 7, 1, 2);
      L.fill(27, 9, 10, 1);             // the high platform, exit
      L.fill(23, 23, 3, 1, 3); L.fill(38, 23, 3, 1, 3);
      L.spawn(31, 20);
      L.ent('b', 9, 23); L.ent('s', 14, 23); L.ent('s', 18, 23);
      L.ent('s', 45, 23); L.ent('k', 50, 23); L.ent('b', 55, 23);
      L.ent('a', 3, 11); L.ent('a', 60, 11);
      L.ent('t', 16, 14); L.ent('t', 47, 14);
      L.ent('g', 1, 7); L.ent('g', 62, 7);
      L.ent('i', 34, 8);
      L.chandelier(16, 7); L.chandelier(47, 7);
      L.hook(10, 8); L.hook(53, 8);
      L.item('flask', 6, 20); L.item('skull', 57, 20);
      L.exit(30, 8);
      L.bead(7, 2, 11);
      for (const [x, y] of [[2, 23], [27, 20], [35, 20], [61, 23], [5, 20], [57, 20], [28, 8]]) L.candles(x, y);
      L.hint(25, 17, 'nunc et in hora mortis nostrae');
    },
  },
  {
    name: 'The Seven Sorrows', latin: 'Stabat mater dolorosa', theme: 'sorrows', w: 40, h: 22, card: 'window5', boss: 'lady', fervour: 30, abil: ['plunge', 'throw', 'chain'],
    build(L) {
      L.carve(2, 3, 36, 16);            // floor row 19
      L.fill(16, 16, 8, 3);             // the altar
      L.fill(4, 13, 6, 1, 2); L.fill(30, 13, 6, 1, 2);
      L.spawn(4, 18);
      L.boss('lady', 20, 9);
      L.hook(9, 7); L.hook(30, 7);
      L.exit(36, 18);
      L.trigger('lady_intro', 6, 3, 2, 16);
      for (const [x, y] of [[3, 18], [12, 18], [27, 18], [36, 18], [17, 15], [22, 15]]) L.candles(x, y);
    },
  },
  {
    name: 'The Cloister of Sand', latin: 'Pulvis es', theme: 'cloister', w: 96, h: 26, card: 'window2', abil: ['plunge', 'throw', 'chain'], boss: 'first', fervour: 40,
    build(L) {
      L.carve(1, 6, 70, 14);            // the cloister walk, floor row 20
      for (const x of [12, 24, 36, 48, 60]) L.fill(x, 6, 2, 4); // arcade arches
      L.fill(17, 15, 5, 1, 2); L.fill(41, 15, 5, 1, 2);
      L.fill(9, 20, 3, 1, 5);           // a cracked tomb
      L.carve(8, 21, 5, 2);
      L.carve(71, 4, 24, 16);           // the court of the First, floor row 20
      L.fill(75, 14, 4, 1, 2); L.fill(87, 14, 4, 1, 2);
      L.sand(20, 6, 19); L.sand(32, 6, 19); L.sand(44, 10, 19); L.sand(56, 6, 19);
      L.spawn(3, 19);
      L.ent('f', 27, 19); L.ent('a', 19, 14); L.ent('k', 38, 19); L.ent('i', 43, 14);
      L.ent('f', 51, 19); L.ent('h', 58, 19); L.ent('F', 64, 19);
      L.hook(30, 11); L.hook(54, 11);
      L.item('flask', 6, 19); L.item('skull', 34, 19);
      L.boss('first', 88, 19);
      L.trigger('first_intro', 73, 4, 2, 16);
      L.exit(93, 19);
      L.bead(8, 10, 22);
      for (const [x, y] of [[2, 19], [15, 19], [29, 19], [47, 19], [66, 19], [72, 19], [93, 19]]) L.candles(x, y);
      L.hint(3, 14, 'the sand hides you, and slows all it touches');
      L.hint(22, 11, 'the fallen guard their front. make them strike first');
    },
  },
  {
    name: 'The Hour', latin: 'Dies irae, dies illa', theme: 'hour', w: 44, h: 26, card: 'window5', boss: 'confessor', fervour: 50, abil: ['plunge', 'throw', 'chain'],
    build(L) {
      L.carve(2, 3, 40, 20);            // floor row 23
      L.fill(9, 20, 3, 1, 2); L.fill(32, 20, 3, 1, 2);
      L.fill(4, 17, 5, 1, 2); L.fill(35, 17, 5, 1, 2);
      L.fill(12, 14, 2, 1, 2); L.fill(30, 14, 2, 1, 2);
      L.fill(15, 12, 14, 1, 2);         // the minute bridge
      L.spawn(6, 22);
      L.boss('confessor', 30, 22);
      L.bell(22, 6);
      L.hook(8, 7); L.hook(35, 7);
      L.trigger('confessor_intro', 8, 3, 2, 20);
      for (const [x, y] of [[3, 22], [14, 22], [29, 22], [40, 22]]) L.candles(x, y);
    },
  },
];

function buildLevel(def) {
  const w = def.w, h = def.h;
  const tiles = new Uint8Array(w * h).fill(1);
  const over = new Uint8Array(w * h).fill(255); // per-attempt overrides: doors, crumbled planks, broken floors
  const lvl = {
    def, w, h, tiles, over, name: def.name, theme: THEMES[def.theme],
    spawn: { x: 40, y: 40 }, ents: [], hints: [], candles: [], chandeliers: [], bells: [], exit: null,
    doors: [], beams: [], pends: [], hooks: [], items: [], npcs: [], triggers: [], relics: [], beads: [], sands: [], boss: null,
    tile(x, y) {
      if (x < 0 || y < 0 || x >= w || y >= h) return 1;
      const i = y * w + x, o = over[i];
      return o !== 255 ? o : tiles[i];
    },
    base(x, y) { return x < 0 || y < 0 || x >= w || y >= h ? 1 : tiles[y * w + x]; },
    solidAt(x, y) { const t = this.tile(x, y); return t === 1 || t === 5; },
    resetOver() { over.fill(255); },
    setOver(x, y, v) { if (x >= 0 && y >= 0 && x < w && y < h) over[y * w + x] = v; },
  };
  const set = (x, y, v) => { if (x >= 0 && y >= 0 && x < w && y < h) tiles[y * w + x] = v; };
  const P = (x, y) => ({ x: x * T + 8, y: (y + 1) * T }); // standing on the floor of tile row y
  const L = {
    carve(x, y, ww, hh) { for (let j = 0; j < hh; j++) for (let i = 0; i < ww; i++) set(x + i, y + j, 0); },
    fill(x, y, ww, hh, v = 1) { for (let j = 0; j < hh; j++) for (let i = 0; i < ww; i++) set(x + i, y + j, v); },
    spawn(x, y) { lvl.spawn = P(x, y); },
    ent(ch, x, y) { lvl.ents.push({ ch, ...P(x, y), tx: x, ty: y }); },
    exit(x, y) { lvl.exit = P(x, y); },
    hint(x, y, text) { lvl.hints.push({ x: x * T, y: y * T + 8, text }); },
    candles(x, y) { lvl.candles.push({ x: x * T + 3, y: (y + 1) * T, n: 3 + ((x * 7 + y) % 3), seed: x * 13 + y }); },
    chandelier(x, y) { lvl.chandeliers.push({ x: x * T + 8, y: y * T + 8 }); },
    bell(x, y) { lvl.bells.push({ x: x * T + 8, y: y * T }); },
    door(x, y) { lvl.doors.push({ tx: x, ty: y, ...P(x, y) }); },
    beam(x, y, on, off, phase) { lvl.beams.push({ tx: x, ty: y, x: x * T + 8, y: y * T, on, off, phase }); },
    pend(x, y, len, amp, period, phase) { lvl.pends.push({ px: x * T + 8, py: y * T, len, amp, period, phase }); },
    hook(x, y) { lvl.hooks.push({ x: x * T + 8, y: y * T + 8 }); },
    item(type, x, y) { lvl.items.push({ type, ...P(x, y) }); },
    npc(id, x, y, kind) { lvl.npcs.push({ id, kind, ...P(x, y) }); },
    trigger(id, x, y, ww, hh) { lvl.triggers.push({ id, x: x * T, y: y * T, w: ww * T, h: hh * T }); },
    relic(id, x, y) { lvl.relics.push({ id, ...P(x, y) }); },
    bead(n, x, y) { lvl.beads.push({ n, ...P(x, y) }); },
    sand(x, y0, y1) { lvl.sands.push({ x: x * T, y0: y0 * T, y1: (y1 + 1) * T, w: T }); },
    boss(type, x, y) { lvl.boss = { type, ...P(x, y) }; },
  };
  def.build(L);
  return lvl;
}
