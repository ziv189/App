import {
  Box3,
  Color,
  Group,
  MathUtils,
  Vector3,
  type DataTexture,
  type Material,
  type Mesh,
  type MeshPhysicalMaterial,
  type MeshStandardMaterial,
  type Object3D,
  type Texture,
} from 'three';
import { assetUrl, type Assets } from '../assets/Assets';
import { RAPIER, type Physics } from '../physics/Physics';
import { applyLightmaps, type LightmapUniforms } from '../render/Lightmap';
import { applySnowCover } from '../render/Snow';
import { plantTrees } from './Trees';

/** Outside, snow settles on everything facing up except these (the snow itself, ice, glass, the porch floors). */
const NO_SNOW = /^(NM_Snow|NM_Ice|NM_WindowGlow|NM_TreeCards|NM_Keypad|NM_Lamp|DeckWoodBase)/;

export type CellId = 'exterior' | 'hall' | 'living' | 'kitchen' | 'bedroom' | 'bathroom' | 'ivy' | 'basement';
export type SurfaceKind = 'wood' | 'tile' | 'concrete' | 'snow';
export type ReverbKind = 'room' | 'hall' | 'small' | 'basement' | 'outdoor';

export interface CellDef {
  id: CellId;
  title: string;
  /** Path inside /public. */
  file: string;
  approxBytes: number;
  footsteps: SurfaceKind;
  reverb: ReverbKind;
  /** Looping ambience while the player is in this room: sound name and volume. */
  ambience: { sound: string; volume: number }[];
  /** Sky seen through the windows (HDRI name, brightness, colour grading), or null for none. */
  sky: { hdri: string; intensity: number; tint: [number, number, number]; rotationDeg?: number } | null;
  /** Game-space positions of Night Mode's blue accent lights. */
  nightLights: [number, number, number][];
  /** Reflection probe position (game space). */
  probe: [number, number, number];
  exterior?: boolean;
  /** Camera exposure per lighting state, overriding the value baked into the room file. */
  exposure?: { on?: number; moon?: number };
  /**
   * Invisible ramps laid over staircases (game space): `from`/`to` are the bottom and top of the flight's
   * walking line, through the step edges.
   */
  ramps?: { from: [number, number, number]; to: [number, number, number]; width: number }[];
  /** Invisible floor boxes (game space, top at max[1]) that patch holes in a room's collision. */
  floors?: { min: [number, number, number]; max: [number, number, number] }[];
  /**
   * Colours for the room's materials by name (hex): the source scenes are mostly white and grey. The
   * colour multiplies the material's texture, and the baked light still falls on it.
   */
  palette?: Record<string, string>;
  /** Mirrors that reflect the room for real (game space): centre, size, and the direction they face. */
  mirrors?: { center: [number, number, number]; width: number; height: number; yawDeg: number }[];
}

interface CellMeta {
  room?: string;
  states?: string[];
  lightmaps?: Record<string, string>;
  exposure?: Record<string, number>;
}

interface EmissiveEntry {
  material: MeshStandardMaterial;
  color: Color;
  intensity: number;
  states: Set<string>;
  /** Extra multiplier set by the story (windows blazing, a screen going dark). */
  boost: number;
}

/** Glass from the rendering scenes becomes cheap transparent glass (no refraction pass). */
function convertGlass(mat: MeshPhysicalMaterial): void {
  mat.transmission = 0;
  mat.transparent = true;
  mat.opacity = 0.14;
  mat.roughness = 0.04;
  mat.metalness = 0;
  mat.depthWrite = false;
  mat.envMapIntensity = 2.2;
  mat.color.setRGB(0.85, 0.9, 1.0);
}

/**
 * One room (or the garden): its scene graph, collision, baked lighting states and the named things the
 * story talks to. Every room is built around the origin; only the current one is visible and solid.
 */
