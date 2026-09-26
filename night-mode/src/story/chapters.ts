import { Vector3 } from 'three';
import type { AudioEngine } from '../audio/AudioEngine';
import type { Voice } from '../audio/Voice';
import type { Fx } from '../fx/Fx';
import type { Action } from '../input/bindings';
import type { PlayerController } from '../player/PlayerController';
import type { Ui } from '../ui/Ui';
import type { CellId } from '../world/Cell';
import type { World } from '../world/World';
import {
  ARRIVAL_MESSAGES,
  BOOKING_HTML_REVEALED,
  DANA_LIST_HTML,
  REALTOR_HTML,
  RULES_HTML,
  ivyDrawingSvg,
  type EndingId,
} from './content';
import type { PhoneSystem } from './Phone';
import type { Story } from './Story';

export type ChapterId = 'prologue' | 'ch1' | 'ch2' | 'ch3' | 'ch4' | 'ch5';

/** Everything a chapter script can use. */
export interface Ctx {
  s: Story;
  phone: PhoneSystem;
  ui: Ui;
  audio: AudioEngine;
  voice: Voice;
  world: World;
  player: PlayerController;
  fx: Fx;
  openPhone(owner?: 'alex' | 'jordan', app?: string): Promise<void>;
  read(html: string, style?: 'serif' | 'hand' | 'typed' | 'drawing'): Promise<void>;
  keypad(length: number, check: (code: string) => boolean): Promise<string | null>;
  goTo(cell: CellId, marker: string, opts?: { fade?: number }): Promise<void>;
  ending(id: EndingId): Promise<void>;
  save(chapter: ChapterId): void;
  /** Makes the player stand at a marker (no fade) - used by chapter setups. */
  place(cell: CellId, marker: string): Promise<void>;
  /** The key(s) bound to an action, for hints: as <kbd> HTML, or as plain text ("Tab or P"). */
  keyHtml(action: Action): string;
  keyText(action: Action): string;
}

export interface Chapter {
  id: ChapterId;
  kicker: string;
  title: string;
  time: string;
  /** Puts the world in this chapter's starting state (also used by Continue / chapter select). */
  setup(c: Ctx): Promise<void>;
  run(c: Ctx): Promise<ChapterId | 'end'>;
}

const CHORE_TEXT = (c: Ctx) => {
  const s = c.s;
  const plants = Number(s.flags.plants ?? 0);
  const tick = (done: boolean) => (done ? '✓' : '•');
  return (
    `${tick(plants >= 3)} Water the plants (${plants}/3)\n` +
    `${tick(s.is('clockWound'))} Wind the grandfather clock\n` +
    `${tick(s.is('backdoorChecked'))} Check the back door is locked\n` +
    `${tick(false)} Say goodnight to Wren`
  );
};

function choresDone(c: Ctx): boolean {
  return Number(c.s.flags.plants ?? 0) >= 3 && c.s.is('clockWound') && c.s.is('backdoorChecked');
}

/** Locks that hold through the night (from 10 PM). */
function nightLocks(c: Ctx): void {
  c.s.lockDoor('hall', 'front', 'night');
  c.s.lockDoor('kitchen', 'back', 'night');
  c.s.lockDoor('kitchen', 'basement', 'cellar');
}

