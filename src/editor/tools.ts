import type { Obstacle, Overhead, Vec2 } from '../space/types';
import { circlePoly, signedArea } from '../engine';

export type Tool =
  | 'select'
  | 'draw'
  | 'insert'
  | 'wall'
  | 'door'
  | 'box'
  | 'tree'
  | 'overhead'
  | 'overheadTrace'
  | 'calibrate';

export const TOOL_HINT: Record<Tool, string> = {
  select: 'Drag a corner to move it. Tap one to remove it.',
  draw: 'Click to drop corners. Click the first one again, or press Enter, to close the shape.',
  insert: 'Click a wall to add a corner on it.',
  wall: 'Click an edge to cycle full wall, half wall, open. Set its height on the right.',
  door: 'Click an edge to put a door on it, then drag the marker along.',
  box: 'Drag out a rectangle for a shed, a raised bed or a neighbouring wall.',
  tree: 'Click where the trunk is. Set the canopy radius and height on the right.',
  overhead: 'Drag out a rectangle for the roof above you.',
  overheadTrace: 'Click corner by corner to trace a roof piece. Click the first corner again to finish.',
  calibrate: 'Drag a line along something whose length you know, then type the length.',
};

/** Which tools need a closed boundary before they mean anything. */
export const NEEDS_SHAPE: Tool[] = [
  'insert',
  'wall',
  'door',
  'box',
  'tree',
  'overhead',
  'overheadTrace',
];

export function rectFootprint(p0: Vec2, p1: Vec2): Vec2[] {
  const x0 = Math.min(p0.x, p1.x);
  const x1 = Math.max(p0.x, p1.x);
  const y0 = Math.min(p0.y, p1.y);
  const y1 = Math.max(p0.y, p1.y);
  return [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ];
}

export function makeBox(p0: Vec2, p1: Vec2, height: number, label = 'Structure'): Obstacle {
  return { footprint: rectFootprint(p0, p1), height, solid: true, label };
}

/** A tree casts shade but you can still plant under it, so it isn't solid. */
export function makeTree(centre: Vec2, radius: number, height: number): Obstacle {
  return {
    footprint: circlePoly(centre.x, centre.y, radius, 14),
    height,
    solid: false,
    label: 'Tree',
  };
}

export function makeOverhead(p0: Vec2, p1: Vec2, clearance: number): Overhead {
  return { footprint: rectFootprint(p0, p1), height: clearance };
}

/**
 * Nudges a dragged rectangle out to a usable size. Dragging along an edge is a
 * natural gesture and gives a rectangle with no depth; better to give it some
 * than to throw the gesture away.
 */
export function atLeast(p0: Vec2, p1: Vec2, minM = 0.4): [Vec2, Vec2] {
  const out: [Vec2, Vec2] = [{ ...p0 }, { ...p1 }];
  for (const axis of ['x', 'y'] as const) {
    const span = Math.abs(out[1][axis] - out[0][axis]);
    if (span >= minM) continue;
    const mid = (out[0][axis] + out[1][axis]) / 2;
    out[0][axis] = mid - minM / 2;
    out[1][axis] = mid + minM / 2;
  }
  return out;
}

/** The roof covering the whole space, which is the common balcony case. */
export function overheadOverAll(boundary: Vec2[], clearance: number): Overhead {
  return { footprint: boundary.map((p) => ({ ...p })), height: clearance };
}

/**
 * Pushes a ring outward by a fixed distance, for the bit of roof that reaches
 * past the walls. Each edge line moves out and consecutive lines are
 * intersected, so corners stay sharp instead of rounding off.
 */
export function growPolygon(poly: Vec2[], metres: number): Vec2[] {
  const n = poly.length;
  if (n < 3 || metres === 0) return poly.map((p) => ({ ...p }));

  // Outward is (dy, -dx) for a counter-clockwise ring, the other way round for
  // a clockwise one.
  const sign = signedArea(poly) > 0 ? 1 : -1;
  const normals = poly.map((a, i) => {
    const b = poly[(i + 1) % n];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    return { x: (sign * dy) / len, y: (-sign * dx) / len };
  });

  const out: Vec2[] = [];
  for (let i = 0; i < n; i++) {
    const prev = (i - 1 + n) % n;
    const np = normals[prev];
    const nn = normals[i];
    const v = poly[i];

    // Two offset edge lines through the moved vertex; solve for where they meet.
    const dpx = v.x - poly[prev].x;
    const dpy = v.y - poly[prev].y;
    const dnx = poly[(i + 1) % n].x - v.x;
    const dny = poly[(i + 1) % n].y - v.y;
    const det = dpx * dny - dpy * dnx;

    if (Math.abs(det) < 1e-9) {
      out.push({ x: v.x + nn.x * metres, y: v.y + nn.y * metres });
      continue;
    }
    const ax = v.x + np.x * metres;
    const ay = v.y + np.y * metres;
    const bx = v.x + nn.x * metres;
    const by = v.y + nn.y * metres;
    const t = ((bx - ax) * dny - (by - ay) * dnx) / det;
    out.push({ x: ax + dpx * t, y: ay + dpy * t });
  }
  return out;
}

/**
 * The slab covering the half of the space furthest from a chosen edge — a
 * recessed balcony where the soffit stops short of the rail.
 */
export function overheadOverPart(
  boundary: Vec2[],
  clearance: number,
  fraction: number,
  fromEdge: number,
): Overhead {
  const n = boundary.length;
  const a = boundary[fromEdge % n];
  const b = boundary[(fromEdge + 1) % n];

  // Measure every corner along the inward normal of the chosen edge, then cut
  // at the given fraction of that depth.
  let nx = -(b.y - a.y);
  let ny = b.x - a.x;
  const len = Math.hypot(nx, ny) || 1;
  nx /= len;
  ny /= len;
  const c = boundary.reduce((acc, p) => ({ x: acc.x + p.x / n, y: acc.y + p.y / n }), { x: 0, y: 0 });
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  if ((c.x - mx) * nx + (c.y - my) * ny < 0) {
    nx = -nx;
    ny = -ny;
  }

  const depths = boundary.map((p) => (p.x - a.x) * nx + (p.y - a.y) * ny);
  const cut = Math.min(...depths) + (Math.max(...depths) - Math.min(...depths)) * fraction;

  // Clip the ring against the cut line, keeping the side nearest the edge.
  const out: Vec2[] = [];
  for (let i = 0; i < n; i++) {
    const p = boundary[i];
    const q = boundary[(i + 1) % n];
    const dp = depths[i];
    const dq = depths[(i + 1) % n];
    if (dp <= cut) out.push({ ...p });
    if ((dp < cut && dq > cut) || (dp > cut && dq < cut)) {
      const t = (cut - dp) / (dq - dp);
      out.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
    }
  }
  return { footprint: out.length >= 3 ? out : boundary.map((p) => ({ ...p })), height: clearance };
}

/** Compass dial: pointer offset to a bearing clockwise from north. */
export function bearingFromPointer(mx: number, my: number, cx: number, cy: number): number {
  const b = Math.atan2(mx - cx, -(my - cy));
  return b < 0 ? b + 2 * Math.PI : b;
}
