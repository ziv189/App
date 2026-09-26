import {
  EquirectangularReflectionMapping,
  PMREMGenerator,
  type Scene,
  type Texture,
  type WebGLRenderer,
} from 'three';
import type { HDRLoader } from 'three/addons/loaders/HDRLoader.js';

export interface SkyDef {
  /** Equirectangular .hdr image (e.g. from Poly Haven). */
  url: string;
  /** Show the image as the visible sky. Interiors with no windows can skip this. */
  background: boolean;
  /** Strength of image-based lighting on materials. */
  environmentIntensity: number;
  backgroundIntensity: number;
  /** 0 = sharp sky, 1 = fully blurred. */
  backgroundBlurriness: number;
  /** Rotates the sky (and its lighting) around the vertical axis, in degrees. */
  rotationDeg: number;
}

/**
 * Loads an HDR sky and uses it for image-based lighting (reflections and ambient light on PBR
 * materials). Real SOSIES interiors will add baked lightmaps and local reflection probes on top.
 */
export async function applySky(
  renderer: WebGLRenderer,
  scene: Scene,
  loader: HDRLoader,
  sky: SkyDef,
  onProgress?: (event: ProgressEvent) => void,
): Promise<Texture> {
  const hdr = await loader.loadAsync(sky.url, onProgress);
  hdr.mapping = EquirectangularReflectionMapping;

  const pmrem = new PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(hdr).texture;
  pmrem.dispose();

  scene.environment = env;
  scene.environmentIntensity = sky.environmentIntensity;
  scene.environmentRotation.set(0, (sky.rotationDeg * Math.PI) / 180, 0);
  if (sky.background) {
    scene.background = hdr;
    scene.backgroundIntensity = sky.backgroundIntensity;
    scene.backgroundBlurriness = sky.backgroundBlurriness;
    scene.backgroundRotation.set(0, (sky.rotationDeg * Math.PI) / 180, 0);
  } else {
    hdr.dispose();
  }
  return env;
}