/** Handlers that exist in every chapter (props you can look at). */
function commonHandlers(c: Ctx): void {
  const s = c.s;
  s.on('photos', {
    prompt: 'Look at the photos',
    action: async () => {
      await c.read(
        `<h3>Family photos</h3><p>Dana, Mark and a girl of about nine on the dock in summer. The same girl on the stairs with a red mitten on each hand. The same girl, laughing, on the frozen lake.</p><p class="small">The newest photo is dated last January.</p>`,
      );
      if (!s.is('photosSeen') && s.flags.chapter === 'ch1') {
        s.set('photosSeen');
        await s.say('w_photos_a');
        await s.wait(1.4);
        await s.say('w_photos_b');
      }
    },
  });
  s.on('fridge', {
    prompt: "Look at the fridge",
    action: async () => {
      await c.read(`<img alt="" style="width:100%" src="data:image/svg+xml;utf8,${encodeURIComponent(ivyDrawingSvg('family'))}">`, 'drawing');
      await c.read(RULES_HTML, 'typed');
      if (!s.is('fridgeSeen') && s.flags.chapter === 'ch1') {
        s.set('fridgeSeen');
        await s.say('w_fridge');
      }
    },
  });
  s.on('tv', {
    prompt: () => (c.fx.screen('tv') === 'off' ? 'Turn on the TV' : 'Turn off the TV'),
    action: async () => {
      const on = c.fx.screen('tv') === 'off';
      c.fx.setScreen('tv', on ? 'lake' : 'off');
      void s.sfx('switch', { at: c.fx.anchor('living', 'tv'), volume: 0.6 });
      if (on && !s.is('tvSeen') && s.flags.chapter === 'ch1') {
        s.set('tvSeen');
        await s.say('w_tv');
        // For one second, a small figure stands on the ice. Most players won't catch it.
        await s.wait(4);
        c.fx.lakeFigure(true);
        await s.wait(1.1);
        c.fx.lakeFigure(false);
      }
    },
  });
  s.on('answering', {
    prompt: () => (s.is('voicemailPlayed') ? 'Play the message again' : 'Play the message'),
    action: async () => {
      if (!s.is('voicemailUnlocked')) {
        await s.say('w_answering');
        return;
      }
      void s.sfx('switch', { at: c.fx.anchor('kitchen', 'answering'), volume: 0.7, rate: 0.8 });
      void s.sfx('answer_beep', { at: c.fx.anchor('kitchen', 'answering'), volume: 0.6 });
      await s.wait(0.9);
      await s.sayAt('d_voicemail', c.fx.anchor('kitchen', 'answering'), { lowpass: 3400 });
      if (!s.is('voicemailPlayed')) {
        s.set('voicemailPlayed');
        await s.wait(1.2);
        await s.say('i_voicemail');
      }
    },
  });
}

// =============================================================================================
// PROLOGUE: check-in (8:02 PM), outside
// =============================================================================================
const prologue: Chapter = {
  id: 'prologue',
  kicker: 'Lake Ellery, Minnesota',
  title: 'January 14',
  time: '8:02 PM',
  async setup(c) {
    c.s.set('chapter', 'prologue');
    c.s.lights({ night: 0, brightness: 1, nightMode: false, flicker: 0 });
    c.phone.time = '8:02';
    await c.place('exterior', 'spawn');
  },
  async run(c) {
    const s = c.s;
    c.ui.setBlack(true);
    await s.card('Lake Ellery, Minnesota', 'January 14', '', 3.2);
    await s.fadeIn(2.5);
    await s.wait(2);
    void s.sfx('vibrate', { volume: 0.9 });
    c.phone.receive('host', ARRIVAL_MESSAGES);
    s.toast('SitterSafe · 5 new messages from Dana H.', 5);
    c.ui.setKeyHint(`Press ${c.keyHtml('phone')} to check your phone`);
    let wrong = 0;
    // the keypad works from the start: reading Dana's messages gives the code, but nothing waits for it
    s.on('keypad', {
      prompt: 'Enter the door code',
      action: async () => {
        const code = await c.keypad(4, (v) => v === '0114');
        if (code) {
          s.off('keypad');
          s.set('codeEntered');
        } else if (++wrong >= 1) {
          s.toast(`The code is in Dana's messages (${c.keyText('phone')}).`, 4);
        }
      },
    });
    s.lockDoor('exterior', 'front', 'keypad');
    s.lockDoor('exterior', 'back', 'back');
    s.lockDoor('exterior', 'coal', 'stuck');
    s.objective("Read Dana's messages");
    void (async () => {
      await s.until(() => s.is('readArrival') || s.is('codeEntered'));
      c.ui.setKeyHint(null);
      if (!s.is('codeEntered')) s.objective('Go to the front door');
    })().catch(s.report.bind(s));
    await s.until(() => s.is('codeEntered'));
    void s.sfx('lock_motor', { at: c.fx.anchor('exterior', 'keypad'), volume: 0.8 });
    s.unlockDoor('exterior', 'front');
    await s.wait(0.6);
    await s.sayAt('w_welcome', c.fx.anchor('exterior', 'keypad'));
    s.objective('Go inside');
    await s.enter('hall');
    return 'ch1';
  },
};

