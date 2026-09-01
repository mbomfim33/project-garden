import { describe, expect, it } from 'vitest';
import { clockLabel, compassPoint, daylight, seasonsFor, sunAlongDay, sunAt } from './solar';
import { buildGridSeries, cellAt, cellHourly, indexAt, summarise } from './grid';
import { edgeSpan, occludersOf, shadowOf, wallHeight } from './occluders';
import { microclimate } from './microclimate';
import { isCCW, signedArea } from './geom';
import { balconySeed, gardenSeed, landSeed } from '../space/seeds';
import type { Space } from '../space/types';

const rad = (deg: number) => (deg * Math.PI) / 180;

const SAO_PAULO = rad(-23.55);
const LONDON = rad(51.5);
const QUITO = rad(-0.2);

const summerDay = (latDeg: number) => seasonsFor(latDeg).find((s) => s.key === 'summer')!.day;
const winterDay = (latDeg: number) => seasonsFor(latDeg).find((s) => s.key === 'winter')!.day;

function meanSummerHours(space: Space): number {
  return summarise(buildGridSeries(space)).meanSummer;
}

describe('sunAt', () => {
  it('climbs to noon and back down', () => {
    const day = summerDay(-23.55);
    expect(sunAt(day, 12, SAO_PAULO).altDeg).toBeGreaterThan(sunAt(day, 9, SAO_PAULO).altDeg);
    expect(sunAt(day, 12, SAO_PAULO).altDeg).toBeGreaterThan(sunAt(day, 15, SAO_PAULO).altDeg);
  });

  it('rises in the east and sets in the west', () => {
    const day = summerDay(-23.55);
    expect(sunAt(day, 8, SAO_PAULO).azDeg).toBeLessThan(180);
    expect(sunAt(day, 16, SAO_PAULO).azDeg).toBeGreaterThan(180);
  });

  it('puts the noon sun north of a southern site and south of a northern one', () => {
    const south = sunAt(summerDay(-23.55), 12, SAO_PAULO);
    expect(compassPoint(south.azDeg)).toBe('N');

    const north = sunAt(summerDay(51.5), 12, LONDON);
    expect(compassPoint(north.azDeg)).toBe('S');
  });

  it('sits lower at midwinter than at midsummer', () => {
    for (const [latDeg, latRad] of [[-23.55, SAO_PAULO], [51.5, LONDON]] as const) {
      const summer = sunAt(summerDay(latDeg), 12, latRad).altDeg;
      const winter = sunAt(winterDay(latDeg), 12, latRad).altDeg;
      expect(winter).toBeLessThan(summer);
    }
  });

  it('reaches near-vertical over the tropics without blowing up', () => {
    const noon = sunAt(80, 12, QUITO);
    expect(noon.altDeg).toBeGreaterThan(88);
    expect(Number.isFinite(noon.azDeg)).toBe(true);
    expect(Number.isFinite(noon.dir.x)).toBe(true);
  });

  it('turns the space to face a different north', () => {
    const day = summerDay(-23.55);
    const plain = sunAt(day, 12, SAO_PAULO);
    const turned = sunAt(day, 12, SAO_PAULO, Math.PI / 2);

    // Same sun, same sky; only the local frame moved a quarter turn.
    expect(turned.azDeg).toBeCloseTo(plain.azDeg, 9);
    expect(turned.dir.x).toBeCloseTo(-plain.dir.y, 9);
    expect(turned.dir.y).toBeCloseTo(plain.dir.x, 9);
  });
});

