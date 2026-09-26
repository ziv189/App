import { LinearFilter, type DataTexture, type Material, type Mesh, type MeshStandardMaterial, type Object3D } from 'three';

/** What the asset pipeline records in a baked glTF's scene extras (see tools/build-test-room.mjs). */
export interface BakeInfo {
  /** Lightmap file next to the .glb (half-float EXR). */
  lightmap: string;
  /** Artist multiplier on top of the physically based conversion (normally 1). */
  lightmapIntensity?: number;
}

export function readBakeInfo(root: Object3D): BakeInfo | null {
  const info = (root.userData as { sosies?: Partial<BakeInfo> }).sosies;
  return info?.lightmap ? { lightmap: info.lightmap, lightmapIntensity: info.lightmapIntensity ?? 1 } : null;
}

/**
 * Applies a baked lightmap to every mesh with a second UV set (glTF TEXCOORD_1 = three's `uv1`).
 * Returns the materials it changed, so the lightmap strength can be adjusted later.
 *
 * Two conversions keep it faithful to the Blender bake:
 *  - EXR rows load bottom-up while glTF UVs start at the top, so the texture is flipped vertically.
 *  - Cycles bakes diffuse light without the 1/pi that three.js's Lambert term applies, so the
 *    intensity is multiplied by pi.
 */
export function applyLightmap(root: Object3D, texture: DataTexture, intensity: number): MeshStandardMaterial[] {
  texture.channel = 1;
  texture.repeat.set(1, -1);
  texture.offset.set(0, 1);
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;

  const changed = new Set<MeshStandardMaterial>();
  root.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh || !mesh.geometry.getAttribute('uv1')) return;
    const materials: Material[] = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      const standard = material as MeshStandardMaterial;
      if (!('lightMap' in standard)) continue;
      standard.lightMap = texture;
      standard.lightMapIntensity = intensity * Math.PI;
      standard.needsUpdate = true;
      changed.add(standard);
    }
  });
  return [...changed];
}
