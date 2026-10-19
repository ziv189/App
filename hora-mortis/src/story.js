'use strict';
// ============================================================
//  HORA MORTIS — the story: confessions, visions, endings
//  Markup in lines: *red*  _gold_  ~trembling~
// ============================================================
const SAND_TAKE = [
  { who: 'conf', text: 'There. Beneath the tongue. Can you feel the hour bend for you?', when: 'took' },
  { who: 'note', text: 'your hour will mend quickly in the next verse', when: 'took' },
  { who: 'conf', text: '...As you wish. The hour will not bend so easily for you tonight.', when: 'refused' },
  { who: 'note', text: 'your hour will mend slowly in the next verse', when: 'refused' },
];
const STORY = {
  // ---------- the cinematics ----------
  cine: {
    prologue: [
      { bg: 'bg_tower', text: 'Calvaria. City of a thousand bells.' },
      { bg: 'bg_nave', text: 'Three hundred years ago the plague came, and every bell in the city rang for the dead.' },
      { bg: 'window3', text: 'Then, at the hour of death, the bells _stopped_.' },
      { bg: 'bg_ossuary', text: 'The dying did not die. The living did not wake. The hour did not end.' },
      { bg: 'bg_choir', text: 'But some of them *remember*. And each night, a penitent is sent to absolve them.' },
      { bg: 'bg_altar', text: 'Twelve were sent before you.' },
      { bg: 'title', text: 'You are the _Thirteenth_.' },
    ],
    vision: [
      { bg: 'window5', text: 'Her tears were never for the dead. They were for the one who could not let them go.' },
      { bg: 'bg_nave', text: 'Three hundred years ago. The plague in every house. A priest kneels beside a little bed.' },
      { bg: 'bg_ossuary', text: 'The child in the bed is burning with fever. All night, the bells ring for the dead.' },
      { bg: 'bg_tower', text: 'At the hour of death, the priest climbs the tower with an hourglass of blessed sand.' },
      { bg: 'window3', text: 'He stops the great bell with his bare hands, and breaks the glass into its mouth.' },
      { bg: 'bg_altar', text: '"_Not this one._ I will keep this hour. I will keep it forever."' },
      { bg: 'title', text: 'The child in the bed is wearing *your face*.' },
    ],
    released: [
      { bg: 'bg_tower', text: 'You strike the great bell.' },
      { bg: 'window3', text: 'For a moment, nothing. Then it _rings_.' },
      { bg: 'bg_nave', text: 'And a thousand bells answer it.' },
      { bg: 'bg_ossuary', text: 'Across Calvaria, the dying are allowed, at last, to die. And the living wake.' },
      { bg: 'bg_altar', text: 'In the tower, an old priest lays down his veil, and weeps, and is still.' },
      { bg: 'ending', text: 'The Thirteenth kneels as the dawn comes in through the broken glass. It does not hurt. It is only _morning_.' },
    ],
    kept: [
      { bg: 'bg_tower', text: 'You strike the great bell.' },
      { bg: 'window3', text: 'It does not ring. There is too much sand in it. There is too much *sand in you*.' },
      { bg: 'bg_choir', text: 'You do not remember climbing down. You do not remember putting on the veil.' },
      { bg: 'bg_nave', text: 'Below, a confessional door creaks open. Someone kneels on the cold wood.' },
      { bg: 'bg_altar', text: '"Come in, child," you hear yourself say. "Kneel. You have been dreaming again."' },
      { bg: 'title', text: 'The _Fourteenth_ kneels.' },
    ],
  },
  // ---------- the confessions between verses ----------
  conf: {
    conf0: [
      { who: 'conf', text: 'Come. Kneel, child. The wood is cold, I know.' },
      { who: 'conf', text: 'Do you know where you are?' },
      { choice: [
        { text: 'The confessional.', then: [{ who: 'conf', text: 'Good. Then you remember that much.' }] },
        { text: 'I don\'t remember anything.', then: [{ who: 'conf', text: 'That is the mercy of the hour. Nothing that hurts is kept.' }] },
      ] },
      { who: 'conf', text: 'You are the _Thirteenth_. You were given the sand, the sword, and the right to absolve.' },
      { who: 'conf', text: 'Beneath the cathedral lie the ossuaries. The dead there are restless. They *remember*.' },
      { who: 'conf', text: 'Remembering is a sickness of the hour. You will be its cure.',
        interrupt: { text: 'Cure it how?', then: [{ who: 'conf', text: 'With steel, child. How else does one close a wound?' }] } },
      { who: 'conf', text: 'Strike them before they strike you. And if you fall, the sand will carry you back. It always does.' },
      { who: 'conf', text: 'Go. And come back to me after. I always want to hear how it went.' },
    ],
    conf1: [
      { who: 'conf', text: 'You\'re back. Good. Was it as I said?' },
      { choice: [
        { text: 'They begged.', then: [{ who: 'conf', text: 'They always do. Begging is only remembering out loud.' }] },
        { text: 'It was easy.', then: [{ who: 'conf', text: 'It is meant to be. The sand sees to that.' }] },
        { text: '(say nothing)', then: [{ who: 'conf', text: '...Quiet tonight. That is all right.' }] },
      ] },
      { who: 'conf', text: 'Your hand is ~shaking~. Here.', jar: true },
      { who: 'conf', text: 'Take the _sand_. A pinch beneath the tongue. It steadies the hand, and slows the hour.', jar: true },
      { sand: true },
      ...SAND_TAKE,
      { who: 'conf', text: 'Tonight: the Nave of Weeping Glass. The acolytes there bleed from the eyes and call it prayer.' },
      { who: 'conf', text: 'And if you meet a penitent in the nave, a man in a robe like yours, he is not to be listened to.' },
      { choice: [
        { text: 'Who is he?', then: [{ who: 'conf', text: 'No one. A number. Twelve, to be exact.' }] },
        { text: '(nod)', then: [{ who: 'conf', text: 'Good.' }] },
      ] },
      { who: 'conf', text: 'Go.' },
    ],
    conf2: [
      { who: 'conf', text: 'You spoke to him.' },
      { choice: [
        { text: 'He\'s dead.', then: [{ who: 'conf', text: 'He was dead long before you found him.' }] },
        { text: 'He told me about the sand.', then: [{ who: 'conf', text: 'Did he.' }, { who: 'conf', text: 'The Twelfth was a good penitent. He grew tired. Tired men say tired things.' }] },
      ] },
      { who: 'conf', text: 'Tonight, the bell tower. There is a man at the top who rings for the dead, though no one dies anymore.' },
      { who: 'conf', text: 'His name is Ezequiel. He has rung that bell for three hundred years. He is very, very tired.',
        interrupt: { text: 'Why am I killing the tired ones?', then: [{ who: 'conf', text: '...Because tired men ring bells, child. And bells *wake the city*.' }, { who: 'conf', text: 'Forget I said that.' }] } },
      { who: 'conf', text: 'Your hand. It\'s shaking again.', jar: true },
      { sand: true },
      ...SAND_TAKE,
      { who: 'conf', text: 'Climb. Don\'t look down. Don\'t look at the sky, either. It hasn\'t moved in a long time.' },
    ],
    conf3: [
      { who: 'conf', text: 'The tower is quiet.' },
      { who: 'conf', text: 'Do you hear that? Nothing. That is the sound of _mercy_.' },
      { choice: [
        { text: 'He asked me to tell you the bell is quiet.', then: [{ who: 'conf', text: '...It is. It will stay that way.' }] },
        { text: 'He didn\'t beg.', then: [{ who: 'conf', text: 'No. Ezequiel never begged. He only rang.' }] },
      ] },
      { who: 'conf', text: 'You took something from him. His clapper. Keep it. You will need to fall hard where you are going.' },
      { who: 'conf', text: 'The Choir of Ash. The singers there still sing the hymn they sang when the hour stopped.' },
      { who: 'conf', text: 'Some carry shields. Don\'t argue with a shield, child. *Fall* on it, like a bell.' },
      { who: 'conf', text: 'Here.', jar: true },
      { sand: true },
      ...SAND_TAKE,
      { who: 'conf', text: 'Go with God. Or with me. It amounts to the same.' },
    ],
    conf4: [
      { who: 'conf', text: 'You\'re getting good at this.' },
      { choice: [
        { text: 'I\'m getting tired.', then: [{ who: 'conf', text: 'Careful. *Tired* is how the Twelfth began.' }] },
        { text: 'Thank you.', then: [{ who: 'conf', text: 'Don\'t thank me. Thank the sand.' }] },
      ] },
      { who: 'conf', text: 'The Scriptorium. Its monks copy the same page they were copying three hundred years ago.' },
      { who: 'conf', text: 'One of them has been writing something else. Find that page, and burn it. Do not read it.',
        interrupt: { text: 'What does it say?', then: [{ who: 'conf', text: 'Nothing. ~Lies~, in a dead man\'s hand.' }, { who: 'conf', text: '...Forgive me. It has been a long hour.' }] } },
      { who: 'conf', text: 'The windows there are old. When the light comes through them, it _burns_. Mind the light.' },
      { who: 'conf', text: 'And there are skulls on every shelf. Throw one. The dead do not mind.' },
    ],
    conf5: [
      { who: 'conf', text: 'Did you read it?' },
      { choice: [
        { text: 'Yes.', then: [{ who: 'conf', text: '...Then you know a dead man\'s handwriting. That is all you know.' }] },
        { text: 'No.', then: [{ who: 'conf', text: 'You\'re lying. You were always a poor liar.' }, { who: 'conf', text: 'Even the *first* time.' }] },
      ] },
      { who: 'conf', text: 'The Reliquary Vaults. Seven went down there before you. Six came back.' },
      { who: 'conf', text: 'The Seventh left something behind. A chain. If you find it, it will hold you.' },
      { who: 'conf', text: 'You look pale. Here.', jar: true },
      { sand: true },
      ...SAND_TAKE,
      { who: 'conf', text: 'The floors down there are old. Trust the rings in the ceiling, not the floors.' },
    ],
    conf6: [
      { who: 'conf', text: 'You found his chain.' },
      { who: 'conf', text: 'He used to swing from the chandeliers like a boy. I told him it was undignified.' },
      { choice: [
        { text: 'What happened to him?', then: [{ who: 'conf', text: 'He went into the vaults and did not come out. Just as I said.' }] },
        { text: 'He left a note.', then: [{ who: 'conf', text: '...He always did talk too much.' }] },
      ] },
      { who: 'conf', text: 'Tonight is the Sanctuary. All of them are waiting at the altar. All of them remember.' },
      { who: 'conf', text: 'And beyond it, *Our Lady*. She weeps. Do not let her tears touch you.',
        interrupt: { text: 'Is she one of them? One who remembers?', then: [{ who: 'conf', text: 'She remembers everything, child. She is made of it.' }] } },
      { who: 'conf', text: 'Your hand.', jar: true },
      { sand: true },
      ...SAND_TAKE,
      { who: 'conf', text: 'Come back to me.' },
    ],
    conf7: [
      { who: 'conf', text: 'You saw.' },
      { who: 'conf', text: 'I can see it on you. Whatever she showed you. Whatever *he* said.' },
      { choice: [
        { text: 'Father.', then: [{ who: 'conf', text: '...Don\'t. Don\'t call me that. Not yet.' }] },
        { text: 'Who am I?', then: [{ who: 'conf', text: 'You are the Thirteenth. You are the only thing in this city I could not let go.' }] },
        { text: '(say nothing)', then: [{ who: 'conf', text: 'Silence. You always did that when you were angry.' }] },
      ] },
      { who: 'conf', text: 'Listen to me. If the great bell rings, the hour ends. The plague takes what it is owed.' },
      { who: 'conf', text: 'Every soul in Calvaria dies the death it was promised. ~Including you~.' },
      { who: 'conf', text: 'I have woken you thirteen times. Thirteen times you have come back to me.',
        interrupt: { text: 'And thirteen times you made me kill them.', then: [{ who: 'conf', text: '...Yes.' }, { who: 'conf', text: 'Every one of them would have rung the bell.' }] } },
      { who: 'conf', text: 'Take the sand. One last time. Forget all of this, and wake tomorrow as if it were the first.', jar: true },
      { sand: true },
      { who: 'conf', text: 'Good. Good. Sleep now. I will be right here.', when: 'took' },
      { who: 'conf', text: '...Then climb to the clock. And let me try to stop you.', when: 'refused' },
    ],
  },
  // ---------- relic cards ----------
  cards: {
    toll: { name: 'The Toll', sub: 'Ezequiel\'s bell-clapper, still warm', how: ['In the air, hold S and strike: fall like a bell.', 'Breaks cracked floors. Bounces off what it kills.', 'Staggers what it does not.'] },
    page: { name: 'A Page in a Dead Hand', sub: 'torn from the copyists\' book', note: ['THE HOUR WAS NOT STOLEN.', 'IT WAS KEPT.', '', '— I.'] },
    chain: { name: 'The Chain of the Seventh', sub: 'found beside his bones', note: ['If you read this you are the Eighth, or worse.', 'The chain was mine. The rings will hold you.', 'The floors will not. Don\'t take the sand.  — VII'],
      how: ['F or middle-click: cast the chain at the cursor.', 'Rings in the ceiling pull you to them.', 'It drags light sinners to you and tears shields away.'] },
  },
  // ---------- spoken in the verses ----------
  npc: {
    twelfth: [
      ['npc', 'So he sent the Thirteenth.'],
      ['npc', 'Look at me. Do you know my face?'],
      ['npc', 'Don\'t take the sand.'],
      ['npc', 'It doesn\'t show you what will be. It shows you what he *kept*.'],
      ['npc', '...listen. The bells. I can almost...'],
    ],
  },
  bossIntro: {
    ezequiel: [['boss', 'THIRTEEN.'], ['boss', 'The bell counts thirteen. There should be twelve.'], ['boss', 'I will ring you out, penitent.']],
    lady: [['boss', 'Seven swords. Seven sorrows.'], ['boss', 'Which of them is yours, child?']],
    first: [['boss', 'Another one.'], ['boss', 'He told me I was the last, too.'], ['boss', 'Show me how he taught you.']],
    confessor: [['boss', 'You came early tonight.'], ['boss', 'It is always the same hour, child.'], ['boss', 'Let me hear your confession.']],
  },
  bossPhase: {
    ezequiel: { 2: 'RING! RING FOR THEM!' },
    lady: { 2: 'You would add an eighth sorrow.', 3: 'Then take them. Take them all.' },
    first: { 2: '...you hold the sword the way I did.' },
    confessor: { 2: 'I gave you every night of three hundred years!', 3: 'I will not lose you again!' },
  },
  bossDeath: {
    ezequiel: [['boss', '...it\'s quiet.'], ['boss', 'Tell him... the bell is quiet now...']],
    lady: [['boss', '...go up. He is waiting.'], ['boss', 'Do not let him keep you.']],
    first: [['boss', 'I remember the bed. The fever.'], ['boss', 'Tell Father... it\'s all right.'], ['boss', 'Let it ring.']],
    confessor: [['boss', '...the bell, then.'], ['boss', 'Strike it, child. Let them go.'], ['boss', 'Let me let you go.']],
  },
  bossLine: {
    ezequielBell: 'NOT THE BELL— NOT THE—',
    confessorRewind: ['Again.', 'No. That is not how it happens.', 'The hour returns to me.', 'Not yet. Not you.'],
    confessorStop: 'Be still.',
  },
};

