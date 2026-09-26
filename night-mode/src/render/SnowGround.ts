import type { MeshStandardMaterial } from 'three';
import { addShaderPatch } from './Lightmap';
import { NIGHT } from './nightConfig';

/**
 * Cracks crazing the lake: a network of fine dark fractures (two scales, the finer only near the
 * camera), a little glassier along them, in patches rather than everywhere.
 */
const CRACKS = /* glsl */ `{
		vec2 cp = vGroundPos.xz;
		float patchK = smoothstep( 0.45, 0.7, gFbm( cp * 0.05 + 11.0 ) );
		float wobble = ( gNoise( cp * 3.0 ) - 0.5 ) * 0.06;
		float big = gCracks( cp * 0.35 + wobble );
		float fine = gCracks( cp * 1.3 + 4.0 + wobble ) ;
		float pxc = length( fwidth( cp ) );
		float crack = ( 1.0 - smoothstep( 0.0, 0.035 + pxc * 0.2, big ) ) * patchK;
		crack = max( crack, ( 1.0 - smoothstep( 0.0, 0.05 + pxc, fine ) ) * patchK * 0.55 * ( 1.0 - smoothstep( 0.02, 0.08, pxc ) ) );
		diffuseColor.rgb *= 1.0 - crack * 0.55;
		roughnessFactor = mix( roughnessFactor, 0.18, crack );
	}`;

/** Shared by every snow and ice surface: NIGHT.snow (sparkle, variation). */
export const groundUniforms = {
  sparkle: { value: NIGHT.snow.sparkle },
  variation: { value: NIGHT.snow.variation },
};

export function applyGroundNight(): void {
  groundUniforms.sparkle.value = NIGHT.snow.sparkle;
  groundUniforms.variation.value = NIGHT.snow.variation;
}

export type GroundKind = 'snow' | 'path' | 'ice';

/**
 * The snow (and the ice) at night. Large drifts of lighter and darker snow break up the tiled texture;
 * roughness varies too, and on trodden paths and the ice there are glassy patches that pick up the sky
 * and the moon. The lake's ice is crazed with fine cracks. Tiny crystals glint where light actually
 * falls, and change as the player moves.
 */
export function applySnowGround(mat: MeshStandardMaterial, kind: GroundKind): void {
  const icy = kind !== 'snow';
  addShaderPatch(mat, `nm-ground-${kind}`, (shader) => {
    shader.uniforms.groundSparkle = groundUniforms.sparkle;
    shader.uniforms.groundVariation = groundUniforms.variation;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGroundPos;')
      .replace(
        '#include <project_vertex>',
        '#include <project_vertex>\n\tvGroundPos = transpose( mat3( viewMatrix ) ) * ( mvPosition.xyz - viewMatrix[ 3 ].xyz );',
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
varying vec3 vGroundPos;
uniform float groundSparkle;
uniform float groundVariation;
float gHash( vec2 p ) {
  vec3 p3 = fract( vec3( p.xyx ) * 0.1031 );
  p3 += dot( p3, p3.yzx + 33.33 );
  return fract( ( p3.x + p3.y ) * p3.z );
}
float gNoise( vec2 p ) {
  vec2 i = floor( p ), f = fract( p );
  f = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( gHash( i ), gHash( i + vec2( 1.0, 0.0 ) ), f.x ), mix( gHash( i + vec2( 0.0, 1.0 ) ), gHash( i + vec2( 1.0, 1.0 ) ), f.x ), f.y );
}
float gFbm( vec2 p ) {
  return gNoise( p ) * 0.55 + gNoise( p * 2.3 + 7.1 ) * 0.3 + gNoise( p * 5.1 + 2.3 ) * 0.15;
}
// distance to the nearest edge between Voronoi cells (cracks in the ice)
float gCracks( vec2 p ) {
  vec2 i = floor( p ), f = fract( p );
  float d1 = 8.0, d2 = 8.0;
  for ( int y = -1; y <= 1; y++ ) for ( int x = -1; x <= 1; x++ ) {
    vec2 g = vec2( float( x ), float( y ) );
    vec2 o = vec2( gHash( i + g ), gHash( i + g + 17.3 ) );
    float d = length( g + o - f );
    if ( d < d1 ) { d2 = d1; d1 = d; } else if ( d < d2 ) d2 = d;
  }
  return d2 - d1;
}`,
      )
      .replace(
        '#include <color_fragment>',
        /* glsl */ `#include <color_fragment>
	// wind-blown drifts: broad lighter and darker patches over the tiled texture
	diffuseColor.rgb *= 1.0 + groundVariation * ( ( gFbm( vGroundPos.xz * 0.04 ) - 0.5 ) * 1.6 + ( gNoise( vGroundPos.xz * 0.6 ) - 0.5 ) * 0.4 );`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        /* glsl */ `#include <roughnessmap_fragment>
	roughnessFactor = clamp( roughnessFactor * mix( 0.8, 1.15, gNoise( vGroundPos.xz * 0.35 ) ), 0.04, 1.0 );
	${icy ? '// compacted, glassy patches\n\troughnessFactor = mix( roughnessFactor, 0.32, smoothstep( 0.62, 0.74, gFbm( vGroundPos.xz * 0.45 + 3.0 ) ) );' : ''}
	${kind === 'ice' ? CRACKS : ''}`,
      )
      .replace(
        '#include <opaque_fragment>',
        /* glsl */ `{
		// glints: a crystal in some cells of a fine grid flashes for a few view directions
		vec2 cellP = vGroundPos.xz * 38.0;
		vec2 cellId = floor( cellP );
		vec3 V = normalize( cameraPosition - vGroundPos );
		vec3 q = floor( V * 9.0 );
		float flash = step( ${icy ? '0.9988' : '0.9972'}, gHash( cellId + q.xz * 13.1 + q.y * 7.7 ) );
		float dotK = 1.0 - smoothstep( 0.0, 0.32, length( fract( cellP ) - 0.5 ) );
		// none where a cell is smaller than a pixel: distant glitter would only shimmer
		float px = length( fwidth( cellP ) );
		float near = 1.0 - smoothstep( 0.3, 0.8, px );
		float lit = dot( outgoingLight, vec3( 0.2126, 0.7152, 0.0722 ) );
		outgoingLight += vec3( 0.85, 0.9, 1.0 ) * flash * dotK * near * groundSparkle * min( lit * 30.0, 4.0 );
	}
	#include <opaque_fragment>`,
      );
  });
}
