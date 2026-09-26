import { BufferAttribute, BufferGeometry, DataTexture, Group, Mesh, MeshStandardMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { applyLightmaps, type LightmapUniforms } from '../src/render/Lightmap';
import { applySnowCover, snowUniforms } from '../src/render/Snow';

function lightmappedMesh(): Mesh {
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(9), 3));
  g.setAttribute('uv', new BufferAttribute(new Float32Array(6), 2));
  g.setAttribute('uv1', new BufferAttribute(new Float32Array(6), 2));
  return new Mesh(g, new MeshStandardMaterial());
}

const shader = () => ({
  uniforms: {} as Record<string, unknown>,
  vertexShader: '#include <common>\nvoid main() {\n#include <project_vertex>\n}',
  fragmentShader:
    '#include <common>\n#include <lightmap_pars_fragment>\nvoid main() {\n#include <normal_fragment_begin>\n#include <lights_fragment_maps>\n}',
});

describe('shader patches', () => {
  it('stacks the snow cover on top of the lightmap blend', () => {
    const root = new Group();
    const mesh = lightmappedMesh();
    root.add(mesh);
    const u: LightmapUniforms = { lightMap2: { value: null }, lightMapMix: { value: 0 }, lightMapScale: { value: 1 } };
    applyLightmaps(root, new DataTexture(new Uint16Array(4), 1, 1), null, u);
    const mat = mesh.material as MeshStandardMaterial;
    applySnowCover(mat);
    applySnowCover(mat); // twice is the same as once
    const s = shader();
    mat.onBeforeCompile(s as never, undefined as never);
    expect(s.fragmentShader).toContain('lightMapMix');
    expect(s.fragmentShader).toContain('snowAmount');
    expect(s.fragmentShader.match(/uniform float snowAmount/g)?.length).toBe(1);
    expect(s.vertexShader).toContain('vSnowPos = ( modelMatrix * snowWorld ).xyz;');
    // instanced meshes (the firs) put each instance's own transform into the world position
    expect(s.vertexShader).toContain('snowWorld = instanceMatrix * snowWorld;');
    expect(s.uniforms.snowAmount).toBe(snowUniforms.snowAmount);
    expect(mat.customProgramCacheKey()).toBe('nm-lightmap-blend+nm-snow');
  });
});
