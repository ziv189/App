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
  Quaternion,
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
import type { Physics } from '../physics/Physics';
import type { PlayerController } from '../player/PlayerController';
import type { Ui } from '../ui/Ui';
import type { CellId } from '../world/Cell';
import type { World } from '../world/World';
import { applyGroundNight } from '../render/SnowGround';
import { applyWindNight } from '../world/Trees';
import { ClockHands } from './ClockHands';
import { MoonBeams } from './MoonBeams';
import { NightOutdoors } from './NightOutdoors';
import { WindowSnow } from './WindowSnow';
import { faceStudio, Screens, type Feed } from './Screens';

const UP = new Vector3(0, 1, 0);
const X_AXIS = new Vector3(1, 0, 0);
const turnQ = new Quaternion();

/** Turns an object about one of its own axes, relative to the orientation it was loaded with. */
function turnLocal(obj: Object3D, axis: Vector3, angle: number): void {
  const base = ((obj.userData.baseQuat as Quaternion | undefined) ??= obj.quaternion.clone());
  obj.quaternion.copy(base).multiply(turnQ.setFromAxisAngle(axis, angle));
}

/** Layer only the bathroom mirror's camera sees (Ivy standing behind the player). */
export const MIRROR_LAYER = 3;

interface SecurityCamera {
  cell: CellId;
  obj: Object3D;
  /** Rest orientation; the sweep turns it about the vertical. Its lens looks along local +Z. */
  baseQuat: Quaternion;
  sweep: number;
  led: Mesh;
  phase: number;
}

