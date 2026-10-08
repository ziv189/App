(function () {
  window.AUDIO_TRACKS = window.AUDIO_TRACKS || {};
  AUDIO_TRACKS.ch5 = {
    bpm: 96,
    wave: 'triangle',
    // C major, climbing by steps: a hesitant start on A4 and C5, a hopeful lift to A5 over F, then G5 and F#5 leaning into the C chord, which lands warmly on E5 and C5.
    lead: 'A4 - C5 E5 - D5 C5 - A4 - C5 F5 - A5 G5 - D5 - B4 D5 G5 - F#5 G5 E5 - G5 - E5 - C5 -',
    // Am, F, G, C: one root per half bar, with an octave pulse on the offbeat. The roots climb toward the C at the end of the loop.
    bass: 'A2 - - - A2 - A3 - F2 - - - F2 - F3 - G2 - - - G2 - G3 - C3 - - - E3 - G2 -',
    // Density builds through the loop: a lone kick at first, then hats, then a fuller kick and hat pattern over the C chord.
    perc: 'k . . . . . x . k . . . x . x . k . x . k . x . k . x x . k x x .'
  };
})();
