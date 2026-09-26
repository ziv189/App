import RAPIER from '@dimforge/rapier3d-compat';
import { InstancedMesh, Matrix4, Quaternion, Vector3, type Mesh, type Object3D } from 'three';

export { RAPIER };

/** Collision layers. Level geometry is WORLD; the player's capsule is PLAYER. */
export const LAYER = { WORLD: 0x0001, PLAYER: 0x0002, ALL: 0xffff } as const;

/** Rapier packs "belongs to" (high 16 bits) and "can touch" (low 16 bits) into one number. */
export const collisionGroups = (belongsTo: number, canTouch: number) => ((belongsTo << 16) | canTouch) >>> 0;

const WORLD_ONLY = collisionGroups(LAYER.ALL, LAYER.WORLD);
const DOWN = new Vector3(0, -1, 0);
const isEnabled = (c: RAPIER.Collider) => c.isEnabled();

/**
 * Thin wrapper around a Rapier physics world. The level is static triangle-mesh collision; the player
 * is a kinematic capsule moved by Rapier's character controller (see PlayerController).
 */
export class Physics {
  readonly world: RAPIER.World;

  private constructor() {
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  }

  /** Loads the physics engine (WebAssembly) and creates an empty world. */
  static async create(): Promise<Physics> {
    await RAPIER.init();
    return new Physics();
  }

  step(dt: number): void {
    this.world.timestep = dt;
    this.world.step();
  }

  /** Adds the given meshes as one static collision surface. Returns the triangle count. */
  addStaticMeshes(meshes: readonly Mesh[]): number {
    return this.addCollider(meshes)?.triangles ?? 0;
  }

  /** Adds the given meshes as one static collision surface (a room's walls, floors and furniture). */
  addCollider(meshes: readonly Mesh[]): { collider: RAPIER.Collider; triangles: number } | null {
    const { vertices, indices } = mergeWorldTriangles(meshes);
    if (indices.length === 0) return null;
    const desc = RAPIER.ColliderDesc.trimesh(vertices, indices).setCollisionGroups(
      collisionGroups(LAYER.WORLD, LAYER.ALL),
    );
    const collider = this.world.createCollider(desc);
    // Ray casts only see colliders after a step; the level is static, so stepping moves nothing.
    this.world.step();
    return { collider, triangles: indices.length / 3 };
  }

  /** A box collider (e.g. a door that is shut, or an invisible wall at the edge of the garden). */
  addBox(center: Vector3, halfExtents: Vector3, rotationY = 0): RAPIER.Collider {
    const q = { x: 0, y: Math.sin(rotationY / 2), z: 0, w: Math.cos(rotationY / 2) };
    const desc = RAPIER.ColliderDesc.cuboid(halfExtents.x, halfExtents.y, halfExtents.z)
      .setTranslation(center.x, center.y, center.z)
      .setRotation(q)
      .setCollisionGroups(collisionGroups(LAYER.WORLD, LAYER.ALL));
    const collider = this.world.createCollider(desc);
    this.world.step();
    return collider;
  }

  /** Upright cylinders standing on (x, y, z): tree trunks and the branches around them at head height. */
  addCylinders(list: readonly { x: number; y: number; z: number; radius: number; height: number }[]): RAPIER.Collider[] {
    const colliders = list.map((c) =>
      this.world.createCollider(
        RAPIER.ColliderDesc.cylinder(c.height / 2, c.radius)
          .setTranslation(c.x, c.y + c.height / 2, c.z)
          .setCollisionGroups(collisionGroups(LAYER.WORLD, LAYER.ALL)),
      ),
    );
    this.world.step();
    return colliders;
  }

