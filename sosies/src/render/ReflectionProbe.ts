import {
  CubeCamera,
  HalfFloatType,
  PMREMGenerator,
  Vector3,
  WebGLCubeRenderTarget,
  type Scene,
  type Texture,
  type WebGLRenderer,
} from 'three';

/**
 * Captures the lit room from one point into a cube map and prefilters it for reflections, so glossy
 * surfaces (floors, screens, varnish) reflect the actual room instead of the outdoor sky. Taken once
 * at load; the room's lighting is baked, so it doesn't need updating.
 */
export function captureReflectionProbe(
  renderer: WebGLRenderer,
  scene: Scene,
  position: readonly [number, number, number],
  size = 256,
): Texture {
  const target = new WebGLCubeRenderTarget(size, { type: HalfFloatType });
  const camera = new CubeCamera(0.05, 100, target);
  camera.position.copy(new Vector3(...position));
  const previousEnvironment = scene.environment;
  scene.environment = null; // capture the room lit by its lightmap alone
  camera.update(renderer, scene);
  scene.environment = previousEnvironment;

  const pmrem = new PMREMGenerator(renderer);
  const texture = pmrem.fromCubemap(target.texture).texture;
  pmrem.dispose();
  target.dispose();
  return texture;
}
