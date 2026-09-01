import type { Vec2 } from '../space/types';
import type { Viewport } from '../view/viewport';

export type Snap = {
  p: Vec2;
  kind: 'vertex' | 'angle' | 'grid';
  /** What the point locked onto, for drawing the cue. */
  ref?: Vec2;
};

const GRID_M = 0.1;
const VERTEX_PX = 12;
const ANGLE_TOL_DEG = 6;

const roundTo = (v: number, step: number) => Math.round(v / step) * step;

/** Signed difference in [-pi, pi], whatever the sign of the inputs. */
const wrapAngle = (d: number) => Math.atan2(Math.sin(d), Math.cos(d));

type Options = {
  /** Last committed vertex, while drawing. */
  prev?: Vec2;
  /** The one before that — together they give the reference direction. */
  prevPrev?: Vec2;
  /** Index of the vertex being dragged, which must not magnet to itself. */
  skip?: number;
};

/**
 * Three rules in order: magnet to another corner, lock to a right angle off the
 * previous edge, or fall back to a 10 cm grid.
 */
export function snap(p: Vec2, boundary: Vec2[], vp: Viewport, opts: Options = {}): Snap {
  const { prev, prevPrev, skip } = opts;

  const radius = vp.pxToMetres(VERTEX_PX);
  let best: { p: Vec2; d: number } | null = null;
  for (let i = 0; i < boundary.length; i++) {
    if (i === skip) continue;
    const v = boundary[i];
    const d = Math.hypot(v.x - p.x, v.y - p.y);
    if (d < radius && (!best || d < best.d)) best = { p: v, d };
  }
  if (best) return { p: best.p, kind: 'vertex', ref: best.p };

  if (prev && prevPrev) {
    const ref = Math.atan2(prev.y - prevPrev.y, prev.x - prevPrev.x);
    const cur = Math.atan2(p.y - prev.y, p.x - prev.x);
    const dist = Math.hypot(p.x - prev.x, p.y - prev.y);
    const tol = (ANGLE_TOL_DEG * Math.PI) / 180;
    for (const turn of [0, 90, 180, 270]) {
      const target = ref + (turn * Math.PI) / 180;
      if (Math.abs(wrapAngle(cur - target)) < tol) {
        return {
          p: { x: prev.x + Math.cos(target) * dist, y: prev.y + Math.sin(target) * dist },
          kind: 'angle',
          ref: prev,
        };
      }
    }
  }

  return { p: { x: roundTo(p.x, GRID_M), y: roundTo(p.y, GRID_M) }, kind: 'grid' };
}