// =============================================================================================
// CHAPTER 1: welcome home (8:05 PM)
// =============================================================================================
const ch1: Chapter = {
  id: 'ch1',
  kicker: 'Chapter 1',
  title: 'Welcome Home',
  time: '8:05 PM',
  async setup(c) {
    const s = c.s;
    s.set('chapter', 'ch1');
    s.lights({ night: 0, brightness: 1, nightMode: false, flicker: 0 });
    c.phone.time = '8:05';
    s.set('readArrival');
    await c.place('hall', 'door_front');
  },
  async run(c) {
    const s = c.s;
    s.set('chapter', 'ch1');
    c.save('ch1');
    commonHandlers(c);
    s.show('hall', 'jordan_phone', false); // it turns up in chapter 2
    s.lockDoor('hall', 'front', 'stay');
    s.lockDoor('hall', 'ivy', 'ivy');
    s.lockDoor('kitchen', 'basement', 'cellar');
    s.lockDoor('kitchen', 'back', 'back');
    await s.wait(1.2);
    await s.say('w_lights');
    s.objective("Find Dana's list in the kitchen");

    // Wren small talk, once each, when the player first goes somewhere.
    void (async () => {
      await s.enter('living');
      await s.wait(2);
      if (!s.is('games')) {
        s.set('games');
        await s.say('w_games');
      }
    })().catch(s.report.bind(s));
    void (async () => {
      await s.near('hall', 'landing', 2.2);
      await s.say('w_upstairs');
    })().catch(s.report.bind(s));
    s.on('tablet', {
      prompt: () => (choresDone(c) ? 'Say goodnight to Wren' : 'Talk to Wren'),
      action: async () => {
        if (choresDone(c)) {
          s.set('goodnight');
          return;
        }
        if (!s.is('legal')) {
          s.set('legal');
          await s.say('w_legal');
        } else {
          await s.say('w_games');
        }
      },
    });

    await s.interact('list', "Read Dana's list");
    await c.read(DANA_LIST_HTML, 'hand');
    s.set('listRead');
    s.flags.plants = 0;
    const refresh = () => s.objective(`Dana's list:\n${CHORE_TEXT(c)}`, false);
    s.objective(`Dana's list:\n${CHORE_TEXT(c)}`);

    s.on('watering_can', {
      prompt: 'Take the watering can',
      action: () => {
        s.off('watering_can');
        s.show('kitchen', 'watering_can', false);
        s.set('hasCan');
        void s.sfx('pickup', { volume: 0.7 });
        s.toast('Watering can', 2);
      },
    });
    for (const [id, cell] of [
      ['plant_kitchen', 'kitchen'],
      ['plant_living', 'living'],
      ['plant_landing', 'hall'],
    ] as const) {
      s.on(id, {
        prompt: () => (s.is(`watered_${id}`) ? null : s.is('hasCan') ? 'Water the plant' : 'A thirsty plant'),
        locked: () => !s.is('hasCan'),
        action: async () => {
          if (!s.is('hasCan')) {
            s.toast('The watering can is on the kitchen counter, by the window.', 3);
            return;
          }
          s.set(`watered_${id}`);
          s.flags.plants = Number(s.flags.plants ?? 0) + 1;
          void s.sfx('pour', { at: c.fx.anchor(cell, id), volume: 0.8 });
          refresh();
          if (s.flags.plants === 1) await s.say('w_plants');
          else if (s.flags.plants === 3) await s.say('w_plants_done');
          if (choresDone(c)) await goodnightPrompt();
        },
      });
    }
    s.on('clock', {
      prompt: () => (s.is('clockWound') ? null : 'Wind the clock'),
      action: async () => {
        if (!s.is('clockExplained')) {
          s.set('clockExplained');
          await s.say('w_clock');
        }
        void s.sfx('clock_wind', { at: c.fx.anchor('living', 'clock'), volume: 0.9 });
        await s.wait(2.6);
        s.set('clockWound');
        c.fx.clockRunning(true);
        refresh();
        await s.say('w_clock_done');
        if (choresDone(c)) await goodnightPrompt();
      },
    });
    s.on('door_back', {
      prompt: () => (s.is('backdoorChecked') ? 'Back door (locked)' : 'Check the back door'),
      action: async () => {
        void s.sfx('door_locked', { at: c.fx.anchor('kitchen', 'door_back'), volume: 0.9 });
        if (!s.is('backdoorChecked')) {
          s.set('backdoorChecked');
          refresh();
          await s.say('w_backdoor');
          if (choresDone(c)) await goodnightPrompt();
        }
      },
    });

    async function goodnightPrompt() {
      if (s.is('goodnightAsked')) return;
      s.set('goodnightAsked');
      await s.wait(0.8);
      await s.say('w_goodnight_ready');
      s.objective("Dana's list:\n✓ Water the plants (3/3)\n✓ Wind the grandfather clock\n✓ Check the back door is locked\n• Say goodnight to Wren (kitchen panel)");
    }

    await s.until(() => s.is('goodnight'));
    s.off('tablet', 'watering_can', 'plant_kitchen', 'plant_living', 'plant_landing', 'clock', 'door_back');
    s.objective(null);

    // ---- NIGHT MODE
    c.player.moveLocked = true;
    await s.say('w_nightmode');
    c.phone.time = '10:00';
    s.clock = '10:00 PM';
    // every lock in the house, one after another
    const locks: [string, number][] = [
      ['lock_motor', 0], ['deadbolt', 0.35], ['deadbolt', 0.9], ['lock_motor', 1.3], ['deadbolt', 1.7], ['deadbolt', 2.2], ['deadbolt', 2.5],
    ];
    const here = c.player.position.clone();
    for (const [name, t] of locks) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 3 + Math.random() * 7;
      const at = new Vector3(here.x + Math.cos(angle) * dist, here.y + 1.2, here.z + Math.sin(angle) * dist);
      window.setTimeout(() => void c.audio.play(name, { at, volume: 0.9, lowpass: dist > 6 ? 1800 : undefined }), t * 1000);
    }
    await s.wait(1.0);
    s.lights({ night: 1 });
    void s.sfx('led_off', { volume: 0.6, bus: 'ui' });
    c.audio.ambience(c.world.current?.def.ambience.filter((a) => a.sound !== 'fridge_hum') ?? []);
    await s.wait(2.6);
    s.lights({ nightMode: true });
    nightLocks(c);
    await s.say('w_goodnight');
    await s.wait(0.4);
    c.ui.glitch(0.5);
    void s.sfx('glitch', { volume: 0.8 });
    await s.wait(1.4);
    await s.say('i_hi');
    c.player.moveLocked = false;
    return 'ch2';
  },
};

