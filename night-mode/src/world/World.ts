import {
  CubeCamera,
  DataUtils,
  DoubleSide,
  EquirectangularReflectionMapping,
  FloatType,
  HalfFloatType,
  MathUtils,
  PointLight,
  ShaderMaterial,
  WebGLCubeRenderTarget,
  type DataTexture,
  type Material,
  type Mesh,
  type Object3D,
  type Scene,
  type Texture,
  type WebGLRenderer,
} from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { assetUrl, type Assets } from '../assets/Assets';
import type { Physics } from '../physics/Physics';
import { createNightFog } from '../render/HeightFog';
import { NIGHT } from '../render/nightConfig';
import { NightSky, nightTime } from '../render/NightSky';
import { captureReflectionProbe } from '../render/ReflectionProbe';
import { Cell, type CellDef, type CellId } from './Cell';
import { CELLS, DOOR_LINKS } from './cells';

/**
 * All rooms of the house. They share the origin; only the current one is shown and has collision.
 * Rooms load in the background in story order, so play can start as soon as the first two are ready.
 */
/** Materials of the house itself in the exterior scene: left out of the view captured from inside it. */
const HOUSE_MATERIALS =
  /^(WhitePaint|RoofTiles|WhiteDiffuse|BlackDiffuse|Pink|BrickTextureBase|GarageDoorBase|DeckWoodBase|Brown|DarkerGrey|NM_WindowGlow|NM_Keypad|security_camera)/;
/** Where the outdoor view is seen from: the middle of the house at first-floor eye height (exterior space). */
const OUTDOOR_VIEW_POINT = [-5.5, 1.25, -5.8] as const;

export class World {
  readonly cells = new Map<CellId, Cell>();
  current: Cell | null = null;
  /** Global lighting targets the rooms ease towards: 0 = house lights on, 1 = moonlight only. */
  nightTarget = 0;
  brightnessTarget = 1;
  /** Blue accent lights of Night Mode. */
  nightModeLights = false;
  /** Anisotropic filtering for the rooms' textures (quality preset): keeps the floors and the snow sharp at low angles. */
  private anisotropy = 1;
  exposure = 1;
  private readonly loading = new Map<CellId, Promise<Cell>>();
  private readonly skies = new Map<string, Promise<Texture>>();
  private readonly accentLights: PointLight[] = [];
  private probeDirty = true;
  private probeTimer = 0;
  flicker = 0;
  private flickerPhase = 0;
  /** Replaces the current room's sky grading (e.g. dawn behind the "Goodnight" ending). */
  private skyOverride: { intensity: number; tint: [number, number, number] } | null = null;
  /** The outdoors seen from inside the house, per lighting state (lamps on, moonlight); see captureOutdoorViews. */
  private outdoorViews: [WebGLCubeRenderTarget, WebGLCubeRenderTarget] | null = null;
  private capturingOutdoors: Promise<void> | null = null;
  private outdoorState = -1;
  /** The night sky and fog outdoors (see render/NightSky.ts, render/HeightFog.ts and render/nightConfig.ts). */
  readonly nightSky = new NightSky();
  readonly nightFog = createNightFog();

  constructor(
    private readonly scene: Scene,
    private readonly renderer: WebGLRenderer,
    private readonly assets: Assets,
    private readonly physics: Physics,
  ) {
    for (let i = 0; i < 3; i++) {
      const l = new PointLight(0x3f6dff, 0, 5, 2);
      l.visible = false;
      scene.add(l);
      this.accentLights.push(l);
    }
    this.nightSky.mesh.visible = false;
    scene.add(this.nightSky.mesh);
  }

  def(id: CellId): CellDef {
    const d = CELLS.find((c) => c.id === id);
    if (!d) throw new Error(`Unknown room ${id}`);
    return d;
  }

  /** Loads a room (once); later calls return the same promise. */
  load(id: CellId, onProgress?: (e: ProgressEvent) => void): Promise<Cell> {
    let p = this.loading.get(id);
    if (!p) {
      p = Cell.load(this.def(id), this.assets, this.physics, onProgress).then((cell) => {
        this.cells.set(id, cell);
        this.applyAnisotropy(cell, false);
        this.scene.add(cell.root);
        // doors that open onto the outdoors show them: the black backing of the doorway becomes a
        // window onto the outdoor view (the rooms are separate spaces, with wall behind their doors)
        if (!cell.def.exterior) {
          for (const doorId of cell.doors.keys()) {
            if (this.destination(id, doorId)?.cell !== 'exterior') continue;
            const gap = cell.root.getObjectByName(`door_${doorId}_gap`) as Mesh | undefined;
            if (gap?.isMesh) gap.material = this.portal;
          }
        }
        return cell;
      });
      this.loading.set(id, p);
    }
    return p;
  }

