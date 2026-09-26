import {
  Color,
  ConeGeometry,
  CylinderGeometry,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
  type BufferGeometry,
  type Mesh,
  type Object3D,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { addShaderPatch } from '../render/Lightmap';
import { applySnowCover } from '../render/Snow';

interface Tree {
  x: number;
  y: number;
  z: number;
  height: number;
  radius: number;
}

/** What the player bumps into: a cylinder standing at the tree's foot, as wide as its branches at eye level. */
export interface TreeObstacle {
  x: number;
  y: number;
  z: number;
  radius: number;
  height: number;
}

/**
 * The exterior's forest was built as picture cards: two crossed quads per tree with a cut-out tree
 * image. Some graphics drivers draw them as solid rectangles, and up close they look flat anyway, so
 * the game plants real low-poly firs in their place (stacked cones with snow on the branches), all
 * of them in two instanced meshes. Returns where the trees stand, for their colliders.
 */
export function plantTrees(root: Object3D, groundAt: (x: number, z: number) => number | null): TreeObstacle[] {
  const cards = root.getObjectByName('forest') as Mesh | undefined;
  if (!cards?.isMesh) return [];
  const trees = treesFromCards(cards);
  if (!trees.length) return [];
  cards.visible = false;
  // stand each tree on the ground (a card's picture starts somewhere near its foot)
  for (const t of trees) t.y = (groundAt(t.x, t.z) ?? t.y) - 0.05;

  // the needles' colour is per tree (below)
  const foliageMaterial = new MeshStandardMaterial({ roughness: 0.92 });
  foliageMaterial.name = 'NM_Firs';
  applySnowCover(foliageMaterial);
  moonlit(foliageMaterial);
  needles(foliageMaterial);
  const trunkMaterial = new MeshStandardMaterial({ color: 0x3a2a1f, roughness: 0.95 });
  trunkMaterial.name = 'NM_FirTrunks';
  moonlit(trunkMaterial);
  const foliage = new InstancedMesh(firGeometry(), foliageMaterial, trees.length);
  const trunks = new InstancedMesh(trunkGeometry(), trunkMaterial, trees.length);
  foliage.name = 'firs';
  trunks.name = 'fir_trunks';

  const m = new Matrix4();
  const q = new Quaternion();
  const up = new Vector3(0, 1, 0);
  const p = new Vector3();
  const s = new Vector3();
  const green = new Color(0x1d3527);
  const bluer = new Color(0x183033);
  const yellower = new Color(0x27391f);
  const c = new Color();
  const obstacles: TreeObstacle[] = [];
  trees.forEach((t, i) => {
    // every tree a little different: turned, slightly thinner or fuller, a darker or lighter green
    const seed = Math.sin(t.x * 12.9898 + t.z * 78.233) * 43758.5453;
    const r = seed - Math.floor(seed);
    const r2 = (r * 7.31) % 1;
    q.setFromAxisAngle(up, r * Math.PI * 2);
    const width = (t.radius / FIR_RADIUS) * (0.85 + r * 0.25);
    m.compose(p.set(t.x, t.y, t.z), q, s.set(width, t.height, width));
    foliage.setMatrixAt(i, m);
    trunks.setMatrixAt(i, m);
    c.copy(green).lerp(r2 < 0.5 ? bluer : yellower, Math.abs(r2 - 0.5) * 2).multiplyScalar(0.8 + r * 0.4);
    foliage.setColorAt(i, c);
    // the branches at eye level (1.6 m over the ground, which is 5 cm over the foot); on a tall tree that
    // is under the lowest tier, whose tips droop to 3% of the height
    const eye = 1.65 / t.height;
    const reach = Math.max(
      0,
      ...TIERS.map((tier, k) => {
        if (eye >= tier.y && eye <= tier.y + tier.h) return tier.r * (1 - (eye - tier.y) / tier.h);
        return k === 0 && eye >= 0.03 && eye < tier.y ? tier.r * 0.9 : 0;
      }),
    );
    obstacles.push({ x: t.x, y: t.y, z: t.z, radius: Math.max(0.2, 0.035 * width, reach * width), height: 2.4 });
  });
  foliage.instanceColor!.needsUpdate = true;
  foliage.instanceMatrix.needsUpdate = true;
  trunks.instanceMatrix.needsUpdate = true;
  foliage.computeBoundingSphere();
  trunks.computeBoundingSphere();
  root.add(foliage, trunks);
  return obstacles;
}

/**
 * The rest of the outdoors has its moonlight baked in; the firs aren't part of the bake, so they get
 * the same moon (and a little sky) in their shader. Snow on the branches picks it up and shows.
 */
function moonlit(material: MeshStandardMaterial): void {
  addShaderPatch(material, 'nm-moonlit', (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      /* glsl */ `{
		vec3 wn = inverseTransformDirection( normal, viewMatrix );
		float moon = max( dot( wn, normalize( vec3( 0.35, 0.8, -0.45 ) ) ), 0.0 );
		outgoingLight += diffuseColor.rgb * ( vec3( 0.2, 0.25, 0.4 ) * moon + vec3( 0.035, 0.045, 0.08 ) * ( 0.6 + 0.4 * wn.y ) );
	}
	#include <opaque_fragment>`,
    );
  });
}

