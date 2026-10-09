(function () {
  const W = 150;
  const fit = (rows) => rows.map((r) => { if (r.length > W) throw new Error('row too long: ' + r.length); return r + '.'.repeat(W - r.length); });
  CHAPTERS.register({
    id: 'ch2', title: 'The Frozen Market', kicker: 'Chapter II · The market', theme: 'market', music: 'ch2', next: 'ch3',
    map: fit([
      '......................................................................................................................................................',
      '......................................................................................................................................................',
      '......................................................................................................................................................',
      '......................................................................................................................................................',
      '......................................................................................................................................................',
      '......................................................................................................................................................',
      '......................................................................................................................................................',
      '......................................................................................................................................................',
      '......................................................................................................................................................',
      '................................................................................................................................s.....................',
      '.........................o.........................................................................o...................o..............................',
      '........................2.............................................................................................................................',
      '.................o..========.......................................=====.................o......========..............====........====................',
      '..............................................3o..............1.......................................................................................',
      '.......o...o....##..##..................o.o..###.........h...###..o.###.....o...........====....##.......o.......o..##......h...##...o.......o........',
      '...S............##..##.......f..f..C.........###....^...r....###....###...C.................^...##..f..f....r.C.....##..........##........^.......X...',
      '#################################################################################.....################################################################',
      '#################################################################################.....################################################################'
    ]),
    scenes: [
      { id: 'ch2_arrival', col: 1, lines: [
        { who: 'narrator', text: 'The market of Vermeil stopped in the middle of an ordinary moment, ten years ago. It has not moved since.' },
        { who: 'narrator', text: 'A baker\'s loaf hangs halfway to a customer\'s mouth. A coin stays frozen above an open palm.' },
        { who: 'narrator', text: 'Rain hangs in the air too, a thousand silver threads that never reach the cobbles.' },
        { who: 'leo', expr: 'worried', text: 'Great. The market is closed. Permanently, by the look of it.' }
      ] },
      { id: 'ch2_theft', col: 14, lines: [
        { who: 'narrator', text: 'A shadow brushes past Leo\'s hip. A quick tug, a flash of plum velvet, and his belt is lighter.' },
        { act: 'sfx', value: 'pickup' },
        { who: 'leo', expr: 'surprised', text: 'Hey! That was my gear!' },
        { who: 'narrator', text: 'On the roof of a crate, a girl with two red braids spins the brass gear on one finger.' },
        { who: 'mireille', expr: 'happy', text: 'Thanks, sunshine. Nice gear. You jingle like a tourist, you know that?' },
        { who: 'leo', expr: 'angry', text: 'Give it back, you thief!' },
        { who: 'mireille', text: 'Mireille Crow. Remember the name. Catch me if you can.' },
        { act: 'flag', value: 'mireille_theft' }
      ] },
      { id: 'ch2_dash', col: 79, lines: [
        { who: 'narrator', text: 'The street ends in a black seam, five tiles wide. On the far side, a stone ledge waits, out of reach.' },
        { who: 'mireille', text: 'Don\'t stare at the hole. Stare at the ledge. Your feet go wherever your eyes go.' },
        { who: 'leo', expr: 'worried', text: 'Let me guess. You just jump over it?' },
        { who: 'mireille', expr: 'happy', text: 'Jumping is for amateurs. Watch me glide.' },
        { who: 'narrator', text: 'She runs, taps the air with one boot, slides to the edge.' },
        { who: 'narrator', text: 'Then she leaps and lands on the far side, as if the street had never broken.' },
        { act: 'unlock', value: 'dash' },
        { who: 'mireille', text: 'Shift or K to glide, then jump. Don\'t stop halfway. Halfway is where people fall.' },
        { who: 'leo', expr: 'worried', text: 'Halfway. Wonderful. Thanks for the pep talk.' },
        { act: 'flag', value: 'dash_learned' }
      ] },
      { id: 'ch2_end', col: 140, lines: [
        { who: 'narrator', text: 'The stone bridge runs straight toward the Saint-Aube Tower. Its great dial glows above the frozen roofs.' },
        { who: 'narrator', text: 'Its hands point at 23:47. They have pointed there for ten years.' },
        { who: 'mireille', text: 'The Regent\'s guards hold the bridge and every stair up to the Tower. Clockwork men with polite manners and no pulse.' },
        { who: 'mireille', expr: 'worried', text: 'Tomas is my reason. He is my little brother, eight years old, frozen mid-laugh with a bread roll in his fist.' },
        { who: 'narrator', text: 'Leo\'s hand closes around the watch in his pocket. Juliette\'s small hand slipped out of his on a staircase.' },
        { who: 'mireille', expr: 'worried', text: 'So. Will you fix the Tower for him, or not?' },
        { who: 'leo', expr: 'worried', text: 'Fine. The Tower. I\'m not promising anything, but I\'ll try.' },
        { who: 'mireille', expr: 'happy', text: 'Look at you, sounding like a hero. Don\'t get used to it.' },
        { act: 'flag', value: 'ch2_end' }
      ] }
    ],
    npcs: {
      '1': { who: 'tomas', lines: [
        { who: 'narrator', text: 'A boy in a striped jumper, mouth wide open. He is caught in a laugh that has lasted ten years.' },
        { who: 'tomas', expr: 'happy', text: 'Bread...' },
        { who: 'narrator', text: 'The bread roll is round and golden, with the crimp of Mrs. Pivert\'s oven. Not one crumb has fallen in ten years.' },
        { who: 'narrator', text: 'His eyes slide past you, looking for someone else.' },
        { who: 'tomas', expr: 'happy', text: 'Big sister!' }
      ], again: [
        { who: 'tomas', expr: 'happy', text: 'Again!' },
        { who: 'narrator', text: 'Nobody can finish the joke for him. The laugh stays frozen on his face, waiting for the punchline.' }
      ] },
      '2': { who: 'hugo', lines: [
        { who: 'hugo', text: 'Oi. Don\'t loiter under my awning like a lost pigeon. Buying something, or just breathing?' },
        { who: 'leo', expr: 'surprised', text: 'You\'re moving. Everybody else in this market is stuck in the middle of a bite.' },
        { who: 'hugo', expr: 'angry', text: 'Don\'t gawk. Yes, I move. No, I won\'t explain it on an empty stomach.' },
        { who: 'leo', expr: 'worried', text: 'Fine. Do you know Elias Varin? The clockmaker. He\'s my father.' },
        { who: 'hugo', text: 'Know him? I made toys for your little sister, Juliette. Wooden horses, a tin bird that sang. Good work, all of it.' },
        { who: 'leo', expr: 'worried', text: 'Juliette...' },
        { who: 'hugo', text: 'Elias always had that watch in his hand. Pulling it out, winding it, glaring at it like it owed him money.' },
        { who: 'leo', expr: 'worried', text: 'I have his watch. It started ticking again at the station, the night I got here.' },
        { who: 'hugo', text: 'Ask Gaspard, the automaton Elias built to mind your sister. He sleeps in the foundry, past the bridge.' },
        { act: 'flag', value: 'met_hugo' }
      ], again: [
        { who: 'hugo', expr: 'angry', text: 'Still here? I thought the clockwork crabs would have eaten you by now.' },
        { who: 'hugo', text: 'Gaspard sleeps in the foundry. Go wake him up and stop blocking my awning.' }
      ] },
      '3': { who: 'mireille', lines: [
        { who: 'mireille', text: 'You again. Still got all your fingers? Good, you\'ll need them for what I\'m about to ask.' },
        { who: 'leo', expr: 'angry', text: 'You stole my gear. You don\'t get to ask me for anything.' },
        { who: 'mireille', expr: 'happy', text: 'Borrowed. The Tower froze this whole city, and my little brother is stuck in the middle of a laugh.' },
        { who: 'mireille', text: 'Fix the Tower, start its clock, and Tomas can move again. I get my brother back. You get your gear.' },
        { who: 'leo', expr: 'worried', text: 'Fix the Tower... I don\'t even know how it stopped.' },
        { who: 'mireille', expr: 'happy', text: 'Then find out. You\'re the clockmaker\'s son. Stop talking like it\'s a wish and act like it\'s a deal.' },
        { act: 'flag', value: 'mireille_ally' }
      ], again: [
        { who: 'mireille', expr: 'happy', text: 'Back for more? I don\'t come cheap, sunshine.' },
        { who: 'leo', expr: 'angry', text: 'You still owe me a gear. Settle that before you charge me for help.' },
        { who: 'mireille', text: 'Keep up, clockboy. Gears can wait. Tomas can\'t.' }
      ] }
    }
  });
})();
