import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  FogExp2,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Scene,
  SphereGeometry,
  SpotLight,
  Vector3,
  type Bone,
  type Texture,
  type WebGLRenderer,
} from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import type { AudioEngine, SoundHandle } from '../audio/AudioEngine';
import type { Voice } from '../audio/Voice';
import { Character } from '../characters/Character';
import { collisionGroups, LAYER, RAPIER, type Physics } from '../physics/Physics';
import type { PlayerController } from '../player/PlayerController';
import type { Ui } from '../ui/Ui';
import type { CellId } from '../world/Cell';
import type { World } from '../world/World';
import { faceStudio, Screens, type Feed } from './Screens';

/** Layer only the bathroom mirror's camera sees (Ivy standing behind the player). */
export const MIRROR_LAYER = 3;

interface SecurityCamera {
  cell: CellId;
  obj: Object3D;
  baseYaw: number;
  led: Mesh;
  phase: number;
}

interface Deps {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  world: World;
  player: PlayerController;
  audio: AudioEngine;
  voice: Voice;
  ui: Ui;
  physics: Physics;
  interactPressed: () => boolean;
}

/**
 * Everything the story makes the house *do*: screens, the clock, the hide-and-seek cameras, the mirror,
 * scares, cold, snow, the breaker and the ice.
 */
export class Fx {
  readonly screens: Screens;
  flashlightOn = false;
  readonly flashlight: SpotLight;
  private ivyScreen: Character | null = null;
  private ivyMirror: Character | null = null;
  private ivyLake: Character | null = null;
  private dana: Character | null = null;
  private jordan: Character | null = null;
  private mirror: Reflector | null = null;
  private readonly cams: SecurityCamera[] = [];
  private camerasOn = false;
  private sweeping = false;
  private seeking: { left: number; seen: number; tick: number; ticks: number; resolve: (caught: boolean) => void; onTick: (k: number) => Promise<void> } | null = null;
  private clockOn = false;
  private clockTick: SoundHandle | null = null;
  private pendulum: Bone | Object3D | null = null;
  private clockTime = 0;
  private rocking = false;
  private rockTime = 0;
  private rockSound: SoundHandle | null = null;
  private coldOn = false;
  private breathTimer = 3;
  private snow: Points | null = null;
  private scareQuad: Mesh | null = null;
  private readonly tmp = new Vector3();
  private readonly tmp2 = new Vector3();
  private warned = new Set<string>();
  private wakeTimers: number[] = [];
  private iceHole: Object3D | null = null;
  private videoActive = false;

  constructor(private readonly d: Deps) {
    this.screens = new Screens(d.renderer);
    // phone flashlight: a soft spot light that trails the view slightly
    this.flashlight = new SpotLight(0xfff2dd, 0, 16, MathUtils.degToRad(28), 0.55, 1.6);
    this.flashlight.castShadow = true;
    this.flashlight.shadow.mapSize.set(1024, 1024);
    this.flashlight.shadow.bias = -0.0008;
    this.flashlight.shadow.normalBias = 0.02;
    this.flashlight.shadow.camera.near = 0.1;
    d.scene.add(this.flashlight, this.flashlight.target);
  }

  // ----------------------------------------------------------------------------------- setup