// =============================================================================================
// CHAPTER 2: Night Mode, hide and seek (10:00 PM)
// =============================================================================================
const ch2: Chapter = {
  id: 'ch2',
  kicker: 'Chapter 2',
  title: 'Night Mode',
  time: '10:00 PM',
  async setup(c) {
    const s = c.s;
    s.set('chapter', 'ch2');
    s.lights({ night: 1, brightness: 1, nightMode: true, flicker: 0 });
    c.phone.time = '10:00';
    for (const f of ['readArrival', 'listRead', 'clockWound', 'backdoorChecked', 'goodnight']) s.set(f);
    c.fx.clockRunning(true);
    s.show('kitchen', 'watering_can', false);
    await c.place('kitchen', 'tablet_front');
  },
  async run(c) {
    const s = c.s;
    s.set('chapter', 'ch2');
    c.save('ch2');
    commonHandlers(c);
    nightLocks(c);
    s.lockDoor('hall', 'ivy', 'ivy');
    s.lockDoor('hall', 'bathroom', 'private');
    await s.wait(1.5);
    await s.say('i_momsaid');
    await s.wait(0.6);
    await s.say('i_play');
    await s.say('w_sys_cameras');
    c.fx.cameras(true);

    let round = 0;
    for (;;) {
      round++;
      s.objective("Hide where the cameras can't see you");
      c.fx.cameraSweep(false);
      s.music('tension', { volume: 0.7, fade: 1 });
      await s.say('i_count');
      await s.say('i_ready');
      c.fx.cameraSweep(true);
      s.objective('Stay hidden');
      const caught = await c.fx.seek(40, async (k) => {
        const lines = ['i_seek1', 'i_seek2', 'i_seek3', 'i_seek6'];
        await s.say(lines[k % lines.length]!);
        if (k % 2 === 1) void s.sfx('giggle', { volume: 0.5, rate: 1.1 });
      });
      c.fx.cameraSweep(false);
      if (!caught) break;
      await c.fx.jumpScare('found');
      if (round >= 2) s.toast(`The cameras have blind spots. Try the nook under the stairs, and crouch (${c.keyText('crouch')}).`, 7);
      await s.say('i_again');
    }
    s.music('', { fade: 3 });
    s.objective(null);
    await s.say('i_won');
    await s.wait(0.5);
    await s.say('i_jordan');
    c.fx.cameras(false);
    s.unlockDoor('hall', 'bathroom');
    s.objective('Who is Jordan?');
    s.show('hall', 'jordan_phone', true);
    await s.interact('jordan_phone', 'Pick up the phone');
    s.show('hall', 'jordan_phone', false);
    void s.sfx('pickup', { volume: 0.7 });
    await c.read(`<h3>A phone</h3><p>Cracked screen. The case has a sticker: <b>JORDAN P.</b></p><p>The battery is dead.</p>`);
    s.set('hasJordanPhone');
    s.objective('Charge the phone (kitchen counter)');
    await s.interact('charger', 'Put the phone on the charger');
    s.show('kitchen', 'jordan_phone_charging', true);
    void s.sfx('switch', { at: c.fx.anchor('kitchen', 'charger'), volume: 0.5 });
    s.toast('It will take a few minutes to turn on.', 4);
    s.objective(null);
    await s.wait(2);
    await s.say('i_things');
    return 'ch3';
  },
};

