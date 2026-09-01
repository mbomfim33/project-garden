import { describe, expect, it } from 'vitest';
import { type Action, type EditorDoc, reducer } from './editorReducer';
import { balconySeed } from '../space/seeds';
import { area } from '../engine';
import type { Space } from '../space/types';

function doc(space: Space = balconySeed(), closed = true): EditorDoc {
  return { space, closed };
}

const run = (start: EditorDoc, ...actions: Action[]) => actions.reduce(reducer, start);

const paired = (d: EditorDoc) => d.space.edges.length === d.space.boundary.length;

describe('boundary editing', () => {
  it('keeps one edge per segment through every shape change', () => {
    let d = doc({ ...balconySeed(), boundary: [], edges: [] }, false);
    d = run(
      d,
      { kind: 'ADD_VERTEX', p: { x: 0, y: 0 } },
      { kind: 'ADD_VERTEX', p: { x: 3, y: 0 } },
      { kind: 'ADD_VERTEX', p: { x: 3, y: 2 } },
      { kind: 'ADD_VERTEX', p: { x: 0, y: 2 } },
      { kind: 'CLOSE' },
    );
    expect(paired(d)).toBe(true);
    expect(d.closed).toBe(true);

    d = reducer(d, { kind: 'INSERT_VERTEX', edge: 0, p: { x: 1.5, y: 0 } });
    expect(paired(d)).toBe(true);
    expect(d.space.boundary).toHaveLength(5);

    d = reducer(d, { kind: 'DELETE_VERTEX', i: 1 });
    expect(paired(d)).toBe(true);
    expect(d.space.boundary).toHaveLength(4);
  });

  it('inserts the new vertex on the edge, not where the pointer was', () => {
    const d = reducer(doc(), { kind: 'INSERT_VERTEX', edge: 0, p: { x: 2, y: 0.9 } });
    expect(d.space.boundary[1]).toEqual({ x: 2, y: 0.9 });
    // The caller projects; the reducer only needs the parameter along the edge.
    expect(d.space.boundary).toHaveLength(5);
  });

  it('carries a door into whichever half of a split edge it fell in', () => {
    const base = balconySeed();
    expect(base.edges[0].door).toBe(0.5);

    // Split the 4 m south edge a quarter of the way along.
    const d = reducer(doc(base), { kind: 'INSERT_VERTEX', edge: 0, p: { x: 1, y: 0 } });
    expect(d.space.edges[0].door).toBeUndefined();
    expect(d.space.edges[1].door).toBeCloseTo((0.5 - 0.25) / 0.75, 9);
  });

  it('keeps the wall in front when a vertex is dissolved', () => {
    let d = doc(balconySeed());
    d = reducer(d, { kind: 'DELETE_VERTEX', i: 1 });
    expect(paired(d)).toBe(true);
    // Removing the south-east corner merges the south and east edges; the south
    // wall's height is what survives.
    expect(d.space.edges[0].height).toBe(3);
  });

  it('refuses to take a polygon below three corners', () => {
    const triangle = doc({
      ...balconySeed(),
      boundary: [
        { x: 0, y: 0 },
        { x: 2, y: 0 },
        { x: 1, y: 2 },
      ],
      edges: [
        { wall: 'none', height: 0 },
        { wall: 'none', height: 0 },
        { wall: 'none', height: 0 },
      ],
    });
    expect(reducer(triangle, { kind: 'DELETE_VERTEX', i: 0 })).toBe(triangle);
  });

  it('ignores indices that are off the end', () => {
    const d = doc();
    expect(reducer(d, { kind: 'MOVE_VERTEX', i: 9, p: { x: 0, y: 0 } })).toBe(d);
    expect(reducer(d, { kind: 'INSERT_VERTEX', edge: -1, p: { x: 0, y: 0 } })).toBe(d);
    expect(reducer(d, { kind: 'SET_EDGE', i: 12, patch: { height: 2 } })).toBe(d);
  });

  it('will not close a shape that is not one yet', () => {
    const two = doc({ ...balconySeed(), boundary: [{ x: 0, y: 0 }, { x: 1, y: 0 }], edges: [] }, false);
    expect(reducer(two, { kind: 'CLOSE' }).closed).toBe(false);
  });

  it('seeds a rectangle of the size asked for', () => {
    const d = reducer(doc(), { kind: 'SEED_RECT', w: 4, h: 2.5, walled: true });
    expect(area(d.space.boundary)).toBeCloseTo(10, 9);
    expect(paired(d)).toBe(true);
    expect(d.space.edges.filter((e) => e.wall === 'full')).toHaveLength(3);
    expect(d.space.edges[2].wall).toBe('none');
  });

  it('never mutates the document it was handed', () => {
    const before = doc();
    const snapshot = JSON.stringify(before);
    run(
      before,
      { kind: 'MOVE_VERTEX', i: 0, p: { x: 9, y: 9 } },
      { kind: 'CYCLE_WALL', i: 0 },
      { kind: 'ADD_OBSTACLE', obstacle: { footprint: [], height: 1 } },
      { kind: 'SET_GEO', patch: { lat: 10 } },
    );
    expect(JSON.stringify(before)).toBe(snapshot);
  });
});

describe('walls and doors', () => {
  it('cycles full to half to none and back', () => {
    let d = doc();
    expect(d.space.edges[0].wall).toBe('full');
    d = reducer(d, { kind: 'CYCLE_WALL', i: 0 });
    expect(d.space.edges[0].wall).toBe('half');
    d = reducer(d, { kind: 'CYCLE_WALL', i: 0 });
    expect(d.space.edges[0].wall).toBe('none');
    expect(d.space.edges[0].height).toBe(0);
    d = reducer(d, { kind: 'CYCLE_WALL', i: 0 });
    expect(d.space.edges[0].wall).toBe('full');
    expect(d.space.edges[0].height).toBeGreaterThan(0);
  });

  it('stores a door as a fraction along its edge, clamped', () => {
    let d = reducer(doc(), { kind: 'SET_DOOR', i: 1, t: 1.4 });
    expect(d.space.edges[1].door).toBe(1);
    d = reducer(d, { kind: 'SET_DOOR', i: 1, t: -0.3 });
    expect(d.space.edges[1].door).toBe(0);
    d = reducer(d, { kind: 'SET_DOOR', i: 1, t: null });
    expect(d.space.edges[1].door).toBeUndefined();
    expect('door' in d.space.edges[1]).toBe(false);
  });
});

describe('obstacles and overhead', () => {
  it('adds, edits and removes obstacles', () => {
    let d = reducer(doc(gardenlike()), {
      kind: 'ADD_OBSTACLE',
      obstacle: { footprint: [{ x: 0, y: 0 }], height: 2, solid: true },
    });
    const last = d.space.obstacles.length - 1;
    d = reducer(d, { kind: 'SET_OBSTACLE', i: last, patch: { height: 4.5, solid: false } });
    expect(d.space.obstacles[last]).toMatchObject({ height: 4.5, solid: false });

    const count = d.space.obstacles.length;
    d = reducer(d, { kind: 'DELETE_OBSTACLE', i: last });
    expect(d.space.obstacles).toHaveLength(count - 1);
  });

  it('drops the overhead key rather than leaving an empty one behind', () => {
    const d = reducer(doc(), { kind: 'SET_OVERHEAD', overhead: undefined });
    expect('overhead' in d.space).toBe(false);
  });
});

function gardenlike(): Space {
  return { ...balconySeed(), obstacles: [] };
}
