import { Vector3, type Object3D } from 'three';
import type { AudioEngine, PlayOptions, SoundHandle } from '../audio/AudioEngine';
import type { SayOptions, Voice } from '../audio/Voice';
import type { PlayerController } from '../player/PlayerController';
import type { Ui } from '../ui/Ui';
import type { Cell, CellId } from '../world/Cell';
import type { World } from '../world/World';

/** Thrown into a running script when the story is reset (quit to title, load a chapter). */
export class Cancelled extends Error {
  constructor() {
    super('cancelled');
  }
}

export interface Handler {
  /** Prompt text ("Open the door"), or null when this can't be used right now. */
  prompt: string | (() => string | null);
  action: () => void | Promise<void>;
  /** Shown dimmed (e.g. a locked door): the action usually just explains why. */
  locked?: boolean | (() => boolean);
  /** Key hint shown in the prompt. */
  key?: string;
}

/** What the story needs from the game. */
export interface StoryHost {
  world: World;
  player: PlayerController;
  audio: AudioEngine;
  voice: Voice;
  ui: Ui;
  /** Walks through a door / teleports to a marker with a fade. */
  goTo(cell: CellId, marker: string, opts?: { fade?: number; yawFrom?: 'marker' | 'keep' }): Promise<void>;
  setFlashlight(on: boolean): void;
  readonly flashlightOn: boolean;
  /** Blocks walking and looking (cutscenes). */
  setControl(move: boolean, look: boolean): void;
  /** True on the frame the player presses the interact key (E / click / pad A). */
  interactPressed(): boolean;
}

/**
 * The story runtime: flags, script time, interaction handlers, door locks and the async primitives
 * chapter scripts are written with (wait, say, interact, enter, ...).
 */
export class Story {
  flags: Record<string, unknown> = {};
  clock = '8:02 PM';
  /** Seconds of play (stops while paused). */
  time = 0;
  generation = 0;
  private waiters: { at: number; resolve: () => void; reject: (e: Error) => void }[] = [];
  private conditions: { pred: () => boolean; resolve: () => void; reject: (e: Error) => void }[] = [];
  readonly handlers = new Map<string, Handler>();
  private readonly locks = new Map<string, string>();
  private loops = new Map<string, SoundHandle>();
  objectiveText: string | null = null;

  constructor(readonly host: StoryHost) {}

  get world(): World {
    return this.host.world;
  }

  get cellId(): CellId | null {
    return this.host.world.current?.def.id ?? null;
  }

  cell(id: CellId): Cell {
    const c = this.host.world.cells.get(id);
    if (!c) throw new Error(`Room ${id} is not loaded`);
    return c;
  }

  /** Cancels every running script and forgets all handlers, locks and looping sounds. */
  reset(): void {
    this.generation++;
    const err = new Cancelled();
    for (const w of this.waiters) w.reject(err);
    for (const c of this.conditions) c.reject(err);
    this.waiters = [];
    this.conditions = [];
    this.handlers.clear();
    this.locks.clear();
    for (const h of this.loops.values()) h.stop(0.5);
    this.loops.clear();
    this.flags = {};
    this.time = 0;
    this.objectiveText = null;
  }

  /** Debug: story time runs this much faster (waits end sooner). */
  timeScale = 1;

  update(dt: number): void {
    this.time += dt * this.timeScale;
    if (this.waiters.length) {
      const due = this.waiters.filter((w) => w.at <= this.time);
      if (due.length) {
        this.waiters = this.waiters.filter((w) => w.at > this.time);
        for (const w of due) w.resolve();
      }
    }
    if (this.conditions.length) {
      const done = this.conditions.filter((c) => c.pred());
      if (done.length) {
        this.conditions = this.conditions.filter((c) => !done.includes(c));
        for (const c of done) c.resolve();
      }
    }
  }

  private guard<T>(p: Promise<T>): Promise<T> {
    const gen = this.generation;
    return p.then((v) => {
      if (gen !== this.generation) throw new Cancelled();
      return v;
    });
  }

  // ------------------------------------------------------------------------------ time and events

  wait(seconds: number): Promise<void> {
    return new Promise((resolve, reject) => this.waiters.push({ at: this.time + seconds, resolve, reject }));
  }

  until(pred: () => boolean): Promise<void> {
    if (pred()) return this.guard(Promise.resolve());
    return new Promise((resolve, reject) => this.conditions.push({ pred, resolve, reject }));
  }

  /** Resolves the next time the player presses the interact key. */
  pressed(): Promise<void> {
    return this.until(() => this.host.interactPressed());
  }

  /** Resolves when the player is in the given room. */
  enter(cell: CellId): Promise<void> {
    return this.until(() => this.cellId === cell);
  }

  /** Resolves when the player comes within `radius` metres of a marker in a room. */
  near(cell: CellId, marker: string, radius: number): Promise<void> {
    return this.until(() => {
      if (this.cellId !== cell) return false;
      const m = this.host.world.cells.get(cell)?.markers.get(marker);
      if (!m) return false;
      const p = m.getWorldPosition(this.tmpV);
      const f = this.host.player.position;
      return Math.hypot(p.x - f.x, p.z - f.z) < radius && Math.abs(p.y - f.y) < 1.5;
    });
  }

