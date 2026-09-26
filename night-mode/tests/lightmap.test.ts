import { BufferAttribute, BufferGeometry, DataTexture, Group, Mesh, MeshStandardMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { applyLightmaps, readBakeInfo, type LightmapUniforms } from '../src/render/Lightmap';

function mesh(withLightmapUvs: boolean): Mesh {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(9), 3));
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(6), 2));
  if (withLightmapUvs) geometry.setAttribute('uv1', new BufferAttribute(new Float32Array(6), 2));
  return new Mesh(geometry, new MeshStandardMaterial());
}

const uniforms = (): LightmapUniforms => ({
  lightMap2: { value: null },
  lightMapMix: { value: 0 },
  lightMapScale: { value: 1 },
});

describe('applyLightmaps', () => {
  it('lights only meshes with a second UV set, scaled by pi, on UV channel 1, flipped vertically', () => {
    const root = new Group();
    const baked = mesh(true);
    const unbaked = mesh(false);
    root.add(baked, unbaked);
    const on = new DataTexture(new Uint16Array(4), 1, 1);
    const moon = new DataTexture(new Uint16Array(4), 1, 1);
    const u = uniforms();

    const changed = applyLightmaps(root, on, moon, u);

    const material = baked.material as MeshStandardMaterial;
    expect(changed).toEqual([material]);
    expect(material.lightMap).toBe(on);
    expect(material.lightMapIntensity).toBeCloseTo(Math.PI, 6);
    expect((unbaked.material as MeshStandardMaterial).lightMap).toBeNull();
    expect(u.lightMap2.value).toBe(moon);
    for (const t of [on, moon]) {
      expect(t.channel).toBe(1);
      // v' = 1 - v: EXR rows load bottom-up, glTF UVs start at the top.
      expect(t.repeat.y).toBe(-1);
      expect(t.offset.y).toBe(1);
    }
  });

  it('blends the two lighting states in the shader with shared uniforms', () => {
    const root = new Group();
    const baked = mesh(true);
    root.add(baked);
    const u = uniforms();
    applyLightmaps(root, new DataTexture(new Uint16Array(4), 1, 1), null, u);
    const shader = {
      uniforms: {} as Record<string, unknown>,
      fragmentShader: '#include <lightmap_pars_fragment>\nvec4 lightMapTexel = texture2D( lightMap, vLightMapUv );',
      vertexShader: '',
    };
    const mat = baked.material as MeshStandardMaterial;
    mat.onBeforeCompile(shader as never, undefined as never);
    expect(shader.uniforms.lightMapMix).toBe(u.lightMapMix);
    expect(shader.fragmentShader).toContain('mix( texture2D( lightMap, vLightMapUv ), texture2D( lightMap2, vLightMapUv ), lightMapMix )');
    // with no moon lightmap the room keeps its lamps' light in both states
    expect(u.lightMap2.value).toBe(mat.lightMap);
  });
});

describe('readBakeInfo', () => {
  it('returns null for models without a pipeline note', () => {
    expect(readBakeInfo(new Group())).toBeNull();
  });
});
