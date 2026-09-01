import type { Edge, Space, Vec2 } from '../space/types';
import type { Sun } from './solar';
import { bounds, centroid, hull } from './geom';

export type Occluder = {
  footprint: Vec2[];
  height: number;
  /** A wall sweeps its shadow along the ground; a slab overhead just moves. */
  kind: 'vertical' | 'overhead';
  /** Blocks the ground underneath — a shed does, a tree doesn't. */
  solid?: boolean;
  /** Set when this came from a boundary edge, so a renderer can style it. */
  edge?: number;
};

/** Walls get a little thickness so they have a footprint to project. */
const WALL_THICK = 0.08;

/** Below this the sun is grazing and shadows would run to infinity. */
const MIN_ALT_RAD = 0.04;

/**
 * Shadow length is h / tan(altitude): stubby at noon, long at dusk. A wall
 * shadows the band between its base and the projected copy; a slab overhead is
 * floating, so its shadow is only the displaced outline.
 */
export function shadowOf(occ: Occluder, s: Sun, worldDiag: number): Vec2[] {
  const L = Math.min(occ.height / Math.tan(Math.max(s.alt, MIN_ALT_RAD)), worldDiag * 2.2);
  const ox = -L * s.dir.x;
  const oy = -L * s.dir.y;
  const moved = occ.footprint.map((p) => ({ x: p.x + ox, y: p.y + oy }));
  return occ.kind === 'overhead' ? moved : hull(occ.footprint.concat(moved));
}

/** The stretch of an edge a wall actually covers, clamped and ordered. */
export function edgeSpan(edge: Edge): { from: number; to: number } {
  if (!edge.span) return { from: 0, to: 1 };
  const from = Math.max(0, Math.min(1, edge.span.from));
  const to = Math.max(0, Math.min(1, edge.span.to));
  return from <= to ? { from, to } : { from: to, to: from };
}

/** How tall this wall actually stands: a half wall reaches half its height. */
export function wallHeight(edge: Edge): number {
  if (edge.wall === 'none') return 0;
  return edge.wall === 'half' ? edge.height / 2 : edge.height;
}

const lerp = (a: Vec2, b: Vec2, t: number): Vec2 => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

/** Turns an authored space into the list the shadow pass walks. */
export function occludersOf(space: Space): Occluder[] {
  const out: Occluder[] = [];
  const n = space.boundary.length;

  if (n >= 3) {
    const c = centroid(space.boundary);
    for (let i = 0; i < n; i++) {
      const e = space.edges[i];
      if (!e || e.wall === 'none' || e.height <= 0) continue;
      const corner = space.boundary[i];
      const next = space.boundary[(i + 1) % n];

      // Only the covered stretch casts shade; the rest of the edge is a gap.
      const { from, to } = edgeSpan(e);
      if (to - from <= 1e-6) continue;
      const a = lerp(corner, next, from);
      const b = lerp(corner, next, to);

      let nx = -(b.y - a.y);
      let ny = b.x - a.x;
      const len = Math.hypot(nx, ny) || 1;
      nx /= len;
      ny /= len;

      // Push the wall outward, away from the middle of the space.
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      if ((mx - c.x) * nx + (my - c.y) * ny < 0) {
        nx = -nx;
        ny = -ny;
      }

      const ox = nx * WALL_THICK;
      const oy = ny * WALL_THICK;
      out.push({
        footprint: [a, b, { x: b.x + ox, y: b.y + oy }, { x: a.x + ox, y: a.y + oy }],
        height: wallHeight(e),
        kind: 'vertical',
        solid: false,
        edge: i,
      });
    }
  }

  for (const o of space.obstacles) {
    if (o.footprint.length < 3 || o.height <= 0) continue;
    out.push({ footprint: o.footprint, height: o.height, kind: 'vertical', solid: o.solid });
  }

  if (space.overhead && space.overhead.footprint.length >= 3 && space.overhead.height > 0) {
    out.push({
      footprint: space.overhead.footprint,
      height: space.overhead.height,
      kind: 'overhead',
    });
  }

  return out;
}

export type ShadowMask = { poly: Vec2[]; minX: number; maxX: number; minY: number; maxY: number };

/**
 * Shadows carry their bounding box so the cell sweep can reject most cells with
 * four comparisons instead of a ray cast.
 */
export function maskOf(poly: Vec2[]): ShadowMask {
  return { poly, ...bounds(poly) };
}
