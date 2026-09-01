import { describe, expect, it } from 'vitest';
import {
  bearingFromSimilarity,
  calibrateScale,
  georefToCalibration,
  imagePxToWorld,
  solveSimilarity,
  toLatLng,
  toLocalMetres,
  worldToImagePx,
} from './calibration';
import type { LatLng, Vec2 } from './types';

describe('calibrateScale', () => {
  it('turns a known length into metres per pixel', () => {
    const cal = calibrateScale({ x: 100, y: 400 }, { x: 300, y: 400 }, 10);
    expect(cal.metresPerPixel).toBeCloseTo(10 / 200, 9);
  });

  it('measures a diagonal line by its true length', () => {
    const cal = calibrateScale({ x: 0, y: 0 }, { x: 30, y: 40 }, 5);
    expect(cal.metresPerPixel).toBeCloseTo(5 / 50, 9);
  });

  it('refuses a line too short to mean anything', () => {
    expect(() => calibrateScale({ x: 10, y: 10 }, { x: 10.2, y: 10 }, 10)).toThrow(/too short/);
    expect(() => calibrateScale({ x: 0, y: 0 }, { x: 200, y: 0 }, 0)).toThrow(/real length/);
  });
});

describe('imagePxToWorld', () => {
  const cal = calibrateScale({ x: 100, y: 400 }, { x: 300, y: 400 }, 10, { x: 100, y: 400 });

  it('puts the origin pixel at local zero', () => {
    expect(imagePxToWorld({ x: 100, y: 400 }, cal)).toEqual({ x: 0, y: 0 });
  });

  it('flips y, because image rows count downward and north is up', () => {
    expect(imagePxToWorld({ x: 100, y: 300 }, cal)).toEqual({ x: 0, y: 5 });
    expect(imagePxToWorld({ x: 300, y: 400 }, cal)).toEqual({ x: 10, y: 0 });
  });

  it('inverts exactly, rotated or not', () => {
    for (const rotationRad of [0, 0.4, -1.2, Math.PI]) {
      const c = { ...cal, rotationRad };
      for (const p of [{ x: 0, y: 0 }, { x: 512, y: 88 }, { x: -30, y: 640 }] as Vec2[]) {
        const back = worldToImagePx(imagePxToWorld(p, c), c);
        expect(back.x).toBeCloseTo(p.x, 6);
        expect(back.y).toBeCloseTo(p.y, 6);
      }
    }
  });

  it('keeps distances after a rotation', () => {
    const straight = { ...cal, rotationRad: 0 };
    const turned = { ...cal, rotationRad: 0.9 };
    const d = (c: typeof cal) => {
      const a = imagePxToWorld({ x: 100, y: 400 }, c);
      const b = imagePxToWorld({ x: 500, y: 100 }, c);
      return Math.hypot(b.x - a.x, b.y - a.y);
    };
    expect(d(turned)).toBeCloseTo(d(straight), 9);
  });
});

describe('toLocalMetres', () => {
  const origin: LatLng = { lat: -23.55, lng: -46.63 };

  it('measures a degree of latitude at about 111 km', () => {
    const p = toLocalMetres({ lat: -22.55, lng: -46.63 }, origin);
    expect(p.y / 1000).toBeCloseTo(111.3, 0);
    expect(p.x).toBeCloseTo(0, 6);
  });

  it('shrinks longitude by the cosine of the latitude', () => {
    const here = toLocalMetres({ lat: -23.55, lng: -45.63 }, origin);
    const equator = toLocalMetres({ lat: 0, lng: 1 }, { lat: 0, lng: 0 });
    expect(here.x / equator.x).toBeCloseTo(Math.cos((-23.55 * Math.PI) / 180), 4);
  });

  it('round-trips back to latitude and longitude', () => {
    const p = { x: 240, y: -1180 };
    const back = toLocalMetres(toLatLng(p, origin), origin);
    expect(back.x).toBeCloseTo(p.x, 6);
    expect(back.y).toBeCloseTo(p.y, 6);
  });
});

describe('solveSimilarity', () => {
  const a: LatLng = { lat: -23.55, lng: -46.63 };

  it('reproduces both reference points it was solved from', () => {
    const b: LatLng = { lat: -23.5495, lng: -46.6288 };
    const aPx = { x: 120, y: 640 };
    const bPx = { x: 700, y: 210 };

    const sim = solveSimilarity(aPx, bPx, a, b, a);
    const cal = georefToCalibration(sim, aPx);

    const aWorld = imagePxToWorld(aPx, cal);
    const bWorld = imagePxToWorld(bPx, cal);
    const expected = toLocalMetres(b, a);

    expect(aWorld.x).toBeCloseTo(0, 6);
    expect(aWorld.y).toBeCloseTo(0, 6);
    expect(bWorld.x).toBeCloseTo(expected.x, 6);
    expect(bWorld.y).toBeCloseTo(expected.y, 6);
  });

  it('reads scale off the ratio of the two lengths', () => {
    const b: LatLng = { lat: -23.55, lng: -46.62 };
    const sim = solveSimilarity({ x: 0, y: 0 }, { x: 1000, y: 0 }, a, b, a);
    const groundMetres = toLocalMetres(b, a).x;
    expect(sim.scale).toBeCloseTo(groundMetres / 1000, 9);
    expect(sim.rotationRad).toBeCloseTo(0, 9);
  });

  it('finds the rotation of an image shot off-square', () => {
    // A point due east on the ground, but drawn up-and-right on the image.
    const b: LatLng = { lat: -23.55, lng: -46.62 };
    const sim = solveSimilarity({ x: 0, y: 0 }, { x: 100, y: -100 }, a, b, a);
    expect(sim.rotationRad).toBeCloseTo(-Math.PI / 4, 6);
    expect(bearingFromSimilarity(sim)).toBeCloseTo(Math.PI / 4, 6);
  });

  it('refuses reference points that are on top of each other', () => {
    expect(() => solveSimilarity({ x: 0, y: 0 }, { x: 0.5, y: 0 }, a, { lat: -23.5, lng: -46.6 })).toThrow(
      /on the image/,
    );
    expect(() => solveSimilarity({ x: 0, y: 0 }, { x: 400, y: 0 }, a, a)).toThrow(/on the ground/);
  });
});
