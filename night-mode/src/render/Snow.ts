import type { MeshStandardMaterial } from 'three';
import { addShaderPatch } from './Lightmap';

/** How much snow lies on things outside (0..1), shared by every snowy material. */
export const snowUniforms = { snowAmount: { value: 1 } };

/**
 * Snow on everything that faces the sky: roofs, railings, fence rails, the dock, rocks. The shader
 * whitens surfaces by how much they face up, with a little noise so the edges aren't too clean.
 */
export function applySnowCover(mat: MeshStandardMaterial): void {
  addShaderPatch(mat, 'nm-snow', (shader) => {
    shader.uniforms.snowAmount = snowUniforms.snowAmount;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSnowPos;')
      .replace('#include <project_vertex>', '#include <project_vertex>\n\tvSnowPos = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
varying vec3 vSnowPos;
uniform float snowAmount;
float snowHash( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
float snowNoise( vec2 p ) {
	vec2 i = floor( p ), f = fract( p );
	f = f * f * ( 3.0 - 2.0 * f );
	return mix( mix( snowHash( i ), snowHash( i + vec2( 1.0, 0.0 ) ), f.x ), mix( snowHash( i + vec2( 0.0, 1.0 ) ), snowHash( i + vec2( 1.0, 1.0 ) ), f.x ), f.y );
}`,
      )
      .replace(
        '#include <normal_fragment_begin>',
        /* glsl */ `#include <normal_fragment_begin>
	{
		vec3 snowN = inverseTransformDirection( normal, viewMatrix );
		float n = snowNoise( vSnowPos.xz * 2.3 + vSnowPos.y ) * 0.6 + snowNoise( vSnowPos.xz * 9.0 ) * 0.4;
		float cover = smoothstep( 0.42, 0.8, snowN.y + ( n - 0.5 ) * 0.35 ) * snowAmount;
		diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.8, 0.83, 0.88 ), cover );
		roughnessFactor = mix( roughnessFactor, 0.9, cover );
		metalnessFactor = mix( metalnessFactor, 0.0, cover );
	}`,
      );
  });
}
