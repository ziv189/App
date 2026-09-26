import { PerspectiveCamera, Scene, Timer, type WebGLRenderer } from 'three';
import { Assets, ProgressTracker } from '../assets/Assets';
import { loadLevel, MissingAssetError, shadowLights, yieldToBrowser, type LevelDef, type LoadedLevel } from '../assets/Level';
import { Input } from '../input/Input';
import { verticalFovFromHorizontal16x9 } from '../input/math';
import { Physics } from '../physics/Physics';
import { PlayerController } from '../player/PlayerController';
import { createRenderer } from '../render/createRenderer';
import { DEFAULT_LOOK, PostFX } from '../render/PostFX';
import { pixelRatioFor, QUALITY_PRESETS, type QualityLevel } from '../render/quality';
import { DebugPanel } from '../ui/DebugPanel';
import { Overlay, type ScreenName } from '../ui/Overlay';
import { errorReport } from './diagnostics';
import { FixedStepLoop } from './FixedStepLoop';
import { SettingsStore } from './Settings';

export type GameState = 'loading' | 'ready' | 'playing' | 'paused' | 'error';

const SCREEN_FOR_STATE: Record<GameState, ScreenName> = {
  loading: 'loading',
  ready: 'start',
  playing: 'none',
  paused: 'pause',
  error: 'error',
};

/**
 * Owns the renderer, the main loop and the game's high-level state:
 * loading -> ready (start screen) -> playing <-> paused.
 */
export class Game {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(60, 1, 0.05, 250);
  readonly settings = new SettingsStore();
  readonly renderer: WebGLRenderer;
  player: PlayerController | null = null;
  level: LoadedLevel | null = null;

  private readonly input: Input;
  private readonly overlay: Overlay;
  private readonly post: PostFX;
  private readonly timer = new Timer();
  private readonly loop = new FixedStepLoop(1 / 60);
  private physics: Physics | null = null;
  private debug: DebugPanel | null = null;
  private state: GameState = 'loading';
  private appliedQuality: QualityLevel | null = null;
  private pixelRatio = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = createRenderer(canvas);
    this.input = new Input(canvas);
    this.overlay = new Overlay(this.settings);
    this.post = new PostFX(this.renderer, this.scene, this.camera);
    this.timer.connect(document);

