import { MathUtils, PerspectiveCamera, Scene, Timer, Vector3, type WebGLRenderer } from 'three';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { Assets, assetUrl, ProgressTracker } from '../assets/Assets';
import { AudioEngine } from '../audio/AudioEngine';
import { SPEAKERS, Voice } from '../audio/Voice';
import { Fx } from '../fx/Fx';
import { Input, type InputFrame } from '../input/Input';
import { keysHtml, keysText, type Action } from '../input/bindings';
import { verticalFovFromHorizontal16x9 } from '../input/math';
import { Physics } from '../physics/Physics';
import { PlayerController } from '../player/PlayerController';
import { createRenderer } from '../render/createRenderer';
import { installHeightFog } from '../render/HeightFog';
import { NIGHT } from '../render/nightConfig';
import { PostFX } from '../render/PostFX';
import { pixelRatioFor, QUALITY_PRESETS, type QualityLevel } from '../render/quality';
import { CHAPTERS, chapter, type ChapterId, type Ctx } from '../story/chapters';
import { ENDINGS, type EndingId } from '../story/content';
import { CREDITS_HTML } from '../story/credits';
import { PhoneSystem } from '../story/Phone';
import { Cancelled, Story, type StoryHost } from '../story/Story';
import { Ui } from '../ui/Ui';
import type { Cell, CellId } from '../world/Cell';
import { LOAD_ORDER } from '../world/cells';
import { Interaction } from '../world/Interaction';
import { World } from '../world/World';
import { errorReport } from './diagnostics';
import { FixedStepLoop } from './FixedStepLoop';
import { SettingsStore } from './Settings';

export type GameState = 'loading' | 'title' | 'playing' | 'paused' | 'ending' | 'error';

const SAVE_KEY = 'nightmode.save.v1';

interface SaveData {
  chapter: ChapterId | null;
  endings: EndingId[];
  reached: ChapterId[];
}

const SFX_PRELOAD = [
  'step_wood_1', 'step_wood_2', 'step_wood_3', 'step_wood_4', 'step_wood_5', 'step_wood_6',
  'step_snow_1', 'step_snow_2', 'step_snow_3', 'step_snow_4', 'step_snow_5', 'step_snow_6',
  'door_open', 'door_close', 'door_locked', 'switch', 'vibrate', 'keypad', 'keypad_ok', 'keypad_error',
  'lock_motor', 'deadbolt', 'ui_click', 'objective', 'paper', 'pickup', 'wind_ext', 'wind_int', 'room_tone',
];

const LOCK_MESSAGES: Record<string, string> = {
  keypad: 'Locked. There is a keypad next to the door.',
  stay: "You just got here. The Hales are counting on you.",
  ivy: 'A little painted sign: IVY — KNOCK FIRST! The door is locked.',
  cellar: 'Locked. An old keyhole under the handle.',
  back: 'Locked.',
  stuck: "It won't open. Something is holding it from the other side.",
};

const easeOutCubic = (k: number) => 1 - (1 - k) ** 3;
const easeInOutCubic = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);

/** Swings a door from one opening (0..1) to another over `seconds`, resolving when it gets there. */
function swingDoor(cell: Cell, doorId: string, from: number, to: number, seconds: number, ease: (k: number) => number): Promise<void> {
  const t0 = performance.now();
  return new Promise((resolve) => {
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / (seconds * 1000));
      cell.setDoorOpen(doorId, from + (to - from) * ease(k));
      if (k < 1) requestAnimationFrame(step);
      else resolve();
    };
    step();
  });
}

/**
 * NIGHT MODE: owns the renderer, the rooms, the player, audio and UI, runs the chapters, and routes
 * input to whatever has focus (menus, the phone, notes, or walking around).
 */
