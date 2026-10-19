'use strict';
// ============================================================
//  HORA MORTIS — core: constants, math, rng, input, audio
// ============================================================
const W = 480, H = 270, T = 16, STEP = 1 / 60;
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const sign = (v) => (v < 0 ? -1 : v > 0 ? 1 : 0);
const approach = (v, t, d) => (v < t ? Math.min(v + d, t) : Math.max(v - d, t));
const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
const easeOut = (t) => 1 - (1 - t) * (1 - t);
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
function angDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}
function hash2(x, y, s = 0) {
  let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Simulation RNG — reseeded per attempt so replays re-simulate exactly.
let R = mulberry32(1);
const rnd = (a = 1, b) => (b === undefined ? R() * a : a + R() * (b - a));
const rndi = (a, b) => Math.floor(rnd(a, b + 1));
const rsgn = () => (R() < 0.5 ? -1 : 1);
// Cosmetic RNG (render only — never touches the simulation)
const fr = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));

// ------------------------------------------------------------
//  Input
// ------------------------------------------------------------
// L/R move, J jump, D down/roll, A strike, S chronos, E last rites, U up, T throw, C chain
const B = { L: 1, R: 2, J: 4, D: 8, A: 16, S: 32, E: 64, U: 128, T: 256, C: 512 };
const KEYMAP = {
  KeyA: B.L, ArrowLeft: B.L, KeyD: B.R, ArrowRight: B.R,
  KeyW: B.J | B.U, ArrowUp: B.J | B.U, Space: B.J,
  KeyS: B.D, ArrowDown: B.D, KeyJ: B.A,
  ShiftLeft: B.S, ShiftRight: B.S, KeyL: B.S, KeyK: B.S,
  KeyE: B.E, KeyQ: B.T, KeyG: B.T, KeyF: B.C, KeyC: B.C,
};
const Input = {
  down: 0, latched: 0, prev: 0,
  mx: W / 2, my: H / 2, mouseSeen: false, lastMove: 0,
  keysHeld: new Set(),
  onPress: [], // generic listeners for menus: fn(code)
  anyPressed: false,
  mouseL: false, mouseR: false, mouseM: false,
  recompute() {
    let d = 0;
    for (const k of this.keysHeld) d |= KEYMAP[k] || 0;
    if (this.mouseL) d |= B.A;
    if (this.mouseR) d |= B.S;
    if (this.mouseM) d |= B.C;
    const newly = d & ~this.down;
    this.latched |= newly;
    this.down = d;
  },
  // consumed once per simulation step
  sample() {
    const pressed = this.latched | (this.down & ~this.prev);
    this.latched = 0;
    this.prev = this.down;
    return { down: this.down, pressed };
  },
  clear() { this.keysHeld.clear(); this.mouseL = this.mouseR = this.mouseM = false; this.down = 0; this.latched = 0; },
};
const view = { s: 1, ox: 0, oy: 0, dpr: 1, cw: W, ch: H };

