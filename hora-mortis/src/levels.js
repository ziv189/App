'use strict';
// ============================================================
//  HORA MORTIS — the Verses (levels). Built by carving rock.
//  Tiles: 0 open, 1 stone, 2 one-way beam, 3 spikes
//  Jump reach is ~3.7 tiles: steps are kept at 3.
// ============================================================
const VERSES = [
  {
    name: 'The Ossuary', latin: 'Memento mori', theme: 'ossuary', w: 78, h: 22,
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
      L.spawn(3, 16);
      L.ent('S', 27, 13);
      L.ent('s', 50, 5); L.ent('s', 57, 5);
      L.ent('s', 66, 18); L.ent('s', 72, 12);
      L.exit(75, 18);
      for (const [x, y] of [[2, 16], [13, 16], [20, 13], [32, 13], [62, 18], [70, 18], [40, 5]]) L.candles(x, y);
      L.hint(3, 12, 'A / D  walk      W / SPACE  leap');
      L.hint(20, 9, 'CLICK  strike toward the cursor');
      L.hint(27, 8, 'leap into a wall, then leap again');
      L.hint(41, 4, 'S  roll through their steel');
      L.hint(63, 15, 'slay them all. then leave.');
    },
  },
  {
    name: 'The Nave of Weeping Glass', latin: 'Lacrimosa dies illa', theme: 'nave', w: 90, h: 24,
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
      L.ent('t', 77, 19);
      L.ent('a', 85, 19);
      L.exit(87, 19);
      for (const [x, y] of [[2, 19], [12, 19], [17, 19], [33, 19], [48, 19], [62, 19], [67, 19], [80, 19]]) L.candles(x, y);
      L.hint(3, 14, 'strike their blood back at them');
      L.hint(16, 11, 'hold SHIFT or RIGHT-CLICK  chronos');
      L.hint(44, 11, 'some sins hang by a thread');
      L.hint(66, 14, 'the thorn-priest scatters his blood');
    },
  },
  {
    name: 'The Bell Tower', latin: 'Pro quibus campana pulsat', theme: 'tower', w: 40, h: 62,
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
      for (const [x, y] of [[5, 59], [10, 59], [5, 50], [30, 32], [5, 38], [29, 8]]) L.candles(x, y);
      L.hint(7, 56, 'climb. the bell remembers every sin.');
      L.hint(13, 9, 'strike the great bell');
    },
  },
  {
    name: 'The Choir of Ash', latin: 'Agnus Dei', theme: 'choir', w: 86, h: 22, fervour: 100,
    build(L) {
      L.carve(1, 4, 84, 15);            // floor row 19
      L.fill(30, 16, 6, 1, 2);
      L.fill(44, 16, 7, 1, 2);
      L.fill(54, 13, 7, 1, 2);
      L.fill(63, 16, 3, 3);
      L.fill(78, 16, 5, 1, 2);
      L.spawn(3, 18);
      L.ent('b', 14, 18);
      L.ent('s', 26, 18); L.ent('a', 32, 15); L.ent('s', 39, 18);
      L.ent('b', 50, 18); L.ent('t', 57, 12);
      L.ent('a', 68, 18); L.chandelier(72, 8); L.ent('s', 71, 18); L.ent('s', 73, 18);
      L.ent('b', 79, 18); L.ent('a', 80, 15);
      L.exit(83, 18);
      for (const [x, y] of [[2, 18], [9, 18], [21, 18], [42, 18], [61, 18], [76, 18]]) L.candles(x, y);
      L.hint(4, 12, 'shields guard the front. strike from behind, or from above');
      L.hint(18, 8, 'fervour full: hold E  the last rites');
      L.hint(18, 10, 'sweep the cursor across the condemned, then let go');
    },
  },
  {
    name: 'The Altar of the Final Hour', latin: 'Nunc et in hora mortis nostrae', theme: 'altar', w: 64, h: 27, fervour: 50,
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
      L.ent('s', 45, 23); L.ent('s', 50, 23); L.ent('b', 55, 23);
      L.ent('a', 3, 11); L.ent('a', 60, 11);
      L.ent('t', 16, 14); L.ent('t', 47, 14);
      L.ent('g', 1, 7); L.ent('g', 62, 7);
      L.ent('a', 34, 8);
      L.chandelier(16, 7); L.chandelier(47, 7);
      L.exit(30, 8);
      for (const [x, y] of [[2, 23], [27, 20], [35, 20], [61, 23], [5, 20], [57, 20], [28, 8]]) L.candles(x, y);
      L.hint(25, 17, 'nunc et in hora mortis nostrae');
    },
  },
];

function buildLevel(def) {
  const w = def.w, h = def.h;
  const tiles = new Uint8Array(w * h).fill(1);
  const lvl = {
    def, w, h, tiles, name: def.name, theme: THEMES[def.theme],
    spawn: { x: 40, y: 40 }, ents: [], hints: [], candles: [], chandeliers: [], bells: [], exit: null,
    tile(x, y) { return x < 0 || y < 0 || x >= w || y >= h ? 1 : tiles[y * w + x]; },
    solidAt(x, y) { return this.tile(x, y) === 1; },
  };
  const set = (x, y, v) => { if (x >= 0 && y >= 0 && x < w && y < h) tiles[y * w + x] = v; };
  const L = {
    carve(x, y, ww, hh) { for (let j = 0; j < hh; j++) for (let i = 0; i < ww; i++) set(x + i, y + j, 0); },
    fill(x, y, ww, hh, v = 1) { for (let j = 0; j < hh; j++) for (let i = 0; i < ww; i++) set(x + i, y + j, v); },
    spawn(x, y) { lvl.spawn = { x: x * T + 8, y: (y + 1) * T }; },
    ent(ch, x, y) { lvl.ents.push({ ch, x: x * T + 8, y: (y + 1) * T, tx: x, ty: y }); },
    exit(x, y) { lvl.exit = { x: x * T + 8, y: (y + 1) * T }; },
    hint(x, y, text) { lvl.hints.push({ x: x * T, y: y * T + 8, text }); },
    candles(x, y) { lvl.candles.push({ x: x * T + 3, y: (y + 1) * T, n: 3 + ((x * 7 + y) % 3), seed: x * 13 + y }); },
    chandelier(x, y) { lvl.chandeliers.push({ x: x * T + 8, y: y * T + 8 }); },
    bell(x, y) { lvl.bells.push({ x: x * T + 8, y: y * T }); },
  };
  def.build(L);
  return lvl;
}
