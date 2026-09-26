import {
  LinearFilter,
  type DataTexture,
  type Material,
  type Mesh,
  type MeshStandardMaterial,
  type Object3D,
  type Texture,
  type WebGLProgramParametersWithUniforms,
} from 'three';

type ShaderPatch = (shader: WebGLProgramParametersWithUniforms) => void;
const patches = new WeakMap<Material, { key: string; patch: ShaderPatch }[]>();

/**
 * Adds a change to a material's shader. Several can stack on one material (the lightmap blend, snow
 * cover...); materials with the same set of patches share one compiled program.
 */
export function addShaderPatch(mat: Material, key: string, patch: ShaderPatch): void {
  let list = patches.get(mat);
  if (!list) patches.set(mat, (list = []));
  if (list.some((p) => p.key === key)) return;
  list.push({ key, patch });
  const all = list;
  mat.onBeforeCompile = (shader) => {
    for (const p of all) p.patch(shader);
  };
  const cacheKey = all.map((p) => p.key).join('+');
  mat.customProgramCacheKey = () => cacheKey;
  mat.needsUpdate = true;
}

/**
 * Baked lighting with two states per room ("on": the house lights; "moon": lamps off, moonlight only),
 * blended in the shader so the house can dim smoothly. Both lightmaps share the room's 2nd UV set.
 *
 * The EXR lightmaps store irradiance / pi (Cycles DIFFUSE bake); three.js expects irradiance, so the
 * intensity is scaled by pi.
 */
export interface LightmapUniforms {
  lightMap2: { value: Texture | null };
  lightMapMix: { value: number };
  lightMapScale: { value: number };
}

export function prepareLightmapTexture(texture: DataTexture): DataTexture {
  texture.channel = 1;
  // EXR rows load bottom-up while glTF UVs start at the top: flip v.
  texture.repeat.set(1, -1);
  texture.offset.set(0, 1);
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Applies the lightmaps to every mesh that has lightmap UVs (`uv1`). Returns the patched materials.
 * `uniforms` is shared by all of them, so changing it re-lights the whole room at once.
 */
export function applyLightmaps(
  root: Object3D,
  on: DataTexture,
  moon: DataTexture | null,
  uniforms: LightmapUniforms,
): MeshStandardMaterial[] {
  prepareLightmapTexture(on);
  if (moon) prepareLightmapTexture(moon);
  uniforms.lightMap2.value = moon ?? on;
  const patched = new Set<MeshStandardMaterial>();
  root.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh || !mesh.geometry.getAttribute('uv1')) return;
    const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as Material[];
    for (const m of mats) {
      const mat = m as MeshStandardMaterial;
      if (!('lightMap' in mat) || patched.has(mat)) continue;
      mat.lightMap = on;
      mat.lightMapIntensity = Math.PI;
      patchBlend(mat, uniforms);
      patched.add(mat);
    }
  });
  return [...patched];
}

function patchBlend(mat: MeshStandardMaterial, uniforms: LightmapUniforms): void {
  // One compiled program serves every material of this kind (the uniforms are shared objects).
  addShaderPatch(mat, 'nm-lightmap-blend', (shader) => {
    shader.uniforms.lightMap2 = uniforms.lightMap2;
    shader.uniforms.lightMapMix = uniforms.lightMapMix;
    shader.uniforms.lightMapScale = uniforms.lightMapScale;
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <lightmap_pars_fragment>',
        '#include <lightmap_pars_fragment>\n#ifdef USE_LIGHTMAP\nuniform sampler2D lightMap2;\nuniform float lightMapMix;\nuniform float lightMapScale;\n#endif',
      )
      .replace(
        'vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );',
        'vec4 lightMapTexel = mix( texture2D( lightMap, vLightMapUv ), texture2D( lightMap2, vLightMapUv ), lightMapMix ) * lightMapScale;',
      );
  });
}

/** Legacy single-lightmap reader kept for tests and tools: scene extras written by the pipeline. */
export interface BakeInfo {
  lightmap: string;
  lightmapIntensity?: number;
}

export function readBakeInfo(root: Object3D): BakeInfo | null {
  const info = root.userData?.sosies?.lightmap;
  return typeof info === 'string' ? (root.userData.sosies as BakeInfo) : null;
}
