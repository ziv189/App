import { Raycaster, Vector2, type Mesh, type PerspectiveCamera } from 'three';
import type { Cell } from './Cell';

export interface InteractTarget {
  id: string;
  mesh: Mesh;
  distance: number;
}

/**
 * Finds what the player is looking at: a ray from the centre of the screen against the current room's
 * interaction volumes (I_ boxes), within arm's reach. Walls in between block it.
 */
export class Interaction {
  reach = 2.1;
  private readonly ray = new Raycaster();
  private readonly centre = new Vector2(0, 0);

  constructor(private readonly camera: PerspectiveCamera) {}

  pick(cell: Cell | null, enabled: (id: string) => boolean): InteractTarget | null {
    if (!cell) return null;
    this.ray.setFromCamera(this.centre, this.camera);
    this.ray.far = this.reach + 1.5;
    const candidates = cell.proxies.filter((p) => enabled(String(p.userData.interact)));
    if (!candidates.length) return null;
    const hits = this.ray.intersectObjects(candidates, false);
    // Accept proxies we are inside of or pointing at, nearest first.
    for (const hit of hits) {
      if (hit.distance > this.reach) break;
      return { id: String(hit.object.userData.interact), mesh: hit.object as Mesh, distance: hit.distance };
    }
    return null;
  }
}