function bindInput(canvas, onAnyKey) {
  window.addEventListener('keydown', (e) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
    if (!e.repeat) onAnyKey(e.code);
    Input.keysHeld.add(e.code);
    Input.recompute();
  });
  window.addEventListener('keyup', (e) => { Input.keysHeld.delete(e.code); Input.recompute(); });
  window.addEventListener('blur', () => { Input.clear(); });
  const toLow = (e) => {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * view.dpr, y = (e.clientY - r.top) * view.dpr;
    Input.mx = (x - view.ox) / view.s; Input.my = (y - view.oy) / view.s;
    Input.mouseSeen = true;
  };
  canvas.addEventListener('pointermove', toLow);
  canvas.addEventListener('pointerdown', (e) => {
    toLow(e);
    if (e.button === 0) Input.mouseL = true;
    if (e.button === 1) Input.mouseM = true;
    if (e.button === 2) Input.mouseR = true;
    Input.recompute();
    onAnyKey('Mouse' + e.button);
    e.preventDefault();
  });
  window.addEventListener('pointerup', (e) => {
    if (e.button === 0) Input.mouseL = false;
    if (e.button === 1) Input.mouseM = false;
    if (e.button === 2) Input.mouseR = false;
    Input.recompute();
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('auxclick', (e) => e.preventDefault());
}

// ------------------------------------------------------------
//  Audio — everything procedural (WebAudio). Cathedral reverb.
// ------------------------------------------------------------
const Sound = (() => {
  let ac = null, master, sfxBus, musBus, verbSend, lp, detuneSrc, comp;
  let noiseBuf = null;
  let pitch = 1, slowK = 0, replayK = 0, musicVol = 0.55, muted = false;
  let tension = 0, nextChord = 0, chordIx = 0, nextBeat = 0, beatIx = 0, nextBell = 0;
  let scene = 'level', bossK = 0, calmK = 0; // music scene: title | confession | level | boss
  const S = {};

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { ac = new AC(); } catch (e) { ac = null; return; }
    comp = ac.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 5; comp.attack.value = 0.004; comp.release.value = 0.2;
    comp.connect(ac.destination);
    lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 18000; lp.Q.value = 0.8; lp.connect(comp);
    master = ac.createGain(); master.gain.value = 0.85; master.connect(lp);
    sfxBus = ac.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
    musBus = ac.createGain(); musBus.gain.value = musicVol; musBus.connect(master);
    const verb = ac.createConvolver(); verb.buffer = makeIR(3.6, 2.4);
    const verbOut = ac.createGain(); verbOut.gain.value = 0.55; verb.connect(verbOut); verbOut.connect(master);
    verbSend = ac.createGain(); verbSend.gain.value = 1; verbSend.connect(verb);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    detuneSrc = ac.createConstantSource(); detuneSrc.offset.value = 0; detuneSrc.start();
    startMusic();
  }
  function makeIR(sec, decay) {
    const len = Math.floor(ac.sampleRate * sec), b = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay) * (i < 300 ? i / 300 : 1);
    }
    return b;
  }
  function env(g, t0, a, d, peak) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
  }
  function out(g, rev, bus) {
    g.connect(bus || sfxBus);
    if (rev) { const s = ac.createGain(); s.gain.value = rev; g.connect(s); s.connect(verbSend); }
  }
  function noise({ dur = 0.2, type = 'bandpass', f0 = 1000, f1 = 0, q = 1, gain = 0.3, a = 0.004, rev = 0.15, delay = 0, bus }) {
    if (!ac || muted) return;
    const t = ac.currentTime + delay;
    const src = ac.createBufferSource(); src.buffer = noiseBuf; src.playbackRate.value = pitch;
    const f = ac.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0 * pitch, t);
    if (f1) f.frequency.exponentialRampToValueAtTime(f1 * pitch, t + a + dur);
    const g = ac.createGain(); env(g, t, a, dur / Math.max(0.35, pitch), gain);
    src.connect(f); f.connect(g); out(g, rev, bus);
    src.start(t, Math.random() * 1.5); src.stop(t + a + dur / Math.max(0.35, pitch) + 0.05);
  }
  function tone({ f = 440, f1 = 0, type = 'sine', dur = 0.2, gain = 0.2, a = 0.004, rev = 0.15, delay = 0, detune = 0, bus }) {
    if (!ac || muted) return;
    const t = ac.currentTime + delay;
    const o = ac.createOscillator(); o.type = type; o.detune.value = detune;
    o.frequency.setValueAtTime(f * pitch, t);
    const L = dur / Math.max(0.35, pitch);
    if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1 * pitch), t + a + L);
    const g = ac.createGain(); env(g, t, a, L, gain);
    o.connect(g); out(g, rev, bus);
    o.start(t); o.stop(t + a + L + 0.05);
  }
  function bell(f, gain = 0.15, dur = 2.2, rev = 0.5, delay = 0) {
    const parts = [[1, 1], [2.01, 0.5], [2.76, 0.42], [4.07, 0.25], [5.43, 0.16], [0.5, 0.35]];
    for (const [m, g] of parts) tone({ f: f * m, dur: dur * (m > 3 ? 0.5 : 1), gain: gain * g, a: 0.002, rev, delay });
  }

  // ---------- SFX library ----------
  S.slash = () => {
    noise({ dur: 0.13, f0: 2600, f1: 500, q: 1.2, gain: 0.32, rev: 0.12 });
    tone({ f: 2400 + Math.random() * 300, f1: 1500, type: 'triangle', dur: 0.08, gain: 0.05 });
  };
  S.kill = () => {
    noise({ dur: 0.2, type: 'lowpass', f0: 1400, f1: 200, q: 2, gain: 0.5, rev: 0.25 });
    tone({ f: 110, f1: 38, dur: 0.25, gain: 0.45 });
    tone({ f: 3800, f1: 2600, type: 'triangle', dur: 0.12, gain: 0.07, delay: 0.01 });
    noise({ dur: 0.35, f0: 500, f1: 180, q: 4, gain: 0.18, delay: 0.03, rev: 0.3 });
  };
  S.deflect = (perfect) => {
    const base = perfect ? 1.25 : 1;
    for (const [fq, g] of [[1870, 0.13], [2950, 0.1], [4120, 0.07], [5230, 0.05]]) tone({ f: fq * base, dur: perfect ? 0.9 : 0.45, gain: g, rev: 0.4 });
    noise({ dur: 0.05, type: 'highpass', f0: 3000, gain: 0.3, rev: 0.1 });
    if (perfect) bell(660, 0.08, 1.6, 0.6);
  };
  S.block = () => {
    for (const [fq, g] of [[620, 0.2], [1240, 0.1], [1710, 0.08]]) tone({ f: fq, dur: 0.3, gain: g, rev: 0.3 });
    noise({ dur: 0.08, type: 'bandpass', f0: 2000, q: 0.8, gain: 0.35 });
  };
  S.bolt = () => {
    tone({ f: 980, f1: 240, type: 'sawtooth', dur: 0.16, gain: 0.06, rev: 0.2 });
    noise({ dur: 0.12, f0: 1800, f1: 700, q: 3, gain: 0.12 });
  };
  S.shotgun = () => {
    noise({ dur: 0.3, type: 'lowpass', f0: 2500, f1: 300, gain: 0.45, rev: 0.35 });
    tone({ f: 140, f1: 45, dur: 0.3, gain: 0.35 });
  };
  S.jump = () => noise({ dur: 0.09, f0: 700, f1: 1600, q: 1.5, gain: 0.1, rev: 0.05 });
  S.land = () => noise({ dur: 0.07, type: 'lowpass', f0: 420, gain: 0.22, rev: 0.05 });
  S.step = () => noise({ dur: 0.03, type: 'lowpass', f0: 900 + Math.random() * 400, gain: 0.05, rev: 0.05 });
  S.roll = () => noise({ dur: 0.22, f0: 500, f1: 1400, q: 1.1, gain: 0.16, rev: 0.05 });
  S.wall = () => noise({ dur: 0.05, type: 'lowpass', f0: 600, gain: 0.12 });
  S.slowIn = () => { const p = pitch; pitch = 1; tone({ f: 260, f1: 55, dur: 0.55, gain: 0.22, rev: 0.3 }); noise({ dur: 0.5, type: 'lowpass', f0: 3000, f1: 200, gain: 0.12 }); pitch = p; };
  S.slowOut = () => { const p = pitch; pitch = 1; tone({ f: 70, f1: 240, dur: 0.3, gain: 0.12, rev: 0.2 }); pitch = p; };
  S.mark = (i) => { const sc = [293.66, 349.23, 440, 523.25, 587.33, 698.46, 880]; const p = pitch; pitch = 1; bell(sc[i % sc.length] * 2, 0.07, 1.4, 0.55); pitch = p; };
  S.riteIn = () => { const p = pitch; pitch = 1; tone({ f: 55, f1: 41, dur: 1.4, gain: 0.3, rev: 0.6 }); noise({ dur: 1.2, type: 'lowpass', f0: 400, f1: 90, gain: 0.25, rev: 0.6 }); bell(146.83, 0.08, 3, 0.8); pitch = p; };
  S.dash = () => { const p = pitch; pitch = 1; noise({ dur: 0.07, f0: 4000, f1: 900, q: 0.9, gain: 0.25 }); tone({ f: 3200, f1: 5200, type: 'triangle', dur: 0.06, gain: 0.05 }); pitch = p; };
  S.sheath = () => { const p = pitch; pitch = 1; tone({ f: 2200, f1: 3000, type: 'triangle', dur: 0.05, gain: 0.12 }); noise({ dur: 0.04, type: 'highpass', f0: 5000, gain: 0.25, delay: 0.05 }); pitch = p; };
  S.gong = () => { const p = pitch; pitch = 1; for (const [fq, g] of [[55, 0.5], [82, 0.3], [123, 0.25], [176, 0.14], [261, 0.08]]) tone({ f: fq, dur: 2.8, gain: g * 0.7, rev: 0.7 }); noise({ dur: 0.8, type: 'lowpass', f0: 1500, f1: 120, gain: 0.5, rev: 0.6 }); pitch = p; };
  S.death = () => {
    const p = pitch; pitch = 1;
    tone({ f: 80, f1: 28, dur: 1.2, gain: 0.55, rev: 0.4 });
    noise({ dur: 0.6, type: 'lowpass', f0: 2200, f1: 100, gain: 0.45, rev: 0.5 });
    for (const fq of [146.83, 155.56, 220, 233.08]) tone({ f: fq, type: 'sawtooth', dur: 1.6, gain: 0.035, a: 0.05, rev: 0.8 });
    pitch = p;
  };
  S.toll = () => { const p = pitch; pitch = 1; bell(98, 0.22, 4.5, 0.8); pitch = p; };
  S.doorOpen = () => { const p = pitch; pitch = 1; bell(196, 0.12, 3, 0.8); noise({ dur: 1.4, type: 'lowpass', f0: 300, f1: 80, gain: 0.25, rev: 0.4 }); pitch = p; };
  S.chain = () => { for (let i = 0; i < 3; i++) tone({ f: 2400 + i * 700, dur: 0.12, gain: 0.08, delay: i * 0.03 }); noise({ dur: 0.08, type: 'highpass', f0: 2500, gain: 0.2 }); };
  S.crash = () => {
    noise({ dur: 0.9, type: 'lowpass', f0: 3000, f1: 150, gain: 0.6, rev: 0.5 });
    tone({ f: 90, f1: 30, dur: 0.6, gain: 0.5 });
    for (let i = 0; i < 6; i++) tone({ f: 1800 + Math.random() * 3000, dur: 0.3, gain: 0.04, delay: Math.random() * 0.25, rev: 0.4 });
  };
  S.shatter = () => { noise({ dur: 0.4, type: 'highpass', f0: 2500, gain: 0.25, rev: 0.4 }); for (let i = 0; i < 5; i++) tone({ f: 2500 + Math.random() * 3500, dur: 0.2, gain: 0.03, delay: Math.random() * 0.15 }); };
  S.alert = () => tone({ f: 880, f1: 1320, type: 'square', dur: 0.06, gain: 0.025 });
  S.windup = () => tone({ f: 300, f1: 600, type: 'triangle', dur: 0.12, gain: 0.04 });
  S.swing = () => noise({ dur: 0.12, f0: 900, f1: 300, q: 1, gain: 0.18 });
  S.stun = () => { const p = pitch; pitch = 1; bell(110, 0.25, 3.5, 0.9); noise({ dur: 1.2, type: 'lowpass', f0: 600, f1: 60, gain: 0.3, rev: 0.6 }); pitch = p; };
  S.ui = () => { const p = pitch; pitch = 1; tone({ f: 660, f1: 990, type: 'triangle', dur: 0.08, gain: 0.05, rev: 0.3 }); pitch = p; };
  S.rewind = () => { const p = pitch; pitch = 1; tone({ f: 200, f1: 1800, type: 'sawtooth', dur: 0.8, gain: 0.04 }); noise({ dur: 0.9, f0: 800, f1: 4000, q: 0.7, gain: 0.12 }); pitch = p; };
  S.clear = () => { const p = pitch; pitch = 1; bell(146.83, 0.12, 3.5, 0.7); bell(220, 0.08, 3.5, 0.7, 0.18); bell(293.66, 0.08, 4, 0.8, 0.36); pitch = p; };
  // the Chain
  S.hook = () => { noise({ dur: 0.1, f0: 3200, f1: 1100, q: 2, gain: 0.16 }); for (let i = 0; i < 4; i++) tone({ f: 2600 + i * 500, dur: 0.05, gain: 0.03, delay: i * 0.02 }); };
  S.hookHit = () => { for (const [fq, gg] of [[1180, 0.1], [2090, 0.07], [3300, 0.04]]) tone({ f: fq, dur: 0.22, gain: gg, rev: 0.25 }); noise({ dur: 0.04, type: 'highpass', f0: 3500, gain: 0.25 }); };
  S.zip = () => noise({ dur: 0.26, f0: 500, f1: 2600, q: 1.4, gain: 0.16, rev: 0.1 });
  S.yank = () => { noise({ dur: 0.18, f0: 2200, f1: 500, q: 1.2, gain: 0.2 }); tone({ f: 180, f1: 90, dur: 0.15, gain: 0.2 }); };
  // throwables
  S.throw = () => noise({ dur: 0.14, f0: 1400, f1: 380, q: 1, gain: 0.17 });
  S.pickup = () => { const p = pitch; pitch = 1; tone({ f: 880, f1: 1320, type: 'triangle', dur: 0.09, gain: 0.06 }); bell(1320, 0.03, 0.6, 0.4, 0.05); pitch = p; };
  S.bone = () => { noise({ dur: 0.12, type: 'bandpass', f0: 1800, q: 3, gain: 0.3, rev: 0.2 }); tone({ f: 420, f1: 200, type: 'triangle', dur: 0.08, gain: 0.08 }); };
  S.fire = () => { noise({ dur: 0.7, type: 'lowpass', f0: 1600, f1: 260, gain: 0.32, rev: 0.3 }); for (let i = 0; i < 6; i++) noise({ dur: 0.03, type: 'highpass', f0: 3000, gain: 0.08, delay: Math.random() * 0.5 }); };
  S.explode = () => { noise({ dur: 0.9, type: 'lowpass', f0: 2600, f1: 120, gain: 0.7, rev: 0.5 }); tone({ f: 85, f1: 24, dur: 0.7, gain: 0.6 }); };
  // the Toll, parry, doors, hazards
  S.plunge = () => noise({ dur: 0.22, f0: 2200, f1: 500, q: 1.1, gain: 0.2 });
  S.plungeLand = () => { const p = pitch; pitch = 1; tone({ f: 92, f1: 34, dur: 0.4, gain: 0.5 }); noise({ dur: 0.35, type: 'lowpass', f0: 1400, f1: 140, gain: 0.45, rev: 0.3 }); bell(196, 0.07, 1.8, 0.7); pitch = p; };
  S.clash = () => { const p = pitch; pitch = 1; for (const [fq, gg] of [[1480, 0.16], [2310, 0.12], [3720, 0.08], [5100, 0.05]]) tone({ f: fq, dur: 0.8, gain: gg, rev: 0.5 }); noise({ dur: 0.07, type: 'highpass', f0: 2400, gain: 0.4 }); pitch = p; };
  S.door = () => { noise({ dur: 0.3, type: 'lowpass', f0: 900, f1: 150, gain: 0.42, rev: 0.25 }); tone({ f: 130, f1: 55, dur: 0.25, gain: 0.25 }); noise({ dur: 0.05, type: 'highpass', f0: 2000, gain: 0.12, delay: 0.04 }); };
  S.beamOn = () => { tone({ f: 660, f1: 1320, dur: 0.3, gain: 0.05, rev: 0.4 }); noise({ dur: 0.25, type: 'highpass', f0: 4000, gain: 0.05 }); };
  S.burn = () => { noise({ dur: 0.4, type: 'highpass', f0: 1800, gain: 0.22, rev: 0.2 }); tone({ f: 900, f1: 1800, dur: 0.2, gain: 0.04 }); };
  S.pendulum = () => noise({ dur: 0.32, f0: 300, f1: 900, q: 1.3, gain: 0.07 });
  S.crumble = () => { noise({ dur: 0.45, type: 'lowpass', f0: 800, f1: 200, gain: 0.24, rev: 0.2 }); for (let i = 0; i < 4; i++) noise({ dur: 0.03, type: 'bandpass', f0: 1200, q: 3, gain: 0.1, delay: Math.random() * 0.3 }); };
  S.creak = () => { tone({ f: 190, f1: 120, type: 'sawtooth', dur: 0.25, gain: 0.03 }); };
  S.breakFloor = () => { noise({ dur: 0.7, type: 'lowpass', f0: 2000, f1: 120, gain: 0.55, rev: 0.4 }); tone({ f: 70, f1: 30, dur: 0.5, gain: 0.4 }); };
  S.sand = () => noise({ dur: 0.6, type: 'highpass', f0: 2600, gain: 0.04, rev: 0.2 });
  S.tick = () => { tone({ f: 2100, dur: 0.02, gain: 0.04 }); noise({ dur: 0.015, type: 'highpass', f0: 5000, gain: 0.06 }); };
  S.dive = () => { tone({ f: 1500, f1: 400, type: 'triangle', dur: 0.4, gain: 0.05 }); noise({ dur: 0.35, f0: 1200, f1: 3000, q: 2, gain: 0.08 }); };
  S.fuse = () => noise({ dur: 0.5, type: 'highpass', f0: 3500, gain: 0.07 });
  S.herald = () => { const p = pitch; pitch = 1; for (let i = 0; i < 4; i++) bell(980, 0.05, 0.5, 0.4, i * 0.12); pitch = p; };
  S.snipe = () => { tone({ f: 1800, f1: 600, type: 'sawtooth', dur: 0.1, gain: 0.07 }); noise({ dur: 0.18, type: 'highpass', f0: 1500, gain: 0.3, rev: 0.25 }); };
  S.relic = () => { const p = pitch; pitch = 1; bell(293.66, 0.12, 4, 0.8); bell(440, 0.08, 4, 0.8, 0.25); bell(587.33, 0.08, 4.5, 0.9, 0.5); pitch = p; };
  // bosses
  S.roar = () => { const p = pitch; pitch = 1; for (const fq of [55, 58, 82, 87]) tone({ f: fq, f1: fq * 0.7, type: 'sawtooth', dur: 1.3, gain: 0.07, a: 0.08, rev: 0.6 }); noise({ dur: 1.2, type: 'bandpass', f0: 500, f1: 180, q: 1.5, gain: 0.35, rev: 0.5 }); pitch = p; };
  S.slam = () => { tone({ f: 64, f1: 24, dur: 0.9, gain: 0.7, rev: 0.4 }); noise({ dur: 1.0, type: 'lowpass', f0: 1800, f1: 90, gain: 0.6, rev: 0.6 }); };
  S.bossHit = () => { tone({ f: 160, f1: 60, dur: 0.3, gain: 0.45 }); for (const fq of [900, 1430]) tone({ f: fq, dur: 0.35, gain: 0.07, rev: 0.4 }); noise({ dur: 0.2, type: 'lowpass', f0: 2400, f1: 300, gain: 0.4 }); };
  S.bossDie = () => { const p = pitch; pitch = 1; S.gong(); for (const fq of [110, 116.54, 164.81, 174.61]) tone({ f: fq, type: 'sawtooth', dur: 3, gain: 0.04, a: 0.1, rev: 0.9 }); noise({ dur: 2.5, type: 'lowpass', f0: 900, f1: 60, gain: 0.35, rev: 0.8 }); pitch = p; };
  S.swordThrow = () => { noise({ dur: 0.25, f0: 3000, f1: 800, q: 1.4, gain: 0.18 }); tone({ f: 1760, f1: 2200, type: 'triangle', dur: 0.3, gain: 0.04, rev: 0.4 }); };
  S.sorrow = () => { const p = pitch; pitch = 1; for (const fq of [523.25, 622.25, 783.99]) tone({ f: fq, dur: 1.6, gain: 0.05, a: 0.02, rev: 0.8 }); noise({ dur: 0.5, type: 'highpass', f0: 3000, gain: 0.2, rev: 0.6 }); pitch = p; };
  S.timeStop = () => { const p = pitch; pitch = 1; tone({ f: 520, f1: 40, dur: 1.1, gain: 0.25, rev: 0.6 }); noise({ dur: 1.0, type: 'lowpass', f0: 4000, f1: 100, gain: 0.25, rev: 0.6 }); bell(98, 0.1, 4, 0.9); pitch = p; };
  S.timeGo = () => { const p = pitch; pitch = 1; tone({ f: 40, f1: 520, dur: 0.6, gain: 0.2, rev: 0.5 }); pitch = p; };
  S.rewindBoss = () => { const p = pitch; pitch = 1; tone({ f: 1600, f1: 200, type: 'sawtooth', dur: 0.7, gain: 0.05 }); noise({ dur: 0.7, f0: 4000, f1: 600, q: 0.8, gain: 0.14 }); pitch = p; };
  // dialogue
  S.talk = (v = 0) => { const p = pitch; pitch = 1; tone({ f: 190 + v * 60 + Math.random() * 25, type: 'square', dur: 0.022, gain: 0.016 }); pitch = p; };
  S.choice = () => { const p = pitch; pitch = 1; tone({ f: 523.25, f1: 784, type: 'triangle', dur: 0.1, gain: 0.05, rev: 0.4 }); pitch = p; };
  S.interrupt = () => { const p = pitch; pitch = 1; tone({ f: 220, f1: 110, type: 'sawtooth', dur: 0.12, gain: 0.06 }); noise({ dur: 0.08, type: 'highpass', f0: 2000, gain: 0.15 }); pitch = p; };
  S.whisper = () => { const p = pitch; pitch = 1; noise({ dur: 1.2, f0: 3200, f1: 2200, q: 6, gain: 0.05, a: 0.3, rev: 0.8 }); pitch = p; };

  // ---------- music: drone + choir + war drums ----------
  const chords = [
    [146.83, 174.61, 220.0, 293.66], [116.54, 146.83, 174.61, 233.08], [98.0, 146.83, 196.0, 233.08], [110.0, 138.59, 164.81, 220.0],
    [146.83, 174.61, 220.0, 349.23], [87.31, 130.81, 174.61, 220.0], [130.81, 164.81, 196.0, 261.63], [110.0, 138.59, 164.81, 277.18],
  ];
  function voice(freq, t, dur, gain) {
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 2.4);
    g.gain.setValueAtTime(gain, t + dur - 2.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const f1 = ac.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 700; f1.Q.value = 5;
    const f2 = ac.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 1150; f2.Q.value = 7;
    const mix = ac.createGain(); mix.gain.value = 1;
    f1.connect(mix); f2.connect(mix); mix.connect(g);
    for (const dt of [-9, 0, 8]) {
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = freq; o.detune.value = dt;
      detuneSrc.connect(o.detune);
      const vib = ac.createOscillator(); vib.frequency.value = 4.5 + Math.random(); const vg = ac.createGain(); vg.gain.value = 5;
      vib.connect(vg); vg.connect(o.detune);
      o.connect(f1); o.connect(f2);
      o.start(t); o.stop(t + dur + 0.1); vib.start(t); vib.stop(t + dur + 0.1);
    }
    g.connect(musBus);
    const s = ac.createGain(); s.gain.value = 0.9; g.connect(s); s.connect(verbSend);
  }
  function startMusic() {
    const t = ac.currentTime;
    const dg = ac.createGain(); dg.gain.setValueAtTime(0.0001, t); dg.gain.exponentialRampToValueAtTime(0.07, t + 5);
    const dlp = ac.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 300; dlp.Q.value = 2;
    dlp.connect(dg); dg.connect(musBus);
    for (const [fq, ty] of [[36.71, 'sawtooth'], [36.85, 'sawtooth'], [55.0, 'triangle'], [73.42, 'sine']]) {
      const o = ac.createOscillator(); o.type = ty; o.frequency.value = fq; detuneSrc.connect(o.detune); o.connect(dlp); o.start();
    }
    const lfo = ac.createOscillator(); lfo.frequency.value = 0.06; const lg = ac.createGain(); lg.gain.value = 140;
    lfo.connect(lg); lg.connect(dlp.frequency); lfo.start();
    nextChord = t + 0.5; nextBeat = t + 1; nextBell = t + 6;
  }
  function drum(t, big, g) {
    const o = ac.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(big ? 95 : 140, t); o.frequency.exponentialRampToValueAtTime(big ? 38 : 60, t + 0.25);
    detuneSrc.connect(o.detune);
    const gg = ac.createGain(); env(gg, t, 0.003, big ? 0.5 : 0.22, g * (big ? 0.6 : 0.3));
    o.connect(gg); gg.connect(musBus);
    const s = ac.createGain(); s.gain.value = 0.4; gg.connect(s); s.connect(verbSend);
    o.start(t); o.stop(t + 0.8);
    const n = ac.createBufferSource(); n.buffer = noiseBuf; const nf = ac.createBiquadFilter(); nf.type = 'lowpass'; nf.frequency.value = big ? 500 : 1800;
    const ng = ac.createGain(); env(ng, t, 0.002, 0.08, g * 0.15); n.connect(nf); nf.connect(ng); ng.connect(musBus); n.start(t, Math.random()); n.stop(t + 0.2);
  }
  const PATTERN = [2, 0, 0, 1, 0, 0, 1, 0, 2, 0, 1, 0, 0, 1, 1, 0];
  const BOSSPAT = [2, 0, 1, 1, 2, 0, 1, 0, 2, 1, 1, 0, 2, 0, 1, 1];
  const BASS = [36.71, 36.71, 43.65, 41.2, 36.71, 36.71, 34.65, 32.7];
  function bassHit(t, f, g) {
    const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; detuneSrc.connect(o.detune);
    const lpf = ac.createBiquadFilter(); lpf.type = 'lowpass'; lpf.frequency.setValueAtTime(900, t); lpf.frequency.exponentialRampToValueAtTime(140, t + 0.3);
    const gg = ac.createGain(); env(gg, t, 0.005, 0.32, g);
    o.connect(lpf); lpf.connect(gg); gg.connect(musBus);
    o.start(t); o.stop(t + 0.45);
  }
  function update(dt) {
    if (!ac) return;
    const t = ac.currentTime;
    // filters / pitch for chronos + replay
    const target = 18000 * (1 - slowK * 0.93) * (1 - replayK * 0.82);
    lp.frequency.setTargetAtTime(Math.max(500, target), t, 0.05);
    detuneSrc.offset.setTargetAtTime(-650 * slowK, t, 0.08);
    pitch = 1 - 0.42 * slowK;
    musBus.gain.setTargetAtTime(muted ? 0 : musicVol, t, 0.3);
    bossK += ((scene === 'boss' ? 1 : 0) - bossK) * 0.05;
    calmK += ((scene === 'confession' || scene === 'title' ? 1 : 0) - calmK) * 0.05;
    if (nextChord < t + 0.2) {
      const c = chords[chordIx++ % chords.length];
      const cg = 1 - calmK * 0.35;
      for (let i = 0; i < c.length; i++) voice(c[i], nextChord, 10, (i === 3 ? 0.010 : 0.016) * cg);
      nextChord += 8;
    }
    const boss = bossK > 0.5;
    const spb = 60 / (boss ? 118 : 92) / 2;
    while (nextBeat < t + 0.2) {
      const i = beatIx++;
      const p = (boss ? BOSSPAT : PATTERN)[i % 16];
      const tens = boss ? 1 : tension * (1 - calmK);
      if (p && tens > 0.05) drum(nextBeat, p === 2, tens * (boss ? 1.15 : 1));
      if (boss && i % 2 === 0) bassHit(nextBeat, BASS[(i >> 2) % BASS.length], 0.07);
      nextBeat += spb * (1 + slowK * 1.5);
    }
    if (nextBell < t) { if (tension < 0.2 && !boss) { bell(73.42, 0.05, 5, 1.0); } nextBell = t + 18 + Math.random() * 10; }
  }
  return {
    init, update, S,
    play(name, ...a) { if (ac && S[name] && !muted) try { S[name](...a); } catch (e) { /* audio is best-effort */ } },
    setSlow(k) { slowK = k; },
    setReplay(k) { replayK = k; },
    setTension(k) { tension = tension + (k - tension) * 0.02; },
    setScene(s) { scene = s; },
    toggleMute() { muted = !muted; return muted; },
    get muted() { return muted; },
    get ready() { return !!ac; },
  };
})();