  /** Hooks the effects to the loaded rooms and characters. Safe to call again as rooms arrive. */
  attach(chars: { ivy?: GLTF; dana?: GLTF; jordan?: GLTF }): void {
    const w = this.d.world;
    for (const [cellId, cell] of w.cells) {
      for (const [name, obj] of cell.dynamic) {
        if (name.endsWith('_screen') && obj instanceof Mesh && !this.screens.has(name.replace(/_screen$/, ''))) {
          this.screens.register(name.replace(/_screen$/, ''), obj, { curve: name.startsWith('tv') || name.startsWith('monitor') ? 0.12 : 0.02 });
        }
        if (name.startsWith('cam_') && !this.cams.some((c) => c.obj === obj)) {
          const led = new Mesh(new SphereGeometry(0.012, 8, 6), new MeshBasicMaterial({ color: 0x220000 }));
          const marker = cell.markers.get(name);
          obj.add(led);
          led.position.set(0, 0.0, 0.0);
          this.cams.push({ cell: cellId, obj, baseYaw: obj.rotation.y, led, phase: Math.random() * 6 });
          void marker;
        }
      }
      if (cellId === 'living' && !this.pendulum) {
        const clock = cell.dynamic.get('clock');
        clock?.traverse((o) => {
          if (!this.pendulum && /pendulum/i.test(o.name)) this.pendulum = o;
        });
      }
    }
    if (chars.ivy && !this.ivyScreen) {
      this.ivyScreen = new Character(chars.ivy);
      this.ivyScreen.play('idle');
      this.ivyScreen.blinking = false;
      this.ivyScreen.expression.smile = 0.55;
      const studio = faceStudio(this.ivyScreen, { distance: 0.62, height: 1.28, fov: 26, background: 0x05070a, key: 5 });
      studio.camera.position.x = 0.05;
      this.screens.addFeed('ivy', studio.scene, studio.camera, {
        before: () => {
          this.ivyScreen!.lookTarget = studio.camera.position;
          this.ivyScreen!.update(1 / 24, this.d.voice.mouth('ivy'));
        },
      });
    }
    if (chars.dana && !this.dana) {
      this.dana = new Character(chars.dana);
      this.dana.play('sit');
      const studio = faceStudio(this.dana, { distance: 0.95, height: 1.12, fov: 32, background: 0x0d0b0a, key: 4 });
      this.screens.addFeed('dana', studio.scene, studio.camera, {
        before: () => {
          this.dana!.lookTarget = studio.camera.position;
          this.dana!.update(1 / 24, this.d.voice.mouth('dana'));
        },
      });
    }
    if (chars.ivy && !this.ivyMirror && w.cells.has('bathroom')) this.setupMirror(chars.ivy);
    if (chars.ivy && !this.ivyLake && w.cells.has('exterior')) {
      this.ivyLake = new Character(chars.ivy);
      this.ivyLake.play('idle');
      const exterior = w.cells.get('exterior')!;
      const spot = exterior.markers.get('lakefigure');
      if (spot) {
        spot.getWorldPosition(this.tmp);
        this.ivyLake.root.position.copy(this.tmp);
        this.ivyLake.root.rotation.y = w.cells.get('exterior')!.markerYaw('lakefigure') + Math.PI;
      }
      this.ivyLake.root.visible = false;
      exterior.root.add(this.ivyLake.root);
      this.setupLakeFeed();
    }
    if (chars.jordan && !this.jordan && w.cells.has('exterior')) {
      this.jordan = new Character(chars.jordan);
      this.jordan.play('float');
      const exterior = w.cells.get('exterior')!;
      const spot = exterior.markers.get('jordan');
      if (spot) {
        spot.getWorldPosition(this.tmp);
        this.jordan.root.position.set(this.tmp.x, this.tmp.y - 0.45, this.tmp.z);
        this.jordan.root.rotation.set(-Math.PI / 2, 0, 0.4);
      }
      this.jordan.root.visible = false;
      exterior.dynamic.set('jordan', this.jordan.root);
      exterior.root.add(this.jordan.root);
    }
  }

