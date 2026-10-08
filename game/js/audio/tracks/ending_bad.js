(function () {
  window.AUDIO_TRACKS = window.AUDIO_TRACKS || {};
  AUDIO_TRACKS.ending_bad = {
    bpm: 60,
    wave: 'sine',
    // E minor, slow and resigned: the line only falls (E5, D5, C5, B4, A4, F#4) and the last phrase sinks from D#5 to B4 without ever resolving home to E.
    lead: 'E5 - - - D5 - - - C5 - - - B4 - - - A4 - - - F#4 - - - D#5 - - - B4 - - -',
    // Em, C, D, B: one chord every half bar, a root with its octave echo. The B (dominant) never resolves, so the loop feels like the hour that never ends.
    bass: 'E2 - - - E3 - - - C2 - - - C3 - - - D2 - - - D3 - - - B2 - - - F#3 - - -',
    // Almost nothing: a kick on the first beat of each bar and one faint hi-hat near the end, like a clock that barely ticks.
    perc: 'k . . . . . . . . . . . . . . . k . . . . . . . . . . . x . . .'
  };
})();
