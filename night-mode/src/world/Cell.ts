import {
  Box3,
  Color,
  Group,
  MathUtils,
  Object3D,
  Quaternion,
  Vector3,
  type DataTexture,
  type Material,
  type Mesh,
  type MeshPhysicalMaterial,
  type MeshStandardMaterial,
  type Texture,
} from 'three';
import { assetUrl, type Assets } from '../assets/Assets';
import { RAPIER, type Physics } from '../physics/Physics';
import { applyLightmaps, type LightmapUniforms } from '../render/Lightmap';
import { NIGHT } from '../render/nightConfig';
import { applySnowCover } from '../render/Snow';
import { applySnowGround } from '../render/SnowGround';
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
  /**
   * Moonlight through the windows while the house lights are off: the direction the light travels
   * (game space) and the window openings it comes through (flat boxes: min and max corners, one axis
   * the same in both), for the visible shafts. The pools on the floor come from a real-time shadow.
   */
  moonBeam?: { dir: [number, number, number]; windows: { min: [number, number, number]; max: [number, number, number] }[] };
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

const UP = new Vector3(0, 1, 0);
const TURN = new Quaternion();

/**
 * Where something that turns should turn about (world space), or null for things that don't turn.
 * The models' pivots were set in Blender (a door's at its hinge, the lever's at its foot), but the
 * mesh compression moves every mesh's origin to the middle of its bounds, so they are found again here.
 */
function pivotPoint(name: string, obj: Object3D): Vector3 | null {
  const box = new Box3().setFromObject(obj);
  if (box.isEmpty()) return null;
  const centre = box.getCenter(new Vector3());
  const size = box.getSize(new Vector3());
  if (obj.userData.door) {
    // the hinge is at one end of the leaf's width (its local x): 'left' at the low end, 'right' mirrored
    const across = new Vector3(1, 0, 0).applyQuaternion(obj.getWorldQuaternion(new Quaternion()));
    const half = (Math.abs(across.x) * size.x + Math.abs(across.z) * size.z) / 2;
    return centre.addScaledVector(across, obj.userData.hinge === 'right' ? half : -half);
  }
  // the grandfather clock's case door is hinged on its left edge (tools/blender/rooms/living.py)
  if (name === 'clock_door') return new Vector3(box.min.x + 0.005, centre.y, centre.z);
  // the rocking chair rocks on the floor, the breaker lever turns on its foot
  if (name === 'rocking_chair' || name === 'breaker_lever') return new Vector3(centre.x, box.min.y, centre.z);
  return null;
}

/**
 * Puts an object under a new parent at `pivot` (world space), turned like the object, and returns it:
 * turning the pivot about its own axes turns the object about that point.
 */