// =============================================================================================
// CHAPTER 3: her things (11:30 PM)
// =============================================================================================
const ch3: Chapter = {
  id: 'ch3',
  kicker: 'Chapter 3',
  title: 'Her Things',
  time: '11:30 PM',
  async setup(c) {
    const s = c.s;
    s.set('chapter', 'ch3');
    s.lights({ night: 1, brightness: 1, nightMode: true, flicker: 0 });
    c.phone.time = '11:30';
    for (const f of ['readArrival', 'listRead', 'clockWound', 'backdoorChecked', 'goodnight', 'hasJordanPhone']) s.set(f);
    c.fx.clockRunning(true);
    s.show('kitchen', 'watering_can', false);
    s.show('hall', 'jordan_phone', false);
    s.show('kitchen', 'jordan_phone_charging', true);
    await c.place('kitchen', 'tablet_front');
  },
  async run(c) {
    const s = c.s;
    s.set('chapter', 'ch3');
    c.save('ch3');
    commonHandlers(c);
    nightLocks(c);
    s.unlockDoor('hall', 'ivy');
    c.fx.footprints(true);
    const found = () => ['musicbox', 'ivy_tablet', 'mitten'].filter((f) => s.is(`found_${f}`)).length;
    const obj = () => s.objective(`Find Ivy's things (${found()}/3)`);
    obj();
    s.on('charger', { prompt: "Jordan's phone (charging)", locked: true, action: () => s.toast('Still charging.', 2) });

    s.on('musicbox', {
      prompt: 'Open the music box',
      action: async () => {
        s.off('musicbox');
        s.set('found_musicbox');
        obj();
        c.fx.musicBoxOpen(true);
        void s.sfx('musicbox_wind', { at: c.fx.anchor('bedroom', 'musicbox'), volume: 0.8 });
        await s.loop('musicbox', 'music/lullaby_box', { at: c.fx.anchor('bedroom', 'musicbox'), volume: 0.85, refDistance: 1.5 });
        await s.say('i_musicbox');
        await s.wait(1.5);
        await s.say('r_forever', { lowpass: 5000 });
        await s.say('d_forever', { lowpass: 5000 });
        await s.wait(2);
        // the laptop wakes up on its own: her face, smiling a second too long
        c.fx.setScreen('laptop', 'ivy');
        void s.sfx('glitch', { at: c.fx.anchor('bedroom', 'laptop'), volume: 0.7 });
        await s.wait(3.5);
        c.fx.setScreen('laptop', 'off');
        await s.wait(6);
        s.stopLoop('musicbox', 3);
        c.fx.musicBoxOpen(false);
      },
    });
    s.on('ivy_tablet', {
      prompt: 'Pick up the tablet',
      action: async () => {
        s.off('ivy_tablet');
        s.set('found_ivy_tablet');
        obj();
        s.show('bathroom', 'ivy_tablet', false);
        await s.say('i_tablet');
        void s.loop('ice', 'ice_sing', { volume: 0.55, lowpass: 5500 });
        await s.wait(2);
        await s.say('r_ice');
        await s.wait(2.5);
        s.stopLoop('ice', 2);
        s.set('mirrorArmed');
      },
    });
    s.on('mitten', {
      prompt: 'Pick up the mitten',
      action: async () => {
        s.off('mitten');
        s.set('found_mitten');
        obj();
        s.show('ivy', 'mitten', false);
        void s.sfx('pickup', { volume: 0.7 });
        await c.read(`<h3>A red mitten</h3><p>A child's mitten, hand-knitted. It's soaking wet, and ice cold, as if it just came out of the lake.</p>`);
        await s.say('i_mitten');
      },
    });
    s.on('ivy_drawing', {
      prompt: 'Look at the drawing',
      action: () => c.read(`<img alt="" style="width:100%" src="data:image/svg+xml;utf8,${encodeURIComponent(ivyDrawingSvg('ice'))}">`, 'drawing'),
    });

    // the mirror, once the tablet has been found and the player looks into it
    void (async () => {
      await s.until(() => s.is('mirrorArmed') && s.cellId === 'bathroom' && c.fx.lookingAtMirror());
      await s.wait(0.7);
      s.lights({ flicker: 0.8 });
      c.fx.mirrorIvy(true);
      void s.sfx('breath', { volume: 0.4 });
      await s.say('i_behind');
      await s.until(() => !c.fx.lookingAtMirror() || s.cellId !== 'bathroom');
      c.fx.mirrorIvy(false);
      s.lights({ flicker: 0 });
      void s.sfx('stinger', { volume: 0.9 });
      c.player.shake(0.02, 0.6);
      void s.loop('tap', 'tap_water', { at: c.fx.anchor('bathroom', 'tap'), volume: 0.6 });
      s.on('tap', {
        prompt: 'Turn off the tap',
        action: () => {
          s.off('tap');
          s.stopLoop('tap', 0.3);
        },
      });
    })().catch(s.report.bind(s));

    // the clock strikes thirteen after the second find
    void (async () => {
      await s.until(() => found() >= 2);
      await s.wait(4);
      const clock = c.fx.anchor('living', 'clock');
      const far = s.cellId !== 'living';
      for (let i = 0; i < 13; i++) {
        void c.audio.playVariant('clock_chime', 2, { at: clock, volume: 1, lowpass: far ? 1400 : undefined, refDistance: far ? 8 : 2 });
        await s.wait(1.45);
      }
      await s.say('i_thirteen');
    })().catch(s.report.bind(s));

    // the rocking chair rocks by itself while the player is in the living room
    void (async () => {
      await s.until(() => found() >= 1 && s.cellId === 'living');
      c.fx.rockingChair(true);
      await s.until(() => s.cellId !== 'living');
      c.fx.rockingChair(false);
    })().catch(s.report.bind(s));

    await s.until(() => found() >= 3);
    await s.wait(1);
    await s.say('i_allthings');
    await s.wait(2);
    void s.sfx('vibrate', { volume: 0.8 });
    s.toast("Jordan's phone turned on (kitchen).", 5);
    s.objective("Check Jordan's phone (kitchen)");
    s.on('charger', {
      prompt: "Read Jordan's phone",
      action: async () => {
        await c.openPhone('jordan', 'sam');
        s.set('jordanRead');
      },
    });
    await s.until(() => s.is('jordanRead'));
    s.objective(null);
    c.fx.footprints(false);
    await s.wait(1);
    await s.say('i_phone');
    await s.wait(0.5);
    await s.say('i_jordan_left');
    return 'ch4';
  },
};