/**
 * Clumps of needles, so the branches aren't one flat colour up close: darker hollows and lighter branch
 * ends, in world space (the snow patch's position and noise; the snow then settles on top).
 */
function needles(material: MeshStandardMaterial): void {
  addShaderPatch(material, 'nm-needles', (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      /* glsl */ `#include <color_fragment>
	{
		vec3 p = vSnowPos;
		// the finer detail fades out with distance, before it is smaller than a pixel and would shimmer
		float px = length( fwidth( p ) );
		float mid = mix( 0.5, snowNoise( p.xz * 5.0 - p.y * 3.5 ), clamp( 1.5 - px * 5.0, 0.0, 1.0 ) );
		float fine = mix( 0.5, snowNoise( vec2( p.x + p.z, p.y ) * 17.0 ), clamp( 1.5 - px * 17.0, 0.0, 1.0 ) );
		diffuseColor.rgb *= 0.5 + snowNoise( p.xz * 1.6 + p.y * 1.2 ) * 0.5 + mid * 0.32 + fine * 0.18;
	}`,
    );
  });
}

/** Widest radius of the unit fir (1 m tall) below. */
const FIR_RADIUS = 0.36;

/**
 * A 1 m tall fir: five stacked cones (TIERS: radius, height and bottom of each), widest at the bottom. Each cone's rim is pulled out into branch
 * tips that droop a little, and every tier is turned so the tips don't line up.
 */
const TIERS = [
  { r: 0.36, h: 0.4, y: 0.1 },
  { r: 0.3, h: 0.36, y: 0.27 },
  { r: 0.23, h: 0.32, y: 0.44 },
  { r: 0.16, h: 0.27, y: 0.6 },
  { r: 0.09, h: 0.22, y: 0.76 },
];

function firGeometry(): BufferGeometry {
  const parts = TIERS.map((t, i) => {
    const cone = new ConeGeometry(t.r, t.h, 14, 1, false);
    const pos = cone.getAttribute('position');
    for (let v = 0; v < pos.count; v++) {
      const y = pos.getY(v);
      if (y > -t.h / 2 + 1e-4) continue; // only the rim (and the cap under it, which shares its outline)
      const x = pos.getX(v);
      const z = pos.getZ(v);
      if (Math.hypot(x, z) < 1e-4) continue;
      const tip = Math.cos(Math.atan2(z, x) * 7); // 7 branch tips around the rim
      pos.setXYZ(v, x * (1 + 0.16 * tip), y - 0.035 * (tip + 1), z * (1 + 0.16 * tip));
    }
    cone.computeVertexNormals();
    return cone.rotateY(i * 0.9).translate(0, t.y + t.h / 2, 0);
  });
  return mergeGeometries(parts)!;
}

function trunkGeometry(): BufferGeometry {
  return new CylinderGeometry(0.022, 0.035, 0.16, 7).translate(0, 0.08, 0);
}

/**
 * Finds the trees in the card mesh: each card is a quad (its own connected piece), and the two cards
 * of a tree share its centre.
 */
function treesFromCards(cards: Mesh): Tree[] {
  cards.updateWorldMatrix(true, false);
  const pos = cards.geometry.getAttribute('position');
  const index = cards.geometry.index;
  const count = index ? index.count : pos.count;
  const at = (i: number) => (index ? index.getX(i) : i);
  // union-find over vertices joined by triangles: one component per card
  const parent = Array.from({ length: pos.count }, (_, i) => i);
  const find = (a: number): number => {
    while (parent[a] !== a) {
      parent[a] = parent[parent[a]!]!;
      a = parent[a]!;
    }
    return a;
  };
  for (let t = 0; t < count; t += 3) {
    const a = find(at(t));
    parent[find(at(t + 1))] = a;
    parent[find(at(t + 2))] = a;
  }
  const quads = new Map<number, { min: Vector3; max: Vector3 }>();
  const v = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(cards.matrixWorld);
    const c = find(i);
    const q = quads.get(c);
    if (q) {
      q.min.min(v);
      q.max.max(v);
    } else quads.set(c, { min: v.clone(), max: v.clone() });
  }
  const trees = new Map<string, Tree>();
  for (const { min, max } of quads.values()) {
    const x = (min.x + max.x) / 2;
    const z = (min.z + max.z) / 2;
    const key = `${Math.round(x * 20)},${Math.round(z * 20)}`;
    const radius = Math.max(max.x - min.x, max.z - min.z) / 2;
    const tree = trees.get(key);
    if (tree) tree.radius = Math.max(tree.radius, radius);
    else trees.set(key, { x, y: min.y, z, height: (max.y - min.y) * 0.95, radius });
  }
  return [...trees.values()];
}
