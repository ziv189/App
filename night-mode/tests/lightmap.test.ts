import { BufferAttribute, BufferGeometry, DataTexture, Group, Mesh, MeshStandardMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { applyLightmap, readBakeInfo } from '../src/render/Lightmap';

function mesh(withLightmapUvs: boolean): Mesh {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(9), 3));
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(6), 2));
  if (withLightmapUvs) geometry.setAttribute('uv1', new BufferAttribute(new Float32Array(6), 2));
  return new Mesh(geometry, new MeshStandardMaterial());
}

describe('readBakeInfo', () => {
  it('reads the lightmap recorded by the asset pipeline', () => {
    const root = new Group();
    root.userData = { sosies: { lightmap: 'room-lightmap.exr', lightmapIntensity: 0.8 } };
    expect(readBakeInfo(root)).toEqual({ lightmap: 'room-lightmap.exr', lightmapIntensity: 0.8 });
  });

  it('returns null for models without baked lighting', () => {
    expect(readBakeInfo(new Group())).toBeNull();
  });
});

describe('applyLightmap', () => {
  it('lights only meshes with a second UV set, scaled by pi, on UV channel 1, flipped vertically', () => {
    const root = new Group();
    const baked = mesh(true);
    const unbaked = mesh(false);
    root.add(baked, unbaked);
    const texture = new DataTexture(new Uint16Array(4), 1, 1);

    const changed = applyLightmap(root, texture, 0.5);

    const material = baked.material as MeshStandardMaterial;
    expect(changed).toEqual([material]);
    expect(material.lightMap).toBe(texture);
    expect(material.lightMapIntensity).toBeCloseTo(0.5 * Math.PI, 6);
    expect((unbaked.material as MeshStandardMaterial).lightMap).toBeNull();
    expect(texture.channel).toBe(1);
    // v' = 1 - v: EXR rows load bottom-up, glTF UVs start at the top.
    expect(texture.repeat.y).toBe(-1);
    expect(texture.offset.y).toBe(1);
  });
});
