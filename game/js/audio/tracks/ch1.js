(function () {
  window.AUDIO_TRACKS = window.AUDIO_TRACKS || {};
  AUDIO_TRACKS.ch1 = {
    bpm: 84,
    wave: 'triangle',
    // A minor, sparse and a little uneasy: a falling line over Am and F, then the leading tone G# (over E) pulls up toward A.
    lead: 'E5 - D5 - C5 - B4 - A4 - - - F4 - G4 - G#4 - B4 - E5 - D5 - C5 - - - A4 - G#4 -',
    // Am, F, E, Am: one chord every half bar. A plucked pulse under the rain, with an octave lift on the E.
    bass: 'A2 - - - A2 - - - F2 - - - F2 - - - E2 - - - E3 - - - A2 - - - E2 - - -',
    // Rain as hi-hats with gaps; a kick now and then like a slow clock tick.
    perc: 'k . x . x . x . x . . x k . x . x . x . k . x . x . . . k . x .'
  };
})();