  loaded(id: CellId): boolean {
    return this.cells.has(id);
  }

  /** Links a door of one room to the matching door of another. */
  destination(cellId: CellId, doorId: string): { cell: CellId; door: string } | null {
    for (const [a, b] of DOOR_LINKS) {
      if (a[0] === cellId && a[1] === doorId) return { cell: b[0], door: b[1] };
      if (b[0] === cellId && b[1] === doorId) return { cell: a[0], door: a[1] };
    }
    return null;
  }

  /** Makes a loaded room the current one. */
  async activate(id: CellId): Promise<Cell> {
    const cell = await this.load(id);
    const previous = this.current;
    if (previous && previous !== cell) previous.setActive(false);
    this.current = cell;
    cell.setActive(true);
    this.physics.refresh();
    // Free the GPU copies of rooms two steps away (all eight rooms' textures and lightmaps would take
    // ~700 MB). They upload again the next time they're drawn, behind a door's fade.
    for (const other of this.cells.values()) {
      if (other !== cell && other !== previous) for (const t of other.textures) t.dispose();
    }
    cell.night = this.nightTarget;
    cell.brightness = this.brightnessTarget;
    cell.applyLighting();
    // the first time indoors, render the view out of the windows (behind the door's fade)
    if (!cell.def.exterior && !this.outdoorViews && this.cells.has('exterior')) await this.captureOutdoorViews();
    await this.applySky(cell);
    this.placeAccentLights(cell);
    this.probeDirty = true;
    this.updateProbe(true);
    return cell;
  }

  private sky(name: string, intensity: number, tint: [number, number, number]): Promise<Texture> {
    const key = `${name}:${intensity}:${tint.join(',')}`;
    let p = this.skies.get(key);
    if (!p) {
      p = (async () => {
        const loader = new HDRLoader().setDataType(FloatType);
        const url = assetUrl(`assets/sky/${name}.hdr`);
        const tex: DataTexture = url.endsWith('.b64.txt')
          ? await this.assets.loadHdr(url)
          : await loader.loadAsync(url);
        const data = tex.image.data as Float32Array | Uint16Array;
        // Day-for-night grading: darken and cool the photographed sky once, on load. The packed build
        // decodes skies to half floats.
        const k = [tint[0] * intensity, tint[1] * intensity, tint[2] * intensity];
        // (the sun, graded down, becomes a moon; clamped so it stays a disc rather than a flare)
        const MAX = 40;
        if (data instanceof Float32Array) {
          for (let i = 0; i < data.length; i += 4) for (let c = 0; c < 3; c++) data[i + c] = Math.min(MAX, data[i + c]! * k[c]!);
        } else {
          for (let i = 0; i < data.length; i += 4) {
            for (let c = 0; c < 3; c++) data[i + c] = DataUtils.toHalfFloat(Math.min(MAX, DataUtils.fromHalfFloat(data[i + c]!) * k[c]!));
          }
        }
        tex.needsUpdate = true;
        tex.mapping = EquirectangularReflectionMapping;
        return tex;
      })();
      this.skies.set(key, p);
    }
    return p;
  }

