import { Box3, Color, DirectionalLight, PointLight, SpotLight, Vector3, type Mesh, type MeshStandardMaterial, type Object3D } from 'three';
import type { LevelDef } from '../assets/Level';

/** Meshes in `root` that use the material called `name`. */
function meshesWith(root: Object3D, name: string): Mesh[] {
  const out: Mesh[] = [];
  root.traverse((o) => {
    const m = o as Mesh;
    if (m.isMesh && !Array.isArray(m.material) && m.material.name === name) out.push(m);
  });
  return out;
}

/** World-space centre of everything using a material, so lights sit exactly on the lamp models. */
function centreOf(meshes: Mesh[]): Vector3 | null {
  if (meshes.length === 0) return null;
  const box = new Box3();
  for (const m of meshes) box.expandByObject(m);
  return box.getCenter(new Vector3());
}

/** Makes a lampshade glow. It must not cast shadows, or it would block the bulb inside it. */
function glow(meshes: Mesh[], color: number, intensity: number): void {
  for (const m of meshes) {
    const mat = m.material as MeshStandardMaterial;
    mat.emissive = new Color(color);
    mat.emissiveIntensity = intensity;
    m.castShadow = false;
  }
}

/**
 * TECH TEST (not game content): a furnished living room at dusk, lit by the window and two lamps.
 * It exists to test movement, collision, lighting, post-processing and performance until the first
 * real SOSIES location replaces it. Model: "Living Room" by Jay-Artist (CC BY 3.0), see CREDITS.md.
 */
export const techTest: LevelDef = {
  id: 'tech-test',
  title: 'Milestone 0 · Tech test',
  watermark: 'Tech test room · not game content',
  credits:
    'Test room: "Living Room" (The White Room) by Jay-Artist, CC BY 3.0, converted by B. Bitterli, N. Hull and ' +
    'M. McGuire, modified for real-time. Sky: Kloppenheim 01 by Greg Zaal and Jarod Guest, Poly Haven, CC0.',
  gltf: { path: 'assets/tech-test/living-room.glb', approxBytes: 6_023_080 },
  sky: {
    path: 'assets/tech-test/sky-dusk-2k.hdr',
    approxBytes: 3_187_954,
    // Seen through the windows; a little of it also lights the room.
    background: true,
    environmentIntensity: 0.3,
    backgroundIntensity: 0.5,
    backgroundBlurriness: 0,
    rotationDeg: 0,
  },
  // By the door, looking down the room towards the bay window.
  spawn: { position: [0.3, 0.5, 6.6], yawDeg: 0 },
  look: { exposure: 1, aoRadius: 0.5, aoIntensity: 2.5, bloomThreshold: 0.8 },
  fetchHint: 'git pull   (the test room is part of the repository)',
  setup: ({ scene, root }) => {
    // Cool dusk light coming in through the bay window.
    const dusk = new DirectionalLight(0x9db0d6, 1.4);
    dusk.name = 'Window light';
    dusk.position.set(0.3, 4.5, -6);
    dusk.target.position.set(0.3, 0.3, 3.5);
    dusk.castShadow = true;
    const cam = dusk.shadow.camera;
    cam.left = -6;
    cam.right = 6;
    cam.top = 6;
    cam.bottom = -6;
    cam.near = 1;
    cam.far = 20;
    dusk.shadow.bias = -0.0003;
    dusk.shadow.normalBias = 0.02;
    scene.add(dusk, dusk.target);

    // Floor lamp by the window: a shadowed spot shining down, plus a soft unshadowed glow.
    const shades = meshesWith(root, 'LampshaderOuter');
    const lamp = centreOf(shades);
    if (lamp) {
      glow(shades, 0xffb36b, 1.6);
      const spot = new SpotLight(0xffb36b, 12, 0, Math.PI / 2.6, 0.6, 2);
      spot.name = 'Floor lamp';
      spot.position.copy(lamp);
      spot.target.position.set(lamp.x, 0, lamp.z);
      spot.castShadow = true;
      spot.shadow.bias = -0.0005;
      spot.shadow.normalBias = 0.02;
      const fill = new PointLight(0xffb36b, 1.5, 0, 2);
      fill.name = 'Floor lamp glow';
      fill.position.copy(lamp);
      scene.add(spot, spot.target, fill);
    }

    // Paper lantern in the middle of the ceiling: no shadows, to keep the frame cheap.
    const lanternShade = meshesWith(root, 'CeilingLampshade');
    const lantern = centreOf(lanternShade);
    if (lantern) {
      glow(lanternShade, 0xffc68a, 1.2);
      const bulb = new PointLight(0xffc68a, 2.5, 0, 2);
      bulb.name = 'Ceiling lantern';
      bulb.position.copy(lantern);
      scene.add(bulb);
    }
  },
};