  private setupLakeFeed(): void {
    const w = this.d.world;
    const exterior = w.cells.get('exterior')!;
    const cam = new PerspectiveCamera(50, 4 / 3, 0.1, 400);
    const m = exterior.markers.get('lakecam');
    if (m) {
      m.getWorldPosition(cam.position);
      cam.rotation.set(-0.12, exterior.markerYaw('lakecam'), 0, 'YXZ');
    } else {
      cam.position.set(0, 4, 0);
    }
    let restore: (() => void) | null = null;
    this.screens.addFeed('lake', this.d.scene, cam, {
      before: () => {
        const cur = w.current;
        const bg = this.d.scene.background;
        const fog = this.d.scene.fog;
        const env = this.d.scene.environment;
        const flash = this.flashlight.visible;
        cur?.root && (cur.root.visible = false);
        exterior.root.visible = true;
        this.flashlight.visible = false;
        if (this.ivyLake) this.ivyLake.update(1 / 24);
        this.d.scene.fog = new FogExp2(0x0b1018, 0.018);
        restore = () => {
          exterior.root.visible = cur === exterior;
          if (cur) cur.root.visible = true;
          this.d.scene.background = bg;
          this.d.scene.fog = fog;
          this.d.scene.environment = env;
          this.flashlight.visible = flash;
        };
      },
      after: () => restore?.(),
    }, [480, 360]);
  }

  private setupMirror(ivyGltf: GLTF): void {
    const bath = this.d.world.cells.get('bathroom')!;
    const m = bath.markers.get('mirror');
    if (!m) return;
    const width = Number(m.userData.width ?? 1.1);
    const height = Number(m.userData.height ?? 0.8);
    this.mirror = new Reflector(new PlaneGeometry(width, height), {
      textureWidth: 1024,
      textureHeight: Math.round(1024 * (height / width)),
      color: new Color(0.78, 0.8, 0.82),
      clipBias: 0.003,
    });
    m.getWorldPosition(this.mirror.position);
    this.mirror.rotation.y = bath.markerYaw('mirror') + Math.PI;
    bath.root.add(this.mirror);
    this.mirror.getReflectionCamera(this.d.camera).layers.enable(MIRROR_LAYER);
    this.ivyMirror = new Character(ivyGltf);
    this.ivyMirror.play('idle');
    this.ivyMirror.blinking = false;
    this.ivyMirror.expression = { smile: 0.2, sad: 0.4, eyesWide: 0.6, jaw: 0.08, browsUp: 0.2 };
    this.ivyMirror.root.traverse((o) => o.layers.set(MIRROR_LAYER));
    this.ivyMirror.root.visible = false;
    bath.root.add(this.ivyMirror.root);
  }

  // --------------------------------------------------------------------------------- queries

  /** Something to attach a sound to: a marker, moving object or interaction box of a room. */
  anchor(cell: CellId, name: string): Object3D {
    const c = this.d.world.cells.get(cell);
    const found = c?.markers.get(name) ?? c?.dynamic.get(name) ?? c?.proxies.find((p) => p.name === `I_${name}`);
    if (found) return found;
    if (!this.warned.has(`${cell}:${name}`)) {
      this.warned.add(`${cell}:${name}`);
      console.warn(`no anchor ${name} in ${cell}`);
    }
    return c?.root ?? this.d.scene;
  }

  screen(name: string): Feed {
    return this.screens.feed(name);
  }

  setScreen(name: string, feed: Feed): void {
    this.screens.set(name, feed);
    if (name === 'monitor' || name === 'laptop' || name === 'tv') {
      void this.d.audio.play(feed === 'off' ? 'led_off' : 'static', {
        at: this.anchor(this.cellOfScreen(name), name === 'tv' ? 'tv' : name),
        volume: feed === 'off' ? 0.3 : 0.15,
      }).then((h) => {
        if (feed !== 'off') window.setTimeout(() => h.stop(0.3), 350);
      });
    }
  }

  private cellOfScreen(name: string): CellId {
    return name === 'tv' ? 'living' : name === 'laptop' ? 'bedroom' : name === 'monitor' ? 'basement' : 'kitchen';
  }

  lookingAtMirror(): boolean {
    if (!this.mirror || this.d.world.current?.def.id !== 'bathroom') return false;
    const cam = this.d.camera;
    const to = this.mirror.getWorldPosition(this.tmp).sub(cam.position);
    const dist = to.length();
    if (dist > 3.2) return false;
    const fwd = this.tmp2.set(0, 0, -1).applyQuaternion(cam.quaternion);
    return fwd.dot(to.normalize()) > Math.cos(MathUtils.degToRad(28));
  }