function repivot(obj: Object3D, pivot: Vector3): Object3D {
  const parent = obj.parent!;
  parent.updateWorldMatrix(true, false);
  const p = new Object3D();
  p.name = `${obj.name}_pivot`;
  p.userData = { ...obj.userData };
  parent.add(p);
  p.position.copy(parent.worldToLocal(pivot.clone()));
  p.quaternion.copy(obj.quaternion);
  p.updateMatrixWorld(true);
  p.attach(obj);
  return p;
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
  /** Door leaves: `leaf` turns about the hinge (see repivot), `base` is its closed orientation. */
  readonly doors = new Map<string, { leaf: Object3D; sign: number; base: Quaternion }>();
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
  /** Dawn behind the "Goodnight" ending: the day look (photographed sky, exposure as baked). */
  dawn = false;
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
    if (!def.exterior) cell.lightmap.lightMap2Tint!.value.setRGB(...NIGHT.interiorMoonTint);
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
      }
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as MeshStandardMaterial[];
      // glass lets the moon through (the real-time moonbeams indoors) and draws after the room
      if (mats.some((m) => /glass/i.test(m.name) || m.userData.sosies_glass)) mesh.castShadow = false;
      if (mats.some((m) => m.userData.sosies_glass)) mesh.renderOrder = 2;
      for (const mat of mats) {
        if (seenMaterials.has(mat)) continue;
        seenMaterials.add(mat);
        if (mat.userData.sosies_glass) convertGlass(mat as MeshPhysicalMaterial);
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
        // the snow and the ice themselves: drifts, glints, glassy patches on paths and ice
        if (def.exterior && /^NM_(Snow|Ice)/.test(mat.name) && 'roughness' in mat) {
          applySnowGround(mat as MeshStandardMaterial, /^NM_Ice/.test(mat.name) ? 'ice' : /^NM_Snow(Path|Road)/.test(mat.name) ? 'path' : 'snow');
        }
        const paint = def.palette?.[mat.name];
        if (paint && 'color' in mat) (mat as MeshStandardMaterial).color.set(paint);
        for (const value of Object.values(mat)) if ((value as Texture | null)?.isTexture) cell.textures.push(value as Texture);
      }
    });
    if (on) cell.textures.push(on);
    if (moon) cell.textures.push(moon);

    // things that turn get their pivot back (see repivot): doors on their hinges, the rest on their joints
    for (const [name, obj] of [...cell.dynamic]) {
      const hinge = pivotPoint(name, obj);
      if (!hinge) continue;
      const pivot = repivot(obj, hinge);
      cell.dynamic.set(name, pivot);
      if (obj.userData.door) {
        // the doors are fitted on the face of solid walls, so they open into the room (open_sign from the
        // Blender build is the way into the wall)
        cell.doors.set(String(obj.userData.door), { leaf: pivot, sign: -Number(obj.userData.open_sign ?? -1), base: pivot.quaternion.clone() });
      }
    }

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
      const trees = plantTrees(root, (x, z) => cell.groundAt(x, z));
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

  /** How open a door leaf is (0..1 of ~80 degrees), turning about the upright through its hinge. */
  setDoorOpen(doorId: string, amount: number): void {
    const d = this.doors.get(doorId);
    if (!d) return;
    d.leaf.quaternion.copy(d.base).premultiply(TURN.setFromAxisAngle(UP, d.sign * MathUtils.degToRad(80) * amount));
  }

  /**
   * Height of the room's collision surface under (x, z), game space, or null if there is none. Works
   * while the room is inactive (its collider switched off).
   */
  groundAt(x: number, z: number, fromY = 120): number | null {
    if (!this.collider) return null;
    const toi = this.collider.castRay(new RAPIER.Ray({ x, y: fromY, z }, { x: 0, y: -1, z: 0 }), fromY + 200, true);
    return toi >= 0 ? fromY - toi : null;
  }

  /**
   * Distance along a ray (game space, `dir` normalised) to the room's collision surface, or null if it
   * escapes (e.g. out through a window). Works while the room is inactive.
   */
  rayHit(from: { x: number; y: number; z: number }, dir: { x: number; y: number; z: number }, max = 50): number | null {
    if (!this.collider) return null;
    const toi = this.collider.castRay(new RAPIER.Ray(from, dir), max, true);
    return toi >= 0 ? toi : null;
  }

  /** How strongly the glowing materials whose name matches shine right now, relative to normal (0 = off). */
  glowLevel(pattern: RegExp): number {
    const e = this.emissive.find((x) => pattern.test(x.material.name));
    if (!e) return 0;
    const onInState = e.states.has('on') ? 1 - this.night : 0;
    const onInMoon = e.states.has('moon') ? this.night : 0;
    return e.boost * Math.max(onInState, onInMoon) * this.brightness;
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

  /**
   * Exposure the camera should use here for the current light state. Outdoors it comes from the night
   * config; moonlit rooms keep their own balance but darker (NIGHT.exposure.interiorMoonScale), so the
   * moon reads as moonlight, not as a dim day.
   */
  get targetExposure(): number {
    const e = NIGHT.exposure;
    if (this.def.exterior && !this.dawn) return MathUtils.lerp(e.exteriorOn, e.exteriorMoon, this.night);
    if (this.dawn) return MathUtils.lerp(this.exposure.on ?? 1, this.exposure.moon ?? 2.4, this.night);
    return MathUtils.lerp(this.exposure.on ?? 1, (this.exposure.moon ?? 2.4) * e.interiorMoonScale, this.night);
  }
}
