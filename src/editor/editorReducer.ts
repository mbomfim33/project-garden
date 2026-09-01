import type { BaseImage, Edge, Obstacle, Overhead, Space, Vec2 } from '../space/types';
import { projectToSegment } from '../engine';

export type EditorDoc = {
  space: Space;
  /** Editor-only: a boundary being drawn isn't a ring yet. Never persisted. */
  closed: boolean;
};

export type Action =
  | { kind: 'ADD_VERTEX'; p: Vec2 }
  | { kind: 'MOVE_VERTEX'; i: number; p: Vec2 }
  | { kind: 'INSERT_VERTEX'; edge: number; p: Vec2 }
  | { kind: 'DELETE_VERTEX'; i: number }
  | { kind: 'CLOSE' }
  | { kind: 'REOPEN' }
  | { kind: 'SEED_RECT'; w: number; h: number; walled: boolean }
  | { kind: 'CYCLE_WALL'; i: number }
  | { kind: 'SET_EDGE'; i: number; patch: Partial<Edge> }
  | { kind: 'SET_DOOR'; i: number; t: number | null }
  | { kind: 'ADD_OBSTACLE'; obstacle: Obstacle }
  | { kind: 'SET_OBSTACLE'; i: number; patch: Partial<Obstacle> }
  | { kind: 'DELETE_OBSTACLE'; i: number }
  | { kind: 'ADD_OVERHEAD'; overhead: Overhead }
  | { kind: 'SET_OVERHEAD'; i: number; patch: Partial<Overhead> }
  | { kind: 'DELETE_OVERHEAD'; i: number }
  | { kind: 'CLEAR_OVERHEADS' }
  | { kind: 'SET_GEO'; patch: Partial<Space['geo']> }
  | { kind: 'SET_NAME'; name: string }
  | { kind: 'SET_BASE'; base: BaseImage | undefined };

const WALL_CYCLE = { full: 'half', half: 'none', none: 'full' } as const;

const DEFAULT_WALL_HEIGHT = 2.4;

/** Nearest point on the edge, so an inserted vertex lands on the line. */
export function projectToEdge(p: Vec2, a: Vec2, b: Vec2): Vec2 {
  return projectToSegment(p, a, b).point;
}

const openEdge = (): Edge => ({ wall: 'none', height: 0 });

function withSpace(doc: EditorDoc, patch: Partial<Space>): EditorDoc {
  return { ...doc, space: { ...doc.space, ...patch } };
}

/**
 * Splits one edge in two at parameter t. Both halves inherit the wall, and a
 * door on the original stays where it was by rescaling into whichever half now
 * contains it.
 */
function splitEdge(edge: Edge, t: number): [Edge, Edge] {
  const first: Edge = { wall: edge.wall, height: edge.height };
  const second: Edge = { wall: edge.wall, height: edge.height };
  if (edge.door != null && t > 0 && t < 1) {
    if (edge.door <= t) first.door = edge.door / t;
    else second.door = (edge.door - t) / (1 - t);
  }
  return [first, second];
}

