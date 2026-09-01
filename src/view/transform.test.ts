import { describe, expect, it } from 'vitest';
import { makeT, toWorld } from './transform';
import { Viewport } from './viewport';
import { newSpace } from '../space/store';
import type { Space } from '../space/types';

function balcony(): Space {
  const s = newSpace('balcony');
  s.boundary = [
    { x: 0, y: 0 },
    { x: 4, y: 0 },
    { x: 4, y: 2.5 },
    { x: 0, y: 2.5 },
  ];
  s.edges = s.boundary.map(() => ({ wall: 'none' as const, height: 0 }));
  return s;
}

const CW = 900;
const CH = 560;

describe('makeT', () => {
  it('inverts exactly, whatever the point', () => {
    const T = makeT(balcony(), CW, CH);
    for (const p of [
      { x: 0, y: 0 },
      { x: 4, y: 2.5 },
      { x: -3.2, y: 8.7 },
      { x: 1.25, y: -0.75 },
    ]) {
      const back = toWorld(T, T.X(p.x), T.Y(p.y));
      expect(back.x).toBeCloseTo(p.x, 9);
      expect(back.y).toBeCloseTo(p.y, 9);
    }
  });

  it('puts north up: the north-east corner lands top-right', () => {
    const space = balcony();
    const T = makeT(space, CW, CH);
    const ne = { x: 4, y: 2.5 };
    const sw = { x: 0, y: 0 };

    expect(T.X(ne.x)).toBeGreaterThan(T.X(sw.x));
    expect(T.Y(ne.y)).toBeLessThan(T.Y(sw.y));
    expect(T.X(ne.x)).toBeGreaterThan(CW / 2);
    expect(T.Y(ne.y)).toBeLessThan(CH / 2);
  });

  it('keeps aspect: a square metre stays square', () => {
    const T = makeT(balcony(), CW, CH);
    const wide = T.X(3) - T.X(2);
    const tall = T.Y(1) - T.Y(2);
    expect(wide).toBeCloseTo(tall, 9);
    expect(T.S(1)).toBeCloseTo(wide, 9);
  });

  it('fits inside the canvas with room to spare', () => {
    const T = makeT(balcony(), CW, CH);
    for (const p of [{ x: 0, y: 0 }, { x: 4, y: 2.5 }]) {
      expect(T.X(p.x)).toBeGreaterThan(0);
      expect(T.X(p.x)).toBeLessThan(CW);
      expect(T.Y(p.y)).toBeGreaterThan(0);
      expect(T.Y(p.y)).toBeLessThan(CH);
    }
  });

  it('still gives a usable frame before any boundary exists', () => {
    const T = makeT(newSpace('garden'), CW, CH);
    expect(Number.isFinite(T.scale)).toBe(true);
    expect(T.scale).toBeGreaterThan(0);
    expect(toWorld(T, T.cx, T.cy).x).toBeCloseTo(0, 6);
  });
});

describe('Viewport', () => {
  it('round-trips screen and world at any pan and zoom', () => {
    const vp = new Viewport(balcony(), CW, CH);
    for (const [zoom, panX, panY] of [
      [1, 0, 0],
      [3.5, -120, 64],
      [0.4, 300, -220],
    ]) {
      vp.zoom = zoom;
      vp.panX = panX;
      vp.panY = panY;
      for (const p of [{ x: 0, y: 0 }, { x: 4, y: 2.5 }, { x: -1.7, y: 6.25 }]) {
        const s = vp.worldToScreen(p);
        const back = vp.screenToWorld(s.x, s.y);
        expect(back.x).toBeCloseTo(p.x, 9);
        expect(back.y).toBeCloseTo(p.y, 9);
      }
    }
  });

  it('holds the anchor still while zooming', () => {
    const vp = new Viewport(balcony(), CW, CH);
    const anchor = { x: 300, y: 200 };
    const under = vp.screenToWorld(anchor.x, anchor.y);

    vp.zoomAt(anchor, 2.5);

    const after = vp.worldToScreen(under);
    expect(after.x).toBeCloseTo(anchor.x, 6);
    expect(after.y).toBeCloseTo(anchor.y, 6);
    expect(vp.zoom).toBeCloseTo(2.5, 9);
  });

  it('clamps zoom at both ends', () => {
    const vp = new Viewport(balcony(), CW, CH);
    for (let i = 0; i < 20; i++) vp.zoomAt({ x: 0, y: 0 }, 2);
    expect(vp.zoom).toBe(12);
    for (let i = 0; i < 40; i++) vp.zoomAt({ x: 0, y: 0 }, 0.5);
    expect(vp.zoom).toBe(0.25);
  });

  it('shrinks the pick tolerance as you zoom in', () => {
    const vp = new Viewport(balcony(), CW, CH);
    const at1 = vp.pxToMetres(12);
    vp.zoom = 4;
    expect(vp.pxToMetres(12)).toBeCloseTo(at1 / 4, 9);
  });
});