// ============================================================
//  Rich text: *red* _gold_ ~shake~, wrapped and typed out
// ============================================================
const RICH_COL = { red: '#ff5a4a', gold: '#f2d48f' };
function parseRich(s) {
  const out = [];
  let red = false, gold = false, shake = false;
  for (const ch of s) {
    if (ch === '*') { red = !red; continue; }
    if (ch === '_') { gold = !gold; continue; }
    if (ch === '~') { shake = !shake; continue; }
    out.push({ c: ch, red, gold, shake });
  }
  return out;
}
function measureLow(str, size, font) {
  ctx.font = `${Math.round(size * view.s)}px ${font}`;
  return ctx.measureText(str).width / view.s;
}
function wrapRich(s, maxW, size, font) {
  const chars = parseRich(s), lines = [];
  let line = [], word = [], lineW = 0;
  const flush = () => {
    const ww = measureLow(word.map((q) => q.c).join(''), size, font);
    const sp = line.length ? measureLow(' ', size, font) : 0;
    if (line.length && lineW + sp + ww > maxW) { lines.push(line); line = []; lineW = 0; }
    else if (line.length) { line.push({ c: ' ', red: false, gold: false, shake: false }); lineW += sp; }
    line.push(...word); lineW += ww; word = [];
  };
  for (const q of chars) { if (q.c === ' ') { if (word.length) flush(); } else word.push(q); }
  if (word.length) flush();
  if (line.length) lines.push(line);
  return lines;
}
// draws wrapped rich lines; reveal = characters to show
function drawRich(lines, x, y, size, font, col, align, a, reveal = 1e9, lh = 1.45) {
  if (a <= 0.01) return;
  ctx.save();
  ctx.font = `${Math.round(size * view.s)}px ${font}`;
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.globalAlpha = clamp(a, 0, 1);
  let n = 0;
  lines.forEach((ln, li) => {
    const str = ln.map((q) => q.c).join('');
    const wLow = ctx.measureText(str).width / view.s;
    let X = view.ox + (align === 'center' ? x - wLow / 2 : align === 'right' ? x - wLow : x) * view.s;
    const Y = view.oy + (y + li * size * lh) * view.s;
    for (const q of ln) {
      if (n++ >= reveal) break;
      const cw = ctx.measureText(q.c).width;
      const jx = q.shake ? (Math.random() - 0.5) * view.s * 0.9 : 0, jy = q.shake ? (Math.random() - 0.5) * view.s * 0.9 : 0;
      ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillText(q.c, X + jx + Math.max(1, view.s * 0.5), Y + jy + Math.max(1, view.s * 0.5));
      ctx.fillStyle = q.red ? RICH_COL.red : q.gold ? RICH_COL.gold : col;
      ctx.fillText(q.c, X + jx, Y + jy);
      X += cw;
    }
  });
  ctx.restore();
}
const richLen = (lines) => lines.reduce((n, l) => n + l.length, 0);

