import { DirectionalLight } from 'three';
import type { LevelDef } from '../assets/Level';

/**
 * TECH TEST (not game content): Crytek Sponza, the standard real-time lighting test scene, under an
 * overcast dusk sky. Used only to prove movement, collision, lighting, post-processing and performance
 * until the first real SOSIES location replaces it. Files come from `npm run assets:test`.
 */
export const techTest: LevelDef = {
  id: 'tech-test',
  title: 'Milestone 0 · Tech test',
  watermark: 'Tech test · Sponza © Crytek (Khronos sample) · not game content',
  gltf: { path: 'assets/tech-test/sponza.glb', approxBytes: 25_700_000 },
  sky: {
    path: 'assets/tech-test/sky_2k.hdr',
    approxBytes: 3_190_000,
    background: true,
    // Dim dusk sky + a warm low sun: enough contrast to judge shadows, AO and tone mapping.
    environmentIntensity: 0.4,
    backgroundIntensity: 0.55,
    backgroundBlurriness: 0,
    rotationDeg: 0,
  },
  // West end of the courtyard, looking east down its length.
  spawn: { position: [-10.5, 0.5, -0.4], yawDeg: -90 },
  fog: { color: 0x59606a, density: 0.012 },
  look: { exposure: 1.1, aoRadius: 1.6 },
  fetchHint: 'npm run assets:test',
  setup: ({ scene }) => {
    // Low evening sun raking across the courtyard (real SOSIES rooms will use baked lighting instead).
    const sun = new DirectionalLight(0xffdcb8, 4);
    sun.name = 'TechTestSun';
    sun.position.set(18, 13, 7);
    sun.target.position.set(0, 0, 0);
    sun.castShadow = true;
    const cam = sun.shadow.camera;
    cam.left = -20;
    cam.right = 20;
    cam.top = 20;
    cam.bottom = -20;
    cam.near = 1;
    cam.far = 60;
    sun.shadow.bias = -0.0002;
    sun.shadow.normalBias = 0.03;
    scene.add(sun, sun.target);
  },
};
