import type { Space, Vec2 } from '../space/types';
import { distanceToSegment } from './geom';

/** How far a wall's shelter or an open edge's draught reaches, in metres. */
const EDGE_REACH = 2;

/** How far from a door still counts as easy to reach. */
const DOOR_REACH = 4;

/**
 * The three things about a spot that aren't sunlight: shelter and stored heat
 * from nearby walls, draught through the open edges, and how far you'd walk to
 * water it.
 */
export function microclimate(p: Vec2, space: Space) {
  let nearWall = 0;
  let wind = 0;
  let access = 0;

  const n = space.boundary.length;
  for (let i = 0; i < n; i++) {
    const e = space.edges[i];
    const a = space.boundary[i];
    const b = space.boundary[(i + 1) % n];
    // A door pulls from further away than a wall shelters, so it gets its own reach.
    if (e?.door != null) {
      const door = { x: a.x + e.door * (b.x - a.x), y: a.y + e.door * (b.y - a.y) };
      access = Math.max(access, Math.max(0, 1 - Math.hypot(p.x - door.x, p.y - door.y) / DOOR_REACH));
    }

    const influence = Math.max(0, 1 - distanceToSegment(p, a, b) / EDGE_REACH);
    if (influence === 0) continue;

    if (e && e.wall !== 'none' && e.height > 0) {
      nearWall = Math.max(nearWall, influence);
    } else {
      wind = Math.max(wind, influence);
    }
  }

  return { nearWall, wind, access };
}