export class Cell {
  readonly markers = new Map<string, Object3D>();
  readonly proxies: Mesh[] = [];
  readonly dynamic = new Map<string, Object3D>();
  readonly doors = new Map<string, { leaf: Object3D; sign: number; closedY: number }>();
  readonly lightmap: LightmapUniforms = {
    lightMap2: { value: null },
    lightMapMix: { value: 0 },
    lightMapScale: { value: 1 },
    lightMap2Tint: { value: new Color(1, 1, 1) },
  };
  readonly bounds = new Box3();
  readonly textures: Texture[] = [];
  lightmapMaterials: MeshStandardMaterial[] = [];
  collider: RAPIER.Collider | null = null;
  /** Ramps and floor patches from the cell definition, switched on and off with the room. */
  readonly extraColliders: RAPIER.Collider[] = [];
  exposure: Record<string, number> = { on: 1, moon: 2.4 };
  sky: Texture | null = null;
  /** 0 = the lights of the house are on, 1 = only moonlight. */
  night = 0;
  /** Extra multiplier on the baked light (flicker, power cut). */
  brightness = 1;
  private readonly emissive: EmissiveEntry[] = [];

  private constructor(
    readonly def: CellDef,
    readonly root: Group,
  ) {}

  static async load(def: CellDef, assets: Assets, physics: Physics, onProgress?: (e: ProgressEvent) => void): Promise<Cell> {
    const gltf = await assets.loadGltf(assetUrl(def.file), onProgress);
    const root = new Group();
    root.name = `cell:${def.id}`;
    root.add(gltf.scene);
    const cell = new Cell(def, root);
    const meta: CellMeta = typeof gltf.scene.userData.nm === 'string' ? JSON.parse(gltf.scene.userData.nm) : {};
    cell.exposure = { on: 1, moon: 2.4, ...meta.exposure, ...def.exposure };
    // moonlight indoors reads colder than the bake's physically warm-ish bounce off wood and wallpaper
    // moonlight indoors is cold, but not so blue that the rooms lose their colours
    if (!def.exterior) cell.lightmap.lightMap2Tint!.value.setRGB(0.8, 0.88, 1.06);
    root.updateMatrixWorld(true);

    const folder = def.file.slice(0, def.file.lastIndexOf('/') + 1);
    const lm = meta.lightmaps ?? {};
    const [on, moon] = await Promise.all([
      lm.on ? assets.loadExr(assetUrl(folder + lm.on)) : Promise.resolve(null as DataTexture | null),
      lm.moon ? assets.loadExr(assetUrl(folder + lm.moon)) : Promise.resolve(null as DataTexture | null),
    ]);
    if (on) cell.lightmapMaterials = applyLightmaps(root, on, moon, cell.lightmap);

    let colMesh: Mesh | null = null;
    const seenMaterials = new Set<Material>();
    root.traverse((obj) => {
      const name = obj.name;
      if (name.startsWith('M_')) {
        cell.markers.set(name.slice(2), obj);
        return;
      }
      const mesh = obj as Mesh;
      if (name.startsWith('I_') && mesh.isMesh) {
        mesh.visible = false;
        mesh.userData.interact ??= name.slice(2);
        cell.proxies.push(mesh);
        return;
      }
      if (name === 'COL_static') {
        colMesh = mesh;
        mesh.visible = false;
        return;
      }
      if (name.startsWith('DYN_')) {
        cell.dynamic.set(name.slice(4), obj);
        if (obj.userData.hidden) obj.visible = false;
        if (obj.userData.door) {
          cell.doors.set(String(obj.userData.door), {
            leaf: obj,
            sign: Number(obj.userData.open_sign ?? -1),
            closedY: obj.rotation.y,
          });
        }
      }
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as MeshStandardMaterial[];
      for (const mat of mats) {
        if (seenMaterials.has(mat)) continue;
        seenMaterials.add(mat);
        if (mat.userData.sosies_glass) {
          convertGlass(mat as MeshPhysicalMaterial);
          mesh.renderOrder = 2;
          mesh.castShadow = false;
        }
        if (mat.userData.nm_emit_states) {
          cell.emissive.push({
            material: mat,
            color: mat.emissive.clone(),
            intensity: mat.emissiveIntensity,
            states: new Set(String(mat.userData.nm_emit_states).split(',')),
            boost: 1,
          });
        }
        if (def.exterior && !NO_SNOW.test(mat.name) && !mat.transparent && 'roughness' in mat) applySnowCover(mat);
        const paint = def.palette?.[mat.name];
        if (paint && 'color' in mat) (mat as MeshStandardMaterial).color.set(paint);
        for (const value of Object.values(mat)) if ((value as Texture | null)?.isTexture) cell.textures.push(value as Texture);
      }
    });
    if (on) cell.textures.push(on);
    if (moon) cell.textures.push(moon);

    if (colMesh) {
      const added = physics.addCollider([colMesh]);
      cell.collider = added?.collider ?? null;
      cell.collider?.setEnabled(false);
    }
    for (const r of def.ramps ?? []) cell.extraColliders.push(physics.addRamp(new Vector3(...r.from), new Vector3(...r.to), r.width));
    for (const f of def.floors ?? []) {
      const min = new Vector3(...f.min);
      const max = new Vector3(...f.max);
      cell.extraColliders.push(physics.addBox(min.clone().add(max).multiplyScalar(0.5), max.clone().sub(min).multiplyScalar(0.5)));
    }
    if (def.exterior) {
      // real 3D firs in place of the picture-card forest (see Trees.ts), solid to walk into
      const collider = cell.collider;
      const trees = plantTrees(root, (x, z) => {
        if (!collider) return null;
        const toi = collider.castRay(new RAPIER.Ray({ x, y: 120, z }, { x: 0, y: -1, z: 0 }), 300, true);
        return toi >= 0 ? 120 - toi : null;
      });
      cell.extraColliders.push(...physics.addCylinders(trees));
    }
    for (const c of cell.extraColliders) c.setEnabled(false);
    cell.bounds.setFromObject(gltf.scene);
    root.visible = false;
    return cell;
  }

