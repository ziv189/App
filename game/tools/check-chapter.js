/* Validateur de chapitre : node game/tools/check-chapter.js game/js/chapters/ch1.js
   Vérifie la forme de la carte (lignes de même longueur, caractères légaux, S/X/B/R, PNJ),
   les scènes et les répliques de dialogue. Affiche ERREURS (bloquantes) et AVERTISSEMENTS. */
const fs = require('fs');
const vm = require('vm');

const file = process.argv[2];
if (!file) {
  console.log('usage: node game/tools/check-chapter.js <fichier.js>');
  process.exit(2);
}

const src = fs.readFileSync(file, 'utf8');
const CH = { list: {}, register(c) { this.list[c.id] = c; return c; } };
const errors = [];
const warns = [];

try {
  vm.runInNewContext(src, { CHAPTERS: CH, console });
} catch (e) {
  console.log('ERREUR: le fichier ne s\'exécute pas : ' + e.message);
  process.exit(1);
}

const LEGAL = '.#=^SCXorhrfs1234567890BR';
const WHO = ['leo', 'juliette', 'elias', 'mireille', 'gaspard', 'regent', 'pivert', 'hugo', 'bastien', 'tomas', 'narrator'];
const ACTS = ['unlock', 'flag', 'shake', 'flash', 'sfx', 'choice', 'end'];
const ABILITIES = ['dash', 'pendule', 'ressort'];
const EXPRS = ['neutral', 'happy', 'sad', 'angry', 'surprised', 'worried'];

function checkLines(lines, where) {
  if (!Array.isArray(lines)) { errors.push(`${where}: lines n'est pas un tableau`); return; }
  lines.forEach((l, i) => {
    const tag = `${where} [${i}]`;
    if (l.act) {
      if (!ACTS.includes(l.act)) errors.push(`${tag}: act inconnu '${l.act}'`);
      if (l.act === 'unlock' && !ABILITIES.includes(l.value)) errors.push(`${tag}: unlock '${l.value}' inconnu`);
      if (l.act === 'end' && !['good', 'bad'].includes(l.value)) errors.push(`${tag}: end doit être 'good' ou 'bad'`);
      if (l.act === 'choice') {
        if (!Array.isArray(l.options) || l.options.length < 2) errors.push(`${tag}: choice needs >= 2 options`);
        else l.options.forEach((o) => { if (!o.text || !o.flag) errors.push(`${tag}: option sans text/flag`); });
      }
      return;
    }
    if (!WHO.includes(l.who)) errors.push(`${tag}: who inconnu '${l.who}'`);
    if (typeof l.text !== 'string' || !l.text.length) errors.push(`${tag}: text manquant`);
    else if (l.text.length > 130) warns.push(`${tag}: réplique longue (${l.text.length} car.)`);
    if (l.expr && !EXPRS.includes(l.expr)) errors.push(`${tag}: expr inconnue '${l.expr}'`);
  });
}

for (const id of Object.keys(CH.list)) {
  const c = CH.list[id];
  console.log(`== ${id} : ${c.title || '(sans titre)'}`);
  const map = c.map;
  if (!Array.isArray(map)) { errors.push('map n\'est pas un tableau'); continue; }
  const W = map[0] ? map[0].length : 0;
  map.forEach((row, y) => {
    if (row.length !== W) errors.push(`ligne ${y}: longueur ${row.length} au lieu de ${W}`);
    for (const ch of row) if (!LEGAL.includes(ch)) errors.push(`ligne ${y}: caractère illégal '${ch}'`);
  });
  const H = map.length;
  console.log(`   carte : ${W} colonnes × ${H} lignes`);
  if (W < 100 || W > 180) warns.push(`largeur ${W} hors de 100..180`);
  if (H < 16 || H > 24) warns.push(`hauteur ${H} hors de 16..24`);

  const at = (x, y) => (map[y] && map[y][x]) || '.';
  const count = {};
  let S = [], X = [], B = [], R = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const ch = at(x, y);
    count[ch] = (count[ch] || 0) + 1;
    if (ch === 'S') S.push([x, y]);
    if (ch === 'X') X.push([x, y]);
    if (ch === 'B') B.push([x, y]);
    if (ch === 'R') R.push([x, y]);
    if (ch === '^' && !['#', '='].includes(at(x, y + 1))) warns.push(`pic en (${x},${y}) sans sol dessous`);
    if (['r', 'f', 's'].includes(ch) && x < 6 && S.length && Math.abs(x - S[0][0]) < 6) warns.push(`ennemi trop près du départ en (${x},${y})`);
  }
  if (S.length !== 1) errors.push(`il faut exactement un S (trouvé ${S.length})`);
  else if (!['#', '='].includes(at(S[0][0], S[0][1] + 1))) warns.push('S n\'est pas posé sur un sol');
  if (X.length === 0 && id !== 'ch5') errors.push('aucun X (sortie)');
  if (X.length && !['#', '='].includes(at(X[0][0], X[0][1] + 1))) warns.push('X n\'est pas posé sur un sol');
  if (B.length && R.length === 0) warns.push('B présent mais aucun R (boss)');

  const npcKeys = Object.keys(c.npcs || {});
  for (const d of '123456789') {
    const inMap = count[d] || 0;
    const inData = npcKeys.includes(d);
    if (inMap && !inData) errors.push(`PNJ '${d}' sur la carte mais absent de npcs`);
    if (inData && !inMap) warns.push(`npcs['${d}'] défini mais absent de la carte`);
  }
  for (const k of npcKeys) {
    const n = c.npcs[k];
    if (!WHO.includes(n.who)) errors.push(`npcs['${k}'].who inconnu '${n.who}'`);
    checkLines(n.lines, `npcs['${k}'].lines`);
    if (n.again) checkLines(n.again, `npcs['${k}'].again`);
  }
  (c.scenes || []).forEach((s, i) => {
    if (typeof s.col !== 'number' || s.col < 0 || s.col >= W) errors.push(`scène ${s.id}: col hors carte`);
    if (!s.id) errors.push(`scène [${i}] sans id`);
    checkLines(s.lines, `scène ${s.id}`);
  });
  if (c.next !== null && c.next !== undefined && !(c.next in { ch1: 1, ch2: 1, ch3: 1, ch4: 1, ch5: 1 })) errors.push(`next inconnu '${c.next}'`);
  if (!c.theme || !['station', 'market', 'foundry', 'tower', 'clockface'].includes(c.theme)) errors.push(`theme invalide '${c.theme}'`);
  if (!c.music) warns.push('music manquant');

  const summary = ['o', 'h', 'r', 'f', 's', 'C', '^', 'B', 'R'].map((k) => `${k}=${count[k] || 0}`).join(' ');
  console.log(`   ${summary}  PNJ=${npcKeys.join(',') || '-'}  scènes=${(c.scenes || []).length}`);
}

warns.forEach((w) => console.log('AVERT : ' + w));
errors.forEach((e) => console.log('ERREUR : ' + e));
console.log(errors.length ? `ÉCHEC (${errors.length} erreur(s))` : 'OK : aucune erreur bloquante');
process.exit(errors.length ? 1 : 0);
