(function () {
  window.AUDIO_TRACKS = window.AUDIO_TRACKS || {};
  AUDIO_TRACKS.title = {
    bpm: 66,
    wave: 'sine',
    // E minor: a falling phrase that lifts to D# (leading tone) and resolves back to E.
    lead: 'E5 - B4 - G4 - A4 B4 - C5 - B4 - A4 - - F#4 - D#5 - C#5 - B4 - A#4 - B4 - F#4 - D#5 -',
    // Em for bar one, B major (the dominant) for bar two, then back to E.
    bass: 'E2 - - - - - - - B2 - - - - - - - B2 - - - - - - - F#2 - - - D#2 - - -',
    // Sparse: a soft kick on each bar and two light hats.
    perc: 'k . . . . . . . . . . . . x . . k . . . . . . . . . . . . x . .'
  };
})();
