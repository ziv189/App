(function () {
  window.AUDIO_TRACKS = window.AUDIO_TRACKS || {};
  AUDIO_TRACKS.ch3 = {
    bpm: 112,
    wave: 'square',
    // D minor with the raised leading tone C#: a ticking lead that stays on the offbeats and leans on C# before it falls back to D.
    lead: 'D5 - F5 E5 D5 - A4 - A#4 - C5 D5 C5 A#4 - - G4 - A4 - C#5 - D5 - C#5 A4 - E4 - A4 - C#5',
    // Dm, A#, C, A: an eighth-note piston pulse, root and octave, one chord per half bar. The last A is a dominant that loops back to D.
    bass: 'D2 - D2 - D3 - D2 - A#2 - A#2 - A#3 - A#2 - C3 - C3 - G2 - C3 - A2 - A2 - A3 - C#3 -',
    // Gears and steam: a four-on-the-floor kick, with hats that skip and stumble in the second half.
    perc: 'k . x . k . x x k . x . k . x x k . x . k x x . k . x . k x . x'
  };
})();
