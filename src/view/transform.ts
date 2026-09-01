import type { Space, Vec2 } from '../space/types';
import { bounds } from '../engine/geom';

export interface T {
  /** World metres to CSS pixels, before any pan or zoom. */
  scale: number;
  X(x: number): number;
  Y(y: number): number;
  /** A world length in metres to CSS pixels. */
  S(m: number): number;
  /** Centre of the fitted box, in canvas space. */
  cx: number;
  cy: number;
}

const EDGE_PAD_PX = 24;

/** What we frame before a boundary exists, so a fresh space still has a canvas. */
const EMPTY_EXTENT_M = 6;

/**
 * Fits a space's boundary into the canvas and flips y, so larger world-y draws
 * higher up and north is up. The offsets stay closed over; toWorld recovers
 * everything it needs from X, Y and scale, so the two can't drift apart.
 */
export function makeT(space: Space, CW: number, CH: number, padM = 1): T {
  const b = space.boundary.length
    ? bounds(space.boundary)
    : { minX: -EMPTY_EXTENT_M, maxX: EMPTY_EXTENT_M, minY: -EMPTY_EXTENT_M, maxY: EMPTY_EXTENT_M };

  const minX = b.minX - padM;
  const maxX = b.maxX + padM;
  const minY = b.minY - padM;
  const maxY = b.maxY + padM;

  const ww = Math.max(maxX - minX, 1e-6);
  const wh = Math.max(maxY - minY, 1e-6);
  const scale = Math.min((CW - 2 * EDGE_PAD_PX) / ww, (CH - 2 * EDGE_PAD_PX) / wh);
  const ox = (CW - ww * scale) / 2;
  const oy = (CH - wh * scale) / 2;

  return {
    scale,
    X: (x) => ox + (x - minX) * scale,
    Y: (y) => oy + (maxY - y) * scale,
    S: (m) => m * scale,
    cx: ox + (ww * scale) / 2,
    cy: oy + (wh * scale) / 2,
  };
}

/** Breathing room around the boundary: a big plot wants more than a balcony. */
export const padForSpace = (space: Space) => (space.type === 'land' ? 2 : 0.6);

/** The exact inverse of makeT, written against nothing but its public surface. */
export function toWorld(T: T, sx: number, sy: number): Vec2 {
  return { x: (sx - T.X(0)) / T.scale, y: (T.Y(0) - sy) / T.scale };
}
