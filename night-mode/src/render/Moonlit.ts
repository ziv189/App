import { Vector3, type MeshStandardMaterial } from 'three';
import { addShaderPatch } from './Lightmap';
import { NIGHT } from './nightConfig';

const moon = new Vector3(...NIGHT.moonDirection).normalize();
const f = (n: number) => n.toFixed(4);

/**
 * The rest of the outdoors has its moonlight baked in; things added at runtime (the pines, the
 * telegraph poles) aren't part of the bake, so they get the same moon (from the same direction as the
 * baked shadows) and a little sky in their shader.
 */
export function moonlit(material: MeshStandardMaterial): void {
  addShaderPatch(material, 'nm-moonlit', (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      /* glsl */ `{
		vec3 wn = inverseTransformDirection( normal, viewMatrix );
		float moon = max( dot( wn, vec3( ${f(moon.x)}, ${f(moon.y)}, ${f(moon.z)} ) ), 0.0 );
		outgoingLight += diffuseColor.rgb * ( vec3( 0.2, 0.25, 0.4 ) * moon + vec3( 0.035, 0.045, 0.08 ) * ( 0.6 + 0.4 * wn.y ) );
	}
	#include <opaque_fragment>`,
    );
  });
}
