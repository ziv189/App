/* Chapitre 1 — Vermeil Station. Contrat : game/DESIGN.md, section 8. */
(function () {
  const W = 140;
  const fit = (rows) => rows.map((r) => { if (r.length > W) throw new Error('row too long: ' + r.length); return r + '.'.repeat(W - r.length); });
  CHAPTERS.register({
    id: 'ch1', title: 'Vermeil Station', kicker: 'Chapter I · 23:47', theme: 'station', music: 'ch1', next: 'ch2',
    map: fit([
      '............................................................................................................................................',
      '............................................................................................................................................',
      '............................................................................................................................................',
      '............................................................................................................................................',
      '............................................................................................................................................',
      '............................................................................................................................................',
      '............................................................................................................................................',
      '......................................................................................s.....................................................',
      '............................................................................................................................................',
      '..................................o..o..................................o..o..................................o.............................',
      '................................=========..............................======...............................=====...........................',
      '...................................................................o.....................................h..................................',
      '............................===...........===.....................====..................................===.................................',
      '..........o....................................h..............o......................................o...........................o..........',
      '........====............===...................===............====...................................===.......................========......',
      '...S..............r...1.................C..........o.^^...f...............2.....f....o..^^..r..C..o..................o....r..............X..',
      '##############################################################..############################################################################',
      '##############################################################..############################################################################',
    ]),
    scenes: [
      { id: 'ch1_arrival', col: 1, lines: [
        { who: 'narrator', text: "Rain hangs over Vermeil Station, each drop frozen mid-fall. The clock on the wall reads 23:47." },
        { who: 'narrator', text: "It has read 23:47 for ten years. Nobody has swept the platform since." },
        { who: 'leo', expr: 'neutral', text: "Perfect. Frozen rain, a frozen clock, and not a single porter to blame." },
        { who: 'narrator', text: "In Leo's coat pocket, his father's pocket watch gives a click, then a tick." },
        { who: 'narrator', text: "For the first time in ten years, it is ticking again." },
        { who: 'leo', expr: 'worried', text: "Okay. It's a watch. Just a watch. Keep walking, Leo." },
        { act: 'flag', value: 'leo_arrives' }
      ] },
      { id: 'ch1_photo', col: 66, lines: [
        { who: 'narrator', text: "On a bench, a traveller sits frozen mid-yawn, a folded train ticket pinched between two stiff fingers." },
        { who: 'narrator', text: "Leo eases it free. Clipped to its corner is a faded photo of a little girl with a tiny clock on a ribbon." },
        { who: 'leo', expr: 'sad', text: "Juliette... She used to make that exact face right before she broke something." },
        { who: 'leo', expr: 'neutral', text: "Ticket for Saint-Aube Tower. Departure 23:47. Valid for one passenger. No return." },
        { act: 'flag', value: 'ch1_photo' }
      ] },
      { id: 'ch1_voice', col: 128, lines: [
        { who: 'narrator', text: "Beside the open carriage door, a cold draft smells of oil and wet wool. Then a voice, very soft, behind him." },
        { act: 'shake' },
        { who: 'juliette', expr: 'neutral', text: "Leo-Grand... you won't let go, will you?" },
        { who: 'leo', expr: 'worried', text: "Juliette? I can't see you. Stop messing with me." },
        { who: 'juliette', expr: 'happy', text: "I'm right here, silly. Promise you won't let go, Leo-Grand." },
        { who: 'leo', expr: 'sad', text: "I won't let go. I promise, Juli. Not this time." }
      ] }
    ],
    npcs: {
      '1': { who: 'pivert', lines: [
        { who: 'pivert', expr: 'neutral', text: "Would you like a loaf, dear? Fresh this morning. Would you like a loaf, dear?" },
        { who: 'narrator', text: "The loop breaks. She blinks, and her round, floury face turns toward Leo." },
        { who: 'pivert', expr: 'surprised', text: "Oh! You spoke! Nobody has spoken to me in ten years, dear. Not one soul!" },
        { who: 'leo', expr: 'neutral', text: "A decade of nobody buying bread. Sounds rough, ma'am." },
        { who: 'pivert', expr: 'happy', text: "Rough? Look at you, all thin and wet. Have you eaten? You haven't eaten, have you?" },
        { who: 'leo', expr: 'neutral', text: "I'm fine. What happened here? Why is everything frozen?" },
        { who: 'pivert', expr: 'worried', text: "The Regent's guards sealed Saint-Aube Tower, dear. And the trains only run when the hour starts again." },
        { act: 'flag', value: 'met_pivert' },
        { who: 'pivert', expr: 'neutral', text: "So go see Bastien about the Saint-Aube train, dear. Mind the procedure. He does love a procedure." }
      ], again: [
        { who: 'pivert', expr: 'happy', text: "Would you like a loaf, dear? Oh, I've gone round again. A decade of loops does that to a baker." },
        { who: 'pivert', expr: 'neutral', text: "Don't rush off, dear. Nobody leaves my shop half-baked." },
        { who: 'leo', expr: 'neutral', text: "Half-baked. Yeah, that tracks for this station." }
      ] },
      '2': { who: 'bastien', lines: [
        { who: 'bastien', expr: 'worried', text: "Stop! Stop right there. Platform Four is closed under Procedure Nine, paragraph two." },
        { who: 'leo', expr: 'neutral', text: "Procedure. Right. Is there a procedure for the clocks stopping?" },
        { who: 'bastien', expr: 'angry', text: "That is not funny! The Tower train leaves at 23:47. It has not left. Ten years of delay, sir!" },
        { who: 'leo', expr: 'neutral', text: "So where's the train now?" },
        { who: 'bastien', expr: 'neutral', text: "Platform Four, last carriage. Fuelled, polished, ready. It will leave as soon as the hour starts again." },
        { who: 'leo', expr: 'worried', text: "The hour's frozen, Bastien. My watch ticks, but that's just a watch. Nothing is starting again." },
        { who: 'bastien', expr: 'worried', text: "I have filed forty-one complaints. Nobody answers. The Tower never answers. It is most irregular." },
        { who: 'bastien', expr: 'neutral', text: "Please do not touch the rails, sir. The rails are not on the timetable." }
      ], again: [
        { who: 'bastien', expr: 'worried', text: "That ticket is folded, sir. Procedure Nine says no passenger boards with a folded ticket." },
        { who: 'bastien', expr: 'neutral', text: "The train departs as soon as the hour starts again. Not one second before. That is procedure." }
      ] }
    }
  });
})();