describe('daylight', () => {
  it('gives the tropics about twelve hours all year', () => {
    expect(daylight(80, QUITO).hours).toBeCloseTo(12, 0);
    expect(daylight(355, QUITO).hours).toBeCloseTo(12, 0);
  });

  it('swings hard at high latitude', () => {
    expect(daylight(summerDay(51.5), LONDON).hours).toBeGreaterThan(15.5);
    expect(daylight(winterDay(51.5), LONDON).hours).toBeLessThan(8.5);
  });

  it('handles a polar day and a polar night', () => {
    const arctic = rad(78);
    expect(daylight(172, arctic).hours).toBe(24);
    expect(daylight(355, arctic).hours).toBe(0);
  });

  it('starts and ends the animation dial on the horizon', () => {
    const day = summerDay(-23.55);
    expect(sunAlongDay(0, day, SAO_PAULO).altDeg).toBeCloseTo(0, 6);
    expect(sunAlongDay(1, day, SAO_PAULO).altDeg).toBeCloseTo(0, 6);
    expect(sunAlongDay(0.5, day, SAO_PAULO).altDeg).toBeGreaterThan(80);
  });
});

describe('shadowOf', () => {
  const post = {
    footprint: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ],
    height: 3,
    kind: 'vertical' as const,
  };

  it('stretches the shadow as the sun drops', () => {
    const high = sunAt(summerDay(-23.55), 12, SAO_PAULO);
    const low = sunAt(summerDay(-23.55), 7, SAO_PAULO);
    const areaOf = (s: typeof high) => {
      const poly = shadowOf(post, s, 100);
      return Math.abs(signedArea(poly));
    };
    expect(areaOf(low)).toBeGreaterThan(areaOf(high) * 3);
  });

  it('throws the shadow away from the sun', () => {
    const sun = { alt: rad(45), altDeg: 45, az: 0, azDeg: 0, dir: { x: 0, y: 1 }, hour: 12 };
    const poly = shadowOf(post, sun, 100);
    const minY = Math.min(...poly.map((p) => p.y));
    expect(minY).toBeCloseTo(-3, 6);
  });

  it('translates an overhead slab instead of sweeping it', () => {
    const sun = { alt: rad(45), altDeg: 45, az: 0, azDeg: 0, dir: { x: 0, y: 1 }, hour: 12 };
    const slab = { ...post, kind: 'overhead' as const };
    const poly = shadowOf(slab, sun, 100);

    expect(poly).toHaveLength(4);
    expect(Math.abs(signedArea(poly))).toBeCloseTo(1, 6);
    expect(Math.max(...poly.map((p) => p.y))).toBeCloseTo(1 - 3, 6);
  });
});

describe('wall height and run', () => {
  it('stands a half wall at half its height', () => {
    expect(wallHeight({ wall: 'full', height: 2 })).toBe(2);
    expect(wallHeight({ wall: 'half', height: 2 })).toBe(1);
    expect(wallHeight({ wall: 'none', height: 2 })).toBe(0);
  });

  it('covers the whole edge unless told otherwise', () => {
    expect(edgeSpan({ wall: 'full', height: 2 })).toEqual({ from: 0, to: 1 });
  });

  it('clamps and orders a run given backwards', () => {
    expect(edgeSpan({ wall: 'full', height: 2, span: { from: 0.8, to: 0.2 } })).toEqual({
      from: 0.2,
      to: 0.8,
    });
    expect(edgeSpan({ wall: 'full', height: 2, span: { from: -1, to: 5 } })).toEqual({
      from: 0,
      to: 1,
    });
  });

  it('extrudes only the stretch the wall covers', () => {
    const space = balconySeed();
    const full = occludersOf(space).find((o) => o.edge === 0)!;

    space.edges[0] = { ...space.edges[0], span: { from: 0.25, to: 0.75 } };
    const part = occludersOf(space).find((o) => o.edge === 0)!;

    const run = (o: typeof full) => Math.hypot(
      o.footprint[1].x - o.footprint[0].x,
      o.footprint[1].y - o.footprint[0].y,
    );
    expect(run(full)).toBeCloseTo(4, 6);
    expect(run(part)).toBeCloseTo(2, 6);
    expect(part.height).toBe(full.height);
  });

  it('drops a wall whose run has been closed to nothing', () => {
    const space = balconySeed();
    space.edges[0] = { ...space.edges[0], span: { from: 0.5, to: 0.5 } };
    expect(occludersOf(space).some((o) => o.edge === 0)).toBe(false);
  });

  it('lets more light in when a wall stops short', () => {
    const walled = { ...balconySeed(), geo: { lat: 51.5, bearing: Math.PI } };
    const gappy: Space = {
      ...walled,
      edges: walled.edges.map((e) =>
        e.wall === 'none' ? e : { ...e, span: { from: 0, to: 0.4 } },
      ),
    };
    expect(meanSummerHours(gappy)).toBeGreaterThan(meanSummerHours(walled));
  });

  it('shelters only beside the part that is actually built', () => {
    const space = balconySeed();
    space.edges[0] = { wall: 'full', height: 3, span: { from: 0, to: 0.25 } };
    space.edges[1] = { wall: 'none', height: 0 };
    space.edges[3] = { wall: 'none', height: 0 };

    // Just inside the built quarter, versus the same distance from the bare part.
    const behindWall = microclimate({ x: 0.5, y: 0.4 }, space);
    const beyondIt = microclimate({ x: 3.5, y: 0.4 }, space);
    expect(behindWall.nearWall).toBeGreaterThan(beyondIt.nearWall);
    expect(beyondIt.wind).toBeGreaterThan(behindWall.wind);
  });
});

