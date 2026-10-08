(function () {
  const W = 130;
  const fit = (rows) => rows.map((r) => { if (r.length > W) throw new Error('row too long: ' + r.length); return r + '.'.repeat(W - r.length); });
  CHAPTERS.register({
    id: 'ch5', title: 'The Dial', kicker: 'Chapter V · The summit', theme: 'clockface', music: 'ch5', next: null,
    map: fit([
      '..................................................................................................................................',
      '..................................................................................................................................',
      '..................................................................................................................................',
      '..................................................................................................................................',
      '................................................................................................s.................................',
      '................................................................................................................1.................',
      '..................................................................................s........................#######################',
      '.......................................................................................................h...#######################',
      '......................................................................................................====........................',
      '.......................o............................................s.............................o.^.............................',
      '.....................=====.......................................................................====.............................',
      '................o............o....................................................................................................',
      '..............=====.........====.............................................................###..................................',
      '........o.o........................o.............o.h.o...................o.o.............o...###..................................',
      '.......=====......................====...........=====..................====............====.###..................................',
      '...S........r......r....f...............C...^...f........f....^.................^....C.......###..................................',
      '##################################################################################################################################',
      '##################################################################################################################################'
    ]),
    scenes: [
      {
        col: 1, id: 'ch5_arrival', lines: [
          { who: 'narrator', text: 'The summit of the Saint-Aube Tower. Far below, the Great Clock lies open like a dial of brass.' },
          { who: 'narrator', text: 'From up here its hands point at 23:47. They have pointed there for ten years.' },
          { who: 'narrator', text: 'The clouds hang frozen in mid-drift, like cotton caught on a wire.' },
          { who: 'narrator', text: 'A wind should be tugging at Leo\'s scarf. It is not. The whole sky is holding its breath.' },
          { who: 'narrator', text: 'In his pocket, the watch that ticked all the way up the stairs has gone silent.' }
        ]
      },
      {
        col: 60, id: 'ch5_gauntlet', lines: [
          { who: 'mireille', expr: 'worried', text: 'I\'m breathing like an old bellows. Don\'t look at me. Pretend you didn\'t notice.' },
          { who: 'leo', text: 'Noticed. You\'re doing fine, Mireille.' },
          { who: 'mireille', text: 'Fine is what people say right before they fall off things.' },
          { act: 'flag', value: 'ch5_gauntlet' },
          { who: 'mireille', expr: 'worried', text: 'Tomas would be first up here, yelling "Encore!" at every ledge. Instead he is stuck in the market.' },
          { who: 'leo', expr: 'worried', text: 'Then we keep climbing. Tomas is waiting for us, and so is Juliette.' }
        ]
      },
      {
        col: 118, id: 'ch5_juliette', lines: [
          { who: 'narrator', text: 'Beside the balance wheel, a small figure gathers out of the still air, right next to Elias.' },
          { who: 'narrator', text: 'A little girl in a dress too big for her. Her hair drifts as if underwater. A tiny clock glows at her neck.' },
          { who: 'leo', expr: 'surprised', text: 'Juliette?' },
          { who: 'juliette', expr: 'happy', text: 'Look at you! You got so tall while I was waiting, Leo.' },
          { who: 'leo', expr: 'worried', text: 'I let go of your hand, Juliette. On the stairs. I let go.' },
          { who: 'juliette', expr: 'neutral', text: 'I know. I was there. I saw your face.' },
          { who: 'juliette', expr: 'happy', text: 'You can let go of my hand now, Leo-big-brother.' },
          { act: 'shake' },
          { who: 'elias', expr: 'sad', text: 'She is not asking you to forget, Leo. Only to stop holding on so tight.' },
          { who: 'leo', expr: 'worried', text: 'I don\'t know how to let go.' },
          { who: 'narrator', text: 'The Tower groans. Every frozen gear inside it rattles at once, then falls still again.' }
        ]
      },
      {
        col: 124, id: 'ch5_choice', lines: [
          { who: 'narrator', text: 'Elias\'s clock eye ticks once, very loudly, in the silence. Then the old clockmaker speaks.' },
          { who: 'elias', expr: 'sad', text: 'Everything I stole from the city is still waiting, Leo. Every stopped minute, every frozen hand.' },
          { who: 'gaspard', expr: 'worried', text: 'Master Leo, forgive an old machine. I have stood still for ten years. I would very much like to rest.' },
          { who: 'elias', expr: 'neutral', text: 'Restart the Tower, and Juliette can finally go in peace. I can let go of the wheel. Gaspard can rest.' },
          { who: 'mireille', text: 'And Tomas gets to finish his laugh. He\'ll be furious he lost his place in the joke.' },
          { who: 'elias', expr: 'sad', text: 'Keep the hour frozen, and Juliette stays six years old forever, in a dress she will never grow into.' },
          { who: 'leo', expr: 'worried', text: 'And the city? And you, Dad?' },
          { who: 'elias', expr: 'sad', text: 'The city stays frozen forever. You take my place, Leo: keeper of a silent clock, holding the wheel alone.' },
          { who: 'narrator', text: 'Behind them, the frozen clouds do not move. Leo tightens his fingers around his wrench, and he chooses.' },
          { act: 'choice', options: [ { text: 'Restart the clock', flag: 'restart', end: 'good' }, { text: 'Keep the hour frozen', flag: 'freeze', end: 'bad' } ] }
        ]
      }
    ],
    npcs: {
      '1': {
        who: 'elias',
        lines: [
          { who: 'narrator', text: 'Half of his face is brass now. The left eye is a clock dial, and its hand turns very slowly.' },
          { who: 'elias', expr: 'neutral', text: 'Leo. Come closer, slowly. My left side is brass, and brass hates sudden movements.' },
          { who: 'leo', expr: 'worried', text: 'Dad? What happened to you?' },
          { who: 'elias', expr: 'sad', text: 'The night the Tower stopped, I was only a clockmaker who wanted one more minute. Just one.' },
          { who: 'elias', expr: 'sad', text: 'Juliette slipped into the gear cage. The wheels were turning, and my hands were too slow.' },
          { who: 'elias', expr: 'sad', text: 'So I stopped the hour to buy one minute, only one, to pull her out. That is all I wanted.' },
          { who: 'leo', expr: 'angry', text: 'One minute? And you froze the whole city for ten years?' },
          { who: 'elias', expr: 'neutral', text: 'The minute never ended. I hold the balance wheel so that it cannot.' },
          { who: 'elias', expr: 'neutral', text: 'I became the escapement, Leo: the one piece that keeps time from running away.' },
          { who: 'leo', expr: 'worried', text: 'I was on the stairs. I had her hand, and then I let go. It is my fault.' },
          { who: 'elias', expr: 'sad', text: 'I know, Leo. I have felt that moment in every gear for ten years.' },
          { who: 'elias', expr: 'happy', text: 'You held on longer than anyone could have. I forgive you. Now try to forgive yourself.' },
          { act: 'flag', value: 'met_elias' }
        ],
        again: [
          { who: 'elias', expr: 'neutral', text: 'The balance wheel is heavy, but you are not alone.' },
          { who: 'elias', expr: 'happy', text: 'Still here, Leo. Clockmakers are patient, and so am I.' },
          { who: 'narrator', text: 'Elias turns his good eye back to the wheel, which has not moved in ten years.' }
        ]
      }
    }
  });
})();
