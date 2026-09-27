import { BufferAttribute, BufferGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { HouseWindows } from '../src/fx/HouseWindows';
import type { Cell } from '../src/world/Cell';

/** Glass quads facing +z (the front of the house): [x0, x1, y0, y1, z]. */
function glass(quads: [number, number, number, number, number][]): Mesh {
  const pos: number[] = [];
  const nrm: number[] = [];
  const index: number[] = [];
  for (const [x0, x1, y0, y1, z] of quads) {
    const base = pos.length / 3;
    pos.push(x0, y0, z, x1, y0, z, x1, y1, z, x0, y1, z);
    for (let i = 0; i < 4; i++) nrm.push(0, 0, 1);
    index.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  geo.setAttribute('normal', new BufferAttribute(new Float32Array(nrm), 3));
  geo.setIndex(index);
  const material = new MeshStandardMaterial();
  material.name = 'NM_WindowGlow_3';
  return new Mesh(geo, material);
}

function house() {
  const root = new Group();
  const mesh = glass([
    // A: a sash window, its upper sash a little proud of the lower one
    [-2.0, -1.6, 0.52, 1.3, 3.868],
    [-2.0, -1.6, 1.35, 2.14, 3.91],
    // B: a metre along the same wall (the same room)
    [-1.0, -0.6, 0.52, 2.14, 3.868],
    // C: at the far end of the wall (a room of its own)
    [3.0, 3.4, 0.52, 2.14, 3.868],
    // a lantern's glass by the door
    [-7.04, -6.89, 1.82, 1.98, 1.19],
    // D: upstairs, above A
    [-2.0, -1.6, 3.93, 5.31, 3.868],
  ]);
  root.add(mesh);
  const cell = { root, night: 0, brightness: 1, groundAt: () => -1.15 } as unknown as Cell;
  const group = new Group();
  return { windows: new HouseWindows(cell, group), mesh, group };
}

describe('house windows', () => {
  it('joins the sashes of a window, and tells lanterns from windows', () => {
    const { windows } = house();
    expect(windows.windows).toHaveLength(5);
    const a = windows.windows.find((w) => Math.abs(w.centre.x + 1.8) < 0.01 && w.storey === 0)!;
    expect(a.panes).toHaveLength(2);
    expect(a.width).toBeCloseTo(0.4);
    expect(a.height).toBeCloseTo(1.62);
    expect(a.normal.z).toBeCloseTo(1);
    // the ground floor's floor is below the sill
    expect(a.floorBelow).toBeCloseTo(0.87);
    const lantern = windows.windows.find((w) => w.lamp)!;
    expect(lantern.room).toBeNull();
    expect(windows.windows.filter((w) => w.lamp)).toHaveLength(1);
  });

  it('puts windows close together on one storey into one room, and wakes the house floor by floor', () => {
    const { windows } = house();
    const at = (x: number, storey: number) => windows.windows.find((w) => Math.abs(w.centre.x - x) < 0.01 && w.storey === storey)!;
    expect(windows.rooms).toHaveLength(3);
    expect(at(-1.8, 0).room).toBe(at(-0.8, 0).room);
    expect(at(3.2, 0).room).not.toBe(at(-1.8, 0).room);
    expect(at(-1.8, 1).room).not.toBe(at(-1.8, 0).room);
    expect([at(-1.8, 0), at(3.2, 0), at(-1.8, 1)].map((w) => w.room!.group)).toEqual([0, 1, 2]);
  });

  it('marks every vertex of the glass with its window, and lays light on the snow under the ground floor', () => {
    const { mesh, group } = house();
    expect(mesh.material).toHaveProperty('name', 'NM_WindowGlow_Rooms');
    const size = mesh.geometry.getAttribute('winSize');
    // the lantern's glass (vertices 16..19) is flagged as a lamp
    expect(Math.round(size.getW(16)) & 4).toBe(4);
    expect(Math.round(size.getW(0)) & 4).toBe(0);
    // A's two sashes carry the same window
    expect(mesh.geometry.getAttribute('winCentre').getX(0)).toBeCloseTo(mesh.geometry.getAttribute('winCentre').getX(4));
    const pools = group.getObjectByName('window_light') as Mesh;
    // one patch for each of the three windows downstairs, none upstairs or for the lantern
    expect(pools.geometry.getAttribute('position').count).toBe(12);
  });
});
