import type { Space, Vec2 } from '../space/types';
import { distanceToPoint, distanceToSegment } from '../engine/geom';
import type { Viewport } from './viewport';

export interface Hit {
  kind: 'vertex' | 'edge';
  /** Vertex index, or the index of the edge's start vertex. */
  index: number;
  distM: number;
}

/**
 * Nearest vertex wins, then nearest edge. The threshold is in pixels because
 * that's what feels close to a hand; the comparison happens in metres so the
 * same helper serves the engine.
 */
export function hitTest(
  worldPt: Vec2,
  space: Space,
  vp: Viewport,
  thresholdPx = 12,
  closed = true,
): Hit | null {
  const tol = vp.pxToMetres(thresholdPx);
  const verts = space.boundary;
  const n = verts.length;
  if (n === 0) return null;

  let bestV: Hit | null = null;
  for (let i = 0; i < n; i++) {
    const d = distanceToPoint(worldPt, verts[i]);
    if (d <= tol && (!bestV || d < bestV.distM)) bestV = { kind: 'vertex', index: i, distM: d };
  }
  if (bestV) return bestV;

  let bestE: Hit | null = null;
  const segments = closed ? n : n - 1;
  for (let i = 0; i < segments; i++) {
    const d = distanceToSegment(worldPt, verts[i], verts[(i + 1) % n]);
    if (d <= tol && (!bestE || d < bestE.distM)) bestE = { kind: 'edge', index: i, distM: d };
  }
  return bestE;
}

/** Nearest edge within tolerance, ignoring vertices — for wall and door tools. */
export function pickEdge(worldPt: Vec2, boundary: Vec2[], tolM: number): number {
  let best = -1;
  let bestD = tolM;
  for (let i = 0; i < boundary.length; i++) {
    const d = distanceToSegment(worldPt, boundary[i], boundary[(i + 1) % boundary.length]);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}