/** Ivy's idle clip holds her arms out from her sides; seen full-length, they hang down instead. */
function armsDown(c: Character): void {
  c.addPoseFix('Bip01_L_UpperArm', UP, 38);
  c.addPoseFix('Bip01_R_UpperArm', UP, -38);
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
  /** The story's time of night, e.g. "10:00 PM". */
  clock: () => string;
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
  private readonly mirrorsAdded = new Set<CellId>();
  private readonly cams: SecurityCamera[] = [];
  private camerasOn = false;
  private sweeping = false;
  private seeking: { left: number; seen: number; tick: number; ticks: number; resolve: (caught: boolean) => void; onTick: (k: number) => Promise<void> } | null = null;
  private clockOn = false;
  private clockDoorTarget = 0;
  private clockDoorAngle = 0;
  private clockTick: SoundHandle | null = null;
  private tickStarting = false;
  private pendulum: Bone | Object3D | null = null;
  /** The grandfather clock's hands (see ClockHands). */
  private hands: ClockHands | null = null;
  private clockTime = 0;
  private rocking = false;
  private rockTime = 0;
  private rockAngle = 0;
  private rockSound: SoundHandle | null = null;
  private coldOn = false;
  private breathTimer = 3;
  /** Lamps, window light, mist, falling snow and telegraph poles outside (see NightOutdoors). */
  private outdoors: NightOutdoors | null = null;
  /** The moon through the windows indoors, while the house lights are off. */
  readonly moonBeams: MoonBeams;
  /** Snow falling past the windows indoors (the view out of them is a still picture). */
  private readonly windowSnow: WindowSnow;
  private scareQuad: Mesh | null = null;
  private readonly tmp = new Vector3();
  private readonly tmp2 = new Vector3();
  private warned = new Set<string>();
  private wakeTimers: number[] = [];
  private readonly qTmp = new Quaternion();
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
    this.moonBeams = new MoonBeams(d.scene);
    this.windowSnow = new WindowSnow(d.scene);
  }

  // ----------------------------------------------------------------------------------- setup

  /** Hooks the effects to the loaded rooms and characters. Safe to call again as rooms arrive. */
  attach(chars: { ivy?: GLTF; dana?: GLTF; jordan?: GLTF }): void {
    const w = this.d.world;
    for (const [cellId, cell] of w.cells) {
      this.moonBeams.attach(cell);
      for (const [name, obj] of cell.dynamic) {
        if (name.endsWith('_screen') && obj instanceof Mesh && !this.screens.has(name.replace(/_screen$/, ''))) {
          if (name === 'tablet_screen') {
            // Wren's wall panel in the kitchen: a flat touch screen with her home screen on it
            this.screens.register('tablet', obj, { curve: 0, scan: 0.04, noise: 0.012, brightness: 1.5 });
            this.screens.addCanvasFeed('wren', (g, w, h) => this.drawWrenPanel(g, w, h));
            this.screens.set('tablet', 'wren');
          } else {
            this.screens.register(name.replace(/_screen$/, ''), obj, { curve: name.startsWith('tv') || name.startsWith('monitor') ? 0.12 : 0.02 });
          }
        }
        if (name.startsWith('cam_') && !this.cams.some((c) => c.obj === obj)) {
          // aim it along its marker (M_cam_x): the lens looks along the camera's local +Z
          if (cell.markers.has(name)) obj.quaternion.setFromAxisAngle(UP, cell.markerYaw(name) + Math.PI);
          const led = new Mesh(new SphereGeometry(0.012, 8, 6), new MeshBasicMaterial({ color: 0x220000 }));
          obj.add(led);
          led.position.set(0.035, 0.2, 0.19); // beside the lens
          this.cams.push({ cell: cellId, obj, baseQuat: obj.quaternion.clone(), sweep: 0, led, phase: Math.random() * 6 });
        }
      }
      if (cellId === 'living' && !this.pendulum) {
        // the clock's empty sits at the pendulum's pivot (the rod itself lost its pivot in compression)
        const clock = cell.dynamic.get('clock');
        if (clock?.getObjectByName('clock_pendulum')) this.pendulum = clock;
      }
      if (cellId === 'living' && !this.hands) {
        const minute = cell.dynamic.get('clock_minute');
        const hour = cell.dynamic.get('clock_hour');
        const dial = cell.markers.get('clock_dial');
        if (minute && hour && dial) {
          const facing = new Vector3(0, 0, -1).applyQuaternion(dial.getWorldQuaternion(new Quaternion()));
          this.hands = new ClockHands(minute, hour, facing);
        }
      }
    }
    // a saved game can set the clock going before the living room is here to tick in
    if (this.clockOn) this.startTick();
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
    // the other mirrors in the house: real reflections (each only renders while it is on screen)
    for (const [cellId, cell] of w.cells) {
      if (this.mirrorsAdded.has(cellId)) continue;
      this.mirrorsAdded.add(cellId);
      for (const m of cell.def.mirrors ?? []) {
        const res = 384;
        const mirror = new Reflector(new PlaneGeometry(m.width, m.height), {
          textureWidth: m.width >= m.height ? Math.round(res * (m.width / m.height)) : res,
          textureHeight: m.height > m.width ? Math.min(1024, Math.round(res * (m.height / m.width))) : res,
          color: new Color(0.82, 0.84, 0.86),
          clipBias: 0.003,
        });
        mirror.position.set(...m.center);
        mirror.rotation.y = MathUtils.degToRad(m.yawDeg);
        cell.root.add(mirror);
      }
    }
    if (chars.ivy && !this.ivyLake && w.cells.has('exterior')) {
      this.ivyLake = new Character(chars.ivy);
      this.ivyLake.play('idle');
      armsDown(this.ivyLake);
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
    if (!this.outdoors && w.cells.has('exterior')) {
      this.outdoors = new NightOutdoors(w.cells.get('exterior')!, this.d.renderer);
      this.outdoors.setDetail(this.nightDetail);
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
        const sky = w.nightSky.mesh.visible;
        const beam = this.moonBeams.light.intensity;
        cur?.root && (cur.root.visible = false);
        exterior.root.visible = true;
        this.flashlight.visible = false;
        this.moonBeams.light.intensity = 0;
        if (this.ivyLake) this.ivyLake.update(1 / 24);
        // the camera sees the night outside: its sky and fog
        w.nightSky.mesh.visible = true;
        this.d.scene.fog = w.nightFog;
        restore = () => {
          exterior.root.visible = cur === exterior;
          if (cur) cur.root.visible = true;
          this.d.scene.background = bg;
          this.d.scene.fog = fog;
          this.d.scene.environment = env;
          this.flashlight.visible = flash;
          w.nightSky.mesh.visible = sky;
          this.moonBeams.light.intensity = beam;
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
    armsDown(this.ivyMirror);
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
        at: this.anchor(this.cellOfScreen(name), `${name}_screen`),
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
    if (on) this.startTick();
    else {
      this.clockTick?.stop(0.2);
      this.clockTick = null;
      this.hands?.stop();
    }
  }

  /** The tick comes from the clock, so it waits for the living room (attach starts it when that arrives). */
  private startTick(): void {
    if (this.clockTick || this.tickStarting || !this.d.world.cells.has('living')) return;
    this.tickStarting = true;
    void this.d.audio.play('clock_tick', { at: this.anchor('living', 'clock'), loop: true, volume: 0.7, refDistance: 1.6 }).then(
      (h) => {
        this.tickStarting = false;
        if (this.clockOn) this.clockTick = h;
        else h.stop(0.1);
      },
      () => {
        this.tickStarting = false;
      },
    );
  }

  /** A new game: the clock stands where it stopped that night, unwound. */
  resetClock(): void {
    this.clockRunning(false);
    this.hands?.reset();
  }

  /** The grandfather clock's case door swings open (or shut) on its hinge, slowly. */
  clockDoor(open: boolean): void {
    this.clockDoorTarget = open ? 1 : 0;
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

  /** Wren's home screen: warm and helpful by day; in Night Mode, a moon and a child's handwriting. */
  private drawWrenPanel(g: CanvasRenderingContext2D, w: number, h: number): void {
    const world = this.d.world;
    const powered = world.brightnessTarget > 0.2;
    const night = world.nightModeLights || world.nightTarget > 0.5;
    const [time, ampm] = (this.d.clock() || '8:05 PM').split(' ');
    const sans = 'system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
    g.fillStyle = '#000';
    g.fillRect(0, 0, w, h);
    if (!powered) return;
    const bg = g.createLinearGradient(0, 0, w, h);
    if (night) {
      bg.addColorStop(0, '#02040a');
      bg.addColorStop(1, '#0a1328');
    } else {
      bg.addColorStop(0, '#15263d');
      bg.addColorStop(1, '#2c3f5c');
    }
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    const glow = g.createRadialGradient(w * 0.78, h * 0.3, 10, w * 0.78, h * 0.3, w * 0.5);
    glow.addColorStop(0, night ? 'rgba(90,120,220,0.22)' : 'rgba(255,190,120,0.22)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = glow;
    g.fillRect(0, 0, w, h);
    const ink = night ? '#9db6ff' : '#fff4e6';
    const dim = night ? 'rgba(157,182,255,0.55)' : 'rgba(255,244,230,0.62)';

    // header: a little bird and the name
    g.fillStyle = ink;
    g.beginPath();
    g.ellipse(46, 44, 15, 11, -0.2, 0, Math.PI * 2);
    g.moveTo(58, 37);
    g.lineTo(76, 30);
    g.lineTo(60, 44);
    g.fill();
    g.beginPath();
    g.arc(38, 36, 7, 0, Math.PI * 2);
    g.fill();
    g.font = `600 30px ${sans}`;
    g.textBaseline = 'middle';
    g.fillText('Wren', 88, 42);
    if (night) {
      // a crescent moon where the house name was
      g.fillStyle = ink;
      g.beginPath();
      g.arc(w - 48, 42, 20, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#03060e';
      g.beginPath();
      g.arc(w - 40, 35, 17, 0, Math.PI * 2);
      g.fill();
    } else {
      g.font = `400 18px ${sans}`;
      g.fillStyle = dim;
      g.textAlign = 'right';
      g.fillText('Hale House', w - 28, 42);
      g.textAlign = 'left';
    }

    // the time
    g.fillStyle = ink;
    g.font = `200 118px ${sans}`;
    g.textBaseline = 'alphabetic';
    g.fillText(time ?? '', 28, 188);
    const tw = g.measureText(time ?? '').width;
    g.font = `400 30px ${sans}`;
    g.fillText(ampm ?? '', 40 + tw, 186);

    if (!night) {
      g.font = `400 21px ${sans}`;
      g.fillStyle = dim;
      g.fillText('Snow · 4 °F outside · 68 °F inside', 30, 228);
      const chips = ['Lights on', 'Heating on', 'Doors unlocked'];
      let x = 30;
      g.font = `500 18px ${sans}`;
      for (const c of chips) {
        const cw = g.measureText(c).width + 28;
        g.fillStyle = 'rgba(255,244,230,0.12)';
        g.beginPath();
        g.roundRect(x, 252, cw, 38, 19);
        g.fill();
        g.fillStyle = ink;
        g.fillText(c, x + 14, 277);
        x += cw + 12;
      }
      g.font = `400 24px ${sans}`;
      g.fillStyle = ink;
      g.fillText('Good evening, Alex. Anything you need?', 30, 342);
      return;
    }

    // Night Mode
    g.fillStyle = ink;
    g.font = `600 20px ${sans}`;
    g.fillText('N I G H T   M O D E', 30, 228);
    g.font = `400 18px ${sans}`;
    g.fillStyle = dim;
    const status = ['All doors locked', this.camerasOn ? 'Cameras on' : 'Cameras ready', this.coldOn ? 'Heating off' : 'Heating on'];
    g.fillText(status.join('  ·  '), 30, 262);
    // her handwriting, in crayon
    g.save();
    g.translate(34, 330);
    g.rotate(-0.035);
    g.font = `400 30px "Segoe Print", "Comic Sans MS", "Chalkboard SE", cursive`;
    g.fillStyle = '#ff6b5e';
    g.fillText('nobody goes outside at night', 0, 0);
    g.restore();
  }

  private cameraSees(cam: SecurityCamera): boolean {
    const w = this.d.world;
    if (!this.camerasOn || w.current?.def.id !== cam.cell) return false;
    const p = this.d.player.position;
    const eye = this.d.player.eyeHeight;
    // from the lens (the object's origin is its wall mount, inside the wall's collision)
    const origin = cam.obj.localToWorld(this.tmp.set(0, 0.19, 0.3));
    const fwd = new Vector3(0, 0, 1).applyQuaternion(cam.obj.getWorldQuaternion(new Quaternion()));
    for (const h of [eye - 0.05, eye * 0.55]) {
      const target = this.tmp2.set(p.x, p.y + h, p.z);
      const dir = target.clone().sub(origin);
      const dist = dir.length();
      if (dist > 14) continue;
      dir.normalize();
      if (Math.abs(fwd.angleTo(new Vector3(dir.x, fwd.y !== 0 ? dir.y : 0, dir.z))) > MathUtils.degToRad(48)) continue;
      if (this.d.physics.castRay(origin, dir, dist - 0.3) === null) return true;
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
    if (lid) turnLocal(lid, X_AXIS, open ? -1.7 : 0); // hinged along its back edge (local X)
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
      this.ivyMirror.root.position.set(p.x + back.x * 0.5, p.y, p.z + back.z * 0.5);
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
    if (lever) turnLocal(lever, X_AXIS, MathUtils.degToRad(-100));
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
    const windows = this.outdoors?.windows;
    if (!on) {
      ext.setGlow(/window.?glow/i, 1);
      windows?.setAllGroups(1);
      return;
    }
    ext.setGlow(/window.?glow/i, 0);
    windows?.setAllGroups(0);
    this.d.world.nightTarget = 0;
    this.d.world.brightnessTarget = 1;
    const speaker = this.anchor('exterior', 'house_speaker');
    // the house lights up group by group, every room of it (even the empty ones)
    for (let i = 1; i <= 4; i++) {
      this.wakeTimers.push(
        window.setTimeout(() => {
          ext.setGlow(new RegExp(`window.?glow.?${i}$`, 'i'), 2.8);
          windows?.setGroup(i - 1, 2.8);
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

  private nightDetail = true;

  /** Low graphics quality leaves out the costlier night effects (mist, light shafts, dust, half the snow). */
  setNightDetail(full: boolean): void {
    this.nightDetail = full;
    this.outdoors?.setDetail(full);
    this.moonBeams.setDetail(full);
    this.windowSnow.setDetail(full);
  }

  /** Re-reads the night config (lamps, snow, mist, moon beams) after it changed. */
  applyNight(): void {
    this.outdoors?.apply();
    this.moonBeams.apply();
    applyWindNight();
    applyGroundNight();
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

    // the clock's hands, and its pendulum
    this.hands?.update(this.clockOn, this.d.clock(), performance.now(), dt);
    if (this.clockOn && this.pendulum) {
      this.clockTime += dt;
      this.pendulum.rotation.z = Math.sin(this.clockTime * Math.PI) * 0.14;
    }
    // the clock's case door
    const clockDoor = this.d.world.cells.get('living')?.dynamic.get('clock_door');
    if (clockDoor && Math.abs(this.clockDoorAngle - this.clockDoorTarget) > 1e-4) {
      this.clockDoorAngle = MathUtils.damp(this.clockDoorAngle, this.clockDoorTarget, 2.4, dt);
      if (Math.abs(this.clockDoorAngle - this.clockDoorTarget) < 0.002) this.clockDoorAngle = this.clockDoorTarget;
      turnLocal(clockDoor, UP, 1.6 * Number(clockDoor.userData.open_sign ?? 1) * this.clockDoorAngle);
    }
    // rocking chair
    const chair = this.d.world.cells.get('living')?.dynamic.get('rocking_chair');
    if (chair) {
      if (this.rocking) this.rockTime += dt;
      const target = this.rocking ? Math.sin(this.rockTime * 2.1) * 0.12 : 0;
      this.rockAngle = MathUtils.damp(this.rockAngle, target, 3, dt);
      turnLocal(chair, X_AXIS, this.rockAngle);
    }
    // security cameras
    for (const c of this.cams) {
      if (this.sweeping) c.phase += dt * 0.5;
      c.sweep = MathUtils.damp(c.sweep, this.sweeping ? Math.sin(c.phase) * 0.6 : 0, 4, dt);
      c.obj.quaternion.copy(c.baseQuat).premultiply(this.qTmp.setFromAxisAngle(UP, c.sweep));
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
    // the night outside: lamps, window light, mist, snow; and the moon through the windows inside
    this.outdoors?.update(cur?.def.id === 'exterior');
    this.moonBeams.update(cur ?? null);
    this.windowSnow.update(cur ?? null, this.d.renderer);
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