export function reducer(doc: EditorDoc, action: Action): EditorDoc {
  const { space } = doc;
  const boundary = space.boundary;
  const edges = space.edges;

  switch (action.kind) {
    case 'ADD_VERTEX':
      return withSpace(doc, {
        boundary: [...boundary, action.p],
        edges: [...edges, openEdge()],
      });

    case 'MOVE_VERTEX': {
      if (action.i < 0 || action.i >= boundary.length) return doc;
      const next = boundary.slice();
      next[action.i] = action.p;
      return withSpace(doc, { boundary: next });
    }

    case 'INSERT_VERTEX': {
      const n = boundary.length;
      if (action.edge < 0 || action.edge >= n) return doc;
      const a = boundary[action.edge];
      const b = boundary[(action.edge + 1) % n];
      const t = projectToSegment(action.p, a, b).t;

      const nextBoundary = boundary.slice();
      nextBoundary.splice(action.edge + 1, 0, action.p);

      const nextEdges = edges.slice();
      const [first, second] = splitEdge(edges[action.edge] ?? openEdge(), t);
      nextEdges.splice(action.edge, 1, first, second);

      return withSpace(doc, { boundary: nextBoundary, edges: nextEdges });
    }

    case 'DELETE_VERTEX': {
      if (boundary.length <= 3) return doc;
      if (action.i < 0 || action.i >= boundary.length) return doc;
      return withSpace(doc, {
        boundary: boundary.filter((_, i) => i !== action.i),
        // Dropping this index merges the two edges either side of it and keeps
        // the leading one's wall.
        edges: edges.filter((_, i) => i !== action.i),
      });
    }

    case 'CLOSE':
      return boundary.length >= 3 ? { ...doc, closed: true } : doc;

    case 'REOPEN':
      return { ...doc, closed: false };

    case 'SEED_RECT': {
      const { w, h, walled } = action;
      if (!(w > 0) || !(h > 0)) return doc;
      const ring: Vec2[] = [
        { x: 0, y: 0 },
        { x: w, y: 0 },
        { x: w, y: h },
        { x: 0, y: h },
      ];
      // Walled seed: building behind you, walls to the sides, open to the front.
      const seeded: Edge[] = walled
        ? [
            { wall: 'full', height: 2.8, door: 0.5 },
            { wall: 'full', height: 2.5 },
            openEdge(),
            { wall: 'full', height: 2.5 },
          ]
        : ring.map(openEdge);
      return { ...doc, closed: true, space: { ...space, boundary: ring, edges: seeded } };
    }

    case 'CYCLE_WALL': {
      const edge = edges[action.i];
      if (!edge) return doc;
      const wall = WALL_CYCLE[edge.wall];
      const next = edges.slice();
      next[action.i] = {
        ...edge,
        wall,
        height: wall === 'none' ? 0 : edge.height || DEFAULT_WALL_HEIGHT,
      };
      return withSpace(doc, { edges: next });
    }

    case 'SET_EDGE': {
      if (!edges[action.i]) return doc;
      const next = edges.slice();
      next[action.i] = { ...next[action.i], ...action.patch };
      return withSpace(doc, { edges: next });
    }

    case 'SET_DOOR': {
      const edge = edges[action.i];
      if (!edge) return doc;
      const next = edges.slice();
      if (action.t == null) {
        const { door: _door, ...rest } = edge;
        next[action.i] = rest;
      } else {
        next[action.i] = { ...edge, door: Math.max(0, Math.min(1, action.t)) };
      }
      return withSpace(doc, { edges: next });
    }

    case 'ADD_OBSTACLE':
      return withSpace(doc, { obstacles: [...space.obstacles, action.obstacle] });

    case 'SET_OBSTACLE': {
      if (!space.obstacles[action.i]) return doc;
      const next = space.obstacles.slice();
      next[action.i] = { ...next[action.i], ...action.patch };
      return withSpace(doc, { obstacles: next });
    }

    case 'DELETE_OBSTACLE':
      return withSpace(doc, { obstacles: space.obstacles.filter((_, i) => i !== action.i) });

    case 'ADD_OVERHEAD':
      return withSpace(doc, { overheads: [...(space.overheads ?? []), action.overhead] });

    case 'SET_OVERHEAD': {
      const list = space.overheads ?? [];
      if (!list[action.i]) return doc;
      const next = list.slice();
      next[action.i] = { ...next[action.i], ...action.patch };
      return withSpace(doc, { overheads: next });
    }

    case 'DELETE_OVERHEAD':
      return withSpace(doc, { overheads: (space.overheads ?? []).filter((_, i) => i !== action.i) });

    case 'CLEAR_OVERHEADS':
      return withSpace(doc, { overheads: [] });

    case 'SET_GEO':
      return withSpace(doc, { geo: { ...space.geo, ...action.patch } });

    case 'SET_NAME':
      return withSpace(doc, { name: action.name });

    case 'SET_BASE': {
      const next = { ...space };
      if (action.base) next.base = action.base;
      else delete next.base;
      return { ...doc, space: next };
    }

    default:
      return doc;
  }
}
