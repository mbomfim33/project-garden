import { describe, expect, it } from 'vitest';
import { atLeast, growPolygon, overheadOverAll, overheadOverPart, rectFootprint } from './tools';
import { area, signedArea } from '../engine';
import type { Vec2 } from '../space/types';

const square: Vec2[] = [
  { x: 0, y: 0 },
  { x: 4, y: 0 },
  { x: 4, y: 2.5 },
  { x: 0, y: 2.5 },
];

describe('growPolygon', () => {
  it('pushes a rectangle out by the same amount on every side', () => {
    const grown = growPolygon(square, 0.3);
    const xs = grown.map((p) => p.x);
    const ys = grown.map((p) => p.y);
    expect(Math.min(...xs)).toBeCloseTo(-0.3, 6);
    expect(Math.max(...xs)).toBeCloseTo(4.3, 6);
    expect(Math.min(...ys)).toBeCloseTo(-0.3, 6);
    expect(Math.max(...ys)).toBeCloseTo(2.8, 6);
  });

  it('grows rather than shrinks, whichever way the ring is wound', () => {
    for (const ring of [square, [...square].reverse()]) {
      expect(area(growPolygon(ring, 0.5))).toBeGreaterThan(area(ring));
    }
  });

  it('keeps the winding it was given', () => {
    expect(Math.sign(signedArea(growPolygon(square, 0.3)))).toBe(Math.sign(signedArea(square)));
  });

  it('leaves the ring alone when asked for nothing', () => {
    expect(growPolygon(square, 0)).toEqual(square);
  });

  it('keeps corners sharp on an L, instead of rounding them', () => {
    const ell: Vec2[] = [
      { x: 0, y: 0 },
      { x: 6, y: 0 },
      { x: 6, y: 2 },
      { x: 2, y: 2 },
      { x: 2, y: 6 },
      { x: 0, y: 6 },
    ];
    const grown = growPolygon(ell, 0.3);
    expect(grown).toHaveLength(ell.length);
    expect(area(grown)).toBeGreaterThan(area(ell));
  });
});

describe('atLeast', () => {
  it('gives a rectangle dragged along a line some depth', () => {
    const [a, b] = atLeast({ x: 0, y: 1 }, { x: 4, y: 1 }, 0.4);
    expect(Math.abs(b.x - a.x)).toBeCloseTo(4, 6);
    expect(Math.abs(b.y - a.y)).toBeCloseTo(0.4, 6);
    // Centred on where it was dragged.
    expect((a.y + b.y) / 2).toBeCloseTo(1, 6);
  });

  it('leaves a rectangle that is already big enough alone', () => {
    const [a, b] = atLeast({ x: 0, y: 0 }, { x: 2, y: 3 }, 0.4);
    expect(a).toEqual({ x: 0, y: 0 });
    expect(b).toEqual({ x: 2, y: 3 });
  });
});

describe('overhead presets', () => {
  it('covers the whole space', () => {
    const slab = overheadOverAll(square, 2.6);
    expect(area(slab.footprint)).toBeCloseTo(area(square), 6);
    expect(slab.height).toBe(2.6);
  });

  it('covers about the fraction of the depth asked for', () => {
    // Edge 2 runs along the north side, so "back" means away from it.
    const slab = overheadOverPart(square, 2.6, 0.5, 2);
    expect(area(slab.footprint)).toBeCloseTo(area(square) / 2, 6);
  });

  it('cuts from the edge it was given', () => {
    const fromNorth = overheadOverPart(square, 2.6, 0.4, 2);
    const fromSouth = overheadOverPart(square, 2.6, 0.4, 0);
    const midY = (poly: Vec2[]) => poly.reduce((a, p) => a + p.y, 0) / poly.length;
    expect(midY(fromNorth.footprint)).toBeGreaterThan(midY(fromSouth.footprint));
  });
});

describe('rectFootprint', () => {
  it('orders the corners whichever way it was dragged', () => {
    const a = rectFootprint({ x: 3, y: 4 }, { x: 1, y: 1 });
    const b = rectFootprint({ x: 1, y: 1 }, { x: 3, y: 4 });
    expect(a).toEqual(b);
    expect(area(a)).toBeCloseTo(6, 6);
  });
});
