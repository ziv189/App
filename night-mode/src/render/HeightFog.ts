import { FogExp2, ShaderChunk, Vector3 } from 'three';
import { NIGHT } from './nightConfig';

let installed = false;

const f = (n: number) => (Number.isInteger(n) ? n.toFixed(1) : String(n));
const vec3 = (v: Vector3) => `vec3( ${f(v.x)}, ${f(v.y)}, ${f(v.z)} )`;

/** Linear RGB of an sRGB hex colour, for constants compiled into shaders. */
function linear(hex: string): Vector3 {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return new Vector3(c((n >> 16) & 255), c((n >> 8) & 255), c(n & 255));
}

/**
 * Replaces three.js's exponential fog (FogExp2) with height fog for every built-in material: dense
 * over the snow and the ice, thinning with height (the fog integrated along each view ray), and
 * brighter towards the moon where its light scatters in the haze. `FogExp2.density` is the density at
 * the base height; `FogExp2.color` the colour. Linear fog (THREE.Fog) is left as it was.
 *
 * Must run before the first material compiles.
 */
export function installHeightFog(): void {
  if (installed) return;
  installed = true;
  const fog = NIGHT.fog;
  const moon = new Vector3(...NIGHT.moonDirection).normalize();

  ShaderChunk.fog_pars_vertex = /* glsl */ `
#ifdef USE_FOG
	varying float vFogDepth;
	varying vec3 vFogWorld;
#endif
`;
  // world position from the view-space one: works for every kind of mesh (instanced, skinned, points)
  ShaderChunk.fog_vertex = /* glsl */ `
#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
	vFogWorld = transpose( mat3( viewMatrix ) ) * ( mvPosition.xyz - viewMatrix[ 3 ].xyz );
#endif
`;
  ShaderChunk.fog_pars_fragment = /* glsl */ `
#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	varying vec3 vFogWorld;
	#ifdef FOG_EXP2
		uniform float fogDensity;
		const vec3 NM_MOON_DIR = ${vec3(moon)};
		const vec3 NM_FOG_SCATTER = ${vec3(linear(fog.moonScatter))};
		const float NM_FOG_SCATTER_POWER = ${f(fog.moonScatterPower)};
		const float NM_FOG_BASE = ${f(fog.baseHeight)};
		const float NM_FOG_FALLOFF = ${f(fog.falloff)};
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif
`;
  ShaderChunk.fog_fragment = /* glsl */ `
#ifdef USE_FOG
	#ifdef FOG_EXP2
		vec3 fogRay = vFogWorld - cameraPosition;
		float fogDist = length( fogRay );
		// density falls off exponentially with height: integrate it along the ray
		float fogA = max( NM_FOG_FALLOFF * ( cameraPosition.y - NM_FOG_BASE ), -4.0 );
		float fogB = max( NM_FOG_FALLOFF * ( vFogWorld.y - NM_FOG_BASE ), -4.0 );
		float fogH = abs( fogB - fogA ) > 1e-4 ? ( exp( - fogA ) - exp( - fogB ) ) / ( fogB - fogA ) : exp( - fogA );
		float fogFactor = 1.0 - exp( - fogDensity * fogDist * fogH );
		float fogMoon = pow( max( dot( fogRay / max( fogDist, 1e-4 ), NM_MOON_DIR ), 0.0 ), NM_FOG_SCATTER_POWER );
		gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor + NM_FOG_SCATTER * fogMoon, fogFactor );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
		gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
	#endif
#endif
`;
}

/** The outdoor night fog (NIGHT.fog). */
export function createNightFog(): FogExp2 {
  const fog = new FogExp2(NIGHT.fog.color, NIGHT.fog.density);
  fog.name = 'night';
  return fog;
}