  /**
   * Renders the real outdoors (the snowy yard, fences, the pine forest, the lake) into cube maps seen from
   * inside the house, once per lighting state, with the house itself left out. Indoor rooms show them
   * behind their windows and through doors that open outside, instead of a photographed sky.
   */
  captureOutdoorViews(): Promise<void> {
    this.capturingOutdoors ??= (async () => {
      const ext = await this.load('exterior');
      const targets: [WebGLCubeRenderTarget, WebGLCubeRenderTarget] = [
        new WebGLCubeRenderTarget(512, { type: HalfFloatType }),
        new WebGLCubeRenderTarget(512, { type: HalfFloatType }),
      ];
      const camera = new CubeCamera(0.1, 900, targets[0]);
      camera.position.set(...OUTDOOR_VIEW_POINT);

      const roots = new Map<Object3D, boolean>();
      for (const c of this.cells.values()) {
        roots.set(c.root, c.root.visible);
        c.root.visible = c === ext;
      }
      const hidden: Material[] = [];
      const unseen: Object3D[] = [];
      ext.root.traverse((o) => {
        // things that move (the falling snow) would freeze in the picture
        if (o.userData.noCapture && o.visible) {
          o.visible = false;
          unseen.push(o);
        }
        if (!(o as Mesh).isMesh) return;
        const list = (o as Mesh).material;
        for (const m of Array.isArray(list) ? list : [list]) {
          if (m.visible && HOUSE_MATERIALS.test(m.name)) {
            m.visible = false;
            hidden.push(m);
          }
        }
      });
      const saved = {
        background: this.scene.background,
        intensity: this.scene.backgroundIntensity,
        rotation: this.scene.backgroundRotation.clone(),
        environment: this.scene.environment,
        fog: this.scene.fog,
        skyVisible: this.nightSky.mesh.visible,
        night: ext.night,
        brightness: ext.brightness,
      };
      const accents = this.accentLights.map((l) => l.visible);
      for (const l of this.accentLights) l.visible = false;
      this.scene.background = null;
      this.nightSky.mesh.visible = true;
      this.scene.fog = this.nightFog;
      this.scene.environment = null;
      try {
        for (const [i, night] of [0, 1].entries()) {
          ext.night = night;
          ext.brightness = 1;
          ext.applyLighting();
          camera.renderTarget = targets[i]!;
          camera.update(this.renderer, this.scene);
        }
      } finally {
        for (const m of hidden) m.visible = true;
        for (const o of unseen) o.visible = true;
        for (const [root, visible] of roots) root.visible = visible;
        this.accentLights.forEach((l, i) => (l.visible = accents[i]!));
        this.scene.background = saved.background;
        this.scene.backgroundIntensity = saved.intensity;
        this.scene.backgroundRotation.copy(saved.rotation);
        this.scene.environment = saved.environment;
        this.scene.fog = saved.fog;
        this.nightSky.mesh.visible = saved.skyVisible;
        ext.night = saved.night;
        ext.brightness = saved.brightness;
        ext.applyLighting();
      }
      this.outdoorExposure = [NIGHT.exposure.exteriorOn, NIGHT.exposure.exteriorMoon];
      this.outdoorViews = targets;
      this.outdoorState = -1;
      if (this.current && !this.current.def.exterior) {
        await this.applySky(this.current);
        this.probeDirty = true;
      }
    })();
    return this.capturingOutdoors;
  }

  private outdoorExposure: [number, number] = [1, 1];

