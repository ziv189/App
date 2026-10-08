(function () {
  window.AUDIO_TRACKS = window.AUDIO_TRACKS || {};
  AUDIO_TRACKS.ch4 = {
    bpm: 88,
    wave: 'square',
    // F minor, tense and chromatic: a climb from C5 through C#5 and D#5 to E5 and back down, then F4 rises through G#4 and A#4 to C5, jumps to F5 and sinks chromatically to A#4.
    lead: 'C5 - C#5 - D#5 - E5 - D#5 - C#5 - C5 - - - F4 - G#4 - A#4 - C5 - F5 - D#5 - C#5 - A#4 -',
    // A low drone that sinks chromatically from F2 to C2 and climbs back to D#2: a slow walk down into the dark, one note per beat.
    bass: 'F2 - - - E2 - - - D#2 - - - D2 - - - C#2 - - - C2 - - - C#2 - - - D#2 - - -',
    // Machinery: a kick every half bar, dry gear ticks in between, and an extra kick near the end like a heartbeat.
    perc: 'k . . x . . x . k . . x . . x . k . x . . x . . k . x . k . . .'
  };
})();