  // --------------------------------------------------------------------------------- effects

  lakeFigure(on: boolean): void {
    if (this.ivyLake) this.ivyLake.root.visible = on;
  }

  clockRunning(on: boolean): void {
    this.clockOn = on;
    if (on && !this.clockTick) {
      void this.d.audio.play('clock_tick', { at: this.anchor('living', 'clock'), loop: true, volume: 0.7, refDistance: 1.6 }).then((h) => {
        if (this.clockOn) this.clockTick = h;
        else h.stop(0.1);
      });
    }
    if (!on) {
      this.clockTick?.stop(0.2);
      this.clockTick = null;
    }
  }

  clockDoor(open: boolean): void {
    const door = this.d.world.cells.get('living')?.dynamic.get('clock_door');
    if (door) door.rotation.y = open ? 1.6 * Number(door.userData.open_sign ?? -1) : 0;
    this.d.world.cells.get('living')?.setDoorOpen('clock', open ? 1 : 0);
  }

  cameras(on: boolean): void {
    this.camerasOn = on;
    for (const c of this.cams) (c.led.material as MeshBasicMaterial).color.set(on ? 0xff1a10 : 0x220000);
    if (on) void this.d.audio.play('servo', { volume: 0.5 });
  }

  cameraSweep(on: boolean): void {
    this.sweeping = on;
  }

  /** Hide and seek: resolves true if a camera saw the player for long enough. */
  seek(seconds: number, onTick: (k: number) => Promise<void>): Promise<boolean> {
    return new Promise((resolve) => {
      this.seeking = { left: seconds, seen: 0, tick: 6, ticks: 0, resolve, onTick };
    });
  }

  private cameraSees(cam: SecurityCamera): boolean {
    const w = this.d.world;
    if (!this.camerasOn || w.current?.def.id !== cam.cell) return false;
    const p = this.d.player.position;
    const eye = this.d.player.eyeHeight;
    const origin = cam.obj.getWorldPosition(this.tmp);
    const fwd = new Vector3(0, 0, 1).applyQuaternion(cam.obj.getWorldQuaternion(cam.obj.quaternion.clone()));
    for (const h of [eye - 0.05, eye * 0.55]) {
      const target = this.tmp2.set(p.x, p.y + h, p.z);
      const dir = target.clone().sub(origin);
      const dist = dir.length();
      if (dist > 14) continue;
      dir.normalize();
      if (Math.abs(fwd.angleTo(new Vector3(dir.x, fwd.y !== 0 ? dir.y : 0, dir.z))) > MathUtils.degToRad(48)) continue;
      const ray = new RAPIER.Ray(origin, dir);
      const hit = this.d.physics.world.castRay(ray, dist - 0.3, true, undefined, collisionGroups(LAYER.ALL, LAYER.WORLD));
      if (!hit) return true;
    }
    return false;
  }

  async jumpScare(_kind: 'found'): Promise<void> {
    const tex = this.screens.texture('ivy');
    if (this.ivyScreen) {
      this.ivyScreen.expression = { smile: 0, sad: 0, eyesWide: 1, jaw: 1.35, browsUp: 1 };
      this.screens.renderFeed('ivy');
    }
    if (!this.scareQuad) {
      this.scareQuad = new Mesh(new PlaneGeometry(0.5, 0.375), new MeshBasicMaterial({ map: tex, color: new Color(2.2, 2.2, 2.2), depthTest: false }));
      this.scareQuad.renderOrder = 999;
      this.scareQuad.position.set(0, 0, -0.26);
      this.d.camera.add(this.scareQuad);
    }
    this.scareQuad.visible = true;
    this.d.ui.glitch(0.7);
    void this.d.audio.play('scare', { volume: 1, bus: 'sfx', reverb: 0 });
    void this.d.voice.say('i_found', { reverb: 0.1 });
    this.d.player.shake(0.05, 0.7);
    await new Promise((r) => setTimeout(r, 750));
    this.scareQuad.visible = false;
    if (this.ivyScreen) this.ivyScreen.expression = { smile: 0.55, sad: 0, eyesWide: 0, jaw: 0, browsUp: 0 };
    await this.d.ui.fade(1, 0.3);
    await new Promise((r) => setTimeout(r, 600));
    await this.d.ui.fade(0, 0.8);
  }

