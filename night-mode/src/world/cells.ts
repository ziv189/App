import type { CellDef, CellId } from './Cell';

/**
 * The rooms of Hale House. Positions are in game space (glTF: +Y up); the Blender build scripts use
 * Z-up, so a Blender point (x, y, z) is (x, z, -y) here.
 */
export const CELLS: CellDef[] = [
  {
    id: 'exterior',
    title: 'Garden and lake',
    file: 'assets/rooms/exterior.glb',
    approxBytes: 9_000_000,
    footsteps: 'snow',
    reverb: 'outdoor',
    ambience: [
      { sound: 'wind_ext', volume: 0.55 },
    ],
    // an open snowfield under a clear sky; its low sun becomes the moon, south-east like the baked moonlight
    sky: { hdri: 'horn-koppe_snow_2k', intensity: 0.045, tint: [0.42, 0.55, 1.0], rotationDeg: -12 },
    nightLights: [],
    // above the roof: sees the sky, the snow all round and the lake (the house itself is hollow)
    probe: [-4.5, 14, -3.5],
    exterior: true,
  },
  {
    id: 'hall',
    title: 'Hall',
    file: 'assets/rooms/hall.glb',
    approxBytes: 7_000_000,
    footsteps: 'wood',
    reverb: 'hall',
    ambience: [
      { sound: 'wind_int', volume: 0.16 },
      { sound: 'room_tone', volume: 0.25 },
    ],
    sky: null,
    nightLights: [
      [-0.8, 0.3, 4.4],
      [1.2, 0.3, -1.0],
      [-2.9, 3.9, -1.6],
    ],
    probe: [-1.2, 1.6, 1.5],
  },
  {
    id: 'living',
    title: 'Living room',
    file: 'assets/rooms/living.glb',
    approxBytes: 7_000_000,
    footsteps: 'wood',
    reverb: 'room',
    ambience: [
      { sound: 'wind_int', volume: 0.2 },
      { sound: 'room_tone', volume: 0.2 },
    ],
    sky: { hdri: 'horn-koppe_snow_1k', intensity: 0.05, tint: [0.42, 0.55, 1.0] },
    nightLights: [
      [0.3, 0.3, 4.0],
    ],
    probe: [0.3, 1.5, 4.3],
  },
  {
    id: 'kitchen',
    title: 'Kitchen',
    file: 'assets/rooms/kitchen.glb',
    approxBytes: 8_000_000,
    footsteps: 'wood',
    reverb: 'room',
    ambience: [
      { sound: 'fridge_hum', volume: 0.35 },
      { sound: 'wind_int', volume: 0.12 },
    ],
    sky: { hdri: 'horn-koppe_snow_1k', intensity: 0.05, tint: [0.42, 0.55, 1.0] },
    nightLights: [
      [-1.8, 0.95, 0.0],
    ],
    probe: [0.3, 1.5, 1.1],
  },
  {
    id: 'bedroom',
    title: 'Bedroom',
    file: 'assets/rooms/bedroom.glb',
    approxBytes: 6_000_000,
    footsteps: 'wood',
    reverb: 'room',
    ambience: [
      { sound: 'wind_int', volume: 0.18 },
    ],
    sky: { hdri: 'snowy_forest_path_01_1k', intensity: 0.05, tint: [0.42, 0.55, 1.0] },
    nightLights: [
      [0.5, 0.3, 1.0],
    ],
    probe: [0.6, 1.5, 1.4],
  },
  {
    id: 'bathroom',
    title: 'Bathroom',
    file: 'assets/rooms/bathroom.glb',
    approxBytes: 6_000_000,
    footsteps: 'tile',
    reverb: 'small',
    ambience: [
      { sound: 'wind_int', volume: 0.1 },
    ],
    sky: { hdri: 'snowy_forest_path_01_1k', intensity: 0.05, tint: [0.42, 0.55, 1.0] },
    nightLights: [
      [1.8, 0.3, -1.2],
    ],
    probe: [0.0, 1.5, -1.3],
  },
  {
    id: 'ivy',
    title: "Ivy's room",
    file: 'assets/rooms/ivy.glb',
    approxBytes: 4_000_000,
    footsteps: 'wood',
    reverb: 'room',
    ambience: [
      { sound: 'wind_int', volume: 0.22 },
    ],
    sky: { hdri: 'horn-koppe_snow_1k', intensity: 0.05, tint: [0.42, 0.55, 1.0] },
    nightLights: [],
    probe: [0, 1.4, 0],
  },
  {
    id: 'basement',
    title: 'Basement',
    file: 'assets/rooms/basement.glb',
    approxBytes: 5_000_000,
    footsteps: 'concrete',
    reverb: 'basement',
    ambience: [
      { sound: 'basement_amb', volume: 0.45 },
      { sound: 'server_hum', volume: 0.3 },
    ],
    sky: null,
    nightLights: [],
    probe: [0, 1.4, 0],
  },
];

/** Door pairs: walking through one arrives at the other. [room, door id] as named in the room files. */
export const DOOR_LINKS: [[CellId, string], [CellId, string]][] = [
  [['exterior', 'front'], ['hall', 'front']],
  [['hall', 'living'], ['living', 'hall']],
  [['hall', 'kitchen'], ['kitchen', 'hall']],
  [['hall', 'bedroom'], ['bedroom', 'hall']],
  [['hall', 'bathroom'], ['bathroom', 'hall']],
  [['hall', 'ivy'], ['ivy', 'hall']],
  [['kitchen', 'basement'], ['basement', 'kitchen']],
  [['kitchen', 'back'], ['exterior', 'back']],
  [['basement', 'coal'], ['exterior', 'coal']],
];

/** Story order, used to load rooms in the background while the player is busy. */
export const LOAD_ORDER: CellId[] = ['exterior', 'hall', 'kitchen', 'living', 'bedroom', 'bathroom', 'ivy', 'basement'];