    this.overlay.onStart = () => this.play();
    this.overlay.onResume = () => this.play();
    this.input.onPointerLockFailed = () => this.onPointerLockFailed();
    this.settings.onChange(() => this.applySettings());
    window.addEventListener('resize', () => this.resize());
    // Switching windows pauses even when playing with a controller (no mouse capture to lose).
    window.addEventListener('blur', () => {
      if (this.state === 'playing') this.pause();
    });
    document.addEventListener('pointerlockchange', () => this.onPointerLockChange());
    canvas.addEventListener('click', () => {
      // Playing with a controller, then clicking: hand look control back to the mouse.
      if (this.state === 'playing' && !this.input.pointerLocked) this.input.requestPointerLock();
    });
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.fail(new Error('The graphics driver stopped responding (WebGL context lost). Reload the page.'));
    });
    this.resize();
  }

  get currentState(): GameState {
    return this.state;
  }

  async start(def: LevelDef): Promise<void> {
    this.setState('loading');
    const progress = new ProgressTracker((fraction, status) => this.overlay.setProgress(fraction, status));
    try {
      progress.setStatus('Starting physics');
      this.physics = await Physics.create();
      this.player = new PlayerController(this.physics, this.camera);

      const assets = new Assets(this.renderer);
      const level = await loadLevel(def, this.scene, this.renderer, assets, this.physics, progress);
      this.level = level;
      this.post.setLook({ ...DEFAULT_LOOK, ...def.look });
      this.applySettings();

      // Upload textures and compile shaders now, so the first seconds of play don't stutter.
      progress.setStatus('Preparing textures');
      await yieldToBrowser();
      for (const texture of level.textures) this.renderer.initTexture(texture);
      progress.setStatus('Compiling shaders');
      await yieldToBrowser();
      this.player.teleport(level.spawn.feet, level.spawn.yaw);
      this.player.update(0, 1, { x: 0, y: 0 }, false);
      await this.renderer.compileAsync(this.scene, this.camera);
      this.post.render(0);

      this.debug = new DebugPanel(this.renderer, this.post, this.player, this.scene, level, () => this.respawn());
      this.overlay.setWatermark(def.watermark);
      this.overlay.setStartCredits(def.credits);
      this.overlay.setStartSubtitle(
        `${def.title}. A furnished test room (not SOSIES content) for checking movement, collision, ` +
          `lighting and performance on your PC.`,
      );
      this.setState('ready');
      this.timer.reset();
      this.renderer.setAnimationLoop((time) => this.frame(time));
    } catch (err) {
      this.fail(err);
    }
  }

  /** Puts Daniel back at the level's start point. */
  respawn(): void {
    if (this.player && this.level) this.player.teleport(this.level.spawn.feet, this.level.spawn.yaw);
  }

  private frame(time: number): void {
    this.timer.update(time);
    const dt = this.timer.getDelta();
    this.renderer.info.reset();

    const player = this.player;
    const physics = this.physics;
    const input = this.input.poll(dt, this.settings.get());
    if (input.debugPressed) this.debug?.toggle();

    if (this.state === 'playing' && player && physics) {
      if (input.pausePressed) {
        this.pause();
      } else {
        if (input.crouchPressed) player.toggleCrouch();
        const alpha = this.loop.advance(dt, (step) => {
          player.fixedUpdate(step, input);
          physics.step(step);
        });
        player.update(dt, alpha, input.look, this.settings.get().headBob);
      }
    } else if ((this.state === 'ready' || this.state === 'paused') && input.gamepadConfirmPressed) {
      this.setState('playing');
    }

    if (this.debug) this.debug.status = `${this.state} (${input.device === 'gamepad' ? 'controller' : 'mouse & keyboard'})`;
    this.debug?.beginFrame();
    this.post.render(dt);
    this.debug?.endFrame(time, this.pixelRatio);
  }

  private play(): void {
    if (this.state !== 'ready' && this.state !== 'paused') return;
    if (this.input.dragLook) {
      this.setState('playing');
      return;
    }
    // Mouse players: capture the mouse (onPointerLockChange then switches to playing).
    this.input.requestPointerLock();
  }

  private onPointerLockFailed(): void {
    if (this.state === 'ready') {
      // This page can't capture the mouse at all (some embedded views): play with drag-to-look instead.
      this.input.dragLook = true;
      this.overlay.setHudHint('Hold the left mouse button and drag to look around · Esc pauses');
      this.setState('playing');
    } else if (this.state === 'paused') {
      // Usually the browser's short cool-down after Esc.
      this.overlay.showLockHint('The browser did not hand over the mouse. Wait a second and click Resume again.');
    }
  }

  private pause(): void {
    this.setState('paused');
    this.input.exitPointerLock();
  }

  private onPointerLockChange(): void {
    if (this.input.pointerLocked) {
      if (this.state === 'ready' || this.state === 'paused') this.setState('playing');
    } else if (this.state === 'playing') {
      // Esc (or alt-tab) released the mouse.
      this.setState('paused');
    }
  }

  private setState(state: GameState): void {
    if (this.state === 'error') return;
    this.state = state;
    this.input.captureKeys = state === 'playing';
    this.overlay.show(SCREEN_FOR_STATE[state]);
    if (state === 'playing') this.loop.reset();
  }

  private applySettings(): void {
    const s = this.settings.get();
    const preset = QUALITY_PRESETS[s.quality];
    if (s.quality !== this.appliedQuality) {
      this.appliedQuality = s.quality;
      this.post.applyQuality(preset);
      for (const light of shadowLights(this.scene)) {
        light.shadow.mapSize.set(preset.shadowMapSize, preset.shadowMapSize);
        light.shadow.map?.dispose();
        light.shadow.map = null;
      }
      const anisotropy = Math.min(preset.anisotropy, this.renderer.capabilities.getMaxAnisotropy());
      for (const texture of this.level?.textures ?? []) {
        if (texture.anisotropy !== anisotropy) {
          texture.anisotropy = anisotropy;
          texture.needsUpdate = true;
        }
      }
    }
    this.camera.fov = verticalFovFromHorizontal16x9(s.fov);
    this.resize();
  }

  private resize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.pixelRatio = pixelRatioFor(QUALITY_PRESETS[this.settings.get().quality], window.devicePixelRatio || 1);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.post.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private fail(err: unknown): void {
    console.error(err);
    const detail = err instanceof Error ? err.message : String(err);
    const message =
      err instanceof MissingAssetError
        ? err.message
        : errorReport(`${detail}\n\nAlso send anything red from the browser console (F12).`);
    this.overlay.showError(message);
    this.state = 'error';
    this.input.captureKeys = false;
    this.input.exitPointerLock();
  }
}