  musicBoxOpen(open: boolean): void {
    const lid = this.d.world.cells.get('bedroom')?.dynamic.get('musicbox_lid');
    if (lid) lid.rotation.x = open ? -1.7 : 0;
  }

  footprints(on: boolean): void {
    const fp = this.d.world.cells.get('hall')?.dynamic.get('footprints');
    if (fp) fp.visible = on;
  }

  mirrorIvy(on: boolean): void {
    if (!this.ivyMirror) return;
    const bath = this.d.world.cells.get('bathroom')!;
    this.ivyMirror.root.visible = on;
    if (on) {
      // stand right behind the player, facing the mirror
      const cam = this.d.camera;
      const back = new Vector3(0, 0, 1).applyQuaternion(cam.quaternion);
      back.y = 0;
      back.normalize();
      const p = this.d.player.position;
      this.ivyMirror.root.position.set(p.x + back.x * 0.75, p.y, p.z + back.z * 0.75);
      this.ivyMirror.root.rotation.y = Math.atan2(-back.x, -back.z);
      void bath;
    }
  }

  rockingChair(on: boolean): void {
    this.rocking = on;
    if (on && !this.rockSound) {
      void this.d.audio.play('rocking_chair', { at: this.anchor('living', 'rocking_chair'), loop: true, volume: 0.8 }).then((h) => {
        if (this.rocking) this.rockSound = h;
        else h.stop(0.1);
      });
    }
    if (!on) {
      this.rockSound?.stop(0.8);
      this.rockSound = null;
    }
  }

  /** Dana's four video logs on her laptop. Interact skips a log. */
  async videoLogs(): Promise<void> {
    const p = this.d.player;
    p.moveLocked = true;
    p.lookLocked = true;
    this.videoActive = true;
    const screen = this.anchor('bedroom', 'laptop_screen');
    await p.lookAt(screen.getWorldPosition(new Vector3()), 0.6);
    this.setScreen('laptop', 'dana');
    const logs: [string, string][] = [
      ['d_log1', 'WREN — build 9 · March 3'],
      ['d_log2', 'WREN — build 12 · June 20'],
      ['d_log3', 'WREN — build 14 · September 9'],
      ['d_log4', 'WREN — build 14 · November 30'],
    ];
    for (const [id, title] of logs) {
      this.d.ui.showToast(title, 4);
      this.dana?.play('talk', 0.6);
      await new Promise((r) => setTimeout(r, 900));
      const line = this.d.voice.say(id, { at: screen, refDistance: 1.2, lowpass: 7500 });
      const skip = new Promise<void>((resolve) => {
        const check = () => {
          if (!this.videoActive) return resolve();
          if (this.d.interactPressed()) {
            this.d.voice.stop();
            return resolve();
          }
          requestAnimationFrame(check);
        };
        requestAnimationFrame(check);
      });
      await Promise.race([line, skip]);
      await line.catch(() => undefined);
      this.dana?.play('sit', 0.8);
      await new Promise((r) => setTimeout(r, 700));
    }
    this.setScreen('laptop', 'off');
    this.videoActive = false;
    p.moveLocked = false;
    p.lookLocked = false;
  }

  cold(on: boolean): void {
    this.coldOn = on;
    this.d.ui.setFrost(on ? 0.5 : 0);
  }

