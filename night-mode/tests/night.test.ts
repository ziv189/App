import { InstancedMesh, MeshStandardMaterial, ShaderChunk } from 'three';
import { describe, expect, it } from 'vitest';
import { sanitizeSettings } from '../src/core/Settings';
import { createNightFog, installHeightFog } from '../src/render/HeightFog';
import { NIGHT } from '../src/render/nightConfig';
import { NightGrade } from '../src/render/NightGrade';
import { applySnowGround } from '../src/render/SnowGround';
import { plantTrees } from '../src/world/Trees';

const shader = () => ({
  uniforms: {} as Record<string, unknown>,
  vertexShader: '#include <common>\nvoid main() {\n#include <begin_vertex>\n#include <project_vertex>\n}',
  fragmentShader:
    '#include <common>\nvoid main() {\n#include <color_fragment>\n#include <roughnessmap_fragment>\n#include <opaque_fragment>\n}',
});

describe('night look', () => {
  it('keeps the gamma setting in range', () => {
    expect(sanitizeSettings({}).gamma).toBe(1);
    expect(sanitizeSettings({ gamma: 5 }).gamma).toBe(1.6);
    expect(sanitizeSettings({ gamma: 0.1 }).gamma).toBe(0.7);
    expect(sanitizeSettings({ gamma: 'bright' }).gamma).toBe(1);
  });

  it('turns exponential fog into height fog once, and leaves linear fog alone', () => {
    installHeightFog();
    const once = ShaderChunk.fog_fragment;
    installHeightFog();
    expect(ShaderChunk.fog_fragment).toBe(once);
    expect(once).toContain('NM_FOG_FALLOFF');
    expect(once).toContain('smoothstep( fogNear, fogFar, vFogDepth )');
    expect(ShaderChunk.fog_pars_fragment).toContain(`const float NM_FOG_BASE = ${NIGHT.fog.baseHeight}`);
    // the world position comes from the view-space one, so instanced and skinned meshes work too
    expect(ShaderChunk.fog_vertex).toContain('vFogWorld');
    const fog = createNightFog();
    expect(fog.isFogExp2).toBe(true);
    expect(fog.density).toBe(NIGHT.fog.density);
  });

  it('switches the grade between the night look and the dawn look', () => {
    const grade = new NightGrade();
    expect(grade.uniforms.get('saturation')!.value).toBe(NIGHT.grade.saturation);
    expect(grade.uniforms.get('blackLevel')!.value).toBe(NIGHT.grade.blackLevel);
    grade.setDay(true);
    expect(grade.uniforms.get('saturation')!.value).toBe(0.18);
    expect(grade.uniforms.get('blackLevel')!.value).toBe(0);
    grade.setDay(false);
    expect(grade.uniforms.get('saturation')!.value).toBe(NIGHT.grade.saturation);
  });

  it('gives paths and ice glassy patches, and the snow glints', () => {
    const snow = new MeshStandardMaterial();
    applySnowGround(snow, 'snow');
    const s = shader();
    snow.onBeforeCompile(s as never, undefined as never);
    expect(s.fragmentShader).toContain('groundSparkle');
    expect(s.fragmentShader).not.toContain('glassy');
    const path = new MeshStandardMaterial();
    applySnowGround(path, 'path');
    const p = shader();
    path.onBeforeCompile(p as never, undefined as never);
    expect(p.fragmentShader).toContain('glassy');
    expect(p.fragmentShader).not.toContain('gCracks( cp');
    const ice = new MeshStandardMaterial();
    applySnowGround(ice, 'ice');
    const i = shader();
    ice.onBeforeCompile(i as never, undefined as never);
    expect(i.fragmentShader).toContain('gCracks( cp');
  });

  it('plants nothing when there are no tree cards', () => {
    expect(plantTrees(new InstancedMesh(undefined, undefined, 0), () => 0)).toEqual([]);
  });
});