  /** Draws the outdoor view as if the surface were a hole in the wall (doorways that lead outside). */
  private readonly portal = new ShaderMaterial({
    side: DoubleSide,
    uniforms: { view: { value: null }, intensity: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform samplerCube view;
      uniform float intensity;
      varying vec3 vWorld;
      void main() {
        gl_FragColor = vec4(textureCube(view, normalize(vWorld - cameraPosition)).rgb * intensity, 1.0);
      }`,
  });

  /** Shows the outdoor view that matches the room's lighting (lamps on, or moonlight). */
  private showOutdoorView(cell: Cell): boolean {
    if (!this.outdoorViews || cell.def.exterior) return false;
    const state = cell.night >= 0.5 ? 1 : 0;
    this.scene.background = this.outdoorViews[state].texture;
    this.scene.backgroundRotation.set(0, 0, 0);
    // a little darker than standing outside: eyes used to a lit room see less of the night
    this.scene.backgroundIntensity = (0.7 * this.outdoorExposure[state]) / Math.max(0.2, cell.targetExposure);
    this.portal.uniforms.view!.value = this.outdoorViews[state].texture;
    this.portal.uniforms.intensity!.value = this.scene.backgroundIntensity;
    if (state !== this.outdoorState) this.probeDirty = true;
    this.outdoorState = state;
    return true;
  }

  /** Re-grades the sky of the current room (null: back to its own). */
  async setSkyMood(mood: { intensity: number; tint: [number, number, number] } | null): Promise<void> {
    this.skyOverride = mood;
    if (this.current) await this.applySky(this.current);
  }

  /** True while the sky is re-graded for dawn (the day look: no night sky, fog or night grade). */
  get dawn(): boolean {
    return this.skyOverride !== null && Boolean(this.current?.def.exterior);
  }

  private async applySky(cell: Cell): Promise<void> {
    // outdoors at night: the procedural sky and the height fog; indoors: neither (the windows show the
    // captured outdoors)
    const night = Boolean(cell.def.exterior) && !this.skyOverride;
    cell.dawn = Boolean(cell.def.exterior) && this.skyOverride !== null;
    this.nightSky.mesh.visible = night;
    if (cell.def.exterior) this.scene.fog = night ? this.nightFog : null;
    else if (this.scene.fog === this.nightFog) this.scene.fog = null;
    if (night) {
      this.scene.background = null;
      return;
    }
    if (this.showOutdoorView(cell)) return;
    const s = cell.def.sky;
    if (!s) {
      this.scene.background = null;
      return;
    }
    const o = this.skyOverride;
    const tex = await this.sky(s.hdri, o?.intensity ?? s.intensity, o?.tint ?? s.tint);
    this.scene.background = tex;
    this.scene.backgroundIntensity = 1;
    this.scene.backgroundRotation.set(0, MathUtils.degToRad(s.rotationDeg ?? 0), 0);
  }

  private placeAccentLights(cell: Cell): void {
    this.accentLights.forEach((l, i) => {
      const p = cell.def.nightLights[i];
      l.visible = Boolean(p);
      if (p) l.position.set(p[0], p[1], p[2]);
    });
  }

  /** Sets the anisotropic filtering of every room's textures (from the quality preset, capped by the GPU). */
  setAnisotropy(level: number): void {
    const n = Math.max(1, Math.min(level, this.renderer.capabilities.getMaxAnisotropy()));
    if (n === this.anisotropy) return;
    this.anisotropy = n;
    for (const cell of this.cells.values()) this.applyAnisotropy(cell, true);
  }

  private applyAnisotropy(cell: Cell, reupload: boolean): void {
    for (const t of cell.textures) {
      // colour, normal and roughness maps (the lightmaps have no mipmaps: nothing to filter)
      if (!t.generateMipmaps || t.anisotropy === this.anisotropy) continue;
      t.anisotropy = this.anisotropy;
      if (reupload) t.needsUpdate = true;
    }
  }

  /** Re-reads the night config (sky, fog) after it changed. */
  applyNight(): void {
    this.nightSky.apply();
    this.nightFog.color.set(NIGHT.fog.color);
    this.nightFog.density = NIGHT.fog.density;
    this.probeDirty = true;
  }

  /** Re-captures reflections after the lighting has changed noticeably. */
  markProbeDirty(): void {
    this.probeDirty = true;
  }

  private updateProbe(force = false): void {
    const cell = this.current;
    if (!cell || (!this.probeDirty && !force)) return;
    this.probeDirty = false;
    const old = this.scene.environment;
    const accent = this.accentLights.map((l) => l.visible);
    this.scene.environment = captureReflectionProbe(this.renderer, this.scene, cell.def.probe, 128);
    this.scene.environmentIntensity = cell.def.exterior ? 0.6 : 0.8;
    this.accentLights.forEach((l, i) => (l.visible = accent[i]!));
    old?.dispose();
  }

  update(dt: number): void {
    nightTime.value += dt;
    this.nightSky.update(dt);
    const cell = this.current;
    if (!cell) return;
    const beforeNight = cell.night;
    cell.night = MathUtils.damp(cell.night, this.nightTarget, 1.6, dt);
    if (Math.abs(cell.night - this.nightTarget) < 0.002) cell.night = this.nightTarget;
    // Flicker: the house playing with the lights (random dips while `flicker` > 0).
    let flickerMul = 1;
    if (this.flicker > 0) {
      this.flickerPhase += dt * 23;
      const n = Math.sin(this.flickerPhase) * Math.sin(this.flickerPhase * 2.7 + 1.3) * Math.sin(this.flickerPhase * 0.61);
      flickerMul = 1 - this.flicker * (n > 0.15 ? 0.85 : n > -0.2 ? 0.1 : 0.45);
    }
    cell.brightness = MathUtils.damp(cell.brightness, this.brightnessTarget, 3, dt) ;
    const b = cell.brightness;
    cell.brightness = b * flickerMul;
    cell.applyLighting();
    cell.brightness = b;
    const accentOn = this.nightModeLights && this.brightnessTarget > 0.2;
    for (const l of this.accentLights) l.intensity = MathUtils.damp(l.intensity, accentOn ? 1.2 * flickerMul : 0, 2, dt);
    this.exposure = MathUtils.damp(this.exposure, cell.targetExposure, 1.5, dt);
    if (this.outdoorViews && !cell.def.exterior) this.showOutdoorView(cell);
    if (Math.abs(beforeNight - cell.night) > 0.0005) this.probeTimer += dt;
    if (this.probeTimer > 0.6 || (this.probeTimer > 0 && cell.night === this.nightTarget)) {
      this.probeTimer = 0;
      this.probeDirty = true;
    }
    this.updateProbe();
  }
}
