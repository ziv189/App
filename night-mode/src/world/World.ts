import {
  DataUtils,
  EquirectangularReflectionMapping,
  FloatType,
  MathUtils,
  PointLight,
  type DataTexture,
  type Scene,
  type Texture,
  type WebGLRenderer,
} from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { assetUrl, type Assets } from '../assets/Assets';
import type { Physics } from '../physics/Physics';
import { captureReflectionProbe } from '../render/ReflectionProbe';
import { Cell, type CellDef, type CellId } from './Cell';
import { CELLS, DOOR_LINKS } from './cells';

/**
 * All rooms of the house. They share the origin; only the current one is shown and has collision.
 * Rooms load in the background in story order, so play can start as soon as the first two are ready.
 */
export class World {
  readonly cells = new Map<CellId, Cell>();
  current: Cell | null = null;
  /** Global lighting targets the rooms ease towards: 0 = house lights on, 1 = moonlight only. */
  nightTarget = 0;
  brightnessTarget = 1;
  /** Blue accent lights of Night Mode. */
  nightModeLights = false;
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
        this.scene.add(cell.root);
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
    if (this.current && this.current !== cell) this.current.setActive(false);
    this.current = cell;
    cell.setActive(true);
    cell.night = this.nightTarget;
    cell.brightness = this.brightnessTarget;
    cell.applyLighting();
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

  /** Re-grades the sky of the current room (null: back to its own). */
  async setSkyMood(mood: { intensity: number; tint: [number, number, number] } | null): Promise<void> {
    this.skyOverride = mood;
    if (this.current) await this.applySky(this.current);
  }

  private async applySky(cell: Cell): Promise<void> {
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
    if (Math.abs(beforeNight - cell.night) > 0.0005) this.probeTimer += dt;
    if (this.probeTimer > 0.6 || (this.probeTimer > 0 && cell.night === this.nightTarget)) {
      this.probeTimer = 0;
      this.probeDirty = true;
    }
    this.updateProbe();
  }
}
