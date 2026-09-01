import type { Edge, Space, Vec2 } from './types';
import { circlePoly } from '../engine/geom';
import { newId } from './store';
import { SCHEMA_VERSION } from './migrate';

export function rect(x0: number, y0: number, x1: number, y1: number): Vec2[] {
  return [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ];
}

const OPEN: Edge = { wall: 'none', height: 0 };

const wall = (height: number, door?: number): Edge => ({ wall: 'full', height, ...(door != null ? { door } : {}) });

/**
 * A recessed balcony: building behind, walls either side, open to the north,
 * and a slab overhead covering the back half. The slab is usually the thing
 * people forget, and usually the thing that decides the answer.
 */
export function balconySeed(): Space {
  return {
    id: newId(),
    name: 'Recessed balcony',
    type: 'balcony',
    boundary: rect(0, 0, 4, 2.5),
    edges: [wall(3, 0.5), wall(2.8), OPEN, wall(2.8)],
    obstacles: [],
    overhead: { footprint: rect(0, 0, 4, 1.45), height: 2.6 },
    geo: { lat: -23.55, lng: -46.63, bearing: 0 },
    schemaVersion: SCHEMA_VERSION,
  };
}

/** A back garden with the house on the sunny side and one mature tree. */
export function gardenSeed(): Space {
  return {
    id: newId(),
    name: 'Back garden',
    type: 'garden',
    boundary: rect(0, 0, 10, 8),
    edges: [OPEN, OPEN, { wall: 'full', height: 1.8, door: 0.3 }, { wall: 'half', height: 1.9 }],
    obstacles: [
      { footprint: rect(0, 6.5, 6, 8), height: 5, solid: true, label: 'House' },
      { footprint: rect(8.7, 6.7, 10, 8), height: 2.6, solid: true, label: 'Shed' },
      { footprint: circlePoly(7.6, 3, 1.35), height: 4.6, solid: false, label: 'Tree' },
    ],
    geo: { lat: -23.55, lng: -46.63, bearing: 0 },
    schemaVersion: SCHEMA_VERSION,
  };
}

/** An irregular plot, open on all sides, with a treeline along the sunny edge. */
export function landSeed(): Space {
  const boundary: Vec2[] = [
    { x: 4, y: 3 },
    { x: 34, y: 2.5 },
    { x: 38, y: 14 },
    { x: 31, y: 26.5 },
    { x: 11, y: 28 },
    { x: 3, y: 16 },
  ];
  return {
    id: newId(),
    name: 'Half-hectare plot',
    type: 'land',
    boundary,
    edges: boundary.map(() => ({ ...OPEN })),
    obstacles: [
      { footprint: rect(5, 27, 35, 30.5), height: 8, solid: false, label: 'Treeline' },
      { footprint: rect(25.5, 19.5, 31, 24), height: 5, solid: true, label: 'Barn' },
      { footprint: circlePoly(14, 10, 2.1, 16), height: 6.5, solid: false, label: 'Oak' },
      { footprint: circlePoly(22, 8, 1.7), height: 5.2, solid: false, label: 'Oak' },
    ],
    geo: { lat: -23.55, lng: -46.63, bearing: 0 },
    schemaVersion: SCHEMA_VERSION,
  };
}

export function seedSpaces(): Space[] {
  return [balconySeed(), gardenSeed(), landSeed()];
}
