(function () {
  window.AUDIO_TRACKS = window.AUDIO_TRACKS || {};
  AUDIO_TRACKS.ch2 = {
    bpm: 100,
    wave: 'sine',
    // C major music box: a bouncy C-E-G figure, then a wistful turn through A minor (G# pulls up to A) and F, and a playful answer on G that falls back to C.
    lead: 'C5 - E5 G5 - E5 G5 - A4 - C5 E5 - A5 G#5 E5 F5 E5 D5 - C5 B4 - A4 B4 - D5 G5 - E5 D5 -',
    // One chord per half bar: C, Am, F, G. Plucked roots, dropping to the fifth on the off-beats like a wound-down box.
    bass: 'C2 - - - C3 - - - A2 - - - E3 - - - F2 - - - C3 - - - G2 - - - D3 - - -',
    // Sparse: a soft kick on the top of each bar, a light hat tick like a clock in the snow.
    perc: 'k . . . x . . . . . . . x . . . k . . . x . . . . . . . x . . .'
  };
})();