  /** A line whispered right behind the player's head. */
  async whisperBehind(id: string): Promise<void> {
    const cam = this.d.camera;
    const behind = new Vector3(0, 0.05, 0.35).applyQuaternion(cam.quaternion).add(cam.position);
    void this.d.audio.play('breath', { at: behind, volume: 0.5, refDistance: 0.3 }).then((h) => window.setTimeout(() => h.stop(0.5), 2500));
    await this.d.voice.say(id, { at: behind, refDistance: 0.25, reverb: 0.05 });
    void this.d.audio.play('stinger', { volume: 0.8 });
    this.d.player.shake(0.02, 0.5);
  }

  breaker(): void {
    const lever = this.d.world.cells.get('basement')?.dynamic.get('breaker_lever');
    if (lever) lever.rotation.x = MathUtils.degToRad(-100);
  }

  async sitDown(): Promise<void> {
    const p = this.d.player;
    p.moveLocked = true;
    p.setCrouch(true);
    const screen = this.anchor('basement', 'monitor_screen');
    await p.lookAt(screen.getWorldPosition(new Vector3()), 1.5);
  }

  /**
   * The house wakes up behind the player: every window lights, a group at a time, and blazes.
   * off: the windows go back to their normal glow.
   */
  exteriorNight(on: boolean): void {
    const ext = this.d.world.cells.get('exterior');
    if (!ext) return;
    for (const t of this.wakeTimers) window.clearTimeout(t);
    this.wakeTimers = [];
    if (!on) {
      ext.setGlow(/window.?glow/i, 1);
      return;
    }
    ext.setGlow(/window.?glow/i, 0);
    this.d.world.nightTarget = 0;
    this.d.world.brightnessTarget = 1;
    const speaker = this.anchor('exterior', 'house_speaker');
    for (let i = 1; i <= 4; i++) {
      this.wakeTimers.push(
        window.setTimeout(() => {
          ext.setGlow(new RegExp(`window.?glow.?${i}$`, 'i'), 2.8);
          void this.d.audio.play('switch', { at: speaker, volume: 0.9, refDistance: 8, rate: 0.8 + i * 0.07 });
        }, 250 + i * 420),
      );
    }
  }

  /**
   * Jordan under the ice, a couple of metres ahead of the player: a patch of clear black ice opens in the
   * snow-covered ice (a depth mask drawn before the lake), with him and dark water under it.
   * Returns the point to look at (his face).
   */
  revealJordan(): Vector3 {
    const ext = this.d.world.cells.get('exterior')!;
    const cam = this.d.camera;
    const fwd = this.tmp.set(0, 0, -1).applyQuaternion(cam.quaternion);
    fwd.y = 0;
    fwd.normalize();
    const iceY = ext.markers.get('jordan')?.getWorldPosition(this.tmp2).y ?? this.d.player.position.y;
    const at = this.d.player.position.clone().addScaledVector(fwd, 2.3);
    at.y = iceY;
    if (!this.iceHole) {
      const disc = (r: number) => {
        const g = new CircleGeometry(r, 40);
        const pos = g.getAttribute('position') as BufferAttribute;
        for (let i = 1; i < pos.count; i++) {
          // a ragged edge: clear ice patches aren't circles
          const a = Math.atan2(pos.getY(i), pos.getX(i));
          const k = 1 + 0.12 * Math.sin(a * 3 + 1) + 0.07 * Math.sin(a * 7 + 2);
          pos.setXY(i, pos.getX(i) * k, pos.getY(i) * k);
        }
        g.rotateX(-Math.PI / 2);
        return g;
      };
      const group = new Object3D();
      const water = new Mesh(disc(1.5), new MeshBasicMaterial({ color: 0x010406 }));
      water.position.y = -0.55;
      water.renderOrder = -2;
      const mask = new Mesh(disc(1.25), new MeshBasicMaterial({ colorWrite: false }));
      mask.position.y = 0.002;
      mask.renderOrder = -1;
      const glaze = new Mesh(
        disc(1.25),
        new MeshStandardMaterial({ color: 0x5f8394, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.22, depthWrite: false }),
      );
      glaze.position.y = 0.004;
      group.add(water, mask, glaze);
      this.iceHole = group;
      ext.root.add(group);
    }
    this.iceHole.position.copy(at);
    this.iceHole.visible = true;
    const j = this.jordan;
    if (j) {
      // lying face up with his head towards the player (the face is seen upside down), feet 1.7 m away
      j.root.position.set(at.x + fwd.x * 1.7, iceY - 0.3, at.z + fwd.z * 1.7);
      j.root.rotation.set(-Math.PI / 2, 0, Math.atan2(fwd.x, fwd.z));
      j.root.traverse((o) => (o.renderOrder = -2));
      j.root.visible = true;
    }
    return new Vector3(at.x, iceY - 0.25, at.z);
  }

