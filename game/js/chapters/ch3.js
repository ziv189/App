/* Chapter III: The Foundries. Contract: game/DESIGN.md, section 8. */
(function () {
  const W = 150;
  const fit = (rows) => rows.map((r) => { if (r.length > W) throw new Error('row too long: ' + r.length); return r + '.'.repeat(W - r.length); });
  CHAPTERS.register({
    id: 'ch3', title: 'The Foundries', kicker: 'Chapter III · The foundry floor', theme: 'foundry', music: 'ch3', next: 'ch4',
    map: fit([
      '......................................................................................................................................................',
      '......................................................................................................................................................',
      '......................................................................................................................................................',
      '...........................................................................o..........................................................................',
      '..........................................................................===.........................................................................',
      '......................................................................................................................................................',
      '.......................................................................o.....................s...............s........................................',
      '......................................................................===.....................=====..s................................................',
      '.........................................................................................s.......s.......s............................................',
      '...................................s.....o.o...............................o..........................................................................',
      '........................s...............=====.............................===...........=====.......=====.............................................',
      '.........................................................................................#########....................................................',
      '...........s......................o.o.o................................o.................#########...............o.o..................................',
      '.................................======...............................===...........====.#########..............=====.................................',
      '.................##..o...................................................................#########....................................................',
      '...S....o...##...##....f....^.C.........h.....r................r.............^...........#########..C.................h.....r......^.....f......o.X...',
      '#################################################...o...1.....########################################################################################',
      '######################################################################################################################################################',
    ]),
    scenes: [
      { id: 'ch3_arrival', col: 1, lines: [
        { who: 'narrator', text: 'The Foundries. The furnaces have not gone out in ten years, and their heat still rolls over the iron floor.' },
        { who: 'narrator', text: 'Sparks hang in mid-air like embers caught in amber. Steam rises from the vents and freezes above the catwalks.' },
        { who: 'leo', expr: 'worried', text: 'Great. Ten years, and nobody thought to turn off a furnace. Even the fire is on pause.' },
        { who: 'leo', text: 'Keep moving. Don\'t look at the sparks. They look like they\'re waiting for you to blink.' },
      ] },
      { id: 'ch3_pendulum', col: 84, lines: [
        { who: 'narrator', text: 'A soft click, like a clasp giving way. Leo\'s father\'s watch warms in his palm, and the air turns thick and slow.' },
        { who: 'leo', expr: 'surprised', text: 'Dad\'s watch... it\'s doing something. Either the world is slowing down, or I\'m speeding up.' },
        { act: 'unlock', value: 'pendule' },
        { act: 'sfx', value: 'pendule' },
        { who: 'narrator', text: 'Six hourglasses hover over the gap, paper wings frozen mid-beat, sand pouring in slow spirals.' },
        { who: 'leo', expr: 'worried', text: 'Right. Running through those is a bad idea. I\'d end up as a pile of hot sand.' },
        { who: 'narrator', text: 'Hold C or L to use the Pendulum and slow time around you.' },
        { who: 'narrator', text: 'The Pendulum bar, top-left, empties while you hold C or L, then slowly refills when you let go. Spend it wisely.' },
      ] },
      { id: 'ch3_end', col: 140, lines: [
        { who: 'narrator', text: 'At the far end of the foundry, an iron lift waits in its cage. Its cable hums, and the sound climbs into the dark.' },
        { who: 'narrator', text: 'Through the grate, the Saint-Aube Tower rises above the rooftops, its great hands still pointing at 23:47.' },
        { who: 'leo', text: 'One minute. That\'s all Dad wanted, and the whole city paid for it. Why does it still feel like my fault?' },
        { who: 'leo', expr: 'worried', text: 'Hold on, Juliette. This time I\'m not letting go.' },
        { act: 'flag', value: 'ch3_end' },
      ] },
    ],
    npcs: {
      '1': { who: 'gaspard', lines: [
        { who: 'narrator', text: 'Down in the boiler pit, the automaton sleeps upright. A glass eye flickers blue, then holds steady.' },
        { who: 'gaspard', expr: 'neutral', text: 'Forgive me. I seem to have dozed off at my post. Ten years is a long nap, even for a machine of my dignity.' },
        { who: 'leo', expr: 'surprised', text: 'You talk. And you\'re standing up. I thought you were a very tall coat rack.' },
        { who: 'gaspard', expr: 'neutral', text: 'A common mistake. I am Gaspard. Mr. Elias Varin built me to look after his household, and the post is still mine.' },
        { who: 'gaspard', expr: 'surprised', text: 'And that watch in your hand. You hold Mr. Varin\'s watch?' },
        { who: 'leo', expr: 'worried', text: 'It\'s my dad\'s watch. Do you know where he is?' },
        { who: 'gaspard', expr: 'neutral', text: 'I know where he went. He climbed the Tower the night the clocks stopped, with that watch and a plan.' },
        { who: 'gaspard', expr: 'sad', text: 'He stopped the Tower to win one minute, young man. One minute, to save your sister.' },
        { who: 'leo', expr: 'sad', text: 'Juliette...' },
        { who: 'gaspard', expr: 'sad', text: 'The minute never ended. The trains, the ovens and the lamps stopped with it, and the city never moved on.' },
        { who: 'gaspard', expr: 'sad', text: 'I kept the fires burning for ten years, waiting for him to come back down the stairs.' },
        { who: 'gaspard', expr: 'sad', text: 'Pardon my creaking. My voice is as stiff as my knees. You are the first visitor in ten years, and I am deeply moved.' },
        { act: 'flag', value: 'gaspard_awake' },
        { act: 'sfx', value: 'unlock' },
      ], again: [
        { who: 'gaspard', expr: 'neutral', text: 'Back again, young man. My joints have not improved, though they creak with great dignity.' },
        { who: 'gaspard', expr: 'neutral', text: 'The hourglasses above the gap do not respect bravery. Hold C or L for the Pendulum, and wait for your moment.' },
        { who: 'gaspard', expr: 'neutral', text: 'Go on, then. I shall remain here, upright and patient, until you return.' },
      ] },
    },
  });
})();
