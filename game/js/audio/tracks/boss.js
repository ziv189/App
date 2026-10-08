(function () {
  window.AUDIO_TRACKS = window.AUDIO_TRACKS || {};
  AUDIO_TRACKS.boss = {
    bpm: 150,
    wave: 'square',
    // A minor, driving and urgent: a 16th-note riff that climbs the A minor arpeggio, then leans on G# (the leading tone) and D# before it snaps back to A.
    lead: 'A4 A4 C5 - E5 D5 C5 B4 G#4 A4 G4 - B4 D5 G5 - F4 A4 C5 F5 E5 - D5 C5 E5 E5 G#5 - D#5 E5 G#4 -',
    // Am, G, F, E: one chord per half bar, an eighth-note sawtooth pulse that jumps octaves, then a 16th-note run on E to push into the loop.
    bass: 'A2 - A3 - A2 - A3 - G2 - G3 - G2 - G3 - F2 - F3 - F2 - F3 - E2 E3 E2 E3 E2 E3 E2 E3',
    // A clock-tick pulse: hi-hat on every off-beat like a ticking mechanism, a kick on each beat, and a three-hat fill that leads back to the top.
    perc: 'k . x . k . x . k . x . k . x x k . x . k . x . k . x . k x x x'
  };
})();
