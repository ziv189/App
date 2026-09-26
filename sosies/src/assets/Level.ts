import {
  DirectionalLight,
  FogExp2,
  PointLight,
  Quaternion,
  SpotLight,
  Vector3,
  type Material,
  type Mesh,
  type Object3D,
  type Scene,
  type Texture,
  type WebGLRenderer,
} from 'three';
import { collectMeshes, type Physics } from '../physics/Physics';
import { applySky, type SkyDef } from '../render/Environment';
import type { LookSettings } from '../render/PostFX';
import { Assets, assetUrl, type ProgressTracker } from './Assets';

/**
 * Describes a playable location. Naming conventions inside the .glb (see docs/ASSET_PIPELINE.md):
 *   COL_<name>     invisible collision mesh (preferred: simple boxes/planes hugging walls and floors)
 *   SPAWN_Player   empty marking where Daniel starts; he faces the empty's -Z (Blender: its +Y arrow)
 * Files without COL_ meshes fall back to colliding with every visible opaque surface.
 */
export interface LevelDef {
  id: string;
  /** Shown on the start screen. */
  title: string;
  /** Small in-game label (used to mark TECH TEST content). Empty for real game content. */
  watermark: string;
  /** Attribution shown on the start screen (required by the licenses of borrowed assets). */
  credits: string;
  /** Path inside /public, plus approximate size for the progress bar until the real size is known. */
  gltf: { path: string; approxBytes: number };
  sky?: Omit<SkyDef, 'url'> & { path: string; approxBytes: number };
  /** Fallback start point if the file has no SPAWN_Player; Daniel is dropped onto the floor below it. */
  spawn: { position: [number, number, number]; yawDeg: number };
  fog?: { color: number; density: number };
  look?: Partial<LookSettings>;
  /** Shell command that produces missing files (shown in the error message). */
  fetchHint: string;
  /** Adds things the file doesn't contain, e.g. lights. */
  setup?: (ctx: LevelContext) => void;
}

export interface LevelContext {
  scene: Scene;
  root: Object3D;
  renderer: WebGLRenderer;
}

export interface LoadedLevel {
  def: LevelDef;
  root: Object3D;
  spawn: { feet: Vector3; yaw: number };
  textures: Texture[];
  collisionTriangles: number;
  collisionSource: string;
}

export class MissingAssetError extends Error {}

export async function loadLevel(
  def: LevelDef,
  scene: Scene,
  renderer: WebGLRenderer,
  assets: Assets,
  physics: Physics,
  progress: ProgressTracker,
): Promise<LoadedLevel> {
  const gltfUrl = assetUrl(def.gltf.path);
  const skyUrl = def.sky ? assetUrl(def.sky.path) : null;
  // Only needed with the dev server, which answers a missing file with its HTML page.
  for (const url of import.meta.env.DEV ? [gltfUrl, skyUrl] : []) {
    if (url && !(await Assets.exists(url))) {
      throw new MissingAssetError(
        `Missing file: ${url}\n\nThis location's files aren't on this computer. In a terminal, inside the ` +
          `sosies folder, run:\n\n    ${def.fetchHint}\n\nthen reload this page.`,
      );
    }
  }

  progress.setStatus('Loading location');
  const gltfProgress = progress.download('gltf', def.gltf.approxBytes);
  const skyProgress = def.sky ? progress.download('sky', def.sky.approxBytes) : undefined;
  const [gltf] = await Promise.all([
    assets.loadGltf(gltfUrl, gltfProgress).finally(() => progress.finish('gltf')),
    def.sky && skyUrl
      ? applySky(renderer, scene, (url, p) => assets.loadHdr(url, p), { ...def.sky, url: skyUrl }, skyProgress).finally(() =>
          progress.finish('sky'),
        )
      : Promise.resolve(null),
  ]);

  const root = gltf.scene;
  root.name = `level:${def.id}`;
  root.updateMatrixWorld(true);

  // Sort nodes by naming convention.
  const colliders: Mesh[] = [];
  let spawnNode: Object3D | null = null;
  root.traverse((obj) => {
    if (obj.name.startsWith('COL_') || obj.userData.collider === true) {
      obj.visible = false;
      if ((obj as Mesh).isMesh) colliders.push(obj as Mesh);
    }
    if (obj.name === 'SPAWN_Player') spawnNode = obj;
  });

  const visibleMeshes = collectMeshes(root, (m) => isVisible(m));
  for (const mesh of visibleMeshes) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  }

  progress.setStatus('Building collision');
  await yieldToBrowser();
  let collisionSource = 'COL_ meshes';
  let collisionMeshes = colliders;
  if (collisionMeshes.length === 0) {
    // Fallback for files without authored collision: solid, opaque surfaces only (not foliage/chains).
    collisionSource = 'visible opaque meshes (no COL_ meshes in file)';
    collisionMeshes = visibleMeshes.filter((m) => materialsOf(m).every((mat) => mat.alphaTest === 0 && !mat.transparent));
  }
  const collisionTriangles = physics.addStaticMeshes(collisionMeshes);

  // Spawn point: authored node, else the level definition.
  const feet = new Vector3();
  let yaw = (def.spawn.yawDeg * Math.PI) / 180;
  const node = spawnNode as Object3D | null;
  if (node) {
    node.getWorldPosition(feet);
    const forward = new Vector3(0, 0, -1).applyQuaternion(node.getWorldQuaternion(new Quaternion()));
    yaw = Math.atan2(-forward.x, -forward.z);
  } else {
    feet.fromArray(def.spawn.position);
  }
  const ground = physics.groundHeightBelow(new Vector3(feet.x, feet.y + 1, feet.z), 20);
  if (ground !== null) feet.y = ground;

  if (def.fog) scene.fog = new FogExp2(def.fog.color, def.fog.density);
  scene.add(root);
  def.setup?.({ scene, root, renderer });

  // Every texture the level uses, so the game can upload them all before play starts.
  const textures = new Set<Texture>();
  for (const mesh of visibleMeshes) {
    for (const mat of materialsOf(mesh)) {
      for (const value of Object.values(mat)) if ((value as Texture | null)?.isTexture) textures.add(value as Texture);
    }
  }

  return { def, root, spawn: { feet, yaw }, textures: [...textures], collisionTriangles, collisionSource };
}

export type ShadowCastingLight = DirectionalLight | SpotLight | PointLight;

/** Shadow-casting lights in the scene (their shadow map size follows the quality setting). */
export function shadowLights(scene: Scene): ShadowCastingLight[] {
  const out: ShadowCastingLight[] = [];
  scene.traverse((obj) => {
    const casts = obj instanceof DirectionalLight || obj instanceof SpotLight || obj instanceof PointLight;
    if (casts && obj.castShadow) out.push(obj);
  });
  return out;
}

function materialsOf(mesh: Mesh): Material[] {
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}

function isVisible(obj: Object3D): boolean {
  for (let o: Object3D | null = obj; o; o = o.parent) if (!o.visible) return false;
  return true;
}

/** Lets the browser paint (e.g. the loading status) before a long synchronous step. */
export function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => {
    if (document.hidden) setTimeout(resolve, 0);
    else requestAnimationFrame(() => setTimeout(resolve, 0));
  });
}
