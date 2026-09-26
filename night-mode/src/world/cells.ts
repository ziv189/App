import type { CellDef, CellId } from './Cell';

/**
 * The rooms of Hale House. Positions are in game space (glTF: +Y up); the Blender build scripts use
 * Z-up, so a Blender point (x, y, z) is (x, z, -y) here.
 */
export const CELLS: CellDef[] = [
  {
    id: 'exterior',
    ramps: [{ from: [-5.35, -1.122, 7.02], to: [-5.35, -0.389, 5.509], width: 2.9 }],
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
    // the staircase: two flights of 29 cm steps; the upper flight's treads and the top of the landing
    // are missing from the room's collision mesh
    ramps: [
      { from: [1.45, 0.03, -0.55], to: [1.45, 1.79, -3.125], width: 1.6 },
      { from: [1.01, 1.79, -4.15], to: [-1.575, 3.56, -4.15], width: 1.6 },
    ],
    floors: [{ min: [-4.1, 3.3, -5.05], max: [-1.55, 3.56, -3.25] }],
    exposure: { moon: 1.5 },
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
    // a Victorian parlour: sage-green walls, an oxblood leather sofa
    palette: { Walls: '#8fa88c', SofaLeather: '#8a3b2c', RadiatorPanelsEnamel: '#d8d2c4' },
    exposure: { moon: 3.4 },
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
    // a farmhouse kitchen: butter-yellow walls, duck-egg cupboards
    palette: { Walls: '#ead7a4', CupboardUnits: '#8fb5ae', WindowFrame: '#e8e1d0' },
    exposure: { on: 0.75, moon: 1.5 },
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
    // the wardrobe's mirror door and the mirror over the dresser (both on the west wall, facing the room)
    mirrors: [
      { center: [-2.117, 0.954, -0.0125], width: 0.459, height: 1.635, yawDeg: 90 },
      { center: [-2.102, 1.16, 1.5925], width: 0.773, height: 0.556, yawDeg: 90 },
    ],
    // dusty-blue walls, a burgundy blanket
    palette: { Walls: '#86a0c6', Blankets: '#7f2d36', Curtains: '#efe6d8' },
    exposure: { on: 0.7, moon: 1.6 },
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
    // pale green paper and warm white woodwork
    palette: { Wallpaper: '#b9d6b9', WhiteWood: '#efe5d3' },
    exposure: { on: 0.55, moon: 1.5 },
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
    exposure: { on: 1.25, moon: 2.2 },
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
    ramps: [{ from: [-0.9, 0, -2.5], to: [2.375, 2.35, -2.5], width: 0.8 }],
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
    // one bare bulb: bright enough to find the breaker and the coal door without the flashlight
    exposure: { on: 2.0, moon: 2.4 },
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
