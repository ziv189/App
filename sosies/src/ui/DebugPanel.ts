import GUI from 'lil-gui';
import { ToneMappingMode } from 'postprocessing';
import Stats from 'stats-gl';
import { DirectionalLight, PointLight, SpotLight, type FogExp2, type Scene, type WebGLRenderer } from 'three';
import type { LoadedLevel } from '../assets/Level';
import type { PlayerController } from '../player/PlayerController';
import { DEFAULT_LOOK, type LookSettings, type PostFX } from '../render/PostFX';

/**
 * Developer overlay, toggled with the ` key (left of 1):
 *  - stats-gl graphs (FPS, CPU and GPU frame time)
 *  - frame totals (draw calls, triangles, textures) and player state
 *  - lil-gui sliders for the look, lighting and movement feel (changes are not saved)
 */
export class DebugPanel {
  status = '';

  private visible = false;
  private readonly stats: Stats;
  private readonly gui: GUI;
  private readonly info: HTMLDivElement;
  private readonly look: LookSettings;
  private nextInfoUpdate = 0;

  constructor(
    private readonly renderer: WebGLRenderer,
    private readonly post: PostFX,
    private readonly player: PlayerController,
    private readonly scene: Scene,
    private readonly level: LoadedLevel,
    private readonly onRespawn: () => void,
  ) {
    this.stats = new Stats({ trackGPU: true, logsPerSecond: 4, samplesLog: 40, precision: 1, horizontal: true });
    // The raw GL context (not the renderer), so one sample = one whole frame rather than one pass.
    void this.stats.init(renderer.getContext());
    this.stats.dom.style.display = 'none';
    document.body.appendChild(this.stats.dom);

    this.info = document.createElement('div');
    this.info.id = 'debug-info';
    this.info.hidden = true;
    document.body.appendChild(this.info);

    this.look = { ...post.getLook() };
    this.gui = new GUI({ title: 'SOSIES debug  ( ` to hide )' });
    this.gui.hide();
    this.buildGui();
  }

  get isVisible(): boolean {
    return this.visible;
  }

  toggle(): void {
    this.visible = !this.visible;
    this.stats.dom.style.display = this.visible ? '' : 'none';
    this.info.hidden = !this.visible;
    this.gui.show(this.visible);
    Object.assign(this.look, this.post.getLook());
    this.gui.controllersRecursive().forEach((c) => c.updateDisplay());
  }

  beginFrame(): void {
    if (this.visible) this.stats.begin();
  }

  endFrame(now: number, pixelRatio: number): void {
    if (!this.visible) return;
    this.stats.end();
    this.stats.update();
    if (now < this.nextInfoUpdate) return;
    this.nextInfoUpdate = now + 250;

    const { render, memory, programs } = this.renderer.info;
    const canvas = this.renderer.domElement;
    const p = this.player.position;
    const deg = (r: number) => ((r * 180) / Math.PI).toFixed(0);
    this.info.textContent = [
      `state       ${this.status}`,
      `frame       ${render.calls} draw calls, ${render.triangles.toLocaleString('en-US')} triangles`,
      `gpu memory  ${memory.textures} textures, ${memory.geometries} geometries, ${programs?.length ?? 0} shaders`,
      `resolution  ${canvas.width}×${canvas.height} (pixel ratio ${pixelRatio.toFixed(2)})`,
      `position    ${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}  yaw ${deg(this.player.yaw)}°  pitch ${deg(this.player.pitch)}°`,
      `movement    ${this.player.horizontalSpeed.toFixed(2)} m/s, ${this.player.isGrounded ? 'grounded' : 'airborne'}${this.player.isCrouched ? ', crouched' : ''}`,
      `collision   ${this.level.collisionTriangles.toLocaleString('en-US')} triangles (${this.level.collisionSource})`,
    ].join('\n');
  }

  private buildGui(): void {
    const applyLook = () => this.post.setLook(this.look);
    const resetLook = () => {
      Object.assign(this.look, DEFAULT_LOOK, this.level.def.look);
      applyLook();
      this.gui.controllersRecursive().forEach((c) => c.updateDisplay());
    };

    const look = this.gui.addFolder('Look');
    look.add(this.look, 'exposure', 0.1, 4, 0.01).onChange(applyLook);
    look
      .add(this.look, 'toneMapping', {
        AgX: ToneMappingMode.AGX,
        'ACES Filmic': ToneMappingMode.ACES_FILMIC,
        'Khronos Neutral': ToneMappingMode.NEUTRAL,
        Reinhard: ToneMappingMode.REINHARD,
      })
      .name('tone mapping')
      .onChange(applyLook);
    look.add(this.look, 'bloomIntensity', 0, 3, 0.01).name('bloom').onChange(applyLook);
    look.add(this.look, 'bloomThreshold', 0, 2, 0.01).name('bloom threshold').onChange(applyLook);
    look.add(this.look, 'vignetteDarkness', 0, 1, 0.01).name('vignette').onChange(applyLook);
    look.add(this.look, 'grain', 0, 0.6, 0.01).name('film grain').onChange(applyLook);
    look.add(this.look, 'chromaticAberration', 0, 0.006, 0.0001).name('chromatic aberr.').onChange(applyLook);
    look.add(this.look, 'aoIntensity', 0, 8, 0.1).name('AO strength').onChange(applyLook);
    look.add(this.look, 'aoRadius', 0.1, 5, 0.05).name('AO radius (m)').onChange(applyLook);
    look.add({ resetLook }, 'resetLook').name('reset look');

    const lighting = this.gui.addFolder('Lighting');
    const scene = this.scene;
    lighting.add(scene, 'environmentIntensity', 0, 3, 0.01).name('sky light');
    lighting.add(scene, 'backgroundIntensity', 0, 3, 0.01).name('sky brightness');
    scene.traverse((obj) => {
      if (obj instanceof DirectionalLight) lighting.add(obj, 'intensity', 0, 10, 0.05).name(obj.name || 'sun');
      else if (obj instanceof SpotLight || obj instanceof PointLight) {
        lighting.add(obj, 'intensity', 0, 60, 0.1).name(obj.name || 'lamp');
      }
    });
    const fog = {
      get density() {
        return (scene.fog as FogExp2 | null)?.density ?? 0;
      },
      set density(v: number) {
        if (scene.fog) (scene.fog as FogExp2).density = v;
      },
    };
    lighting.add(fog, 'density', 0, 0.08, 0.001).name('fog');

    const move = this.gui.addFolder('Movement');
    const t = this.player.tuning;
    move.add(t, 'walkSpeed', 0.5, 4, 0.05).name('walk (m/s)');
    move.add(t, 'runSpeed', 1, 7, 0.05).name('run (m/s)');
    move.add(t, 'crouchSpeed', 0.3, 2, 0.05).name('crouch (m/s)');
    move.add(t, 'acceleration', 1, 30, 0.5).name('acceleration');
    move.add(t, 'deceleration', 1, 30, 0.5).name('deceleration');
    move.add(t, 'headBob', 0, 3, 0.05).name('head bob');
    move.add({ respawn: this.onRespawn }, 'respawn').name('back to start');

    lighting.close();
    move.close();
  }
}