  /**
   * An invisible ramp over a staircase. Its top surface runs `lift` above the line from `from` to `to`
   * (the bottom and top of the flight's walking line, through the step edges), so the player walks up
   * and down smoothly instead of relying on step-climbing, which old stair models with tall steps and
   * overhanging treads defeat.
   */
  addRamp(from: Vector3, to: Vector3, width: number, lift = 0.02, thickness = 0.1): RAPIER.Collider {
    const along = to.clone().sub(from);
    const length = along.length();
    const z = along.clone().normalize();
    const x = new Vector3(0, 1, 0).cross(z).normalize();
    const y = z.clone().cross(x).normalize();
    const q = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(x, y, z));
    const center = from.clone().add(to).multiplyScalar(0.5).addScaledVector(y, lift - thickness / 2);
    const desc = RAPIER.ColliderDesc.cuboid(width / 2, thickness / 2, length / 2 + 0.02)
      .setTranslation(center.x, center.y, center.z)
      .setRotation({ x: q.x, y: q.y, z: q.z, w: q.w })
      .setCollisionGroups(collisionGroups(LAYER.WORLD, LAYER.ALL));
    const collider = this.world.createCollider(desc);
    this.world.step();
    return collider;
  }

  /** Makes collider changes (a room's collision switched on or off) visible to ray casts and the
   *  character controller right away: Rapier only updates its broad phase during a step. */
  refresh(): void {
    this.world.step();
  }

  /**
   * Ray against the level geometry of the rooms that are switched on: the distance to the first hit, or
   * null. (Rapier's ray casts still see disabled colliders, and every room's collision shares one world.)
   */
  castRay(from: Vector3, dir: Vector3, maxDistance: number): number | null {
    const ray = new RAPIER.Ray({ x: from.x, y: from.y, z: from.z }, { x: dir.x, y: dir.y, z: dir.z });
    const hit = this.world.castRay(ray, maxDistance, true, undefined, WORLD_ONLY, undefined, undefined, isEnabled);
    return hit ? hit.timeOfImpact : null;
  }

  /** Straight-down ray against level geometry only: the height of the first surface below `from`, or null. */
  groundHeightBelow(from: Vector3, maxDistance = 50): number | null {
    const toi = this.castRay(from, DOWN, maxDistance);
    return toi === null ? null : from.y - toi;
  }

  dispose(): void {
    this.world.free();
  }
}

/**
 * Collects world-space triangles from meshes (including every copy of an InstancedMesh), handling
 * the quantized and interleaved attributes that optimized glTF files use.
 */
export function mergeWorldTriangles(meshes: readonly Mesh[]): { vertices: Float32Array; indices: Uint32Array } {
  const copies = (mesh: Mesh) => (mesh instanceof InstancedMesh ? mesh.count : 1);
  let vertexCount = 0;
  let indexCount = 0;
  for (const mesh of meshes) {
    const pos = mesh.geometry.getAttribute('position');
    if (!pos) continue;
    vertexCount += pos.count * copies(mesh);
    indexCount += (mesh.geometry.index?.count ?? pos.count) * copies(mesh);
  }

  const vertices = new Float32Array(vertexCount * 3);
  const indices = new Uint32Array(indexCount);
  const v = new Vector3();
  const matrix = new Matrix4();
  const instanceMatrix = new Matrix4();
  let vOffset = 0;
  let iOffset = 0;

  for (const mesh of meshes) {
    const geo = mesh.geometry;
    const pos = geo.getAttribute('position');
    if (!pos) continue;
    mesh.updateWorldMatrix(true, false);
    for (let c = 0; c < copies(mesh); c++) {
      matrix.copy(mesh.matrixWorld);
      if (mesh instanceof InstancedMesh) {
        mesh.getMatrixAt(c, instanceMatrix);
        matrix.multiply(instanceMatrix);
      }
      for (let i = 0; i < pos.count; i++) {
        // fromBufferAttribute de-normalizes quantized (int16/int8) positions.
        v.fromBufferAttribute(pos, i).applyMatrix4(matrix);
        const o = (vOffset + i) * 3;
        vertices[o] = v.x;
        vertices[o + 1] = v.y;
        vertices[o + 2] = v.z;
      }
      if (geo.index) {
        for (let i = 0; i < geo.index.count; i++) indices[iOffset + i] = geo.index.getX(i) + vOffset;
        iOffset += geo.index.count;
      } else {
        for (let i = 0; i < pos.count; i++) indices[iOffset + i] = vOffset + i;
        iOffset += pos.count;
      }
      vOffset += pos.count;
    }
  }
  return { vertices, indices };
}

/** Every Mesh under `root` that passes `predicate`, in traversal order. */
export function collectMeshes(root: Object3D, predicate: (mesh: Mesh) => boolean = () => true): Mesh[] {
  const out: Mesh[] = [];
  root.traverse((obj) => {
    if ((obj as Mesh).isMesh && predicate(obj as Mesh)) out.push(obj as Mesh);
  });
  return out;
}