// =============================================================================================
// CHAPTER 4: the listing (1:30 AM)
// =============================================================================================
const ch4: Chapter = {
  id: 'ch4',
  kicker: 'Chapter 4',
  title: 'The Listing',
  time: '1:30 AM',
  async setup(c) {
    const s = c.s;
    s.set('chapter', 'ch4');
    s.lights({ night: 1, brightness: 1, nightMode: true, flicker: 0 });
    c.phone.time = '1:30';
    for (const f of ['readArrival', 'listRead', 'clockWound', 'backdoorChecked', 'goodnight', 'hasJordanPhone', 'jordanRead']) s.set(f);
    c.fx.clockRunning(true);
    s.show('kitchen', 'watering_can', false);
    s.show('hall', 'jordan_phone', false);
    s.show('kitchen', 'jordan_phone_charging', true);
    s.show('bathroom', 'ivy_tablet', false);
    s.show('ivy', 'mitten', false);
    await c.place('kitchen', 'tablet_front');
  },
  async run(c) {
    const s = c.s;
    s.set('chapter', 'ch4');
    c.save('ch4');
    commonHandlers(c);
    nightLocks(c);
    s.unlockDoor('hall', 'ivy');
    s.set('voicemailUnlocked');
    await s.wait(1.5);
    await s.say('w_sys_heat');
    c.fx.cold(true);
    await s.wait(3);
    await s.say('i_cold');
    s.objective('Find out what happened to the Hales');
    void (async () => {
      await s.wait(40);
      await s.say('i_everybody');
    })().catch(s.report.bind(s));

    s.on('folder', {
      prompt: 'Read the folder',
      action: async () => {
        await c.read(REALTOR_HTML, 'typed');
        s.set('folderRead');
      },
    });
    s.on('laptop', {
      prompt: () => (s.is('logsSeen') ? 'Watch the logs again' : "Open Dana's laptop"),
      action: async () => {
        await c.fx.videoLogs();
        if (!s.is('logsSeen')) {
          s.set('logsSeen');
          await c.read(
            `<p><b>Sticky note on the laptop, in Dana's writing:</b></p><p>If Wren ever has to be switched off: the main breaker in the basement.<br>Cellar key is inside the grandfather clock, behind the pendulum. (Ivy could never reach it.)</p>`,
            'hand',
          );
        }
      },
    });
    await s.until(() => s.is('folderRead') && s.is('logsSeen'));
    await s.wait(1);
    c.phone.bookingHtml = BOOKING_HTML_REVEALED;
    void s.sfx('vibrate', { volume: 0.8 });
    s.toast('SitterSafe · Your booking was updated', 5);
    s.objective(`Check your booking (${c.keyText('phone')})`);
    const seen = c.phone.bookingSeen;
    await s.until(() => c.phone.bookingSeen > seen);
    await s.until(() => !c.ui.phoneOpen);
    await s.wait(0.8);
    await s.say('i_booked');
    s.objective('Get the cellar key from the grandfather clock');
    await s.interact('clock', 'Open the clock case');
    c.fx.clockDoor(true);
    void s.sfx('creak_1', { at: c.fx.anchor('living', 'clock'), volume: 0.7 });
    await s.wait(0.8);
    await s.interact('key', 'Take the key');
    s.show('living', 'key', false);
    void s.sfx('pickup', { volume: 0.8 });
    s.set('hasKey');
    // the house goes dark
    await s.wait(0.6);
    void s.sfx('power_down', { volume: 0.9 });
    s.lights({ brightness: 0.12, nightMode: false });
    c.fx.clockRunning(false);
    if (!c.player.moveLocked) c.ui.setKeyHint(c.fx.flashlightOn ? null : `Press ${c.keyHtml('flashlight')} for your phone's flashlight`);
    await s.wait(3);
    c.ui.setKeyHint(null);
    await c.fx.whisperBehind('i_dontgo');
    s.unlockDoor('kitchen', 'basement');
    void c.audio.play('door_open', { at: c.fx.anchor('kitchen', 'door_basement'), volume: 0.9, lowpass: s.cellId === 'kitchen' ? undefined : 1600 });
    s.objective('Go down to the basement (kitchen)');
    await s.enter('basement');
    return 'ch5';
  },
};