describe('occludersOf', () => {
  it('raises a wall per walled edge and leaves open ones alone', () => {
    const occ = occludersOf(balconySeed());
    const walls = occ.filter((o) => o.kind === 'vertical');
    const slabs = occ.filter((o) => o.kind === 'overhead');
    expect(walls).toHaveLength(3);
    expect(slabs).toHaveLength(1);
  });

  it('halves the height of a half wall', () => {
    const garden = gardenSeed();
    const west = occludersOf(garden).find((o) => o.footprint.every((p) => p.x <= 0.001))!;
    expect(west.height).toBeCloseTo(1.9 / 2, 9);
  });

  it('pushes the wall body outside the boundary', () => {
    const occ = occludersOf(balconySeed());
    const south = occ.find((o) => o.footprint.every((p) => p.y <= 0.001))!;
    expect(Math.min(...south.footprint.map((p) => p.y))).toBeLessThan(0);
  });
});

describe('buildGridSeries', () => {
  const spaces = [balconySeed(), gardenSeed(), landSeed()];

  it('lays cells only inside the boundary', () => {
    for (const space of spaces) {
      const g = buildGridSeries(space);
      const s = summarise(g);
      expect(s.usable).toBeGreaterThan(0);
      for (let i = 0; i < g.inside.length; i++) {
        if (!g.inside[i]) continue;
        expect(indexAt(g, cellAt(g, i).pos)).toBe(i);
      }
    }
  });

  it('never banks more sun than the day is long', () => {
    for (const space of spaces) {
      const g = buildGridSeries(space);
      const summerHours = daylight(summerDay(space.geo.lat), space.geo.lat * (Math.PI / 180)).hours;
      const winterHours = daylight(winterDay(space.geo.lat), space.geo.lat * (Math.PI / 180)).hours;
      for (let i = 0; i < g.inside.length; i++) {
        if (!g.inside[i]) continue;
        const c = cellAt(g, i);
        expect(c.sunHours.summer).toBeGreaterThanOrEqual(0);
        expect(c.sunHours.summer).toBeLessThanOrEqual(summerHours + 0.5);
        expect(c.sunHours.winter).toBeLessThanOrEqual(winterHours + 0.5);
      }
    }
  });

  it('cuts holes where something solid stands', () => {
    const g = buildGridSeries(gardenSeed());
    expect(g.inside[indexAt(g, { x: 3, y: 7.2 })]).toBe(0); // under the house
    expect(g.inside[indexAt(g, { x: 3, y: 3 })]).toBe(1); // open lawn
  });

  it('leaves the ground under a tree plantable, just shadier', () => {
    const g = buildGridSeries(gardenSeed());
    const underTree = indexAt(g, { x: 7.6, y: 3 });
    const openLawn = indexAt(g, { x: 3, y: 3 });
    expect(g.inside[underTree]).toBe(1);
    expect(g.sunHoursSummer[underTree]).toBeLessThan(g.sunHoursSummer[openLawn]);
  });

  it('leaves an open plot sunnier than a walled balcony', () => {
    expect(meanSummerHours(landSeed())).toBeGreaterThan(meanSummerHours(balconySeed()));
  });

  it('shades the back of the balcony, not the rail', () => {
    const g = buildGridSeries(balconySeed());
    const back = g.sunHoursSummer[indexAt(g, { x: 2, y: 0.4 })];
    const rail = g.sunHoursSummer[indexAt(g, { x: 2, y: 2.3 })];
    expect(back).toBeLessThan(rail);
  });

  it('gets that sun back when the slab comes off', () => {
    const withSlab = meanSummerHours(balconySeed());
    const openSky = meanSummerHours({ ...balconySeed(), overhead: undefined });
    expect(openSky).toBeGreaterThan(withSlab);
  });

  it('starves a pole-facing balcony of winter sun, in either hemisphere', () => {
    const facing = (lat: number, bearingDeg: number) =>
      summarise(buildGridSeries({ ...balconySeed(), geo: { lat, bearing: rad(bearingDeg) } }));

    // North of the equator the winter sun never leaves the southern sky.
    expect(facing(51.5, 0).meanWinter).toBe(0);
    expect(facing(51.5, 180).meanWinter).toBeGreaterThan(4);

    // South of it, the other way round.
    expect(facing(-33.9, 180).meanWinter).toBe(0);
    expect(facing(-33.9, 0).meanWinter).toBeGreaterThan(4);
  });

  it('lets the low winter sun under a slab that blocks the high summer one', () => {
    // The overhang trick: an equator-facing balcony under a soffit ends up
    // sunnier in winter than in summer.
    const s = summarise(buildGridSeries({ ...balconySeed(), geo: { lat: 51.5, bearing: Math.PI } }));
    expect(s.meanWinter).toBeGreaterThan(s.meanSummer);
  });

  it('keeps the hourly trace consistent with the banked hours', () => {
    const g = buildGridSeries(gardenSeed());
    const i = indexAt(g, { x: 3, y: 3 });
    const series = cellHourly(g, i);
    expect(series).toHaveLength(g.hours.length);
    const litSamples = series.reduce((a, b) => a + b, 0);
    expect(litSamples * 0.5).toBeCloseTo(g.sunHoursSummer[i], 6);
  });

  it('returns an empty grid for a space with no boundary yet', () => {
    const g = buildGridSeries({ ...balconySeed(), boundary: [], edges: [] });
    expect(g.inside).toHaveLength(0);
    expect(summarise(g).usable).toBe(0);
  });

  it('coarsens rather than melting down on a huge plot', () => {
    const huge: Space = {
      ...landSeed(),
      boundary: [
        { x: 0, y: 0 },
        { x: 600, y: 0 },
        { x: 600, y: 600 },
        { x: 0, y: 600 },
      ],
      edges: Array.from({ length: 4 }, () => ({ wall: 'none' as const, height: 0 })),
      obstacles: [],
    };
    const g = buildGridSeries(huge);
    expect(g.cellSize).toBeGreaterThan(1);
    expect(g.cols * g.rows).toBeLessThan(30_000);
  });
});

describe('seeds', () => {
  it('keeps every boundary wound counter-clockwise', () => {
    for (const space of [balconySeed(), gardenSeed(), landSeed()]) {
      expect(isCCW(space.boundary)).toBe(true);
    }
  });

  it('pairs one edge to every boundary segment', () => {
    for (const space of [balconySeed(), gardenSeed(), landSeed()]) {
      expect(space.edges).toHaveLength(space.boundary.length);
    }
  });
});

describe('clockLabel', () => {
  it('reads back as a wall clock', () => {
    expect(clockLabel(6)).toBe('06:00');
    expect(clockLabel(13.5)).toBe('13:30');
    expect(clockLabel(9.99)).toBe('09:59');
    expect(clockLabel(9.999)).toBe('10:00');
    expect(clockLabel(23.999)).toBe('00:00');
  });
});