export class Game implements StoryHost {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(60, 1, 0.05, 400);
  readonly settings = new SettingsStore();
  readonly renderer: WebGLRenderer;
  readonly input: Input;
  readonly ui: Ui;
  readonly post: PostFX;
  readonly audio: AudioEngine;
  readonly voice: Voice;
  readonly phone = new PhoneSystem();
  world!: World;
  player!: PlayerController;
  physics!: Physics;
  fx!: Fx;
  story!: Story;
  private assets!: Assets;
  private interaction: Interaction;
  private readonly timer = new Timer();
  private readonly loop = new FixedStepLoop(1 / 60);
  private state: GameState = 'loading';
  private appliedQuality: QualityLevel | null = null;
  private chars: { ivy?: GLTF; dana?: GLTF; jordan?: GLTF } = {};
  private lastInput: InputFrame | null = null;
  private transitioning = false;
  private runToken = 0;
  private titleTime = 0;
  private stepCount = 0;
  private hintedFlashlight = false;
  private nightDoorLines = 0;

  constructor(canvas: HTMLCanvasElement) {
    installHeightFog(); // before any material compiles
    this.renderer = createRenderer(canvas);
    this.input = new Input(canvas);
    this.ui = new Ui(this.settings);
    this.post = new PostFX(this.renderer, this.scene, this.camera);
    this.audio = new AudioEngine();
    this.voice = new Voice(this.audio);
    this.interaction = new Interaction(this.camera);
    this.scene.add(this.camera);
    this.timer.connect(document);

    this.voice.onSubtitle = (style, text) => this.ui.showSubtitle(style.label, style.color, text);
    this.voice.onSubtitleClear = () => this.ui.clearSubtitle();
    this.ui.onUiSound = (name) => void this.audio.play(name, { bus: 'ui', volume: 0.5, reverb: 0 });
    this.ui.onNewGame = () => this.startFrom('prologue', true);
    this.ui.onContinue = () => {
      const c = this.loadSave().chapter;
      if (c) this.startFrom(c, false);
    };
    this.ui.onChapter = (id) => this.startFrom(id as ChapterId, false);
    this.ui.onResume = () => this.resume();
    this.ui.onQuit = () => this.toTitle();
    this.ui.onEndingDone = () => this.toTitle();
    this.ui.onFlashlightButton = () => this.toggleFlashlight();
    this.phone.onOpen = (owner, id) => {
      if (owner === 'alex' && id === 'host') this.story?.set('readArrival');
    };
    this.settings.onChange(() => this.applySettings());
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('blur', () => {
      if (this.state === 'playing') this.pause();
    });
    document.addEventListener('pointerlockchange', () => this.onPointerLockChange());
    canvas.addEventListener('click', () => {
      if (this.state === 'playing' && !this.input.pointerLocked && !this.input.dragLook) this.input.requestPointerLock();
    });
    this.input.onPointerLockFailed = () => {
      if (this.state === 'playing' || this.state === 'title') {
        this.input.dragLook = true;
        this.ui.setHudHint('Hold the left mouse button and drag to look around · Esc pauses');
      } else {
        this.ui.showLockHint('The browser did not hand over the mouse. Wait a second and click Resume again.');
      }
    };
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.fail(new Error('The graphics driver stopped responding (WebGL context lost). Reload the page.'));
    });
    this.resize();
  }

  get currentState(): GameState {
    return this.state;
  }

  get flashlightOn(): boolean {
    return this.fx?.flashlightOn ?? false;
  }

  // ------------------------------------------------------------------------------------- boot

  async boot(): Promise<void> {
    this.ui.show('loading');
    const progress = new ProgressTracker((f, status) => this.ui.setProgress(f, status));
    try {
      progress.setStatus('Starting physics');
      this.physics = await Physics.create();
      this.player = new PlayerController(this.physics, this.camera);
      this.player.onFootstep = (speed) => this.footstep(speed);
      this.assets = new Assets(this.renderer);
      this.world = new World(this.scene, this.renderer, this.assets, this.physics);
      this.fx = new Fx({
        renderer: this.renderer,
        scene: this.scene,
        camera: this.camera,
        world: this.world,
        player: this.player,
        audio: this.audio,
        voice: this.voice,
        ui: this.ui,
        physics: this.physics,
        interactPressed: () => this.lastInput?.interactPressed ?? false,
        clock: () => this.story.clock,
      });
      this.story = new Story(this);
      this.post.setLook({ aoRadius: 0.6, aoIntensity: 1.6 });
      this.post.applyNight();
      this.ui.setCredits(CREDITS_HTML);

      progress.setStatus('Loading the house');
      await Promise.all([
        this.voice.init(),
        this.world.load('exterior', progress.download('exterior', 9_000_000)).finally(() => progress.finish('exterior')),
        this.world.load('hall', progress.download('hall', 9_000_000)).finally(() => progress.finish('hall')),
        this.audio.preload(SFX_PRELOAD),
      ]);
      progress.setStatus('Loading people');
      const [ivy, dana, jordan] = await Promise.all(
        ['ivy', 'dana', 'jordan'].map((n) => this.assets.loadGltf(assetUrl(`assets/chars/${n}.glb`)).catch(() => undefined)),
      );
      this.chars = { ivy, dana, jordan };
      this.fx.attach(this.chars);
      this.applySettings();
      progress.setStatus('Preparing');
      await this.world.activate('exterior');
      this.placeTitleCamera(0);
      await this.renderer.compileAsync(this.scene, this.camera);
      // the other rooms arrive in the background, in story order
      void this.loadRemainingRooms();
      this.toTitle();
      this.timer.reset();
      this.renderer.setAnimationLoop((t) => this.frame(t));
    } catch (err) {
      this.fail(err);
    }
  }

  private async loadRemainingRooms(): Promise<void> {
    for (const id of LOAD_ORDER) {
      if (this.world.loaded(id)) continue;
      try {
        await this.world.load(id);
        this.fx.attach(this.chars);
      } catch (err) {
        console.warn(`room ${id} failed to load`, err);
      }
    }
  }

  // ------------------------------------------------------------------------------ title / flow

  private loadSave(): SaveData {
    try {
      const raw = JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null') as Partial<SaveData> | null;
      return { chapter: raw?.chapter ?? null, endings: raw?.endings ?? [], reached: raw?.reached ?? [] };
    } catch {
      return { chapter: null, endings: [], reached: [] };
    }
  }

  private writeSave(patch: Partial<SaveData>): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ ...this.loadSave(), ...patch }));
    } catch {
      /* private mode: progress isn't kept */
    }
  }

  private toTitle(): void {
    this.runToken++;
    this.story.reset();
    this.audio.stopAll(1);
    this.voice.stop();
    this.ui.setObjective(null);
    this.ui.setPrompt(null);
    this.ui.clearSubtitle();
    this.ui.setKeyHint(null);
    this.ui.setFrost(0);
    this.fx.cold(false);
    this.fx.flashlightOn = false;
    this.fx.exteriorNight(false);
    this.fx.hideJordan();
    this.fx.lakeFigure(false);
    this.scene.fog = null;
    void this.world.setSkyMood(null);
    this.input.exitPointerLock();
    void this.world.activate('exterior').then(() => {
      this.world.nightTarget = 0;
      this.world.brightnessTarget = 1;
      this.world.nightModeLights = false;
    });
    const save = this.loadSave();
    this.ui.setTitleOptions({
      canContinue: Boolean(save.chapter) && save.chapter !== 'prologue',
      chapters: CHAPTERS.map((c, i) => ({
        id: c.id,
        title: `${i === 0 ? 'Prologue' : c.kicker} · ${c.id === 'prologue' ? 'Check-in' : c.title}`,
        unlocked: save.reached.includes(c.id),
      })),
      endings: save.endings.length ? `Endings found: ${save.endings.length} of 3` : '',
    });
    this.audio.ambience([{ sound: 'wind_ext', volume: 0.5 }], 2);
    void this.audio.music('title', { volume: 0.7, fade: 3 });
    this.ui.setBlack(false);
    this.ui.show('title');
    this.state = 'title';
  }

  private startFrom(id: ChapterId, fresh: boolean): void {
    void this.audio.resume();
    this.input.requestPointerLock();
    // the grandfather clock is unwound until the chapter (or the player, in chapter 1) winds it
    this.fx.resetClock();
    this.ui.show('none');
    this.state = 'playing';
    this.loop.reset();
    const token = ++this.runToken;
    void this.runChapters(id, fresh, token).catch((err: unknown) => {
      if (err instanceof Cancelled) return;
      this.fail(err);
    });
  }

  private async runChapters(first: ChapterId, fresh: boolean, token: number): Promise<void> {
    this.story.reset();
    this.audio.stopAll(1.5);
    this.phone.bookingHtml = this.phone.bookingHtml; // keep
    const ctx = this.ctx();
    let id: ChapterId | 'end' = first;
    let continuing = false;
    if (!fresh) this.ui.setBlack(true);
    while (id !== 'end' && token === this.runToken) {
      const ch = chapter(id);
      if (!continuing) {
        await this.ensureRooms(id);
        await ch.setup(ctx);
        this.enterCellEffects();
      }
      // the time of night follows the chapters, also when they run on from one another
      this.story.clock = ch.time;
      this.phone.time = ch.time.replace(/ [AP]M$/, '');
      if (id !== 'prologue') {
        if (continuing) await this.ui.fade(1, 1.2);
        this.ui.setBlack(true);
        await this.ui.titleCard(ch.kicker, ch.title, ch.time, 3);
        await this.ui.fade(0, 1.5);
      }
      this.writeSave({ reached: [...new Set([...this.loadSave().reached, id])] });
      id = await ch.run(ctx);
      continuing = true;
    }
  }

  private async ensureRooms(chapterId: ChapterId): Promise<void> {
    const need: Record<ChapterId, CellId[]> = {
      prologue: ['exterior', 'hall'],
      ch1: ['hall', 'kitchen', 'living'],
      ch2: ['kitchen', 'hall'],
      ch3: ['kitchen', 'hall', 'bedroom', 'bathroom', 'ivy'],
      ch4: ['kitchen', 'bedroom', 'living'],
      ch5: ['basement', 'exterior'],
    };
    const missing = need[chapterId].filter((c) => !this.world.loaded(c));
    if (missing.length) {
      this.ui.setBlack(true);
      await Promise.all(missing.map((c) => this.world.load(c)));
      this.fx.attach(this.chars);
    }
  }

  private ctx(): Ctx {
    return {
      s: this.story,
      phone: this.phone,
      ui: this.ui,
      audio: this.audio,
      voice: this.voice,
      world: this.world,
      player: this.player,
      fx: this.fx,
      openPhone: (owner = 'alex', app) => this.openPhone(owner, app),
      read: (html, style) => this.withModal(() => this.ui.read(html, style)),
      keypad: (len, check) => this.withModal(() => this.ui.keypad(len, check)),
      goTo: (cell, marker, opts) => this.goTo(cell, marker, opts),
      ending: (id) => this.ending(id),
      save: (chapterId) => this.writeSave({ chapter: chapterId }),
      place: (cell, marker) => this.place(cell, marker),
      keyHtml: (action: Action) => keysHtml(this.settings.get().keys, action),
      keyText: (action: Action) => keysText(this.settings.get().keys, action),
    };
  }

  private async withModal<T>(open: () => Promise<T>): Promise<T> {
    this.player.moveLocked = true;
    this.player.lookLocked = true;
    this.ui.setPrompt(null);
    try {
      return await open();
    } finally {
      this.player.moveLocked = false;
      this.player.lookLocked = false;
    }
  }

  private openPhone(owner: 'alex' | 'jordan' = 'alex', app?: string): Promise<void> {
    if (this.ui.modal) return Promise.resolve();
    this.phone.time = this.story.clock.replace(/ [AP]M$/, '');
    // new messages open straight away, like a notification tapped on a real phone
    if (!app && owner === 'alex') app = Object.values(this.phone.threads).find((t) => t.unread > 0)?.id;
    return this.withModal(() => this.ui.openPhone(owner === 'alex' ? this.phone.alex() : this.phone.jordanPhone(), app));
  }

  private async ending(id: EndingId): Promise<void> {
    const e = ENDINGS[id];
    const save = this.loadSave();
    this.writeSave({ endings: [...new Set([...save.endings, id])], chapter: null });
    this.state = 'ending';
    this.input.exitPointerLock();
    this.audio.stopAll(2);
    void this.audio.music(id === 'goodnight' ? 'ending_goodnight' : 'night', { volume: 0.7, loop: id !== 'goodnight', fade: 2 });
    this.ui.showEnding(e.kicker, e.title, [...e.text]);
    // behind the text: the house from the lake. Dawn after "Goodnight"; lit windows otherwise.
    this.titleTime = 0;
    this.fx.flashlightOn = false;
    this.fx.hideJordan();
    this.fx.cold(false);
    this.ui.setFrost(0);
    this.scene.fog = null;
    this.world.brightnessTarget = 1;
    this.world.nightModeLights = false;
    this.world.flicker = 0;
    await this.world.activate('exterior');
    if (id === 'goodnight') {
      this.world.nightTarget = 1;
      this.fx.exteriorNight(false);
      await this.world.setSkyMood({ intensity: 0.22, tint: [1.0, 0.7, 0.62] });
    } else {
      this.world.nightTarget = 0;
      this.fx.exteriorNight(id === 'thinice');
    }
    this.placeTitleCamera(0);
    await this.ui.fade(0, 2);
  }

  // --------------------------------------------------------------------------------- movement

  interactPressed(): boolean {
    return this.lastInput?.interactPressed ?? false;
  }

  setControl(move: boolean, look: boolean): void {
    this.player.moveLocked = !move;
    this.player.lookLocked = !look;
  }

  setFlashlight(on: boolean): void {
    this.fx.flashlightOn = on;
    this.ui.setFlashlightButton(on);
  }

  private toggleFlashlight(): void {
    this.setFlashlight(!this.fx.flashlightOn);
    void this.audio.play('switch', { volume: 0.4, rate: 1.5, bus: 'ui' });
  }

  async place(cell: CellId, marker: string): Promise<void> {
    const c = await this.world.activate(cell);
    const m = c.markers.get(marker);
    const pos = m ? c.markerPosition(marker) : c.bounds.getCenter(new Vector3());
    const yaw = m ? c.markerYaw(marker) : 0;
    const ground = this.physics.groundHeightBelow(new Vector3(pos.x, pos.y + 0.8, pos.z), 5);
    if (ground !== null) pos.y = ground;
    this.player.teleport(pos, yaw);
    this.player.update(0, 1, { x: 0, y: 0 }, false);
    this.enterCellEffects();
  }

  async goTo(cell: CellId, marker: string, opts: { fade?: number } = {}): Promise<void> {
    const fade = opts.fade ?? 0.45;
    this.transitioning = true;
    await this.ui.fade(1, fade);
    await this.world.load(cell);
    await this.place(cell, marker);
    await this.ui.fade(0, fade * 1.2);
    this.transitioning = false;
  }

  private enterCellEffects(): void {
    const cell = this.world.current;
    if (!cell) return;
    this.audio.setReverb(cell.def.reverb);
    const beds = cell.def.ambience.filter((b) => !(b.sound === 'fridge_hum' && this.world.nightTarget > 0.5));
    this.audio.ambience(beds, 1.2);
    this.scene.fog = null;
    if (!this.hintedFlashlight && this.world.nightTarget > 0.5 && !this.fx.flashlightOn && this.state === 'playing') {
      this.hintedFlashlight = true;
      this.ui.setKeyHint(`Press ${keysHtml(this.settings.get().keys, 'flashlight')} to use your phone as a flashlight`);
      window.setTimeout(() => this.ui.setKeyHint(null), 6000);
    }
  }

  private async useDoor(doorId: string): Promise<void> {
    const cell = this.world.current;
    if (!cell || this.transitioning) return;
    const cellId = cell.def.id;
    const leaf = cell.doors.get(doorId);
    const at = leaf?.leaf ?? this.fx.anchor(cellId, `door_${doorId}`);
    const lock = this.story.doorLock(cellId, doorId);
    if (lock) {
      void this.audio.play('door_locked', { at, volume: 0.9 });
      if (lock === 'night') {
        if (this.nightDoorLines++ % 3 === 0) await this.story.say(this.nightDoorLines === 1 ? 'i_night_door' : 'w_sys_locked');
        else this.ui.showToast('Locked. Night Mode.', 2.5);
      } else if (lock === 'private') {
        await this.story.say('i_bathroom');
      } else {
        this.ui.showToast(LOCK_MESSAGES[lock] ?? 'Locked.', 3.5);
      }
      return;
    }
    const dest = this.world.destination(cellId, doorId);
    if (!dest) {
      this.ui.showToast("It won't open.", 2);
      return;
    }
    this.transitioning = true;
    void this.audio.play('door_open', { at, volume: 0.8 });
    // the door swings open on its hinges (towards the player, as far as there is room for it), and the
    // view fades once it is well under way
    void swingDoor(cell, doorId, 0, this.doorRoom(cell, doorId), 0.9, easeOutCubic);
    await new Promise((r) => setTimeout(r, 280));
    await this.ui.fade(1, 0.55);
    cell.setDoorOpen(doorId, 0);
    const target = await this.world.load(dest.cell);
    await this.place(dest.cell, `door_${dest.door}`);
    // on the other side it is still open behind you, and swings shut as the view comes back
    const ajar = Math.min(0.45, this.doorRoom(target, dest.door));
    target.setDoorOpen(dest.door, ajar);
    const behind = target.doors.get(dest.door)?.leaf ?? target.root;
    void swingDoor(target, dest.door, ajar, 0, 0.8, easeInOutCubic).then(() => this.audio.play('door_close', { at: behind, volume: 0.7 }));
    await this.ui.fade(0, 0.6);
    this.transitioning = false;
  }

  /**
   * How far a door (0..1) can swing into the room without passing through the player: its leaf sweeps a
   * quarter circle as wide as the door in front of the wall.
   */
  private doorRoom(cell: Cell, doorId: string): number {
    const door = cell.doors.get(doorId);
    const front = cell.markers.get(`door_${doorId}`);
    if (!door || !front) return 0.6;
    const hinge = door.leaf.getWorldPosition(new Vector3());
    const out = front.getWorldPosition(new Vector3()).sub(hinge).setY(0).normalize();
    const d = this.player.position.clone().sub(hinge).setY(0).dot(out);
    const angle = Math.asin(MathUtils.clamp((d - 0.35) / 0.86, 0, 1));
    return MathUtils.clamp(angle / MathUtils.degToRad(80), 0.2, 0.85);
  }

  private footstep(speed: number): void {
    const cell = this.world.current;
    if (!cell) return;
    const surface = cell.def.footsteps;
    const vol = Math.min(1, 0.35 + speed * 0.18) * (this.player.isCrouched ? 0.5 : 1);
    const onStairs = cell.def.id === 'hall' && this.player.position.y > 0.15 && this.player.position.y < 3.45;
    if (onStairs && this.stepCount++ % 2 === 0) {
      void this.audio.playVariant('stairs_creak', 4, { volume: vol * 0.7, rate: 0.95 + Math.random() * 0.1 });
    }
    void this.audio.playVariant(`step_${surface}`, 6, { volume: vol * 0.55, rate: 0.93 + Math.random() * 0.14, reverb: 0.25 });
    if (surface === 'wood' && Math.random() < 0.05) void this.audio.playVariant('creak', 5, { volume: 0.25 });
  }

  // ------------------------------------------------------------------------------------- frame

  private frame(time: number): void {
    this.timer.update(time);
    const dt = Math.min(0.1, this.timer.getDelta());
    this.renderer.info.reset();
    // while playing, keys like Tab and Space must not move focus or scroll the page (inside a page that
    // embeds the game, Tab would otherwise take the keyboard away from it)
    this.input.captureKeys = this.state === 'playing';
    const input = this.input.poll(dt, this.settings.get());
    this.lastInput = input;

    if (this.state === 'title') {
      this.titleTime += dt;
      this.placeTitleCamera(this.titleTime);
      if (input.gamepadConfirmPressed) this.startFrom('prologue', true);
    } else if (this.state === 'playing') {
      this.playingFrame(dt, input);
    } else if (this.state === 'ending') {
      this.titleTime += dt;
      this.placeTitleCamera(this.titleTime);
    } else if (this.state === 'paused' && input.gamepadConfirmPressed) {
      this.resume();
    }

    this.world.update(dt);
    this.fx.update(dt);
    this.audio.updateListener(this.camera);
    this.renderer.toneMappingExposure = this.world.exposure * this.settings.get().brightness;
    this.post.setDayLook(this.world.dawn);
    this.post.render(dt);
  }

  private playingFrame(dt: number, input: InputFrame): void {
    const ui = this.ui;
    if (ui.modal) {
      ui.handleInput(input.ui);
      if (ui.modal === null) ui.setPrompt(null);
    } else if (input.pausePressed) {
      this.pause();
      return;
    } else if (input.phonePressed && !this.transitioning) {
      void this.openPhone('alex');
    }
    if (!ui.modal) {
      if (input.flashlightPressed) this.toggleFlashlight();
      if (input.crouchPressed) this.player.toggleCrouch();
    }
    const player = this.player;
    const physics = this.physics;
    const alpha = this.loop.advance(dt, (step) => {
      player.fixedUpdate(step, ui.modal ? { ...input, move: { x: 0, y: 0 } } : input);
      physics.step(step);
    });
    player.update(dt, alpha, ui.modal ? { x: 0, y: 0 } : input.look, this.settings.get().headBob);
    this.story.update(dt);

    // what can be used here?
    if (!ui.modal && !this.transitioning && !player.moveLocked) {
      const target = this.interaction.pick(this.world.current, (id) => this.story.handlers.has(id) || id.startsWith('door_'));
      const prompt = target ? this.promptFor(target.id) : null;
      ui.setPrompt(prompt?.text ?? null, { locked: prompt?.locked, key: prompt?.key });
      if (target && prompt && input.interactPressed) {
        if (this.story.handlers.has(target.id)) this.story.use(target.id);
        else if (target.id.startsWith('door_')) void this.useDoor(target.id.slice(5)).catch((e: unknown) => this.story.report(e));
      }
    } else if (!ui.modal) {
      ui.setPrompt(null);
    }
  }

  private promptFor(id: string): { text: string; locked: boolean; key?: string } | null {
    const p = this.story.promptFor(id);
    if (p) return p;
    if (!id.startsWith('door_')) return null;
    const cellId = this.world.current?.def.id;
    if (!cellId) return null;
    const door = id.slice(5);
    const locked = Boolean(this.story.doorLock(cellId, door));
    if (!this.world.destination(cellId, door)) return { text: 'Door', locked: true };
    return { text: locked ? 'Locked' : 'Open the door', locked };
  }

  private placeTitleCamera(t: number): void {
    const ext = this.world.cells.get('exterior');
    const m = ext?.markers.get('title_cam');
    const target = ext?.markers.get('title_target');
    if (!m || !target) {
      this.camera.position.set(0, 3, 12);
      this.camera.lookAt(0, 2, 0);
      return;
    }
    m.getWorldPosition(this.camera.position);
    this.camera.position.x += Math.sin(t * 0.05) * 1.2;
    this.camera.position.y += Math.sin(t * 0.07) * 0.2;
    this.camera.lookAt(target.getWorldPosition(new Vector3()));
  }

  // ------------------------------------------------------------------------------ pause & settings

  private pause(): void {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.input.exitPointerLock();
    this.ui.show('pause');
    void this.audio.ctx.suspend();
  }

  private resume(): void {
    if (this.state !== 'paused') return;
    void this.audio.resume();
    if (!this.input.dragLook) this.input.requestPointerLock();
    this.ui.show('none');
    this.state = 'playing';
    this.loop.reset();
  }

  private onPointerLockChange(): void {
    if (!this.input.pointerLocked && this.state === 'playing' && !this.input.dragLook) this.pause();
  }

  private applySettings(): void {
    const s = this.settings.get();
    const preset = QUALITY_PRESETS[s.quality];
    if (s.quality !== this.appliedQuality) {
      this.appliedQuality = s.quality;
      this.post.applyQuality(preset);
      if (this.fx) {
        this.fx.flashlight.shadow.mapSize.set(preset.shadowMapSize / 2, preset.shadowMapSize / 2);
        this.fx.moonBeams.setShadowMapSize(Math.min(preset.shadowMapSize, 2048));
        this.fx.setNightDetail(s.quality !== 'low');
      }
      this.world?.setAnisotropy(preset.anisotropy);
    }
    this.audio.setMasterVolume(s.volume);
    this.post.setGamma(s.gamma);
    this.camera.fov = verticalFovFromHorizontal16x9(s.fov);
    this.resize();
  }

  private resize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setPixelRatio(pixelRatioFor(QUALITY_PRESETS[this.settings.get().quality], window.devicePixelRatio || 1));
    this.post.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private fail(err: unknown): void {
    console.error(err);
    const detail = err instanceof Error ? `${err.message}\n${err.stack ?? ''}` : String(err);
    this.ui.showError(errorReport(`${detail}\n\nAlso send anything red from the browser console (F12).`));
    this.state = 'error';
    this.input.exitPointerLock();
  }

  /** Debug hooks for automated tests (enabled with ?debug in the address). */
  debugApi() {
    return {
      game: this,
      /** The night look's config (render/nightConfig.ts): change values, then call applyNight(). */
      night: NIGHT,
      applyNight: () => {
        this.post.applyNight();
        this.world.applyNight();
        this.fx.applyNight();
      },
      jump: (id: ChapterId) => this.startFrom(id, false),
      speakers: SPEAKERS,
      /** Scripted tests: story waits k times shorter, voice lines cut short. */
      fast: (k = 10) => {
        this.story.timeScale = k;
        this.voice.fast = k > 1;
      },
      /** Stands the player at a marker in a room, lit on (0) or moonlit (1), e.g. nm.view('kitchen', 'door_hall', 1). */
      view: async (cell: CellId, marker: string, night = 0, yawDeg?: number, pitchDeg = 0) => {
        this.state = 'playing';
        this.ui.show('none');
        this.ui.setBlack(false);
        this.world.nightTarget = night;
        this.world.brightnessTarget = 1;
        await this.world.load(cell);
        await this.place(cell, marker);
        const c = this.world.current!;
        c.night = night;
        c.applyLighting();
        this.world.exposure = c.targetExposure;
        if (yawDeg !== undefined) this.player.teleport(this.player.position.clone(), MathUtils.degToRad(yawDeg), MathUtils.degToRad(pitchDeg));
      },
    };
  }
}