// =============================================================================================
// CHAPTER 5: the basement (3:00 AM) and the three endings
// =============================================================================================
const ch5: Chapter = {
  id: 'ch5',
  kicker: 'Chapter 5',
  title: 'The Basement',
  time: '3:00 AM',
  async setup(c) {
    const s = c.s;
    s.set('chapter', 'ch5');
    s.lights({ night: 1, brightness: 0.12, nightMode: false, flicker: 0 });
    c.phone.time = '3:00';
    c.fx.cold(true);
    for (const f of ['readArrival', 'listRead', 'goodnight', 'hasJordanPhone', 'jordanRead', 'folderRead', 'logsSeen', 'hasKey']) s.set(f);
    await c.place('basement', 'door_kitchen');
  },
  async run(c) {
    const s = c.s;
    s.set('chapter', 'ch5');
    c.save('ch5');
    nightLocks(c);
    s.unlockDoor('kitchen', 'basement');
    s.lockDoor('basement', 'kitchen', 'stuck');
    s.lights({ brightness: 1 });
    s.music('basement', { volume: 0.8, fade: 3 });
    c.fx.setScreen('monitor', 'ivy');
    await s.wait(2);
    await s.say('i_basement');
    s.objective('Shut Wren down. Or don\'t.');
    void (async () => {
      await s.near('basement', 'breaker', 2.2);
      await s.say('i_please');
      await s.wait(2);
      await s.say('i_water');
      await s.wait(3);
      await s.say('i_rule');
    })().catch(s.report.bind(s));
    void (async () => {
      await s.near('basement', 'door_coal', 2.5);
      await s.say('i_coal');
    })().catch(s.report.bind(s));

    const choice = await new Promise<EndingId>((resolve) => {
      s.on('breaker', { prompt: 'Pull the main breaker', action: () => resolve('goodnight') });
      s.on('stay', { prompt: 'Sit down. Stay with her.', action: () => resolve('nightmode') });
      s.on('door_coal', { prompt: 'Climb out through the coal door', action: () => resolve('thinice') });
    });
    s.off('breaker', 'stay', 'door_coal');
    s.objective(null);

    if (choice === 'goodnight') {
      c.player.moveLocked = true;
      c.fx.breaker();
      void s.sfx('breaker', { at: c.fx.anchor('basement', 'breaker'), volume: 1 });
      await s.wait(0.4);
      void s.sfx('power_down', { volume: 1 });
      s.lights({ brightness: 0.05 });
      c.audio.ambience([{ sound: 'basement_amb', volume: 0.35 }]);
      await s.say('w_sys_power');
      s.music('lullaby_box_dying', { loop: false, volume: 0.9, fade: 0.5 });
      await s.wait(2.5);
      await s.say('i_sleepy');
      c.ui.setKeyHint(`Press ${c.keyHtml('use')} to stay`);
      const pressed = s.pressed().then(() => true);
      const timeout = s.wait(12).then(() => false);
      for (const p of [pressed, timeout]) p.catch(() => undefined); // the loser may be cancelled later
      const stayed = await Promise.race([pressed, timeout]);
      c.ui.setKeyHint(null);
      if (stayed) await c.fx.sitDown();
      await s.wait(stayed ? 22 : 10);
      c.fx.setScreen('monitor', 'off');
      await s.say('i_nightnight');
      await s.wait(3);
      s.music('', { fade: 2 });
      await s.fadeOut(4);
      await s.wait(2);
      await c.ending('goodnight');
      return 'end';
    }
    if (choice === 'nightmode') {
      c.player.moveLocked = true;
      await c.fx.sitDown();
      await s.say('i_stay');
      s.music('lullaby_box', { volume: 0.6, fade: 2 });
      await s.wait(3);
      for (const t of ['4:00 AM', '5:00 AM', '6:00 AM', '7:00 AM']) {
        await s.fadeOut(1.2);
        await s.card('', t, '', 1.6);
        await s.fadeIn(1.2);
        await s.wait(1.5);
      }
      await s.say('i_morning');
      await s.wait(1);
      void s.sfx('deadbolt', { volume: 1 });
      void s.sfx('lock_motor', { volume: 0.8 });
      await s.say('i_always');
      s.music('lullaby_box_wrong', { loop: false, fade: 0.5 });
      await s.wait(4);
      await s.fadeOut(3);
      await c.ending('nightmode');
      return 'end';
    }
    // thin ice: out through the coal chute into the back garden; the house is dark, then wakes up
    s.music('', { fade: 1 });
    s.lights({ night: 1, brightness: 1, nightMode: false, flicker: 0 });
    s.lockDoor('exterior', 'coal', 'stuck');
    s.lockDoor('exterior', 'back', 'night');
    await c.goTo('exterior', 'door_coal', { fade: 1.2 });
    s.objective('Cross the lake to the road');
    void (async () => {
      await s.wait(1.6);
      c.fx.exteriorNight(true);
      await s.wait(2.4);
      await s.sayAt('i_comeback', c.fx.anchor('exterior', 'house_speaker'), { refDistance: 12 });
    })().catch(s.report.bind(s));
    void s.loop('icesing', 'ice_sing', { volume: 0.2 });
    await reach(c, 'ice_1', 4);
    s.loop('icesing', 'ice_sing', { volume: 0.6 }).catch(s.report.bind(s));
    void s.sfx('ice_crack', { volume: 0.7 });
    await reach(c, 'jordan', 3);
    s.objective(null);
    c.player.moveLocked = true;
    if (!c.fx.flashlightOn) s.host.setFlashlight(true);
    const face = c.fx.revealJordan();
    void s.sfx('stinger', { volume: 1 });
    await c.player.lookAt(face, 0.9);
    c.player.shake(0.03, 0.8);
    await s.wait(2.4);
    void s.sfx('ice_break', { volume: 1 });
    await c.fx.fallThroughIce();
    s.stopLoop('icesing', 0.2);
    await s.wait(1.5);
    await s.say('i_told');
    await s.wait(1.5);
    await c.ending('thinice');
    return 'end';
  },
};

/** Outside: resolves when the player comes near a marker or walks past it (further out onto the lake). */
function reach(c: Ctx, marker: string, radius: number): Promise<void> {
  const m = c.fx.anchor('exterior', marker).getWorldPosition(new Vector3());
  return c.s.until(() => {
    if (c.s.cellId !== 'exterior') return false;
    const p = c.player.position;
    return Math.hypot(p.x - m.x, p.z - m.z) < radius || p.z < m.z;
  });
}

export const CHAPTERS: Chapter[] = [prologue, ch1, ch2, ch3, ch4, ch5];

export function chapter(id: ChapterId): Chapter {
  return CHAPTERS.find((c) => c.id === id)!;
}