  marker(name: string): Object3D {
    const m = this.markers.get(name);
    if (!m) throw new Error(`${this.def.id}: no marker ${name}`);
    return m;
  }

  markerPosition(name: string, out = new Vector3()): Vector3 {
    return this.marker(name).getWorldPosition(out);
  }

  /** Yaw (radians, 0 = looking down -Z) the marker faces. */
  markerYaw(name: string): number {
    const m = this.marker(name);
    const dir = new Vector3(0, 0, -1).applyQuaternion(m.getWorldQuaternion(m.quaternion.clone()));
    return Math.atan2(-dir.x, -dir.z);
  }

  setActive(active: boolean): void {
    this.root.visible = active;
    this.collider?.setEnabled(active);
    for (const c of this.extraColliders) c.setEnabled(active);
  }

  /** How open a door leaf is (0..1 of ~80 degrees). */
  setDoorOpen(doorId: string, amount: number): void {
    const d = this.doors.get(doorId);
    if (!d) return;
    d.leaf.rotation.y = d.closedY + d.sign * MathUtils.degToRad(80) * amount;
  }

  /** Multiplies the glow of the materials whose name matches (e.g. the windows lighting up one by one). */
  setGlow(pattern: RegExp, boost: number): void {
    for (const e of this.emissive) if (pattern.test(e.material.name)) e.boost = boost;
  }

  /** Updates the baked light blend, glowing materials and the exposure hint for the current state. */
  applyLighting(): void {
    this.lightmap.lightMapMix.value = this.night;
    this.lightmap.lightMapScale.value = this.brightness;
    for (const e of this.emissive) {
      const onInState = e.states.has('on') ? 1 - this.night : 0;
      const onInMoon = e.states.has('moon') ? this.night : 0;
      e.material.emissive.copy(e.color);
      e.material.emissiveIntensity = e.intensity * e.boost * Math.max(onInState, onInMoon) * this.brightness;
    }
  }

  /** Exposure the camera should use here for the current light state. */
  get targetExposure(): number {
    return MathUtils.lerp(this.exposure.on ?? 1, this.exposure.moon ?? 2.4, this.night);
  }
}