  private readonly tmpV = new Vector3();

  // --------------------------------------------------------------------------------- interaction

  on(id: string, handler: Handler): void {
    this.handlers.set(id, handler);
  }

  off(...ids: string[]): void {
    for (const id of ids) this.handlers.delete(id);
  }

  /** Waits until the player uses `id` (with this prompt), then removes the handler. */
  interact(id: string, prompt: string, key?: string): Promise<void> {
    return this.guard(
      new Promise<void>((resolve) => {
        this.on(id, {
          prompt,
          key,
          action: () => {
            this.off(id);
            resolve();
          },
        });
      }),
    );
  }

  promptFor(id: string): { text: string; locked: boolean; key?: string } | null {
    const h = this.handlers.get(id);
    if (!h) return null;
    const text = typeof h.prompt === 'function' ? h.prompt() : h.prompt;
    if (!text) return null;
    const locked = typeof h.locked === 'function' ? h.locked() : Boolean(h.locked);
    return { text, locked, key: h.key };
  }

  use(id: string): void {
    const h = this.handlers.get(id);
    if (!h) return;
    const r = h.action();
    if (r instanceof Promise) r.catch((e: unknown) => this.report(e));
  }

  report(err: unknown): void {
    if (err instanceof Cancelled) return;
    console.error(err);
  }

  // ------------------------------------------------------------------------------------- doors

  lockDoor(cell: CellId, door: string, message: string): void {
    this.locks.set(`${cell}:${door}`, message);
  }

  unlockDoor(cell: CellId, door: string): void {
    this.locks.delete(`${cell}:${door}`);
  }

  doorLock(cell: CellId, door: string): string | null {
    return this.locks.get(`${cell}:${door}`) ?? null;
  }

  // -------------------------------------------------------------------------------- presentation

  say(id: string, opts: SayOptions = {}): Promise<void> {
    return this.guard(this.host.voice.say(id, opts));
  }

  /** A line from a device or place in the world (3D positioned). */
  sayAt(id: string, at: Object3D | Vector3, opts: SayOptions = {}): Promise<void> {
    return this.say(id, { at, refDistance: 1.4, ...opts });
  }

  sfx(name: string, opts: PlayOptions = {}): Promise<SoundHandle> {
    return this.host.audio.play(name, opts);
  }

  /** Starts (or replaces) a named looping sound; `stopLoop(key)` fades it out. */
  async loop(key: string, name: string, opts: PlayOptions = {}): Promise<SoundHandle> {
    this.loops.get(key)?.stop(0.4);
    const h = await this.host.audio.play(name, { loop: true, ...opts });
    this.loops.set(key, h);
    return h;
  }

  stopLoop(key: string, fade = 0.8): void {
    this.loops.get(key)?.stop(fade);
    this.loops.delete(key);
  }

  music(name: string, opts: { volume?: number; fade?: number; loop?: boolean } = {}): void {
    void this.host.audio.music(name, opts);
  }

  objective(text: string | null, sound = true): void {
    if (text === this.objectiveText) return;
    this.objectiveText = text;
    this.host.ui.setObjective(text);
    if (text && sound) void this.host.audio.play('objective', { bus: 'ui', volume: 0.6 });
  }

  toast(text: string, seconds?: number): void {
    this.host.ui.showToast(text, seconds);
  }

  fadeOut(seconds = 1): Promise<void> {
    return this.guard(this.host.ui.fade(1, seconds));
  }

  fadeIn(seconds = 1): Promise<void> {
    return this.guard(this.host.ui.fade(0, seconds));
  }

  async card(kicker: string, title: string, sub: string, seconds = 3): Promise<void> {
    await this.guard(this.host.ui.titleCard(kicker, title, sub, seconds));
  }

  // -------------------------------------------------------------------------------------- world

  /** Eases the house lighting: night 0 = lamps on, 1 = moonlight; brightness scales everything. */
  lights(opts: { night?: number; brightness?: number; flicker?: number; nightMode?: boolean }): void {
    const w = this.host.world;
    if (opts.night !== undefined) w.nightTarget = opts.night;
    if (opts.brightness !== undefined) w.brightnessTarget = opts.brightness;
    if (opts.flicker !== undefined) w.flicker = opts.flicker;
    if (opts.nightMode !== undefined) w.nightModeLights = opts.nightMode;
  }

  /** Shows or hides a moving/removable object (DYN_ node) of a room. */
  show(cell: CellId, name: string, visible: boolean): void {
    const obj = this.host.world.cells.get(cell)?.dynamic.get(name);
    if (obj) obj.visible = visible;
  }

  dyn(cell: CellId, name: string): Object3D | undefined {
    return this.host.world.cells.get(cell)?.dynamic.get(name);
  }

  markerIn(cell: CellId, name: string): Object3D | undefined {
    return this.host.world.cells.get(cell)?.markers.get(name);
  }

  set(flag: string, value: unknown = true): void {
    this.flags[flag] = value;
  }

  is(flag: string): boolean {
    return Boolean(this.flags[flag]);
  }
}
