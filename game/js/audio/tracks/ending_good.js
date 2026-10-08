(function () {
  window.AUDIO_TRACKS = window.AUDIO_TRACKS || {};
  AUDIO_TRACKS.ending_good = {
    bpm: 76,
    wave: 'triangle',
    // C major, warm and open: a rising C-E-G arpeggio that lifts to A5 at the top of the phrase, then steps back down the scale and settles on a held C5 so the loop lands home.
    lead: 'G4 - C5 - E5 - G5 - A5 - G5 - E5 - - - F5 - A5 - G5 - F5 - E5 - D5 - C5 - - -',
    // One chord per half bar: C, G, F, G, C. Plain roots and fifths and thirds, like a slow, steady heartbeat under the melody.
    bass: 'C2 - - - E2 - - - G2 - - - D3 - - - F2 - - - A2 - - - G2 - - - C3 - - -',
    // Soft and steady: a kick on the beats, hats on the off-beats, and a small lift into the final bar.
    perc: 'k . x . . . x . k . x . . . x . k . x . . . x . k . x . k . x .'
  };
})();
