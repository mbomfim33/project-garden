import { describe, expect, it } from 'vitest';
import { area, circlePoly, distanceToSegment, hull, isCCW, pip, projectToSegment, signedArea } from './geom';
import type { Vec2 } from '../space/types';

const square: Vec2[] = [
  { x: 0, y: 0 },
  { x: 4, y: 0 },
  { x: 4, y: 4 },
  { x: 0, y: 4 },
];

// Two arms meeting at the origin corner.
const ell: Vec2[] = [
  { x: 0, y: 0 },
  { x: 6, y: 0 },
  { x: 6, y: 2 },
  { x: 2, y: 2 },
  { x: 2, y: 6 },
  { x: 0, y: 6 },
];

describe('pip', () => {
  it('sees inside and outside a square', () => {
    expect(pip(2, 2, square)).toBe(true);
    expect(pip(5, 2, square)).toBe(false);
    expect(pip(-0.1, 2, square)).toBe(false);
  });

  it('excludes the notch of an L', () => {
    expect(pip(1, 1, ell)).toBe(true);
    expect(pip(5, 1, ell)).toBe(true);
    expect(pip(1, 5, ell)).toBe(true);
    expect(pip(4, 4, ell)).toBe(false);
  });

  it('reads a sampled circle as round', () => {
    const c = circlePoly(0, 0, 3, 32);
    expect(pip(0, 0, c)).toBe(true);
    expect(pip(2.8, 0, c)).toBe(true);
    expect(pip(2.9, 2.9, c)).toBe(false);
  });
});

describe('hull', () => {
  it('drops points swallowed by the outline', () => {
    const h = hull([...square, { x: 2, y: 2 }, { x: 1, y: 3 }]);
    expect(h).toHaveLength(4);
    expect(h.some((p) => p.x === 2 && p.y === 2)).toBe(false);
  });

  it('wraps a footprint and its shifted copy into one band', () => {
    const shifted = square.map((p) => ({ x: p.x + 10, y: p.y }));
    const h = hull([...square, ...shifted]);
    expect(area(h)).toBeCloseTo(4 * 4 + 10 * 4, 6);
  });

  it('passes through degenerate input', () => {
    expect(hull([{ x: 1, y: 1 }])).toHaveLength(1);
    expect(hull([])).toHaveLength(0);
  });
});

describe('area and winding', () => {
  it('measures a rectangle', () => {
    expect(area(square)).toBe(16);
  });

  it('signs by winding, with +y north', () => {
    expect(isCCW(square)).toBe(true);
    expect(signedArea([...square].reverse())).toBe(-16);
  });

  it('measures the L as the sum of its arms', () => {
    expect(area(ell)).toBe(6 * 2 + 2 * 4);
  });
});

describe('projectToSegment', () => {
  it('drops a perpendicular onto the segment', () => {
    const { t, point } = projectToSegment({ x: 2, y: 3 }, { x: 0, y: 0 }, { x: 4, y: 0 });
    expect(t).toBeCloseTo(0.5, 9);
    expect(point).toEqual({ x: 2, y: 0 });
  });

  it('clamps past either end instead of running off the line', () => {
    expect(projectToSegment({ x: -5, y: 1 }, { x: 0, y: 0 }, { x: 4, y: 0 }).t).toBe(0);
    expect(projectToSegment({ x: 9, y: 1 }, { x: 0, y: 0 }, { x: 4, y: 0 }).t).toBe(1);
    expect(distanceToSegment({ x: 8, y: 0 }, { x: 0, y: 0 }, { x: 4, y: 0 })).toBe(4);
  });

  it('survives a zero-length segment', () => {
    expect(distanceToSegment({ x: 3, y: 4 }, { x: 0, y: 0 }, { x: 0, y: 0 })).toBe(5);
  });
});
