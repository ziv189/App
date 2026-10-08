/* The Frozen Hour — ending texts (narrator). Classic script: exposes window.ENDINGS. */
(function () {
  'use strict';

  window.ENDINGS = {
    good: {
      title: 'Time Resumes',
      subtitle: 'Ending 1 of 2 · the true ending',
      theme: 'clockface',
      music: 'ending_good',
      lines: [
        { who: 'narrator', text: 'At the summit of the Saint-Aube Tower, the gears turn again for the first time in ten years.' },
        { who: 'narrator', text: 'The Great Clock strikes 23:48, and the minute is over at last. Vermeil wakes in a sigh of rain.' },
        { who: 'pivert', expr: 'happy', text: '...a loaf, my little one? Oh, listen to me, what a scatterbrain! Ten years to finish one sentence.' },
        { who: 'hugo', expr: 'angry', text: 'Ten years of silence, and it strikes late. Typical of this old heap of scrap.' },
        { who: 'bastien', expr: 'happy', text: 'The 23:48 train is at the platform! On time, procedure fully respected. I am very proud of it.' },
        { who: 'narrator', text: 'Tomas bursts out laughing and finally bites into his bread roll.' },
        { who: 'tomas', expr: 'happy', text: 'Again!' },
        { who: 'mireille', expr: 'sad', text: 'I\'m not crying, all right. It\'s the rain. Just the rain.' },
        { who: 'narrator', text: 'Gaspard bows his head to Leo, and his blue glass eye stops blinking. He is free.' },
        { who: 'gaspard', expr: 'sad', text: 'Your father would be proud.' },
        { who: 'elias', expr: 'happy', text: 'The balance wheel lets go of me at last, Leo. My heart beats at its own pace now, not counting seconds.' },
        { who: 'juliette', expr: 'happy', text: 'Thank you, Leo-Grand. You can let go of me now.' },
        { who: 'narrator', text: 'She fades into the light, like the last tick of a clock.' },
        { who: 'narrator', text: 'Leo keeps his father\'s watch. It ticks normally now, unhurried, like any watch in the world.' },
        { who: 'narrator', text: 'Time moves on and never runs backward. Letting go may be the truest form of love.' },
        { who: 'narrator', text: 'FIN' }
      ],
      credits: 'The Frozen Hour, written and drawn for the channel; thanks for playing.'
    },

    bad: {
      title: 'The Eternal Hour',
      subtitle: 'Ending 2 of 2 · the frozen ending',
      theme: 'clockface',
      music: 'ending_bad',
      lines: [
        { who: 'narrator', text: 'Leo lays his hand on the lever, hesitates, then closes his fingers. He chooses to keep the hour.' },
        { who: 'narrator', text: 'The Tower\'s hands stop at 23:47. They will never move again.' },
        { who: 'juliette', expr: 'happy', text: 'I\'ll never grow up, Leo-Grand. But I won\'t fall again, I promise.' },
        { who: 'narrator', text: 'She smiles, safe and sound. She will never grow older, never fade, never grow up.' },
        { who: 'elias', expr: 'neutral', text: 'I am no longer a prisoner of this balance wheel, Leo. At last, I can sleep.' },
        { who: 'narrator', text: 'Elias closes his eyes. Gently, Leo takes the balance wheel into his own hands. He becomes the new Keeper.' },
        { who: 'narrator', text: 'In the frozen city, Mrs. Pivert will never finish her sentence. She keeps starting it again.' },
        { who: 'narrator', text: 'Tomas is still laughing, the bread roll halfway to his mouth.' },
        { who: 'tomas', expr: 'happy', text: 'Big brother!' },
        { who: 'narrator', text: 'Mireille climbs to the summit and looks at Leo for a long time, without a word.' },
        { who: 'mireille', expr: 'sad', text: 'I\'ll never forgive you, you hear me? But I\'ll come back every single day.' },
        { who: 'narrator', text: 'Gaspard, the last to fall silent, rests his brass hand on Leo\'s shoulder.' },
        { who: 'gaspard', expr: 'sad', text: 'I will keep the hour for both of us, Monsieur Leo.' },
        { who: 'narrator', text: 'Leo will never sleep again. He watches over this minute that never ends.' },
        { who: 'narrator', text: 'FIN' },
        { who: 'narrator', text: 'Somewhere, a little girl is still laughing.' }
      ],
      credits: 'The Frozen Hour, written and drawn for the channel; thanks for playing.'
    }
  };
})();