// ============================================================
//  Talk: confessions, cinematics and relic cards
// ============================================================
const Talk = {
  on: false, kind: '', id: '', nodes: [], i: 0, t: 0, shown: 0, lines: null, node: null, onEnd: null,
  sel: 0, hover: -1, intT: 0, taken: false, fade: 0, out: 0, jar: 0, choiceRects: [], vars: null,
  start(kind, id, onEnd) {
    this.on = true; this.kind = kind; this.id = id; this.onEnd = onEnd; this.i = -1; this.fade = 0; this.out = 0; this.jar = 0;
    this.vars = G.story;
    this.nodes = kind === 'conf' ? STORY.conf[id].slice() : kind === 'cine' ? STORY.cine[id].slice() : [STORY.cards[id]];
    this.next();
    Sound.setScene(kind === 'conf' ? 'confession' : kind === 'cine' ? 'title' : 'confession');
    if (kind === 'cine') Sound.play('whisper');
  },
  next() {
    for (;;) {
      this.i++;
      if (this.i >= this.nodes.length) { this.finish(); return; }
      const n = this.nodes[this.i];
      if (n.when && n.when !== this.vars.last) continue;
      this.node = n; this.t = 0; this.shown = 0; this.intT = 0; this.taken = false; this.sel = 0;
      if (this.kind === 'card') { this.lines = null; Sound.play('relic'); return; }
      const text = n.text || '';
      const maxW = this.kind === 'cine' ? 380 : n.who === 'note' ? 400 : n.interrupt ? 262 : 392;
      this.lines = text ? wrapRich(text, maxW, this.kind === 'cine' ? 11 : 9, F_FELL) : null;
      this.total = this.lines ? richLen(this.lines) : 0;
      if (n.choice || n.sand) Sound.play('choice');
      return;
    }
  },
  finish() { this.out = 0.001; },
  choices() {
    const n = this.node;
    if (n.sand) return [{ text: 'Take the sand.', sand: 'took' }, { text: 'Refuse.', sand: 'refused' }];
    return n.choice || null;
  },
  pick(k) {
    const ch = this.choices();
    if (!ch || !ch[k]) return;
    const c = ch[k];
    Sound.play('ui');
    if (c.sand) {
      this.vars.last = c.sand;
      if (c.sand === 'took') this.vars.took++; else this.vars.refused++;
      G.sandNext = c.sand;
      this.jar = 0;
    }
    if (c.then) this.nodes.splice(this.i + 1, 0, ...c.then);
    this.next();
  },
  interrupt() {
    const n = this.node;
    if (!n || !n.interrupt || this.taken || !this.intOpen()) return false;
    this.taken = true;
    Sound.play('interrupt');
    this.nodes.splice(this.i + 1, 0, { who: 'you', text: n.interrupt.text, cut: true }, ...n.interrupt.then);
    this.next();
    return true;
  },
  intOpen() { const n = this.node; return n && n.interrupt && this.shown > this.total * 0.25 && this.t < this.total / 42 + 1.6; },
  press(code) {
    if (!this.on || this.out > 0) return;
    if (this.fade < 0.6) return;
    const ch = this.kind === 'conf' && this.shown >= this.total ? this.choices() : null;
    if (code === 'KeyE' && this.interrupt()) return;
    if (code === 'Mouse0' && this.node && this.node.interrupt && this.intOpen() && this.hoverInt) { this.interrupt(); return; }
    if (ch) {
      const num = parseInt(code.replace('Digit', ''), 10);
      if (num >= 1 && num <= ch.length) { this.pick(num - 1); return; }
      if (code === 'KeyW' || code === 'ArrowUp') { this.sel = (this.sel + ch.length - 1) % ch.length; Sound.play('ui'); return; }
      if (code === 'KeyS' || code === 'ArrowDown') { this.sel = (this.sel + 1) % ch.length; Sound.play('ui'); return; }
      if (code === 'Mouse0') { if (this.hover >= 0) this.pick(this.hover); return; }
      if (code === 'Enter' || code === 'Space') { this.pick(this.sel); return; }
      return;
    }
    if (code === 'Mouse0' || code === 'Enter' || code === 'Space' || code === 'KeyJ') {
      if (this.kind !== 'card' && this.shown < this.total) { this.shown = this.total; return; }
      this.next();
    } else if (code === 'Escape' && this.kind !== 'card') { // hurry along to the next choice that matters
      while (this.i < this.nodes.length && !(this.node && (this.node.choice || this.node.sand))) { this.next(); if (this.out > 0) return; }
      if (this.node) this.shown = this.total;
    }
  },
  update(dt) {
    if (!this.on) return;
    this.fade = Math.min(1, this.fade + dt * 2);
    if (this.out > 0) {
      this.out += dt * 2;
      if (this.out >= 1) { this.on = false; const f = this.onEnd; this.onEnd = null; if (f) f(); }
      return;
    }
    this.t += dt;
    const n = this.node;
    if (n && n.jar) this.jar = Math.min(1, this.jar + dt * 1.5);
    if (n && n.sand) this.jar = 1;
    if (this.kind === 'card' || !this.lines) { this.shown = this.total; return; }
    const speed = this.kind === 'cine' ? 34 : n.who === 'note' ? 80 : 44;
    const before = this.shown;
    this.shown = Math.min(this.total, this.shown + dt * speed);
    if (this.kind === 'conf' && Math.floor(this.shown / 2) !== Math.floor(before / 2) && this.shown < this.total && n.who !== 'note') Sound.play('talk', n.who === 'you' ? 2 : 0);
  },
  // ---------- drawing (low-res) ----------
  draw() {
    if (this.kind === 'conf') drawConfessional(this);
    else if (this.kind === 'cine') drawCine(this);
    else drawCard(this);
    const k = Math.min(this.fade, 1 - Math.min(1, this.out));
    if (k < 1) { g.globalAlpha = 1 - k; g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  },
  // ---------- drawing (text, hi-res) ----------
  text() {
    const a = Math.min(this.fade, 1 - Math.min(1, this.out));
    const n = this.node;
    if (!n) return;
    if (this.kind === 'cine') {
      if (this.lines) drawRich(this.lines, W / 2, H - 52 - (this.lines.length - 1) * 7, 11, F_FELL, '#ead7b0', 'center', a, this.shown);
      if (this.shown >= this.total) txt('click', W - 20, H - 12, 6, F_PIX, '#8a7660', 'right', a * (0.5 + Math.sin(RT * 4) * 0.3));
      return;
    }
    if (this.kind === 'card') { drawCardText(this, a); return; }
    // the confessional
    const who = n.who === 'conf' ? 'The Confessor' : n.who === 'you' ? 'You' : '';
    if (who && !(this.shown >= this.total && this.choices())) txt(who, 52, 202, 8, F_FELLSC, n.who === 'conf' ? '#d9a441' : '#e05a4a', 'left', a);
    if (this.lines) drawRich(this.lines, n.who === 'note' ? W / 2 : 52, n.who === 'note' ? 222 : 218, 9, n.who === 'note' ? F_FELLSC : F_FELL, n.who === 'note' ? '#9a8a70' : '#ead7b0', n.who === 'note' ? 'center' : 'left', a, this.shown);
    const ch = this.shown >= this.total ? this.choices() : null;
    if (ch) {
      ch.forEach((c, k) => {
        const on = k === (this.hover >= 0 ? this.hover : this.sel);
        txt(`${k + 1}.  ${c.text}`, 58, choiceY(k, ch.length), 8.5, F_FELL, on ? '#fff1c0' : c.sand ? '#d9a441' : '#b8a080', 'left', a);
      });
    } else if (this.shown >= this.total && !n.interrupt) txt('click', W - 20, H - 12, 6, F_PIX, '#8a7660', 'right', a * (0.5 + Math.sin(RT * 4) * 0.3));
    if (n.interrupt && !this.taken && this.intOpen()) {
      txt('E  interrupt', 324, 207, 6, F_PIX, '#ff7a6a', 'left', a);
      const iw = wrapRich(n.interrupt.text, 104, 7.5, F_FELL);
      drawRich(iw, 324, 219, 7.5, F_FELL, this.hoverInt ? '#fff1c0' : '#ffb0a0', 'left', a, 1e9, 1.3);
    }
    txt('ESC  skip to the next choice', W - 20, 12, 5.5, F_PIX, '#5a4a3a', 'right', a * 0.8);
  },
};

// ---------- the confessional, drawn ----------
const _confPose = newPose(), _conf2 = newPose();
const CONF_PAL = { confessor: Object.assign({}, RIGPAL.confessor, { weapon: 'none' }), thirteenth: Object.assign({}, RIGPAL.thirteenth, { weapon: 'none' }) };
function drawConfessional(T2) {
  const t = RT;
  g.fillStyle = '#07050a'; g.fillRect(0, 0, W, H);
  // back wall: dark panelled wood
  for (let x = 0; x < W; x += 24) {
    g.fillStyle = (x / 24) % 2 ? '#140c0a' : '#120a09'; g.fillRect(x, 0, 24, 190);
    g.fillStyle = '#1e1310'; g.fillRect(x, 0, 1, 190);
  }
  g.fillStyle = '#0a0606'; g.fillRect(0, 186, W, 84);
  g.fillStyle = '#2a1a12'; g.fillRect(0, 184, W, 3);
  // the candle and its light
  const fl = Math.sin(t * 9) * 0.06 + Math.sin(t * 23) * 0.04;
  drawGlow(g, 92, 120, 120, '#ff9a4a', 0.35 + fl, true);
  drawCandle(g, 90, 150, 9, t, 3); drawCandle(g, 96, 150, 6, t, 5);
  g.fillStyle = '#2a1a12'; g.fillRect(80, 150, 26, 4);
  // the screen between you: the Confessor sits behind it
  const sx = 262, sy = 46, sw = 96, sh = 132;
  g.fillStyle = '#030203'; g.fillRect(sx, sy, sw, sh);
  drawGlow(g, sx + sw / 2, sy + 60, 70, '#c08a40', 0.22 + fl * 0.5, true);
  g.save(); g.beginPath(); g.rect(sx, sy, sw, sh); g.clip();
  drawConfessorBust(g, sx + sw / 2, sy, t, T2.node && T2.node.who === 'conf' && T2.shown < T2.total);
  // lattice
  g.fillStyle = '#24160f';
  for (let i = -sh; i < sw + sh; i += 13) { pline(g, sx + i, sy, sx + i - sh, sy + sh, 1); pline(g, sx + i - sh, sy, sx + i, sy + sh, 1); }
  g.restore();
  g.fillStyle = '#4a2e1c'; g.fillRect(sx - 6, sy - 6, sw + 12, 6); g.fillRect(sx - 6, sy + sh, sw + 12, 8); g.fillRect(sx - 6, sy - 6, 6, sh + 12); g.fillRect(sx + sw, sy - 6, 6, sh + 12);
  g.fillStyle = '#6a4a2a'; g.fillRect(sx - 6, sy - 6, sw + 12, 1); g.fillRect(sx - 6, sy + sh, sw + 12, 1);
  // gothic crown on the booth
  g.fillStyle = '#2a1a12'; ppoly(g, [sx - 10, sy - 6, sx + sw / 2, sy - 34, sx + sw + 10, sy - 6]);
  g.fillStyle = '#4a2e1c'; ppoly(g, [sx + 6, sy - 6, sx + sw / 2, sy - 24, sx + sw - 6, sy - 6]);
  g.fillStyle = '#d9a441'; g.fillRect(sx + sw / 2 - 1, sy - 44, 2, 12); g.fillRect(sx + sw / 2 - 4, sy - 40, 8, 2);
  // the ledge, and the jar of sand when it is offered
  g.fillStyle = '#3a2416'; g.fillRect(sx - 18, sy + sh + 8, sw + 36, 5); g.fillStyle = '#5a3a20'; g.fillRect(sx - 18, sy + sh + 8, sw + 36, 1);
  if (T2.jar > 0) {
    const jx = sx + 10, jy = sy + sh + 8, k = T2.jar;
    g.globalAlpha = k;
    drawGlow(g, jx + 5, jy - 7, 24, '#f2d48f', 0.4 + Math.sin(t * 3) * 0.1, true);
    g.fillStyle = '#c8d0dc'; g.fillRect(jx, jy - 14, 11, 14); g.fillStyle = '#1a1210'; g.fillRect(jx + 2, jy - 16, 7, 2);
    g.fillStyle = '#d8b878'; g.fillRect(jx + 1, jy - 8, 9, 7); g.fillStyle = '#f2dca8'; g.fillRect(jx + 1, jy - 8, 9, 1);
    for (let i = 0; i < 3; i++) { g.fillStyle = '#f2dca8'; g.fillRect(jx + 3 + i * 2, jy - 9 - ((t * 6 + i * 3) % 5), 1, 1); }
    g.globalAlpha = 1;
  }
  // the Thirteenth, kneeling, the sword laid down before the screen
  g.fillStyle = '#4a4e58'; g.fillRect(205, 185, 40, 1);
  g.fillStyle = '#eef1f6'; g.fillRect(210, 184, 36, 1); g.fillStyle = '#d9a441'; g.fillRect(208, 181, 2, 5); g.fillStyle = '#3b2418'; g.fillRect(202, 184, 6, 1);
  POSE.kneel(_conf2, t); _conf2[3] = 0.45 + Math.sin(t * 0.5) * 0.03; _conf2[4] = 0.5; _conf2[5] = 1.6; _conf2[6] = 0.2; _conf2[7] = 1.5;
  if (T2.node && T2.node.who === 'you' && T2.shown < T2.total) _conf2[3] = 0.2;
  drawRig(g, _conf2, 178, 186, 1, CONF_PAL.thirteenth, { s: 2.4, t });
  // dust in the candlelight
  for (let i = 0; i < 30; i++) {
    const x = (i * 97 + t * (4 + (i % 5))) % W, y = (i * 53 + Math.sin(t * 0.5 + i) * 10 + 200) % 190;
    g.fillStyle = `rgba(255,217,160,${0.12 + 0.15 * Math.sin(t * 2 + i)})`; g.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
  // text box
  g.fillStyle = 'rgba(4,2,4,0.86)'; g.fillRect(40, 192, W - 80, 66);
  g.fillStyle = 'rgba(201,151,58,0.45)'; g.fillRect(40, 192, W - 80, 1); g.fillRect(40, 257, W - 80, 1);
  // choices / interrupt panels, and where the mouse is over them
  T2.hover = -1; T2.hoverInt = false;
  const n = T2.node;
  const ch = T2.shown >= T2.total ? T2.choices() : null;
  if (ch) {
    ch.forEach((c, k) => {
      const y = choiceY(k, ch.length);
      if (Input.mouseSeen && Input.mx > 46 && Input.mx < W - 46 && Input.my > y - 7 && Input.my < y + 7) T2.hover = k;
      if (k === (T2.hover >= 0 ? T2.hover : T2.sel)) { g.fillStyle = 'rgba(160,20,30,0.45)'; g.fillRect(48, y - 6, W - 96, 13); g.fillStyle = '#c0202a'; g.fillRect(48, y - 6, 2, 13); }
    });
  }
  if (n && n.interrupt && !T2.taken && T2.intOpen()) {
    const left = 1 - clamp(T2.t / (T2.total / 42 + 1.6), 0, 1);
    g.fillStyle = 'rgba(40,4,8,0.9)'; g.fillRect(318, 200, 116, 40);
    g.fillStyle = '#c0202a'; g.fillRect(318, 238, Math.round(116 * left), 2); g.fillRect(318, 200, 116, 1);
    T2.hoverInt = Input.mouseSeen && Input.mx > 318 && Input.mx < 434 && Input.my > 200 && Input.my < 240;
  }
  g.drawImage(VIGNETTE, 0, 0);
}

// ---------- the cinematics ----------
const choiceY = (k, n) => 222 - (n - 1) * 7 + k * 14;
// the Confessor behind the screen: a veil, a face you never quite see, two points of gold
function drawConfessorBust(g, cx, top, t, talking) {
  const b = Math.round(Math.sin(t * 0.8) * 1.2), y0 = top + b;
  drawGlow(g, cx + 4, top + 58, 64, '#c08a40', 0.4 + Math.sin(t * 9) * 0.02, true);
  const P = (pts) => { const q = []; for (let i = 0; i < pts.length; i += 2) q.push(cx + pts[i], y0 + pts[i + 1]); ppoly(g, q); };
  g.fillStyle = '#100c13'; P([-40, 132, 40, 132, 33, 104, 14, 92, -14, 92, -32, 104]);           // shoulders
  g.fillStyle = '#1e1824'; P([14, 92, 33, 104, 40, 132, 36, 132, 30, 106, 13, 95]);            // rim light on the right shoulder
  g.fillStyle = '#0c0a10'; P([0, 28, 15, 38, 22, 62, 26, 104, -26, 104, -22, 62, -15, 38]);    // the veil
  g.fillStyle = '#2c2634'; P([0, 28, 15, 38, 22, 62, 26, 104, 23, 104, 19, 62, 13, 40, 0, 31]); // its lit edge
  g.fillStyle = '#050407'; pcirc(g, cx - 3, y0 + 60, 10);                                     // the face, deep in shadow
  g.fillStyle = '#5a4c46'; P([-11, 56, -7, 50, -5, 62, -9, 70]);                              // a sliver of cheek
  g.fillStyle = '#7a6a60'; g.fillRect(cx - 10, y0 + 56, 1, 6);
  const glow = talking ? 0.9 + Math.sin(t * 20) * 0.1 : 0.6 + Math.sin(t * 1.3) * 0.15;
  g.globalAlpha = glow; g.fillStyle = '#ffd27a'; g.fillRect(cx - 9, y0 + 57, 2, 1); g.fillRect(cx - 2, y0 + 57, 2, 1); g.globalAlpha = 1;
  drawGlow(g, cx - 5, y0 + 57, 8, '#ffd27a', 0.25 * glow);
  g.fillStyle = '#e8e0d0'; g.fillRect(cx - 8, y0 + 88, 15, 4); g.fillStyle = '#0c0a10'; g.fillRect(cx - 1, y0 + 88, 2, 4);   // the collar
  g.fillStyle = '#d9a441'; g.fillRect(cx - 1, y0 + 104, 2, 9); g.fillRect(cx - 4, y0 + 107, 8, 2);                         // a gold cross
  g.fillStyle = '#4a3e3a'; P([-10, 124, -2, 118, 8, 120, 10, 128, -6, 130]);                                                 // folded hands
}
function drawCine(T2) {
  const n = T2.node;
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  if (!n) return;
  const im = IMG[n.bg], k = clamp(T2.t / 9, 0, 1);
  if (im) {
    if (n.bg.startsWith('window')) {
      drawGlow(g, W / 2, H / 2 - 20, 160, '#ff9a50', 0.25, true);
      g.drawImage(im, Math.round(W / 2 - im.width / 2), Math.round(-20 - k * 10));
    } else if (n.bg === 'title') { // the penitent in the nave, framed whole
      const x = Math.round(W / 2 - im.width / 2 - 40 + k * 12);
      g.drawImage(im, x, 0);
      const gl = g.createLinearGradient(x, 0, x + 70, 0); gl.addColorStop(0, '#000'); gl.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gl; g.fillRect(x, 0, 70, H);
      const gr2 = g.createLinearGradient(x + im.width - 50, 0, x + im.width, 0); gr2.addColorStop(0, 'rgba(0,0,0,0)'); gr2.addColorStop(1, '#000');
      g.fillStyle = gr2; g.fillRect(x + im.width - 50, 0, 50, H);
      drawGlow(g, x + 236, 236, 60, '#ff9a50', 0.12 + Math.sin(RT * 0.9) * 0.04, true);
    } else if (n.bg === 'ending') {
      g.drawImage(im, 0, Math.round(-(1 - k) * (im.height - H)));
      drawGlow(g, 305, 129 - Math.round((1 - k) * (im.height - H)), 110, '#ffd890', 0.16, true);
    } else {
      const s = 2, iw = im.width * s, ih = im.height * s;
      const x = Math.round(-(iw - W) * (0.25 + 0.5 * k)), y = Math.round(-(ih - H) * (0.35 + 0.2 * Math.sin(k * 1.5)));
      g.imageSmoothingEnabled = false;
      g.drawImage(im, x, y, iw, ih);
    }
  }
  g.globalCompositeOperation = 'multiply'; g.fillStyle = '#c4b4bc'; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over';
  const gr = g.createLinearGradient(0, H - 110, 0, H);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.9)');
  g.fillStyle = gr; g.fillRect(0, H - 110, W, 110);
  g.fillStyle = '#000'; g.fillRect(0, 0, W, 18); g.fillRect(0, H - 14, W, 14);
  g.drawImage(VIGNETTE, 0, 0);
  g.drawImage(GRAIN[(Math.random() * GRAIN.length) | 0], 0, 0);
}

// ---------- relic cards ----------
function drawCard(T2) {
  const c = T2.node, t = RT;
  g.fillStyle = '#050307'; g.fillRect(0, 0, W, H);
  drawGlow(g, W / 2, 84, 110, '#d9a441', 0.22 + Math.sin(t * 1.5) * 0.05, true);
  const x = W / 2, y = 80;
  if (T2.id === 'toll') {
    g.fillStyle = '#2a2420'; pline(g, x - 30, y - 34, x + 6, y + 10, 4);
    g.fillStyle = '#4a4040'; pcirc(g, x + 12, y + 18, 14); g.fillStyle = '#6a5e5a'; pcirc(g, x + 9, y + 14, 7);
    g.fillStyle = '#8a7e76'; g.fillRect(x + 4, y + 9, 4, 3);
    g.fillStyle = '#c9973a'; pring(g, x - 32, y - 37, 5, 2);
  } else if (T2.id === 'chain') {
    for (let i = 0; i < 22; i++) {
      const a = i * 0.55, r = 8 + i * 1.6;
      g.fillStyle = i % 2 ? '#5c5566' : '#8a8494'; pring(g, x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.6, 3, 1);
    }
    g.fillStyle = '#c9973a'; pring(g, x, y, 7, 2);
  } else if (T2.id === 'page') {
    g.fillStyle = '#1a1208'; g.fillRect(x - 31, y - 41, 64, 84);
    g.fillStyle = '#d8ccb0'; g.fillRect(x - 30, y - 40, 60, 80);
    g.fillStyle = '#b8a888'; for (let i = 0; i < 9; i++) g.fillRect(x - 24, y - 30 + i * 8, 44 - (i % 3) * 6, 1);
    g.fillStyle = '#8a1a14'; g.fillRect(x - 24, y + 22, 18, 2);
  }
  g.drawImage(VIGNETTE, 0, 0);
}
function drawCardText(T2, a) {
  const c = T2.node;
  txt(c.name, W / 2, 150, 18, F_FELLSC, '#f2d48f', 'center', a, 'rgba(160,20,30,0.8)');
  txt(c.sub, W / 2, 168, 8.5, F_FELL, '#9a7d5a', 'center', a);
  let y = 188;
  if (c.note) for (const l of c.note) { txt(l, W / 2, y, 8.5, F_FELL, '#e8dcc0', 'center', a); y += 12; }
  if (c.how) { y += 4; for (const l of c.how) { txt(l, W / 2, y, 6.5, F_PIX, '#d9a441', 'center', a); y += 11; } }
  txt('click to continue', W / 2, H - 10, 6, F_PIX, '#8a7660', 'center', a * (0.5 + Math.sin(RT * 4) * 0.3));
}
