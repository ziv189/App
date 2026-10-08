/* AUDIO: everything is synthesised with WebAudio (no files). Contract: DESIGN.md section 7.
   Every public call is safe if audio is unavailable or still locked. */
(function () {
  let ctx = null, master = null, musicBus = null, sfxBus = null, noiseBuf = null;
  let volume = 0.6, unlocked = false, wanted = null;
  let track = null, trackName = null, schedTimer = null, nextT = 0, stepIdx = 0, voices = 0;

  const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  function freq(n) {
    const m = /^([A-G]#?)(\d)$/.exec(n || '');
    if (!m) return 0;
    const midi = (parseInt(m[2], 10) + 1) * 12 + NOTE[m[1]];
    return 440 * Math.pow(2, (midi - 69) / 12);
  }
  const seq = (s) => s.trim().split(/\s+/);

  /* Each track is a 16-step loop: lead (note or -), bass (note or -), perc (x = hat, k = kick, . = none). */
  const TRACKS = {
    title:       { bpm: 68,  lead: seq('E4 - G4 - B4 - - A4 G4 - E4 - - D4 - B3 - -'), bass: seq('E2 - - - E2 - - - B1 - - - B1 - - -'), perc: seq('. . . . . . . . . . . . . . . .'), wave: 'triangle' },
    ch1:         { bpm: 84,  lead: seq('A4 - C5 - E5 - D5 - C5 - A4 - G4 - - -'), bass: seq('A2 - A2 - F2 - G2 - A2 - - E2 -'), perc: seq('x - - - x - - - x - x - x - - -'), wave: 'triangle' },
    ch2:         { bpm: 100, lead: seq('C5 - - E5 - G5 - E5 - D5 - - F5 - D5 - -'), bass: seq('C3 - G2 - F2 - G2 - C3 - - - - - - - - - -'), perc: seq('. . . . . . . . . . . . . . . .'), wave: 'sine' },
    ch3:         { bpm: 112, lead: seq('D4 - F4 - A4 - - D4 - F4 - G4 - - A4 -'), bass: seq('D2 D2 - D2 A1 A1 - A1 D2 D2 - D2 A1 A1 - A1'), perc: seq('x - x - x - x - x - x x x - x -'), wave: 'square' },
    ch4:         { bpm: 88,  lead: seq('F4 - - G#4 F4 - - D4 - - C4 - - D4 - - -'), bass: seq('F2 - F2 - C2 - C2 - F2 - F2 - D2 - G2 -'), perc: seq('x - - - - - x - x - - - x - - -'), wave: 'triangle' },
    ch5:         { bpm: 96,  lead: seq('C5 - E5 G5 - E5 - F5 - - E5 - C5 - - -'), bass: seq('C3 - C3 - A2 - A2 - F2 - F2 - G2 - G2 -'), perc: seq('x - x - x - x - x x x - x - x - x -'), wave: 'triangle' },
    boss:        { bpm: 150, lead: seq('A4 A4 C5 - A4 - E4 - G#4 - A4 - C5 - D5 - - -'), bass: seq('A2 A2 A2 A2 A2 A2 A2 A2 F2 F2 F2 F2 G2 G2 G2 G2'), perc: seq('k - x - k - x - k - x - k - x - k x'), wave: 'sawtooth' },
    ending_good: { bpm: 76, lead: seq('C5 - E5 - G5 - C6 - B5 - G5 - E5 - C5 - - -'), bass: seq('C3 - - - G2 - - - A2 - - - F2 - - -'), perc: seq('. . . . . . . . . . . . . . . .'), wave: 'triangle' },
    ending_bad:  { bpm: 60, lead: seq('E4 - - - D#4 - - - D4 - - - - C4 - - -'), bass: seq('E2 - - - - - - - D2 - - - - - - -'), perc: seq('. . . . . . . . . . . . . . . .'), wave: 'sine' },
  };

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = volume; master.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.35; musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.8; sfxBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }

  function unlock() {
    try {
      if (!ensure()) return;
      unlocked = true;
      if (ctx.state === 'suspended') ctx.resume();
      if (wanted) { const w = wanted; wanted = null; music(w); }
    } catch (e) { /* audio not available */ }
  }

  function setVolume(v) {
    volume = Math.max(0, Math.min(1, v));
    try { if (master) master.gain.value = volume; } catch (e) { /* idle */ }
  }

  /* ---------- music ---------- */
  function playStep(tr, i, when) {
    const stepDur = 60 / tr.bpm / 4;
    const leadN = tr.lead[i % tr.lead.length];
    const bassN = tr.bass[i % tr.bass.length];
    const percN = tr.perc[i % tr.perc.length];
    const f = freq(leadN);
    if (f && voices < 40) {
      voices++;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = tr.wave === 'sine' ? 'sine' : 'triangle';
      o.frequency.setValueAtTime(f, when);
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(0.5, when + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, when + stepDur * 1.7);
      o.connect(g); g.connect(track.gain);
      o.start(when); o.stop(when + stepDur * 1.8);
      o.onended = () => { voices--; };
    }
    const fb = freq(bassN);
    if (fb && voices < 40) {
      voices++;
      const o = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = tr.wave === 'square' ? 'square' : 'sawtooth';
      o.frequency.setValueAtTime(fb, when);
      lp.type = 'lowpass'; lp.frequency.value = 420;
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(0.35, when + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, when + stepDur * 0.95);
      o.connect(lp); lp.connect(g); g.connect(track.gain);
      o.start(when); o.stop(when + stepDur);
      o.onended = () => { voices--; };
    }
    if (percN === 'x' || percN === 'k') {
      if (percN === 'k') {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.setValueAtTime(120, when);
        o.frequency.exponentialRampToValueAtTime(40, when + 0.12);
        g.gain.setValueAtTime(0.7, when);
        g.gain.exponentialRampToValueAtTime(0.0001, when + 0.16);
        o.connect(g); g.connect(track.gain);
        o.start(when); o.stop(when + 0.18);
      } else {
        noiseHit(track.gain, when, 0.05, 0.12, 7000);
      }
    }
  }

  function scheduler() {
    if (!track || !ctx) return;
    while (nextT < ctx.currentTime + 0.12) {
      playStep(track.def, stepIdx, nextT);
      const stepDur = 60 / track.def.bpm / 4;
      nextT += stepDur;
      stepIdx++;
    }
  }

  function music(name) {
    try {
      if (!unlocked) { wanted = name; return; }
      if (!ensure()) return;
      if (name === trackName) return;
      const def = TRACKS[name];
      // fade out the old track
      if (track) {
        const old = track;
        old.gain.gain.cancelScheduledValues(ctx.currentTime);
        old.gain.gain.setValueAtTime(old.gain.gain.value, ctx.currentTime);
        old.gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
        setTimeout(() => { try { old.gain.disconnect(); } catch (e) { /* gone */ } }, 500);
        track = null;
      }
      trackName = def ? name : null;
      if (!def) { if (schedTimer) { clearInterval(schedTimer); schedTimer = null; } return; }
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.4);
      g.connect(musicBus);
      track = { def, gain: g };
      stepIdx = 0;
      nextT = ctx.currentTime + 0.05;
      if (!schedTimer) schedTimer = setInterval(scheduler, 25);
    } catch (e) { /* music is optional */ }
  }
  function musicStop() { music(null); }

  /* ---------- sound effects ---------- */
  function tone(f0, f1, dur, type, vol, when) {
    if (!ctx || voices > 40) return;
    voices++;
    const t0 = ctx.currentTime + (when || 0);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f0, t0);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(sfxBus);
    o.start(t0); o.stop(t0 + dur + 0.03);
    o.onended = () => { voices--; try { g.disconnect(); } catch (e) { /* done */ } };
  }
  function noiseHit(dest, when, dur, vol, cutoff) {
    if (!ctx || voices > 40) return;
    voices++;
    const t0 = ctx.currentTime + (when || 0);
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noiseBuf;
    f.type = 'highpass'; f.frequency.value = cutoff || 2000;
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(dest || sfxBus);
    src.start(t0, Math.random() * 0.5, dur + 0.05);
    src.stop(t0 + dur + 0.05);
    src.onended = () => { voices--; try { g.disconnect(); } catch (e) { /* done */ } };
  }
  function sweepNoise(dur, vol, f0, f1, type) {
    if (!ctx || voices > 40) return;
    voices++;
    const t0 = ctx.currentTime;
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noiseBuf;
    f.type = type || 'bandpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(f0, t0);
    f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(sfxBus);
    src.start(t0, Math.random() * 0.5, dur + 0.05); src.stop(t0 + dur + 0.05);
    src.onended = () => { voices--; try { g.disconnect(); } catch (e) { /* done */ } };
  }

  const SFX = {
    jump: () => tone(300, 620, 0.16, 'triangle', 0.25),
    land: () => tone(140, 60, 0.12, 'sine', 0.35),
    attack: () => { sweepNoise(0.16, 0.35, 2500, 500, 'bandpass'); tone(900, 300, 0.08, 'square', 0.05); },
    hit: () => { noiseHit(null, 0, 0.08, 0.35, 1500); tone(500, 160, 0.14, 'square', 0.15); },
    hurt: () => tone(420, 90, 0.35, 'sawtooth', 0.22),
    dash: () => sweepNoise(0.2, 0.3, 400, 3000, 'bandpass'),
    pickup: () => { tone(880, 880, 0.12, 'sine', 0.22); tone(1320, 1320, 0.2, 'sine', 0.2, 0.08); },
    gear: () => { tone(1500, 1500, 0.35, 'sine', 0.18); tone(3000, 2800, 0.25, 'sine', 0.05); },
    heal: () => { [660, 784, 988].forEach((f, i) => tone(f, f, 0.22, 'triangle', 0.2, i * 0.07)); },
    death: () => { tone(330, 40, 1.2, 'sawtooth', 0.22); tone(1200, 60, 0.05, 'square', 0.1, 0.9); },
    checkpoint: () => { tone(523, 523, 0.3, 'sine', 0.22); tone(784, 784, 0.4, 'sine', 0.2, 0.12); },
    door: () => { tone(120, 90, 0.3, 'square', 0.12); sweepNoise(0.9, 0.15, 300, 900, 'bandpass'); },
    talk: () => tone(900 + Math.random() * 120, 700, 0.05, 'square', 0.04),
    blip: () => tone(820 + (Math.random() - 0.5) * 80, 700, 0.05, 'square', 0.04),
    choice: () => { tone(660, 660, 0.15, 'triangle', 0.2); tone(880, 880, 0.2, 'triangle', 0.18, 0.1); },
    unlock: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, f, 0.25, 'triangle', 0.2, i * 0.09)); },
    boss_intro: () => { tone(55, 48, 2.2, 'sawtooth', 0.22); tone(110, 110, 2.0, 'sine', 0.15); noiseHit(null, 0, 1.4, 0.2, 200); },
    boss_hit: () => { tone(180, 60, 0.2, 'square', 0.25); tone(1040, 980, 0.6, 'sine', 0.12); },
    boss_die: () => { tone(220, 30, 2.4, 'sawtooth', 0.22); tone(70, 60, 2.6, 'sine', 0.3, 0.2); },
    tick: () => tone(2400, 2400, 0.02, 'square', 0.06),
    pendule: () => { tone(400, 120, 0.6, 'sine', 0.2); tone(1400, 1400, 0.02, 'square', 0.08, 0.5); },
    step: () => noiseHit(null, 0, 0.03, 0.08, 1000),
    menu: () => tone(700, 700, 0.06, 'triangle', 0.15),
  };
  SFX.blip = SFX.talk;

  function sfx(name) {
    try {
      if (!unlocked || !ensure()) return;
      if (ctx.state === 'suspended') ctx.resume();
      const f = SFX[name];
      if (f) f();
    } catch (e) { /* sound effects are optional */ }
  }

  window.AUDIO = { unlock, music, musicStop, sfx, setVolume };
})();
