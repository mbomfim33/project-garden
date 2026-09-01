import type { Space, Vec2 } from '../space/types';
import { distanceToSegment } from './geom';
import { edgeSpan, wallHeight } from './occluders';

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
    const at = (t: number): Vec2 => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    const reach = (p0: Vec2, p1: Vec2) => Math.max(0, 1 - distanceToSegment(p, p0, p1) / EDGE_REACH);

    // A door pulls from further away than a wall shelters, so it gets its own reach.
    if (e?.door != null) {
      const door = at(e.door);
      access = Math.max(access, Math.max(0, 1 - Math.hypot(p.x - door.x, p.y - door.y) / DOOR_REACH));
    }

    // Shelter where the wall runs, draught through whatever it leaves open.
    const { from, to } = e && wallHeight(e) > 0 ? edgeSpan(e) : { from: 0, to: 0 };
    if (to > from) nearWall = Math.max(nearWall, reach(at(from), at(to)));
    if (from > 0) wind = Math.max(wind, reach(a, at(from)));
    if (to < 1) wind = Math.max(wind, reach(at(to), b));
  }

  return { nearWall, wind, access };
}