  hideJordan(): void {
    if (this.jordan) this.jordan.root.visible = false;
    if (this.iceHole) this.iceHole.visible = false;
  }

  async fallThroughIce(): Promise<void> {
    const p = this.d.player;
    const ext = this.d.world.cells.get('exterior');
    p.moveLocked = true;
    ext?.collider?.setEnabled(false);
    const start = p.position.clone();
    void this.d.audio.play('splash', { volume: 1 });
    p.shake(0.08, 1.2);
    const t0 = performance.now();
    await new Promise<void>((resolve) => {
      const step = () => {
        const k = Math.min(1, (performance.now() - t0) / 900);
        p.teleport(new Vector3(start.x, start.y - 1.7 * k * k, start.z), p.yaw, p.pitch + 0.02);
        if (k < 1) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
    this.d.scene.fog = new FogExp2(0x03161c, 0.9);
    this.d.scene.background = new Color(0x020a0d);
    void this.d.audio.play('underwater', { volume: 0.9, loop: false });
    await new Promise((r) => setTimeout(r, 2200));
    await this.d.ui.fade(1, 1.5);
  }

  // ----------------------------------------------------------------------------------- per frame

  update(dt: number): void {
    const cam = this.d.camera;
    const cur = this.d.world.current;
    // flashlight follows the view with a little lag
    this.flashlight.intensity = MathUtils.damp(this.flashlight.intensity, this.flashlightOn ? 38 : 0, 14, dt);
    this.flashlight.visible = this.flashlight.intensity > 0.05;
    const fwd = this.tmp.set(0, 0, -1).applyQuaternion(cam.quaternion);
    this.flashlight.position.copy(cam.position).addScaledVector(fwd, 0.1).add(new Vector3(0.12, -0.12, 0).applyQuaternion(cam.quaternion));
    const aim = this.tmp2.copy(cam.position).addScaledVector(fwd, 6);
    this.flashlight.target.position.lerp(aim, 1 - Math.exp(-18 * dt));

    // clock pendulum
    if (this.clockOn && this.pendulum) {
      this.clockTime += dt;
      this.pendulum.rotation.z = Math.sin(this.clockTime * Math.PI) * 0.14;
    }
    // rocking chair
    const chair = this.d.world.cells.get('living')?.dynamic.get('rocking_chair');
    if (chair) {
      if (this.rocking) this.rockTime += dt;
      const target = this.rocking ? Math.sin(this.rockTime * 2.1) * 0.12 : 0;
      chair.rotation.x = MathUtils.damp(chair.rotation.x, target, 3, dt);
    }
    // security cameras
    for (const c of this.cams) {
      if (this.sweeping) c.phase += dt * 0.5;
      const target = c.baseYaw + (this.sweeping ? Math.sin(c.phase) * 0.6 : 0);
      c.obj.rotation.y = MathUtils.damp(c.obj.rotation.y, target, 4, dt);
    }
    if (this.seeking) {
      const s = this.seeking;
      s.left -= dt;
      s.tick -= dt;
      if (s.tick <= 0) {
        s.tick = 8;
        void s.onTick(s.ticks++).catch(() => undefined);
      }
      const seen = this.cams.some((c) => this.cameraSees(c));
      s.seen = seen ? s.seen + dt : Math.max(0, s.seen - dt * 0.5);
      for (const c of this.cams) {
        const blink = seen && c.cell === cur?.def.id ? (Math.sin(performance.now() / 50) > 0 ? 0xff5040 : 0x330000) : 0xff1a10;
        (c.led.material as MeshBasicMaterial).color.set(blink);
      }
      if (seen && Math.random() < dt * 4) void this.d.audio.play('keypad', { volume: 0.3, rate: 1.6 });
      if (s.seen > 0.9) {
        this.seeking = null;
        s.resolve(true);
      } else if (s.left <= 0) {
        this.seeking = null;
        s.resolve(false);
      }
    }
    // cold breath
    if (this.coldOn) {
      this.breathTimer -= dt;
      if (this.breathTimer <= 0) {
        this.breathTimer = 3.2 + Math.random() * 2;
        this.puff();
      }
    }
    // snow outside
    this.updateSnow(dt, cur?.def.id === 'exterior');
    this.ivyMirror?.update(dt);
    this.ivyLake?.update(0);
    this.jordan?.update(dt);
    const inRoom = cur?.root ?? null;
    this.screens.update(dt, inRoom, this.scareQuad?.visible ? ['ivy'] : []);
  }

  private puff(): void {
    const cam = this.d.camera;
    const geo = new BufferGeometry();
    const n = 40;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 0.06;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 0.04 - 0.08;
      pos[i * 3 + 2] = -0.25 - Math.random() * 0.1;
    }
    geo.setAttribute('position', new BufferAttribute(pos, 3));
    const mat = new PointsMaterial({ size: 0.06, map: softDot(), transparent: true, opacity: 0.18, depthWrite: false, color: 0xdde6ff, blending: AdditiveBlending });
    const pts = new Points(geo, mat);
    cam.add(pts);
    const t0 = performance.now();
    const step = () => {
      const k = (performance.now() - t0) / 1400;
      pts.position.set(0, k * 0.05, -k * 0.35);
      pts.scale.setScalar(1 + k * 2.5);
      mat.opacity = 0.18 * (1 - k);
      if (k < 1) requestAnimationFrame(step);
      else {
        cam.remove(pts);
        geo.dispose();
        mat.dispose();
      }
    };
    requestAnimationFrame(step);
  }

  private updateSnow(dt: number, outside: boolean): void {
    if (!outside) {
      if (this.snow) this.snow.visible = false;
      return;
    }
    const count = 5000;
    if (!this.snow) {
      const geo = new BufferGeometry();
      const pos = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 40;
        pos[i * 3 + 1] = Math.random() * 14;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 40;
      }
      geo.setAttribute('position', new BufferAttribute(pos, 3));
      const mat = new PointsMaterial({ size: 0.045, map: softDot(), transparent: true, opacity: 0.8, depthWrite: false, color: 0xcfd8ea });
      this.snow = new Points(geo, mat);
      this.snow.frustumCulled = false;
      this.d.scene.add(this.snow);
    }
    this.snow.visible = true;
    const p = this.d.player.position;
    this.snow.position.set(p.x, p.y - 4, p.z);
    const arr = (this.snow.geometry.getAttribute('position') as BufferAttribute).array as Float32Array;
    const t = performance.now() / 1000;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1]! -= dt * (0.9 + (i % 7) * 0.08);
      arr[i * 3]! += dt * (0.6 + Math.sin(t * 0.7 + i) * 0.3);
      if (arr[i * 3 + 1]! < 0) {
        arr[i * 3 + 1] = 14;
        arr[i * 3] = (Math.random() - 0.5) * 40;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 40;
      }
      if (arr[i * 3]! > 20) arr[i * 3] = -20;
    }
    this.snow.geometry.getAttribute('position').needsUpdate = true;
  }
}

let dotTexture: Texture | null = null;
function softDot(): Texture {
  if (dotTexture) return dotTexture;
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  dotTexture = new CanvasTexture(c);
  return dotTexture;
}
