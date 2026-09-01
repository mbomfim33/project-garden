import { describe, expect, it } from 'vitest';
import { snap } from './snap';
import { Viewport } from '../view/viewport';
import { balconySeed } from '../space/seeds';
import type { Vec2 } from '../space/types';

const vp = () => new Viewport(balconySeed(), 900, 560);

const square: Vec2[] = [
  { x: 0, y: 0 },
  { x: 4, y: 0 },
  { x: 4, y: 2.5 },
  { x: 0, y: 2.5 },
];

describe('snap', () => {
  it('magnets onto a nearby corner', () => {
    const s = snap({ x: 3.98, y: 0.02 }, square, vp());
    expect(s.kind).toBe('vertex');
    expect(s.p).toEqual({ x: 4, y: 0 });
  });

  it('never magnets the dragged corner to its own old position', () => {
    // The pointer starts exactly on the vertex it is dragging, so without the
    // skip it locks in place and the handle never moves.
    const s = snap({ x: 0.05, y: 0.05 }, square, vp(), { skip: 0 });
    expect(s.kind).not.toBe('vertex');
    expect(s.p).not.toEqual({ x: 0, y: 0 });
  });

  it('rounds to a tidy 10 cm when there is nothing to lock onto', () => {
    const s = snap({ x: 1.234, y: 2.067 }, square, vp());
    expect(s.kind).toBe('grid');
    expect(s.p.x).toBeCloseTo(1.2, 9);
    expect(s.p.y).toBeCloseTo(2.1, 9);
  });

  it('locks a near-right-angle onto the square', () => {
    const prevPrev = { x: 0, y: 0 };
    const prev = { x: 4, y: 0 };
    // Heading north off an eastward edge, a couple of degrees out.
    const s = snap({ x: 4.1, y: 2.5 }, [], vp(), { prev, prevPrev });
    expect(s.kind).toBe('angle');
    expect(s.p.x).toBeCloseTo(4, 6);
    expect(s.ref).toEqual(prev);
  });

  it('locks a straight continuation as readily as a turn', () => {
    const s = snap({ x: 7, y: 0.05 }, [], vp(), { prev: { x: 4, y: 0 }, prevPrev: { x: 0, y: 0 } });
    expect(s.kind).toBe('angle');
    expect(s.p.y).toBeCloseTo(0, 6);
  });

  it('finds the right angle whichever way the difference wraps', () => {
    // Wrapping the angle difference with a plain modulo keeps the sign of the
    // dividend, and candidates on one side get silently missed.
    for (const heading of [1, -1, 91, -91, 179, -179, 269, -269]) {
      const a = (heading * Math.PI) / 180;
      const prev = { x: 1, y: 1 };
      const p = { x: prev.x + Math.cos(a) * 2, y: prev.y + Math.sin(a) * 2 };
      const s = snap(p, [], vp(), { prev, prevPrev: { x: 0, y: 1 } });
      expect(s.kind).toBe('angle');
    }
  });

  it('leaves a genuine diagonal alone', () => {
    const s = snap({ x: 6, y: 2 }, [], vp(), { prev: { x: 4, y: 0 }, prevPrev: { x: 0, y: 0 } });
    expect(s.kind).toBe('grid');
  });

  it('tightens the magnet as the view zooms in', () => {
    const view = vp();
    const far = { x: 4.06, y: 0 };
    expect(snap(far, square, view).kind).toBe('vertex');
    view.zoom = 8;
    expect(snap(far, square, view).kind).not.toBe('vertex');
  });
});
